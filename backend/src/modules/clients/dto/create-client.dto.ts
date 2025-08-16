import { IsString, IsNotEmpty, IsOptional, IsNumber, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateClientDto {
  @ApiProperty({ description: '客户端编号' })
  @IsString()
  @IsNotEmpty({ message: '客户端编号不能为空' })
  @MaxLength(50, { message: '客户端编号不能超过50个字符' })
  clientNumber: string;

  @ApiProperty({ description: '客户端名称' })
  @IsString()
  @IsNotEmpty({ message: '客户端名称不能为空' })
  @MaxLength(255, { message: '客户端名称不能超过255个字符' })
  clientName: string;

  @ApiProperty({ description: '计算机名称' })
  @IsString()
  @IsNotEmpty({ message: '计算机名称不能为空' })
  @MaxLength(100, { message: '计算机名称不能超过100个字符' })
  computerName: string;

  @ApiPropertyOptional({ description: '操作系统' })
  @IsOptional()
  @IsString()
  @MaxLength(50, { message: '操作系统不能超过50个字符' })
  os?: string;

  @ApiPropertyOptional({ description: '客户端版本' })
  @IsOptional()
  @IsString()
  @MaxLength(20, { message: '客户端版本不能超过20个字符' })
  version?: string;

  // 分组ID由后端自动分配，不允许客户端指定

  @ApiPropertyOptional({ description: '备注' })
  @IsOptional()
  @IsString()
  @MaxLength(500, { message: '备注不能超过500个字符' })
  remark?: string;
}