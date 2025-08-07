import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Client } from '../../entities/client.entity';
import { ClientGroup } from '../../entities/client-group.entity';
import { ClientOnlineLog } from '../../entities/client-online-log.entity';
import { ClientsService } from './clients.service';
import { ClientsController } from './clients.controller';
import { WebSocketModule } from '../websocket/websocket.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Client, ClientGroup, ClientOnlineLog]),
    WebSocketModule,
  ],
  controllers: [ClientsController],
  providers: [ClientsService],
  exports: [ClientsService],
})
export class ClientsModule {}