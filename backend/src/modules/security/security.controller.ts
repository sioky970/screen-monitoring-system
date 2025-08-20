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
  UseInterceptors,
  UploadedFile,
  ParseIntPipe,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../../common/enums/user-role.enum';
import { Public } from '../auth/decorators/public.decorator';
import { Throttle } from '@nestjs/throttler';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger';
import { SecurityService } from './security.service';
import { ClientsService } from '../clients/clients.service';
import { CreateSecurityAlertDto, AlertType } from './dto/create-security-alert.dto';
import { UpdateAlertStatusDto } from './dto/update-alert-status.dto';
import { QuerySecurityAlertsDto } from './dto/query-security-alerts.dto';
import { ScreenshotUploadDto } from './dto/screenshot-upload.dto';
import { ScreenshotUploadWithHeartbeatDto } from './dto/screenshot-upload-with-heartbeat.dto';
import { IgnoreAllAlertsDto } from './dto/ignore-all-alerts.dto';

@ApiTags('🛡️ 安全监控')
@Controller('security')
export class SecurityController {
  private readonly logger = new Logger(SecurityController.name);

  constructor(
    private readonly securityService: SecurityService,
    private readonly clientsService: ClientsService,
  ) {}

  // ========== 安全告警管理 ==========

  @Public()
  @Get('alerts')
  @ApiOperation({ summary: '获取安全告警列表' })
  @ApiResponse({ status: 200, description: '获取成功' })
  findAlerts(@Query() query: QuerySecurityAlertsDto) {
    return this.securityService.findAllAlerts(query);
  }

  @Public()
  @Get('stats')
  @ApiOperation({ summary: '获取安全统计信息' })
  @ApiResponse({ status: 200, description: '获取成功' })
  getStats() {
    return this.securityService.getSecurityStats();
  }

  @Public()
  @Post('alerts')
  @ApiOperation({ summary: '创建安全告警' })
  @ApiResponse({ status: 201, description: '创建成功' })
  @ApiResponse({ status: 404, description: '客户端不存在' })
  createAlert(@Body() createAlertDto: CreateSecurityAlertDto) {
    return this.securityService.createSecurityAlert(createAlertDto);
  }

  @Public()
  @Get('alerts/:id')
  @ApiOperation({ summary: '获取安全告警详情' })
  @ApiResponse({ status: 200, description: '获取成功' })
  @ApiResponse({ status: 404, description: '告警不存在' })
  findAlert(@Param('id', ParseIntPipe) id: number) {
    return this.securityService.findAlertById(id);
  }

  @Public()
  @Put('alerts/:id/status')
  @ApiOperation({ summary: '更新告警状态' })
  @ApiResponse({ status: 200, description: '更新成功' })
  @ApiResponse({ status: 404, description: '告警不存在' })
  async updateAlertStatus(
    @Param('id') id: string,
    @Body() updateStatusDto: UpdateAlertStatusDto,
  ) {
    this.logger.log(`更新告警状态: alertId=${id}, status=${updateStatusDto.status}`);
    
    try {
      const result = await this.securityService.updateAlertStatus(id, updateStatusDto.status, updateStatusDto.remark);
      this.logger.log(`告警状态更新成功: alertId=${id}`);
      return {
        success: true,
        message: '状态更新成功',
        data: result,
      };
    } catch (error) {
      this.logger.error(`告警状态更新失败: alertId=${id}, error=${error.message}`, error.stack);
      throw error;
    }
  }

  @Public()
  @Delete('alerts/:id')
  @ApiOperation({ summary: '删除安全告警' })
  @ApiResponse({ status: 200, description: '删除成功' })
  @ApiResponse({ status: 404, description: '告警不存在' })
  deleteAlert(@Param('id', ParseIntPipe) id: number) {
    return this.securityService.deleteAlert(id, null);
  }

