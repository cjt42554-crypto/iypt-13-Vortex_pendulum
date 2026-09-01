# 当前交接

## 当前状态

PR-2A 正式观测前全项目复核已经完成。当前状态为：

`PR2A_PREOBSERVATION_REVIEW_CLOSED_FORMAL_HW2R_BLOCKED_PENDING_SEVEN_MACHINE_GATE_FINDINGS_H3_LOCKED`

科学结论仍为：

`NONE`

当前不允许启动：

- 正式 HW2R；
- H2-X 或 H2-N 正式矩阵；
- `HW1-primary`；
- `HW1-repeat`；
- H3；
- D54 长时结果承载运行；
- 科学 payload 读取。

仓库尚未达到“实验前可暂停”。

## PR-2A 裁决

裁决文件：

`90_候选工作区/current/G0_全项目完成度与实验前暂停治理/08_PR2A_fa73bda观测前实现复核与全项目终点规划裁决.md`

裁决身份：

`IYPT13-PR2A-PRE-OBSERVATION-IMPLEMENTATION-REVIEW-v1`

指定审查基线：

`fa73bda16c42a17a3c63f429c8b8c7e2709c7e66`

裁决提交：

`c98af01843bf1b39f01ec24397b02ecf1c4a113a`

裁决文件 SHA-256：

`acff1a5ccb41b909ad7c6c34e2c21600b774bbaf4ca3df1b6ec2d31e32cabaaf`

核心定性：

- `fa73bda...` 作为结果前候选实现基础予以接受；
- 其最高结论仅为 `PASS-PR2A-FA73BDA-RESULT-BEFORE-IMPLEMENTATION-BASELINE-ONLY`；
- 正式 HW2R 就绪状态为 `INCONCLUSIVE-PR2A-FA73BDA-FORMAL-HW2R-READINESS`；
- 当前执行 `NO-GO-START-FORMAL-HW2R-BEFORE-PRE-OBSERVATION-MACHINE-GATE`；
- H3、`HW1-primary` 和 `HW1-repeat` 继续锁定；
- 正式理论、正式程序和冻结科学证据继续只读。

## 已接受的实现级事实

基线 `fa73bda...` 已有：

- H1 45/45 轻量测试；
- H2 14/14 轻量测试；
- H3 8/8 轻量测试；
- `_shared` 4/4 轻量测试；
- CPU/OpenMP/SIMD/OpenCL stage-0 小型 smoke，最大归一化误差约 `4.22e-16`；
- 小型 CPU+GPU hybrid smoke；
- 持续 GPU 遥测 smoke；
- H3 dry-run 与恢复合同 smoke；
- 规范 JSON/gzip/sidecar 和候选身份框架。

这些只证明实现和无结果入口，不证明正式性能、H2-X、H2-N、H3、A8R 数值或科学结论。

## 正式观测前机器门

机器门：

`90_候选工作区/current/H1_硬件利用与执行架构/contracts/hw2r-pre-observation-readiness.v1.json`

机器门身份：

`VP-HW2R-PRE-OBSERVATION-READINESS-v1`

当前 SHA-256：

`73dc85806aafcc748d016e85ec90b65738ec66fc707741cf5505231566416699`

当前字段：

- `formalObservationAuthorized=false`；
- `resultBearingScientificRunAuthorized=false`；
- 七个 P0 blocker 仍为 `OPEN`；
- H2-N full evidence validator 和扩展 CI 两项已经 `CLOSED`；
- 每个 `CLOSED` blocker 必须绑定提交、路径和验证证据；
- 仅翻转状态不能自解锁。

正式入口按路径内容检查机器门，复制 implementation path 数组不能绕过。

## 七个开放 blocker

### 1. `P0-WORKLOAD-BASELINE-COMPARABILITY`

必须：

- R1、R2 各有同身份基线；
- R2 从冻结八 case 定义程序化生成成本；
- 禁止跨 workload speedup；
- 最终选择只使用同一个 R2 端到端身份。

### 2. `P0-CANDIDATE-EXECUTOR-DISTINCTNESS`

必须：

- persistent worker、fresh case process、shard aggregation 使用不同 executor；
- 每个候选绑定 executor fingerprint；
- 相同 fingerprint 去重；
- workloadId 与实际执行一致。

### 3. `P0-GPU-PERSISTENT-LIFECYCLE`

必须：

- GPU context、program、queue 和 buffer 在一次多尺寸 formal repeat 内持久化；
- cold init 与 steady compute 分离；
- hybrid CPU/GPU lane 和分工结果盲冻结；
- 每个 GPU/hybrid 候选前检查外来计算进程。

