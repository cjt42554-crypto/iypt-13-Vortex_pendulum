# 当前交接

## 当前状态

PR-1 主机关机异常裁决已经闭合，用户指定的 Markdown 格式门范围也已实施并在 GitHub Actions 通过。当前状态为：

`PROJECT_PR1_CLOSED_R1I_H1V2_G1_FOUNDATION_AUTHORIZED_MARKDOWN_SCOPE_GREEN`

科学结论仍为：

`NONE`

## 中断运行的最终治理身份

原长时运行的预定身份是：

`A8R-V2P1-SERIAL-REFERENCE`

该身份从未达到已封存参考状态。活动治理身份改为：

`A8R-V2P1-INTERRUPTED-SERIAL-ATTEMPT-20260831`

终止分类为：

`INCONCLUSIVE-R0-HOST-SHUTDOWN-NO-CANONICAL-ARTIFACT`

已确认事实：

- 运行来源提交为 `88c4e9e8ba57b02a06315679e9b30dd10999b30c`；
- 主机于 `2026-09-01 00:08:10 +08:00` 有序关机；
- 关机前最后实际观察为同一 D54 case 的 `77760/86400 (90%)`；
- 重启后 npm PID `51467`、shell PID `51497`、Node PID `51498` 均不存在；
- 规范 gzip、sidecar 和 `.partial-*` 均不存在；
- 旧工作树仍干净并停在 `88c4e9e8...`；
- 最终 Node 信号和退出码未知，不得推测；
- 没有读取科学 payload。

该次运行没有可恢复或可计入未来运行的认证科学字节：

- `recoverableScientificBytes = 0`；
- `creditableCompletedHw1Cases = 0`；
- `partialProgressCredit = 0`。

R0 证据：

- 报告：
  `90_候选工作区/current/G0_全项目完成度与实验前暂停治理/03_R0_主运行因主机关机中断现场冻结报告.md`；
- 机器记录：
  `90_候选工作区/current/G0_全项目完成度与实验前暂停治理/evidence/r0-host-shutdown-20260901.json`；
- sidecar 记录的机器记录 SHA-256：
  `889eafc3a340f60d5d5743b64df086ab6b603ed9173465a54b62ef42542fb85c`；
- 事件提交：`b522f1a37814164dff18390ee23d5153d4499375`。

## PR-1 裁决

裁决文件：

`90_候选工作区/current/G0_全项目完成度与实验前暂停治理/04_PR1_串行参考关机中断与硬件路线接续裁决.md`

- 裁决身份：`IYPT13-PR1-R0-HOST-SHUTDOWN-ROUTE-DECISION-v1`；
- 裁决提交：`0f8085b1fda43e4f83d5152cfd99294bc3c0fc29`；
- 裁决文件 Git blob：`7f960f8a32849736532766c972f6ab4bdb0187d8`；
- 指定审查基线：`b522f1a37814164dff18390ee23d5153d4499375`；
- 裁决接续的并发父提交：`c7667f4bb68dfca09e67481529bad2a05d224a9d`。

裁决结果：

1. WP-R0 以治理级 `INCONCLUSIVE` 有效终止，不是科学 INCONCLUSIVE。
2. 原正常 WP-R1 产物封存分支不可达，由 WP-R1I 替代。
3. 不重启完整旧串行运行，不从 checkpoint 恢复，不给予 90% 进度任何部分信用。
4. 完整旧串行参考不再是 WP-HW2 的硬前置。
5. H1 v1 Markdown 合同及未受影响的 G1 合同保持不可变。
6. H1 v1 机器合同中的 `requiredStateBeforeH2 = SEALED` 已不可达，活动路线必须新增 H1 v2，而不是修改 v1。
7. 下一两个结果承载长时运行必须是 `HW1-primary` 和 `HW1-repeat`。
8. 两次 HW1 都必须从第一个 case、step 0、新鲜初态完整执行八轨迹。
9. 禁止把中断串行尝试与任何 HW1 产物拼成主运行或复跑对。

## 工作包修正

### WP-R0

- 状态：`INCONCLUSIVE`；
- 终止码：`INCONCLUSIVE-R0-HOST-SHUTDOWN-NO-CANONICAL-ARTIFACT`；
- 下一门：`WP-R1I`。

