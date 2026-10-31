import { Module } from '@nestjs/common';
import { MessController } from './mess.controller.js';
import { MessService } from './mess.service.js';
import { PrismaService } from '../database/prisma.service.js';

@Module({
  controllers: [MessController],
  providers: [MessService, PrismaService],
  exports: [MessService],
})
export class MessModule {}
