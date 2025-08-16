import { Entity, Column, Index, ManyToOne, JoinColumn, PrimaryGeneratedColumn } from 'typeorm';
import { BaseEntity } from './base.entity';
import { Client } from './client.entity';

export enum RiskLevel {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

export enum AlertStatus {
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  FALSE_POSITIVE = 'false_positive',
  IGNORED = 'ignored',
  RESOLVED = 'resolved',
}

@Entity('security_screenshots')
export class SecurityScreenshot extends BaseEntity {
  @PrimaryGeneratedColumn('increment')
  id: number;

  @Column({
    type: 'varchar',
    length: 36,
    name: 'client_id',
    comment: '客户端ID',
  })
  @Index('idx_screenshot_client_id')
  clientId: string;

  @Column({
    type: 'varchar',
    length: 64,
    unique: true,
    comment: '告警唯一ID',
  })
  alertId: string;

  @Column({
    type: 'datetime',
    comment: '截图时间',
    default: () => 'CURRENT_TIMESTAMP',
  })
  @Index('idx_screenshot_time')
  screenshotTime: Date;

  @Column({
    type: 'varchar',
    length: 100,
    comment: 'MinIO Bucket名称',
  })
  minioBucket: string;

  @Column({
    type: 'varchar',
    length: 500,
    comment: 'MinIO对象KEY',
  })
  minioObjectKey: string;

  @Column({
    type: 'varchar',
    length: 1000,
    nullable: true,
    comment: '文件访问URL',
  })
  fileUrl: string;

  @Column({
    type: 'varchar',
    length: 1000,
    nullable: true,
    comment: 'CDN加速URL',
  })
  cdnUrl: string;

  @Column({
    type: 'int',
    nullable: true,
    comment: '文件大小（字节）',
  })
  fileSize: number;

  @Column({
    type: 'varchar',
    length: 64,
    nullable: true,
    comment: '文件SHA256哈希值',
  })
  @Index('idx_file_hash')
  fileHash: string;

  @Column({
    type: 'text',
    comment: '检测到的区块链地址',
  })
  detectedAddress: string;

  @Column({
    type: 'varchar',
    length: 20,
    comment: '地址类型（BTC/ETH/TRC20等）',
  })
  @Index('idx_ss_address_type')
  addressType: string;

  @Column({
    type: 'text',
    comment: '完整剪切板内容',
  })
  clipboardContent: string;

  @Column({
    type: 'varchar',
    length: 20,
    default: RiskLevel.HIGH,
    comment: '风险等级',
  })
  @Index('idx_risk_level')
  riskLevel: RiskLevel;

  @Column({
    type: 'tinyint',
    default: 0,
    comment: '是否已处理',
  })
  @Index('idx_review_status')
  isReviewed: boolean;

  @Column({
    type: 'int',
    nullable: true,
    comment: '处理人用户ID',
  })
  reviewedBy: number;

  @Column({
    type: 'datetime',
    nullable: true,
    comment: '处理时间',
  })
  reviewedAt: Date;

  @Column({
    type: 'text',
    nullable: true,
    comment: '处理备注',
  })
  reviewNote: string;

  @Column({
    type: 'varchar',
    length: 20,
    default: AlertStatus.PENDING,
    comment: '告警状态',
  })
  @Index('idx_alert_status')
  alertStatus: AlertStatus;

  // 关联关系
  @ManyToOne(() => Client, (client) => client.securityScreenshots, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'client_id' })
  client: Client;
}