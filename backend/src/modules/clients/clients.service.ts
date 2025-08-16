import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository, InjectDataSource } from '@nestjs/typeorm';
import { Repository, Like, In, DataSource } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { Client, ClientStatus } from '../../entities/client.entity';
import { ClientGroup } from '../../entities/client-group.entity';
import { ClientOnlineLog } from '../../entities/client-online-log.entity';
import { SecurityScreenshot } from '../../entities/security-screenshot.entity';
import { CreateClientDto } from './dto/create-client.dto';
import { UpdateClientDto } from './dto/update-client.dto';
import { CreateClientGroupDto } from './dto/create-client-group.dto';
import { UpdateClientGroupDto } from './dto/update-client-group.dto';
import { QueryClientsDto } from './dto/query-clients.dto';
import { WebSocketService } from '../websocket/websocket.service';
import { RedisService } from '../../common/services/redis.service';
import { MinioService } from '../../common/services/minio.service';

import { OnModuleInit, OnModuleDestroy } from '@nestjs/common';

@Injectable()
export class ClientsService implements OnModuleInit, OnModuleDestroy {
  private offlineCheckTimer: NodeJS.Timeout | null = null;

  constructor(
    @InjectRepository(Client)
    private readonly clientRepository: Repository<Client>,
    @InjectRepository(ClientGroup)
    private readonly clientGroupRepository: Repository<ClientGroup>,
    @InjectRepository(ClientOnlineLog)
    private readonly clientOnlineLogRepository: Repository<ClientOnlineLog>,
    @InjectRepository(SecurityScreenshot)
    private readonly screenshotRepository: Repository<SecurityScreenshot>,
    @InjectDataSource()
    private readonly dataSource: DataSource,
    private readonly webSocketService: WebSocketService,
    private readonly redisService: RedisService,
    private readonly minioService: MinioService,
  ) {}

  onModuleInit() {
    const intervalMs = parseInt(process.env.OFFLINE_SWEEP_INTERVAL_MS || '30000', 10)
    const thresholdMs = parseInt(process.env.OFFLINE_THRESHOLD_MS || '30000', 10)
    this.offlineCheckTimer = setInterval(async () => {
      try {
        await this.sweepOffline(thresholdMs)
      } catch (e) {
        // swallow
      }
    }, intervalMs)
  }

  onModuleDestroy() {
    if (this.offlineCheckTimer) clearInterval(this.offlineCheckTimer)
  }

  private async sweepOffline(thresholdMs: number) {
    const onlineClients = await this.clientRepository.find({ where: { status: ClientStatus.ONLINE }, select: ['id', 'lastHeartbeat'] })
    const now = Date.now()
    for (const c of onlineClients) {
      const last = c.lastHeartbeat ? new Date(c.lastHeartbeat).getTime() : 0
      if (last && now - last > thresholdMs) {
        await this.updateClientStatus(c.id, ClientStatus.OFFLINE)
      }
    }
  }

  // ========== 客户端管理 ==========

