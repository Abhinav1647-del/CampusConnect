import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MinLength,
} from 'class-validator';

export class RegisterDto {
  @ApiProperty({ example: 'student@iiitn.ac.in' })
  @IsEmail()
  @Matches(/^[a-zA-Z0-9._%+-]+@iiitn\.ac\.in$/, {
    message: 'Email must be an official IIIT Nagpur college ID ending in @iiitn.ac.in',
  })
  email: string;

  @ApiProperty({ example: 'John Doe' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({ example: 'BT21CSE001' })
  @IsOptional()
  @IsString()
  rollNumber?: string;

  @ApiProperty({ example: 'StrongPassword@123', minLength: 8 })
  @IsString()
  @MinLength(8)
  @Matches(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/,
    {
      message:
        'Password must contain at least one uppercase letter, one lowercase letter, one number and one special character',
    },
  )
  password: string;
}
