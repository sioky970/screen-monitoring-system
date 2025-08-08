#!/bin/bash

# 屏幕监控系统开发环境启动脚本
# 前后端本地运行，连接Docker中的基础设施服务

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

print_info "=== 屏幕监控系统 - 本地开发环境启动 ==="

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

# 检查基础设施服务
print_info "检查基础设施服务状态..."

if ! nc -z localhost 3306 2>/dev/null; then
    print_error "MySQL服务未运行 (端口 3306)"
    print_warning "请先运行: ./start-infra.sh start"
    exit 1
fi

if ! nc -z localhost 6379 2>/dev/null; then
    print_error "Redis服务未运行 (端口 6379)"
    print_warning "请先运行: ./start-infra.sh start"
    exit 1
fi

if ! nc -z localhost 9000 2>/dev/null; then
    print_error "MinIO服务未运行 (端口 9000)"
    print_warning "请先运行: ./start-infra.sh start"
    exit 1
fi

print_success "基础设施服务运行正常"

# 切换到项目目录
cd "$(dirname "$0")"

# 启动后端服务
print_info "启动后端服务..."
cd backend

if [ ! -d "node_modules" ]; then
    print_info "首次运行，安装后端依赖..."
    npm install
fi

# 使用本地环境配置
if [ ! -f ".env" ]; then
    if [ -f ".env.local" ]; then
        cp .env.local .env
        print_info "使用本地环境配置"
    elif [ -f ".env.example" ]; then
        cp .env.example .env
        print_warning "使用示例环境配置，请检查数据库连接"
    fi
fi

print_info "启动NestJS后端服务（端口: 3001）"
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

# 确保本地环境配置存在
if [ ! -f ".env.local" ]; then
    print_info "创建前端环境配置..."
    cat > .env.local << 'EOF'
# 前端本地开发环境配置
VITE_HOST=0.0.0.0
VITE_PORT=3000
VITE_API_BASE_URL=http://localhost:3001/api
VITE_WS_BASE_URL=ws://localhost:3001
NODE_ENV=development
EOF
fi

print_info "启动Vue前端服务（端口: 3000）"
npm run dev &
FRONTEND_PID=$!

cd ..

# 等待服务启动完成
print_info "等待服务启动完成..."
sleep 5

print_success "=== 本地开发环境启动完成 ==="
echo ""
print_info "访问地址："
echo "  🌐 前端应用:     http://localhost:3000"
echo "  🔌 后端API:      http://localhost:3001/api"
echo "  📖 API文档:      http://localhost:3001/api/docs"
echo ""
print_info "基础设施服务："
echo "  📊 MySQL数据库:  localhost:3306"
echo "  🔄 Redis缓存:    localhost:6379"
echo "  💾 MinIO存储:    http://localhost:9000"
echo "  🎛️ MinIO控制台:  http://localhost:9001"
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
echo "  • 前后端本地运行，基础设施服务使用Docker"
echo "  • 数据库连接: dev_user/dev_pass_123@localhost:3306/screen_monitoring_dev"
echo "  • 如需停止基础设施服务: ./start-infra.sh stop"
echo ""

# 等待用户中断
print_info "按 Ctrl+C 停止服务"

# 信号处理
cleanup() {
    print_info "正在停止前后端服务..."
    kill $BACKEND_PID 2>/dev/null || true
    kill $FRONTEND_PID 2>/dev/null || true
    print_success "前后端服务已停止"
    print_info "基础设施服务仍在运行，如需停止请运行: ./start-infra.sh stop"
    exit 0
}

trap cleanup SIGINT SIGTERM

# 保持脚本运行
wait