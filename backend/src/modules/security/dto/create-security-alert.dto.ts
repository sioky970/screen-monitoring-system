export class CreateSecurityAlertDto {
  clientId: string;
  alertType: any;
  blockchainAddress?: string;
  screenshotPath: string;
  clipboardContent?: string;
  remark?: string;
}

export enum AlertType {
  BLOCKCHAIN_ADDRESS = 'BLOCKCHAIN_ADDRESS',
  SUSPICIOUS_ACTIVITY = 'SUSPICIOUS_ACTIVITY',
}

