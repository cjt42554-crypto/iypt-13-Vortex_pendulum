# A2 控制体取力与规定运动功率审计候选包

本目录是 `VP-HF-CFD2D-v1` 的候选增量，不修改正式理论或正式程序。目标是补齐 A-05/A2：用独立离散控制体动量平衡重构 raw 反力，加入弥散刚体内部虚拟流体惯性修正，并在规定运动下审计平均功率和力—速度相位。

## 文件

- `00_分析裁决与执行报告.md`：为什么当前应优先做 A2，以及无实验阶段的后续顺序；
- `src/control-volume-force.ts`：纯控制体算法；
- `scripts/audit-prescribed-power.ts`：审计入口与报告生成；
- `scripts/audit-case.ts`：正式二维后端算例、控制体取力和功率累计；
- `scripts/audit-support.ts`：参数矩阵、无量纲映射和谐波分析；
- `tests/control-volume-force.test.ts`：制造解和离散守恒测试；
- `验证与复现/验证记录.md`：本轮真实执行边界；
- `验证与复现/artifacts/control-volume-unit-tests.txt`：实际测试输出。

## 运行纯算法测试

从本目录执行：

```bash
npm test
```

要求 Node.js 22 或更高版本。测试不依赖正式程序的 `node_modules`。

## 运行正式后端 smoke

先安装正式程序依赖：

```bash
cd 02_模拟程序
npm ci
npm exec vite-node -- \
  ../90_候选工作区/current/A2_控制体取力与规定运动功率审计/scripts/audit-prescribed-power.ts \
  --profile=smoke
```

smoke 只确认 A2 集成链和 raw 动量对账可达。即使通过，也不能裁决平均功率符号。

## 运行研究矩阵

```bash
cd 02_模拟程序
npm exec vite-node -- \
  ../90_候选工作区/current/A2_控制体取力与规定运动功率审计/scripts/audit-prescribed-power.ts \
  --profile=research
```

默认矩阵为：

- $N_D=8,12,16$；
- $U_{lu}=0.05,0.035,0.025$；
- 三个控制体尺度；
- 规定角幅 $0.03\,\mathrm{rad}$、频率 $0.5\,\mathrm{Hz}$；
- 8 周期，舍弃前 4 周期。

可用参数：

```text
--amplitude=<rad>
--frequency=<Hz>
--cycles=<number>
--discard-cycles=<number>
--output=<report.json>
--markdown=<summary.md>
```

默认输出到：

```text
验证与复现/artifacts/a2-prescribed-power-smoke.json
验证与复现/artifacts/a2-prescribed-power-smoke.md
验证与复现/artifacts/a2-prescribed-power-research.json
验证与复现/artifacts/a2-prescribed-power-research.md
```

## 解释边界

该脚本使用 `checkpoint()` 复制完整分布函数，优点是不侵入正式程序，缺点是研究矩阵会产生明显额外内存带宽开销。若候选方法通过，应在正式集成时增加窄化的只读控制体 probe，避免每步复制全部 $9N_xN_y$ 分布。

任何通过结果都只属于二维单位跨长规定运动载荷。它不验证三维湿跨、自由表面、真实水槽、代表条带复制或弱 FSI。
