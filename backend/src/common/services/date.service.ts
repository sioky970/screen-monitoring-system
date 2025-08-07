import { Injectable } from '@nestjs/common';
import * as moment from 'moment';

@Injectable()
export class DateService {
  // 格式化日期
  format(date: Date | string, format = 'YYYY-MM-DD HH:mm:ss'): string {
    return moment(date).format(format);
  }

  // 获取当前时间
  now(): Date {
    return new Date();
  }

  // 获取今天开始时间
  todayStart(): Date {
    return moment().startOf('day').toDate();
  }

  // 获取今天结束时间
  todayEnd(): Date {
    return moment().endOf('day').toDate();
  }

  // 获取昨天开始时间
  yesterdayStart(): Date {
    return moment().subtract(1, 'day').startOf('day').toDate();
  }

  // 获取昨天结束时间
  yesterdayEnd(): Date {
    return moment().subtract(1, 'day').endOf('day').toDate();
  }

  // 获取本周开始时间
  weekStart(): Date {
    return moment().startOf('week').toDate();
  }

  // 获取本月开始时间
  monthStart(): Date {
    return moment().startOf('month').toDate();
  }

  // 计算时间差（秒）
  diffInSeconds(start: Date, end: Date): number {
    return moment(end).diff(moment(start), 'seconds');
  }

  // 计算时间差（分钟）
  diffInMinutes(start: Date, end: Date): number {
    return moment(end).diff(moment(start), 'minutes');
  }

  // 计算时间差（小时）
  diffInHours(start: Date, end: Date): number {
    return moment(end).diff(moment(start), 'hours');
  }

  // 计算时间差（天）
  diffInDays(start: Date, end: Date): number {
    return moment(end).diff(moment(start), 'days');
  }

  // 添加时间
  addTime(date: Date, amount: number, unit: moment.unitOfTime.DurationConstructor): Date {
    return moment(date).add(amount, unit).toDate();
  }

  // 减少时间
  subtractTime(date: Date, amount: number, unit: moment.unitOfTime.DurationConstructor): Date {
    return moment(date).subtract(amount, unit).toDate();
  }

  // 判断是否是今天
  isToday(date: Date): boolean {
    return moment(date).isSame(moment(), 'day');
  }

  // 判断是否是昨天
  isYesterday(date: Date): boolean {
    return moment(date).isSame(moment().subtract(1, 'day'), 'day');
  }

  // 判断是否是本周
  isThisWeek(date: Date): boolean {
    return moment(date).isSame(moment(), 'week');
  }

  // 判断是否是本月
  isThisMonth(date: Date): boolean {
    return moment(date).isSame(moment(), 'month');
  }

  // 人性化时间显示
  humanize(date: Date): string {
    return moment(date).locale('zh-cn').fromNow();
  }

  // 格式化在线时长
  formatDuration(seconds: number): string {
    const duration = moment.duration(seconds, 'seconds');
    const days = Math.floor(duration.asDays());
    const hours = duration.hours();
    const minutes = duration.minutes();
    const secs = duration.seconds();

    if (days > 0) {
      return `${days}天${hours}小时${minutes}分钟`;
    } else if (hours > 0) {
      return `${hours}小时${minutes}分钟`;
    } else if (minutes > 0) {
      return `${minutes}分钟${secs}秒`;
    } else {
      return `${secs}秒`;
    }
  }

  // 获取时间范围
  getDateRange(range: 'today' | 'yesterday' | 'week' | 'month' | 'custom', customStart?: Date, customEnd?: Date): {
    start: Date;
    end: Date;
  } {
    switch (range) {
      case 'today':
        return { start: this.todayStart(), end: this.todayEnd() };
      case 'yesterday':
        return { start: this.yesterdayStart(), end: this.yesterdayEnd() };
      case 'week':
        return { start: this.weekStart(), end: this.now() };
      case 'month':
        return { start: this.monthStart(), end: this.now() };
      case 'custom':
        return {
          start: customStart || this.todayStart(),
          end: customEnd || this.todayEnd(),
        };
      default:
        return { start: this.todayStart(), end: this.todayEnd() };
    }
  }
}