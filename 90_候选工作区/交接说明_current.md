# 当前交接

## 当前状态

原 A8R v2.1 串行主运行已经按独立 Pro 裁决恢复。当前状态为：

`A8R_ORIGINAL_SERIAL_RUN_SIGCONT_IDENTITY_CPU_VERIFIED_PENDING_NEXT_PROGRESS_EMISSION`

恢复后仍是原专用进程组：

- npm PID：`51467`；
- 包装 shell PID：`51497`；
- Node PID：`51498`；
- PGID/SID：`51467`；
- Node 启动时间：`2026-08-31 03:00:25 +08:00`；
- 原运行工作区提交：`88c4e9e8ba57b02a06315679e9b30dd10999b30c`。

`SIGCONT` 后，Node 从 stopped 变为运行态；同一启动时间、PGID 和 SID 未变化，5 秒
观测窗口中累计 CPU 时间从 `15:53:31` 增长到 `15:53:38`。初始 7 秒终端轮询尚未
出现下一条整十进度行，因此最终恢复证据仍等待同一 D54 case 的下一次原有进度输出。
不得因等待该输出再次暂停或重启进程。

规范主 gzip、sidecar 和 `.partial-*` 在恢复检查点仍不存在。旧工作区保持干净，且
为了保持启动时来源身份，仍未 pull、checkout、rebase 或加载远端新文件。

## 性能分支结论

本次暂停事件中的性能分支结论为：

`NO-GO-A8R-V2P1-PARALLELIZATION-CURRENT-PAUSE-EPISODE-HARD-MEMORY-GATE`

科学结论为 `NONE`。这不是 A8R 数值、物理或实验 `NO-GO`。

先行 `W=1` 探针在启动时受 `ffa9b115...` 裁决授权，但约 `0.105 s` 后穿越 4 GiB
硬内存门并立即 fail-closed。探针未完成、无有效计时、无科学输出、无规范产物、无
swap 增长、无 OOM、无残留进程、无无关进程操作。

60 秒静态窗口随后观测到资源自然恢复，分类为：

`STATIC_WINDOW_RESOURCE_RECOVERY_AFTER_PRIOR_HARD_GATE_FAILURE`

依据最新独立 Pro 裁决，该恢复不授权第二次探针。本次暂停事件中的并行路线已经结束。

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

## 已提交的性能治理证据

证据提交：

`654ca873cafe13caba822c1f59d86294c22b86ad`

报告：

`90_候选工作区/current/A8_二维特征开放边界实验后端/34_A8R_v2_1_先行W1硬内存门失败候选处置与串行恢复证据报告.md`

证据目录：

`90_候选工作区/current/A8_二维特征开放边界实验后端/验证与复现/performance-governance/`

主要不可变 JSON：

- 原始 `W=1` 失败：
  `750535af9a8836155d41496114a8371a14533661d9f9a043fc070ab55b007c6f`；
- 60 秒静态窗口：
  `15bd6f7f97674caff6ac31f717ad5b63e193b1c28153ebbe3a80c6397474b216`；
- 候选处置 manifest：
  `58e6a2fa960181d4e88ad445ae1fab997cf5c109fac90783df9de028fee63a1b`；
- `SIGCONT` 前总记录：
  `f4f3cc6b858609b0465220675cbecd4feaf9babf19864b4e4ab4104341e69386`；
- `SIGCONT` 后身份与 CPU 检查点：
  `9f24e60add6f7d8ab54c29580c6f30e62e35f17e0507baeb7ec5d0f6ab22c57a`。

未提交候选源码、构建缓存和临时 worker 字节已经在记录非内容哈希身份后丢弃；候选
克隆恢复到干净基线，`discardVerified=true`。候选源码没有 commit 或 push。

## 下一步唯一固定顺序

1. 保持 PID `51498` 原样运行，不发送第二次性能探针，不修改其旧工作区；
2. 等待终端原有进度输出出现同一
   `a8r-v2p1-d54-mask-0p50-phase-baseline-eta-1p00` case 的下一条整十进度行；
3. 新增最终 post-resume JSON，链接
   `a8r-v2p1-post-sigcont-checkpoint.json`，记录
   `nextSameCaseProgressEmissionVerified=true` 和 `resumeVerified=true`，不得覆盖既有文件；
4. 提交、push 该最终恢复证据并更新本交接；
5. 继续原冻结串行八轨迹主运行直到规范 gzip 和 sidecar 完整生成；
6. 单独提交主产物和初始报告；
7. 使用原冻结独立干净复跑环境，从 step 0 完成完整八轨迹复跑；
8. 核验主、复跑 gzip 和 sidecar 逐字节一致，再交回独立 Pro。

如果 PID 身份变化、进程消失、进度倒退、规范产物意外提前出现或旧工作区发生来源
变化，不得自行重启，应保全现场并重新交回独立 Pro。

## 禁止项与结论上限

当前禁止：

- 第二次 D54 探针；
- 2、3、4 worker 启动；
- 继续并行调度器、逐字节等价门或重复计时；
- 修改原运行工作区或加载远端治理文件；
- 修改正式理论、正式程序、A8Q、A8R 合同、合同测试、矩阵、门值或科学实现；
- 从先行探针或性能治理证据推断 A8R 科学结果。

当前 A8R 仍没有数值 `PASS`、`INCONCLUSIVE` 或科学 `NO-GO`。旧串行主运行完成后
仍须执行原冻结独立完整复跑并再次交回独立 Pro。A8R 终局只是长期任务的检查点；
长期终点仍为：

`EXPERIMENT_PREPARATION_PAUSE_READY_NO_EXECUTABLE_NONEXPERIMENTAL_TASKS`
