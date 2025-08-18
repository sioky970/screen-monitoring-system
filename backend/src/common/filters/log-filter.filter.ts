import { ExceptionFilter, Catch, ArgumentsHost, HttpException, Logger } from '@nestjs/common';
import { Request, Response } from 'express';

/**
 * 日志过滤器
 * 用于过滤和优化错误日志，减少无用的日志输出
 */
@Catch()
export class LogFilterExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(LogFilterExceptionFilter.name);

  // 需要过滤的路径模式（不记录详细错误日志）
  private readonly filteredPaths = [
    /\/enc\.js$/,
    /\/favicon\.ico$/,
    /\/robots\.txt$/,
    /\/sitemap\.xml$/,
    /\/manifest\.json$/,
    /\/sw\.js$/,
    /\/service-worker\.js$/,
    /\.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot|map|txt|xml)$/,
  ];

  // 需要过滤的错误类型（不记录详细错误日志）
  private readonly filteredErrors = [
    'NotFoundException',
    'Socket closed unexpectedly',
    'Connection lost',
    'ECONNRESET',
    'EPIPE',
  ];

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const { method, url, ip, headers } = request;

    let status = 500;
    let message = 'Internal server error';
    let errorName = 'UnknownError';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const errorResponse = exception.getResponse();
      message = typeof errorResponse === 'string' ? errorResponse : (errorResponse as any).message || message;
      errorName = exception.constructor.name;
    } else if (exception instanceof Error) {
      message = exception.message;
      errorName = exception.constructor.name;
    }

    // 检查是否需要过滤此错误
    const shouldFilter = this.shouldFilterError(url, errorName, message);

    if (shouldFilter) {
      // 对于过滤的错误，只记录简单的调试日志
      this.logger.debug(`过滤的请求: ${method} ${url} - ${status}`);
    } else {
      // 对于重要的错误，记录详细日志
      const userAgent = headers['user-agent'] || 'Unknown';
      const errorInfo = {
        timestamp: new Date().toISOString(),
        method,
        url,
        status,
        errorName,
        message,
        ip,
        userAgent: userAgent.substring(0, 100), // 限制长度
      };

      if (status >= 500) {
        this.logger.error(`服务器错误: ${JSON.stringify(errorInfo)}`, exception instanceof Error ? exception.stack : undefined);
      } else if (status >= 400) {
        this.logger.warn(`客户端错误: ${JSON.stringify(errorInfo)}`);
      }
    }

    // 构建响应
    const errorResponse = {
      statusCode: status,
      message,
      path: url,
      timestamp: new Date().toISOString(),
    };

    response.status(status).json(errorResponse);
  }

  /**
   * 判断是否应该过滤此错误
   */
  private shouldFilterError(url: string, errorName: string, message: string): boolean {
    // 检查路径是否需要过滤
    const pathFiltered = this.filteredPaths.some(pattern => pattern.test(url));
    if (pathFiltered) {
      return true;
    }

    // 检查错误类型是否需要过滤
    const errorFiltered = this.filteredErrors.some(filterError => 
      errorName.includes(filterError) || message.includes(filterError)
    );
    if (errorFiltered) {
      return true;
    }

    return false;
  }
}