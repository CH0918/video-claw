# 安全审查报告

**项目**: Video Claw  
**审查日期**: 2026-04-07  
**审查范围**: 认证系统、API 路由、权限管理、通用工具函数

---

## 🔴 高危问题

### 1. XSS 漏洞 - `verify-email.tsx`

**位置**: `src/shared/blocks/sign/verify-email.tsx:258-261`

**代码**:
```tsx
<CardDescription>
  {t('verify_email_page_description')}
  {email ? ` ${email}` : ''}
</CardDescription>
```

**问题描述**:
`email` 来自 URL 参数 (`?email=xxx`)，未经转义直接渲染到页面。虽然 React 会自动转义，但如果 `email` 包含特殊字符（如 `<`、`>`）或 HTML 实体，在某些浏览器环境下可能被解析执行。

**风险**: 攻击者可构造恶意链接，诱导用户点击后执行恶意脚本。

**修复建议**:
```tsx
{email ? ` ${email.replace(/[<>]/g, '')}` : ''}
```

---

### 2. Rate Limit 存储不可靠

**位置**: `src/shared/lib/rate-limit.ts:39-44`

**代码**:
```typescript
function getStore(): Store {
  if (!globalThis.__minIntervalRateLimitStore) {
    globalThis.__minIntervalRateLimitStore = new Map();
  }
  return globalThis.__minIntervalRateLimitStore;
}
```

**问题描述**:
使用内存 `Map` 存储限流数据存在以下问题：
- **多实例不共享**: 在容器化或多服务器部署时，各实例间限流状态不共享
- **Serverless 问题**: Cloudflare Workers / Vercel Edge 每次请求可能是新实例，限流完全失效
- **数据丢失**: 应用重启后所有限流记录丢失

**风险**: 攻击者可绕过限流机制，进行暴力破解、DDoS 攻击。

**修复建议**:
使用 Redis 或数据库存储限流数据：
```typescript
// 使用 Redis
import { Redis } from 'ioredis';
const redis = new Redis(process.env.REDIS_URL);

async function isRateLimited(key: string, windowMs: number, maxRequests: number) {
  const now = Date.now();
  const windowStart = now - windowMs;
  // 使用 Redis sorted set 实现滑动窗口限流
  // ...
}
```

---

### 3. Auth Provider 未验证

**位置**: `src/app/[locale]/(oauth)/auth-popup/page.tsx:11`

**代码**:
```tsx
const provider = searchParams.get('provider') || '';

signIn.social({
  provider,
  callbackURL: '/auth-callback',
});
```

**问题描述**:
`provider` 参数未做白名单验证，任意值都可能被传入 `signIn.social()` 函数。

**风险**: 可能导致未预期的认证行为或信息泄露。

**修复建议**:
```tsx
const ALLOWED_PROVIDERS = ['google', 'github'];
const provider = searchParams.get('provider');

if (!provider || !ALLOWED_PROVIDERS.includes(provider)) {
  return <div>Invalid provider</div>;
}
```

---

### 4. Open Redirect 风险

**位置**: `src/shared/blocks/sign/sign-in.tsx:102-104`, `sign-up.tsx:198-200`

**代码**:
```tsx
const verifyPath = `/verify-email?sent=1&email=${encodeURIComponent(
  email
)}&callbackUrl=${encodeURIComponent(normalizedCallbackUrl)}`;
```

**问题描述**:
`callbackUrl` 来自用户输入，仅做 URL 编码但未验证目标域名。验证成功后可能跳转到恶意网站。

**风险**: 钓鱼攻击，窃取用户凭证。

**修复建议**:
```typescript
function isValidCallbackUrl(url: string): boolean {
  try {
    const parsed = new URL(url, envConfigs.app_url);
    // 只允许同源跳转
    return parsed.origin === new URL(envConfigs.app_url).origin;
  } catch {
    return false;
  }
}

// 使用验证
if (!isValidCallbackUrl(callbackUrl)) {
  callbackUrl = '/'; // 默认值
}
```

---

## 🟡 中危问题

### 5. LocalStorage 跨窗口通信安全问题

**位置**: `src/app/[locale]/(oauth)/auth-callback/page.tsx:11`

**代码**:
```tsx
localStorage.setItem('auth-callback-success', Date.now().toString());
```

