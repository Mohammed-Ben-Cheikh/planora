import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ObjectId } from 'mongodb';
import { MongoRepository } from 'typeorm';
import { EventStatus } from '../common/enums/event-status.enum';
import { Event } from './entities/event.entity';
import { EventsService } from './events.service';

// ─── Helpers ────────────────────────────────────────────────────────────────────

const mockObjectId = new ObjectId();

const createMockEvent = (overrides: Partial<Event> = {}): Event =>
  ({
    _id: mockObjectId,
    title: 'Conférence Tech 2026',
    description: 'Une super conférence sur les nouvelles technologies',
    location: 'Paris',
    startDate: new Date('2026-06-15T09:00:00Z'),
    endDate: new Date('2026-06-15T18:00:00Z'),
    capacity: 100,
    registeredCount: 0,
    status: EventStatus.DRAFT,
    price: 25,
    organizerId: 'organizer-123',
    organizerName: 'John Doe',
    category: 'tech',
    createdAt: new Date(),
    updatedAt: new Date(),
    constructor: Event.prototype.constructor,
    ...overrides,
  }) as Event;

// ─── Mock Repository ────────────────────────────────────────────────────────────

const createMockRepository = (): Partial<
  Record<keyof MongoRepository<Event>, jest.Mock>
> => ({
  create: jest.fn(),
  save: jest.fn(),
  find: jest.fn(),
  findOne: jest.fn(),
  count: jest.fn(),
  delete: jest.fn(),
});

// ─── Test Suite ─────────────────────────────────────────────────────────────────

