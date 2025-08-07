#!/bin/bash

# 后端项目设置脚本

set -e

echo "🚀 设置屏幕监控系统后端项目..."

# 检查Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js未安装，请先安装Node.js 16+"
    exit 1
fi

# 检查npm
if ! command -v npm &> /dev/null; then
    echo "❌ npm未安装，请先安装npm"
    exit 1
fi

echo "✅ Node.js 版本: $(node --version)"
echo "✅ npm 版本: $(npm --version)"

# 复制环境变量文件
if [ ! -f .env ]; then
    echo "📋 复制环境变量文件..."
    cp .env.example .env
    echo "✅ 已创建 .env 文件，请根据需要修改配置"
fi

# 安装依赖
echo "📦 安装依赖包..."
npm install

# 创建必要目录
echo "📁 创建必要目录..."
mkdir -p logs
mkdir -p uploads
mkdir -p temp

echo "🎉 后端项目设置完成！"
echo ""
echo "📝 下一步操作："
echo "  1. 启动数据库和相关服务："
echo "     cd .. && ./start-unified.sh dev"
echo ""
echo "  2. 启动开发服务器："
echo "     npm run start:dev"
echo ""
echo "  3. 访问API文档："
echo "     http://localhost:3001/api/docs"
echo ""
echo "  4. 健康检查："
echo "     http://localhost:3001/health"