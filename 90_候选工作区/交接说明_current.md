# 当前交接

## 当前状态

全项目一次成型主规划已冻结。当前状态为：

`PROJECT_MASTER_PLAN_FROZEN_G1_CONTRACTS_FROZEN_SERIAL_REFERENCE_INTERRUPTED_BY_HOST_SHUTDOWN_PR1_REQUIRED`

最新实时主机事实为：

- 原 A8R v2.1 串行参考运行来源：
  `88c4e9e8ba57b02a06315679e9b30dd10999b30c`；
- npm PID `51467`、shell PID `51497`、Node PID `51498` 均已不存在；
- 关机前最后实际观察的同一 D54 case 为 `77760/86400 (90%)`；
- 旧工作树干净；
- 规范 gzip、sidecar 和 `.partial-*` 尚未出现；
- 科学 payload 未读取，科学结论仍为 `NONE`。

主机在 `2026-09-01 00:08:10 +08:00` 有序关机，运行所在 boot ID 为
`efb29783e3c24b479fc9c7e07933aed2`；关机日志达到 `System Power Off`，最终窗口没有
发现 OOM 记录。终端会话未保留可查询的最终退出码，不能反推出精确信号。现场冻结为：

`INCONCLUSIVE-R0-HOST-SHUTDOWN-NO-CANONICAL-ARTIFACT`

报告和机器证据：

- `90_候选工作区/current/G0_全项目完成度与实验前暂停治理/03_R0_主运行因主机关机中断现场冻结报告.md`；
- `90_候选工作区/current/G0_全项目完成度与实验前暂停治理/evidence/r0-host-shutdown-20260901.json`；
- 机器证据 SHA-256：
  `889eafc3a340f60d5d5743b64df086ab6b603ed9173465a54b62ef42542fb85c`。

该异常触发 `PR-1`。在 Pro 裁决前，不重启旧串行运行、不从 checkpoint 恢复、不执行
硬件 probe，也不对旧工作树 pull/merge/checkout。G1 纯合同、测试和合成工作可继续。

## 全项目主规划

主规划文件：

`90_候选工作区/current/G0_全项目完成度与实验前暂停治理/01_全项目完成度审查与实验前可暂停主规划裁决.md`

- 主规划提交：`cd0a6beb5e6878d9141b063348b8e6399dba6c7c`；
- 主规划 SHA-256：
  `5d2fd4ffbc57bbdd9e056462e085f5f673efe5daed269e024cf82f01ad9f50e7`；
- 审查基线：`bdfc96b0434cf1aa8db25d479235576890c489e8`。

本规划取代第 35 号裁决作为整个项目的未来主路线，但保留第 35 号关于当前串行运行
安全、串行参考身份、禁止混合复跑身份、结果盲和正式路径锁定的 A8R 条款。H1 v1
Markdown 合同保持逐字节不改，作为从属 A8R-HW1 结果盲合同继续有效。

## 全仓当前结论上限

- 三份正式理论：条件规范层闭合，装置闭合函数和不确定度尚未标定；
- 正式前向程序：可运行的理论子集，默认是示例文献先验，不是装置定量预测；
- 正式二维 CFD：仍为 `unvalidated-preview`；
- A2：只闭合二维规定运动平均功率符号候选结论；
- 公开 A8、A8N、A8O、A8P：保留既有 NO-GO；
- A8Q：保留窄范围候选 PASS，不是网格收敛或物理验证；
- A8R：结果前链和 smoke 已闭合，科学全量结果仍无；
- H1：Markdown 合同已冻结，机器合同、测试、实现和硬件证据未开始；
- 实验准备：尚缺完整数据、校准、同步、辨识、holdout、不确定度和安全包；
- 项目当前不满足“实验前可暂停”。

## 当前关键路径

```text
当前串行参考自然完成
  -> 现场与产物封存
  -> 结果盲硬件 inventory/probe/候选选择
  -> Pro 硬件资格复核
  -> HW1-primary 和 HW1-repeat 两次新鲜全量运行
  -> Pro A8R 科学终局
  -> 正式软件诚实对齐与实验准备闭合
  -> 全仓 pause manifest
  -> Pro 实验前暂停终审
```

G0/G1 总账和 CI、H1 结果前架构、E1 实验准备、F1 前向数值资格和 S1 最小结构工具
可以在当前串行参考运行期间并行完成，但不得启动重型 D54、内存带宽或 GPU probe。

