#!/bin/bash

# 屏幕监控系统 - 启动脚本（重定向到统一脚本）
# 为了向后兼容保留此脚本，实际使用统一启动脚本

set -e

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_info() { echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"; }
print_warning() { echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"; }

# 获取参数
ENVIRONMENT=${1:-dev}
MODE=${2:-infra}

print_info "=== 重定向到统一启动脚本 ==="
print_warning "此脚本已被统一启动脚本替代"

# 切换到项目根目录
cd "$(dirname "$0")/../.."

# 参数映射到新的统一脚本
case "$ENVIRONMENT-$MODE" in
    "dev-infra")
        print_info "启动基础设施服务..."
        exec ./start-unified.sh infra
        ;;
    "dev-app")
        print_info "启动开发环境应用服务..."
        exec ./start-unified.sh dev
        ;;
    "dev-all")
        print_info "启动开发环境全部服务..."
        exec ./start-unified.sh dev
        ;;
    "prod-infra")
        print_info "启动生产环境基础设施..."
        exec ./start-unified.sh infra
        ;;
    "prod-app")
        print_info "启动生产环境应用服务..."
        exec ./start-unified.sh prod
        ;;
    "prod-all")
        print_info "启动生产环境全部服务..."
        exec ./start-unified.sh prod
        ;;
    *)
        print_warning "推荐使用新的统一启动脚本："
        echo "  开发环境: ./start-unified.sh dev"
        echo "  生产环境: ./start-unified.sh prod"
        echo "  仅基础设施: ./start-unified.sh infra"
        echo "  开发工具: ./start-unified.sh tools"
        echo ""
        print_info "继续使用旧方式启动: $ENVIRONMENT 环境, $MODE 模式"
        if [ "$ENVIRONMENT" = "dev" ]; then
            exec ./start-unified.sh dev
        else
            exec ./start-unified.sh prod
        fi
        ;;
esac