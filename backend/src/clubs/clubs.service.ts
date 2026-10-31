import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { BookmarkType, Role } from '@prisma/client';
import { PrismaService } from '../database/prisma.service.js';
import { CreateClubDto } from './dto/create-club.dto.js';
import { UpdateClubDto } from './dto/update-club.dto.js';
import { QueryClubsDto } from './dto/query-clubs.dto.js';
import { CreateAnnouncementDto } from './dto/create-announcement.dto.js';
import {
  getPaginationMeta,
  getPrismaSkipTake,
} from '../common/helpers/pagination.helper.js';

@Injectable()
export class ClubsService {
  constructor(private readonly prisma: PrismaService) {}

  async isClubLead(clubId: string, userId: string): Promise<boolean> {
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

  async create(dto: CreateClubDto) {
    const existing = await this.prisma.club.findUnique({
      where: { name: dto.name },
    });
    if (existing) {
      throw new ConflictException(`Club with name "${dto.name}" already exists`);
    }

    return this.prisma.club.create({
      data: {
        name: dto.name,
        description: dto.description,
        category: dto.category,
        logoUrl: dto.logoUrl,
      },
    });
  }

  async findAll(query: QueryClubsDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const { skip, take } = getPrismaSkipTake(page, limit);

    const where: any = {
      isActive: true,
    };

    if (query.category) {
      where.category = {
        equals: query.category,
        mode: 'insensitive',
      };
    }

    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { description: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const [items, total] = await Promise.all([
      this.prisma.club.findMany({
        where,
        skip,
        take,
        orderBy: { name: 'asc' },
        include: {
          _count: {
            select: {
              memberships: true,
              events: true,
            },
          },
        },
      }),
      this.prisma.club.count({ where }),
    ]);

    return {
      items,
      meta: getPaginationMeta(total, page, limit),
    };
  }

  async findOne(clubId: string) {
    const club = await this.prisma.club.findUnique({
      where: { id: clubId },
      include: {
        _count: {
          select: {
            memberships: true,
            events: true,
            announcements: true,
          },
        },
        memberships: {
          where: { isLead: true },
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                avatarUrl: true,
                role: true,
              },
            },
          },
        },
      },
    });

    if (!club) {
      throw new NotFoundException(`Club with ID "${clubId}" not found`);
    }

