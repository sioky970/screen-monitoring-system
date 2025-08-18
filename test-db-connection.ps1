# 测试数据库连接的PowerShell脚本

Write-Host "测试数据库连接..." -ForegroundColor Green

# 检查MySQL容器状态
Write-Host "`n1. 检查MySQL容器状态..." -ForegroundColor Yellow
try {
    $mysqlStatus = docker ps -f name=mysql --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
    Write-Host $mysqlStatus -ForegroundColor Green
} catch {
    Write-Host "检查MySQL状态失败: $($_.Exception.Message)" -ForegroundColor Red
}

# 检查Redis容器状态
Write-Host "`n2. 检查Redis容器状态..." -ForegroundColor Yellow
try {
    $redisStatus = docker ps -f name=redis --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
    Write-Host $redisStatus -ForegroundColor Green
} catch {
    Write-Host "检查Redis状态失败: $($_.Exception.Message)" -ForegroundColor Red
}

# 测试直接访问健康检查端点
Write-Host "`n3. 测试健康检查端点..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://localhost:3000/health" -UseBasicParsing -TimeoutSec 3
    Write-Host "健康检查响应: $($response.Content)" -ForegroundColor Green
} catch {
    Write-Host "健康检查失败: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n测试完成" -ForegroundColor Green