/**
 * 获取Xorpay产品数据的API路由
 */

import { NextResponse } from 'next/server';
import { getXorpayProducts } from '@/lib/payments/xorpay';

export async function GET() {
  try {
    const products = getXorpayProducts();
    
    return NextResponse.json({
      success: true,
      data: products
    });
  } catch (error) {
    console.error('获取Xorpay产品失败:', error);
    return NextResponse.json(
      { success: false, error: '获取Xorpay产品失败' },
      { status: 500 }
    );
  }
}

// 设置缓存头 - Xorpay产品是静态数据，可以缓存更长时间
export const revalidate = 3600; // 1小时
