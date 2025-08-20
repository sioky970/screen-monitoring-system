#!/bin/bash

# 屏幕监控系统后端安全启动脚本
# 包含端口检查和进程清理功能

PORT=3003
PROCESS_NAME="npm run start:dev"
PID_FILE="/tmp/screen-monitor-backend.pid"

echo "🚀 屏幕监控系统后端安全启动脚本"
echo "📍 目标端口: $PORT"
echo "="*50

# 检查端口是否被占用
check_port() {
    local port=$1
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
        return 0  # 端口被占用
    else
        return 1  # 端口空闲
    fi
}

# 清理占用端口的进程
cleanup_port() {
    local port=$1
    echo "⚠️  检测到端口 $port 被占用"
    
    # 获取占用端口的进程ID
    local pids=$(lsof -ti:$port)
    
    if [ -n "$pids" ]; then
        echo "🔍 发现占用进程: $pids"
        
        # 尝试优雅关闭
        echo "⏳ 尝试优雅关闭进程..."
        for pid in $pids; do
            kill -TERM $pid 2>/dev/null
        done
        
        # 等待3秒
        sleep 3
        
        # 检查是否还在运行
        local remaining_pids=$(lsof -ti:$port)
        if [ -n "$remaining_pids" ]; then
            echo "💀 强制终止进程..."
            for pid in $remaining_pids; do
                kill -9 $pid 2>/dev/null
            done
        fi
        
        echo "✅ 端口清理完成"
    fi
}

# 检查是否已有实例在运行
check_existing_instance() {
    # 检查PID文件
    if [ -f "$PID_FILE" ]; then
        local old_pid=$(cat "$PID_FILE")
        if ps -p $old_pid > /dev/null 2>&1; then
            echo "⚠️  检测到已有实例在运行 (PID: $old_pid)"
            echo "🛑 停止现有实例..."
            kill -TERM $old_pid 2>/dev/null
            sleep 2
            
            # 如果还在运行，强制终止
            if ps -p $old_pid > /dev/null 2>&1; then
                kill -9 $old_pid 2>/dev/null
            fi
            
            rm -f "$PID_FILE"
            echo "✅ 现有实例已停止"
        else
            # PID文件存在但进程不存在，清理PID文件
            rm -f "$PID_FILE"
        fi
    fi
    
    # 额外检查：查找所有npm run start:dev进程
    local npm_pids=$(ps aux | grep 'npm run start:dev' | grep -v grep | awk '{print $2}')
    if [ -n "$npm_pids" ]; then
        echo "⚠️  发现其他npm进程: $npm_pids"
        for pid in $npm_pids; do
            echo "🛑 停止进程 $pid"
            kill -TERM $pid 2>/dev/null
            sleep 1
            if ps -p $pid > /dev/null 2>&1; then
                kill -9 $pid 2>/dev/null
            fi
        done
        echo "✅ 所有npm进程已清理"
    fi
    
    # 额外检查：查找所有nest进程
    local nest_pids=$(ps aux | grep 'nest start' | grep -v grep | awk '{print $2}')
    if [ -n "$nest_pids" ]; then
        echo "⚠️  发现其他nest进程: $nest_pids"
        for pid in $nest_pids; do
            echo "🛑 停止进程 $pid"
            kill -TERM $pid 2>/dev/null
            sleep 1
            if ps -p $pid > /dev/null 2>&1; then
                kill -9 $pid 2>/dev/null
            fi
        done
        echo "✅ 所有nest进程已清理"
    fi
}

# 启动服务
start_service() {
    echo "🚀 启动后端服务..."
    
    # 设置环境变量
    export PORT=$PORT
    
    # 启动服务并获取PID
    npm run start:dev &
    local service_pid=$!
    
    # 保存PID到文件
    echo $service_pid > "$PID_FILE"
    
    echo "✅ 服务已启动 (PID: $service_pid)"
    echo "📍 端口: $PORT"
    echo "🌐 API地址: http://localhost:$PORT/api"
    echo "📚 API文档: http://localhost:$PORT/api/docs"
    echo "💚 健康检查: http://localhost:$PORT/health"
    
    # 等待服务启动
    echo "⏳ 等待服务启动..."
    sleep 5
    
    # 检查服务是否正常启动
    if check_port $PORT; then
        echo "🎉 服务启动成功！"
    else
        echo "❌ 服务启动失败，请检查日志"
        return 1
    fi
}

# 清理函数
cleanup() {
    echo "\n🛑 收到停止信号，正在清理..."
    if [ -f "$PID_FILE" ]; then
        local pid=$(cat "$PID_FILE")
        if ps -p $pid > /dev/null 2>&1; then
            kill -TERM $pid 2>/dev/null
            sleep 2
            if ps -p $pid > /dev/null 2>&1; then
                kill -9 $pid 2>/dev/null
            fi
        fi
        rm -f "$PID_FILE"
    fi
    echo "✅ 清理完成"
    exit 0
}

# 设置信号处理
trap cleanup SIGINT SIGTERM

# 主流程
main() {
    # 检查是否已有实例在运行
    check_existing_instance
    
    # 检查并清理端口
    if check_port $PORT; then
        cleanup_port $PORT
        sleep 1
    fi
    
    # 启动服务
    start_service
    
    # 保持脚本运行
    echo "📊 服务监控中... (按 Ctrl+C 停止)"
    while true; do
        if [ -f "$PID_FILE" ]; then
            local pid=$(cat "$PID_FILE")
            if ! ps -p $pid > /dev/null 2>&1; then
                echo "❌ 服务进程异常退出"
                rm -f "$PID_FILE"
                break
            fi
        else
            echo "❌ PID文件丢失"
            break
        fi
        sleep 10
    done
}

# 执行主流程
main