## 下一完整 Codex 工作批次

批次：

`BATCH-G1-RESULT-BEFORE-FOUNDATION-AND-EXPERIMENT-PREP`

结果前合同已在提交 `0c44ad25fecd82423e26fb7d6ff8dadd52d67eee` 独立冻结并推送；
该提交只包含 Markdown 合同、JSON schema 和机器合同，没有实现或运行结果。下一合法
动作是独立提交合同测试，随后才写无结果实现。

Codex 可以连续执行至统一验收，不需要每建一个文件再询问。批次包含：

1. 全仓机器可读状态总账、完成度索引和 supersession 清单；
2. 精确历史 Markdown baseline、绿色 Markdown CI 和轻量 simulation CI；
3. H1 机器合同、合同测试、backend/shard/planner/aggregator/probe/inventory 的无结果实现；
4. E1 实验元数据、测量、校准、run matrix、不确定度、辨识和合成数据合同；
5. F1 前向数值资格合同和轻量合成矩阵；
6. S1 结构工具的实验前最小合成资格；
7. 统一验证报告和交接。

统一验收状态为：

`PASS-G1-RESULT-BEFORE-FOUNDATION`

否则形成一个完整失败报告并停止，不把部分完成写成 PASS。

## 当前写权限

下一批次授权：

- `90_候选工作区/current/G0_全项目完成度与实验前暂停治理/**`；
- `90_候选工作区/current/H1_硬件利用与执行架构/**`，但不得修改已冻结的 H1 v1
  Markdown 合同；
- `90_候选工作区/current/E1_实验准备与辨识协议/**`；
- `90_候选工作区/current/F1_前向数值资格与闭合包接口/**`；
- `90_候选工作区/current/S1_结构分析实验前最小工具/**`；
- `tools/check_markdown_math.py`，仅限精确历史 baseline 和 changed-file 严格模式；
- 新建 `tools/markdown_math_historical_baseline.json`；
- `.github/workflows/markdown-check.yml`；
- 新建 `.github/workflows/simulation-check.yml`；
- 两份交接。

下一批次继续锁定：

- `01_最终理论/**`；
- `02_模拟程序/**`；
- 顶层 `AGENTS.md`；
- 所有既有 A2/A8 合同、报告、程序、测试、产物和 sidecar；
- 当前旧 A8R 工作区与运行；
- H1 v1 Markdown 合同字节。

后续正式前向/实验接口和高保真路径的逐文件条件授权已写入主规划第 13.3、13.4 节，
满足前置门后无需重新索要同一权限；超出清单仍需新裁决。

## 本批次禁止项

- 不运行重型硬件或 D54 probe；
- 不启动 GPU/内存带宽压力；
- 不读取当前 A8R 科学结果；
- 不运行旧串行复跑；
- 不修改正式理论或正式程序；
- 不修改历史 A2/A8 文件；
- 不创建或使用其他分支。

## Markdown 检查范围的最新用户覆盖

用户于 `2026-09-01` 明确收窄 Markdown 格式检查范围。后续只检查：

- `01_最终理论/**/*.md`；
- `90_候选工作区/交接说明_current.md`。

其他 Markdown，包括 history、候选合同、裁决、报告和验证记录，均不进入格式门禁。此前
规划的 A8O/A8P 四处历史 Markdown baseline 因此不再需要；G1 应将检查器与 workflow
直接限制到上述两个范围，不得继续扫描或修复其他 Markdown。

## 后续 Pro 复核点

除异常外，只保留：

1. `PR-2`：H2 硬件候选选择与 H3 解锁；
2. `PR-3`：HW1 两次全量和 A8R 科学终局；
3. `PR-4`：全项目实验前暂停终审。

当前串行参考已经因主机关机、进程消失且无规范产物触发 `PR-1`；裁决待取得。

## 长期终点

最终状态仍为：

`EXPERIMENT_PREPARATION_PAUSE_READY_NO_EXECUTABLE_NONEXPERIMENTAL_TASKS`

该状态要求所有必须工作包 PASS 或有效终止、所有条件任务有明确触发条件、CI 和
clean-clone 验证通过、实验准备包可直接执行、没有未分类 TODO/PENDING/未提交产物，
并由最终 Pro 审查接受。它不表示实验已经完成或理论已经得到实验验证。
