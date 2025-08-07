import { IsString, IsNotEmpty, IsOptional, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateClientGroupDto {
  @ApiProperty({ description: '分组名称' })
  @IsString()
  @IsNotEmpty({ message: '分组名称不能为空' })
  @MaxLength(100, { message: '分组名称不能超过100个字符' })
  name: string;

  @ApiPropertyOptional({ description: '分组描述' })
  @IsOptional()
  @IsString()
  @MaxLength(500, { message: '分组描述不能超过500个字符' })
  description?: string;
}