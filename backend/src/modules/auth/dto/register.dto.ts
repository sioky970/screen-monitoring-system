import { IsEmail, IsNotEmpty, IsString, MinLength, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RegisterDto {
  @ApiProperty({ description: '邮箱地址' })
  @IsEmail({}, { message: '请输入有效的邮箱地址' })
  email: string;

  @ApiProperty({ description: '用户名' })
  @IsNotEmpty({ message: '用户名不能为空' })
  @IsString()
  @MinLength(3, { message: '用户名至少需要3个字符' })
  @MaxLength(50, { message: '用户名不能超过50个字符' })
  username: string;

  @ApiProperty({ description: '密码' })
  @IsNotEmpty({ message: '密码不能为空' })
  @IsString()
  @MinLength(8, { message: '密码至少需要8个字符' })
  password: string;
}