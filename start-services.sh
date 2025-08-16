#!/bin/bash

# 屏幕监控系统一键启动脚本
# 自动检测环境并启动所有必需的服务

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

print_info() { print_message "[INFO] $1" "$BLUE"; }
print_success() { print_message "[SUCCESS] $1" "$GREEN"; }
print_warning() { print_message "[WARNING] $1" "$YELLOW"; }
print_error() { print_message "[ERROR] $1" "$RED"; }

# 显示帮助信息
show_help() {
    echo "屏幕监控系统一键启动脚本"
    echo ""
    echo "用法: $0 [选项]"
    echo ""
    echo "选项:"
    echo "  -h, --help     显示此帮助信息"
    echo "  -s, --setup    首次设置（下载镜像）"
    echo "  -l, --load     加载本地镜像"
    echo "  -d, --down     停止所有服务"
    echo "  -r, --restart  重启所有服务"
    echo "  --logs         查看服务日志"
    echo "  --status       查看服务状态"
    echo ""
    echo "示例:"
    echo "  $0              # 启动服务（自动检测环境）"
    echo "  $0 --setup     # 首次设置并启动"
    echo "  $0 --load      # 加载本地镜像并启动"
    echo "  $0 --down      # 停止所有服务"
}

# 检查Docker是否可用
check_docker() {
    if ! command -v docker &> /dev/null; then
        print_error "Docker未安装或不可用"
        print_info "请先安装Docker: https://docs.docker.com/get-docker/"
        exit 1
    fi
    
    if ! docker info &> /dev/null; then
        print_error "Docker守护进程未运行"
        print_info "请先启动Docker服务"
        print_info "Ubuntu/Debian: sudo systemctl start docker"
        print_info "macOS/Windows: 启动 Docker Desktop"
        exit 1
    fi
    
    if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
        print_error "Docker Compose未安装或不可用"
        print_info "请安装Docker Compose"
        exit 1
    fi
}

# 检查端口是否被占用
check_ports() {
    local ports=("33066" "36379" "39000" "39001" "38080")
    local occupied_ports=()
    
    for port in "${ports[@]}"; do
        if netstat -tuln 2>/dev/null | grep -q ":$port " || ss -tuln 2>/dev/null | grep -q ":$port "; then
            occupied_ports+=("$port")
        fi
    done
    
    if [ ${#occupied_ports[@]} -gt 0 ]; then
        print_warning "以下端口已被占用: ${occupied_ports[*]}"
        print_info "请检查是否有其他服务在使用这些端口，或修改 .env 文件中的端口配置"
        read -p "是否继续启动？(y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            exit 1
        fi
    fi
}

# 设置环境变量文件
setup_env() {
    if [ ! -f ".env" ]; then
        if [ -f ".env.example" ]; then
            print_info "创建环境变量文件..."
            cp .env.example .env
            print_success "已创建 .env 文件，请根据需要修改配置"
        else
            print_warning "未找到 .env.example 文件"
        fi
    fi
}

# 启动服务
start_services() {
    local compose_file="docker-compose.simple.yml"
    
    if [ ! -f "$compose_file" ]; then
        print_error "未找到 $compose_file 文件"
        exit 1
    fi
    
    print_info "启动基础设施服务..."
    
    # 使用 docker-compose 或 docker compose
    if command -v docker-compose &> /dev/null; then
        docker-compose -f "$compose_file" up -d
    else
        docker compose -f "$compose_file" up -d
    fi
    
    print_success "服务启动完成！"
    
    # 等待服务启动
    print_info "等待服务启动..."
    sleep 10
    
    # 显示服务状态
    show_status
}

# 停止服务
stop_services() {
    local compose_file="docker-compose.simple.yml"
    
    print_info "停止所有服务..."
    
    if command -v docker-compose &> /dev/null; then
        docker-compose -f "$compose_file" down
    else
        docker compose -f "$compose_file" down
    fi
    
    print_success "所有服务已停止"
}

# 重启服务
restart_services() {
    print_info "重启所有服务..."
    stop_services
    sleep 3
    start_services
}

# 显示服务状态
show_status() {
    local compose_file="docker-compose.simple.yml"
    
    print_info "服务状态:"
    
    if command -v docker-compose &> /dev/null; then
        docker-compose -f "$compose_file" ps
    else
        docker compose -f "$compose_file" ps
    fi
    
    print_info "\n服务访问地址:"
    print_info "📊 数据库管理 (Adminer): http://localhost:38080"
    print_info "🗄️ MinIO 控制台: http://localhost:39001"
    print_info "💾 MySQL: localhost:33066"
    print_info "🔄 Redis: localhost:36379"
    print_info "📦 MinIO API: localhost:39000"
}

# 显示日志
show_logs() {
    local compose_file="docker-compose.simple.yml"
    
    if command -v docker-compose &> /dev/null; then
        docker-compose -f "$compose_file" logs -f
    else
        docker compose -f "$compose_file" logs -f
    fi
}

# 主函数
main() {
    print_info "=== 屏幕监控系统服务管理 ==="
    print_info "开始时间: $(date)"
    
    # 检查Docker环境
    check_docker
    
    # 设置环境变量
    setup_env
    
    # 根据参数执行相应操作
    case "${1:-}" in
        -h|--help)
            show_help
            exit 0
            ;;
        -s|--setup)
            print_info "首次设置模式"
            if [ -x "./setup-docker-images.sh" ]; then
                ./setup-docker-images.sh
            else
                print_warning "setup-docker-images.sh 不存在或不可执行"
            fi
            check_ports
            start_services
            ;;
        -l|--load)
            print_info "加载本地镜像模式"
            if [ -x "./load-docker-images.sh" ]; then
                ./load-docker-images.sh
            else
                print_warning "load-docker-images.sh 不存在或不可执行"
            fi
            check_ports
            start_services
            ;;
        -d|--down)
            stop_services
            exit 0
            ;;
        -r|--restart)
            restart_services
            exit 0
            ;;
        --logs)
            show_logs
            exit 0
            ;;
        --status)
            show_status
            exit 0
            ;;
        "")
            # 默认启动模式
            print_info "自动启动模式"
            
            # 检查是否有本地镜像文件
            if [ -d "docker-images" ] && [ "$(ls -A docker-images 2>/dev/null)" ]; then
                print_info "发现本地镜像文件，使用离线模式"
                if [ -x "./load-docker-images.sh" ]; then
                    ./load-docker-images.sh
                fi
            else
                print_info "使用在线模式（需要网络连接）"
            fi
            
            check_ports
            start_services
            ;;
        *)
            print_error "未知选项: $1"
            show_help
            exit 1
            ;;
    esac
    
    print_success "=== 操作完成 ==="
    print_info "完成时间: $(date)"
}

# 执行主函数
main "$@"