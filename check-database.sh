#!/bin/bash

# 数据库状态检查脚本
# 检查MySQL数据库是否正确初始化

set -e

# 颜色输出
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

print_info() { echo -e "${BLUE}[INFO] $1${NC}"; }
print_success() { echo -e "${GREEN}[SUCCESS] $1${NC}"; }
print_warning() { echo -e "${YELLOW}[WARNING] $1${NC}"; }
print_error() { echo -e "${RED}[ERROR] $1${NC}"; }

# 检查Docker容器状态
print_info "检查MySQL容器状态..."
if docker ps | grep -q "screen-monitor-mysql"; then
    print_success "MySQL容器正在运行"
else
    print_error "MySQL容器未运行，请先启动：./start-unified.sh dev"
    exit 1
fi

# 等待MySQL完全启动
print_info "等待MySQL完全启动..."
for i in {1..30}; do
    if docker-compose -f docker-compose.unified.yml exec -T mysql mysqladmin ping -h localhost -u root -pdev_root_123 --silent; then
        print_success "MySQL服务已就绪"
        break
    fi
    if [ $i -eq 30 ]; then
        print_error "MySQL服务启动超时"
        exit 1
    fi
    echo -n "."
    sleep 2
done

echo ""

# 检查数据库和表结构
print_info "检查数据库结构..."

# 执行SQL检查脚本
docker-compose -f docker-compose.unified.yml exec -T mysql mysql -u dev_user -pdev_pass_123 -D screen_monitoring_dev <<'EOF'
-- 检查数据库版本和字符集
SELECT 
    VERSION() as mysql_version,
    DEFAULT_CHARACTER_SET_NAME as charset,
    DEFAULT_COLLATION_NAME as collation
FROM information_schema.SCHEMATA 
WHERE SCHEMA_NAME = 'screen_monitoring_dev';

-- 检查表结构
SELECT '=== 数据库表统计 ===' as info;
SELECT 
    TABLE_NAME as table_name,
    TABLE_ROWS as estimated_rows,
    ROUND((DATA_LENGTH + INDEX_LENGTH) / 1024 / 1024, 2) as size_mb
FROM information_schema.TABLES 
WHERE TABLE_SCHEMA = 'screen_monitoring_dev'
ORDER BY TABLE_NAME;

-- 检查数据记录数量
SELECT '=== 数据记录统计 ===' as info;
SELECT 'client_groups' as table_name, COUNT(*) as record_count FROM client_groups
UNION ALL
SELECT 'clients', COUNT(*) FROM clients
UNION ALL  
SELECT 'system_users', COUNT(*) FROM system_users
UNION ALL
SELECT 'blockchain_whitelist', COUNT(*) FROM blockchain_whitelist
UNION ALL
SELECT 'security_screenshots', COUNT(*) FROM security_screenshots
UNION ALL
SELECT 'system_config', COUNT(*) FROM system_config
UNION ALL
SELECT 'notifications', COUNT(*) FROM notifications;

-- 检查索引
SELECT '=== 重要索引检查 ===' as info;
SELECT 
    TABLE_NAME,
    INDEX_NAME,
    COLUMN_NAME,
    NON_UNIQUE
FROM information_schema.STATISTICS 
WHERE TABLE_SCHEMA = 'screen_monitoring_dev'
AND INDEX_NAME IN ('idx_client_number', 'idx_address_hash', 'idx_username')
ORDER BY TABLE_NAME, INDEX_NAME;

-- 检查视图
SELECT '=== 视图检查 ===' as info;
SELECT TABLE_NAME as view_name 
FROM information_schema.VIEWS 
WHERE TABLE_SCHEMA = 'screen_monitoring_dev';

-- 检查存储过程
SELECT '=== 存储过程检查 ===' as info;
SELECT ROUTINE_NAME as procedure_name, ROUTINE_TYPE 
FROM information_schema.ROUTINES 
WHERE ROUTINE_SCHEMA = 'screen_monitoring_dev';

-- 测试示例查询
SELECT '=== 功能测试 ===' as info;
SELECT 
    cg.name as group_name,
    COUNT(c.id) as client_count,
    SUM(CASE WHEN c.status = 'online' THEN 1 ELSE 0 END) as online_count
FROM client_groups cg
LEFT JOIN clients c ON cg.id = c.group_id 
GROUP BY cg.id, cg.name;
EOF

if [ $? -eq 0 ]; then
    print_success "数据库结构检查完成"
else
    print_error "数据库结构检查失败"
    exit 1
fi

# 检查生产数据库（如果存在）
print_info "检查生产数据库..."
if docker-compose -f docker-compose.unified.yml exec -T mysql mysql -u root -pdev_root_123 -e "USE screen_monitoring;" 2>/dev/null; then
    print_success "生产数据库 screen_monitoring 存在"
    
    docker-compose -f docker-compose.unified.yml exec -T mysql mysql -u root -pdev_root_123 -D screen_monitoring <<'EOF'
SELECT '=== 生产数据库统计 ===' as info;
SELECT 'client_groups' as table_name, COUNT(*) as record_count FROM client_groups
UNION ALL
SELECT 'clients', COUNT(*) FROM clients
UNION ALL  
SELECT 'system_users', COUNT(*) FROM system_users
UNION ALL
SELECT 'blockchain_whitelist', COUNT(*) FROM blockchain_whitelist
UNION ALL
SELECT 'security_screenshots', COUNT(*) FROM security_screenshots;
EOF
else
    print_warning "生产数据库 screen_monitoring 不存在（正常，仅在生产环境中创建）"
fi

print_success "✅ 数据库检查完成！"
print_info "数据库访问信息："
echo "  🔗 主机: localhost:33066"
echo "  📊 开发数据库: screen_monitoring_dev"
echo "  👤 用户名: dev_user"
echo "  🔑 密码: dev_pass_123"
echo "  🌐 Adminer: http://localhost:38080"