  async findAll(query: QueryClientsDto = {}): Promise<{
    clients: any[],
    total: number,
    page: number,
    pageSize: number,
  }> {
    const { page = 1, pageSize = 20, search, status, groupId } = query;

    const baseQueryBuilder = this.clientRepository.createQueryBuilder('client')
      .leftJoinAndSelect('client.group', 'clientGroup');

    if (search) {
      baseQueryBuilder.andWhere(
        '(client.clientNumber LIKE :search OR client.computerName LIKE :search OR client.ipAddress LIKE :search)',
        { search: `%${search}%` },
      );
    }

    if (status) {
      baseQueryBuilder.andWhere('client.status = :status', { status });
    }

    if (groupId) {
      baseQueryBuilder.andWhere('client.groupId = :groupId', { groupId });
    }

    // 分开查询数据与总数，绕过 TypeORM 在 getManyAndCount + orderBy 下的已知问题
    const dataQuery = baseQueryBuilder
      .clone()
      .orderBy('client.lastHeartbeat', 'DESC')
      .take(pageSize)
      .skip((page - 1) * pageSize);

    const countQuery = baseQueryBuilder
      .clone()
      .orderBy() // 清除排序，避免计数时报错
      .take(undefined as any)
      .skip(undefined as any);

    const [clients, total] = await Promise.all([
      dataQuery.getMany(),
      countQuery.getCount(),
    ]);

    // 为每个客户端获取最新截图和违规事件数量
    const clientsWithScreenshots = await Promise.all(
      clients.map(async (client) => {
        const [latestScreenshot, alertCount] = await Promise.all([
          this.getLatestScreenshot(client.id),
          this.getClientAlertCount(client.id)
        ]);

        // 衍生状态：若心跳超时，前端直接看到 offline（避免等到落库）
        const OFFLINE_THRESHOLD_MS = parseInt(process.env.OFFLINE_THRESHOLD_MS || '30000', 10);
        const now = Date.now();
        const lastHeartbeat = client.lastHeartbeat ? new Date(client.lastHeartbeat).getTime() : 0;
        const derivedStatus = lastHeartbeat && (now - lastHeartbeat) > OFFLINE_THRESHOLD_MS ? ClientStatus.OFFLINE : client.status;

        return {
          ...client,
          latestScreenshotUrl: await this.minioService.getCurrentScreenshotUrl(client.id),
          alertCount,
          status: derivedStatus,
        };
      })
    );

    return {
      clients: clientsWithScreenshots,
      total,
      page,
      pageSize,
    };
  }

  // 获取客户端最新截图
  async getLatestScreenshot(clientId: string): Promise<SecurityScreenshot | null> {
    return await this.screenshotRepository.findOne({
      where: { clientId },
      order: { screenshotTime: 'DESC' },
    });
  }

  // 获取客户端违规事件数量（仅统计未处理的）
  async getClientAlertCount(clientId: string): Promise<number> {
    const result = await this.dataSource.query(
      `
      SELECT COUNT(*) as count
      FROM security_screenshots
      WHERE client_id = ?
        AND detected_address IS NOT NULL
        AND alert_status IN ('pending', 'confirmed')
      `,
      [clientId]
    );
    return parseInt(result[0]?.count || '0');
  }

  async findById(id: string): Promise<Client> {
    const client = await this.clientRepository.findOne({
      where: { id },
      relations: ['group'],
    });

    if (!client) {
      throw new NotFoundException('客户端不存在');
    }

    return client;
  }

