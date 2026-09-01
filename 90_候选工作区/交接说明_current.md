# 当前交接

## 当前状态

PR-2 全项目复核已经完成。当前状态为：

`PR2_HW2_V1_SELECTION_INCONCLUSIVE_HW2R_H2X_CONDITIONAL_H2N_AUTHORIZED_H3_LOCKED`

科学结论仍为：

`NONE`

已经成立并继续有效的有限结论：

- `PASS-R1I-INTERRUPTED-SERIAL-ATTEMPT-EVIDENCE-SEALED`；
- `PASS-G1-RESULT-BEFORE-FOUNDATION`；
- `PASS-HW1-V2-RESULT-BEFORE-FOUNDATION`；
- `PASS-E1-EXPERIMENT-PREPARATION-CANDIDATE-ONLY`；
- `PASS-F1-SYNTHETIC-NUMERICAL-QUALIFICATION-ONLY`；
- `PASS-S1-EXPERIMENT-PREPARATION-STRUCTURAL-TOOLS`。

HW2 v1 新的精确定性为：

- 合成执行框架、候选覆盖、安全和确定性证据：接受；
- 冻结候选选择的测量语义：`INCONCLUSIVE`；
- 2 线程 OpenMP 作为 H3 后端：拒绝；
- WP-HW2 父工作包：继续 `IN_PROGRESS`；
- H2-X、H2-N、H3：均未通过；
- `HW1-primary`、`HW1-repeat` 和 H3：继续锁定。

仓库尚未达到“实验前可暂停”。

## PR-2 裁决

裁决文件：

`90_候选工作区/current/G0_全项目完成度与实验前暂停治理/07_PR2_HW2测量语义执行架构与全项目后续裁决.md`

裁决身份：

`IYPT13-PR2-HW2-MEASUREMENT-EXECUTION-AND-PROJECT-ROUTE-DECISION-v1`

裁决提交：

`d079d933c3afdfd78927ca857bdb94d784e085cf`

指定审查基线：

`9d4ff3305a7c6b356f4ea51a1d153253e6a40a87`

核心裁决码：

- `ACCEPT-HW2-V1-AS-COMPLETE-SYNTHETIC-HARNESS-COVERAGE-SAFETY-AND-DETERMINISM-EVIDENCE`；
- `CLASSIFY-HW2-V1-CANDIDATE-SELECTION-AS-INCONCLUSIVE-MEASUREMENT-SEMANTICS`；
- `REJECT-HW2-V1-OPENMP-W02-AS-H3-BACKEND-SELECTION`；
- `REQUIRE-HW2R-V2-CANDIDATE-SCALED-REPRESENTATIVE-FULL-MATRIX-REQUALIFICATION`；
- `REQUIRE-H2X-EXACT-EQUIVALENCE-OR-H2N-INDEPENDENT-NUMERICAL-QUALIFICATION-BEFORE-H3`；
- `KEEP-HW1-PRIMARY-HW1-REPEAT-AND-H3-LOCKED`。

## HW2 v1 证据保留边界

HW2 v1 报告：

`90_候选工作区/current/H1_硬件利用与执行架构/04_HW2_结果盲硬件候选资格与PR2输入报告.md`

机器证据：

`90_候选工作区/current/H1_硬件利用与执行架构/evidence/hw2-qualification-20260901-attempt-02.json`

机器证据 SHA-256：

`bfcdcabb91ac7f12d10afb7efaa46460ddcc8d59f15b95049ff340a85be835e6`

证据内部哈希：

`a52cee68089a814a2eedc61bf8018008b8b71957a6b35763beccaf7eefa40baa`

以下事实继续保留：

- 十个冻结候选均实际执行并留存；
- 所有候选正确性摘要和重复摘要相等；
- swap 无增长；
- cgroup `max`、`oom`、`oomKill` 增量为零；
- 无运行时 fallback；
- 无无关进程操作；
- 无科学 payload；
- 无 H2-X、H2-N、H3 或规范 A8R 产物。

v1 只能记录为：

`PASS-HW2-V1-SYNTHETIC-HARNESS-COVERAGE-SAFETY-AND-DETERMINISM`

不得继续记录为活动硬件选择 PASS。

## 为什么 2 线程选择被拒绝

v1 把串行工作量校准到约 55 秒，再给所有同家族候选相同工作量。加速比超过约 3.67 的候选会必然低于 15 秒计时下限。

因此 16 核 OpenMP、Node w08、GPU 和 hybrid 的高吞吐候选被计时结构系统性排除。选择器随后只在 `PROBE_PASS` 子集中计算 95% 最优吞吐，使 2 线程 OpenMP 自动成为子集最优。

