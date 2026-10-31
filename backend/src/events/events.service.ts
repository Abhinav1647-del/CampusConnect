import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import {
  EventRegistrationStatus,
  BookmarkType,
  Role,
} from '@prisma/client';
import { PrismaService } from '../database/prisma.service.js';
import { CreateEventDto } from './dto/create-event.dto.js';
import { UpdateEventDto } from './dto/update-event.dto.js';
import { QueryEventsDto } from './dto/query-events.dto.js';
import {
  getPaginationMeta,
  getPrismaSkipTake,
} from '../common/helpers/pagination.helper.js';

@Injectable()
export class EventsService {
  constructor(private readonly prisma: PrismaService) {}

  private async isClubLead(clubId: string, userId: string): Promise<boolean> {
    const membership = await this.prisma.clubMembership.findUnique({
      where: {
        clubId_userId: {
          clubId,
          userId,
        },
      },
    });
    return !!membership && membership.isLead;
  }

  async create(clubId: string, dto: CreateEventDto, userId: string, userRole: Role) {
    const club = await this.prisma.club.findUnique({
      where: { id: clubId },
    });

    if (!club) {
      throw new NotFoundException(`Club with ID "${clubId}" not found`);
    }

    if (userRole !== Role.APP_ADMIN) {
      const isLead = await this.isClubLead(clubId, userId);
      if (!isLead) {
        throw new ForbiddenException('Only APP_ADMIN or club leads can create events for this club');
      }
    }

    const startTime = new Date(dto.startTime);
    const endTime = dto.endTime ? new Date(dto.endTime) : undefined;
    const registrationDeadline = dto.registrationDeadline
      ? new Date(dto.registrationDeadline)
      : undefined;

    if (endTime && endTime <= startTime) {
      throw new BadRequestException('End time must be after start time');
    }

    if (registrationDeadline && registrationDeadline > startTime) {
      throw new BadRequestException('Registration deadline cannot be after event start time');
    }

    return this.prisma.event.create({
      data: {
        clubId,
        title: dto.title,
        description: dto.description,
        posterUrl: dto.posterUrl,
        venue: dto.venue,
        startTime,
        endTime,
        registrationDeadline,
        capacity: dto.capacity,
        enableWaitlist: dto.enableWaitlist ?? false,
      },
      include: {
        club: {
          select: {
            id: true,
            name: true,
            logoUrl: true,
            category: true,
          },
        },
      },
    });
  }

  async findAll(query: QueryEventsDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const { skip, take } = getPrismaSkipTake(page, limit);

    const where: any = {};

    if (query.clubId) {
      where.clubId = query.clubId;
    }

    if (query.fromDate || query.toDate) {
      where.startTime = {};
      if (query.fromDate) {
        where.startTime.gte = new Date(query.fromDate);
      }
      if (query.toDate) {
        where.startTime.lte = new Date(query.toDate);
      }
    }

    if (query.search) {
      where.OR = [
        { title: { contains: query.search, mode: 'insensitive' } },
        { description: { contains: query.search, mode: 'insensitive' } },
        { venue: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const [items, total] = await Promise.all([
      this.prisma.event.findMany({
        where,
        skip,
        take,
        orderBy: { startTime: 'asc' },
        include: {
          club: {
            select: {
              id: true,
              name: true,
              logoUrl: true,
              category: true,
            },
          },
          _count: {
            select: {
              registrations: {
                where: {
                  status: {
                    in: [EventRegistrationStatus.REGISTERED, EventRegistrationStatus.ATTENDED],
                  },
                },
              },
            },
          },
        },
      }),
      this.prisma.event.count({ where }),
    ]);

    return {
      items,
      meta: getPaginationMeta(total, page, limit),
    };
  }

  async findOne(eventId: string, userId?: string) {
    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
      include: {
        club: {
          select: {
            id: true,
            name: true,
            logoUrl: true,
            category: true,
          },
        },
        _count: {
          select: {
            registrations: {
              where: {
                status: {
                  in: [EventRegistrationStatus.REGISTERED, EventRegistrationStatus.ATTENDED],
                },
              },
            },
          },
        },
      },
    });

    if (!event) {
      throw new NotFoundException(`Event with ID "${eventId}" not found`);
    }

    let userRegistration: any = null;
    let isBookmarked = false;

    if (userId) {
      const [reg, bookmark] = await Promise.all([
        this.prisma.eventRegistration.findUnique({
          where: {
            eventId_userId: {
              eventId,
              userId,
            },
          },
        }),
        this.prisma.bookmark.findUnique({
          where: {
            userId_type_eventId: {
              userId,
              type: BookmarkType.EVENT,
              eventId,
            },
          },
        }),
      ]);

      userRegistration = reg;
      isBookmarked = !!bookmark;
    }

    return {
      ...event,
      userRegistration,
      isBookmarked,
    };
  }

  async update(eventId: string, dto: UpdateEventDto, userId: string, userRole: Role) {
    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
    });

