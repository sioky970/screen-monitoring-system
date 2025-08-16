# 屏幕监控系统部署指南

本指南提供了屏幕监控系统的完整部署方案，包括Docker环境配置和服务启动。

## 系统要求

- Docker 20.10+ 
- Docker Compose 2.0+
- 至少 4GB 可用内存
- 至少 10GB 可用磁盘空间

## 部署方案

### 方案一：在线部署（推荐用于开发环境）

适用于有稳定网络连接的环境。

```bash
# 1. 克隆项目
git clone <your-repo-url>
cd screen-monitoring-system

# 2. 启动Docker服务（根据系统选择）
# Ubuntu/Debian:
sudo systemctl start docker
sudo systemctl enable docker

# CentOS/RHEL:
sudo systemctl start docker
sudo systemctl enable docker

# macOS/Windows:
# 启动 Docker Desktop 应用

# 3. 配置用户权限（Linux）
sudo usermod -aG docker $USER
# 注销并重新登录，或运行：
newgrp docker

# 4. 一键启动
./start-services.sh

# 或者手动启动
docker-compose -f docker-compose.simple.yml up -d
```

### 方案二：离线部署（推荐用于生产环境）

适用于网络受限或需要完全离线的环境。

#### 步骤1：准备阶段（在有网络的机器上）

```bash
# 1. 克隆项目
git clone <your-repo-url>
cd screen-monitoring-system

# 2. 下载并保存Docker镜像
./setup-docker-images.sh

# 3. 提交镜像文件到仓库
git add docker-images/
git commit -m "Add Docker images for offline deployment"
git push
```

#### 步骤2：部署阶段（在目标机器上）

```bash
# 1. 克隆项目（包含镜像文件）
git clone <your-repo-url>
cd screen-monitoring-system

# 2. 启动Docker服务
sudo systemctl start docker

# 3. 加载本地镜像并启动服务
./start-services.sh --load
```

## Docker 环境配置

### Linux 系统

#### Ubuntu/Debian

```bash
# 安装Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# 启动Docker服务
sudo systemctl start docker
sudo systemctl enable docker

# 配置用户权限
sudo usermod -aG docker $USER

# 安装Docker Compose（如果未包含）
sudo apt-get update
sudo apt-get install docker-compose-plugin
```

#### CentOS/RHEL

```bash
# 安装Docker
sudo yum install -y yum-utils
sudo yum-config-manager --add-repo https://download.docker.com/linux/centos/docker-ce.repo
sudo yum install docker-ce docker-ce-cli containerd.io docker-compose-plugin

# 启动Docker服务
sudo systemctl start docker
sudo systemctl enable docker

# 配置用户权限
sudo usermod -aG docker $USER
```

#### 无systemd环境（如某些容器环境）

```bash
# 手动启动Docker守护进程
sudo dockerd --host=unix:///var/run/docker.sock &

# 等待启动完成
sleep 10

# 测试连接
docker ps
```

### macOS

