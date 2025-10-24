/**
 * 获取Stripe产品数据的API路由
 */

import { NextResponse } from 'next/server';
import { getStripeProducts } from '@/lib/payments/stripe';

export async function GET() {
  try {
    // 添加超时保护
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('获取Stripe产品超时')), 30000); // 30秒超时
    });

    const productsPromise = getStripeProducts();

    const products = await Promise.race([
      productsPromise,
      timeoutPromise
    ]);

    return NextResponse.json({
      success: true,
      data: products
    });
  } catch (error) {
    console.error('获取Stripe产品失败:', error);


    return NextResponse.json(
      { success: false, error: '获取Stripe产品失败' },
      { status: 500 }
    );
  }
}

// 设置缓存头
export const revalidate = 300; // 5分钟
