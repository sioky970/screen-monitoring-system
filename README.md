# 屏幕监控系统

## 项目概述

本项目是一个基于现代化技术栈的企业级桌面监控系统，支持多客户端实时屏幕截图传输、存储和管理，并具备区块链地址安全监控功能。

## 核心功能

### 🔍 实时监控
- 🖥️ **屏幕截图监控**：实时捕获客户端屏幕，支持自定义间隔
- 📋 **剪贴板审核**：智能检测剪贴板中的敏感内容
- ⏰ **在线状态追踪**：实时显示客户端在线状态和最后活跃时间

### 🛡️ 安全防护
- 🔗 **区块链地址检测**：支持20+种加密货币地址格式识别
- 🧠 **智能风险评估**：基于关键词和上下文的多维度风险分析
- 🗑️ **自动清空机制**：检测到违规内容立即清空剪贴板
- 📝 **白名单管理**：灵活的地址白名单系统

### 📊 管理界面
- 🖼️ **实时屏幕墙**：网格化显示所有客户端状态
- 🚨 **违规事件追踪**：详细的违规记录和处理流程
- 👥 **分组管理**：支持客户端分组和批量操作
- 📈 **统计报表**：全面的监控数据统计分析

### 🔐 增强的安全检测

#### 支持的加密货币类型
- **比特币 (BTC)**：Legacy, SegWit, Bech32, Taproot
- **以太坊 (ETH)**：标准地址, ENS域名
- **波场 (TRX)**：TRX地址格式
- **莱特币 (LTC)**：多种地址格式
- **其他币种**：DOGE, BCH, XRP, ADA, DOT, SOL, BNB, MATIC等

#### 智能风险评估
- **关键词检测**：洗钱、暗网、赌博、诈骗等高风险词汇
- **上下文分析**：结合金额和交易信息评估风险等级
- **风险等级**：low, medium, high, critical 四级分类

## 技术架构

### 客户端
- **技术栈**：Python + PyQt5/Tkinter + Requests
- **功能**：屏幕截图、剪贴板监控、增强的区块链地址检测
- **平台支持**：Windows, Linux, macOS

### 后端服务
- **技术栈**：NestJS + TypeScript + MySQL + Redis + MinIO
- **功能**：API服务、实时通信、数据存储、对象存储

### 前端管理
- **技术栈**：Vue 3 + TypeScript + Ant Design Vue + Vite
- **功能**：实时屏幕墙、设备管理、安全中心、统计分析
- **特性**：响应式设计、实时更新、组件化架构

### 存储架构
- **MySQL 8.0**：业务数据和元数据存储
- **Redis 7.0**：实时数据缓存和会话管理
- **MinIO**：截图文件对象存储，支持CDN加速

## 项目结构

```
screen-monitoring-system/
├── docs/                           # 项目文档
│   └── 屏幕监控系统技术方案.md      # 详细技术方案
├── clients/                        # 客户端应用
│   ├── python/                     # Python 客户端
│   │   ├── src/                    # 源码目录
│   │   ├── main.py                 # 主程序入口
│   │   ├── requirements.txt        # 依赖配置
│   │   └── README.md               # 客户端说明
│   └── csharp/                     # C# 客户端 (备用)
│       ├── src/                    # 源码目录
│       └── ScreenMonitorClient.sln # Visual Studio 解决方案
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

## 🚀 快速开始

### 🔧 环境要求
- Docker & Docker Compose
- Node.js 16+
- .NET 6+
- MySQL 8.0+（Docker提供）
- Redis 7.0+（Docker提供）
- MinIO（Docker提供）

### 🚀 推荐：本地开发模式（混合架构）

**前后端本地运行 + 基础设施Docker化**

```bash
# 1. 启动基础设施服务（MySQL、Redis、MinIO）
./start-infra.sh start --with-tools

