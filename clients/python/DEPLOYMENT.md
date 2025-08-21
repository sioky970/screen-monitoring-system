# 屏幕监控客户端部署指南

## 📋 概述

本文档详细说明如何将Python客户端编译为独立的exe程序，并实现开机自启动和后台静默运行。

## ✅ 功能特性

- **✅ 编译为exe程序**：使用PyInstaller将Python代码打包为独立可执行文件
- **✅ Windows服务支持**：注册为Windows系统服务
- **✅ 开机自启动**：系统启动时自动运行
- **✅ 后台静默运行**：无界面窗口，完全后台运行
- **✅ 服务管理工具**：提供完整的服务管理功能
- **✅ 一键安装部署**：自动化安装和配置

## 🔧 构建环境要求

### 系统要求
- Windows 7/8/10/11 (64位)
- Python 3.8+ 
- 管理员权限

### 依赖包
```bash
# 核心依赖
pip install pyinstaller
pip install pywin32

# 项目依赖
pip install -r requirements.txt
```

## 🚀 构建步骤

### 方法1：使用自动化构建脚本

1. **运行构建脚本**
   ```bash
   # 双击运行或命令行执行
   build.bat
   ```

2. **构建输出**
   ```
   output/
   └── ScreenMonitorClient_v1.0.0_20250820_120000/
       ├── app/                    # 程序文件
       │   ├── ScreenMonitor.exe   # 主程序
       │   ├── ServiceManager.exe  # 服务管理工具
       │   └── ...                 # 依赖文件
       ├── config/                 # 配置文件
       ├── install.bat             # 安装脚本
       ├── README.txt              # 使用说明
       └── ...
   ```

### 方法2：手动构建

1. **安装构建依赖**
   ```bash
   pip install pyinstaller
   ```

2. **执行PyInstaller**
   ```bash
   pyinstaller --clean --noconfirm build_config.spec
   ```

3. **手动创建安装包**
   ```bash
   python build.py
   ```

## 📦 安装部署

### 自动安装

1. **解压安装包**
   ```
   ScreenMonitorClient_v1.0.0_20250820_120000.zip
   ```

2. **以管理员身份运行安装脚本**
   ```bash
   # 右键 -> 以管理员身份运行
   install.bat
   ```

3. **安装过程**
   - 复制程序文件到 `C:\ScreenMonitor\`
   - 注册Windows服务
   - 设置开机自启动
   - 启动服务

### 手动安装

1. **复制程序文件**
   ```bash
   # 创建安装目录
   mkdir C:\ScreenMonitor
   
   # 复制程序文件
   xcopy /E /I app C:\ScreenMonitor\app
   xcopy /E /I config C:\ScreenMonitor\config
   ```

2. **安装Windows服务**
   ```bash
   cd C:\ScreenMonitor\app
   ServiceManager.exe install --startup-type auto
   ```

3. **启动服务**
   ```bash
   ServiceManager.exe start
   ```

## 🔧 服务管理

### 服务管理命令

```bash
# 安装服务（开机自启动）
ServiceManager.exe install --startup-type auto

# 启动服务
ServiceManager.exe start

# 停止服务
ServiceManager.exe stop

# 重启服务
ServiceManager.exe restart

# 查看状态
ServiceManager.exe status

# 卸载服务
ServiceManager.exe uninstall
```

### 配置管理

```bash
# 查看配置
ServiceManager.exe config show

# 编辑配置
ServiceManager.exe config edit

# 验证配置
ServiceManager.exe config validate
```

### 日志管理

```bash
# 查看日志文件
ServiceManager.exe logs show

# 查看最新日志
ServiceManager.exe logs tail --lines 50

# 清除日志
ServiceManager.exe logs clear
```

## ⚙️ 配置说明

### 主配置文件：config/config.yaml

```yaml
# 服务器配置
server:
  api_base_url: "http://localhost:3001/api"
  timeout: 30

# 客户端配置
client:
  name: "屏幕监控客户端"
  version: "1.0.0"

# 截图配置
screenshot:
  enabled: true
  interval: 15
  quality: 85

# 剪贴板监控
clipboard:
  enabled: true
  check_interval: 0.5

# 日志配置
logging:
  level: "INFO"
  max_file_size: 10485760
  backup_count: 5
```

### 生产环境配置：config/config.prod.yaml

```yaml
server:
  api_base_url: "https://your-server.com/api"

logging:
  level: "WARNING"
```

## 🔍 故障排除

### 常见问题

1. **服务安装失败**
   - 确保以管理员身份运行
   - 检查Windows服务是否已存在
   - 查看错误日志

2. **服务启动失败**
   - 检查配置文件是否正确
   - 验证服务器连接
   - 查看服务日志

3. **截图功能异常**
   - 检查屏幕权限设置
   - 验证图像处理库
   - 查看错误日志

### 日志文件位置

```
C:\ScreenMonitor\logs\
├── client.log          # 主程序日志
├── service.log         # 服务日志
└── error.log           # 错误日志
```

### 诊断命令

```bash
# 检查服务状态
sc query ScreenMonitorService

# 查看服务配置
sc qc ScreenMonitorService

# 查看系统事件日志
eventvwr.msc
```

## 🔄 更新升级

### 升级步骤

1. **停止服务**
   ```bash
   ServiceManager.exe stop
   ```

2. **备份配置**
   ```bash
   copy C:\ScreenMonitor\config\config.yaml config_backup.yaml
   ```

3. **替换程序文件**
   ```bash
   xcopy /E /I /Y new_version\app C:\ScreenMonitor\app
   ```

4. **启动服务**
   ```bash
   ServiceManager.exe start
   ```

### 回滚操作

1. **停止服务**
2. **恢复旧版本文件**
3. **恢复配置文件**
4. **重启服务**

## 🗑️ 卸载程序

### 自动卸载

1. **运行卸载脚本**
   ```bash
   # 以管理员身份运行
   uninstall.bat
   ```

### 手动卸载

1. **停止并卸载服务**
   ```bash
   ServiceManager.exe stop
   ServiceManager.exe uninstall
   ```

2. **删除程序文件**
   ```bash
   rmdir /s /q C:\ScreenMonitor
   ```

## 📊 性能优化

### 资源占用

- **内存使用**：约50-100MB
- **CPU使用**：空闲时<1%，截图时<5%
- **磁盘空间**：程序约200MB，日志根据配置

### 优化建议

1. **调整截图间隔**：根据需求设置合适的截图频率
2. **配置日志级别**：生产环境使用WARNING级别
3. **定期清理日志**：避免日志文件过大
4. **监控资源使用**：定期检查系统性能

## 🔒 安全考虑

### 权限要求

- **系统服务权限**：需要管理员权限安装
- **屏幕截图权限**：需要访问桌面
- **网络访问权限**：需要连接服务器

### 安全措施

- **数据加密**：截图数据传输加密
- **访问控制**：服务器端身份验证
- **日志审计**：记录所有操作日志

## 📞 技术支持

### 联系方式

- **技术支持邮箱**：support@example.com
- **问题反馈**：GitHub Issues
- **文档更新**：定期更新部署文档

### 支持信息

提交问题时请提供：
1. 错误日志文件
2. 系统环境信息
3. 配置文件内容
4. 问题复现步骤
