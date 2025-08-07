import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { UseGuards, Logger } from '@nestjs/common';
import { WebSocketService } from './websocket.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@WebSocketGateway(3002, {
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

  constructor(private readonly webSocketService: WebSocketService) {}

  afterInit(server: Server) {
    this.webSocketService.setServer(server);
    this.logger.log('🔌 WebSocket Gateway initialized on port 3002');
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

  handleDisconnect(client: Socket) {
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
  handleJoinClientRoom(
    @MessageBody() data: { clientId: string },
    @ConnectedSocket() client: Socket,
  ) {
    const { clientId } = data;
    client.join(`client-${clientId}`);
    
    this.logger.log(`💻 Client ${clientId} joined room`);
    
    // 发送成功消息
    client.emit('room-joined', {
      room: `client-${clientId}`,
      timestamp: new Date(),
    });
  }

  @SubscribeMessage('client-heartbeat')
  handleClientHeartbeat(
    @MessageBody() data: { clientId: string; status: any; ip?: string },
  ) {
    const { clientId, status, ip } = data;
    
    // 更新客户端状态
    this.webSocketService.emitClientStatus(clientId, {
      status,
      lastHeartbeat: new Date(),
      ip,
    });
    
    this.logger.debug(`❤️ Heartbeat from client ${clientId}`);
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