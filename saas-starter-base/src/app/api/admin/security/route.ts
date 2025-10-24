import { NextResponse } from 'next/server';
import { verifyAdminAPI } from '@/lib/auth/admin-middleware';
import { getAdminRateLimitStatus } from '@/lib/security/rate-limiter';
import { generateSecurityReport } from '@/lib/config/security';

// GET - 获取安全状态和监控信息（管理员）
export async function GET() {
  try {
    const authResult = await verifyAdminAPI();
    if (!authResult.success) {
      return NextResponse.json(
        { error: authResult.error },
        { status: authResult.status }
      );
    }

    const adminUserId = authResult.user?.id;

    if (!adminUserId) {
      return NextResponse.json(
        { error: 'Admin user ID not found' },
        { status: 400 }
      );
    }

    // 获取安全报告
    const securityReport = generateSecurityReport();

    // 获取速率限制状态
    const rateLimitStatus = {
      general: getAdminRateLimitStatus(adminUserId, 'general'),
      batch: getAdminRateLimitStatus(adminUserId, 'batch'),
      delete: getAdminRateLimitStatus(adminUserId, 'delete')
    };

    return NextResponse.json({
      securityReport,
      currentAdmin: {
        userId: adminUserId,
        rateLimitStatus
      },
      systemHealth: {
        status: 'healthy',
        lastCheck: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('获取安全状态失败:', error);
    return NextResponse.json(
      { error: '获取安全状态失败' },
      { status: 500 }
    );
  }
}
