---
title: "IYPT 2027 第 13 题：PR-2A 正式观测前实现复核与全项目终点规划裁决"
lang: zh-CN
---

# PR-2A 正式观测前实现复核与全项目终点规划裁决

## 0. 裁决身份、基线与结果盲边界

本裁决身份为：

`IYPT13-PR2A-PRE-OBSERVATION-IMPLEMENTATION-REVIEW-v1`

指定审查基线为：

`main@fa73bda16c42a17a3c63f429c8b8c7e2709c7e66`

本轮按顺序读取了顶层 `AGENTS.md`、`90_候选工作区/交接说明_current.md`、PR-2 裁决及其链接的 HW2 报告、机器证据和活动总账，随后审查 H1/H2/H3/_shared 候选栈、冻结 A8R 单 case 与聚合源、正式二维 LBM、正式 GUI/worker、E1/F1/S1、CI、治理与实验准备边界。根目录 `README.md` 正文未读取，也未作为依据。

截至本裁决完成：

- 没有启动正式 HW2R；
- 没有启动 H2-X 或正式 H2-N；
- 没有启动 `HW1-primary`、`HW1-repeat` 或 H3；
- 没有启动 D54 长时结果承载矩阵；
- 没有读取 A8R 科学 payload；
- 没有形成规范 A8R gzip 或 sidecar；
- 没有修改正式理论、正式程序或冻结科学证据。

科学结论保持：

`NONE`

## 1. 总裁决

### 1.1 对 `fa73bda...` 候选栈的定性

`fa73bda...` 形成了实质性的结果前候选基础。以下实现级事实予以接受：

- H1、H2、H3 和 `_shared` 的合同与轻量测试能够运行；
- H2-X 三环境、H2-N stage-0、scheduler、shard、aggregator 和 H3 dry-run 已有代码框架；
- CPU/OpenMP/SIMD/OpenCL 小型数值 smoke 的最大归一化误差约为 `4.22e-16`；
- 小型 CPU+GPU hybrid、持续 GPU 遥测和 H3 dry-run smoke 已通过；
- 候选产物采用规范 JSON/gzip/sidecar 和分层身份；
- 正式性能、科学结果和实验结果均未被伪装为已通过。

这些事实的最高结论为：

`PASS-PR2A-FA73BDA-RESULT-BEFORE-IMPLEMENTATION-BASELINE-ONLY`

它不等于正式性能 PASS、H2-X PASS、H2-N PASS、H3 PASS、数值路线 PASS 或科学 PASS。

### 1.2 正式 HW2R 当前不得启动

独立审查发现 `fa73bda...` 尚有会影响候选排序、硬件充分利用和结果身份的 P0 缺陷。因此当前状态为：

`INCONCLUSIVE-PR2A-FA73BDA-FORMAL-HW2R-READINESS`

并明确裁定：

`NO-GO-START-FORMAL-HW2R-BEFORE-PRE-OBSERVATION-MACHINE-GATE`

当前不得启动任何新的正式性能观测。形式入口已经由机器门：

`VP-HW2R-PRE-OBSERVATION-READINESS-v1`

fail-closed。该门当前记录 `formalObservationAuthorized=false`，并且 `HW1-primary`、`HW1-repeat` 和 H3 始终保持锁定。

### 1.3 当前不需要修改受保护路径

本轮没有证据证明必须立即修改：

- `01_最终理论/**`；
- `02_模拟程序/**`；
- 顶层 `AGENTS.md`；
- 冻结 A2/A8 合同、实现、报告、测试、产物或 sidecar。

在 PR-2B 之前，全部必要修复都可以在候选路径完成。正式 `lbm.ts`、正式 GUI 和正式前向程序不应被提前重写。

## 2. 全项目当前完成度矩阵

