import { IsEmail, IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({ description: '邮箱地址' })
  @IsEmail({}, { message: '请输入有效的邮箱地址' })
  email: string;

  @ApiProperty({ description: '密码' })
  @IsNotEmpty({ message: '密码不能为空' })
  @IsString()
  password: string;
}