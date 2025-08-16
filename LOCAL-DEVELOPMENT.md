# 本地开发指南

本项目已配置为混合开发模式：**前后端本地运行 + 基础设施服务Docker化**

## 🏗️ 架构说明

### 本地运行
- ✅ **前端应用** (Vue 3 + Vite) - 端口 3000
- ✅ **后端应用** (NestJS) - 端口 3001

### Docker运行
- 🐳 **MySQL数据库** - 端口 3306
- 🐳 **Redis缓存** - 端口 6379
- 🐳 **MinIO对象存储** - 端口 9000/9001
- 🐳 **开发工具** (Adminer, Redis Commander) - 可选

## 🚀 快速开始

### 1. 启动基础设施服务

```bash
# 启动数据库、Redis、MinIO等服务
./start-infra.sh start

# 可选：同时启动开发工具
./start-infra.sh start --with-tools
```

### 2. 启动前后端应用

```bash
# 启动前后端开发服务
./start-dev.sh
```

### 3. 访问应用

- 🌐 **前端应用**: http://localhost:3000
- 🔌 **后端API**: http://localhost:3001/api
- 📖 **API文档**: http://localhost:3001/api/docs

## 📋 详细操作

### 基础设施服务管理

```bash
# 启动服务
./start-infra.sh start

# 启动服务 + 开发工具
./start-infra.sh start --with-tools

# 停止服务
./start-infra.sh stop

# 重启服务
./start-infra.sh restart

# 查看服务状态
./start-infra.sh status

# 查看服务日志
./start-infra.sh logs
./start-infra.sh logs mysql  # 查看特定服务日志

# 清理所有数据（危险操作）
./start-infra.sh clean
```

### 前后端应用管理

```bash
# 安装依赖
cd backend && npm install
cd frontend && npm install

# 启动完整开发环境
./start-dev.sh

# 单独启动后端
cd backend && npm run start:dev

# 单独启动前端
cd frontend && npm run dev
```

## 🔧 配置文件

### 后端配置 (`backend/.env.local`)

```env
# 数据库配置（连接到Docker中的MySQL）
DB_HOST=localhost
DB_PORT=3306
DB_USERNAME=dev_user
DB_PASSWORD=dev_pass_123
DB_DATABASE=screen_monitoring_dev

# Redis配置（连接到Docker中的Redis）
REDIS_HOST=localhost
REDIS_PORT=6379

# MinIO配置（连接到Docker中的MinIO）
MINIO_ENDPOINT=localhost
MINIO_PORT=9000
MINIO_ACCESS_KEY=devadmin
MINIO_SECRET_KEY=devadmin123
```

### 前端配置 (`frontend/.env.local`)

```env
# API配置（连接到本地运行的后端）
VITE_API_BASE_URL=http://localhost:3001/api
VITE_WS_BASE_URL=ws://localhost:3001
VITE_PORT=3000
```

## 🌐 服务访问地址

### 应用服务
| 服务 | 地址 | 说明 |
|------|------|------|
| 前端应用 | http://localhost:3000 | Vue 3 管理后台 |
| 后端API | http://localhost:3001/api | NestJS API服务 |
| API文档 | http://localhost:3001/api/docs | Swagger文档 |

### 基础设施服务
| 服务 | 地址 | 账号信息 |
|------|------|----------|
| MySQL数据库 | localhost:3306 | dev_user / dev_pass_123 |
| Redis缓存 | localhost:6379 | 无密码 |
| MinIO存储 | http://localhost:9000 | devadmin / devadmin123 |
| MinIO控制台 | http://localhost:9001 | devadmin / devadmin123 |

### 开发工具（可选）
| 工具 | 地址 | 说明 |
|------|------|------|
| Adminer | http://localhost:8080 | 数据库管理工具 |
| Redis Commander | http://localhost:8081 | Redis管理工具 |

## 🛠️ 开发工作流

### 日常开发

1. **启动基础设施**（只需启动一次）
   ```bash
   ./start-infra.sh start --with-tools
   ```

2. **启动前后端应用**
   ```bash
   ./start-dev.sh
   ```

3. **开发调试**
   - 前端：支持热重载，修改代码自动刷新
   - 后端：支持热重载，修改代码自动重启
   - 数据库：使用Adminer进行数据库管理
   - Redis：使用Redis Commander查看缓存数据

4. **停止服务**
   ```bash
   # 停止前后端（Ctrl+C）
   # 停止基础设施
   ./start-infra.sh stop
   ```

### 数据库操作

```bash
# 查看数据库状态
./start-infra.sh logs mysql

# 连接数据库
mysql -h localhost -P 3306 -u dev_user -pdev_pass_123 screen_monitoring_dev

# 使用Adminer（推荐）
# 访问 http://localhost:8080
# 服务器: mysql
# 用户名: dev_user
# 密码: dev_pass_123
# 数据库: screen_monitoring_dev
```

## 🔍 故障排除

### 常见问题

1. **端口冲突**
   ```bash
   # 检查端口占用
   lsof -i :3000  # 前端端口
   lsof -i :3001  # 后端端口
   lsof -i :3306  # MySQL端口
   ```

2. **基础设施服务未启动**
   ```bash
   # 检查服务状态
   ./start-infra.sh status
   
   # 查看服务日志
   ./start-infra.sh logs
   ```

3. **数据库连接失败**
   ```bash
   # 检查MySQL服务
   docker ps | grep mysql
   
   # 查看MySQL日志
   ./start-infra.sh logs mysql
   ```

4. **依赖安装问题**
   ```bash
   # 清理并重新安装
   cd backend && rm -rf node_modules && npm install
   cd frontend && rm -rf node_modules && npm install
   ```

### 重置环境

```bash
# 完全重置（会删除所有数据）
./start-infra.sh clean

# 重新启动
./start-infra.sh start --with-tools
```

## 📝 注意事项

1. **数据持久化**：Docker卷会保持数据，除非执行 `clean` 命令
2. **环境隔离**：本地开发环境与生产环境完全隔离
3. **性能优化**：前后端本地运行，响应速度更快
4. **调试便利**：可以直接使用IDE调试功能
5. **资源占用**：相比全Docker方案，占用资源更少

## 🔄 从Docker模式迁移

如果你之前使用的是完全Docker化的开发环境：

1. **停止旧环境**
   ```bash
   docker-compose -f docker-compose.unified.yml down
   ```

2. **启动新环境**
   ```bash
   ./start-infra.sh start --with-tools
   ./start-dev.sh
   ```

3. **数据迁移**（如需要）
   - 数据库数据会保留在Docker卷中
   - MinIO文件会保留在Docker卷中
   - Redis缓存会重新生成

## 🎯 优势对比

| 特性 | 全Docker模式 | 混合模式（当前） |
|------|-------------|------------------|
| 启动速度 | 较慢 | 快速 |
| 资源占用 | 高 | 中等 |
| 调试便利性 | 一般 | 优秀 |
| 热重载 | 支持 | 原生支持 |
| IDE集成 | 需配置 | 完美支持 |
| 环境一致性 | 完美 | 良好 |
| 部署复杂度 | 简单 | 中等 |