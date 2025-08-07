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
} from '@nestjs/common';
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
import { CreateSecurityAlertDto } from './dto/create-security-alert.dto';
import { UpdateAlertStatusDto } from './dto/update-alert-status.dto';
import { QuerySecurityAlertsDto } from './dto/query-security-alerts.dto';
import { ScreenshotUploadDto } from './dto/screenshot-upload.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserRole } from '../../entities/user.entity';

@ApiTags('🛡️ 安全监控')
@Controller('security')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class SecurityController {
  constructor(private readonly securityService: SecurityService) {}

  // ========== 安全告警管理 ==========

  @Get('alerts')
  @ApiOperation({ summary: '获取安全告警列表' })
  @ApiResponse({ status: 200, description: '获取成功' })
  findAlerts(@Query() query: QuerySecurityAlertsDto) {
    return this.securityService.findAllAlerts(query);
  }

  @Get('stats')
  @ApiOperation({ summary: '获取安全统计信息' })
  @ApiResponse({ status: 200, description: '获取成功' })
  getStats() {
    return this.securityService.getSecurityStats();
  }

  @Post('alerts')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.OPERATOR)
  @ApiOperation({ summary: '创建安全告警' })
  @ApiResponse({ status: 201, description: '创建成功' })
  @ApiResponse({ status: 404, description: '客户端不存在' })
  createAlert(@Body() createAlertDto: CreateSecurityAlertDto) {
    return this.securityService.createSecurityAlert(createAlertDto);
  }

  @Get('alerts/:id')
  @ApiOperation({ summary: '获取安全告警详情' })
  @ApiResponse({ status: 200, description: '获取成功' })
  @ApiResponse({ status: 404, description: '告警不存在' })
  findAlert(@Param('id', ParseIntPipe) id: number) {
    return this.securityService.findAlertById(id);
  }

  @Put('alerts/:id/status')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.OPERATOR)
  @ApiOperation({ summary: '更新告警状态' })
  @ApiResponse({ status: 200, description: '更新成功' })
  @ApiResponse({ status: 404, description: '告警不存在' })
  updateAlertStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateStatusDto: UpdateAlertStatusDto,
    @CurrentUser() user: any,
  ) {
    return this.securityService.updateAlertStatus(id, updateStatusDto, user.id);
  }

  @Delete('alerts/:id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: '删除安全告警' })
  @ApiResponse({ status: 200, description: '删除成功' })
  @ApiResponse({ status: 404, description: '告警不存在' })
  deleteAlert(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: any,
  ) {
    return this.securityService.deleteAlert(id, user.id);
  }

  // ========== 截图上传和处理 ==========

  @Post('screenshots/upload')
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
        file: {
          type: 'string',
          format: 'binary',
          description: '截图文件',
        },
      },
    },
  })
  @ApiResponse({ status: 201, description: '上传成功' })
  @UseInterceptors(FileInterceptor('file'))
  async uploadScreenshot(
    @Body() uploadDto: ScreenshotUploadDto,
    @UploadedFile() file: Express.Multer.File,
  ) {
    // 上传截图
    const uploadResult = await this.securityService.uploadScreenshot(uploadDto, file);
    
    // 处理截图内容，检测安全风险
    await this.securityService.processScreenshotUpload(
      uploadDto.clientId,
      uploadResult.path,
      uploadDto.clipboardContent,
    );

    return uploadResult;
  }

  @Post('screenshots/process')
  @ApiOperation({ summary: '处理截图内容检测' })
  @ApiResponse({ status: 200, description: '处理成功' })
  processScreenshot(@Body() body: {
    clientId: string,
    screenshotPath: string,
    clipboardContent?: string,
  }) {
    return this.securityService.processScreenshotUpload(
      body.clientId,
      body.screenshotPath,
      body.clipboardContent,
    );
  }
}