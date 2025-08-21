#!/bin/bash

# 屏幕监控系统 Docker 启动脚本
# 使用方法：
#   ./start-docker.sh          # 启动生产环境
#   ./start-docker.sh dev      # 启动开发环境
#   ./start-docker.sh infra    # 仅启动基础设施
#   ./start-docker.sh tools    # 启动生产环境+开发工具

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
    echo "    屏幕监控系统 Docker 部署脚本"
    echo "=================================================="
    echo -e "${NC}"
}

# 检查依赖
check_dependencies() {
    print_message "检查系统依赖..."
    
    if ! command -v docker &> /dev/null; then
        print_error "Docker 未安装，请先安装 Docker"
        exit 1
    fi
    
    if ! command -v docker-compose &> /dev/null; then
        print_error "Docker Compose 未安装，请先安装 Docker Compose"
        exit 1
    fi
    
    print_message "依赖检查通过 ✓"
}

# 检查环境变量文件
check_env_file() {
    print_message "检查环境配置..."
    
    if [ ! -f ".env" ]; then
        print_warning ".env 文件不存在，从模板创建..."
        if [ -f ".env.example" ]; then
            cp .env.example .env
            print_message "已创建 .env 文件，请根据需要修改配置"
        else
            print_error ".env.example 文件不存在"
            exit 1
        fi
    fi
    
    print_message "环境配置检查通过 ✓"
}

# 构建自定义镜像
build_custom_images() {
    print_message "构建自定义 MySQL 镜像..."
    
    if [ -f "build-mysql-image.sh" ]; then
        chmod +x build-mysql-image.sh
        ./build-mysql-image.sh
    else
        print_warning "build-mysql-image.sh 不存在，跳过自定义 MySQL 镜像构建"
    fi
}

# 启动服务
start_services() {
    local profile=${1:-prod}
    
    print_message "启动服务配置: $profile"
    
    # 设置环境变量
    export COMPOSE_PROFILES=$profile
    
    # 启动服务
    print_message "正在启动 Docker 服务..."
    docker-compose -f docker-compose.unified.yml up -d
    
    # 等待服务启动
    print_message "等待服务启动..."
    sleep 10
    
    # 检查服务状态
    print_message "检查服务状态..."
    docker-compose -f docker-compose.unified.yml ps
}

# 显示访问信息
show_access_info() {
    local profile=${1:-prod}
    
    echo -e "${GREEN}"
    echo "=================================================="
    echo "    服务启动完成！"
    echo "=================================================="
    echo -e "${NC}"
    
    echo "📋 服务访问地址："
    echo ""
    
    # 基础设施服务
    echo "🗄️  基础设施服务："
    echo "   MySQL:     localhost:47821"
    echo "   Redis:     localhost:47822"
    echo "   MinIO API: http://localhost:47823"
    echo "   MinIO UI:  http://localhost:47824"
    echo ""
    
    # 应用服务
    if [[ "$profile" == *"dev"* ]]; then
        echo "🚀 开发环境："
        echo "   前端:      http://localhost:47827"
        echo "   后端:      http://localhost:47828"
        echo "   API文档:   http://localhost:47828/api/docs"
    fi
    
    if [[ "$profile" == *"prod"* ]]; then
        echo "🏭 生产环境："
        echo "   前端:      http://localhost:47830"
        echo "   后端:      http://localhost:47831"
        echo "   API文档:   http://localhost:47831/api/docs"
    fi
    
    # 开发工具
    if [[ "$profile" == *"tools"* ]]; then
        echo ""
        echo "🛠️  开发工具："
        echo "   Adminer:   http://localhost:47825"
        echo "   Redis UI:  http://localhost:47826"
    fi
    
    echo ""
    echo "📊 默认登录信息："
    echo "   用户名: admin"
    echo "   密码:   admin123"
    echo ""
    echo "🔧 管理命令："
    echo "   查看状态: docker-compose -f docker-compose.unified.yml ps"
    echo "   查看日志: docker-compose -f docker-compose.unified.yml logs -f"
    echo "   停止服务: docker-compose -f docker-compose.unified.yml down"
    echo ""
}

# 主函数
main() {
    print_header
    
    # 解析参数
    local profile="prod"
    case "${1:-}" in
        "dev")
            profile="dev"
            ;;
        "infra")
            profile="infra"
            ;;
        "tools")
            profile="prod,tools"
            ;;
        "dev-tools")
            profile="dev,tools"
            ;;
        "prod"|"")
            profile="prod"
            ;;
        *)
            print_error "未知的配置: $1"
            echo "使用方法: $0 [dev|prod|infra|tools|dev-tools]"
            exit 1
            ;;
    esac
    
    # 执行部署步骤
    check_dependencies
    check_env_file
    build_custom_images
    start_services "$profile"
    show_access_info "$profile"
    
    print_message "部署完成！🎉"
}

# 执行主函数
main "$@"
