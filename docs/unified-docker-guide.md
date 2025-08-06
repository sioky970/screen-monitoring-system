# 统一Docker部署指南

## 概述

本文档详细介绍了屏幕监控系统的统一Docker部署方案。通过单一配置文件和智能脚本，实现一键部署多种环境。

## 快速开始

### 1. 基本使用

```bash
# 克隆项目
git clone https://github.com/sioky970/-.git
cd screen-monitoring-system

# 一键启动开发环境
./start-unified.sh dev
```

### 2. 部署模式

#### 开发环境（推荐）
```bash
./start-unified.sh dev
```
**包含服务：**
- ✅ MySQL + Redis + MinIO（基础设施）
- ✅ Backend-dev + Frontend-dev（应用服务，支持热重载）
- ✅ Adminer + Redis Commander（开发工具）

**访问地址：**
- 前端应用：http://localhost:38000
- 后端API：http://localhost:38001/api
- 数据库管理：http://localhost:38080
- Redis管理：http://localhost:38081
- MinIO控制台：http://localhost:39090

#### 生产环境
```bash
./start-unified.sh prod
```
**包含服务：**
- ✅ MySQL + Redis + MinIO（基础设施）
- ✅ Backend + Frontend（生产版本应用）
- ❌ 不包含开发工具

**访问地址：**
- 应用主页：http://localhost:8080
- API接口：http://localhost:3001/api
- MinIO控制台：http://localhost:9090

#### 仅基础设施
```bash
./start-unified.sh infra
```
**包含服务：**
- ✅ MySQL + Redis + MinIO（基础设施）
- ❌ 不包含应用服务和开发工具

**适用场景：**
- 本地应用开发（npm run dev）
- 自定义应用部署
- 微服务架构中的数据层

#### 开发工具模式
```bash
./start-unified.sh tools
```
**包含服务：**
- ✅ MySQL + Redis + MinIO（基础设施）
- ✅ Adminer + Redis Commander（开发工具）
- ❌ 不包含应用服务

**适用场景：**
- 数据库管理和维护
- 开发调试和数据分析

## 环境配置

### 自动配置

脚本会自动处理环境配置：

1. **开发环境** (`dev`): 使用 `.env.unified`，包含开发友好的配置
2. **生产环境** (`prod`): 使用 `.env.prod`，包含生产优化配置
3. **基础设施** (`infra`) 和 **工具** (`tools`): 使用 `.env.unified`

### 手动配置

如果需要自定义配置，可以编辑相应的环境文件：

```bash
# 复制并编辑开发环境配置
cp .env.unified .env
vim .env

# 复制并编辑生产环境配置  
cp .env.prod .env
vim .env
```

## 常用操作

### 服务管理

```bash
# 查看服务状态
docker-compose -f docker-compose.unified.yml ps

# 查看服务日志
docker-compose -f docker-compose.unified.yml logs -f [service_name]

# 重启特定服务
docker-compose -f docker-compose.unified.yml restart [service_name]

# 停止所有服务
docker-compose -f docker-compose.unified.yml down

# 停止并删除数据卷（谨慎使用）
docker-compose -f docker-compose.unified.yml down -v
```

### 服务健康检查

```bash
# 检查MySQL
docker-compose -f docker-compose.unified.yml exec mysql mysqladmin ping

# 检查Redis
docker-compose -f docker-compose.unified.yml exec redis redis-cli ping

# 检查MinIO
curl -f http://localhost:39090/minio/health/live
```

### 数据管理

#### 数据备份

```bash
# MySQL数据备份
docker-compose -f docker-compose.unified.yml exec mysql mysqldump -u dev_user -pdev_pass_123 screen_monitoring_dev > backup_$(date +%Y%m%d).sql

# MinIO数据备份
docker-compose -f docker-compose.unified.yml exec minio mc mirror /data /backup/minio_$(date +%Y%m%d)
```

#### 数据恢复

```bash
# MySQL数据恢复
cat backup_20240101.sql | docker-compose -f docker-compose.unified.yml exec -T mysql mysql -u dev_user -pdev_pass_123 screen_monitoring_dev
```

## 开发工作流

### 1. 开发环境启动

```bash
# 启动完整开发环境
./start-unified.sh dev

# 等待服务启动（约30-60秒）
# 检查服务状态
docker-compose -f docker-compose.unified.yml ps
```

### 2. 应用开发

开发环境支持代码热重载：

- **后端开发**: 修改 `./backend` 目录下的代码会自动重载
- **前端开发**: 修改 `./frontend` 目录下的代码会自动重载
- **调试**: 后端调试端口已映射到 `localhost:39229`

### 3. 混合开发模式

如果你希望某些服务运行在容器中，某些服务在本地运行：

```bash
# 启动基础设施
./start-unified.sh infra

# 本地运行后端（可调试）
cd backend && npm install && npm run start:dev

# 本地运行前端（可调试）
cd frontend && npm install && npm run dev
```

