import Stripe from 'stripe';
import { redirect } from 'next/navigation';
import { User } from '@/lib/db/schema';
import {
  getUser,
  getUserByEmail,
  updateUser,
  updateUserSubscription
} from '@/lib/db/queries';
import { findBestAutoPromotion, applyPromotion } from '@/lib/promotions';

// 根据环境自动选择 Stripe 密钥
const getStripeSecretKey = () => {

  const isProduction = process.env.NODE_ENV === 'production';
  const testKey = process.env.STRIPE_SECRET_KEY_TEST;
  const liveKey = process.env.STRIPE_SECRET_KEY_LIVE;

  if (isProduction) {
    if (!liveKey || liveKey === 'sk_live_your_live_secret_key') {
      console.warn('⚠️ 生产环境未配置有效的 STRIPE_SECRET_KEY_LIVE，回退到 STRIPE_SECRET_KEY');
      return process.env.STRIPE_SECRET_KEY!;
    }
    return liveKey;
  } else {
    if (!testKey) {
      console.warn('⚠️ 开发环境未配置 STRIPE_SECRET_KEY_TEST，回退到 STRIPE_SECRET_KEY');
      return process.env.STRIPE_SECRET_KEY!;
    }
    return testKey;
  }
};

export const stripe = new Stripe(getStripeSecretKey(), {
  apiVersion: '2025-07-30.basil'
});

// 简单的内存缓存，用于缓存Stripe API调用结果
const cache = new Map<string, { data: any; timestamp: number; ttl: number }>();

function getCachedData<T>(key: string): T | null {
  const cached = cache.get(key);
  if (!cached) return null;

  const now = Date.now();
  if (now - cached.timestamp > cached.ttl) {
    cache.delete(key);
    return null;
  }

  return cached.data as T;
}

function setCachedData<T>(key: string, data: T, ttlMs: number = 300000): void { // 默认5分钟缓存
  cache.set(key, {
    data,
    timestamp: Date.now(),
    ttl: ttlMs
  });
}

