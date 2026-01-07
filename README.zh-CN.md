# AI Chatbot Lab - 中文说明

## 简介

AI Chatbot Lab 是一个功能强大的 AI 模型测试和对比工具，支持多模型并行测试、图片上传、配置管理等功能。

## 快速开始

### 方式一：使用启动脚本（推荐）

Windows 用户直接双击 `start.bat` 文件即可自动启动前后端服务。

### 方式二：手动启动

```bash
# 1. 安装依赖
npm install

# 2. 配置环境变量
# 复制 .env.example 为 .env 并填入你的 API Key
cp .env.example .env

# 3. 启动后端服务（新终端）
npm run api

# 4. 启动前端服务（新终端）
npm run dev
```

访问 http://localhost:5173 即可使用。

## 主要功能

- ✅ 多模型并行测试对比
- ✅ 支持图片上传和多模态对话
- ✅ AI 图像生成功能
- ✅ 七牛云图床集成（可选）
- ✅ 灵活的配置管理
- ✅ 优雅的深色主题界面

## 生产部署

### Docker 部署

```bash
docker build -t ai-chatbot-lab .
docker run -p 80:80 ai-chatbot-lab
```

### 直接部署

```bash
# Linux/Mac
chmod +x deploy.sh
./deploy.sh

# Windows
# 使用 Git Bash 或 WSL 运行 deploy.sh
```

## 配置说明

在应用界面的配置面板中可以设置：

- **Model Name**: 选择 AI 模型
- **API Key**: OpenAI API 密钥
- **Base URL**: API 基础地址
- **Temperature**: 生成温度 (0-2)
- **System Instruction**: 系统提示词

### 七牛云配置（可选）

如需使用图床功能，在"高级配置"中填写：
- Access Key / Secret Key
- Bucket 名称
- 访问域名
- 存储区域

## 技术栈

- React 19 + TypeScript 5
- Vite 6
- Tailwind CSS 4
- Node.js 后端代理

## 项目结构

```
.
├── components/          # React 组件
├── server/             # 后端服务
├── services/           # 业务逻辑
├── App.tsx             # 主应用
├── index.tsx           # 入口文件
├── types.ts            # 类型定义
└── vite.config.ts      # Vite 配置
```

## 常见问题

**Q: 如何更换 API 地址？**
A: 在配置面板的 Base URL 中修改即可。

**Q: 图片上传失败？**
A: 请检查七牛云配置是否完整，或查看控制台错误信息。

**Q: 如何添加新模型？**
A: 在 `types.ts` 中添加模型枚举即可。

## 许可证

MIT License

## 相关链接

- [完整英文文档](./README.md)
- [OpenAI API](https://platform.openai.com/docs)
- [Vite 文档](https://vitejs.dev)
