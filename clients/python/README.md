# 屏幕监控系统 Python 客户端

一个功能完整的屏幕监控系统客户端，支持屏幕截图采集、剪贴板监控、区块链地址检测、WebSocket实时通信和Windows服务运行。

## 功能特性

### 核心功能
- 🖥️ **屏幕截图采集**: 定时截取屏幕并上传到服务器
- 📋 **剪贴板监控**: 实时监控剪贴板内容变化
- 🔍 **区块链地址检测**: 自动检测剪贴板中的区块链地址
- 📝 **白名单管理**: 支持区块链地址白名单验证
- 🚨 **违规事件上报**: 自动上报违规行为到服务器
- 🔗 **WebSocket通信**: 实时双向通信和心跳机制

### 系统特性
- 🔧 **Windows服务**: 支持作为Windows服务运行
- 🚀 **开机自启动**: 系统启动时自动运行
- 📊 **日志记录**: 完整的日志记录和轮转
- ⚙️ **配置管理**: 灵活的YAML配置文件
- 🛡️ **错误恢复**: 自动重连和错误恢复机制

## 系统要求

- **操作系统**: Windows 10/11 (64位)
- **Python版本**: Python 3.8 或更高版本
- **内存**: 至少 512MB 可用内存
- **磁盘空间**: 至少 100MB 可用空间
- **网络**: 能够访问监控服务器

## 快速开始

### 1. 环境准备

确保已安装 Python 3.8+：
```bash
python --version
```

### 2. 安装依赖

```bash
# 进入项目目录
cd screen-monitoring-system/clients/python

# 安装依赖
pip install -r requirements.txt
```

### 3. 配置设置

#### 测试环境配置（默认）

默认的 `config/config.yaml` 已配置为连接本地测试服务器：

```yaml
server:
  # 测试环境（本地开发）
  api_base_url: "http://localhost:3000/api"
  websocket_url: "ws://localhost:3000/monitor"
```

#### 生产环境配置

有两种方式配置生产环境：

**方式1：修改现有配置文件**

编辑 `config/config.yaml`，注释测试环境配置，取消注释生产环境配置：

```yaml
server:
  # 测试环境（本地开发）- 注释掉下面两行
  # api_base_url: "http://localhost:3000/api"
  # websocket_url: "ws://localhost:3000/monitor"
  
  # 生产环境（取消注释下面两行）
  api_base_url: "http://206.119.177.133/api"
  websocket_url: "ws://206.119.177.133/monitor"
```

**方式2：使用生产环境配置文件**

直接使用预配置的生产环境文件：

```bash
# 备份当前配置
cp config/config.yaml config/config.dev.yaml

# 使用生产环境配置
cp config/config.prod.yaml config/config.yaml
```

#### 自定义服务器地址

如果需要连接到其他服务器，请修改配置文件中的服务器地址：

```yaml
server:
  api_base_url: "http://your-server-ip:3000/api"
  websocket_url: "ws://your-server-ip:3000/monitor"
```

#### 配置切换工具

为了方便在测试和生产环境之间切换，提供了配置切换脚本：

```bash
# 查看当前配置状态
python3 switch_config.py status

# 切换到测试环境（本地开发）
python3 switch_config.py dev

# 切换到生产环境
python3 switch_config.py prod

# 恢复备份配置
python3 switch_config.py restore
```

**使用示例：**

```bash
# 开发时切换到测试环境
$ python3 switch_config.py dev
屏幕监控系统 - 配置环境切换工具
========================================
✓ 已备份当前配置到: config/config.backup.yaml
✓ 已切换到测试环境配置

操作完成!

# 部署时切换到生产环境
$ python3 switch_config.py prod
屏幕监控系统 - 配置环境切换工具
========================================
✓ 已备份当前配置到: config/config.backup.yaml
✓ 已切换到生产环境配置

操作完成!

# 查看当前配置状态
$ python3 switch_config.py status
屏幕监控系统 - 配置环境切换工具
========================================
当前配置环境: 生产环境 (206.119.177.133)

相关配置:
  ✓ 激活: api_base_url: "http://206.119.177.133/api"
  ✓ 激活: websocket_url: "ws://206.119.177.133/monitor"
  注释: # api_base_url: "http://localhost:3000/api"
  注释: # websocket_url: "ws://localhost:3000/monitor"

操作完成!
```

