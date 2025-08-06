#!/bin/bash

# MinIO 初始化脚本 - 创建默认存储桶和策略
# 此脚本在MinIO容器启动后执行

set -e

# 等待MinIO服务启动
echo "等待MinIO服务启动..."
until curl -f http://localhost:9000/minio/health/live; do
  echo "MinIO还未启动，等待5秒..."
  sleep 5
done

echo "MinIO服务已启动，开始初始化..."

# 配置MinIO客户端
mc alias set myminio http://localhost:9000 ${MINIO_ROOT_USER:-minioadmin} ${MINIO_ROOT_PASSWORD:-minioadmin123}

# 创建监控截图存储桶
echo "创建存储桶: monitoring-screenshots"
mc mb myminio/monitoring-screenshots --ignore-existing

# 创建备份存储桶
echo "创建存储桶: monitoring-backups"
mc mb myminio/monitoring-backups --ignore-existing

# 设置存储桶生命周期策略
echo "设置生命周期策略..."
cat > /tmp/lifecycle.json << 'EOF'
{
  "Rules": [
    {
      "ID": "RegularScreenshots",
      "Status": "Enabled",
      "Filter": {
        "Prefix": "regular/"
      },
      "Expiration": {
        "Days": 7
      }
    },
    {
      "ID": "SecurityScreenshots",
      "Status": "Enabled", 
      "Filter": {
        "Prefix": "security/"
      },
      "Transitions": [
        {
          "Days": 90,
          "StorageClass": "STANDARD_IA"
        },
        {
          "Days": 365,
          "StorageClass": "GLACIER"
        }
      ]
    }
  ]
}
EOF

mc ilm set myminio/monitoring-screenshots < /tmp/lifecycle.json

# 设置存储桶访问策略（允许读取截图）
echo "设置访问策略..."
cat > /tmp/bucket-policy.json << 'EOF'
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "AWS": ["*"]
      },
      "Action": ["s3:GetObject"],
      "Resource": ["arn:aws:s3:::monitoring-screenshots/regular/*"]
    }
  ]
}
EOF

mc policy set-json /tmp/bucket-policy.json myminio/monitoring-screenshots

# 创建服务账户（用于应用程序访问）
echo "创建服务账户..."
mc admin user add myminio monitor-service monitor-service-key-123

# 设置服务账户权限
cat > /tmp/service-policy.json << 'EOF'
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:GetObject",
        "s3:PutObject",
        "s3:DeleteObject",
        "s3:ListBucket"
      ],
      "Resource": [
        "arn:aws:s3:::monitoring-screenshots/*",
        "arn:aws:s3:::monitoring-screenshots"
      ]
    }
  ]
}
EOF

mc admin policy create myminio monitor-service-policy /tmp/service-policy.json
mc admin policy attach myminio monitor-service-policy --user monitor-service

# 创建事件通知（可选）
echo "配置事件通知..."
mc event add myminio/monitoring-screenshots arn:minio:sqs::1:webhook --event put --prefix security/

echo "MinIO初始化完成！"
echo "存储桶列表:"
mc ls myminio/

echo "服务账户信息:"
echo "Access Key: monitor-service"
echo "Secret Key: monitor-service-key-123"

# 清理临时文件
rm -f /tmp/lifecycle.json /tmp/bucket-policy.json /tmp/service-policy.json