# 2. 启动前后端应用
./start-dev.sh
```

**访问地址：**
- 🌐 前端应用：http://localhost:3000
- 🔌 后端API：http://localhost:3001/api
- 📖 API文档：http://localhost:3001/api/docs
- 🔧 数据库管理：http://localhost:8080
- 🔧 Redis管理：http://localhost:8081

**优势：**
- ✅ 启动速度快
- ✅ 调试便利
- ✅ IDE完美支持
- ✅ 热重载原生支持
- ✅ 资源占用少

📋 **详细说明**：[本地开发指南](./LOCAL-DEVELOPMENT.md)

### 快速部署（完整Docker方式）

1. **克隆项目**
   ```bash
   git clone https://github.com/sioky970/-.git
   cd screen-monitoring-system
   ```

2. **一键启动（推荐）**

   #### 🚀 超快速启动（预构建数据库）
   ```bash
   # 自动构建MySQL镜像并启动完整开发环境
   ./quick-setup.sh
   ```

   #### 标准启动方式  
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

   #### 手动构建预构建MySQL镜像
   ```bash
   # 构建包含完整数据库结构的MySQL镜像
   ./build-mysql-image.sh
   ```

3. **向后兼容的启动方式**

   为了向后兼容，旧的启动脚本仍然可用（会自动重定向到统一脚本）：

   ```bash
   # 以下命令会自动重定向到统一启动脚本
   ./deployment/scripts/start.sh dev infra    # -> ./start-unified.sh infra
   ./deployment/scripts/start.sh dev app      # -> ./start-unified.sh dev
   ./deployment/scripts/start.sh prod app     # -> ./start-unified.sh prod
   ```

4. **数据库状态检查**
   ```bash
   # 检查MySQL数据库是否正确初始化
   ./check-database.sh
   ```

5. **客户端开发**
   ```bash
   cd client && dotnet build && dotnet run
   ```

### 本地开发模式

**推荐用于日常开发，性能更好，调试更便利**

1. **启动基础设施服务**
   ```bash
   # 启动MySQL、Redis、MinIO等服务
   ./start-infra.sh start --with-tools
   ```

2. **启动前后端应用**
   ```bash
   # 安装依赖（首次运行）
   cd backend && npm install && cd ..
   cd frontend && npm install && cd ..
   
   # 启动开发服务
   ./start-dev.sh
   ```

3. **访问应用**
   - 前端：http://localhost:3000
   - 后端API：http://localhost:3001/api
   - 数据库管理：http://localhost:8080

4. **停止服务**
   ```bash
   # 停止前后端（Ctrl+C）
   # 停止基础设施
   ./start-infra.sh stop
   ```

### 访问系统

#### 开发环境（`./start-unified.sh dev`）
**完整开发环境访问地址**
- 🌐 前端应用：http://localhost:47827
- 🔌 后端API：http://localhost:47828/api  
- 🐛 后端调试：http://localhost:47829
- 📊 数据库管理：http://localhost:47825
- 🔧 Redis管理：http://localhost:47826
- 💾 MinIO控制台：http://localhost:47824

**数据库连接信息**
- Host: localhost:47821
- Database: screen_monitoring_dev  
- Username: dev_user
- Password: dev_pass_123

**数据库结构**：自动创建7个核心表 + 视图 + 存储过程
- `client_groups` - 客户端分组管理
- `clients` - 客户端信息和状态
- `security_screenshots` - 安全告警截图记录  
- `blockchain_whitelist` - 区块链地址白名单
- `system_users` - 系统用户和权限
- `system_logs` - 操作日志审计
- `client_online_logs` - 在线时长统计

#### 生产环境（`./start-unified.sh prod`）
**生产环境访问地址**
- 🌐 应用主页：http://localhost:47830
- 🔌 API接口：http://localhost:47831/api
- 💾 MinIO控制台：http://localhost:47824

#### 基础设施模式（`./start-unified.sh infra`）
**基础设施服务**
- 🗄️ MySQL数据库：localhost:47821
- 🔄 Redis缓存：localhost:47822
- 💾 MinIO存储：http://localhost:47823
- 💾 MinIO控制台：http://localhost:47824

#### 开发工具模式（`./start-unified.sh tools`）
**开发工具访问**
- 📊 数据库管理：http://localhost:47825
- 🔧 Redis管理：http://localhost:47826
- 💾 MinIO控制台：http://localhost:47824

## Docker架构设计

### 统一配置架构

本系统现在提供了**统一的Docker Compose配置**（`docker-compose.unified.yml`），通过 **Profiles** 机制实现一键部署：

```bash
# 一键启动，自动配置所有服务
./start-unified.sh [dev|prod|infra|tools]
```

#### 预构建MySQL镜像

系统支持两种MySQL部署方式：

1. **预构建镜像**（推荐）：`screen-monitor-mysql:1.0.0`
   - ✅ **零初始化时间**：启动即可用，无需等待SQL脚本执行
   - ✅ **完整数据结构**：7个核心表 + 视图 + 存储过程 + 示例数据
   - ✅ **一致性保证**：所有环境使用相同的数据库结构
   - ✅ **快速启动**：跳过传统的数据库初始化过程

2. **官方镜像**（回退方案）：`mysql:8.0`
   - 🔄 使用初始化脚本动态创建表结构
   - ⏱️ 首次启动需要等待SQL脚本执行

#### 架构优势

- **🎯 一键部署**：单个配置文件，多种部署模式
- **⚙️ 智能配置**：基于环境自动切换端口和配置
- **🔄 零配置**：无需手动管理多个compose文件
- **📋 Profile控制**：通过COMPOSE_PROFILES精确控制服务启动
- **🚀 预构建数据库**：启动即可用，无需初始化等待

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

### Phase 1: MVP开发 ✅ 已完成
- [x] 技术方案设计
- [x] 客户端基础功能开发
- [x] 后端API和数据库设计
- [x] 前端管理界面开发

### Phase 2: 功能增强 ✅ 已完成
- [x] 增强的区块链地址检测
- [x] 智能风险评估功能
- [x] 剪贴板自动清空机制
- [x] MinIO对象存储集成
- [x] 性能优化和界面优化

### Phase 3: 生产部署 ✅ 已完成
- [x] 容器化部署
- [x] 完整的部署脚本
- [x] 监控和日志系统

## 📝 更新日志

### v2.0.0 (2025-08-20) ✨ 最新版本
- ✨ 新增增强的区块链地址检测 (支持20+种加密货币)
- 🛡️ 添加智能风险评估功能
- 🗑️ 实现剪贴板自动清空防护机制
- 🔧 优化前端界面，移除冗余字段
- 📱 完善客户端跨平台支持
- 🚀 改进部署和运维工具
- ⏰ 完善最后在线时间显示

### v1.0.0 (2025-08-18)
- 🎉 初始版本发布
- 📸 基础屏幕监控功能
- 📋 剪贴板内容检测
- 🌐 Web管理界面

## 贡献指南

1. Fork 项目
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送分支 (`git push origin feature/AmazingFeature`)
5. 开启Pull Request

## 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情

## 📞 联系方式

如有问题或建议，请通过以下方式联系：
- 🐛 提交 Issue：https://github.com/sioky970/screen-monitoring-system/issues
- 📧 邮箱：97066681@qq.com
- 🌟 项目地址：https://github.com/sioky970/screen-monitoring-system

---

⭐ 如果这个项目对你有帮助，请给个Star支持一下！