| 层级或工作包 | 当前状态 | 已证明 | 未证明 |
|---|---|---|---|
| 正式理论 | 条件规范稳定 | 模型、输入、能量、数值与结构定义 | 装置参数、实验预测正确性 |
| 正式前向程序 | 研究原型 | 示例先验下可执行 | 装置标定预测器 |
| 正式二维 CFD | `unvalidated-preview` | D2Q9-MRT-Brinkman 实现和既有离散审计 | 公共物理基准、三维/自由表面、装置物理 |
| R0/R1I | 闭合 | 中断事实和证据封存 | 串行参考科学结果 |
| G1/H1 v2 | 有限 PASS | 结果前合同、无结果架构、CI 基础 | 正式硬件选择 |
| E1 | candidate-only PASS | 合成实验协议、holdout 与辨识接口 | 真实实验数据 |
| F1 | synthetic-only PASS | 合成数值资格 | 正式前向全实现桥接 |
| S1 | experiment-preparation PASS | 合成结构工具 | 装置分岔与实验选择 |
| HW2 v1 | 历史有限 PASS | 合成框架覆盖、安全和摘要确定性 | 有效候选选择 |
| `fa73bda` H1/H2/H3/_shared | 实现级 | 轻量测试和无结果 smoke | 正式性能、H2-X、H2-N、H3 |
| WP-HW2R | `IN_PROGRESS` | 协议与代码骨架 | 观测前就绪、正式矩阵 |
| WP-H2X | 等待 | 合同与部分实现 | 冻结科学源精确等价 |
| WP-H2N | 条件等待 | stage-0 框架 | 完整数值资格 |
| WP-H3P | 等待 | dry-run 与恢复合同骨架 | PR-2B 可解锁状态 |
| WP-HW3/A8T | 锁定 | 无 | 双全量运行与科学终局 |
| WP-I1/DOC/Z1 | 后续 | 部分准备 | 正式对齐、无剩余任务审计 |
| 实验验证 | 未开始 | 协议候选 | 标定、holdout、物理验证 |

## 3. 对 `fa73bda...` 的关键实现审查

### 3.1 R1 与 R2 工作量及基线不可比

候选栈同时定义微内核负载 R1 和八 case 成本结构代理 R2，但原 runner 使用单一基线并允许候选声明多个 workload 身份。这样会把不同工作单位、不同算术和不同数据搬运的吞吐相除，产生没有物理或执行意义的 speedup。

更严重的是，R2 中 D24、D36、D54 的手工权重没有按冻结 A8R 定义计算。冻结定义的总步数分别为：

- D24：`38400`；
- D36：`57600`；
- D54：`86400`。

真实 cell-step 成本近似与 `nx * ny * totalSteps` 成正比，D54 相对 D24 的量级约为 11 倍，而原代理仅约为 2.5 倍。该代理会系统性低估长 D54 case，并改变 scheduler、hybrid 分工和候选排序。

要求：

1. R1、R2 各有独立串行基线；
2. 最终 H3 候选选择只能使用同一个冻结 R2 端到端身份；
3. R2 case 权重必须程序化读取冻结八 case 定义，至少包含 `nx * ny * totalSteps`、分析步数量和力身份审计成本；
4. 禁止手工维护与冻结定义脱离的近似权重；
5. 跨 workload 比较必须 fail-closed。

审查中已直接加入跨 workload 拒绝与回归测试，但代表性 R2 构造仍是开放门。

### 3.2 名义候选与实际 executor 重复

当前若干候选名称分别声称：

- persistent Node worker；
- fresh case process；
- shard aggregation；
- process pool；
- data-layout 路线。

但部分名义候选实际通过同一个 executor 或同一类子进程调用完成，只有标签、worker 数或外层参数不同。这会造成：

- 同一实现被多次当作独立候选；
- 95% 最优集合被重复项污染；
- 候选覆盖看似完整，实际没有比较不同生命周期；
- 失败和性能原因无法归属到真实执行层。

要求每个候选具备不可变 executor fingerprint，至少绑定：

- process/worker 生命周期；
- 数据共享或拷贝方式；
- case 启动方式；
- shard 写入和聚合方式；
- 编译与设备后端；
- workload 身份；
- worker/线程/设备拓扑。

完全相同的 fingerprint 必须去重，不能分别参与选择。

