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
  UseInterceptors,
  UploadedFiles,
  BadRequestException,
  Req,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger';
import { FilesInterceptor } from '@nestjs/platform-express';
import { Role, ReportStatus } from '@prisma/client';
import 'multer';
import { Request } from 'express';
import { CampusCartService } from './campuscart.service.js';
import { UploadService } from '../upload/upload.service.js';
import { CreateListingDto } from './dto/create-listing.dto.js';
import { UpdateListingDto } from './dto/update-listing.dto.js';
import { QueryListingsDto } from './dto/query-listings.dto.js';
import { UpdateListingStatusDto } from './dto/update-listing-status.dto.js';
import { CreateRequestDto } from './dto/create-request.dto.js';
import { SendMessageDto } from './dto/send-message.dto.js';
import { CreateReportDto } from './dto/create-report.dto.js';
import { CreateReviewDto } from './dto/create-review.dto.js';
import { PaginationDto } from '../common/dto/pagination.dto.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';

@ApiTags('CampusCart')
@Controller('api/campuscart')
export class CampusCartController {
  constructor(
    private readonly campusCartService: CampusCartService,
    private readonly uploadService: UploadService,
  ) {}

  @Get('listings')
  @ApiOperation({ summary: 'Search and filter active campus listings' })
  @ApiResponse({ status: 200, description: 'Paginated list of listings' })
  async findAllListings(@Query() query: QueryListingsDto) {
    return this.campusCartService.findAllListings(query);
  }

  @Post('listings')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new marketplace listing' })
  @ApiResponse({ status: 201, description: 'Listing created with DRAFT status' })
  async createListing(
    @Body() dto: CreateListingDto,
    @CurrentUser() user: { id: string },
  ) {
    return this.campusCartService.createListing(user.id, dto);
  }

  @Get('listings/:id')
  @ApiOperation({ summary: 'Get single listing details' })
  @ApiResponse({ status: 200, description: 'Listing details' })
  @ApiResponse({ status: 404, description: 'Listing not found' })
  async findOneListing(
    @Param('id') id: string,
    @Req() req: Request & { user?: { id: string } },
  ) {
    return this.campusCartService.findOneListing(id, req.user?.id);
  }

