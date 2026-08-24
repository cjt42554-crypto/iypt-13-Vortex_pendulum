# 模拟程序

本目录包含涡流摆研究平台的模型、求解器、分析工具、界面和自动化测试，采用 TypeScript、Vite 与 Vitest 工具链。

## 目录与入口

- [`src/`](src/)：核心模型、求解器、分析和界面源码。
- [`tests/`](tests/)：自动化测试。
- [`scripts/`](scripts/)：模拟、分析、桌面启动和文档检查脚本。
- [`public/`](public/)：静态资源和示例输入。
- [`文档/`](文档/)：程序模型说明。
- [`package.json`](package.json)：运行命令、开发依赖和 Node.js 版本要求。
- [`index.html`](index.html)：Vite 页面入口。

## 运行

需要 Node.js 22 或更高版本：

```bash
npm ci
npm run dev
npm run validate
```

`npm run validate` 汇总单元测试、构建、桌面检查、端到端测试和文档检查；这些软件检查不等同于装置级物理或实验验证。
