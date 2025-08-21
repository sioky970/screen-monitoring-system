import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { SecurityScreenshot, AlertStatus } from '../../entities/security-screenshot.entity';
import { AlertType } from './dto/create-security-alert.dto';
import { Client } from '../../entities/client.entity';
import { MinioService } from '../../common/services/minio.service';
import { ReportViolationDto } from './dto/report-violation.dto';
import { CreateSecurityAlertDto } from './dto/create-security-alert.dto';

@Injectable()
export class SecurityService {
  private readonly logger = new Logger(SecurityService.name);

  constructor(
    @InjectRepository(SecurityScreenshot)
    private readonly screenshotRepository: Repository<SecurityScreenshot>,
    @InjectRepository(Client)
    private readonly clientRepository: Repository<Client>,
    private readonly minioService: MinioService,
  ) {}

  private async validateClientExists(clientId: string): Promise<Client> {
    const client = await this.clientRepository.findOne({ where: { id: clientId } });
    if (!client) {
      throw new NotFoundException(`客户端 ${clientId} 不存在`);
    }
    return client;
  }

  async createSecurityAlert(createAlertDto: CreateSecurityAlertDto): Promise<SecurityScreenshot> {
    // 验证客户端是否存在
    await this.validateClientExists(createAlertDto.clientId);

    const alert = this.screenshotRepository.create({
      ...createAlertDto,
      alertId: uuidv4(), // 生成唯一的告警ID
      alertStatus: AlertStatus.PENDING,
      screenshotTime: new Date(),
      detectedAddress: createAlertDto.blockchainAddress || '',
      addressType: this.getAddressType(createAlertDto.blockchainAddress || ''),
      clipboardContent: createAlertDto.clipboardContent || '',
      // MinIO相关字段
      minioBucket: 'monitoring-screenshots',
      minioObjectKey: createAlertDto.screenshotPath || '',
      fileUrl: createAlertDto.screenshotPath || '',
    });
    return this.screenshotRepository.save(alert);
  }

  /**
   * 处理截图上传和心跳合并请求
   */
  async processScreenshotWithHeartbeat(data: any, file: Express.Multer.File) {
    const { clientId, ipAddress, hostname, osInfo, version, metadata, clipboardContent } = data;

    // 1. 验证客户端存在
    const client = await this.validateClientExists(clientId);

    // 2. 处理心跳信息 - 更新客户端状态
    const now = new Date();
    await this.clientRepository.update(clientId, {
      lastHeartbeat: now,
      ipAddress: ipAddress || client.ipAddress,
      clientName: hostname || client.clientName,
      osVersion: osInfo || client.osVersion,
      clientVersion: version || client.clientVersion,
      status: 'online' as any,
    });

    // 3. 上传常规截图（使用固定路径，会覆盖之前的截图）
    const uploadResult = await this.minioService.uploadFile(
      file.buffer,
      'current.jpg',
      file.mimetype,
      `screenshots/${clientId}`,
      true // 强制覆盖，生成固定路径
    );

    // 4. 更新客户端的最新截图URL
    await this.clientRepository.update(clientId, {
      latestScreenshotUrl: uploadResult.url,
      lastScreenshotTime: now,
    });

    this.logger.log(`客户端 ${clientId} 截图上传成功: ${uploadResult.url}`);

    // 5. 解析元数据
    let parsedMetadata = {};
    if (metadata) {
      try {
        parsedMetadata = typeof metadata === 'string' ? JSON.parse(metadata) : metadata;
      } catch (error) {
        this.logger.warn(`无法解析元数据: ${metadata}`);
      }
    }

    return {
      success: true,
      message: '截图上传和心跳处理成功',
      data: {
        screenshotUrl: uploadResult.url,
        fileSize: file.size,
        uploadTime: now.toISOString(),
        clientStatus: 'online',
        lastSeen: now.toISOString(),
      },
    };
  }

