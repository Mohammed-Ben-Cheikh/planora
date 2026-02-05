import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import { ObjectId } from 'mongodb';
import { Role } from '../common/enums/role.enum';
import { User } from '../users/entities/user.entity';
import { UsersService } from '../users/users.service';
import { AuthService } from './auth.service';

// ─── Helpers ────────────────────────────────────────────────────────────────────

const mockObjectId = new ObjectId();

const createMockUser = (overrides: Partial<User> = {}): User =>
  ({
    _id: mockObjectId,
    username: 'johndoe',
    email: 'john@example.com',
    password: '$2b$10$hashedpassword',
    role: Role.PARTICIPANT,
    isActive: true,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
    ...overrides,
  }) as User;

// ─── Mocks ──────────────────────────────────────────────────────────────────────

const createMockUsersService = (): Partial<
  Record<keyof UsersService, jest.Mock>
> => ({
  findByEmail: jest.fn(),
  findById: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  validatePassword: jest.fn(),
});

const createMockJwtService = (): Partial<
  Record<keyof JwtService, jest.Mock>
> => ({
  signAsync: jest.fn(),
});

// ─── Test Suite ─────────────────────────────────────────────────────────────────

describe('AuthService', () => {
  let service: AuthService;
  let usersService: ReturnType<typeof createMockUsersService>;
  let jwtService: ReturnType<typeof createMockJwtService>;

  beforeEach(async () => {
    usersService = createMockUsersService();
    jwtService = createMockJwtService();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useValue: usersService },
        { provide: JwtService, useValue: jwtService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  afterEach(() => jest.clearAllMocks());

  // ═══════════════════════════════════════════════════════════════════════════════
  // LOGIN
  // ═══════════════════════════════════════════════════════════════════════════════

  describe('login', () => {
    const loginDto = { email: 'john@example.com', password: 'password123' };

    it('devrait connecter un utilisateur avec des identifiants valides', async () => {
      const mockUser = createMockUser();
      usersService.findByEmail!.mockResolvedValue(mockUser);
      usersService.validatePassword!.mockResolvedValue(true);
      jwtService.signAsync!.mockResolvedValue('jwt-token-abc');

      const result = await service.login(loginDto);

      expect(usersService.findByEmail).toHaveBeenCalledWith('john@example.com');
      expect(usersService.validatePassword).toHaveBeenCalledWith(
        'password123',
        mockUser.password,
      );
      expect(jwtService.signAsync).toHaveBeenCalledWith({
        sub: mockObjectId.toString(),
        email: 'john@example.com',
        role: Role.PARTICIPANT,
      });
      expect(result).toEqual({
        accessToken: 'jwt-token-abc',
        user: {
          id: mockObjectId.toString(),
          email: 'john@example.com',
          username: 'johndoe',
          role: Role.PARTICIPANT,
        },
      });
    });

    it("devrait lever UnauthorizedException si l'email n'existe pas", async () => {
      usersService.findByEmail!.mockResolvedValue(null);

      await expect(service.login(loginDto)).rejects.toThrow(
        UnauthorizedException,
      );
      expect(usersService.validatePassword).not.toHaveBeenCalled();
    });

    it('devrait lever UnauthorizedException si le compte est désactivé', async () => {
      const inactiveUser = createMockUser({ isActive: false });
      usersService.findByEmail!.mockResolvedValue(inactiveUser);

      await expect(service.login(loginDto)).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(service.login(loginDto)).rejects.toThrow('Compte désactivé');
    });

    it('devrait lever UnauthorizedException si le mot de passe est incorrect', async () => {
      const mockUser = createMockUser();
      usersService.findByEmail!.mockResolvedValue(mockUser);
      usersService.validatePassword!.mockResolvedValue(false);

      await expect(service.login(loginDto)).rejects.toThrow(
        UnauthorizedException,
      );
      expect(jwtService.signAsync).not.toHaveBeenCalled();
    });

    it('devrait connecter un admin avec succès', async () => {
      const adminUser = createMockUser({ role: Role.ADMIN });
      usersService.findByEmail!.mockResolvedValue(adminUser);
      usersService.validatePassword!.mockResolvedValue(true);
      jwtService.signAsync!.mockResolvedValue('admin-jwt-token');

      const result = await service.login(loginDto);

      expect(result.user.role).toBe(Role.ADMIN);
      expect(jwtService.signAsync).toHaveBeenCalledWith(
        expect.objectContaining({ role: Role.ADMIN }),
      );
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════════
  // REGISTER
  // ═══════════════════════════════════════════════════════════════════════════════

  describe('register', () => {
    const registerDto = {
      email: 'new@example.com',
      password: 'securePass123',
      username: 'newuser',
    };

    it('devrait inscrire un nouvel utilisateur avec le rôle PARTICIPANT', async () => {
      const mockUser = createMockUser({
        email: 'new@example.com',
        username: 'newuser',
        role: Role.PARTICIPANT,
      });
      usersService.create!.mockResolvedValue(mockUser);
      jwtService.signAsync!.mockResolvedValue('new-jwt-token');

      const result = await service.register(registerDto);

      expect(usersService.create).toHaveBeenCalledWith({
        ...registerDto,
        role: Role.PARTICIPANT,
      });
      expect(result).toEqual({
        accessToken: 'new-jwt-token',
        user: {
          id: mockObjectId.toString(),
          email: 'new@example.com',
          username: 'newuser',
          role: Role.PARTICIPANT,
        },
      });
    });

    it('devrait forcer le rôle PARTICIPANT même si un autre rôle est fourni', async () => {
      const dtoWithAdminRole = { ...registerDto, role: Role.ADMIN };
      const mockUser = createMockUser({ role: Role.PARTICIPANT });
      usersService.create!.mockResolvedValue(mockUser);
      jwtService.signAsync!.mockResolvedValue('jwt-token');

      await service.register(dtoWithAdminRole);

      expect(usersService.create).toHaveBeenCalledWith(
        expect.objectContaining({ role: Role.PARTICIPANT }),
      );
    });

    it("devrait propager ConflictException si l'email existe déjà", async () => {
      usersService.create!.mockRejectedValue(
        new ConflictException('Un utilisateur avec cet email existe déjà'),
      );

      await expect(service.register(registerDto)).rejects.toThrow(
        ConflictException,
      );
    });

    it("devrait lever ConflictException pour les erreurs inattendues lors de l'inscription", async () => {
      usersService.create!.mockRejectedValue(new Error('DB connection error'));

      await expect(service.register(registerDto)).rejects.toThrow(
        ConflictException,
      );
      await expect(service.register(registerDto)).rejects.toThrow(
        "Erreur lors de l'inscription",
      );
    });

    it('devrait générer un JWT valide après inscription', async () => {
      const mockUser = createMockUser();
      usersService.create!.mockResolvedValue(mockUser);
      jwtService.signAsync!.mockResolvedValue('new-user-jwt');

      const result = await service.register(registerDto);

      expect(jwtService.signAsync).toHaveBeenCalledWith({
        sub: mockObjectId.toString(),
        email: mockUser.email,
        role: mockUser.role,
      });
      expect(result.accessToken).toBe('new-user-jwt');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════════
  // VALIDATE USER
  // ═══════════════════════════════════════════════════════════════════════════════

  describe('validateUser', () => {
    it("devrait retourner l'utilisateur si l'ID est valide", async () => {
      const mockUser = createMockUser();
      usersService.findById!.mockResolvedValue(mockUser);

      const result = await service.validateUser(mockObjectId.toString());

      expect(usersService.findById).toHaveBeenCalledWith(
        mockObjectId.toString(),
      );
      expect(result).toEqual(mockUser);
    });

    it("devrait retourner null si l'utilisateur n'existe pas", async () => {
      usersService.findById!.mockResolvedValue(null);

      const result = await service.validateUser('nonexistent-id');

      expect(result).toBeNull();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════════
  // GET PROFILE
  // ═══════════════════════════════════════════════════════════════════════════════

  describe('getProfile', () => {
    it('devrait retourner le profil utilisateur sans le mot de passe', async () => {
      const mockUser = createMockUser();
      usersService.findById!.mockResolvedValue(mockUser);

      const result = await service.getProfile(mockObjectId.toString());

      expect(result).toEqual({
        id: mockObjectId.toString(),
        email: 'john@example.com',
        username: 'johndoe',
        role: Role.PARTICIPANT,
        isActive: true,
        createdAt: mockUser.createdAt,
      });
      // Le mot de passe ne doit pas être exposé
      expect(result).not.toHaveProperty('password');
    });

    it("devrait lever UnauthorizedException si l'utilisateur n'existe pas", async () => {
      usersService.findById!.mockResolvedValue(null);

      await expect(service.getProfile('nonexistent-id')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it("devrait retourner le profil d'un admin", async () => {
      const adminUser = createMockUser({ role: Role.ADMIN });
      usersService.findById!.mockResolvedValue(adminUser);

      const result = await service.getProfile(mockObjectId.toString());

      expect(result.role).toBe(Role.ADMIN);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════════
  // UPGRADE TO ADMIN
  // ═══════════════════════════════════════════════════════════════════════════════

  describe('upgradeToAdmin', () => {
    it('devrait promouvoir un utilisateur en admin', async () => {
      const mockUser = createMockUser({ role: Role.PARTICIPANT });
      usersService.findById!.mockResolvedValue(mockUser);
      usersService.update!.mockResolvedValue({
        ...mockUser,
        role: Role.ADMIN,
      });

      const result = await service.upgradeToAdmin(mockObjectId.toString());

      expect(usersService.update).toHaveBeenCalledWith(
        mockObjectId.toString(),
        { role: Role.ADMIN },
      );
      expect(result).toEqual({
        message: 'Vous êtes maintenant organisateur !',
      });
    });

    it("devrait lever UnauthorizedException si l'utilisateur n'existe pas", async () => {
      usersService.findById!.mockResolvedValue(null);

      await expect(service.upgradeToAdmin('nonexistent-id')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('devrait permettre de promouvoir un utilisateur déjà admin (idempotent)', async () => {
      const adminUser = createMockUser({ role: Role.ADMIN });
      usersService.findById!.mockResolvedValue(adminUser);
      usersService.update!.mockResolvedValue(adminUser);

      const result = await service.upgradeToAdmin(mockObjectId.toString());

      expect(result.message).toBe('Vous êtes maintenant organisateur !');
    });
  });
});
