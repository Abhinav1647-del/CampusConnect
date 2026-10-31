import {
  Controller,
  Get,
  UseGuards,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { AdminService } from './admin.service.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { Roles } from '../auth/decorators/roles.decorator.js';

@ApiTags('Admin')
@Controller('api/admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.APP_ADMIN)
@ApiBearerAuth()
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('dashboard')
  @ApiOperation({ summary: 'Get admin dashboard statistics' })
  async getDashboard() {
    return this.adminService.getDashboardStats();
  }

  @Get('audit-logs')
  @ApiOperation({ summary: 'Get audit logs' })
  async getAuditLogs(
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '50',
  ) {
    return this.adminService.getAuditLogs(Number(page), Number(limit));
  }

  @Get('reports/pending')
  @ApiOperation({ summary: 'Get pending listing reports' })
  async getPendingReports() {
    return this.adminService.getPendingReports();
  }
}
