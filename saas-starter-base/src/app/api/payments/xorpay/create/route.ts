import { NextRequest, NextResponse } from 'next/server';
import { createXorpayOrder } from '@/lib/payments/xorpay';
import { getUser } from '@/lib/db/queries';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const productName = searchParams.get('productName');
    const useOwnApiKey = searchParams.get('useOwnApiKey') === 'true';
    const payment = searchParams.get('payment');

    console.log('🧪 Xorpay 测试支付请求:', {
      productName,
      useOwnApiKey,
      payment
    });

    if (!productName || payment !== 'xorpay') {
      return NextResponse.json(
        { error: '缺少必要参数' },
        { status: 400 }
      );
    }

    const user = await getUser();
    if (!user) {
      return NextResponse.redirect(new URL('/sign-in', request.url));
    }

    // 创建 Xorpay 订单
    const result = await createXorpayOrder({
      user,
      productName,
      priceId: 'test-premium',
      isAnnual: false,
      annualDiscount: 0,
      useOwnApiKey,
      apiKeyDiscount: 0,
      promoCode: undefined,
      promoDiscount: 0
    });

    if (result.success) {
      // 重定向到支付页面
      const paymentUrl = `/payment/xorpay?orderId=${result.orderId}&paymentUrl=${encodeURIComponent(result.paymentUrl)}&qrCode=${encodeURIComponent(result.qrCode)}&productName=${encodeURIComponent(result.productName)}&price=${result.price}`;
      return NextResponse.redirect(new URL(paymentUrl, request.url));
    } else {
      return NextResponse.json(
        { error: '创建支付订单失败' },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('Xorpay 测试支付失败:', error);
    return NextResponse.json(
      { error: '服务器错误' },
      { status: 500 }
    );
  }
}
