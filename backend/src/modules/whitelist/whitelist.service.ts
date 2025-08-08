import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BlockchainWhitelist } from '../../entities/blockchain-whitelist.entity';

@Injectable()
export class WhitelistService {
  constructor(
    @InjectRepository(BlockchainWhitelist)
    private readonly whitelistRepository: Repository<BlockchainWhitelist>,
  ) {}

  async findAll(query?: any): Promise<BlockchainWhitelist[]> {
    const queryBuilder = this.whitelistRepository.createQueryBuilder('whitelist');
    
    if (query?.search) {
      queryBuilder.where('whitelist.address LIKE :search OR whitelist.description LIKE :search', {
        search: `%${query.search}%`
      });
    }
    
    if (query?.isActive !== undefined) {
      queryBuilder.andWhere('whitelist.isActive = :isActive', { isActive: query.isActive });
    }
    
    return queryBuilder.orderBy('whitelist.createdAt', 'DESC').getMany();
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
    const whitelist = this.whitelistRepository.create(createWhitelistDto);
    const savedWhitelist = await this.whitelistRepository.save(whitelist);
    return Array.isArray(savedWhitelist) ? savedWhitelist[0] : savedWhitelist;
  }

  async update(id: number, updateWhitelistDto: any, userId: number): Promise<BlockchainWhitelist> {
    const whitelist = await this.findById(id);
    
    Object.assign(whitelist, updateWhitelistDto);
    
    return this.whitelistRepository.save(whitelist);
  }

  async updateStatus(id: number, isActive: boolean, userId: number): Promise<BlockchainWhitelist> {
    const whitelist = await this.findById(id);
    
    whitelist.isActive = isActive;
    
    return this.whitelistRepository.save(whitelist);
  }

  async remove(id: number, userId: number): Promise<void> {
    const whitelist = await this.findById(id);
    await this.whitelistRepository.remove(whitelist);
  }

  async batchDelete(ids: number[], userId: number): Promise<void> {
    await this.whitelistRepository.delete(ids);
  }

  async batchImport(addresses: string[], userId: number): Promise<BlockchainWhitelist[]> {
    const whitelists = addresses.map(address => {
      // Generate a simple hash for addressHash (in real app, use proper crypto hash)
      const addressHash = Buffer.from(address).toString('base64').substring(0, 64);
      
      return this.whitelistRepository.create({
        address,
        addressHash,
        addressType: 'UNKNOWN', // Default type, should be determined by address format
        isActive: true,
        createdBy: userId
      });
    });
    
    return await this.whitelistRepository.save(whitelists);
  }
}