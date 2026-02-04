import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ObjectId } from 'mongodb';
import { MongoRepository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { EventStatus } from '../common/enums/event-status.enum';
import { ReservationStatus } from '../common/enums/reservation-status.enum';
import { EventsService } from '../events/events.service';
import {
  CancelReservationDto,
  CreateReservationDto,
  QueryReservationDto,
} from './dto';
import { Reservation } from './entities/reservation.entity';
import { PdfService } from './services/pdf.service';

@Injectable()
export class ReservationsService {
  constructor(
    @InjectRepository(Reservation)
    private readonly reservationsRepo: MongoRepository<Reservation>,
    private readonly eventsService: EventsService,
    private readonly pdfService: PdfService,
  ) {}

  /**
   * Créer une nouvelle réservation
   */
  async create(
    createReservationDto: CreateReservationDto,
    userId: string,
    userEmail: string,
    userName: string,
  ): Promise<Reservation> {
    const { eventId, numberOfTickets = 1 } = createReservationDto;

    // Récupérer l'événement
    const event = await this.eventsService.findById(eventId);

    // Vérifications métier
    this.validateEventForReservation(event);

    // Vérifier le surbooking
    await this.checkOverbooking(event, numberOfTickets);

    // Vérifier si l'utilisateur a déjà une réservation active pour cet événement
    await this.checkExistingReservation(eventId, userId);

    // Générer le numéro de réservation unique
    const reservationNumber = this.generateReservationNumber();

    // Calculer le prix total
    const totalPrice = event.price * numberOfTickets;

    // Créer la réservation
    const reservation = this.reservationsRepo.create({
      reservationNumber,
      eventId,
      eventTitle: event.title,
      eventDate: event.startDate,
      eventLocation: event.location,
      userId,
      userEmail,
      userName,
      numberOfTickets,
      totalPrice,
      status: ReservationStatus.PENDING,
      qrCode: this.generateQrCode(reservationNumber),
    });

    const savedReservation = await this.reservationsRepo.save(reservation);

    // Confirmer automatiquement et mettre à jour le compteur d'inscriptions
    return this.confirm(savedReservation._id.toString(), true);
  }

  /**
   * Confirmer une réservation
   */
  async confirm(id: string, isSystem = false): Promise<Reservation> {
    const reservation = await this.findById(id);

    if (reservation.status !== ReservationStatus.PENDING) {
      throw new BadRequestException(
        'Seules les réservations en attente peuvent être confirmées',
      );
    }

    // Mettre à jour le compteur d'inscriptions de l'événement
    for (let i = 0; i < reservation.numberOfTickets; i++) {
      await this.eventsService.incrementRegisteredCount(reservation.eventId);
    }

    reservation.status = ReservationStatus.CONFIRMED;
    reservation.confirmedAt = new Date();

    return this.reservationsRepo.save(reservation);
  }

  /**
   * Annuler une réservation
   */
  async cancel(
    id: string,
    cancelDto: CancelReservationDto,
    userId: string,
    isAdmin: boolean,
  ): Promise<Reservation> {
    const reservation = await this.findById(id);

    // Vérifier les permissions
    if (!isAdmin && reservation.userId !== userId) {
      throw new ForbiddenException(
        "Vous n'avez pas la permission d'annuler cette réservation",
      );
    }

    // Vérifier si la réservation peut être annulée
    if (
      reservation.status === ReservationStatus.CANCELED ||
      reservation.status === ReservationStatus.REFUNDED
    ) {
      throw new BadRequestException('Cette réservation est déjà annulée');
    }

    if (reservation.status === ReservationStatus.CHECKED_IN) {
      throw new BadRequestException(
        "Impossible d'annuler une réservation après le check-in",
      );
    }

    // Vérifier la politique d'annulation (ex: 24h avant l'événement)
    const event = await this.eventsService.findById(reservation.eventId);
    const hoursBeforeEvent =
      (new Date(event.startDate).getTime() - Date.now()) / (1000 * 60 * 60);

    if (hoursBeforeEvent < 24 && !isAdmin) {
      throw new BadRequestException(
        "L'annulation n'est plus possible moins de 24h avant l'événement",
      );
    }

    // Libérer les places si la réservation était confirmée
    if (reservation.status === ReservationStatus.CONFIRMED) {
      for (let i = 0; i < reservation.numberOfTickets; i++) {
        await this.eventsService.decrementRegisteredCount(reservation.eventId);
      }
    }

    reservation.status = ReservationStatus.CANCELED;
    reservation.cancelReason =
      cancelDto.reason || "Annulation par l'utilisateur";
    reservation.canceledAt = new Date();

    return this.reservationsRepo.save(reservation);
  }

  /**
   * Check-in d'une réservation
   */
  async checkIn(id: string): Promise<Reservation> {
    const reservation = await this.findById(id);

    if (reservation.status !== ReservationStatus.CONFIRMED) {
      throw new BadRequestException(
        'Seules les réservations confirmées peuvent être enregistrées',
      );
    }

    // Vérifier que l'événement est en cours ou proche
    const event = await this.eventsService.findById(reservation.eventId);
    const now = new Date();
    const eventStart = new Date(event.startDate);
    const eventEnd = new Date(event.endDate);

    // Permettre le check-in 2h avant jusqu'à la fin de l'événement
    const checkInStart = new Date(eventStart.getTime() - 2 * 60 * 60 * 1000);

    if (now < checkInStart) {
      throw new BadRequestException(
        "Le check-in n'est pas encore ouvert (2h avant l'événement)",
      );
    }

    if (now > eventEnd) {
      throw new BadRequestException("L'événement est terminé");
    }

    reservation.status = ReservationStatus.CHECKED_IN;
    reservation.checkedInAt = new Date();

    return this.reservationsRepo.save(reservation);
  }

  /**
   * Marquer comme no-show
   */
  async markNoShow(id: string): Promise<Reservation> {
    const reservation = await this.findById(id);

    if (reservation.status !== ReservationStatus.CONFIRMED) {
      throw new BadRequestException(
        'Seules les réservations confirmées peuvent être marquées comme no-show',
      );
    }

    reservation.status = ReservationStatus.NO_SHOW;

    return this.reservationsRepo.save(reservation);
  }

  /**
   * Rembourser une réservation
   */
  async refund(id: string): Promise<Reservation> {
    const reservation = await this.findById(id);

    if (
      reservation.status !== ReservationStatus.CANCELED &&
      reservation.status !== ReservationStatus.NO_SHOW
    ) {
      throw new BadRequestException(
        'Seules les réservations annulées ou no-show peuvent être remboursées',
      );
    }

    reservation.status = ReservationStatus.REFUNDED;

    return this.reservationsRepo.save(reservation);
  }

  /**
   * Récupérer toutes les réservations avec filtres
   */
  async findAll(query: QueryReservationDto): Promise<{
    reservations: Reservation[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const {
      page = 1,
      limit = 10,
      status,
      eventId,
      userId,
      reservationNumber,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = query;

    const skip = (page - 1) * limit;

    // Construction du filtre
    const filter: any = {};

    if (status) {
      filter.status = status;
    }

    if (eventId) {
      filter.eventId = eventId;
    }

    if (userId) {
      filter.userId = userId;
    }

    if (reservationNumber) {
      filter.reservationNumber = { $regex: reservationNumber, $options: 'i' };
    }

    const [reservations, total] = await Promise.all([
      this.reservationsRepo.find({
        where: filter,
        skip,
        take: limit,
        order: { [sortBy]: sortOrder === 'asc' ? 1 : -1 },
      }),
      this.reservationsRepo.count(filter),
    ]);

    // Transform reservations to include nested event object for frontend compatibility
    const transformedReservations = reservations.map((reservation) => ({
      ...reservation,
      event: {
        _id: reservation.eventId,
        title: reservation.eventTitle,
        startDate: reservation.eventDate,
        location: reservation.eventLocation,
      },
    }));

    return {
      reservations: transformedReservations as unknown as Reservation[],
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Récupérer les réservations d'un utilisateur
   */
  async findByUser(
    userId: string,
    query: QueryReservationDto,
  ): Promise<{
    reservations: Reservation[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    return this.findAll({ ...query, userId });
  }

  /**
   * Récupérer les réservations d'un événement
   */
  async findByEvent(
    eventId: string,
    query: QueryReservationDto,
  ): Promise<{
    reservations: Reservation[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    return this.findAll({ ...query, eventId });
  }

  /**
   * Récupérer une réservation par ID
   */
  async findById(id: string): Promise<Reservation> {
    const reservation = await this.findReservationById(id);
    if (!reservation) {
      throw new NotFoundException(`Réservation avec l'ID ${id} non trouvée`);
    }
    return reservation;
  }

  /**
   * Récupérer une réservation par numéro
   */
  async findByReservationNumber(
    reservationNumber: string,
  ): Promise<Reservation> {
    const reservation = await this.reservationsRepo.findOne({
      where: { reservationNumber },
    });
    if (!reservation) {
      throw new NotFoundException(
        `Réservation ${reservationNumber} non trouvée`,
      );
    }
    return reservation;
  }

  /**
   * Générer le ticket PDF
   */
  async generateTicketPdf(
    id: string,
    userId: string,
    isAdmin: boolean,
  ): Promise<Buffer> {
    const reservation = await this.findById(id);

    // Vérifier les permissions
    if (!isAdmin && reservation.userId !== userId) {
      throw new ForbiddenException(
        "Vous n'avez pas la permission d'accéder à ce ticket",
      );
    }

    // Vérifier que la réservation est confirmée
    if (
      reservation.status !== ReservationStatus.CONFIRMED &&
      reservation.status !== ReservationStatus.CHECKED_IN
    ) {
      throw new BadRequestException(
        "Le ticket n'est disponible que pour les réservations confirmées",
      );
    }

    return this.pdfService.generateTicketPdf(reservation);
  }

  /**
   * Vérifier une réservation par QR code
   */
  async verifyByQrCode(qrCode: string): Promise<{
    valid: boolean;
    reservation?: Reservation;
    message: string;
  }> {
    const reservation = await this.reservationsRepo.findOne({
      where: { qrCode },
    });

    if (!reservation) {
      return { valid: false, message: 'Code de réservation invalide' };
    }

    if (reservation.status === ReservationStatus.CANCELED) {
      return {
        valid: false,
        reservation,
        message: 'Cette réservation a été annulée',
      };
    }

    if (reservation.status === ReservationStatus.CHECKED_IN) {
      return {
        valid: false,
        reservation,
        message: 'Cette réservation a déjà été utilisée',
      };
    }

    if (reservation.status !== ReservationStatus.CONFIRMED) {
      return {
        valid: false,
        reservation,
        message: "Cette réservation n'est pas valide",
      };
    }

    return {
      valid: true,
      reservation,
      message: 'Réservation valide',
    };
  }

  /**
   * Statistiques des réservations (global - pour super admin)
   */
  async getStatistics(): Promise<{
    total: number;
    byStatus: Record<ReservationStatus, number>;
    totalRevenue: number;
    todayReservations: number;
  }> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [
      total,
      pending,
      confirmed,
      canceled,
      checkedIn,
      noShow,
      refunded,
      todayReservations,
      allConfirmed,
    ] = await Promise.all([
      this.reservationsRepo.count({}),
      this.reservationsRepo.count({ status: ReservationStatus.PENDING }),
      this.reservationsRepo.count({ status: ReservationStatus.CONFIRMED }),
      this.reservationsRepo.count({ status: ReservationStatus.CANCELED }),
      this.reservationsRepo.count({ status: ReservationStatus.CHECKED_IN }),
      this.reservationsRepo.count({ status: ReservationStatus.NO_SHOW }),
      this.reservationsRepo.count({ status: ReservationStatus.REFUNDED }),
      this.reservationsRepo.count({
        createdAt: { $gte: today },
      }),
      this.reservationsRepo.find({
        where: {
          status: {
            $in: [ReservationStatus.CONFIRMED, ReservationStatus.CHECKED_IN],
          },
        },
      }),
    ]);

    const totalRevenue = allConfirmed.reduce((sum, r) => sum + r.totalPrice, 0);

    return {
      total,
      byStatus: {
        [ReservationStatus.PENDING]: pending,
        [ReservationStatus.CONFIRMED]: confirmed,
        [ReservationStatus.CANCELED]: canceled,
        [ReservationStatus.CHECKED_IN]: checkedIn,
        [ReservationStatus.NO_SHOW]: noShow,
        [ReservationStatus.REFUNDED]: refunded,
      },
      totalRevenue,
      todayReservations,
    };
  }

  /**
   * Récupérer les réservations pour les événements d'un organisateur
   */
  async findByOrganizer(
    organizerId: string,
    query: QueryReservationDto,
  ): Promise<{
    reservations: Reservation[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    // D'abord, récupérer tous les événements de cet organisateur
    const organizerEvents = await this.eventsService.findByOrganizer(
      organizerId,
      {
        page: 1,
        limit: 1000, // Récupérer tous les événements
      },
    );

    const eventIds = organizerEvents.events.map((event) =>
      event._id.toString(),
    );

    if (eventIds.length === 0) {
      return {
        reservations: [],
        total: 0,
        page: query.page || 1,
        limit: query.limit || 10,
        totalPages: 0,
      };
    }

    const {
      page = 1,
      limit = 10,
      status,
      reservationNumber,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = query;

    const skip = (page - 1) * limit;

    // Construction du filtre
    const filter: any = {
      eventId: { $in: eventIds },
    };

    if (status) {
      filter.status = status;
    }

    if (reservationNumber) {
      filter.reservationNumber = { $regex: reservationNumber, $options: 'i' };
    }

    const [reservations, total] = await Promise.all([
      this.reservationsRepo.find({
        where: filter,
        skip,
        take: limit,
        order: { [sortBy]: sortOrder === 'asc' ? 1 : -1 },
      }),
      this.reservationsRepo.count(filter),
    ]);

    // Transform reservations to include nested event object for frontend compatibility
    const transformedReservations = reservations.map((reservation) => ({
      ...reservation,
      event: {
        _id: reservation.eventId,
        title: reservation.eventTitle,
        startDate: reservation.eventDate,
        location: reservation.eventLocation,
      },
    }));

    return {
      reservations: transformedReservations as unknown as Reservation[],
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Statistiques des réservations pour un organisateur spécifique
   */
  async getStatisticsByOrganizer(organizerId: string): Promise<{
    total: number;
    byStatus: Record<ReservationStatus, number>;
    totalRevenue: number;
    todayReservations: number;
  }> {
    // Récupérer tous les événements de cet organisateur
    const organizerEvents = await this.eventsService.findByOrganizer(
      organizerId,
      {
        page: 1,
        limit: 1000,
      },
    );

    const eventIds = organizerEvents.events.map((event) =>
      event._id.toString(),
    );

    if (eventIds.length === 0) {
      return {
        total: 0,
        byStatus: {
          [ReservationStatus.PENDING]: 0,
          [ReservationStatus.CONFIRMED]: 0,
          [ReservationStatus.CANCELED]: 0,
          [ReservationStatus.CHECKED_IN]: 0,
          [ReservationStatus.NO_SHOW]: 0,
          [ReservationStatus.REFUNDED]: 0,
        },
        totalRevenue: 0,
        todayReservations: 0,
      };
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const eventFilter = { eventId: { $in: eventIds } };

    const [
      total,
      pending,
      confirmed,
      canceled,
      checkedIn,
      noShow,
      refunded,
      todayReservations,
      allConfirmed,
    ] = await Promise.all([
      this.reservationsRepo.count(eventFilter),
      this.reservationsRepo.count({
        ...eventFilter,
        status: ReservationStatus.PENDING,
      }),
      this.reservationsRepo.count({
        ...eventFilter,
        status: ReservationStatus.CONFIRMED,
      }),
      this.reservationsRepo.count({
        ...eventFilter,
        status: ReservationStatus.CANCELED,
      }),
      this.reservationsRepo.count({
        ...eventFilter,
        status: ReservationStatus.CHECKED_IN,
      }),
      this.reservationsRepo.count({
        ...eventFilter,
        status: ReservationStatus.NO_SHOW,
      }),
      this.reservationsRepo.count({
        ...eventFilter,
        status: ReservationStatus.REFUNDED,
      }),
      this.reservationsRepo.count({
        ...eventFilter,
        createdAt: { $gte: today },
      }),
      this.reservationsRepo.find({
        where: {
          ...eventFilter,
          status: {
            $in: [ReservationStatus.CONFIRMED, ReservationStatus.CHECKED_IN],
          },
        },
      }),
    ]);

    const totalRevenue = allConfirmed.reduce((sum, r) => sum + r.totalPrice, 0);

    return {
      total,
      byStatus: {
        [ReservationStatus.PENDING]: pending,
        [ReservationStatus.CONFIRMED]: confirmed,
        [ReservationStatus.CANCELED]: canceled,
        [ReservationStatus.CHECKED_IN]: checkedIn,
        [ReservationStatus.NO_SHOW]: noShow,
        [ReservationStatus.REFUNDED]: refunded,
      },
      totalRevenue,
      todayReservations,
    };
  }

  // ==================== Méthodes privées ====================

  private async findReservationById(id: string): Promise<Reservation | null> {
    try {
      const objectId = new ObjectId(id);
      return this.reservationsRepo.findOne({ where: { _id: objectId } });
    } catch {
      return null;
    }
  }

  private validateEventForReservation(event: any): void {
    if (event.status !== EventStatus.PUBLISHED) {
      throw new BadRequestException(
        'Les réservations ne sont possibles que pour les événements publiés',
      );
    }

    const now = new Date();
    if (new Date(event.startDate) <= now) {
      throw new BadRequestException(
        'Impossible de réserver pour un événement passé ou en cours',
      );
    }
  }

  private async checkOverbooking(
    event: any,
    numberOfTickets: number,
  ): Promise<void> {
    const availableSpots = event.capacity - event.registeredCount;

    if (availableSpots < numberOfTickets) {
      if (availableSpots === 0) {
        throw new ConflictException('Cet événement est complet');
      }
      throw new ConflictException(
        `Il ne reste que ${availableSpots} place(s) disponible(s)`,
      );
    }
  }

  private async checkExistingReservation(
    eventId: string,
    userId: string,
  ): Promise<void> {
    const existing = await this.reservationsRepo.findOne({
      where: {
        eventId,
        userId,
        status: {
          $in: [ReservationStatus.PENDING, ReservationStatus.CONFIRMED],
        },
      },
    });

    if (existing) {
      throw new ConflictException(
        'Vous avez déjà une réservation active pour cet événement',
      );
    }
  }

  private generateReservationNumber(): string {
    const prefix = 'RES';
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = uuidv4().split('-')[0].toUpperCase();
    return `${prefix}-${timestamp}-${random}`;
  }

  private generateQrCode(reservationNumber: string): string {
    // Génération d'un code unique pour le QR
    return `QR-${reservationNumber}-${uuidv4().split('-')[0].toUpperCase()}`;
  }
}
