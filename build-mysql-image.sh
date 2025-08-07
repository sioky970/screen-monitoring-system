#!/bin/bash

# 屏幕监控系统 MySQL 镜像构建脚本
# 构建包含完整数据库结构的自定义MySQL镜像

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

# 镜像配置
IMAGE_NAME="screen-monitor-mysql"
IMAGE_TAG="1.0.0"
FULL_IMAGE_NAME="${IMAGE_NAME}:${TAG:-${IMAGE_TAG}}"

print_info "=== 屏幕监控系统 MySQL 镜像构建 ==="
print_info "镜像名称: ${FULL_IMAGE_NAME}"
print_info "构建时间: $(date)"

# 检查Docker是否可用
if ! command -v docker &> /dev/null; then
    print_error "Docker未安装或不可用"
    exit 1
fi

# 切换到项目根目录
cd "$(dirname "$0")"

# 检查必要文件
print_info "检查构建文件..."
required_files=(
    "deployment/docker/mysql/Dockerfile"
    "deployment/docker/mysql/init/01-create-database.sql"
    "deployment/docker/mysql/init/02-create-indexes-and-procedures.sql"
    "deployment/docker/mysql/init/03-insert-sample-data.sql"
    "deployment/docker/mysql/dev-init/01-dev-database.sql"
    "deployment/docker/mysql/conf/my.cnf"
)

for file in "${required_files[@]}"; do
    if [ ! -f "$file" ]; then
        print_error "必需文件不存在: $file"
        exit 1
    fi
done

print_success "所有必需文件检查通过"

# 显示构建信息
print_info "构建配置:"
echo "  📦 基础镜像: mysql:8.0"
echo "  🗄️ 生产数据库: screen_monitoring"
echo "  🔧 开发数据库: screen_monitoring_dev"
echo "  📊 预装表数量: 7个核心表 + 视图 + 存储过程"
echo "  👥 预设用户: 4个不同角色账户"
echo ""

# 开始构建
print_info "开始构建Docker镜像..."
echo "构建命令: docker build -f deployment/docker/mysql/Dockerfile -t ${FULL_IMAGE_NAME} deployment/docker/mysql/"

if sudo docker build \
    -f deployment/docker/mysql/Dockerfile \
    -t "${FULL_IMAGE_NAME}" \
    --build-arg BUILD_DATE="$(date -u +'%Y-%m-%dT%H:%M:%SZ')" \
    --build-arg VCS_REF="$(git rev-parse --short HEAD 2>/dev/null || echo 'unknown')" \
    deployment/docker/mysql/; then
    
    print_success "镜像构建成功！"
else
    print_error "镜像构建失败"
    exit 1
fi

# 显示镜像信息
print_info "镜像信息:"
sudo docker images "${IMAGE_NAME}" --format "table {{.Repository}}\t{{.Tag}}\t{{.ID}}\t{{.CreatedAt}}\t{{.Size}}"

# 测试镜像
print_info "测试镜像..."
if sudo docker run --rm "${FULL_IMAGE_NAME}" /usr/local/bin/prebuild-info.sh; then
    print_success "镜像测试通过"
else
    print_warning "镜像测试失败，但构建已完成"
fi

# 提供使用说明
print_success "=== 构建完成 ==="
echo ""
print_info "使用方法:"
echo "  1. 更新docker-compose.unified.yml使用新镜像:"
echo "     image: ${FULL_IMAGE_NAME}"
echo ""
echo "  2. 启动系统:"
echo "     ./start-unified.sh dev"
echo ""
echo "  3. 检查数据库:"
echo "     ./check-database.sh"
echo ""

print_info "镜像特性:"
echo "  ✅ 预装完整数据库结构"
echo "  ✅ 包含示例数据和测试用户"
echo "  ✅ 开发和生产环境数据库"
echo "  ✅ 性能优化索引和视图"
echo "  ✅ 存储过程和触发器"
echo "  ✅ 健康检查和监控"
echo ""

# 可选：推送到镜像仓库
read -p "是否要将镜像标记为latest? (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    print_info "标记为latest版本..."
    sudo docker tag "${FULL_IMAGE_NAME}" "${IMAGE_NAME}:latest"
    print_success "已标记为 ${IMAGE_NAME}:latest"
fi

print_success "🎉 MySQL镜像构建完成！"