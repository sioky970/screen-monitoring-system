#!/bin/bash

# 屏幕监控系统 Docker 停止脚本
# 使用方法：
#   ./stop-docker.sh           # 停止所有服务
#   ./stop-docker.sh --clean   # 停止服务并清理数据
#   ./stop-docker.sh --reset   # 完全重置（删除所有数据和镜像）

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 打印带颜色的消息
print_message() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_header() {
    echo -e "${BLUE}"
    echo "=================================================="
    echo "    屏幕监控系统 Docker 停止脚本"
    echo "=================================================="
    echo -e "${NC}"
}

# 确认操作
confirm_action() {
    local message="$1"
    echo -e "${YELLOW}$message${NC}"
    read -p "确认继续? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        print_message "操作已取消"
        exit 0
    fi
}

# 停止服务
stop_services() {
    print_message "停止 Docker 服务..."
    
    if [ -f "docker-compose.unified.yml" ]; then
        docker-compose -f docker-compose.unified.yml down
    else
        print_error "docker-compose.unified.yml 文件不存在"
        exit 1
    fi
    
    print_message "服务已停止 ✓"
}

# 清理数据
clean_data() {
    print_warning "这将删除所有数据卷（数据库、文件等）"
    confirm_action "确认要清理所有数据吗？"
    
    print_message "清理数据卷..."
    
    # 停止并删除容器和网络
    docker-compose -f docker-compose.unified.yml down -v
    
    # 删除相关数据卷
    docker volume ls -q | grep screen-monitor | xargs -r docker volume rm
    
    print_message "数据清理完成 ✓"
}

# 完全重置
reset_all() {
    print_error "⚠️  警告：这将删除所有容器、镜像、数据卷和网络！"
    confirm_action "确认要完全重置吗？这个操作不可恢复！"
    
    print_message "执行完全重置..."
    
    # 停止并删除所有相关资源
    docker-compose -f docker-compose.unified.yml down -v --rmi all --remove-orphans
    
    # 删除相关镜像
    docker images | grep screen-monitor | awk '{print $3}' | xargs -r docker rmi -f
    
    # 删除相关数据卷
    docker volume ls -q | grep screen-monitor | xargs -r docker volume rm
    
    # 删除相关网络
    docker network ls -q | grep screen-monitor | xargs -r docker network rm
    
    # 清理未使用的资源
    docker system prune -f
    
    print_message "完全重置完成 ✓"
}

# 显示状态
show_status() {
    print_message "当前 Docker 状态："
    echo ""
    
    echo "📋 容器状态："
    docker ps -a | grep screen-monitor || echo "   没有相关容器"
    echo ""
    
    echo "💾 数据卷："
    docker volume ls | grep screen-monitor || echo "   没有相关数据卷"
    echo ""
    
    echo "🖼️  镜像："
    docker images | grep screen-monitor || echo "   没有相关镜像"
    echo ""
    
    echo "🌐 网络："
    docker network ls | grep screen-monitor || echo "   没有相关网络"
    echo ""
}

# 显示帮助信息
show_help() {
    echo "屏幕监控系统 Docker 停止脚本"
    echo ""
    echo "使用方法:"
    echo "  $0                 停止所有服务"
    echo "  $0 --clean         停止服务并清理数据"
    echo "  $0 --reset         完全重置（删除所有数据和镜像）"
    echo "  $0 --status        显示当前状态"
    echo "  $0 --help          显示此帮助信息"
    echo ""
    echo "选项说明:"
    echo "  --clean   删除数据卷，包括数据库数据和上传的文件"
    echo "  --reset   删除所有相关的容器、镜像、数据卷和网络"
    echo "  --status  显示当前 Docker 资源状态"
    echo ""
}

# 主函数
main() {
    print_header
    
    case "${1:-}" in
        "--clean")
            stop_services
            clean_data
            ;;
        "--reset")
            reset_all
            ;;
        "--status")
            show_status
            ;;
        "--help")
            show_help
            ;;
        "")
            stop_services
            ;;
        *)
            print_error "未知的选项: $1"
            show_help
            exit 1
            ;;
    esac
    
    print_message "操作完成！"
}

# 执行主函数
main "$@"
