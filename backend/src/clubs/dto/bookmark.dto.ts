import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { BookmarkType } from '@prisma/client';

export class CreateBookmarkDto {
  @ApiProperty({ enum: BookmarkType })
  @IsEnum(BookmarkType)
  @IsNotEmpty()
  type: BookmarkType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  targetId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  clubId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  eventId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  listingId?: string;
}

export class QueryBookmarksDto {
  @ApiPropertyOptional({ enum: BookmarkType })
  @IsOptional()
  @IsEnum(BookmarkType)
  type?: BookmarkType;
}
