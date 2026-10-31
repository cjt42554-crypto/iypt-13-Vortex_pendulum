# 模拟程序

本目录包含涡流摆研究平台的模型、求解器、分析工具、界面和自动化测试，采用 TypeScript、Vite 与 Vitest 工具链。

## 当前采用版本

前向求解统一使用 [`src/solvers/forward/`](src/solvers/forward/)，按物理输入选择模型；SS、DW 和组合分支各有适用范围，不是可按日期淘汰的旧副本。

| 用途 | 模型与唯一入口 | 使用边界 |
| --- | --- | --- |
| 基线前向预测 | `VP-FWD-P0-SL1-v1`；[前向 CLI](scripts/run-forward.ts) | 平滑摩擦、原阻力宽度，需联合标定域与完整初态 |
| 低速粘滑 | `VP-FWD-P0-SL1-SS-v1`；同一前向入口 | 需独立静/动摩擦阈值 |
| 方向湿宽阻力 | `VP-FWD-P0-SL1-DW-v1`；同一前向入口 | 需与方向湿宽定义一致的阻力系数 |
| 两项组合 | `VP-FWD-P0-SL1-SS-DW-v1`；同一前向入口 | 同时满足 SS 与 DW 输入及联合覆盖要求 |
| 二维流体参考 | [高保真 CLI](scripts/run-high-fidelity.ts)、[二维参考说明](文档/二维截面流体参考程序.md) | A8S 结论仅支持定性参考，不替代装置标定或三维流体验证 |

配置准备、辨识和不确定度的实际命令见 [实验接口](experiments/README.md)；现行方程与实验判据见 [理论及协议](../01_最终理论/README.md)，已冻结验收见 [研究证据](../03_研究记录/README.md)。`src/solvers/rom/model.ts` 仅转出前向模型以兼容早期接口，不维护第二套物理实现。

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

维护权限与交接方式统一见 [根工作规范](../AGENTS.md) 和 [目录指南](../00_项目管理/README.md)。本文件只描述科学/技术接口，不另设审批要求。
