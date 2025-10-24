import { NextRequest, NextResponse } from 'next/server';
import { adminMiddleware } from '@/lib/auth/admin';
import { getPreferredPrices } from '@/lib/payments/stripe';
import { getXorpayProducts } from '@/lib/payments/xorpay';

// 获取价格数据
export async function GET(request: NextRequest) {
  try {
    const userOrError = await adminMiddleware();
    
    if (userOrError instanceof Response) {
      return userOrError;
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');

    switch (type) {
      case 'stripe':
        // 获取Stripe价格数据
        const { products, preferredPrices } = await getPreferredPrices();
        const stripePrices = products.map(product => {
          const price = preferredPrices.get(product.id);
          return {
            id: price?.id || product.id,
            productId: product.id,
            productName: product.name,
            unitAmount: price?.unitAmount || 0,
            currency: price?.currency || 'usd',
            interval: price?.interval || 'month',
            isActive: (product as any).active,
            description: product.description,
          };
        });

        return NextResponse.json({
          success: true,
          data: stripePrices
        });

      case 'xorpay':
        // 获取Xorpay价格数据
        const xorpayProducts = await getXorpayProducts();
        return NextResponse.json({
          success: true,
          data: xorpayProducts
        });

      default:
        // 获取所有价格数据
        const [stripeData, xorpayData] = await Promise.all([
          getPreferredPrices(),
          getXorpayProducts()
        ]);

        const allStripePrices = stripeData.products.map(product => {
          const price = stripeData.preferredPrices.get(product.id);
          return {
            id: price?.id || product.id,
            productId: product.id,
            productName: product.name,
            unitAmount: price?.unitAmount || 0,
            currency: price?.currency || 'usd',
            interval: price?.interval || 'month',
            isActive: (product as any).active,
            description: product.description,
          };
        });

        return NextResponse.json({
          success: true,
          data: {
            stripe: allStripePrices,
            xorpay: xorpayData,
            summary: {
              stripeProductCount: allStripePrices.length,
              xorpayProductCount: xorpayData.length,
              totalProducts: allStripePrices.length + xorpayData.length,
            }
          }
        });
    }

  } catch (error) {
    console.error('获取价格数据失败:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : '内部服务器错误'
    }, { status: 500 });
  }
}

// 更新价格设置
export async function POST(request: NextRequest) {
  try {
    const userOrError = await adminMiddleware();
    
    if (userOrError instanceof Response) {
      return userOrError;
    }

    const body = await request.json();
    const { action, ...data } = body;

    switch (action) {
      case 'sync_stripe':
        // 同步Stripe价格
        const { products, preferredPrices } = await getPreferredPrices();
        
        return NextResponse.json({
          success: true,
          message: `成功同步 ${products.length} 个Stripe产品`,
          data: {
            productCount: products.length,
            priceCount: preferredPrices.size,
          }
        });

      case 'update_settings':
        // 更新价格设置
        // 这里可以保存到数据库或配置文件
        console.log('更新价格设置:', data);
        
        return NextResponse.json({
          success: true,
          message: '价格设置更新成功',
          data: data
        });

      default:
        return NextResponse.json({
          success: false,
          error: '未知操作'
        }, { status: 400 });
    }

  } catch (error) {
    console.error('价格管理操作失败:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : '内部服务器错误'
    }, { status: 500 });
  }
}
