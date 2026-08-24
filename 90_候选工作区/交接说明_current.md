# 当前交接

## 本轮已完成

已在 `90_候选工作区/current/A2_控制体取力与规定运动功率审计/` 完成 A-05/A2 候选增量：

- 独立 D2Q9 离散控制体动量取力；
- Brinkman 弥散刚体内部虚拟流体惯性修正；
- 规定运动平均功率、一次谐波和力—速度相位审计；
- 三网格三 Mach、三个控制体的 research 失败闭锁矩阵；
- 8 个制造解/守恒测试及实际输出记录。

裁决文档：

`90_候选工作区/current/A2_控制体取力与规定运动功率审计/00_分析裁决与执行报告.md`

## 实际证据

- `npm test`：8/8 PASS；
- Markdown 数学检查：PASS；
- 三份 Markdown 通过 Pandoc HTML 渲染；
- 三个集成脚本均通过 Node.js TypeScript 语法检查；
- 控制体核心模块通过严格 TypeScript 静态检查。

尚未执行正式 `HighFidelitySimulation` smoke/research，因为当前执行容器没有私有仓库工作树及正式程序依赖。当前证据上限为：

`candidate-component-tested / formal-backend-integration-not-run`

## 下一步

在完整仓库工作树中依次运行：

1. `--profile=smoke`：确认 raw 控制体逐步复现 A1 Brinkman 反力；
2. `--profile=research`：裁决修正后平均功率符号对控制体、网格、Mach 和时层定义是否稳健；
3. 通过后再接公开规定振荡圆柱基准；
4. 在 A2、A-08、A-09 通过前，不得用 weak-FSI 趋势标定或修改前向理论。

正式理论和正式程序均未修改。
