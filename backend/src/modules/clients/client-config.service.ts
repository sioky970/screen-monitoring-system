import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { ClientConfig } from '../../entities/client-config.entity';
import { Client } from '../../entities/client.entity';
import { CreateClientConfigDto } from './dto/create-client-config.dto';
import { UpdateClientConfigDto } from './dto/update-client-config.dto';
import { QueryClientConfigDto } from './dto/query-client-config.dto';
import { WebSocketService } from '../websocket/websocket.service';

@Injectable()
export class ClientConfigService {
  constructor(
    @InjectRepository(ClientConfig)
    private readonly clientConfigRepository: Repository<ClientConfig>,
    @InjectRepository(Client)
    private readonly clientRepository: Repository<Client>,
    private readonly webSocketService: WebSocketService,
  ) {}

  /**
   * 获取默认配置
   */
  getDefaultConfig(): Partial<ClientConfig> {
    return {
      screenshotInterval: 15,
      heartbeatInterval: 30,
      whitelistSyncInterval: 300,
      imageCompressionLimit: 1024,
      imageQuality: 80,
      clearClipboardOnViolation: true,
      enableRealTimeMonitoring: true,
      enableClipboardMonitoring: true,
      enableBlockchainDetection: true,
      maxRetryAttempts: 3,
      networkTimeout: 30000,
      enableAutoReconnect: true,
      reconnectInterval: 5000,
      extendedSettings: {},
      isActive: true,
      remark: '默认配置',
    };
  }

  /**
   * 创建客户端配置
   */
  async create(createDto: CreateClientConfigDto): Promise<ClientConfig> {
    // 验证客户端是否存在
    const client = await this.clientRepository.findOne({
      where: { id: createDto.clientId },
    });
    if (!client) {
      throw new NotFoundException(`客户端 ${createDto.clientId} 不存在`);
    }

    // 检查是否已存在配置
    const existingConfig = await this.clientConfigRepository.findOne({
      where: { clientId: createDto.clientId },
    });
    if (existingConfig) {
      throw new BadRequestException(`客户端 ${createDto.clientId} 已存在配置`);
    }

    // 合并默认配置
    const defaultConfig = this.getDefaultConfig();
    const configData = { ...defaultConfig, ...createDto };

    const config = this.clientConfigRepository.create(configData);
    const savedConfig = await this.clientConfigRepository.save(config);

    // 广播配置更新
    await this.broadcastConfigUpdate(createDto.clientId, savedConfig);

    return savedConfig;
  }

  /**
   * 获取客户端配置
   */
  async findByClientId(clientId: string): Promise<ClientConfig> {
    const config = await this.clientConfigRepository.findOne({
      where: { clientId, isActive: true },
      relations: ['client'],
    });

    if (!config) {
      // 如果没有配置，创建默认配置
      const client = await this.clientRepository.findOne({
        where: { id: clientId },
      });
      if (!client) {
        throw new NotFoundException(`客户端 ${clientId} 不存在`);
      }

      const defaultConfig = this.getDefaultConfig();
      const newConfig = this.clientConfigRepository.create({
        ...defaultConfig,
        clientId,
      });
      return await this.clientConfigRepository.save(newConfig);
    }

    return config;
  }