  @Public()
  @Put('alerts/ignore-all/:clientId')
  @ApiOperation({
    summary: '忽略指定客户端的全部未处理违规',
    description: '将指定客户端所有状态为 pending 或 confirmed 的违规事件标记为 ignored',
  })
  @ApiResponse({
    status: 200,
    description: '操作成功',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        affected: { type: 'number', example: 5 },
        message: { type: 'string', example: '成功忽略 5 条违规事件' },
        clientId: { type: 'string', example: '21aa1a7f-6fa3-4e90-bb35-7070810c3b3a' },
        timestamp: { type: 'string', format: 'date-time' },
      },
    },
  })
  @ApiResponse({ status: 401, description: '未认证' })
  @ApiResponse({ status: 403, description: '权限不足' })
  @ApiResponse({ status: 400, description: '请求参数错误' })
  @ApiResponse({ status: 404, description: '客户端不存在' })
  async ignoreAllAlerts(@Param('clientId') clientId: string) {
    this.logger.log(`批量忽略违规事件请求: clientId=${clientId}`);

    if (!clientId || clientId.trim() === '') {
      throw new BadRequestException('客户端ID不能为空');
    }

    try {
      const result = await this.securityService.ignoreAllAlertsForClient(clientId, null);
      this.logger.log(`批量忽略完成: clientId=${clientId}, affected=${result.affected}`);
      return result;
    } catch (error) {
      this.logger.error(`批量忽略失败: clientId=${clientId}, error=${error.message}`, error.stack);
      throw error;
    }
  }

  @Public()
  @Post('alerts/ignore-all')
  @ApiOperation({
    summary: '忽略指定客户端的全部未处理违规（POST版本）',
    description: '通过请求体传递客户端ID，功能与PUT版本相同',
  })
  @ApiResponse({
    status: 200,
    description: '操作成功',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        affected: { type: 'number', example: 5 },
        message: { type: 'string', example: '成功忽略 5 条违规事件' },
        clientId: { type: 'string', example: '21aa1a7f-6fa3-4e90-bb35-7070810c3b3a' },
        timestamp: { type: 'string', format: 'date-time' },
      },
    },
  })
  @ApiResponse({ status: 401, description: '未认证' })
  @ApiResponse({ status: 403, description: '权限不足' })
  @ApiResponse({ status: 400, description: '请求参数错误' })
  @ApiResponse({ status: 404, description: '客户端不存在' })
  async ignoreAllAlertsPost(@Body() ignoreAllDto: IgnoreAllAlertsDto) {
    this.logger.log(`批量忽略违规事件请求(POST): clientId=${ignoreAllDto.clientId}`);

    try {
      const result = await this.securityService.ignoreAllAlertsForClient(
        ignoreAllDto.clientId,
        null,
      );
      this.logger.log(
        `批量忽略完成(POST): clientId=${ignoreAllDto.clientId}, affected=${result.affected}`,
      );
      return result;
    } catch (error) {
      this.logger.error(
        `批量忽略失败(POST): clientId=${ignoreAllDto.clientId}, error=${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  // ========== 截图上传和处理 ==========

  @Public()
  @Post('screenshots/upload')
  @Throttle({ default: { limit: 30, ttl: 60000 } }) // 每分钟最多30次上传
  @ApiOperation({ summary: '上传截图' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        clientId: {
          type: 'string',
          description: '客户端 ID',
        },
        clipboardContent: {
          type: 'string',
          description: '剪贴板内容',
        },
        detectedAddresses: {
          type: 'string',
          description: '检测到的区块链地址（逗号分隔）',
        },
        hasViolations: {
          type: 'boolean',
          description: '是否检测到违规地址',
        },
        file: {
          type: 'string',
          format: 'binary',
          description: '截图文件',
        },
      },
    },
  })
  @ApiResponse({ status: 201, description: '上传成功' })
  @ApiResponse({ status: 400, description: '请求参数错误' })
  @ApiResponse({ status: 429, description: '请求过于频繁' })
  @ApiResponse({ status: 500, description: '服务器内部错误' })
  @UseInterceptors(
    FileInterceptor('file', {
      limits: {
        fileSize: 10 * 1024 * 1024, // 10MB 文件大小限制
      },
      fileFilter: (req, file, cb) => {
        // 只允许图片文件
        if (file.mimetype.startsWith('image/')) {
          cb(null, true);
        } else {
          cb(new BadRequestException('只允许上传图片文件'), false);
        }
      },
    }),
  )
  async uploadScreenshot(
    @Body() uploadDto: ScreenshotUploadDto,
    @UploadedFile() file: Express.Multer.File,
  ) {
    const startTime = Date.now();

    try {
      // 验证文件
      if (!file) {
        throw new BadRequestException('未找到上传文件');
      }

      if (!uploadDto.clientId) {
        throw new BadRequestException('客户端ID不能为空');
      }

      this.logger.debug(`开始处理截图上传: 客户端=${uploadDto.clientId}, 文件大小=${file.size}`);

      // 上传截图
      const uploadResult = await this.securityService.uploadScreenshot(uploadDto, file);

      // 如果客户端已经检测到违规，直接处理
      if (uploadDto.hasViolations && uploadDto.detectedAddresses) {
        this.logger.debug(
          `客户端已检测到违规地址: 客户端=${uploadDto.clientId}, 地址=${uploadDto.detectedAddresses}`,
        );
        setImmediate(async () => {
          try {
            await this.securityService.processScreenshotUpload(
              uploadDto.clientId,
              uploadResult.path,
              uploadDto.clipboardContent,
              uploadDto.detectedAddresses,
              uploadDto.hasViolations,
            );
          } catch (error) {
            this.logger.error(`处理违规截图失败: ${error.message}`, error.stack);
          }
        });
      }

      const duration = Date.now() - startTime;
      this.logger.debug(`截图上传完成: 客户端=${uploadDto.clientId}, 耗时=${duration}ms`);

      return {
        ...uploadResult,
        uploadTime: duration,
        message: uploadResult.isArchived ? '截图上传成功并已存档' : '截图上传成功',
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      this.logger.error(
        `截图上传失败: 客户端=${uploadDto.clientId}, 耗时=${duration}ms, 错误=${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  @Public()
  @Post('screenshots/process')
  @ApiOperation({ summary: '处理截图内容检测' })
  @ApiResponse({ status: 200, description: '处理成功' })
  processScreenshot(
    @Body() body: { clientId: string; screenshotPath: string; clipboardContent?: string },
  ) {
    return this.securityService.processScreenshotUpload(
      body.clientId,
      body.screenshotPath,
      body.clipboardContent,
    );
  }

  @Public()
  @Get('screenshots/:clientId/current')
  @ApiOperation({ summary: '获取客户端当前截图URL' })
  @ApiResponse({ status: 200, description: '获取成功' })
  async getCurrentScreenshot(@Param('clientId') clientId: string) {
    const url = await this.securityService.getCurrentScreenshotUrl(clientId);
    return {
      clientId,
      currentScreenshotUrl: url,
      timestamp: new Date(),
    };
  }

  @Public()
  @Get('screenshots/:clientId/alerts')
  @ApiOperation({ summary: '获取客户端告警截图历史' })
  @ApiResponse({ status: 200, description: '获取成功' })
  async getAlertScreenshots(@Param('clientId') clientId: string, @Query('limit') limit?: number) {
    const screenshots = await this.securityService.getAlertScreenshots(
      clientId,
      limit ? parseInt(limit.toString()) : 50,
    );
    return {
      clientId,
      screenshots,
      total: screenshots.length,
    };
  }

  // ========== 客户端违规上报 ==========

  @Public()
  @Post('violations/report')
  @Throttle({ default: { limit: 10, ttl: 60000 } }) // 每分钟最多10次违规上报
  @ApiOperation({
    summary: '客户端上报违规事件',
    description: '客户端检测到违规内容后主动上报给服务端',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        clientId: {
          type: 'string',
          description: '客户端 ID',
        },
        violationType: {
          type: 'string',
          enum: ['BLOCKCHAIN_ADDRESS', 'FORBIDDEN_CONTENT', 'SUSPICIOUS_ACTIVITY'],
          description: '违规类型',
        },
        violationContent: {
          type: 'string',
          description: '违规内容（如检测到的区块链地址）',
        },
        screenshotPath: {
          type: 'string',
          description: '相关截图路径（可选）',
        },
        additionalData: {
          type: 'object',
          description: '额外数据（如检测时间、上下文等）',
        },
      },
      required: ['clientId', 'violationType', 'violationContent'],
    },
  })
  @ApiResponse({ status: 201, description: '违规上报成功' })
  @ApiResponse({ status: 400, description: '请求参数错误' })
  @ApiResponse({ status: 429, description: '上报过于频繁' })
  async reportViolation(
    @Body()
    reportDto: {
      clientId: string;
      violationType: 'BLOCKCHAIN_ADDRESS' | 'FORBIDDEN_CONTENT' | 'SUSPICIOUS_ACTIVITY';
      violationContent: string;
      screenshotPath?: string;
      additionalData?: any;
    },
  ) {
    const startTime = Date.now();

    try {
      this.logger.log(
        `收到违规上报: 客户端=${reportDto.clientId}, 类型=${reportDto.violationType}`,
      );

      // 创建安全告警
      const alert = await this.securityService.createSecurityAlert({
        clientId: reportDto.clientId,
        alertType:
          reportDto.violationType === 'BLOCKCHAIN_ADDRESS'
            ? AlertType.BLOCKCHAIN_ADDRESS
            : AlertType.SUSPICIOUS_ACTIVITY,
        blockchainAddress:
          reportDto.violationType === 'BLOCKCHAIN_ADDRESS' ? reportDto.violationContent : undefined,
        screenshotPath: reportDto.screenshotPath,
        clipboardContent: reportDto.additionalData?.fullClipboardContent,
        remark: `客户端检测到${reportDto.violationType === 'BLOCKCHAIN_ADDRESS' ? '区块链地址' : '违规内容'}: ${reportDto.violationContent}`,
      });

      const duration = Date.now() - startTime;
      this.logger.log(
        `违规上报处理完成: 客户端=${reportDto.clientId}, 告警ID=${alert.id}, 耗时=${duration}ms`,
      );

      return {
        success: true,
        alertId: alert.id,
        message: '违规上报成功',
        processTime: duration,
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      this.logger.error(
        `违规上报失败: 客户端=${reportDto.clientId}, 耗时=${duration}ms, 错误=${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  // ========== 截图上传 + 心跳合并接口 ==========

  @Public()
  @Post('screenshots/upload-with-heartbeat')
  @Throttle({ default: { limit: 30, ttl: 60000 } }) // 每分钟最多30次上传
  @ApiOperation({
    summary: '上传截图并发送心跳',
    description: '同时处理截图上传和客户端心跳，减少网络请求次数',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        clientId: {
          type: 'string',
          description: '客户端 ID',
        },
        ipAddress: {
          type: 'string',
          description: '客户端IP地址',
        },
        hostname: {
          type: 'string',
          description: '客户端主机名',
        },
        osInfo: {
          type: 'string',
          description: '操作系统信息',
        },
        version: {
          type: 'string',
          description: '客户端版本',
        },
        metadata: {
          type: 'object',
          description: '额外的客户端信息',
        },
        clipboardContent: {
          type: 'string',
          description: '剪贴板内容',
        },
        detectedAddresses: {
          type: 'string',
          description: '检测到的区块链地址（逗号分隔）',
        },
        hasViolations: {
          type: 'boolean',
          description: '是否检测到违规地址',
        },
        file: {
          type: 'string',
          format: 'binary',
          description: '截图文件',
        },
      },
    },
  })
  @ApiResponse({ status: 201, description: '上传和心跳成功' })
  @ApiResponse({ status: 400, description: '请求参数错误' })
  @ApiResponse({ status: 429, description: '请求过于频繁' })
  @ApiResponse({ status: 500, description: '服务器内部错误' })
  @UseInterceptors(
    FileInterceptor('file', {
      limits: {
        fileSize: 10 * 1024 * 1024, // 10MB 文件大小限制
      },
      fileFilter: (req, file, cb) => {
        // 只允许图片文件
        if (file.mimetype.startsWith('image/')) {
          cb(null, true);
        } else {
          cb(new BadRequestException('只允许上传图片文件'), false);
        }
      },
    }),
  )
  async uploadScreenshotWithHeartbeat(
    @Body() uploadDto: ScreenshotUploadWithHeartbeatDto,
    @UploadedFile() file: Express.Multer.File,
  ) {
    const startTime = Date.now();

    try {
      // 验证文件
      if (!file) {
        throw new BadRequestException('未找到上传文件');
      }

      if (!uploadDto.clientId) {
        throw new BadRequestException('客户端ID不能为空');
      }

      this.logger.debug(
        `开始处理截图上传+心跳: 客户端=${uploadDto.clientId}, 文件大小=${file.size}`,
      );

      // 1. 处理心跳
      const heartbeatResult = await this.clientsService.handleHeartbeat({
        clientId: uploadDto.clientId,
        ipAddress: uploadDto.ipAddress,
        hostname: uploadDto.hostname,
        osInfo: uploadDto.osInfo,
        version: uploadDto.version,
        metadata: uploadDto.metadata,
      });

      // 2. 上传截图
      const uploadResult = await this.securityService.uploadScreenshot(
        {
          clientId: uploadDto.clientId,
          clipboardContent: uploadDto.clipboardContent,
          detectedAddresses: uploadDto.detectedAddresses,
          hasViolations: uploadDto.hasViolations,
        },
        file,
      );

      // 3. 如果客户端已经检测到违规，直接处理
      if (uploadDto.hasViolations && uploadDto.detectedAddresses) {
        this.logger.debug(
          `客户端已检测到违规地址: 客户端=${uploadDto.clientId}, 地址=${uploadDto.detectedAddresses}`,
        );
        setImmediate(async () => {
          try {
            await this.securityService.processScreenshotUpload(
              uploadDto.clientId,
              uploadResult.path,
              uploadDto.clipboardContent,
              uploadDto.detectedAddresses,
              uploadDto.hasViolations,
            );
          } catch (error) {
            this.logger.error(`处理违规截图失败: ${error.message}`, error.stack);
          }
        });
      }

      const duration = Date.now() - startTime;
      this.logger.debug(`截图上传+心跳完成: 客户端=${uploadDto.clientId}, 耗时=${duration}ms`);

      return {
        success: true,
        heartbeat: heartbeatResult,
        screenshot: {
          ...uploadResult,
          message: uploadResult.isArchived ? '截图上传成功并已存档' : '截图上传成功',
        },
        uploadTime: duration,
        message: '截图上传和心跳处理成功',
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      this.logger.error(
        `截图上传+心跳失败: 客户端=${uploadDto.clientId}, 耗时=${duration}ms, 错误=${error.message}`,
        error.stack,
      );
      throw error;
    }
  }
}
