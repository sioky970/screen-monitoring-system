import { Injectable } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';

@Injectable()
export class CryptoService {
  private readonly saltRounds = 10;

  // 密码哈希
  async hashPassword(password: string): Promise<string> {
    return await bcrypt.hash(password, this.saltRounds);
  }

  // 验证密码
  async validatePassword(password: string, hash: string): Promise<boolean> {
    return await bcrypt.compare(password, hash);
  }

  // 生成随机字符串
  generateRandomString(length = 16): string {
    return crypto.randomBytes(length).toString('hex');
  }

  // 生成UUID
  generateUUID(): string {
    return crypto.randomUUID();
  }

  // MD5哈希
  md5(data: string): string {
    return crypto.createHash('md5').update(data).digest('hex');
  }

  // SHA256哈希
  sha256(data: string): string {
    return crypto.createHash('sha256').update(data).digest('hex');
  }

  // 区块链地址哈希（用于白名单去重）
  hashBlockchainAddress(address: string): string {
    return this.sha256(address.toLowerCase().trim());
  }

  // AES加密
  encrypt(text: string, key: string): string {
    const cipher = crypto.createCipher('aes192', key);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return encrypted;
  }

  // AES解密
  decrypt(encrypted: string, key: string): string {
    const decipher = crypto.createDecipher('aes192', key);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  }

  // 文件哈希
  fileHash(buffer: Buffer): string {
    return crypto.createHash('sha256').update(buffer).digest('hex');
  }

  // 生成告警ID
  generateAlertId(clientId: string, timestamp: Date): string {
    const timeStr = timestamp.getTime().toString();
    const randomStr = this.generateRandomString(8);
    return `ALERT_${clientId.slice(-8)}_${timeStr}_${randomStr}`;
  }

  // 验证区块链地址格式
  validateBlockchainAddress(address: string, type: string): boolean {
    const patterns = {
      BTC: /^[13][a-km-zA-HJ-NP-Z1-9]{25,34}$|^bc1[a-z0-9]{39,59}$/,
      ETH: /^0x[a-fA-F0-9]{40}$/,
      TRC20: /^T[A-Za-z1-9]{33}$/,
      LTC: /^[LM3][a-km-zA-HJ-NP-Z1-9]{26,33}$/,
      BCH: /^[13][a-km-zA-HJ-NP-Z1-9]{25,34}$|^bitcoincash:[a-z0-9]{42}$/,
      USDT_ERC20: /^0x[a-fA-F0-9]{40}$/,
      USDT_TRC20: /^T[A-Za-z1-9]{33}$/,
    };

    const pattern = patterns[type];
    if (!pattern) {
      return false;
    }

    return pattern.test(address.trim());
  }

  // 从剪切板内容中提取区块链地址
  extractBlockchainAddresses(clipboardContent: string): Array<{
    address: string;
    type: string;
    position: number;
  }> {
    const addresses = [];
    const patterns = {
      BTC: /\b[13][a-km-zA-HJ-NP-Z1-9]{25,34}\b|bc1[a-z0-9]{39,59}/g,
      ETH: /\b0x[a-fA-F0-9]{40}\b/g,
      TRC20: /\bT[A-Za-z1-9]{33}\b/g,
      LTC: /\b[LM3][a-km-zA-HJ-NP-Z1-9]{26,33}\b/g,
      BCH: /\b[13][a-km-zA-HJ-NP-Z1-9]{25,34}\b|bitcoincash:[a-z0-9]{42}/g,
    };

    for (const [type, pattern] of Object.entries(patterns)) {
      let match;
      while ((match = pattern.exec(clipboardContent)) !== null) {
        addresses.push({
          address: match[0],
          type,
          position: match.index,
        });
      }
    }

    return addresses.sort((a, b) => a.position - b.position);
  }
}