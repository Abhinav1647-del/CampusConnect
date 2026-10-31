import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MinLength } from 'class-validator';

export class LoginDto {
  @ApiProperty({ example: 'student@iiitn.ac.in' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'StrongPassword@123' })
  @IsString()
  @MinLength(6)
  password: string;
}
