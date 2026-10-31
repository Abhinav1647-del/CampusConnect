import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service.js';
import { PrismaService } from '../database/prisma.service.js';

// Full mock of PrismaService
const mockPrisma = {
  user: {
    findFirst: vi.fn(),
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
  userToken: {
    create: vi.fn(),
    findUnique: vi.fn(),
    update: vi.fn(),
    updateMany: vi.fn(),
  },
};

const mockJwt = {
  sign: vi.fn().mockReturnValue('mock.jwt.token'),
};

const mockConfig = {
  get: vi.fn((key: string, def?: string) => def ?? 'test-value'),
};

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(async () => {
    vi.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: JwtService, useValue: mockJwt },
        { provide: ConfigService, useValue: mockConfig },
      ],
    }).compile();
    service = module.get<AuthService>(AuthService);
  });

  describe('register', () => {
    it('should register a new user successfully', async () => {
      mockPrisma.user.findFirst.mockResolvedValue(null);
      mockPrisma.user.create.mockResolvedValue({
        id: 'user-1',
        email: 'test@iiitn.ac.in',
        name: 'Test',
        role: 'STUDENT',
        rollNumber: null,
        createdAt: new Date(),
      });
      mockPrisma.userToken.create.mockResolvedValue({ id: 'token-1' });

      const result = await service.register({
        email: 'test@iiitn.ac.in',
        name: 'Test',
        password: 'Test@1234',
      });

      expect(result.user.email).toBe('test@iiitn.ac.in');
      expect(result.message).toBe('Registration successful');
    });

    it('should throw ConflictException if email already exists', async () => {
      mockPrisma.user.findFirst.mockResolvedValue({ id: 'existing', email: 'test@iiitn.ac.in' });

      await expect(
        service.register({ email: 'test@iiitn.ac.in', name: 'Test', password: 'Test@1234' }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('login', () => {
    it('should return tokens on valid credentials', async () => {
      const bcrypt = await import('bcrypt');
      const hash = await bcrypt.hash('Test@1234', 12);
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        email: 'test@iiitn.ac.in',
        name: 'Test',
        role: 'STUDENT',
        isActive: true,
        passwordHash: hash,
        rollNumber: null,
        avatarUrl: null,
      });
      mockPrisma.userToken.create.mockResolvedValue({ id: 'token-1' });

      const result = await service.login({ email: 'test@iiitn.ac.in', password: 'Test@1234' });

      expect(result.accessToken).toBeDefined();
      expect(result.refreshToken).toBeDefined();
      expect(result.user.email).toBe('test@iiitn.ac.in');
    });

    it('should throw UnauthorizedException for wrong password', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        email: 'test@iiitn.ac.in',
        isActive: true,
        passwordHash: '$2b$12$eX4mpleHashThatDoesNotMatchPassword',
      });

      await expect(
        service.login({ email: 'test@iiitn.ac.in', password: 'WrongPass@1' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException for inactive user', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        email: 'test@iiitn.ac.in',
        isActive: false,
        passwordHash: 'hash',
      });

      await expect(
        service.login({ email: 'test@iiitn.ac.in', password: 'Test@1234' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException for non-existent user', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(
        service.login({ email: 'nobody@iiitn.ac.in', password: 'Test@1234' }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('refreshToken', () => {
    it('should return new tokens for valid refresh token', async () => {
      mockPrisma.userToken.findUnique.mockResolvedValue({
        id: 'token-1',
        token: 'valid-refresh',
        revokedAt: null,
        expiresAt: new Date(Date.now() + 86400000),
        user: { id: 'user-1', email: 'test@iiitn.ac.in', role: 'STUDENT' },
      });
      mockPrisma.userToken.update.mockResolvedValue({});
      mockPrisma.userToken.create.mockResolvedValue({ id: 'token-2' });

      const result = await service.refreshToken('valid-refresh');
      expect(result.accessToken).toBeDefined();
    });

    it('should throw UnauthorizedException for revoked token', async () => {
      mockPrisma.userToken.findUnique.mockResolvedValue({
        id: 'token-1',
        revokedAt: new Date(),
        expiresAt: new Date(Date.now() + 86400000),
        user: { id: 'user-1', email: 'test@iiitn.ac.in', role: 'STUDENT' },
      });

      await expect(service.refreshToken('revoked-token')).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException for expired token', async () => {
      mockPrisma.userToken.findUnique.mockResolvedValue({
        id: 'token-1',
        revokedAt: null,
        expiresAt: new Date(Date.now() - 1000),
        user: { id: 'user-1', email: 'test@iiitn.ac.in', role: 'STUDENT' },
      });

      await expect(service.refreshToken('expired-token')).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('logout', () => {
    it('should revoke the refresh token', async () => {
      mockPrisma.userToken.updateMany.mockResolvedValue({ count: 1 });
      const result = await service.logout('some-token');
      expect(result.message).toBe('Logged out successfully');
      expect(mockPrisma.userToken.updateMany).toHaveBeenCalledWith({
        where: { token: 'some-token', revokedAt: null },
        data: { revokedAt: expect.any(Date) },
      });
    });
  });
});
