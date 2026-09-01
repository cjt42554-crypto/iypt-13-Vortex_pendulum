# 当前交接

## 当前状态

PR-2A 页面回复与仓库机器门差异已经统一。当前状态为：

`PR2A_RECONCILED_GATE_V2_SEVEN_P0_OPEN_FORMAL_HW2R_LOCKED`

科学结论仍为：

`NONE`

GitHub 当前实际基线已经不是 `fa73bda...`。PR-2A v1、旧 v1 机器门、候选修复和绿色 CI 均已存在于 `b864d4c...`；本轮新增差异统一裁决、活动 v2 机器门及正式入口强制。

当前仍不允许启动：

- 正式 HW2R，包括其 calibration、warmup 和 formal repeat；
- H2-X 或 H2-N 正式矩阵；
- H3；
- `HW1-primary`；
- `HW1-repeat`；
- 完整八 case 结果承载运行；
- 科学 payload 读取。

仓库尚未达到“实验前可暂停”。

## 唯一权威差异裁决

裁决文件：

`90_候选工作区/current/G0_全项目完成度与实验前暂停治理/09_PR2A_b864页面回复与仓库机器门差异统一裁决.md`

裁决身份：

`IYPT13-PR2A-B864-PREOBSERVATION-RECONCILIATION-v1`

指定审查基线：

`b864d4c22251ffc356f1b6c8c4d86cdd1d1e41ab`

裁决首次写入提交：

`25ec2349fab53970e01acf9e852a33f3d08afe6f`

裁决文件 SHA-256：

`161bc38d5c8fa57ae5b6d07a2c14bf37218aa56228b05f84fd593fbaf0eb3ba0`

该裁决废止页面最终回复中“远端未写入、仍停在 `fa73bda...`”的事实陈述，并取代 PR-2A v1、current 和页面回复中互相冲突的活动时序。PR-2A v1 继续作为历史审查证据，不被改写。

## 唯一首次正式观测通过码

首次正式 HW2R 的唯一合法通过码为：

`PASS-PR2A-HW2R-FORMAL-OBSERVATION-READY`

旧码：

`PASS-HW2R-PRE-OBSERVATION-READINESS`

只保留历史意义，不再解锁机器门、入口、manifest、sidecar 或正式观测。

## 活动机器门

活动机器门：

`90_候选工作区/current/H1_硬件利用与执行架构/contracts/hw2r-pre-observation-readiness.v2.json`

机器门身份：

`VP-HW2R-PRE-OBSERVATION-READINESS-v2`

机器门 SHA-256：

`ce787bdcff97b884dcb81289688a778f854dacb9b908aeab6eee6b41c4bd57a4`

当前字段：

- `status=NOT_READY`；
- `formalObservationAuthorized=false`；
- `attainedPassCode=null`；
- 七项 P0 全部 `OPEN`；
- pre-observation manifest 与 sidecar 尚未生成；
- `resultBearingScientificRunAuthorized=false`。

v1 机器门保持历史字节不变。正式 runner 和 finalizer 已通过活动 protocol loader 调用 v2 门，不能再仅靠跳过独立 audit 命令绕过。

## 首次正式 HW2R 前的完整七项 P0

### 1. `P0-COMPARABLE-A8R-OPERATION-GRAPH-AND-PROTOCOL`

- 冻结取代旧 v2 测量语义的 superseding protocol；
- 旧 v2 不得结果后原地改写；
- 最终比较执行冻结 A8R 的缩短真实操作图；
- R2 或等价端到端负载由冻结八 case 定义程序化生成；
- 禁止跨 R1/R2 或不同工作单位计算 speedup；
- 所有候选使用同一可比最终计分模型。

### 2. `P0-DISTINCT-EXECUTORS-AND-EFFECTIVE-RESOURCES`

- persistent worker、fresh process、shard/data-layout 使用实质不同 executor，或在候选入集前去重；
- 每个候选绑定不可变 executor fingerprint；
- workload 身份与实际执行路径一致；
- declared、effective、active resource count 分开记录；
- 评分和利用率只使用有效资源数。

### 3. `P0-RUN-LIFETIME-PERSISTENT-GPU-AND-HYBRID`

- GPU context、program、queue 和 reusable buffer 在一个多尺寸 formal repeat 内持久；
- D24/D36/D54 尺寸切换和生命周期分项可审计；
- GPU/hybrid 每个候选前检查外来 GPU 计算进程；
- hybrid 按冻结成本结果盲分工；
- combined hybrid 无缺失、无重复、无 silent fallback。

### 4. `P0-NUMERICAL-IDENTITY-ORDER-AND-UNRESOLVED-SELECTION`

- HW2R 不得在 H2-X/H2-N 之前写数值身份 PASS；
- surrogate correctness 与 numerical qualification 分离；
- exact/non-exact 路线分别保持 H2-X/H2-N pending；
- 可能净快 10% 以上的 invalid、deferred、unavailable、failed、unknown 或 identity-pending 候选阻断选择；
- 95% 集合只使用可比、有效、安全、已资格化候选。

### 5. `P0-BIDIRECTIONAL-CALIBRATION-AND-FULL-PHASE-SAFETY`

