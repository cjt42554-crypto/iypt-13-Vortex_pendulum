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

## 2026-08-31 23:46:21 +09:00

- 用户新增“下一轮必须充分利用本机硬件算力”的明确要求；独立审查远端 `af55d5d...`、正式 LBM、GUI worker、A8R runner、每步人口复制与力身份、trace、产物和 provenance 链后，形成新的结果盲硬件路线裁决。
- 当前 PID `51498` 保持运行并自然完成，产物封存为 `A8R-V2P1-SERIAL-REFERENCE`；原尚未启动的旧串行独立复跑被执行前取代，不得与新后端结果混成一对。
- 下一次长时结果承载运行必须使用通过资格的 A8R-HW1 身份；新的 primary 和 repeat 从同一结果前实现提交、两个独立环境、step 0 和新鲜初态完整执行八轨迹。无候选通过时不得串行 fallback。
- 技术债裁决为候选执行与数据平面分阶段大范围重构、正式内核后续局部到中等集成，不做无目的全仓重写。P0 包括串行矩阵、全人口复制、全场二次审计、对象化 trace、无 case shard 和三层身份耦合。
- 新增 `35_A8R_硬件充分利用结果身份迁移与全仓模拟技术债裁决.md`，裁决提交 `27dbd7e5971317469cbbcdb7ded1da1b34e82df3`，Git blob SHA `f11f85c2df1857a1671ab0c8cc78274843629cda`；当前交接提交 `4e4f47e09443d8ef6d4e178807b1729f72913ed7`。
- 立即只授权新建 `90_候选工作区/current/H1_硬件利用与执行架构/**` 和可选短 CI；现有 A8R 与 `01_最终理论/**`、`02_模拟程序/**`、`AGENTS.md` 继续只读。当前未运行性能 probe、数值矩阵或科学分析，科学结论仍为 `NONE`。

## 2026-08-31 23:52:00 +09:00

- 补充核验本轮 GitHub Actions：`Markdown check` 运行 `33404674252` 完成并失败，失败仍仅来自 A8O/A8P 四个既有冻结标记；新裁决和两份交接没有新增命中。
- 当前交接以提交 `1308f8506084a98c2c65ba4b392de20e158a11b2` 明确记录验证边界：本轮未运行 Pandoc、正式程序测试、候选测试、TypeScript、构建、数值矩阵或性能 probe，不得把这些项目写成通过。
- 该验证补充没有改变硬件路线、结果身份、授权范围或科学结论。

## 2026-09-01 00:30:00 +09:00

- 以 `main@bdfc96b0434cf1aa8db25d479235576890c489e8` 为基线，按顶层 `AGENTS.md` 对三份正式理论、正式前向/结构/二维 CFD、A2、公开 A8、A8N/O/P/Q/R、H1、测试、CI、文档、证据、治理和实验准备进行了全项目结果盲审查；根 README 未作为依据。
- 裁定理论属于条件规范完成而非装置定量预测；正式前向程序是示例文献先验下的可执行子集；正式二维 CFD 仍为 `unvalidated-preview`；A2 只闭合功率符号，公开 A8 与 A8N/O/P 保留 NO-GO，A8Q 保留窄范围候选 PASS，A8R 科学结论仍为 `NONE`。
- 新增 `G0_全项目完成度与实验前暂停治理/01_全项目完成度审查与实验前可暂停主规划裁决.md`，提交 `cd0a6beb5e6878d9141b063348b8e6399dba6c7c`，文件 SHA-256 `5d2fd4ffbc57bbdd9e056462e085f5f673efe5daed269e024cf82f01ad9f50e7`。
- 第 35 号裁决保留为 A8R 局部历史，安全、串行参考、禁止混合身份和结果盲条款继续有效；其项目级主规划地位被新规划取代。H1 v1 Markdown 合同保持逐字节不改并作为从属硬件合同。
- 完整路线包含 G0--G5、WP-R0/G1/HW1/E1/F1/S1/R1/HW2/HW3/A8T/I1/DOC/Z1，定义了依赖图、关键路径、统一 DoD、性能/数值/物理/实验验证边界、技术债处置、风险、资源、回滚、逐路径条件授权和最终 pause manifest。
- 授权 Codex 下一完整批次 `BATCH-G1-RESULT-BEFORE-FOUNDATION-AND-EXPERIMENT-PREP` 连续完成总账/CI、H1 无结果基础、E1、F1、S1 和统一验证；禁止重型 probe、GPU/带宽压力、科学结果读取、正式路径修改、历史 A2/A8 修改和旧串行复跑。
- 本轮只新增主规划并更新 current/history；正式理论、正式程序、科学合同、候选实现和机器产物均未修改。主规划和交接已在本地通过 Pandoc 严格解析；未执行 npm/TypeScript/数值/性能/实验验证。

## 2026-09-01 12:40:38 +08:00

- G1 的 G0/H1/E1/F1/S1 结果前合同、JSON schema 和冻结说明已作为独立提交 `0c44ad25fecd82423e26fb7d6ff8dadd52d67eee` 推送；该提交未包含实现、测试结果或长时计算，冻结的 H1 v1 Markdown 合同字节未改变。
- 原 A8R 串行参考所在主机于 `2026-09-01 00:08:10 +08:00` 有序关机。关机前最后实际观察为同一 D54 case `77760/86400 (90%)`；新 boot 中 PID `51467/51497/51498` 均不存在，终端句柄不再保留最终退出码。
- 规范 gzip、sidecar 和 `.partial-*` 均不存在，旧工作树仍为干净的 `main@88c4e9e8ba57b02a06315679e9b30dd10999b30c`。未读取科学 payload、未运行 artifact asserter，科学结论保持 `NONE`。
- 新增 `03_R0_主运行因主机关机中断现场冻结报告.md` 和机器证据 `r0-host-shutdown-20260901.json`；机器证据 SHA-256 为 `889eafc3a340f60d5d5743b64df086ab6b603ed9173465a54b62ef42542fb85c`。
- 现场分类为 `INCONCLUSIVE-R0-HOST-SHUTDOWN-NO-CANONICAL-ARTIFACT`，命中 PR-1。裁决前禁止旧串行重启、checkpoint 恢复、硬件 probe 和旧工作树同步；G1 纯合同测试与合成工作可继续。
- 用户随后明确收窄 Markdown 格式检查：只检查 `01_最终理论/**/*.md` 与 `90_候选工作区/交接说明_current.md`；其他 Markdown 不进入格式门禁，原规划中的 A8O/A8P 历史 baseline 不再执行。
