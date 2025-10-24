import { NextRequest, NextResponse } from 'next/server';
import { adminMiddleware } from '@/lib/auth/admin';
import { updatePromotion, deletePromotion, getPromotionById } from '@/lib/promotions';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userOrError = await adminMiddleware();

    if (userOrError instanceof Response) {
      return userOrError;
    }

    const { id } = await params;
    const promotion = await getPromotionById(id);

    if (!promotion) {
      return NextResponse.json({ error: 'Promotion not found' }, { status: 404 });
    }

    return NextResponse.json(promotion);
  } catch (error) {
    console.error('获取促销活动失败:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userOrError = await adminMiddleware();

    if (userOrError instanceof Response) {
      return userOrError;
    }

    const { id } = await params;
    const data = await request.json();

    console.log('更新促销活动 - ID:', id);
    console.log('更新数据:', JSON.stringify(data, null, 2));

    const promotion = await updatePromotion(id, data);

    if (!promotion) {
      return NextResponse.json({ error: 'Promotion not found' }, { status: 404 });
    }

    console.log('促销活动更新成功:', promotion.id);
    return NextResponse.json(promotion);
  } catch (error) {
    console.error('更新促销活动失败:', error);
    console.error('错误堆栈:', error instanceof Error ? error.stack : 'Unknown error');
    return NextResponse.json({
      error: 'Internal Server Error',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userOrError = await adminMiddleware();

    if (userOrError instanceof Response) {
      return userOrError;
    }

    const { id } = await params;
    const data = await request.json();

    const promotion = await updatePromotion(id, data);

    if (!promotion) {
      return NextResponse.json({ error: 'Promotion not found' }, { status: 404 });
    }

    return NextResponse.json(promotion);
  } catch (error) {
    console.error('更新促销活动失败:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userOrError = await adminMiddleware();

    if (userOrError instanceof Response) {
      return userOrError;
    }

    const { id } = await params;
    const success = await deletePromotion(id);

    if (!success) {
      return NextResponse.json({ error: 'Promotion not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('删除促销活动失败:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
