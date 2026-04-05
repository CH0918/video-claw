# 安全审计报告

> 审计日期：2026-04-05
> 审计范围：`src/app/api/` 下所有 API 路由及相关服务层代码

---

## 🔴 严重漏洞

### 1. SSRF（服务端请求伪造）— `/api/proxy/file/route.ts`

`src/app/api/proxy/file/route.ts:4` 直接将用户传入的 `url` 参数用于服务端 `fetch`，没有任何校验：

```typescript
const url = req.nextUrl.searchParams.get('url');
const response = await fetch(url); // 直接请求任意 URL
```

**攻击方式：**

- 访问内网服务（`http://169.254.169.254` 获取云元数据/密钥）
- 扫描内网端口和服务
- 访问 `file://` 等协议读取本地文件
- 利用服务器作为代理攻击其他系统

**建议：** 添加 URL 白名单校验，限制只允许特定域名（如 CDN 域名），拒绝内网 IP 和非 http/https 协议。

---

### 2. 图片上传无认证 — `/api/storage/upload-image/route.ts`

`src/app/api/storage/upload-image/route.ts` 没有调用 `getUserInfo()` 做身份验证。任何人都可以无限上传文件到存储服务。

**风险：**

- 存储费用暴涨
- 被用作恶意文件托管
- 无文件大小限制，可上传超大文件耗尽存储

**建议：** 添加身份验证，限制单文件大小和上传频率。

---

## 🟠 中等漏洞

### 3. 积分扣费与服务执行的时序问题 — 先扣费后执行无退款

`src/app/api/video/translate/route.ts:20-37` 和 `src/app/api/video/chat/stream/route.ts:30-42` 都是先扣积分再执行操作，但失败时没有退款逻辑：

```typescript
// translate/route.ts — 扣费后翻译失败，积分不退
await consumeVideoSubtitleTranslationCredits({...}); // 先扣
const result = await translateVideoCaptions(...);     // 后执行，失败了积分就没了
```

对比 `analysis/route.ts` 做了退款处理，但 `translate` 和 `chat/stream` 没有。

**建议：** 在 `catch` 块中调用 `refundCredits` 退还积分，保持与 `analysis/route.ts` 一致的退款逻辑。

---

### 4. 视频分析缺少资源归属校验 — IDOR

`src/app/api/video/analysis/status/route.ts:24` 查询分析记录时没有校验 `record.userId === user.id`：

```typescript
const record = await findVideoAnalysisById(String(analysisId));
// 没有检查 record.userId === user.id
```

用户 A 可以通过猜测/枚举 `analysisId` 查看用户 B 的视频分析结果。同样的问题存在于 chat 和 translate 接口。

**建议：** 查询后校验 `record.userId === user.id`，不匹配则返回 403。

---

### 5. 积分并发竞态条件 — `consumeCredits`

`src/shared/models/credit.ts:192-298` 虽然用了 `SELECT ... FOR UPDATE`，但 `batchNo` 的递增逻辑有问题——它在内层 `for` 循环里递增，而不是在外层 `while` 循环。这意味着如果一个 batch 有多条记录，`batchNo` 会快速超过 `maxBatchNo` 限制，导致正常扣费失败。

**建议：** 将 `batchNo++` 移到外层 `while` 循环末尾，内层循环只处理单个 batch 内的记录。

---

### 6. 错误信息泄露内部状态

多个 API 路由直接将 `e.message` 返回给客户端（如 `src/app/api/video/analysis/route.ts:84`），可能泄露数据库结构、内部路径等敏感信息。

**建议：** 生产环境下返回通用错误信息，将详细错误仅记录到日志。

---

## 🟡 低风险问题

| 问题 | 位置 | 说明 |
|------|------|------|
| `console.log` 记录敏感信息 | `src/app/api/storage/upload-image/route.ts:26-28` | 生产环境日志中记录了文件名、类型、大小、URL |
| `tx` 参数类型为 `any` | `src/shared/models/credit.ts:183` | 事务对象无类型约束，可能被误用 |
| `JSON.parse` 无防护 | `src/shared/models/credit.ts:376` | `consumedDetail` 如果被篡改，`JSON.parse` 会抛异常 |
| chat messages 未做长度限制 | `src/app/api/video/chat/stream/route.ts:17` | 用户可发送超长 messages 数组，导致 AI API 费用暴涨 |

---

## 建议优先修复顺序

1. **立即修复** — SSRF 代理漏洞（最危险，可导致服务器被完全控制）
2. **立即修复** — 上传接口加认证 + 文件大小限制
3. **尽快修复** — 所有资源访问加 userId 归属校验（IDOR）
4. **尽快修复** — translate / chat 失败时的积分退款逻辑
5. **计划修复** — 错误信息脱敏、日志清理、messages 长度限制
