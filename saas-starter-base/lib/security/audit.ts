/**
 * 安全审计模块
 * 监控和记录可疑活动
 */

import { redisCache } from '../redis';

interface SecurityEvent {
  userId?: string;
  clientIP: string;
  userAgent?: string;
  action: string;
  details: any;
  timestamp: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

interface SuspiciousActivity {
  userId?: string;
  clientIP: string;
  activityType: string;
  count: number;
  firstSeen: number;
  lastSeen: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

export class SecurityAuditor {
  private static instance: SecurityAuditor;
  private suspiciousActivities = new Map<string, SuspiciousActivity>();

  static getInstance(): SecurityAuditor {
    if (!SecurityAuditor.instance) {
      SecurityAuditor.instance = new SecurityAuditor();
    }
    return SecurityAuditor.instance;
  }

  /**
   * 记录安全事件
   */
  async logSecurityEvent(event: Omit<SecurityEvent, 'timestamp'>): Promise<void> {
    const fullEvent: SecurityEvent = {
      ...event,
      timestamp: Date.now()
    };

    try {
      // 记录到 Redis（保留 24 小时）
      const eventKey = `security_event:${Date.now()}:${Math.random().toString(36).substr(2, 9)}`;
      await redisCache.set(eventKey, fullEvent, 86400);

      // 检查是否为可疑活动
      await this.checkSuspiciousActivity(fullEvent);

      // 高严重性事件立即告警
      if (event.severity === 'critical' || event.severity === 'high') {
        console.error(`🚨 [SECURITY] ${event.severity.toUpperCase()} 安全事件:`, {
          action: event.action,
          userId: event.userId,
          clientIP: event.clientIP,
          details: event.details
        });
      }

    } catch (error) {
      console.error('记录安全事件失败:', error);
    }
  }

  /**
   * 检查可疑活动模式
   */
  private async checkSuspiciousActivity(event: SecurityEvent): Promise<void> {
    const key = `${event.clientIP}:${event.action}`;
    const existing = this.suspiciousActivities.get(key);
    const now = Date.now();

    if (existing) {
      existing.count++;
      existing.lastSeen = now;
      
      // 检查是否需要升级严重性
      if (existing.count > 50) {
        existing.severity = 'critical';
      } else if (existing.count > 20) {
        existing.severity = 'high';
      } else if (existing.count > 10) {
        existing.severity = 'medium';
      }
    } else {
      this.suspiciousActivities.set(key, {
        userId: event.userId,
        clientIP: event.clientIP,
        activityType: event.action,
        count: 1,
        firstSeen: now,
        lastSeen: now,
        severity: 'low'
      });
    }

    // 清理过期的活动记录（超过 1 小时）
    this.cleanupOldActivities();
  }

  /**
   * 清理过期的活动记录
   */
  private cleanupOldActivities(): void {
    const oneHourAgo = Date.now() - (60 * 60 * 1000);
    
    for (const [key, activity] of this.suspiciousActivities.entries()) {
      if (activity.lastSeen < oneHourAgo) {
        this.suspiciousActivities.delete(key);
      }
    }
  }

  /**
   * 检查 IP 是否可疑
   */
  isIPSuspicious(clientIP: string): boolean {
    for (const [key, activity] of this.suspiciousActivities.entries()) {
      if (activity.clientIP === clientIP && 
          (activity.severity === 'high' || activity.severity === 'critical')) {
        return true;
      }
    }
    return false;
  }

  /**
   * 检查用户是否可疑
   */
  isUserSuspicious(userId: string): boolean {
    for (const [key, activity] of this.suspiciousActivities.entries()) {
      if (activity.userId === userId && 
          (activity.severity === 'high' || activity.severity === 'critical')) {
        return true;
      }
    }
    return false;
  }

  /**
   * 获取可疑活动报告
   */
  getSuspiciousActivitiesReport(): SuspiciousActivity[] {
    return Array.from(this.suspiciousActivities.values())
      .filter(activity => activity.severity !== 'low')
      .sort((a, b) => {
        const severityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
        return severityOrder[b.severity] - severityOrder[a.severity];
      });
  }

  /**
   * 获取安全统计
   */
  getSecurityStats() {
    const activities = Array.from(this.suspiciousActivities.values());
    
    return {
      totalSuspiciousActivities: activities.length,
      criticalActivities: activities.filter(a => a.severity === 'critical').length,
      highActivities: activities.filter(a => a.severity === 'high').length,
      mediumActivities: activities.filter(a => a.severity === 'medium').length,
      uniqueIPs: new Set(activities.map(a => a.clientIP)).size,
      uniqueUsers: new Set(activities.map(a => a.userId).filter(Boolean)).size
    };
  }
}

// 导出单例实例
export const securityAuditor = SecurityAuditor.getInstance();

/**
 * 预定义的安全事件记录函数
 */
export const SecurityEvents = {
  /**
   * 记录预检 API 滥用
   */
  preflightAbuse: async (userId: string, clientIP: string, userAgent?: string) => {
    await securityAuditor.logSecurityEvent({
      userId,
      clientIP,
      userAgent,
      action: 'preflight_abuse',
      details: { reason: 'Excessive preflight requests' },
      severity: 'medium'
    });
  },

  /**
   * 记录速率限制触发
   */
  rateLimitHit: async (userId: string, clientIP: string, endpoint: string, userAgent?: string) => {
    await securityAuditor.logSecurityEvent({
      userId,
      clientIP,
      userAgent,
      action: 'rate_limit_hit',
      details: { endpoint },
      severity: 'low'
    });
  },

  /**
   * 记录认证失败
   */
  authFailure: async (clientIP: string, reason: string, userAgent?: string) => {
    await securityAuditor.logSecurityEvent({
      clientIP,
      userAgent,
      action: 'auth_failure',
      details: { reason },
      severity: 'medium'
    });
  },

  /**
   * 记录可疑的预热请求
   */
  suspiciousWarmup: async (userId: string, clientIP: string, details: any, userAgent?: string) => {
    await securityAuditor.logSecurityEvent({
      userId,
      clientIP,
      userAgent,
      action: 'suspicious_warmup',
      details,
      severity: 'high'
    });
  },

  /**
   * 记录资源耗尽攻击
   */
  resourceExhaustion: async (clientIP: string, resourceType: string, userAgent?: string) => {
    await securityAuditor.logSecurityEvent({
      clientIP,
      userAgent,
      action: 'resource_exhaustion',
      details: { resourceType },
      severity: 'critical'
    });
  }
};
