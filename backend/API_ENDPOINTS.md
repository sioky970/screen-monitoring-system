# 屏幕监控系统后端 API 接口文档

## 概述

本文档详细描述了屏幕监控系统后端的所有API接口。系统基于NestJS构建，提供完整的客户端监控、安全告警、用户认证等功能。

- **基础URL**: `http://localhost:3003/api`
- **API文档**: `http://localhost:3003/api/docs`
- **健康检查**: `http://localhost:3003/health`
- **认证方式**: JWT Bearer Token
- **实时通信**: 已移除WebSocket，改为HTTP轮询机制

---

## 🔒 认证管理 (auth)

### 管理员认证

| 方法 | 路径 | 描述 | 认证 |
|------|------|------|------|
| POST | `/auth/login` | 管理员登录 | 无 |
| POST | `/auth/logout` | 退出登录 | 无 |
| GET | `/auth/profile` | 获取用户信息 | JWT |
| POST | `/auth/change-password` | 修改密码 | 无 |

### 客户端认证

| 方法 | 路径 | 描述 | 认证 |
|------|------|------|------|
| POST | `/auth/client` | 客户端认证 | 无 |

---

## 💻 客户端管理 (clients)

### 客户端基础管理

| 方法 | 路径 | 描述 | 认证 |
|------|------|------|------|
| GET | `/clients` | 获取客户端列表 | 无 |
| GET | `/clients/stats` | 获取客户端统计信息 | 无 |
| POST | `/clients/heartbeat` | 客户端心跳 | 无 |
| POST | `/clients` | 创建客户端 | 无 |
| POST | `/clients/bulk-delete` | 批量删除客户端 | 无 |
| GET | `/clients/:id` | 获取客户端详情 | 无 |
| GET | `/clients/:id/detail` | 获取客户端完整详情信息 | 无 |
| PUT | `/clients/:id` | 更新客户端信息 | 无 |
| DELETE | `/clients/:id` | 删除客户端 | 无 |
| GET | `/clients/:id/online-logs` | 获取客户端上下线日志 | 无 |

### 客户端分组管理

| 方法 | 路径 | 描述 | 认证 |
|------|------|------|------|
| GET | `/clients/groups/list` | 获取客户端分组列表 | 无 |
| POST | `/clients/groups` | 创建客户端分组 | 无 |
| GET | `/clients/groups/:id` | 获取客户端分组详情 | 无 |
| PUT | `/clients/groups/:id` | 更新客户端分组 | 无 |
| DELETE | `/clients/groups/:id` | 删除客户端分组 | 无 |

---

## ⚙️ 客户端配置管理 (client-config)

| 方法 | 路径 | 描述 | 认证 |
|------|------|------|------|
| POST | `/client-config` | 创建客户端配置 | 无 |
| GET | `/client-config` | 查询客户端配置列表 | 无 |
| GET | `/client-config/client/:clientId` | 获取指定客户端的配置 | 无 |
| GET | `/client-config/client/:clientId/effective` | 获取客户端有效配置 | 无 |
| PUT | `/client-config/:id` | 更新客户端配置 | 无 |
| PUT | `/client-config/batch` | 批量更新客户端配置 | 无 |
| DELETE | `/client-config/:id` | 删除客户端配置 | 无 |
| GET | `/client-config/default` | 获取默认配置 | 无 |
| POST | `/client-config/client/:clientId/reset` | 重置客户端配置为默认值 | 无 |

---

## 🛡️ 安全监控 (security)

### 安全告警管理

| 方法 | 路径 | 描述 | 认证 |
|------|------|------|------|
| GET | `/security/alerts` | 获取安全告警列表 | 无 |
| GET | `/security/stats` | 获取安全统计信息 | 无 |
| POST | `/security/alerts` | 创建安全告警 | JWT |
| GET | `/security/alerts/:id` | 获取安全告警详情 | 无 |
| PUT | `/security/alerts/:id/status` | 更新告警状态 | 无 |
| DELETE | `/security/alerts/:id` | 删除安全告警 | 无 |
| PUT | `/security/alerts/ignore-all/:clientId` | 忽略指定客户端的全部未处理违规 | 无 |
| POST | `/security/alerts/ignore-all` | 忽略指定客户端的全部未处理违规（POST版本） | 无 |

### 截图上传和处理

| 方法 | 路径 | 描述 | 认证 |
|------|------|------|------|
| POST | `/security/screenshots/upload` | 上传截图 | 无 |
| POST | `/security/screenshots/process` | 处理截图内容检测 | 无 |
| GET | `/security/screenshots/:clientId/current` | 获取客户端当前截图URL | 无 |
| GET | `/security/screenshots/:clientId/alerts` | 获取客户端告警截图历史 | 无 |