export async function createCheckoutSession({
  user,
  priceId,
  isAnnual = false,
  annualDiscount = 0,
  useOwnApiKey = false,
  apiKeyDiscount = 0,
  promoCode,
  promoDiscount = 0
}: {
  user: User | null;
  priceId: string;
  isAnnual?: boolean;
  annualDiscount?: number;
  useOwnApiKey?: boolean;
  apiKeyDiscount?: number;
  promoCode?: string;
  promoDiscount?: number;
}) {
  const currentUser = user || await getUser();

  if (!currentUser) {
    redirect(`/sign-up?redirect=checkout&priceId=${priceId}`);
  }

  // 获取价格信息以确定支付模式
  const price = await stripe.prices.retrieve(priceId);
  const product = await stripe.products.retrieve(price.product as string);

  const isOneTime = product.name === 'Lifetime';
  const planName = product.name;
  const isPremiumPlan = planName === 'Premium';

  // 计算最终价格（包含年付折扣）
  let finalUnitAmount = price.unit_amount || 0;
  let isCustomPrice = false;

  if (isPremiumPlan && isAnnual && annualDiscount > 0) {
    // 年付：月价格 * 12 * (1 - 折扣率)
    const monthlyPrice = finalUnitAmount;
    const yearlyPrice = monthlyPrice * 12;
    finalUnitAmount = Math.round(yearlyPrice * (1 - annualDiscount / 100));
    isCustomPrice = true;
  }

  // 处理API密钥折扣（仅对Premium计划有效）
  if (isPremiumPlan && useOwnApiKey && apiKeyDiscount > 0) {
    // API密钥折扣：应用在最终价格上
    finalUnitAmount = Math.round(finalUnitAmount * (1 - apiKeyDiscount / 100));
    isCustomPrice = true;
  }

  // 处理促销码折扣
  let promotion;
  let hasManualPromoCode = false;

  if (promoCode && promoDiscount > 0) {
    // 用户手动输入了促销码，优先使用
    hasManualPromoCode = true;
    const discountAmount = Math.round(promoDiscount * 100); // 转换为分
    const finalPrice = Math.max(0, finalUnitAmount - discountAmount);

    promotion = {
      promotion: {
        id: 'manual-promo',
        name: `手动促销码: ${promoCode}`,
        code: promoCode,
      },
      originalPrice: finalUnitAmount,
      discountAmount: discountAmount,
      finalPrice: finalPrice,
    };
  } else {
    // 查找最佳自动促销活动（基于原价格，不包括促销码）
    promotion = await findBestAutoPromotion(planName, 'stripe', price.unit_amount || 0);
  }

  // 确保用户有 Stripe customer ID，如果没有则创建一个
  let customerId = currentUser.stripeCustomerId;

  if (!customerId) {
    // 创建新的 Stripe customer
    const customer = await stripe.customers.create({
      email: currentUser.email,
      name: currentUser.name || undefined,
      metadata: {
        userId: currentUser.id.toString()
      }
    });

    customerId = customer.id;

    // 更新用户记录中的 stripeCustomerId
    await updateUser(currentUser.id, {
      stripeCustomerId: customerId
    });
  }

  let sessionConfig: Stripe.Checkout.SessionCreateParams;

  if (promotion.promotion || isCustomPrice) {
    // 有促销活动或年付折扣，使用自定义价格
    const customUnitAmount = promotion.promotion ? promotion.finalPrice : finalUnitAmount;
    const customInterval = isAnnual ? 'year' : (price.recurring?.interval || 'month');

    sessionConfig = {
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: isAnnual ? `${product.name} (Annual)` : product.name,
              description: isAnnual
                ? `${product.description || ''} - Annual subscription with ${annualDiscount}% discount`
                : product.description || undefined,
              metadata: {
                originalPriceId: priceId,
                ...(promotion.promotion && {
                  promotionId: promotion.promotion.id,
                  originalPrice: promotion.originalPrice.toString(),
                  discountAmount: promotion.discountAmount.toString(),
                }),
                ...(isAnnual && {
                  isAnnual: 'true',
                  annualDiscount: annualDiscount.toString(),
                  originalMonthlyPrice: (price.unit_amount || 0).toString(),
                }),
                ...(useOwnApiKey && {
                  useOwnApiKey: 'true',
                  apiKeyDiscount: apiKeyDiscount.toString(),
                })
              }
            },
            unit_amount: customUnitAmount,
            ...(isOneTime ? {} : { recurring: { interval: customInterval as 'month' | 'year' } })
          },
          quantity: 1
        }
      ],
      mode: isOneTime ? 'payment' : 'subscription',
      success_url: `${process.env.BASE_URL}/api/stripe/checkout?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.BASE_URL}/pricing`,
      customer: customerId,
      client_reference_id: currentUser.id.toString(),
      metadata: {
        ...(promotion.promotion && {
          promotionId: promotion.promotion.id,
          originalPrice: promotion.originalPrice.toString(),
          discountAmount: promotion.discountAmount.toString(),
          ...(hasManualPromoCode && {
            manualPromoCode: promoCode,
            isManualPromo: 'true',
          }),
        }),
        planName,
        ...(isAnnual && {
          isAnnual: 'true',
          annualDiscount: annualDiscount.toString(),
        }),
        ...(useOwnApiKey && {
          useOwnApiKey: 'true',
          apiKeyDiscount: apiKeyDiscount.toString(),
        })
      }
    };
  } else {
    // 没有促销活动，使用原价格
    sessionConfig = {
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1
        }
      ],
      mode: isOneTime ? 'payment' : 'subscription',
      success_url: `${process.env.BASE_URL}/api/stripe/checkout?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.BASE_URL}/pricing`,
      customer: customerId,
      client_reference_id: currentUser.id.toString(),
      allow_promotion_codes: true,
    };
  }

  const session = await stripe.checkout.sessions.create(sessionConfig);

  redirect(session.url!);
}

