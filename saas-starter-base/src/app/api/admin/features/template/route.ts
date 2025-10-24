import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/drizzle';
import { features } from '@/lib/db/schema';
import { adminMiddleware } from '@/lib/auth/admin';

// 获取功能翻译模板
export async function GET(request: NextRequest) {
  try {
    // 验证管理员权限
    const adminResult = await adminMiddleware(request);
    if (adminResult instanceof Response) {
      return adminResult;
    }

    // 获取所有功能的基本信息
    const allFeatures = await db
      .select({
        id: features.id,
        title: features.title,
        description: features.description
      })
      .from(features)
      .orderBy(features.createdAt);

    // 生成翻译模板
    const template = {
      locale: "ja", // 示例语言代码，用户需要修改
      translations: allFeatures.map(feature => ({
        featureId: feature.id,
        title: `[请翻译] ${feature.title}`,
        description: `[请翻译] ${feature.description}`
      }))
    };

    return NextResponse.json({
      success: true,
      template,
      totalFeatures: allFeatures.length
    });
  } catch (error) {
    console.error('获取翻译模板失败:', error);
    return NextResponse.json(
      { success: false, error: '获取翻译模板失败' },
      { status: 500 }
    );
  }
}
