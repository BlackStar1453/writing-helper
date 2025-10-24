/**
 * 安全配置文件
 * 集中管理所有安全相关的配置参数
 */

export const SECURITY_CONFIG = {
  // 速率限制配置
  RATE_LIMITS: {
    // 预检 API 限制
    PREFLIGHT: {
      PER_MINUTE: 5,        // 每分钟最多 5 次
      PER_HOUR: 30,         // 每小时最多 30 次
      WINDOW_MINUTE: 60 * 1000,     // 1 分钟窗口
      WINDOW_HOUR: 60 * 60 * 1000,  // 1 小时窗口
    },
    
    // 用户预热限制
    USER_WARMUP: {
      REQUESTS: 3,          // 每 5 分钟最多 3 次
      WINDOW: 5 * 60 * 1000, // 5 分钟窗口
    },
    
    // 全局 API 限制
    GLOBAL: {
      REQUESTS: 60,         // 每分钟最多 60 次
      WINDOW: 60 * 1000,    // 1 分钟窗口
    },
    
    // 管理员操作限制
    ADMIN: {
      GENERAL: { limit: 100, windowMs: 60 * 60 * 1000 },
      DELETE: { limit: 20, windowMs: 60 * 60 * 1000 },
      BATCH: { limit: 10, windowMs: 60 * 60 * 1000 },
    }
  },

  // 资源监控阈值
  RESOURCE_THRESHOLDS: {
    MEMORY: {
      WARNING: 80,          // 80% 内存使用率警告
      CRITICAL: 90,         // 90% 内存使用率临界
    },
    CONNECTIONS: {
      WARNING: 1000,        // 1000 个连接警告
      CRITICAL: 1500,       // 1500 个连接临界
    },
    CPU: {
      WARNING: 70,          // 70% CPU 使用率警告
      CRITICAL: 85,         // 85% CPU 使用率临界
    }
  },

  // 缓存安全配置
  CACHE: {
    MAX_KEY_LENGTH: 250,    // 最大缓存键长度
    MAX_VALUE_SIZE: 1024 * 1024, // 最大缓存值大小 (1MB)
    SUSPICIOUS_PATTERNS: [
      /\.\./,               // 路径遍历
      /<script/i,           // XSS 尝试
      /union.*select/i,     // SQL 注入尝试
      /javascript:/i,       // JavaScript 协议
    ]
  },

  // 请求验证配置
  REQUEST_VALIDATION: {
    MAX_REQUEST_SIZE: 10 * 1024 * 1024, // 最大请求大小 (10MB)
    MAX_HEADER_SIZE: 8 * 1024,          // 最大请求头大小 (8KB)
    ALLOWED_ORIGINS: [
      'http://localhost:3000',
      'https://yourdomain.com',
      // 添加其他允许的域名
    ],
    BLOCKED_USER_AGENTS: [
      /bot/i,
      /crawler/i,
      /spider/i,
      // 可以添加更多需要阻止的 User-Agent 模式
    ]
  },

  // 预热安全配置
  WARMUP: {
    MAX_CONCURRENT_WARMUPS: 10,     // 最大并发预热数
    WARMUP_TIMEOUT: 30 * 1000,      // 预热超时时间 (30秒)
    MAX_USER_WARMUPS_PER_HOUR: 50,  // 每小时最大用户预热次数
    COOLDOWN_PERIOD: 5 * 60 * 1000, // 预热冷却期 (5分钟)
  },

  // 安全事件配置
  SECURITY_EVENTS: {
    LOG_RETENTION: 24 * 60 * 60 * 1000, // 日志保留时间 (24小时)
    MAX_EVENTS_PER_IP: 1000,            // 每个 IP 最大事件数
    AUTO_BAN_THRESHOLD: 100,            // 自动封禁阈值
    BAN_DURATION: 60 * 60 * 1000,       // 封禁持续时间 (1小时)
  },

  // IP 白名单和黑名单
  IP_LISTS: {
    WHITELIST: [
      '127.0.0.1',
      '::1',
      // 添加信任的 IP 地址
    ],
    BLACKLIST: [
      // 添加需要阻止的 IP 地址
    ]
  },

  // 加密和哈希配置
  CRYPTO: {
    HASH_ROUNDS: 12,              // bcrypt 哈希轮数
    JWT_EXPIRY: 24 * 60 * 60,     // JWT 过期时间 (24小时)
    SESSION_SECRET_LENGTH: 32,     // 会话密钥长度
    ENCRYPTION_ALGORITHM: 'aes-256-gcm',
  },

  // 监控和告警配置
  MONITORING: {
    CHECK_INTERVAL: 30 * 1000,    // 监控检查间隔 (30秒)
    ALERT_COOLDOWN: 5 * 60 * 1000, // 告警冷却时间 (5分钟)
    MAX_ALERTS_PER_HOUR: 10,      // 每小时最大告警数
  }
} as const;

/**
 * 环境特定的安全配置
 */
export function getEnvironmentSecurityConfig() {
  const env = process.env.NODE_ENV || 'development';
  
  const envConfigs = {
    development: {
      // 开发环境相对宽松的配置
      RATE_LIMITS: {
        ...SECURITY_CONFIG.RATE_LIMITS,
        PREFLIGHT: {
          ...SECURITY_CONFIG.RATE_LIMITS.PREFLIGHT,
          PER_MINUTE: 20,   // 开发环境允许更多请求
        }
      }
    },
    
    production: {
      // 生产环境严格的配置
      RATE_LIMITS: {
        ...SECURITY_CONFIG.RATE_LIMITS,
        PREFLIGHT: {
          ...SECURITY_CONFIG.RATE_LIMITS.PREFLIGHT,
          PER_MINUTE: 3,    // 生产环境更严格
        }
      }
    },
    
    test: {
      // 测试环境配置
      RATE_LIMITS: {
        ...SECURITY_CONFIG.RATE_LIMITS,
        PREFLIGHT: {
          ...SECURITY_CONFIG.RATE_LIMITS.PREFLIGHT,
          PER_MINUTE: 100,  // 测试环境不限制
        }
      }
    }
  };

  return {
    ...SECURITY_CONFIG,
    ...envConfigs[env as keyof typeof envConfigs]
  };
}

/**
 * 验证安全配置
 */
export function validateSecurityConfig(): boolean {
  try {
    const config = getEnvironmentSecurityConfig();
    
    // 验证必要的配置项
    if (!config.RATE_LIMITS || !config.RESOURCE_THRESHOLDS) {
      console.error('缺少必要的安全配置');
      return false;
    }
    
    // 验证阈值合理性
    if (config.RESOURCE_THRESHOLDS.MEMORY.WARNING >= config.RESOURCE_THRESHOLDS.MEMORY.CRITICAL) {
      console.error('内存警告阈值不能大于等于临界阈值');
      return false;
    }
    
    if (config.RESOURCE_THRESHOLDS.CONNECTIONS.WARNING >= config.RESOURCE_THRESHOLDS.CONNECTIONS.CRITICAL) {
      console.error('连接数警告阈值不能大于等于临界阈值');
      return false;
    }
    
    console.log('✅ 安全配置验证通过');
    return true;
    
  } catch (error) {
    console.error('安全配置验证失败:', error);
    return false;
  }
}

/**
 * 获取当前环境的安全配置
 */
export const currentSecurityConfig = getEnvironmentSecurityConfig();

// 在模块加载时验证配置
if (process.env.NODE_ENV !== 'test') {
  validateSecurityConfig();
}
