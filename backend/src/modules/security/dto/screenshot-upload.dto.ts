import { IsString, IsNotEmpty, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ScreenshotUploadDto {
  @ApiProperty({ description: '客户端ID' })
  @IsString()
  @IsNotEmpty({ message: '客户端ID不能为空' })
  clientId: string;

  @ApiPropertyOptional({ description: '剪贴板内容' })
  @IsOptional()
  @IsString()
  clipboardContent?: string;
}