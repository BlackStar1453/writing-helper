import { NextRequest, NextResponse } from 'next/server';
import { adminMiddleware } from '@/lib/auth/admin';
import {
  createPromoCode,
  updatePromoCode,
  getAllPromoCodes,
  validatePromoCode,
  generateRandomPromoCode,
  type CreatePromoCodeData
} from '@/lib/promo-codes';

// 获取所有促销码
export async function GET(request: NextRequest) {
  try {
    const userOrError = await adminMiddleware();
    
    if (userOrError instanceof Response) {
      return userOrError;
    }

    const { searchParams } = new URL(request.url);
    const includeInactive = searchParams.get('includeInactive') === 'true';

    const promoCodes = await getAllPromoCodes(includeInactive);

    return NextResponse.json({
      success: true,
      data: promoCodes
    });

  } catch (error) {
    console.error('获取促销码失败:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : '内部服务器错误'
    }, { status: 500 });
  }
}

// 创建促销码
export async function POST(request: NextRequest) {
  try {
    const userOrError = await adminMiddleware();
    
    if (userOrError instanceof Response) {
      return userOrError;
    }

    const body = await request.json();
    const { action, ...data } = body;

    switch (action) {
      case 'create':
        // 创建促销码
        const createData: CreatePromoCodeData = {
          name: data.name,
          description: data.description,
          code: data.code, // 可选，如果不提供将自动生成
          discountType: data.discountType,
          discountValue: data.discountValue,
          targetPlans: data.targetPlans,
          targetPaymentMethods: data.targetPaymentMethods,
          startTime: new Date(data.startTime),
          endTime: new Date(data.endTime),
          maxUses: data.maxUses,
          priority: data.priority,
          createdBy: userOrError.id,
        };

        const newPromoCode = await createPromoCode(createData);

        return NextResponse.json({
          success: true,
          message: '促销码创建成功',
          data: newPromoCode
        });

      case 'generate':
        // 生成随机促销码（不保存到数据库）
        const length = data.length || 8;
        const prefix = data.prefix || '';
        const randomCode = generateRandomPromoCode(length, prefix);

        return NextResponse.json({
          success: true,
          data: { code: randomCode }
        });

      case 'update':
        // 更新促销码
        if (!data.id) {
          return NextResponse.json({
            success: false,
            error: '缺少促销码ID'
          }, { status: 400 });
        }

        const updateData: Partial<CreatePromoCodeData> = {
          name: data.name,
          description: data.description,
          code: data.code,
          discountType: data.discountType,
          discountValue: data.discountValue,
          targetPlans: data.targetPlans,
          targetPaymentMethods: data.targetPaymentMethods,
          startTime: data.startTime ? new Date(data.startTime) : undefined,
          endTime: data.endTime ? new Date(data.endTime) : undefined,
          maxUses: data.maxUses,
          priority: data.priority,
        };

        const updatedPromoCode = await updatePromoCode(data.id, updateData);

        return NextResponse.json({
          success: true,
          message: '促销码更新成功',
          data: updatedPromoCode
        });

      case 'validate':
        // 验证促销码
        const validation = await validatePromoCode(
          data.code,
          data.planName,
          data.paymentMethod,
          data.originalPrice
        );

        return NextResponse.json({
          success: true,
          data: validation
        });

      default:
        return NextResponse.json({
          success: false,
          error: '未知操作'
        }, { status: 400 });
    }

  } catch (error) {
    console.error('促销码操作失败:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : '内部服务器错误'
    }, { status: 500 });
  }
}
