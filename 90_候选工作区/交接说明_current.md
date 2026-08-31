# 当前交接

## 当前状态

原 A8R v2.1 串行主运行的专用进程组仍以 `SIGSTOP` 可逆暂停。规范主 gzip、sidecar
和 `.partial-*` 均不存在。

在静态准入裁决 `dc7f2dfc...` 到达之前，Codex 已按当时生效的
`ffa9b115...` 裁决，在独立克隆启动过一次且仅一次 `W=1`、D54、40 步、全力身份
非科学冷启动探针。监督器约在 `0.105 s` 内观测 `MemAvailable` 穿越 4 GiB 硬门并
立即 `SIGTERM` 唯一 worker。探针未完成、未输出有效指标或科学字段，无 swap 增长、
无 OOM、无规范或临时研究产物、无残留进程、无无关进程操作。

当前状态为：

`A8R_PRE_SUPERSEDING_W1_PROBE_HARD_MEMORY_FAIL_CLOSED_PENDING_STATIC_EVIDENCE_SOURCE_DISCARD_AND_SIGCONT`

必须如实记录 `probeExecuted=true`。不得按照较晚到达的静态裁决把已经发生的探针
改写为未执行。

## 最新独立 Pro 裁决

裁决文件：

`90_候选工作区/current/A8_二维特征开放边界实验后端/33_A8R_v2_1_先行W1探针时间序列证据真实性与恢复原运行裁决.md`

- 裁决提交：`ef66995f31b017522c51d42978f3069102a1023c`；
- 裁决文件 SHA-256：
  `2a1f90ff6809e60dbff50182723b9362f18fe769ecbe46a7704560514d966995`；
- 审查基线：`d5c88e0a8552dd0c9ebddad1ade574acee632460`。

裁决码：

- `ACCEPT-A8R-V2P1-PRO-PRE-SUPERSEDING-W1-PROBE-AS-TEMPORALLY-AUTHORIZED`；
- `CLASSIFY-A8R-V2P1-PRO-W1-PROBE-HARD-MEMORY-GATE-FAIL-CLOSED-INCOMPLETE`；
- `REQUIRE-A8R-V2P1-PRO-TRUTHFUL-PROBE-EXECUTED-TRUE-AND-IMMUTABLE-FAILURE-HASH`；
- `AUTHORIZE-A8R-V2P1-PRO-STATIC-WINDOW-THEN-SIGCONT-ORIGINAL-SERIAL-RUN`；
- `REQUIRE-A8R-V2P1-PRO-DISCARD-UNCOMMITTED-PARALLEL-CANDIDATE-SOURCE-RETAIN-EVIDENCE-ONLY`；
- `FORBID-A8R-V2P1-PRO-ANY-FURTHER-PROBE-SCHEDULER-BYTE-OR-TIMING-GATE-ON-CURRENT-SNAPSHOT`；
- `KEEP-A8R-V2P1-PRO-SCIENTIFIC-RESULTS-FORMAL-INTEGRATION-AND-DOWNSTREAM-LOCKED`。

## 已发生探针的固定事实

必须在证据中逐值记录：

- `probeExecuted=true`；
- `executionCount=1`；
- `workerCount=1`；
- `probeCompleted=false`；
- `validTimingMeasurementProduced=false`；
- `scientificOutputProduced=false`；
- `terminationSignal=SIGTERM`；
- `terminationReason=MEMAVAILABLE_HARD_FLOOR_CROSSED`；
- `terminationElapsedSeconds=0.105`；
- `memAvailableStartBytes=4325957632`；
- `memAvailableMinimumObservedBytes=4282589184`；
- `hardFloorBytes=4294967296`；
- `startHeadroomBytes=30990336`；
- `observedDropBytes=43368448`；
- `floorUndershootBytes=12378112`；
- `workerPeakRssObservedBytes=89858048`；
- `workerPeakRssIsCensoredEarlyObservation=true`；
- `swapGrowthBytes=0`；
- `oomOccurred=false`；
- 规范 gzip、sidecar、partial 均为 `false`；
- `residualProbeProcesses=false`；
- `unrelatedProcessTouched=false`。

原始失败 JSON 必须保持逐字节不变，其 SHA-256 为：

`750535af9a8836155d41496114a8371a14533661d9f9a043fc070ab55b007c6f`。

该 JSON 不得覆盖或重写。若实体重算哈希不一致，应停止恢复并交回独立 Pro。

`89858048 B` 只是约 `0.105 s` 终止前的最大外部观测值，不是 D54 完整力身份路径的
峰值，不得用于反驳静态内存下界或推断两个 worker 可行。