### 3.3 GPU context 必须跨多尺寸 case 持久化

当前 OpenCL/GPU 路径虽然可以执行小型 smoke，但正式候选生命周期仍可能在每个 case 或每次子进程调用中重新：

- 创建 context；
- 编译 program；
- 创建 queue；
- 分配 buffer；
- 传输；
- 销毁资源。

这既不代表真实 H3，也会把不同尺寸 case 的持续运行切碎。正式 GPU 候选必须在一次 formal repeat 内：

1. 建立一个受身份约束的持久 context/program/queue；
2. 对 D24、D36、D54 使用可复用或按尺寸缓存的 buffer；
3. 将 cold initialization、steady compute、传输、审计、shard 和聚合分别计时；
4. 使用设备侧计时并取得足够遥测样本；
5. 在每个 GPU 或 hybrid 候选启动前重新检查外来 GPU 计算进程；
6. 不得暂停、终止或改变无关进程。

无法持久化时，应把该候选明确分类为 lifecycle NO-GO 或 H2-N 工具链限制，而不是与 persistent CPU candidate 直接比较。

### 3.4 hybrid 分工必须代表真实 case 调度

小型 hybrid smoke 只能证明 CPU 与 GPU 可以共同运行，不能证明当前分工代表 A8R。正式 hybrid 至少要冻结：

- CPU 与 GPU lane 的 backend 身份；
- 25/75、50/50、75/25 等结果盲分割；
- 基于冻结 case 成本而非科学值的调度；
- 不同尺寸 case 的设备适配；
- 归约与聚合顺序；
- 设备失败时禁止自动 fallback；
- CPU/GPU 各自的 idle、transfer 和 synchronization 时间。

不得根据 drag、lift、功率、稳定性或任何科学 payload 动态决定分工。

### 3.5 数值身份的时间顺序错误

`fa73bda...` 的正式测量 runner 曾在 H2-X/H2-N 尚未执行时，把 surrogate digest equality 作为 `numericalIdentityPass=true` 写入候选评价。该语义越过了资格阶段。

正确顺序是：

1. HW2R 只记录 surrogate correctness、执行性能和资源；
2. H2-X 或 H2-N 独立运行；
3. 最终化器把已接受的 H2-X/H2-N 证据映射回候选；
4. 只有映射后候选才能成为 `QUALIFIED`；
5. 任一潜在收益超过 10% 的 `NUMERICAL_IDENTITY_PENDING` 候选必须阻断选择。

本轮已把“数值身份待定”改为独立终态，并加入阻断测试；正式 runner 的写入顺序与最终证据映射仍需在观测前完成。

### 3.6 H2-X 的完成顺序与 worker 覆盖仍不完整

现有 H2-X 能在三个独立环境执行，并具有 canonical、reverse 和 interleaved 输入顺序；但输入顺序不等于真实 worker 完成、IPC 到达或聚合顺序。还需要显式扰动：

- downstream delivery order；
- parent receipt order；
- shard discovery order；
- aggregation order。

worker 数必须覆盖冻结集合，例如 `1/2/4/8`，并按主机资源去重。每个 shard 必须绑定：

- case ID 和 ordinal；
- worker count；
- order identity；
- source identity；
- implementation commit/tree；
- run/environment identity。

本轮已直接补上 ordinal、worker 和 order 元数据验证，但真实 delivery-order 扰动及完整 worker 集仍未闭合。

### 3.7 H2-N 完整证据必须 fail-closed

原最终化器可以接收一个字段很少的可选 H2-N summary。这样的 summary 即使写着 `pass=true`，也不能证明：

- 完整矩阵；
- 负例；
- 独立参考；
- 安全；
- provenance；
- 后端和实现提交；
- 证据哈希。

本轮已直接增加完整 H2-N 证据 envelope 和 validator，要求：

- 冻结合同身份；
- 完整矩阵与 case 数；
- negative case；
- independent reference；
- safety 与 provenance；
- implementation commit/tree；
- qualified backend variants；
- canonical evidence hash；
- 无科学值持久化和人工读取。