  async getClientDetail(id: string): Promise<any> {
    // 获取客户端基本信息
    const client = await this.clientRepository.findOne({
      where: { id },
      relations: ['group'],
    });

    if (!client) {
      throw new NotFoundException(`客户端 ${id} 不存在`);
    }

    // 获取最新截图
    let latestScreenshot = null;
    let latestScreenshotTime = null;
    try {
      const screenshot = await this.getLatestScreenshot(id);
      if (screenshot) {
        // 动态生成当前可用的截图 URL
        latestScreenshot = await this.minioService.getFileUrl(`screenshots/${id}/current.jpg`);
        latestScreenshotTime = screenshot.screenshotTime;
      }
    } catch (error) {
      // 截图获取失败不影响其他信息
    }

    // 获取违规事件（最近50条）
    const securityAlerts = await this.dataSource.query(`
      SELECT
        ss.id,
        ss.created_at as createdAt,
        ss.detected_address as detectedAddress,
        ss.address_type as addressType,
        ss.clipboard_content as clipboardContent,
        ss.risk_level as riskLevel,
        ss.alert_status as status,
        ss.file_url as screenshotUrl,
        'blockchain_address' as alertType
      FROM security_screenshots ss
      WHERE ss.client_id = ?
        AND ss.detected_address IS NOT NULL
      ORDER BY ss.created_at DESC
      LIMIT 50
    `, [id]);

    // 获取在线日志统计
    const onlineStats = await this.dataSource.query(`
      SELECT
        COUNT(*) as totalSessions,
        SUM(CASE WHEN duration IS NOT NULL THEN duration ELSE 0 END) as totalOnlineTime,
        MAX(online_time) as lastOnlineTime
      FROM client_online_logs
      WHERE client_id = ?
    `, [id]);

    // 获取所有分组列表（用于编辑）
    const allGroups = await this.clientGroupRepository.find({
      where: { isActive: true },
      order: { sortOrder: 'ASC', name: 'ASC' }
    });

    return {
      code: 200,
      message: '获取成功',
      data: {
        // 基本信息
        client: {
          ...client,
          latestScreenshot,
          latestScreenshotTime,
        },
        // 违规事件
        securityAlerts: securityAlerts.map(alert => ({
          ...alert,
          createdAt: alert.createdAt,
          alertType: alert.alertType,
          status: alert.status || 'pending'
        })),
        // 在线统计
        onlineStats: {
          totalSessions: parseInt(onlineStats[0]?.totalSessions || '0'),
          totalOnlineTime: parseInt(onlineStats[0]?.totalOnlineTime || '0'),
          lastOnlineTime: onlineStats[0]?.lastOnlineTime || null,
        },
        // 可用分组
        availableGroups: allGroups,
      },
      success: true,
      timestamp: new Date(),
    };
  }

  async create(createClientDto: CreateClientDto): Promise<Client> {
    // 检查客户端编号是否已存在
    const existingClient = await this.clientRepository.findOne({
      where: { clientNumber: createClientDto.clientNumber },
    });

    if (existingClient) {
      throw new BadRequestException('客户端编号已存在');
    }

    // 自动分配分组（后端逻辑决定）
    const assignedGroupId = await this.assignClientGroup(createClientDto);

    const client = this.clientRepository.create({
      ...createClientDto,
      id: uuidv4(),
      groupId: assignedGroupId,
      status: ClientStatus.OFFLINE,
      firstConnect: new Date(),
      lastHeartbeat: new Date(),
    });

    const savedClient = await this.clientRepository.save(client);

    // 获取完整信息返回
    return this.findById(savedClient.id);
  }

  // 自动分配客户端分组的业务逻辑
  private async assignClientGroup(createClientDto: CreateClientDto): Promise<number> {
    // 确保有默认分组存在
    let defaultGroup = await this.clientGroupRepository.findOne({
      where: { name: '默认分组' },
    });

    if (!defaultGroup) {
      // 创建默认分组
      defaultGroup = await this.clientGroupRepository.save({
        name: '默认分组',
        description: '系统自动创建的默认分组',
        color: '#1890ff',
        sortOrder: 0,
        isActive: true,
      });
    }

    // 分组分配逻辑：
    // 1. 如果计算机名包含特定关键词，分配到对应分组
    // 2. 否则分配到默认分组

    const computerName = createClientDto.computerName?.toLowerCase() || '';

    // 开发环境分组
    if (computerName.includes('dev') || computerName.includes('develop')) {
      let devGroup = await this.clientGroupRepository.findOne({
        where: { name: '开发环境' },
      });
      if (!devGroup) {
        devGroup = await this.clientGroupRepository.save({
          name: '开发环境',
          description: '开发环境客户端',
          color: '#52c41a',
          sortOrder: 1,
          isActive: true,
        });
      }
      return devGroup.id;
    }

    // 测试环境分组
    if (computerName.includes('test') || computerName.includes('qa')) {
      let testGroup = await this.clientGroupRepository.findOne({
        where: { name: '测试环境' },
      });
      if (!testGroup) {
        testGroup = await this.clientGroupRepository.save({
          name: '测试环境',
          description: '测试环境客户端',
          color: '#faad14',
          sortOrder: 2,
          isActive: true,
        });
      }
      return testGroup.id;
    }

    // 生产环境分组
    if (computerName.includes('prod') || computerName.includes('production')) {
      let prodGroup = await this.clientGroupRepository.findOne({
        where: { name: '生产环境' },
      });
      if (!prodGroup) {
        prodGroup = await this.clientGroupRepository.save({
          name: '生产环境',
          description: '生产环境客户端',
          color: '#f5222d',
          sortOrder: 3,
          isActive: true,
        });
      }
      return prodGroup.id;
    }

    // 模拟客户端分组
    if (computerName.includes('sim') || computerName.includes('simulator')) {
      let simGroup = await this.clientGroupRepository.findOne({
        where: { name: '模拟客户端' },
      });
      if (!simGroup) {
        simGroup = await this.clientGroupRepository.save({
          name: '模拟客户端',
          description: '用于测试的模拟客户端',
          color: '#722ed1',
          sortOrder: 4,
          isActive: true,
        });
      }
      return simGroup.id;
    }

    // 默认分组
    return defaultGroup.id;
  }

