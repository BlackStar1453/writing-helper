import { NextRequest, NextResponse } from 'next/server';
import { adminMiddleware } from '../../../../../lib/auth/admin';
import { db } from '../../../../../lib/db/drizzle';
import { boosterOptions } from '../../../../../lib/db/schema';
import { eq, asc } from 'drizzle-orm';

export async function GET() {
  try {
    const userOrError = await adminMiddleware();

    if (userOrError instanceof Response) {
      return userOrError;
    }

    const options = await db
      .select()
      .from(boosterOptions)
      .orderBy(asc(boosterOptions.sortOrder), asc(boosterOptions.createdAt));

    return NextResponse.json(options);
  } catch (error) {
    console.error('获取加油包配置失败:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const userOrError = await adminMiddleware();

    if (userOrError instanceof Response) {
      return userOrError;
    }

    const data = await request.json();

    // 验证必需字段
    if (!data.type || !data.name || !data.description || !data.amount || !data.stripePrice || !data.xorpayPrice) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // 验证类型
    if (!['premium', 'fast'].includes(data.type)) {
      return NextResponse.json({ error: 'Invalid type' }, { status: 400 });
    }

    // 验证数值
    if (data.amount <= 0 || data.stripePrice <= 0 || data.xorpayPrice <= 0) {
      return NextResponse.json({ error: 'Prices and amount must be positive' }, { status: 400 });
    }

    const newOption = await db
      .insert(boosterOptions)
      .values({
        type: data.type,
        name: data.name,
        description: data.description,
        amount: data.amount,
        stripePrice: data.stripePrice,
        xorpayPrice: data.xorpayPrice,
        isPopular: data.isPopular || false,
        isActive: data.isActive !== undefined ? data.isActive : true,
        sortOrder: data.sortOrder || 0,
      })
      .returning();

    return NextResponse.json(newOption[0]);
  } catch (error) {
    console.error('创建加油包配置失败:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