最小或自我声明的 summary 现在会 fail-closed。完整 H2-N runner 仍可以在 stage-0 证明收益超过 10% 后条件实现，不要求为了可能不会触发的路线提前完成全部大规模后端。

### 3.8 资源门与失败证据仍需补强

已经补入 cgroup `memory.peak` 和 10% headroom 检查，但正式观测前还必须完成：

- 先实测一个 worker 的私有峰值，再计算 wider launch 上限；
- 静态下界与实测峰值取更保守者；
- 保留 `max(4 GiB, 25% MemTotal)` 系统余量；
- swap 增长为零；
- `memory.events` 的 `high/max/oom/oom_kill` 按冻结门检查；
- 每次 GPU/hybrid 候选前检查外来计算进程；
- 失败记录包含 stage、code、sanitized message hash、最后资源快照、已启动进程和清理状态；
- 不得用宽泛 `killall/pkill`；
- 不得修改全局 affinity、电源策略、驱动、overcommit、swap 或无关 cgroup。

## 4. 本轮直接修复及其结论边界

本轮在候选路径直接完成了以下修复：

1. 新增正式观测前机器门与审计命令；
2. 入口根据路径内容而非数组对象身份触发门禁，复制路径列表不能绕过；
3. 跨 workload speedup fail-closed；
4. `NUMERICAL_IDENTITY_PENDING` 和高收益 deferred 候选阻断最终选择；
5. H2-X shard 和 aggregator 绑定 schedule 元数据；
6. H2-N full evidence 采用严格 envelope；
7. cgroup peak/headroom 纳入资源比较；
8. `simulation-check.yml` 扩展到 G0/H1/H2/H3/_shared/E1/F1/S1；
9. G0 总账扩展为活动 PR-2A 工作包图；
10. 所有关闭 blocker 必须包含提交、路径和验证证据，不能只翻转状态自解锁。

中间提交 `c700560...` 在预检字符串拼接中含一处语法错误，随后的 `5366063...` 立即修正；该错误提交没有用于任何正式观测、H2-X、H2-N、H3 或科学运行。最终轻量 CI 必须以修正后的最终提交为准。

这些修复仍只形成：

`PASS-PR2A-REVIEW-HARDENING-IMPLEMENTATION-ONLY`

不构成正式 HW2R 或数值资格 PASS。

## 5. 正式 HW2R 的精确入口与自解锁规则

### 5.1 当前锁定状态

机器门当前 SHA-256 为：

`73dc85806aafcc748d016e85ec90b65738ec66fc707741cf5505231566416699`

当前仍开放七个 P0 blocker，`formalObservationAuthorized=false`。

### 5.2 Codex 可以连续闭合，不需逐文件返回

用户要求避免一步一问。本裁决授权 Codex 在下述候选范围内连续完成全部开放 blocker。只有同时满足以下条件，Codex 才可把机器门改为 `formalObservationAuthorized=true` 并启动正式 HW2R：

1. 每个 blocker 状态为 `CLOSED`；
2. 每个 CLOSED blocker 至少有一条提交、路径和验证证据；
3. 所有修复在首次正式性能观测前 commit 并 push；
4. `main` 干净且 `HEAD == origin/main`；
5. H1/H2/H3/_shared 轻量测试通过；
6. Markdown 与 simulation 两个 GitHub workflow 通过；
7. dedicated finite cgroup 建立；
8. 系统内存余量、swap、OOM 基线满足；
9. GPU/hybrid 前无外来 GPU 计算进程；
10. distinct executor smoke、persistent multi-size GPU lifecycle smoke 和 one-worker memory admission 通过；
11. 没有活动结果承载运行；
12. 没有读取科学 payload。

该转移码为：

`PASS-HW2R-PRE-OBSERVATION-READINESS`

在机器门真实通过后，不需要再为“是否可以开始正式 HW2R”单独返回 Pro；这是本裁决给予的有限人工授权。

### 5.3 必须停在 PR-2B

