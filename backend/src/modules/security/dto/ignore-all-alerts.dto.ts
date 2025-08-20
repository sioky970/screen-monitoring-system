import { IsString, IsNotEmpty, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class IgnoreAllAlertsDto {
  @ApiProperty({
    description: '客户端ID',
    example: '21aa1a7f-6fa3-4e90-bb35-7070810c3b3a',
    format: 'uuid',
  })
  @IsString({ message: '客户端ID必须是字符串' })
  @IsNotEmpty({ message: '客户端ID不能为空' })
  @IsUUID(4, { message: '客户端ID必须是有效的UUID格式' })
  clientId: string;
}

export interface IgnoreAllAlertsResponse {
  success: boolean;
  affected: number;
  message: string;
  clientId: string;
  timestamp: Date;
}
