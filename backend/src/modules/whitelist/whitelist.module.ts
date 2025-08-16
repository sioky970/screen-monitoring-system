import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BlockchainWhitelist } from '../../entities/blockchain-whitelist.entity';
import { WhitelistService } from './whitelist.service';
import { WhitelistController } from './whitelist.controller';
import { WebSocketModule } from '../websocket/websocket.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([BlockchainWhitelist]),
    forwardRef(() => WebSocketModule)
  ],
  controllers: [WhitelistController],
  providers: [WhitelistService],
  exports: [WhitelistService],
})
export class WhitelistModule {}