import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { MealPeriod } from '@prisma/client';
import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';

export class CreateMealDto {
  @ApiProperty({ example: 'clx...' })
  @IsString()
  @IsNotEmpty()
  messId: string;

  @ApiProperty({ example: '2024-01-15' })
  @IsDateString()
  date: string;

  @ApiProperty({ enum: MealPeriod })
  @IsEnum(MealPeriod)
  period: MealPeriod;

  @ApiPropertyOptional({ type: [String], description: 'Array of MenuItem IDs' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  menuItemIds?: string[];

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  isPublished?: boolean;
}
