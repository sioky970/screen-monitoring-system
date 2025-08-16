/**
 * 前端日志工具
 * 提供统一的日志输出格式和级别控制
 */

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3
}

interface LogEntry {
  timestamp: string
  level: string
  module: string
  message: string
  data?: any
}

class Logger {
  private level: LogLevel = LogLevel.DEBUG
  private logs: LogEntry[] = []
  private maxLogs = 1000

  constructor() {
    // 在开发环境下启用详细日志
    if (import.meta.env.DEV) {
      this.level = LogLevel.DEBUG
    } else {
      this.level = LogLevel.INFO
    }
  }

  private formatTimestamp(): string {
    return new Date().toISOString()
  }

  private addLog(level: LogLevel, module: string, message: string, data?: any) {
    const levelNames = ['DEBUG', 'INFO', 'WARN', 'ERROR']
    const logEntry: LogEntry = {
      timestamp: this.formatTimestamp(),
      level: levelNames[level],
      module,
      message,
      data
    }

    this.logs.push(logEntry)
    
    // 保持日志数量在限制内
    if (this.logs.length > this.maxLogs) {
      this.logs.shift()
    }

    // 控制台输出
    if (level >= this.level) {
      const prefix = `[${logEntry.timestamp}] [${logEntry.level}] [${module}]`
      
      switch (level) {
        case LogLevel.DEBUG:
          console.debug(prefix, message, data || '')
          break
        case LogLevel.INFO:
          console.info(prefix, message, data || '')
          break
        case LogLevel.WARN:
          console.warn(prefix, message, data || '')
          break
        case LogLevel.ERROR:
          console.error(prefix, message, data || '')
          break
      }
    }
  }

  debug(module: string, message: string, data?: any) {
    this.addLog(LogLevel.DEBUG, module, message, data)
  }

  info(module: string, message: string, data?: any) {
    this.addLog(LogLevel.INFO, module, message, data)
  }

  warn(module: string, message: string, data?: any) {
    this.addLog(LogLevel.WARN, module, message, data)
  }

  error(module: string, message: string, data?: any) {
    this.addLog(LogLevel.ERROR, module, message, data)
  }

  // 获取所有日志
  getLogs(): LogEntry[] {
    return [...this.logs]
  }

  // 获取指定级别的日志
  getLogsByLevel(level: LogLevel): LogEntry[] {
    const levelNames = ['DEBUG', 'INFO', 'WARN', 'ERROR']
    return this.logs.filter(log => log.level === levelNames[level])
  }

  // 获取指定模块的日志
  getLogsByModule(module: string): LogEntry[] {
    return this.logs.filter(log => log.module === module)
  }

  // 清空日志
  clear() {
    this.logs = []
  }

  // 设置日志级别
  setLevel(level: LogLevel) {
    this.level = level
  }

  // 导出日志为文本
  exportLogs(): string {
    return this.logs.map(log => {
      const dataStr = log.data ? ` | Data: ${JSON.stringify(log.data)}` : ''
      return `${log.timestamp} [${log.level}] [${log.module}] ${log.message}${dataStr}`
    }).join('\n')
  }
}

// 创建全局日志实例
export const logger = new Logger()

// 导出便捷方法
export const log = {
  debug: (module: string, message: string, data?: any) => logger.debug(module, message, data),
  info: (module: string, message: string, data?: any) => logger.info(module, message, data),
  warn: (module: string, message: string, data?: any) => logger.warn(module, message, data),
  error: (module: string, message: string, data?: any) => logger.error(module, message, data),
}

// 全局错误处理
window.addEventListener('error', (event) => {
  logger.error('Global', `Uncaught error: ${event.error?.message || event.message}`, {
    filename: event.filename,
    lineno: event.lineno,
    colno: event.colno,
    error: event.error?.stack
  })
})

window.addEventListener('unhandledrejection', (event) => {
  logger.error('Global', `Unhandled promise rejection: ${event.reason}`, {
    reason: event.reason
  })
})