  async processViolationReport(
    reportDto: ReportViolationDto,
    file: Express.Multer.File,
  ) {
    const { clientId, violationType, violationContent, timestamp, additionalData } = reportDto;

    await this.validateClientExists(clientId);

    const objectKey = `violations/${clientId}/${new Date(timestamp).toISOString().replace(/:/g, '-')}_${uuidv4()}.jpg`;
    const uploadResult = await this.minioService.uploadFile(
      file.buffer,
      objectKey,
      file.mimetype,
    );
    const fileUrl = uploadResult.url;

    let parsedData = {};
    if (additionalData) {
      try {
        parsedData = JSON.parse(additionalData);
      } catch (error) {
        this.logger.warn(`无法解析附加数据: ${additionalData}`);
      }
    }

    const alert = await this.createSecurityAlert({
      clientId,
      alertType: violationType as AlertType,
      blockchainAddress: violationType === 'BLOCKCHAIN_ADDRESS' ? violationContent : undefined,
      screenshotPath: fileUrl,
      clipboardContent: parsedData['clipboardContent'],
      remark: `客户端上报: ${violationContent}`,
    });

    this.logger.log(`已创建新的违规告警: ${alert.id}，截图: ${fileUrl}`);

    return {
      success: true,
      message: '违规事件上报成功',
      alertId: alert.id,
      screenshotUrl: fileUrl,
    };
  }

  /**
   * 获取安全告警列表
   */
  async getAlerts(query: {
    clientId?: string;
    page?: number;
    pageSize?: number;
    status?: string;
    alertType?: string;
    startDate?: string;
    endDate?: string;
  }) {
    const {
      clientId,
      page = 1,
      pageSize = 20,
      status,
      alertType,
      startDate,
      endDate
    } = query;

    const queryBuilder = this.screenshotRepository
      .createQueryBuilder('ss')
      .leftJoinAndSelect('ss.client', 'client')
      .where('ss.detectedAddress IS NOT NULL');

    // 添加筛选条件
    if (clientId) {
      queryBuilder.andWhere('ss.clientId = :clientId', { clientId });
    }

    if (status) {
      queryBuilder.andWhere('ss.alertStatus = :status', { status });
    }

    if (alertType) {
      queryBuilder.andWhere('ss.alertType = :alertType', { alertType });
    }

    if (startDate) {
      queryBuilder.andWhere('ss.createdAt >= :startDate', { startDate });
    }

    if (endDate) {
      queryBuilder.andWhere('ss.createdAt <= :endDate', { endDate });
    }

    // 分页和排序
    const total = await queryBuilder.getCount();
    const alerts = await queryBuilder
      .orderBy('ss.createdAt', 'DESC')
      .skip((page - 1) * pageSize)
      .take(pageSize)
      .getMany();

    return {
      success: true,
      data: {
        alerts: alerts.map(alert => ({
          id: alert.id,
          alertId: alert.alertId,
          clientId: alert.clientId,
          clientName: alert.client?.clientName || '未知客户端',
          alertType: 'BLOCKCHAIN_ADDRESS',
          detectedAddress: alert.detectedAddress,
          addressType: alert.addressType,
          clipboardContent: alert.clipboardContent,
          screenshotUrl: alert.fileUrl,
          status: alert.alertStatus,
          riskLevel: alert.riskLevel || 'HIGH',
          createdAt: alert.createdAt,
          remark: alert.reviewNote
        })),
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize)
      }
    };
  }

  /**
   * 更新告警状态
   */
  async updateAlertStatus(id: string, data: { status: string; remark?: string }) {
    const alert = await this.screenshotRepository.findOne({ where: { id: parseInt(id) } });
    if (!alert) {
      throw new NotFoundException('告警不存在');
    }

    alert.alertStatus = data.status as AlertStatus;
    if (data.remark) {
      alert.reviewNote = data.remark;
    }

    await this.screenshotRepository.save(alert);

    return {
      success: true,
      message: '告警状态更新成功'
    };
  }

  /**
   * 忽略指定客户端的所有未处理违规
   */
  async ignoreAllAlerts(clientId: string) {
    const result = await this.screenshotRepository
      .createQueryBuilder()
      .update()
      .set({ alertStatus: AlertStatus.IGNORED })
      .where('clientId = :clientId', { clientId })
      .andWhere('alertStatus IN (:...statuses)', { statuses: [AlertStatus.PENDING, AlertStatus.CONFIRMED] })
      .andWhere('detectedAddress IS NOT NULL')
      .execute();

    return {
      success: true,
      message: `已忽略 ${result.affected} 条未处理违规`,
      affected: result.affected
    };
  }

  // 检测区块链地址类型
  private getAddressType(address: string): string {
    if (!address) return 'UNKNOWN';

    // 比特币地址检测
    if (address.match(/^[13][a-km-zA-HJ-NP-Z1-9]{25,34}$/)) {
      return 'BITCOIN';
    }
    if (address.match(/^bc1[a-z0-9]{39,59}$/)) {
      return 'BITCOIN_BECH32';
    }

    // 以太坊地址检测
    if (address.match(/^0x[a-fA-F0-9]{40}$/)) {
      return 'ETHEREUM';
    }

    return 'OTHER';
  }
}

