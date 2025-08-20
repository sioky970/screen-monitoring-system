import { IsOptional, IsString, IsEnum, IsNumber } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { ClientStatus } from '../../../entities/client.entity';
import { PaginationDto } from '../../../common/dto/pagination.dto';

export class QueryClientsDto extends PaginationDto {
  @ApiPropertyOptional({ description: '搜索关键字（客户端编号、计算机名、IP）' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    description: '客户端状态',
    enum: ClientStatus,
    enumName: 'ClientStatus',
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
