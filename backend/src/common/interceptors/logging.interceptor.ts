import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const { method, url, ip, headers } = request;
    const userAgent = headers['user-agent'] || '';
    
    const start = Date.now();
    
    console.log(`📝 [${method}] ${url} - ${ip} - ${userAgent}`);

    return next.handle().pipe(
      tap(() => {
        const end = Date.now();
        const duration = end - start;
        console.log(`✅ [${method}] ${url} - ${duration}ms`);
      }),
    );
  }
}