import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { MealPeriod } from '@prisma/client';
import { MessService } from './mess.service.js';
import { PrismaService } from '../database/prisma.service.js';

const mockPrisma = {
  meal: {
    findUnique: vi.fn(),
    findMany: vi.fn(),
    findFirst: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    count: vi.fn(),
  },
  menuItem: {
    findMany: vi.fn(),
    create: vi.fn(),
    findUnique: vi.fn(),
  },
  mealMenuItem: {
    createMany: vi.fn(),
    deleteMany: vi.fn(),
  },
  foodRating: {
    upsert: vi.fn(),
    findMany: vi.fn(),
    count: vi.fn(),
    aggregate: vi.fn(),
    groupBy: vi.fn(),
  },
  mess: {
    findMany: vi.fn(),
    create: vi.fn(),
    findUnique: vi.fn(),
    findFirst: vi.fn(),
  },
  messNotice: {
    create: vi.fn(),
    findMany: vi.fn(),
  },
  $transaction: vi.fn((fn: any) => fn(mockPrisma)),
};

describe('MessService', () => {
  let service: MessService;

  beforeEach(async () => {
    vi.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MessService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();
    service = module.get<MessService>(MessService);
  });

  describe('rateFood', () => {
    it('should upsert a food rating', async () => {
      const meal = { id: 'meal-1', isPublished: true };
      mockPrisma.meal.findUnique.mockResolvedValue(meal);
      mockPrisma.foodRating.upsert.mockResolvedValue({
        id: 'rating-1',
        userId: 'user-1',
        mealId: 'meal-1',
        rating: 4,
        feedback: 'Good!',
      });

      const result = await service.rateFood('user-1', {
        mealId: 'meal-1',
        rating: 4,
        feedback: 'Good!',
      });

      expect(result.rating).toBe(4);
      expect(mockPrisma.foodRating.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            userId_mealId: {
              userId: 'user-1',
              mealId: 'meal-1',
            },
          },
          update: { rating: 4, feedback: 'Good!' },
          create: { userId: 'user-1', mealId: 'meal-1', rating: 4, feedback: 'Good!' },
        }),
      );
    });

    it('should throw NotFoundException if meal does not exist', async () => {
      mockPrisma.meal.findUnique.mockResolvedValue(null);
      await expect(
        service.rateFood('user-1', { mealId: 'nonexistent', rating: 4 }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if meal is not published', async () => {
      mockPrisma.meal.findUnique.mockResolvedValue({ id: 'meal-1', isPublished: false });
      await expect(
        service.rateFood('user-1', { mealId: 'meal-1', rating: 4 }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('getMenuByDate', () => {
    it('should return meals with items and calculated ratings', async () => {
      const mealRecords = [
        {
          id: 'meal-1',
          messId: 'mess-1',
          date: new Date('2025-01-15'),
          period: MealPeriod.BREAKFAST,
          isPublished: true,
          mealItems: [
            {
              id: 'mmi-1',
              menuItem: { id: 'item-1', name: 'Poha', isVeg: true },
            },
          ],
          ratings: [
            { userId: 'user-1', rating: 4 },
            { userId: 'user-2', rating: 5 },
          ],
        },
      ];

      mockPrisma.meal.findMany.mockResolvedValue(mealRecords);

      const result = await service.getMenuByDate('mess-1', '2025-01-15', 'user-1');

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('meal-1');
      expect(result[0].averageRating).toBe(4.5);
      expect(result[0].totalRatings).toBe(2);
      expect(result[0].userRating).toEqual({ userId: 'user-1', rating: 4 });
      expect(result[0].mealItems[0].menuItem.name).toBe('Poha');
    });
  });

  describe('publishMeal', () => {
    it('should publish a meal', async () => {
      mockPrisma.meal.findUnique.mockResolvedValue({ id: 'meal-1', isPublished: false });
      mockPrisma.meal.update.mockResolvedValue({ id: 'meal-1', isPublished: true });

      const result = await service.publishMeal('meal-1');
      expect(result.isPublished).toBe(true);
      expect(mockPrisma.meal.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'meal-1' },
          data: { isPublished: true },
        }),
      );
    });

    it('should throw NotFoundException for non-existent meal', async () => {
      mockPrisma.meal.findUnique.mockResolvedValue(null);
      await expect(service.publishMeal('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('getMonthlyRatingStats', () => {
    it('should return aggregated monthly stats', async () => {
      mockPrisma.mess.findUnique.mockResolvedValue({ id: 'mess-1', name: 'Main Mess' });
      mockPrisma.meal.findMany.mockResolvedValue([
        {
          id: 'meal-1',
          period: MealPeriod.BREAKFAST,
          ratings: [{ rating: 4 }, { rating: 5 }],
        },
        {
          id: 'meal-2',
          period: MealPeriod.LUNCH,
          ratings: [{ rating: 3 }],
        },
      ]);

      const result = await service.getMonthlyRatingStats('mess-1', 2025, 1);

      expect(result.messId).toBe('mess-1');
      expect(result.messName).toBe('Main Mess');
      expect(result.totalMeals).toBe(2);
      expect(result.totalRatings).toBe(3);
      expect(result.averageRating).toBe(4);
      expect(result.byPeriod).toHaveLength(4);
    });

    it('should throw NotFoundException if mess does not exist', async () => {
      mockPrisma.mess.findUnique.mockResolvedValue(null);
      await expect(
        service.getMonthlyRatingStats('nonexistent', 2025, 1),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
