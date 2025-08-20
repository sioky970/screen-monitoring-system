# 屏幕监控系统后端服务管理指南

## 概述

本系统现在支持使用 PM2 进程管理器来运行后端服务，解决了在终端执行其他命令时服务意外中断的问题。服务将在后台稳定运行，不受终端操作影响。

## 新增文件

- `ecosystem.config.js` - PM2 配置文件
- `start-pm2.sh` - PM2 启动脚本
- `service-manager.sh` - 服务管理脚本
- `logs/` - 日志目录

## 快速开始

### 1. 启动服务

```bash
# 使用 PM2 启动脚本
./start-pm2.sh

# 或使用服务管理脚本
./service-manager.sh start
```

### 2. 检查服务状态

```bash
./service-manager.sh status
```

### 3. 查看服务日志

```bash
# 查看最近 50 行日志
./service-manager.sh logs

# 查看最近 100 行日志
./service-manager.sh logs 100
```

### 4. 停止服务

```bash
./service-manager.sh stop
```

### 5. 重启服务

```bash
./service-manager.sh restart
```

## 服务管理命令

### 基本命令

| 命令 | 说明 |
|------|------|
| `./service-manager.sh start` | 启动服务 |
| `./service-manager.sh stop` | 停止服务 |
| `./service-manager.sh restart` | 重启服务 |
| `./service-manager.sh status` | 查看服务状态 |
| `./service-manager.sh logs [行数]` | 查看服务日志 |
| `./service-manager.sh monitor` | 实时监控 |
| `./service-manager.sh health` | 健康检查 |
| `./service-manager.sh help` | 显示帮助信息 |

### PM2 原生命令

```bash
# 查看所有应用
pm2 list

# 查看实时日志
pm2 logs screen-monitor-backend

# 实时监控
pm2 monit

# 重启应用
pm2 restart screen-monitor-backend

# 停止应用
pm2 stop screen-monitor-backend

# 删除应用
pm2 delete screen-monitor-backend
```

## 服务信息

- **应用名称**: screen-monitor-backend
- **端口**: 3003
- **API地址**: http://localhost:3003/api
- **API文档**: http://localhost:3003/api/docs
- **健康检查**: http://localhost:3003/health

## 日志管理

### 日志文件位置

- **综合日志**: `logs/combined.log`
- **输出日志**: `logs/out.log`
- **错误日志**: `logs/error.log`

### 查看日志

```bash
# 使用服务管理脚本
./service-manager.sh logs

# 直接查看文件
tail -f logs/combined.log
tail -f logs/out.log
tail -f logs/error.log

# 使用 PM2
pm2 logs screen-monitor-backend
```

## 故障排除

### 1. 服务启动失败

```bash
# 检查日志
./service-manager.sh logs

# 检查端口占用
lsof -i :3003

# 手动清理端口
./service-manager.sh stop
```

### 2. 服务状态异常

```bash
# 重启服务
./service-manager.sh restart

# 检查健康状态
./service-manager.sh health
```

### 3. PM2 相关问题

```bash
# 重启 PM2 守护进程
pm2 kill
pm2 resurrect

# 查看 PM2 状态
pm2 status
```

## 优势

### 1. 后台运行
- 服务在后台运行，不占用终端
- 终端可以自由执行其他命令
- 服务不会因终端操作而中断

### 2. 自动重启
- 服务异常退出时自动重启
- 内存使用超限时自动重启
- 保证服务高可用性

### 3. 日志管理
- 自动记录服务日志
- 支持日志轮转和归档
- 便于问题诊断和监控

### 4. 进程监控
- 实时监控 CPU 和内存使用
- 支持性能分析和优化
- 提供详细的运行统计

## 迁移指南

### 从旧启动方式迁移

1. **停止旧服务**
   ```bash
   # 如果使用 start-safe.sh 启动的服务还在运行
   # 按 Ctrl+C 停止或关闭对应终端
   ```

2. **使用新启动方式**
   ```bash
   ./start-pm2.sh
   ```

3. **验证服务状态**
   ```bash
   ./service-manager.sh status
   ./service-manager.sh health
   ```

### 注意事项

- 新的启动方式完全兼容现有功能
- 所有 API 端点保持不变
- 数据库和配置文件无需修改
- 可以随时在新旧启动方式之间切换

## 最佳实践

1. **使用 PM2 启动脚本进行初始启动**
   ```bash
   ./start-pm2.sh
   ```

2. **使用服务管理脚本进行日常管理**
   ```bash
   ./service-manager.sh status
   ./service-manager.sh logs
   ```

3. **定期检查服务健康状态**
   ```bash
   ./service-manager.sh health
   ```

4. **监控日志文件大小，必要时清理**
   ```bash
   # 清理日志（谨慎操作）
   > logs/combined.log
   > logs/out.log
   > logs/error.log
   ```

## 技术细节

### PM2 配置

- **实例数**: 1
- **自动重启**: 启用
- **内存限制**: 1GB
- **监控模式**: 关闭（开发环境）
- **日志合并**: 启用

### 环境变量

- `NODE_ENV`: development
- `PORT`: 3003

### 进程管理

- 优雅关闭支持 (SIGTERM)
- 强制终止支持 (SIGKILL)
- 端口冲突自动处理
- PID 文件管理