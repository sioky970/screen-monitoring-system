#!/bin/bash

# 屏幕监控系统 - 本地开发模式演示脚本
# 此脚本演示如何在本地开发模式下运行项目

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 打印消息函数
print_message() {
    local message="$1"
    local color="$2"
    echo -e "${color}${message}${NC}"
}

print_header() {
    echo
    print_message "=== $1 ===" "$BLUE"
    echo
}

print_header "屏幕监控系统 - 本地开发模式演示"

print_message "本演示将展示如何配置和运行混合开发环境：" "$YELLOW"
print_message "• 前后端：本地运行（Node.js）" "$YELLOW"
print_message "• 基础设施：Docker运行（MySQL、Redis、MinIO）" "$YELLOW"
echo

print_header "1. 检查环境配置"
print_message "运行环境检查脚本..." "$BLUE"
./test-setup.sh

print_header "2. 查看配置文件"
print_message "后端本地配置 (.env.local):" "$BLUE"
echo "--- backend/.env.local ---"
cat backend/.env.local | head -10
echo "..."
echo

print_message "前端本地配置 (.env.local):" "$BLUE"
echo "--- frontend/.env.local ---"
cat frontend/.env.local
echo

print_header "3. 项目结构说明"
print_message "新增的配置文件：" "$GREEN"
print_message "✅ docker-compose.infra.yml - 基础设施服务配置" "$GREEN"
print_message "✅ backend/.env.local - 后端本地开发配置" "$GREEN"
print_message "✅ frontend/.env.local - 前端本地开发配置" "$GREEN"
print_message "✅ start-infra.sh - 基础设施管理脚本" "$GREEN"
print_message "✅ LOCAL-DEVELOPMENT.md - 详细开发指南" "$GREEN"
echo

print_header "4. 开发工作流演示"
print_message "在实际开发中，您需要按以下步骤操作：" "$YELLOW"
echo
print_message "步骤 1: 启动基础设施服务" "$BLUE"
print_message "命令: ./start-infra.sh start --with-tools" "$YELLOW"
print_message "说明: 启动 MySQL、Redis、MinIO 以及管理工具" "$YELLOW"
echo

print_message "步骤 2: 启动前后端应用" "$BLUE"
print_message "命令: ./start-dev.sh" "$YELLOW"
print_message "说明: 在本地启动 NestJS 后端和 Vue 前端" "$YELLOW"
echo

print_message "步骤 3: 访问应用" "$BLUE"
print_message "• 前端应用: http://localhost:3000" "$YELLOW"
print_message "• 后端API: http://localhost:3001/api" "$YELLOW"
print_message "• 数据库管理: http://localhost:8080 (Adminer)" "$YELLOW"
print_message "• Redis管理: http://localhost:8081 (Redis Commander)" "$YELLOW"
print_message "• MinIO控制台: http://localhost:9001" "$YELLOW"
echo

print_header "5. 优势说明"
print_message "本地开发模式的优势：" "$GREEN"
print_message "✅ 快速启动 - 前后端直接运行，无需构建镜像" "$GREEN"
print_message "✅ 热重载 - 代码修改立即生效" "$GREEN"
print_message "✅ 调试友好 - 可直接使用IDE调试功能" "$GREEN"
print_message "✅ 资源节省 - 只有基础设施使用Docker" "$GREEN"
print_message "✅ 开发效率 - 更快的迭代周期" "$GREEN"
echo

print_header "6. 注意事项"
print_message "⚠️  确保端口不被占用 (3000, 3001, 3306, 6379, 9000, 9001, 8080, 8081)" "$YELLOW"
print_message "⚠️  首次运行需要安装依赖 (npm install)" "$YELLOW"
print_message "⚠️  基础设施服务需要Docker支持" "$YELLOW"
print_message "⚠️  在某些容器环境中Docker可能无法使用" "$YELLOW"
echo

print_header "演示完成"
print_message "🎉 本地开发环境配置演示完成！" "$GREEN"
print_message "📖 详细说明请查看: LOCAL-DEVELOPMENT.md" "$BLUE"
print_message "🚀 开始开发: ./start-infra.sh start --with-tools && ./start-dev.sh" "$GREEN"
echo