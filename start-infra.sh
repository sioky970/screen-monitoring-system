#!/bin/bash

# 基础设施服务管理脚本
# 用于启动/停止数据库、Redis、MinIO等依赖服务

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 打印带颜色的消息
print_message() {
    echo -e "${2}${1}${NC}"
}

# 显示帮助信息
show_help() {
    echo "基础设施服务管理脚本"
    echo ""
    echo "用法: $0 [命令] [选项]"
    echo ""
    echo "命令:"
    echo "  start     启动基础设施服务"
    echo "  stop      停止基础设施服务"
    echo "  restart   重启基础设施服务"
    echo "  status    查看服务状态"
    echo "  logs      查看服务日志"
    echo "  clean     清理所有数据（危险操作）"
    echo ""
    echo "选项:"
    echo "  --with-tools    同时启动开发工具（Adminer、Redis Commander）"
    echo "  --help          显示此帮助信息"
    echo ""
    echo "示例:"
    echo "  $0 start                # 启动基础设施服务"
    echo "  $0 start --with-tools   # 启动基础设施服务和开发工具"
    echo "  $0 stop                 # 停止所有服务"
    echo "  $0 logs mysql           # 查看MySQL日志"
}

# 检查Docker是否安装
check_docker() {
    if ! command -v docker &> /dev/null; then
        print_message "错误: Docker 未安装或未在PATH中" "$RED"
        exit 1
    fi
    
    if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
        print_message "错误: Docker Compose 未安装" "$RED"
        exit 1
    fi
}

# 检查 docker 是否可用
if ! command -v docker &> /dev/null; then
    echo "❌ docker 未安装，请先安装 Docker"
    exit 1
fi

# 获取Docker Compose命令
get_compose_cmd() {
    if command -v docker-compose &> /dev/null; then
        if docker-compose version &> /dev/null 2>&1; then
            echo "docker-compose"
        elif sudo docker-compose version &> /dev/null 2>&1; then
            echo "sudo docker-compose"
        else
            echo "❌ docker-compose 无法运行"
            exit 1
        fi
    elif docker compose version &> /dev/null 2>&1; then
        echo "docker compose"
    elif sudo docker compose version &> /dev/null 2>&1; then
        echo "sudo docker compose"
    else
        echo "❌ Docker Compose 未安装或无法运行"
        exit 1
    fi
}

# 启动服务
start_services() {
    local with_tools=$1
    local compose_cmd=$(get_compose_cmd)
    
    print_message "启动基础设施服务..." "$BLUE"
    
    if [ "$with_tools" = "true" ]; then
        print_message "包含开发工具" "$YELLOW"
        COMPOSE_PROFILES=tools $compose_cmd -f docker-compose.infra.yml up -d
    else
        $compose_cmd -f docker-compose.infra.yml up -d
    fi
    
    print_message "等待服务启动..." "$YELLOW"
    sleep 10
    
    print_message "检查服务状态..." "$BLUE"
    $compose_cmd -f docker-compose.infra.yml ps
    
    print_message "" ""
    print_message "✅ 基础设施服务启动完成!" "$GREEN"
    print_message "" ""
    print_message "服务访问地址:" "$BLUE"
    print_message "  📊 MySQL数据库: localhost:3306" "$NC"
    print_message "  🔄 Redis缓存: localhost:6379" "$NC"
    print_message "  💾 MinIO存储: http://localhost:9000" "$NC"
    print_message "  🎛️ MinIO控制台: http://localhost:9001" "$NC"
    
    if [ "$with_tools" = "true" ]; then
        print_message "  🔧 数据库管理: http://localhost:8080" "$NC"
        print_message "  🔧 Redis管理: http://localhost:8081" "$NC"
    fi
    
    print_message "" ""
    print_message "数据库连接信息:" "$BLUE"
    print_message "  Host: localhost:3306" "$NC"
    print_message "  Database: screen_monitoring_dev" "$NC"
    print_message "  Username: dev_user" "$NC"
    print_message "  Password: dev_pass_123" "$NC"
}

# 停止服务
stop_services() {
    local compose_cmd=$(get_compose_cmd)
    
    print_message "停止基础设施服务..." "$BLUE"
    $compose_cmd -f docker-compose.infra.yml stop
    
    print_message "✅ 服务已停止" "$GREEN"
}

# 重启服务
restart_services() {
    local with_tools=$1
    print_message "重启基础设施服务..." "$BLUE"
    stop_services
    sleep 3
    start_services "$with_tools"
}

# 查看服务状态
show_status() {
    local compose_cmd=$(get_compose_cmd)
    
    print_message "服务状态:" "$BLUE"
    $compose_cmd -f docker-compose.infra.yml ps
}

# 查看日志
show_logs() {
    local service=$1
    local compose_cmd=$(get_compose_cmd)
    
    if [ -n "$service" ]; then
        print_message "查看 $service 服务日志:" "$BLUE"
        $compose_cmd -f docker-compose.infra.yml logs -f "$service"
    else
        print_message "查看所有服务日志:" "$BLUE"
        $compose_cmd -f docker-compose.infra.yml logs -f
    fi
}

# 清理数据
clean_data() {
    local compose_cmd=$(get_compose_cmd)
    
    print_message "⚠️  警告: 此操作将删除所有数据!" "$RED"
    read -p "确定要继续吗? (y/N): " -n 1 -r
    echo
    
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        print_message "停止服务并清理数据..." "$BLUE"
        $compose_cmd -f docker-compose.infra.yml down -v
        docker volume prune -f
        print_message "✅ 数据清理完成" "$GREEN"
    else
        print_message "操作已取消" "$YELLOW"
    fi
}

# 主函数
main() {
    check_docker
    
    local command=$1
    local with_tools=false
    
    # 解析参数
    shift
    while [[ $# -gt 0 ]]; do
        case $1 in
            --with-tools)
                with_tools=true
                shift
                ;;
            --help)
                show_help
                exit 0
                ;;
            *)
                break
                ;;
        esac
    done
    
    case $command in
        start)
            start_services "$with_tools"
            ;;
        stop)
            stop_services
            ;;
        restart)
            restart_services "$with_tools"
            ;;
        status)
            show_status
            ;;
        logs)
            show_logs "$1"
            ;;
        clean)
            clean_data
            ;;
        --help|help|"")
            show_help
            ;;
        *)
            print_message "错误: 未知命令 '$command'" "$RED"
            echo
            show_help
            exit 1
            ;;
    esac
}

main "$@"