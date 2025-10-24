import { eq } from 'drizzle-orm';
import { db } from '@/lib/db/drizzle';
import { User, users } from '@/lib/db/schema';
import { setSession } from '@/lib/auth/session';
import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/payments/stripe';
import Stripe from 'stripe';
import { updateUserSubscription } from '@/lib/db/queries';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const sessionId = searchParams.get('session_id');

  if (!sessionId) {
    return NextResponse.redirect(new URL('/pricing', request.url));
  }

  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['customer', 'subscription', 'line_items.data.price.product'],
    });

    console.log('Stripe session details:', {
      id: session.id,
      mode: session.mode,
      customer: session.customer,
      client_reference_id: session.client_reference_id,
      status: session.status,
      payment_status: session.payment_status
    });

    const customerId = typeof session.customer === 'string' 
  ? session.customer 
  : session.customer?.id;

if (!customerId) {
  console.error('No customer ID found in Stripe session. Session details:', {
    sessionId: session.id,
    customer: session.customer,
    client_reference_id: session.client_reference_id
  });
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

    // 从 session metadata 中获取 useOwnApiKey 信息
    const useOwnApiKey = session.metadata?.useOwnApiKey === 'true';
    const premiumType = useOwnApiKey ? 'use_own_key' : 'use_elick';

    // 获取premium的失效时间为1个月
    const expiresAt = new Date();
    expiresAt.setMonth(expiresAt.getMonth() + 1);


    let updateData: any = {
      stripeCustomerId: customerId,
      updatedAt: new Date(),
      premiumType: premiumType, // 设置 premium 类型
      subscriptionExpiresAt: expiresAt,
    };

    if (session.mode === 'subscription') {
      const subscriptionId =
        typeof session.subscription === 'string'
          ? session.subscription
          : session.subscription?.id;

      if (!subscriptionId) {
        throw new Error('No subscription found for this session.');
      }

      const subscription = await stripe.subscriptions.retrieve(subscriptionId, {
        expand: ['items.data.price.product'],
      });

      const plan = subscription.items.data[0]?.price;

      if (!plan) {
        throw new Error('No plan found for this subscription.');
      }

      const productId = (plan.product as Stripe.Product).id;

      if (!productId) {
        throw new Error('No product ID found for this subscription.');
      }

      updateData = {
        ...updateData,
        stripeSubscriptionId: subscriptionId,
        stripeProductId: productId,
        planName: (plan.product as Stripe.Product).name,
        subscriptionStatus: subscription.status,
      };
    } else if (session.mode === 'payment') {
      const lineItem = session.line_items?.data[0];
      if (!lineItem) {
        throw new Error('No line items found in session.');
      }

      const product = lineItem.price?.product as Stripe.Product;
      if (!product) {
        throw new Error('No product found in line item.');
      }

      updateData = {
        ...updateData,
        stripeProductId: product.id,
        planName: product.name,
        subscriptionStatus: 'lifetime',
      };
    }

    await db
      .update(users)
      .set(updateData)
      .where(eq(users.id, user[0].id));

    if (session.mode === 'subscription') {
      await updateUserSubscription(user[0].id, {
        fastRequestsLimit: 1000,
        premiumRequestsLimit: 100
      });
    }

    await setSession(user[0]);

    // 直接重定向到订阅成功页面，该页面会生成深度链接推送到Tauri客户端
    const planName = updateData.planName || '订阅计划';
    const redirectUrl = new URL('/subscription-success', request.url);
    redirectUrl.searchParams.set('plan', planName);
    if (session.mode === 'payment') {
      redirectUrl.searchParams.set('type', 'lifetime');
    }

    console.log(`[Stripe Checkout] 重定向到订阅成功页面: ${redirectUrl.toString()}`);
    return NextResponse.redirect(redirectUrl);
  } catch (error) {
    console.error('Error handling successful checkout:', error);
    return NextResponse.redirect(new URL('/error', request.url));
  }
}
