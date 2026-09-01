# 当前交接

## 当前状态

ChatGPT Pro 已按 GitHub `main@eb679fe9d7469d133b72787ff177004b3c0f4255` 完成全项目独立复审。当前活动状态改为：

`SCIENCE_FIRST_ROUTE_ACTIVE_ENGINEERING_MAINLINE_STOPPED`

Pro 的最终裁决是：项目已经明显且严重过度工程化；停止把 HW2R v3、全候选性能资格、H2-X/H2-N 和 H3 双环境闭合作为科学工作的前置主线，立即把主要精力转回装置标定、ROM 参数辨识、留出预测、模型形式检验和不确定度传播。

正式理论、正式程序、顶层 `AGENTS.md` 和冻结科学证据未改变。当前科学结论仍为：

`NONE`

仓库尚未达到“实验前可暂停”。

## 当前活动计划

唯一活动计划为：

`90_候选工作区/current/G0_全项目完成度与实验前暂停治理/10_实验预测最小活动计划.md`

核心完成标准是：对预先冻结的留出工况给出带不确定度的现象预测；趋势、主频、幅值和平均功率符号达到预先约定的误差要求；数值误差明显小于参数和模型形式误差；未通过定量物理资格的后端不得被包装成装置定量预测器。

实验前暂停标准限于：所有仍能实质提高上述预测能力、且不需要新实验数据的工作已经完成或由有上限的科学去留测试明确停止；剩余任务只依赖装置测量、标定数据或留出实验结果。

## 被废止的活动前置路线

下列旧活动批次和依赖链不再有效：

`BATCH-PR2A-V2-CLOSE-SEVEN-P0-SEAL-THEN-HW2R-H2X-H2N-H3P`

`HW2R v3 -> 全候选资格 -> H2-X/H2-N -> H3P -> 双全量独立环境`

PR-2A v1/v2、七项 P0、机器门、通过码、manifest/sidecar、G0/H1/H2/H3/_shared 文件和既有证据保持历史字节不变，不删除、不改写。它们不再阻断 ROM、E1/F1/S1、公开物理基准或其他直接支撑预测准确度的工作。

旧 v2 机器门仍可保护旧 HW2R runner，不能据此宣称旧正式 HW2R 已经就绪；但不再要求为恢复科学主线而关闭七项 P0。

## 暂停并完整保留的本地 HW2R v3 工作

未提交硬化工作仍保存在：

`/home/cjt/.codex/tmp/iypt13-a8r-evidence-20260831`

该工作区基线为 `eb679fe9d7469d133b72787ff177004b3c0f4255`，含 HW2R v3、真实操作图、持久 worker、受控 child、遥测及 H2-N 相关修改和未跟踪文件。

这些修改没有进入正式本地仓库或 GitHub。不得把它们写成已完成、已验证或已推送；也不得为了路线收缩而删除。只有当必要科学矩阵的实际周转时间证明轨迹级并行仍不足，并且其中某个小部分具有明确净收益时，才可选择性复用。

## 保留的最小工程保障

- 轨迹级并行；
- 基础 timeout 和只清理本任务进程；
- 峰值内存检查；
- case 级原子 shard；
- 对最终采用后端做小规模数值等价验证；
- commit、完整配置、系数包来源、运行时版本、输出 checksum 和简短日志。

不再要求完整 CPU/GPU/hybrid 候选竞赛、95% 全局最优、三环境 H2-X、预建通用 H2-N full evaluator、双全量 H3、inode 认证隔离或多层封印。

## 当前常规 CI

`.github/workflows/simulation-check.yml` 的活动范围收缩为：

- 正式程序单元测试、构建和一次默认 forward smoke；
- E1 实验准备与辨识合成资格；
- F1 前向数值合成资格；
- S1 结构/机械实验前工具合成资格；
- A8 二维 CFD 候选组件测试和类型检查。

G0/H1/H2/H3/_shared 不再作为每次提交的必要矩阵。Markdown 通用检查范围保持不变，只覆盖：

- `01_最终理论/**/*.md`；
- 精确的 `90_候选工作区/交接说明_current.md`。

## 下一完整批次

批次：

`BATCH-SCIENCE-FIRST-CFD-DISPOSITION-THEN-EXPERIMENT-INPUT-READY`

顺序：

1. 验证本轮路线切换、收缩后的 CI、E1/F1/S1、正式程序和 A8 组件；
2. 对二维 CFD 只进行一次有上限的固定圆柱科学修正循环，检查平均阻力、升力 RMS 和 Strouhal 的文献符合性；
3. 若仍明显失配，将二维 CFD 冻结为定性流场工具，停止 HW2R、H2-X/H2-N 和长时 A8R 性能路线；若进入合理文献误差范围，只保留为辅助模型；
4. 核对装置测量、无流机械标定、ROM 流体参数辨识和留出工况所需的最小采集接口；
5. 若所有非实验科学任务已经完成，停在“实验输入所需”的可审计边界；
6. 真实装置数据到位后，执行 ROM 标定、最小数值资格、不确定度传播和留出预测；
7. 只有必要科学矩阵无法在准备窗口内完成时，才先做轨迹级并行，并在达到所需周转时间后立即停止性能工程。

