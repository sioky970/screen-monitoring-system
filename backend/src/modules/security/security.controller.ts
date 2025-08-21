import { Controller, Post, Body, UseInterceptors, UploadedFile, Logger, Get, Query, Param, Put } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiConsumes, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { SecurityService } from './security.service';
import { ReportViolationDto } from './dto/report-violation.dto';
import { Public } from '../auth/decorators/public.decorator';

@ApiTags('🛡️ 安全监控')
@Controller('security')
export class SecurityController {
  private readonly logger = new Logger(SecurityController.name);

  constructor(private readonly securityService: SecurityService) {}

  @Public()
  @Get('alerts')
  @ApiOperation({ summary: '获取安全告警列表' })
  @ApiQuery({ name: 'clientId', required: false, type: String, description: '客户端ID' })
  @ApiQuery({ name: 'page', required: false, type: Number, description: '页码' })
  @ApiQuery({ name: 'pageSize', required: false, type: Number, description: '每页数量' })
  @ApiQuery({ name: 'status', required: false, type: String, description: '告警状态' })
  @ApiQuery({ name: 'alertType', required: false, type: String, description: '告警类型' })
  @ApiQuery({ name: 'startDate', required: false, type: String, description: '开始日期' })
  @ApiQuery({ name: 'endDate', required: false, type: String, description: '结束日期' })
  @ApiResponse({ status: 200, description: '获取成功' })
  async getAlerts(@Query() query: any) {
    return this.securityService.getAlerts(query);
  }

  @Public()
  @Put('alerts/:id/status')
  @ApiOperation({ summary: '更新告警状态' })
  @ApiResponse({ status: 200, description: '更新成功' })
  async updateAlertStatus(
    @Param('id') id: string,
    @Body() body: { status: string; remark?: string }
  ) {
    return this.securityService.updateAlertStatus(id, body);
  }

  @Public()
  @Post('alerts/ignore-all')
  @ApiOperation({ summary: '忽略指定客户端的所有未处理违规' })
  @ApiResponse({ status: 200, description: '操作成功' })
  async ignoreAllAlerts(@Body() body: { clientId: string }) {
    return this.securityService.ignoreAllAlerts(body.clientId);
  }

  @Public()
  @Post('screenshots/upload-with-heartbeat')
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({
    summary: '上传截图并发送心跳（合并接口）',
    description: '客户端定期上传截图的同时发送心跳信息，用于常规监控。',
  })
  @ApiConsumes('multipart/form-data')
  @ApiResponse({ status: 201, description: '上传成功' })
  async uploadScreenshotWithHeartbeat(
    @Body() data: any,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.securityService.processScreenshotWithHeartbeat(data, file);
  }

  @Public()
  @Post('violations/report-with-screenshot')
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({
    summary: '统一违规上报接口（含截图）',
    description: '一次性上报违规所有信息，并将截图永久保存。',
  })
  @ApiConsumes('multipart/form-data')
  @ApiResponse({ status: 201, description: '上报成功' })
  async reportViolationWithScreenshot(
    @Body() reportDto: ReportViolationDto,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.securityService.processViolationReport(reportDto, file);
  }
}

