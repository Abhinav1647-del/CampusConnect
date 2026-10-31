import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class CreateFoodRatingDto {
  @ApiPropertyOptional({ example: 'clx...' })
  @IsOptional()
  @IsString()
  mealId?: string;

  @ApiPropertyOptional({ example: 'dish-1' })
  @IsOptional()
  @IsString()
  dishId?: string;

  @ApiPropertyOptional({ example: '2026-10-30' })
  @IsOptional()
  @IsString()
  date?: string;

  @ApiPropertyOptional({ example: 'breakfast' })
  @IsOptional()
  @IsString()
  period?: string;

  @ApiPropertyOptional({ minimum: 1, maximum: 5 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  rating?: number;

  @ApiPropertyOptional({ minimum: 1, maximum: 5 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  stars?: number;

  @ApiPropertyOptional({ example: 'The dal was great today!' })
  @IsOptional()
  @IsString()
  feedback?: string;

  @ApiPropertyOptional({ example: 'The dal was great today!' })
  @IsOptional()
  @IsString()
  comment?: string;
}
