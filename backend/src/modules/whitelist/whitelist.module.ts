import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BlockchainWhitelist } from '../../entities/blockchain-whitelist.entity';
import { WhitelistService } from './whitelist.service';
import { WhitelistController } from './whitelist.controller';

@Module({
  imports: [TypeOrmModule.forFeature([BlockchainWhitelist])],
  controllers: [WhitelistController],
  providers: [WhitelistService],
  exports: [WhitelistService],
})
export class WhitelistModule {}