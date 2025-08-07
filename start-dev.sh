#!/bin/bash

# 屏幕监控系统开发环境启动脚本

set -e

# 颜色输出
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

print_info() { echo -e "${BLUE}[INFO] $1${NC}"; }
print_success() { echo -e "${GREEN}[SUCCESS] $1${NC}"; }
print_warning() { echo -e "${YELLOW}[WARNING] $1${NC}"; }
print_error() { echo -e "${RED}[ERROR] $1${NC}"; }

print_info "=== 屏幕监控系统 - 开发环境启动 ==="

# 检查Node.js
if ! command -v node &> /dev/null; then
    print_error "Node.js未安装，请先安装Node.js 16+"
    exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 16 ]; then
    print_error "Node.js版本过低，需要16+，当前版本: $(node -v)"
    exit 1
fi

print_success "Node.js版本检查通过: $(node -v)"

# 切换到项目目录
cd "$(dirname "$0")"

# 启动后端服务
print_info "启动后端服务..."
cd backend

if [ ! -d "node_modules" ]; then
    print_info "首次运行，安装后端依赖..."
    npm install
fi

print_info "启动NestJS后端服务（端口: 47828）"
npm run start:dev &
BACKEND_PID=$!

cd ..

# 等待后端启动
sleep 3

# 启动前端服务
print_info "启动前端服务..."
cd frontend

if [ ! -d "node_modules" ]; then
    print_info "首次运行，安装前端依赖..."
    npm install
fi

print_info "启动Vue前端服务（端口: 47827）"
npm run dev &
FRONTEND_PID=$!

cd ..

# 等待服务启动完成
print_info "等待服务启动完成..."
sleep 5

print_success "=== 开发环境启动完成 ==="
echo ""
print_info "访问地址："
echo "  🌐 前端应用:     http://localhost:47827"
echo "  🔌 后端API:      http://localhost:47828/api"
echo "  📖 API文档:      http://localhost:47828/api/docs"
echo ""
print_info "默认登录账号："
echo "  📧 邮箱:         admin@example.com"
echo "  🔑 密码:         admin123"
echo ""
print_info "功能特性："
echo "  ✅ 管理员登录认证"
echo "  ✅ 用户管理（增删改查）"
echo "  ✅ 白名单管理（增删改查、批量导入）"
echo "  ✅ 屏幕墙监控（FPS=1实时刷新）"
echo "  ✅ WebSocket实时通信"
echo "  ✅ 权限控制（管理员/操作员/查看者）"
echo ""
print_warning "注意事项："
echo "  • 后端服务需要MySQL、Redis、MinIO支持"
echo "  • 如需完整功能请使用Docker部署"
echo "  • 当前为开发环境，数据为模拟数据"
echo ""

# 等待用户中断
print_info "按 Ctrl+C 停止服务"

# 信号处理
cleanup() {
    print_info "正在停止服务..."
    kill $BACKEND_PID 2>/dev/null || true
    kill $FRONTEND_PID 2>/dev/null || true
    print_success "服务已停止"
    exit 0
}

trap cleanup SIGINT SIGTERM

# 保持脚本运行
wait