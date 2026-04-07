# YouTube Transcript API 使用说明文档（给 Claude Code / 开发用）

## 1. 基本信息

- **Base URL：** `https://transcriptapi.com/api/v2`
- **Endpoint：** `GET /youtube/transcript`
- **计费：** 成功返回（HTTP 200）时扣 1 credit

完整请求示例（cURL）：

```bash
curl -X GET "https://transcriptapi.com/api/v2/youtube/transcript?video_url=dQw4w9WgXcQ" \
  -H "Authorization: Bearer YOUR_API_KEY"
```

---

## 2. 认证方式

使用 Bearer Token：

- HTTP Header：
  - `Authorization: Bearer YOUR_API_KEY`
- 注意事项：
  - API Key 必须放在后端环境变量中，不要暴露在前端
  - 建议按环境（dev / staging / prod）使用不同的 API Key
  - 定期轮换 Key

---

## 3. 请求参数

### 3.1 video_url（必填）

YouTube 视频标识，支持三种形式：

- 完整链接：
  - `https://www.youtube.com/watch?v=dQw4w9WgXcQ`
- 短链接：
  - `https://youtu.be/dQw4w9WgXcQ`
- 纯视频 ID：
  - `dQw4w9WgXcQ`

约束：

- Type: `string`
- Pattern: `^([a-zA-Z0-9_-]{11}|https?://.*)$`
- Required: Yes

示例（URL 查询参数形式）：

- `?video_url=https://www.youtube.com/watch?v=dQw4w9WgXcQ`
- `?video_url=https://youtu.be/dQw4w9WgXcQ`
- `?video_url=dQw4w9WgXcQ`

### 3.2 format（可选）

控制返回格式。

- Type: `string`
- 可选值：`json` | `text`
- 默认值：`json`

含义：

- `json`：返回结构化的字幕片段数组（包含时间信息）
- `text`：返回一段纯文本字幕（可以按是否带时间戳再细分，见 include_timestamp）

示例：

- `?video_url=...&format=json`
- `?video_url=...&format=text`

### 3.3 include_timestamp（可选）

是否包含时间戳。

- Type: `boolean`
- 默认值：`true`

与 `format` 的组合行为：

| format | include_timestamp | 输出内容示意                       |
| ------ | ----------------- | ---------------------------------- |
| json   | true              | `[{ text, start, duration }, ...]` |
| json   | false             | `[{ text }, ...]`                  |
| text   | true              | 每行形如 `[123.45s] xxx` 的文本    |
| text   | false             | 纯连接的文本，没有时间前缀         |

示例：

- `?video_url=...&format=json&include_timestamp=false`
- `?video_url=...&format=text&include_timestamp=true`

### 3.4 send_metadata（可选）

是否在返回中附带视频元数据。

- Type: `boolean`
- 默认值：`false`

开启后，响应中会多一个 `metadata` 字段，包含：

- `title`：视频标题
- `author_name`：频道名称
- `author_url`：频道 URL
- `thumbnail_url`：缩略图 URL

示例：

- `?video_url=...&send_metadata=true`
- `?video_url=...&format=text&include_timestamp=false&send_metadata=true`

---

## 4. 响应格式

### 4.1 JSON（默认，带时间戳）

当不指定 `format` 或 `format=json` 且 `include_timestamp=true` 时：

```json
{
  "video_id": "dQw4w9WgXcQ",
  "language": "en",
  "transcript": [
    {
      "text": "Never gonna give you up",
      "start": 0.0,
      "duration": 4.12
    },
    {
      "text": "Never gonna let you down",
      "start": 4.12,
      "duration": 3.85
    }
  ],
  "metadata": {
    "title": "Rick Astley - Never Gonna Give You Up",
    "author_name": "RickAstleyVEVO",
    "author_url": "https://www.youtube.com/@RickAstley",
    "thumbnail_url": "https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg"
  }
}
```

注意：

- `metadata` 只有在 `send_metadata=true` 时才会出现
- `language` 是自动识别的字幕语言代码（例如 `en`）

### 4.2 JSON（不带时间戳）

`format=json&include_timestamp=false` 时：

