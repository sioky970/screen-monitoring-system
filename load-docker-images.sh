#!/bin/bash

# 屏幕监控系统 Docker 镜像加载脚本
# 从本地文件加载所有必需的镜像

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

# 镜像保存目录
IMAGES_DIR="./docker-images"

print_info "=== 屏幕监控系统 Docker 镜像加载 ==="
print_info "镜像目录: $IMAGES_DIR"
print_info "开始时间: $(date)"

# 检查Docker
check_docker

# 检查镜像目录是否存在
if [ ! -d "$IMAGES_DIR" ]; then
    print_error "镜像目录 $IMAGES_DIR 不存在"
    print_info "请先运行 setup-docker-images.sh 下载并保存镜像"
    exit 1
fi

# 加载所有镜像文件
loaded_count=0
failed_count=0

for image_file in "$IMAGES_DIR"/*.tar "$IMAGES_DIR"/*.tar.gz; do
    # 检查文件是否存在（避免通配符没有匹配到文件的情况）
    if [ ! -f "$image_file" ]; then
        continue
    fi
    
    print_info "加载镜像文件: $(basename "$image_file")"
    
    # 如果是压缩文件，先解压
    if [[ "$image_file" == *.gz ]]; then
        if command -v gunzip &> /dev/null; then
            print_info "解压镜像文件..."
            temp_file="${image_file%.gz}"
            gunzip -c "$image_file" > "$temp_file"
            image_file="$temp_file"
        else
            print_error "需要 gunzip 命令来解压文件"
            ((failed_count++))
            continue
        fi
    fi
    
    # 加载镜像
    if docker load -i "$image_file"; then
        print_success "镜像加载成功: $(basename "$image_file")"
        ((loaded_count++))
        
        # 如果是临时解压的文件，删除它
        if [[ "$image_file" == *".tar" ]] && [ -f "${image_file}.gz" ]; then
            rm -f "$image_file"
        fi
    else
        print_error "镜像加载失败: $(basename "$image_file")"
        ((failed_count++))
    fi
done

print_success "=== 镜像加载完成 ==="
print_info "成功加载: $loaded_count 个镜像"
if [ $failed_count -gt 0 ]; then
    print_warning "失败: $failed_count 个镜像"
fi
print_info "完成时间: $(date)"

# 显示已加载的镜像
print_info "\n当前Docker镜像列表:"
docker images --format "table {{.Repository}}\t{{.Tag}}\t{{.Size}}\t{{.CreatedAt}}" | head -10

print_info "\n下一步:"
print_info "运行以下命令启动服务:"
print_info "docker-compose -f docker-compose.simple.yml up -d"