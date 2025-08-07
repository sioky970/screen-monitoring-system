import { IsNotEmpty, IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ChangePasswordDto {
  @ApiProperty({ description: '当前密码' })
  @IsNotEmpty({ message: '当前密码不能为空' })
  @IsString()
  currentPassword: string;

  @ApiProperty({ description: '新密码' })
  @IsNotEmpty({ message: '新密码不能为空' })
  @IsString()
  @MinLength(8, { message: '新密码至少需要8个字符' })
  newPassword: string;
}