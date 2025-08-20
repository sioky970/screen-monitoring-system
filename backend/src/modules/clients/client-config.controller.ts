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
  HttpStatus,
  HttpCode,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { ClientConfigService } from './client-config.service';
import { CreateClientConfigDto } from './dto/create-client-config.dto';
import { UpdateClientConfigDto } from './dto/update-client-config.dto';
import { QueryClientConfigDto } from './dto/query-client-config.dto';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { UserRole } from '../../common/enums/user-role.enum';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('客户端配置管理')
@Controller('client-config')
export class ClientConfigController {
  constructor(private readonly clientConfigService: ClientConfigService) {}

  @Public()
  @Post()
  @ApiOperation({ summary: '创建客户端配置' })
  @ApiResponse({ status: 201, description: '配置创建成功' })
  @ApiResponse({ status: 400, description: '请求参数错误' })
  @ApiResponse({ status: 404, description: '客户端不存在' })
  async create(@Body() createDto: CreateClientConfigDto) {
    const config = await this.clientConfigService.create(createDto);
    return {
      code: 200,
      message: '配置创建成功',
      data: config,
    };
  }

  @Public()
  @Get()
  @ApiOperation({ summary: '查询客户端配置列表' })
  @ApiResponse({ status: 200, description: '查询成功' })
  async findAll(@Query() queryDto: QueryClientConfigDto) {
    const result = await this.clientConfigService.findAll(queryDto);
    return {
      code: 200,
      message: '查询成功',
      data: result.data,
      total: result.total,
      page: result.page,
      limit: result.limit,
      totalPages: result.totalPages,
    };
  }

  @Public()
  @Get('client/:clientId')
  @ApiOperation({ summary: '获取指定客户端的配置' })
  @ApiResponse({ status: 200, description: '查询成功' })
  @ApiResponse({ status: 404, description: '客户端不存在' })
  async findByClientId(@Param('clientId') clientId: string) {
    const config = await this.clientConfigService.findByClientId(clientId);
    return {
      code: 200,
      message: '查询成功',
      data: config,
    };
  }

  @Public()
  @Get('client/:clientId/effective')
  @ApiOperation({ summary: '获取客户端有效配置（供客户端调用）' })
  @ApiResponse({ status: 200, description: '查询成功' })
  @ApiResponse({ status: 404, description: '客户端不存在' })
  async getEffectiveConfig(@Param('clientId') clientId: string) {
    const config = await this.clientConfigService.getClientEffectiveConfig(clientId);
    return {
      code: 200,
      message: '查询成功',
      data: config,
    };
  }

  @Public()
  @Put(':id')
  @ApiOperation({ summary: '更新客户端配置' })
  @ApiResponse({ status: 200, description: '更新成功' })
  @ApiResponse({ status: 400, description: '请求参数错误' })
  @ApiResponse({ status: 404, description: '配置不存在' })
  async update(@Param('id') id: string, @Body() updateDto: UpdateClientConfigDto) {
    const updatedConfig = await this.clientConfigService.update(parseInt(id), updateDto);
    return {
      code: 200,
      message: '更新成功',
      data: updatedConfig,
    };
  }

  @Public()
  @Put('batch')
  @ApiOperation({ summary: '批量更新客户端配置' })
  @ApiResponse({ status: 200, description: '批量更新成功' })
  @ApiResponse({ status: 400, description: '请求参数错误' })
  @HttpCode(HttpStatus.OK)
  async batchUpdate(@Body() body: { clientIds: string[]; config: Partial<UpdateClientConfigDto> }) {
    await this.clientConfigService.batchUpdate(body.clientIds, body.config);
    return {
      code: 200,
      message: '批量更新成功',
    };
  }

  @Public()
  @Delete(':id')
  @ApiOperation({ summary: '删除客户端配置' })
  @ApiResponse({ status: 200, description: '删除成功' })
  @ApiResponse({ status: 404, description: '配置不存在' })
  @HttpCode(HttpStatus.OK)
  async remove(@Param('id') id: string) {
    await this.clientConfigService.remove(parseInt(id));
    return {
      code: 200,
      message: '删除成功',
    };
  }

  @Public()
  @Get('default')
  @ApiOperation({ summary: '获取默认配置' })
  @ApiResponse({ status: 200, description: '查询成功' })
  async getDefaultConfig() {
    const defaultConfig = this.clientConfigService.getDefaultConfig();
    return {
      code: 200,
      message: '查询成功',
      data: defaultConfig,
    };
  }

  @Public()
  @Post('client/:clientId/reset')
  @ApiOperation({ summary: '重置客户端配置为默认值' })
  @ApiResponse({ status: 200, description: '重置成功' })
  @ApiResponse({ status: 404, description: '客户端不存在' })
  @HttpCode(HttpStatus.OK)
  async resetToDefault(@Param('clientId') clientId: string) {
    const defaultConfig = this.clientConfigService.getDefaultConfig();
    const config = await this.clientConfigService.findByClientId(clientId);

    const updateDto: UpdateClientConfigDto = {
      ...defaultConfig,
      remark: '重置为默认配置',
    };

    const updatedConfig = await this.clientConfigService.update(config.id, updateDto);
    return {
      code: 200,
      message: '重置成功',
      data: updatedConfig,
    };
  }
}
