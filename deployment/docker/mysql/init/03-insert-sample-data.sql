-- 屏幕监控系统 - 示例数据插入
-- 此脚本为开发和测试环境提供示例数据

USE screen_monitoring;

-- 插入示例客户端（UUID格式）
INSERT IGNORE INTO `clients` (
    `id`, `client_number`, `client_name`, `group_id`, `computer_name`, 
    `username`, `ip_address`, `mac_address`, `os_version`, `client_version`,
    `screen_resolution`, `status`, `last_heartbeat`, `first_connect`
) VALUES 
(
    '550e8400-e29b-41d4-a716-446655440001', 
    'DEV-001', 
    '开发机-张三', 
    2, 
    'DEV-ZHANGSAN-PC',
    'zhangsan',
    '192.168.1.101',
    '00:1B:44:11:3A:B7',
    'Windows 11 Pro 22H2',
    '1.0.0',
    '1920x1080',
    'online',
    NOW(),
    DATE_SUB(NOW(), INTERVAL 7 DAY)
),
(
    '550e8400-e29b-41d4-a716-446655440002',
    'DEV-002', 
    '开发机-李四', 
    2, 
    'DEV-LISI-PC',
    'lisi',
    '192.168.1.102',
    '00:1B:44:11:3A:B8',
    'Windows 10 Pro 21H2',
    '1.0.0',
    '1920x1080',
    'offline',
    DATE_SUB(NOW(), INTERVAL 30 MINUTE),
    DATE_SUB(NOW(), INTERVAL 5 DAY)
),
(
    '550e8400-e29b-41d4-a716-446655440003',
    'FIN-001', 
    '财务机-王五', 
    3, 
    'FIN-WANGWU-PC',
    'wangwu',
    '192.168.1.201',
    '00:1B:44:11:3A:B9',
    'Windows 11 Pro 22H2',
    '1.0.0',
    '1366x768',
    'online',
    DATE_SUB(NOW(), INTERVAL 5 MINUTE),
    DATE_SUB(NOW(), INTERVAL 3 DAY)
),
(
    '550e8400-e29b-41d4-a716-446655440004',
    'MGT-001', 
    '管理机-赵六', 
    4, 
    'MGT-ZHAOLIU-PC',
    'zhaoliu',
    '192.168.1.301',
    '00:1B:44:11:3A:C0',
    'Windows 11 Enterprise 22H2',
    '1.0.0',
    '2560x1440',
    'online',
    DATE_SUB(NOW(), INTERVAL 1 MINUTE),
    DATE_SUB(NOW(), INTERVAL 1 DAY)
);

-- 插入示例区块链地址白名单
INSERT IGNORE INTO `blockchain_whitelist` (
    `address`, `address_hash`, `address_type`, `label`, `category`, `created_by`, `approved_by`, `approved_at`
) VALUES 
(
    '1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa',
    SHA2('1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa', 256),
    'BTC',
    '公司冷钱包-BTC',
    '公司钱包',
    1,
    1,
    NOW()
),
(
    '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045',
    SHA2('0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045', 256),
    'ETH',
    '公司热钱包-ETH',
    '公司钱包',
    1,
    1,
    NOW()
),
(
    'TQn9Y2khEsLJW1ChVWFMSMeRDow5KcbLSE',
    SHA2('TQn9Y2khEsLJW1ChVWFMSMeRDow5KcbLSE', 256),
    'TRC20',
    '合作伙伴钱包-USDT',
    '合作伙伴',
    1,
    1,
    NOW()
);

-- 插入示例安全告警截图记录
INSERT IGNORE INTO `security_screenshots` (
    `client_id`, `alert_id`, `screenshot_time`, `minio_bucket`, `minio_object_key`,
    `file_url`, `file_size`, `file_hash`, `detected_address`, `address_type`,
    `clipboard_content`, `risk_level`, `is_reviewed`, `alert_status`
) VALUES 
(
    '550e8400-e29b-41d4-a716-446655440001',
    CONCAT('ALERT_', UNIX_TIMESTAMP(), '_001'),
    DATE_SUB(NOW(), INTERVAL 2 HOUR),
    'monitoring-screenshots',
    CONCAT('security/', DATE_FORMAT(NOW(), '%Y/%m/%d'), '/alert_001.jpg'),
    'http://minio:9000/monitoring-screenshots/security/alert_001.jpg',
    1024768,
    SHA2('sample_screenshot_001', 256),
    '1BvBMSEYstWetqTFn5Au4m4GFg7xJaNVN2',
    'BTC',
    '复制这个地址：1BvBMSEYstWetqTFn5Au4m4GFg7xJaNVN2 到你的钱包',
    'HIGH',
    0,
    'pending'
),
(
    '550e8400-e29b-41d4-a716-446655440003',
    CONCAT('ALERT_', UNIX_TIMESTAMP(), '_002'),
    DATE_SUB(NOW(), INTERVAL 4 HOUR),
    'monitoring-screenshots',
    CONCAT('security/', DATE_FORMAT(NOW(), '%Y/%m/%d'), '/alert_002.jpg'),
    'http://minio:9000/monitoring-screenshots/security/alert_002.jpg',
    987654,
    SHA2('sample_screenshot_002', 256),
    '0x742149e8C4D8C8c394aF9C3d8c47d0b1A0F9F4B2',
    'ETH',
    'Transfer to: 0x742149e8C4D8C8c394aF9C3d8c47d0b1A0F9F4B2',
    'CRITICAL',
    1,
    'confirmed'
);

