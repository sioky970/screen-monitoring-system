# 员工监控系统后端API文档

## 概述
本系统是一个员工监控平台，提供客户端管理、安全监控、白名单管理、文件管理等功能。基于NestJS框架开发，使用TypeORM进行数据库操作。

## 认证模块 (/api/auth)

### 管理员登录
- **端点**: POST /api/auth/admin/login
- **权限**: 无需认证
- **功能**: 管理员账号登录，获取JWT令牌
- **请求体**:
  ```json
  {
    "email": "admin@example.com",
    "password": "admin123"
  }
  ```
- **响应**:
  ```json
  {
    "access_token": "jwt-token",
    "refresh_token": "refresh-token",
    "user": {
      "id": 1,
      "username": "admin",
      "email": "admin@example.com",
      "role": "admin",
      "realName": "系统管理员"
    }
  }
  ```

### 客户端认证
- **端点**: POST /api/auth/client
- **权限**: 无需认证
- **功能**: 客户端首次运行时的认证注册
- **业务逻辑**:
  1. 检查是否提供UID，如果存在则更新客户端信息
  2. 通过clientNumber查找现有客户端
  3. 如不存在则创建新客户端，分配默认分组(groupId=1)
  4. 更新客户端心跳时间和状态为在线
- **请求体**:
  ```json
  {
    "uid": "可选的客户端UID",
    "clientNumber": "客户端编号",
    "clientName": "客户端名称",
    "computerName": "计算机名",
    "username": "用户名",
    "ipAddress": "IP地址",
    "macAddress": "MAC地址",
    "osVersion": "操作系统版本",
    "clientVersion": "客户端版本",
    "screenResolution": "屏幕分辨率"
  }
  ```

### 获取用户信息
- **端点**: GET /api/auth/profile
- **权限**: 需要JWT认证
- **功能**: 获取当前登录用户信息

### 修改密码
- **端点**: POST /api/auth/change-password
- **权限**: 需要JWT认证
- **功能**: 修改管理员密码

## 客户端管理模块 (/api/clients)

### 获取客户端列表
- **端点**: GET /api/clients
- **权限**: 管理员/操作员
- **功能**: 分页获取客户端列表，支持搜索、过滤、排序
- **查询参数**:
  - page: 页码(默认1)
  - pageSize: 每页数量(默认10)
  - search: 搜索关键词(客户端编号、名称、IP等)
  - status: 状态过滤(online/offline/error)
  - groupId: 分组ID过滤
  - sortBy: 排序字段(clientNumber, clientName, lastHeartbeat等)
  - sortOrder: 排序方向(asc/desc)
- **业务逻辑**:
  1. 构建动态查询，支持多条件过滤
  2. 关联查询客户端分组信息
  3. 计算客户端离线时间(基于最后心跳时间)
  4. 获取每个客户端的最新截图信息
  5. 获取每个客户端的告警数量统计

### 获取客户端统计信息
- **端点**: GET /api/clients/stats
- **权限**: 管理员/操作员
- **功能**: 获取客户端统计数据
- **返回值**:
  ```json
  {
    "total": 100,
    "online": 80,
    "offline": 15,
    "error": 5,
    "todayActive": 75
  }
  ```

### 创建客户端
- **端点**: POST /api/clients
- **权限**: 管理员
- **功能**: 手动创建客户端记录

### 批量删除客户端
- **端点**: DELETE /api/clients/batch
- **权限**: 管理员
- **功能**: 批量删除客户端记录

### 获取客户端详情
- **端点**: GET /api/clients/:id
- **权限**: 管理员/操作员
- **功能**: 获取单个客户端详细信息
- **包含信息**:
  - 基本信息(编号、名称、状态等)
  - 系统信息(操作系统、IP、MAC等)
  - 分组信息
  - 统计信息(在线时长、截图数量、告警数量)
  - 最新截图URL

### 更新客户端信息
- **端点**: PUT /api/clients/:id
- **权限**: 管理员
- **功能**: 更新客户端基本信息

### 删除客户端
- **端点**: DELETE /api/clients/:id
- **权限**: 管理员
- **功能**: 删除单个客户端记录

### 获取客户端上下线日志
- **端点**: GET /api/clients/:id/status-logs
- **权限**: 管理员/操作员
- **功能**: 获取客户端状态变化历史记录

## 客户端分组管理 (/api/client-groups)

### 获取分组列表
- **端点**: GET /api/client-groups
- **权限**: 管理员/操作员
- **功能**: 获取所有客户端分组列表

### 创建分组
- **端点**: POST /api/client-groups
- **权限**: 管理员
- **功能**: 创建新的客户端分组

### 获取分组详情
- **端点**: GET /api/client-groups/:id
- **权限**: 管理员/操作员
- **功能**: 获取分组详细信息及包含的客户端

