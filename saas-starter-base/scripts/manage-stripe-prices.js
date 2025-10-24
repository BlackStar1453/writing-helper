#!/usr/bin/env node

/**
 * Stripe价格管理脚本
 * 用于创建、更新和管理Stripe产品和价格
 */

import Stripe from 'stripe';
import dotenv from 'dotenv';

dotenv.config();

if (!process.env.STRIPE_SECRET_KEY) {
  console.error('❌ STRIPE_SECRET_KEY environment variable is not set');
  process.exit(1);
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2025-05-28.basil'
});

const args = process.argv.slice(2);
const command = args[0];

async function listProducts() {
  console.log('📋 当前Stripe产品和价格:');
  console.log('');
  
  try {
    const products = await stripe.products.list({
      active: true,
      expand: ['data.default_price']
    });

    if (products.data.length === 0) {
      console.log('暂无产品');
      return;
    }

    for (const product of products.data) {
      console.log(`🏷️  产品: ${product.name} (${product.id})`);
      console.log(`   描述: ${product.description || '无描述'}`);
      
      // 获取该产品的所有价格
      const prices = await stripe.prices.list({
        product: product.id,
        active: true
      });

      if (prices.data.length > 0) {
        console.log('   价格:');
        prices.data.forEach(price => {
          const amount = price.unit_amount ? `$${(price.unit_amount / 100).toFixed(2)}` : '免费';
          const interval = price.recurring ? `/${price.recurring.interval}` : ' (一次性)';
          console.log(`   - ${amount}${interval} (${price.id})`);
        });
      } else {
        console.log('   价格: 无');
      }
      console.log('');
    }
    
  } catch (error) {
    console.error('❌ 获取产品列表失败:', error.message);
  }
}

async function createNewPrices() {
  console.log('🔧 创建新的Stripe价格...');
  console.log('');

  try {
    // 首先获取现有产品
    const products = await stripe.products.list({
      active: true
    });

    const premiumProduct = products.data.find(p => p.name === 'Premium');
    const lifetimeProduct = products.data.find(p => p.name === 'Lifetime');

    if (!premiumProduct) {
      console.log('⚠️  未找到Premium产品，正在创建...');
      const newPremiumProduct = await stripe.products.create({
        name: 'Premium',
        description: 'Premium subscription plan with advanced features',
        metadata: {
          plan_type: 'subscription'
        }
      });
      console.log(`✅ Premium产品创建成功: ${newPremiumProduct.id}`);
    }

    if (!lifetimeProduct) {
      console.log('⚠️  未找到Lifetime产品，正在创建...');
      const newLifetimeProduct = await stripe.products.create({
        name: 'Lifetime',
        description: 'One-time payment for lifetime access',
        metadata: {
          plan_type: 'one_time'
        }
      });
      console.log(`✅ Lifetime产品创建成功: ${newLifetimeProduct.id}`);
    }

    // 重新获取产品（包括新创建的）
    const updatedProducts = await stripe.products.list({
      active: true
    });

    const premium = updatedProducts.data.find(p => p.name === 'Premium');
    const lifetime = updatedProducts.data.find(p => p.name === 'Lifetime');

    // 创建新的Premium价格 ($4.99/月)
    console.log('💰 创建Premium新价格 ($4.99/月)...');
    const premiumPrice = await stripe.prices.create({
      product: premium.id,
      unit_amount: 499, // $4.99 in cents
      currency: 'usd',
      recurring: {
        interval: 'month'
      },
      metadata: {
        plan_name: 'Premium',
        updated_price: 'true'
      }
    });
    console.log(`✅ Premium价格创建成功: ${premiumPrice.id} ($4.99/月)`);

    // 创建新的Lifetime价格 ($49一次性)
    console.log('💰 创建Lifetime新价格 ($49一次性)...');
    const lifetimePrice = await stripe.prices.create({
      product: lifetime.id,
      unit_amount: 4900, // $49 in cents
      currency: 'usd',
      metadata: {
        plan_name: 'Lifetime',
        updated_price: 'true'
      }
    });
    console.log(`✅ Lifetime价格创建成功: ${lifetimePrice.id} ($49一次性)`);

    console.log('');
    console.log('🎉 所有价格创建完成！');
    console.log('');
    console.log('📝 新价格信息:');
    console.log(`Premium: ${premiumPrice.id} - $4.99/月`);
    console.log(`Lifetime: ${lifetimePrice.id} - $49一次性`);
    console.log('');
    console.log('⚠️  重要提醒:');
    console.log('1. 请更新您的应用配置以使用新的价格ID');
    console.log('2. 考虑将旧价格设置为非活跃状态');
    console.log('3. 测试新价格是否正常工作');

  } catch (error) {
    console.error('❌ 创建价格失败:', error.message);
  }
}

