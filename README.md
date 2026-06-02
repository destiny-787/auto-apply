# 🤖 Auto Apply — 多平台求职自动化

基于 [loks666/get_jobs](https://github.com/loks666/get_jobs) 的增强版本，一键自动在 Boss直聘、猎聘、51job、智联招聘 四大平台投递简历。

## ✨ 增强功能

- **🔄 统一配置面板** — AI配置 + 四平台配置在同一页面管理，支持一键保存全部
- **🤖 AI双向同步** — 从技能介绍自动提取关键词/城市/薪资/岗位类型，一键同步到各平台
- **🚫 统一黑名单系统** — 跨平台共享黑名单（公司/HR/岗位/关键词），自动过滤四平台
- **🛡️ Boss反检测增强** — WebGL/Canvas指纹伪装、16项浏览器指纹覆盖、Chrome反检测启动参数
- **🎨 前端优化** — Tab状态持久化、AI助手整合（简历分析+对话）、现代化UI

## 🚀 快速开始

### 环境要求

- JDK 21+
- Gradle 9.x
- Node.js 20+（前端）
- Chrome/Chromium 浏览器

### 启动

```bash
# 克隆仓库
git clone https://github.com/destiny-787/auto-apply.git
cd auto-apply

# 启动后端（Spring Boot，端口 8888）
./gradlew bootRun

# 启动前端（Next.js，端口 6866）
cd front
npm install
npm run dev
```

打开浏览器访问 `http://localhost:6866`

### AI 配置

在 `.env` 或环境变量中配置：

```env
API_KEY=sk-xxx
BASE_URL=https://api.openai.com
MODEL=gpt-4o
HOOK_URL=https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=xxx  # 企业微信通知（可选）
```

## 📁 项目结构

```
auto-apply/
├── src/                    # 后端 Spring Boot
│   └── main/java/com/getjobs/
│       ├── application/    # 控制器、服务、实体、Mapper
│       ├── worker/         # 各平台投递Worker + Playwright管理
│       └── resources/      # 配置文件、反检测脚本
├── front/                  # 前端 Next.js
│   └── app/
│       ├── ai-config/      # AI配置 + 统一配置面板
│       ├── boss/           # Boss直聘页面
│       ├── liepin/         # 猎聘页面
│       ├── 51job/          # 51job页面
│       └── zhilian/        # 智联招聘页面
└── doc/                    # 文档
```

## ⚠️ 注意事项

- 需要关闭墙外代理，国内招聘平台对海外IP敏感
- 不支持服务器部署，招聘网站会拒绝服务器IP
- Boss直聘每日打招呼上限约150次
- 请合理使用，勿用于商业用途

## 📄 开源协议

[MIT License](LICENSE) — 基于 [loks666/get_jobs](https://github.com/loks666/get_jobs)
