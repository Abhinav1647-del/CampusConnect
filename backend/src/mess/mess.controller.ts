import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { MessService } from './mess.service.js';
import { CreateMealDto } from './dto/create-meal.dto.js';
import { UpdateMealDto } from './dto/update-meal.dto.js';
import { CreateMenuItemDto } from './dto/create-menu-item.dto.js';
import { CreateFoodRatingDto } from './dto/create-food-rating.dto.js';
import { CreateMessNoticeDto } from './dto/create-mess-notice.dto.js';
import { QueryMealDto } from './dto/query-meal.dto.js';
import { CreateMessDto } from './dto/create-mess.dto.js';
import { QueryRatingStatsDto } from './dto/query-rating-stats.dto.js';

@ApiTags('Mess')
@Controller()
export class MessController {
  constructor(private readonly messService: MessService) {}

  @Get('api/mess/messes')
  @ApiOperation({ summary: 'Get all active mess locations' })
  @ApiResponse({ status: 200, description: 'List of all active messes' })
  async getMessList() {
    return this.messService.getMessList();
  }

  @Post('api/admin/mess/messes')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.MESS_ADMIN, Role.APP_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new mess facility (Admin only)' })
  @ApiResponse({ status: 201, description: 'Mess created successfully' })
  @ApiResponse({ status: 409, description: 'Mess name already exists' })
  async createMess(@Body() dto: CreateMessDto) {
    return this.messService.createMess(dto.name, dto.location);
  }

  @Get('api/mess/menu')
  @ApiOperation({ summary: 'Get daily meal menu by date (and optional messId)' })
  @ApiQuery({ name: 'messId', required: false, type: String })
  @ApiQuery({ name: 'date', required: true, example: '2024-01-15' })
  @ApiResponse({ status: 200, description: 'Meals for the specified date' })
  async getMenuByDate(
    @Query('date') date: string,
    @Query('messId') messId?: string,
    @CurrentUser() user?: { id: string },
  ) {
    return this.messService.getMenuByDate(messId, date, user?.id);
  }

  @Get('api/mess/menu/history')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get paginated meal history with filters' })
  @ApiResponse({ status: 200, description: 'Paginated meal history' })
  async getMenuHistory(@Query() query: QueryMealDto) {
    return this.messService.getMenuHistory(query);
  }

  @Post('api/admin/mess/menu')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.MESS_ADMIN, Role.APP_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new meal schedule (Admin only)' })
  @ApiResponse({ status: 201, description: 'Meal created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid menu item IDs' })
  @ApiResponse({ status: 409, description: 'Meal already exists for this slot' })
  async createMeal(@Body() dto: CreateMealDto) {
    return this.messService.createMeal(dto);
  }

  @Patch('api/admin/mess/menu/:mealId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.MESS_ADMIN, Role.APP_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a meal schedule or menu items (Admin only)' })
  @ApiResponse({ status: 200, description: 'Meal updated successfully' })
  @ApiResponse({ status: 404, description: 'Meal not found' })
  async updateMeal(
    @Param('mealId') mealId: string,
    @Body() dto: UpdateMealDto,
  ) {
    return this.messService.updateMeal(mealId, dto);
  }

  @Patch('api/admin/mess/menu/:mealId/publish')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.MESS_ADMIN, Role.APP_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Publish meal schedule to students (Admin only)' })
  @ApiResponse({ status: 200, description: 'Meal published successfully' })
  @ApiResponse({ status: 404, description: 'Meal not found' })
  async publishMeal(@Param('mealId') mealId: string) {
    return this.messService.publishMeal(mealId);
  }

  @Get('api/mess/menu-items')
  @ApiOperation({ summary: 'Get reusable menu items with optional search' })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiResponse({ status: 200, description: 'List of menu items' })
  async getMenuItems(@Query('search') search?: string) {
    return this.messService.getMenuItems(search);
  }

  @Post('api/admin/mess/menu-items')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.MESS_ADMIN, Role.APP_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create reusable menu item (Admin only)' })
  @ApiResponse({ status: 201, description: 'Menu item created successfully' })
  @ApiResponse({ status: 409, description: 'Menu item name already exists' })
  async createMenuItem(@Body() dto: CreateMenuItemDto) {
    return this.messService.createMenuItem(dto);
  }

  @Post('api/mess/ratings')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Submit or update rating for a published meal' })
  @ApiResponse({ status: 200, description: 'Rating recorded successfully' })
  @ApiResponse({ status: 400, description: 'Meal is not published' })
  @ApiResponse({ status: 404, description: 'Meal not found' })
  async rateFood(
    @CurrentUser() user: { id: string },
    @Body() dto: CreateFoodRatingDto,
  ) {
    return this.messService.rateFood(user.id, dto);
  }

  @Get('api/mess/ratings/history')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get user food rating history' })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 20 })
  @ApiResponse({ status: 200, description: 'Rating history list' })
  async getRatingsHistory(
    @CurrentUser() user: { id: string },
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 20;
    return this.messService.getRatingsHistory(user.id, pageNum, limitNum);
  }

  @Get('api/mess/ratings/stats')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get monthly rating statistics for a mess' })
  @ApiResponse({ status: 200, description: 'Aggregated monthly statistics' })
  async getMonthlyRatingStats(@Query() query: QueryRatingStatsDto) {
    return this.messService.getMonthlyRatingStats(
      query.messId,
      query.year,
      query.month,
    );
  }

  @Post('api/admin/mess/notices')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.MESS_ADMIN, Role.APP_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create mess notice (Admin only)' })
  @ApiResponse({ status: 201, description: 'Mess notice created successfully' })
  @ApiResponse({ status: 404, description: 'Mess not found' })
  async createNotice(
    @CurrentUser() user: { id: string },
    @Body() dto: CreateMessNoticeDto,
  ) {
    return this.messService.createNotice(user.id, dto);
  }

  @Get('api/mess/notices')
  @ApiOperation({ summary: 'Get notices for a mess' })
  @ApiQuery({ name: 'messId', required: false, type: String })
  @ApiQuery({ name: 'activeOnly', required: false, type: Boolean })
  @ApiResponse({ status: 200, description: 'List of mess notices' })
  async getNotices(
    @Query('messId') messId?: string,
    @Query('activeOnly') activeOnly?: string,
  ) {
    const isActiveOnly = activeOnly !== undefined ? activeOnly === 'true' : true;
    return this.messService.getNotices(messId, isActiveOnly);
  }

  @Get('api/notices')
  @ApiOperation({ summary: 'Get general campus/mess notices' })
  @ApiResponse({ status: 200, description: 'List of notices' })
  async getCampusNotices() {
    return this.messService.getNotices(undefined, true);
  }
}
