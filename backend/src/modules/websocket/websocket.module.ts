import { Module, forwardRef } from '@nestjs/common';
import { WebSocketGateway } from './websocket.gateway';
import { WebSocketService } from './websocket.service';
import { ClientsModule } from '../clients/clients.module';
import { WhitelistModule } from '../whitelist/whitelist.module';

@Module({
  imports: [forwardRef(() => ClientsModule), WhitelistModule],
  providers: [WebSocketGateway, WebSocketService],
  exports: [WebSocketService],
})
export class WebSocketModule {}