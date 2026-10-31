import { Module } from '@nestjs/common';
import { CampusCartController } from './campuscart.controller.js';
import { CampusCartService } from './campuscart.service.js';
import { UploadModule } from '../upload/upload.module.js';

@Module({
  imports: [UploadModule],
  controllers: [CampusCartController],
  providers: [CampusCartService],
  exports: [CampusCartService],
})
export class CampusCartModule {}
