import { Entity, Column, Index, ManyToOne, JoinColumn, PrimaryGeneratedColumn } from 'typeorm';
import { BaseEntity } from './base.entity';
import { User } from './user.entity';

export enum NotificationType {
  INFO = 'info',
  WARNING = 'warning',
  ERROR = 'error',
  SUCCESS = 'success',
}

@Entity('notifications')
export class Notification extends BaseEntity {
  @PrimaryGeneratedColumn('increment', { type: 'bigint' })
  id: number;

  @Column({
    type: 'int',
    nullable: true,
    comment: '目标用户ID（NULL表示系统通知）',
  })
  @Index('idx_user_read')
  userId: number;

  @Column({
    type: 'varchar',
    length: 255,
    comment: '通知标题',
  })
  title: string;

  @Column({
    type: 'text',
    nullable: true,
    comment: '通知内容',
  })
  content: string;

  @Column({
    type: 'enum',
    enum: NotificationType,
    default: NotificationType.INFO,
    comment: '通知类型',
  })
  type: NotificationType;

  @Column({
    type: 'varchar',
    length: 50,
    nullable: true,
    comment: '通知分类',
  })
  category: string;

  @Column({
    type: 'varchar',
    length: 50,
    nullable: true,
    comment: '关联对象类型',
  })
  relatedType: string;

  @Column({
    type: 'varchar',
    length: 50,
    nullable: true,
    comment: '关联对象ID',
  })
  relatedId: string;

  @Column({
    type: 'tinyint',
    default: 0,
    comment: '是否已读',
  })
  @Index('idx_user_read')
  isRead: boolean;

  @Column({
    type: 'tinyint',
    default: 0,
    comment: '是否为系统通知',
  })
  @Index('idx_system_expires')
  isSystem: boolean;

  @Column({
    type: 'timestamp',
    nullable: true,
    comment: '过期时间',
  })
  @Index('idx_system_expires')
  expiresAt: Date;

  // 关联关系
  @ManyToOne(() => User, (user) => user.notifications)
  @JoinColumn({ name: 'userId' })
  user: User;
}