export async function createCustomerPortalSession(user: User) {
  if (!user.stripeCustomerId || !user.stripeProductId) {
    redirect('/pricing');
  }

  let configuration: Stripe.BillingPortal.Configuration;
  const configurations = await stripe.billingPortal.configurations.list();

  if (configurations.data.length > 0) {
    configuration = configurations.data[0];
  } else {
    const product = await stripe.products.retrieve(user.stripeProductId);
    if (!product.active) {
      throw new Error("User's product is not active in Stripe");
    }

    const prices = await stripe.prices.list({
      product: product.id,
      active: true
    });
    if (prices.data.length === 0) {
      throw new Error("No active prices found for the user's product");
    }

    configuration = await stripe.billingPortal.configurations.create({
      business_profile: {
        headline: 'Manage your subscription'
      },
      features: {
        subscription_update: {
          enabled: true,
          default_allowed_updates: ['price', 'quantity', 'promotion_code'],
          proration_behavior: 'create_prorations',
          products: [
            {
              product: product.id,
              prices: prices.data.map((price) => price.id)
            }
          ]
        },
        subscription_cancel: {
          enabled: true,
          mode: 'at_period_end',
          cancellation_reason: {
            enabled: true,
            options: [
              'too_expensive',
              'missing_features',
              'switched_service',
              'unused',
              'other'
            ]
          }
        },
        payment_method_update: {
          enabled: true
        }
      }
    });
  }

  return stripe.billingPortal.sessions.create({
    customer: user.stripeCustomerId,
    return_url: `${process.env.BASE_URL}/dashboard`,
    configuration: configuration.id
  });
}

export async function handleSubscriptionChange(
  subscription: Stripe.Subscription
) {
  const customerId = subscription.customer as string;
  const subscriptionId = subscription.id;
  const status = subscription.status;

  // 获取客户信息以找到用户邮箱
  const customer = await stripe.customers.retrieve(customerId) as Stripe.Customer;

  if (!customer || !customer.email) {
    console.error('Customer not found or missing email:', customerId);
    return;
  }

  // 通过邮箱查找用户
  const user = await getUserByEmail(customer.email);

  if (!user) {
    console.error('User not found for Stripe customer email:', customer.email);
    return;
  }

  console.log(`处理订阅状态变化: ${user.email} -> ${status}`);

  // 导入同步服务
  const { generateUserSyncDeepLink } = await import('../user-sync-notification');

  if (status === 'active') {
    const plan = subscription.items.data[0]?.plan;
    const product = await stripe.products.retrieve(plan?.product as string);

    // 计算订阅到期时间
    const expiresAt = new Date((subscription as any).current_period_end * 1000);

    // 从订阅的 metadata 中获取 useOwnApiKey 信息
    const useOwnApiKey = subscription.metadata?.useOwnApiKey === 'true';
    const premiumType = useOwnApiKey ? 'use_own_key' : 'use_elick';

    // 激活订阅
    await updateUser(user.id, {
      stripeSubscriptionId: subscriptionId,
      stripeProductId: plan?.product as string,
      planName: product.name,
      subscriptionStatus: status,
      subscriptionInterval: plan?.interval || 'month', // 记录订阅间隔
      subscriptionExpiresAt: expiresAt, // 记录到期时间
      premiumType: premiumType, // 设置 premium 类型
    });

    console.log(`用户 ${user.email} 订阅激活，到期时间: ${expiresAt.toISOString()}`);

    // 生成同步深度链接
    const syncUrl = await generateUserSyncDeepLink(user.id);
    if (syncUrl) {
      console.log(`[Stripe] 为用户 ${user.email} 生成订阅更新同步链接: ${syncUrl}`);
      // 这里可以通过WebSocket、推送通知等方式将syncUrl发送给客户端
      // 或者存储到某个地方供客户端获取
    }

  } else if (status === 'canceled' || status === 'unpaid' || status === 'incomplete_expired') {
    // 订阅已取消、未付款或付款超时 - 完全停用
    await updateUser(user.id, {
      stripeSubscriptionId: null,
      stripeProductId: null,
      planName: null,
      subscriptionStatus: status,
      subscriptionInterval: null,
      subscriptionExpiresAt: null, // 清除到期时间戳
      premiumType: null, // 清除 Premium Type
    });

    console.log(`用户 ${user.email} 订阅已停用，状态: ${status}`);

    // 生成同步深度链接
    const syncUrl = await generateUserSyncDeepLink(user.id);
    if (syncUrl) {
      console.log(`[Stripe] 为用户 ${user.email} 生成订阅停用同步链接: ${syncUrl}`);
    }

  } else if (status === 'past_due' || status === 'incomplete') {
    // 付款逾期或未完成 - 保持订阅信息但更新状态
    await updateUser(user.id, {
      subscriptionStatus: status,
    });

  } else if (status === 'trialing') {
    // 试用期 - 保持订阅信息
    const plan = subscription.items.data[0]?.plan;
    const product = await stripe.products.retrieve(plan?.product as string);

    // 试用期的到期时间是试用结束时间
    const trialEnd = subscription.trial_end ? new Date(subscription.trial_end * 1000) : null;

    // 从订阅的 metadata 中获取 useOwnApiKey 信息
    const useOwnApiKey = subscription.metadata?.useOwnApiKey === 'true';
    const premiumType = useOwnApiKey ? 'use_own_key' : 'use_elick';

    await updateUser(user.id, {
      stripeSubscriptionId: subscriptionId,
      stripeProductId: plan?.product as string,
      planName: product.name,
      subscriptionStatus: status,
      subscriptionInterval: plan?.interval || 'month',
      subscriptionExpiresAt: trialEnd, // 试用期结束时间
      premiumType: premiumType, // 设置 premium 类型
    });

    console.log(`用户 ${user.email} 进入试用期，试用结束时间: ${trialEnd?.toISOString() || 'N/A'}`);

  } else if (status === 'paused') {
    // 暂停订阅 - 更新状态但保持订阅信息
    await updateUser(user.id, {
      subscriptionStatus: status,
    });

  } else {
    // 其他未知状态 - 记录日志但保持现状
    console.warn(`未处理的订阅状态: ${status} for user ${user.email}`);
    await updateUser(user.id, {
      subscriptionStatus: status,
    });
  }
}

