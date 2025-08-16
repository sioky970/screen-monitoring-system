import { Injectable, Logger } from '@nestjs/common';
import { Server } from 'socket.io';

@Injectable()
export class WebSocketService {
  private server: Server;
  private logger = new Logger('WebSocketService');

  setServer(server: Server) {
    this.server = server;
    this.logger.log('WebSocket server instance set');
  }

  // ========== 客户端状态通知 ==========

  emitClientStatus(clientId: string, status: any) {
    if (!this.server) {
      this.logger.warn('WebSocket server not initialized');
      return;
    }

    const payload = {
      clientId,
      status,
      timestamp: new Date(),
    };

    // 广播给所有用户
    this.server.emit('client-status-update', payload);
    
    // 发送给特定客户端房间
    this.server.to(`client-${clientId}`).emit('status-update', payload);

    this.logger.debug(`Client status update sent for ${clientId}`);
  }

  emitClientOnline(clientId: string, clientInfo: any) {
    this.emitClientStatus(clientId, {
      ...clientInfo,
      status: 'online',
      onlineAt: new Date(),
    });
  }

  emitClientOffline(clientId: string) {
    this.emitClientStatus(clientId, {
      status: 'offline',
      offlineAt: new Date(),
    });
  }

  // ========== 安全告警通知 ==========

  emitSecurityAlert(alert: any) {
    if (!this.server) {
      this.logger.warn('WebSocket server not initialized');
      return;
    }

    const payload = {
      ...alert,
      timestamp: alert.timestamp || new Date(),
    };

    // 广播给所有用户
    this.server.emit('security-alert', payload);
    
    // 发送给特定客户端房间
    if (alert.clientId) {
      this.server.to(`client-${alert.clientId}`).emit('security-alert', payload);
    }

    this.logger.log(`Security alert emitted: ${alert.alertType || 'Unknown'}`);
  }

  emitSecurityAlertResolved(alertId: number, resolvedBy: any) {
    this.server.emit('security-alert-resolved', {
      alertId,
      resolvedBy,
      resolvedAt: new Date(),
    });
  }

  // ========== 系统通知 ==========

  emitSystemNotification(notification: any) {
    if (!this.server) {
      this.logger.warn('WebSocket server not initialized');
      return;
    }

    const payload = {
      ...notification,
      timestamp: notification.timestamp || new Date(),
    };

    this.server.emit('system-notification', payload);
    this.logger.log(`System notification sent: ${notification.title || 'Untitled'}`);
  }

  emitMaintenanceNotification(message: string) {
    this.emitSystemNotification({
      type: 'maintenance',
      title: '系统维护通知',
      content: message,
      priority: 'high',
    });
  }

  // ========== 用户定向通知 ==========

  emitToUser(userId: number, event: string, data: any) {
    if (!this.server) {
      this.logger.warn('WebSocket server not initialized');
      return;
    }

    const payload = {
      ...data,
      timestamp: data.timestamp || new Date(),
    };

    this.server.to(`user-${userId}`).emit(event, payload);
    this.logger.debug(`Event '${event}' sent to user ${userId}`);
  }

  emitToUsers(userIds: number[], event: string, data: any) {
    userIds.forEach(userId => {
      this.emitToUser(userId, event, data);
    });
  }

  // ========== 客户端定向通知 ==========

  async sendToClient(clientId: string, event: string, data: any): Promise<void> {
    if (!this.server) {
      this.logger.warn('WebSocket server not initialized');
      return;
    }

    const payload = {
      ...data,
      timestamp: data.timestamp || new Date(),
    };

    // 发送到客户端房间
    this.server.to(`client-${clientId}`).emit(event, payload);
    this.logger.debug(`Event '${event}' sent to client ${clientId}`);
  }

  async sendToClients(clientIds: string[], event: string, data: any): Promise<void> {
    for (const clientId of clientIds) {
      await this.sendToClient(clientId, event, data);
    }
  }

  // ========== 广播通知 ==========

  broadcast(event: string, data: any) {
    if (!this.server) {
      this.logger.warn('WebSocket server not initialized');
      return;
    }

    const payload = {
      ...data,
      timestamp: data.timestamp || new Date(),
    };

    this.server.emit(event, payload);
    this.logger.debug(`Broadcast event '${event}' sent`);
  }

  // ========== 实时数据推送 ==========

  emitRealtimeStats(stats: any) {
    this.broadcast('realtime-stats', stats);
  }

  emitDashboardUpdate(data: any) {
    this.broadcast('dashboard-update', data);
  }

  // ========== 房间管理 ==========

  joinRoom(socketId: string, room: string) {
    const socket = this.server.sockets.sockets.get(socketId);
    if (socket) {
      socket.join(room);
      this.logger.debug(`Socket ${socketId} joined room ${room}`);
    }
  }

  leaveRoom(socketId: string, room: string) {
    const socket = this.server.sockets.sockets.get(socketId);
    if (socket) {
      socket.leave(room);
      this.logger.debug(`Socket ${socketId} left room ${room}`);
    }
  }

  // ========== 连接状态 ==========

  getConnectedClientsCount(): number {
    return this.server ? this.server.sockets.sockets.size : 0;
  }

  getRoomsCount(): number {
    return this.server ? this.server.sockets.adapter.rooms.size : 0;
  }

  getServerStats() {
    if (!this.server) {
      return null;
    }

    return {
      connectedClients: this.getConnectedClientsCount(),
      totalRooms: this.getRoomsCount(),
      uptime: process.uptime(),
      timestamp: new Date(),
    };
  }
}