即使机器门通过，授权上限也只是：

- 执行正式 HW2R；
- 执行 H2-X；
- 执行 H2-N stage-0；
- 按冻结触发器执行完整 H2-N；
- 完成最终候选选择；
- 完成 H3 结果前准备和两个干净环境的 dry-run。

完成后必须停止于：

`READY-FOR-PR2B-H3-UNLOCK-REVIEW`

不得自行启动 `HW1-primary`、`HW1-repeat` 或 H3。

## 6. 正式 HW2R 的统一测量与选择规则

### 6.1 测量单位

- R1 仅用于微内核、设备生命周期和 stage-0 profiling；
- R2 是最终候选选择的唯一端到端工作量；
- R2 从冻结八 case 定义程序化构造；
- 每个候选有同 workload 的独立串行或严格可比基线；
- 不能用 R1 吞吐选择 R2 后端。

### 6.2 计时

- 每个正式 repeat 目标 20–45 秒；
- 15–60 秒为硬范围；
- 过短或过长先记 `MEASUREMENT_INVALID`；
- 只按预注册放大/缩小规则重新校准；
- 全候选完整重跑，不只重试有利候选；
- 至少三次有效 repeat；
- CV 不超过 5%；
- 最慢/最快不超过 1.10。

### 6.3 CPU 资源矩阵

至少覆盖：

- 1、2、4、8、12、16 个物理核；
- 条件允许时覆盖 SMT；
- physical-core pinning；
- 两个 CCD/L3 的放置；
- process pool 与 thread/OpenMP；
- case cost-aware scheduler；
- worker 数大于 case 数时去重或明确 NO-GO。

若带宽饱和，应给出硬件计数器或可审计代理，并证明继续增加 CPU 的端到端收益不超过 5%。

### 6.4 GPU 与 hybrid

GPU 正式候选必须：

- persistent context/program/queue/buffers；
- device-side timing；
- 计算窗至少 30 个有效遥测样本，或等价高频设备计数器；
- transfer/sync/serialization 分项；
- 不把采样不足推断成低 GPU 利用；
- 每候选前检查外来进程；
- 不执行全局 GPU reset、驱动重载或显存清理。

hybrid 使用结果盲的冻结分工，不能依赖科学值。

### 6.5 选择

最终选择必须满足：

- correctness 和 safety；
- H2-X 或完整 H2-N；
- 代表性端到端 speedup 至少 1.50；
- 吞吐不低于全部可比合格候选最佳值的 95%；
- 不存在可能额外快 10% 以上的 unresolved candidate；
- 所有候选类别有明确终态；
- 语义风险、内存和治理复杂度只用于 95% 集合内的确定性 tie-break，不得压过吞吐门。

## 7. H2-X 与 H2-N

### 7.1 H2-X

H2-X 首选 case 级 process/worker pool，直接只读调用冻结单 case 和聚合源，不改变 case 内 Float64 运算顺序。

必须覆盖：

- 八个冻结 case；
- fresh initial populations；
- pre-analysis、analysis first step、frozen audit step 的 pre/post populations；
- 每步力身份摘要；
- shortened complete case payload；
- worker 数与实际 delivery/aggregation order；
- 三个独立轻量环境；
- missing、duplicate、corrupt、source drift、worker failure；
- D54 内存与安全；
- 原子 shard、sidecar 和 deterministic aggregation。

通过码：

`PASS-H2X-EXACT-SCIENTIFIC-EXECUTION-EQUIVALENCE-CANDIDATE-ONLY`

### 7.2 H2-N stage-0

在首次正式性能观测前必须冻结：

- 完整 H2-N 合同；
- full evidence envelope；
- validator；
- stage-0 矩阵；
- 10% material-gain 触发器；
- failure/deferred 语义。

可以暂不实现完整 H2-N 后端。

stage-0 必须覆盖 equilibrium、moments、MRT、Guo forcing、Brinkman、streaming、开放边界、质量、动量、力交换、小/中/D54 代表尺寸和 cold/steady 性能。

### 7.3 条件停止与继续

