import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BlockchainWhitelist } from '../../entities/blockchain-whitelist.entity';

@Injectable()
export class WhitelistService {
  constructor(
    @InjectRepository(BlockchainWhitelist)
    private readonly whitelistRepository: Repository<BlockchainWhitelist>,
  ) {}

  async findAll(): Promise<BlockchainWhitelist[]> {
    return this.whitelistRepository.find({
      order: { createdAt: 'DESC' },
    });
  }

  async findById(id: number): Promise<BlockchainWhitelist> {
    return this.whitelistRepository.findOne({ where: { id } });
  }
}