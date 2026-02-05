import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ObjectId } from 'mongodb';
import { MongoRepository } from 'typeorm';
import { EventStatus } from '../common/enums/event-status.enum';
import { CreateEventDto, QueryEventDto, UpdateEventDto } from './dto';
import { Event } from './entities/event.entity';

@Injectable()
export class EventsService {
  constructor(
    @InjectRepository(Event)
    private readonly eventsRepo: MongoRepository<Event>,
  ) {}

  /**
   * Créer un nouvel événement
   */
  async create(
    createEventDto: CreateEventDto,
    organizerId: string,
    organizerName?: string,
  ): Promise<Event> {
    // Validation des dates
    this.validateDates(createEventDto.startDate, createEventDto.endDate);

    const event = this.eventsRepo.create({
      ...createEventDto,
      startDate: new Date(createEventDto.startDate),
      endDate: new Date(createEventDto.endDate),
      status: createEventDto.status || EventStatus.DRAFT,
      registeredCount: 0,
      organizerId,
      organizerName,
    });

    return this.eventsRepo.save(event);
  }

  /**
   * Récupérer tous les événements avec filtres et pagination
   */
  async findAll(query: QueryEventDto): Promise<{
    events: Event[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const {
      page = 1,
      limit = 10,
      status,
      category,
      search,
      startDateFrom,
      startDateTo,
      sortBy = 'startDate',
      sortOrder = 'asc',
    } = query;

    const skip = (page - 1) * limit;

    // Construction du filtre
    const filter: Record<string, unknown> = {};

    if (status) {
      filter.status = status;
    }

    if (category) {
      filter.category = category;
    }

    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { location: { $regex: search, $options: 'i' } },
      ];
    }

    if (startDateFrom || startDateTo) {
      const dateFilter: Record<string, Date> = {};
      if (startDateFrom) {
        dateFilter.$gte = new Date(startDateFrom);
      }
      if (startDateTo) {
        dateFilter.$lte = new Date(startDateTo);
      }
      filter.startDate = dateFilter;
    }

    const where = filter;
    const [events, total] = await Promise.all([
      this.eventsRepo.find({
        where,
        skip,
        take: limit,
        order: { [sortBy]: sortOrder === 'asc' ? 1 : -1 },
      }),
      this.eventsRepo.count(where),
    ]);

