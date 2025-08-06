#!/bin/bash

# 屏幕监控系统 - 停止脚本
# 使用方法：./stop.sh [dev|prod] [--remove-data]

set -e

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 打印带颜色的消息
print_message() {
    local color=$1
    local message=$2
    echo -e "${color}[$(date +'%Y-%m-%d %H:%M:%S')] ${message}${NC}"
}

print_info() { print_message $BLUE "$1"; }
print_success() { print_message $GREEN "$1"; }
print_warning() { print_message $YELLOW "$1"; }
print_error() { print_message $RED "$1"; }

# 获取参数
ENVIRONMENT=${1:-dev}
REMOVE_DATA=${2:-}

print_info "=== 屏幕监控系统停止脚本 ==="
print_info "环境: $ENVIRONMENT"

# 切换到项目根目录
cd "$(dirname "$0")/../.."

# 根据环境选择compose文件
if [ "$ENVIRONMENT" = "dev" ]; then
    print_info "停止开发环境..."
    COMPOSE_FILES="-f docker-compose.yml -f docker-compose.dev.yml"
else
    print_info "停止生产环境..."
    COMPOSE_FILES="-f docker-compose.yml"
fi

# 停止服务
print_info "停止服务容器..."
docker-compose $COMPOSE_FILES down

# 如果指定删除数据
if [ "$REMOVE_DATA" = "--remove-data" ]; then
    print_warning "删除数据卷..."
    docker-compose $COMPOSE_FILES down -v
    
    print_warning "删除相关镜像（可选）..."
    read -p "是否删除相关Docker镜像？(y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        docker-compose $COMPOSE_FILES down --rmi all
        print_success "镜像已删除"
    fi
    
    print_warning "清理未使用的Docker资源..."
    docker system prune -f
fi

# 显示剩余容器
print_info "剩余的相关容器："
docker ps -a | grep screen-monitor || echo "没有相关容器在运行"

print_success "=== 服务停止完成 ==="

if [ "$REMOVE_DATA" = "--remove-data" ]; then
    print_warning "所有数据已被删除，下次启动将重新初始化"
else
    print_info "数据已保留，下次启动将恢复之前的状态"
    print_info "如需删除所有数据，请使用: ./stop.sh $ENVIRONMENT --remove-data"
fi