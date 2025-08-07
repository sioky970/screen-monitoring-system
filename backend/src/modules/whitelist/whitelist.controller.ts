import { 
  Controller, 
  Get, 
  Post, 
  Put, 
  Delete, 
  Body, 
  Param, 
  Query,
  UseGuards,
  ParseIntPipe
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery, ApiBearerAuth } from '@nestjs/swagger';
import { WhitelistService } from './whitelist.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { CreateWhitelistDto, UpdateWhitelistDto, QueryWhitelistDto } from './dto';
import { UserRole } from '../../entities/user.entity';

@ApiTags('白名单管理')
@Controller('whitelist')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class WhitelistController {
  constructor(private readonly whitelistService: WhitelistService) {}

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

  @Get('stats')
  @ApiOperation({ summary: '获取白名单统计信息' })
  @Roles(UserRole.ADMIN, UserRole.OPERATOR)
  @UseGuards(RolesGuard)
  getStats() {
    return this.whitelistService.getStats();
  }

  @Post()
  @ApiOperation({ summary: '添加白名单地址' })
  @Roles(UserRole.ADMIN, UserRole.OPERATOR)
  @UseGuards(RolesGuard)
  create(@Body() createWhitelistDto: CreateWhitelistDto, @CurrentUser() currentUser: any) {
    return this.whitelistService.create(createWhitelistDto, currentUser.userId);
  }

  @Get(':id')
  @ApiOperation({ summary: '获取白名单详情' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.whitelistService.findById(id);
  }

  @Put(':id')
  @ApiOperation({ summary: '更新白名单信息' })
  @Roles(UserRole.ADMIN, UserRole.OPERATOR)
  @UseGuards(RolesGuard)
  update(
    @Param('id', ParseIntPipe) id: number, 
    @Body() updateWhitelistDto: UpdateWhitelistDto,
    @CurrentUser() currentUser: any
  ) {
    return this.whitelistService.update(id, updateWhitelistDto, currentUser.userId);
  }

  @Put(':id/status')
  @ApiOperation({ summary: '更新白名单状态' })
  @Roles(UserRole.ADMIN, UserRole.OPERATOR)
  @UseGuards(RolesGuard)
  updateStatus(
    @Param('id', ParseIntPipe) id: number, 
    @Body() body: { isActive: boolean },
    @CurrentUser() currentUser: any
  ) {
    return this.whitelistService.updateStatus(id, body.isActive, currentUser.userId);
  }

  @Delete(':id')
  @ApiOperation({ summary: '删除白名单地址' })
  @Roles(UserRole.ADMIN)
  @UseGuards(RolesGuard)
  remove(@Param('id', ParseIntPipe) id: number, @CurrentUser() currentUser: any) {
    return this.whitelistService.remove(id, currentUser.userId);
  }

  @Post('batch-delete')
  @ApiOperation({ summary: '批量删除白名单' })
  @Roles(UserRole.ADMIN)
  @UseGuards(RolesGuard)
  batchDelete(@Body() body: { ids: number[] }, @CurrentUser() currentUser: any) {
    return this.whitelistService.batchDelete(body.ids, currentUser.userId);
  }

  @Post('import')
  @ApiOperation({ summary: '批量导入白名单' })
  @Roles(UserRole.ADMIN)
  @UseGuards(RolesGuard)
  import(@Body() body: { addresses: CreateWhitelistDto[] }, @CurrentUser() currentUser: any) {
    return this.whitelistService.batchImport(body.addresses, currentUser.userId);
  }
}