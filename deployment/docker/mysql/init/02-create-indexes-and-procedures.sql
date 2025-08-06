-- 屏幕监控系统 - 索引优化和存储过程
-- 此脚本在01-create-database.sql之后执行

USE screen_monitoring;

-- 创建额外的性能优化索引
ALTER TABLE `security_screenshots` ADD INDEX `idx_screenshot_time` (`screenshot_time` DESC);
ALTER TABLE `security_screenshots` ADD INDEX `idx_file_hash` (`file_hash`);
ALTER TABLE `system_logs` ADD INDEX `idx_created_time` (`created_at` DESC);

-- 创建存储过程：清理过期的安全截图
DELIMITER //
CREATE PROCEDURE `CleanupOldSecurityScreenshots`(IN days_to_keep INT)
BEGIN
    DECLARE done INT DEFAULT FALSE;
    DECLARE screenshot_id BIGINT;
    DECLARE object_key VARCHAR(500);
    DECLARE cur CURSOR FOR 
        SELECT id, minio_object_key 
        FROM security_screenshots 
        WHERE created_at < DATE_SUB(NOW(), INTERVAL days_to_keep DAY)
        AND is_reviewed = 1;
    DECLARE CONTINUE HANDLER FOR NOT FOUND SET done = TRUE;

    START TRANSACTION;
    
    OPEN cur;
    read_loop: LOOP
        FETCH cur INTO screenshot_id, object_key;
        IF done THEN
            LEAVE read_loop;
        END IF;
        
        -- 记录清理日志
        INSERT INTO system_logs (action, target_type, target_id, description, created_at)
        VALUES ('cleanup_screenshot', 'security_screenshot', screenshot_id, 
                CONCAT('Cleaned up old screenshot: ', object_key), NOW());
        
        -- 删除记录
        DELETE FROM security_screenshots WHERE id = screenshot_id;
    END LOOP;
    
    CLOSE cur;
    COMMIT;
END //
DELIMITER ;

-- 创建存储过程：更新客户端在线时长
DELIMITER //
CREATE PROCEDURE `UpdateClientOnlineTime`(IN client_uuid CHAR(36))
BEGIN
    DECLARE total_time BIGINT DEFAULT 0;
    
    -- 计算总在线时长
    SELECT COALESCE(SUM(duration), 0) INTO total_time 
    FROM client_online_logs 
    WHERE client_id = client_uuid;
    
    -- 更新客户端表中的总在线时长
    UPDATE clients 
    SET total_online_time = total_time,
        updated_at = NOW()
    WHERE id = client_uuid;
END //
DELIMITER ;

-- 创建触发器：客户端下线时自动计算在线时长
DELIMITER //
CREATE TRIGGER `tr_client_offline_duration` 
AFTER UPDATE ON `client_online_logs`
FOR EACH ROW
BEGIN
    IF NEW.offline_time IS NOT NULL AND OLD.offline_time IS NULL THEN
        -- 计算在线时长
        UPDATE client_online_logs 
        SET duration = TIMESTAMPDIFF(SECOND, online_time, offline_time)
        WHERE id = NEW.id;
        
        -- 更新客户端总在线时长
        CALL UpdateClientOnlineTime(NEW.client_id);
    END IF;
END //
DELIMITER ;

-- 创建函数：检查地址是否在白名单中
DELIMITER //
CREATE FUNCTION `IsAddressWhitelisted`(address_to_check TEXT, addr_type VARCHAR(20)) 
RETURNS BOOLEAN
READS SQL DATA
DETERMINISTIC
BEGIN
    DECLARE is_whitelisted BOOLEAN DEFAULT FALSE;
    DECLARE addr_hash VARCHAR(64);
    
    -- 计算地址哈希
    SET addr_hash = SHA2(address_to_check, 256);
    
    -- 检查是否在白名单中且未过期
    SELECT EXISTS(
        SELECT 1 FROM blockchain_whitelist 
        WHERE address_hash = addr_hash 
        AND address_type = addr_type 
        AND is_active = 1 
        AND (expires_at IS NULL OR expires_at > NOW())
    ) INTO is_whitelisted;
    
    RETURN is_whitelisted;
END //
DELIMITER ;

-- 创建视图：安全告警统计
CREATE OR REPLACE VIEW `v_security_alert_stats` AS
SELECT 
    DATE(created_at) as alert_date,
    address_type,
    risk_level,
    alert_status,
    COUNT(*) as alert_count,
    COUNT(CASE WHEN is_reviewed = 1 THEN 1 END) as reviewed_count,
    COUNT(CASE WHEN is_reviewed = 0 THEN 1 END) as pending_count