export async function handleOneTimePayment(
  session: Stripe.Checkout.Session
) {
  const customerId = session.customer as string;

  // 获取客户信息以找到用户邮箱
  const customer = await stripe.customers.retrieve(customerId) as Stripe.Customer;

  if (!customer || !customer.email) {
    console.error('Customer not found or missing email:', customerId);
    return;
  }

  // 通过邮箱查找用户
  const user = await getUserByEmail(customer.email);

  if (!user) {
    console.error('User not found for Stripe customer email:', customer.email);
    return;
  }

  // 获取产品信息
  const lineItem = (await stripe.checkout.sessions.listLineItems(session.id)).data[0];
  let productName: string;
  let productId: string;

  if (session.metadata?.promotionId) {
    // 有促销的情况，从metadata获取信息
    productName = session.metadata.planName;
    productId = session.metadata.originalPriceId || 'custom';

    // 记录促销使用
    await applyPromotion(
      session.metadata.promotionId,
      user.id,
      productName,
      'stripe',
      parseInt(session.metadata.originalPrice),
      parseInt(session.metadata.discountAmount),
      session.amount_total || 0,
      session.id
    );
  } else {
    // 没有促销的情况，从产品信息获取
    const price = await stripe.prices.retrieve(lineItem.price?.id as string);
    const product = await stripe.products.retrieve(price.product as string);
    productName = product.name;
    productId = product.id;
  }

  // 从 metadata 中获取 useOwnApiKey 信息
  const useOwnApiKey = session.metadata?.useOwnApiKey === 'true';
  const premiumType = useOwnApiKey ? 'use_own_key' : 'use_elick';

  // 更新用户状态
  await updateUser(user.id, {
    stripeProductId: productId,
    planName: productName,
    subscriptionStatus: 'lifetime',
    premiumType: premiumType // 设置 premium 类型
  });
}

export async function getStripePrices() {

  const cacheKey = 'stripe_prices';
  const cached = getCachedData<any[]>(cacheKey);

  if (cached) {
    return cached;
  }

  try {
    const prices = await stripe.prices.list({
      expand: ['data.product'],
      active: true,
      limit: 100 // 确保获取所有价格
    });

    // 按创建时间降序排序，确保新价格优先
    const sortedPrices = prices.data.sort((a, b) => b.created - a.created);

    const result = sortedPrices.map((price) => ({
      id: price.id,
      productId:
        typeof price.product === 'string' ? price.product : price.product.id,
      unitAmount: price.unit_amount,
      currency: price.currency,
      interval: price.recurring?.interval,
      trialPeriodDays: price.recurring?.trial_period_days,
      type: price.type,
      created: price.created,
      metadata: price.metadata
    }));

    // 缓存结果5分钟
    setCachedData(cacheKey, result, 300000);
    return result;
  } catch (error) {
    console.error('获取Stripe价格失败:', error);
    // 发生错误时返回空数组，避免构建失败
    return [];
  }
}