### 4. 运行客户端

#### 控制台模式（测试用）
```bash
python main.py
```

#### 测试模式（运行30秒后自动退出）
```bash
python main.py --test
```

#### Windows服务模式
```bash
# 安装服务
python scripts/install.py install

# 启动服务
python scripts/service_manager.py start
```

## 详细安装指南

### 自动安装（推荐）

使用安装脚本进行一键安装：

```bash
# 以管理员身份运行PowerShell
python scripts/install.py install
```

安装脚本会自动：
- 检查系统环境
- 安装Python依赖
- 创建必要目录
- 安装Windows服务
- 设置开机自启动
- 创建桌面快捷方式

### 手动安装

#### 1. 克隆项目
```bash
git clone <repository-url>
cd screen-monitoring-system/clients/python
```

#### 2. 创建虚拟环境（可选）
```bash
python -m venv venv
venv\Scripts\activate
```

#### 3. 安装依赖
```bash
pip install -r requirements.txt
```

#### 4. 配置文件
复制并编辑配置文件：
```bash
copy config\config.yaml.example config\config.yaml
# 编辑 config/config.yaml
```

#### 5. 安装Windows服务
```bash
# 以管理员身份运行
python scripts/install.py install
```

## 服务管理

### 使用服务管理器

```bash
# 查看服务状态
python scripts/service_manager.py status

# 启动服务
python scripts/service_manager.py start

# 停止服务
python scripts/service_manager.py stop

# 重启服务
python scripts/service_manager.py restart

# 查看配置
python scripts/service_manager.py config show

# 查看日志
python scripts/service_manager.py logs show
```

### 使用Windows服务管理器

1. 打开 `services.msc`
2. 找到 "Screen Monitor Service"
3. 右键选择启动/停止/重启

## 配置说明

### 主要配置项

```yaml
# 服务器配置
server:
  host: "localhost"          # 服务器地址
  port: 8080                 # 服务器端口
  use_ssl: false             # 是否使用SSL
  api_base: "/api/v1"        # API基础路径
  websocket_path: "/ws"      # WebSocket路径

# 客户端信息
client:
  name: "客户端名称"          # 客户端显示名称
  department: "部门"         # 所属部门
  location: "位置"           # 物理位置
  tags: ["tag1", "tag2"]    # 标签

# 截图配置
screenshot:
  enabled: true              # 是否启用截图
  interval: 30               # 截图间隔（秒）
  quality: 85                # 图片质量 (1-100)
  max_width: 1920           # 最大宽度
  max_height: 1080          # 最大高度

# 剪贴板监控
clipboard:
  enabled: true              # 是否启用监控
  check_interval: 1          # 检查间隔（秒）
  max_content_length: 10000  # 最大内容长度

# 心跳配置
heartbeat:
  interval: 30               # 心跳间隔（秒）
  timeout: 10                # 超时时间（秒）

# 日志配置
logging:
  level: "INFO"              # 日志级别
  max_file_size: "10MB"      # 单个日志文件最大大小
  backup_count: 5            # 保留的日志文件数量
```

### 环境变量覆盖

可以使用环境变量覆盖配置文件中的设置：

```bash
# 设置服务器地址
set SCREEN_MONITOR_SERVER_HOST=192.168.1.100

# 设置日志级别
set SCREEN_MONITOR_LOGGING_LEVEL=DEBUG

# 启用调试模式
set SCREEN_MONITOR_DEBUG=true
```

## 日志管理

### 日志位置
- **服务模式**: `logs/screen_monitor.log`
- **控制台模式**: 同时输出到控制台和文件

### 日志级别
- `DEBUG`: 详细调试信息
- `INFO`: 一般信息
- `WARNING`: 警告信息
- `ERROR`: 错误信息
- `CRITICAL`: 严重错误

