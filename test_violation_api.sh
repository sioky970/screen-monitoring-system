#!/bin/bash

echo "=== 测试违规上报接口 ==="
echo "接口: POST /api/security/violations/report-with-screenshot"
echo ""

# 发送请求并获取响应
response=$(curl -s -w "\nHTTP_CODE:%{http_code}\n" -X POST "http://localhost:3001/api/security/violations/report-with-screenshot" \
  -F "file=@1.jpg" \
  -F "clientId=65ffa6a7-2f4b-4ab2-b0d6-8db48840e520" \
  -F "violationType=BLOCKCHAIN_ADDRESS" \
  -F "violationContent=0x742d35Cc6634C0532925a3b8D4C9db96DfbBfC88" \
  -F "timestamp=2025-08-22T03:11:00.000Z" \
  -F "additionalData={\"clipboardContent\":\"测试违规6：发现以太坊地址\",\"applicationName\":\"测试应用\"}")

# 分离响应体和状态码
http_code=$(echo "$response" | grep "HTTP_CODE:" | cut -d: -f2)
response_body=$(echo "$response" | grep -v "HTTP_CODE:")

echo "HTTP状态码: $http_code"
echo "响应内容:"
echo "$response_body" | python3 -m json.tool 2>/dev/null || echo "$response_body"
echo ""
echo "=== 测试完成 ==="
