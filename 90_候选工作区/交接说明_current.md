# 当前交接

## 当前状态

用户报告原 A8R v2.1 串行主运行的整个专用进程组已经用 `SIGSTOP` 可逆暂停；
旧 Node 仍保留约 `1.11 GiB` RSS，规范主 gzip、sidecar 和 `.partial-*` 均不存在。

当前状态为：

`A8R_STATIC_MEMORY_ADMISSION_NO_GO_PENDING_HOST_WINDOW_EVIDENCE_AND_SIGCONT`

GitHub 无法直接核验主机 `/proc`。下一步不是启动探针或实现并行调度器，而是在运行
主机按最新裁决完成 60 秒结果盲内存窗口、固化失败证据并恢复原运行。

## 最新独立 Pro 裁决

裁决文件：

`90_候选工作区/current/A8_二维特征开放边界实验后端/32_A8R_v2_1_低内存探针准入与并行性能门短路裁决.md`

- 裁决提交：`dc7f2dfc0e925b058458d6fff7c0e17e7562c234`；
- 裁决文件 SHA-256：
  `280d714c70f08bb283aebdfd03b986407df8648f5ed6040480097687a302e40c`；
- 审查基线：`be9e71f6f51248c2b15710112d8c9c0397c001bd`。

裁决码：

- `ACCEPT-A8R-V2P1-PRO-STATIC-MEMORY-ADMISSION-PROOF-FOR-CURRENT-RESOURCE-SNAPSHOT`；
- `DO-NOT-LAUNCH-A8R-V2P1-PRO-D54-FULL-FORCE-IDENTITY-PROBE-UNDER-CURRENT-HEADROOM`；
- `ALLOW-A8R-V2P1-PRO-HARD-MEMORY-GATE-SHORT-CIRCUIT-BEFORE-SCHEDULER-BYTE-AND-TIMING-GATES`；
- `AUTHORIZE-A8R-V2P1-PRO-PRESERVE-MEMORY-NO-GO-EVIDENCE-AND-SIGCONT-ORIGINAL-RUN`；
- `FORBID-A8R-V2P1-PRO-UNRELATED-PROCESS-GPU-CACHE-SWAP-OR-CGROUP-MANIPULATION`；
- `KEEP-A8R-V2P1-PRO-SCIENTIFIC-RESULTS-FORMAL-INTEGRATION-AND-DOWNSTREAM-LOCKED`。

## 静态内存判定

当前报告值：

- `MemTotal = 15518540 kB`；
- `MemAvailable = 4473040 kB`；
- 硬下限为 `4194304 kB`；
- 当前余量为 `278736 kB = 272.203125 MiB`。

D54 网格为 `1809 x 540`，共 `976860` 个格点。冻结正式求解器、三份候选 mask、
两个控制体字节数组、步前与步后人口副本，以及构造步后副本时仍存活的公开
checkpoint 副本，给出第一次完整力身份步骤的静态已触碰 typed-array 下界：

`423957240 B = 414020.7421875 KiB = 404.3171310425 MiB`。

机器比较向上取整为 `414021 kB`。该下界尚未计入 Node/V8、父监督进程、页表、GC
和其他开销，已经比当前余量大 `135285 kB`。因此当前连一个 D54 全力身份 worker
都不能守住 4 GiB 硬门，2、3、4 worker 可直接短路。

## 下一步唯一固定顺序

### 1. 保持旧运行 stopped 并完成 60 秒窗口

不启动求解器。以不超过 250 ms 的间隔记录：

- `MemTotal`、`MemAvailable`、`SwapFree`；
- memory PSI 与 `memory.events`；
- 旧进程组 PID、启动时间、状态、CPU 时间和 RSS；
- 旧日志字节数、SHA-256 和不变性；
- 规范 gzip、sidecar、`.partial-*` 不存在；
- 没有触碰无关进程。

定义窗口中的

`A_max = max(MemAvailable)`。

若：

`A_max < 4608325 kB`

则静态内存 NO-GO 成立，禁止启动任何 D54 探针。

### 2. 写失败证据

在旧工作区之外写入并 `fsync` 结果盲证据，只允许包含：

- 来源和进程身份；
- 内存样本；
- 静态数组计数与公式；
- 规范产物不存在性；
- `STATIC_MEMORY_ADMISSION_NO_GO`；
- `probeExecuted=false`；
- `unrelatedProcessTouched=false`。

不得读取、显示或保存力、功、阻力、升力、周期、趋势、门值、堆、checkpoint 或
人口数组。可以先恢复旧运行，再从独立克隆 commit/push 失败证据，不得为等待推送
继续冻结旧进程。

### 3. 恢复原运行

确认：

- 原 PID、启动时间、PGID、SID 未变化；
- 进程仍 stopped；
- 没有本任务探针或候选 cgroup 残留；
- 规范和临时产物仍不存在；
- 旧工作树没有 pull、checkout、rebase 或候选注入。

随后只向原专用进程组发送 `SIGCONT`，并验证同一 Node 从第五条暂停点继续增长，
而不是从 step 0 重启。

## 短路边界

- 静态证明一个 worker 不合格时，直接淘汰 2、3、4；
- 若未来安全单 worker 探针证明两份私有工作集必然超过余量，可短路 2、3、4；
- 若实际 2 worker 一次触碰硬内存门或候选 cgroup 上限，可直接淘汰 3、4；
- 硬内存失败不得重复三次；
- 三次重复计时和逐字节门只对已经通过内存准入的并发度执行；
- 4 worker 失败不能在没有单调证明时跳过 3 和 2，3 worker 失败也不能自动跳过 2。

在资源自然增加且满足裁决中的 cgroup 防护前，不允许启动 D54 探针。

## 无关进程锁定

不得对无关 GPU 进程或其父子进程发送信号、迁移 cgroup、renice、ionice、改
affinity、执行 GPU reset、清理显存或独占设备。不得 `drop_caches`、`swapoff`、
强制回收或修改旧 stopped 进程的内存策略。禁止宽泛 `pkill`、`killall` 或未核验的
负 PGID。

## 结果前身份与结论上限

A8R 结果前科学身份仍为：

- 授权实现提交：`a298ee2976cbfd3738fc4ba17cdb52189b1e0da6`；
- 静态实现树 SHA-256：
  `6b11ea23cca5b514c5d2a4f8d34ea11f3202e5c92434b567a828c2fa1f03579f`；
- 正式烟雾实现提交：`9811120482a387158115e4e5565bd25a50bf2e3b`；
- 冻结 A8Q gzip SHA-256：
  `022cc54704ac542b5c148eed5ce026f5701ae79d50426ec3417073f1148ef451`。

正式理论、正式程序、A8Q 科学证据、A8R v2.1 科学合同、合同测试和全部科学门均未
修改。当前只有性能资源裁决，没有 A8R 数值 PASS、INCONCLUSIVE、NO-GO 或实验
结论。

旧运行完成后仍须完成原冻结独立复跑和再次 Pro 审查。长期终点仍是：

`EXPERIMENT_PREPARATION_PAUSE_READY_NO_EXECUTABLE_NONEXPERIMENTAL_TASKS`
