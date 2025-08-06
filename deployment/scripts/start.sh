#!/bin/bash

# 屏幕监控系统 - 快速启动脚本
# 使用方法：./start.sh [dev|prod] [infra|app|all]
# 
# 环境参数：
#   dev  - 开发环境（默认）
#   prod - 生产环境
#
# 模式参数：
#   infra - 仅启动基础设施（MySQL + Redis + MinIO）
#   app   - 启动应用服务（包含基础设施 + Backend + Frontend）
#   all   - 启动全部服务（包含管理工具，仅开发环境）

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
MODE=${2:-infra}  # infra: 只启动基础设施, app: 启动应用服务, all: 全部启动

print_info "=== 屏幕监控系统启动脚本 ==="
print_info "环境: $ENVIRONMENT"
print_info "模式: $MODE"

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
cd "$(dirname "$0")/../.."

# 检查环境变量文件
if [ ! -f .env ]; then
    print_warning "未找到.env文件，从.env.example复制"
    cp .env.example .env
    print_warning "请编辑.env文件设置正确的环境变量"
fi

# 根据环境和模式选择compose文件
if [ "$ENVIRONMENT" = "dev" ]; then
    if [ "$MODE" = "app" ]; then
        print_info "启动开发环境应用服务..."
        COMPOSE_FILES="-f docker-compose.yml -f docker-compose.dev.yml -f docker-compose.app.dev.yml"
        SERVICES="mysql redis minio backend-dev frontend-dev"
    elif [ "$MODE" = "all" ]; then
        print_info "启动开发环境全部服务..."
        COMPOSE_FILES="-f docker-compose.yml -f docker-compose.dev.yml -f docker-compose.app.dev.yml"
        SERVICES="mysql redis minio adminer redis-commander backend-dev frontend-dev"
    else
        print_info "启动开发环境基础设施..."
        COMPOSE_FILES="-f docker-compose.yml -f docker-compose.dev.yml"
        SERVICES="mysql redis minio adminer redis-commander"
    fi
else
    if [ "$MODE" = "app" ]; then
        print_info "启动生产环境应用服务..."
        COMPOSE_FILES="-f docker-compose.yml -f docker-compose.app.yml"
        SERVICES="mysql redis minio backend frontend"
    elif [ "$MODE" = "all" ]; then
        print_info "启动生产环境全部服务..."
        COMPOSE_FILES="-f docker-compose.yml -f docker-compose.app.yml"
        SERVICES="mysql redis minio backend frontend"
    else
        print_info "启动生产环境基础设施..."
        COMPOSE_FILES="-f docker-compose.yml"
        SERVICES="mysql redis minio"
    fi
fi

# 创建网络（如果不存在）
print_info "创建Docker网络..."
docker network create screen-monitor-network 2>/dev/null || true

# 拉取镜像
print_info "拉取Docker镜像..."
docker-compose $COMPOSE_FILES pull

# 启动服务
print_info "启动服务容器..."
docker-compose $COMPOSE_FILES up -d $SERVICES

# 等待服务启动
print_info "等待服务启动..."
sleep 10

# 检查服务状态
print_info "检查服务状态..."
docker-compose $COMPOSE_FILES ps

# 初始化MinIO
print_info "初始化MinIO存储..."
if [ -f deployment/docker/minio/init/create-buckets.sh ]; then
    docker-compose $COMPOSE_FILES exec -T minio sh -c "chmod +x /docker-entrypoint-initdb.d/create-buckets.sh && /docker-entrypoint-initdb.d/create-buckets.sh" || print_warning "MinIO初始化失败，请手动执行"
fi

# 显示访问信息
print_success "=== 服务启动完成 ==="

if [ "$ENVIRONMENT" = "dev" ]; then
    echo
    print_success "开发环境访问地址："
    
    # 基础设施服务
    if [ "$MODE" = "infra" ] || [ "$MODE" = "all" ]; then
        echo "  📊 MySQL (Adminer):     http://localhost:38080"
        echo "  🔧 Redis Commander:     http://localhost:38081"
        echo "  💾 MinIO Console:       http://localhost:39090"
        echo "  📁 MinIO API:           http://localhost:39000"
    fi
    
    # 应用服务
    if [ "$MODE" = "app" ] || [ "$MODE" = "all" ]; then
        echo "  🌐 前端应用:             http://localhost:38000"
        echo "  🔌 后端API:             http://localhost:38001/api"
        echo "  🐛 后端调试:             http://localhost:39229 (调试端口)"
    fi
    
    echo
    print_info "数据库连接信息："
    echo "  Host: localhost:33066"
    echo "  Database: screen_monitoring_dev"
    echo "  Username: dev_user"
    echo "  Password: dev_pass_123"
    echo
    print_info "MinIO连接信息："
    echo "  Console: http://localhost:39090"
    echo "  Username: devadmin"
    echo "  Password: devadmin123"
else
    echo
    print_success "生产环境访问地址："
    
    # 基础设施服务
    if [ "$MODE" = "infra" ]; then
        echo "  💾 MinIO Console:       http://localhost:9090"
        echo "  ⚠️  仅启动基础设施，应用服务需单独启动"
    fi
    
    # 应用服务
    if [ "$MODE" = "app" ] || [ "$MODE" = "all" ]; then
        echo "  🌐 应用主页:             http://localhost:8080"
        echo "  🔌 API接口:             http://localhost:3001/api"
        echo "  💾 MinIO Console:       http://localhost:9090"
    fi
    echo
fi

print_info "查看服务日志: docker-compose $COMPOSE_FILES logs -f [service_name]"
print_info "停止服务: ./deployment/scripts/stop.sh $ENVIRONMENT"

# 显示下一步操作
echo
print_warning "下一步操作："
echo "1. 等待所有服务完全启动（约1-2分钟）"
echo "2. 检查服务状态: docker-compose $COMPOSE_FILES ps"
echo "3. 查看服务日志: docker-compose $COMPOSE_FILES logs -f"

if [ "$ENVIRONMENT" = "dev" ] && [ "$MODE" = "infra" ]; then
    echo "4. 启动应用服务: ./deployment/scripts/start.sh dev app"
    echo "5. 或本地开发: cd backend && npm run start:dev (后端)"
    echo "6. 或本地开发: cd frontend && npm run dev (前端)"
elif [ "$ENVIRONMENT" = "prod" ] && [ "$MODE" = "infra" ]; then
    echo "4. 启动应用服务: ./deployment/scripts/start.sh prod app"
fi