import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { ListingCondition, ListingStatus, RequestStatus, Role } from '@prisma/client';
import { CampusCartService } from './campuscart.service.js';
import { PrismaService } from '../database/prisma.service.js';
import { UploadService } from '../upload/upload.service.js';

const mockPrisma = {
  listing: {
    findUnique: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    count: vi.fn(),
  },
  listingImage: {
    findMany: vi.fn(),
    create: vi.fn(),
    delete: vi.fn(),
    findUnique: vi.fn(),
    count: vi.fn(),
  },
  listingRequest: {
    findFirst: vi.fn(),
    findUnique: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    updateMany: vi.fn(),
  },
  conversation: {
    create: vi.fn(),
    findUnique: vi.fn(),
    findMany: vi.fn(),
  },
  message: {
    create: vi.fn(),
    findMany: vi.fn(),
    updateMany: vi.fn(),
    count: vi.fn(),
  },
  transaction: {
    create: vi.fn(),
    findUnique: vi.fn(),
    findFirst: vi.fn(),
  },
  listingReport: {
    create: vi.fn(),
    findMany: vi.fn(),
    findUnique: vi.fn(),
    update: vi.fn(),
    count: vi.fn(),
  },
  sellerReview: {
    create: vi.fn(),
    findUnique: vi.fn(),
    findFirst: vi.fn(),
  },
  bookmark: {
    create: vi.fn(),
    delete: vi.fn(),
    deleteMany: vi.fn(),
    upsert: vi.fn(),
    findFirst: vi.fn(),
    findMany: vi.fn(),
    count: vi.fn(),
  },
  $transaction: vi.fn((fn: any) => {
    if (typeof fn === 'function') {
      return fn(mockPrisma);
    }
    return Promise.all(fn);
  }),
};

const mockUpload = {
  deleteFile: vi.fn().mockResolvedValue(undefined),
  uploadFile: vi.fn(),
};

