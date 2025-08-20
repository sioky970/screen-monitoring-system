import { applyDecorators } from '@nestjs/common';
import { ApiOperation, ApiResponse } from '@nestjs/swagger';

/**
 * 通用API响应装饰器
 * @param summary 操作摘要
 * @param description 成功响应描述
 * @param status 成功状态码
 */
export function ApiCommonResponse(
  summary: string,
  description: string = '操作成功',
  status: number = 200,
) {
  return applyDecorators(
    ApiOperation({ summary }),
    ApiResponse({ status, description }),
    ApiResponse({ status: 400, description: '请求参数错误' }),
    ApiResponse({ status: 401, description: '未授权' }),
    ApiResponse({ status: 500, description: '服务器内部错误' }),
  );
}

/**
 * 创建操作API响应装饰器
 * @param summary 操作摘要
 */
export function ApiCreateResponse(summary: string) {
  return ApiCommonResponse(summary, '创建成功', 201);
}

/**
 * 查询操作API响应装饰器
 * @param summary 操作摘要
 */
export function ApiQueryResponse(summary: string) {
  return ApiCommonResponse(summary, '查询成功', 200);
}

/**
 * 更新操作API响应装饰器
 * @param summary 操作摘要
 */
export function ApiUpdateResponse(summary: string) {
  return ApiCommonResponse(summary, '更新成功', 200);
}

/**
 * 删除操作API响应装饰器
 * @param summary 操作摘要
 */
export function ApiDeleteResponse(summary: string) {
  return ApiCommonResponse(summary, '删除成功', 200);
}