  async update(id: string, updateClientDto: UpdateClientDto): Promise<Client> {
    const client = await this.findById(id);

    // 如果更新客户端编号，检查是否重复
    if (updateClientDto.clientNumber && updateClientDto.clientNumber !== client.clientNumber) {
      const existingClient = await this.clientRepository.findOne({
        where: { clientNumber: updateClientDto.clientNumber },
      });
      if (existingClient) {
        throw new BadRequestException('客户端编号已存在');
      }
    }

    // 如果更新分组，验证分组是否存在
    if (updateClientDto.groupId !== undefined) {
      if (updateClientDto.groupId !== null) {
        const group = await this.clientGroupRepository.findOne({
          where: { id: updateClientDto.groupId, isActive: true },
        });
        if (!group) {
          throw new BadRequestException('指定的分组不存在或已禁用');
        }
      }
    }

    await this.clientRepository.update(id, updateClientDto);
    return this.findById(id);
  }

  async remove(id: string): Promise<void> {
    const client = await this.findById(id);
    await this.clientRepository.remove(client);
  }

  async bulkDelete(ids: string[]): Promise<void> {
    await this.clientRepository.delete({ id: In(ids) });
  }

  async updateClientStatus(clientId: string, status: ClientStatus, ip?: string): Promise<void> {
    const client = await this.findById(clientId);

    const updateData: Partial<Client> = {
      status,
      lastHeartbeat: new Date(),
    };

    if (ip) {
      updateData.ipAddress = ip;
    }

    await this.clientRepository.update(clientId, updateData);

    // 记录上下线日志
    await this.logClientOnlineStatus(clientId, status);

    // WebSocket 通知前端
    this.webSocketService.emitClientStatus(clientId, { status, lastHeartbeat: new Date(), ipAddress: ip });
  }

  async getClientStats(): Promise<{
    total: number,
    online: number,
    offline: number,
    groups: number,
  }> {
    const [total, online, offline, groups] = await Promise.all([
      this.clientRepository.count(),
      this.clientRepository.count({ where: { status: ClientStatus.ONLINE } }),
      this.clientRepository.count({ where: { status: ClientStatus.OFFLINE } }),
      this.clientGroupRepository.count(),
    ]);

    return { total, online, offline, groups };
  }

  // ========== 客户端分组管理 ==========

  async findGroups(): Promise<ClientGroup[]> {
    return this.clientGroupRepository.find({
      relations: ['clients'],
      order: { createdAt: 'DESC' },
    });
  }

  async findGroupById(id: number): Promise<ClientGroup> {
    const group = await this.clientGroupRepository.findOne({
      where: { id },
      relations: ['clients'],
    });

    if (!group) {
      throw new NotFoundException('分组不存在');
    }

    return group;
  }

