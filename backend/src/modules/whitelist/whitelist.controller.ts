import { Controller, Get, Param } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { WhitelistService } from './whitelist.service';

@ApiTags('白名单管理')
@Controller('whitelist')
export class WhitelistController {
  constructor(private readonly whitelistService: WhitelistService) {}

  @Get()
  @ApiOperation({ summary: '获取白名单列表' })
  findAll() {
    return this.whitelistService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: '获取白名单详情' })
  findOne(@Param('id') id: number) {
    return this.whitelistService.findById(id);
  }
}