### 查看日志
```bash
# 查看最新日志
python scripts/service_manager.py logs show

# 查看日志目录
python scripts/service_manager.py logs dir

# 清除旧日志
python scripts/service_manager.py logs clear
```

## 故障排除

### 常见问题

#### 1. 服务启动失败
```bash
# 检查日志
python scripts/service_manager.py logs show

# 检查配置
python scripts/service_manager.py config validate

# 重新安装服务
python scripts/install.py uninstall
python scripts/install.py install
```

#### 2. 无法连接服务器
- 检查网络连接
- 验证服务器地址和端口
- 检查防火墙设置
- 查看服务器日志

#### 3. 截图功能异常
- 检查屏幕分辨率设置
- 验证图片质量配置
- 确认磁盘空间充足

#### 4. 剪贴板监控不工作
- 确认剪贴板访问权限
- 检查其他程序是否占用剪贴板
- 重启客户端服务

### 调试模式

启用调试模式获取更多信息：

```bash
# 设置调试级别
set SCREEN_MONITOR_LOGGING_LEVEL=DEBUG

# 运行客户端
python main.py
```

### 性能优化

#### 1. 截图优化
```yaml
screenshot:
  quality: 70        # 降低图片质量
  max_width: 1280    # 限制图片尺寸
  max_height: 720
  interval: 60       # 增加截图间隔
```

#### 2. 内存优化
```yaml
performance:
  max_memory_mb: 256      # 限制内存使用
  gc_interval: 300        # 垃圾回收间隔
  cache_size: 100         # 缓存大小
```

## 卸载

### 自动卸载
```bash
# 以管理员身份运行
python scripts/install.py uninstall
```

### 手动卸载
1. 停止服务：`python scripts/service_manager.py stop`
2. 卸载服务：`sc delete "Screen Monitor Service"`
3. 删除文件夹
4. 清理注册表（可选）

## 开发指南

### 项目结构
```
screen-monitoring-system/clients/python/
├── src/                    # 源代码
│   ├── core/              # 核心模块
│   │   ├── config.py      # 配置管理
│   │   ├── logger.py      # 日志管理
│   │   └── client.py      # 主客户端
│   ├── modules/           # 功能模块
│   │   ├── screenshot.py  # 截图模块
│   │   ├── clipboard.py   # 剪贴板模块
│   │   ├── websocket_client.py  # WebSocket客户端
│   │   ├── whitelist.py   # 白名单管理
│   │   └── violation.py   # 违规上报
│   └── utils/             # 工具模块
│       ├── client_id.py   # 客户端ID管理
│       └── windows_service.py  # Windows服务
├── config/                # 配置文件
├── logs/                  # 日志文件
├── scripts/               # 脚本文件
├── tests/                 # 测试文件
├── requirements.txt       # 依赖列表
├── main.py               # 主入口
└── README.md             # 说明文档
```

### 添加新功能

1. 在 `src/modules/` 下创建新模块
2. 在 `src/core/client.py` 中集成新模块
3. 更新配置文件模板
4. 添加相应的测试

### 运行测试
```bash
# 运行所有测试
python -m pytest tests/

# 运行特定测试
python -m pytest tests/test_screenshot.py

# 生成覆盖率报告
python -m pytest --cov=src tests/
```

## 许可证

本项目采用 MIT 许可证。详见 [LICENSE](LICENSE) 文件。

## 支持

如有问题或建议，请：

1. 查看本文档的故障排除部分
2. 检查项目的 Issues 页面
3. 创建新的 Issue 描述问题
4. 联系技术支持团队

## 更新日志

### v1.0.0 (2024-01-XX)
- 初始版本发布
- 支持屏幕截图采集
- 支持剪贴板监控
- 支持区块链地址检测
- 支持WebSocket实时通信
- 支持Windows服务运行
- 支持开机自启动

---

**注意**: 本软件仅用于合法的员工监控目的，使用前请确保符合相关法律法规和公司政策。