import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  ParseIntPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { WhitelistService } from './whitelist.service';
import { Public } from '../auth/decorators/public.decorator';

import { CreateWhitelistDto, UpdateWhitelistDto, QueryWhitelistDto } from './dto';

@ApiTags('白名单管理')
@Controller('whitelist')
export class WhitelistController {
  constructor(private readonly whitelistService: WhitelistService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: '获取白名单列表' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'pageSize', required: false, type: Number })
  @ApiQuery({ name: 'addressType', required: false, type: String })
  @ApiQuery({ name: 'category', required: false, type: String })
  @ApiQuery({ name: 'search', required: false, type: String })
  findAll(@Query() query: QueryWhitelistDto) {
    return this.whitelistService.findAll(query);
  }

  @Public()
  @Get('stats')
  @ApiOperation({ summary: '获取白名单统计信息' })
  getStats() {
    return this.whitelistService.getStats();
  }

  @Public()
  @Post()
  @ApiOperation({ summary: '添加白名单地址' })
  create(@Body() createWhitelistDto: CreateWhitelistDto) {
    return this.whitelistService.create(createWhitelistDto, null);
  }

  @Public()
  @Get(':id')
  @ApiOperation({ summary: '获取白名单详情' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.whitelistService.findById(id);
  }

  @Public()
  @Put(':id')
  @ApiOperation({ summary: '更新白名单信息' })
  update(@Param('id', ParseIntPipe) id: number, @Body() updateWhitelistDto: UpdateWhitelistDto) {
    return this.whitelistService.update(id, updateWhitelistDto, null);
  }

  @Public()
  @Put(':id/status')
  @ApiOperation({ summary: '更新白名单状态' })
  updateStatus(@Param('id', ParseIntPipe) id: number, @Body() body: { isActive: boolean }) {
    return this.whitelistService.updateStatus(id, body.isActive, null);
  }

  @Public()
  @Delete(':id')
  @ApiOperation({ summary: '删除白名单地址' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.whitelistService.remove(id, null);
  }

  @Public()
  @Post('batch-delete')
  @ApiOperation({ summary: '批量删除白名单' })
  batchDelete(@Body() body: { ids: number[] }) {
    return this.whitelistService.batchDelete(body.ids, null);
  }

  @Public()
  @Post('import')
  @ApiOperation({ summary: '批量导入白名单' })
  import(@Body() body: { addresses: string[] }) {
    return this.whitelistService.batchImport(body.addresses, null);
  }

  @Public()
  @Get('addresses/active')
  @ApiOperation({
    summary: '获取所有激活的白名单地址（供客户端检测使用）',
    description: '返回所有状态为激活的区块链地址列表，客户端用于本地违规检测',
  })
  getActiveAddresses() {
    return this.whitelistService.getActiveAddresses();
  }
}