若 H2-N stage-0 相对已通过的 H2-X 端到端净收益不超过 10%，可终止为：

`DEFERRED-H2N-NO-MATERIAL-END-TO-END-GAIN`

若超过 10%，必须在任何完整 H2-N 正式观测前：

1. 完整实现；
2. commit/push；
3. 通过 full envelope、独立参考、负例、安全和 provenance；
4. 执行完整数值资格。

通过码：

`PASS-H2N-NUMERICALLY-QUALIFIED-BACKEND-CANDIDATE-ONLY`

它不证明物理模型正确。

## 8. H3 与双全量运行的精确门

PR-2B 只有在以下全部通过时才可给出：

`UNLOCK-HW1-PRIMARY-AND-HW1-REPEAT-ONLY`

条件包括：

1. HW2R 正式矩阵完整；
2. 所有候选类别有终态；
3. 最终候选满足 1.50 和 95% 门；
4. 选中后端通过 H2-X 或完整 H2-N；
5. 没有未处置的大于 10% 潜在收益候选；
6. scheduler、atomic shard、aggregator 和 sidecar 闭合；
7. 同一 run 内可以复用完整且哈希闭合的 case shard；
8. 被中断 case 从 step 0 重跑；
9. primary/repeat 不互用 shard、checkpoint、缓存或 inode；
10. 两个环境来自同一冻结实现提交；
11. source、dependency、compiler/driver/device、execution 和 artifact 身份闭合；
12. 两个环境已建立但未运行；
13. CI 和 clean clone 全绿；
14. 没有科学 payload 人工读取。

双全量运行都必须从第一个 case、step 0、新鲜初态开始。主机关机后可以继续同一 run 内已经完整封存的 case，但不能恢复中断 case 的中间 population。

## 9. 全项目技术债与重构规模

### 9.1 立即需要：候选执行和数据面中等至大范围重构

范围：

- HW2R R2 工作量；
- distinct executors；
- persistent GPU；
- hybrid scheduler；
- resource admission；
- structured failure evidence；
- H2-X order matrix；
- H2-N evidence；
- H3 runner 与恢复；
- 三层 provenance。

这属于候选层重构，不是正式理论或正式程序重写。

### 9.2 应继续局部整理

- `_shared` 作为 future-only canonical/identity/atomic 工具；
- 不回改历史 evidence 所绑定的旧 canonical 实现；
- G0 ledger 和 supersession 只列活动版本；
- CI 分清 lightweight correctness 与本机 performance；
- 失败证据和活动命令建立索引。

### 9.3 当前不应做的大范围重写

- 不重写正式前向求解器；
- 不重写正式 GUI；
- 不直接重写 `02_模拟程序/src/solvers/highFidelity/lbm.ts`；
- 不改三份正式理论；
- 不修改历史 A2/A8 门值或产物；
- 不把 toy OpenCL/OpenMP kernel 直接接入正式程序。

只有代表性 HW2R 和 H2-N stage-0 证明真实 LBM native/GPU 端到端收益超过 10%，并通过完整 H2-N 后，才有理由讨论正式后端接入。

### 9.4 全仓其他债务

- 正式 GUI 仍是单 active worker，只解决响应性；
- E1/F1/S1 尚未逐项桥接正式源；
- 默认 coefficient set 仍为 `illustrative-literature-prior-v1`；
- 正式 `npm run validate` 需要进入最终 I1/CI；
- 物理范围仍缺实验触发，三维、自由表面和强耦合保持 deferred；
- 历史治理文件很多，应通过机器总账导航，而不是改写历史。

## 10. 从当前状态到实验前可暂停的完整计划

### 阶段 A：PR-2A blocker closure

入口：本裁决与机器门已提交。

输出：

- 七个开放 blocker 的实现、测试和 closure evidence；
- `formalObservationAuthorized=true`；
- `PASS-HW2R-PRE-OBSERVATION-READINESS`；
- clean main 与两个 CI workflow 通过。

失败：