## Profile机制详解

### 什么是Profile

Docker Compose Profiles 是一种服务分组机制，允许选择性启动服务。

### Profile分配

```yaml
services:
  mysql:
    profiles: [infra, dev, prod]  # 基础设施，被所有模式使用
  
  adminer:
    profiles: [tools, dev]       # 开发工具，仅开发环境使用
  
  backend-dev:
    profiles: [dev]              # 开发版后端，仅开发环境使用
  
  backend:
    profiles: [prod]             # 生产版后端，仅生产环境使用
```

### 手动使用Profile

```bash
# 启动开发环境
COMPOSE_PROFILES=dev docker-compose -f docker-compose.unified.yml up -d

# 启动生产环境  
COMPOSE_PROFILES=prod docker-compose -f docker-compose.unified.yml up -d

# 启动基础设施+工具
COMPOSE_PROFILES=infra,tools docker-compose -f docker-compose.unified.yml up -d
```

## 端口说明

### 开发环境端口（冷门端口，避免冲突）

| 服务 | 内部端口 | 外部端口 | 说明 |
|------|----------|----------|------|
| MySQL | 3306 | 33066 | 数据库服务 |
| Redis | 6379 | 36379 | 缓存服务 |
| MinIO API | 9000 | 39000 | 对象存储API |
| MinIO Console | 9090 | 39090 | MinIO管理界面 |
| Backend Dev | 3001 | 38001 | 后端API服务 |
| Frontend Dev | 3000 | 38000 | 前端应用 |
| Backend Debug | 9229 | 39229 | Node.js调试端口 |
| Adminer | 8080 | 38080 | 数据库管理 |
| Redis Commander | 8081 | 38081 | Redis管理 |

### 生产环境端口（标准端口）

| 服务 | 内部端口 | 外部端口 | 说明 |
|------|----------|----------|------|
| MySQL | 3306 | 3306 | 数据库服务 |
| Redis | 6379 | 6379 | 缓存服务 |
| MinIO API | 9000 | 9000 | 对象存储API |
| MinIO Console | 9090 | 9090 | MinIO管理界面 |
| Backend | 3001 | 3001 | 后端API服务 |
| Frontend | 80 | 8080 | 前端应用 |

## 故障排除

### 常见问题

#### 1. 端口冲突

**现象**: 服务启动失败，提示端口被占用

**解决**:
```bash
# 查看端口占用
netstat -tulpn | grep :38001

# 停止占用端口的进程
sudo kill -9 <PID>

# 或修改.env文件中的端口配置
```

#### 2. 容器启动失败

**现象**: 某个容器反复重启

**解决**:
```bash
# 查看容器日志
docker-compose -f docker-compose.unified.yml logs [service_name]

# 检查依赖服务是否正常
docker-compose -f docker-compose.unified.yml ps

# 重新构建镜像
docker-compose -f docker-compose.unified.yml build [service_name]
```

#### 3. 数据库连接失败

**现象**: 应用无法连接数据库

**解决**:
```bash
# 检查MySQL健康状态
docker-compose -f docker-compose.unified.yml exec mysql mysqladmin ping

# 检查网络连通性
docker-compose -f docker-compose.unified.yml exec backend-dev ping mysql

# 查看数据库日志
docker-compose -f docker-compose.unified.yml logs mysql
```

#### 4. 前端无法访问后端API

**现象**: 前端页面显示API连接错误

**解决**:
```bash
# 检查后端健康状态
curl -f http://localhost:38001/health

# 检查CORS配置
docker-compose -f docker-compose.unified.yml logs backend-dev | grep CORS

# 检查前端环境变量
docker-compose -f docker-compose.unified.yml exec frontend-dev env | grep API
```

### 完全重置

如果遇到无法解决的问题，可以完全重置：

```bash
# 停止所有服务
docker-compose -f docker-compose.unified.yml down

# 删除所有相关容器和镜像
docker system prune -a

# 删除数据卷（会丢失所有数据）
docker volume prune

# 重新启动
./start-unified.sh dev
```

## 最佳实践

### 1. 开发环境

- 使用 `./start-unified.sh dev` 获得完整开发体验
- 利用热重载功能，无需重启容器
- 使用Adminer和Redis Commander进行数据管理
- 定期备份开发数据

### 2. 生产环境

- 使用 `./start-unified.sh prod` 部署生产环境
- 定期监控服务健康状态
- 设置定时数据备份
- 使用环境变量管理敏感信息

### 3. 资源管理

- 开发完成后及时停止不需要的服务
- 定期清理未使用的镜像和容器
- 监控磁盘空间使用情况

### 4. 安全建议

- 生产环境更改默认密码
- 限制不必要的端口暴露
- 使用HTTPS代理生产环境
- 定期更新基础镜像