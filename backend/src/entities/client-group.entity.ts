import { Entity, Column, Index, OneToMany } from 'typeorm';
import { BaseEntityWithId } from './base.entity';
import { Client } from './client.entity';

@Entity('client_groups')
export class ClientGroup extends BaseEntityWithId {
  @Column({
    type: 'varchar',
    length: 100,
    unique: true,
    comment: '分组名称',
  })
  name: string;

  @Column({
    type: 'text',
    nullable: true,
    comment: '分组描述',
  })
  description: string;

  @Column({
    type: 'varchar',
    length: 7,
    default: '#1890ff',
    comment: '分组颜色（十六进制）',
  })
  color: string;

  @Column({
    type: 'int',
    default: 0,
    comment: '排序序号',
  })
  @Index('idx_sort_order')
  sortOrder: number;

  @Column({
    type: 'tinyint',
    default: 1,
    comment: '是否激活',
  })
  @Index('idx_is_active')
  isActive: boolean;

  @Column({
    type: 'int',
    nullable: true,
    comment: '创建人用户ID',
  })
  createdBy: number;

  // 关联关系
  @OneToMany(() => Client, (client) => client.group)
  clients: Client[];
}