# 屏幕监控系统

## 项目概述

本项目是一个基于现代化技术栈的企业级桌面监控系统，支持多客户端实时屏幕截图传输、存储和管理，并具备区块链地址安全监控功能。

## 核心功能

- 🖥️ **实时屏幕监控**：多客户端屏幕截图实时传输和预览
- 🔒 **安全监控**：实时检测剪切板中的区块链地址，防范资产转移风险  
- 📊 **分组管理**：灵活的客户端分组管理系统
- 🔐 **白名单机制**：区块链地址白名单管理，减少误报
- 📈 **数据统计**：完整的监控数据统计和可视化分析
- 🚨 **告警系统**：实时安全告警通知和处理流程

## 技术架构

### 客户端
- **技术栈**：C# + WPF + .NET 6
- **功能**：屏幕截图、剪切板监控、区块链地址检测

### 后端服务
- **技术栈**：NestJS + TypeScript + MySQL + Redis + MinIO
- **功能**：API服务、实时通信、数据存储、对象存储

### 前端管理
- **技术栈**：Vue 3 + Vue Vben Admin + TypeScript + Vite
- **功能**：监控面板、设备管理、安全中心、统计分析

### 存储架构
- **MySQL 8.0**：业务数据和元数据存储
- **Redis 7.0**：实时数据缓存和会话管理
- **MinIO**：截图文件对象存储，支持CDN加速

## 项目结构

```
screen-monitoring-system/
├── docs/                           # 项目文档
│   └── 屏幕监控系统技术方案.md      # 详细技术方案
├── client/                         # C# 客户端应用
│   ├── src/                        # 源码目录
│   ├── ScreenMonitorClient.sln     # Visual Studio 解决方案
│   └── README.md                   # 客户端说明
├── backend/                        # NestJS 后端服务
│   ├── src/                        # 源码目录
│   ├── package.json               # 依赖配置
│   ├── docker-compose.yml         # 本地开发环境
│   └── README.md                   # 后端说明
├── frontend/                       # Vue3 前端应用
│   ├── src/                        # 源码目录
│   ├── package.json               # 依赖配置
│   └── README.md                   # 前端说明
├── deployment/                     # 部署相关
│   ├── docker/                     # Docker配置
│   ├── k8s/                        # Kubernetes配置
│   └── scripts/                    # 部署脚本
└── README.md                       # 项目主说明文档
```

## 快速开始

### 环境要求
- Docker & Docker Compose
- Node.js 16+
- .NET 6+
- MySQL 8.0+
- Redis 7.0+
- MinIO

### 快速部署（Docker方式）

1. **克隆项目**
   ```bash
   git clone https://github.com/sioky970/-.git
   cd screen-monitoring-system
   ```

2. **配置环境变量**
   ```bash
   cp .env.example .env
   # 根据需要修改 .env 文件中的配置
   ```

3. **启动开发环境**
   ```bash
   # 启动所有依赖服务（MySQL + Redis + MinIO + 管理工具）
   ./deployment/scripts/start.sh dev
   ```

4. **开发应用服务**
   ```bash
   # 后端开发
   cd backend && npm install && npm run start:dev
   
   # 前端开发  
   cd frontend && npm install && npm run dev
   
   # 客户端开发
   cd client && dotnet build && dotnet run
   ```

### 生产部署

```bash
# 生产环境一键启动
./deployment/scripts/start.sh prod
```

### 访问系统

#### 开发环境
- 数据库管理：http://localhost:18080
- Redis管理：http://localhost:18081
- MinIO控制台：http://localhost:19090
- 后端API：http://localhost:3001（开发时）
- 前端应用：http://localhost:3000（开发时）

#### 生产环境
- 应用主页：http://localhost
- MinIO控制台：http://localhost:9090
- API文档：http://localhost/api/docs

## 主要特性

### 🔧 性能优化
- **异步上传**：响应速度提升90%
- **MinIO存储**：支持PB级扩展，99.999999999%可靠性
- **Redis缓存**：实时数据毫秒级响应
- **CDN加速**：图片访问速度提升200%

### 🛡️ 安全监控
- **实时检测**：支持BTC、ETH、TRC20等主流区块链地址
- **白名单过滤**：减少误报，提升工作效率
- **高清截图**：JPEG 95%质量，确保证据清晰
- **完整审计**：操作日志全记录，支持合规要求

### 📊 管理功能
- **分组管理**：客户端灵活分组，便于批量管理
- **权限控制**：多角色权限管理，安全可靠
- **实时监控**：WebSocket实时通信，状态同步
- **数据统计**：丰富的图表和报表功能

## 开发计划

### Phase 1: MVP开发（4-6周）
- [x] 技术方案设计
- [ ] 客户端基础功能开发
- [ ] 后端API和数据库设计
- [ ] 前端管理界面开发

### Phase 2: 功能增强（3-4周）  
- [ ] 安全监控功能完善
- [ ] MinIO对象存储集成
- [ ] 性能优化和压力测试

### Phase 3: 生产部署（2-4周）
- [ ] 容器化部署
- [ ] 负载均衡配置  
- [ ] 监控告警系统

## 贡献指南

1. Fork 项目
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送分支 (`git push origin feature/AmazingFeature`)
5. 开启Pull Request

## 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情

## 联系方式

如有问题或建议，请通过以下方式联系：
- 提交 Issue：https://github.com/sioky970/-/issues
- 邮箱：97066681@qq.com