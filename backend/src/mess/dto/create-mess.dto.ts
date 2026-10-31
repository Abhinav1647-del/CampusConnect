import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateMessDto {
  @ApiProperty({ example: 'Central Mess' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({ example: 'Ground Floor, Dining Block' })
  @IsOptional()
  @IsString()
  location?: string;
}
