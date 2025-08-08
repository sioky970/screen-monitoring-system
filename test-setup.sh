#!/bin/bash

# 开发环境配置测试脚本
# 验证本地开发环境是否正确配置

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 打印带颜色的消息
print_message() {
    echo -e "${2}${1}${NC}"
}

print_message "=== 屏幕监控系统 - 开发环境配置测试 ===" "$BLUE"
echo

# 检查必要的工具
print_message "1. 检查必要工具..." "$BLUE"

# 检查Node.js
if command -v node &> /dev/null; then
    NODE_VERSION=$(node -v)
    NODE_MAJOR=$(echo $NODE_VERSION | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$NODE_MAJOR" -ge 16 ]; then
        print_message "✅ Node.js: $NODE_VERSION" "$GREEN"
    else
        print_message "❌ Node.js版本过低: $NODE_VERSION (需要16+)" "$RED"
        exit 1
    fi
else
    print_message "❌ Node.js未安装" "$RED"
    exit 1
fi

# 检查npm
if command -v npm &> /dev/null; then
    NPM_VERSION=$(npm -v)
    print_message "✅ npm: $NPM_VERSION" "$GREEN"
else
    print_message "❌ npm未安装" "$RED"
    exit 1
fi

# 检查Docker
if command -v docker &> /dev/null; then
    DOCKER_VERSION=$(docker --version | cut -d' ' -f3 | cut -d',' -f1)
    print_message "✅ Docker: $DOCKER_VERSION" "$GREEN"
else
    print_message "❌ Docker未安装" "$RED"
    exit 1
fi

# 检查Docker Compose
if docker compose version &> /dev/null; then
    COMPOSE_VERSION=$(docker compose version --short)
    print_message "✅ Docker Compose: $COMPOSE_VERSION" "$GREEN"
elif command -v docker-compose &> /dev/null; then
    COMPOSE_VERSION=$(docker-compose --version | cut -d' ' -f3 | cut -d',' -f1)
    print_message "✅ Docker Compose: $COMPOSE_VERSION" "$GREEN"
else
    print_message "❌ Docker Compose未安装" "$RED"
    exit 1
fi

# 检查netcat（用于端口检测）
if command -v nc &> /dev/null; then
    print_message "✅ netcat (nc)" "$GREEN"
else
    print_message "⚠️  netcat (nc) 未安装，端口检测可能不可用" "$YELLOW"
fi

echo

# 检查项目结构
print_message "2. 检查项目结构..." "$BLUE"

if [ -d "backend" ]; then
    print_message "✅ backend目录存在" "$GREEN"
else
    print_message "❌ backend目录不存在" "$RED"
    exit 1
fi

if [ -d "frontend" ]; then
    print_message "✅ frontend目录存在" "$GREEN"
else
    print_message "❌ frontend目录不存在" "$RED"
    exit 1
fi

if [ -f "docker-compose.infra.yml" ]; then
    print_message "✅ 基础设施Docker配置存在" "$GREEN"
else
    print_message "❌ docker-compose.infra.yml不存在" "$RED"
    exit 1
fi

if [ -f "start-infra.sh" ] && [ -x "start-infra.sh" ]; then
    print_message "✅ 基础设施启动脚本存在且可执行" "$GREEN"
else
    print_message "❌ start-infra.sh不存在或不可执行" "$RED"
    exit 1
fi

if [ -f "start-dev.sh" ] && [ -x "start-dev.sh" ]; then
    print_message "✅ 开发启动脚本存在且可执行" "$GREEN"
else
    print_message "❌ start-dev.sh不存在或不可执行" "$RED"
    exit 1
fi

echo

# 检查配置文件
print_message "3. 检查配置文件..." "$BLUE"

if [ -f "backend/.env.local" ]; then
    print_message "✅ 后端本地配置文件存在" "$GREEN"
else
    print_message "⚠️  后端本地配置文件不存在，将在首次启动时创建" "$YELLOW"
fi

if [ -f "frontend/.env.local" ]; then
    print_message "✅ 前端本地配置文件存在" "$GREEN"
else
    print_message "⚠️  前端本地配置文件不存在，将在首次启动时创建" "$YELLOW"
fi

if [ -f "backend/package.json" ]; then
    print_message "✅ 后端package.json存在" "$GREEN"
else
    print_message "❌ 后端package.json不存在" "$RED"
    exit 1
fi

if [ -f "frontend/package.json" ]; then
    print_message "✅ 前端package.json存在" "$GREEN"
else
    print_message "❌ 前端package.json不存在" "$RED"
    exit 1
fi

echo

# 检查端口占用
print_message "4. 检查端口占用情况..." "$BLUE"

check_port() {
    local port=$1
    local service=$2
    
    if command -v nc &> /dev/null; then
        if nc -z localhost $port 2>/dev/null; then
            print_message "⚠️  端口 $port ($service) 已被占用" "$YELLOW"
            return 1
        else
            print_message "✅ 端口 $port ($service) 可用" "$GREEN"
            return 0
        fi
    else
        print_message "⚠️  无法检查端口 $port ($service) - nc未安装" "$YELLOW"
        return 0
    fi
}

check_port 3000 "前端"
check_port 3001 "后端"
check_port 3306 "MySQL"
check_port 6379 "Redis"
check_port 9000 "MinIO API"
check_port 9001 "MinIO Console"
check_port 8080 "Adminer"
check_port 8081 "Redis Commander"

echo

# 检查Docker服务状态
print_message "5. 检查Docker服务状态..." "$BLUE"

if docker info &> /dev/null; then
    print_message "✅ Docker服务运行正常" "$GREEN"
elif sudo docker info &> /dev/null 2>&1; then
    print_message "⚠️  Docker需要sudo权限运行" "$YELLOW"
    print_message "提示：基础设施脚本将自动使用sudo" "$YELLOW"
else
    print_message "⚠️  Docker服务未运行或无法访问" "$YELLOW"
    print_message "注意：在某些环境中Docker可能无法运行" "$YELLOW"
    print_message "如果是容器环境，可以跳过Docker相关步骤" "$YELLOW"
fi

echo

# 总结
print_message "=== 配置检查完成 ===" "$GREEN"
echo
print_message "🎉 开发环境配置检查通过！" "$GREEN"
echo
print_message "接下来的步骤：" "$BLUE"
echo "1. 启动基础设施服务: ./start-infra.sh start --with-tools"
echo "2. 启动前后端应用: ./start-dev.sh"
echo "3. 访问前端应用: http://localhost:3000"
echo "4. 访问后端API: http://localhost:3001/api"
echo
print_message "📋 详细说明请查看: LOCAL-DEVELOPMENT.md" "$BLUE"
echo