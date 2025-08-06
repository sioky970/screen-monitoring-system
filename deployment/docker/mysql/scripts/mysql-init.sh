#!/bin/bash
# MySQL初始化脚本 - 在容器构建时预创建数据库结构

set -e

echo "=== MySQL数据库结构预初始化 ==="

# 等待MySQL服务启动
until mysqladmin ping -h localhost -u root -p${MYSQL_ROOT_PASSWORD:-rootPassword123} --silent; do
    echo "等待MySQL服务启动..."
    sleep 2
done

echo "MySQL服务已启动，开始初始化数据库结构..."

# 执行初始化SQL脚本
for sql_file in /docker-entrypoint-initdb.d/*.sql; do
    if [ -f "$sql_file" ]; then
        echo "执行SQL脚本: $(basename $sql_file)"
        mysql -u root -p${MYSQL_ROOT_PASSWORD:-rootPassword123} < "$sql_file"
    fi
done

echo "=== 数据库结构初始化完成 ==="

# 显示数据库统计信息
mysql -u root -p${MYSQL_ROOT_PASSWORD:-rootPassword123} <<EOF
SELECT '=== 数据库统计信息 ===' as info;
SELECT 
    SCHEMA_NAME as database_name,
    DEFAULT_CHARACTER_SET_NAME as charset,
    DEFAULT_COLLATION_NAME as collation
FROM information_schema.SCHEMATA 
WHERE SCHEMA_NAME IN ('screen_monitoring', 'screen_monitoring_dev');

SELECT 
    TABLE_SCHEMA as database_name,
    COUNT(*) as table_count
FROM information_schema.TABLES 
WHERE TABLE_SCHEMA IN ('screen_monitoring', 'screen_monitoring_dev')
GROUP BY TABLE_SCHEMA;
EOF