**问题描述**:
使用 `localStorage` 在窗口间传递认证状态存在以下风险：
- 可被同源其他页面监听
- 如果存在 XSS 漏洞，可被恶意脚本利用
- 数据在浏览器中持久化，可能被其他应用读取

**建议**:
使用 `postMessage` 并验证来源：
```typescript
window.opener?.postMessage(
  { type: 'AUTH_SUCCESS', timestamp: Date.now() },
  window.location.origin
);
```

---

### 6. AUTH_SECRET 可能为空

**位置**: `src/config/index.ts:37`

**代码**:
```typescript
auth_secret: process.env.AUTH_SECRET ?? '',
```

**问题描述**:
如果未设置 `AUTH_SECRET`，将使用空字符串，严重削弱会话安全性。

**风险**: 攻击者可轻易伪造会话令牌。

**修复建议**:
```typescript
auth_secret: (() => {
  const secret = process.env.AUTH_SECRET;
  if (!secret && process.env.NODE_ENV === 'production') {
    throw new Error('AUTH_SECRET is required in production');
  }
  return secret || 'dev-secret-do-not-use-in-production';
})(),
```

---

### 7. Email OTP 无服务端 Rate Limit

**位置**: `src/shared/blocks/sign/verify-email.tsx:221-249`

**问题描述**:
`handleResend` 函数虽有前端 cooldown（60秒），但仅依赖 `localStorage`，可被轻易绕过：
- 清除浏览器数据
- 使用无痕模式
- 直接调用 API

**风险**: 邮件轰炸攻击，消耗邮件服务配额。

**建议**: 在服务端实现基于 IP + email 的 rate limit。

---

### 8. Password 无强度验证

**位置**: `src/shared/blocks/sign/sign-up.tsx:111-124`

**代码**:
```typescript
if (password !== confirmPassword) {
  toast.error(t('password_mismatch'));
  return;
}
```

**问题描述**:
仅检查密码是否匹配，没有长度、复杂度等强度验证。

**风险**: 用户使用弱密码，容易被暴力破解。

**修复建议**:
```typescript
function validatePassword(password: string): string | null {
  if (password.length < 8) {
    return 'Password must be at least 8 characters';
  }
  if (!/[A-Z]/.test(password)) {
    return 'Password must contain uppercase letter';
  }
  if (!/[a-z]/.test(password)) {
    return 'Password must contain lowercase letter';
  }
  if (!/[0-9]/.test(password)) {
    return 'Password must contain number';
  }
  return null;
}
```

---

### 9. 内存存储 Rate Limit 绕过

**位置**: `src/app/api/auth/[...all]/route.ts:7-23`

**代码**:
```typescript
function maybeRateLimitGetSession(request: Request): Response | null {
  const url = new URL(request.url);
  if (isCloudflareWorker || !url.pathname.endsWith('/api/auth/get-session')) {
    return null;
  }
  // ...
}
```

**问题描述**:
在 Cloudflare Workers 环境下 (`isCloudflareWorker` 为 true) 完全跳过限流，注释说明 "Cloudflare Workers 使用 edge caching"，但这不能替代 rate limit。

**风险**: 在 Workers 环境下无限制访问认证接口。

---

## 🟢 低风险问题

### 10. 调试日志泄露敏感信息

**位置**: `src/shared/blocks/sign/sign-up.tsx:27-29`

**代码**:
```typescript
function debugSignUpLog(step: string, payload?: Record<string, unknown>) {
  if (process.env.NODE_ENV === 'production') return;
  console.log('[signup-debug]', step, payload || {});
}
```

**问题描述**:
在非生产环境记录用户敏感信息（如 email），可能在日志中泄露。

**建议**: 对敏感字段进行脱敏处理。

---

### 11. IP 获取可能不准确

**位置**: `src/shared/lib/rate-limit.ts:25-37`

**代码**:
```typescript
function getClientIpFromRequest(request: Request): string {
  const xff = request.headers.get('x-forwarded-for');
  if (xff) {
    return xff.split(',')[0]?.trim() || '';
  }
  // ...
}
```

**问题描述**:
`X-Forwarded-For` 可被客户端伪造，应优先使用可信的 CDN 头（如 `cf-connecting-ip`）。

