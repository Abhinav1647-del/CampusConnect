import { ApiPropertyOptional } from '@nestjs/swagger';
import { MealPeriod } from '@prisma/client';
import { IsDateString, IsEnum, IsOptional, IsString } from 'class-validator';
import { PaginationDto } from '../../common/dto/pagination.dto.js';

export class QueryMealDto extends PaginationDto {
  @ApiPropertyOptional({ example: '2024-01-15' })
  @IsOptional()
  @IsDateString()
  date?: string;

  @ApiPropertyOptional({ enum: MealPeriod })
  @IsOptional()
  @IsEnum(MealPeriod)
  period?: MealPeriod;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  messId?: string;
}
