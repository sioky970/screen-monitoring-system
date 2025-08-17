#!/bin/bash

# 后端服务启动脚本
# 启动基础设施服务和后端应用

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 日志函数
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 检查 Docker 是否运行
check_docker() {
    if ! docker info > /dev/null 2>&1; then
        log_error "Docker 未运行，请先启动 Docker"
        exit 1
    fi
}

# 检查 Docker Compose 是否可用
check_docker_compose() {
    if ! command -v docker-compose > /dev/null 2>&1; then
        log_error "docker-compose 未安装"
        exit 1
    fi
}

# 启动服务
start_services() {
    log_info "启动后端服务..."
    
    # 确保网络存在
    docker network create screen-monitor-network 2>/dev/null || true
    
    # 启动服务
    docker-compose -f docker-compose.backend.yml up -d
    
    log_info "等待服务启动..."
    sleep 10
    
    log_info "检查服务状态..."
    docker-compose -f docker-compose.backend.yml ps
}

# 停止服务
stop_services() {
    log_info "停止后端服务..."
    docker-compose -f docker-compose.backend.yml down
    log_success "后端服务已停止"
}

# 重启服务
restart_services() {
    log_info "重启后端服务..."
    stop_services
    sleep 5
    start_services
}

# 查看日志
show_logs() {
    local service=${1:-backend}
    log_info "显示 $service 服务日志..."
    docker-compose -f docker-compose.backend.yml logs -f $service
}

# 显示服务状态
show_status() {
    log_info "服务状态:"
    docker-compose -f docker-compose.backend.yml ps
    
    echo
    log_info "服务健康状态:"
    docker-compose -f docker-compose.backend.yml ps --format "table {{.Name}}\t{{.Status}}"
}

# 显示帮助信息
show_help() {
    echo "后端服务管理脚本"
    echo
    echo "用法: $0 [命令]"
    echo
    echo "命令:"
    echo "  start     启动后端服务"
    echo "  stop      停止后端服务"
    echo "  restart   重启后端服务"
    echo "  status    显示服务状态"
    echo "  logs      显示后端日志 (可指定服务名)"
    echo "  help      显示此帮助信息"
    echo
    echo "示例:"
    echo "  $0 start                # 启动所有服务"
    echo "  $0 logs backend         # 显示后端服务日志"
    echo "  $0 logs mysql           # 显示MySQL日志"
    echo
}

# 主函数
main() {
    # 检查依赖
    check_docker
    check_docker_compose
    
    # 解析命令
    case "${1:-start}" in
        start)
            start_services
            log_success "后端服务启动完成!"
            echo
            log_info "服务访问地址:"
            echo "  🚀 后端API: http://localhost:3000"
            echo "  📊 MySQL数据库: localhost:3306"
            echo "  🔄 Redis缓存: localhost:6379"
            echo "  💾 MinIO存储: http://localhost:9000"
            echo "  🎛️ MinIO控制台: http://localhost:9001"
            echo "  🗄️ Adminer数据库管理: http://localhost:8080 (使用 --profile tools 启动)"
            echo
            log_info "API文档: http://localhost:3000/api/docs"
            ;;
        stop)
            stop_services
            ;;
        restart)
            restart_services
            ;;
        status)
            show_status
            ;;
        logs)
            show_logs $2
            ;;
        help|--help|-h)
            show_help
            ;;
        *)
            log_error "未知命令: $1"
            show_help
            exit 1
            ;;
    esac
}

# 运行主函数
main "$@"