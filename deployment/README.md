# 部署指南

## 概述

本目录包含了屏幕监控系统的完整Docker化部署配置，支持开发环境和生产环境的快速部署。

## 目录结构

```
deployment/
├── docker/                     # Docker配置文件
│   ├── mysql/                  # MySQL数据库配置
│   │   ├── init/              # 初始化SQL脚本
│   │   ├── conf/              # MySQL配置文件
│   │   └── dev-init/          # 开发环境初始化脚本
│   ├── redis/                 # Redis缓存配置
│   │   └── redis.conf         # Redis配置文件
│   ├── minio/                 # MinIO对象存储配置
│   │   └── init/              # MinIO初始化脚本
│   └── nginx/                 # Nginx反向代理配置
│       ├── nginx.conf         # 主配置文件
│       └── conf.d/            # 虚拟主机配置
├── scripts/                   # 部署脚本
│   ├── start.sh              # 启动脚本
│   └── stop.sh               # 停止脚本
└── README.md                 # 本文档
```

## 快速开始

### 1. 环境要求

- Docker 20.10+
- Docker Compose 2.0+
- 至少 4GB 可用内存
- 至少 10GB 可用磁盘空间

### 2. 快速启动

```bash
# 开发环境启动（推荐用于开发调试）
./deployment/scripts/start.sh dev

# 生产环境启动
./deployment/scripts/start.sh prod
```

### 3. 访问服务

#### 开发环境
- **数据库管理 (Adminer)**：http://localhost:38080
- **Redis管理工具**：http://localhost:38081  
- **MinIO控制台**：http://localhost:39090
- **后端API**：http://localhost:38001（开发时）
- **前端应用**：http://localhost:38000（开发时）
- **MySQL端口**：localhost:33066
- **Redis端口**：localhost:36379
- **MinIO API**：localhost:39000

#### 生产环境
- **应用主页**：http://localhost
- **MinIO控制台**：http://localhost:9090
- **MySQL端口**：localhost:3306
- **Redis端口**：localhost:6379
- **MinIO API**：localhost:9000

## 配置说明

### 环境变量配置

复制 `.env.example` 为 `.env` 并根据需要修改：

```bash
cp .env.example .env
```

主要配置项：

```bash
# 数据库配置
MYSQL_ROOT_PASSWORD=rootPassword123
MYSQL_DATABASE=screen_monitoring
MYSQL_USER=monitor_user
MYSQL_PASSWORD=monitorPass123

# MinIO配置
MINIO_ROOT_USER=minioadmin
MINIO_ROOT_PASSWORD=minioadmin123

# 应用配置
JWT_SECRET=your-super-secret-jwt-key
```

### 数据库初始化

MySQL容器启动时会自动执行以下初始化：

1. 创建数据库和表结构
2. 插入默认数据（分组、管理员账户）
3. 创建索引和视图
4. 设置字符集为 utf8mb4

默认管理员账户：
- 用户名：`admin`
- 密码：`admin123`

### MinIO存储桶

系统会自动创建以下存储桶：

- `monitoring-screenshots`：截图存储
- `monitoring-backups`：备份存储

存储桶策略：
- 常规截图：7天后自动删除
- 安全截图：90天后转为低频存储，365天后归档

## 开发指南

### 1. 开发环境启动

```bash
# 启动基础服务
./deployment/scripts/start.sh dev

# 启动后端开发服务
cd backend
npm install
npm run start:dev

# 启动前端开发服务  
cd frontend
npm install
npm run dev
```

### 2. 数据库连接

开发环境数据库连接信息：
```
Host: localhost
Port: 33066
Database: screen_monitoring_dev
Username: dev_user
Password: dev_pass_123
```

### 3. 查看日志

```bash
# 查看所有服务日志
docker-compose -f docker-compose.yml -f docker-compose.dev.yml logs -f

# 查看特定服务日志
docker-compose -f docker-compose.yml -f docker-compose.dev.yml logs -f mysql
```

### 4. 服务管理

```bash
# 重启服务
docker-compose -f docker-compose.yml -f docker-compose.dev.yml restart mysql

# 停止服务
./deployment/scripts/stop.sh dev

# 完全清理（删除数据）
./deployment/scripts/stop.sh dev --remove-data
```

## 生产部署

### 1. 安全配置

生产环境部署前请务必：

1. **修改默认密码**：
   - 数据库root密码
   - MinIO管理员密码  
   - JWT密钥
   - 管理员账户密码

2. **启用HTTPS**：
   - 配置SSL证书
   - 修改Nginx配置

3. **网络安全**：
   - 配置防火墙
   - 限制数据库访问IP
   - 设置Redis密码

### 2. 性能优化

```bash
# 调整MySQL配置
# 编辑 deployment/docker/mysql/conf/my.cnf

# 调整Redis配置
# 编辑 deployment/docker/redis/redis.conf

# 调整Nginx配置
# 编辑 deployment/docker/nginx/nginx.conf
```

### 3. 监控和备份

```bash
# 数据库备份
docker-compose exec mysql mysqldump -u root -p screen_monitoring > backup.sql

# 恢复数据库
docker-compose exec -T mysql mysql -u root -p screen_monitoring < backup.sql

# MinIO数据备份
mc mirror myminio/monitoring-screenshots ./backup/screenshots/
```

## 故障排除

### 常见问题

1. **端口冲突**
   - 修改 `.env` 文件中的端口配置
   - 或停止占用端口的其他服务

2. **内存不足**
   - 确保至少4GB可用内存
   - 调整MySQL和Redis内存配置

3. **权限问题**
   - 确保脚本有执行权限：`chmod +x deployment/scripts/*.sh`
   - 确保Docker用户组权限正确

4. **数据库连接失败**
   - 等待MySQL完全启动（约30-60秒）
   - 检查用户名密码配置

### 日志分析

```bash
# 查看容器状态
docker-compose ps

# 查看容器资源使用
docker stats

# 查看容器详情
docker-compose logs [service_name]

# 进入容器调试
docker-compose exec mysql bash
```

## API文档

启动后端服务后，可访问自动生成的API文档：
- 开发环境：http://localhost:3001/api/docs
- 生产环境：http://localhost/api/docs

## 联系方式

如遇问题，请提交Issue或联系开发团队。