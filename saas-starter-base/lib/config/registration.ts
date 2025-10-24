/**
 * 用户注册相关的配置管理
 * 通过环境变量控制用户注册时的各种限额和时间配置
 */

// 用户注册基础限额配置
export interface UserRegistrationLimits {
  premiumRequestsLimit: number;
  fastRequestsLimit: number;
  maxDevices: number;
  lifetimeMaxDevices: number;
}

// 试用 API Key 配置
export interface TrialApiKeyConfig {
  maxUsageCount: number;
  creditLimit: string;
  expiresDays: number;
}

// 完整的注册配置
export interface RegistrationConfig {
  userLimits: UserRegistrationLimits;
  trialApiKey: TrialApiKeyConfig;
}

/**
 * 从环境变量读取整数值，提供默认值
 */
function getEnvInt(key: string, defaultValue: number): number {
  const value = process.env[key];
  if (!value) return defaultValue;
  
  const parsed = parseInt(value, 10);
  if (isNaN(parsed)) {
    console.warn(`⚠️ [Config] 环境变量 ${key} 的值 "${value}" 不是有效的整数，使用默认值 ${defaultValue}`);
    return defaultValue;
  }
  
  return parsed;
}

/**
 * 从环境变量读取浮点数值，提供默认值
 */
function getEnvFloat(key: string, defaultValue: number): string {
  const value = process.env[key];
  if (!value) return defaultValue.toString();
  
  const parsed = parseFloat(value);
  if (isNaN(parsed)) {
    console.warn(`⚠️ [Config] 环境变量 ${key} 的值 "${value}" 不是有效的数字，使用默认值 ${defaultValue}`);
    return defaultValue.toString();
  }
  
  return parsed.toString();
}

/**
 * 获取用户注册基础限额配置
 */
export function getUserRegistrationLimits(): UserRegistrationLimits {
  return {
    premiumRequestsLimit: getEnvInt('USER_REGISTRATION_PREMIUM_REQUESTS_LIMIT', 0),
    fastRequestsLimit: getEnvInt('USER_REGISTRATION_FAST_REQUESTS_LIMIT', 50),
    maxDevices: getEnvInt('USER_REGISTRATION_MAX_DEVICES', 1),
    lifetimeMaxDevices: getEnvInt('USER_REGISTRATION_LIFETIME_MAX_DEVICES', 3),
  };
}

/**
 * 获取试用 API Key 配置
 */
export function getTrialApiKeyConfig(): TrialApiKeyConfig {
  return {
    maxUsageCount: getEnvInt('TRIAL_API_KEY_MAX_USAGE_COUNT', 50),
    creditLimit: getEnvFloat('TRIAL_API_KEY_CREDIT_LIMIT', 0.0001),
    expiresDays: getEnvInt('TRIAL_API_KEY_EXPIRES_DAYS', 7),
  };
}

/**
 * 获取完整的注册配置
 */
export function getRegistrationConfig(): RegistrationConfig {
  const config = {
    userLimits: getUserRegistrationLimits(),
    trialApiKey: getTrialApiKeyConfig(),
  };

  // 在开发环境中输出配置信息
  if (process.env.NODE_ENV === 'development') {
    console.log('📋 [Registration Config] 当前注册配置:');
    console.log('  用户基础限额:');
    console.log(`    Premium 请求限制: ${config.userLimits.premiumRequestsLimit}`);
    console.log(`    Fast 请求限制: ${config.userLimits.fastRequestsLimit}`);
    console.log(`    普通用户最大设备数: ${config.userLimits.maxDevices}`);
    console.log(`    Lifetime 用户最大设备数: ${config.userLimits.lifetimeMaxDevices}`);
    console.log('  试用 API Key 配置:');
    console.log(`    最大使用次数: ${config.trialApiKey.maxUsageCount}`);
    console.log(`    信用额度限制: ${config.trialApiKey.creditLimit}`);
    console.log(`    过期天数: ${config.trialApiKey.expiresDays}`);
  }

  return config;
}

/**
 * 验证配置的合理性
 */
export function validateRegistrationConfig(config: RegistrationConfig): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // 验证用户限额
  if (config.userLimits.premiumRequestsLimit < 0) {
    errors.push('Premium 请求限制不能为负数');
  }
  
  if (config.userLimits.fastRequestsLimit < 0) {
    errors.push('Fast 请求限制不能为负数');
  }
  
  if (config.userLimits.maxDevices < 1) {
    errors.push('普通用户最大设备数不能小于 1');
  }
  
  if (config.userLimits.lifetimeMaxDevices < 1) {
    errors.push('Lifetime 用户最大设备数不能小于 1');
  }

  // 验证试用 API Key 配置
  if (config.trialApiKey.maxUsageCount < 1) {
    errors.push('试用 API Key 最大使用次数不能小于 1');
  }
  
  if (parseFloat(config.trialApiKey.creditLimit) <= 0) {
    errors.push('试用 API Key 信用额度限制必须大于 0');
  }
  
  if (config.trialApiKey.expiresDays < 1) {
    errors.push('试用 API Key 过期天数不能小于 1');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * 获取并验证注册配置
 * 如果配置无效，会抛出错误
 */
export function getValidatedRegistrationConfig(): RegistrationConfig {
  const config = getRegistrationConfig();
  const validation = validateRegistrationConfig(config);
  
  if (!validation.valid) {
    const errorMessage = `注册配置验证失败:\n${validation.errors.map(e => `  - ${e}`).join('\n')}`;
    console.error('❌ [Registration Config]', errorMessage);
    throw new Error(errorMessage);
  }
  
  return config;
}

// 导出单例配置实例
let cachedConfig: RegistrationConfig | null = null;

/**
 * 获取缓存的注册配置
 * 在应用启动时读取一次，后续使用缓存值
 */
export function getCachedRegistrationConfig(): RegistrationConfig {
  if (!cachedConfig) {
    cachedConfig = getValidatedRegistrationConfig();
  }
  return cachedConfig;
}

/**
 * 重新加载配置（主要用于测试）
 */
export function reloadRegistrationConfig(): RegistrationConfig {
  cachedConfig = null;
  return getCachedRegistrationConfig();
}
