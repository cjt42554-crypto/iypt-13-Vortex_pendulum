# 交接历史

## 历史归档边界

截至本条之前的完整交接历史未删除，固定于：

- 提交：`b11eea58dcf45518c0a086dc5dba1e065fd49213`；
- 文件路径：`90_候选工作区/交接说明_history.md`；
- Git blob SHA：`086e9c2fedd4beac33683c20f03a3dcb1174a01f`；
- 文件字节数：`50021`；
- 文件 SHA-256：`6ec6e7a8495bbade4e5e35d02b82ace491c960a8cb5d121ac9b088d28ea0260f`。

需要追溯此前处理过程时，使用：

```bash
git show b11eea58dcf45518c0a086dc5dba1e065fd49213:"90_候选工作区/交接说明_history.md"
```

本文件自下条起继续记录新的交接历史；归档身份与后续条目共同构成完整历史。

## 2026-08-31 17:59:50 +09:00

- 独立裁定先行 `W=1` D54 非科学探针的时间顺序：其启动发生在更严格静态准入裁决到达前，按当时生效的 `ffa9b115...` 获授权；不得追溯改写为 `probeExecuted=false`。
- 探针约 `0.105 s` 内使 `MemAvailable` 从 `4325957632 B` 降至 `4282589184 B`，低于 `4294967296 B` 硬门后由监督器立即 `SIGTERM`；分类为硬内存门 fail-closed、未完成、无有效计时和无科学输出。
- 原始失败 JSON 必须保持逐字节不变，SHA-256 为 `750535af9a8836155d41496114a8371a14533661d9f9a043fc070ab55b007c6f`；静态窗口、时间序列和恢复证据必须如实链接该实体。
- 新增 `33_A8R_v2_1_先行W1探针时间序列证据真实性与恢复原运行裁决.md`，裁决提交 `ef66995f31b017522c51d42978f3069102a1023c`，文件 SHA-256 为 `2a1f90ff6809e60dbff50182723b9362f18fe769ecbe46a7704560514d966995`；当前交接提交为 `b11eea58dcf45518c0a086dc5dba1e065fd49213`。
- 当前不得再次启动探针、2/3/4 worker、完整调度器、逐字节门或重复计时；完成 60 秒纯静态窗口和恢复前门后，应 `SIGCONT` 同一原串行进程组，不得为等待 GitHub 提交继续暂停。
- 未提交候选并行源码、构建和临时字节在记录路径、大小和 SHA-256 manifest 后必须删除，不得 commit/push；只保留探针失败、静态准入、恢复证据和非科学摘要。正式理论、正式程序、A8Q、A8R 合同/测试和科学实现未修改，本轮未运行求解器或验证测试。

## 2026-08-31 17:13:18 +08:00

- 完成 60 秒纯静态内存窗口：302 个样本、最大间隔约 `201.31542 ms`、`A_min=6372104 kB`、`A_max=7001940 kB`；资源自然恢复，按最新裁决分类为 `STATIC_WINDOW_RESOURCE_RECOVERY_AFTER_PRIOR_HARD_GATE_FAILURE`，但不授权第二次探针。
- 在独立候选克隆之外 `fsync` 保存五个失败候选文件的路径、大小与 SHA-256 manifest；随后清理三个未跟踪脚本、`node_modules`，并把 `package.json` 与 P1 身份源恢复到基线。候选源码未 commit/push，清理后工作树干净，`discardVerified=true`。
- 闭合原始 `W=1` 失败、静态窗口、候选处置、恢复前和 `SIGCONT` 后五层证据；证据提交为 `654ca873cafe13caba822c1f59d86294c22b86ad`，新增 `34_A8R_v2_1_先行W1硬内存门失败候选处置与串行恢复证据报告.md`。
- 只向原专用 PGID `51467` 发送 `SIGCONT`；PID `51467/51497/51498`、Node 启动时间、PGID 与 SID 未变化，Node CPU 时间重新增长，旧工作区仍干净且规范产物仍不存在。
- 初始 7 秒终端轮询尚未出现下一条整十进度行；当前状态为 `A8R_ORIGINAL_SERIAL_RUN_SIGCONT_IDENTITY_CPU_VERIFIED_PENDING_NEXT_PROGRESS_EMISSION`。下一步只等待同一 D54 case 的下一条进度行并追加最终恢复记录，然后继续原冻结串行主运行。
- 性能分支结论为 `NO-GO-A8R-V2P1-PARALLELIZATION-CURRENT-PAUSE-EPISODE-HARD-MEMORY-GATE`，科学结论仍为 `NONE`。正式理论、正式程序、A8Q、A8R 合同/测试、矩阵和科学实现均未修改。

## 2026-08-31 18:19:21 +08:00

- 终端会话 `99850` 输出同一 D54 case 的 `60480/86400 (70%)`；相对于暂停前 `51840/86400 (60%)`，case ID 相同且步数严格增加。捕获后仍是原 PID `51467/51497/51498`、Node 启动时间、PGID 和 SID，旧工作区仍干净，没有从 step 0 重启。
- 新增不可变 `a8r-v2p1-post-sigcont-final-resume-verification.json`，链接前驱检查点 SHA-256 `9f24e60add6f7d8ab54c29580c6f30e62e35f17e0507baeb7ec5d0f6ab22c57a`；最终 JSON SHA-256 为 `098446da61407b549d84eb0cc27103b19f090892359bff242512f9f6afca9659`，记录 `nextSameCaseProgressEmissionVerified=true` 和 `resumeVerified=true`。
- 最终恢复证据提交为 `fa3e40cd99034fb57a5289fbb3b2f8b248fa759d`。同时按 Pro 复核勘误报告：目标 cgroup 的 `memory.events` 已记录，根 cgroup 字段实际为 `null` 且未作为结论依据。
- 最终 JSON 解析、全部 sidecar、硬链接数、Pandoc 解析、Chrome 页面渲染和 Git 差异检查通过。仓库级 Markdown 数学检查仍只命中未修改的既有 A8O/A8P 裁决文件，不报告为全仓库通过。
- 当前状态为 `A8R_ORIGINAL_SERIAL_RUN_RESUME_VERIFIED_AT_D54_70_PERCENT_CONTINUING_MAIN_RUN`。原冻结串行主运行继续；规范主 gzip、sidecar 和 `.partial-*` 在取证时仍不存在。性能结论不变，科学结论仍为 `NONE`；正式理论、正式程序、合同、矩阵和科学实现均未修改。
