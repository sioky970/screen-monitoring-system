-- 屏幕监控系统数据库初始化脚本
-- 此脚本在MySQL容器首次启动时自动执行

-- 设置字符集和排序规则
SET NAMES utf8mb4;
SET character_set_client = utf8mb4;

-- 创建数据库（如果不存在）
CREATE DATABASE IF NOT EXISTS screen_monitoring 
CHARACTER SET utf8mb4 
COLLATE utf8mb4_unicode_ci;

-- 使用数据库
USE screen_monitoring;

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

-- 6. 系统日志表
CREATE TABLE IF NOT EXISTS `system_logs` (
    `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
    `user_id` INT COMMENT '操作用户ID',
    `client_id` CHAR(36) COMMENT '相关客户端ID',
    `action` VARCHAR(100) NOT NULL COMMENT '操作类型',
    `target_type` VARCHAR(50) COMMENT '目标类型（client/whitelist/user等）',
    `target_id` VARCHAR(50) COMMENT '目标ID',
    `description` TEXT COMMENT '操作描述',
    `ip_address` VARCHAR(45) COMMENT '操作者IP',
    `user_agent` TEXT COMMENT '用户代理',
    `extra_data` JSON COMMENT '额外数据（JSON格式）',
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX `idx_user_action` (`user_id`, `action`),
    INDEX `idx_client_time` (`client_id`, `created_at` DESC),
    INDEX `idx_action_time` (`action`, `created_at` DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='系统操作日志表';

-- 7. 客户端在线时长记录表
CREATE TABLE IF NOT EXISTS `client_online_logs` (
    `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
    `client_id` CHAR(36) NOT NULL COMMENT '客户端ID',
    `online_time` TIMESTAMP NOT NULL COMMENT '上线时间',
    `offline_time` TIMESTAMP NULL COMMENT '下线时间',
    `duration` INT COMMENT '在线时长（秒）',
    `ip_address` VARCHAR(45) COMMENT 'IP地址',
    `disconnect_reason` VARCHAR(100) COMMENT '断开原因',
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (`client_id`) REFERENCES `clients`(`id`) ON DELETE CASCADE,
    INDEX `idx_client_time` (`client_id`, `online_time` DESC),
    INDEX `idx_duration` (`duration` DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='客户端在线时长记录表';

-- 插入初始数据
-- 默认分组
INSERT IGNORE INTO `client_groups` (`name`, `description`, `color`, `sort_order`) VALUES
('默认分组', '系统默认分组', '#1890ff', 0),
('开发部门', '开发人员计算机', '#52c41a', 1),
('财务部门', '财务人员计算机', '#faad14', 2),
('管理层', '管理层计算机', '#f5222d', 3);

-- 默认管理员账户 (密码: admin123)
INSERT IGNORE INTO `system_users` (`username`, `password`, `real_name`, `email`, `role`) VALUES
('admin', '$2b$10$8K1p/a0dEJGGBM6I8NOz/eBu8R/SCKI4sVJh.3k.w2ZEo2B8JQC0e', '系统管理员', 'admin@example.com', 'admin');

-- 创建视图：活跃客户端统计
CREATE OR REPLACE VIEW `v_active_clients` AS
SELECT 
    cg.name as group_name,
    cg.color as group_color,
    COUNT(c.id) as total_clients,
    SUM(CASE WHEN c.status = 'online' THEN 1 ELSE 0 END) as online_clients,
    SUM(CASE WHEN c.status = 'offline' THEN 1 ELSE 0 END) as offline_clients,
    SUM(CASE WHEN c.status = 'error' THEN 1 ELSE 0 END) as error_clients
FROM client_groups cg
LEFT JOIN clients c ON cg.id = c.group_id AND c.is_active = 1
WHERE cg.is_active = 1
GROUP BY cg.id, cg.name, cg.color
ORDER BY cg.sort_order;