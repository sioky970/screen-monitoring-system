import { Injectable, NotFoundException, Inject, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BlockchainWhitelist } from '../../entities/blockchain-whitelist.entity';
import { WebSocketService } from '../websocket/websocket.service';

@Injectable()
export class WhitelistService {
  constructor(
    @InjectRepository(BlockchainWhitelist)
    private readonly whitelistRepository: Repository<BlockchainWhitelist>,
    @Inject(forwardRef(() => WebSocketService))
    private readonly webSocketService: WebSocketService,
  ) {}

  async findAll(query?: any): Promise<BlockchainWhitelist[]> {
    const queryBuilder = this.whitelistRepository.createQueryBuilder('whitelist');
    
    if (query?.search) {
      queryBuilder.where('whitelist.address LIKE :search OR whitelist.description LIKE :search', {
        search: `%${query.search}%`
      });
    }
    
    if (query?.isActive !== undefined) {
      queryBuilder.andWhere('whitelist.is_active = :isActive', { isActive: query.isActive });
    }
    
    return queryBuilder.orderBy('whitelist.created_at', 'DESC').getMany();
  }

  async findById(id: number): Promise<BlockchainWhitelist> {
    const whitelist = await this.whitelistRepository.findOne({ where: { id } });
    if (!whitelist) {
      throw new NotFoundException(`Whitelist entry with ID ${id} not found`);
    }
    return whitelist;
  }

  async getStats() {
    const total = await this.whitelistRepository.count();
    const active = await this.whitelistRepository.count({ where: { isActive: true } });
    const inactive = total - active;
    
    return {
      total,
      active,
      inactive
    };
  }

  async create(createWhitelistDto: any, currentUserId: number): Promise<BlockchainWhitelist> {
    // Generate addressHash if not provided
    const addressHash = Buffer.from(createWhitelistDto.address, 'utf8').toString('base64').substring(0, 64);

    const whitelist = this.whitelistRepository.create({
      ...createWhitelistDto,
      addressHash,
      isActive: true,
      createdBy: currentUserId || 1 // Default to user ID 1 if not provided
    });
    const savedWhitelist = await this.whitelistRepository.save(whitelist);
    const result = Array.isArray(savedWhitelist) ? savedWhitelist[0] : savedWhitelist;
    
    // 广播白名单更新
    await this.broadcastWhitelistUpdate('created', result);
    
    return result;
  }

  async update(id: number, updateWhitelistDto: any, userId: number): Promise<BlockchainWhitelist> {
    const whitelist = await this.findById(id);
    
    Object.assign(whitelist, updateWhitelistDto);
    
    const result = await this.whitelistRepository.save(whitelist);
    
    // 广播白名单更新
    await this.broadcastWhitelistUpdate('updated', result);
    
    return result;
  }

  async updateStatus(id: number, isActive: boolean, userId: number): Promise<BlockchainWhitelist> {
    const whitelist = await this.findById(id);
    
    whitelist.isActive = isActive;
    
    const result = await this.whitelistRepository.save(whitelist);
    
    // 广播白名单更新
    await this.broadcastWhitelistUpdate('status_updated', result);
    
    return result;
  }

  async remove(id: number, userId: number): Promise<void> {
    const whitelist = await this.findById(id);
    await this.whitelistRepository.remove(whitelist);
    
    // 广播白名单更新
    await this.broadcastWhitelistUpdate('deleted', { id, address: whitelist.address });
  }

  async batchDelete(ids: number[], userId: number): Promise<void> {
    // 获取要删除的地址信息用于广播
    const whitelistsToDelete = await this.whitelistRepository.findByIds(ids);
    
    await this.whitelistRepository.delete(ids);
    
    // 广播批量删除
    await this.broadcastWhitelistUpdate('batch_deleted', { 
      ids, 
      addresses: whitelistsToDelete.map(w => w.address) 
    });
  }

  async batchImport(addresses: string[], userId: number): Promise<BlockchainWhitelist[]> {
    const results = [];
    const skippedAddresses = [];
    
    for (const address of addresses) {
      try {
        // Ensure address is a string and generate hash
        const addressStr = typeof address === 'string' ? address : String(address);
        const addressHash = Buffer.from(addressStr, 'utf8').toString('base64').substring(0, 64);

        // Check if address already exists
        const existingWhitelist = await this.whitelistRepository.findOne({
          where: { addressHash }
        });

        if (existingWhitelist) {
          skippedAddresses.push(addressStr);
          continue;
        }

        // Create new whitelist entry
        const whitelist = this.whitelistRepository.create({
          address: addressStr,
          addressHash,
          addressType: 'UNKNOWN', // Default type, should be determined by address format
          isActive: true,
          createdBy: userId || 1 // Default to user ID 1 if not provided
        });

        const savedWhitelist = await this.whitelistRepository.save(whitelist);
        results.push(savedWhitelist);
      } catch (error) {
        console.error(`Failed to import address ${address}:`, error);
        skippedAddresses.push(address);
      }
    }
    
    // 广播批量导入
    await this.broadcastWhitelistUpdate('batch_imported', {
      count: results.length,
      skipped: skippedAddresses.length,
      addresses: results.map(w => w.address),
      skippedAddresses
    });
    
    return results;
  }

  /**
   * 获取所有激活的白名单地址（供客户端检测使用）
   * 返回简化的地址列表，减少网络传输
   */
  async getActiveAddresses(): Promise<{ addresses: string[], lastUpdated: Date }> {
    console.log('🔍 Fetching active addresses from database');
    const activeWhitelists = await this.whitelistRepository.find({
      where: { isActive: true },
      select: ['address'],
      order: { createdAt: 'DESC' }
    });
    
    console.log(`📊 Found ${activeWhitelists.length} active whitelist addresses`);
    console.log('🔍 Active addresses:', activeWhitelists.map(item => item.address));

    const result = {
      addresses: activeWhitelists.map(item => item.address),
      lastUpdated: new Date()
    };
    
    return result;
  }



  /**
   * 广播白名单更新事件
   * @param action 操作类型：created, updated, deleted, status_updated, batch_deleted
   * @param data 相关数据
   */
  private async broadcastWhitelistUpdate(action: string, data: any): Promise<void> {
    try {
      // 获取最新的激活地址列表
      const activeAddresses = await this.getActiveAddresses();
      
      // 广播给所有客户端
      this.webSocketService.broadcast('whitelist-updated', {
        action,
        data,
        activeAddresses: activeAddresses.addresses,
        lastUpdated: activeAddresses.lastUpdated,
        timestamp: new Date()
      });
      
      console.log(`🔄 Whitelist ${action} broadcasted to all clients`);
    } catch (error) {
      console.error('Failed to broadcast whitelist update:', error);
    }
  }
}