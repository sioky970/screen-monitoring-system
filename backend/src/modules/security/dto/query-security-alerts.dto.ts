import { IsOptional, IsString, IsEnum, IsNumber, Min, Max, IsDateString } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { AlertType, AlertStatus } from '../../../entities/security-screenshot.entity';

export class QuerySecurityAlertsDto {
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

  @ApiPropertyOptional({ description: '客户端ID' })
  @IsOptional()
  @IsString()
  clientId?: string;

  @ApiPropertyOptional({ 
    description: '告警类型', 
    enum: AlertType,
    enumName: 'AlertType'
  })
  @IsOptional()
  @IsEnum(AlertType)
  alertType?: AlertType;

  @ApiPropertyOptional({ 
    description: '告警状态', 
    enum: AlertStatus,
    enumName: 'AlertStatus'
  })
  @IsOptional()
  @IsEnum(AlertStatus)
  status?: AlertStatus;

  @ApiPropertyOptional({ description: '开始日期', example: '2024-01-01T00:00:00.000Z' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ description: '结束日期', example: '2024-12-31T23:59:59.999Z' })
  @IsOptional()
  @IsDateString()
  endDate?: string;
}