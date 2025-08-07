import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like, In } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { Client, ClientStatus } from '../../entities/client.entity';
import { ClientGroup } from '../../entities/client-group.entity';
import { ClientOnlineLog } from '../../entities/client-online-log.entity';
import { CreateClientDto } from './dto/create-client.dto';
import { UpdateClientDto } from './dto/update-client.dto';
import { CreateClientGroupDto } from './dto/create-client-group.dto';
import { UpdateClientGroupDto } from './dto/update-client-group.dto';
import { QueryClientsDto } from './dto/query-clients.dto';
import { WebSocketService } from '../websocket/websocket.service';
import { RedisService } from '../../common/services/redis.service';

@Injectable()
export class ClientsService {
  constructor(
    @InjectRepository(Client)
    private readonly clientRepository: Repository<Client>,
    @InjectRepository(ClientGroup)
    private readonly clientGroupRepository: Repository<ClientGroup>,
    @InjectRepository(ClientOnlineLog)
    private readonly clientOnlineLogRepository: Repository<ClientOnlineLog>,
    private readonly webSocketService: WebSocketService,
    private readonly redisService: RedisService,
  ) {}

  // ========== 客户端管理 ==========

  async findAll(query: QueryClientsDto = {}): Promise<{
    clients: Client[],
    total: number,
    page: number,
    pageSize: number,
  }> {
    const { page = 1, pageSize = 20, search, status, groupId } = query;
    
    const queryBuilder = this.clientRepository.createQueryBuilder('client')
      .leftJoinAndSelect('client.group', 'group');

    if (search) {
      queryBuilder.andWhere(
        '(client.clientNumber LIKE :search OR client.computerName LIKE :search OR client.ip LIKE :search)',
        { search: `%${search}%` }
      );
    }

    if (status) {
      queryBuilder.andWhere('client.status = :status', { status });
    }

    if (groupId) {
      queryBuilder.andWhere('client.groupId = :groupId', { groupId });
    }

    const [clients, total] = await queryBuilder
      .orderBy('client.lastOnline', 'DESC')
      .take(pageSize)
      .skip((page - 1) * pageSize)
      .getManyAndCount();

    return {
      clients,
      total,
      page,
      pageSize,
    };
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

  async create(createClientDto: CreateClientDto): Promise<Client> {
    // 检查客户端编号是否已存在
    const existingClient = await this.clientRepository.findOne({
      where: { clientNumber: createClientDto.clientNumber },
    });

    if (existingClient) {
      throw new BadRequestException('客户端编号已存在');
    }

    // 验证分组是否存在
    if (createClientDto.groupId) {
      const group = await this.clientGroupRepository.findOne({
        where: { id: createClientDto.groupId },
      });
      if (!group) {
        throw new BadRequestException('指定的分组不存在');
      }
    }

    const client = this.clientRepository.create({
      ...createClientDto,
      id: uuidv4(),
      status: ClientStatus.OFFLINE,
    });

    const savedClient = await this.clientRepository.save(client);
    
    // 获取完整信息返回
    return this.findById(savedClient.id);
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

    // 验证分组是否存在
    if (updateClientDto.groupId && updateClientDto.groupId !== client.groupId) {
      const group = await this.clientGroupRepository.findOne({
        where: { id: updateClientDto.groupId },
      });
      if (!group) {
        throw new BadRequestException('指定的分组不存在');
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
      lastOnline: new Date(),
    };

    if (ip) {
      updateData.ip = ip;
    }

    await this.clientRepository.update(clientId, updateData);

    // 记录上下线日志
    await this.logClientOnlineStatus(clientId, status);

    // WebSocket 通知前端
    this.webSocketService.emitClientStatus(clientId, { status, lastOnline: new Date(), ip });
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
      throw new BadRequestException('该分组下还有客户端，无法删除');
    }

    await this.clientGroupRepository.remove(group);
  }

  // ========== 上下线日志 ==========

  private async logClientOnlineStatus(clientId: string, status: ClientStatus): Promise<void> {
    const log = this.clientOnlineLogRepository.create({
      clientId,
      status: status === ClientStatus.ONLINE ? 'online' : 'offline',
      timestamp: new Date(),
    });

    await this.clientOnlineLogRepository.save(log);
  }

  async getOnlineLogs(clientId: string, page = 1, pageSize = 50): Promise<{
    logs: ClientOnlineLog[],
    total: number,
  }> {
    const [logs, total] = await this.clientOnlineLogRepository.findAndCount({
      where: { clientId },
      order: { timestamp: 'DESC' },
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