1. 下载并安装 [Docker Desktop for Mac](https://docs.docker.com/desktop/mac/install/)
2. 启动 Docker Desktop 应用
3. 等待Docker完全启动（状态栏显示绿色）

### Windows

1. 下载并安装 [Docker Desktop for Windows](https://docs.docker.com/desktop/windows/install/)
2. 启动 Docker Desktop 应用
3. 确保启用了WSL 2后端（推荐）

## 服务配置

### 环境变量配置

```bash
# 复制环境变量模板
cp .env.example .env

# 编辑配置文件
vim .env
```

主要配置项：

```bash
# 数据库配置
MYSQL_ROOT_PASSWORD=your_secure_password
MYSQL_DATABASE=screen_monitoring
MYSQL_USER=monitor_user
MYSQL_PASSWORD=your_user_password
MYSQL_PORT=33066

# Redis配置
REDIS_PORT=36379
REDIS_PASSWORD=your_redis_password  # 可选

# MinIO配置
MINIO_ROOT_USER=admin
MINIO_ROOT_PASSWORD=your_minio_password
MINIO_API_PORT=39000
MINIO_CONSOLE_PORT=39001

# 管理工具
ADMINER_PORT=38080
```

### 端口配置

确保以下端口未被占用：

| 服务 | 默认端口 | 说明 |
|------|----------|------|
| MySQL | 33066 | 数据库服务 |
| Redis | 36379 | 缓存服务 |
| MinIO API | 39000 | 对象存储API |
| MinIO Console | 39001 | MinIO管理界面 |
| Adminer | 38080 | 数据库管理 |

检查端口占用：

```bash
# Linux
netstat -tulpn | grep -E ':(33066|36379|39000|39001|38080)'

# 或使用ss命令
ss -tulpn | grep -E ':(33066|36379|39000|39001|38080)'

# macOS
lsof -i :33066
```

## 服务管理

### 启动服务

```bash
# 使用一键启动脚本
./start-services.sh

# 或手动启动
docker-compose -f docker-compose.simple.yml up -d
```

### 查看服务状态

```bash
# 查看所有服务状态
./start-services.sh --status

# 或手动查看
docker-compose -f docker-compose.simple.yml ps
```

### 查看日志

```bash
# 查看所有服务日志
./start-services.sh --logs

# 查看特定服务日志
docker-compose -f docker-compose.simple.yml logs mysql
docker-compose -f docker-compose.simple.yml logs redis
docker-compose -f docker-compose.simple.yml logs minio
```

### 停止服务

```bash
# 停止所有服务
./start-services.sh --down

# 或手动停止
docker-compose -f docker-compose.simple.yml down
```

### 重启服务

```bash
# 重启所有服务
./start-services.sh --restart

# 或手动重启
docker-compose -f docker-compose.simple.yml restart
```

## 验证部署

### 1. 检查容器状态

```bash
docker ps
```

应该看到以下容器正在运行：
- screen-monitor-mysql
- screen-monitor-redis
- screen-monitor-minio
- screen-monitor-adminer

### 2. 测试数据库连接

```bash
# 使用mysql客户端连接
mysql -h localhost -P 33066 -u dev_user -p

# 或使用docker exec
docker exec -it screen-monitor-mysql mysql -u root -p
```

### 3. 测试Redis连接

```bash
# 使用redis-cli连接
redis-cli -h localhost -p 36379

# 或使用docker exec
docker exec -it screen-monitor-redis redis-cli
```

### 4. 访问管理界面

- **Adminer（数据库管理）**: http://localhost:38080
  - 服务器: mysql
  - 用户名: dev_user
  - 密码: dev_pass_123
  - 数据库: screen_monitoring_dev

- **MinIO控制台**: http://localhost:39001
  - 用户名: devadmin
  - 密码: devadmin123

## 故障排除

### 常见问题

#### 1. Docker守护进程未运行

```bash
# 错误信息：Cannot connect to the Docker daemon

# 解决方案：
sudo systemctl start docker

# 或手动启动（无systemd环境）
sudo dockerd &
```

#### 2. 权限被拒绝

```bash
# 错误信息：permission denied while trying to connect to the Docker daemon

# 解决方案：
sudo usermod -aG docker $USER
newgrp docker

# 或使用sudo运行命令
sudo docker-compose -f docker-compose.simple.yml up -d
```

#### 3. 端口冲突

```bash
# 错误信息：port is already allocated

# 解决方案：
# 1. 修改.env文件中的端口配置
# 2. 或停止占用端口的服务
sudo lsof -i :33066
sudo kill -9 <PID>
```

#### 4. 磁盘空间不足

```bash
# 清理未使用的Docker资源
docker system prune -f

# 清理未使用的镜像
docker image prune -f

# 清理未使用的卷
docker volume prune -f
```

#### 5. 内存不足

```bash
# 检查内存使用
free -h

# 调整Docker资源限制（在docker-compose.yml中添加）
services:
  mysql:
    deploy:
      resources:
        limits:
          memory: 1G
        reservations:
          memory: 512M
```

### 日志分析

```bash
# 查看Docker守护进程日志
sudo journalctl -u docker.service

# 查看容器日志
docker logs screen-monitor-mysql
docker logs screen-monitor-redis
docker logs screen-monitor-minio

# 实时查看日志
docker logs -f screen-monitor-mysql
```

## 数据备份与恢复

### MySQL备份

```bash
# 备份数据库
docker exec screen-monitor-mysql mysqldump -u root -p screen_monitoring_dev > backup.sql

# 恢复数据库
docker exec -i screen-monitor-mysql mysql -u root -p screen_monitoring_dev < backup.sql
```

### Redis备份

```bash
# 备份Redis数据
docker exec screen-monitor-redis redis-cli BGSAVE
docker cp screen-monitor-redis:/data/dump.rdb ./redis-backup.rdb

# 恢复Redis数据
docker cp ./redis-backup.rdb screen-monitor-redis:/data/dump.rdb
docker restart screen-monitor-redis
```

### MinIO备份

```bash
# 备份MinIO数据
docker cp screen-monitor-minio:/data ./minio-backup

# 恢复MinIO数据
docker cp ./minio-backup screen-monitor-minio:/data
docker restart screen-monitor-minio
```

## 性能优化

### MySQL优化

在 `docker-compose.simple.yml` 中添加MySQL配置：

```yaml
mysql:
  command: >
    --default-authentication-plugin=mysql_native_password
    --character-set-server=utf8mb4
    --collation-server=utf8mb4_unicode_ci
    --innodb-buffer-pool-size=1G
    --innodb-log-file-size=256M
    --max-connections=200
    --query-cache-size=64M
```

### Redis优化

```yaml
redis:
  command: >
    redis-server
    --appendonly yes
    --maxmemory 512mb
    --maxmemory-policy allkeys-lru
```

### MinIO优化

```yaml
minio:
  environment:
    MINIO_CACHE_DRIVES: "/tmp/cache"
    MINIO_CACHE_EXCLUDE: "*.pdf"
    MINIO_CACHE_QUOTA: 80
    MINIO_CACHE_AFTER: 3
    MINIO_CACHE_WATERMARK_LOW: 70
    MINIO_CACHE_WATERMARK_HIGH: 90
```

## 安全建议

1. **修改默认密码**
   - 更改所有服务的默认密码
   - 使用强密码策略

2. **网络安全**
   - 仅暴露必要的端口
   - 使用防火墙限制访问
   - 考虑使用VPN或内网访问

3. **数据加密**
   - 启用MySQL的SSL连接
   - 配置MinIO的TLS

4. **定期更新**
   - 定期更新Docker镜像
   - 监控安全漏洞

5. **访问控制**
   - 限制管理界面的访问
   - 使用强认证机制

## 监控和维护

### 健康检查

```bash
# 检查所有服务健康状态
docker-compose -f docker-compose.simple.yml ps

# 检查特定服务
docker exec screen-monitor-mysql mysqladmin ping
docker exec screen-monitor-redis redis-cli ping
```

### 资源监控

```bash
# 查看容器资源使用
docker stats

# 查看磁盘使用
docker system df
```

### 定期维护

```bash
# 清理日志（定期执行）
docker-compose -f docker-compose.simple.yml logs --tail=1000 > logs-backup.txt
docker-compose -f docker-compose.simple.yml down
docker-compose -f docker-compose.simple.yml up -d

# 更新镜像（定期执行）
docker-compose -f docker-compose.simple.yml pull
docker-compose -f docker-compose.simple.yml up -d
```

## 支持和帮助

如果遇到问题，请按以下步骤排查：

1. 检查Docker服务状态
2. 查看容器日志
3. 验证端口配置
4. 检查磁盘和内存资源
5. 参考故障排除章节

更多帮助请参考：
- [Docker官方文档](https://docs.docker.com/)
- [Docker Compose文档](https://docs.docker.com/compose/)
- 项目GitHub Issues