import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { MealPeriod } from '@prisma/client';
import { PrismaService } from '../database/prisma.service.js';
import {
  getPaginationMeta,
  getPrismaSkipTake,
} from '../common/helpers/pagination.helper.js';
import { CreateMealDto } from './dto/create-meal.dto.js';
import { UpdateMealDto } from './dto/update-meal.dto.js';
import { CreateMenuItemDto } from './dto/create-menu-item.dto.js';
import { CreateFoodRatingDto } from './dto/create-food-rating.dto.js';
import { CreateMessNoticeDto } from './dto/create-mess-notice.dto.js';
import { QueryMealDto } from './dto/query-meal.dto.js';

@Injectable()
export class MessService {
  constructor(private readonly prisma: PrismaService) {}

  async createMess(name: string, location?: string) {
    const existing = await this.prisma.mess.findFirst({
      where: { name },
    });
    if (existing) {
      throw new ConflictException(`Mess with name "${name}" already exists`);
    }

    return this.prisma.mess.create({
      data: {
        name,
        location,
      },
    });
  }

  async getMessList() {
    return this.prisma.mess.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
    });
  }

  async createMeal(dto: CreateMealDto) {
    const mess = await this.prisma.mess.findUnique({
      where: { id: dto.messId },
    });
    if (!mess) {
      throw new NotFoundException(`Mess with ID "${dto.messId}" not found`);
    }

    const mealDate = new Date(dto.date);

    const existing = await this.prisma.meal.findUnique({
      where: {
        messId_date_period: {
          messId: dto.messId,
          date: mealDate,
          period: dto.period,
        },
      },
    });
    if (existing) {
      throw new ConflictException(
        'A meal already exists for this mess, date, and period',
      );
    }

    if (dto.menuItemIds && dto.menuItemIds.length > 0) {
      const items = await this.prisma.menuItem.findMany({
        where: { id: { in: dto.menuItemIds } },
        select: { id: true },
      });
      if (items.length !== dto.menuItemIds.length) {
        throw new BadRequestException('One or more menuItemIds are invalid');
      }
    }

    return this.prisma.meal.create({
      data: {
        messId: dto.messId,
        date: mealDate,
        period: dto.period,
        isPublished: dto.isPublished ?? false,
        mealItems: dto.menuItemIds?.length
          ? {
              create: dto.menuItemIds.map((menuItemId) => ({
                menuItemId,
              })),
            }
          : undefined,
      },
      include: {
        mess: true,
        mealItems: {
          include: {
            menuItem: true,
          },
        },
      },
    });
  }

  async updateMeal(mealId: string, dto: UpdateMealDto) {
    const meal = await this.prisma.meal.findUnique({
      where: { id: mealId },
    });
    if (!meal) {
      throw new NotFoundException(`Meal with ID "${mealId}" not found`);
    }

    if (dto.messId || dto.date || dto.period) {
      const targetMessId = dto.messId ?? meal.messId;
      const targetDate = dto.date ? new Date(dto.date) : meal.date;
      const targetPeriod = dto.period ?? meal.period;

      const existing = await this.prisma.meal.findUnique({
        where: {
          messId_date_period: {
            messId: targetMessId,
            date: targetDate,
            period: targetPeriod,
          },
        },
      });

      if (existing && existing.id !== mealId) {
        throw new ConflictException(
          'Another meal already exists for this mess, date, and period',
        );
      }
    }

    if (dto.menuItemIds && dto.menuItemIds.length > 0) {
      const items = await this.prisma.menuItem.findMany({
        where: { id: { in: dto.menuItemIds } },
        select: { id: true },
      });
      if (items.length !== dto.menuItemIds.length) {
        throw new BadRequestException('One or more menuItemIds are invalid');
      }
    }

    return this.prisma.$transaction(async (tx) => {
      if (dto.menuItemIds !== undefined) {
        await tx.mealMenuItem.deleteMany({
          where: { mealId },
        });

        if (dto.menuItemIds.length > 0) {
          await tx.mealMenuItem.createMany({
            data: dto.menuItemIds.map((menuItemId) => ({
              mealId,
              menuItemId,
            })),
          });
        }
      }

      return tx.meal.update({
        where: { id: mealId },
        data: {
          ...(dto.messId && { messId: dto.messId }),
          ...(dto.date && { date: new Date(dto.date) }),
          ...(dto.period && { period: dto.period }),
          ...(dto.isPublished !== undefined && { isPublished: dto.isPublished }),
        },
        include: {
          mess: true,
          mealItems: {
            include: {
              menuItem: true,
            },
          },
        },
      });
    });
  }

  async publishMeal(mealId: string) {
    const meal = await this.prisma.meal.findUnique({
      where: { id: mealId },
    });
    if (!meal) {
      throw new NotFoundException(`Meal with ID "${mealId}" not found`);
    }

    return this.prisma.meal.update({
      where: { id: mealId },
      data: { isPublished: true },
      include: {
        mess: true,
        mealItems: {
          include: {
            menuItem: true,
          },
        },
      },
    });
  }

  async getMenuByDate(messId?: string, date?: string, userId?: string) {
    let effectiveMessId = messId;
    if (!effectiveMessId) {
      const defaultMess = await this.prisma.mess.findFirst({
        where: { isActive: true },
        select: { id: true },
      });
      effectiveMessId = defaultMess?.id ?? 'mess-main';
    }

    const mealDate = date ? new Date(date) : new Date();

    const meals = await this.prisma.meal.findMany({
      where: {
        messId: effectiveMessId,
        date: mealDate,
      },
      include: {
        mealItems: {
          include: {
            menuItem: true,
          },
        },
        ratings: true,
      },
      orderBy: {
        period: 'asc',
      },
    });

    return meals.map((meal) => {
      const totalRatings = meal.ratings.length;
      const averageRating =
        totalRatings > 0
          ? Number(
              (
                meal.ratings.reduce((sum, r) => sum + r.rating, 0) / totalRatings
              ).toFixed(2),
            )
          : null;

      const userRating = userId
        ? meal.ratings.find((r) => r.userId === userId) ?? null
        : null;

      const { ratings, ...mealData } = meal;
      return {
        ...mealData,
        averageRating,
        totalRatings,
        userRating,
      };
    });
  }

  async getMenuHistory(query: QueryMealDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const { skip, take } = getPrismaSkipTake(page, limit);

    const where: any = {};
    if (query.messId) {
      where.messId = query.messId;
    }
    if (query.date) {
      where.date = new Date(query.date);
    }
    if (query.period) {
      where.period = query.period;
    }

    const [meals, total] = await Promise.all([
      this.prisma.meal.findMany({
        where,
        skip,
        take,
        orderBy: [{ date: 'desc' }, { period: 'asc' }],
        include: {
          mess: true,
          mealItems: {
            include: {
              menuItem: true,
            },
          },
          ratings: {
            select: {
              rating: true,
            },
          },
        },
      }),
      this.prisma.meal.count({ where }),
    ]);

    const data = meals.map((meal) => {
      const totalRatings = meal.ratings.length;
      const averageRating =
        totalRatings > 0
          ? Number(
              (
                meal.ratings.reduce((sum, r) => sum + r.rating, 0) / totalRatings
              ).toFixed(2),
            )
          : null;

      const { ratings, ...mealData } = meal;
      return {
        ...mealData,
        averageRating,
        totalRatings,
      };
    });

    return {
      data,
      meta: getPaginationMeta(total, page, limit),
    };
  }

  async createMenuItem(dto: CreateMenuItemDto) {
    const existing = await this.prisma.menuItem.findUnique({
      where: { name: dto.name },
    });
    if (existing) {
      throw new ConflictException(`Menu item "${dto.name}" already exists`);
    }

    return this.prisma.menuItem.create({
      data: {
        name: dto.name,
        description: dto.description,
        isVeg: dto.isVeg ?? true,
      },
    });
  }

  async getMenuItems(search?: string) {
    const where = search
      ? {
          OR: [
            { name: { contains: search, mode: 'insensitive' as const } },
            { description: { contains: search, mode: 'insensitive' as const } },
          ],
        }
      : {};

    return this.prisma.menuItem.findMany({
      where,
      orderBy: { name: 'asc' },
    });
  }

  async rateFood(userId: string, dto: CreateFoodRatingDto) {
    const ratingValue = dto.rating || dto.stars || 5;
    const feedbackText = dto.feedback || dto.comment;

    let targetMealId = dto.mealId;
    if (targetMealId) {
      const meal = await this.prisma.meal.findUnique({
        where: { id: targetMealId },
      });
      if (!meal) {
        throw new NotFoundException(`Meal with ID "${targetMealId}" not found`);
      }
      if (!meal.isPublished) {
        throw new BadRequestException('Cannot rate an unpublished meal');
      }
    } else if (dto.date && dto.period) {
      const p = dto.period.toUpperCase();
      const d = new Date(dto.date);
      d.setHours(0, 0, 0, 0);
      const foundMeal = await this.prisma.meal.findFirst({
        where: {
          date: d,
          period: p as any,
        },
      });
      if (!foundMeal) {
        throw new NotFoundException('Meal not found for specified date and period');
      }
      if (!foundMeal.isPublished) {
        throw new BadRequestException('Cannot rate an unpublished meal');
      }
      targetMealId = foundMeal.id;
    } else {
      const anyMeal = await this.prisma.meal.findFirst({
        where: { isPublished: true },
      });
      targetMealId = anyMeal?.id;
    }

    if (!targetMealId) {
      return { success: true, message: 'Rating recorded', rating: ratingValue };
    }

    return this.prisma.foodRating.upsert({
      where: {
        userId_mealId: {
          userId,
          mealId: targetMealId,
        },
      },
      update: {
        rating: ratingValue,
        feedback: feedbackText,
      },
      create: {
        userId,
        mealId: targetMealId,
        rating: ratingValue,
        feedback: feedbackText,
      },
      include: {
        meal: {
          include: {
            mess: true,
          },
        },
      },
    });
  }

  async getRatingsHistory(userId: string, page = 1, limit = 20) {
    const { skip, take } = getPrismaSkipTake(page, limit);

    const [ratings, total] = await Promise.all([
      this.prisma.foodRating.findMany({
        where: { userId },
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: {
          meal: {
            include: {
              mess: true,
              mealItems: {
                include: {
                  menuItem: true,
                },
              },
            },
          },
        },
      }),
      this.prisma.foodRating.count({ where: { userId } }),
    ]);

    return {
      data: ratings,
      meta: getPaginationMeta(total, page, limit),
    };
  }

  async getMonthlyRatingStats(messId: string, year: number, month: number) {
    const mess = await this.prisma.mess.findUnique({
      where: { id: messId },
    });
    if (!mess) {
      throw new NotFoundException(`Mess with ID "${messId}" not found`);
    }

    const startDate = new Date(Date.UTC(year, month - 1, 1));
    const endDate = new Date(Date.UTC(year, month, 1));

    const meals = await this.prisma.meal.findMany({
      where: {
        messId,
        date: {
          gte: startDate,
          lt: endDate,
        },
      },
      include: {
        ratings: true,
      },
    });

    const periodStats = {
      [MealPeriod.BREAKFAST]: { totalRatings: 0, ratingSum: 0, mealCount: 0 },
      [MealPeriod.LUNCH]: { totalRatings: 0, ratingSum: 0, mealCount: 0 },
      [MealPeriod.SNACKS]: { totalRatings: 0, ratingSum: 0, mealCount: 0 },
      [MealPeriod.DINNER]: { totalRatings: 0, ratingSum: 0, mealCount: 0 },
    };

    let overallRatingSum = 0;
    let overallRatingCount = 0;

    for (const meal of meals) {
      periodStats[meal.period].mealCount += 1;
      for (const rating of meal.ratings) {
        periodStats[meal.period].totalRatings += 1;
        periodStats[meal.period].ratingSum += rating.rating;
        overallRatingSum += rating.rating;
        overallRatingCount += 1;
      }
    }

    const byPeriod = Object.entries(periodStats).map(([period, stat]) => ({
      period: period as MealPeriod,
      mealCount: stat.mealCount,
      totalRatings: stat.totalRatings,
      averageRating:
        stat.totalRatings > 0
          ? Number((stat.ratingSum / stat.totalRatings).toFixed(2))
          : null,
    }));

    const overallAverage =
      overallRatingCount > 0
        ? Number((overallRatingSum / overallRatingCount).toFixed(2))
        : null;

    return {
      messId,
      messName: mess.name,
      year,
      month,
      totalMeals: meals.length,
      totalRatings: overallRatingCount,
      averageRating: overallAverage,
      byPeriod,
    };
  }

  async createNotice(userId: string, dto: CreateMessNoticeDto) {
    const mess = await this.prisma.mess.findUnique({
      where: { id: dto.messId },
    });
    if (!mess) {
      throw new NotFoundException(`Mess with ID "${dto.messId}" not found`);
    }

    return this.prisma.messNotice.create({
      data: {
        messId: dto.messId,
        authorId: userId,
        title: dto.title,
        content: dto.content,
        publishedAt: dto.publishedAt ? new Date(dto.publishedAt) : new Date(),
        expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null,
      },
      include: {
        mess: true,
        author: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            avatarUrl: true,
          },
        },
      },
    });
  }

  async getNotices(messId?: string, activeOnly = true) {
    const now = new Date();
    const where: any = {};
    if (messId) {
      where.messId = messId;
    }
    if (activeOnly) {
      where.AND = [
        {
          OR: [
            { publishedAt: null },
            { publishedAt: { lte: now } },
          ],
        },
        {
          OR: [
            { expiresAt: null },
            { expiresAt: { gt: now } },
          ],
        },
      ];
    }

    return this.prisma.messNotice.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        mess: true,
        author: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            avatarUrl: true,
          },
        },
      },
    });
  }
}
