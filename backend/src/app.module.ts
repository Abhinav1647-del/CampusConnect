import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { DatabaseModule } from './database/database.module.js';
import { AuthModule } from './auth/auth.module.js';
import { UsersModule } from './users/users.module.js';
import { MessModule } from './mess/mess.module.js';
import { ClubsModule } from './clubs/clubs.module.js';
import { EventsModule } from './events/events.module.js';
import { CampusCartModule } from './campuscart/campuscart.module.js';
import { NotificationsModule } from './notifications/notifications.module.js';
import { AdminModule } from './admin/admin.module.js';
import { UploadModule } from './upload/upload.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    ThrottlerModule.forRoot([
      {
        ttl: 60000,
        limit: 100,
      },
    ]),
    DatabaseModule,
    AuthModule,
    UsersModule,
    MessModule,
    ClubsModule,
    EventsModule,
    CampusCartModule,
    NotificationsModule,
    AdminModule,
    UploadModule,
  ],
})
export class AppModule {}
