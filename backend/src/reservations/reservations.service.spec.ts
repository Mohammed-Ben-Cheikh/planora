import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ObjectId } from 'mongodb';
import { MongoRepository } from 'typeorm';
import { EventStatus } from '../common/enums/event-status.enum';
import { ReservationStatus } from '../common/enums/reservation-status.enum';
import { EventsService } from '../events/events.service';
import { Reservation } from './entities/reservation.entity';
import { ReservationsService } from './reservations.service';
import { PdfService } from './services/pdf.service';

// Mock uuid before it's imported by the service
jest.mock('uuid', () => ({
  v4: () => 'mock-uuid-1234-5678-9abc-def012345678',
}));

// ─── Helpers ────────────────────────────────────────────────────────────────────

const mockObjectId = new ObjectId();

const futureDate = new Date('2027-06-15T09:00:00Z');
const futureEndDate = new Date('2027-06-15T18:00:00Z');

const createMockEvent = (overrides = {}) => ({
  _id: new ObjectId(),
  title: 'Conférence Tech 2027',
  description: 'Une conférence tech',
  location: 'Paris',
  startDate: futureDate,
  endDate: futureEndDate,
  capacity: 100,
  registeredCount: 10,
  status: EventStatus.PUBLISHED,
  price: 50,
  organizerId: 'organizer-1',
  ...overrides,
});

const createMockReservation = (
  overrides: Partial<Reservation> = {},
): Reservation =>
  ({
    _id: mockObjectId,
    reservationNumber: 'RES-ABC123-DEF456',
    eventId: 'event-1',
    eventTitle: 'Conférence Tech 2027',
    eventDate: futureDate,
    eventLocation: 'Paris',
    userId: 'user-1',
    userEmail: 'user@example.com',
    userName: 'John Doe',
    numberOfTickets: 2,
    totalPrice: 100,
    status: ReservationStatus.CONFIRMED,
    qrCode: 'QR-RES-ABC123-DEF456-ABCD1234',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }) as Reservation;

// ─── Mocks ──────────────────────────────────────────────────────────────────────

const createMockRepository = (): Partial<
  Record<keyof MongoRepository<Reservation>, jest.Mock>
> => ({
  create: jest.fn(),
  save: jest.fn(),
  find: jest.fn(),
  findOne: jest.fn(),
  count: jest.fn(),
  delete: jest.fn(),
});

const createMockEventsService = (): Partial<
  Record<keyof EventsService, jest.Mock>
> => ({
  findById: jest.fn(),
  incrementRegisteredCount: jest.fn(),
  decrementRegisteredCount: jest.fn(),
  findByOrganizer: jest.fn(),
});

const createMockPdfService = (): Partial<
  Record<keyof PdfService, jest.Mock>
> => ({
  generateTicketPdf: jest.fn(),
});

// ─── Test Suite ─────────────────────────────────────────────────────────────────

