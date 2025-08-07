import { IsOptional, IsString, IsEnum, IsNumber, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { ClientStatus } from '../../../entities/client.entity';

export class QueryClientsDto {
  @ApiPropertyOptional({ description: '页码', default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ description: '每页数量', default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  pageSize?: number = 20;

  @ApiPropertyOptional({ description: '搜索关键字（客户端编号、计算机名、IP）' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ 
    description: '客户端状态', 
    enum: ClientStatus,
    enumName: 'ClientStatus'
  })
  @IsOptional()
  @IsEnum(ClientStatus)
  status?: ClientStatus;

  @ApiPropertyOptional({ description: '分组ID' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  groupId?: number;
}