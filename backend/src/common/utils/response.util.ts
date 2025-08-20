/**
 * 通用响应格式化工具
 */
export class ResponseUtil {
  /**
   * 成功响应
   * @param data 响应数据
   * @param message 响应消息
   */
  static success<T>(data?: T, message: string = '操作成功') {
    return {
      success: true,
      data,
      message,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * 分页响应
   * @param data 分页数据
   * @param total 总数
   * @param page 当前页
   * @param pageSize 每页大小
   * @param message 响应消息
   */
  static paginated<T>(
    data: T[],
    total: number,
    page: number,
    pageSize: number,
    message: string = '查询成功',
  ) {
    const totalPages = Math.ceil(total / pageSize);

    return {
      success: true,
      data,
      pagination: {
        total,
        page,
        pageSize,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
      message,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * 错误响应
   * @param message 错误消息
   * @param error 错误详情
   * @param statusCode HTTP状态码
   */
  static error(message: string = '操作失败', error?: any, statusCode: number = 500) {
    return {
      success: false,
      message,
      error: error?.message || error,
      statusCode,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * 创建响应
   * @param data 创建的数据
   * @param message 响应消息
   */
  static created<T>(data: T, message: string = '创建成功') {
    return {
      success: true,
      data,
      message,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * 更新响应
   * @param data 更新的数据
   * @param message 响应消息
   */
  static updated<T>(data?: T, message: string = '更新成功') {
    return {
      success: true,
      data,
      message,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * 删除响应
   * @param message 响应消息
   */
  static deleted(message: string = '删除成功') {
    return {
      success: true,
      message,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * 批量操作响应
   * @param successCount 成功数量
   * @param failCount 失败数量
   * @param message 响应消息
   */
  static bulk(successCount: number, failCount: number = 0, message?: string) {
    const defaultMessage =
      failCount > 0
        ? `批量操作完成，成功 ${successCount} 个，失败 ${failCount} 个`
        : `批量操作成功，共处理 ${successCount} 个`;

    return {
      success: failCount === 0,
      data: {
        successCount,
        failCount,
        totalCount: successCount + failCount,
      },
      message: message || defaultMessage,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * 统计响应
   * @param stats 统计数据
   * @param message 响应消息
   */
  static stats<T>(stats: T, message: string = '统计查询成功') {
    return {
      success: true,
      stats,
      message,
      timestamp: new Date().toISOString(),
    };
  }
}
