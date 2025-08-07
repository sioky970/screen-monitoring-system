import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import * as helmet from 'helmet';
import * as compression from 'compression';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);

  // 安全中间件
  app.use(helmet());
  app.use(compression());

  // 跨域配置
  app.enableCors({
    origin: configService.get('CORS_ORIGIN', '*'),
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  });

  // 全局管道
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      disableErrorMessages: false,
    }),
  );

  // 全局过滤器
  app.useGlobalFilters(new HttpExceptionFilter());

  // 全局拦截器
  app.useGlobalInterceptors(
    new LoggingInterceptor(),
    new TransformInterceptor(),
  );

  // API前缀
  app.setGlobalPrefix('api', {
    exclude: ['/health', '/']
  });

  // Swagger API文档
  if (configService.get('NODE_ENV') !== 'production') {
    const config = new DocumentBuilder()
      .setTitle('📻 屏幕监控系统 API')
      .setDescription(`
        一个基于 NestJS 构建的企业级屏幕监控和安全防护系统。
        
        ✨ **主要功能**
        - 🔒 用户认证和权限管理
        - 💻 客户端实时监控和管理
        - 🛡️ 安全告警和风险检测
        - 📊 实时数据统计和分析
        - 📡 WebSocket 实时通信
        - 🗃️ 文件存储和管理
        
        🔗 **相关链接**
        - WebSocket: ws://localhost:3002/monitor
        - 健康检查: /health
        
        🛠️ **技术栈**
        - NestJS + TypeScript
        - MySQL 8.0 + TypeORM
        - Redis 7.0
        - MinIO 对象存储
        - Socket.IO WebSocket
        - JWT 认证
      `)
      .setVersion('1.0.0')
      .setContact(
        '开发团队',
        'https://github.com/your-org/screen-monitor',
        'dev@yourcompany.com'
      )
      .setLicense('MIT', 'https://opensource.org/licenses/MIT')
      .addServer('http://localhost:3001', '开发环境')
      .addServer('https://api.yourcompany.com', '生产环境')
      .addBearerAuth(
        {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          name: 'Authorization',
          description: '输入 JWT token，格式：Bearer <token>',
          in: 'header',
        },
        'JWT-auth',
      )
      .addApiKey(
        {
          type: 'apiKey',
          name: 'X-API-Key',
          in: 'header',
          description: 'API 密钥认证（供客户端使用）',
        },
        'API-Key',
      )
      .addTag('🔒 认证授权', '用户登录、注册、权限管理')
      .addTag('💻 客户端管理', '客户端连接管理、分组管理、状态监控')
      .addTag('🛡️ 安全监控', '安全告警、风险检测、截图管理')
      .addTag('✅ 白名单管理', '区块链地址白名单管理')
      .addTag('📢 通知管理', '系统通知和消息推送')
      .addTag('📁 文件管理', '文件上传、下载、管理')
      .addTag('📈 系统管理', '系统配置、日志管理、统计信息')
      .addTag('👥 用户管理', '系统用户管理和权限配置')
      .build();

    const document = SwaggerModule.createDocument(app, config, {
      operationIdFactory: (controllerKey: string, methodKey: string) => methodKey,
    });
    
    // 添加自定义 CSS 和 JS
    SwaggerModule.setup('api/docs', app, document, {
      customSiteTitle: '💻 屏幕监控系统 API 文档',
      customCss: `
        .swagger-ui .topbar { display: none }
        .swagger-ui .info .title { color: #1976d2; }
        .swagger-ui .info .description { color: #666; line-height: 1.6; }
        .swagger-ui .opblock.opblock-post { border-color: #49cc90; }
        .swagger-ui .opblock.opblock-get { border-color: #61affe; }
        .swagger-ui .opblock.opblock-put { border-color: #fca130; }
        .swagger-ui .opblock.opblock-delete { border-color: #f93e3e; }
      `,
      swaggerOptions: {
        persistAuthorization: true,
        displayRequestDuration: true,
        docExpansion: 'none',
        filter: true,
        showExtensions: true,
        showCommonExtensions: true,
        defaultModelsExpandDepth: 2,
        defaultModelExpandDepth: 2,
        displayOperationId: false,
        tryItOutEnabled: true,
      },
      customJs: `
        window.onload = function() {
          console.log('💻 屏幕监控系统 API 文档加载完成');
        }
      `,
    });

    console.log('📚 API 文档已启用: http://localhost:' + configService.get('PORT', 3001) + '/api/docs');
  }

  // 健康检查端点
  app.use('/health', (req, res) => {
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: configService.get('NODE_ENV', 'development'),
      version: '1.0.0',
    });
  });

  const port = configService.get('PORT', 47831);
  await app.listen(port, '0.0.0.0');
  
  const nodeEnv = configService.get('NODE_ENV', 'development');
  const isProduction = nodeEnv === 'production';
  
  console.log(`
┌──────────────────────────────────────────────────────┐
│  💻 屏幕监控系统后端服务  v1.0.0                   │
│                                                    │
│  🚀 服务启动成功                                      │
│  📍 运行端口: ${port}                                    │
│  🌐 API 地址: http://localhost:${port}/api          │
│  ${!isProduction ? '📚 API 文档: http://localhost:' + port + '/api/docs' : '📚 API 文档: 生产环境下已禁用'}│
│  💚 健康检查: http://localhost:${port}/health       │
│  📡 WebSocket: ws://localhost:3002/monitor        │
│  🔧 运行环境: ${nodeEnv}                              │
│                                                    │
│  🛠️  技术栈: NestJS + TypeScript + MySQL + Redis  │
│  🔒 认证方式: JWT Bearer Token                     │
│  📊 实时通信: Socket.IO WebSocket                 │
└──────────────────────────────────────────────────────┘
`);
}

bootstrap();