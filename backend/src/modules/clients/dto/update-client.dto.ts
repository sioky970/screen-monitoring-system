import { PartialType, ApiPropertyOptional } from '@nestjs/swagger';
import { CreateClientDto } from './create-client.dto';
import { IsOptional, IsNumber, IsString, MaxLength } from 'class-validator';

export class UpdateClientDto extends PartialType(CreateClientDto) {
  @ApiPropertyOptional({ description: '分组ID' })
  @IsOptional()
  @IsNumber({}, { message: '分组ID必须是数字' })
  groupId?: number;

  @ApiPropertyOptional({ description: '计算机名称' })
  @IsOptional()
  @IsString()
  @MaxLength(100, { message: '计算机名称不能超过100个字符' })
  computerName?: string;
}
