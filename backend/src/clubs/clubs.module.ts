import { Module } from '@nestjs/common';
import { ClubsController } from './clubs.controller.js';
import { ClubsService } from './clubs.service.js';
import { PrismaService } from '../database/prisma.service.js';

@Module({
  controllers: [ClubsController],
  providers: [ClubsService, PrismaService],
  exports: [ClubsService],
})
export class ClubsModule {}
