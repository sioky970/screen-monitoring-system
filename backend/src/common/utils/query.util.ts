import { SelectQueryBuilder } from 'typeorm';

/**
 * 通用查询工具类
 */
export class QueryUtil {
  /**
   * 添加分页查询
   * @param queryBuilder 查询构建器
   * @param page 页码
   * @param pageSize 每页大小
   */
  static addPagination<T>(
    queryBuilder: SelectQueryBuilder<T>,
    page: number = 1,
    pageSize: number = 20,
  ): SelectQueryBuilder<T> {
    const skip = (page - 1) * pageSize;
    return queryBuilder.skip(skip).take(pageSize);
  }

  /**
   * 添加搜索条件
   * @param queryBuilder 查询构建器
   * @param searchFields 搜索字段数组
   * @param searchValue 搜索值
   * @param alias 表别名
   */
  static addSearch<T>(
    queryBuilder: SelectQueryBuilder<T>,
    searchFields: string[],
    searchValue: string,
    alias: string = 'entity',
  ): SelectQueryBuilder<T> {
    if (!searchValue || searchFields.length === 0) {
      return queryBuilder;
    }

    const conditions = searchFields
      .map(field => `${alias}.${field} LIKE :searchValue`)
      .join(' OR ');

    return queryBuilder.andWhere(`(${conditions})`, {
      searchValue: `%${searchValue}%`,
    });
  }

  /**
   * 添加状态过滤
   * @param queryBuilder 查询构建器
   * @param status 状态值
   * @param field 状态字段名
   * @param alias 表别名
   */
  static addStatusFilter<T>(
    queryBuilder: SelectQueryBuilder<T>,
    status: any,
    field: string = 'status',
    alias: string = 'entity',
  ): SelectQueryBuilder<T> {
    if (status !== undefined && status !== null) {
      return queryBuilder.andWhere(`${alias}.${field} = :status`, { status });
    }
    return queryBuilder;
  }

  /**
   * 添加日期范围过滤
   * @param queryBuilder 查询构建器
   * @param startDate 开始日期
   * @param endDate 结束日期
   * @param field 日期字段名
   * @param alias 表别名
   */
  static addDateRangeFilter<T>(
    queryBuilder: SelectQueryBuilder<T>,
    startDate?: Date,
    endDate?: Date,
    field: string = 'createdAt',
    alias: string = 'entity',
  ): SelectQueryBuilder<T> {
    if (startDate) {
      queryBuilder.andWhere(`${alias}.${field} >= :startDate`, { startDate });
    }
    if (endDate) {
      queryBuilder.andWhere(`${alias}.${field} <= :endDate`, { endDate });
    }
    return queryBuilder;
  }

  /**
   * 添加关联查询
   * @param queryBuilder 查询构建器
   * @param relations 关联关系数组
   * @param alias 主表别名
   */
  static addRelations<T>(
    queryBuilder: SelectQueryBuilder<T>,
    relations: Array<{ relation: string; alias: string }>,
    alias: string = 'entity',
  ): SelectQueryBuilder<T> {
    relations.forEach(({ relation, alias: relationAlias }) => {
      queryBuilder.leftJoinAndSelect(`${alias}.${relation}`, relationAlias);
    });
    return queryBuilder;
  }

  /**
   * 执行分页查询并返回结果
   * @param queryBuilder 查询构建器
   * @param page 页码
   * @param pageSize 每页大小
   */
  static async executePaginatedQuery<T>(
    queryBuilder: SelectQueryBuilder<T>,
    page: number = 1,
    pageSize: number = 20,
  ): Promise<{
    data: T[];
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  }> {
    // 克隆查询构建器以避免影响原始查询
    const countQuery = queryBuilder.clone();
    const dataQuery = queryBuilder.clone();

    // 获取总数
    const total = await countQuery.getCount();

    // 获取分页数据
    const data = await this.addPagination(dataQuery, page, pageSize).getMany();

    const totalPages = Math.ceil(total / pageSize);

    return {
      data,
      total,
      page,
      pageSize,
      totalPages,
    };
  }
}
