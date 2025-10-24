#!/usr/bin/env node

/**
 * 生产环境 Stripe 配置脚本
 * 用于在生产环境中创建必要的产品和价格
 */

import Stripe from 'stripe';
import dotenv from 'dotenv';
import readline from 'readline';

dotenv.config();

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(prompt) {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
}

async function main() {
  console.log('🚀 生产环境 Stripe 配置工具');
  console.log('');
  
  // 获取生产环境密钥
  const liveKey = await question('请输入生产环境 Stripe Secret Key (sk_live_...): ');
  
  if (!liveKey.startsWith('sk_live_')) {
    console.error('❌ 无效的生产环境密钥，必须以 sk_live_ 开头');
    process.exit(1);
  }
  
  const stripe = new Stripe(liveKey, {
    apiVersion: '2025-05-28.basil'
  });
  
  console.log('');
  console.log('🔍 检查生产环境现有产品...');
  
  try {
    // 检查现有产品
    const products = await stripe.products.list({
      active: true
    });
    
    console.log(`找到 ${products.data.length} 个现有产品`);
    
    const premiumProduct = products.data.find(p => p.name === 'Premium');
    const lifetimeProduct = products.data.find(p => p.name === 'Lifetime');
    
    // 创建 Premium 产品（如果不存在）
    let premium = premiumProduct;
    if (!premium) {
      console.log('📦 创建 Premium 产品...');
      premium = await stripe.products.create({
        name: 'Premium',
        description: 'Premium subscription plan with advanced features',
        metadata: {
          plan_type: 'subscription',
          environment: 'production'
        }
      });
      console.log(`✅ Premium 产品创建成功: ${premium.id}`);
    } else {
      console.log(`✅ Premium 产品已存在: ${premium.id}`);
    }
    
    // 创建 Lifetime 产品（如果不存在）
    let lifetime = lifetimeProduct;
    if (!lifetime) {
      console.log('📦 创建 Lifetime 产品...');
      lifetime = await stripe.products.create({
        name: 'Lifetime',
        description: 'One-time payment for lifetime access',
        metadata: {
          plan_type: 'one_time',
          environment: 'production'
        }
      });
      console.log(`✅ Lifetime 产品创建成功: ${lifetime.id}`);
    } else {
      console.log(`✅ Lifetime 产品已存在: ${lifetime.id}`);
    }
    
    // 检查并创建价格
    console.log('');
    console.log('💰 检查产品价格...');
    
    // Premium 价格检查
    const premiumPrices = await stripe.prices.list({
      product: premium.id,
      active: true
    });
    
    const premiumMonthlyPrice = premiumPrices.data.find(p => 
      p.unit_amount === 499 && p.recurring?.interval === 'month'
    );
    
    if (!premiumMonthlyPrice) {
      console.log('💰 创建 Premium 月付价格 ($4.99/月)...');
      const newPremiumPrice = await stripe.prices.create({
        product: premium.id,
        unit_amount: 499,
        currency: 'usd',
        recurring: {
          interval: 'month'
        },
        metadata: {
          plan_name: 'Premium',
          environment: 'production'
        }
      });
      console.log(`✅ Premium 价格创建成功: ${newPremiumPrice.id}`);
    } else {
      console.log(`✅ Premium 价格已存在: ${premiumMonthlyPrice.id}`);
    }
    
    // Lifetime 价格检查
    const lifetimePrices = await stripe.prices.list({
      product: lifetime.id,
      active: true
    });
    
    const lifetimePrice = lifetimePrices.data.find(p =>
      p.unit_amount === 4900 && !p.recurring
    );

    if (!lifetimePrice) {
      console.log('💰 创建 Lifetime 一次性价格 ($49)...');
      const newLifetimePrice = await stripe.prices.create({
        product: lifetime.id,
        unit_amount: 4900,
        currency: 'usd',
        metadata: {
          plan_name: 'Lifetime',
          environment: 'production'
        }
      });
      console.log(`✅ Lifetime 价格创建成功: ${newLifetimePrice.id}`);
    } else {
      console.log(`✅ Lifetime 价格已存在: ${lifetimePrice.id}`);
    }
    
    console.log('');
    console.log('🎉 生产环境配置完成！');
    console.log('');
    console.log('📝 下一步操作：');
    console.log('1. 在生产环境的 .env 文件中设置：');
    console.log(`   STRIPE_SECRET_KEY_LIVE=${liveKey}`);
    console.log('2. 配置生产环境的 webhook');
    console.log('3. 测试支付流程');
    
  } catch (error) {
    console.error('❌ 配置失败:', error.message);
    process.exit(1);
  } finally {
    rl.close();
  }
}

main().catch(console.error);
