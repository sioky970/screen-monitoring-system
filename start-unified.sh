#!/bin/bash

# 屏幕监控系统 - 统一启动脚本
# 使用方法：./start-unified.sh [dev|prod|infra|tools]

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

# 获取部署模式
DEPLOY_MODE=${1:-dev}

print_info "=== 屏幕监控系统统一启动脚本 ==="
print_info "部署模式: $DEPLOY_MODE"

# 检查Docker和Docker Compose
if ! command -v docker &> /dev/null; then
    print_error "Docker未安装，请先安装Docker"
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    print_error "Docker Compose未安装，请先安装Docker Compose"
    exit 1
fi

# 切换到项目根目录
cd "$(dirname "$0")"

# 根据模式设置环境变量
case "$DEPLOY_MODE" in
    "dev")
        print_info "启动开发环境（包含应用服务和开发工具）"
        export COMPOSE_PROFILES=dev
        ENV_FILE=".env.unified"
        ;;
    "prod")
        print_info "启动生产环境（包含应用服务）"
        export COMPOSE_PROFILES=prod
        ENV_FILE=".env.prod"
        ;;
    "infra")
        print_info "启动基础设施服务（MySQL + Redis + MinIO）"
        export COMPOSE_PROFILES=infra
        ENV_FILE=".env.unified"
        ;;
    "tools")
        print_info "启动开发工具（基础设施 + Adminer + Redis Commander）"
        export COMPOSE_PROFILES=infra,tools
        ENV_FILE=".env.unified"
        ;;
    *)
        print_error "未知的部署模式: $DEPLOY_MODE"
        print_info "支持的模式: dev, prod, infra, tools"
        exit 1
        ;;
esac

# 检查和复制环境变量文件
if [ ! -f .env ]; then
    if [ -f "$ENV_FILE" ]; then
        print_info "复制环境变量文件: $ENV_FILE -> .env"
        cp "$ENV_FILE" .env
    else
        print_warning "未找到环境变量文件，使用默认配置"
    fi
fi

# 创建网络（如果不存在）
print_info "创建Docker网络..."
docker network create screen-monitor-network 2>/dev/null || true

# 拉取镜像
print_info "拉取Docker镜像..."
docker-compose -f docker-compose.unified.yml pull

# 启动服务
print_info "启动服务容器..."
docker-compose -f docker-compose.unified.yml up -d

# 等待服务启动
print_info "等待服务启动..."
sleep 10

# 检查服务状态
print_info "检查服务状态..."
docker-compose -f docker-compose.unified.yml ps

# 显示访问信息
print_success "=== 服务启动完成 ==="

case "$DEPLOY_MODE" in
    "dev")
        echo
        print_success "开发环境访问地址："
        echo "  🌐 前端应用:             http://localhost:38000"
        echo "  🔌 后端API:             http://localhost:38001/api"
        echo "  🐛 后端调试:             http://localhost:39229"
        echo "  📊 数据库管理:           http://localhost:38080"
        echo "  🔧 Redis管理:           http://localhost:38081"
        echo "  💾 MinIO控制台:         http://localhost:39090"
        echo
        print_info "数据库连接信息："
        echo "  Host: localhost:33066"
        echo "  Database: screen_monitoring_dev"
        echo "  Username: dev_user"
        echo "  Password: dev_pass_123"
        ;;
    "prod")
        echo
        print_success "生产环境访问地址："
        echo "  🌐 应用主页:             http://localhost:8080"
        echo "  🔌 API接口:             http://localhost:3001/api"
        echo "  💾 MinIO控制台:         http://localhost:9090"
        ;;
    "infra")
        echo
        print_success "基础设施服务已启动："
        echo "  🗄️  MySQL数据库:         localhost:33066"
        echo "  🔄 Redis缓存:           localhost:36379"
        echo "  💾 MinIO存储:           http://localhost:39000"
        echo "  💾 MinIO控制台:         http://localhost:39090"
        echo
        print_warning "下一步: 启动应用服务"
        echo "  开发环境: ./start-unified.sh dev"
        echo "  生产环境: ./start-unified.sh prod"
        ;;
    "tools")
        echo
        print_success "开发工具已启动："
        echo "  📊 数据库管理:           http://localhost:38080"
        echo "  🔧 Redis管理:           http://localhost:38081"
        echo "  💾 MinIO控制台:         http://localhost:39090"
        ;;
esac

echo
print_info "常用命令："
echo "  查看服务状态: docker-compose -f docker-compose.unified.yml ps"
echo "  查看服务日志: docker-compose -f docker-compose.unified.yml logs -f [service]"
echo "  停止服务: docker-compose -f docker-compose.unified.yml down"
echo "  重启服务: docker-compose -f docker-compose.unified.yml restart [service]"

print_success "🎉 部署完成！"