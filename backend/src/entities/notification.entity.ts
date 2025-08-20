import { Entity, Column, Index, PrimaryGeneratedColumn } from 'typeorm';
import { BaseEntity } from './base.entity';

export enum NotificationType {
  INFO = 'info',
  WARNING = 'warning',
  ERROR = 'error',
  SUCCESS = 'success',
}

@Entity('notifications')
export class Notification extends BaseEntity {
  @PrimaryGeneratedColumn('increment')
  id: number;

  @Column({
    type: 'int',
    nullable: true,
    comment: '目标用户ID（NULL表示系统通知）',
  })
  @Index('idx_notification_user_id')
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
    type: 'varchar',
    length: 20,
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
  @Index('idx_is_read')
  isRead: boolean;

  @Column({
    type: 'tinyint',
    default: 0,
    comment: '是否为系统通知',
  })
  @Index('idx_is_system')
  isSystem: boolean;

  @Column({
    type: 'datetime',
    nullable: true,
    comment: '过期时间',
  })
  @Index('idx_expires_at')
  expiresAt: Date;
}
