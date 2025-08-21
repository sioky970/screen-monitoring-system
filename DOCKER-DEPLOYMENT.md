# 屏幕监控系统 Docker 部署指南

## 🚀 快速开始

### 1. 环境准备

确保您的系统已安装：
- Docker (版本 20.10+)
- Docker Compose (版本 2.0+)

### 2. 克隆项目

```bash
git clone <your-repository-url>
cd screen-monitoring-system
```

### 3. 配置环境变量

```bash
# 复制环境变量模板
cp .env.example .env

# 编辑配置文件（根据需要修改）
nano .env
```

### 4. 启动系统

#### 方式一：一键启动（推荐）

```bash
# 启动完整系统（生产环境）
./start-docker.sh

# 或者启动开发环境
./start-docker.sh dev
```

#### 方式二：手动启动

```bash
# 启动生产环境
COMPOSE_PROFILES=prod docker-compose -f docker-compose.unified.yml up -d

# 启动开发环境
COMPOSE_PROFILES=dev docker-compose -f docker-compose.unified.yml up -d

# 仅启动基础设施
COMPOSE_PROFILES=infra docker-compose -f docker-compose.unified.yml up -d

# 启动开发工具
COMPOSE_PROFILES=prod,tools docker-compose -f docker-compose.unified.yml up -d
```

## 📋 服务说明

### 基础设施服务

| 服务 | 端口 | 说明 |
|------|------|------|
| MySQL | 47821 | 主数据库 |
| Redis | 47822 | 缓存服务 |
| MinIO | 47823/47824 | 对象存储 (API/Console) |

### 应用服务

| 环境 | 前端端口 | 后端端口 | 说明 |
|------|----------|----------|------|
| 开发环境 | 47827 | 47828 | 支持热重载 |
| 生产环境 | 47830 | 47831 | 优化构建 |

### 开发工具

| 工具 | 端口 | 说明 |
|------|------|------|
| Adminer | 47825 | 数据库管理 |
| Redis Commander | 47826 | Redis 管理 |

## 🔧 配置说明

### 环境变量配置

主要配置项说明：

```bash
# 数据库配置
MYSQL_ROOT_PASSWORD=your-root-password
MYSQL_DATABASE=screen_monitoring
MYSQL_USER=monitor_user
MYSQL_PASSWORD=your-user-password

# MinIO 配置
MINIO_ROOT_USER=minioadmin
MINIO_ROOT_PASSWORD=your-minio-password

# 应用配置
JWT_SECRET=your-jwt-secret
NODE_ENV=production
```

### 端口配置

所有端口都使用 47xxx 系列，避免与常用端口冲突：

- **47821**: MySQL 数据库
- **47822**: Redis 缓存
- **47823**: MinIO API
- **47824**: MinIO 控制台
- **47825**: Adminer 数据库管理
- **47826**: Redis Commander
- **47827**: 前端开发服务
- **47828**: 后端开发服务
- **47830**: 前端生产服务
- **47831**: 后端生产服务

## 🛠️ 常用命令

### 启动和停止

```bash
# 启动所有服务
docker-compose -f docker-compose.unified.yml up -d

# 停止所有服务
docker-compose -f docker-compose.unified.yml down

# 重启特定服务
docker-compose -f docker-compose.unified.yml restart backend-prod

# 查看服务状态
docker-compose -f docker-compose.unified.yml ps

# 查看服务日志
docker-compose -f docker-compose.unified.yml logs -f backend-prod
```

### 数据管理

```bash
# 备份数据库
docker exec screen-monitor-mysql mysqldump -u root -p screen_monitoring > backup.sql

# 清理未使用的镜像和容器
docker system prune -f

# 查看数据卷
docker volume ls | grep screen-monitor
```

### 开发调试

```bash
# 进入后端容器
docker exec -it screen-monitor-backend-prod bash

# 进入数据库容器
docker exec -it screen-monitor-mysql mysql -u root -p

# 实时查看后端日志
docker logs -f screen-monitor-backend-prod
```

## 🔍 故障排除

### 常见问题

1. **端口冲突**
   ```bash
   # 检查端口占用
   netstat -tulpn | grep :47831
   
   # 修改 .env 文件中的端口配置
   ```

2. **数据库连接失败**
   ```bash
   # 检查数据库状态
   docker logs screen-monitor-mysql
   
   # 重启数据库服务
   docker-compose -f docker-compose.unified.yml restart mysql
   ```

3. **MinIO 连接失败**
   ```bash
   # 检查 MinIO 状态
   docker logs screen-monitor-minio
   
   # 访问 MinIO 控制台
   http://localhost:47824
   ```

### 健康检查

```bash
# 检查所有服务健康状态
docker-compose -f docker-compose.unified.yml ps

# 检查特定服务健康状态
docker inspect screen-monitor-mysql | grep Health -A 10
```

## 📊 监控和日志

### 日志查看

```bash
# 查看所有服务日志
docker-compose -f docker-compose.unified.yml logs

# 查看特定服务日志
docker-compose -f docker-compose.unified.yml logs backend-prod

# 实时跟踪日志
docker-compose -f docker-compose.unified.yml logs -f --tail=100
```

### 性能监控

```bash
# 查看容器资源使用情况
docker stats

# 查看特定容器资源使用
docker stats screen-monitor-backend-prod
```

## 🔒 安全建议

### 生产环境安全配置

1. **修改默认密码**
   ```bash
   # 在 .env 文件中设置强密码
   MYSQL_ROOT_PASSWORD=your-strong-password
   MINIO_ROOT_PASSWORD=your-strong-password
   JWT_SECRET=your-strong-jwt-secret
   ```

2. **网络安全**
   ```bash
   # 仅暴露必要端口
   # 使用防火墙限制访问
   # 配置 HTTPS（生产环境）
   ```

3. **数据备份**
   ```bash
   # 定期备份数据库和文件
   # 设置自动备份脚本
   ```

## 📞 支持

如果遇到问题，请：

1. 查看日志文件
2. 检查配置文件
3. 参考故障排除部分
4. 提交 Issue 到项目仓库

---

**注意**: 这是一个开发/测试环境的配置。生产环境部署时请确保：
- 使用强密码
- 配置 HTTPS
- 设置防火墙
- 定期备份数据
