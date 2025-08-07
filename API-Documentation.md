# Screen Monitoring System - 后端API接口文档

## 📋 目录

- [概述](#概述)
- [认证授权](#认证授权)
- [API模块](#api模块)
  - [🔒 认证授权模块](#认证授权模块-auth)
  - [💻 客户端管理模块](#客户端管理模块-clients)
  - [🛡️ 安全监控模块](#安全监控模块-security)
  - [📁 文件管理模块](#文件管理模块-files)
  - [🔔 通知管理模块](#通知管理模块-notifications)
  - [👥 用户管理模块](#用户管理模块-users)
  - [⚪ 白名单管理模块](#白名单管理模块-whitelist)
  - [⚙️ 系统管理模块](#系统管理模块-system)
  - [🔌 WebSocket模块](#websocket模块)
- [数据模型](#数据模型)
- [错误码说明](#错误码说明)

## 概述

屏幕监控系统后端基于 NestJS 构建，提供完整的企业级桌面监控解决方案。系统支持实时屏幕监控、安全告警、客户端管理、用户权限控制等核心功能。

**技术栈**：
- NestJS + TypeScript
- MySQL 8.0 + Redis 7.0
- MinIO 对象存储
- Socket.IO 实时通信
- JWT 认证授权
- Swagger API 文档

**基础URL**: `http://localhost:47828/api`

## 认证授权

### 认证方式
- **JWT Token**: 在请求头中添加 `Authorization: Bearer <token>`
- **无认证**: 部分公开接口不需要认证

### 用户角色
- **ADMIN** (管理员): 拥有所有权限
- **OPERATOR** (操作员): 拥有操作权限，不能删除重要数据
- **VIEWER** (查看者): 只有查看权限

---

## API模块

## 🔒 认证授权模块 (auth)

**基础路径**: `/auth`

### POST /auth/login
**功能**: 用户登录  
**认证**: 无  

**请求参数**:
```json
{
  "email": "string",        // 邮箱地址
  "password": "string"      // 密码
}
```

**响应示例**:
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "username": "admin",
    "email": "admin@example.com",
    "role": "ADMIN"
  }
}
```

### POST /auth/register
**功能**: 用户注册  
**认证**: 无  

**请求参数**:
```json
{
  "email": "string",            // 邮箱地址
  "username": "string",         // 用户名 (3-50字符)
  "password": "string"          // 密码 (最少8字符)
}
```

**响应示例**:
```json
{
  "message": "注册成功",
  "user": {
    "id": 1,
    "username": "newuser",
    "email": "newuser@example.com",
    "role": "VIEWER"
  }
}
```

### POST /auth/refresh
**功能**: 刷新访问令牌  
**认证**: 无  

**请求参数**:
```json
{
  "refresh_token": "string"     // 刷新令牌
}
```

### POST /auth/logout
**功能**: 用户退出  
**认证**: JWT  

### POST /auth/change-password
**功能**: 修改密码  
**认证**: JWT  

**请求参数**:
```json
{
  "currentPassword": "string",  // 当前密码
  "newPassword": "string"       // 新密码 (最少8字符)
}
```

### GET /auth/profile
**功能**: 获取用户信息  
**认证**: JWT  

**响应示例**:
```json
{
  "id": 1,
  "username": "admin",
  "email": "admin@example.com",
  "role": "ADMIN",
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:00:00.000Z"
}
```

---

## 💻 客户端管理模块 (clients)

**基础路径**: `/clients`  
**认证要求**: 所有接口都需要JWT认证

### GET /clients
**功能**: 获取客户端列表  
**权限**: 无特殊要求  

**查询参数**:
- `page` (number): 页码，默认1
- `pageSize` (number): 每页大小，默认20，最大100
- `search` (string): 搜索关键词（可选）
- `status` (ClientStatus): 客户端状态（可选）
- `groupId` (number): 分组ID（可选）

**响应示例**:
```json
{
  "data": [
    {
      "id": "client-001",
      "clientNumber": "WIN-001",
      "computerName": "DESKTOP-ABC123",
      "ip": "192.168.1.100",
      "mac": "00:11:22:33:44:55",
      "os": "Windows 10",
      "version": "1.0.0",
      "status": "ONLINE",
      "lastSeen": "2024-01-01T12:00:00.000Z",
      "group": {
        "id": 1,
        "name": "开发组"
      }
    }
  ],
  "total": 50,
  "page": 1,
  "pageSize": 20,
  "totalPages": 3
}
```

### GET /clients/stats
**功能**: 获取客户端统计信息  

**响应示例**:
```json
{
  "totalClients": 100,
  "onlineClients": 85,
  "offlineClients": 15,
  "errorClients": 0,
  "recentAlerts": 12
}
```

### POST /clients
**功能**: 创建客户端  
**权限**: ADMIN/OPERATOR  

**请求参数**:
```json
{
  "clientNumber": "string",     // 客户端编号 (最大50字符)
  "computerName": "string",     // 计算机名 (最大100字符)
  "os": "string",              // 操作系统 (可选，最大50字符)
  "version": "string",         // 版本号 (可选，最大20字符)
  "groupId": "number",         // 分组ID (可选)
  "remark": "string"           // 备注 (可选，最大500字符)
}
```

### GET /clients/:id
**功能**: 获取客户端详情  

**路径参数**:
- `id` (string): 客户端ID

### PUT /clients/:id
**功能**: 更新客户端信息  
**权限**: ADMIN/OPERATOR  

**路径参数**:
- `id` (string): 客户端ID

**请求参数**: 与创建客户端相同，所有字段都为可选

### DELETE /clients/:id
**功能**: 删除客户端  
**权限**: ADMIN  

### POST /clients/bulk-delete
**功能**: 批量删除客户端  
**权限**: ADMIN  

**请求参数**:
```json
{
  "ids": ["client-001", "client-002"]  // 客户端ID数组，至少1个
}
```

### GET /clients/:id/online-logs
**功能**: 获取客户端上下线日志  

**路径参数**:
- `id` (string): 客户端ID

**查询参数**:
- `page` (number): 页码，默认1
- `pageSize` (number): 每页大小，默认50

### 客户端分组管理

### GET /clients/groups/list
**功能**: 获取客户端分组列表  

### POST /clients/groups
**功能**: 创建客户端分组  
**权限**: ADMIN/OPERATOR  

**请求参数**:
```json
{
  "name": "string",            // 分组名称 (最大100字符)
  "description": "string"      // 描述 (可选，最大500字符)
}
```

### GET /clients/groups/:id
**功能**: 获取客户端分组详情  

### PUT /clients/groups/:id
**功能**: 更新客户端分组  
**权限**: ADMIN/OPERATOR  

### DELETE /clients/groups/:id
**功能**: 删除客户端分组  
**权限**: ADMIN  

**客户端状态枚举**:
- `ONLINE`: 在线
- `OFFLINE`: 离线
- `ERROR`: 错误
- `INSTALLING`: 安装中

---

## 🛡️ 安全监控模块 (security)

**基础路径**: `/security`  
**认证要求**: 所有接口都需要JWT认证

### GET /security/alerts
**功能**: 获取安全告警列表  

**查询参数**:
- `page` (number): 页码，默认1
- `pageSize` (number): 每页大小，默认20，最大100
- `clientId` (string): 客户端ID（可选）
- `alertType` (AlertType): 告警类型（可选）
- `status` (AlertStatus): 告警状态（可选）
- `startDate` (string): 开始日期（可选）
- `endDate` (string): 结束日期（可选）

**响应示例**:
```json
{
  "data": [
    {
      "id": 1,
      "clientId": "client-001",
      "alertType": "BLOCKCHAIN_ADDRESS",
      "blockchainAddress": "1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa",
      "screenshotPath": "screenshots/2024/01/01/screenshot-001.jpg",
      "clipboardContent": "bitcoin:1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa",
      "riskLevel": "HIGH",
      "status": "PENDING",
      "createdAt": "2024-01-01T12:00:00.000Z",
      "client": {
        "clientNumber": "WIN-001",
        "computerName": "DESKTOP-ABC123"
      }
    }
  ],
  "total": 25,
  "page": 1,
  "pageSize": 20
}
```

### GET /security/stats
**功能**: 获取安全统计信息  

**响应示例**:
```json
{
  "totalAlerts": 150,
  "pendingAlerts": 12,
  "confirmedAlerts": 138,
  "falsePositiveAlerts": 0,
  "highRiskAlerts": 25,
  "todayAlerts": 8,
  "alertsByType": {
    "BLOCKCHAIN_ADDRESS": 120,
    "SUSPICIOUS_ACTIVITY": 30
  }
}
```

### POST /security/alerts
**功能**: 创建安全告警  
**权限**: ADMIN/OPERATOR  

**请求参数**:
```json
{
  "clientId": "string",                    // 客户端ID
  "alertType": "BLOCKCHAIN_ADDRESS",       // 告警类型
  "blockchainAddress": "string",           // 区块链地址 (可选，最大100字符)
  "screenshotPath": "string",              // 截图路径 (可选，最大500字符)
  "clipboardContent": "string",            // 剪贴板内容 (可选)
  "remark": "string"                       // 备注 (可选，最大1000字符)
}
```

### GET /security/alerts/:id
**功能**: 获取安全告警详情  

### PUT /security/alerts/:id/status
**功能**: 更新告警状态  
**权限**: ADMIN/OPERATOR  

**请求参数**:
```json
{
  "status": "CONFIRMED",       // 告警状态
  "remark": "string"          // 备注 (可选，最大1000字符)
}
```

### DELETE /security/alerts/:id
**功能**: 删除安全告警  
**权限**: ADMIN  

### POST /security/screenshots/upload
**功能**: 上传截图  

**请求参数**:
- `file`: 截图文件 (multipart/form-data)
- `clientId` (string): 客户端ID
- `clipboardContent` (string): 剪贴板内容（可选）

### POST /security/screenshots/process
**功能**: 处理截图内容检测  

**请求参数**:
```json
{
  "clientId": "string",          // 客户端ID
  "screenshotPath": "string",    // 截图路径
  "clipboardContent": "string"   // 剪贴板内容（可选）
}
```

**安全相关枚举**:

**RiskLevel** (风险等级):
- `LOW`: 低风险
- `MEDIUM`: 中等风险
- `HIGH`: 高风险
- `CRITICAL`: 严重风险

**AlertStatus** (告警状态):
- `PENDING`: 待处理
- `CONFIRMED`: 已确认
- `FALSE_POSITIVE`: 误报
- `IGNORED`: 已忽略

**AlertType** (告警类型):
- `BLOCKCHAIN_ADDRESS`: 区块链地址检测
- 其他类型待完善

---

## 📁 文件管理模块 (files)

**基础路径**: `/files`

### POST /files/upload
**功能**: 上传文件  
**认证**: 无  

**请求参数**:
- `file`: 文件 (multipart/form-data)

**响应示例**:
```json
{
  "key": "files/2024/01/01/file-123.jpg",
  "url": "http://minio:9000/screen-monitor/files/2024/01/01/file-123.jpg",
  "size": 1024000,
  "mimeType": "image/jpeg"
}
```

### GET /files/:key/url
**功能**: 获取文件访问URL  
**认证**: 无  

**路径参数**:
- `key` (string): 文件键值

**响应示例**:
```json
{
  "url": "http://minio:9000/screen-monitor/files/2024/01/01/file-123.jpg?X-Amz-Algorithm=AWS4-HMAC-SHA256&...",
  "expiresIn": 3600
}
```

### DELETE /files/:key
**功能**: 删除文件  
**认证**: 无  

---

## 🔔 通知管理模块 (notifications)

**基础路径**: `/notifications`

### GET /notifications
**功能**: 获取通知列表  
**认证**: 无  

**响应示例**:
```json
{
  "data": [
    {
      "id": 1,
      "title": "安全告警",
      "content": "检测到可疑的区块链地址活动",
      "type": "SECURITY_ALERT",
      "read": false,
      "createdAt": "2024-01-01T12:00:00.000Z"
    }
  ]
}
```

### GET /notifications/:id
**功能**: 获取通知详情  
**认证**: 无  

---

## 👥 用户管理模块 (users)

**基础路径**: `/users`

### GET /users
**功能**: 获取用户列表  
**认证**: 无  

**响应示例**:
```json
{
  "data": [
    {
      "id": 1,
      "username": "admin",
      "email": "admin@example.com",
      "role": "ADMIN",
      "isActive": true,
      "createdAt": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

---

## ⚪ 白名单管理模块 (whitelist)

**基础路径**: `/whitelist`

### GET /whitelist
**功能**: 获取白名单列表  
**认证**: 无  

**响应示例**:
```json
{
  "data": [
    {
      "id": 1,
      "address": "1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa",
      "type": "BITCOIN",
      "description": "测试钱包地址",
      "isActive": true,
      "createdAt": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

### GET /whitelist/:id
**功能**: 获取白名单详情  
**认证**: 无  

---

## ⚙️ 系统管理模块 (system)

**基础路径**: `/system`

### GET /system/logs
**功能**: 获取系统日志  
**认证**: 无  

**响应示例**:
```json
{
  "data": [
    {
      "id": 1,
      "level": "INFO",
      "message": "用户登录成功",
      "context": "AuthService",
      "timestamp": "2024-01-01T12:00:00.000Z",
      "userId": 1,
      "ip": "192.168.1.100"
    }
  ]
}
```

---

## 🔌 WebSocket模块

**WebSocket Gateway**: `ws://localhost:3002/monitor`

### 连接管理

**连接URL**: `ws://localhost:3002/monitor`

### 客户端发送事件

| 事件名称 | 数据格式 | 描述 |
|---------|---------|------|
| `join-user-room` | `{ userId: number }` | 用户加入房间 |
| `join-client-room` | `{ clientId: string }` | 客户端加入房间 |
| `client-heartbeat` | `{ clientId: string, status: any, ip?: string }` | 客户端心跳 |
| `request-client-list` | - | 请求客户端列表 |
| `request-security-stats` | - | 请求安全统计 |

### 服务端发送事件

| 事件名称 | 数据格式 | 描述 |
|---------|---------|------|
| `connection-success` | `{ clientId: string, timestamp: Date }` | 连接成功通知 |
| `room-joined` | `{ room: string, timestamp: Date }` | 房间加入成功 |
| `client-list-response` | `{ timestamp: Date }` | 客户端列表响应 |
| `security-stats-response` | `{ timestamp: Date }` | 安全统计响应 |

### WebSocket 使用示例

```javascript
const socket = io('ws://localhost:3002/monitor');

// 连接成功
socket.on('connection-success', (data) => {
  console.log('WebSocket连接成功:', data);
});

// 加入用户房间
socket.emit('join-user-room', { userId: 1 });

// 监听房间加入成功
socket.on('room-joined', (data) => {
  console.log('成功加入房间:', data);
});

// 发送心跳
setInterval(() => {
  socket.emit('client-heartbeat', {
    clientId: 'client-001',
    status: 'ONLINE',
    ip: '192.168.1.100'
  });
}, 30000);
```

---

## 数据模型

### 主要实体关系

```
User (用户)
├─ role: ADMIN | OPERATOR | VIEWER
└─ 创建: SecurityScreenshot, Client

ClientGroup (客户端分组)
├─ name: 分组名称
└─ 包含: Client[]

Client (客户端)
├─ clientNumber: 客户端编号
├─ status: ONLINE | OFFLINE | ERROR | INSTALLING
├─ group: ClientGroup
└─ 关联: SecurityScreenshot[], ClientOnlineLog[]

SecurityScreenshot (安全截图)
├─ alertType: 告警类型
├─ riskLevel: LOW | MEDIUM | HIGH | CRITICAL
├─ status: PENDING | CONFIRMED | FALSE_POSITIVE | IGNORED
├─ client: Client
└─ screenshotUrl: MinIO文件地址

BlockchainWhitelist (区块链白名单)
├─ address: 区块链地址
├─ type: 地址类型
└─ isActive: 是否活跃

SystemLog (系统日志)
├─ level: 日志级别
├─ message: 日志消息
└─ user: User

Notification (通知)
├─ title: 通知标题
├─ type: 通知类型
└─ read: 是否已读
```

### 数据库表结构

核心数据库表包括：
- `system_users` - 系统用户和权限
- `client_groups` - 客户端分组管理
- `clients` - 客户端信息和状态
- `security_screenshots` - 安全告警截图记录
- `blockchain_whitelist` - 区块链地址白名单
- `system_logs` - 操作日志审计
- `client_online_logs` - 在线时长统计

---

## 错误码说明

### HTTP 状态码

| 状态码 | 说明 |
|-------|------|
| 200 | 请求成功 |
| 201 | 创建成功 |
| 400 | 请求参数错误 |
| 401 | 未授权 |
| 403 | 权限不足 |
| 404 | 资源不存在 |
| 422 | 数据验证失败 |
| 500 | 服务器内部错误 |

### 业务错误码

```json
{
  "statusCode": 400,
  "message": "验证失败",
  "error": "Bad Request",
  "details": [
    {
      "field": "email",
      "message": "邮箱格式不正确"
    }
  ]
}
```

### 常见错误响应

**认证失败**:
```json
{
  "statusCode": 401,
  "message": "访问令牌无效",
  "error": "Unauthorized"
}
```

**权限不足**:
```json
{
  "statusCode": 403,
  "message": "权限不足",
  "error": "Forbidden"
}
```

**资源不存在**:
```json
{
  "statusCode": 404,
  "message": "客户端不存在",
  "error": "Not Found"
}
```

---

## 使用指南

### 1. 获取认证令牌

```bash
curl -X POST http://localhost:47828/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@example.com",
    "password": "password"
  }'
```

### 2. 使用认证令牌访问API

```bash
curl -X GET http://localhost:47828/api/clients \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### 3. 上传截图文件

```bash
curl -X POST http://localhost:47828/api/security/screenshots/upload \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -F "file=@screenshot.jpg" \
  -F "clientId=client-001" \
  -F "clipboardContent=bitcoin:1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa"
```

### 4. WebSocket 连接

```javascript
// 连接WebSocket
const socket = io('ws://localhost:3002/monitor', {
  auth: {
    token: 'YOUR_JWT_TOKEN'
  }
});
```

---

## 技术架构特点

1. **模块化设计**: 按功能模块划分API接口，便于维护和扩展
2. **角色权限控制**: 基于RBAC的权限管理，支持三级权限
3. **实时通信**: WebSocket支持实时数据推送和状态同步  
4. **文件存储**: MinIO对象存储，支持大规模文件管理
5. **数据缓存**: Redis缓存提升查询性能
6. **API文档**: Swagger自动生成API文档
7. **数据验证**: 全面的请求参数验证和错误处理
8. **日志审计**: 完整的操作日志记录，支持合规要求

本文档基于实际代码分析生成，如有更新请及时同步修改。更多详细信息请参考源代码和 Swagger 文档。