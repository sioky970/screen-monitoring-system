# ScreenMonitor.Client (Windows)

静默运行的 Windows 客户端：开机自启、首次注册获取 clientId 并持久化、每 15 秒截图并以 JPG 上传。

## 构建与发布
```powershell
# 进入项目目录
cd clients/windows/ScreenMonitor.Client

# 还原+构建
dotnet restore
dotnet build -c Release

# 自包含单文件发布（win-x64）
dotnet publish -c Release -r win-x64 --self-contained true /p:PublishSingleFile=true
```

发布输出位于 `bin/Release/net8.0-windows/win-x64/publish/`。

## 配置
- 编辑 `appsettings.json`
  - `App.BackendBaseUrl`：例如 `http://206.119.177.133:3001/api`
  - `App.WebSocketUrl`：例如 `ws://206.119.177.133:3005/monitor`（预留心跳）
  - `ScreenshotIntervalSeconds`、`JpegQuality`、`MaxLongSide` 可按需调整

## 安装为 Windows 服务（推荐）
以管理员身份运行：
```powershell
$svcName = "ScreenMonitor"
$exe = "C:\\Program Files\\ScreenMonitor\\ScreenMonitor.Client.exe"
New-Item -ItemType Directory -Force "C:\\Program Files\\ScreenMonitor" | Out-Null
Copy-Item -Force .\bin\Release\net8.0-windows\win-x64\publish\* "C:\\Program Files\\ScreenMonitor\"
sc.exe create $svcName binPath= "$exe" start= auto
sc.exe start $svcName
```

卸载：
```powershell
sc.exe stop ScreenMonitor
sc.exe delete ScreenMonitor
```

## 计划任务方式（备选）
```powershell
$exe = "C:\\Program Files\\ScreenMonitor\\ScreenMonitor.Client.exe"
schtasks /create /tn "ScreenMonitor" /sc onstart /ru SYSTEM /rl HIGHEST /tr "$exe" /F
```

## 日志
- 默认日志路径：`C:\\ProgramData\\ScreenMonitor\\logs\\client.log`

## 运行原理
- 首次运行调用 `POST /api/clients` 注册，保存 `clientId` 到 `%ProgramData%\\ScreenMonitor\\client.json`
- 按配置周期抓取主屏、按 JPG 质量压缩并上传到 `POST /api/security/screenshots/upload`
- 后续版本将接入 WebSocket 心跳：连接 `/monitor` 并周期 emit `client-heartbeat`