### 正常 WP-R1

正常封存分支状态为：

`SUPERSEDED-R1-NORMAL-ARTIFACT-SEAL-BY-R1I-AFTER-R0-INTERRUPTION`

不得记录 `PASS-R1-SERIAL-REFERENCE-SEALED`。

### WP-R1I

新工作包：

`WP-R1I：中断串行尝试证据封存与旧工作区退役`

必须输出 R1I manifest 和 sidecar，重新从实体文件计算 R0 JSON 的 SHA-256，核验旧工作树、原 PID 不存在、当前 boot 和规范产物不存在，并固定：

- `attainedReferenceStatus=false`；
- `partialProgressCredit=0`；
- `legacyFullSerialRerunAuthorized=false`；
- `checkpointResumeAuthorized=false`；
- `scientificPayloadInspected=false`；
- `scientificConclusion=NONE`。

通过码：

`PASS-R1I-INTERRUPTED-SERIAL-ATTEMPT-EVIDENCE-SEALED`

旧工作区在 R1I 完成前不得 pull、checkout、reset、rebase、安装依赖或清理。完成后只作为只读历史现场归档，不得复用于 H1、H2 或 H3。

### WP-HW2

只有同时满足以下条件才解锁：

1. WP-R1I 通过；
2. G1 统一基础通过；
3. H1 v2 合同、测试和无结果实现通过；
4. 没有活动结果承载运行；
5. 硬件 inventory 完成；
6. 内存、swap、OOM、热和无关进程安全门满足；
7. 工作树干净且 `HEAD == origin/main`；
8. 候选和 probe 代码已在首次性能观察前提交并推送。

H2 可使用绑定 `88c4e9e8...` 的有界、非科学串行 oracle，作为同窗口性能基线和精确哈希等价参考。该 oracle 不得运行完整八轨迹矩阵，不得生成 A8R 规范产物，不得输出或保存科学值。

### WP-HW3

PR-2 接受候选后，才允许执行 `HW1-primary` 和 `HW1-repeat`。两个环境、依赖、shard、checkpoint、缓存、临时文件和 inode 必须独立。

H2-X 路线要求两个 HW1 scientific payload 和 sidecar 逐字节一致，并由有界 oracle 证明冻结科学源的执行等价；不要求与不存在的旧完整 gzip 比较。

## G1 和 H1 的当前时间顺序

六组结果前合同已在提交
`0c44ad25fecd82423e26fb7d6ff8dadd52d67eee`
独立冻结。该提交没有实现、测试结果或长时计算。

随后形成的 G0、H1、E1、F1、S1 合同测试、合成矩阵和局部 `package.json` 截至提交：

`c7667f4bb68dfca09e67481529bad2a05d224a9d`

这些文件没有运行重型求解器、性能 probe 或读取科学 payload，可以保留。H1 v1 测试只证明 v1 历史映射，不能单独解锁 H2。

继续有效的五组机器合同：

- `G0-PROJECT-STATE-CONTRACT-v1`；
- `G0-SUPERSESSION-CONTRACT-v1`；
- `VP-E1-EXPERIMENT-PREPARATION-CONTRACT-v1`；
- `VP-F1-SYNTHETIC-NUMERICAL-QUALIFICATION-CONTRACT-v1`；
- `VP-S1-SYNTHETIC-STRUCTURAL-QUALIFICATION-CONTRACT-v1`。

H1 v1 机器合同保持不可变，并记录为：

`SUPERSEDED-BEFORE-AFFECTED-IMPLEMENTATION-OR-PERFORMANCE-BY-PR1-HOST-SHUTDOWN`

活动路线必须新增 `VP-A8R-HW1-MACHINE-CONTRACT-v2`、v2 schema、v2 冻结说明和 v2 测试。v2 不得放宽 v1 的结果盲、性能、安全、shard、provenance 或双全量运行门。

## Markdown 格式门

通用 Markdown 格式门现在只检查：

- `01_最终理论/**/*.md`；
- `90_候选工作区/交接说明_current.md`。

