import { Entity, Column, Index, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntityWithId } from './base.entity';
import { Client } from './client.entity';

@Entity('client_configs')
export class ClientConfig extends BaseEntityWithId {
  @Column({
    type: 'varchar',
    length: 36,
    comment: '客户端ID',
  })
  @Index('idx_client_config_client_id')
  clientId: string;

  @Column({
    type: 'int',
    default: 15,
    comment: '截图上传间隔（秒）',
  })
  screenshotInterval: number;

  @Column({
    type: 'int',
    default: 30,
    comment: '心跳间隔（秒）',
  })
  heartbeatInterval: number;

  @Column({
    type: 'int',
    default: 300,
    comment: '白名单同步间隔（秒）',
  })
  whitelistSyncInterval: number;

  @Column({
    type: 'int',
    default: 1024,
    comment: '图像压缩大小限制（KB）',
  })
  imageCompressionLimit: number;

  @Column({
    type: 'int',
    default: 80,
    comment: '图像质量（1-100）',
  })
  imageQuality: number;

  @Column({
    type: 'tinyint',
    default: 1,
    comment: '发现违规时是否清空剪贴板（1=是，0=否）',
  })
  clearClipboardOnViolation: boolean;

  @Column({
    type: 'tinyint',
    default: 1,
    comment: '是否启用实时监控（1=是，0=否）',
  })
  enableRealTimeMonitoring: boolean;

  @Column({
    type: 'tinyint',
    default: 1,
    comment: '是否启用剪贴板监控（1=是，0=否）',
  })
  enableClipboardMonitoring: boolean;

  @Column({
    type: 'tinyint',
    default: 1,
    comment: '是否启用区块链地址检测（1=是，0=否）',
  })
  enableBlockchainDetection: boolean;

  @Column({
    type: 'int',
    default: 3,
    comment: '上传失败最大重试次数',
  })
  maxRetryAttempts: number;

  @Column({
    type: 'int',
    default: 30000,
    comment: '网络请求超时时间（毫秒）',
  })
  networkTimeout: number;

  @Column({
    type: 'tinyint',
    default: 1,
    comment: '是否启用自动重连（1=是，0=否）',
  })
  enableAutoReconnect: boolean;

  @Column({
    type: 'int',
    default: 5000,
    comment: '重连间隔（毫秒）',
  })
  reconnectInterval: number;

  @Column({
    type: 'json',
    nullable: true,
    comment: '扩展配置（JSON格式）',
  })
  extendedSettings: Record<string, any>;

  @Column({
    type: 'tinyint',
    default: 1,
    comment: '配置是否激活（1=是，0=否）',
  })
  isActive: boolean;

  @Column({
    type: 'varchar',
    length: 255,
    nullable: true,
    comment: '配置备注',
  })
  remark: string;

  // 关联关系
  @ManyToOne(() => Client, client => client.id)
  @JoinColumn({ name: 'client_id' })
  client: Client;
}
