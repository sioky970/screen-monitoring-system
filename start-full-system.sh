#!/bin/bash

# 屏幕监控系统完整启动脚本
# 包含前端、后端和所有依赖服务

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

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

# 检查Docker是否运行
check_docker() {
    if ! docker info >/dev/null 2>&1; then
        log_error "Docker is not running. Please start Docker first."
        exit 1
    fi
    log_info "Docker is running"
}

# 构建镜像
build_images() {
    log_info "Building Docker images..."
    
    # 构建后端镜像
    log_info "Building backend image..."
    cd backend
    docker build -t screen-monitor-backend:latest .
    cd ..
    
    # 构建前端镜像
    log_info "Building frontend image..."
    cd frontend
    docker build -t screen-monitor-frontend:latest .
    cd ..
    
    log_success "All images built successfully"
}

# 启动服务
start_services() {
    log_info "Starting all services..."
    docker-compose -f docker-compose.full.yml up -d
    
    log_info "Waiting for services to be healthy..."
    sleep 10
    
    # 检查服务状态
    docker-compose -f docker-compose.full.yml ps
}

# 停止服务
stop_services() {
    log_info "Stopping all services..."
    docker-compose -f docker-compose.full.yml down
    log_success "All services stopped"
}

# 重启服务
restart_services() {
    log_info "Restarting all services..."
    stop_services
    start_services
}

# 查看日志
show_logs() {
    local service=${1:-""}
    if [ -n "$service" ]; then
        docker-compose -f docker-compose.full.yml logs -f "$service"
    else
        docker-compose -f docker-compose.full.yml logs -f
    fi
}

# 显示服务状态
show_status() {
    log_info "Service status:"
    docker-compose -f docker-compose.full.yml ps
    
    echo
    log_info "Service URLs:"
    echo "Frontend: http://localhost"
    echo "Backend API: http://localhost:3000/api"
    echo "Backend Health: http://localhost:3000/health"
    echo "MinIO Console: http://localhost:9001"
}

# 清理资源
cleanup() {
    log_warning "Cleaning up all resources..."
    docker-compose -f docker-compose.full.yml down -v --remove-orphans
    docker system prune -f
    log_success "Cleanup completed"
}

# 显示帮助
show_help() {
    echo "Screen Monitor System Management Script"
    echo
    echo "Usage: $0 [COMMAND]"
    echo
    echo "Commands:"
    echo "  start     - Build images and start all services"
    echo "  stop      - Stop all services"
    echo "  restart   - Restart all services"
    echo "  build     - Build Docker images only"
    echo "  status    - Show service status and URLs"
    echo "  logs      - Show logs for all services"
    echo "  logs <service> - Show logs for specific service"
    echo "  cleanup   - Stop services and clean up resources"
    echo "  help      - Show this help message"
    echo
    echo "Examples:"
    echo "  $0 start"
    echo "  $0 logs screen-monitor-backend"
    echo "  $0 status"
}

# 主函数
main() {
    case "${1:-start}" in
        "start")
            check_docker
            build_images
            start_services
            show_status
            ;;
        "stop")
            stop_services
            ;;
        "restart")
            check_docker
            restart_services
            show_status
            ;;
        "build")
            check_docker
            build_images
            ;;
        "status")
            show_status
            ;;
        "logs")
            show_logs "$2"
            ;;
        "cleanup")
            cleanup
            ;;
        "help")
            show_help
            ;;
        *)
            log_error "Unknown command: $1"
            show_help
            exit 1
            ;;
    esac
}

main "$@"