其他 Markdown，包括 history、候选合同、裁决、报告和验证记录，不进入通用格式门禁。其他文件仍可被来源哈希、合同身份或专用语义测试约束。

已完成：

- 检查器范围提交：`31672d194528ab954510c061d277bc1374bbd835`；
- workflow 明示范围提交：`c81f7bd9780a6c49a3cefb838efd0bc5a54e3ec2`；
- GitHub Actions 运行：`33471940558`；
- 结论：`success`。

不得创建历史 Markdown baseline，也不得为格式绿灯修改 A8O、A8P、history 或其他排除文件。

## 下一完整 Codex 批次

批次：

`BATCH-G1-PR1-REBASE-R1I-H1V2-AND-FOUNDATION`

Codex 可连续执行至统一验收。固定顺序为：

1. 单独提交 H1 v2 机器合同、v2 schema、v2 冻结说明和 PR-1 映射；
2. 单独提交 H1 v2 测试及 v1 误用负测试；
3. 完成 R1I 实体哈希复算、旧工作树只读核验、manifest 和 sidecar；
4. 更新 G0 ledger 与 supersession 记录；
5. 继续 G0/H1/E1/F1/S1 无结果实现和合成测试；
6. 保持已经收窄的 Markdown workflow 为绿；
7. 建立轻量 simulation CI；
8. 在 clean clone 执行统一轻量验证；
9. 写 G1/R1I 验证报告并更新交接。

统一验收必须同时得到：

- `PASS-R1I-INTERRUPTED-SERIAL-ATTEMPT-EVIDENCE-SEALED`；
- `PASS-G1-RESULT-BEFORE-FOUNDATION`；
- `PASS-HW1-V2-RESULT-BEFORE-FOUNDATION`；
- Markdown workflow 保持为绿；
- 轻量 simulation CI 为绿；
- 无重型 probe、无科学 payload、无正式路径修改。

任一项失败时保存完整失败证据并停止，不以部分通过解锁 H2。

## 当前有限权限

允许：

- `90_候选工作区/current/G0_全项目完成度与实验前暂停治理/**`；
- `90_候选工作区/current/H1_硬件利用与执行架构/**`，仅新增 v2 和后续无结果实现；
- `90_候选工作区/current/E1_实验准备与辨识协议/**`；
- `90_候选工作区/current/F1_前向数值资格与闭合包接口/**`；
- `90_候选工作区/current/S1_结构分析实验前最小工具/**`；
- `tools/check_markdown_math.py`，仅维护上述固定范围；
- `.github/workflows/markdown-check.yml`，仅维护上述固定范围；
- 新建 `.github/workflows/simulation-check.yml`；
- 两份交接。

必须保持逐字节不变：

- H1 v1 Markdown 合同、v1 机器合同、v1 schema 和 v1 冻结说明；
- R0 报告、JSON 和 sidecar；
- 所有既有 A2/A8 合同、实现、报告、测试、产物和 sidecar；
- `01_最终理论/**`；
- `02_模拟程序/**`；
- 顶层 `AGENTS.md`；
- R1I 归档前的旧工作树现场。

当前不授权：

- H2 性能或硬件 probe；
- D54、GPU 或内存带宽负载；
- 完整旧串行重跑或 checkpoint 恢复；
- H3 结果承载运行；
- 正式程序或理论修改；
- 科学 payload 读取；
- 创建或使用其他分支。

## 后续 Pro 复核点

PR-1 已闭合。除新的异常外，后续只保留：

1. `PR-2`：H2 候选选择、H2-N 或受保护路径需求、H3 解锁；
2. `PR-3`：两个 HW1 全量产物和 A8R 科学终局；
3. `PR-4`：全项目实验前暂停终审。

## 当前结论上限

本轮只裁定异常治理、工作包依赖、H1 合同版本、后续运行身份和 Markdown 格式门范围。没有形成 A8R 数值 PASS、INCONCLUSIVE 或科学 NO-GO，没有形成公共物理验证，也没有解锁正式高保真接入、规定横移、weak-FSI、三维、自由表面或装置实验预测。

长期终点不变：

`EXPERIMENT_PREPARATION_PAUSE_READY_NO_EXECUTABLE_NONEXPERIMENTAL_TASKS`
