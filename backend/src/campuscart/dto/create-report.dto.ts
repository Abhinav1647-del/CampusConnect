import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateReportDto {
  @ApiProperty({ example: 'Spam or Misleading' })
  @IsString()
  @IsNotEmpty()
  reason: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  details?: string;
}
