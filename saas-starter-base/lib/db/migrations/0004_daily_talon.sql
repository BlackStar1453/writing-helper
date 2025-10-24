-- 清理之前可能存在的payment_orders表
DROP TABLE IF EXISTS "payment_orders" CASCADE;

-- 注释：我们将使用现有的stripeProductId字段来临时存储Xorpay订单信息
-- 格式：XORPAY_PENDING:orderId:productName:aoid
-- 这避免了添加新字段导致的迁移复杂性