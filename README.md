# video-claw

## 项目目录结构

以下目录树聚焦于仓库中需要维护的源码、内容、配置与设计资产，省略了 `.git`、`node_modules` 等运行时或依赖目录。

```text
video-claw/
├── .claude/                    # Claude 相关的本地协作配置与技能
├── .codex/                     # Codex 相关的本地技能、自动化配置
├── .doc/                       # 项目内部文档、调研记录与方案沉淀
├── .github/                    # GitHub 配置
│   └── workflows/              # CI/CD 工作流，例如构建或检查流程
├── .source/                    # 额外源码入口或辅助脚本源码
├── .ui/                        # UI 设计稿与原型资源
├── content/                    # 内容驱动的数据目录
│   ├── docs/                   # 文档站内容
│   ├── logs/                   # 更新日志、版本记录等内容
│   ├── pages/                  # 自定义页面内容
│   └── posts/                  # 博客文章内容
├── public/                     # 静态资源目录，直接对外暴露
│   └── imgs/                   # 图片资源，如图标、Logo、案例图、背景图
├── scripts/                    # 开发与运维脚本，如环境注入、RBAC 初始化
├── src/                        # 核心应用源码
│   ├── app/                    # Next.js App Router 路由、页面与 API
│   │   ├── [locale]/           # 多语言页面入口
│   │   └── api/                # 服务端 API 路由
│   ├── config/                 # 项目级配置
│   │   ├── db/                 # 数据库配置
│   │   ├── locale/             # 国际化配置
│   │   ├── style/              # 样式相关配置
│   │   └── theme/              # 主题配置
│   ├── core/                   # 基础能力层
│   │   ├── auth/               # 认证与登录能力
│   │   ├── db/                 # 数据库连接、Schema 与迁移配置
│   │   ├── docs/               # 文档系统核心逻辑
│   │   ├── i18n/               # 国际化核心逻辑
│   │   ├── rbac/               # 角色权限控制
│   │   └── theme/              # 主题切换与主题能力
│   ├── extensions/             # 可插拔扩展能力
│   │   ├── ads/                # 广告扩展
│   │   ├── affiliate/          # 联盟营销扩展
│   │   ├── ai/                 # AI 能力扩展
│   │   ├── analytics/          # 数据分析与埋点
│   │   ├── customer-service/   # 客服相关扩展
│   │   ├── email/              # 邮件能力扩展
│   │   ├── payment/            # 支付能力扩展
│   │   └── storage/            # 存储能力扩展
│   ├── shared/                 # 可复用共享层
│   │   ├── blocks/             # 业务模块级 UI 区块
│   │   ├── components/         # 通用组件与基础 UI 组件
│   │   ├── contexts/           # React Context
│   │   ├── hooks/              # 自定义 Hooks
│   │   ├── lib/                # 工具函数与底层封装
│   │   ├── models/             # 数据模型定义
│   │   ├── services/           # 服务层逻辑
│   │   └── types/              # TypeScript 类型定义
│   └── themes/                 # 主题实现
│       └── default/            # 默认主题
├── package.json                # 项目依赖与脚本入口
├── README.md                   # 项目说明文档
└── tsconfig.json               # TypeScript 配置
```

## 结构理解建议

- `src/app` 负责“路由入口”，决定页面和接口怎么暴露。
- `src/core` 负责“底层能力”，放鉴权、数据库、权限、国际化这类基础设施。
- `src/extensions` 负责“功能扩展”，适合接入广告、支付、AI、存储等横向能力。
- `src/shared` 负责“复用沉淀”，放组件、Hooks、工具函数和通用业务区块。
- `content` 和 `public` 分别对应“内容数据”和“静态资源”。

如果后续目录有新增，建议继续沿用“目录树 + 作用说明”的格式维护这一节。