- calibration 可确定性放大过短工作量，也可从过长观测确定性缩小或预测；
- formal repeat 工作量冻结；
- calibration、warmup、formal repeat 均在同一有限 cgroup 和安全边界内；
- 三阶段均监督内存保留、cgroup peak/high、swap、OOM、热和 GPU 安全；
- 硬门越界立即 fail-closed 并保留证据。

### 6. `P0-CHILD-CONTAINMENT-TIMEOUT-AND-FAILURE-EVIDENCE`

- 所有 Node/native/GPU child 有冻结 timeout；
- 使用任务专用 PGID 或等价收容范围；
- 失败时只终止本任务进程，并核验无残留 PID/cgroup task/service；
- 失败证据记录 stage、code、sanitized message hash、exit/signal、timeout、资源和 cleanup；
- one-worker 实测或保守静态下界控制 wider launch；
- cgroup peak 加 headroom 低于上限。

### 7. `P0-PREOBSERVATION-SEAL-ENTRYPOINT-AND-UNIQUE-PASS-CODE`

- 正式 runner 和 finalizer 强制读取 v2 门；
- 七项 P0 全部 CLOSED 且各自有 committed/pushed closure evidence；
- 生成 pre-observation manifest 与 sidecar；
- manifest 绑定裁决、机器门、协议、实现、测试、CI、主机 preflight 和禁止科学运行声明；
- `main` 干净且 `HEAD == origin/main`；
- H1/H2/H3/_shared 轻量测试和两个 GitHub workflow 通过；
- 唯一 attained pass code 精确为 `PASS-PR2A-HW2R-FORMAL-OBSERVATION-READY`。

## HW2R 后、PR-2B 前的要求

以下内容不再阻断首次正式 HW2R，但必须在 PR-2B 前闭合：

1. H2-X 全矩阵：完整 worker 数、实际 completion/delivery/receipt/discovery/aggregation order、三环境、全负例、D54 安全；
2. H2-N：先 stage-0；相对 H2-X 净收益不超过 10% 时可有效 DEFERRED，严格超过 10% 时实现并执行 full evaluator、negative dispatcher 和完整资格；
3. H3P：全故障矩阵、atomic shard/sidecar/recovery、cross-run 拒绝和两个真实独立环境 seal；
4. 性能终局：phase-resolved CPU/GPU、扩展或饱和、transfer/sync/热/soak、至少 1.50 加速、至少 95% 最优且无潜在大于 10% unresolved 候选。

H2-N 的合同、evidence envelope、阈值、10% 触发器和 fail-closed validator 必须在首次观测前冻结；完整实现和执行只有触发后才要求。

## 下一完整批次

批次：

`BATCH-PR2A-V2-CLOSE-SEVEN-P0-SEAL-THEN-HW2R-H2X-H2N-H3P`

顺序：

1. 闭合七项 P0；
2. 对每项写入 committed/pushed closure evidence；
3. clean clone 执行 H1/H2/H3/_shared 和限定范围 Markdown 检查；
4. 完成主机 preflight；
5. 生成 pre-observation manifest 与 sidecar；
6. 将 v2 门置为 READY，并只写唯一通过码；
7. 直接启动正式 HW2R，无需再问“是否可开始”；
8. 完成 H2-X；
9. 完成 H2-N stage-0，并按 10% 触发器条件完成完整 H2-N；
10. 形成最终硬件选择；
11. 完成 H3P 全矩阵和两个真实环境 seal；
12. 更新总账、报告和交接；
13. 停在 `READY-FOR-PR2B-H3-UNLOCK-REVIEW`。

当前步骤 1–6 均未完成，不得正式观测。

## 当前写权限

允许：

- `90_候选工作区/current/G0_全项目完成度与实验前暂停治理/**`；
- `90_候选工作区/current/H1_硬件利用与执行架构/**`；
- `90_候选工作区/current/H2_代表性执行与数值资格/**`；
- `90_候选工作区/current/H3_双全量运行产物与恢复合同/**`；
- `90_候选工作区/current/_shared/**`；
- `.github/workflows/simulation-check.yml`；
- 两份交接。

继续锁定：

- `01_最终理论/**`；
- `02_模拟程序/**`；
- 顶层 `AGENTS.md`；
- 既有 A2/A8 合同、实现、测试、报告、证据和产物；
- R0、R1I、PR-1、PR-2、PR-2A v1、G1、HW2 v1 冻结证据；
- H3、`HW1-primary` 和 `HW1-repeat`。

## Markdown 格式门

通用 Markdown 格式检查只覆盖：

- `01_最终理论/**/*.md`；
- 精确的 `90_候选工作区/交接说明_current.md`。

其他 Markdown 不进入通用格式门。

## 结论上限

本轮只形成治理、机器门和入口强制结论。没有形成正式性能、H2-X、H2-N、H3、数值、物理或实验 PASS。科学结论仍为 `NONE`。

长期终点仍为：

`EXPERIMENT_PREPARATION_PAUSE_READY_NO_EXECUTABLE_NONEXPERIMENTAL_TASKS`
