import { NextRequest, NextResponse } from 'next/server';
import { adminMiddleware } from '@/lib/auth/admin';
import { createPromotion, getAllPromotions } from '@/lib/promotions';

export async function GET() {
  try {
    const userOrError = await adminMiddleware();

    if (userOrError instanceof Response) {
      return userOrError;
    }

    const promotions = await getAllPromotions();
    return NextResponse.json(promotions);
  } catch (error) {
    console.error('获取促销活动失败:', error);
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

    const promotion = await createPromotion({
      ...data,
      createdBy: userOrError.id,
    });

    return NextResponse.json(promotion);
  } catch (error) {
    console.error('创建促销活动失败:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