    if (!event) {
      throw new NotFoundException(`Event with ID "${eventId}" not found`);
    }

    if (userRole !== Role.APP_ADMIN) {
      const isLead = await this.isClubLead(event.clubId, userId);
      if (!isLead) {
        throw new ForbiddenException('Only APP_ADMIN or club leads can update this event');
      }
    }

    const data: any = { ...dto };
    if (dto.startTime) {
      data.startTime = new Date(dto.startTime);
    }
    if (dto.endTime !== undefined) {
      data.endTime = dto.endTime ? new Date(dto.endTime) : null;
    }
    if (dto.registrationDeadline !== undefined) {
      data.registrationDeadline = dto.registrationDeadline
        ? new Date(dto.registrationDeadline)
        : null;
    }

    return this.prisma.event.update({
      where: { id: eventId },
      data,
      include: {
        club: {
          select: {
            id: true,
            name: true,
            logoUrl: true,
          },
        },
      },
    });
  }

  async cancel(eventId: string, userId: string, userRole: Role) {
    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
    });

    if (!event) {
      throw new NotFoundException(`Event with ID "${eventId}" not found`);
    }

    if (userRole !== Role.APP_ADMIN) {
      const isLead = await this.isClubLead(event.clubId, userId);
      if (!isLead) {
        throw new ForbiddenException('Only APP_ADMIN or club leads can cancel this event');
      }
    }

    return this.prisma.$transaction(async (tx) => {
      const updatedEvent = await tx.event.update({
        where: { id: eventId },
        data: { isCancelled: true },
      });

      await tx.eventRegistration.updateMany({
        where: {
          eventId,
          status: {
            in: [EventRegistrationStatus.REGISTERED, EventRegistrationStatus.WAITLISTED],
          },
        },
        data: {
          status: EventRegistrationStatus.CANCELLED,
        },
      });

      return updatedEvent;
    });
  }

  async register(eventId: string, userId: string) {
    return this.prisma.$transaction(async (tx) => {
      const event = await tx.event.findUnique({
        where: { id: eventId },
      });

      if (!event) {
        throw new NotFoundException(`Event with ID "${eventId}" not found`);
      }

      if (event.isCancelled) {
        throw new ConflictException('This event has been cancelled');
      }

      const now = new Date();
      if (event.registrationDeadline && now > event.registrationDeadline) {
        throw new BadRequestException('Registration deadline has passed');
      }

      const existingReg = await tx.eventRegistration.findUnique({
        where: {
          eventId_userId: {
            eventId,
            userId,
          },
        },
      });

      if (
        existingReg &&
        (existingReg.status === EventRegistrationStatus.REGISTERED ||
          existingReg.status === EventRegistrationStatus.WAITLISTED ||
          existingReg.status === EventRegistrationStatus.ATTENDED)
      ) {
        throw new ConflictException('You are already registered or waitlisted for this event');
      }

      let targetStatus: EventRegistrationStatus = EventRegistrationStatus.REGISTERED;

      if (event.capacity) {
        const activeCount = await tx.eventRegistration.count({
          where: {
            eventId,
            status: {
              in: [EventRegistrationStatus.REGISTERED, EventRegistrationStatus.ATTENDED],
            },
          },
        });

        if (activeCount >= event.capacity) {
          if (event.enableWaitlist) {
            targetStatus = EventRegistrationStatus.WAITLISTED;
          } else {
            throw new ConflictException('Event registration capacity is full');
          }
        }
      }

      if (existingReg) {
        return tx.eventRegistration.update({
          where: { id: existingReg.id },
          data: { status: targetStatus },
        });
      }

      return tx.eventRegistration.create({
        data: {
          eventId,
          userId,
          status: targetStatus,
        },
      });
    });
  }

  async cancelRegistration(eventId: string, userId: string) {
    return this.prisma.$transaction(async (tx) => {
      const registration = await tx.eventRegistration.findUnique({
        where: {
          eventId_userId: {
            eventId,
            userId,
          },
        },
      });

      if (!registration) {
        throw new NotFoundException('Registration not found');
      }

      if (registration.status === EventRegistrationStatus.CANCELLED) {
        throw new BadRequestException('Registration is already cancelled');
      }

      const wasRegistered = registration.status === EventRegistrationStatus.REGISTERED;

      const updatedRegistration = await tx.eventRegistration.update({
        where: { id: registration.id },
        data: { status: EventRegistrationStatus.CANCELLED },
      });

      if (wasRegistered) {
        const nextInWaitlist = await tx.eventRegistration.findFirst({
          where: {
            eventId,
            status: EventRegistrationStatus.WAITLISTED,
          },
          orderBy: { createdAt: 'asc' },
        });

        if (nextInWaitlist) {
          await tx.eventRegistration.update({
            where: { id: nextInWaitlist.id },
            data: { status: EventRegistrationStatus.REGISTERED },
          });
        }
      }

      return updatedRegistration;
    });
  }

  async getRegistrations(eventId: string, userId: string, userRole: Role) {
    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
    });

    if (!event) {
      throw new NotFoundException(`Event with ID "${eventId}" not found`);
    }

    if (userRole !== Role.APP_ADMIN) {
      const isLead = await this.isClubLead(event.clubId, userId);
      if (!isLead) {
        throw new ForbiddenException('Only APP_ADMIN or club leads can view registrations');
      }
    }

    return this.prisma.eventRegistration.findMany({
      where: { eventId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            rollNumber: true,
            avatarUrl: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async markAttendance(
    eventId: string,
    userId: string,
    registrationId: string,
    userRole: Role,
  ) {
    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
    });

    if (!event) {
      throw new NotFoundException(`Event with ID "${eventId}" not found`);
    }

    if (userRole !== Role.APP_ADMIN) {
      const isLead = await this.isClubLead(event.clubId, userId);
      if (!isLead) {
        throw new ForbiddenException('Only APP_ADMIN or club leads can mark attendance');
      }
    }

    const registration = await this.prisma.eventRegistration.findUnique({
      where: { id: registrationId },
    });

    if (!registration || registration.eventId !== eventId) {
      throw new NotFoundException(`Registration with ID "${registrationId}" not found for this event`);
    }

    return this.prisma.eventRegistration.update({
      where: { id: registrationId },
      data: { status: EventRegistrationStatus.ATTENDED },
    });
  }

  async getMyRegistrations(userId: string, page = 1, limit = 20) {
    const { skip, take } = getPrismaSkipTake(page, limit);

    const [items, total] = await Promise.all([
      this.prisma.eventRegistration.findMany({
        where: { userId },
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: {
          event: {
            include: {
              club: {
                select: {
                  id: true,
                  name: true,
                  logoUrl: true,
                },
              },
            },
          },
        },
      }),
      this.prisma.eventRegistration.count({ where: { userId } }),
    ]);

    return {
      items,
      meta: getPaginationMeta(total, page, limit),
    };
  }

  async addEventBookmark(userId: string, eventId: string) {
    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
    });

    if (!event) {
      throw new NotFoundException(`Event with ID "${eventId}" not found`);
    }

    const existing = await this.prisma.bookmark.findUnique({
      where: {
        userId_type_eventId: {
          userId,
          type: BookmarkType.EVENT,
          eventId,
        },
      },
    });

    if (existing) {
      return existing;
    }

    return this.prisma.bookmark.create({
      data: {
        userId,
        type: BookmarkType.EVENT,
        eventId,
      },
      include: {
        event: true,
      },
    });
  }

  async removeEventBookmark(userId: string, eventId: string) {
    const bookmark = await this.prisma.bookmark.findUnique({
      where: {
        userId_type_eventId: {
          userId,
          type: BookmarkType.EVENT,
          eventId,
        },
      },
    });

    if (!bookmark) {
      throw new NotFoundException('Bookmark not found');
    }

    return this.prisma.bookmark.delete({
      where: { id: bookmark.id },
    });
  }

  async getMyBookmarks(userId: string, page = 1, limit = 20) {
    const { skip, take } = getPrismaSkipTake(page, limit);
    const where = {
      userId,
      type: BookmarkType.EVENT,
    };

    const [items, total] = await Promise.all([
      this.prisma.bookmark.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: {
          event: {
            include: {
              club: {
                select: {
                  id: true,
                  name: true,
                  logoUrl: true,
                },
              },
            },
          },
        },
      }),
      this.prisma.bookmark.count({ where }),
    ]);

    return {
      items,
      meta: getPaginationMeta(total, page, limit),
    };
  }
}
