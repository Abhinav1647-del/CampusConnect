import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service.js';
import { Role } from '@prisma/client';

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  async getDashboardStats() {
    const [users, clubs, events, listings, notifications] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.club.count(),
      this.prisma.event.count(),
      this.prisma.listing.count(),
      this.prisma.notification.count({ where: { readAt: null } }),
    ]);

    const usersByRole = await this.prisma.user.groupBy({
      by: ['role'],
      _count: true,
    });

    const recentUsers = await this.prisma.user.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      select: { id: true, name: true, email: true, role: true, createdAt: true },
    });

    return {
      totals: { users, clubs, events, listings, unreadNotifications: notifications },
      usersByRole,
      recentUsers,
    };
  }

  async getAuditLogs(page: number = 1, limit: number = 50) {
    const skip = (page - 1) * limit;
    const [logs, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { id: true, name: true, email: true } },
        },
      }),
      this.prisma.auditLog.count(),
    ]);
    return { logs, total, page, limit };
  }

  async createAuditLog(params: {
    userId?: string;
    action: string;
    resource: string;
    resourceId?: string;
    metadata?: Record<string, unknown>;
    ipAddress?: string;
  }) {
    return this.prisma.auditLog.create({
      data: {
        userId: params.userId,
        action: params.action,
        resource: params.resource,
        resourceId: params.resourceId,
        metadata: (params.metadata ?? {}) as any,
        ipAddress: params.ipAddress,
      },
    });
  }

  async getMesses() {
    return this.prisma.mess.findMany({
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { meals: true, notices: true } } },
    });
  }

  async getPendingReports() {
    return this.prisma.listingReport.findMany({
      where: { status: 'PENDING' },
      include: {
        listing: { select: { id: true, title: true, status: true } },
        reporter: { select: { id: true, name: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}
