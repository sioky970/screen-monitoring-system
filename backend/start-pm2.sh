#!/bin/bash

# 屏幕监控系统后端PM2启动脚本
# 支持后台运行和进程管理

APP_NAME="screen-monitor-backend"
PORT=3003
CONFIG_FILE="ecosystem.config.js"

echo "🚀 屏幕监控系统后端PM2启动脚本"
echo "📍 应用名称: $APP_NAME"
echo "📍 目标端口: $PORT"
echo "="*50

# 检查PM2是否安装
check_pm2() {
    if ! command -v pm2 &> /dev/null; then
        echo "❌ PM2未安装，请先安装PM2:"
        echo "   sudo npm install -g pm2"
        exit 1
    fi
    echo "✅ PM2已安装 (版本: $(pm2 --version | tail -1))"
}

# 检查端口是否被占用
check_port() {
    local port=$1
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
        return 0  # 端口被占用
    else
        return 1  # 端口空闲
    fi
}

# 停止现有服务
stop_service() {
    echo "🛑 检查并停止现有服务..."
    
    # 检查PM2中是否有同名应用
    if pm2 list | grep -q "$APP_NAME"; then
        echo "⚠️  发现现有PM2应用: $APP_NAME"
        pm2 stop "$APP_NAME" 2>/dev/null
        pm2 delete "$APP_NAME" 2>/dev/null
        echo "✅ 现有PM2应用已停止并删除"
    fi
    
    # 检查端口占用
    if check_port $PORT; then
        echo "⚠️  端口 $PORT 仍被占用，尝试清理..."
        local pids=$(lsof -ti:$PORT)
        if [ -n "$pids" ]; then
            echo "🔍 发现占用进程: $pids"
            for pid in $pids; do
                kill -TERM $pid 2>/dev/null
            done
            sleep 2
            
            # 检查是否还在运行
            local remaining_pids=$(lsof -ti:$PORT)
            if [ -n "$remaining_pids" ]; then
                echo "💀 强制终止进程..."
                for pid in $remaining_pids; do
                    kill -9 $pid 2>/dev/null
                done
            fi
            echo "✅ 端口清理完成"
        fi
    fi
}

# 启动服务
start_service() {
    echo "🚀 使用PM2启动后端服务..."
    
    # 检查配置文件是否存在
    if [ ! -f "$CONFIG_FILE" ]; then
        echo "❌ PM2配置文件不存在: $CONFIG_FILE"
        exit 1
    fi
    
    # 使用PM2启动服务
    pm2 start "$CONFIG_FILE"
    
    if [ $? -eq 0 ]; then
        echo "✅ 服务已通过PM2启动"
        echo "📍 应用名称: $APP_NAME"
        echo "📍 端口: $PORT"
        echo "🌐 API地址: http://localhost:$PORT/api"
        echo "📚 API文档: http://localhost:$PORT/api/docs"
        echo "💚 健康检查: http://localhost:$PORT/health"
        echo ""
        echo "📊 PM2管理命令:"
        echo "   pm2 list                 # 查看所有应用状态"
        echo "   pm2 logs $APP_NAME       # 查看应用日志"
        echo "   pm2 restart $APP_NAME    # 重启应用"
        echo "   pm2 stop $APP_NAME       # 停止应用"
        echo "   pm2 delete $APP_NAME     # 删除应用"
        echo "   pm2 monit                # 实时监控"
    else
        echo "❌ 服务启动失败"
        exit 1
    fi
}

# 等待服务启动
wait_for_service() {
    echo "⏳ 等待服务启动..."
    local max_attempts=30
    local attempt=0
    
    while [ $attempt -lt $max_attempts ]; do
        if check_port $PORT; then
            echo "🎉 服务启动成功！"
            return 0
        fi
        
        sleep 1
        attempt=$((attempt + 1))
        echo -n "."
    done
    
    echo ""
    echo "❌ 服务启动超时，请检查日志:"
    echo "   pm2 logs $APP_NAME"
    return 1
}

# 显示服务状态
show_status() {
    echo ""
    echo "📊 当前服务状态:"
    pm2 list
    echo ""
    echo "📝 最近日志:"
    pm2 logs "$APP_NAME" --lines 10
}

# 主流程
main() {
    # 检查PM2
    check_pm2
    
    # 停止现有服务
    stop_service
    
    # 启动服务
    start_service
    
    # 等待服务启动
    if wait_for_service; then
        show_status
        echo ""
        echo "🎉 后端服务已成功启动并在后台运行！"
        echo "💡 提示: 现在您可以安全地在此终端执行其他命令，服务将继续在后台运行。"
    else
        echo "❌ 服务启动失败，请检查配置和日志"
        exit 1
    fi
}

# 执行主流程
main