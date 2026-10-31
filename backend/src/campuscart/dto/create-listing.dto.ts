import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ListingCondition } from '@prisma/client';
import {
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateListingDto {
  @ApiProperty({ example: 'Calculus Textbook' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ example: 250.00 })
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  @Type(() => Number)
  price: number;

  @ApiProperty({ example: 'Books' })
  @IsString()
  @IsNotEmpty()
  category: string;

  @ApiProperty({ enum: ListingCondition })
  @IsEnum(ListingCondition)
  condition: ListingCondition;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsString({ each: true })
  images?: string[];
}
