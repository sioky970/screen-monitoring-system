import { IsArray, IsString, ArrayMinSize } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class BulkDeleteDto {
  @ApiProperty({ description: '客户端ID数组', type: [String] })
  @IsArray()
  @ArrayMinSize(1, { message: '至少选择一个客户端' })
  @IsString({ each: true, message: '客户端ID必须为字符串' })
  ids: string[];
}