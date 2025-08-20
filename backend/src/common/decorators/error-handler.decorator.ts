import { Logger } from '@nestjs/common';

/**
 * 错误处理装饰器
 * 自动捕获方法中的错误并记录日志
 */
export function ErrorHandler(context?: string) {
  return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value;
    const logger = new Logger(context || target.constructor.name);

    descriptor.value = async function (...args: any[]) {
      try {
        return await method.apply(this, args);
      } catch (error) {
        const errorMessage = error?.message || '未知错误';
        const methodName = `${target.constructor.name}.${propertyName}`;

        logger.error(`${methodName} 执行失败: ${errorMessage}`, error.stack);

        // 重新抛出错误，让上层处理
        throw error;
      }
    };

    return descriptor;
  };
}

/**
 * 异步错误处理装饰器（专门用于异步方法）
 */
export function AsyncErrorHandler(context?: string) {
  return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value;
    const logger = new Logger(context || target.constructor.name);

    descriptor.value = async function (...args: any[]) {
      try {
        const result = await method.apply(this, args);
        return result;
      } catch (error) {
        const errorMessage = error?.message || '未知错误';
        const methodName = `${target.constructor.name}.${propertyName}`;

        logger.error(`${methodName} 异步执行失败: ${errorMessage}`, error.stack);

        // 重新抛出错误，让上层处理
        throw error;
      }
    };

    return descriptor;
  };
}
