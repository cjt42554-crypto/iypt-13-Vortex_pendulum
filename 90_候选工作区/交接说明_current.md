# 当前交接

## 当前状态

用户报告原 A8R v2.1 串行主运行继续保持旧来源和原进程身份：

- 原运行工作区提交：`88c4e9e8ba57b02a06315679e9b30dd10999b30c`；
- Node PID：`51498`；
- 当前同一 D54 case 已输出 `77760/86400 (90%)`；
- 旧工作树干净；
- 规范 gzip、sidecar 和 `.partial-*` 尚未出现。

GitHub 无法独立核验该实时进度。当前健康运行不得因新的硬件路线自行中断。当前状态为：

`A8R_SERIAL_REFERENCE_RUNNING_HW1_SUPERSEDING_PAIR_RESULT_BLIND_ROUTE_UNLOCKED`

科学结论仍为 `NONE`。

## 最新独立 Pro 裁决

裁决文件：

`90_候选工作区/current/A8_二维特征开放边界实验后端/35_A8R_硬件充分利用结果身份迁移与全仓模拟技术债裁决.md`

- 裁决提交：`27dbd7e5971317469cbbcdb7ded1da1b34e82df3`；
- 裁决文件 Git blob SHA：`f11f85c2df1857a1671ab0c8cc78274843629cda`；
- 审查基线：`af55d5dddfe5b9b827ec1f5fbfea77bc956d1469`。

裁决码：

- `KEEP-A8R-V2P1-CURRENT-SERIAL-PRIMARY-UNINTERRUPTED-TO-SEALED-REFERENCE`；
- `CLASSIFY-A8R-V2P1-CURRENT-SERIAL-ARTIFACT-AS-REFERENCE-NOT-FINAL-CLOSURE`；
- `SUPERSEDE-A8R-V2P1-LEGACY-SERIAL-INDEPENDENT-REPEAT-BEFORE-EXECUTION`；
- `UNLOCK-A8R-HW1-RESULT-BLIND-HARDWARE-DISCOVERY-CANDIDATE-ARCHITECTURE-AND-QUALIFICATION`；
- `REQUIRE-A8R-HW1-TWO-FRESH-FULL-RUNS-FROM-STEP-ZERO-UNDER-ONE-QUALIFIED-EXECUTION-IDENTITY`；
- `FORBID-A8R-HW1-MIXED-SERIAL-OPTIMIZED-PAIR-PROVENANCE-ALIASING-AND-SERIAL-FALLBACK`；
- `REQUIRE-IYPT13-SIMULATION-DATA-PLANE-STAGED-MEDIUM-LARGE-REFACTOR`；
- `KEEP-IYPT13-PROTECTED-FORMAL-PATHS-LOCKED-PENDING-CANDIDATE-QUALIFICATION`；
- `KEEP-A8R-SCIENTIFIC-RESULTS-FORMAL-INTEGRATION-AND-DOWNSTREAM-LOCKED`。

## 身份与运行顺序变更

### 当前串行运行

当前运行必须自然完成。完成后先在旧工作区冻结 PID/退出状态、八轨迹状态、终端摘要、
工作区身份、规范 gzip/sidecar/partial、文件大小、SHA-256、inode、`realpath` 和现有
产物断言结果，再把逐字节相同的产物转移到最新 `main` 的独立干净工作区。

该产物分类为：

`A8R-V2P1-SERIAL-REFERENCE`

它保留证据价值，但不再与一次新后端复跑混成最终独立复跑对。

### 原冻结串行复跑

原来在旧来源上冻结、尚未启动的串行全量复跑被本裁决在执行前取代：

- 不再运行旧串行八轨迹；
- 不得读取当前串行参考结果；
- 只保留为历史冻结环境；
- 不得复用于 A8R-HW1。

### A8R-HW1

下一次长时结果承载运行必须采用通过硬件资格的 A8R-HW1 身份。必须从同一结果前实现
提交建立两个独立环境，分别从第一个 case、step 0、新鲜初态完成八轨迹：

- `HW1-primary`；
- `HW1-repeat`。

两者不得共享 shard、checkpoint、缓存、临时文件、inode 或中间状态。若硬件资格没有
候选通过，不得自动退回串行，应停止在
`NO-GO-A8R-HW1-HARDWARE-QUALIFICATION`。

## 全仓技术债裁决摘要

本轮不选择保持现状，也不批准立即全仓重写。结论为：

- A8R 候选执行与数据平面：分阶段大范围重构；
- 正式高保真内核、runner 和 worker：候选通过后局部到中等规模集成；
- 前向理论、结构性理论、ROM、普通 UI 和无关分析：保持现状；
- 旧合同、产物和裁决：保持不可变历史。

P0 债务包括：八轨迹同步串行、每分析步多份 `9N` 人口复制、全场二次力身份扫描、
对象化 trace 常驻、八轨迹结束前无 case shard，以及 scientific/execution/artifact
身份耦合。只增加 worker 不足以解决这些问题。

## 下一步唯一固定顺序

### 当前串行参考仍运行时

1. 不干预 PID `51498`、旧工作区、终端、cgroup、affinity 或内存策略；
2. 在最新 `main` 的独立干净工作区，只允许新建
   `90_候选工作区/current/H1_硬件利用与执行架构/**`；
3. 先分别建立并 push Markdown 结果盲合同、机器合同和合同测试；
4. 可以继续无结果 backend interface、case shard、resource planner 和 probe 源码，
   但当前串行进程退出并完成参考封存前，不得启动重型求解器或性能 probe；
5. 不得启动原冻结串行复跑。

### 串行参考封存后

1. 完成静态硬件 inventory 和可持续内存带宽基线；
2. 对所有静态可行、可能有实质净收益的 CPU、GPU、WASM/native、轨迹级或单轨迹级
   候选执行结果盲代表性 probe；
3. 先验证精确执行等价；非逐字节后端必须使用新的数值资格合同；
4. 只有正确性、端到端加速、95% 最优吞吐、资源利用、内存、安全与热管理全部通过，
   才允许 H3 两次全量运行；
5. 主/复跑完成后交回独立 Pro，不自动推进正式集成或下游。

## 精确授权与锁定

立即授权：

- `90_候选工作区/current/H1_硬件利用与执行架构/**`；
- 交接文件；
- 可选新增 `.github/workflows/simulation-check.yml`，但仅用于静态、测试、构建和短 smoke。

现有 A8R v2.1 合同、实现、runner、preflight、asserter、测试、证据和串行参考保持只读。

当前不授权修改：

- `01_最终理论/**`；
- `02_模拟程序/**`；
- 顶层 `AGENTS.md`。

正式高保真候选通过并经独立 Pro 结果审查后，才可按最新裁决第 11.3 节列出的逐文件
清单申请正式集成；清单外正式路径仍锁定。

## 当前结论上限

本轮只有硬件治理、结果身份迁移和技术债重构结论。没有读取或形成 A8R 数值
`PASS`、`INCONCLUSIVE` 或科学 `NO-GO`，没有解锁正式接入、规定横移、weak-FSI、
三维、自由表面或实验预测。

长期终点仍为：

`EXPERIMENT_PREPARATION_PAUSE_READY_NO_EXECUTABLE_NONEXPERIMENTAL_TASKS`