    return club;
  }

  async update(clubId: string, dto: UpdateClubDto, userId: string, userRole: Role) {
    const club = await this.prisma.club.findUnique({
      where: { id: clubId },
    });

    if (!club) {
      throw new NotFoundException(`Club with ID "${clubId}" not found`);
    }

    if (userRole !== Role.APP_ADMIN) {
      const isLead = await this.isClubLead(clubId, userId);
      if (!isLead) {
        throw new ForbiddenException('Only APP_ADMIN or club leads can update this club');
      }
    }

    if (dto.name && dto.name !== club.name) {
      const existingName = await this.prisma.club.findUnique({
        where: { name: dto.name },
      });
      if (existingName) {
        throw new ConflictException(`Club with name "${dto.name}" already exists`);
      }
    }

    return this.prisma.club.update({
      where: { id: clubId },
      data: dto,
    });
  }

  async getMemberships(clubId: string) {
    const club = await this.prisma.club.findUnique({
      where: { id: clubId },
    });

    if (!club) {
      throw new NotFoundException(`Club with ID "${clubId}" not found`);
    }

    return this.prisma.clubMembership.findMany({
      where: { clubId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            rollNumber: true,
            avatarUrl: true,
            role: true,
          },
        },
      },
      orderBy: [
        { isLead: 'desc' },
        { joinedAt: 'asc' },
      ],
    });
  }

  async joinClub(clubId: string, userId: string) {
    const club = await this.prisma.club.findUnique({
      where: { id: clubId },
    });

    if (!club) {
      throw new NotFoundException(`Club with ID "${clubId}" not found`);
    }

    if (!club.isActive) {
      throw new ConflictException('Club is currently inactive');
    }

    const existingMembership = await this.prisma.clubMembership.findUnique({
      where: {
        clubId_userId: {
          clubId,
          userId,
        },
      },
    });

    if (existingMembership) {
      throw new ConflictException('You are already a member of this club');
    }

    return this.prisma.clubMembership.create({
      data: {
        clubId,
        userId,
        isLead: false,
      },
      include: {
        club: true,
      },
    });
  }

  async leaveClub(clubId: string, userId: string) {
    const club = await this.prisma.club.findUnique({
      where: { id: clubId },
    });

    if (!club) {
      throw new NotFoundException(`Club with ID "${clubId}" not found`);
    }

    const existingMembership = await this.prisma.clubMembership.findUnique({
      where: {
        clubId_userId: {
          clubId,
          userId,
        },
      },
    });

    if (!existingMembership) {
      throw new NotFoundException('You are not a member of this club');
    }

    return this.prisma.clubMembership.delete({
      where: {
        clubId_userId: {
          clubId,
          userId,
        },
      },
    });
  }

  async setLead(clubId: string, userId: string, targetUserId: string) {
    const club = await this.prisma.club.findUnique({
      where: { id: clubId },
    });

    if (!club) {
      throw new NotFoundException(`Club with ID "${clubId}" not found`);
    }

    const requestingUser = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (requestingUser?.role !== Role.APP_ADMIN) {
      const isLead = await this.isClubLead(clubId, userId);
      if (!isLead) {
        throw new ForbiddenException('Only APP_ADMIN or current club leads can assign lead roles');
      }
    }

    const targetUser = await this.prisma.user.findUnique({
      where: { id: targetUserId },
    });

    if (!targetUser) {
      throw new NotFoundException(`Target user with ID "${targetUserId}" not found`);
    }

    return this.prisma.$transaction(async (tx) => {
      const membership = await tx.clubMembership.upsert({
        where: {
          clubId_userId: {
            clubId,
            userId: targetUserId,
          },
        },
        update: {
          isLead: true,
        },
        create: {
          clubId,
          userId: targetUserId,
          isLead: true,
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
            },
          },
        },
      });

      if (targetUser.role === Role.STUDENT) {
        await tx.user.update({
          where: { id: targetUserId },
          data: { role: Role.CLUB_LEAD },
        });
      }

      return membership;
    });
  }

  async createAnnouncement(
    clubId: string,
    authorId: string,
    dto: CreateAnnouncementDto,
    userRole: Role,
  ) {
    const club = await this.prisma.club.findUnique({
      where: { id: clubId },
    });

    if (!club) {
      throw new NotFoundException(`Club with ID "${clubId}" not found`);
    }

    const canPost = ([Role.APP_ADMIN, Role.CLUB_LEAD, Role.CAMPUSCART_MODERATOR] as Role[]).includes(userRole);
    if (!canPost) {
      const isLead = await this.isClubLead(clubId, authorId);
      if (!isLead) {
        throw new ForbiddenException('You do not have permission to post club announcements');
      }
    }

    return this.prisma.announcement.create({
      data: {
        clubId,
        authorId,
        title: dto.title,
        content: dto.content,
      },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            email: true,
            avatarUrl: true,
          },
        },
      },
    });
  }

  async getAnnouncements(clubId?: string, page = 1, limit = 20) {
    if (clubId) {
      const club = await this.prisma.club.findUnique({
        where: { id: clubId },
      });

      if (!club) {
        throw new NotFoundException(`Club with ID "${clubId}" not found`);
      }
    }

    const { skip, take } = getPrismaSkipTake(page, limit);
    const where = clubId ? { clubId } : {};

    const [items, total] = await Promise.all([
      this.prisma.announcement.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: {
          author: {
            select: {
              id: true,
              name: true,
              email: true,
              avatarUrl: true,
            },
          },
        },
      }),
      this.prisma.announcement.count({ where: { clubId } }),
    ]);

    return {
      items,
      meta: getPaginationMeta(total, page, limit),
    };
  }

  async getBookmarks(userId: string, type?: BookmarkType) {
    const where: any = { userId };
    if (type) {
      where.type = type;
    }

    return this.prisma.bookmark.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        club: true,
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
        listing: {
          include: {
            images: {
              take: 1,
              orderBy: { order: 'asc' },
            },
          },
        },
      },
    });
  }

  async addBookmark(userId: string, type: BookmarkType, targetId: string) {
    if (type === BookmarkType.CLUB) {
      const club = await this.prisma.club.findUnique({
        where: { id: targetId },
      });
      if (!club) {
        throw new NotFoundException(`Club with ID "${targetId}" not found`);
      }

      const existing = await this.prisma.bookmark.findUnique({
        where: {
          userId_type_clubId: {
            userId,
            type: BookmarkType.CLUB,
            clubId: targetId,
          },
        },
      });

      if (existing) {
        return existing;
      }

      return this.prisma.bookmark.create({
        data: {
          userId,
          type: BookmarkType.CLUB,
          clubId: targetId,
        },
        include: { club: true },
      });
    }

    if (type === BookmarkType.EVENT) {
      const event = await this.prisma.event.findUnique({
        where: { id: targetId },
      });
      if (!event) {
        throw new NotFoundException(`Event with ID "${targetId}" not found`);
      }

      const existing = await this.prisma.bookmark.findUnique({
        where: {
          userId_type_eventId: {
            userId,
            type: BookmarkType.EVENT,
            eventId: targetId,
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
          eventId: targetId,
        },
        include: { event: true },
      });
    }

    if (type === BookmarkType.LISTING) {
      const listing = await this.prisma.listing.findUnique({
        where: { id: targetId },
      });
      if (!listing) {
        throw new NotFoundException(`Listing with ID "${targetId}" not found`);
      }

      const existing = await this.prisma.bookmark.findUnique({
        where: {
          userId_type_listingId: {
            userId,
            type: BookmarkType.LISTING,
            listingId: targetId,
          },
        },
      });

      if (existing) {
        return existing;
      }

      return this.prisma.bookmark.create({
        data: {
          userId,
          type: BookmarkType.LISTING,
          listingId: targetId,
        },
        include: { listing: true },
      });
    }

    throw new ConflictException(`Unsupported bookmark type: ${type}`);
  }

  async removeBookmark(userId: string, bookmarkId: string) {
    const bookmark = await this.prisma.bookmark.findUnique({
      where: { id: bookmarkId },
    });

    if (!bookmark) {
      throw new NotFoundException(`Bookmark with ID "${bookmarkId}" not found`);
    }

    if (bookmark.userId !== userId) {
      throw new ForbiddenException('You can only remove your own bookmarks');
    }

    return this.prisma.bookmark.delete({
      where: { id: bookmarkId },
    });
  }
}
