import {
  WebSocketGateway as WSGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { UseGuards, Logger, Inject, forwardRef } from '@nestjs/common';
import { WebSocketService } from './websocket.service';
import { ClientsService } from '../clients/clients.service';
import { ClientConfigService } from '../clients/client-config.service';
import { WhitelistService } from '../whitelist/whitelist.service';
import { ClientStatus } from '../../entities/client.entity';


@WSGateway({
  cors: {
    origin: process.env.CORS_ORIGIN || '*',
    methods: ['GET', 'POST'],
    credentials: true,
  },
  namespace: '/monitor',
  transports: ['websocket'],
})
export class WebSocketGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private logger = new Logger('WebSocketGateway');
  private connectedClients = new Map<string, Socket>();
  private userSockets = new Map<number, Set<string>>();
  // 记录 socket 与业务客户端ID 的映射，便于断线判定离线
  private socketClientMap = new Map<string, string>();
  private clientSockets = new Map<string, Set<string>>();

  constructor(
    private readonly webSocketService: WebSocketService,
    @Inject(forwardRef(() => ClientsService))
    private readonly clientsService: ClientsService,
    @Inject(forwardRef(() => ClientConfigService))
    private readonly clientConfigService: ClientConfigService,
    @Inject(forwardRef(() => WhitelistService))
    private readonly whitelistService: WhitelistService,
  ) {}

  afterInit(server: Server) {
    this.webSocketService.setServer(server);
    this.logger.log(`🔌 WebSocket Gateway initialized (attached to HTTP server)`);
  }

  handleConnection(client: Socket) {
    this.connectedClients.set(client.id, client);
    this.logger.log(`👤 Client connected: ${client.id}`);

    // 发送连接成功消息
    client.emit('connection-success', {
      clientId: client.id,
      timestamp: new Date(),
    });
  }

  async handleDisconnect(client: Socket) {
    this.connectedClients.delete(client.id);

    // 从用户房间中移除
    this.userSockets.forEach((sockets, userId) => {
      if (sockets.has(client.id)) {
        sockets.delete(client.id);
        if (sockets.size === 0) {
          this.userSockets.delete(userId);
        }
      }
    });

    // 从客户端映射中移除，并在最后一个 socket 断开时将该客户端标记为离线
    const clientId = this.socketClientMap.get(client.id);
    if (clientId) {
      this.socketClientMap.delete(client.id);
      const set = this.clientSockets.get(clientId);
      if (set) {
        set.delete(client.id);
        if (set.size === 0) {
          this.clientSockets.delete(clientId);
          // 最后一个连接断开，标记离线并广播
          try {
            await this.clientsService.updateClientStatus(clientId, ClientStatus.OFFLINE);
            this.logger.log(`📴 Client ${clientId} marked OFFLINE on disconnect`);
          } catch (e) {
            this.logger.error(`Failed to mark client ${clientId} OFFLINE on disconnect`, e as any);
          }
        }
      }
    }

    this.logger.log(`👤 Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('join-user-room')
  handleJoinUserRoom(
    @MessageBody() data: { userId: number },
    @ConnectedSocket() client: Socket,
  ) {
    const { userId } = data;

    // 加入房间
    client.join(`user-${userId}`);

    // 记录用户客户端
    if (!this.userSockets.has(userId)) {
      this.userSockets.set(userId, new Set());
    }
    this.userSockets.get(userId)!.add(client.id);

    this.logger.log(`👤 User ${userId} joined room`);

    // 发送成功消息
    client.emit('room-joined', {
      room: `user-${userId}`,
      timestamp: new Date(),
    });
  }

  @SubscribeMessage('join-client-room')
  async handleJoinClientRoom(
    @MessageBody() data: { clientId: string },
    @ConnectedSocket() client: Socket,
  ) {
    const { clientId } = data;
    client.join(`client-${clientId}`);

    // 建立 socket 与客户端ID 的映射，支持同一客户端多连接
    this.socketClientMap.set(client.id, clientId);
    if (!this.clientSockets.has(clientId)) {
      this.clientSockets.set(clientId, new Set());
    }
    this.clientSockets.get(clientId)!.add(client.id);

    this.logger.log(`💻 Client ${clientId} joined room`);

    // 发送成功消息
    client.emit('room-joined', {
      room: `client-${clientId}`,
      timestamp: new Date(),
    });

    // 加速在线识别：加入房间即标记为在线（不必等心跳）
    try {
      await this.clientsService.updateClientStatus(clientId, ClientStatus.ONLINE);
    } catch (e) {
      this.logger.error(`Failed to mark client ${clientId} ONLINE on join`, e as any);
    }
  }

  @SubscribeMessage('client-heartbeat')
  async handleClientHeartbeat(
    @MessageBody() data: { clientId: string; status: any; ip?: string },
  ) {
    const { clientId, status, ip } = data;

    try {
      // 更新数据库中的客户端状态
      await this.clientsService.updateClientStatus(
        clientId,
        ClientStatus.ONLINE, // 收到心跳说明客户端在线
        ip
      );

      this.logger.debug(`❤️ Heartbeat from client ${clientId}`);
    } catch (error) {
      this.logger.error(`Failed to update client status for ${clientId}:`, error);
    }
  }

  @SubscribeMessage('request-client-list')
  handleRequestClientList(
    @ConnectedSocket() client: Socket,
  ) {
    // 可以在这里调用服务获取客户端列表
    client.emit('client-list-response', {
      timestamp: new Date(),
      // clients: await this.clientsService.findAll(),
    });
  }

  @SubscribeMessage('request-security-stats')
  handleRequestSecurityStats(
    @ConnectedSocket() client: Socket,
  ) {
    // 可以在这里调用服务获取安全统计
    client.emit('security-stats-response', {
      timestamp: new Date(),
      // stats: await this.securityService.getSecurityStats(),
    });
  }

  @SubscribeMessage('request-whitelist')
  async handleRequestWhitelist(
    @MessageBody() data: { clientId?: string },
    @ConnectedSocket() client: Socket,
  ) {
    try {
      const activeAddresses = await this.whitelistService.getActiveAddresses();
      
      client.emit('whitelist-response', {
        addresses: activeAddresses.addresses,
        lastUpdated: activeAddresses.lastUpdated,
        timestamp: new Date(),
      });
      
      this.logger.debug(`📋 Whitelist sent to client ${data.clientId || client.id}`);
    } catch (error) {
      this.logger.error('Failed to send whitelist to client:', error);
      client.emit('whitelist-error', {
        message: 'Failed to retrieve whitelist',
        timestamp: new Date(),
      });
    }
  }

  @SubscribeMessage('request-config')
  async handleRequestConfig(
    @MessageBody() data: { clientId: string },
    @ConnectedSocket() client: Socket,
  ) {
    try {
      const config = await this.clientConfigService.getClientEffectiveConfig(data.clientId);
      
      client.emit('config-response', {
        config,
        timestamp: new Date(),
      });
      
      this.logger.debug(`⚙️ Config sent to client ${data.clientId}`);
    } catch (error) {
      this.logger.error('Failed to send config to client:', error);
      client.emit('config-error', {
        message: 'Failed to retrieve config',
        timestamp: new Date(),
      });
    }
  }


  @SubscribeMessage('screenshot-uploaded')
  handleScreenshotUploaded(
    @MessageBody() data: { clientId: string; screenshotUrl: string; timestamp?: string },
    @ConnectedSocket() client: Socket,
  ) {
    const payload = {
      clientId: data.clientId,
      screenshotUrl: data.screenshotUrl,
      timestamp: data.timestamp || new Date(),
    };
    // 广播给所有监听者
    this.server.emit('screenshot-update', payload);
    // 也发给该客户端房间
    if (data.clientId) {
      this.server.to(`client-${data.clientId}`).emit('screenshot-update', payload);
    }
    this.logger.debug(`🖼️ Screenshot updated for client ${data.clientId}`);
  }

  // 获取在线统计信息
  getOnlineStats() {
    return {
      totalConnections: this.connectedClients.size,
      connectedUsers: this.userSockets.size,
      rooms: this.server.sockets.adapter.rooms.size,
    };
  }

  // 获取用户在线状态
  isUserOnline(userId: number): boolean {
    const userSockets = this.userSockets.get(userId);
    return userSockets ? userSockets.size > 0 : false;
  }

  // 强制断开用户连接
  disconnectUser(userId: number): void {
    const userSockets = this.userSockets.get(userId);
    if (userSockets) {
      userSockets.forEach(socketId => {
        const socket = this.connectedClients.get(socketId);
        if (socket) {
          socket.disconnect(true);
        }
      });
    }
  }
}