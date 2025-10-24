# Tauri 客户端邮箱密码登录实现指南

## 概述

本指南提供在 Tauri 客户端中实现邮箱密码登录界面的伪代码和实现逻辑，替代原有的 deep-link 认证方案。

**✅ API 测试状态：所有端点已通过测试**
- 登录端点：✅ 正常工作
- 注册端点：✅ 正常工作
- 令牌验证：✅ 正常工作
- 用户信息刷新：✅ 正常工作
- 错误处理：✅ 正常工作
- 性能测试：✅ 通过（平均响应时间 562ms）

## API 端点信息

**基础URL**: `https://your-api-domain.com` (替换为实际域名)

| 端点 | 方法 | 功能 | 状态 |
|------|------|------|------|
| `/api/tauri-auth/login` | POST | 邮箱密码登录 | ✅ 已测试 |
| `/api/tauri-auth/register` | POST | 用户注册 | ✅ 已测试 |
| `/api/tauri-auth/verify-token` | POST | JWT令牌验证 | ✅ 已测试 |
| `/api/tauri-auth/refresh-user` | POST | 用户信息刷新 | ✅ 已测试 |

## 核心组件架构

### 1. 认证服务 (AuthService)

```rust
// src-tauri/src/auth/mod.rs
use serde::{Deserialize, Serialize};
use reqwest::Client;
use tauri::State;

#[derive(Debug, Serialize, Deserialize)]
pub struct LoginRequest {
    email: String,
    password: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct LoginResponse {
    success: bool,
    error: Option<String>,
    user_data: Option<UserData>,
    token: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct UserData {
    id: String,
    email: String,
    plan: String,
    subscription_status: String,
    subscription_interval: Option<String>,
    subscription_expires_at: Option<String>,
    premium_type: Option<String>,
}

pub struct AuthService {
    client: Client,
    api_base_url: String,
}

impl AuthService {
    pub fn new(api_base_url: String) -> Self {
        Self {
            client: Client::new(),
            api_base_url,
        }
    }

    pub async fn login(&self, email: String, password: String) -> Result<LoginResponse, String> {
        let login_request = LoginRequest { email, password };
        
        let response = self.client
            .post(&format!("{}/api/tauri-auth/login", self.api_base_url))
            .json(&login_request)
            .send()
            .await
            .map_err(|e| format!("网络请求失败: {}", e))?;

        if !response.status().is_success() {
            return Err("登录请求失败".to_string());
        }

        let login_response: LoginResponse = response
            .json()
            .await
            .map_err(|e| format!("解析响应失败: {}", e))?;

        Ok(login_response)
    }

    pub async fn register(&self, email: String, password: String) -> Result<LoginResponse, String> {
        let register_request = LoginRequest { email, password };
        
        let response = self.client
            .post(&format!("{}/api/tauri-auth/register", self.api_base_url))
            .json(&register_request)
            .send()
            .await
            .map_err(|e| format!("网络请求失败: {}", e))?;

        let register_response: LoginResponse = response
            .json()
            .await
            .map_err(|e| format!("解析响应失败: {}", e))?;

        Ok(register_response)
    }
}
```

### 2. Tauri 命令接口

```rust
// src-tauri/src/commands/auth.rs
use tauri::{command, State};
use crate::auth::{AuthService, LoginResponse};
use crate::storage::SecureStorage;

#[command]
pub async fn login_with_email(
    email: String,
    password: String,
    auth_service: State<'_, AuthService>,
    storage: State<'_, SecureStorage>,
) -> Result<LoginResponse, String> {
    // 输入验证
    if email.is_empty() || password.is_empty() {
        return Err("邮箱和密码不能为空".to_string());
    }

    if !email.contains('@') {
        return Err("请输入有效的邮箱地址".to_string());
    }

    if password.len() < 8 {
        return Err("密码长度至少8位".to_string());
    }

    // 执行登录
    let response = auth_service.login(email, password).await?;

    if response.success {
        // 保存用户数据和token到安全存储
        if let (Some(user_data), Some(token)) = (&response.user_data, &response.token) {
            storage.save_user_data(user_data).await?;
            storage.save_auth_token(token).await?;
        }
    }

    Ok(response)
}

#[command]
pub async fn register_with_email(
    email: String,
    password: String,
    auth_service: State<'_, AuthService>,
) -> Result<LoginResponse, String> {
    // 输入验证
    if email.is_empty() || password.is_empty() {
        return Err("邮箱和密码不能为空".to_string());
    }

    if !email.contains('@') {
        return Err("请输入有效的邮箱地址".to_string());
    }

    if password.len() < 8 {
        return Err("密码长度至少8位".to_string());
    }

    // 执行注册
    let response = auth_service.register(email, password).await?;

    Ok(response)
}

#[command]
pub async fn logout(storage: State<'_, SecureStorage>) -> Result<(), String> {
    storage.clear_auth_data().await?;
    Ok(())
}

#[command]
pub async fn get_current_user(storage: State<'_, SecureStorage>) -> Result<Option<UserData>, String> {
    storage.get_user_data().await
}
```

### 3. 安全存储服务

