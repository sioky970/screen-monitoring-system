import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MinLength } from 'class-validator';

export class AdminLoginDto {
  @ApiProperty({
    description: '管理员邮箱',
    example: 'admin@example.com'
  })
  @IsEmail({}, { message: '邮箱格式不正确' })
  email: string;

  @ApiProperty({
    description: '密码',
    example: 'admin123'
  })
  @IsString({ message: '密码必须是字符串' })
  @MinLength(6, { message: '密码至少6位' })
  password: string;
}

export class AdminLoginResponseDto {
  @ApiProperty({ description: 'JWT访问令牌' })
  access_token: string;

  @ApiProperty({ description: 'JWT刷新令牌' })
  refresh_token: string;

  @ApiProperty({
    description: '管理员用户信息',
    example: {
      id: 1,
      username: 'admin',
      email: 'admin@example.com',
      role: 'admin',
      realName: '系统管理员'
    }
  })
  user: {
    id: number;
    username: string;
    email: string;
    role: string;
    realName?: string;
  };
}

export class ChangePasswordDto {
  @ApiProperty({ description: '当前密码' })
  @IsString({ message: '当前密码必须是字符串' })
  currentPassword: string;

  @ApiProperty({ description: '新密码' })
  @IsString({ message: '新密码必须是字符串' })
  @MinLength(6, { message: '新密码至少6位' })
  newPassword: string;
}