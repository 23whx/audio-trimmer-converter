# MediaTrim - Free Online Video & Audio Editor

🎬 **Professional video and audio editing directly in your browser!** Cut, trim, convert and edit media files without downloading software or uploading to servers. Supports MP4, AVI, MOV, MP3, WAV, and dozens of other formats.

## 🚀 Key Features

- 🎥 **Video Trimming** - Precise video cutting and editing with frame-by-frame accuracy
- 🎵 **Audio Editing** - Professional audio trimming, cutting and format conversion
- 🔄 **Format Conversion** - Convert between MP4, AVI, MOV, MP3, WAV, and more
- 🎛️ **Real-time Preview** - Waveform visualization and instant media playback
- 🌍 **Multi-language** - English, Chinese, Japanese interface
- 📱 **Mobile-Friendly** - Works on desktop, tablet, and mobile devices
- 🔒 **Privacy First** - All processing happens locally in your browser
- ⚡ **No Upload Required** - Edit files directly without server uploads
- 💰 **100% Free** - No registration, watermarks, or hidden fees

## 🛠️ 技术栈

- **前端框架**: [Astro](https://astro.build/) + React
- **样式**: TailwindCSS
- **音频处理**: FFmpeg.wasm
- **波形显示**: WaveSurfer.js
- **状态管理**: Zustand
- **语言**: TypeScript

## 🚀 本地开发

### 环境要求

- Node.js 18+
- pnpm (推荐) 或 npm

### 安装依赖

```bash
pnpm install
```

### 启动开发服务器

```bash
pnpm dev
```

访问 http://localhost:4321

### 构建生产版本

```bash
pnpm build
```

### 预览生产版本

```bash
pnpm preview
```

## 📦 部署到Vercel

### 自动部署 (推荐)

1. Fork或克隆此仓库
2. 在 [Vercel](https://vercel.com) 上导入项目
3. Vercel会自动检测Astro框架并配置构建设置
4. 部署完成！

### 手动部署

```bash
# 安装Vercel CLI
npm i -g vercel

# 部署
vercel --prod
```

## 🌐 多语言路由

- 英文 (默认): `/`, `/editor`
- 中文: `/zh`, `/zh/editor`  
- 日文: `/ja`, `/ja/editor`

## 📁 项目结构

```
src/
├── components/          # React组件
│   ├── editor/         # 编辑器相关组件
│   ├── layout/         # 布局组件
│   └── ui/            # 通用UI组件
├── lib/               # 工具库
│   ├── audio/         # 音频处理逻辑
│   ├── i18n/          # 国际化
│   └── stores/        # 状态管理
├── pages/             # 页面路由
│   ├── [lang]/        # 多语言页面
│   └── ...
└── styles/            # 样式文件
```

## 🔧 环境变量

创建 `.env.local` 文件（可选）：

```env
# 如果需要配置CDN或其他服务
PUBLIC_CDN_URL=your_cdn_url
```

## 🤝 贡献

欢迎提交Issue和Pull Request！

## 📄 许可证

MIT License

## 🙏 致谢

- [FFmpeg.wasm](https://ffmpegwasm.netlify.app/) - 浏览器中的音频/视频处理
- [WaveSurfer.js](https://wavesurfer-js.org/) - 音频波形可视化
- [Astro](https://astro.build/) - 现代Web框架