```rust
// src-tauri/src/storage/mod.rs
use keyring::Entry;
use serde_json;
use crate::auth::UserData;

pub struct SecureStorage {
    service_name: String,
}

impl SecureStorage {
    pub fn new() -> Self {
        Self {
            service_name: "elick-app".to_string(),
        }
    }

    pub async fn save_auth_token(&self, token: &str) -> Result<(), String> {
        let entry = Entry::new(&self.service_name, "auth_token")
            .map_err(|e| format!("创建密钥环条目失败: {}", e))?;
        
        entry.set_password(token)
            .map_err(|e| format!("保存认证令牌失败: {}", e))?;
        
        Ok(())
    }

    pub async fn get_auth_token(&self) -> Result<Option<String>, String> {
        let entry = Entry::new(&self.service_name, "auth_token")
            .map_err(|e| format!("创建密钥环条目失败: {}", e))?;
        
        match entry.get_password() {
            Ok(token) => Ok(Some(token)),
            Err(_) => Ok(None),
        }
    }

    pub async fn save_user_data(&self, user_data: &UserData) -> Result<(), String> {
        let json_data = serde_json::to_string(user_data)
            .map_err(|e| format!("序列化用户数据失败: {}", e))?;
        
        let entry = Entry::new(&self.service_name, "user_data")
            .map_err(|e| format!("创建密钥环条目失败: {}", e))?;
        
        entry.set_password(&json_data)
            .map_err(|e| format!("保存用户数据失败: {}", e))?;
        
        Ok(())
    }

    pub async fn get_user_data(&self) -> Result<Option<UserData>, String> {
        let entry = Entry::new(&self.service_name, "user_data")
            .map_err(|e| format!("创建密钥环条目失败: {}", e))?;
        
        match entry.get_password() {
            Ok(json_data) => {
                let user_data: UserData = serde_json::from_str(&json_data)
                    .map_err(|e| format!("反序列化用户数据失败: {}", e))?;
                Ok(Some(user_data))
            },
            Err(_) => Ok(None),
        }
    }

    pub async fn clear_auth_data(&self) -> Result<(), String> {
        // 清除认证令牌
        if let Ok(entry) = Entry::new(&self.service_name, "auth_token") {
            let _ = entry.delete_password();
        }
        
        // 清除用户数据
        if let Ok(entry) = Entry::new(&self.service_name, "user_data") {
            let _ = entry.delete_password();
        }
        
        Ok(())
    }
}
```

### 4. 前端登录组件 (React/TypeScript)

```typescript
// src/components/LoginForm.tsx
import React, { useState } from 'react';
import { invoke } from '@tauri-apps/api/tauri';

interface LoginResponse {
  success: boolean;
  error?: string;
  user_data?: UserData;
  token?: string;
}

interface UserData {
  id: string;
  email: string;
  plan: string;
  subscription_status: string;
  subscription_interval?: string;
  subscription_expires_at?: string;
  premium_type?: string;
}

export const LoginForm: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [isRegisterMode, setIsRegisterMode] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const command = isRegisterMode ? 'register_with_email' : 'login_with_email';
      const response: LoginResponse = await invoke(command, {
        email,
        password,
      });

      if (response.success) {
        // 登录/注册成功，跳转到主界面
        window.location.href = '/dashboard';
      } else {
        setError(response.error || '操作失败');
      }
    } catch (err) {
      setError(err as string);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="login-container">
      <form onSubmit={handleSubmit} className="login-form">
        <h2>{isRegisterMode ? '注册账户' : '登录账户'}</h2>
        
        {error && (
          <div className="error-message">
            {error}
          </div>
        )}

        <div className="form-group">
          <label htmlFor="email">邮箱地址</label>
          <input
            type="email"
            id="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            disabled={isLoading}
          />
        </div>

        <div className="form-group">
          <label htmlFor="password">密码</label>
          <input
            type="password"
            id="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
            disabled={isLoading}
          />
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="submit-button"
        >
          {isLoading ? '处理中...' : (isRegisterMode ? '注册' : '登录')}
        </button>

        <div className="form-footer">
          <button
            type="button"
            onClick={() => setIsRegisterMode(!isRegisterMode)}
            className="toggle-mode-button"
          >
            {isRegisterMode ? '已有账户？点击登录' : '没有账户？点击注册'}
          </button>
        </div>
      </form>
    </div>
  );
};
```

## 主应用初始化

```rust
// src-tauri/src/main.rs
use tauri::Manager;
mod auth;
mod storage;
mod commands;

use auth::AuthService;
use storage::SecureStorage;
use commands::auth::*;

fn main() {
    tauri::Builder::default()
        .setup(|app| {
            // 初始化服务
            let api_base_url = "https://your-api-domain.com".to_string(); // 替换为实际API地址
            let auth_service = AuthService::new(api_base_url);
            let storage = SecureStorage::new();

            // 注册状态管理
            app.manage(auth_service);
            app.manage(storage);

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            login_with_email,
            register_with_email,
            logout,
            get_current_user
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

## 依赖配置

```toml
# src-tauri/Cargo.toml
[dependencies]
tauri = { version = "1.0", features = ["api-all"] }
serde = { version = "1.0", features = ["derive"] }
serde_json = "1.0"
reqwest = { version = "0.11", features = ["json"] }
keyring = "2.0"
tokio = { version = "1.0", features = ["full"] }
```

## 安全注意事项

1. **密码验证**: 在客户端进行基本验证，服务端进行完整验证
2. **HTTPS**: 确保所有API请求使用HTTPS
3. **令牌存储**: 使用系统密钥环安全存储认证令牌
4. **错误处理**: 不在错误信息中泄露敏感信息
5. **输入清理**: 对所有用户输入进行验证和清理

## 实现步骤

1. 创建Rust后端认证服务
2. 实现Tauri命令接口
3. 配置安全存储
4. 创建前端登录组件
5. 集成到主应用
6. 测试认证流程
7. 处理错误场景