  @Patch('listings/:id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update listing details (seller only, DRAFT or ACTIVE)' })
  @ApiResponse({ status: 200, description: 'Updated listing' })
  async updateListing(
    @Param('id') id: string,
    @Body() dto: UpdateListingDto,
    @CurrentUser() user: { id: string },
  ) {
    return this.campusCartService.updateListing(id, dto, user.id);
  }

  @Delete('listings/:id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete listing (seller or moderator/admin)' })
  @ApiResponse({ status: 200, description: 'Listing deleted' })
  async deleteListing(
    @Param('id') id: string,
    @CurrentUser() user: { id: string; role: Role },
  ) {
    return this.campusCartService.deleteListing(id, user.id, user.role);
  }

  @Patch('listings/:id/status')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update listing status' })
  @ApiResponse({ status: 200, description: 'Status updated' })
  async updateListingStatus(
    @Param('id') id: string,
    @Body() dto: UpdateListingStatusDto,
    @CurrentUser() user: { id: string; role: Role },
  ) {
    return this.campusCartService.updateListingStatus(
      id,
      dto.status,
      user.id,
      user.role,
    );
  }

  @Post('listings/:id/images')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @UseInterceptors(FilesInterceptor('images', 5))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload up to 5 images for a listing (seller only)' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        images: {
          type: 'array',
          items: {
            type: 'string',
            format: 'binary',
          },
        },
      },
    },
  })
  async uploadImages(
    @Param('id') id: string,
    @UploadedFiles() files: Express.Multer.File[],
    @CurrentUser() user: { id: string },
  ) {
    if (!files || files.length === 0) {
      throw new BadRequestException('At least one image file is required');
    }

    const uploaded = await Promise.all(
      files.map((file) =>
        this.uploadService.uploadFile(file, `listings/${id}`),
      ),
    );

    return this.campusCartService.addImages(id, uploaded, user.id);
  }

  @Delete('listings/:id/images/:imageId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete an image from a listing (seller only)' })
  async deleteImage(
    @Param('id') id: string,
    @Param('imageId') imageId: string,
    @CurrentUser() user: { id: string },
  ) {
    return this.campusCartService.deleteImage(id, imageId, user.id);
  }

  @Post('listings/:id/requests')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Send purchase request for a listing' })
  @ApiResponse({ status: 201, description: 'Request created' })
  async createRequest(
    @Param('id') id: string,
    @Body() dto: CreateRequestDto,
    @CurrentUser() user: { id: string },
  ) {
    return this.campusCartService.createRequest(id, user.id, dto);
  }

  @Get('listings/:id/requests')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all requests for a listing (seller only)' })
  async getListingRequests(
    @Param('id') id: string,
    @CurrentUser() user: { id: string },
  ) {
    return this.campusCartService.getListingRequests(id, user.id);
  }

  @Get('requests')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user sent purchase requests' })
  async getMyRequests(@CurrentUser() user: { id: string }) {
    return this.campusCartService.getMyRequests(user.id);
  }

  @Post('requests/:requestId/accept')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Accept a purchase request (seller only)' })
  async acceptRequest(
    @Param('requestId') requestId: string,
    @CurrentUser() user: { id: string },
  ) {
    return this.campusCartService.respondToRequest(
      requestId,
      'ACCEPTED',
      user.id,
    );
  }

  @Post('requests/:requestId/reject')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Reject a purchase request (seller only)' })
  async rejectRequest(
    @Param('requestId') requestId: string,
    @CurrentUser() user: { id: string },
  ) {
    return this.campusCartService.respondToRequest(
      requestId,
      'REJECTED',
      user.id,
    );
  }

  @Post('requests/:requestId/cancel')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Cancel a purchase request (buyer only)' })
  async cancelRequest(
    @Param('requestId') requestId: string,
    @CurrentUser() user: { id: string },
  ) {
    return this.campusCartService.cancelRequest(requestId, user.id);
  }

  @Post('requests/:requestId/complete')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Complete transaction and mark listing as SOLD' })
  async completeTransaction(
    @Param('requestId') requestId: string,
    @CurrentUser() user: { id: string },
  ) {
    return this.campusCartService.completeTransaction(requestId, user.id);
  }

  @Patch('requests/:requestId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update request status (buyer or seller)' })
  async updateRequest(
    @Param('requestId') requestId: string,
    @Body() dto: { status: string },
    @CurrentUser() user: { id: string },
  ) {
    const s = dto.status?.toUpperCase();
    if (s === 'ACCEPTED') {
      return this.campusCartService.respondToRequest(requestId, 'ACCEPTED', user.id);
    }
    if (s === 'REJECTED') {
      return this.campusCartService.respondToRequest(requestId, 'REJECTED', user.id);
    }
    if (s === 'CANCELLED') {
      return this.campusCartService.cancelRequest(requestId, user.id);
    }
    if (s === 'COMPLETED') {
      return this.campusCartService.completeTransaction(requestId, user.id);
    }
    throw new BadRequestException(`Invalid status: ${dto.status}`);
  }

  @Get('conversations')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user conversations' })
  async getMyConversations(@CurrentUser() user: { id: string }) {
    return this.campusCartService.getMyConversations(user.id);
  }

  @Get('conversations/:conversationId/messages')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get messages in a conversation' })
  async getMessages(
    @Param('conversationId') conversationId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @CurrentUser() user?: { id: string },
  ) {
    return this.campusCartService.getMessages(
      conversationId,
      user!.id,
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 50,
    );
  }

  @Post('conversations/:conversationId/messages')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Send a message in a conversation' })
  async sendMessage(
    @Param('conversationId') conversationId: string,
    @Body() dto: SendMessageDto,
    @CurrentUser() user: { id: string },
  ) {
    return this.campusCartService.sendMessage(conversationId, user.id, dto);
  }

  @Post('listings/:id/reports')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Report a listing' })
  async reportListing(
    @Param('id') id: string,
    @Body() dto: CreateReportDto,
    @CurrentUser() user: { id: string },
  ) {
    return this.campusCartService.reportListing(id, user.id, dto);
  }

  @Get('reports')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.CAMPUSCART_MODERATOR, Role.APP_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get listing reports (Moderator/Admin only)' })
  async getReports(
    @Query() query: PaginationDto,
    @CurrentUser() user: { role: Role },
  ) {
    return this.campusCartService.getReports(query, user.role);
  }

  @Patch('reports/:reportId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.CAMPUSCART_MODERATOR, Role.APP_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Resolve a report (Moderator/Admin only)' })
  async resolveReport(
    @Param('reportId') reportId: string,
    @Body('status') status: ReportStatus,
    @CurrentUser() user: { id: string },
  ) {
    if (!status || !Object.values(ReportStatus).includes(status)) {
      throw new BadRequestException('Valid status is required');
    }
    return this.campusCartService.resolveReport(reportId, status, user.id);
  }

  @Post('listings/:id/reviews')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Review seller after completed purchase' })
  async reviewSeller(
    @Param('id') id: string,
    @Body() dto: CreateReviewDto,
    @CurrentUser() user: { id: string },
  ) {
    return this.campusCartService.reviewSeller(id, user.id, dto);
  }

  @Post('listings/:id/bookmarks')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Bookmark a listing' })
  async addListingBookmark(
    @Param('id') id: string,
    @CurrentUser() user: { id: string },
  ) {
    return this.campusCartService.addListingBookmark(user.id, id);
  }

  @Delete('listings/:id/bookmarks')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Remove bookmark from a listing' })
  async removeListingBookmark(
    @Param('id') id: string,
    @CurrentUser() user: { id: string },
  ) {
    return this.campusCartService.removeListingBookmark(user.id, id);
  }

  @Get('bookmarks')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user bookmarked listings' })
  async getMyListingBookmarks(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @CurrentUser() user?: { id: string },
  ) {
    return this.campusCartService.getMyListingBookmarks(
      user!.id,
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 20,
    );
  }
}
