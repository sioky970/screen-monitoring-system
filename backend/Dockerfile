# NestJS 后端服务 Dockerfile
# 多阶段构建：开发模式 + 减小最终镜像大小

# 开发阶段
FROM node:18-alpine AS development

# 安装开发工具
RUN apk add --no-cache git curl

WORKDIR /app

# 复制 package 文件
COPY package*.json ./

# 安装所有依赖（包括开发依赖）
RUN npm install

# 复制源代码
COPY . .

# 暴露端口
EXPOSE 3000
EXPOSE 3005
EXPOSE 9229

# 设置环境变量
ENV NODE_ENV=development

# 健康检查
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1

# 开发模式启动（支持热重载）
CMD ["npm", "run", "start:dev"]

# 构建阶段
FROM node:18-alpine AS builder

WORKDIR /app

# 复制 package 文件
COPY package*.json ./

# 安装依赖（包含开发依赖，用于构建）
RUN npm ci && npm cache clean --force

# 复制源代码
COPY . .

# 构建应用
RUN npm run build

# 构建完成后剔除开发依赖，减小体积
RUN npm prune --omit=dev

# 生产阶段
FROM node:18-alpine AS production

# 安装 dumb-init（优雅关闭）
RUN apk add --no-cache dumb-init

# 创建应用用户（安全最佳实践）
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nestjs -u 1001

WORKDIR /app

# 从构建阶段复制文件（已剔除 dev 依赖）
COPY --from=builder --chown=nestjs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nestjs:nodejs /app/dist ./dist
COPY --from=builder --chown=nestjs:nodejs /app/package*.json ./

# 切换到非root用户
USER nestjs

# 暴露端口（与应用默认 3000 保持一致）
EXPOSE 3000

# 健康检查（使用 Node 执行 HTTP 请求，使用 IPv4 地址避免 IPv6 连接问题）
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "const http=require('http');const req=http.get('http://127.0.0.1:3000/health',res=>{process.exit(res.statusCode===200?0:1)});req.on('error',()=>process.exit(1));"

# 启动命令
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/main"]