此外：

- GPU 运行约 0.354 秒，而采样间隔为 250 ms，GPU busy 证据不足；
- GPU CPU-feed 判定由低 busy 直接推出，属于循环判定；
- native build 在计时外，GPU context/JIT 却在每次重复内，生命周期不一致；
- u32 独立元素工作负载不代表 Float64 D2Q9、边界、Brinkman、力身份、人口复制、trace 和 shard；
- CPU 带宽指标与实际 workload 不对应；
- 当前候选矩阵没有完整 CPU 扩展、CCD pinning、persistent GPU 和代表性混合分割。

因此当前证据不能证明充分利用本机 CPU/GPU。

## 当前工作包状态

- WP-R0：治理级 `INCONCLUSIVE`，已终止；
- WP-R1：正常串行参考分支不可达，已由 R1I 取代；
- WP-R1I、WP-G1、WP-HW1、WP-E1、WP-F1、WP-S1：`PASS`；
- WP-HW2：`IN_PROGRESS`；
- HW2 v1 子尝试：`INCONCLUSIVE-HW2-V1-CANDIDATE-SELECTION-MEASUREMENT-SEMANTICS`；
- WP-HW2R：待建立代表性测量 v2；
- WP-H2X：待完成精确执行等价；
- WP-H2N：条件触发；
- WP-H3P：待完成 H3 结果前产物与恢复准备；
- WP-HW3、WP-A8T、WP-I1、WP-Z1：继续等待前置；
- WP-PHY：条件推迟；
- WP-DOC：继续进行。

活动机器总账须在下一批次更新上述子工作包和 supersession。

## 下一完整 Codex 批次

批次名称：

`BATCH-PR2-HW2R-H2X-H2N-AND-H3-READINESS`

Codex 可以连续执行至统一验收，不需要逐文件返回询问，但必须停在 PR-2B，不能启动 H3。

固定顺序：

1. 冻结 HW2R v2 代表性测量合同、schema 和失败语义；
2. 冻结 H2-X 合同；
3. 冻结 H2-N stage-0 和条件完整资格合同；
4. 冻结 H3 artifact、case shard、恢复和双环境合同；
5. 单独提交并推送全部结果前合同；
6. 建立合同测试和 v1 误用负测试；
7. 建立 future-only 共享工具；
8. 实现 candidate-scaled 20–45 秒计时、高频 GPU 遥测和一致生命周期计时；
9. 实现 CPU 1/2/4/8/12/16 核、条件 SMT、pinning、CCD、进程池和 hybrid 矩阵；
10. 实现 D54 完整力身份和八 case 成本结构的代表性非科学工作负载；
11. 实现 H2-X scheduler、atomic shard、deterministic aggregator 和 oracle；
12. 实现 H2-N stage-0 CPU/GPU；
13. 在性能观察前提交并推送全部实现；
14. 完整重跑全部候选类别；
15. 完成 H2-X；
16. 按冻结触发器完成 H2-N stage-0，必要时完成完整 H2-N；
17. 形成最终硬件选择；
18. 建立但不运行两个 H3 干净环境；
19. 更新 ledger、supersession、CI 和活动索引；
20. clean clone 统一验证；
21. 写 PR-2B 输入报告并停止。

统一停止状态：

`READY-FOR-PR2B-H3-UNLOCK-REVIEW`

## HW2R 和最终选择门

必须满足：

- 每个候选正式重复落入 20–45 秒，硬范围 15–60 秒；
- 工作量过短只记 `MEASUREMENT_INVALID`，按预注册规则放大后重测；
- 完整重跑全部候选类别，不只重试快速或失败候选；
- build、cold init、steady compute、IPC/transfer、audit、shard、aggregation 分开记录；
- CPU 有资源扩展曲线和饱和依据；
- GPU 有 persistent context、设备侧计时和足够遥测样本；
- 所有可访问且可能提供超过 10% 净收益的类别均有结论；
- 选中后端代表性端到端加速至少 1.50；
- 选中后端达到全部合格候选最佳吞吐的至少 95%；
- swap、OOM、内存保留、热和无关进程门全部通过；
- 选中后端通过 H2-X，或通过完整 H2-N。

只要存在测量无效且可能快 10% 以上的候选，最终选择必须 fail-closed。

## H2-X 与 H2-N

H2-X 首选低语义风险的 case 级 process/worker pool，直接只读导入冻结 A8R 单 case 和聚合函数，不改变 case 内浮点顺序。

