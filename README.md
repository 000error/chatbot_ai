# AI Chatbot Lab

一个功能强大的 AI 模型测试和对比工具,支持多模型并行测试、图片上传、配置管理等功能。基于 React + Vite + TypeScript 构建。

## ✨ 核心功能

- 🤖 **多模型支持**: 支持 OpenAI GPT-4o、GPT-4o-mini 等多种模型
- 📊 **并行测试**: 同时测试多个模型配置,快速对比效果
- 🖼️ **图片处理**: 支持图片上传和多模态对话
- 🎨 **AI 绘图**: 集成图像生成功能
- 📦 **七牛云集成**: 可选配置七牛云存储图片
- ⚙️ **灵活配置**: 支持自定义 API Key、Base URL、温度等参数
- 🌓 **暗色主题**: 精心设计的暗色界面

## 🚀 快速开始

### 环境要求

- Node.js >= 18.0.0
- npm >= 9.0.0

### 安装依赖

```bash
npm install
```

### 配置环境变量

创建 `.env` 文件并配置 API Key:

```env
VITE_API_KEY=your-api-key-here
```

### 启动开发服务器

需要同时启动前端和后端服务:

```bash
# 终端 1: 启动后端代理服务器
npm run api

# 终端 2: 启动前端开发服务器
npm run dev
```

然后访问 http://localhost:5173

## 📦 生产部署

### 构建生产版本

```bash
npm run build
```

构建产物将输出到 `dist` 目录。

### 部署方式

#### 1. Vercel / Netlify (推荐)

- 构建命令: `npm run build`
- 输出目录: `dist`
- 安装命令: `npm install`

#### 2. Docker 部署

创建 `Dockerfile`:

```dockerfile
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

构建和运行:

```bash
docker build -t ai-chatbot-lab .
docker run -p 80:80 ai-chatbot-lab
```

#### 3. Node.js 服务器部署

```bash
# 安装 serve
npm install -g serve

# 构建并启动
npm run build
serve -s dist -l 3000
```

同时需要启动后端服务:

```bash
# 设置环境变量
export PORT=8787
export API_KEY=your-api-key

# 启动后端
node server/proxy.js
```

## 🔧 配置说明

### API 配置

在界面的配置面板中可以设置:

- **Model Name**: 选择要使用的模型
- **API Key**: OpenAI API 密钥
- **Base URL**: API 基础地址(默认为代理服务器)
- **Temperature**: 生成温度(0-2)
- **System Instruction**: 系统提示词

### 七牛云配置(可选)

如需使用七牛云存储图片:

1. 在配置面板展开「高级配置」
2. 填写七牛云信息:
   - Access Key
   - Secret Key
   - Bucket 名称
   - 域名
   - 存储区域

## 📁 项目结构

```
.
├── components/          # React 组件
│   ├── ConfigSection.tsx   # 配置面板
│   ├── InputSection.tsx    # 输入区域
│   └── ResultSection.tsx   # 结果展示
├── server/              # 后端服务
│   └── proxy.js            # 代理服务器
├── services/            # 业务逻辑
│   ├── openAIService.ts    # AI 服务调用
│   └── qiniuService.ts     # 七牛云服务
├── public/              # 静态资源
├── App.tsx              # 主应用组件
├── index.tsx            # 应用入口
├── types.ts             # TypeScript 类型定义
├── index.html           # HTML 模板
└── vite.config.ts       # Vite 配置
```

## 🛠️ 技术栈

- **前端框架**: React 19
- **构建工具**: Vite 6
- **样式**: Tailwind CSS 4
- **类型**: TypeScript 5
- **后端**: Node.js HTTP Server
- **图床**: 七牛云(可选)

## 📝 开发说明

### 代码规范

- 使用 TypeScript 编写类型安全的代码
- 遵循 React Hooks 最佳实践
- 组件职责单一,保持代码简洁
- 合理使用 useState 和异步处理

### 添加新模型

在 `types.ts` 中的 `OpenAIModel` 或 `GeminiModel` 枚举中添加:

```typescript
export enum OpenAIModel {
  GPT_4O_MINI = 'gpt-4o-mini',
  GPT_4O = 'gpt-4o',
  YOUR_MODEL = 'your-model-name', // 添加新模型
}
```

## 🤝 贡献

欢迎提交 Issue 和 Pull Request!

## 📄 许可证

MIT License

## 🔗 相关链接

- [OpenAI API 文档](https://platform.openai.com/docs)
- [Vite 官方文档](https://vitejs.dev)
- [React 官方文档](https://react.dev)
- [Tailwind CSS 文档](https://tailwindcss.com)