  async createGroup(createGroupDto: CreateClientGroupDto): Promise<ClientGroup> {
    // 检查分组名是否已存在
    const existingGroup = await this.clientGroupRepository.findOne({
      where: { name: createGroupDto.name },
    });

    if (existingGroup) {
      throw new BadRequestException('分组名称已存在');
    }

    const group = this.clientGroupRepository.create(createGroupDto);
    return this.clientGroupRepository.save(group);
  }

  async updateGroup(id: number, updateGroupDto: UpdateClientGroupDto): Promise<ClientGroup> {
    const group = await this.findGroupById(id);

    // 如果更新分组名，检查是否重复
    if (updateGroupDto.name && updateGroupDto.name !== group.name) {
      const existingGroup = await this.clientGroupRepository.findOne({
        where: { name: updateGroupDto.name },
      });
      if (existingGroup) {
        throw new BadRequestException('分组名称已存在');
      }
    }

    await this.clientGroupRepository.update(id, updateGroupDto);
    return this.findGroupById(id);
  }

  async removeGroup(id: number): Promise<void> {
    const group = await this.findGroupById(id);

    // 检查是否有客户端使用该分组
    const clientCount = await this.clientRepository.count({ where: { groupId: id } });
    if (clientCount > 0) {
      // 验证默认分组存在
      const defaultGroup = await this.clientGroupRepository.findOne({
        where: { id: 1 }
      });
      
      if (!defaultGroup) {
        // 如果默认分组不存在，创建它
        const newDefaultGroup = this.clientGroupRepository.create({
          name: '默认分组',
          description: '系统默认分组',
          color: '#1890ff',
          sortOrder: 0,
          isActive: true
        });
        await this.clientGroupRepository.save(newDefaultGroup);
      }

      // 将客户端转移到默认分组
      await this.clientRepository.update(
        { groupId: id },
        { groupId: 1 }
      );
    }

    await this.clientGroupRepository.remove(group);
  }

  // ========== 上下线日志 ==========

  private async logClientOnlineStatus(clientId: string, status: ClientStatus): Promise<void> {
    const log = this.clientOnlineLogRepository.create({
      clientId,
      onlineTime: status === ClientStatus.ONLINE ? new Date() : null,
      offlineTime: status === ClientStatus.ONLINE ? null : new Date(),
    });

    await this.clientOnlineLogRepository.save(log);
  }

  async getOnlineLogs(clientId: string, page = 1, pageSize = 50): Promise<{
    logs: ClientOnlineLog[],
    total: number,
  }> {
    const [logs, total] = await this.clientOnlineLogRepository.findAndCount({
      where: { clientId },
      order: { onlineTime: 'DESC' },
      take: pageSize,
      skip: (page - 1) * pageSize,
    });

    return { logs, total };
  }

  // ========== Redis 缓存操作 ==========

  async cacheClientHeartbeat(clientId: string): Promise<void> {
    await this.redisService.set(
      `client_heartbeat:${clientId}`,
      new Date().toISOString(),
      300, // 5分钟过期
    );
  }

  async getClientHeartbeat(clientId: string): Promise<Date | null> {
    const heartbeat = await this.redisService.get(`client_heartbeat:${clientId}`);
    return heartbeat ? new Date(heartbeat) : null;
  }

  async checkOfflineClients(): Promise<void> {
    // 获取所有在线客户端
    const onlineClients = await this.clientRepository.find({
      where: { status: ClientStatus.ONLINE },
      select: ['id'],
    });

    // 检查心跳超时的客户端
    for (const client of onlineClients) {
      const lastHeartbeat = await this.getClientHeartbeat(client.id);
      const now = new Date();

      if (!lastHeartbeat || (now.getTime() - lastHeartbeat.getTime()) > 5 * 60 * 1000) {
        // 5分钟无心跳，标记为离线
        await this.updateClientStatus(client.id, ClientStatus.OFFLINE);
      }
    }
  }
}