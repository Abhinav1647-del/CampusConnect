import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class CreateRequestDto {
  @ApiPropertyOptional({ example: 'Is this still available?' })
  @IsOptional()
  @IsString()
  message?: string;
}
