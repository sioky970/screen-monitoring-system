import { IsString, IsNotEmpty, IsEnum, IsOptional, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum AlertType {
  BLOCKCHAIN_ADDRESS = 'blockchain_address',
  SUSPICIOUS_ACTIVITY = 'suspicious_activity',
  MALWARE_DETECTED = 'malware_detected',
  UNAUTHORIZED_ACCESS = 'unauthorized_access',
}

export class CreateSecurityAlertDto {
  @ApiProperty({ description: '客户端ID' })
  @IsString()
  @IsNotEmpty({ message: '客户端ID不能为空' })
  clientId: string;

  @ApiProperty({
    description: '告警类型',
    enum: AlertType,
    enumName: 'AlertType',
  })
  @IsEnum(AlertType)
  alertType: AlertType;

  @ApiPropertyOptional({ description: '区块链地址' })
  @IsOptional()
  @IsString()
  @MaxLength(100, { message: '区块链地址不能超过100个字符' })
  blockchainAddress?: string;

  @ApiPropertyOptional({ description: '截图文件路径' })
  @IsOptional()
  @IsString()
  @MaxLength(500, { message: '截图路径不能超过500个字符' })
  screenshotPath?: string;

  @ApiPropertyOptional({ description: '剪贴板内容' })
  @IsOptional()
  @IsString()
  clipboardContent?: string;

  @ApiPropertyOptional({ description: '备注' })
  @IsOptional()
  @IsString()
  @MaxLength(1000, { message: '备注不能超过1000个字符' })
  remark?: string;
}
