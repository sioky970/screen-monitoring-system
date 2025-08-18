# 测试API的PowerShell脚本

Write-Host "测试后端API接口..." -ForegroundColor Green

# 测试健康检查端点
Write-Host "`n1. 测试健康检查端点..." -ForegroundColor Yellow
try {
    $health = Invoke-RestMethod -Uri "http://localhost:3000/health" -TimeoutSec 5
    Write-Host "健康检查成功: $($health | ConvertTo-Json -Compress)" -ForegroundColor Green
} catch {
    Write-Host "健康检查失败: $($_.Exception.Message)" -ForegroundColor Red
}

# 测试登录API
Write-Host "`n2. 测试登录API..." -ForegroundColor Yellow
$loginBody = @{
    email = "admin@example.com"
    password = "admin123"
} | ConvertTo-Json

try {
    $loginResponse = Invoke-RestMethod -Uri "http://localhost:3000/api/auth/login" -Method Post -Body $loginBody -ContentType "application/json" -TimeoutSec 10
    Write-Host "登录成功: $($loginResponse | ConvertTo-Json -Compress)" -ForegroundColor Green
} catch {
    Write-Host "登录失败: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $reader.BaseStream.Position = 0
        $reader.DiscardBufferedData()
        $responseBody = $reader.ReadToEnd()
        Write-Host "错误详情: $responseBody" -ForegroundColor Red
    }
}

# 测试客户端列表API
Write-Host "`n3. 测试客户端列表API..." -ForegroundColor Yellow
try {
    $clients = Invoke-RestMethod -Uri "http://localhost:3000/api/clients" -TimeoutSec 5
    Write-Host "客户端列表获取成功: 共 $($clients.Count) 个客户端" -ForegroundColor Green
} catch {
    Write-Host "客户端列表获取失败: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`nAPI测试完成" -ForegroundColor Green