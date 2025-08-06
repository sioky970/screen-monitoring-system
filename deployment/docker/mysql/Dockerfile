# 屏幕监控系统 - 预构建MySQL数据库镜像
# 基于MySQL 8.0，包含完整的数据库结构和初始数据

FROM mysql:8.0

# 镜像信息
LABEL maintainer="Screen Monitoring System"
LABEL description="MySQL 8.0 with pre-built database structure for Screen Monitoring System"
LABEL version="1.0.0"

# 设置环境变量
ENV MYSQL_ROOT_PASSWORD=rootPassword123 \
    MYSQL_DATABASE=screen_monitoring \
    MYSQL_USER=monitor_user \
    MYSQL_PASSWORD=monitorPass123 \
    MYSQL_CHARSET=utf8mb4 \
    MYSQL_COLLATION=utf8mb4_unicode_ci

# 开发环境额外的环境变量
ENV MYSQL_DEV_DATABASE=screen_monitoring_dev \
    MYSQL_DEV_USER=dev_user \
    MYSQL_DEV_PASSWORD=dev_pass_123

# 复制MySQL配置文件
COPY conf/my.cnf /etc/mysql/conf.d/screen-monitoring.cnf

# 复制初始化脚本（按顺序执行）
COPY init/01-create-database.sql /docker-entrypoint-initdb.d/01-create-database.sql
COPY init/02-create-indexes-and-procedures.sql /docker-entrypoint-initdb.d/02-create-indexes-and-procedures.sql
COPY init/03-insert-sample-data.sql /docker-entrypoint-initdb.d/03-insert-sample-data.sql

# 开发环境初始化脚本
COPY dev-init/01-dev-database.sql /docker-entrypoint-initdb.d/04-dev-database.sql

# 复制预构建脚本
COPY scripts/prebuild-info.sh /usr/local/bin/prebuild-info.sh
RUN chmod +x /usr/local/bin/prebuild-info.sh

# 设置正确的权限
RUN chmod 644 /docker-entrypoint-initdb.d/*.sql && \
    chmod 644 /etc/mysql/conf.d/*.cnf

# 创建自定义入口脚本
RUN echo '#!/bin/bash\n\
echo "=== 屏幕监控系统 MySQL 镜像 ==="\n\
echo "版本: 1.0.0"\n\
echo "构建时间: '$(date)'"\n\
echo "包含数据库: screen_monitoring, screen_monitoring_dev"\n\
echo "预装表数量: 7个核心表 + 视图 + 存储过程"\n\
echo "========================================"\n\
\n\
# 调用原始入口点\n\
exec docker-entrypoint.sh "$@"' > /usr/local/bin/custom-entrypoint.sh && \
chmod +x /usr/local/bin/custom-entrypoint.sh

# 暴露端口
EXPOSE 3306

# 健康检查
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=5 \
    CMD mysqladmin ping -h localhost -u root -p$MYSQL_ROOT_PASSWORD || exit 1

# 使用自定义入口点
ENTRYPOINT ["/usr/local/bin/custom-entrypoint.sh"]
CMD ["mysqld"]