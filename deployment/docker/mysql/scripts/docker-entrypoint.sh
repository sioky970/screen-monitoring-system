#!/bin/bash
# 自定义Docker入口点脚本
# 在MySQL启动前进行必要的准备工作

set -e

echo "=== 屏幕监控系统 MySQL 容器启动 ==="
echo "镜像版本: 1.0.0"
echo "MySQL版本: $(mysql --version)"
echo "当前时间: $(date)"

# 检查数据目录是否为空（首次启动）
if [ -z "$(ls -A /var/lib/mysql 2>/dev/null)" ]; then
    echo "检测到首次启动，数据库将使用预构建的结构"
    export MYSQL_INIT_CONNECT='SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci'
else
    echo "检测到已存在的数据库，跳过初始化"
fi

# 设置MySQL配置
echo "应用MySQL配置..."

# 确保配置文件存在且权限正确
if [ -d "/etc/mysql/conf.d" ]; then
    echo "MySQL配置目录已就绪"
else
    echo "创建MySQL配置目录"
    mkdir -p /etc/mysql/conf.d
fi

# 显示当前配置
echo "=== 当前环境变量 ==="
echo "MYSQL_ROOT_PASSWORD: [已设置]"
echo "MYSQL_DATABASE: ${MYSQL_DATABASE:-screen_monitoring}"
echo "MYSQL_USER: ${MYSQL_USER:-monitor_user}"
echo "MYSQL_PASSWORD: [已设置]"

# 调用原始的MySQL入口点
echo "=== 启动MySQL服务 ==="
exec docker-entrypoint.sh "$@"