/**
 * 获取Stripe价格数据的API路由
 */

import { NextResponse } from 'next/server';
import { getStripePrices } from '@/lib/payments/stripe';

export async function GET() {
  try {
    // 添加超时保护
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('获取Stripe价格超时')), 30000); // 30秒超时
    });

    const pricesPromise = getStripePrices();

    const prices = await Promise.race([
      pricesPromise,
      timeoutPromise
    ]);

    return NextResponse.json({
      success: true,
      data: prices
    });
  } catch (error) {
    console.error('获取Stripe价格失败:', error);


    return NextResponse.json(
      { success: false, error: '获取Stripe价格失败' },
      { status: 500 }
    );
  }
}

// 设置缓存头
export const revalidate = 300; // 5分钟
