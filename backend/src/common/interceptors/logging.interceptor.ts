import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const { method, url, ip, headers, body } = request;
    const userAgent = headers['user-agent'] || '';

    const start = Date.now();

    // 详细记录POST请求，特别是截图上传
    if (method === 'POST' && url.includes('/security/screenshots/upload')) {
      console.log(`🔍 [${method}] ${url} - ${ip} - ${userAgent}`);
      console.log(`📤 截图上传请求详情:`);
      console.log(`   - Content-Type: ${headers['content-type'] || 'N/A'}`);
      console.log(`   - Content-Length: ${headers['content-length'] || 'N/A'}`);
      if (body) {
        const bodyKeys = Object.keys(body);
        console.log(`   - Body字段: ${bodyKeys.join(', ')}`);
        if (body.clientId) {
          console.log(`   - 客户端ID: ${body.clientId}`);
        }
      }
    } else {
      console.log(`📝 [${method}] ${url} - ${ip} - ${userAgent}`);
    }

    return next.handle().pipe(
      tap(() => {
        const end = Date.now();
        const duration = end - start;
        if (method === 'POST' && url.includes('/security/screenshots/upload')) {
          console.log(`✅ [${method}] ${url} - ${duration}ms - 截图上传处理完成`);
        } else {
          console.log(`✅ [${method}] ${url} - ${duration}ms`);
        }
      }),
    );
  }
}