  /**
   * 查询配置列表
   */
  async findAll(queryDto: QueryClientConfigDto) {
    const { clientId, isActive, page = 1, limit = 10 } = queryDto;
    const queryBuilder = this.clientConfigRepository
      .createQueryBuilder('config')
      .leftJoinAndSelect('config.client', 'client');

    if (clientId) {
      queryBuilder.andWhere('config.client_id = :clientId', { clientId });
    }

    if (isActive !== undefined) {
      queryBuilder.andWhere('config.is_active = :isActive', { isActive });
    }

    queryBuilder
      .orderBy('config.updated_at', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    const [configs, total] = await queryBuilder.getManyAndCount();

    return {
      data: configs,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * 更新客户端配置
   */
  async update(id: number, updateDto: UpdateClientConfigDto): Promise<ClientConfig> {
    const config = await this.clientConfigRepository.findOne({
      where: { id },
      relations: ['client'],
    });

    if (!config) {
      throw new NotFoundException(`配置 ${id} 不存在`);
    }

    // 更新配置
    Object.assign(config, updateDto);
    config.updatedAt = new Date();
    const updatedConfig = await this.clientConfigRepository.save(config);

    // 广播配置更新
    await this.broadcastConfigUpdate(config.clientId, updatedConfig);

    return updatedConfig;
  }

  /**
   * 删除客户端配置
   */
  async remove(id: number): Promise<void> {
    const config = await this.clientConfigRepository.findOne({
      where: { id },
    });

    if (!config) {
      throw new NotFoundException(`配置 ${id} 不存在`);
    }

    await this.clientConfigRepository.remove(config);

    // 广播配置删除
    await this.broadcastConfigUpdate(config.clientId, null);
  }

  /**
   * 批量更新客户端配置
   */
  async batchUpdate(clientIds: string[], updateDto: Partial<UpdateClientConfigDto>): Promise<void> {
    const configs = await this.clientConfigRepository.find({
      where: { clientId: In(clientIds) },
    });

    for (const config of configs) {
      Object.assign(config, updateDto);
      config.updatedAt = new Date();
    }

    await this.clientConfigRepository.save(configs);

    // 批量广播配置更新
    for (const config of configs) {
      await this.broadcastConfigUpdate(config.clientId, config);
    }
  }

  /**
   * 广播配置更新到客户端
   */
  private async broadcastConfigUpdate(clientId: string, config: ClientConfig | null): Promise<void> {
    try {
      if (config) {
        // 发送配置更新事件
        await this.webSocketService.sendToClient(clientId, 'config-updated', {
          config: {
            screenshotInterval: config.screenshotInterval,
            heartbeatInterval: config.heartbeatInterval,
            whitelistSyncInterval: config.whitelistSyncInterval,
            imageCompressionLimit: config.imageCompressionLimit,
            imageQuality: config.imageQuality,
            clearClipboardOnViolation: config.clearClipboardOnViolation,
            enableRealTimeMonitoring: config.enableRealTimeMonitoring,
            enableClipboardMonitoring: config.enableClipboardMonitoring,
            enableBlockchainDetection: config.enableBlockchainDetection,
            maxRetryAttempts: config.maxRetryAttempts,
            networkTimeout: config.networkTimeout,
            enableAutoReconnect: config.enableAutoReconnect,
            reconnectInterval: config.reconnectInterval,
            extendedSettings: config.extendedSettings,
          },
          timestamp: new Date().toISOString(),
        });
      } else {
        // 发送配置删除事件
        await this.webSocketService.sendToClient(clientId, 'config-deleted', {
          timestamp: new Date().toISOString(),
        });
      }
    } catch (error) {
      console.error(`广播配置更新失败 - 客户端: ${clientId}`, error);
    }
  }

  /**
   * 获取客户端的有效配置（用于客户端连接时获取）
   */
  async getClientEffectiveConfig(clientId: string): Promise<any> {
    const config = await this.findByClientId(clientId);
    
    return {
      screenshotInterval: config.screenshotInterval,
      heartbeatInterval: config.heartbeatInterval,
      whitelistSyncInterval: config.whitelistSyncInterval,
      imageCompressionLimit: config.imageCompressionLimit,
      imageQuality: config.imageQuality,
      clearClipboardOnViolation: config.clearClipboardOnViolation,
      enableRealTimeMonitoring: config.enableRealTimeMonitoring,
      enableClipboardMonitoring: config.enableClipboardMonitoring,
      enableBlockchainDetection: config.enableBlockchainDetection,
      maxRetryAttempts: config.maxRetryAttempts,
      networkTimeout: config.networkTimeout,
      enableAutoReconnect: config.enableAutoReconnect,
      reconnectInterval: config.reconnectInterval,
      extendedSettings: config.extendedSettings,
    };
  }
}