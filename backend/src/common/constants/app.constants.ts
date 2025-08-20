/**
 * 应用程序常量
 */

// 分页相关常量
export const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100,
  MIN_PAGE_SIZE: 1,
} as const;

// 文件上传相关常量
export const FILE_UPLOAD = {
  MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
  ALLOWED_IMAGE_TYPES: ['jpg', 'jpeg', 'png', 'gif', 'webp'],
  ALLOWED_DOCUMENT_TYPES: ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'txt'],
  UPLOAD_PATH: 'uploads',
} as const;

// 缓存相关常量
export const CACHE = {
  TTL: {
    SHORT: 5 * 60, // 5分钟
    MEDIUM: 30 * 60, // 30分钟
    LONG: 60 * 60, // 1小时
    VERY_LONG: 24 * 60 * 60, // 24小时
  },
  KEYS: {
    CLIENT_STATS: 'client:stats',
    SYSTEM_INFO: 'system:info',
    SECURITY_ALERTS: 'security:alerts',
    USER_SESSION: 'user:session',
  },
} as const;

// WebSocket事件常量
export const WEBSOCKET_EVENTS = {
  // 客户端事件
  CLIENT_ONLINE: 'client_online',
  CLIENT_OFFLINE: 'client_offline',
  CLIENT_STATUS_UPDATE: 'client_status_update',
  CLIENT_HEARTBEAT: 'client_heartbeat',

  // 安全事件
  SECURITY_ALERT: 'security_alert',
  SECURITY_ALERT_RESOLVED: 'security_alert_resolved',

  // 系统事件
  SYSTEM_NOTIFICATION: 'system_notification',
  SYSTEM_STATUS_UPDATE: 'system_status_update',

  // 文件事件
  FILE_UPLOAD_PROGRESS: 'file_upload_progress',
  FILE_UPLOAD_COMPLETE: 'file_upload_complete',
} as const;

// 日志级别常量
export const LOG_LEVELS = {
  ERROR: 'error',
  WARN: 'warn',
  INFO: 'info',
  DEBUG: 'debug',
  VERBOSE: 'verbose',
} as const;

// HTTP状态码常量
export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  INTERNAL_SERVER_ERROR: 500,
} as const;

// 正则表达式常量
export const REGEX_PATTERNS = {
  EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  PHONE: /^1[3-9]\d{9}$/,
  IP_ADDRESS:
    /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/,
  MAC_ADDRESS: /^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$/,
  UUID: /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
  PASSWORD: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{8,}$/,
} as const;

// 时间相关常量
export const TIME = {
  SECOND: 1000,
  MINUTE: 60 * 1000,
  HOUR: 60 * 60 * 1000,
  DAY: 24 * 60 * 60 * 1000,
  WEEK: 7 * 24 * 60 * 60 * 1000,
} as const;

// 客户端状态常量
export const CLIENT_STATUS = {
  ONLINE: 'online',
  OFFLINE: 'offline',
  IDLE: 'idle',
  BUSY: 'busy',
  ERROR: 'error',
} as const;

// 安全告警类型常量
export const SECURITY_ALERT_TYPES = {
  UNAUTHORIZED_ACCESS: 'unauthorized_access',
  SUSPICIOUS_ACTIVITY: 'suspicious_activity',
  MALWARE_DETECTED: 'malware_detected',
  NETWORK_INTRUSION: 'network_intrusion',
  DATA_BREACH: 'data_breach',
  SYSTEM_VULNERABILITY: 'system_vulnerability',
} as const;

// 系统通知类型常量
export const NOTIFICATION_TYPES = {
  INFO: 'info',
  WARNING: 'warning',
  ERROR: 'error',
  SUCCESS: 'success',
} as const;

// 用户角色常量
export const USER_ROLES = {
  ADMIN: 'admin',
  USER: 'user',
  VIEWER: 'viewer',
} as const;

// 文件类型常量
export const FILE_TYPES = {
  IMAGE: 'image',
  DOCUMENT: 'document',
  VIDEO: 'video',
  AUDIO: 'audio',
  ARCHIVE: 'archive',
  OTHER: 'other',
} as const;

// 数据库相关常量
export const DATABASE = {
  DEFAULT_CHARSET: 'utf8mb4',
  DEFAULT_COLLATION: 'utf8mb4_unicode_ci',
  CONNECTION_TIMEOUT: 60000,
  QUERY_TIMEOUT: 30000,
} as const;