## 路线切换本地验证

已实际执行：

- 正式程序 Vitest：17 个 suite、44/44 tests 通过；
- 正式程序 TypeScript/Vite build 通过；
- 默认 forward smoke 完成到 12 s，1201 个输出样本、1202 个接受步、0 个拒绝步，`energyClosureRelativeRms=0.00019483973412992808`；
- E1：10/10 tests 通过，合成资格为 `PASS-E1-EXPERIMENT-PREPARATION-CANDIDATE-ONLY`；
- F1：12/12 tests 通过，合成资格为 `PASS-F1-SYNTHETIC-NUMERICAL-QUALIFICATION-ONLY`；
- S1：13/13 tests 通过，合成结构工具资格为 `PASS-S1-EXPERIMENT-PREPARATION-STRUCTURAL-TOOLS`；
- A8 CFD 候选完整本地测试：97/97 tests 与 TypeScript typecheck 通过；常规 CI 只保留 32 项直接数值组件测试，不读取大型冻结 LFS 证据；
- current 和最小活动计划的 Pandoc Markdown 解析通过；
- 限定范围 Markdown 数学检查通过；
- 收缩后的 GitHub Actions YAML 解析与 `git diff --check` 通过。

上述是实现级、合成级和默认前向 smoke 证据。没有执行新的固定圆柱修正矩阵、长时 A8R、装置参数标定、真实实验、留出预测或物理验证。

首次推送 `a820323ea1a649e25430fe8c0057b8eaa046842e` 后，Markdown workflow、正式程序、E1、F1 和 S1 均通过；A8 全套测试在干净 checkout 中只有一项历史证据身份测试失败，原因是 CI 没有下载 22 MB A8Q Git LFS 产物，不是 CFD 数值组件失败。常规 CI 因此改为上述 32 项直接组件测试，避免每次提交为历史身份检查下载大型冻结证据。

修正提交 `2540d252c3a5fd5c1916487b40e3c79a2104181b` 的 Markdown workflow 与 Scientific core checks 均已通过；后者包含正式程序、E1、F1、S1 和精简后的 CFD 组件共五个成功 job。Actions 仅给出其官方 checkout/setup-node 动作的 Node 20 弃用提示，不是项目测试失败。

## A8S 无结果实现状态

已在候选 A8 包建立一次性固定圆柱科学去留循环，但尚未执行任何承载结果的 A8S 算例：

- 主网格只有 $D=16,24,36$，域为上游 $14D$、下游 $25D$、横向 $20D$；
- 只在 $D=16$ 增加宽域、低 Mach、半格相位和旧半格 mask 四个有界对照，共 7 条轨迹；
- 主路线的紧致正弦 mask 半厚度由体积惩罚零位移条件固定为 $h_\chi/\sqrt{\nu\eta}=2.949029420641545$，不按本仓结果调参；
- 每条轨迹运行 80 个对流时间、舍弃前 40 个，只保存载荷序列、统计、采样密度/Mach、运行时间、峰值内存、来源身份与校验和；
- 任一文献、网格、域、Mach、相位或稳定门失败，终局直接为 `FREEZE-A8S-2D-CFD-QUALITATIVE-ONLY`，不追加调参或工程资格；
- 无结果实现的 A8 包完整测试为 100/100，TypeScript typecheck、Pandoc 解析、限定数学检查和 `git diff --check` 均通过。

活动文件为：

- `A8_二维特征开放边界实验后端/36_A8S_固定圆柱有限科学去留循环.md`；
- `A8_二维特征开放边界实验后端/src/fixed-cylinder-disposition.ts`；
- `A8_二维特征开放边界实验后端/scripts/run-fixed-cylinder-disposition.mjs`；
- `A8_二维特征开放边界实验后端/tests/fixed-cylinder-disposition.test.ts`。

下一步必须先把这些无结果文件提交并推送到 `main`，确认远端检查通过且本地 `HEAD == origin/main`；然后才可并行执行 7 条轨迹并聚合一次终局。当前没有 A8S 数值结果。

## 当前结论上限

Pro 的路线裁决只改变任务优先级和工程前置关系，不形成新的数值、物理或实验 PASS。

当前已知边界是：

- 正式 ROM 可运行，但默认系数包尚未完成装置标定，不能作为装置定量预测器；
- 二维 CFD 公开固定圆柱力幅值基准仍为 `NO-GO-A8-FIXED-REFERENCE-MISMATCH`；
- 既有 A8R 双 40 步 smoke 只证明受限实现级路径和力身份检查，不证明长时、网格或装置物理资格；
- 尚无装置专属参数、可辨识闭合系数、留出实验预测或完整不确定度证据。

因此当前科学结论仍为 `NONE`。
