import { PartialType, ApiProperty } from '@nestjs/swagger';
import { CreateClientConfigDto } from './create-client-config.dto';
import { IsOptional } from 'class-validator';

export class UpdateClientConfigDto extends PartialType(CreateClientConfigDto) {
  @ApiProperty({ description: '配置ID', example: 1, required: false })
  @IsOptional()
  id?: number;
}
