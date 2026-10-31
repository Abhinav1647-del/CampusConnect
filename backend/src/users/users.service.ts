import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service.js';
import { UpdateProfileDto } from './dto/update-profile.dto.js';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        name: true,
        rollNumber: true,
        role: true,
        avatarUrl: true,
        createdAt: true,
        updatedAt: true,
        clubMemberships: {
          where: { isLead: true },
          select: { clubId: true },
        },
        _count: {
          select: {
            listings: true,
            eventRegistrations: true,
            clubMemberships: true,
          },
        },
      },
    });

    if (!user) throw new NotFoundException('User not found');
    const roleMapping: Record<string, string> = {
      STUDENT: 'student',
      CLUB_LEAD: 'club_lead',
      MESS_ADMIN: 'mess_admin',
      CAMPUSCART_MODERATOR: 'moderator',
      APP_ADMIN: 'admin',
    };

    return {
      ...user,
      rollNo: user.rollNumber ?? '—',
      branch: user.rollNumber?.substring(4, 7) || 'CSE',
      year: 3,
      hostel: 'Campus Hostel',
      role: roleMapping[user.role] ?? user.role.toLowerCase(),
      clubIds: user.clubMemberships?.map((m) => m.clubId) ?? [],
    };
  }

  async updateProfile(id: string, dto: UpdateProfileDto) {
    return this.prisma.user.update({
      where: { id },
      data: dto,
      select: {
        id: true,
        email: true,
        name: true,
        rollNumber: true,
        role: true,
        avatarUrl: true,
        expoPushToken: true,
        updatedAt: true,
      },
    });
  }

  async findAll(page: number = 1, limit: number = 20) {
    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        skip: (page - 1) * limit,
        take: limit,
        select: {
          id: true,
          email: true,
          name: true,
          rollNumber: true,
          role: true,
          isActive: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.user.count(),
    ]);
    return { users, total, page, limit };
  }

  async setRole(userId: string, role: string) {
    return this.prisma.user.update({
      where: { id: userId },
      data: { role: role as any },
      select: { id: true, email: true, role: true },
    });
  }

  async deactivate(userId: string) {
    return this.prisma.user.update({
      where: { id: userId },
      data: { isActive: false },
      select: { id: true, email: true, isActive: true },
    });
  }
}
