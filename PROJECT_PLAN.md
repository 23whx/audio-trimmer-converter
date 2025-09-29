# Audio Trimmer & Converter 项目指南

## 愿景

- 打造一款快速、易用、可在浏览器直接运行的音频裁剪与格式转换工具，面向创作者与营销团队。
- 支持导入常见音频与视频文件，提供可视化裁剪体验，并输出用户所选格式。
- 提供英文、简体中文、日文三语界面，保持一致的用户体验与 SEO 策略。

## 核心用户流程

1. 多语言落地页展示价值主张、SEO 关键词内容，并引导进入编辑器。
2. 用户通过拖拽或点击上传音频/视频文件。
3. 对于视频自动抽取音轨，以波形和时间轴展示。
4. 用户设置起止点并预览裁剪效果，可选增益或淡入淡出（后续增强）。
5. 可选择导出格式（MP3、WAV、AAC、FLAC，可扩展）并下载音频。
6. 显示操作提示与最佳实践，可选订阅更新（后续邮件收集能力）。

## 功能范围

### MVP（Vercel 首发）

- 纯前端使用 `ffmpeg.wasm` 完成裁剪与编码。
- 通过 `wavesurfer.js`（React 封装）展示波形并支持拖拽、缩放。
- 时间范围选择支持键盘微调与精确数值输入。
- EN/ZH/JA 三语切换，偏好存储于 Local Storage。
- 桌面与移动端响应式布局。
- 接入基础分析（Vercel Analytics 或 Plausible），保证隐私合规。

### 后续增强

- 批量处理与任务队列。
- 音频效果：淡入淡出、归一化、降噪预设。
- 自动分割超大文件，将长音频切片为可处理的片段并保持无缝衔接。
- 对上传音频进行无损压缩，减少导入时的内存占用与上传时长。
- 音频识别转文字，并根据时间轴生成多语言字幕文件（SRT/VTT），支持导出。
- 云端存储接入（Supabase 或 S3）以支持大文件与历史记录。
- 账户体系，保存预设与最近项目。
- 共享预览链接，需轻量后端或 Serverless 支撑。

## 技术栈

- 框架：Astro 4，结合静态渲染与 SSR，使用 React 18 岛屿组件。
- UI 层：React、Tailwind CSS、Headless UI 保证无障碍。
- 音频处理：`@ffmpeg/ffmpeg`（WASM 版本）、`wavesurfer.js` 波形可视化、`ffmpeg` 命令集实现分割与压缩。
- 状态管理：局部 Hook + `zustand` 维护编辑器全局状态。
- 表单与校验：React Hook Form + Zod 校验裁剪输入。
- 国际化：`@astrojs/i18n` 或 `astro-i18next`，文案存放于 JSON/MDX。
- 语音转写：评估 `@xenova/transformers`（Whisper WebAssembly 版）或调用 Vercel Edge Functions 封装的语音识别服务。
- 工具链：TypeScript、ESLint（Astro+React 预设）、Prettier、Vitest、Testing Library、Playwright。

## 项目结构（建议）

```
/
|- public/                 # 静态资源、favicon、各语言 OG 图
|- src/
|  |- components/
|  |  |- editor/          # 波形、控制等 React 岛屿
|  |  |- layout/          # 导航、页脚、语言切换
|  |  |- ui/              # 可复用 Tailwind 组件
|  |- content/
|  |  |- en/
|  |  |- zh/
|  |  |- ja/
|  |- pages/
|  |  |- index.astro      # 落地页，SEO 内容
|  |  |- editor.astro     # 承载编辑器岛屿
|  |- i18n/               # 语言配置与字典
|  |- lib/                # 工具函数（ffmpeg 加载、分析封装、语音识别桥接）
|  |- styles/
|     |- tailwind.css
|- astro.config.mjs
|- tailwind.config.cjs
|- tsconfig.json
|- package.json
|- README.md（多语言快速上手）
```

## SEO 与内容策略

- 针对各语言进行关键词研究（音频裁剪、格式转换、下载等长尾词），撰写本地化文案。
- 使用 Astro content collections 管理结构化内容，统一元数据。
- 通过 `@vercel/og` 或 Astro 图像服务生成各语言 OG 图。
- 配置 `SoftwareApplication` JSON-LD，包含多语言名称、描述、操作系统、类别。
- 设置 canonical 与 `hreflang` 指向 en/zh/ja 对应路径。
- 重内容轻脚本：静态预渲染文本，按需懒加载 React 组件。
- 预留 sitemap 与 RSS，支持长期内容营销。
- FAQ 折叠模块覆盖语音搜索问题。

## 国际化方案

- 默认语言：英文（`/`），额外提供 `/zh/`、`/ja/` 路由。
- 使用 Astro 的语言路由映射自动切换内容。
- 在 `src/i18n/[locale].json` 维护通用 UI 字典。
- 导航与页脚提供语言切换，偏好写入 `localStorage` 并同步 URL。
- 本地化页面元数据、alt 文本与结构化数据。
- 关键 SEO 文案采用专业翻译，次要 UI 文案可社区协助。

