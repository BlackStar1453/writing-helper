import { NextRequest, NextResponse } from 'next/server';
import { adminMiddleware } from '../../../../../../lib/auth/admin';
import { db } from '../../../../../../lib/db/drizzle';
import { boosterOptions } from '../../../../../../lib/db/schema';
import { eq } from 'drizzle-orm';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const userOrError = await adminMiddleware();

    if (userOrError instanceof Response) {
      return userOrError;
    }

    const option = await db
      .select()
      .from(boosterOptions)
      .where(eq(boosterOptions.id, id))
      .limit(1);

    if (option.length === 0) {
      return NextResponse.json({ error: 'Booster option not found' }, { status: 404 });
    }

    return NextResponse.json(option[0]);
  } catch (error) {
    console.error('获取加油包配置失败:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const userOrError = await adminMiddleware();

    if (userOrError instanceof Response) {
      return userOrError;
    }

    const data = await request.json();

    // 验证类型（如果提供）
    if (data.type && !['premium', 'fast'].includes(data.type)) {
      return NextResponse.json({ error: 'Invalid type' }, { status: 400 });
    }

    // 验证数值（如果提供）
    if ((data.amount !== undefined && data.amount <= 0) ||
        (data.stripePrice !== undefined && data.stripePrice <= 0) ||
        (data.xorpayPrice !== undefined && data.xorpayPrice <= 0)) {
      return NextResponse.json({ error: 'Prices and amount must be positive' }, { status: 400 });
    }

    const updateData: any = {
      updatedAt: new Date(),
    };

    // 只更新提供的字段
    if (data.type !== undefined) updateData.type = data.type;
    if (data.name !== undefined) updateData.name = data.name;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.amount !== undefined) updateData.amount = data.amount;
    if (data.stripePrice !== undefined) updateData.stripePrice = data.stripePrice;
    if (data.xorpayPrice !== undefined) updateData.xorpayPrice = data.xorpayPrice;
    if (data.isPopular !== undefined) updateData.isPopular = data.isPopular;
    if (data.isActive !== undefined) updateData.isActive = data.isActive;
    if (data.sortOrder !== undefined) updateData.sortOrder = data.sortOrder;

    const updatedOption = await db
      .update(boosterOptions)
      .set(updateData)
      .where(eq(boosterOptions.id, id))
      .returning();

    if (updatedOption.length === 0) {
      return NextResponse.json({ error: 'Booster option not found' }, { status: 404 });
    }

    return NextResponse.json(updatedOption[0]);
  } catch (error) {
    console.error('更新加油包配置失败:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const userOrError = await adminMiddleware();

    if (userOrError instanceof Response) {
      return userOrError;
    }

    const deletedOption = await db
      .delete(boosterOptions)
      .where(eq(boosterOptions.id, id))
      .returning();

    if (deletedOption.length === 0) {
      return NextResponse.json({ error: 'Booster option not found' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Booster option deleted successfully' });
  } catch (error) {
    console.error('删除加油包配置失败:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
