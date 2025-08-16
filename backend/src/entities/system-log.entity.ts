import { Entity, Column, Index, PrimaryGeneratedColumn } from 'typeorm';
import { BaseEntity } from './base.entity';

@Entity('system_logs')
export class SystemLog extends BaseEntity {
  @PrimaryGeneratedColumn('increment')
  id: number;

  @Column({
    type: 'int',
    nullable: true,
    comment: '操作用户ID',
  })
  @Index('idx_user_id')
  userId: number;

  @Column({
    type: 'varchar',
    length: 36,
    nullable: true,
    comment: '相关客户端ID',
  })
  @Index('idx_log_client_id')
  clientId: string;

  @Column({
    type: 'varchar',
    length: 100,
    comment: '操作类型',
  })
  @Index('idx_action_type')
  @Index('idx_action_time')
  action: string;

  @Column({
    type: 'varchar',
    length: 50,
    nullable: true,
    comment: '目标类型（client/whitelist/user等）',
  })
  targetType: string;

  @Column({
    type: 'varchar',
    length: 50,
    nullable: true,
    comment: '目标ID',
  })
  targetId: string;

  @Column({
    type: 'text',
    nullable: true,
    comment: '操作描述',
  })
  description: string;

  @Column({
    type: 'varchar',
    length: 45,
    nullable: true,
    comment: '操作者IP',
  })
  ipAddress: string;

  @Column({
    type: 'text',
    nullable: true,
    comment: '用户代理',
  })
  userAgent: string;

  @Column({
    type: 'json',
    nullable: true,
    comment: '额外数据（JSON格式）',
  })
  extraData: Record<string, any>;


}