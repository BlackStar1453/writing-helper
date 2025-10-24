-- 插入测试促销活动
INSERT INTO promotions (
  name, 
  description, 
  discount_type, 
  discount_value, 
  target_plans, 
  target_payment_methods, 
  start_time, 
  end_time,
  max_uses,
  priority
) VALUES (
  '限时8折优惠', 
  '新用户专享8折优惠，仅限Premium和Lifetime计划', 
  'percentage', 
  20, 
  '["Premium", "Lifetime"]', 
  '["stripe", "xorpay"]', 
  NOW(), 
  NOW() + INTERVAL '30 days',
  100,
  10
);

-- 验证插入结果
SELECT id, name, discount_type, discount_value, start_time, end_time, is_active 
FROM promotions 
ORDER BY created_at DESC 
LIMIT 1;
