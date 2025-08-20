import { Entity, Column, Index, ManyToOne, JoinColumn, OneToMany, PrimaryColumn } from 'typeorm';
import { BaseEntity } from './base.entity';
import { ClientGroup } from './client-group.entity';
import { SecurityScreenshot } from './security-screenshot.entity';
import { ClientOnlineLog } from './client-online-log.entity';

export enum ClientStatus {
  ONLINE = 'online',
  OFFLINE = 'offline',
  ERROR = 'error',
  INSTALLING = 'installing',
}

@Entity('clients')
export class Client extends BaseEntity {
  @PrimaryColumn({
    type: 'varchar',
    length: 36,
    comment: '客户端UUID',
  })
  id: string;

  @Column({
    name: 'client_number',
    type: 'varchar',
    length: 50,
    unique: true,
    comment: '客户端编号（用户输入）',
  })
  @Index('idx_client_number')
  clientNumber: string;

  @Column({
    name: 'client_name',
    type: 'varchar',
    length: 255,
    comment: '客户端名称',
  })
  clientName: string;

  @Column({
    name: 'group_id',
    type: 'int',
    comment: '所属分组ID',
  })
  @Index('idx_group_id')
  groupId: number;

  @Column({
    name: 'computer_name',
    type: 'varchar',
    length: 255,
    nullable: true,
    comment: '计算机名称',
  })
  computerName: string;

  @Column({
    type: 'varchar',
    length: 255,
    nullable: true,
    comment: '登录用户名',
  })
  username: string;

  @Column({
    name: 'ip_address',
    type: 'varchar',
    length: 45,
    nullable: true,
    comment: 'IP地址（支持IPv6）',
  })
  ipAddress: string;

  @Column({
    name: 'mac_address',
    type: 'varchar',
    length: 17,
    nullable: true,
    comment: 'MAC地址',
  })
  macAddress: string;

  @Column({
    type: 'varchar',
    length: 255,
    nullable: true,
    comment: '操作系统版本',
  })
  osVersion: string;

  @Column({
    type: 'varchar',
    length: 50,
    nullable: true,
    comment: '客户端程序版本',
  })
  clientVersion: string;

  @Column({
    type: 'varchar',
    length: 20,
    nullable: true,
    comment: '屏幕分辨率',
  })
  screenResolution: string;

  @Column({
    type: 'varchar',
    length: 20,
    default: ClientStatus.OFFLINE,
    comment: '状态',
  })
  @Index('idx_client_status')
  status: ClientStatus;

  @Column({
    name: 'last_heartbeat',
    type: 'datetime',
    nullable: true,
    comment: '最后心跳时间',
  })
  @Index('idx_status_heartbeat')
  lastHeartbeat: Date;

  @Column({
    name: 'first_connect',
    type: 'datetime',
    nullable: true,
    comment: '首次连接时间',
  })
  firstConnect: Date;

  @Column({
    type: 'integer',
    default: 0,
    comment: '总在线时长（秒）',
  })
  totalOnlineTime: number;

  @Column({
    type: 'json',
    nullable: true,
    comment: '客户端配置（JSON格式）',
  })
  settings: Record<string, any>;

  @Column({
    type: 'tinyint',
    default: 1,
    comment: '是否激活',
  })
  isActive: boolean;

  // 关联关系
  @ManyToOne(() => ClientGroup, group => group.clients)
  @JoinColumn({ name: 'group_id' })
  group: ClientGroup;

  @OneToMany(() => SecurityScreenshot, screenshot => screenshot.client)
  securityScreenshots: SecurityScreenshot[];

  @OneToMany(() => ClientOnlineLog, log => log.client)
  onlineLogs: ClientOnlineLog[];
}
