#!/bin/bash

# 屏幕监控系统快速设置脚本
# 自动构建MySQL镜像并启动开发环境

set -e

# 颜色输出
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

print_info() { echo -e "${BLUE}[INFO] $1${NC}"; }
print_success() { echo -e "${GREEN}[SUCCESS] $1${NC}"; }
print_warning() { echo -e "${YELLOW}[WARNING] $1${NC}"; }

print_info "=== 屏幕监控系统快速设置 ==="

# 检查Docker
if ! command -v docker &> /dev/null; then
    print_warning "Docker未安装，请先安装Docker"
    exit 1
fi

# 构建MySQL镜像
print_info "第1步: 构建自定义MySQL镜像（包含完整数据库结构）"
if ./build-mysql-image.sh; then
    print_success "MySQL镜像构建成功"
else
    print_warning "MySQL镜像构建失败，系统将使用官方镜像"
fi

print_info "第2步: 启动开发环境"
./start-unified.sh dev

print_info "第3步: 验证数据库结构"
sleep 10
./check-database.sh

print_success "=== 快速设置完成 ==="
print_info "系统已就绪！"
echo ""
echo "🌐 前端应用: http://localhost:38000"
echo "🔌 后端API: http://localhost:38001/api"
echo "📊 数据库管理: http://localhost:38080"
echo "🔧 Redis管理: http://localhost:38081"
echo "💾 MinIO控制台: http://localhost:39090"
echo ""
print_info "数据库包含完整的表结构和示例数据，立即可用！"