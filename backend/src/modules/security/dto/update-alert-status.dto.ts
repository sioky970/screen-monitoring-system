import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AlertStatus } from '../../../entities/security-screenshot.entity';

export class UpdateAlertStatusDto {
  @ApiProperty({
    description: '告警状态',
    enum: AlertStatus,
    enumName: 'AlertStatus',
  })
  @IsEnum(AlertStatus)
  status: AlertStatus;

  @ApiPropertyOptional({ description: '处理备注' })
  @IsOptional()
  @IsString()
  @MaxLength(1000, { message: '处理备注不能超过1000个字符' })
  remark?: string;
}