**修复建议**:
```typescript
function getClientIpFromRequest(request: Request): string {
  // 优先使用 Cloudflare 提供的 IP
  const cfIp = request.headers.get('cf-connecting-ip');
  if (cfIp) return cfIp;

  // 其次是 X-Real-IP
  const realIp = request.headers.get('x-real-ip');
  if (realIp) return realIp;

  // 最后使用 X-Forwarded-For 的第一个（需确保反向代理已过滤）
  const xff = request.headers.get('x-forwarded-for');
  if (xff) {
    return xff.split(',')[0]?.trim() || '';
  }

  return '';
}
```

---

### 12. 全局变量命名冲突风险

**位置**: `src/shared/lib/rate-limit.ts:20-23`

**代码**:
```typescript
declare global {
  // eslint-disable-next-line no-var
  var __minIntervalRateLimitStore: Store | undefined;
}
```

**问题描述**:
使用全局变量存储限流数据，命名空间不够独特，可能与第三方库冲突。

**建议**: 使用更独特的命名，如 `__videoClawRateLimitStore`。

---

## ✅ 安全做得好的地方

### 1. SSRF 防护完善

**位置**: `src/shared/lib/api-security.ts`

`validateProxyTarget` 函数实现了完善的 SSRF 防护：
- 验证协议为 HTTPS
- 拒绝包含用户名密码的 URL
- 拒绝直接 IP 访问
- DNS 解析后检查是否为私有/保留 IP
- 基于白名单的域名验证

### 2. RBAC 权限系统完整

**位置**: `src/core/rbac/permission.ts`, `src/shared/services/rbac.ts`

- 细粒度的权限控制
- 支持通配符匹配（如 `admin.*`）
- 角色过期机制
- React cache 优化查询性能

### 3. Cookie 安全配置

- 使用 `better-auth` 处理会话
- 自动 CSRF 防护
- HttpOnly、Secure、SameSite 等属性

### 4. SQL 注入防护

- 使用 Drizzle ORM 参数化查询
- 无字符串拼接 SQL

### 5. Email 验证安全

- OTP 6 位数字，长度足够
- 5 分钟有效期（300秒）
- 服务端生成和验证

### 6. 前端限流辅助

**位置**: `src/shared/blocks/sign/verify-email.tsx:47-59`

虽然可以被绕过，但作为第一层防御，前端实现了 60 秒 cooldown，提升用户体验的同时提供基础保护。

---

## 📋 修复优先级建议

| 优先级 | 问题 | 预估工作量 |
|-------|------|----------|
| P0 | Rate Limit 存储不可靠 | 4-6 小时 |
| P0 | XSS 漏洞 (verify-email) | 30 分钟 |
| P0 | AUTH_SECRET 为空检查 | 30 分钟 |
| P1 | Auth Provider 白名单 | 30 分钟 |
| P1 | Open Redirect 防护 | 1 小时 |
| P1 | Email OTP 服务端限流 | 2-3 小时 |
| P2 | LocalStorage 通信安全 | 1-2 小时 |
| P2 | 密码强度验证 | 1 小时 |
| P2 | IP 获取优化 | 30 分钟 |
| P3 | 调试日志脱敏 | 30 分钟 |

---

## 🛡️ 安全加固建议

### 1. 启用 Content Security Policy (CSP)

```typescript
// next.config.js
const cspHeader = `
  default-src 'self';
  script-src 'self' 'unsafe-eval' 'unsafe-inline';
  style-src 'self' 'unsafe-inline';
  img-src 'self' blob: data:;
  font-src 'self';
  object-src 'none';
  base-uri 'self';
  form-action 'self';
  frame-ancestors 'none';
  upgrade-insecure-requests;
`;
```

### 2. 添加安全响应头

```typescript
// middleware.ts
response.headers.set('X-Content-Type-Options', 'nosniff');
response.headers.set('X-Frame-Options', 'DENY');
response.headers.set('X-XSS-Protection', '1; mode=block');
response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
```

### 3. 定期安全审查

- 依赖项漏洞扫描 (`npm audit`)
- 代码安全扫描 (CodeQL、Snyk)
- 渗透测试

---

**报告生成时间**: 2026-04-07  
**审查人**: Claude Code
