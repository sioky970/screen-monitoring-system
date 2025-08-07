import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SecurityScreenshot } from '../../entities/security-screenshot.entity';
import { Notification } from '../../entities/notification.entity';
import { SystemLog } from '../../entities/system-log.entity';
import { BlockchainWhitelist } from '../../entities/blockchain-whitelist.entity';
import { Client } from '../../entities/client.entity';
import { SecurityService } from './security.service';
import { SecurityController } from './security.controller';
import { WebSocketModule } from '../websocket/websocket.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      SecurityScreenshot,
      Notification,
      SystemLog,
      BlockchainWhitelist,
      Client,
    ]),
    WebSocketModule,
  ],
  controllers: [SecurityController],
  providers: [SecurityService],
  exports: [SecurityService],
})
export class SecurityModule {}