import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { Logger } from '@nestjs/common';

/**
 * 静态文件过滤中间件
 * 用于过滤掉对不存在的静态文件的请求，避免产生无用的404错误日志
 */
@Injectable()
export class StaticFilterMiddleware implements NestMiddleware {
  private readonly logger = new Logger(StaticFilterMiddleware.name);

  // 常见的静态文件扩展名和路径模式
  private readonly staticPatterns = [
    /\.js$/,
    /\.css$/,
    /\.png$/,
    /\.jpg$/,
    /\.jpeg$/,
    /\.gif$/,
    /\.ico$/,
    /\.svg$/,
    /\.woff$/,
    /\.woff2$/,
    /\.ttf$/,
    /\.eot$/,
    /\.map$/,
    /\.txt$/,
    /\.xml$/,
    /\.json$/,
    /^\/favicon\.ico$/,
    /^\/robots\.txt$/,
    /^\/sitemap\.xml$/,
    /^\/manifest\.json$/,
    /^\/sw\.js$/,
    /^\/service-worker\.js$/,
    /^\/enc\.js$/,  // 特别处理enc.js
  ];

  use(req: Request, res: Response, next: NextFunction) {
    const { url, method } = req;

    // 只处理GET请求
    if (method !== 'GET') {
      return next();
    }

    // 检查是否是静态文件请求
    const isStaticFile = this.staticPatterns.some(pattern => pattern.test(url));

    if (isStaticFile) {
      // 记录调试日志（仅在开发环境）
      if (process.env.NODE_ENV === 'development') {
        this.logger.debug(`过滤静态文件请求: ${method} ${url}`);
      }

      // 直接返回404，不进入NestJS路由系统
      res.status(404).json({
        statusCode: 404,
        message: 'Static file not found',
        path: url,
        timestamp: new Date().toISOString(),
      });
      return;
    }

    // 非静态文件请求，继续处理
    next();
  }
}