### 客户端违规上报

| 方法 | 路径 | 描述 | 认证 |
|------|------|------|------|
| POST | `/security/violations/report` | 客户端上报违规事件 | 无 |

### 截图上传 + 心跳合并接口

| 方法 | 路径 | 描述 | 认证 |
|------|------|------|------|
| POST | `/security/screenshots/upload-with-heartbeat` | 上传截图并发送心跳 | 无 |

---

## 📁 文件管理 (files)

| 方法 | 路径 | 描述 | 认证 |
|------|------|------|------|
| POST | `/files/upload` | 上传文件 | JWT |
| GET | `/files/:key/url` | 获取文件访问URL | 无 |
| DELETE | `/files/:key` | 删除文件 | JWT |

---

## 📢 通知管理 (notifications)

| 方法 | 路径 | 描述 | 认证 |
|------|------|------|------|
| GET | `/notifications` | 获取通知列表 | JWT |
| GET | `/notifications/:id` | 获取通知详情 | JWT |

---

## 📈 系统管理 (system)

| 方法 | 路径 | 描述 | 认证 |
|------|------|------|------|
| GET | `/system/logs` | 获取系统日志 | JWT |
| GET | `/system/database/status` | 获取数据库状态 | 无 |

---

## ✅ 白名单管理 (whitelist)

| 方法 | 路径 | 描述 | 认证 |
|------|------|------|------|
| GET | `/whitelist` | 获取白名单列表 | 无 |
| GET | `/whitelist/stats` | 获取白名单统计信息 | 无 |
| POST | `/whitelist` | 添加白名单地址 | 无 |
| GET | `/whitelist/:id` | 获取白名单详情 | 无 |
| PUT | `/whitelist/:id` | 更新白名单信息 | 无 |
| PUT | `/whitelist/:id/status` | 更新白名单状态 | 无 |
| DELETE | `/whitelist/:id` | 删除白名单地址 | 无 |
| POST | `/whitelist/batch-delete` | 批量删除白名单 | 无 |
| POST | `/whitelist/import` | 批量导入白名单 | 无 |
| GET | `/whitelist/addresses/active` | 获取所有激活的白名单地址 | 无 |

---

## 🌐 全局路由

| 方法 | 路径 | 描述 | 认证 |
|------|------|------|------|
| GET | `/health` | 健康检查 | 无 |
| GET | `/api/docs` | API文档 | 无 |
| GET | `/api/docs-json` | API文档JSON | 无 |

---

## 📡 WebSocket 事件

### 连接信息
- **URL**: `ws://localhost:3005/monitor`
- **命名空间**: `/monitor`

### 支持的事件
- 客户端状态变更通知
- 安全告警实时推送
- 系统状态更新
- 实时监控数据

---

## 🔐 认证说明

### JWT认证
- **Header**: `Authorization: Bearer <token>`
- **获取方式**: 通过 `/auth/login` 接口获取
- **有效期**: 根据系统配置

### 公开接口
大部分接口标记为 `@Public()`，无需认证即可访问。这是为了方便客户端直接调用。

---

## 📊 响应格式

### 成功响应
```json
{
  "code": 200,
  "message": "操作成功",
  "data": {},
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

### 错误响应
```json
{
  "code": 400,
  "message": "请求参数错误",
  "error": "详细错误信息",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

---

## 🚀 快速开始

1. **启动服务**
   ```bash
   npm run start:dev
   ```

2. **访问API文档**
   ```
   http://localhost:3003/api/docs
   ```

3. **健康检查**
   ```bash
   curl http://localhost:3003/health
   ```

4. **管理员登录**
   ```bash
   curl -X POST http://localhost:3003/api/auth/login \
     -H "Content-Type: application/json" \
     -d '{"email":"admin@example.com","password":"password"}'
   ```

---

## 📝 注意事项

1. **文件上传限制**: 截图文件最大10MB
2. **频率限制**: 截图上传每分钟最多30次，违规上报每分钟最多10次
3. **文件类型**: 只允许上传图片文件
4. **数据库**: 支持MySQL和SQLite
5. **存储**: 使用MinIO对象存储
6. **缓存**: 使用Redis缓存

---

## 🔧 技术栈

- **框架**: NestJS + TypeScript
- **数据库**: MySQL 8.0 + TypeORM
- **缓存**: Redis 7.0
- **存储**: MinIO 对象存储
- **实时通信**: Socket.IO WebSocket
- **认证**: JWT Bearer Token
- **文档**: Swagger/OpenAPI
- **安全**: Helmet + CORS
- **压缩**: Compression

---

*文档生成时间: 2024-12-19*
*API版本: v1.0.0*