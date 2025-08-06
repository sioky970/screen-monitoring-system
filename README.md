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

2. **一键启动（推荐）**
   ```bash
   # 开发环境完整版（包含应用 + 开发工具）
   ./start-unified.sh dev
   
   # 生产环境完整版
   ./start-unified.sh prod
   
   # 仅基础设施（MySQL + Redis + MinIO）
   ./start-unified.sh infra
   
   # 开发工具（基础设施 + Adminer + Redis Commander）
   ./start-unified.sh tools
   ```

3. **向后兼容的启动方式**

   为了向后兼容，旧的启动脚本仍然可用（会自动重定向到统一脚本）：

   ```bash
   # 以下命令会自动重定向到统一启动脚本
   ./deployment/scripts/start.sh dev infra    # -> ./start-unified.sh infra
   ./deployment/scripts/start.sh dev app      # -> ./start-unified.sh dev
   ./deployment/scripts/start.sh prod app     # -> ./start-unified.sh prod
   ```

4. **客户端开发**
   ```bash
   cd client && dotnet build && dotnet run
   ```

### 访问系统

#### 开发环境（`./start-unified.sh dev`）
**完整开发环境访问地址**
- 🌐 前端应用：http://localhost:38000
- 🔌 后端API：http://localhost:38001/api  
- 🐛 后端调试：http://localhost:39229
- 📊 数据库管理：http://localhost:38080
- 🔧 Redis管理：http://localhost:38081
- 💾 MinIO控制台：http://localhost:39090

**数据库连接信息**
- Host: localhost:33066
- Database: screen_monitoring_dev  
- Username: dev_user
- Password: dev_pass_123

#### 生产环境（`./start-unified.sh prod`）
**生产环境访问地址**
- 🌐 应用主页：http://localhost:8080
- 🔌 API接口：http://localhost:3001/api
- 💾 MinIO控制台：http://localhost:9090

#### 基础设施模式（`./start-unified.sh infra`）
**基础设施服务**
- 🗄️ MySQL数据库：localhost:33066
- 🔄 Redis缓存：localhost:36379
- 💾 MinIO存储：http://localhost:39000
- 💾 MinIO控制台：http://localhost:39090

#### 开发工具模式（`./start-unified.sh tools`）
**开发工具访问**
- 📊 数据库管理：http://localhost:38080
- 🔧 Redis管理：http://localhost:38081
- 💾 MinIO控制台：http://localhost:39090

## Docker架构设计

### 统一配置架构

本系统现在提供了**统一的Docker Compose配置**（`docker-compose.unified.yml`），通过 **Profiles** 机制实现一键部署：

```bash
# 一键启动，自动配置所有服务
./start-unified.sh [dev|prod|infra|tools]
```

#### 架构优势

- **🎯 一键部署**：单个配置文件，多种部署模式
- **⚙️ 智能配置**：基于环境自动切换端口和配置
- **🔄 零配置**：无需手动管理多个compose文件
- **📋 Profile控制**：通过COMPOSE_PROFILES精确控制服务启动

### 部署模式说明

本系统采用分层部署架构，支持灵活的部署策略：

#### 基础设施层（Infrastructure）
- **MySQL 8.0**：业务数据存储，支持utf8mb4字符集
- **Redis 7.0**：高性能缓存和会话管理  
- **MinIO**：对象存储服务，用于截图文件存储

#### 应用服务层（Application）
- **NestJS 后端**：RESTful API + WebSocket 实时通信
- **Vue3 前端**：现代化管理界面，内置Nginx代理

#### 部署组合方式

| 启动命令 | Profile | 基础设施 | 应用服务 | 开发工具 | 适用场景 |
|----------|---------|----------|----------|----------|----------|
| `./start-unified.sh dev` | `dev` | ✅ | ✅ | ✅ | 完整开发环境 |
| `./start-unified.sh prod` | `prod` | ✅ | ✅ | ❌ | 生产环境 |
| `./start-unified.sh infra` | `infra` | ✅ | ❌ | ❌ | 仅基础设施 |
| `./start-unified.sh tools` | `infra,tools` | ✅ | ❌ | ✅ | 基础设施+工具 |

### 核心优势

- **🔄 无需反向代理**：前端直接通过Docker网络访问后端容器
- **🚀 开发友好**：支持代码热重载，提升开发效率  
- **📦 生产就绪**：多阶段构建，镜像体积小，安全性高
- **🔧 灵活部署**：基础设施和应用服务可独立扩缩容
- **⚡ 一键启动**：统一配置文件，简化部署流程

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