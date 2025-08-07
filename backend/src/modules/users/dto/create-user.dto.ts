import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, IsEnum, IsOptional, MinLength, MaxLength } from 'class-validator';
import { UserRole } from '../../../entities/user.entity';

export class CreateUserDto {
  @ApiProperty({ 
    description: '用户名', 
    example: 'admin123',
    minLength: 3,
    maxLength: 50
  })
  @IsString()
  @MinLength(3)
  @MaxLength(50)
  username: string;

  @ApiProperty({ 
    description: '密码',
    example: 'password123',
    minLength: 8
  })
  @IsString()
  @MinLength(8)
  password: string;

  @ApiProperty({ 
    description: '邮箱地址', 
    example: 'admin@example.com'
  })
  @IsEmail()
  email: string;

  @ApiProperty({ 
    description: '真实姓名', 
    example: '张三',
    required: false,
    maxLength: 100
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  realName?: string;

  @ApiProperty({ 
    description: '手机号', 
    example: '13800138000',
    required: false,
    maxLength: 20
  })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  phone?: string;

  @ApiProperty({ 
    description: '用户角色', 
    enum: UserRole,
    example: UserRole.OPERATOR,
    default: UserRole.VIEWER
  })
  @IsEnum(UserRole)
  role: UserRole;

  @ApiProperty({ 
    description: '权限配置', 
    example: { "users": ["read", "write"], "clients": ["read"] },
    required: false
  })
  @IsOptional()
  permissions?: Record<string, string[]>;
}