-- 插入示例在线时长记录
INSERT IGNORE INTO `client_online_logs` (
    `client_id`, `online_time`, `offline_time`, `duration`, `ip_address`
) VALUES 
(
    '550e8400-e29b-41d4-a716-446655440001',
    DATE_SUB(NOW(), INTERVAL 8 HOUR),
    DATE_SUB(NOW(), INTERVAL 4 HOUR),
    14400, -- 4小时
    '192.168.1.101'
),
(
    '550e8400-e29b-41d4-a716-446655440001',
    DATE_SUB(NOW(), INTERVAL 3 HOUR),
    NULL, -- 当前在线
    NULL,
    '192.168.1.101'
),
(
    '550e8400-e29b-41d4-a716-446655440002',
    DATE_SUB(NOW(), INTERVAL 6 HOUR),
    DATE_SUB(NOW(), INTERVAL 2 HOUR),
    14400, -- 4小时
    '192.168.1.102'
);

-- 插入示例系统日志
INSERT IGNORE INTO `system_logs` (
    `user_id`, `client_id`, `action`, `target_type`, `target_id`, 
    `description`, `ip_address`, `user_agent`
) VALUES 
(
    1,
    '550e8400-e29b-41d4-a716-446655440001',
    'client_connect',
    'client',
    '550e8400-e29b-41d4-a716-446655440001',
    '客户端连接成功',
    '192.168.1.101',
    'ScreenMonitorClient/1.0.0'
),
(
    1,
    NULL,
    'whitelist_add',
    'blockchain_whitelist',
    '1',
    '添加BTC地址到白名单',
    '192.168.1.100',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
),
(
    1,
    '550e8400-e29b-41d4-a716-446655440003',
    'security_alert',
    'security_screenshot',
    '2',
    '检测到高风险区块链地址',
    '192.168.1.201',
    'ScreenMonitorClient/1.0.0'
);

-- 插入示例通知
INSERT IGNORE INTO `notifications` (
    `user_id`, `title`, `content`, `type`, `category`, `related_type`, `related_id`
) VALUES 
(
    1,
    '新的安全告警',
    '检测到客户端 DEV-001 存在可疑的区块链地址访问行为',
    'warning',
    'security',
    'security_screenshot',
    '1'
),
(
    NULL, -- 系统通知
    '系统维护通知',
    '系统将在今晚23:00-01:00进行维护升级',
    'info',
    'system',
    NULL,
    NULL
);

-- 更新客户端总在线时长（调用存储过程）
CALL UpdateClientOnlineTime('550e8400-e29b-41d4-a716-446655440001');
CALL UpdateClientOnlineTime('550e8400-e29b-41d4-a716-446655440002');

-- 插入用户权限示例数据
INSERT IGNORE INTO `system_users` (
    `username`, `password`, `real_name`, `email`, `role`, `permissions`
) VALUES 
(
    'operator',
    '$2b$10$8K1p/a0dEJGGBM6I8NOz/eBu8R/SCKI4sVJh.3k.w2ZEo2B8JQC0e', -- 密码: operator123
    '系统操作员',
    'operator@example.com',
    'operator',
    JSON_OBJECT(
        'clients', JSON_ARRAY('view', 'manage'),
        'security', JSON_ARRAY('view', 'review'),
        'whitelist', JSON_ARRAY('view', 'create'),
        'reports', JSON_ARRAY('view', 'export')
    )
),
(
    'viewer',
    '$2b$10$8K1p/a0dEJGGBM6I8NOz/eBu8R/SCKI4sVJh.3k.w2ZEo2B8JQC0e', -- 密码: viewer123
    '系统查看员',
    'viewer@example.com',
    'viewer',
    JSON_OBJECT(
        'clients', JSON_ARRAY('view'),
        'security', JSON_ARRAY('view'),
        'reports', JSON_ARRAY('view')
    )
);

-- 显示数据统计信息
SELECT '=== 数据库初始化完成 ===' as message;
SELECT 
    '客户端分组' as table_name, 
    COUNT(*) as record_count 
FROM client_groups
UNION ALL
SELECT '客户端', COUNT(*) FROM clients
UNION ALL  
SELECT '系统用户', COUNT(*) FROM system_users
UNION ALL
SELECT '白名单地址', COUNT(*) FROM blockchain_whitelist
UNION ALL
SELECT '安全告警', COUNT(*) FROM security_screenshots
UNION ALL
SELECT '在线记录', COUNT(*) FROM client_online_logs
UNION ALL
SELECT '系统日志', COUNT(*) FROM system_logs
UNION ALL
SELECT '通知消息', COUNT(*) FROM notifications
UNION ALL
SELECT '系统配置', COUNT(*) FROM system_config;