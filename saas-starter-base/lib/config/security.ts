// 安全配置
export const SECURITY_CONFIG = {
  // 管理员操作限制
  admin: {
    // 速率限制
    rateLimit: {
      general: {
        limit: parseInt(process.env.ADMIN_MAX_OPERATIONS_PER_HOUR || '100'),
        windowMs: 60 * 60 * 1000 // 1小时
      },
      delete: {
        limit: parseInt(process.env.ADMIN_MAX_DELETE_PER_HOUR || '20'),
        windowMs: 60 * 60 * 1000
      },
      batch: {
        limit: parseInt(process.env.ADMIN_MAX_BATCH_PER_HOUR || '10'),
        windowMs: 60 * 60 * 1000
      }
    },
    
    // 批量操作限制
    batchLimits: {
      maxRecordsPerOperation: parseInt(process.env.ADMIN_MAX_BATCH_SIZE || '100'),
      requireConfirmForDelete: process.env.ADMIN_REQUIRE_DELETE_CONFIRM !== 'false'
    },
    
    // 会话配置
    session: {
      timeoutMs: parseInt(process.env.ADMIN_SESSION_TIMEOUT || '3600') * 1000, // 默认1小时
      requireReauth: process.env.ADMIN_REQUIRE_REAUTH === 'true'
    },
    
    // IP白名单（如果配置了）
    ipWhitelist: process.env.ADMIN_IP_WHITELIST?.split(',').map(ip => ip.trim()) || null
  },
  

  
  // 通知配置
  notifications: {
    enabled: process.env.SECURITY_NOTIFICATIONS_ENABLED === 'true',
    webhookUrl: process.env.SECURITY_WEBHOOK_URL,
    emailAlerts: process.env.SECURITY_EMAIL_ALERTS?.split(',').map(email => email.trim()) || []
  }
};

/**
 * 验证IP是否在白名单中
 */
export function isIPWhitelisted(ip: string): boolean {
  const whitelist = SECURITY_CONFIG.admin.ipWhitelist;
  if (!whitelist || whitelist.length === 0) {
    return true; // 没有配置白名单则允许所有IP
  }
  
  return whitelist.some(whitelistedIP => {
    // 支持CIDR格式的简单匹配
    if (whitelistedIP.includes('/')) {
      // 这里需要更复杂的CIDR匹配逻辑
      // 为简化，暂时只支持精确匹配
      return false;
    }
    return ip === whitelistedIP;
  });
}

/**
 * 检查是否在工作时间内
 */
export function isWorkingHours(): boolean {
  const now = new Date();
  const hour = now.getHours();
  const day = now.getDay(); // 0 = Sunday, 6 = Saturday
  
  // 工作日（周一到周五）的9:00-18:00
  const isWeekday = day >= 1 && day <= 5;
  const isWorkingHour = hour >= 9 && hour < 18;
  
  return isWeekday && isWorkingHour;
}

/**
 * 获取安全等级
 */
export function getSecurityLevel(): 'low' | 'medium' | 'high' {
  const config = SECURITY_CONFIG;
  
  let score = 0;
  
  // 检查各种安全配置
  if (config.admin.rateLimit.general.limit <= 50) score += 1;
  if (config.admin.batchLimits.requireConfirmForDelete) score += 2;
  if (config.admin.ipWhitelist && config.admin.ipWhitelist.length > 0) score += 2;
  if (config.notifications.enabled) score += 1;
  
  if (score >= 5) return 'high';
  if (score >= 3) return 'medium';
  return 'low';
}

/**
 * 生成安全报告
 */
export function generateSecurityReport() {
  const config = SECURITY_CONFIG;
  const securityLevel = getSecurityLevel();
  
  return {
    securityLevel,
    timestamp: new Date().toISOString(),
    configuration: {
      rateLimitEnabled: true,
      ipWhitelistEnabled: !!config.admin.ipWhitelist,
      notificationsEnabled: config.notifications.enabled,
      deleteConfirmationRequired: config.admin.batchLimits.requireConfirmForDelete
    },
    limits: {
      maxOperationsPerHour: config.admin.rateLimit.general.limit,
      maxBatchSize: config.admin.batchLimits.maxRecordsPerOperation,
      sessionTimeout: config.admin.session.timeoutMs / 1000 / 60 // 转换为分钟
    },
    recommendations: generateSecurityRecommendations(securityLevel)
  };
}

function generateSecurityRecommendations(level: 'low' | 'medium' | 'high'): string[] {
  const recommendations = [];
  
  if (level === 'low') {
    recommendations.push('建议启用IP白名单限制管理员访问');
    recommendations.push('建议降低操作频率限制');
    recommendations.push('建议启用安全通知');
  }
  
  if (level === 'medium') {
    recommendations.push('考虑启用多因素认证');
    recommendations.push('定期审查管理员操作日志');
  }
  
  if (level === 'high') {
    recommendations.push('当前安全配置良好，建议定期检查');
    recommendations.push('考虑添加更多异常检测规则');
  }
  
  return recommendations;
}
