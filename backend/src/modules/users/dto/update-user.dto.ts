import { ApiProperty, PartialType, OmitType } from '@nestjs/swagger';
import { IsOptional, IsString, MinLength } from 'class-validator';
import { CreateUserDto } from './create-user.dto';

export class UpdateUserDto extends PartialType(OmitType(CreateUserDto, ['password'] as const)) {
  @ApiProperty({ 
    description: '新密码（可选）', 
    example: 'newpassword123',
    required: false,
    minLength: 8
  })
  @IsOptional()
  @IsString()
  @MinLength(8)
  newPassword?: string;
}