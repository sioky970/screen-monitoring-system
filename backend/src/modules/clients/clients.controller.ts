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
  ParseIntPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { ClientsService } from './clients.service';
import { CreateClientDto } from './dto/create-client.dto';
import { UpdateClientDto } from './dto/update-client.dto';
import { QueryClientsDto } from './dto/query-clients.dto';
import { CreateClientGroupDto } from './dto/create-client-group.dto';
import { UpdateClientGroupDto } from './dto/update-client-group.dto';
import { BulkDeleteDto } from './dto/bulk-delete.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../../entities/user.entity';

@ApiTags('💻 客户端管理')
@Controller('clients')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ClientsController {
  constructor(private readonly clientsService: ClientsService) {}

  // ========== 客户端管理 ==========

  @Get()
  @ApiOperation({ summary: '获取客户端列表' })
  @ApiResponse({ status: 200, description: '获取成功' })
  findAll(@Query() query: QueryClientsDto) {
    return this.clientsService.findAll(query);
  }

  @Get('stats')
  @ApiOperation({ summary: '获取客户端统计信息' })
  @ApiResponse({ status: 200, description: '获取成功' })
  getStats() {
    return this.clientsService.getClientStats();
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.OPERATOR)
  @ApiOperation({ summary: '创建客户端' })
  @ApiResponse({ status: 201, description: '创建成功' })
  @ApiResponse({ status: 400, description: '客户端编号已存在' })
  create(@Body() createClientDto: CreateClientDto) {
    return this.clientsService.create(createClientDto);
  }

  @Post('bulk-delete')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: '批量删除客户端' })
  @ApiResponse({ status: 200, description: '删除成功' })
  bulkDelete(@Body() bulkDeleteDto: BulkDeleteDto) {
    return this.clientsService.bulkDelete(bulkDeleteDto.ids);
  }

  @Get(':id')
  @ApiOperation({ summary: '获取客户端详情' })
  @ApiResponse({ status: 200, description: '获取成功' })
  @ApiResponse({ status: 404, description: '客户端不存在' })
  findOne(@Param('id') id: string) {
    return this.clientsService.findById(id);
  }

  @Put(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.OPERATOR)
  @ApiOperation({ summary: '更新客户端信息' })
  @ApiResponse({ status: 200, description: '更新成功' })
  @ApiResponse({ status: 404, description: '客户端不存在' })
  update(@Param('id') id: string, @Body() updateClientDto: UpdateClientDto) {
    return this.clientsService.update(id, updateClientDto);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: '删除客户端' })
  @ApiResponse({ status: 200, description: '删除成功' })
  @ApiResponse({ status: 404, description: '客户端不存在' })
  remove(@Param('id') id: string) {
    return this.clientsService.remove(id);
  }

  @Get(':id/online-logs')
  @ApiOperation({ summary: '获取客户端上下线日志' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'pageSize', required: false, type: Number })
  getOnlineLogs(
    @Param('id') id: string,
    @Query('page', ParseIntPipe) page = 1,
    @Query('pageSize', ParseIntPipe) pageSize = 50,
  ) {
    return this.clientsService.getOnlineLogs(id, page, pageSize);
  }

  // ========== 客户端分组管理 ==========

  @Get('groups/list')
  @ApiOperation({ summary: '获取客户端分组列表' })
  @ApiResponse({ status: 200, description: '获取成功' })
  findGroups() {
    return this.clientsService.findGroups();
  }

  @Post('groups')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.OPERATOR)
  @ApiOperation({ summary: '创建客户端分组' })
  @ApiResponse({ status: 201, description: '创建成功' })
  @ApiResponse({ status: 400, description: '分组名称已存在' })
  createGroup(@Body() createGroupDto: CreateClientGroupDto) {
    return this.clientsService.createGroup(createGroupDto);
  }

  @Get('groups/:id')
  @ApiOperation({ summary: '获取客户端分组详情' })
  @ApiResponse({ status: 200, description: '获取成功' })
  @ApiResponse({ status: 404, description: '分组不存在' })
  findGroup(@Param('id', ParseIntPipe) id: number) {
    return this.clientsService.findGroupById(id);
  }

  @Put('groups/:id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.OPERATOR)
  @ApiOperation({ summary: '更新客户端分组' })
  @ApiResponse({ status: 200, description: '更新成功' })
  @ApiResponse({ status: 404, description: '分组不存在' })
  updateGroup(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateGroupDto: UpdateClientGroupDto,
  ) {
    return this.clientsService.updateGroup(id, updateGroupDto);
  }

  @Delete('groups/:id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: '删除客户端分组' })
  @ApiResponse({ status: 200, description: '删除成功' })
  @ApiResponse({ status: 400, description: '该分组下还有客户端，无法删除' })
  removeGroup(@Param('id', ParseIntPipe) id: number) {
    return this.clientsService.removeGroup(id);
  }
}