H2-X 必须覆盖：

- 冻结定义和来源；
- checkpoint 人口原始字节；
- 分析第一步和审计步 pre/post 人口；
- 每步力身份摘要；
- 缩短完整 case payload；
- 1 worker/多 worker/完成顺序；
- missing/duplicate/corrupt/source drift/worker failure；
- 三个轻量独立环境；
- D54 代表内存、安全和性能。

native、OpenMP、GPU、SIMD 或 hybrid 只要不能逐字节通过 H2-X，就必须进入 H2-N。

H2-N stage-0 若相对 H2-X 的代表性净收益不超过 10%，可记录：

`DEFERRED-H2N-NO-MATERIAL-END-TO-END-GAIN`

若超过 10%，必须完成质量、动量、Brinkman 交换、raw/A2 力、边界、稳定性、网格、归约、统计和跨设备资格。

## H3 解锁条件

H3 当前未授权。

必须由 PR-2B 接受以下全部事实后，才可写出：

`UNLOCK-HW1-PRIMARY-AND-HW1-REPEAT-ONLY`

包括：

- HW2R v2 完整；
- H2-X 或完整 H2-N 通过；
- 没有未处置的潜在大于 10% 候选；
- 最终候选满足 1.50 加速和 95% 最优；
- 三层身份、shard、sidecar 和恢复语义闭合；
- 两个独立环境已建立但尚未运行；
- CI 和 clean clone 全绿；
- 主机安全门通过。

PR-2B 前禁止任何完整八 case 结果承载运行。

## 当前有限写权限

下一批次允许：

- `90_候选工作区/current/G0_全项目完成度与实验前暂停治理/**`；
- `90_候选工作区/current/H1_硬件利用与执行架构/**`；
- 新建 `90_候选工作区/current/H2_代表性执行与数值资格/**`；
- 新建 `90_候选工作区/current/H3_双全量运行产物与恢复合同/**`；
- 新建 `90_候选工作区/current/_shared/**`；
- `.github/workflows/simulation-check.yml`；
- 两份交接。

只读导入：

- 冻结 A8R v2.1 科学源、合同、preflight、asserter 和 artifact 工具；
- `02_模拟程序/src/solvers/highFidelity/lbm.ts`；
- 正式 core、analysis 和 vortex-pendulum mechanics。

必须保持逐字节不变：

- `01_最终理论/**`；
- `02_模拟程序/**`；
- 顶层 `AGENTS.md`；
- H1 v1/v2 已冻结合同和 HW2 v1 证据；
- R0、R1I、PR-1 和 G1 既有证据；
- 所有既有 A2/A8 文件和科学产物。

当前仍不授权：

- `HW1-primary`、`HW1-repeat` 或 H3；
- 完整 D54 八 case 结果承载运行；
- 科学 payload 读取；
- 正式理论或正式程序修改；
- 旧串行重跑或 checkpoint 恢复；
- 其他分支。

PR-3 后的正式身份/实验接口和条件 scheduler 接入的逐文件授权见 PR-2 裁决第 13.4、13.5 节。正式 `lbm.ts` 仍未获得修改授权。

## 全项目剩余关键路径

`PR-2 -> HW2R/H2X/H2N/H3P -> PR-2B -> HW1-primary -> HW1-repeat -> PR-3 -> I1 -> DOC/Z1 -> PR-4`

其中：

- PR-3 才读取 A8R 科学 payload；
- I1 完成 coefficient package、E1/F1/S1 正式桥接、三层 provenance、正式 CI 和诚实 UI 标签；
- PHY 继续条件推迟，除非 PR-3 或实验触发；
- Z1 证明无未分类非实验任务；
- PR-4 接受最终 pause manifest。

长期终点：

`EXPERIMENT_PREPARATION_PAUSE_READY_NO_EXECUTABLE_NONEXPERIMENTAL_TASKS`

## Markdown 格式门

通用 Markdown 格式检查只覆盖：

- `01_最终理论/**/*.md`；
- 精确文件 `90_候选工作区/交接说明_current.md`。

其他 Markdown 不进入通用格式门，不建立历史 baseline，也不为格式绿灯修改历史文件。

## 当前结论上限

PR-2 只裁定测量语义、硬件选择、执行架构、技术债、权限和后续路线。

没有形成：

- H2-X PASS；
- H2-N PASS；
- H3 PASS；
- A8R 数值 PASS、INCONCLUSIVE 或 NO-GO；
- 公共物理验证；
- 装置预测；
- 实验验证；
- 正式高保真集成。
