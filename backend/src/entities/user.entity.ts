import { Entity, Column, Index, OneToMany } from 'typeorm';
import { Exclude } from 'class-transformer';
import { BaseEntityWithId } from './base.entity';
import { SystemLog } from './system-log.entity';
import { Notification } from './notification.entity';

export enum UserRole {
  ADMIN = 'admin',
  OPERATOR = 'operator',
  VIEWER = 'viewer',
}

@Entity('system_users')
export class User extends BaseEntityWithId {
  @Column({
    type: 'varchar',
    length: 50,
    unique: true,
    comment: '用户名',
  })
  @Index('idx_username')
  username: string;

  @Column({
    type: 'varchar',
    length: 255,
    comment: '密码哈希',
  })
  @Exclude()
  password: string;

  @Column({
    type: 'varchar',
    length: 100,
    nullable: true,
    comment: '真实姓名',
  })
  realName: string;

  @Column({
    type: 'varchar',
    length: 255,
    unique: true,
    nullable: true,
    comment: '邮箱',
  })
  email: string;

  @Column({
    type: 'varchar',
    length: 20,
    nullable: true,
    comment: '手机号',
  })
  phone: string;

  @Column({
    type: 'enum',
    enum: UserRole,
    default: UserRole.VIEWER,
    comment: '用户角色',
  })
  @Index('idx_role_active')
  role: UserRole;

  @Column({
    type: 'json',
    nullable: true,
    comment: '权限配置（JSON格式）',
  })
  permissions: Record<string, string[]>;

  @Column({
    type: 'tinyint',
    default: 1,
    comment: '是否激活',
  })
  @Index('idx_role_active')
  isActive: boolean;

  @Column({
    type: 'timestamp',
    nullable: true,
    comment: '最后登录时间',
  })
  lastLogin: Date;

  @Column({
    type: 'int',
    default: 0,
    comment: '登录次数',
  })
  loginCount: number;

  // 关联关系
  @OneToMany(() => SystemLog, (log) => log.user)
  logs: SystemLog[];

  @OneToMany(() => Notification, (notification) => notification.user)
  notifications: Notification[];
}