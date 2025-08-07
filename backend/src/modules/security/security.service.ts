import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, In } from 'typeorm';
import { SecurityScreenshot, AlertType, AlertStatus } from '../../entities/security-screenshot.entity';
import { Notification } from '../../entities/notification.entity';
import { SystemLog } from '../../entities/system-log.entity';
import { BlockchainWhitelist } from '../../entities/blockchain-whitelist.entity';
import { Client } from '../../entities/client.entity';
import { CreateSecurityAlertDto } from './dto/create-security-alert.dto';
import { UpdateAlertStatusDto } from './dto/update-alert-status.dto';
import { QuerySecurityAlertsDto } from './dto/query-security-alerts.dto';
import { ScreenshotUploadDto } from './dto/screenshot-upload.dto';
import { MinioService } from '../../common/services/minio.service';
import { WebSocketService } from '../websocket/websocket.service';
import { RedisService } from '../../common/services/redis.service';
import { DateService } from '../../common/services/date.service';

@Injectable()
export class SecurityService {
  constructor(
    @InjectRepository(SecurityScreenshot)
    private readonly screenshotRepository: Repository<SecurityScreenshot>,
    @InjectRepository(Notification)
    private readonly notificationRepository: Repository<Notification>,
    @InjectRepository(SystemLog)
    private readonly systemLogRepository: Repository<SystemLog>,
    @InjectRepository(BlockchainWhitelist)
    private readonly whitelistRepository: Repository<BlockchainWhitelist>,
    @InjectRepository(Client)
    private readonly clientRepository: Repository<Client>,
    private readonly minioService: MinioService,
    private readonly webSocketService: WebSocketService,
    private readonly redisService: RedisService,
    private readonly dateService: DateService,
  ) {}

  // ========== 安全告警管理 ==========