## 下一步唯一固定顺序

### 1. 完成 60 秒纯静态窗口

旧运行继续 stopped，不再启动任何求解器。按 `32...` 记录不少于 60 秒、最大采样
间隔不超过 250 ms 的 `MemTotal`、`MemAvailable`、`SwapFree`、memory PSI、
`memory.events`、旧进程身份、CPU/日志不变性和规范产物不存在性。

若 `A_max < 4608325 kB`，静态分类为：

`STATIC_MEMORY_ADMISSION_NO_GO`。

若资源自然恢复到或超过该阈值，分类为：

`STATIC_WINDOW_RESOURCE_RECOVERY_AFTER_PRIOR_HARD_GATE_FAILURE`。

后一分类也不授权第二次探针；本次暂停事件仍结束性能优化分支并恢复原串行运行。

### 2. 闭合时间序列证据

保留三层证据：

1. 原始探针失败 JSON及其 SHA-256；
2. 60 秒静态窗口 JSON及其 SHA-256；
3. 按最新裁决固定字段形成的时间序列、候选处置和恢复总记录。

总记录结论码为：

`NO-GO-A8R-V2P1-PARALLELIZATION-CURRENT-PAUSE-EPISODE-HARD-MEMORY-GATE`。

科学结论必须为 `NONE`。

### 3. 逐字节丢弃候选源码

在候选克隆之外先 `fsync` 保存证据，并记录候选克隆、基线、候选文件路径、字节数、
逐文件 SHA-256、确定性 manifest SHA-256、实际命令和运行时身份。只保留这些哈希
身份，不保留候选源正文、diff 或 patch。

随后核验目标是独立候选克隆而不是旧运行工作区，并删除全部未提交候选调度器、worker、
构建产物、缓存和临时目录。候选源码不得 commit 或 push。删除后必须证明候选路径已
消失，或工作树与记录的基线一致，并记录 `discardVerified=true`。

### 4. `SIGCONT` 恢复原运行

恢复前核验：

- 原 PID、启动时间、PGID、SID 未变化且全部仍 stopped；
- 暂停期间 CPU 时间、日志字节数和日志 SHA-256 不变；
- 旧工作树未 pull、checkout、rebase、重载模块或注入候选文件；
- 无调试器、heap dump、checkpoint 或人口读取；
- 规范 gzip、sidecar、partial 仍不存在；
- 探针、监督器子进程和候选 cgroup 无残留；
- swap 增长为 0、无 OOM；
- 无关 GPU/CPU 进程未被触碰；
- 原始失败 JSON 与静态窗口证据哈希闭合。

随后只向原专用进程组发送 `SIGCONT`。必须证明同一 Node PID 和启动时间继续、CPU
时间继续增长、日志从第五条同一 case 和暂停进度之后增长，没有从 step 0 重启。

不得为等待 GitHub 提交继续暂停。证据可在恢复原运行后从独立克隆 commit/push。

## 禁止项与提交边界

当前不允许：

- 第二次 D54 探针；
- 2、3、4 worker 启动；
- 完整并行调度器实现；
- 逐字节等价门或重复计时；
- 提交候选调度器、worker、diff、patch、缓存或临时输出；
- 读取或保存探针科学中间量；
- 干预无关 GPU/CPU 进程；
- 修改正式理论、正式程序、A8Q、A8R 合同、合同测试、矩阵、门值或科学实现。

后续允许提交的性能材料仅限探针失败证据、静态窗口证据、时间序列与恢复证据、
sidecar、非科学文字报告、验证记录和交接。

## 结果前身份与结论上限

A8R 结果前科学身份仍为：

- 授权实现提交：`a298ee2976cbfd3738fc4ba17cdb52189b1e0da6`；
- 静态实现树 SHA-256：
  `6b11ea23cca5b514c5d2a4f8d34ea11f3202e5c92434b567a828c2fa1f03579f`；
- 正式烟雾实现提交：`9811120482a387158115e4e5565bd25a50bf2e3b`；
- 冻结 A8Q gzip SHA-256：
  `022cc54704ac542b5c148eed5ce026f5701ae79d50426ec3417073f1148ef451`。

先行探针在启动时获授权，但其结果只是硬内存门 fail-closed，不是有效性能测量，更不
是 A8R 科学证据。原串行运行在上述证据和恢复门闭合后可以继续。

旧运行完成后仍须生成规范主产物、执行原冻结独立完整复跑并再次交回独立 Pro。长期
终点仍为：

`EXPERIMENT_PREPARATION_PAUSE_READY_NO_EXECUTABLE_NONEXPERIMENTAL_TASKS`