```json
{
  "video_id": "dQw4w9WgXcQ",
  "language": "en",
  "transcript": [
    { "text": "Never gonna give you up" },
    { "text": "Never gonna let you down" }
  ]
}
```

适用场景：

- 只关心内容文本，时间信息不重要
- 需要把所有字幕拼接后送给 LLM 做摘要 / QA

### 4.3 文本格式（带时间戳）

`format=text&include_timestamp=true` 时：

- 服务端会返回纯文本，每一行前面带秒数，如：
  - `[0.00s] Never gonna give you up`
  - `[4.12s] Never gonna let you down`

适用场景：

- 日志式显示、简单 CLI 输出
- 人类直接阅读，仍然需要大致时间定位

### 4.4 文本格式（不带时间戳）

`format=text&include_timestamp=false` 时：

- 返回一段纯文本，没有任何时间前缀
- 通常是把所有段落拼接成一个长字符串

适用场景：

- 直接送入 LLM（例如 Claude）做长文理解
- 在页面上以普通文章形式展示字幕

---

## 5. 关键 Header

响应会包含一个缓存相关 Header：

- `X-Cache-Status`：
  - `HIT`：完全命中缓存
  - `PARTIAL-HIT`：部分命中
  - `MISS`：未命中

对应用而言可选用法：

- 可以根据 `HIT/MISS` 做简单的日志统计、监控缓存命中率
- 不影响正常业务逻辑

---

## 6. 错误与重试策略（与此 API 强相关部分）

典型错误码和处理建议（仅与本 endpoint 强相关的部分，方便 Claude Code 实现封装）：

- `200`：成功
  - 扣 1 credit
- `400`：Bad Request
  - 常见原因：缺少 `video_url`、URL / ID 不符合 pattern
  - 行为：不要重试，直接提示参数错误
- `401`：Unauthorized
  - API Key 无效或缺失
  - 行为：检查服务端配置的 Key
- `402`：Payment Required
  - 没有可用 credits 或没有付费 plan
  - 行为：在 UI 中提示用户充值 / 购买计划
- `404`：Not Found
  - 视频不存在或没有可用字幕
  - 行为：提示“该视频没有可用字幕或已被删除”
- `408` / `429` / `503`：
  - 超时 / 触发风控 / 频率限制 / 服务暂时不可用
  - 行为：可以做 2–3 次指数回退重试（例如 1s -> 2s -> 4s）
- `422`：Validation Error
  - `video_url` 不合法
  - 行为：不要重试，要求用户提供正确的视频链接

错误响应格式统一为：

```json
{
  "detail": "Human-readable error message",
  "code": "ERROR_CODE"
}
```

---

## 7. 建议的封装形态（给 Claude Code 的实现提示）

建议在后端（Node.js / Next.js API Route / Edge Function 等）封装一个函数，例如：

```ts
// pseudo-code / TypeScript 风格
async function fetchYoutubeTranscript(options: {
  videoUrl: string;
  format?: 'json' | 'text';
  includeTimestamp?: boolean;
  sendMetadata?: boolean;
}) {
  // 1. 组装 URL + 查询参数
  // 2. 附带 Authorization Bearer 头
  // 3. 处理 2xx / 4xx / 5xx 错误码
  // 4. 支持可选的重试机制（针对 408 / 429 / 503）
  // 5. 根据 format 决定解析 JSON 还是纯文本
}
```

在调用 LLM（例如 Claude）时的常见 pattern：

- 如果要做“逐句对齐 + 高级编辑”，推荐：
  - `format=json&include_timestamp=true&send_metadata=true`
- 如果要做“整段总结 / QA”，推荐：
  - `format=text&include_timestamp=false`
  - 然后直接把文本作为 system / user content 输入给 Claude

---

## 8. 快速对接 Checklist

1. 在后端配置 `TRANSCRIPT_API_KEY` 环境变量
2. 在服务端封装 `GET /youtube/transcript` 调用（含重试逻辑）
3. 根据业务选择合适参数：
   - 结构化处理：`format=json`
   - 只要纯文：`format=text&include_timestamp=false`
4. 对错误码做分支处理（参数问题 / 授权问题 / 额度不足 / 临时失败）
5. 将返回的文本或 JSON 结果转交给 Claude 做后续处理（摘要、检索、问答等）