    return {
      events,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Récupérer uniquement les événements publiés (catalogue public)
   */
  async findPublished(query: QueryEventDto): Promise<{
    events: Event[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    return this.findAll({ ...query, status: EventStatus.PUBLISHED });
  }

  /**
   * Récupérer les événements à venir (publiés et non passés)
   */
  async findUpcoming(query: QueryEventDto): Promise<{
    events: Event[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const now = new Date().toISOString();
    return this.findAll({
      ...query,
      status: EventStatus.PUBLISHED,
      startDateFrom: now,
    });
  }

  /**
   * Récupérer un événement par son ID
   */
  async findById(id: string): Promise<Event> {
    const event = await this.findEventById(id);
    if (!event) {
      throw new NotFoundException(`Événement avec l'ID ${id} non trouvé`);
    }
    return event;
  }

  /**
   * Récupérer un événement publié par son ID (pour le public)
   */
  async findPublishedById(id: string): Promise<Event> {
    const event = await this.findById(id);
    if (event.status !== EventStatus.PUBLISHED) {
      throw new NotFoundException(`Événement avec l'ID ${id} non trouvé`);
    }
    return event;
  }

  /**
   * Récupérer un événement par son ID pour l'organisateur
   */
  async findByIdForOrganizer(id: string, organizerId: string): Promise<Event> {
    const event = await this.findById(id);
    if (event.organizerId !== organizerId) {
      throw new ForbiddenException(
        "Vous n'avez pas la permission d'accéder à cet événement",
      );
    }
    return event;
  }

  /**
   * Mettre à jour un événement
   */
  async update(
    id: string,
    updateEventDto: UpdateEventDto,
    userId: string,
    isAdmin: boolean,
  ): Promise<Event> {
    const event = await this.findById(id);

    // Vérifier les permissions
    if (!isAdmin && event.organizerId !== userId) {
      throw new ForbiddenException(
        "Vous n'avez pas la permission de modifier cet événement",
      );
    }

    // Règles métier pour les changements de statut
    if (updateEventDto.status) {
      this.validateStatusTransition(event.status, updateEventDto.status, event);
    }

    // Validation des dates si elles sont modifiées
    const startDate = updateEventDto.startDate || event.startDate.toISOString();
    const endDate = updateEventDto.endDate || event.endDate.toISOString();
    if (updateEventDto.startDate || updateEventDto.endDate) {
      this.validateDates(startDate, endDate);
    }

    // Validation de la capacité
    if (updateEventDto.capacity !== undefined) {
      this.validateCapacity(updateEventDto.capacity, event.registeredCount);
    }

    // Mise à jour de l'événement
    Object.assign(event, {
      ...updateEventDto,
      ...(updateEventDto.startDate && {
        startDate: new Date(updateEventDto.startDate),
      }),
      ...(updateEventDto.endDate && {
        endDate: new Date(updateEventDto.endDate),
      }),
    });

    return this.eventsRepo.save(event);
  }

  /**
   * Publier un événement
   */
  async publish(id: string, userId: string, isAdmin: boolean): Promise<Event> {
    const event = await this.findById(id);

    // Vérifier les permissions
    if (!isAdmin && event.organizerId !== userId) {
      throw new ForbiddenException(
        "Vous n'avez pas la permission de publier cet événement",
      );
    }

    // Vérifier que l'événement est en draft
    if (event.status !== EventStatus.DRAFT) {
      throw new BadRequestException(
        'Seuls les événements en brouillon peuvent être publiés',
      );
    }

    // Vérifier que la date de début est dans le futur
    if (new Date(event.startDate) <= new Date()) {
      throw new BadRequestException(
        'La date de début doit être dans le futur pour publier',
      );
    }

    event.status = EventStatus.PUBLISHED;
    return this.eventsRepo.save(event);
  }

  /**
   * Annuler un événement
   */
  async cancel(id: string, userId: string, isAdmin: boolean): Promise<Event> {
    const event = await this.findById(id);

    // Vérifier les permissions
    if (!isAdmin && event.organizerId !== userId) {
      throw new ForbiddenException(
        "Vous n'avez pas la permission d'annuler cet événement",
      );
    }

    // Vérifier que l'événement n'est pas déjà annulé
    if (event.status === EventStatus.CANCELED) {
      throw new BadRequestException('Cet événement est déjà annulé');
    }

    event.status = EventStatus.CANCELED;
    return this.eventsRepo.save(event);
  }

  /**
   * Supprimer un événement
   */
  async remove(id: string, userId: string, isAdmin: boolean): Promise<void> {
    const event = await this.findById(id);

    // Vérifier les permissions
    if (!isAdmin && event.organizerId !== userId) {
      throw new ForbiddenException(
        "Vous n'avez pas la permission de supprimer cet événement",
      );
    }

    // Règle métier: on ne peut pas supprimer un événement publié avec des inscriptions
    if (event.status === EventStatus.PUBLISHED && event.registeredCount > 0) {
      throw new BadRequestException(
        "Impossible de supprimer un événement publié avec des inscriptions. Annulez-le d'abord.",
      );
    }

    await this.eventsRepo.delete(event._id);
  }

  /**
   * Récupérer les événements d'un organisateur
   */
  async findByOrganizer(
    organizerId: string,
    query: QueryEventDto,
  ): Promise<{
    events: Event[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const { page = 1, limit = 10, status } = query;
    const skip = (page - 1) * limit;

    const filter: Record<string, unknown> = { organizerId };
    if (status) {
      filter.status = status;
    }

    const where = filter;
    const [events, total] = await Promise.all([
      this.eventsRepo.find({
        where,
        skip,
        take: limit,
        order: { createdAt: -1 },
      }),
      this.eventsRepo.count(where),
    ]);

    return {
      events,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Incrémenter le nombre d'inscriptions
   */
  async incrementRegisteredCount(id: string): Promise<Event> {
    const event = await this.findById(id);

    if (event.status !== EventStatus.PUBLISHED) {
      throw new BadRequestException(
        "L'inscription n'est possible que pour les événements publiés",
      );
    }

    if (event.registeredCount >= event.capacity) {
      throw new BadRequestException('Cet événement est complet');
    }

    event.registeredCount += 1;
    return this.eventsRepo.save(event);
  }

  /**
   * Décrémenter le nombre d'inscriptions
   */
  async decrementRegisteredCount(id: string): Promise<Event> {
    const event = await this.findById(id);

    if (event.registeredCount > 0) {
      event.registeredCount -= 1;
      return this.eventsRepo.save(event);
    }

    return event;
  }

  /**
   * Récupérer les statistiques des événements (global - pour super admin)
   */
  async getStatistics(): Promise<{
    total: number;
    byStatus: Record<EventStatus, number>;
    upcoming: number;
    totalCapacity: number;
    totalRegistered: number;
  }> {
    const now = new Date();

    const [total, drafts, published, canceled, upcomingEvents] =
      await Promise.all([
        this.eventsRepo.count({}),
        this.eventsRepo.count({ status: EventStatus.DRAFT }),
        this.eventsRepo.count({ status: EventStatus.PUBLISHED }),
        this.eventsRepo.count({ status: EventStatus.CANCELED }),
        this.eventsRepo.find({
          where: {
            status: EventStatus.PUBLISHED,
            startDate: { $gte: now },
          },
        }),
      ]);

    const totalCapacity = upcomingEvents.reduce(
      (sum, event) => sum + event.capacity,
      0,
    );
    const totalRegistered = upcomingEvents.reduce(
      (sum, event) => sum + event.registeredCount,
      0,
    );

    return {
      total,
      byStatus: {
        [EventStatus.DRAFT]: drafts,
        [EventStatus.PUBLISHED]: published,
        [EventStatus.CANCELED]: canceled,
      },
      upcoming: upcomingEvents.length,
      totalCapacity,
      totalRegistered,
    };
  }

  /**
   * Récupérer les statistiques des événements pour un organisateur spécifique
   */
  async getStatisticsByOrganizer(organizerId: string): Promise<{
    total: number;
    byStatus: Record<EventStatus, number>;
    upcoming: number;
    totalCapacity: number;
    totalRegistered: number;
  }> {
    const now = new Date();

    const [total, drafts, published, canceled, upcomingEvents] =
      await Promise.all([
        this.eventsRepo.count({ organizerId }),
        this.eventsRepo.count({ organizerId, status: EventStatus.DRAFT }),
        this.eventsRepo.count({ organizerId, status: EventStatus.PUBLISHED }),
        this.eventsRepo.count({ organizerId, status: EventStatus.CANCELED }),
        this.eventsRepo.find({
          where: {
            organizerId,
            status: EventStatus.PUBLISHED,
            startDate: { $gte: now },
          },
        }),
      ]);

    const totalCapacity = upcomingEvents.reduce(
      (sum, event) => sum + event.capacity,
      0,
    );
    const totalRegistered = upcomingEvents.reduce(
      (sum, event) => sum + event.registeredCount,
      0,
    );

    return {
      total,
      byStatus: {
        [EventStatus.DRAFT]: drafts,
        [EventStatus.PUBLISHED]: published,
        [EventStatus.CANCELED]: canceled,
      },
      upcoming: upcomingEvents.length,
      totalCapacity,
      totalRegistered,
    };
  }

  /**
   * Récupérer les événements à venir pour un organisateur
   */
  async findUpcomingByOrganizer(
    organizerId: string,
    query: QueryEventDto,
  ): Promise<{
    events: Event[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const now = new Date().toISOString();
    return this.findByOrganizer(organizerId, {
      ...query,
      status: EventStatus.PUBLISHED,
      startDateFrom: now,
    });
  }

  // ==================== Méthodes privées ====================

  private async findEventById(id: string): Promise<Event | null> {
    try {
      const objectId = new ObjectId(id);
      return this.eventsRepo.findOne({ where: { _id: objectId } });
    } catch {
      return null;
    }
  }

  private validateDates(startDate: string, endDate: string): void {
    const start = new Date(startDate);
    const end = new Date(endDate);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      throw new BadRequestException('Les dates fournies sont invalides');
    }

    if (end <= start) {
      throw new BadRequestException(
        'La date de fin doit être postérieure à la date de début',
      );
    }
  }

  private validateCapacity(newCapacity: number, registeredCount: number): void {
    if (newCapacity < registeredCount) {
      throw new BadRequestException(
        `La capacité ne peut pas être inférieure au nombre d'inscrits (${registeredCount})`,
      );
    }
  }

  private validateStatusTransition(
    currentStatus: EventStatus,
    newStatus: EventStatus,
    event: Event,
  ): void {
    // Règles de transition de statut
    const allowedTransitions: Record<EventStatus, EventStatus[]> = {
      [EventStatus.DRAFT]: [EventStatus.PUBLISHED, EventStatus.CANCELED],
      [EventStatus.PUBLISHED]: [EventStatus.CANCELED],
      [EventStatus.CANCELED]: [], // Pas de transition possible depuis annulé
    };

    if (!allowedTransitions[currentStatus].includes(newStatus)) {
      throw new BadRequestException(
        `Transition de statut non autorisée: ${currentStatus} → ${newStatus}`,
      );
    }

    // Règles supplémentaires pour la publication
    if (newStatus === EventStatus.PUBLISHED) {
      if (new Date(event.startDate) <= new Date()) {
        throw new BadRequestException(
          'Impossible de publier un événement dont la date de début est passée',
        );
      }
    }
  }
}