describe('ReservationsService', () => {
  let service: ReservationsService;
  let repo: ReturnType<typeof createMockRepository>;
  let eventsService: ReturnType<typeof createMockEventsService>;
  let pdfService: ReturnType<typeof createMockPdfService>;

  beforeEach(async () => {
    repo = createMockRepository();
    eventsService = createMockEventsService();
    pdfService = createMockPdfService();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReservationsService,
        { provide: getRepositoryToken(Reservation), useValue: repo },
        { provide: EventsService, useValue: eventsService },
        { provide: PdfService, useValue: pdfService },
      ],
    }).compile();

    service = module.get<ReservationsService>(ReservationsService);
  });

  afterEach(() => jest.clearAllMocks());

  // ═══════════════════════════════════════════════════════════════════════════════
  // CREATE
  // ═══════════════════════════════════════════════════════════════════════════════

  describe('create', () => {
    it('devrait créer une réservation avec succès', async () => {
      const mockEvent = createMockEvent();
      eventsService.findById!.mockResolvedValue(mockEvent);

      // Pas de réservation existante
      repo.findOne!.mockResolvedValueOnce(null);

      const createdReservation = createMockReservation({
        status: ReservationStatus.PENDING,
      });
      repo.create!.mockReturnValue(createdReservation);
      repo.save!.mockResolvedValue(createdReservation);

      // Pour la confirmation auto (findById interne + save)
      const confirmedReservation = {
        ...createdReservation,
        status: ReservationStatus.CONFIRMED,
        confirmedAt: new Date(),
      };

      // confirm() calls findById → findReservationById → findOne
      repo.findOne!.mockResolvedValueOnce(createdReservation);
      eventsService.incrementRegisteredCount!.mockResolvedValue(mockEvent);
      repo.save!.mockResolvedValue(confirmedReservation);

      const result = await service.create(
        { eventId: 'event-1', numberOfTickets: 2 },
        'user-1',
        'user@example.com',
        'John Doe',
      );

      expect(eventsService.findById).toHaveBeenCalledWith('event-1');
      expect(repo.create).toHaveBeenCalled();
      expect(result.status).toBe(ReservationStatus.CONFIRMED);
    });

    it("devrait rejeter si l'événement n'est pas publié", async () => {
      const mockEvent = createMockEvent({ status: EventStatus.DRAFT });
      eventsService.findById!.mockResolvedValue(mockEvent);

      await expect(
        service.create(
          { eventId: 'event-1', numberOfTickets: 1 },
          'user-1',
          'user@example.com',
          'John Doe',
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it("devrait rejeter si l'événement est passé", async () => {
      const mockEvent = createMockEvent({
        startDate: new Date('2020-01-01'),
      });
      eventsService.findById!.mockResolvedValue(mockEvent);

      await expect(
        service.create(
          { eventId: 'event-1', numberOfTickets: 1 },
          'user-1',
          'user@example.com',
          'John Doe',
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('devrait rejeter en cas de surbooking (événement complet)', async () => {
      const mockEvent = createMockEvent({
        capacity: 100,
        registeredCount: 100,
      });
      eventsService.findById!.mockResolvedValue(mockEvent);

      await expect(
        service.create(
          { eventId: 'event-1', numberOfTickets: 1 },
          'user-1',
          'user@example.com',
          'John Doe',
        ),
      ).rejects.toThrow(ConflictException);
    });

    it('devrait rejeter si pas assez de places pour le nombre de tickets demandés', async () => {
      const mockEvent = createMockEvent({
        capacity: 100,
        registeredCount: 98,
      });
      eventsService.findById!.mockResolvedValue(mockEvent);

      await expect(
        service.create(
          { eventId: 'event-1', numberOfTickets: 5 },
          'user-1',
          'user@example.com',
          'John Doe',
        ),
      ).rejects.toThrow(ConflictException);
    });

    it("devrait rejeter si l'utilisateur a déjà une réservation active", async () => {
      const mockEvent = createMockEvent();
      eventsService.findById!.mockResolvedValue(mockEvent);

      // Réservation existante trouvée
      repo.findOne!.mockResolvedValueOnce(createMockReservation());

      await expect(
        service.create(
          { eventId: 'event-1', numberOfTickets: 1 },
          'user-1',
          'user@example.com',
          'John Doe',
        ),
      ).rejects.toThrow(ConflictException);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════════
  // CONFIRM
  // ═══════════════════════════════════════════════════════════════════════════════

  describe('confirm', () => {
    it('devrait confirmer une réservation en attente', async () => {
      const reservation = createMockReservation({
        status: ReservationStatus.PENDING,
        numberOfTickets: 2,
      });
      repo.findOne!.mockResolvedValue(reservation);
      eventsService.incrementRegisteredCount!.mockResolvedValue({});

      const confirmed = {
        ...reservation,
        status: ReservationStatus.CONFIRMED,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        confirmedAt: expect.any(Date),
      };
      repo.save!.mockResolvedValue(confirmed);

      const result = await service.confirm(mockObjectId.toHexString());

      expect(eventsService.incrementRegisteredCount).toHaveBeenCalledTimes(2);
      expect(result.status).toBe(ReservationStatus.CONFIRMED);
    });

    it("devrait rejeter si la réservation n'est pas en attente", async () => {
      const reservation = createMockReservation({
        status: ReservationStatus.CONFIRMED,
      });
      repo.findOne!.mockResolvedValue(reservation);

      await expect(service.confirm(mockObjectId.toHexString())).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════════
  // CANCEL
  // ═══════════════════════════════════════════════════════════════════════════════

  describe('cancel', () => {
    it('devrait annuler une réservation confirmée par son propriétaire', async () => {
      const reservation = createMockReservation({
        status: ReservationStatus.CONFIRMED,
        userId: 'user-1',
        numberOfTickets: 2,
      });
      repo.findOne!.mockResolvedValue(reservation);

      const mockEvent = createMockEvent({
        startDate: new Date(Date.now() + 48 * 60 * 60 * 1000), // 48h dans le futur
      });
      eventsService.findById!.mockResolvedValue(mockEvent);
      eventsService.decrementRegisteredCount!.mockResolvedValue({});

      const canceled = {
        ...reservation,
        status: ReservationStatus.CANCELED,
      };
      repo.save!.mockResolvedValue(canceled);

      const result = await service.cancel(
        mockObjectId.toHexString(),
        { reason: 'Changement de plan' },
        'user-1',
        false,
      );

      expect(result.status).toBe(ReservationStatus.CANCELED);
      expect(eventsService.decrementRegisteredCount).toHaveBeenCalledTimes(2);
    });

    it('devrait lever ForbiddenException si non propriétaire et non admin', async () => {
      const reservation = createMockReservation({ userId: 'user-1' });
      repo.findOne!.mockResolvedValue(reservation);

      await expect(
        service.cancel(mockObjectId.toHexString(), {}, 'intrus', false),
      ).rejects.toThrow(ForbiddenException);
    });

    it("devrait rejeter l'annulation d'une réservation déjà annulée", async () => {
      const reservation = createMockReservation({
        status: ReservationStatus.CANCELED,
        userId: 'user-1',
      });
      repo.findOne!.mockResolvedValue(reservation);

      await expect(
        service.cancel(mockObjectId.toHexString(), {}, 'user-1', false),
      ).rejects.toThrow(BadRequestException);
    });

    it("devrait rejeter l'annulation d'une réservation remboursée", async () => {
      const reservation = createMockReservation({
        status: ReservationStatus.REFUNDED,
        userId: 'user-1',
      });
      repo.findOne!.mockResolvedValue(reservation);

      await expect(
        service.cancel(mockObjectId.toHexString(), {}, 'user-1', false),
      ).rejects.toThrow(BadRequestException);
    });

    it("devrait rejeter l'annulation après check-in", async () => {
      const reservation = createMockReservation({
        status: ReservationStatus.CHECKED_IN,
        userId: 'user-1',
      });
      repo.findOne!.mockResolvedValue(reservation);

      await expect(
        service.cancel(mockObjectId.toHexString(), {}, 'user-1', false),
      ).rejects.toThrow(BadRequestException);
    });

    it("devrait rejeter l'annulation moins de 24h avant l'événement (non admin)", async () => {
      const reservation = createMockReservation({
        status: ReservationStatus.CONFIRMED,
        userId: 'user-1',
      });
      repo.findOne!.mockResolvedValue(reservation);

      const mockEvent = createMockEvent({
        startDate: new Date(Date.now() + 12 * 60 * 60 * 1000), // 12h dans le futur
      });
      eventsService.findById!.mockResolvedValue(mockEvent);

      await expect(
        service.cancel(mockObjectId.toHexString(), {}, 'user-1', false),
      ).rejects.toThrow(BadRequestException);
    });

    it("devrait permettre à un admin d'annuler moins de 24h avant l'événement", async () => {
      const reservation = createMockReservation({
        status: ReservationStatus.CONFIRMED,
        userId: 'user-1',
        numberOfTickets: 1,
      });
      repo.findOne!.mockResolvedValue(reservation);

      const mockEvent = createMockEvent({
        startDate: new Date(Date.now() + 12 * 60 * 60 * 1000),
      });
      eventsService.findById!.mockResolvedValue(mockEvent);
      eventsService.decrementRegisteredCount!.mockResolvedValue({});

      const canceled = {
        ...reservation,
        status: ReservationStatus.CANCELED,
      };
      repo.save!.mockResolvedValue(canceled);

      const result = await service.cancel(
        mockObjectId.toHexString(),
        { reason: 'Admin override' },
        'admin-1',
        true,
      );

      expect(result.status).toBe(ReservationStatus.CANCELED);
    });

    it('devrait ne pas libérer les places si la réservation était en attente', async () => {
      const reservation = createMockReservation({
        status: ReservationStatus.PENDING,
        userId: 'user-1',
      });
      repo.findOne!.mockResolvedValue(reservation);

      const mockEvent = createMockEvent({
        startDate: new Date(Date.now() + 48 * 60 * 60 * 1000),
      });
      eventsService.findById!.mockResolvedValue(mockEvent);

      const canceled = {
        ...reservation,
        status: ReservationStatus.CANCELED,
      };
      repo.save!.mockResolvedValue(canceled);

      await service.cancel(mockObjectId.toHexString(), {}, 'user-1', false);

      expect(eventsService.decrementRegisteredCount).not.toHaveBeenCalled();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════════
  // CHECK-IN
  // ═══════════════════════════════════════════════════════════════════════════════

  describe('checkIn', () => {
    it('devrait enregistrer le check-in pour une réservation confirmée dans la fenêtre', async () => {
      const reservation = createMockReservation({
        status: ReservationStatus.CONFIRMED,
      });
      repo.findOne!.mockResolvedValue(reservation);

      // Événement en cours (commence dans 1h)
      const now = new Date();
      const mockEvent = createMockEvent({
        startDate: new Date(now.getTime() + 1 * 60 * 60 * 1000),
        endDate: new Date(now.getTime() + 10 * 60 * 60 * 1000),
      });
      eventsService.findById!.mockResolvedValue(mockEvent);

      const checkedIn = {
        ...reservation,
        status: ReservationStatus.CHECKED_IN,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        checkedInAt: expect.any(Date),
      };
      repo.save!.mockResolvedValue(checkedIn);

      const result = await service.checkIn(mockObjectId.toHexString());

      expect(result.status).toBe(ReservationStatus.CHECKED_IN);
    });

    it("devrait rejeter si la réservation n'est pas confirmée", async () => {
      const reservation = createMockReservation({
        status: ReservationStatus.PENDING,
      });
      repo.findOne!.mockResolvedValue(reservation);

      await expect(service.checkIn(mockObjectId.toHexString())).rejects.toThrow(
        BadRequestException,
      );
    });

    it('devrait rejeter si le check-in est trop tôt (plus de 2h avant)', async () => {
      const reservation = createMockReservation({
        status: ReservationStatus.CONFIRMED,
      });
      repo.findOne!.mockResolvedValue(reservation);

      const mockEvent = createMockEvent({
        startDate: new Date(Date.now() + 5 * 60 * 60 * 1000), // 5h dans le futur
        endDate: new Date(Date.now() + 14 * 60 * 60 * 1000),
      });
      eventsService.findById!.mockResolvedValue(mockEvent);

      await expect(service.checkIn(mockObjectId.toHexString())).rejects.toThrow(
        BadRequestException,
      );
    });

    it("devrait rejeter si l'événement est terminé", async () => {
      const reservation = createMockReservation({
        status: ReservationStatus.CONFIRMED,
      });
      repo.findOne!.mockResolvedValue(reservation);

      const mockEvent = createMockEvent({
        startDate: new Date('2020-01-01T09:00:00Z'),
        endDate: new Date('2020-01-01T18:00:00Z'),
      });
      eventsService.findById!.mockResolvedValue(mockEvent);

      await expect(service.checkIn(mockObjectId.toHexString())).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════════
  // MARK NO-SHOW
  // ═══════════════════════════════════════════════════════════════════════════════

  describe('markNoShow', () => {
    it('devrait marquer une réservation confirmée comme no-show', async () => {
      const reservation = createMockReservation({
        status: ReservationStatus.CONFIRMED,
      });
      repo.findOne!.mockResolvedValue(reservation);

      const noShow = { ...reservation, status: ReservationStatus.NO_SHOW };
      repo.save!.mockResolvedValue(noShow);

      const result = await service.markNoShow(mockObjectId.toHexString());

      expect(result.status).toBe(ReservationStatus.NO_SHOW);
    });

    it("devrait rejeter si la réservation n'est pas confirmée", async () => {
      const reservation = createMockReservation({
        status: ReservationStatus.CANCELED,
      });
      repo.findOne!.mockResolvedValue(reservation);

      await expect(
        service.markNoShow(mockObjectId.toHexString()),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════════
  // REFUND
  // ═══════════════════════════════════════════════════════════════════════════════

  describe('refund', () => {
    it('devrait rembourser une réservation annulée', async () => {
      const reservation = createMockReservation({
        status: ReservationStatus.CANCELED,
      });
      repo.findOne!.mockResolvedValue(reservation);

      const refunded = { ...reservation, status: ReservationStatus.REFUNDED };
      repo.save!.mockResolvedValue(refunded);

      const result = await service.refund(mockObjectId.toHexString());

      expect(result.status).toBe(ReservationStatus.REFUNDED);
    });

    it('devrait rembourser une réservation no-show', async () => {
      const reservation = createMockReservation({
        status: ReservationStatus.NO_SHOW,
      });
      repo.findOne!.mockResolvedValue(reservation);

      const refunded = { ...reservation, status: ReservationStatus.REFUNDED };
      repo.save!.mockResolvedValue(refunded);

      const result = await service.refund(mockObjectId.toHexString());

      expect(result.status).toBe(ReservationStatus.REFUNDED);
    });

    it("devrait rejeter le remboursement d'une réservation confirmée", async () => {
      const reservation = createMockReservation({
        status: ReservationStatus.CONFIRMED,
      });
      repo.findOne!.mockResolvedValue(reservation);

      await expect(service.refund(mockObjectId.toHexString())).rejects.toThrow(
        BadRequestException,
      );
    });

    it("devrait rejeter le remboursement d'une réservation en attente", async () => {
      const reservation = createMockReservation({
        status: ReservationStatus.PENDING,
      });
      repo.findOne!.mockResolvedValue(reservation);

      await expect(service.refund(mockObjectId.toHexString())).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════════
  // FIND BY ID
  // ═══════════════════════════════════════════════════════════════════════════════

  describe('findById', () => {
    it('devrait retourner une réservation existante', async () => {
      const reservation = createMockReservation();
      repo.findOne!.mockResolvedValue(reservation);

      const result = await service.findById(mockObjectId.toHexString());

      expect(result).toEqual(reservation);
    });

    it("devrait lever NotFoundException si la réservation n'existe pas", async () => {
      repo.findOne!.mockResolvedValue(null);

      await expect(
        service.findById(new ObjectId().toHexString()),
      ).rejects.toThrow(NotFoundException);
    });

    it('devrait lever NotFoundException pour un ID invalide', async () => {
      await expect(service.findById('invalid-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════════
  // FIND BY RESERVATION NUMBER
  // ═══════════════════════════════════════════════════════════════════════════════

  describe('findByReservationNumber', () => {
    it('devrait retourner une réservation par numéro', async () => {
      const reservation = createMockReservation();
      repo.findOne!.mockResolvedValue(reservation);

      const result = await service.findByReservationNumber('RES-ABC123-DEF456');

      expect(result).toEqual(reservation);
      expect(repo.findOne).toHaveBeenCalledWith({
        where: { reservationNumber: 'RES-ABC123-DEF456' },
      });
    });

    it("devrait lever NotFoundException si le numéro n'existe pas", async () => {
      repo.findOne!.mockResolvedValue(null);

      await expect(
        service.findByReservationNumber('RES-INEXISTANT'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════════
  // FIND ALL (pagination & filtres)
  // ═══════════════════════════════════════════════════════════════════════════════

  describe('findAll', () => {
    it('devrait retourner une liste paginée avec transformations', async () => {
      const reservations = [createMockReservation()];
      repo.find!.mockResolvedValue(reservations);
      repo.count!.mockResolvedValue(1);

      const result = await service.findAll({});

      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(10);
      expect(result.reservations).toHaveLength(1);
    });

    it('devrait appliquer les filtres de statut et eventId', async () => {
      repo.find!.mockResolvedValue([]);
      repo.count!.mockResolvedValue(0);

      await service.findAll({
        status: ReservationStatus.CONFIRMED,
        eventId: 'event-1',
      });

      expect(repo.find).toHaveBeenCalledWith(
        expect.objectContaining({
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          where: expect.objectContaining({
            status: ReservationStatus.CONFIRMED,
            eventId: 'event-1',
          }),
        }),
      );
    });

    it('devrait filtrer par numéro de réservation (regex)', async () => {
      repo.find!.mockResolvedValue([]);
      repo.count!.mockResolvedValue(0);

      await service.findAll({ reservationNumber: 'RES-ABC' });

      expect(repo.find).toHaveBeenCalledWith(
        expect.objectContaining({
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          where: expect.objectContaining({
            reservationNumber: { $regex: 'RES-ABC', $options: 'i' },
          }),
        }),
      );
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════════
  // GENERATE TICKET PDF
  // ═══════════════════════════════════════════════════════════════════════════════

  describe('generateTicketPdf', () => {
    it('devrait générer un PDF pour une réservation confirmée du propriétaire', async () => {
      const reservation = createMockReservation({
        status: ReservationStatus.CONFIRMED,
        userId: 'user-1',
      });
      repo.findOne!.mockResolvedValue(reservation);

      const pdfBuffer = Buffer.from('pdf-content');
      pdfService.generateTicketPdf!.mockResolvedValue(pdfBuffer);

      const result = await service.generateTicketPdf(
        mockObjectId.toHexString(),
        'user-1',
        false,
      );

      expect(result).toEqual(pdfBuffer);
      expect(pdfService.generateTicketPdf).toHaveBeenCalledWith(reservation);
    });

    it('devrait lever ForbiddenException si non propriétaire et non admin', async () => {
      const reservation = createMockReservation({ userId: 'user-1' });
      repo.findOne!.mockResolvedValue(reservation);

      await expect(
        service.generateTicketPdf(mockObjectId.toHexString(), 'intrus', false),
      ).rejects.toThrow(ForbiddenException);
    });

    it("devrait rejeter si la réservation n'est pas confirmée", async () => {
      const reservation = createMockReservation({
        status: ReservationStatus.PENDING,
        userId: 'user-1',
      });
      repo.findOne!.mockResolvedValue(reservation);

      await expect(
        service.generateTicketPdf(mockObjectId.toHexString(), 'user-1', false),
      ).rejects.toThrow(BadRequestException);
    });

    it('devrait permettre à un admin de générer le PDF', async () => {
      const reservation = createMockReservation({
        status: ReservationStatus.CONFIRMED,
        userId: 'user-1',
      });
      repo.findOne!.mockResolvedValue(reservation);

      const pdfBuffer = Buffer.from('pdf-content');
      pdfService.generateTicketPdf!.mockResolvedValue(pdfBuffer);

      const result = await service.generateTicketPdf(
        mockObjectId.toHexString(),
        'admin-1',
        true,
      );

      expect(result).toEqual(pdfBuffer);
    });

    it('devrait accepter le PDF pour une réservation checked-in', async () => {
      const reservation = createMockReservation({
        status: ReservationStatus.CHECKED_IN,
        userId: 'user-1',
      });
      repo.findOne!.mockResolvedValue(reservation);

      const pdfBuffer = Buffer.from('pdf-content');
      pdfService.generateTicketPdf!.mockResolvedValue(pdfBuffer);

      const result = await service.generateTicketPdf(
        mockObjectId.toHexString(),
        'user-1',
        false,
      );

      expect(result).toEqual(pdfBuffer);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════════
  // VERIFY BY QR CODE
  // ═══════════════════════════════════════════════════════════════════════════════

  describe('verifyByQrCode', () => {
    it('devrait valider un QR code pour une réservation confirmée', async () => {
      const reservation = createMockReservation({
        status: ReservationStatus.CONFIRMED,
      });
      repo.findOne!.mockResolvedValue(reservation);

      const result = await service.verifyByQrCode('QR-VALID');

      expect(result.valid).toBe(true);
      expect(result.message).toBe('Réservation valide');
    });

    it('devrait invalider un QR code inexistant', async () => {
      repo.findOne!.mockResolvedValue(null);

      const result = await service.verifyByQrCode('QR-INVALID');

      expect(result.valid).toBe(false);
      expect(result.message).toBe('Code de réservation invalide');
    });

    it('devrait invalider un QR code pour une réservation annulée', async () => {
      const reservation = createMockReservation({
        status: ReservationStatus.CANCELED,
      });
      repo.findOne!.mockResolvedValue(reservation);

      const result = await service.verifyByQrCode('QR-CANCELED');

      expect(result.valid).toBe(false);
      expect(result.message).toBe('Cette réservation a été annulée');
    });

    it('devrait invalider un QR code pour une réservation déjà utilisée', async () => {
      const reservation = createMockReservation({
        status: ReservationStatus.CHECKED_IN,
      });
      repo.findOne!.mockResolvedValue(reservation);

      const result = await service.verifyByQrCode('QR-USED');

      expect(result.valid).toBe(false);
      expect(result.message).toBe('Cette réservation a déjà été utilisée');
    });

    it('devrait invalider un QR code pour un statut non valide (pending)', async () => {
      const reservation = createMockReservation({
        status: ReservationStatus.PENDING,
      });
      repo.findOne!.mockResolvedValue(reservation);

      const result = await service.verifyByQrCode('QR-PENDING');

      expect(result.valid).toBe(false);
      expect(result.message).toBe("Cette réservation n'est pas valide");
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════════
  // STATISTICS
  // ═══════════════════════════════════════════════════════════════════════════════

  describe('getStatistics', () => {
    it('devrait retourner les statistiques globales correctes', async () => {
      const confirmedReservations = [
        createMockReservation({ totalPrice: 100 }),
        createMockReservation({ totalPrice: 250 }),
      ];

      repo
        .count!.mockResolvedValueOnce(50) // total
        .mockResolvedValueOnce(5) // pending
        .mockResolvedValueOnce(30) // confirmed
        .mockResolvedValueOnce(8) // canceled
        .mockResolvedValueOnce(4) // checked_in
        .mockResolvedValueOnce(2) // no_show
        .mockResolvedValueOnce(1) // refunded
        .mockResolvedValueOnce(3); // today
      repo.find!.mockResolvedValue(confirmedReservations);

      const stats = await service.getStatistics();

      expect(stats.total).toBe(50);
      expect(stats.byStatus[ReservationStatus.CONFIRMED]).toBe(30);
      expect(stats.byStatus[ReservationStatus.CANCELED]).toBe(8);
      expect(stats.totalRevenue).toBe(350);
      expect(stats.todayReservations).toBe(3);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════════
  // FIND BY ORGANIZER
  // ═══════════════════════════════════════════════════════════════════════════════

  describe('findByOrganizer', () => {
    it("devrait retourner les réservations des événements de l'organisateur", async () => {
      const events = [
        createMockEvent({ _id: new ObjectId() }),
        createMockEvent({ _id: new ObjectId() }),
      ];
      eventsService.findByOrganizer!.mockResolvedValue({
        events,
        total: 2,
        page: 1,
        limit: 1000,
        totalPages: 1,
      });

      const reservations = [createMockReservation()];
      repo.find!.mockResolvedValue(reservations);
      repo.count!.mockResolvedValue(1);

      const result = await service.findByOrganizer('org-1', {});

      expect(eventsService.findByOrganizer).toHaveBeenCalledWith('org-1', {
        page: 1,
        limit: 1000,
      });
      expect(result.reservations).toHaveLength(1);
    });

    it("devrait retourner un résultat vide si l'organisateur n'a pas d'événements", async () => {
      eventsService.findByOrganizer!.mockResolvedValue({
        events: [],
        total: 0,
        page: 1,
        limit: 1000,
        totalPages: 0,
      });

      const result = await service.findByOrganizer('org-empty', {});

      expect(result.reservations).toHaveLength(0);
      expect(result.total).toBe(0);
    });
  });
});
