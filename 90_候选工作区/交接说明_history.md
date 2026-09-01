# 交接历史

## 历史归档边界

截至本条之前的完整交接历史未删除，固定于：

- 提交：`53c33f30c72613fafb49066aaab0b4552c46de73`；
- 文件路径：`90_候选工作区/交接说明_history.md`；
- Git blob SHA：`8b7d5f0a705ec401223ec90fb2f27b820c444a31`；
- 文件字节数：`10747`。

该历史文件内部还保存了更早历史的归档身份和恢复命令，因此以上提交与其内部归档共同构成截至 PR-1 前的完整链。需要追溯时使用：

```bash
git show 53c33f30c72613fafb49066aaab0b4552c46de73:"90_候选工作区/交接说明_history.md"
```

本文件自下条起继续记录新的交接历史。

## 2026-09-01 13:55:55 +09:00

- 独立复核 `main@b522f1a37814164dff18390ee23d5153d4499375`、current、R0 报告、R0 JSON/sidecar、全项目主规划、H1 v1 合同及旧 A8R 运行器；接受主机有序关机、原 PID 消失、无规范产物和科学结论 `NONE` 为足够 PR-1 事实基础。
- 裁定预定的 `A8R-V2P1-SERIAL-REFERENCE` 从未达到封存状态；活动身份改为 `A8R-V2P1-INTERRUPTED-SERIAL-ATTEMPT-20260831`，可恢复科学字节、可计入 HW1 case 和 90% 部分信用均为 0。
- WP-R0 以 `INCONCLUSIVE-R0-HOST-SHUTDOWN-NO-CANONICAL-ARTIFACT` 有效终止；正常 WP-R1 被新 WP-R1I 事件证据封存工作包取代。当前不重启完整旧串行运行、不从 checkpoint 恢复，也不把中断现场与未来 HW1 产物混合。
- 完整旧串行参考不再是 WP-HW2 硬前置。WP-HW2 需等待 R1I、G1 和 H1 v2 通过；允许绑定 `88c4e9e8...` 的有界非科学串行 oracle 做同窗口性能和精确哈希资格，但禁止完整八轨迹旧串行结果运行与科学值输出。
- H1 v1 Markdown 合同、v1 机器合同、schema、冻结说明和 v1 测试保持不可变历史；因 v1 的 `requiredStateBeforeH2=SEALED` 已不可达，活动路线必须在实现前新增 `VP-A8R-HW1-MACHINE-CONTRACT-v2` 及测试，且不得放宽原性能、安全、结果盲、shard 或双全量运行门。
- `0c44ad25...` 中 G0、E1、F1、S1 五组合同继续有效。审查期间远端新增的 G0/H1/E1/F1/S1 合同测试和合成矩阵截至 `c7667f4...`，没有重型 probe、科学 payload 或正式路径修改，予以保留；H1 v1 测试只作历史映射，不能单独解锁 H2。
- 下一两个结果承载长时运行必须是同一结果前实现下两个独立环境的 `HW1-primary` 与 `HW1-repeat`，均从第一个 case、step 0、新鲜初态完整执行八轨迹；PR-3 比较这两个产物，不要求与不存在的旧完整 gzip 比较。
- 用户最新 Markdown 格式门覆盖优先：只检查 `01_最终理论/**/*.md` 和 `90_候选工作区/交接说明_current.md`。其他 Markdown 不进入通用格式门；不创建历史 baseline，不为格式绿灯修改 A8O/A8P/history 等历史文件。
- 新增裁决 `G0_全项目完成度与实验前暂停治理/04_PR1_串行参考关机中断与硬件路线接续裁决.md`，裁决提交 `0f8085b1fda43e4f83d5152cfd99294bc3c0fc29`，Git blob `7f960f8a32849736532766c972f6ab4bdb0187d8`；current 首次收口提交为 `53c33f30c72613fafb49066aaab0b4552c46de73`。
- 下一完整批次为 `BATCH-G1-PR1-REBASE-R1I-H1V2-AND-FOUNDATION`，统一目标是 R1I、G1、H1 v2、限定范围 Markdown CI 和轻量 simulation CI 同时通过；在此之前不授权 H2/D54/GPU/带宽 probe、旧串行重跑、H3、正式理论/程序修改或科学 payload 读取。

## 2026-09-01 14:00:25 +09:00

- 核验原 Markdown workflow 仍因全仓枚举而只命中被用户排除的 A8O/A8P 四处历史标记；没有修改这些历史文件。
- 提交 `31672d194528ab954510c061d277bc1374bbd835` 将 `tools/check_markdown_math.py` 的唯一默认范围收窄为 `01_最终理论/**/*.md` 与 `90_候选工作区/交接说明_current.md`。
- 提交 `c81f7bd9780a6c49a3cefb838efd0bc5a54e3ec2` 将 workflow 步骤名称改为明示检查最终理论与 current 交接；GitHub Actions 运行 `33471940558` 结论为 `success`。
- 其他 Markdown 不再进入通用格式门；不创建历史 baseline，也不为格式检查修改 A8O、A8P、history、候选合同或报告。其他文档仍可受来源哈希、合同身份和专用语义测试约束。
- current 最终收口提交为 `df9411d1b7d4a8eafe911d17c1941a78883ae546`。正式理论正文、正式模拟程序、R0 证据、H1 v1 文件和全部科学合同/产物均未修改。

## 2026-09-01 14:06:02 +08:00

