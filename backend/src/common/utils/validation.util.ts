import { BadRequestException } from '@nestjs/common';

/**
 * 通用验证工具类
 */
export class ValidationUtil {
  /**
   * 验证必填字段
   * @param value 值
   * @param fieldName 字段名
   */
  static required(value: any, fieldName: string): void {
    if (value === undefined || value === null || value === '') {
      throw new BadRequestException(`${fieldName} 是必填字段`);
    }
  }

  /**
   * 验证邮箱格式
   * @param email 邮箱地址
   */
  static isEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * 验证手机号格式（中国大陆）
   * @param phone 手机号
   */
  static isPhone(phone: string): boolean {
    const phoneRegex = /^1[3-9]\d{9}$/;
    return phoneRegex.test(phone);
  }

  /**
   * 验证IP地址格式
   * @param ip IP地址
   */
  static isIP(ip: string): boolean {
    const ipRegex =
      /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
    return ipRegex.test(ip);
  }

  /**
   * 验证MAC地址格式
   * @param mac MAC地址
   */
  static isMAC(mac: string): boolean {
    const macRegex = /^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$/;
    return macRegex.test(mac);
  }

  /**
   * 验证UUID格式
   * @param uuid UUID字符串
   */
  static isUUID(uuid: string): boolean {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
  }

  /**
   * 验证数字范围
   * @param value 数值
   * @param min 最小值
   * @param max 最大值
   * @param fieldName 字段名
   */
  static numberRange(value: number, min: number, max: number, fieldName: string): void {
    if (value < min || value > max) {
      throw new BadRequestException(`${fieldName} 必须在 ${min} 到 ${max} 之间`);
    }
  }

  /**
   * 验证字符串长度
   * @param value 字符串值
   * @param minLength 最小长度
   * @param maxLength 最大长度
   * @param fieldName 字段名
   */
  static stringLength(
    value: string,
    minLength: number,
    maxLength: number,
    fieldName: string,
  ): void {
    if (value.length < minLength || value.length > maxLength) {
      throw new BadRequestException(
        `${fieldName} 长度必须在 ${minLength} 到 ${maxLength} 个字符之间`,
      );
    }
  }

  /**
   * 验证数组不为空
   * @param array 数组
   * @param fieldName 字段名
   */
  static arrayNotEmpty(array: any[], fieldName: string): void {
    if (!Array.isArray(array) || array.length === 0) {
      throw new BadRequestException(`${fieldName} 不能为空数组`);
    }
  }

  /**
   * 验证枚举值
   * @param value 值
   * @param enumObject 枚举对象
   * @param fieldName 字段名
   */
  static enumValue(value: any, enumObject: any, fieldName: string): void {
    const validValues = Object.values(enumObject);
    if (!validValues.includes(value)) {
      throw new BadRequestException(`${fieldName} 必须是以下值之一: ${validValues.join(', ')}`);
    }
  }

  /**
   * 验证日期格式
   * @param dateString 日期字符串
   * @param fieldName 字段名
   */
  static isValidDate(dateString: string, fieldName: string): void {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
      throw new BadRequestException(`${fieldName} 不是有效的日期格式`);
    }
  }

  /**
   * 验证密码强度
   * @param password 密码
   * @param minLength 最小长度
   */
  static passwordStrength(password: string, minLength: number = 8): boolean {
    if (password.length < minLength) {
      return false;
    }

    // 至少包含一个数字、一个小写字母、一个大写字母
    const hasNumber = /\d/.test(password);
    const hasLower = /[a-z]/.test(password);
    const hasUpper = /[A-Z]/.test(password);

    return hasNumber && hasLower && hasUpper;
  }

  /**
   * 清理和验证文件名
   * @param filename 文件名
   */
  static sanitizeFilename(filename: string): string {
    // 移除危险字符
    return filename.replace(/[<>:"/\\|?*]/g, '').trim();
  }

  /**
   * 验证文件扩展名
   * @param filename 文件名
   * @param allowedExtensions 允许的扩展名数组
   */
  static validateFileExtension(filename: string, allowedExtensions: string[]): boolean {
    const extension = filename.split('.').pop()?.toLowerCase();
    return extension ? allowedExtensions.includes(extension) : false;
  }
}