- 任一 blocker 无法闭合：`INCONCLUSIVE-HW2R-PRE-OBSERVATION-IMPLEMENTATION-NOT-READY`；
- 不启动正式观测。

### 阶段 B：正式 HW2R

输出：

- 完整候选矩阵；
- R1/R2 分层证据；
- CPU/GPU/hybrid 扩展；
- 安全和失败证据；
- candidate measurements，不形成最终科学结论。

失败：

- 安全门：立即 fail-closed；
- 测量无效：按冻结规则全矩阵重校准；
- unresolved 大于 10%：不能选择。

### 阶段 C：H2-X 与条件 H2-N

输出：

- H2-X 三环境精确等价；
- H2-N stage-0；
- 若触发则完整 H2-N；
- 资格映射后的最终候选。

失败：

- H2-X NO-GO 且 H2-N 未通过：WP-HW2 NO-GO，H3 不解锁；
- 工具链暂不可用：DEFERRED，但不能假装充分利用硬件。

### 阶段 D：H3P 与 PR-2B

输出：

- H3 contract/runner/shard/recovery；
- 两个独立干净环境；
- PR-2B 输入包；
- 停止状态 `READY-FOR-PR2B-H3-UNLOCK-REVIEW`。

PR-2B 是下一次必须交给 Pro 的复核点。

### 阶段 E：HW1-primary 与 HW1-repeat

只有 PR-2B 解锁后执行。两次完整八 case，规范产物和 sidecar独立生成。

异常：

- 完整 case shard可在同一 run内恢复；
- 中断 case 从 step 0 重跑；
- 跨 run 或跨 commit 复用一律拒绝。

### 阶段 F：PR-3 科学终局

首次允许独立 Pro 读取科学 payload。输出 A8R 的 PASS、INCONCLUSIVE 或 NO-GO，并明确其仅为候选离散路线结论，不自动成为公共物理或实验结论。

### 阶段 G：I1 正式诚实对齐

PR-3 后才执行：

- coefficient set 身份区分 illustrative/calibrated/holdout；
- E1/F1/S1 与正式程序桥接；
- provenance；
- CSV/UI 标签；
- 正式轻量 CI；
- 若 PR-3 接受候选 scheduler，再定点接入。

### 阶段 H：DOC/Z1/PR-4

- 活动版本和证据索引；
- 扫描 TODO/FIXME/PENDING/NOT RUN；
- 每项分类为已完成、实验依赖、条件触发、范围外或用户放弃；
- 无隐藏本地补丁、未提交结果或未运行非实验矩阵；
- 形成 pause manifest；
- PR-4 接受后达到：

`EXPERIMENT_PREPARATION_PAUSE_READY_NO_EXECUTABLE_NONEXPERIMENTAL_TASKS`

## 11. 精确权限裁决

### 11.1 当前立即授权

Codex 可连续修改：

- `90_候选工作区/current/G0_全项目完成度与实验前暂停治理/**`；
- `90_候选工作区/current/H1_硬件利用与执行架构/**`；
- `90_候选工作区/current/H2_代表性执行与数值资格/**`；
- `90_候选工作区/current/H3_双全量运行产物与恢复合同/**`；
- `90_候选工作区/current/_shared/**`；
- `.github/workflows/simulation-check.yml`；
- `90_候选工作区/交接说明_current.md`；
- `90_候选工作区/交接说明_history.md`。

只读导入：

- 冻结 A8R 单 case、合同和聚合源；
- `02_模拟程序/src/solvers/highFidelity/lbm.ts`；
- 正式分析与 IO 接口。

### 11.2 当前继续锁定

- `01_最终理论/**`；
- `02_模拟程序/**`；
- 顶层 `AGENTS.md`；
- 既有 A2/A8 合同、实现、测试、报告、证据与产物；
- R0/R1I/PR-1/G1/HW2 v1 冻结证据；
- `HW1-primary`、`HW1-repeat`、H3。

### 11.3 PR-3 后的条件正式授权上限

只有 PR-3 接受相应集成需求后，允许按最小差异修改：

