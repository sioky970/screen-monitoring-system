-- 开发环境数据库初始化脚本
-- 此脚本仅在开发环境中执行，包含测试数据

-- 设置字符集和排序规则
SET NAMES utf8mb4;
SET character_set_client = utf8mb4;

-- 创建开发数据库（如果不存在）
CREATE DATABASE IF NOT EXISTS screen_monitoring_dev 
CHARACTER SET utf8mb4 
COLLATE utf8mb4_unicode_ci;

-- 使用开发数据库
USE screen_monitoring_dev;

-- 包含基本表结构（复制主要表结构）
-- 1. 客户端分组表
CREATE TABLE IF NOT EXISTS `client_groups` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `name` VARCHAR(100) NOT NULL UNIQUE COMMENT '分组名称',
    `description` TEXT COMMENT '分组描述',
    `color` VARCHAR(7) DEFAULT '#1890ff' COMMENT '分组颜色（十六进制）',
    `sort_order` INT DEFAULT 0 COMMENT '排序序号',
    `is_active` TINYINT(1) DEFAULT 1 COMMENT '是否激活',
    `created_by` INT COMMENT '创建人用户ID',
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX `idx_active_sort` (`is_active`, `sort_order`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='客户端分组表';

-- 2. 客户端信息表
CREATE TABLE IF NOT EXISTS `clients` (
    `id` CHAR(36) PRIMARY KEY COMMENT '客户端UUID',
    `client_number` VARCHAR(50) NOT NULL UNIQUE COMMENT '客户端编号（用户输入）',
    `client_name` VARCHAR(255) NOT NULL COMMENT '客户端名称',
    `group_id` INT NOT NULL COMMENT '所属分组ID',
    `computer_name` VARCHAR(255) COMMENT '计算机名称',
    `username` VARCHAR(255) COMMENT '登录用户名',
    `ip_address` VARCHAR(45) COMMENT 'IP地址（支持IPv6）',
    `mac_address` VARCHAR(17) COMMENT 'MAC地址',
    `os_version` VARCHAR(255) COMMENT '操作系统版本',
    `client_version` VARCHAR(50) COMMENT '客户端程序版本',
    `screen_resolution` VARCHAR(20) COMMENT '屏幕分辨率',
    `status` ENUM('online', 'offline', 'error', 'installing') DEFAULT 'offline' COMMENT '状态',
    `last_heartbeat` TIMESTAMP NULL COMMENT '最后心跳时间',
    `first_connect` TIMESTAMP NULL COMMENT '首次连接时间',
    `total_online_time` BIGINT DEFAULT 0 COMMENT '总在线时长（秒）',
    `settings` JSON COMMENT '客户端配置（JSON格式）',
    `is_active` TINYINT(1) DEFAULT 1 COMMENT '是否激活',
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (`group_id`) REFERENCES `client_groups`(`id`) ON UPDATE CASCADE ON DELETE RESTRICT,
    INDEX `idx_group_status` (`group_id`, `status`),
    INDEX `idx_status_heartbeat` (`status`, `last_heartbeat`),
    INDEX `idx_client_number` (`client_number`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='客户端信息表';

-- 3. 安全告警截图表
CREATE TABLE IF NOT EXISTS `security_screenshots` (
    `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
    `client_id` CHAR(36) NOT NULL COMMENT '客户端ID',
    `alert_id` VARCHAR(64) NOT NULL UNIQUE COMMENT '告警唯一ID',
    `screenshot_time` TIMESTAMP NOT NULL COMMENT '截图时间',
    `minio_bucket` VARCHAR(100) NOT NULL COMMENT 'MinIO Bucket名称',
    `minio_object_key` VARCHAR(500) NOT NULL COMMENT 'MinIO对象KEY',
    `file_url` VARCHAR(1000) COMMENT '文件访问URL',
    `cdn_url` VARCHAR(1000) COMMENT 'CDN加速URL',
    `file_size` INT COMMENT '文件大小（字节）',
    `file_hash` VARCHAR(64) COMMENT '文件SHA256哈希值',
    `detected_address` TEXT NOT NULL COMMENT '检测到的区块链地址',
    `address_type` VARCHAR(20) NOT NULL COMMENT '地址类型（BTC/ETH/TRC20等）',
    `clipboard_content` TEXT NOT NULL COMMENT '完整剪切板内容',
    `risk_level` ENUM('LOW', 'MEDIUM', 'HIGH', 'CRITICAL') DEFAULT 'HIGH' COMMENT '风险等级',
    `is_reviewed` TINYINT(1) DEFAULT 0 COMMENT '是否已处理',
    `reviewed_by` INT NULL COMMENT '处理人用户ID',
    `reviewed_at` TIMESTAMP NULL COMMENT '处理时间',
    `review_note` TEXT COMMENT '处理备注',
    `alert_status` ENUM('pending', 'confirmed', 'false_positive', 'ignored') DEFAULT 'pending' COMMENT '告警状态',
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (`client_id`) REFERENCES `clients`(`id`) ON DELETE CASCADE,
    INDEX `idx_client_time` (`client_id`, `screenshot_time` DESC),
    INDEX `idx_risk_status` (`risk_level`, `alert_status`),
    INDEX `idx_review_status` (`is_reviewed`, `created_at` DESC),
    INDEX `idx_address_type` (`address_type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='安全告警截图表';

-- 4. 区块链地址白名单表
CREATE TABLE IF NOT EXISTS `blockchain_whitelist` (
    `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
    `address` TEXT NOT NULL COMMENT '区块链地址',
    `address_hash` VARCHAR(64) NOT NULL UNIQUE COMMENT '地址哈希值（用于去重）',
    `address_type` VARCHAR(20) NOT NULL COMMENT '地址类型（BTC/ETH/TRC20等）',
    `label` VARCHAR(255) COMMENT '地址标签/备注',
    `category` VARCHAR(50) COMMENT '地址分类（公司钱包/交易所/合作伙伴等）',
    `created_by` INT NOT NULL COMMENT '创建人用户ID',
    `approved_by` INT COMMENT '审核人用户ID',
    `approved_at` TIMESTAMP NULL COMMENT '审核时间',
    `is_active` TINYINT(1) DEFAULT 1 COMMENT '是否激活',
    `expires_at` TIMESTAMP NULL COMMENT '过期时间（可选）',
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX `idx_address_hash` (`address_hash`),
    INDEX `idx_type_active` (`address_type`, `is_active`),
    INDEX `idx_active_expires` (`is_active`, `expires_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='区块链地址白名单表';

-- 5. 系统用户表
CREATE TABLE IF NOT EXISTS `system_users` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `username` VARCHAR(50) NOT NULL UNIQUE COMMENT '用户名',
    `password` VARCHAR(255) NOT NULL COMMENT '密码哈希',
    `real_name` VARCHAR(100) COMMENT '真实姓名',
    `email` VARCHAR(255) UNIQUE COMMENT '邮箱',
    `phone` VARCHAR(20) COMMENT '手机号',
    `role` ENUM('admin', 'operator', 'viewer') DEFAULT 'viewer' COMMENT '用户角色',
    `permissions` JSON COMMENT '权限配置（JSON格式）',
    `is_active` TINYINT(1) DEFAULT 1 COMMENT '是否激活',
    `last_login` TIMESTAMP NULL COMMENT '最后登录时间',
    `login_count` INT DEFAULT 0 COMMENT '登录次数',
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX `idx_username` (`username`),
    INDEX `idx_role_active` (`role`, `is_active`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='系统用户表';

-- 插入开发环境初始数据
-- 默认分组
INSERT IGNORE INTO `client_groups` (`name`, `description`, `color`, `sort_order`) VALUES
('开发测试组', '开发测试环境客户端', '#52c41a', 0),
('前端开发组', '前端开发人员', '#1890ff', 1),
('后端开发组', '后端开发人员', '#722ed1', 2),
('测试组', '质量测试人员', '#faad14', 3);

-- 开发环境管理员账户 (密码: dev123)
INSERT IGNORE INTO `system_users` (`username`, `password`, `real_name`, `email`, `role`) VALUES
('dev_admin', '$2b$10$8K1p/a0dEJGGBM6I8NOz/eBu8R/SCKI4sVJh.3k.w2ZEo2B8JQC0e', '开发管理员', 'dev@example.com', 'admin'),
('test_user', '$2b$10$8K1p/a0dEJGGBM6I8NOz/eBu8R/SCKI4sVJh.3k.w2ZEo2B8JQC0e', '测试用户', 'test@example.com', 'operator');

-- 开发环境测试客户端
INSERT IGNORE INTO `clients` (
    `id`, `client_number`, `client_name`, `group_id`, `computer_name`, 
    `username`, `ip_address`, `status`, `last_heartbeat`, `first_connect`
) VALUES 
(
    'dev-client-001-test-uuid-000000000001', 
    'TEST-001', 
    '开发测试机-001', 
    1, 
    'DEV-TEST-PC-001',
    'developer1',
    '127.0.0.1',
    'online',
    NOW(),
    DATE_SUB(NOW(), INTERVAL 1 HOUR)
),
(
    'dev-client-002-test-uuid-000000000002',
    'TEST-002', 
    '开发测试机-002', 
    2, 
    'DEV-TEST-PC-002',
    'developer2',
    '127.0.0.2',
    'offline',
    DATE_SUB(NOW(), INTERVAL 10 MINUTE),
    DATE_SUB(NOW(), INTERVAL 2 HOUR)
);

-- 开发环境测试白名单
INSERT IGNORE INTO `blockchain_whitelist` (
    `address`, `address_hash`, `address_type`, `label`, `category`, `created_by`, `approved_by`, `approved_at`
) VALUES 
(
    'bc1qw508d6qejxtdg4y5r3zarvary0c5xw7kv8f3t4',
    SHA2('bc1qw508d6qejxtdg4y5r3zarvary0c5xw7kv8f3t4', 256),
    'BTC',
    '开发测试地址-BTC',
    '测试地址',
    1,
    1,
    NOW()
),
(
    '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045',
    SHA2('0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045', 256),
    'ETH',
    '开发测试地址-ETH',
    '测试地址',
    1,
    1,
    NOW()
);

SELECT '=== 开发环境数据库初始化完成 ===' as message;
SELECT 
    'client_groups' as table_name, 
    COUNT(*) as record_count 
FROM client_groups
UNION ALL
SELECT 'clients', COUNT(*) FROM clients
UNION ALL  
SELECT 'system_users', COUNT(*) FROM system_users
UNION ALL
SELECT 'blockchain_whitelist', COUNT(*) FROM blockchain_whitelist;