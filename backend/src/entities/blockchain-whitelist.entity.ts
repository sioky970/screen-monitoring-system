import { Entity, Column, Index, PrimaryGeneratedColumn } from 'typeorm';
import { BaseEntity } from './base.entity';

@Entity('blockchain_whitelist')
export class BlockchainWhitelist extends BaseEntity {
  @PrimaryGeneratedColumn('increment')
  id: number;

  @Column({
    type: 'text',
    comment: '区块链地址',
  })
  address: string;

  @Column({
    type: 'varchar',
    length: 64,
    unique: true,
    comment: '地址哈希值（用于去重）',
  })
  @Index('idx_address_hash')
  addressHash: string;

  @Column({
    type: 'varchar',
    length: 20,
    comment: '地址类型（BTC/ETH/TRC20等）',
  })
  @Index('idx_address_type')
  addressType: string;

  @Column({
    type: 'varchar',
    length: 255,
    nullable: true,
    comment: '地址标签/备注',
  })
  label: string;

  @Column({
    type: 'varchar',
    length: 50,
    nullable: true,
    comment: '地址分类（公司钱包/交易所/合作伙伴等）',
  })
  category: string;

  @Column({
    type: 'int',
    comment: '创建人用户ID',
  })
  createdBy: number;

  @Column({
    type: 'int',
    nullable: true,
    comment: '审核人用户ID',
  })
  approvedBy: number;

  @Column({
    type: 'datetime',
    nullable: true,
    comment: '审核时间',
  })
  approvedAt: Date;

  @Column({
    type: 'tinyint',
    default: 1,
    comment: '是否激活',
  })
  @Index('idx_whitelist_active')
  isActive: boolean;

  @Column({
    type: 'datetime',
    nullable: true,
    comment: '过期时间（可选）',
  })
  @Index('idx_active_expires')
  expiresAt: Date;
}
