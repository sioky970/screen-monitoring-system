# 屏幕监控系统 Docker 部署指南

本指南介绍如何使用 Docker 部署屏幕监控系统的基础设施服务（MySQL、Redis、MinIO等）。

## 文件说明

- `docker-compose.simple.yml` - 简化的 Docker Compose 配置文件
- `setup-docker-images.sh` - 下载并保存 Docker 镜像到本地文件
- `load-docker-images.sh` - 从本地文件加载 Docker 镜像
- `docker-images/` - 存储 Docker 镜像文件的目录

## 快速开始

### 方式一：直接启动（需要网络连接）

```bash
# 启动所有基础设施服务
docker-compose -f docker-compose.simple.yml up -d

# 查看服务状态
docker-compose -f docker-compose.simple.yml ps

# 查看服务日志
docker-compose -f docker-compose.simple.yml logs
```

### 方式二：离线部署（推荐用于生产环境）

#### 1. 准备镜像（在有网络的环境中执行）

```bash
# 下载并保存所有必需的 Docker 镜像
./setup-docker-images.sh

# 将 docker-images 目录提交到 Git 仓库
git add docker-images/
git commit -m "Add Docker images for offline deployment"
git push
```

#### 2. 离线部署（在目标环境中执行）

```bash
# 克隆项目
git clone <your-repo-url>
cd screen-monitoring-system

# 加载本地镜像
./load-docker-images.sh

# 启动服务
docker-compose -f docker-compose.simple.yml up -d
```

## 服务配置

### 默认端口配置

| 服务 | 端口 | 用途 |
|------|------|------|
| MySQL | 33066 | 数据库服务 |
| Redis | 36379 | 缓存服务 |
| MinIO API | 39000 | 对象存储 API |
| MinIO Console | 39001 | MinIO 管理界面 |
| Adminer | 38080 | 数据库管理界面 |

### 默认账户信息

#### MySQL
- Root 密码: `dev_root_123`
- 数据库: `screen_monitoring_dev`
- 用户: `dev_user`
- 密码: `dev_pass_123`

#### MinIO
- 用户名: `devadmin`
- 密码: `devadmin123`
- 控制台: http://localhost:39001

#### Adminer
- 访问地址: http://localhost:38080
- 服务器: `mysql`
- 用户名: `dev_user`
- 密码: `dev_pass_123`
- 数据库: `screen_monitoring_dev`

## 环境变量配置

可以通过环境变量自定义配置：

```bash
# 复制环境变量模板
cp .env.example .env

# 编辑配置
vim .env
```

主要环境变量：

```bash
# 数据库配置
MYSQL_ROOT_PASSWORD=dev_root_123
MYSQL_DATABASE=screen_monitoring_dev
MYSQL_USER=dev_user
MYSQL_PASSWORD=dev_pass_123
MYSQL_PORT=33066

# Redis 配置
REDIS_PORT=36379

# MinIO 配置
MINIO_ROOT_USER=devadmin
MINIO_ROOT_PASSWORD=devadmin123
MINIO_API_PORT=39000
MINIO_CONSOLE_PORT=39001

# 管理工具端口
ADMINER_PORT=38080
```

## 常用命令

### 服务管理

```bash
# 启动所有服务
docker-compose -f docker-compose.simple.yml up -d

# 停止所有服务
docker-compose -f docker-compose.simple.yml down

# 重启服务
docker-compose -f docker-compose.simple.yml restart

# 查看服务状态
docker-compose -f docker-compose.simple.yml ps

# 查看服务日志
docker-compose -f docker-compose.simple.yml logs -f

# 查看特定服务日志
docker-compose -f docker-compose.simple.yml logs -f mysql
```

### 数据管理

```bash
# 备份 MySQL 数据
docker exec screen-monitor-mysql mysqldump -u root -pdev_root_123 screen_monitoring_dev > backup.sql

# 恢复 MySQL 数据
docker exec -i screen-monitor-mysql mysql -u root -pdev_root_123 screen_monitoring_dev < backup.sql

# 清理所有数据（谨慎使用）
docker-compose -f docker-compose.simple.yml down -v
```

### 镜像管理

```bash
# 更新镜像
docker-compose -f docker-compose.simple.yml pull

# 重新构建并启动
docker-compose -f docker-compose.simple.yml up -d --build

# 清理未使用的镜像
docker image prune -f
```

## 故障排除

### 常见问题

1. **端口冲突**
   ```bash
   # 检查端口占用
   netstat -tulpn | grep :33066
   
   # 修改 .env 文件中的端口配置
   ```

2. **权限问题**
   ```bash
   # 确保 Docker 守护进程运行
   sudo systemctl start docker
   
   # 将用户添加到 docker 组
   sudo usermod -aG docker $USER
   ```

3. **数据持久化**
   - 数据存储在 Docker 卷中，删除容器不会丢失数据
   - 使用 `docker-compose down -v` 会删除所有数据

4. **网络连接**
   ```bash
   # 检查容器网络
   docker network ls
   docker network inspect screen-monitoring-system_screen-monitor-network
   ```

### 日志查看

```bash
# 查看所有服务日志
docker-compose -f docker-compose.simple.yml logs

# 实时查看日志
docker-compose -f docker-compose.simple.yml logs -f

# 查看特定服务日志
docker-compose -f docker-compose.simple.yml logs mysql
docker-compose -f docker-compose.simple.yml logs redis
docker-compose -f docker-compose.simple.yml logs minio
```

## 生产环境建议

1. **安全配置**
   - 修改默认密码
   - 使用强密码
   - 限制网络访问

2. **性能优化**
   - 调整 MySQL 配置
   - 配置 Redis 持久化
   - 设置适当的资源限制

3. **监控和备份**
   - 定期备份数据
   - 监控服务状态
   - 设置日志轮转

4. **更新策略**
   - 定期更新镜像
   - 测试新版本兼容性
   - 制定回滚计划