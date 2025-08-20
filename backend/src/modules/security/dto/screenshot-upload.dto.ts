import { IsString, IsNotEmpty, IsOptional, IsBoolean } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';

export class ScreenshotUploadDto {
  @ApiProperty({ description: '客户端ID' })
  @IsString()
  @IsNotEmpty({ message: '客户端ID不能为空' })
  clientId: string;

  @ApiPropertyOptional({ description: '剪贴板内容' })
  @IsOptional()
  @IsString()
  clipboardContent?: string;

  @ApiPropertyOptional({ description: '检测到的区块链地址（逗号分隔）' })
  @IsOptional()
  @IsString()
  detectedAddresses?: string;

  @ApiPropertyOptional({ description: '是否检测到违规地址' })
  @IsOptional()
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      return value.toLowerCase() === 'true';
    }
    return Boolean(value);
  })
  @IsBoolean()
  hasViolations?: boolean;
}
