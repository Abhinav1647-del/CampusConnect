import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service.js';
import { NotificationType } from '@prisma/client';
import Expo, { ExpoPushMessage } from 'expo-server-sdk';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);
  private expo: Expo;

  constructor(private readonly prisma: PrismaService) {
    this.expo = new Expo({
      accessToken: process.env.EXPO_ACCESS_TOKEN || undefined,
      useFcmV1: true,
    } as any);
  }

  async createNotification(params: {
    userId: string;
    type: NotificationType;
    title: string;
    body: string;
    data?: Record<string, unknown>;
  }) {
    const notification = await this.prisma.notification.create({
      data: {
        userId: params.userId,
        type: params.type,
        title: params.title,
        body: params.body,
        data: (params.data ?? {}) as any,
      },
    });

    // Try to send push notification — failure must not break the caller
    this.sendPushNotification(params.userId, params.title, params.body, params.data)
      .catch((err) =>
        this.logger.warn(`Push notification failed for user ${params.userId}: ${err.message}`),
      );

    return notification;
  }

  async createBulkNotifications(params: {
    userIds: string[];
    type: NotificationType;
    title: string;
    body: string;
    data?: Record<string, unknown>;
  }) {
    const notifications = await this.prisma.notification.createMany({
      data: params.userIds.map((userId) => ({
        userId,
        type: params.type,
        title: params.title,
        body: params.body,
        data: (params.data ?? {}) as any,
      })),
    });

    // Send push in background
    Promise.all(
      params.userIds.map((uid) =>
        this.sendPushNotification(uid, params.title, params.body, params.data).catch((err) =>
          this.logger.warn(`Push failed for user ${uid}: ${err.message}`),
        ),
      ),
    ).catch(() => {});

    return notifications;
  }

  async getMyNotifications(userId: string, page: number = 1, limit: number = 20) {
    const skip = (page - 1) * limit;
    const [notifications, total] = await Promise.all([
      this.prisma.notification.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.notification.count({ where: { userId } }),
    ]);
    return { notifications, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async markAsRead(userId: string, notificationId: string) {
    return this.prisma.notification.updateMany({
      where: { id: notificationId, userId },
      data: { readAt: new Date() },
    });
  }

  async markAllAsRead(userId: string) {
    return this.prisma.notification.updateMany({
      where: { userId, readAt: null },
      data: { readAt: new Date() },
    });
  }

  async getUnreadCount(userId: string) {
    const count = await this.prisma.notification.count({
      where: { userId, readAt: null },
    });
    return { count };
  }

  private async sendPushNotification(
    userId: string,
    title: string,
    body: string,
    data?: Record<string, unknown>,
  ) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { expoPushToken: true },
    });

    if (!user?.expoPushToken || !Expo.isExpoPushToken(user.expoPushToken)) {
      return;
    }

    const message: ExpoPushMessage = {
      to: user.expoPushToken,
      sound: 'default',
      title,
      body,
      data: data as Record<string, string>,
    };

    const chunks = this.expo.chunkPushNotifications([message]);
    for (const chunk of chunks) {
      const tickets = await this.expo.sendPushNotificationsAsync(chunk);
      await this.prisma.notification.updateMany({
        where: { userId, readAt: null },
        data: { sentAt: new Date() },
      });
      this.logger.debug(`Push tickets: ${JSON.stringify(tickets)}`);
    }
  }
}