- `02_模拟程序/src/core/config.ts`；
- `02_模拟程序/src/core/provenance.ts`；
- `02_模拟程序/src/io/csv.ts`；
- `02_模拟程序/src/io/index.ts`；
- `02_模拟程序/src/ui/data.ts`；
- `02_模拟程序/src/ui/parameter-form.ts`；
- `02_模拟程序/src/main.ts`；
- 上述文件直接对应的现有测试；
- `02_模拟程序/package.json` 和 lockfile，仅在验证命令或依赖确有必要时；
- `.github/workflows/simulation-check.yml`。

该授权只用于诚实身份、E1/F1/S1 桥接、标签和受资格 scheduler 接口，不授权改变物理方程或门值。

`02_模拟程序/src/solvers/highFidelity/lbm.ts` 继续锁定。若最终 H2-N 后端必须修改它，应在 PR-2B 或 PR-3 单独列出算法、数值身份和逐文件差异后再裁决。

## 12. 给 Codex 的下一完整工作批次

批次名称：

`BATCH-PR2A-CLOSE-PREOBSERVATION-GATE-THEN-HW2R-H2X-H2N-H3P`

Codex 可以连续执行至统一停止点，不需要逐文件返回。

顺序：

1. 修正 R1/R2 身份和冻结 R2 权重；
2. 实现 distinct executors 和 fingerprint 去重；
3. 实现 persistent multi-size GPU lifecycle；
4. 冻结并实现 representative hybrid 分工；
5. 修正 numerical identity 时间顺序；
6. 补全 unresolved terminal classes；
7. 补全 one-worker memory admission、逐候选 GPU 安全检查和失败证据；
8. 补全 H2-X worker 数和实际 delivery/aggregation order；
9. 更新 blocker closure evidence；
10. clean clone 与 CI；
11. 机器门通过后开始正式 HW2R；
12. 完成 H2-X；
13. 完成 H2-N stage-0；
14. 按 10% 触发器条件完成完整 H2-N；
15. 最终候选选择；
16. 完成 H3P 和两个环境 dry-run；
17. 更新总账、报告和交接；
18. 停在 `READY-FOR-PR2B-H3-UNLOCK-REVIEW`。

任何正式性能观测之前，步骤 1–10 必须全部完成并推送。

## 13. 后续少数 Pro 复核点

除新异常外，仅保留：

1. **PR-2B**：最终硬件后端、H2-X/H2-N、H3 解锁；
2. **PR-3**：双全量产物和 A8R 科学终局；
3. **PR-4**：实验前暂停终审。

不为普通测试、单个文件、单个 worker 数或每次进度频繁往返。

## 14. 验证边界

本轮实际完成：

- 读取指定基线、AGENTS、current、PR-2 和链接证据；
- 审查 H1/H2/H3/_shared、A8R、正式 LBM、GUI/worker、E1/F1/S1、CI 和总账；
- 扩展 CI 到八个轻量 job；
- 修复跨 workload、unresolved selection、H2-X schedule metadata、H2-N full evidence、cgroup headroom 和机器门；
- GitHub Actions 轻量矩阵在修订过程中用于验证；
- 没有运行正式性能或科学任务。

未执行：

- 正式 HW2R；
- H2-X 正式矩阵；
- H2-N stage-0 正式矩阵；
- 完整 H2-N；
- H3；
- `HW1-primary`；
- `HW1-repeat`；
- 科学 payload 读取；
- 公共物理验证；
- 装置实验验证；
- 正式理论或程序修改。

## 15. 最终状态

本轮规划和观测前裁决已经完整形成，不是下一小步草案。

当前状态为：

`PR2A_PREOBSERVATION_REVIEW_CLOSED_FORMAL_HW2R_BLOCKED_PENDING_SEVEN_MACHINE_GATE_FINDINGS_H3_LOCKED`

科学结论仍为：

`NONE`

当前合法下一动作是执行第 12 节完整批次；当前不合法动作是启动任何正式 HW2R、H2-X/H2-N 正式矩阵、H3 或结果承载科学运行。
