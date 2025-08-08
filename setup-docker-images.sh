#!/bin/bash

# 屏幕监控系统 Docker 镜像设置脚本
# 拉取所有必需的镜像并保存到本地文件

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

# 检查Docker是否可用
check_docker() {
    if ! command -v docker &> /dev/null; then
        print_error "Docker未安装或不可用"
        exit 1
    fi
    
    if ! docker info &> /dev/null; then
        print_error "Docker守护进程未运行"
        print_info "请先启动Docker服务"
        exit 1
    fi
}

# 定义所需的镜像列表
DOCKER_IMAGES=(
    "mysql:8.0"
    "redis:7-alpine"
    "minio/minio:latest"
    "adminer:latest"
)

# 创建镜像保存目录
IMAGES_DIR="./docker-images"
mkdir -p "$IMAGES_DIR"

print_info "=== 屏幕监控系统 Docker 镜像设置 ==="
print_info "镜像保存目录: $IMAGES_DIR"
print_info "开始时间: $(date)"

# 检查Docker
check_docker

# 拉取并保存镜像
for image in "${DOCKER_IMAGES[@]}"; do
    print_info "处理镜像: $image"
    
    # 拉取镜像
    print_info "拉取镜像 $image..."
    if docker pull "$image"; then
        print_success "镜像 $image 拉取成功"
    else
        print_error "镜像 $image 拉取失败"
        continue
    fi
    
    # 保存镜像到文件
    image_file="${IMAGES_DIR}/$(echo "$image" | tr '/' '_' | tr ':' '_').tar"
    print_info "保存镜像到 $image_file..."
    
    if docker save "$image" -o "$image_file"; then
        print_success "镜像 $image 保存成功"
        # 压缩镜像文件以节省空间
        if command -v gzip &> /dev/null; then
            print_info "压缩镜像文件..."
            gzip "$image_file"
            print_success "镜像文件已压缩: ${image_file}.gz"
        fi
    else
        print_error "镜像 $image 保存失败"
    fi
done

print_success "=== 镜像设置完成 ==="
print_info "镜像文件保存在: $IMAGES_DIR"
print_info "完成时间: $(date)"

# 显示镜像文件大小
if [ -d "$IMAGES_DIR" ]; then
    print_info "镜像文件列表:"
    ls -lh "$IMAGES_DIR"/
fi

print_info "\n使用说明:"
print_info "1. 将 $IMAGES_DIR 目录上传到 GitHub"
print_info "2. 克隆项目后，运行 load-docker-images.sh 加载镜像"
print_info "3. 运行 docker-compose -f docker-compose.simple.yml up -d 启动服务"