  async findAllAlerts(query: QuerySecurityAlertsDto = {}): Promise<{
    alerts: SecurityScreenshot[],
    total: number,
    page: number,
    pageSize: number,
  }> {
    const { 
      page = 1, 
      pageSize = 20, 
      clientId, 
      alertType, 
      status, 
      startDate, 
      endDate 
    } = query;
    
    const queryBuilder = this.screenshotRepository.createQueryBuilder('screenshot')
      .leftJoinAndSelect('screenshot.client', 'client');

    if (clientId) {
      queryBuilder.andWhere('screenshot.clientId = :clientId', { clientId });
    }

    if (alertType) {
      queryBuilder.andWhere('screenshot.alertType = :alertType', { alertType });
    }

    if (status) {
      queryBuilder.andWhere('screenshot.status = :status', { status });
    }

    if (startDate && endDate) {
      queryBuilder.andWhere('screenshot.createdAt BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      });
    }

    const [alerts, total] = await queryBuilder
      .orderBy('screenshot.createdAt', 'DESC')
      .take(pageSize)
      .skip((page - 1) * pageSize)
      .getManyAndCount();

    return {
      alerts,
      total,
      page,
      pageSize,
    };
  }

  async findAlertById(id: number): Promise<SecurityScreenshot> {
    const alert = await this.screenshotRepository.findOne({
      where: { id },
      relations: ['client'],
    });

    if (!alert) {
      throw new NotFoundException('安全告警不存在');
    }

    return alert;
  }

  async createSecurityAlert(createAlertDto: CreateSecurityAlertDto): Promise<SecurityScreenshot> {
    // 验证客户端是否存在
    const client = await this.clientRepository.findOne({
      where: { id: createAlertDto.clientId },
    });

    if (!client) {
      throw new NotFoundException('客户端不存在');
    }

    // 创建安全告警
    const alert = this.screenshotRepository.create({
      ...createAlertDto,
      status: AlertStatus.PENDING,
    });

    const savedAlert = await this.screenshotRepository.save(alert);

    // 发送 WebSocket 通知
    this.webSocketService.emitSecurityAlert({
      id: savedAlert.id,
      clientId: savedAlert.clientId,
      alertType: savedAlert.alertType,
      blockchainAddress: savedAlert.blockchainAddress,
      createdAt: savedAlert.createdAt,
      client: {
        clientNumber: client.clientNumber,
        computerName: client.computerName,
      },
    });

    // 创建系统通知
    await this.createNotification(
      '安全告警',
      `检测到客户端 ${client.clientNumber} 存在安全风险：${createAlertDto.alertType}`,
      'security',
    );

    // 记录系统日志
    await this.logSecurityEvent(
      'SECURITY_ALERT_CREATED',
      `创建安全告警: ${createAlertDto.alertType}`,
      savedAlert.id.toString(),
    );

    return this.findAlertById(savedAlert.id);
  }

  async updateAlertStatus(id: number, updateStatusDto: UpdateAlertStatusDto, userId?: number): Promise<SecurityScreenshot> {
    const alert = await this.findAlertById(id);

    await this.screenshotRepository.update(id, {
      status: updateStatusDto.status,
      handledBy: userId || null,
      handledAt: updateStatusDto.status !== AlertStatus.PENDING ? new Date() : null,
      remark: updateStatusDto.remark,
    });

    // 记录系统日志
    await this.logSecurityEvent(
      'SECURITY_ALERT_UPDATED',
      `更新安全告警状态: ${updateStatusDto.status}`,
      id.toString(),
      userId,
    );

    return this.findAlertById(id);
  }

  async deleteAlert(id: number, userId?: number): Promise<void> {
    const alert = await this.findAlertById(id);

    // 删除关联的截图文件
    if (alert.screenshotPath) {
      try {
        await this.minioService.deleteFile(alert.screenshotPath);
      } catch (error) {
        console.error('删除截图文件失败:', error);
      }
    }

    await this.screenshotRepository.remove(alert);

    // 记录系统日志
    await this.logSecurityEvent(
      'SECURITY_ALERT_DELETED',
      `删除安全告警: ${alert.alertType}`,
      id.toString(),
      userId,
    );
  }

  // ========== 截图上传和处理 ==========

  async uploadScreenshot(uploadDto: ScreenshotUploadDto, file: Express.Multer.File): Promise<{
    url: string,
    path: string,
  }> {
    // 上传到 MinIO
    const uploadResult = await this.minioService.uploadScreenshot(
      uploadDto.clientId,
      file.buffer,
      new Date(),
    );

    return {
      url: uploadResult.url,
      path: uploadResult.path,
    };
  }

  async processScreenshotUpload(
    clientId: string, 
    screenshotPath: string, 
    clipboardContent?: string
  ): Promise<void> {
    if (!clipboardContent) {
      return;
    }

    // 检测区块链地址
    const blockchainAddresses = await this.detectBlockchainAddresses(clipboardContent);
    
    if (blockchainAddresses.length > 0) {
      for (const address of blockchainAddresses) {
        // 检查是否在白名单中
        const isWhitelisted = await this.isAddressWhitelisted(address);
        
        if (!isWhitelisted) {
          // 创建安全告警
          await this.createSecurityAlert({
            clientId,
            alertType: AlertType.BLOCKCHAIN_ADDRESS,
            blockchainAddress: address,
            screenshotPath,
            clipboardContent,
          });
        }
      }
    }
  }

  // ========== 区块链地址检测 ==========

  private async detectBlockchainAddresses(content: string): Promise<string[]> {
    const addresses: string[] = [];
    
    // Bitcoin 地址正则
    const btcRegex = /\b[13][a-km-zA-HJ-NP-Z1-9]{25,34}\b|\bbc1[a-z0-9]{39,59}\b/g;
    const btcMatches = content.match(btcRegex);
    if (btcMatches) {
      addresses.push(...btcMatches);
    }

    // Ethereum 地址正则
    const ethRegex = /\b0x[a-fA-F0-9]{40}\b/g;
    const ethMatches = content.match(ethRegex);
    if (ethMatches) {
      addresses.push(...ethMatches);
    }

    // 去重并返回
    return [...new Set(addresses)];
  }

  private async isAddressWhitelisted(address: string): Promise<boolean> {
    const whitelist = await this.whitelistRepository.findOne({
      where: { address },
    });

    return !!whitelist;
  }

  // ========== 统计信息 ==========

  async getSecurityStats(): Promise<{
    totalAlerts: number,
    pendingAlerts: number,
    resolvedAlerts: number,
    ignoredAlerts: number,
    todayAlerts: number,
    alertsByType: Record<string, number>,
  }> {
    const today = this.dateService.getStartOfDay(new Date());
    const tomorrow = this.dateService.getEndOfDay(new Date());

    const [totalAlerts, pendingAlerts, resolvedAlerts, ignoredAlerts] = await Promise.all([
      this.screenshotRepository.count(),
      this.screenshotRepository.count({ where: { status: AlertStatus.PENDING } }),
      this.screenshotRepository.count({ where: { status: AlertStatus.RESOLVED } }),
      this.screenshotRepository.count({ where: { status: AlertStatus.IGNORED } }),
    ]);

    const todayAlerts = await this.screenshotRepository.count({
      where: {
        createdAt: Between(today, tomorrow),
      },
    });

    // 统计各类型告警数量
    const alertsByTypeResult = await this.screenshotRepository
      .createQueryBuilder('screenshot')
      .select('screenshot.alertType', 'type')
      .addSelect('COUNT(*)', 'count')
      .groupBy('screenshot.alertType')
      .getRawMany();

    const alertsByType: Record<string, number> = {};
    alertsByTypeResult.forEach(item => {
      alertsByType[item.type] = parseInt(item.count);
    });

    return {
      totalAlerts,
      pendingAlerts,
      resolvedAlerts,
      ignoredAlerts,
      todayAlerts,
      alertsByType,
    };
  }

  // ========== 辅助方法 ==========

  private async createNotification(
    title: string,
    content: string,
    type: string,
  ): Promise<void> {
    const notification = this.notificationRepository.create({
      title,
      content,
      type,
    });

    await this.notificationRepository.save(notification);
    
    // WebSocket 通知
    this.webSocketService.emitSystemNotification({
      id: notification.id,
      title,
      content,
      type,
      createdAt: notification.createdAt,
    });
  }

  private async logSecurityEvent(
    action: string,
    description: string,
    resourceId?: string,
    userId?: number,
  ): Promise<void> {
    const log = this.systemLogRepository.create({
      action,
      description,
      resourceType: 'security',
      resourceId,
      userId,
    });

    await this.systemLogRepository.save(log);
  }
}