### 更新分组
- **端点**: PUT /api/client-groups/:id
- **权限**: 管理员
- **功能**: 更新分组信息

### 删除分组
- **端点**: DELETE /api/client-groups/:id
- **权限**: 管理员
- **功能**: 删除分组(需处理分组内客户端)

## 客户端配置管理 (/api/client-config)

### 创建客户端配置
- **端点**: POST /api/client-config
- **权限**: 管理员
- **功能**: 为客户端创建监控配置
- **业务逻辑**:
  1. 验证客户端是否存在
  2. 检查是否已存在配置
  3. 合并默认配置参数
  4. 保存配置并通过WebSocket广播更新

### 查询配置列表
- **端点**: GET /api/client-config
- **权限**: 管理员/操作员
- **功能**: 分页查询客户端配置列表

### 获取指定客户端配置
- **端点**: GET /api/client-config/client/:clientId
- **权限**: 管理员/操作员
- **功能**: 获取指定客户端的详细配置

### 获取客户端有效配置
- **端点**: GET /api/client-config/client/:clientId/effective
- **权限**: 无需认证(客户端调用)
- **功能**: 客户端获取当前有效的监控配置
- **业务逻辑**:
  1. 如果客户端不存在配置，创建默认配置
  2. 返回精简的配置参数供客户端使用

### 更新客户端配置
- **端点**: PUT /api/client-config/:id
- **权限**: 管理员
- **功能**: 更新客户端配置
- **业务逻辑**:
  1. 更新配置信息
  2. 通过WebSocket广播配置更新事件

### 批量更新配置
- **端点**: PUT /api/client-config/batch
- **权限**: 管理员
- **功能**: 批量更新多个客户端的配置

### 删除配置
- **端点**: DELETE /api/client-config/:id
- **权限**: 管理员
- **功能**: 删除客户端配置

### 获取默认配置
- **端点**: GET /api/client-config/default
- **权限**: 管理员
- **功能**: 获取系统默认的客户端配置模板

### 重置配置为默认值
- **端点**: POST /api/client-config/:id/reset-to-default
- **权限**: 管理员
- **功能**: 将客户端配置重置为系统默认值

## 安全监控模块 (/api/security)

### 获取安全告警列表
- **端点**: GET /api/security/alerts
- **权限**: 管理员/操作员
- **功能**: 分页获取安全告警列表
- **查询参数**:
  - page: 页码
  - pageSize: 每页数量
  - search: 搜索关键词
  - severity: 严重级别过滤
  - status: 状态过滤(unread/read/resolved)
  - clientId: 客户端ID过滤
  - dateRange: 时间范围过滤

### 获取告警统计信息
- **端点**: GET /api/security/alerts/stats
- **权限**: 管理员/操作员
- **功能**: 获取安全告警统计数据
- **返回值**:
  ```json
  {
    "total": 50,
    "unread": 20,
    "read": 25,
    "resolved": 5,
    "critical": 10,
    "high": 15,
    "medium": 20,
    "low": 5
  }
  ```

### 创建安全告警
- **端点**: POST /api/security/alerts
- **权限**: 管理员/操作员
- **功能**: 手动创建安全告警记录

### 更新告警状态
- **端点**: PUT /api/security/alerts/:id/status
- **权限**: 管理员/操作员
- **功能**: 更新告警处理状态

### 批量忽略告警
- **端点**: PUT /api/security/alerts/batch/ignore
- **权限**: 管理员/操作员
- **功能**: 批量将告警标记为已忽略

### 删除告警
- **端点**: DELETE /api/security/alerts/:id
- **权限**: 管理员
- **功能**: 删除单个告警记录

### 批量删除告警
- **端点**: DELETE /api/security/alerts/batch
- **权限**: 管理员
- **功能**: 批量删除告警记录

### 截图上传
- **端点**: POST /api/security/screenshots/upload
- **权限**: 客户端认证
- **功能**: 客户端上传截图
- **业务逻辑**:
  1. 保存截图文件到MinIO存储
  2. 检测截图中的区块链地址
  3. 检查地址是否在白名单中
  4. 如发现违规，创建安全告警
  5. 通过WebSocket实时通知管理员

### 处理截图
- **端点**: POST /api/security/screenshots/:id/process
- **权限**: 管理员
- **功能**: 对已有截图进行区块链地址检测
- **业务逻辑**:
  1. 重新检测截图中的区块链地址
  2. 更新检测结果
  3. 如发现新的违规，创建告警

### 获取当前截图URL
- **端点**: GET /api/security/screenshots/current/:clientId
- **权限**: 管理员/操作员
- **功能**: 获取客户端最新截图的访问URL

