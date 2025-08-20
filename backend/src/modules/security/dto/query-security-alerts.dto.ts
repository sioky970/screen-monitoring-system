import { IsOptional, IsString, IsEnum, IsDateString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { AlertStatus } from '../../../entities/security-screenshot.entity';
import { AlertType } from './create-security-alert.dto';
import { PaginationDto } from '../../../common/dto/pagination.dto';

export class QuerySecurityAlertsDto extends PaginationDto {
  @ApiPropertyOptional({ description: '客户端ID' })
  @IsOptional()
  @IsString()
  clientId?: string;

  @ApiPropertyOptional({
    description: '告警类型',
    enum: AlertType,
    enumName: 'AlertType',
  })
  @IsOptional()
  @IsEnum(AlertType)
  alertType?: AlertType;

  @ApiPropertyOptional({
    description: '告警状态',
    enum: AlertStatus,
    enumName: 'AlertStatus',
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