describe('CampusCartService', () => {
  let service: CampusCartService;

  beforeEach(async () => {
    vi.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CampusCartService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: UploadService, useValue: mockUpload },
      ],
    }).compile();
    service = module.get<CampusCartService>(CampusCartService);
  });

  describe('createListing', () => {
    it('should create a listing with DRAFT status', async () => {
      mockPrisma.listing.create.mockResolvedValue({
        id: 'listing-1',
        sellerId: 'user-1',
        title: 'Engineering Textbook',
        price: 350,
        status: ListingStatus.DRAFT,
      });

      const result = await service.createListing('user-1', {
        title: 'Engineering Textbook',
        price: 350,
        category: 'Books',
        condition: ListingCondition.GOOD,
      });

      expect(result.status).toBe(ListingStatus.DRAFT);
      expect(mockPrisma.listing.create).toHaveBeenCalled();
    });
  });

  describe('updateListingStatus', () => {
    it('should transition DRAFT to ACTIVE by seller', async () => {
      mockPrisma.listing.findUnique.mockResolvedValue({
        id: 'listing-1',
        sellerId: 'user-1',
        status: ListingStatus.DRAFT,
      });
      mockPrisma.listing.update.mockResolvedValue({
        id: 'listing-1',
        status: ListingStatus.ACTIVE,
      });

      const result = await service.updateListingStatus(
        'listing-1',
        ListingStatus.ACTIVE,
        'user-1',
        Role.STUDENT,
      );
      expect(result.status).toBe(ListingStatus.ACTIVE);
    });

    it('should throw BadRequestException for invalid transition DRAFT to SOLD', async () => {
      mockPrisma.listing.findUnique.mockResolvedValue({
        id: 'listing-1',
        sellerId: 'user-1',
        status: ListingStatus.DRAFT,
      });

      await expect(
        service.updateListingStatus(
          'listing-1',
          ListingStatus.SOLD,
          'user-1',
          Role.STUDENT,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should allow moderator to cancel any listing', async () => {
      mockPrisma.listing.findUnique.mockResolvedValue({
        id: 'listing-1',
        sellerId: 'other-user',
        status: ListingStatus.ACTIVE,
      });
      mockPrisma.listing.update.mockResolvedValue({
        id: 'listing-1',
        status: ListingStatus.CANCELLED,
      });

      const result = await service.updateListingStatus(
        'listing-1',
        ListingStatus.CANCELLED,
        'mod-user',
        Role.CAMPUSCART_MODERATOR,
      );
      expect(result.status).toBe(ListingStatus.CANCELLED);
    });
  });

  describe('createRequest', () => {
    it('should create a purchase request with conversation', async () => {
      mockPrisma.listing.findUnique.mockResolvedValue({
        id: 'listing-1',
        sellerId: 'seller-1',
        status: ListingStatus.ACTIVE,
      });
      mockPrisma.listingRequest.findUnique.mockResolvedValue(null);
      mockPrisma.listingRequest.create.mockResolvedValue({
        id: 'req-1',
        listingId: 'listing-1',
        buyerId: 'buyer-1',
        status: RequestStatus.PENDING,
      });
      mockPrisma.conversation.create.mockResolvedValue({ id: 'conv-1', requestId: 'req-1' });
      mockPrisma.message.create.mockResolvedValue({ id: 'msg-1' });

      const result = await service.createRequest('listing-1', 'buyer-1', {
        message: 'Is this available?',
      });
      expect(result.status).toBe(RequestStatus.PENDING);
      expect(result.conversation).toBeDefined();
    });

    it('should throw BadRequestException if buyer is the seller', async () => {
      mockPrisma.listing.findUnique.mockResolvedValue({
        id: 'listing-1',
        sellerId: 'user-1',
        status: ListingStatus.ACTIVE,
      });

      await expect(
        service.createRequest('listing-1', 'user-1', {}),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if listing is not ACTIVE', async () => {
      mockPrisma.listing.findUnique.mockResolvedValue({
        id: 'listing-1',
        sellerId: 'seller-1',
        status: ListingStatus.RESERVED,
      });

      await expect(
        service.createRequest('listing-1', 'buyer-1', {}),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('respondToRequest', () => {
    it('should ACCEPT request and RESERVE listing', async () => {
      mockPrisma.listingRequest.findUnique.mockResolvedValue({
        id: 'req-1',
        listingId: 'listing-1',
        buyerId: 'buyer-1',
        status: RequestStatus.PENDING,
        listing: { sellerId: 'seller-1', status: ListingStatus.ACTIVE },
      });
      mockPrisma.listingRequest.update.mockResolvedValue({
        id: 'req-1',
        status: RequestStatus.ACCEPTED,
      });
      mockPrisma.listing.update.mockResolvedValue({
        id: 'listing-1',
        status: ListingStatus.RESERVED,
      });
      mockPrisma.listingRequest.updateMany.mockResolvedValue({ count: 1 });

      const result = await service.respondToRequest('req-1', 'ACCEPTED', 'seller-1');
      expect(result.status).toBe(RequestStatus.ACCEPTED);
      expect(mockPrisma.listing.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'listing-1' },
          data: { status: ListingStatus.RESERVED },
        }),
      );
      expect(mockPrisma.listingRequest.updateMany).toHaveBeenCalledWith({
        where: {
          listingId: 'listing-1',
          id: { not: 'req-1' },
          status: RequestStatus.PENDING,
        },
        data: { status: RequestStatus.REJECTED },
      });
    });

    it('should REJECT request and not alter listing status', async () => {
      mockPrisma.listingRequest.findUnique.mockResolvedValue({
        id: 'req-1',
        listingId: 'listing-1',
        buyerId: 'buyer-1',
        status: RequestStatus.PENDING,
        listing: { sellerId: 'seller-1', status: ListingStatus.ACTIVE },
      });
      mockPrisma.listingRequest.update.mockResolvedValue({
        id: 'req-1',
        status: RequestStatus.REJECTED,
      });

      const result = await service.respondToRequest('req-1', 'REJECTED', 'seller-1');
      expect(result.status).toBe(RequestStatus.REJECTED);
      expect(mockPrisma.listing.update).not.toHaveBeenCalled();
    });

    it('should throw ForbiddenException if non-seller tries to respond', async () => {
      mockPrisma.listingRequest.findUnique.mockResolvedValue({
        id: 'req-1',
        listingId: 'listing-1',
        status: RequestStatus.PENDING,
        listing: { sellerId: 'seller-1', status: ListingStatus.ACTIVE },
      });

      await expect(
        service.respondToRequest('req-1', 'ACCEPTED', 'other-user'),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('completeTransaction', () => {
    it('should complete transaction and mark listing SOLD', async () => {
      mockPrisma.listingRequest.findUnique.mockResolvedValue({
        id: 'req-1',
        listingId: 'listing-1',
        sellerId: 'seller-1',
        status: RequestStatus.ACCEPTED,
        listing: { id: 'listing-1', sellerId: 'seller-1', status: ListingStatus.RESERVED },
      });
      mockPrisma.listingRequest.update.mockResolvedValue({
        id: 'req-1',
        status: RequestStatus.COMPLETED,
      });
      mockPrisma.listing.update.mockResolvedValue({
        id: 'listing-1',
        status: ListingStatus.SOLD,
      });
      mockPrisma.transaction.create.mockResolvedValue({
        id: 'tx-1',
        listingId: 'listing-1',
        requestId: 'req-1',
      });

      const result = await service.completeTransaction('req-1', 'seller-1');
      expect(result.id).toBe('tx-1');
      expect(mockPrisma.listing.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'listing-1' },
          data: { status: ListingStatus.SOLD },
        }),
      );
    });

    it('should throw BadRequestException if request is not ACCEPTED', async () => {
      mockPrisma.listingRequest.findUnique.mockResolvedValue({
        id: 'req-1',
        listingId: 'listing-1',
        status: RequestStatus.PENDING,
        listing: { sellerId: 'seller-1' },
      });

      await expect(
        service.completeTransaction('req-1', 'seller-1'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('reviewSeller', () => {
    it('should create a seller review from the verified buyer', async () => {
      mockPrisma.listing.findUnique.mockResolvedValue({
        id: 'listing-1',
        sellerId: 'seller-1',
      });
      mockPrisma.transaction.findUnique.mockResolvedValue({
        id: 'tx-1',
        listingId: 'listing-1',
        request: { buyerId: 'buyer-1' },
      });
      mockPrisma.sellerReview.findUnique.mockResolvedValue(null);
      mockPrisma.sellerReview.create.mockResolvedValue({
        id: 'review-1',
        listingId: 'listing-1',
        reviewerId: 'buyer-1',
        sellerId: 'seller-1',
        rating: 5,
        comment: 'Great transaction!',
      });

      const result = await service.reviewSeller('listing-1', 'buyer-1', {
        rating: 5,
        comment: 'Great transaction!',
      });

      expect(result.rating).toBe(5);
      expect(mockPrisma.sellerReview.create).toHaveBeenCalled();
    });

    it('should throw BadRequestException if user already reviewed the seller', async () => {
      mockPrisma.listing.findUnique.mockResolvedValue({
        id: 'listing-1',
        sellerId: 'seller-1',
      });
      mockPrisma.transaction.findUnique.mockResolvedValue({
        id: 'tx-1',
        listingId: 'listing-1',
        request: { buyerId: 'buyer-1' },
      });
      mockPrisma.sellerReview.findUnique.mockResolvedValue({ id: 'rev-existing' });

      await expect(
        service.reviewSeller('listing-1', 'buyer-1', { rating: 5 }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw ForbiddenException if reviewer is not the verified buyer', async () => {
      mockPrisma.listing.findUnique.mockResolvedValue({
        id: 'listing-1',
        sellerId: 'seller-1',
      });
      mockPrisma.transaction.findUnique.mockResolvedValue({
        id: 'tx-1',
        listingId: 'listing-1',
        request: { buyerId: 'buyer-1' },
      });

      await expect(
        service.reviewSeller('listing-1', 'other-user', { rating: 5 }),
      ).rejects.toThrow(ForbiddenException);
    });
  });
});