### 4. `P0-NUMERICAL-IDENTITY-TEMPORAL-ORDER`

必须：

- HW2R 只记录 surrogate correctness、性能和资源；
- H2-X/H2-N 后再映射 numerical identity；
- 不能在资格前写 `numericalIdentityPass=true`；
- 最终选择重新验证资格映射。

### 5. `P0-DEFERRED-AND-UNRESOLVED-SELECTION`

必须：

- measurement-invalid、deferred、unavailable 和 identity-pending 的高收益候选阻断选择；
- 所有候选类别有终态；
- 95% 最优仅在可比且已资格化候选中计算。

### 6. `P0-RESOURCE-ADMISSION-AND-FAILURE-EVIDENCE`

必须：

- one-worker 实测或静态内存下界控制 wider launch；
- cgroup peak 加 10% 余量低于上限；
- 保留 `max(4 GiB, 25% MemTotal)`；
- swap、OOM 和 memory events 门闭合；
- 每个失败候选有 stage、code、message hash、资源快照和清理状态。

### 7. `P0-H2X-ORDER-AND-SHARD-BINDING`

必须：

- worker 数覆盖冻结集合并去重；
- 扰动实际 delivery、receipt、discovery 和 aggregation order；
- shard 绑定 ordinal、worker count、order、source、implementation、run 和 environment。

## 本轮直接修复

已经写入 main：

- 正式观测前 machine gate、审计命令和 fail-closed 测试；
- 跨 workload 比较拒绝；
- `NUMERICAL_IDENTITY_PENDING` 和高收益 deferred 候选阻断；
- H2-X shard/aggregator schedule 元数据绑定；
- H2-N full evidence 严格 envelope 与 validator；
- cgroup `memory.peak` 和 headroom 检查；
- `simulation-check.yml` 扩展到 G0/H1/H2/H3/_shared/E1/F1/S1；
- G0 总账扩展为 PR-2A 活动工作包图；
- closed blocker 必须有 committed closure evidence。

中间提交 `c700560...` 含一处预检字符串拼接语法错误，已经由 `5366063...` 立即修正。该错误提交没有用于任何正式观测或科学运行。

## 自解锁正式 HW2R 的有限授权

Codex 可以在本交接规定的候选路径中连续闭合七个 blocker，不需要逐文件返回。

只有同时满足以下条件，才可把机器门改为 `formalObservationAuthorized=true`：

1. 七个 blocker 全部 `CLOSED`；
2. 每个 CLOSED blocker 有提交、路径和验证证据；
3. 所有修复在首次正式性能观测前 commit 并 push；
4. `main` 干净，且 `HEAD == origin/main`；
5. H1/H2/H3/_shared 轻量测试通过；
6. Markdown 和 Simulation 两个 GitHub workflow 通过；
7. dedicated finite cgroup、系统内存余量、swap 和 OOM 基线通过；
8. 无外来 GPU 计算进程；
9. distinct executor、persistent multi-size GPU 和 one-worker memory smoke 通过；
10. 没有活动结果承载运行；
11. 没有科学 payload 读取。

通过码：

`PASS-HW2R-PRE-OBSERVATION-READINESS`

机器门真实通过后，可以直接启动正式 HW2R，不需要再为“是否开始 HW2R”单独返回 Pro。

## 下一完整 Codex 批次

批次：

`BATCH-PR2A-CLOSE-PREOBSERVATION-GATE-THEN-HW2R-H2X-H2N-H3P`

固定顺序：

1. 修正 R1/R2 身份和冻结 R2 权重；
2. 实现 distinct executors 和 fingerprint 去重；
3. 实现 persistent multi-size GPU lifecycle；
4. 实现结果盲 hybrid 分工；
5. 修正 numerical identity 时间顺序；
6. 补全 unresolved terminal classes；
7. 补全资源准入和失败证据；
8. 补全 H2-X worker 数和实际完成顺序；
9. 更新 blocker closure evidence；
10. clean clone 与 CI；
11. machine gate 通过后执行正式 HW2R；
12. 执行 H2-X；
13. 执行 H2-N stage-0；
14. 若相对 H2-X 端到端净收益超过 10%，先完整实现并提交，再执行完整 H2-N；
15. 完成最终候选选择；
16. 完成 H3P 和两个环境 dry-run；
17. 更新 ledger、报告和交接；
18. 停在 `READY-FOR-PR2B-H3-UNLOCK-REVIEW`。

步骤 1–10 未完成前，不得进行任何正式性能观测。

## HW2R、H2-X、H2-N 与 H3 门

### HW2R

