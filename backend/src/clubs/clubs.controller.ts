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
  BadRequestException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { ClubsService } from './clubs.service.js';
import { CreateClubDto } from './dto/create-club.dto.js';
import { UpdateClubDto } from './dto/update-club.dto.js';
import { QueryClubsDto } from './dto/query-clubs.dto.js';
import { CreateAnnouncementDto } from './dto/create-announcement.dto.js';
import { CreateBookmarkDto, QueryBookmarksDto } from './dto/bookmark.dto.js';
import { PaginationDto } from '../common/dto/pagination.dto.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';

@ApiTags('Clubs')
@Controller()
export class ClubsController {
  constructor(private readonly clubsService: ClubsService) {}

  @Get('api/clubs')
  @ApiOperation({ summary: 'List all clubs with pagination and filters' })
  @ApiResponse({ status: 200, description: 'Paginated list of clubs' })
  async findAll(@Query() query: QueryClubsDto) {
    return this.clubsService.findAll(query);
  }

  @Post('api/clubs')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.APP_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new club (APP_ADMIN only)' })
  @ApiResponse({ status: 201, description: 'Club successfully created' })
  async create(@Body() dto: CreateClubDto) {
    return this.clubsService.create(dto);
  }

  @Get('api/clubs/:clubId')
  @ApiOperation({ summary: 'Get club details by ID' })
  @ApiResponse({ status: 200, description: 'Club details' })
  async findOne(@Param('clubId') clubId: string) {
    return this.clubsService.findOne(clubId);
  }

  @Patch('api/clubs/:clubId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.APP_ADMIN, Role.CLUB_LEAD)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update club details (APP_ADMIN or club lead)' })
  @ApiResponse({ status: 200, description: 'Club updated' })
  async update(
    @Param('clubId') clubId: string,
    @Body() dto: UpdateClubDto,
    @CurrentUser() user: { id: string; role: Role },
  ) {
    return this.clubsService.update(clubId, dto, user.id, user.role);
  }

  @Get('api/clubs/:clubId/members')
  @ApiOperation({ summary: 'Get members of a club' })
  @ApiResponse({ status: 200, description: 'List of club members' })
  async getMembers(@Param('clubId') clubId: string) {
    return this.clubsService.getMemberships(clubId);
  }

  @Post('api/clubs/:clubId/join')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Join a club' })
  @ApiResponse({ status: 201, description: 'Successfully joined club' })
  async joinClub(
    @Param('clubId') clubId: string,
    @CurrentUser() user: { id: string },
  ) {
    return this.clubsService.joinClub(clubId, user.id);
  }

  @Delete('api/clubs/:clubId/leave')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Leave a club' })
  @ApiResponse({ status: 200, description: 'Successfully left club' })
  async leaveClub(
    @Param('clubId') clubId: string,
    @CurrentUser() user: { id: string },
  ) {
    return this.clubsService.leaveClub(clubId, user.id);
  }

  @Post('api/clubs/:clubId/leads/:userId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.APP_ADMIN, Role.CLUB_LEAD)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Assign a club lead (APP_ADMIN or existing lead)' })
  @ApiResponse({ status: 200, description: 'Club lead assigned' })
  async setLead(
    @Param('clubId') clubId: string,
    @Param('userId') targetUserId: string,
    @CurrentUser() user: { id: string },
  ) {
    return this.clubsService.setLead(clubId, user.id, targetUserId);
  }

  @Post('api/clubs/:clubId/announcements')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.APP_ADMIN, Role.CLUB_LEAD, Role.CAMPUSCART_MODERATOR)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create an announcement for a club' })
  @ApiResponse({ status: 201, description: 'Announcement created' })
  async createAnnouncement(
    @Param('clubId') clubId: string,
    @Body() dto: CreateAnnouncementDto,
    @CurrentUser() user: { id: string; role: Role },
  ) {
    return this.clubsService.createAnnouncement(clubId, user.id, dto, user.role);
  }

  @Get('api/clubs/:clubId/announcements')
  @ApiOperation({ summary: 'Get announcements for a club' })
  @ApiResponse({ status: 200, description: 'List of announcements' })
  async getAnnouncements(
    @Param('clubId') clubId: string,
    @Query() pagination: PaginationDto,
  ) {
    return this.clubsService.getAnnouncements(
      clubId,
      pagination.page ?? 1,
      pagination.limit ?? 20,
    );
  }

  @Get('api/announcements')
  @ApiOperation({ summary: 'Get all campus announcements across clubs' })
  @ApiResponse({ status: 200, description: 'List of announcements' })
  async getAllAnnouncements(@Query() pagination: PaginationDto) {
    return this.clubsService.getAnnouncements(
      undefined,
      pagination.page ?? 1,
      pagination.limit ?? 20,
    );
  }

  @Get('api/bookmarks')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get user bookmarks' })
  @ApiResponse({ status: 200, description: 'List of bookmarks' })
  async getBookmarks(
    @Query() query: QueryBookmarksDto,
    @CurrentUser() user: { id: string },
  ) {
    return this.clubsService.getBookmarks(user.id, query.type);
  }

  @Post('api/bookmarks')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Add a bookmark' })
  @ApiResponse({ status: 201, description: 'Bookmark added' })
  async addBookmark(
    @Body() dto: CreateBookmarkDto,
    @CurrentUser() user: { id: string },
  ) {
    const targetId = dto.targetId || dto.clubId || dto.eventId || dto.listingId;
    if (!targetId) {
      throw new BadRequestException('Target ID must be specified (targetId, clubId, eventId, or listingId)');
    }
    return this.clubsService.addBookmark(user.id, dto.type, targetId);
  }

  @Delete('api/bookmarks/:bookmarkId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Remove a bookmark' })
  @ApiResponse({ status: 200, description: 'Bookmark removed' })
  async removeBookmark(
    @Param('bookmarkId') bookmarkId: string,
    @CurrentUser() user: { id: string },
  ) {
    return this.clubsService.removeBookmark(user.id, bookmarkId);
  }
}
