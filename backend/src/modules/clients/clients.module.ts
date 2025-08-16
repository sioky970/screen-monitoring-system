import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Client } from '../../entities/client.entity';
import { ClientGroup } from '../../entities/client-group.entity';
import { ClientOnlineLog } from '../../entities/client-online-log.entity';
import { SecurityScreenshot } from '../../entities/security-screenshot.entity';
import { ClientConfig } from '../../entities/client-config.entity';
import { ClientsService } from './clients.service';
import { ClientConfigService } from './client-config.service';
import { ClientsController } from './clients.controller';
import { ClientConfigController } from './client-config.controller';
import { WebSocketModule } from '../websocket/websocket.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Client, ClientGroup, ClientOnlineLog, SecurityScreenshot, ClientConfig]),
    forwardRef(() => WebSocketModule),
  ],
  controllers: [ClientsController, ClientConfigController],
  providers: [ClientsService, ClientConfigService],
  exports: [ClientsService, ClientConfigService],
})
export class ClientsModule {}