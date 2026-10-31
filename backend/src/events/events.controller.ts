import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { EventsService } from './events.service.js';
import { CreateEventDto } from './dto/create-event.dto.js';
import { UpdateEventDto } from './dto/update-event.dto.js';
import { QueryEventsDto } from './dto/query-events.dto.js';
import { PaginationDto } from '../common/dto/pagination.dto.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';

@ApiTags('Events')
@Controller()
export class EventsController {
  constructor(private readonly eventsService: EventsService) {}

  @Get('api/events')
  @ApiOperation({ summary: 'List all events with optional filters' })
  @ApiResponse({ status: 200, description: 'Paginated list of events' })
  async findAll(@Query() query: QueryEventsDto) {
    return this.eventsService.findAll(query);
  }

  @Get('api/clubs/:clubId/events')
  @ApiOperation({ summary: 'List events for a specific club' })
  @ApiResponse({ status: 200, description: 'Paginated list of club events' })
  async findClubEvents(
    @Param('clubId') clubId: string,
    @Query() query: QueryEventsDto,
  ) {
    return this.eventsService.findAll({ ...query, clubId });
  }

  @Post('api/clubs/:clubId/events')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.APP_ADMIN, Role.CLUB_LEAD)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create an event for a club (Club Lead or APP_ADMIN)' })
  @ApiResponse({ status: 201, description: 'Event created successfully' })
  async create(
    @Param('clubId') clubId: string,
    @Body() dto: CreateEventDto,
    @CurrentUser() user: { id: string; role: Role },
  ) {
    return this.eventsService.create(clubId, dto, user.id, user.role);
  }

  @Get('api/events/my/registrations')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user event registrations' })
  @ApiResponse({ status: 200, description: 'List of user registrations' })
  async getMyRegistrations(
    @CurrentUser() user: { id: string },
    @Query() pagination: PaginationDto,
  ) {
    return this.eventsService.getMyRegistrations(
      user.id,
      pagination.page ?? 1,
      pagination.limit ?? 20,
    );
  }

  @Get('api/users/me/registrations')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user event registrations (alias)' })
  @ApiResponse({ status: 200, description: 'List of user registrations' })
  async getMyRegistrationsAlias(
    @CurrentUser() user: { id: string },
    @Query() pagination: PaginationDto,
  ) {
    return this.eventsService.getMyRegistrations(
      user.id,
      pagination.page ?? 1,
      pagination.limit ?? 20,
    );
  }

  @Get('api/events/:eventId')
  @ApiOperation({ summary: 'Get event details by ID' })
  @ApiResponse({ status: 200, description: 'Event details' })
  async findOne(
    @Param('eventId') eventId: string,
    @CurrentUser() user?: { id: string },
  ) {
    return this.eventsService.findOne(eventId, user?.id);
  }

  @Patch('api/events/:eventId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.APP_ADMIN, Role.CLUB_LEAD)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update event details (Club Lead or APP_ADMIN)' })
  @ApiResponse({ status: 200, description: 'Event updated successfully' })
  async update(
    @Param('eventId') eventId: string,
    @Body() dto: UpdateEventDto,
    @CurrentUser() user: { id: string; role: Role },
  ) {
    return this.eventsService.update(eventId, dto, user.id, user.role);
  }

  @Delete('api/events/:eventId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.APP_ADMIN, Role.CLUB_LEAD)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete or cancel an event (Club Lead or APP_ADMIN)' })
  @ApiResponse({ status: 200, description: 'Event cancelled successfully' })
  async remove(
    @Param('eventId') eventId: string,
    @CurrentUser() user: { id: string; role: Role },
  ) {
    return this.eventsService.cancel(eventId, user.id, user.role);
  }

  @Post('api/events/:eventId/cancel')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.APP_ADMIN, Role.CLUB_LEAD)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Cancel an event (Club Lead or APP_ADMIN)' })
  @ApiResponse({ status: 200, description: 'Event cancelled successfully' })
  async cancel(
    @Param('eventId') eventId: string,
    @CurrentUser() user: { id: string; role: Role },
  ) {
    return this.eventsService.cancel(eventId, user.id, user.role);
  }

  @Post('api/events/:eventId/register')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Register for an event' })
  @ApiResponse({ status: 201, description: 'Registered or waitlisted for event' })
  async register(
    @Param('eventId') eventId: string,
    @CurrentUser() user: { id: string },
  ) {
    return this.eventsService.register(eventId, user.id);
  }

  @Delete('api/events/:eventId/register')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cancel registration for an event' })
  @ApiResponse({ status: 200, description: 'Registration cancelled' })
  async cancelRegistration(
    @Param('eventId') eventId: string,
    @CurrentUser() user: { id: string },
  ) {
    return this.eventsService.cancelRegistration(eventId, user.id);
  }

  @Get('api/events/:eventId/registrations')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.APP_ADMIN, Role.CLUB_LEAD)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all event registrations (Club Lead or APP_ADMIN)' })
  @ApiResponse({ status: 200, description: 'List of registrations' })
  async getRegistrations(
    @Param('eventId') eventId: string,
    @CurrentUser() user: { id: string; role: Role },
  ) {
    return this.eventsService.getRegistrations(eventId, user.id, user.role);
  }

  @Patch('api/events/:eventId/registrations/:registrationId/attend')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.APP_ADMIN, Role.CLUB_LEAD)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Mark attendee status (Club Lead or APP_ADMIN)' })
  @ApiResponse({ status: 200, description: 'Attendance marked' })
  async markAttendance(
    @Param('eventId') eventId: string,
    @Param('registrationId') registrationId: string,
    @CurrentUser() user: { id: string; role: Role },
  ) {
    return this.eventsService.markAttendance(
      eventId,
      user.id,
      registrationId,
      user.role,
    );
  }
}
