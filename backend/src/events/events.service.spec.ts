import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { EventRegistrationStatus, Role } from '@prisma/client';
import { EventsService } from './events.service.js';
import { PrismaService } from '../database/prisma.service.js';

const now = new Date();
const future = new Date(Date.now() + 86400000 * 7);

const baseEvent = {
  id: 'event-1',
  clubId: 'club-1',
  title: 'Test Event',
  description: 'Test Description',
  posterUrl: null,
  venue: 'Hall A',
  startTime: future,
  endTime: null,
  registrationDeadline: future,
  capacity: 2,
  enableWaitlist: false,
  isCancelled: false,
  createdAt: now,
  updatedAt: now,
  _count: { registrations: 0 },
};

const mockPrisma = {
  club: {
    findUnique: vi.fn(),
  },
  event: {
    findUnique: vi.fn(),
    findMany: vi.fn(),
    count: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
  eventRegistration: {
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    updateMany: vi.fn(),
    count: vi.fn(),
  },
  clubMembership: {
    findUnique: vi.fn(),
    findFirst: vi.fn(),
  },
  bookmark: {
    findUnique: vi.fn(),
    create: vi.fn(),
    delete: vi.fn(),
    findMany: vi.fn(),
    count: vi.fn(),
  },
  $transaction: vi.fn((fn: any) => fn(mockPrisma)),
};

describe('EventsService', () => {
  let service: EventsService;

  beforeEach(async () => {
    vi.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EventsService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();
    service = module.get<EventsService>(EventsService);
  });

  describe('register', () => {
    it('should register a student for an event', async () => {
      mockPrisma.event.findUnique.mockResolvedValue({ ...baseEvent });
      mockPrisma.eventRegistration.findUnique.mockResolvedValue(null);
      mockPrisma.eventRegistration.count.mockResolvedValue(0);
      mockPrisma.eventRegistration.create.mockResolvedValue({
        id: 'reg-1',
        eventId: 'event-1',
        userId: 'user-1',
        status: EventRegistrationStatus.REGISTERED,
      });

      const result = await service.register('event-1', 'user-1');
      expect(result.status).toBe(EventRegistrationStatus.REGISTERED);
    });

    it('should throw ConflictException if already registered', async () => {
      mockPrisma.event.findUnique.mockResolvedValue({ ...baseEvent });
      mockPrisma.eventRegistration.findUnique.mockResolvedValue({
        id: 'reg-1',
        status: EventRegistrationStatus.REGISTERED,
      });

      await expect(service.register('event-1', 'user-1')).rejects.toThrow(ConflictException);
    });

    it('should throw ConflictException when capacity full and no waitlist', async () => {
      mockPrisma.event.findUnique.mockResolvedValue({
        ...baseEvent,
        capacity: 2,
        enableWaitlist: false,
      });
      mockPrisma.eventRegistration.findUnique.mockResolvedValue(null);
      mockPrisma.eventRegistration.count.mockResolvedValue(2);

      await expect(service.register('event-1', 'user-1')).rejects.toThrow(ConflictException);
    });

    it('should waitlist student when capacity full and waitlist enabled', async () => {
      mockPrisma.event.findUnique.mockResolvedValue({
        ...baseEvent,
        capacity: 2,
        enableWaitlist: true,
      });
      mockPrisma.eventRegistration.findUnique.mockResolvedValue(null);
      mockPrisma.eventRegistration.count.mockResolvedValue(2);
      mockPrisma.eventRegistration.create.mockResolvedValue({
        id: 'reg-1',
        eventId: 'event-1',
        userId: 'user-1',
        status: EventRegistrationStatus.WAITLISTED,
      });

      const result = await service.register('event-1', 'user-1');
      expect(result.status).toBe(EventRegistrationStatus.WAITLISTED);
    });

    it('should throw BadRequestException if registration deadline passed', async () => {
      const past = new Date(Date.now() - 86400000);
      mockPrisma.event.findUnique.mockResolvedValue({
        ...baseEvent,
        registrationDeadline: past,
      });

      await expect(service.register('event-1', 'user-1')).rejects.toThrow(BadRequestException);
    });

    it('should throw ConflictException if event is cancelled', async () => {
      mockPrisma.event.findUnique.mockResolvedValue({ ...baseEvent, isCancelled: true });

      await expect(service.register('event-1', 'user-1')).rejects.toThrow(ConflictException);
    });
  });

  describe('cancelRegistration', () => {
    it('should cancel registration and promote waitlisted user', async () => {
      mockPrisma.eventRegistration.findUnique.mockResolvedValue({
        id: 'reg-1',
        eventId: 'event-1',
        userId: 'user-1',
        status: EventRegistrationStatus.REGISTERED,
      });
      mockPrisma.eventRegistration.update
        .mockResolvedValueOnce({
          id: 'reg-1',
          status: EventRegistrationStatus.CANCELLED,
        })
        .mockResolvedValueOnce({
          id: 'reg-2',
          status: EventRegistrationStatus.REGISTERED,
        });
      mockPrisma.eventRegistration.findFirst.mockResolvedValue({
        id: 'reg-2',
        eventId: 'event-1',
        userId: 'user-2',
        status: EventRegistrationStatus.WAITLISTED,
      });

      const result = await service.cancelRegistration('event-1', 'user-1');
      expect(result.status).toBe(EventRegistrationStatus.CANCELLED);
      expect(mockPrisma.eventRegistration.update).toHaveBeenCalledTimes(2);
      expect(mockPrisma.eventRegistration.update).toHaveBeenLastCalledWith({
        where: { id: 'reg-2' },
        data: { status: EventRegistrationStatus.REGISTERED },
      });
    });
  });

  describe('cancel', () => {
    it('should cancel an event as APP_ADMIN', async () => {
      mockPrisma.event.findUnique.mockResolvedValue({ ...baseEvent });
      mockPrisma.event.update.mockResolvedValue({ ...baseEvent, isCancelled: true });
      mockPrisma.eventRegistration.updateMany.mockResolvedValue({ count: 1 });

      const result = await service.cancel('event-1', 'admin-1', Role.APP_ADMIN);
      expect(result.isCancelled).toBe(true);
      expect(mockPrisma.eventRegistration.updateMany).toHaveBeenCalledWith({
        where: {
          eventId: 'event-1',
          status: {
            in: [EventRegistrationStatus.REGISTERED, EventRegistrationStatus.WAITLISTED],
          },
        },
        data: { status: EventRegistrationStatus.CANCELLED },
      });
    });

    it('should throw ForbiddenException if user is not club lead or APP_ADMIN', async () => {
      mockPrisma.event.findUnique.mockResolvedValue({ ...baseEvent });
      mockPrisma.clubMembership.findUnique.mockResolvedValue(null);

      await expect(
        service.cancel('event-1', 'user-1', Role.STUDENT),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('create', () => {
    it('should create an event as club lead', async () => {
      mockPrisma.club.findUnique.mockResolvedValue({ id: 'club-1', name: 'Coding Club' });
      mockPrisma.clubMembership.findUnique.mockResolvedValue({
        clubId: 'club-1',
        userId: 'lead-1',
        isLead: true,
      });
      mockPrisma.event.create.mockResolvedValue({
        id: 'event-new',
        clubId: 'club-1',
        title: 'Hackathon',
      });

      const result = await service.create(
        'club-1',
        {
          title: 'Hackathon',
          startTime: future.toISOString(),
          capacity: 50,
          enableWaitlist: true,
        } as any,
        'lead-1',
        Role.CLUB_LEAD,
      );

      expect(result.id).toBe('event-new');
      expect(mockPrisma.event.create).toHaveBeenCalled();
    });

    it('should throw ForbiddenException when non-lead attempts to create event', async () => {
      mockPrisma.club.findUnique.mockResolvedValue({ id: 'club-1', name: 'Coding Club' });
      mockPrisma.clubMembership.findUnique.mockResolvedValue({
        clubId: 'club-1',
        userId: 'student-1',
        isLead: false,
      });

      await expect(
        service.create(
          'club-1',
          {
            title: 'Hackathon',
            startTime: future.toISOString(),
          } as any,
          'student-1',
          Role.STUDENT,
        ),
      ).rejects.toThrow(ForbiddenException);
    });
  });
});
