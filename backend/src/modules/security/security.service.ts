import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, In } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { SecurityScreenshot, AlertStatus } from '../../entities/security-screenshot.entity';
import { Notification, NotificationType } from '../../entities/notification.entity';
import { SystemLog } from '../../entities/system-log.entity';
import { BlockchainWhitelist } from '../../entities/blockchain-whitelist.entity';
import { Client } from '../../entities/client.entity';
import { CreateSecurityAlertDto, AlertType } from './dto/create-security-alert.dto';
import { UpdateAlertStatusDto } from './dto/update-alert-status.dto';
import { QuerySecurityAlertsDto } from './dto/query-security-alerts.dto';
import { ScreenshotUploadDto } from './dto/screenshot-upload.dto';
import { MinioService } from '../../common/services/minio.service';
import { WebSocketService } from '../websocket/websocket.service';
import { RedisService } from '../../common/services/redis.service';
import { DateService } from '../../common/services/date.service';

@Injectable()
export class SecurityService {
  private readonly logger = new Logger(SecurityService.name);

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
      queryBuilder.andWhere('screenshot.client_id = :clientId', { clientId });
    }

    if (alertType) {
      queryBuilder.andWhere('screenshot.address_type = :alertType', { alertType });
    }

    if (status) {
      queryBuilder.andWhere('screenshot.alert_status = :status', { status });
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

    // 生成截图URL
    let fileUrl = createAlertDto.screenshotPath || '';
    
    // 如果没有提供截图路径，尝试生成当前截图的URL
    if (!fileUrl) {
      try {
        fileUrl = await this.minioService.getCurrentScreenshotUrl(createAlertDto.clientId);
      } catch (error) {
        this.logger.warn(`无法获取客户端 ${createAlertDto.clientId} 的当前截图URL: ${error.message}`);
        fileUrl = '';
      }
    }

    // 创建安全告警
    const alert = this.screenshotRepository.create({
      ...createAlertDto,
      alertId: uuidv4(), // 生成唯一的告警ID
      alertStatus: AlertStatus.PENDING,
      screenshotTime: new Date(), // 设置截图时间
      detectedAddress: createAlertDto.blockchainAddress || '', // 确保有值
      addressType: this.getAddressType(createAlertDto.blockchainAddress || ''), // 检测地址类型
      clipboardContent: createAlertDto.clipboardContent || '', // 确保有值
      // MinIO相关字段
      minioBucket: 'monitoring-screenshots', // 设置bucket名称
      minioObjectKey: `screenshots/${createAlertDto.clientId}/current.jpg`, // 固定的对象键
      fileUrl: fileUrl, // 设置文件URL
    });

    const savedAlert = await this.screenshotRepository.save(alert);

    // 发送 WebSocket 通知
    this.webSocketService.emitSecurityAlert({
      id: savedAlert.id,
      clientId: savedAlert.clientId,
      addressType: savedAlert.addressType,
      detectedAddress: savedAlert.detectedAddress,
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
      NotificationType.WARNING, // 使用有效的枚举值
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
      alertStatus: updateStatusDto.status,
      reviewedBy: userId || null,
      reviewedAt: updateStatusDto.status !== AlertStatus.PENDING ? new Date() : null,
      reviewNote: updateStatusDto.remark,
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

  /**
   * 忽略指定客户端的全部未处理违规（pending/confirmed）
   */
  async ignoreAllAlertsForClient(clientId: string, userId?: number): Promise<{
    success: boolean;
    affected: number;
    message: string;
    clientId: string;
    timestamp: Date;
  }> {
    try {
      // 验证客户端是否存在
      const client = await this.clientRepository.findOne({
        where: { id: clientId },
      });

      if (!client) {
        throw new NotFoundException(`客户端 ${clientId} 不存在`);
      }

      // 先查询要更新的记录数量，用于日志记录
      const pendingAlerts = await this.screenshotRepository.count({
        where: {
          clientId,
          alertStatus: In([AlertStatus.PENDING, AlertStatus.CONFIRMED]),
        },
      });

      if (pendingAlerts === 0) {
        return {
          success: true,
          affected: 0,
          message: '该客户端没有待处理的违规事件',
          clientId,
          timestamp: new Date(),
        };
      }

      // 批量更新违规状态
      const result = await this.screenshotRepository.createQueryBuilder()
        .update(SecurityScreenshot)
        .set({
          alertStatus: AlertStatus.IGNORED,
          reviewedBy: userId || null,
          reviewedAt: () => 'CURRENT_TIMESTAMP',
          reviewNote: 'Bulk ignored by admin',
        })
        .where('client_id = :clientId', { clientId })
        .andWhere('alert_status IN (:...statuses)', {
          statuses: [AlertStatus.PENDING, AlertStatus.CONFIRMED]
        })
        .execute();

      const affected = result.affected || 0;

      // 记录系统日志
      await this.logSecurityEvent(
        'SECURITY_ALERTS_BULK_IGNORED',
        `批量忽略客户端 ${client.computerName || clientId} 的 ${affected} 条违规事件`,
        clientId,
        userId,
      );

      // 发送WebSocket通知更新客户端状态
      this.webSocketService.emitClientStatus(clientId, {
        alertCount: 0, // 忽略后违规数量归零
        lastUpdate: new Date(),
      });

      return {
        success: true,
        affected,
        message: `成功忽略 ${affected} 条违规事件`,
        clientId,
        timestamp: new Date(),
      };

    } catch (error) {
      this.logger.error(`批量忽略违规事件失败: ${error.message}`, error.stack);
      throw error;
    }
  }

  async deleteAlert(id: number, userId?: number): Promise<void> {
    const alert = await this.findAlertById(id);

    // 删除关联的截图文件
    if (alert.minioObjectKey) {
      try {
        await this.minioService.deleteFile(alert.minioObjectKey);
      } catch (error) {
        console.error('删除截图文件失败:', error);
      }
    }

    await this.screenshotRepository.remove(alert);

    // 记录系统日志
    await this.logSecurityEvent(
      'SECURITY_ALERT_DELETED',
      `删除安全告警: ${alert.addressType}`,
      id.toString(),
      userId,
    );
  }

  // ========== 截图上传和处理 ==========

  async uploadScreenshot(uploadDto: ScreenshotUploadDto, file: Express.Multer.File): Promise<{
    url: string,
    path: string,
    alertUrl?: string,
    isArchived: boolean,
  }> {
    // 检测是否包含区块链地址（用于判断是否为安全告警）
    const blockchainAddresses = await this.detectBlockchainAddresses(uploadDto.clipboardContent || '');
    const hasBlockchainAddress = blockchainAddresses.length > 0;

    // 使用混合存储策略上传截图
    const uploadResult = await this.minioService.uploadScreenshot(
      uploadDto.clientId,
      file.buffer,
      hasBlockchainAddress, // 如果检测到区块链地址，则保存为告警截图
    );

    return {
      url: uploadResult.currentUrl,
      path: uploadResult.currentUrl,
      alertUrl: uploadResult.alertUrl,
      isArchived: uploadResult.isArchived,
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

  /**
   * 根据地址格式检测地址类型
   */
  private getAddressType(address: string): string {
    if (!address) return 'UNKNOWN';

    // Bitcoin地址检测
    if (/^[13][a-km-zA-HJ-NP-Z1-9]{25,34}$/.test(address) || /^bc1[a-z0-9]{39,59}$/.test(address)) {
      return 'BTC';
    }

    // Ethereum地址检测
    if (/^0x[a-fA-F0-9]{40}$/.test(address)) {
      return 'ETH';
    }

    // TRON地址检测
    if (/^T[A-Za-z1-9]{33}$/.test(address)) {
      return 'TRX';
    }

    // Litecoin地址检测
    if (/^[LM3][a-km-zA-HJ-NP-Z1-9]{26,33}$/.test(address)) {
      return 'LTC';
    }

    // Dogecoin地址检测
    if (/^D{1}[5-9A-HJ-NP-U]{1}[1-9A-HJ-NP-Za-km-z]{32}$/.test(address)) {
      return 'DOGE';
    }

    return 'OTHER';
  }

  // ========== 混合存储策略相关方法 ==========

  /**
   * 获取客户端当前截图的固定URL
   */
  async getCurrentScreenshotUrl(clientId: string): Promise<string> {
    return this.minioService.getCurrentScreenshotUrl(clientId);
  }

  /**
   * 获取客户端的告警截图历史
   */
  async getAlertScreenshots(clientId: string, limit = 50): Promise<Array<{
    url: string;
    timestamp: Date;
    key: string;
  }>> {
    return this.minioService.getAlertScreenshots(clientId, limit);
  }

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
      this.screenshotRepository.count({ where: { alertStatus: AlertStatus.PENDING } }),
      this.screenshotRepository.count({ where: { alertStatus: AlertStatus.RESOLVED } }),
      this.screenshotRepository.count({ where: { alertStatus: AlertStatus.IGNORED } }),
    ]);

    const todayAlerts = await this.screenshotRepository.count({
      where: {
        screenshotTime: Between(today, tomorrow),
      },
    });

    // 统计各类型告警数量
    const alertsByTypeResult = await this.screenshotRepository
      .createQueryBuilder('screenshot')
      .select('screenshot.addressType', 'type')
      .addSelect('COUNT(*)', 'count')
      .groupBy('screenshot.addressType')
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
    type: NotificationType,
    userId?: number,
  ): Promise<void> {
    const notification = this.notificationRepository.create({
      userId,
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
      targetType: 'security',
      targetId: resourceId,
      userId,
    });

    await this.systemLogRepository.save(log);
  }
}