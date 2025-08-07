import { Entity, Column, Index, ManyToOne, JoinColumn, PrimaryGeneratedColumn } from 'typeorm';
import { BaseEntity } from './base.entity';
import { User } from './user.entity';

@Entity('system_logs')
export class SystemLog extends BaseEntity {
  @PrimaryGeneratedColumn('increment', { type: 'bigint' })
  id: number;

  @Column({
    type: 'int',
    nullable: true,
    comment: '操作用户ID',
  })
  @Index('idx_user_action')
  userId: number;

  @Column({
    type: 'char',
    length: 36,
    nullable: true,
    comment: '相关客户端ID',
  })
  @Index('idx_client_time')
  clientId: string;

  @Column({
    type: 'varchar',
    length: 100,
    comment: '操作类型',
  })
  @Index('idx_user_action')
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

  // 关联关系
  @ManyToOne(() => User, (user) => user.logs)
  @JoinColumn({ name: 'userId' })
  user: User;
}