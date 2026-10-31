import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import {
  BookmarkType,
  ListingCondition,
  ListingStatus,
  Prisma,
  ReportStatus,
  RequestStatus,
  Role,
} from '@prisma/client';
import { PrismaService } from '../database/prisma.service.js';
import { UploadService } from '../upload/upload.service.js';
import { CreateListingDto } from './dto/create-listing.dto.js';
import { UpdateListingDto } from './dto/update-listing.dto.js';
import { QueryListingsDto } from './dto/query-listings.dto.js';
import { CreateRequestDto } from './dto/create-request.dto.js';
import { SendMessageDto } from './dto/send-message.dto.js';
import { CreateReportDto } from './dto/create-report.dto.js';
import { CreateReviewDto } from './dto/create-review.dto.js';
import { PaginationDto } from '../common/dto/pagination.dto.js';
import {
  getPaginationMeta,
  getPrismaSkipTake,
} from '../common/helpers/pagination.helper.js';

@Injectable()
export class CampusCartService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly uploadService: UploadService,
  ) {}

  /**
   * 1. Create a listing with DRAFT status
   */
  async createListing(sellerId: string, dto: CreateListingDto) {
    return this.prisma.listing.create({
      data: {
        sellerId,
        title: dto.title.trim(),
        description: dto.description?.trim(),
        price: new Prisma.Decimal(dto.price),
        category: dto.category.trim(),
        condition: dto.condition,
        status: ListingStatus.ACTIVE,
        images: dto.images?.length
          ? {
              create: dto.images.map((url, index) => ({
                url,
                key: `img_${index}_${Date.now()}`,
                order: index,
              })),
            }
          : undefined,
      },
      include: {
        seller: {
          select: {
            id: true,
            name: true,
            email: true,
            avatarUrl: true,
          },
        },
        images: true,
      },
    });
  }

  /**
   * 2. Find all listings with pagination, filters, and search
   */
  async findAllListings(query: QueryListingsDto) {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const { skip, take } = getPrismaSkipTake(page, limit);

    const where: Prisma.ListingWhereInput = {
      status: query.status || ListingStatus.ACTIVE,
    };

    if (query.category) {
      where.category = {
        equals: query.category,
        mode: 'insensitive',
      };
    }

    if (query.condition) {
      where.condition = query.condition;
    }

    if (query.sellerId) {
      where.sellerId = query.sellerId;
    }

    if (query.minPrice !== undefined || query.maxPrice !== undefined) {
      where.price = {};
      if (query.minPrice !== undefined) {
        where.price.gte = new Prisma.Decimal(query.minPrice);
      }
      if (query.maxPrice !== undefined) {
        where.price.lte = new Prisma.Decimal(query.maxPrice);
      }
    }

    if (query.search) {
      where.OR = [
        { title: { contains: query.search, mode: 'insensitive' } },
        { description: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    let orderBy: Prisma.ListingOrderByWithRelationInput = { createdAt: 'desc' };
    if (query.sort === 'price_asc') {
      orderBy = { price: 'asc' };
    } else if (query.sort === 'price_desc') {
      orderBy = { price: 'desc' };
    } else if (query.sort === 'oldest') {
      orderBy = { createdAt: 'asc' };
    } else {
      orderBy = { createdAt: 'desc' };
    }

    const [items, total] = await Promise.all([
      this.prisma.listing.findMany({
        where,
        skip,
        take,
        orderBy,
        include: {
          seller: {
            select: {
              id: true,
              name: true,
              avatarUrl: true,
            },
          },
          images: {
            orderBy: { order: 'asc' },
          },
          _count: {
            select: {
              images: true,
            },
          },
        },
      }),
      this.prisma.listing.count({ where }),
    ]);

    return {
      data: items,
      meta: getPaginationMeta(total, page, limit),
    };
  }

  /**
   * 3. Get single listing by ID
   */
  async findOneListing(listingId: string, userId?: string) {
    const listing = await this.prisma.listing.findUnique({
      where: { id: listingId },
      include: {
        seller: {
          select: {
            id: true,
            name: true,
            email: true,
            avatarUrl: true,
          },
        },
        images: {
          orderBy: { order: 'asc' },
        },
        _count: {
          select: {
            requests: true,
          },
        },
      },
    });

    if (!listing) {
      throw new NotFoundException('Listing not found');
    }

    // Non-sellers can only view ACTIVE or RESERVED or SOLD listings, not DRAFT
    if (listing.status === ListingStatus.DRAFT && listing.sellerId !== userId) {
      throw new NotFoundException('Listing not found');
    }

    return listing;
  }

  /**
   * 4. Update listing (seller only, only if DRAFT or ACTIVE)
   */
  async updateListing(
    listingId: string,
    dto: UpdateListingDto,
    userId: string,
  ) {
    const listing = await this.prisma.listing.findUnique({
      where: { id: listingId },
    });

    if (!listing) {
      throw new NotFoundException('Listing not found');
    }

    if (listing.sellerId !== userId) {
      throw new ForbiddenException('You can only update your own listings');
    }

    if (
      listing.status !== ListingStatus.DRAFT &&
      listing.status !== ListingStatus.ACTIVE
    ) {
      throw new BadRequestException(
        `Cannot update listing with status ${listing.status}. Only DRAFT or ACTIVE listings can be modified.`,
      );
    }

    const data: Prisma.ListingUpdateInput = {};
    if (dto.title !== undefined) data.title = dto.title.trim();
    if (dto.description !== undefined) data.description = dto.description?.trim();
    if (dto.price !== undefined) data.price = new Prisma.Decimal(dto.price);
    if (dto.category !== undefined) data.category = dto.category.trim();
    if (dto.condition !== undefined) data.condition = dto.condition;

    return this.prisma.listing.update({
      where: { id: listingId },
      data,
      include: {
        seller: {
          select: {
            id: true,
            name: true,
            email: true,
            avatarUrl: true,
          },
        },
        images: {
          orderBy: { order: 'asc' },
        },
      },
    });
  }

  /**
   * 4b. Delete listing (seller or moderator/admin)
   */
  async deleteListing(listingId: string, userId: string, userRole: Role) {
    const listing = await this.prisma.listing.findUnique({
      where: { id: listingId },
    });

    if (!listing) {
      throw new NotFoundException('Listing not found');
    }

    const isModeratorOrAdmin =
      userRole === Role.CAMPUSCART_MODERATOR || userRole === Role.APP_ADMIN;
    const isSeller = listing.sellerId === userId;

    if (!isSeller && !isModeratorOrAdmin) {
      throw new ForbiddenException(
        'You are not authorized to delete this listing',
      );
    }

    return this.prisma.listing.delete({
      where: { id: listingId },
    });
  }

  /**
   * 5. Update listing status with lifecycle validation
   */
  async updateListingStatus(
    listingId: string,
    targetStatus: ListingStatus,
    userId: string,
    userRole: Role,
  ) {
    const listing = await this.prisma.listing.findUnique({
      where: { id: listingId },
    });

    if (!listing) {
      throw new NotFoundException('Listing not found');
    }

    const isModeratorOrAdmin =
      userRole === Role.CAMPUSCART_MODERATOR || userRole === Role.APP_ADMIN;
    const isSeller = listing.sellerId === userId;

    if (!isSeller && !isModeratorOrAdmin) {
      throw new ForbiddenException(
        'You are not authorized to update this listing status',
      );
    }

    // Moderators/admins can cancel any listing
    if (isModeratorOrAdmin && targetStatus === ListingStatus.CANCELLED) {
      return this.prisma.listing.update({
        where: { id: listingId },
        data: { status: ListingStatus.CANCELLED },
      });
    }

    // If not seller at this point, forbidden
    if (!isSeller) {
      throw new ForbiddenException(
        'Only the seller or moderators can perform this action',
      );
    }

    const currentStatus = listing.status;

    // Validate allowed seller transitions
    const isValidTransition =
      (currentStatus === ListingStatus.DRAFT && targetStatus === ListingStatus.ACTIVE) ||
      (currentStatus === ListingStatus.ACTIVE && targetStatus === ListingStatus.CANCELLED) ||
      (currentStatus === ListingStatus.RESERVED && targetStatus === ListingStatus.ACTIVE) ||
      (currentStatus === ListingStatus.RESERVED && targetStatus === ListingStatus.SOLD);

    if (!isValidTransition) {
      throw new BadRequestException(
        `Invalid status transition from ${currentStatus} to ${targetStatus}`,
      );
    }

    return this.prisma.listing.update({
      where: { id: listingId },
      data: { status: targetStatus },
    });
  }

  /**
   * 6. Add images to listing (seller only, max 5 total)
   */
  async addImages(
    listingId: string,
    images: { url: string; key: string }[],
    userId: string,
  ) {
    const listing = await this.prisma.listing.findUnique({
      where: { id: listingId },
      include: {
        images: true,
      },
    });

    if (!listing) {
      throw new NotFoundException('Listing not found');
    }

    if (listing.sellerId !== userId) {
      throw new ForbiddenException('Only the seller can upload images for this listing');
    }

    const currentCount = listing.images.length;
    if (currentCount + images.length > 5) {
      throw new BadRequestException(
        `Maximum 5 images allowed per listing. Currently has ${currentCount}, attempting to add ${images.length}`,
      );
    }

    await this.prisma.$transaction(
      images.map((img, index) =>
        this.prisma.listingImage.create({
          data: {
            listingId,
            url: img.url,
            key: img.key,
            order: currentCount + index,
          },
        }),
      ),
    );

    return this.prisma.listing.findUnique({
      where: { id: listingId },
      include: {
        images: {
          orderBy: { order: 'asc' },
        },
      },
    });
  }

  /**
   * 7. Delete an image from listing (seller only)
   */
  async deleteImage(listingId: string, imageId: string, userId: string) {
    const listing = await this.prisma.listing.findUnique({
      where: { id: listingId },
    });

    if (!listing) {
      throw new NotFoundException('Listing not found');
    }

    if (listing.sellerId !== userId) {
      throw new ForbiddenException('Only the seller can remove images');
    }

    const image = await this.prisma.listingImage.findUnique({
      where: { id: imageId },
    });

    if (!image || image.listingId !== listingId) {
      throw new NotFoundException('Image not found for this listing');
    }

    try {
      await this.uploadService.deleteFile(image.key);
    } catch {
      // Continue even if storage delete fails
    }

    await this.prisma.listingImage.delete({
      where: { id: imageId },
    });

    return { success: true, message: 'Image deleted successfully' };
  }

  /**
   * 8. Create a purchase request (buyer sends request)
   */
  async createRequest(
    listingId: string,
    buyerId: string,
    dto: CreateRequestDto,
  ) {
    const listing = await this.prisma.listing.findUnique({
      where: { id: listingId },
    });

    if (!listing) {
      throw new NotFoundException('Listing not found');
    }

    if (listing.status !== ListingStatus.ACTIVE) {
      throw new BadRequestException(
        `Listing is not available for purchase requests (current status: ${listing.status})`,
      );
    }

    if (listing.sellerId === buyerId) {
      throw new BadRequestException('You cannot send a purchase request for your own listing');
    }

    const existingRequest = await this.prisma.listingRequest.findUnique({
      where: {
        listingId_buyerId: {
          listingId,
          buyerId,
        },
      },
    });

    if (existingRequest) {
      throw new BadRequestException(
        'You have already submitted a purchase request for this listing',
      );
    }

    return this.prisma.$transaction(async (tx) => {
      const request = await tx.listingRequest.create({
        data: {
          listingId,
          buyerId,
          message: dto.message?.trim(),
          status: RequestStatus.PENDING,
        },
      });

      const conversation = await tx.conversation.create({
        data: {
          requestId: request.id,
        },
      });

      if (dto.message?.trim()) {
        await tx.message.create({
          data: {
            conversationId: conversation.id,
            senderId: buyerId,
            content: dto.message.trim(),
          },
        });
      }

      return {
        ...request,
        conversation,
      };
    });
  }

  /**
   * 9. Get buyer's sent requests and seller's received requests
   */
  async getMyRequests(userId: string) {
    const [sent, received] = await Promise.all([
      this.prisma.listingRequest.findMany({
        where: { buyerId: userId },
        orderBy: { createdAt: 'desc' },
        include: {
          listing: {
            include: {
              seller: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  avatarUrl: true,
                },
              },
              images: {
                orderBy: { order: 'asc' },
                take: 1,
              },
            },
          },
          buyer: {
            select: {
              id: true,
              name: true,
              email: true,
              avatarUrl: true,
            },
          },
          conversation: {
            select: {
              id: true,
            },
          },
        },
      }),
      this.prisma.listingRequest.findMany({
        where: {
          listing: {
            sellerId: userId,
          },
        },
        orderBy: { createdAt: 'desc' },
        include: {
          listing: {
            include: {
              seller: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  avatarUrl: true,
                },
              },
              images: {
                orderBy: { order: 'asc' },
                take: 1,
              },
            },
          },
          buyer: {
            select: {
              id: true,
              name: true,
              email: true,
              avatarUrl: true,
            },
          },
          conversation: {
            select: {
              id: true,
            },
          },
        },
      }),
    ]);

    const formatReq = (r: any) => ({
      id: r.id,
      listingId: r.listingId,
      listingTitle: r.listing?.title || '',
      buyerId: r.buyerId,
      buyerName: r.buyer?.name || 'Student',
      sellerId: r.listing?.sellerId || '',
      sellerName: r.listing?.seller?.name || 'Seller',
      message: r.message || '',
      status: (r.status || 'PENDING').toLowerCase(),
      createdAt: r.createdAt ? new Date(r.createdAt).toISOString() : new Date().toISOString(),
      listing: r.listing,
    });

    return {
      sent: sent.map(formatReq),
      received: received.map(formatReq),
    };
  }

  /**
   * 10. Get all requests for a listing (seller only)
   */
  async getListingRequests(listingId: string, userId: string) {
    const listing = await this.prisma.listing.findUnique({
      where: { id: listingId },
    });

    if (!listing) {
      throw new NotFoundException('Listing not found');
    }

    if (listing.sellerId !== userId) {
      throw new ForbiddenException(
        'Only the seller can view requests for this listing',
      );
    }

    return this.prisma.listingRequest.findMany({
      where: { listingId },
      orderBy: { createdAt: 'desc' },
      include: {
        buyer: {
          select: {
            id: true,
            name: true,
            email: true,
            avatarUrl: true,
          },
        },
        conversation: {
          select: {
            id: true,
          },
        },
      },
    });
  }

  /**
   * 11. Respond to request (ACCEPTED or REJECTED)
   */
  async respondToRequest(
    requestId: string,
    action: 'ACCEPTED' | 'REJECTED',
    sellerId: string,
  ) {
    const request = await this.prisma.listingRequest.findUnique({
      where: { id: requestId },
      include: { listing: true },
    });

    if (!request) {
      throw new NotFoundException('Request not found');
    }

    if (request.listing.sellerId !== sellerId) {
      throw new ForbiddenException(
        'Only the seller can respond to this request',
      );
    }

    if (request.status !== RequestStatus.PENDING) {
      throw new BadRequestException(
        `Cannot respond to a request that is already ${request.status}`,
      );
    }

    if (action === 'ACCEPTED') {
      if (request.listing.status !== ListingStatus.ACTIVE) {
        throw new BadRequestException(
          `Listing is no longer ACTIVE (status: ${request.listing.status})`,
        );
      }

      return this.prisma.$transaction(async (tx) => {
        // Update accepted request
        const updatedRequest = await tx.listingRequest.update({
          where: { id: requestId },
          data: { status: RequestStatus.ACCEPTED },
        });

        // Set listing status to RESERVED
        await tx.listing.update({
          where: { id: request.listingId },
          data: { status: ListingStatus.RESERVED },
        });

        // Reject all other pending requests for this listing
        await tx.listingRequest.updateMany({
          where: {
            listingId: request.listingId,
            id: { not: requestId },
            status: RequestStatus.PENDING,
          },
          data: { status: RequestStatus.REJECTED },
        });

        return updatedRequest;
      });
    }

    // Action is REJECTED
    return this.prisma.listingRequest.update({
      where: { id: requestId },
      data: { status: RequestStatus.REJECTED },
    });
  }

  /**
   * 12. Buyer cancels their request
   */
  async cancelRequest(requestId: string, buyerId: string) {
    const request = await this.prisma.listingRequest.findUnique({
      where: { id: requestId },
      include: { listing: true },
    });

    if (!request) {
      throw new NotFoundException('Request not found');
    }

    if (request.buyerId !== buyerId) {
      throw new ForbiddenException('Only the requester can cancel this request');
    }

    if (
      request.status === RequestStatus.COMPLETED ||
      request.status === RequestStatus.CANCELLED
    ) {
      throw new BadRequestException(
        `Cannot cancel a request that is already ${request.status}`,
      );
    }

    return this.prisma.$transaction(async (tx) => {
      // If request was ACCEPTED and listing is RESERVED, reset listing to ACTIVE
      if (
        request.status === RequestStatus.ACCEPTED &&
        request.listing.status === ListingStatus.RESERVED
      ) {
        await tx.listing.update({
          where: { id: request.listingId },
          data: { status: ListingStatus.ACTIVE },
        });
      }

      return tx.listingRequest.update({
        where: { id: requestId },
        data: { status: RequestStatus.CANCELLED },
      });
    });
  }

  /**
   * 13. Complete transaction (mark request COMPLETED, listing SOLD, create Transaction record)
   */
  async completeTransaction(requestId: string, sellerId: string) {
    const request = await this.prisma.listingRequest.findUnique({
      where: { id: requestId },
      include: { listing: true },
    });

    if (!request) {
      throw new NotFoundException('Request not found');
    }

    if (request.listing.sellerId !== sellerId) {
      throw new ForbiddenException(
        'Only the seller can complete this transaction',
      );
    }

    if (request.status !== RequestStatus.ACCEPTED) {
      throw new BadRequestException(
        `Request must be ACCEPTED before completing transaction (current status: ${request.status})`,
      );
    }

    return this.prisma.$transaction(async (tx) => {
      await tx.listingRequest.update({
        where: { id: requestId },
        data: { status: RequestStatus.COMPLETED },
      });

      await tx.listing.update({
        where: { id: request.listingId },
        data: { status: ListingStatus.SOLD },
      });

      return tx.transaction.create({
        data: {
          listingId: request.listingId,
          requestId: request.id,
        },
        include: {
          listing: true,
          request: true,
        },
      });
    });
  }

  /**
   * 14. Send message in conversation
   */
  async sendMessage(
    conversationId: string,
    senderId: string,
    dto: SendMessageDto,
  ) {
    const conversation = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
      include: {
        request: {
          include: {
            listing: true,
          },
        },
      },
    });

    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    const isBuyer = conversation.request.buyerId === senderId;
    const isSeller = conversation.request.listing.sellerId === senderId;

    if (!isBuyer && !isSeller) {
      throw new ForbiddenException(
        'You are not a participant in this conversation',
      );
    }

    return this.prisma.message.create({
      data: {
        conversationId,
        senderId,
        content: dto.content.trim(),
      },
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            avatarUrl: true,
          },
        },
      },
    });
  }

  /**
   * 15. Get messages in conversation with pagination and mark unread as read
   */
  async getMessages(
    conversationId: string,
    userId: string,
    page = 1,
    limit = 50,
  ) {
    const conversation = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
      include: {
        request: {
          include: {
            listing: true,
          },
        },
      },
    });

    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    const isBuyer = conversation.request.buyerId === userId;
    const isSeller = conversation.request.listing.sellerId === userId;

    if (!isBuyer && !isSeller) {
      throw new ForbiddenException(
        'You are not a participant in this conversation',
      );
    }

    // Mark messages from the other user as read
    await this.prisma.message.updateMany({
      where: {
        conversationId,
        senderId: { not: userId },
        readAt: null,
      },
      data: {
        readAt: new Date(),
      },
    });

    const { skip, take } = getPrismaSkipTake(page, limit);

    const [messages, total] = await Promise.all([
      this.prisma.message.findMany({
        where: { conversationId },
        skip,
        take,
        orderBy: { createdAt: 'asc' },
        include: {
          sender: {
            select: {
              id: true,
              name: true,
              avatarUrl: true,
            },
          },
        },
      }),
      this.prisma.message.count({ where: { conversationId } }),
    ]);

    return {
      data: messages,
      meta: getPaginationMeta(total, page, limit),
    };
  }

  /**
   * 16. Get all conversations user is part of
   */
  async getMyConversations(userId: string) {
    return this.prisma.conversation.findMany({
      where: {
        OR: [
          { request: { buyerId: userId } },
          { request: { listing: { sellerId: userId } } },
        ],
      },
      orderBy: { updatedAt: 'desc' },
      include: {
        request: {
          include: {
            buyer: {
              select: {
                id: true,
                name: true,
                avatarUrl: true,
              },
            },
            listing: {
              include: {
                seller: {
                  select: {
                    id: true,
                    name: true,
                    avatarUrl: true,
                  },
                },
                images: {
                  take: 1,
                  orderBy: { order: 'asc' },
                },
              },
            },
          },
        },
        messages: {
          take: 1,
          orderBy: { createdAt: 'desc' },
          include: {
            sender: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });
  }

  /**
   * 17. Report a listing
   */
  async reportListing(
    listingId: string,
    reporterId: string,
    dto: CreateReportDto,
  ) {
    const listing = await this.prisma.listing.findUnique({
      where: { id: listingId },
    });

    if (!listing) {
      throw new NotFoundException('Listing not found');
    }

    if (listing.sellerId === reporterId) {
      throw new BadRequestException('You cannot report your own listing');
    }

    const existingPendingReport = await this.prisma.listingReport.findFirst({
      where: {
        listingId,
        reporterId,
        status: ReportStatus.PENDING,
      },
    });

    if (existingPendingReport) {
      throw new BadRequestException(
        'You already have an unresolved report pending for this listing',
      );
    }

    return this.prisma.listingReport.create({
      data: {
        listingId,
        reporterId,
        reason: dto.reason.trim(),
        details: dto.details?.trim(),
        status: ReportStatus.PENDING,
      },
      include: {
        reporter: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });
  }

  /**
   * 18. Get reports (CAMPUSCART_MODERATOR or APP_ADMIN only)
   */
  async getReports(query: PaginationDto, userRole: Role) {
    if (
      userRole !== Role.CAMPUSCART_MODERATOR &&
      userRole !== Role.APP_ADMIN
    ) {
      throw new ForbiddenException(
        'Only moderators and administrators can view reports',
      );
    }

    const page = query.page || 1;
    const limit = query.limit || 20;
    const { skip, take } = getPrismaSkipTake(page, limit);

    const [reports, total] = await Promise.all([
      this.prisma.listingReport.findMany({
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: {
          reporter: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          listing: {
            include: {
              seller: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                },
              },
              images: {
                take: 1,
                orderBy: { order: 'asc' },
              },
            },
          },
        },
      }),
      this.prisma.listingReport.count(),
    ]);

    return {
      data: reports,
      meta: getPaginationMeta(total, page, limit),
    };
  }

  /**
   * 19. Resolve report status (moderator/admin)
   */
  async resolveReport(reportId: string, status: ReportStatus, userId: string) {
    const report = await this.prisma.listingReport.findUnique({
      where: { id: reportId },
    });

    if (!report) {
      throw new NotFoundException('Report not found');
    }

    return this.prisma.listingReport.update({
      where: { id: reportId },
      data: { status },
      include: {
        listing: true,
        reporter: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });
  }

  /**
   * 20. Review seller after completed transaction
   */
  async reviewSeller(
    listingId: string,
    reviewerId: string,
    dto: CreateReviewDto,
  ) {
    const listing = await this.prisma.listing.findUnique({
      where: { id: listingId },
    });

    if (!listing) {
      throw new NotFoundException('Listing not found');
    }

    const transaction = await this.prisma.transaction.findUnique({
      where: { listingId },
      include: { request: true },
    });

    if (!transaction) {
      throw new BadRequestException(
        'A completed transaction is required to review the seller',
      );
    }

    if (transaction.request.buyerId !== reviewerId) {
      throw new ForbiddenException(
        'Only the verified buyer for this listing can review the seller',
      );
    }

    const existingReview = await this.prisma.sellerReview.findUnique({
      where: {
        listingId_reviewerId: {
          listingId,
          reviewerId,
        },
      },
    });

    if (existingReview) {
      throw new BadRequestException(
        'You have already reviewed this transaction',
      );
    }

    return this.prisma.sellerReview.create({
      data: {
        listingId,
        reviewerId,
        sellerId: listing.sellerId,
        rating: dto.rating,
        comment: dto.comment?.trim(),
      },
      include: {
        reviewer: {
          select: {
            id: true,
            name: true,
            avatarUrl: true,
          },
        },
      },
    });
  }

  /**
   * 21. Add listing bookmark
   */
  async addListingBookmark(userId: string, listingId: string) {
    const listing = await this.prisma.listing.findUnique({
      where: { id: listingId },
    });

    if (!listing) {
      throw new NotFoundException('Listing not found');
    }

    return this.prisma.bookmark.upsert({
      where: {
        userId_type_listingId: {
          userId,
          type: BookmarkType.LISTING,
          listingId,
        },
      },
      create: {
        userId,
        type: BookmarkType.LISTING,
        listingId,
      },
      update: {},
    });
  }

  /**
   * 22. Remove listing bookmark
   */
  async removeListingBookmark(userId: string, listingId: string) {
    await this.prisma.bookmark.deleteMany({
      where: {
        userId,
        type: BookmarkType.LISTING,
        listingId,
      },
    });

    return { success: true, message: 'Bookmark removed successfully' };
  }

  /**
   * 23. Get user's bookmarked listings
   */
  async getMyListingBookmarks(userId: string, page = 1, limit = 20) {
    const { skip, take } = getPrismaSkipTake(page, limit);

    const where: Prisma.BookmarkWhereInput = {
      userId,
      type: BookmarkType.LISTING,
      listingId: { not: null },
    };

    const [bookmarks, total] = await Promise.all([
      this.prisma.bookmark.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: {
          listing: {
            include: {
              seller: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  avatarUrl: true,
                },
              },
              images: {
                orderBy: { order: 'asc' },
              },
            },
          },
        },
      }),
      this.prisma.bookmark.count({ where }),
    ]);

    return {
      data: bookmarks,
      meta: getPaginationMeta(total, page, limit),
    };
  }
}