FROM security_screenshots
WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
GROUP BY DATE(created_at), address_type, risk_level, alert_status
ORDER BY alert_date DESC;

-- 创建视图：客户端健康状态
CREATE OR REPLACE VIEW `v_client_health` AS
SELECT 
    c.id,
    c.client_number,
    c.client_name,
    cg.name as group_name,
    c.status,
    c.last_heartbeat,
    TIMESTAMPDIFF(MINUTE, c.last_heartbeat, NOW()) as minutes_since_heartbeat,
    c.total_online_time,
    CASE 
        WHEN c.status = 'online' AND c.last_heartbeat > DATE_SUB(NOW(), INTERVAL 5 MINUTE) THEN 'healthy'
        WHEN c.status = 'online' AND c.last_heartbeat < DATE_SUB(NOW(), INTERVAL 5 MINUTE) THEN 'warning'
        WHEN c.status = 'offline' THEN 'offline'
        WHEN c.status = 'error' THEN 'error'
        ELSE 'unknown'
    END as health_status
FROM clients c
LEFT JOIN client_groups cg ON c.group_id = cg.id
WHERE c.is_active = 1;

-- 创建视图：今日安全告警摘要
CREATE OR REPLACE VIEW `v_today_security_summary` AS
SELECT 
    COUNT(*) as total_alerts,
    COUNT(CASE WHEN risk_level = 'CRITICAL' THEN 1 END) as critical_alerts,
    COUNT(CASE WHEN risk_level = 'HIGH' THEN 1 END) as high_alerts,
    COUNT(CASE WHEN risk_level = 'MEDIUM' THEN 1 END) as medium_alerts,
    COUNT(CASE WHEN risk_level = 'LOW' THEN 1 END) as low_alerts,
    COUNT(CASE WHEN is_reviewed = 1 THEN 1 END) as reviewed_alerts,
    COUNT(CASE WHEN is_reviewed = 0 THEN 1 END) as pending_alerts,
    COUNT(CASE WHEN alert_status = 'confirmed' THEN 1 END) as confirmed_alerts,
    COUNT(CASE WHEN alert_status = 'false_positive' THEN 1 END) as false_positive_alerts
FROM security_screenshots
WHERE DATE(created_at) = CURDATE();

-- 添加一些有用的配置表
CREATE TABLE IF NOT EXISTS `system_config` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `config_key` VARCHAR(100) NOT NULL UNIQUE COMMENT '配置键',
    `config_value` TEXT COMMENT '配置值',
    `config_type` ENUM('string', 'number', 'boolean', 'json') DEFAULT 'string' COMMENT '配置类型',
    `description` TEXT COMMENT '配置描述',
    `is_public` TINYINT(1) DEFAULT 0 COMMENT '是否为公开配置',
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX `idx_config_key` (`config_key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='系统配置表';

-- 插入默认系统配置
INSERT IGNORE INTO `system_config` (`config_key`, `config_value`, `config_type`, `description`, `is_public`) VALUES
('screenshot_retention_days', '30', 'number', '截图文件保留天数', 0),
('heartbeat_timeout_minutes', '5', 'number', '客户端心跳超时时间（分钟）', 0),
('max_screenshot_size_mb', '10', 'number', '最大截图文件大小（MB）', 0),
('screenshot_quality', '95', 'number', '截图质量（1-100）', 0),
('enable_cdn_acceleration', 'true', 'boolean', '是否启用CDN加速', 0),
('security_alert_email', '', 'string', '安全告警邮箱地址', 0),
('system_title', '屏幕监控系统', 'string', '系统标题', 1),
('company_name', '', 'string', '公司名称', 1);

-- 创建通知表
CREATE TABLE IF NOT EXISTS `notifications` (
    `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
    `user_id` INT COMMENT '目标用户ID（NULL表示系统通知）',
    `title` VARCHAR(255) NOT NULL COMMENT '通知标题',
    `content` TEXT COMMENT '通知内容',
    `type` ENUM('info', 'warning', 'error', 'success') DEFAULT 'info' COMMENT '通知类型',
    `category` VARCHAR(50) COMMENT '通知分类',
    `related_type` VARCHAR(50) COMMENT '关联对象类型',
    `related_id` VARCHAR(50) COMMENT '关联对象ID',
    `is_read` TINYINT(1) DEFAULT 0 COMMENT '是否已读',
    `is_system` TINYINT(1) DEFAULT 0 COMMENT '是否为系统通知',
    `expires_at` TIMESTAMP NULL COMMENT '过期时间',
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX `idx_user_read` (`user_id`, `is_read`),
    INDEX `idx_system_expires` (`is_system`, `expires_at`),
    INDEX `idx_created_time` (`created_at` DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='系统通知表';