async function deactivateOldPrices() {
  console.log('🔧 查找并停用旧价格...');
  console.log('');

  try {
    const prices = await stripe.prices.list({
      active: true,
      limit: 100
    });

    console.log('当前活跃价格:');
    for (const price of prices.data) {
      const product = await stripe.products.retrieve(price.product);
      const amount = price.unit_amount ? `$${(price.unit_amount / 100).toFixed(2)}` : '免费';
      const interval = price.recurring ? `/${price.recurring.interval}` : ' (一次性)';
      
      console.log(`- ${product.name}: ${amount}${interval} (${price.id})`);
      
      // 检查是否是旧价格（Premium $8/月 或 Lifetime $29）
      const isOldPremium = product.name === 'Premium' && price.unit_amount === 800;
      const isOldLifetime = product.name === 'Lifetime' && price.unit_amount === 2900;
      
      if (isOldPremium || isOldLifetime) {
        console.log(`  ⚠️  这是旧价格，建议停用`);
        console.log(`  运行: node scripts/manage-stripe-prices.js deactivate ${price.id}`);
      }
    }

  } catch (error) {
    console.error('❌ 查找价格失败:', error.message);
  }
}

async function deactivatePrice(priceId) {
  if (!priceId) {
    console.error('❌ 请提供价格ID');
    return;
  }

  try {
    console.log(`🔧 停用价格 ${priceId}...`);
    
    const updatedPrice = await stripe.prices.update(priceId, {
      active: false
    });

    console.log(`✅ 价格 ${priceId} 已停用`);
    
  } catch (error) {
    console.error('❌ 停用价格失败:', error.message);
  }
}

function showHelp() {
  console.log('🛠️  Stripe价格管理工具');
  console.log('');
  console.log('用法:');
  console.log('  node scripts/manage-stripe-prices.js <command> [options]');
  console.log('');
  console.log('命令:');
  console.log('  list                    - 列出所有产品和价格');
  console.log('  create-new-prices       - 创建新的价格 (Premium $4.99, Lifetime $49)');
  console.log('  find-old-prices         - 查找需要停用的旧价格');
  console.log('  deactivate <price_id>   - 停用指定价格');
  console.log('  help                    - 显示帮助信息');
  console.log('');
  console.log('示例:');
  console.log('  node scripts/manage-stripe-prices.js list');
  console.log('  node scripts/manage-stripe-prices.js create-new-prices');
  console.log('  node scripts/manage-stripe-prices.js deactivate price_1234567890');
}

async function main() {
  console.log('🚀 启动Stripe价格管理工具...');
  console.log('');

  switch (command) {
    case 'list':
      await listProducts();
      break;
    case 'create-new-prices':
      await createNewPrices();
      break;
    case 'find-old-prices':
      await deactivateOldPrices();
      break;
    case 'deactivate':
      await deactivatePrice(args[1]);
      break;
    case 'help':
    case '--help':
    case '-h':
      showHelp();
      break;
    default:
      console.error('❌ 未知命令:', command);
      console.log('');
      showHelp();
      process.exit(1);
  }
}

main()
  .catch(error => {
    console.error('❌ 执行失败:', error);
    process.exit(1);
  })
  .finally(() => {
    process.exit(0);
  });
