# 交接历史

## 历史归档边界

截至本条之前的完整交接历史未删除，固定于：

- 提交：`e4e98e63858385b38c34522ef23fe65b1ce3d4e6`；
- 文件路径：`90_候选工作区/交接说明_history.md`；
- Git blob SHA：`4d42124877b3e93daed3323673b717f1069ea2d9`；
- 文件字节数：`9274`。

该历史文件内部还保存更早历史的归档身份和恢复命令，因此以上提交与其内部归档共同构成截至 PR-2 前的完整历史链。需要追溯时使用：

```bash
git show e4e98e63858385b38c34522ef23fe65b1ce3d4e6:"90_候选工作区/交接说明_history.md"
```

本文件自下条起继续记录新的交接历史。

## 2026-09-01 16:27:26 +09:00

- 以 `main@9d4ff3305a7c6b356f4ea51a1d153253e6a40a87` 为指定基线，先读取顶层 `AGENTS.md`、current、HW2 报告和完整机器证据，再复核 H1 v2、HW2 协议/测量/遥测/选择器、A8R 冻结运行链、正式 LBM、worker/GUI、G1/E1/F1/S1、CI、总账和全项目剩余路线；根 README 正文未读取。
- 接受 HW2 v1 十候选实际执行、摘要相等、swap/OOM 增量为零、无 fallback、无无关进程操作和结果盲边界，保留结论 `PASS-HW2-V1-SYNTHETIC-HARNESS-COVERAGE-SAFETY-AND-DETERMINISM`。
- 独立裁定 v1 最终候选选择语义为 `INCONCLUSIVE-HW2-V1-CANDIDATE-SELECTION-MEASUREMENT-SEMANTICS`：固定约 55 秒串行工作量与 15 秒下限系统性排除加速超过约 3.67 的候选；选择器又只在 `PROBE_PASS` 子集中计算 95% 最优，无法证明 2 线程 OpenMP 充分利用本机硬件。
- GPU 约 0.354 秒运行与 250 ms 采样不支持 GPU busy/CPU-feed 实质 NO-GO；native build、GPU context/JIT 生命周期不一致；u32 独立元素 workload、带宽估算和固定饱和增益不代表 A8R Float64 D2Q9、边界、Brinkman、人口复制、力身份、trace 和 shard。
- 拒绝 `hw2-native-openmp-domain-v1-w02` 作为 H3 后端；WP-HW2 父包保持 `IN_PROGRESS`。新增活动子包 WP-HW2R、WP-H2X、条件 WP-H2N 和 WP-H3P，H3 继续锁定。
- 新增完整裁决 `G0_全项目完成度与实验前暂停治理/07_PR2_HW2测量语义执行架构与全项目后续裁决.md`，提交 `d079d933c3afdfd78927ca857bdb94d784e085cf`。裁决规定 candidate-scaled 20–45 秒代表测量、完整 CPU/GPU 矩阵、A8R 代表 workload、H2-X、H2-N stage-0/完整资格、atomic case shard、故障恢复、H3 精确门和从当前状态到 pause-ready 的完整依赖路线。
- 技术债裁决为：候选 H1/H2 执行与数据面需要中等至大范围重构；旧 A8R 科学源和正式 `lbm.ts` 先保持只读；大范围 native/GPU LBM 只在代表性 profiling 和 H2-N stage-0 证明收益后触发；正式程序只在 PR-3 后按逐文件条件授权定点对齐。
- 下一完整批次为 `BATCH-PR2-HW2R-H2X-H2N-AND-H3-READINESS`，可连续执行到 `READY-FOR-PR2B-H3-UNLOCK-REVIEW`，但不得启动 `HW1-primary`、`HW1-repeat` 或 H3。
- current 更新提交为 `e4e98e63858385b38c34522ef23fe65b1ce3d4e6`。科学 payload 未读，没有 H2-X/H2-N/H3/A8R 科学结论，正式理论和正式程序未修改。
