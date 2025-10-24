import { db } from '../lib/db/drizzle';
import { sql } from 'drizzle-orm';

async function createTrialKeysTable() {
  try {
    console.log('Creating user_trial_keys table...');
    
    // 创建表
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS user_trial_keys (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
        user_id uuid NOT NULL,
        openrouter_key_hash varchar(255) NOT NULL,
        openrouter_api_key text NOT NULL,
        usage_count integer DEFAULT 0,
        max_usage_count integer DEFAULT 50,
        credit_limit numeric(10, 6) DEFAULT '0.0001',
        expires_at timestamp NOT NULL,
        is_active boolean DEFAULT true,
        created_at timestamp DEFAULT now() NOT NULL,
        updated_at timestamp DEFAULT now() NOT NULL
      )
    `);
    
    // 添加外键约束
    await db.execute(sql`
      DO $$ BEGIN
        ALTER TABLE user_trial_keys 
        ADD CONSTRAINT user_trial_keys_user_id_users_id_fk 
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE cascade ON UPDATE no action;
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);
    
    // 创建索引
    await db.execute(sql`
      CREATE UNIQUE INDEX IF NOT EXISTS user_trial_keys_user_id_active_idx 
      ON user_trial_keys (user_id) 
      WHERE is_active = true
    `);
    
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS user_trial_keys_expires_at_idx 
      ON user_trial_keys (expires_at)
    `);
    
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS user_trial_keys_is_active_idx 
      ON user_trial_keys (is_active)
    `);
    
    console.log('✅ user_trial_keys table created successfully!');
    
    // 验证表是否创建成功
    const result = await db.execute(sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_name = 'user_trial_keys'
    `);
    
    console.log('Table verification:', result);
    
  } catch (error) {
    console.error('❌ Failed to create user_trial_keys table:', error);
    throw error;
  }
}

// 运行脚本
createTrialKeysTable()
  .then(() => {
    console.log('Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Script failed:', error);
    process.exit(1);
  });
