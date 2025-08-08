#!/bin/bash

# Docker权限修复脚本
# 用于解决Docker权限问题和启动Docker服务

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 日志函数
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 检查是否为root用户
check_root() {
    if [[ $EUID -eq 0 ]]; then
        log_warning "检测到以root用户运行，建议使用普通用户"
        return 0
    fi
    return 1
}

# 检查Docker是否安装
check_docker_installed() {
    if ! command -v docker &> /dev/null; then
        log_error "Docker未安装，请先安装Docker"
        echo "安装命令："
        echo "  Ubuntu/Debian: curl -fsSL https://get.docker.com -o get-docker.sh && sudo sh get-docker.sh"
        echo "  CentOS/RHEL: sudo yum install docker-ce docker-ce-cli containerd.io"
        exit 1
    fi
    log_success "Docker已安装: $(docker --version)"
}

# 检查systemd是否可用
check_systemd() {
    if command -v systemctl &> /dev/null && systemctl is-system-running &> /dev/null; then
        return 0
    fi
    return 1
}

# 启动Docker服务（systemd）
start_docker_systemd() {
    log_info "使用systemd启动Docker服务..."
    
    if sudo systemctl is-active --quiet docker; then
        log_success "Docker服务已在运行"
        return 0
    fi
    
    sudo systemctl start docker
    sudo systemctl enable docker
    
    # 等待服务启动
    sleep 3
    
    if sudo systemctl is-active --quiet docker; then
        log_success "Docker服务启动成功"
        return 0
    else
        log_error "Docker服务启动失败"
        return 1
    fi
}

# 手动启动Docker守护进程
start_docker_manual() {
    log_info "手动启动Docker守护进程..."
    
    # 检查是否已有Docker进程运行
    if pgrep dockerd > /dev/null; then
        log_success "Docker守护进程已在运行"
        return 0
    fi
    
    # 创建必要的目录
    sudo mkdir -p /var/run/docker
    
    # 启动Docker守护进程
    log_info "启动Docker守护进程（后台运行）..."
    sudo dockerd --host=unix:///var/run/docker.sock > /tmp/dockerd.log 2>&1 &
    
    # 等待启动
    log_info "等待Docker守护进程启动..."
    for i in {1..30}; do
        if docker info > /dev/null 2>&1; then
            log_success "Docker守护进程启动成功"
            return 0
        fi
        sleep 1
        echo -n "."
    done
    
    echo
    log_error "Docker守护进程启动失败，请检查日志: /tmp/dockerd.log"
    return 1
}

# 配置用户权限
setup_user_permissions() {
    local current_user=$(whoami)
    
    if [[ "$current_user" == "root" ]]; then
        log_warning "当前为root用户，跳过权限配置"
        return 0
    fi
    
    log_info "配置用户Docker权限..."
    
    # 检查docker组是否存在
    if ! getent group docker > /dev/null; then
        log_info "创建docker用户组..."
        sudo groupadd docker
    fi
    
    # 将当前用户添加到docker组
    if groups $current_user | grep -q docker; then
        log_success "用户 $current_user 已在docker组中"
    else
        log_info "将用户 $current_user 添加到docker组..."
        sudo usermod -aG docker $current_user
        log_warning "权限配置完成，请注销并重新登录，或运行: newgrp docker"
    fi
}

# 测试Docker连接
test_docker_connection() {
    log_info "测试Docker连接..."
    
    if docker info > /dev/null 2>&1; then
        log_success "Docker连接正常"
        docker --version
        return 0
    else
        log_error "Docker连接失败"
        return 1
    fi
}

# 显示Docker状态
show_docker_status() {
    echo
    log_info "Docker服务状态:"
    
    if check_systemd; then
        sudo systemctl status docker --no-pager -l || true
    else
        if pgrep dockerd > /dev/null; then
            echo "Docker守护进程正在运行 (PID: $(pgrep dockerd))"
        else
            echo "Docker守护进程未运行"
        fi
    fi
    
    echo
    log_info "Docker容器状态:"
    docker ps 2>/dev/null || echo "无法获取容器状态"
}

# 主函数
main() {
    echo "=== Docker权限修复和服务启动脚本 ==="
    echo
    
    # 检查Docker安装
    check_docker_installed
    
    # 检查当前用户
    check_root
    
    # 配置用户权限
    setup_user_permissions
    
    # 启动Docker服务
    if check_systemd; then
        start_docker_systemd
    else
        log_warning "系统不支持systemd，尝试手动启动Docker"
        start_docker_manual
    fi
    
    # 测试连接
    if test_docker_connection; then
        log_success "Docker配置完成！"
        echo
        echo "现在可以运行以下命令启动服务:"
        echo "  ./start-services.sh"
        echo "  或"
        echo "  docker-compose -f docker-compose.simple.yml up -d"
    else
        log_error "Docker配置失败，请检查错误信息"
        echo
        echo "可能的解决方案:"
        echo "1. 注销并重新登录（如果刚配置了用户权限）"
        echo "2. 运行: newgrp docker"
        echo "3. 使用sudo运行Docker命令"
        echo "4. 检查Docker守护进程日志: /tmp/dockerd.log"
        echo "5. 重启系统"
    fi
    
    # 显示状态
    show_docker_status
}

# 处理命令行参数
case "${1:-}" in
    --help|-h)
        echo "Docker权限修复和服务启动脚本"
        echo
        echo "用法: $0 [选项]"
        echo
        echo "选项:"
        echo "  --help, -h     显示此帮助信息"
        echo "  --status       仅显示Docker状态"
        echo "  --test         仅测试Docker连接"
        echo "  --permissions  仅配置用户权限"
        echo
        echo "示例:"
        echo "  $0              # 完整的修复流程"
        echo "  $0 --status     # 查看Docker状态"
        echo "  $0 --test       # 测试Docker连接"
        exit 0
        ;;
    --status)
        show_docker_status
        exit 0
        ;;
    --test)
        test_docker_connection
        exit $?
        ;;
    --permissions)
        setup_user_permissions
        exit 0
        ;;
    "")
        main
        ;;
    *)
        log_error "未知选项: $1"
        echo "使用 --help 查看帮助信息"
        exit 1
        ;;
esac