- R1 只用于微内核和设备生命周期；
- R2 是最终选择唯一工作量；
- 正式 repeat 目标 20–45 秒，硬范围 15–60 秒；
- 至少三次有效 repeat；
- CV 不超过 5%；
- 最慢/最快不超过 1.10；
- CPU 覆盖 1/2/4/8/12/16 物理核和条件 SMT；
- GPU 使用 persistent lifecycle 和设备侧计时；
- 最终 speedup 至少 1.50；
- 达到全部可比合格候选最佳吞吐的至少 95%；
- 无潜在大于 10% 的 unresolved candidate。

### H2-X

必须覆盖八 case、关键 population hashes、每步力身份、shortened case payload、三环境、worker 数、真实完成顺序和全部负例。

通过码：

`PASS-H2X-EXACT-SCIENTIFIC-EXECUTION-EQUIVALENCE-CANDIDATE-ONLY`

### H2-N

完整 H2-N 合同、evidence envelope、validator 和 10% 触发器必须在首次正式性能观测前冻结。

如果 stage-0 相对 H2-X 净收益不超过 10%，可记录：

`DEFERRED-H2N-NO-MATERIAL-END-TO-END-GAIN`

超过 10% 时必须先完成并提交完整实现，再执行完整数值资格。

### H3

PR-2B 之前继续锁定。PR-2B 必须接受最终硬件选择、H2-X/H2-N、atomic shard、恢复、双环境和三层身份后，才可给出：

`UNLOCK-HW1-PRIMARY-AND-HW1-REPEAT-ONLY`

## 当前工作包

- WP-R0：治理级 `INCONCLUSIVE`，已终止；
- WP-R1：被 R1I 取代；
- WP-R1I、WP-G1、WP-HW1、WP-E1、WP-F1、WP-S1：有限 `PASS`；
- WP-HW2：`IN_PROGRESS`；
- WP-HW2R：`IN_PROGRESS`，正式观测未授权；
- WP-H2X：等待；
- WP-H2N：条件等待；
- WP-H3P：等待；
- WP-HW3、WP-A8T、WP-I1、WP-Z1：继续锁定或等待；
- WP-PHY：条件推迟；
- WP-DOC：进行中。

机器总账：

`90_候选工作区/current/G0_全项目完成度与实验前暂停治理/project-state-ledger.json`

## 当前写权限

允许：

- `90_候选工作区/current/G0_全项目完成度与实验前暂停治理/**`；
- `90_候选工作区/current/H1_硬件利用与执行架构/**`；
- `90_候选工作区/current/H2_代表性执行与数值资格/**`；
- `90_候选工作区/current/H3_双全量运行产物与恢复合同/**`；
- `90_候选工作区/current/_shared/**`；
- `.github/workflows/simulation-check.yml`；
- 两份交接。

只读导入：

- 冻结 A8R 单 case、合同、preflight、asserter 和 artifact 工具；
- `02_模拟程序/src/solvers/highFidelity/lbm.ts`；
- 正式 core、analysis 和 IO 接口。

继续锁定：

- `01_最终理论/**`；
- `02_模拟程序/**`；
- 顶层 `AGENTS.md`；
- 既有 A2/A8 文件和科学证据；
- R0、R1I、PR-1、G1 和 HW2 v1 冻结证据；
- H3 和双全量科学运行。

## 从当前状态到实验前暂停

关键路径：

`PR-2A blocker closure -> HW2R -> H2-X -> conditional H2-N -> H3P -> PR-2B -> HW1-primary -> HW1-repeat -> PR-3 -> I1 -> DOC/Z1 -> PR-4`

PR-3 首次允许独立 Pro 读取科学 payload。PR-4 接受 pause manifest 后，终点为：

`EXPERIMENT_PREPARATION_PAUSE_READY_NO_EXECUTABLE_NONEXPERIMENTAL_TASKS`

## 后续 Pro 复核点

除新异常外，仅保留：

1. PR-2B：最终硬件后端、H2-X/H2-N 和 H3 解锁；
2. PR-3：双全量产物和 A8R 科学终局；
3. PR-4：实验前暂停终审。

## Markdown 格式门

通用 Markdown 格式检查只覆盖：

- `01_最终理论/**/*.md`；
- 精确的 `90_候选工作区/交接说明_current.md`。

其他 Markdown 不进入通用格式门，不为格式绿灯修改历史文件。

## 当前结论上限

当前只有实现审查、候选架构和实验准备级结论。没有形成：

- 正式 HW2R PASS；
- H2-X 或 H2-N PASS；
- H3 PASS；
- A8R 数值或科学 PASS/NO-GO；
- 公共物理验证；
- 装置预测；
- 实验验证。