### 获取告警截图历史
- **端点**: GET /api/security/screenshots/history/:clientId
- **权限**: 管理员/操作员
- **功能**: 获取客户端的截图历史记录

### 客户端违规上报
- **端点**: POST /api/security/violations/report
- **权限**: 客户端认证
- **功能**: 客户端主动上报违规事件
- **业务逻辑**:
  1. 接收客户端上报的违规信息
  2. 创建安全告警记录
  3. 通过WebSocket实时通知管理员

## 白名单管理模块 (/api/whitelist)

### 获取白名单列表
- **端点**: GET /api/whitelist
- **权限**: 管理员/操作员
- **功能**: 分页获取区块链地址白名单列表
- **查询参数**:
  - page: 页码
  - pageSize: 每页数量
  - search: 搜索关键词(地址或描述)
  - isActive: 激活状态过滤

### 获取白名单统计
- **端点**: GET /api/whitelist/stats
- **权限**: 管理员/操作员
- **功能**: 获取白名单统计数据
- **返回值**:
  ```json
  {
    "total": 1000,
    "active": 800,
    "inactive": 200
  }
  ```

### 添加白名单地址
- **端点**: POST /api/whitelist
- **权限**: 管理员
- **功能**: 添加新的白名单地址
- **业务逻辑**:
  1. 生成地址哈希用于快速查找
  2. 检查地址是否已存在
  3. 保存并广播更新事件

### 更新白名单地址
- **端点**: PUT /api/whitelist/:id
- **权限**: 管理员
- **功能**: 更新白名单地址信息

### 删除白名单地址
- **端点**: DELETE /api/whitelist/:id
- **权限**: 管理员
- **功能**: 删除单个白名单地址

### 批量删除白名单
- **端点**: DELETE /api/whitelist/batch
- **权限**: 管理员
- **功能**: 批量删除白名单地址

### 批量导入白名单
- **端点**: POST /api/whitelist/batch-import
- **权限**: 管理员
- **功能**: 批量导入区块链地址到白名单
- **业务逻辑**:
  1. 接收地址数组
  2. 过滤已存在的地址
  3. 批量保存新地址
  4. 广播更新事件

### 获取激活的白名单地址
- **端点**: GET /api/whitelist/active-addresses
- **权限**: 无需认证(客户端调用)
- **功能**: 客户端获取当前激活的白名单地址列表
- **业务逻辑**:
  1. 仅返回激活状态的地址
  2. 优化返回格式，减少数据传输

## 文件管理模块 (/api/files)

### 文件上传
- **端点**: POST /api/files/upload
- **权限**: 根据上传类型决定
- **功能**: 通用文件上传接口
- **支持类型**:
  - 截图文件(.jpg, .png)
  - 配置文件
  - 日志文件

### 获取文件访问URL
- **端点**: GET /api/files/:filename/url
- **权限**: 根据文件类型决定
- **功能**: 获取文件的临时访问URL

### 删除文件
- **端点**: DELETE /api/files/:filename
- **权限**: 管理员
- **功能**: 删除指定文件

## WebSocket事件

### 实时通知事件
- **连接**: ws://localhost:47831/socket.io
- **客户端事件**:
  - `client-heartbeat`: 客户端心跳
  - `screenshot-uploaded`: 截图上传完成
  - `violation-detected`: 发现违规事件
- **服务器事件**:
  - `config-updated`: 配置更新通知
  - `whitelist-updated`: 白名单更新通知
  - `new-alert`: 新告警通知
  - `client-status-changed`: 客户端状态变化

## 数据模型关系

### 主要实体关系
```
Client (客户端)
├── ClientConfig (客户端配置) - 一对一
├── ClientGroup (客户端分组) - 多对一
├── SecurityAlert (安全告警) - 一对多
├── Screenshot (截图记录) - 一对多
└── StatusLog (状态日志) - 一对多

BlockchainWhitelist (白名单地址)
├── 与SecurityAlert通过地址检测关联
└── 通过WebSocket实时同步给客户端
```

## 错误处理规范

### HTTP状态码
- **200**: 成功
- **201**: 创建成功
- **400**: 请求参数错误
- **401**: 未认证
- **403**: 权限不足
- **404**: 资源不存在
- **500**: 服务器内部错误

### 统一响应格式
```json
{
  "code": 200,
  "message": "操作成功",
  "data": {...}
}
```

## 权限说明

### 角色权限
- **ADMIN (管理员)**: 所有操作权限
- **OPERATOR (操作员)**: 查看和更新权限，不能删除
- **CLIENT (客户端)**: 只能访问特定客户端接口

### JWT令牌
- **有效期**: access_token 24小时，refresh_token 7天
- **包含信息**: 用户ID、邮箱、角色
- **使用方式**: HTTP Header `Authorization: Bearer <token>`