export async function getStripeProducts() {

  const cacheKey = 'stripe_products';
  const cached = getCachedData<any[]>(cacheKey);

  if (cached) {
    return cached;
  }

  try {
    const products = await stripe.products.list({
      active: true,
      expand: ['data.default_price']
    });

    const result = products.data.map((product) => ({
      id: product.id,
      name: product.name,
      description: product.description,
      defaultPriceId:
        typeof product.default_price === 'string'
          ? product.default_price
          : product.default_price?.id
    }));

    // 缓存结果5分钟
    setCachedData(cacheKey, result, 300000);
    return result;
  } catch (error) {
    console.error('获取Stripe产品失败:', error);
    // 发生错误时返回空数组，避免构建失败
    return [];
  }
}

// 获取首选价格（优先选择新价格）- 优化版本，并行调用API
export async function getPreferredPrices() {
  // 并行调用Stripe API以提高性能
  const [prices, products] = await Promise.all([
    getStripePrices(),
    getStripeProducts()
  ]);

  const preferredPrices = new Map();

  for (const product of products) {
    const productPrices = prices.filter(p => p.productId === product.id);

    if (productPrices.length === 0) continue;

    let preferredPrice;

    if (product.name === 'Premium') {
      // 优先选择 $4.99/月 的价格
      preferredPrice = productPrices.find(p => p.unitAmount === 499 && p.interval === 'month')
        || productPrices[0];
    } else if (product.name === 'Lifetime') {
      // 优先选择 $49 的一次性价格
      preferredPrice = productPrices.find(p => p.unitAmount === 4900 && !p.interval)
        || productPrices[0];
    } else {
      // 其他产品选择最新的价格
      preferredPrice = productPrices[0];
    }

    preferredPrices.set(product.id, preferredPrice);
  }

  return { prices, products, preferredPrices };
}

export async function handleSubscriptionRenewal(invoice: Stripe.Invoice) {
  if (!invoice.id) {
    console.error('Invoice ID is missing');
    return;
  }

  // 从 invoice 的 line items 中获取订阅信息
  const lineItems = await stripe.invoices.listLineItems(invoice.id);

  // 查找订阅相关的 line item
  const subscriptionLineItem = lineItems.data.find(item =>
    item.parent?.type === 'subscription_item_details'
  );

  if (!subscriptionLineItem || !subscriptionLineItem.parent) {
    console.error('No subscription line item found in invoice:', invoice.id);
    return;
  }

  // 从 line item 获取订阅信息
  const subscriptionItemDetails = subscriptionLineItem.parent as {
    subscription_item_details: {
      subscription: string;
    };
  };

  const subscriptionId = subscriptionItemDetails.subscription_item_details.subscription;
  const subscription = await stripe.subscriptions.retrieve(subscriptionId);

  // 获取用户信息
  const customer = await stripe.customers.retrieve(subscription.customer as string) as Stripe.Customer;
  const user = await getUserByEmail(customer.email!);

  if (!user) {
    console.error('User not found for subscription renewal:', customer.email);
    return;
  }

  // 计算新的订阅到期时间
  const newExpiresAt = new Date((subscription as any).current_period_end * 1000);

  // 获取产品信息
  const plan = subscription.items.data[0]?.plan;
  const product = await stripe.products.retrieve(plan?.product as string);

  // 从订阅的 metadata 中获取 useOwnApiKey 信息
  const useOwnApiKey = subscription.metadata?.useOwnApiKey === 'true';
  const premiumType = useOwnApiKey ? 'use_own_key' : 'use_elick';

  // 更新用户订阅信息：重置使用量 + 更新到期时间 + 确保状态正确
  await updateUser(user.id, {
    // 重置使用量
    premiumRequestsUsed: 0,
    fastRequestsUsed: 0,
    // 更新订阅信息
    subscriptionStatus: 'active',
    subscriptionExpiresAt: newExpiresAt,
    subscriptionInterval: plan?.interval || 'month',
    planName: product.name,
    premiumType: premiumType
  });

  console.log(`用户 ${user.email} 订阅已续费：`);
  console.log(`  - 新到期时间: ${newExpiresAt.toISOString()}`);
  console.log(`  - 使用量已重置`);
  console.log(`  - Premium Type: ${premiumType}`);
}