- 提交并推送 H1 v2 无结果执行架构 `714c2e2c4b3b3e1217971f83e7e0449e1d44153d`、E1 合成资格 `57e924b073ee6e2a03e7a9708167dcf4ec283612`、F1 合成数值资格 `c0dcadfbd670a05e921d546eb47b81101a88bfb7` 和 S1 合成结构资格 `e6e5ff769a03e1f167e6c585c4301f7b61da9e77`。
- H1/E1/F1/S1 分别通过 22、10、12、13 项测试；G0 13 项测试、ledger 和 R1I 封存验证通过。干净克隆 `main@7202e2f8195dd30c97460698547338632dc3c5b0` 合计通过 70 项测试和五个有界入口，验收前后工作树干净。
- 新增轻量 `.github/workflows/simulation-check.yml`。本地 OAuth 凭据因缺少 `workflow` scope 被 GitHub 明确拒绝后，使用仓库 GitHub 写接口提交工作流；没有报告虚假的 push 成功。
- 首次 GitHub 运行 `33475419734` 与随后旧 workflow 运行 `33475552913` 因调用绑定本机旧路径的 R1I 现场复核失败，失败记录保留。新增 `SEALED-EVIDENCE-ONLY` 模式后，运行 `33475574515` 的五个 job 全部成功；该模式复算封存 manifest、四个来源实体、sidecar 与 Git blob，但明确不冒充本机现场重访。本机完整现场模式另行再次通过。
- 限定范围 Markdown 运行 `33475574501` 成功；通用格式门仍只覆盖 `01_最终理论/**/*.md` 与 `90_候选工作区/交接说明_current.md`，没有检查其他 Markdown。
- 新增 G1 机器证据 `g1-result-before-foundation-20260901.json`，SHA-256 为 `7195a5255e6508876b68fe081b83b351b99254779db1b50111b8a2b736c4b276`，并新增统一验证报告。总账将 WP-G1、WP-HW1、WP-E1、WP-F1 和 WP-S1 更新为有限 PASS，WP-HW2 更新为 `NOT_STARTED`。
- 当前最高结论仍不是科学结论：科学 payload 未读、重型 probe 未运行、正式理论与程序未改，科学结论为 `NONE`。下一批次从 WP-HW2 静态 inventory 和有界结果盲 probe 开始，候选选择后停止在 PR-2，并要求 Pro 同时独立审查全项目技术债与重构必要性。

## 2026-09-01 15:05:14 +08:00

- 确认无活动 A8R/D54/结果承载运行后，完成本机静态 inventory：Ryzen 9 9955HX 16 核/32 线程、AVX2/AVX-512、RTX 5060 Laptop 8 GB、CUDA Driver JIT、约 15.9 GB 主存和有限 8 GiB user cgroup 均可用；无外来 GPU 计算进程。
- 在任何性能观察前新增并提交、推送 HW2 固定协议、合成 oracle、Linux host adapter、六类十个候选、native OpenMP/SIMD/CUDA Driver JIT/hybrid 路径、遥测、runner 和测试；主要实现提交为 `6a5c1c974072705e0242800653154147f6167446`、`f6e192c175e7d8d84be697645c32268952f94677` 和 `998e200960a902f30258e3a5f069aae33d3c6c71`。
- 首次形式尝试在任何校准或性能观察前 fail-closed，原因是 `git ls-files` 的 Unicode C 转义路径与未转义路径误比较。失败证据 `hw2-qualification-20260901.json` 保留，文件 SHA-256 为 `dcc17a5c438b1ddb271d1aef3f027014280d601004120fa9babf39d5a378046d`。修正使用 NUL 分隔与 `core.quotepath=false`，并增加 Unicode 回归测试。
- attempt 02 在 `main@998e200...`、干净且与 `origin/main` 相等的身份下从第一个 probe 开始。十个候选全部实际执行三次，正确性和重复摘要全部相等，swap 增长为零，`memory.events` 的 max/OOM/OOM-kill 增量为零，无 fallback 或无关进程操作。
- 机器证据结论为 `PASS-A8R-HW1-HARDWARE-UTILIZATION-CANDIDATE-ONLY`，选中 `hw2-native-openmp-domain-v1-w02`；成功证据文件 SHA-256 为 `bfcdcabb91ac7f12d10afb7efaa46460ddcc8d59f15b95049ff340a85be835e6`，内部 evidence hash 为 `a52cee68089a814a2eedc61bf8018008b8b71957a6b35763beccaf7eefa40baa`，sidecar 与内部哈希均重算通过。
- 冻结选择也暴露了 PR-2 必须裁决的边界：16 核 OpenMP 和 GPU 的合成原始吞吐显著高于被选 2 线程候选，却因高加速导致计时窗小于 15 秒及 GPU 采样门被排除；冻结选择器只在 `PROBE_PASS` 子集内计算 95% 最优吞吐。本地未在结果后修改门、调参或局部重试。
- 新增 `04_HW2_结果盲硬件候选资格与PR2输入报告.md`，总账将 WP-HW2 保持为 `IN_PROGRESS`，因为尚无 H2-X、H2-N 或 PR-2 接受。下一动作是请 Pro 先审查整个项目，独立裁决候选有效性、全仓技术债/重构、受保护路径授权、H2-X/H2-N 与 H3 条件，然后给出完整下阶段规划。
- 用户最新 Markdown 覆盖继续生效：通用格式检查只覆盖 `01_最终理论/**/*.md` 与精确的 `90_候选工作区/交接说明_current.md`；本次新报告和 history 不进入通用 Markdown 格式检查。
- 本轮未读取科学 payload，未运行 D54、完整八轨迹、`HW1-primary`、`HW1-repeat` 或 H3，未修改正式理论、正式模拟程序、顶层 `AGENTS.md` 或既有 A2/A8 文件；科学结论仍为 `NONE`。