describe('EventsService', () => {
  let service: EventsService;
  let repo: ReturnType<typeof createMockRepository>;

  beforeEach(async () => {
    repo = createMockRepository();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EventsService,
        { provide: getRepositoryToken(Event), useValue: repo },
      ],
    }).compile();

    service = module.get<EventsService>(EventsService);
  });

  afterEach(() => jest.clearAllMocks());

  // ═══════════════════════════════════════════════════════════════════════════════
  // CREATE
  // ═══════════════════════════════════════════════════════════════════════════════

  describe('create', () => {
    const createDto = {
      title: 'Conférence Tech 2026',
      description: 'Une super conférence sur les nouvelles technologies',
      location: 'Paris',
      startDate: '2026-06-15T09:00:00Z',
      endDate: '2026-06-15T18:00:00Z',
      capacity: 100,
      price: 25,
      category: 'tech',
    };

    it('devrait créer un événement avec succès', async () => {
      const mockEvent = createMockEvent();
      repo.create!.mockReturnValue(mockEvent);
      repo.save!.mockResolvedValue(mockEvent);

      const result = await service.create(
        createDto,
        'organizer-123',
        'John Doe',
      );

      expect(repo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          title: createDto.title,
          organizerId: 'organizer-123',
          organizerName: 'John Doe',
          status: EventStatus.DRAFT,
          registeredCount: 0,
        }),
      );
      expect(repo.save).toHaveBeenCalledWith(mockEvent);
      expect(result).toEqual(mockEvent);
    });

    it('devrait utiliser le statut fourni si spécifié', async () => {
      const dtoWithStatus = { ...createDto, status: EventStatus.PUBLISHED };
      const mockEvent = createMockEvent({ status: EventStatus.PUBLISHED });
      repo.create!.mockReturnValue(mockEvent);
      repo.save!.mockResolvedValue(mockEvent);

      await service.create(dtoWithStatus, 'organizer-123');

      expect(repo.create).toHaveBeenCalledWith(
        expect.objectContaining({ status: EventStatus.PUBLISHED }),
      );
    });

    it('devrait rejeter si la date de fin est avant la date de début', async () => {
      const invalidDto = {
        ...createDto,
        startDate: '2026-06-15T18:00:00Z',
        endDate: '2026-06-15T09:00:00Z',
      };

      await expect(service.create(invalidDto, 'organizer-123')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('devrait rejeter si les dates sont invalides', async () => {
      const invalidDto = {
        ...createDto,
        startDate: 'not-a-date',
        endDate: '2026-06-15T18:00:00Z',
      };

      await expect(service.create(invalidDto, 'organizer-123')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('devrait rejeter si la date de fin est égale à la date de début', async () => {
      const sameDateTime = '2026-06-15T09:00:00Z';
      const invalidDto = {
        ...createDto,
        startDate: sameDateTime,
        endDate: sameDateTime,
      };

      await expect(service.create(invalidDto, 'organizer-123')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════════
  // FIND ALL (avec filtres & pagination)
  // ═══════════════════════════════════════════════════════════════════════════════

  describe('findAll', () => {
    it('devrait retourner une liste paginée avec les valeurs par défaut', async () => {
      const events = [createMockEvent()];
      repo.find!.mockResolvedValue(events);
      repo.count!.mockResolvedValue(1);

      const result = await service.findAll({});

      expect(result).toEqual({
        events,
        total: 1,
        page: 1,
        limit: 10,
        totalPages: 1,
      });
    });

    it('devrait appliquer les filtres de statut et catégorie', async () => {
      repo.find!.mockResolvedValue([]);
      repo.count!.mockResolvedValue(0);

      await service.findAll({
        status: EventStatus.PUBLISHED,
        category: 'tech',
      });

      expect(repo.find).toHaveBeenCalledWith(
        expect.objectContaining({
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          where: expect.objectContaining({
            status: EventStatus.PUBLISHED,
            category: 'tech',
          }),
        }),
      );
    });

    it('devrait appliquer le filtre de recherche textuelle', async () => {
      repo.find!.mockResolvedValue([]);
      repo.count!.mockResolvedValue(0);

      await service.findAll({ search: 'tech' });

      expect(repo.find).toHaveBeenCalledWith(
        expect.objectContaining({
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          where: expect.objectContaining({
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
            $or: expect.arrayContaining([
              { title: { $regex: 'tech', $options: 'i' } },
              { description: { $regex: 'tech', $options: 'i' } },
              { location: { $regex: 'tech', $options: 'i' } },
            ]),
          }),
        }),
      );
    });

    it('devrait appliquer les filtres de dates', async () => {
      repo.find!.mockResolvedValue([]);
      repo.count!.mockResolvedValue(0);

      await service.findAll({
        startDateFrom: '2026-01-01',
        startDateTo: '2026-12-31',
      });

      expect(repo.find).toHaveBeenCalledWith(
        expect.objectContaining({
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          where: expect.objectContaining({
            startDate: {
              $gte: new Date('2026-01-01'),
              $lte: new Date('2026-12-31'),
            },
          }),
        }),
      );
    });

    it('devrait calculer correctement la pagination', async () => {
      repo.find!.mockResolvedValue([]);
      repo.count!.mockResolvedValue(25);

      const result = await service.findAll({ page: 2, limit: 5 });

      expect(repo.find).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 5, take: 5 }),
      );
      expect(result.totalPages).toBe(5);
      expect(result.page).toBe(2);
    });

    it('devrait appliquer le tri personnalisé', async () => {
      repo.find!.mockResolvedValue([]);
      repo.count!.mockResolvedValue(0);

      await service.findAll({ sortBy: 'title', sortOrder: 'desc' });

      expect(repo.find).toHaveBeenCalledWith(
        expect.objectContaining({ order: { title: -1 } }),
      );
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════════
  // FIND PUBLISHED
  // ═══════════════════════════════════════════════════════════════════════════════

  describe('findPublished', () => {
    it('devrait filtrer uniquement les événements publiés', async () => {
      repo.find!.mockResolvedValue([]);
      repo.count!.mockResolvedValue(0);

      await service.findPublished({});

      expect(repo.find).toHaveBeenCalledWith(
        expect.objectContaining({
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          where: expect.objectContaining({
            status: EventStatus.PUBLISHED,
          }),
        }),
      );
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════════
  // FIND BY ID
  // ═══════════════════════════════════════════════════════════════════════════════

  describe('findById', () => {
    it('devrait retourner un événement existant', async () => {
      const mockEvent = createMockEvent();
      repo.findOne!.mockResolvedValue(mockEvent);

      const result = await service.findById(mockObjectId.toHexString());

      expect(result).toEqual(mockEvent);
    });

    it("devrait lever NotFoundException si l'événement n'existe pas", async () => {
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
  // FIND PUBLISHED BY ID
  // ═══════════════════════════════════════════════════════════════════════════════

  describe('findPublishedById', () => {
    it('devrait retourner un événement publié', async () => {
      const mockEvent = createMockEvent({ status: EventStatus.PUBLISHED });
      repo.findOne!.mockResolvedValue(mockEvent);

      const result = await service.findPublishedById(
        mockObjectId.toHexString(),
      );

      expect(result.status).toBe(EventStatus.PUBLISHED);
    });

    it('devrait lever NotFoundException pour un événement non publié (draft)', async () => {
      const mockEvent = createMockEvent({ status: EventStatus.DRAFT });
      repo.findOne!.mockResolvedValue(mockEvent);

      await expect(
        service.findPublishedById(mockObjectId.toHexString()),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════════
  // FIND BY ID FOR ORGANIZER
  // ═══════════════════════════════════════════════════════════════════════════════

  describe('findByIdForOrganizer', () => {
    it("devrait retourner l'événement si l'organisateur est le propriétaire", async () => {
      const mockEvent = createMockEvent({ organizerId: 'organizer-123' });
      repo.findOne!.mockResolvedValue(mockEvent);

      const result = await service.findByIdForOrganizer(
        mockObjectId.toHexString(),
        'organizer-123',
      );

      expect(result).toEqual(mockEvent);
    });

    it("devrait lever ForbiddenException si l'utilisateur n'est pas l'organisateur", async () => {
      const mockEvent = createMockEvent({ organizerId: 'organizer-123' });
      repo.findOne!.mockResolvedValue(mockEvent);

      await expect(
        service.findByIdForOrganizer(
          mockObjectId.toHexString(),
          'another-user',
        ),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════════
  // UPDATE
  // ═══════════════════════════════════════════════════════════════════════════════

  describe('update', () => {
    it('devrait mettre à jour un événement par son organisateur', async () => {
      const mockEvent = createMockEvent({ organizerId: 'user-1' });
      repo.findOne!.mockResolvedValue(mockEvent);
      repo.save!.mockResolvedValue({ ...mockEvent, title: 'Titre mis à jour' });

      const result = await service.update(
        mockObjectId.toHexString(),
        { title: 'Titre mis à jour' },
        'user-1',
        false,
      );

      expect(result.title).toBe('Titre mis à jour');
    });

    it("devrait permettre à un admin de modifier n'importe quel événement", async () => {
      const mockEvent = createMockEvent({ organizerId: 'user-1' });
      repo.findOne!.mockResolvedValue(mockEvent);
      repo.save!.mockResolvedValue({ ...mockEvent, title: 'Admin update' });

      const result = await service.update(
        mockObjectId.toHexString(),
        { title: 'Admin update' },
        'admin-user',
        true,
      );

      expect(result.title).toBe('Admin update');
    });

    it("devrait lever ForbiddenException si l'utilisateur n'est ni admin ni organisateur", async () => {
      const mockEvent = createMockEvent({ organizerId: 'user-1' });
      repo.findOne!.mockResolvedValue(mockEvent);

      await expect(
        service.update(
          mockObjectId.toHexString(),
          { title: 'Piratage' },
          'intrus',
          false,
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('devrait valider la transition de statut', async () => {
      const mockEvent = createMockEvent({ status: EventStatus.CANCELED });
      repo.findOne!.mockResolvedValue(mockEvent);

      await expect(
        service.update(
          mockObjectId.toHexString(),
          { status: EventStatus.PUBLISHED },
          'organizer-123',
          true,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it("devrait rejeter une capacité inférieure au nombre d'inscrits", async () => {
      const mockEvent = createMockEvent({
        registeredCount: 50,
        organizerId: 'user-1',
      });
      repo.findOne!.mockResolvedValue(mockEvent);

      await expect(
        service.update(
          mockObjectId.toHexString(),
          { capacity: 30 },
          'user-1',
          false,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('devrait valider les nouvelles dates si elles sont modifiées', async () => {
      const mockEvent = createMockEvent({ organizerId: 'user-1' });
      repo.findOne!.mockResolvedValue(mockEvent);

      await expect(
        service.update(
          mockObjectId.toHexString(),
          {
            startDate: '2026-06-15T18:00:00Z',
            endDate: '2026-06-15T09:00:00Z',
          },
          'user-1',
          false,
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════════
  // PUBLISH
  // ═══════════════════════════════════════════════════════════════════════════════

  describe('publish', () => {
    it('devrait publier un événement en draft avec une date future', async () => {
      const mockEvent = createMockEvent({
        status: EventStatus.DRAFT,
        startDate: new Date('2027-01-01'),
        organizerId: 'user-1',
      });
      repo.findOne!.mockResolvedValue(mockEvent);
      repo.save!.mockResolvedValue({
        ...mockEvent,
        status: EventStatus.PUBLISHED,
      });

      const result = await service.publish(
        mockObjectId.toHexString(),
        'user-1',
        false,
      );

      expect(result.status).toBe(EventStatus.PUBLISHED);
    });

    it("devrait lever ForbiddenException si l'utilisateur n'est pas l'organisateur", async () => {
      const mockEvent = createMockEvent({
        status: EventStatus.DRAFT,
        organizerId: 'user-1',
      });
      repo.findOne!.mockResolvedValue(mockEvent);

      await expect(
        service.publish(mockObjectId.toHexString(), 'intrus', false),
      ).rejects.toThrow(ForbiddenException);
    });

    it("devrait rejeter la publication d'un événement déjà publié", async () => {
      const mockEvent = createMockEvent({
        status: EventStatus.PUBLISHED,
        organizerId: 'user-1',
      });
      repo.findOne!.mockResolvedValue(mockEvent);

      await expect(
        service.publish(mockObjectId.toHexString(), 'user-1', false),
      ).rejects.toThrow(BadRequestException);
    });

    it('devrait rejeter la publication si la date de début est passée', async () => {
      const mockEvent = createMockEvent({
        status: EventStatus.DRAFT,
        startDate: new Date('2020-01-01'),
        organizerId: 'user-1',
      });
      repo.findOne!.mockResolvedValue(mockEvent);

      await expect(
        service.publish(mockObjectId.toHexString(), 'user-1', false),
      ).rejects.toThrow(BadRequestException);
    });

    it('devrait permettre à un admin de publier un événement', async () => {
      const mockEvent = createMockEvent({
        status: EventStatus.DRAFT,
        startDate: new Date('2027-01-01'),
        organizerId: 'user-1',
      });
      repo.findOne!.mockResolvedValue(mockEvent);
      repo.save!.mockResolvedValue({
        ...mockEvent,
        status: EventStatus.PUBLISHED,
      });

      const result = await service.publish(
        mockObjectId.toHexString(),
        'admin-user',
        true,
      );

      expect(result.status).toBe(EventStatus.PUBLISHED);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════════
  // CANCEL
  // ═══════════════════════════════════════════════════════════════════════════════

  describe('cancel', () => {
    it('devrait annuler un événement publié', async () => {
      const mockEvent = createMockEvent({
        status: EventStatus.PUBLISHED,
        organizerId: 'user-1',
      });
      repo.findOne!.mockResolvedValue(mockEvent);
      repo.save!.mockResolvedValue({
        ...mockEvent,
        status: EventStatus.CANCELED,
      });

      const result = await service.cancel(
        mockObjectId.toHexString(),
        'user-1',
        false,
      );

      expect(result.status).toBe(EventStatus.CANCELED);
    });

    it("devrait rejeter l'annulation d'un événement déjà annulé", async () => {
      const mockEvent = createMockEvent({
        status: EventStatus.CANCELED,
        organizerId: 'user-1',
      });
      repo.findOne!.mockResolvedValue(mockEvent);

      await expect(
        service.cancel(mockObjectId.toHexString(), 'user-1', false),
      ).rejects.toThrow(BadRequestException);
    });

    it("devrait lever ForbiddenException si l'utilisateur n'est pas autorisé", async () => {
      const mockEvent = createMockEvent({
        status: EventStatus.PUBLISHED,
        organizerId: 'user-1',
      });
      repo.findOne!.mockResolvedValue(mockEvent);

      await expect(
        service.cancel(mockObjectId.toHexString(), 'intrus', false),
      ).rejects.toThrow(ForbiddenException);
    });

    it("devrait permettre à un admin d'annuler n'importe quel événement", async () => {
      const mockEvent = createMockEvent({
        status: EventStatus.PUBLISHED,
        organizerId: 'user-1',
      });
      repo.findOne!.mockResolvedValue(mockEvent);
      repo.save!.mockResolvedValue({
        ...mockEvent,
        status: EventStatus.CANCELED,
      });

      const result = await service.cancel(
        mockObjectId.toHexString(),
        'admin',
        true,
      );

      expect(result.status).toBe(EventStatus.CANCELED);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════════
  // REMOVE
  // ═══════════════════════════════════════════════════════════════════════════════

  describe('remove', () => {
    it('devrait supprimer un événement en draft', async () => {
      const mockEvent = createMockEvent({
        status: EventStatus.DRAFT,
        registeredCount: 0,
        organizerId: 'user-1',
      });
      repo.findOne!.mockResolvedValue(mockEvent);
      repo.delete!.mockResolvedValue(undefined);

      await service.remove(mockObjectId.toHexString(), 'user-1', false);

      expect(repo.delete).toHaveBeenCalledWith(mockEvent._id);
    });

    it("devrait rejeter la suppression d'un événement publié avec des inscriptions", async () => {
      const mockEvent = createMockEvent({
        status: EventStatus.PUBLISHED,
        registeredCount: 10,
        organizerId: 'user-1',
      });
      repo.findOne!.mockResolvedValue(mockEvent);

      await expect(
        service.remove(mockObjectId.toHexString(), 'user-1', false),
      ).rejects.toThrow(BadRequestException);
    });

    it("devrait permettre la suppression d'un événement publié sans inscriptions", async () => {
      const mockEvent = createMockEvent({
        status: EventStatus.PUBLISHED,
        registeredCount: 0,
        organizerId: 'user-1',
      });
      repo.findOne!.mockResolvedValue(mockEvent);
      repo.delete!.mockResolvedValue(undefined);

      await service.remove(mockObjectId.toHexString(), 'user-1', false);

      expect(repo.delete).toHaveBeenCalled();
    });

    it('devrait lever ForbiddenException si non autorisé', async () => {
      const mockEvent = createMockEvent({ organizerId: 'user-1' });
      repo.findOne!.mockResolvedValue(mockEvent);

      await expect(
        service.remove(mockObjectId.toHexString(), 'intrus', false),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════════
  // INCREMENT / DECREMENT REGISTERED COUNT
  // ═══════════════════════════════════════════════════════════════════════════════

  describe('incrementRegisteredCount', () => {
    it('devrait incrémenter le compteur pour un événement publié avec de la place', async () => {
      const mockEvent = createMockEvent({
        status: EventStatus.PUBLISHED,
        capacity: 100,
        registeredCount: 50,
      });
      repo.findOne!.mockResolvedValue(mockEvent);
      repo.save!.mockResolvedValue({
        ...mockEvent,
        registeredCount: 51,
      });

      const result = await service.incrementRegisteredCount(
        mockObjectId.toHexString(),
      );

      expect(result.registeredCount).toBe(51);
    });

    it("devrait rejeter si l'événement n'est pas publié", async () => {
      const mockEvent = createMockEvent({ status: EventStatus.DRAFT });
      repo.findOne!.mockResolvedValue(mockEvent);

      await expect(
        service.incrementRegisteredCount(mockObjectId.toHexString()),
      ).rejects.toThrow(BadRequestException);
    });

    it("devrait rejeter si l'événement est complet", async () => {
      const mockEvent = createMockEvent({
        status: EventStatus.PUBLISHED,
        capacity: 100,
        registeredCount: 100,
      });
      repo.findOne!.mockResolvedValue(mockEvent);

      await expect(
        service.incrementRegisteredCount(mockObjectId.toHexString()),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('decrementRegisteredCount', () => {
    it('devrait décrémenter le compteur si > 0', async () => {
      const mockEvent = createMockEvent({ registeredCount: 10 });
      repo.findOne!.mockResolvedValue(mockEvent);
      repo.save!.mockResolvedValue({ ...mockEvent, registeredCount: 9 });

      const result = await service.decrementRegisteredCount(
        mockObjectId.toHexString(),
      );

      expect(result.registeredCount).toBe(9);
    });

    it('devrait ne pas décrémenter en dessous de 0', async () => {
      const mockEvent = createMockEvent({ registeredCount: 0 });
      repo.findOne!.mockResolvedValue(mockEvent);

      const result = await service.decrementRegisteredCount(
        mockObjectId.toHexString(),
      );

      expect(result.registeredCount).toBe(0);
      expect(repo.save).not.toHaveBeenCalled();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════════
  // STATISTICS
  // ═══════════════════════════════════════════════════════════════════════════════

  describe('getStatistics', () => {
    it('devrait retourner les statistiques globales correctes', async () => {
      const upcomingEvents = [
        createMockEvent({ capacity: 100, registeredCount: 30 }),
        createMockEvent({ capacity: 200, registeredCount: 150 }),
      ];

      repo
        .count!.mockResolvedValueOnce(10) // total
        .mockResolvedValueOnce(3) // drafts
        .mockResolvedValueOnce(5) // published
        .mockResolvedValueOnce(2); // canceled
      repo.find!.mockResolvedValue(upcomingEvents);

      const stats = await service.getStatistics();

      expect(stats.total).toBe(10);
      expect(stats.byStatus[EventStatus.DRAFT]).toBe(3);
      expect(stats.byStatus[EventStatus.PUBLISHED]).toBe(5);
      expect(stats.byStatus[EventStatus.CANCELED]).toBe(2);
      expect(stats.upcoming).toBe(2);
      expect(stats.totalCapacity).toBe(300);
      expect(stats.totalRegistered).toBe(180);
    });
  });

  describe('getStatisticsByOrganizer', () => {
    it('devrait retourner les statistiques pour un organisateur spécifique', async () => {
      const upcomingEvents = [
        createMockEvent({ capacity: 50, registeredCount: 10 }),
      ];

      repo
        .count!.mockResolvedValueOnce(5) // total
        .mockResolvedValueOnce(2) // drafts
        .mockResolvedValueOnce(2) // published
        .mockResolvedValueOnce(1); // canceled
      repo.find!.mockResolvedValue(upcomingEvents);

      const stats = await service.getStatisticsByOrganizer('organizer-123');

      expect(stats.total).toBe(5);
      expect(stats.totalCapacity).toBe(50);
      expect(stats.totalRegistered).toBe(10);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════════
  // FIND BY ORGANIZER
  // ═══════════════════════════════════════════════════════════════════════════════

  describe('findByOrganizer', () => {
    it('devrait retourner les événements filtrés par organisateur', async () => {
      const events = [createMockEvent({ organizerId: 'org-1' })];
      repo.find!.mockResolvedValue(events);
      repo.count!.mockResolvedValue(1);

      const result = await service.findByOrganizer('org-1', {});

      expect(repo.find).toHaveBeenCalledWith(
        expect.objectContaining({
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          where: expect.objectContaining({ organizerId: 'org-1' }),
        }),
      );
      expect(result.events).toHaveLength(1);
    });

    it('devrait filtrer par statut si fourni', async () => {
      repo.find!.mockResolvedValue([]);
      repo.count!.mockResolvedValue(0);

      await service.findByOrganizer('org-1', {
        status: EventStatus.PUBLISHED,
      });

      expect(repo.find).toHaveBeenCalledWith(
        expect.objectContaining({
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          where: expect.objectContaining({
            organizerId: 'org-1',
            status: EventStatus.PUBLISHED,
          }),
        }),
      );
    });
  });
});