## 样式与体验规范

- Tailwind CSS 定义颜色、间距、排版等设计令牌。
- 主要配色：基础白色；背景使用淡绿色；核心功能模块应用深绿色；局部辅助区域使用淡红色；极少数关键内容使用亮红色强调；整体形成红绿对比并保持层次。
- 预留暗色模式（后续迭代），保持组件间一致的对比与阴影节奏。
- 波形编辑区域作为视觉中心，两侧为预设与导出面板。
- 提供键盘快捷键（空格播放/暂停，`[`、`]` 调整标记）及跨语言提示。
- 符合 WCAG 2.1 AA，无障碍焦点、ARIA 标签、高对比检测。

## 性能与优化

- 用户进入编辑器时再懒加载 `ffmpeg.wasm`，显示初始化进度。
- 使用 Web Worker（`ffmpeg.createWorker`）避免阻塞主线程。
- 对超大文件先进行自动分割，再逐段处理与预览。
- 上传阶段做无损压缩，降低浏览器内存占用与处理时长。
- 通过 `wavesurfer` 抽样降低波形重绘压力。
- 各语言执行 Lighthouse，压缩后最大 JS 包不超过 300 KB。

## 部署流程

- 连接 GitHub 仓库，由 Vercel 托管部署。
- 默认包管理器 `pnpm`，构建命令 `pnpm run build`，产物位于 `.astro/dist`。
- 在 Vercel 控制台配置分析或第三方服务所需环境变量。
- 启用 Vercel Preview 注释，支持 PR 评审。
- 部署后手动触发 Playwright 烟雾测试。

## Google Ads 准备

- 落地页遵循 Google Ads 政策：明确 CTA、隐私政策、联系方式。
- 新建 `privacy-policy.astro` 与 `terms.astro`，在页脚可访问。
- 如需更多分析/广告脚本，提前增加 Cookie 同意弹窗。
- 获得初始流量后配置转化事件（导出完成、字幕生成、订阅成功）。
- 优化核心 Web 指标，提升广告质量得分。

## 开发环境

- 前置要求：Node.js 20.x LTS，pnpm 9.x。
- 常用命令：
  - `pnpm install`：安装依赖。
  - `pnpm dev`：启动 Astro 开发服务器。
  - `pnpm build`：生成生产构建。
  - `pnpm preview`：本地预览生产构建。
  - `pnpm test`：运行 Vitest 单元测试。
  - `pnpm lint`：执行 ESLint 与类型检查。
  - `pnpm format`：运行 Prettier。
- 建议在 VS Code 安装 Astro、ESLint、Tailwind 插件，添加 `.editorconfig`。

## 测试策略

- 使用 Vitest 覆盖裁剪状态管理、分割与压缩逻辑、工具函数。
- 借助 Testing Library + JSDOM 测试编辑器组件（含多语言快照、字幕导出按钮等）。
- 针对语音转写功能编写端到端用例：上传样例音频 → 生成字幕 → 校验时间轴。
- Playwright 行为测试并保存 Trace，用于视觉回归。
- 手工 QA 清单：三语言场景，覆盖 Chrome、Edge、Safari（含 iOS），以及大文件分割与字幕生成流程。

## 数据分析与监控

- 集成 Vercel Analytics 或 Plausible，获取隐私友好指标。
- MVP 稳定后加入 Sentry 浏览器 SDK 捕获错误。
- 追踪关键事件：文件上传、分割完成、无损压缩完成、字幕生成、导出下载。
- 通过 Vercel Speed Insights 与 Google Search Console 监控核心指标。

## 路线图（建议）

- 第 1 周：项目脚手架、Tailwind 配置、英文落地页与占位翻译。
- 第 2 周：实现上传、波形编辑器（英文），集成 ffmpeg.wasm 裁剪与基础导出。
- 第 3 周：完成国际化、补全翻译、强化 SEO 元数据；实现自动分割与无损压缩原型。
- 第 4 周：接入语音转写与字幕生成 MVP，QA、性能优化、准备法律页面，部署 Vercel 预览。
- 第 5 周：上线生产、核验分析数据、提交 Google Ads 审核，根据反馈迭代。

## 待确认问题

- 浏览器端单文件最大尺寸限制？是否需要提供断点续传或分片上传策略？
- 语音识别是否必须离线完成？可否允许调用云端 API（影响成本与隐私）。
- 上线时是否收集邮箱，还是待广告通过后再开启？
- 是否有既有品牌规范或设计系统？
- 字幕与转写是否需要支持多语言翻译，还是仅原语种？

## 参考资源

- https://ffmpegwasm.netlify.app/
- https://wavesurfer-js.org/
- https://github.com/xenova/transformers.js
- https://docs.astro.build/
- https://tailwindcss.com/docs
- https://vercel.com/docs
