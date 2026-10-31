import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateMessNoticeDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  messId: string;

  @ApiProperty({ example: 'Special Dinner Tonight' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({ example: 'Biryani will be served for dinner.' })
  @IsString()
  @IsNotEmpty()
  content: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  publishedAt?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  expiresAt?: string;
}
