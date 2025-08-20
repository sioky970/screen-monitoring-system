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

export interface SecurityAlert {
  id: number
  clientId: string
  alertId: string
  screenshotTime: string
  minioBucket: string
  minioObjectKey: string
  fileUrl: string
  cdnUrl?: string
  fileSize?: number
  fileHash?: string
  detectedAddress: string
  addressType: string
  clipboardContent: string
  riskLevel: RiskLevel
  isReviewed: boolean
  reviewedBy?: number
  reviewedAt?: string
  reviewNote?: string
  alertStatus: AlertStatus
  createdAt: string
  updatedAt: string
  client?: {
    id: string
    computerName: string
    clientNumber: string
  }
  // 前端状态字段
  ignoring?: boolean
}

export interface SecurityAlertsResponse {
  alerts: SecurityAlert[]
  total: number
  page: number
  pageSize: number
}

export interface AlertStatusUpdate {
  status: AlertStatus
  remark?: string
}