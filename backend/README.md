# 屏幕监控后端服务

## 概述
基于 NestJS + TypeScript 开发的企业级后端服务，提供 API 接口、实时通信、数据存储和文件管理功能。

## 技术栈
- NestJS - 企业级 Node.js 框架
- TypeScript - 强类型支持
- MySQL 8.0 - 主数据库
- Redis 7.0 - 缓存和会话
- MinIO - 对象存储
- WebSocket - 实时通信

## 核心模块
- 客户端管理
- 截图处理
- 安全告警
- 白名单管理  
- 用户权限
- 实时通信

## 数据库设计
详见技术方案文档中的完整数据库设计，包含7张核心表：
- client_groups - 客户端分组
- clients - 客户端信息
- security_screenshots - 安全告警截图
- blockchain_whitelist - 区块链地址白名单
- system_users - 系统用户
- system_logs - 操作日志
- client_online_logs - 在线记录

## 开发环境
```bash
npm install
docker-compose up -d  # 启动依赖服务
npm run start:dev
```

## API 文档
启动后访问：http://localhost:3001/api/docs

## 待开发功能
- [ ] 基础 API 框架搭建
- [ ] 数据库模型和迁移
- [ ] 客户端管理接口
- [ ] 截图上传和处理
- [ ] MinIO 存储集成
- [ ] WebSocket 实时通信
- [ ] 安全告警处理
- [ ] 白名单管理接口
- [ ] 用户认证和权限
- [ ] 系统日志记录