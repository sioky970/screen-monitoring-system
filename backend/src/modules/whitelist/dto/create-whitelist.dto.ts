import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, MaxLength, MinLength, IsDateString } from 'class-validator';

export class CreateWhitelistDto {
  @ApiProperty({ 
    description: '区块链地址', 
    example: '1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa'
  })
  @IsString()
  @MinLength(1)
  address: string;

  @ApiProperty({ 
    description: '地址类型', 
    example: 'BTC',
    enum: ['BTC', 'ETH', 'TRC20', 'ERC20', 'BSC', 'MATIC', 'USDT', 'USDC', 'OTHER']
  })
  @IsString()
  @MaxLength(20)
  addressType: string;

  @ApiProperty({ 
    description: '地址标签/备注', 
    example: '公司钱包地址',
    required: false,
    maxLength: 255
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  label?: string;

  @ApiProperty({ 
    description: '地址分类', 
    example: '公司钱包',
    required: false,
    enum: ['公司钱包', '交易所', '合作伙伴', '测试地址', '其他']
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  category?: string;

  @ApiProperty({ 
    description: '过期时间', 
    example: '2025-12-31T23:59:59.000Z',
    required: false
  })
  @IsOptional()
  @IsDateString()
  expiresAt?: string;
}