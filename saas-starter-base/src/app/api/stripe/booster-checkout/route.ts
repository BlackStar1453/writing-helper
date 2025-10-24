import { eq } from 'drizzle-orm';
import { db } from '@/lib/db/drizzle';
import { users } from '@/lib/db/schema';
import { setSession } from '@/lib/auth/session';
import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/payments/stripe';
import { handleBoosterPaymentSuccess } from '@/lib/payments/booster-payments';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const sessionId = searchParams.get('session_id');

  if (!sessionId) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['customer', 'line_items.data.price.product'],
    });

    console.log('Stripe 加油包支付 session details:', {
      id: session.id,
      mode: session.mode,
      customer: session.customer,
      client_reference_id: session.client_reference_id,
      status: session.status,
      payment_status: session.payment_status,
      metadata: session.metadata
    });

    const customerId = typeof session.customer === 'string' 
      ? session.customer 
      : session.customer?.id;

    if (!customerId) {
      console.error('No customer ID found in Stripe session.');
      throw new Error('No customer ID found in Stripe session.');
    }

    const userId = session.client_reference_id;
    
    if (!userId) {
      throw new Error("No user ID found in session's client_reference_id.");
    }

    const user = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (user.length === 0) {
      throw new Error('User not found in database.');
    }

    // 检查是否是加油包支付
    if (session.metadata?.type === 'usage_booster' && session.mode === 'payment') {
      await handleBoosterPaymentSuccess(session, user[0]);
      console.log('加油包购买成功处理完成');
    } else {
      throw new Error('Invalid booster payment session.');
    }

    await setSession(user[0]);

    // 直接重定向到订阅成功页面，该页面会生成深度链接推送到Tauri客户端
    const redirectUrl = new URL('/subscription-success', request.url);
    redirectUrl.searchParams.set('plan', '加油包');
    redirectUrl.searchParams.set('type', 'booster');

    console.log(`[Booster Checkout] 重定向到订阅成功页面: ${redirectUrl.toString()}`);
    return NextResponse.redirect(redirectUrl);

  } catch (error) {
    console.error('Error processing booster payment:', error);
    return NextResponse.redirect(new URL('/dashboard?booster=error', request.url));
  }
} 