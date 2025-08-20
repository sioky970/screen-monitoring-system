#!/bin/bash

# 屏幕监控系统后端服务管理脚本
# 提供启动、停止、重启、状态检查等功能

APP_NAME="screen-monitor-backend"
PORT=3003
CONFIG_FILE="ecosystem.config.js"

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 打印带颜色的消息
print_message() {
    local color=$1
    local message=$2
    echo -e "${color}${message}${NC}"
}

# 检查PM2是否安装
check_pm2() {
    if ! command -v pm2 &> /dev/null; then
        print_message $RED "❌ PM2未安装，请先安装PM2:"
        echo "   sudo npm install -g pm2"
        exit 1
    fi
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

# 启动服务
start_service() {
    print_message $BLUE "🚀 启动后端服务..."
    
    # 检查是否已经在运行
    if pm2 list | grep -q "$APP_NAME.*online"; then
        print_message $YELLOW "⚠️  服务已在运行"
        show_status
        return 0
    fi
    
    # 检查配置文件
    if [ ! -f "$CONFIG_FILE" ]; then
        print_message $RED "❌ PM2配置文件不存在: $CONFIG_FILE"
        exit 1
    fi
    
    # 启动服务
    pm2 start "$CONFIG_FILE"
    
    if [ $? -eq 0 ]; then
        print_message $GREEN "✅ 服务启动成功"
        wait_for_service
        show_info
    else
        print_message $RED "❌ 服务启动失败"
        exit 1
    fi
}

# 停止服务
stop_service() {
    print_message $BLUE "🛑 停止后端服务..."
    
    if pm2 list | grep -q "$APP_NAME"; then
        pm2 stop "$APP_NAME"
        pm2 delete "$APP_NAME"
        print_message $GREEN "✅ 服务已停止"
    else
        print_message $YELLOW "⚠️  服务未在运行"
    fi
    
    # 清理端口占用
    if check_port $PORT; then
        print_message $YELLOW "⚠️  清理端口占用..."
        local pids=$(lsof -ti:$PORT)
        if [ -n "$pids" ]; then
            for pid in $pids; do
                kill -TERM $pid 2>/dev/null
            done
            sleep 2
            
            local remaining_pids=$(lsof -ti:$PORT)
            if [ -n "$remaining_pids" ]; then
                for pid in $remaining_pids; do
                    kill -9 $pid 2>/dev/null
                done
            fi
        fi
        print_message $GREEN "✅ 端口清理完成"
    fi
}

# 重启服务
restart_service() {
    print_message $BLUE "🔄 重启后端服务..."
    
    if pm2 list | grep -q "$APP_NAME"; then
        pm2 restart "$APP_NAME"
        print_message $GREEN "✅ 服务重启成功"
        wait_for_service
        show_info
    else
        print_message $YELLOW "⚠️  服务未在运行，将启动新实例"
        start_service
    fi
}

# 等待服务启动
wait_for_service() {
    print_message $BLUE "⏳ 等待服务启动..."
    local max_attempts=30
    local attempt=0
    
    while [ $attempt -lt $max_attempts ]; do
        if check_port $PORT; then
            print_message $GREEN "🎉 服务启动成功！"
            return 0
        fi
        
        sleep 1
        attempt=$((attempt + 1))
        echo -n "."
    done
    
    echo ""
    print_message $RED "❌ 服务启动超时"
    return 1
}

# 显示服务状态
show_status() {
    print_message $BLUE "📊 服务状态:"
    pm2 list
    
    if pm2 list | grep -q "$APP_NAME.*online"; then
        print_message $GREEN "✅ 服务正在运行"
        if check_port $PORT; then
            print_message $GREEN "✅ 端口 $PORT 正常监听"
        else
            print_message $RED "❌ 端口 $PORT 未监听"
        fi
    else
        print_message $RED "❌ 服务未运行"
    fi
}

# 显示日志
show_logs() {
    local lines=${1:-50}
    print_message $BLUE "📝 服务日志 (最近 $lines 行):"
    
    if pm2 list | grep -q "$APP_NAME"; then
        pm2 logs "$APP_NAME" --lines $lines
    else
        print_message $RED "❌ 服务未运行，无法显示日志"
    fi
}

# 实时监控
monitor_service() {
    print_message $BLUE "📊 启动实时监控..."
    print_message $YELLOW "💡 按 Ctrl+C 退出监控"
    pm2 monit
}

# 显示服务信息
show_info() {
    echo ""
    print_message $GREEN "🌐 服务信息:"
    echo "   📍 应用名称: $APP_NAME"
    echo "   📍 端口: $PORT"
    echo "   🌐 API地址: http://localhost:$PORT/api"
    echo "   📚 API文档: http://localhost:$PORT/api/docs"
    echo "   💚 健康检查: http://localhost:$PORT/health"
    echo ""
}

# 健康检查
health_check() {
    print_message $BLUE "💚 执行健康检查..."
    
    if check_port $PORT; then
        local response=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:$PORT/health)
        if [ "$response" = "200" ]; then
            print_message $GREEN "✅ 健康检查通过"
        else
            print_message $RED "❌ 健康检查失败 (HTTP $response)"
        fi
    else
        print_message $RED "❌ 服务未运行"
    fi
}

# 显示帮助信息
show_help() {
    echo "屏幕监控系统后端服务管理脚本"
    echo ""
    echo "用法: $0 [命令]"
    echo ""
    echo "命令:"
    echo "  start     启动服务"
    echo "  stop      停止服务"
    echo "  restart   重启服务"
    echo "  status    显示服务状态"
    echo "  logs      显示服务日志"
    echo "  monitor   实时监控"
    echo "  health    健康检查"
    echo "  help      显示帮助信息"
    echo ""
    echo "示例:"
    echo "  $0 start"
    echo "  $0 logs 100"
    echo ""
}

# 主函数
main() {
    check_pm2
    
    case "${1:-help}" in
        start)
            start_service
            ;;
        stop)
            stop_service
            ;;
        restart)
            restart_service
            ;;
        status)
            show_status
            ;;
        logs)
            show_logs $2
            ;;
        monitor)
            monitor_service
            ;;
        health)
            health_check
            ;;
        help|--help|-h)
            show_help
            ;;
        *)
            print_message $RED "❌ 未知命令: $1"
            echo ""
            show_help
            exit 1
            ;;
    esac
}

# 执行主函数
main "$@"