import { Entity, Column, Index, ManyToOne, JoinColumn, PrimaryGeneratedColumn } from 'typeorm';
import { BaseEntity } from './base.entity';
import { Client } from './client.entity';

@Entity('client_online_logs')
export class ClientOnlineLog extends BaseEntity {
  @PrimaryGeneratedColumn('increment', { type: 'bigint' })
  id: number;

  @Column({
    type: 'char',
    length: 36,
    comment: '客户端ID',
  })
  @Index('idx_client_time')
  clientId: string;

  @Column({
    type: 'timestamp',
    comment: '上线时间',
  })
  @Index('idx_client_time')
  onlineTime: Date;

  @Column({
    type: 'timestamp',
    nullable: true,
    comment: '下线时间',
  })
  offlineTime: Date;

  @Column({
    type: 'int',
    nullable: true,
    comment: '在线时长（秒）',
  })
  @Index('idx_duration')
  duration: number;

  @Column({
    type: 'varchar',
    length: 45,
    nullable: true,
    comment: 'IP地址',
  })
  ipAddress: string;

  @Column({
    type: 'varchar',
    length: 100,
    nullable: true,
    comment: '断开原因',
  })
  disconnectReason: string;

  // 关联关系
  @ManyToOne(() => Client, (client) => client.onlineLogs, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'clientId' })
  client: Client;
}