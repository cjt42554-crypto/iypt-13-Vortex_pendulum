# 当前交接

## 当前状态

G1 结果前基础、R1I、H1 v2 无结果架构以及 E1/F1/S1 合成资格已经闭合。当前状态为：

`G1_RESULT_BEFORE_FOUNDATION_PASS_HW2_READY_FOR_STATIC_INVENTORY`

已经成立的有限结论为：

- `PASS-R1I-INTERRUPTED-SERIAL-ATTEMPT-EVIDENCE-SEALED`；
- `PASS-G1-RESULT-BEFORE-FOUNDATION`；
- `PASS-HW1-V2-RESULT-BEFORE-FOUNDATION`；
- `PASS-E1-EXPERIMENT-PREPARATION-CANDIDATE-ONLY`；
- `PASS-F1-SYNTHETIC-NUMERICAL-QUALIFICATION-ONLY`；
- `PASS-S1-EXPERIMENT-PREPARATION-STRUCTURAL-TOOLS`。

科学结论仍为：

`NONE`

仓库尚未达到“实验前可暂停”，长期任务继续。

## G1 证据

统一验证报告：

`90_候选工作区/current/G0_全项目完成度与实验前暂停治理/06_G1_结果前基础统一验证报告.md`

机器证据：

`90_候选工作区/current/G0_全项目完成度与实验前暂停治理/evidence/g1-result-before-foundation-20260901.json`

机器证据 SHA-256：

`7195a5255e6508876b68fe081b83b351b99254779db1b50111b8a2b736c4b276`

实现与验证基线：

`7202e2f8195dd30c97460698547338632dc3c5b0`

干净克隆在该基线上执行并通过：

- G0：13/13；
- H1 v2：22/22；
- E1：10/10；
- F1：12/12；
- S1：13/13。

共 70 项测试，失败 0。五个有界结果前入口全部通过，验收前后工作树均干净。

GitHub Actions：

- Simulation foundation checks：运行 `33475574515`，五个 job 全部 `success`；
- Markdown check：运行 `33475574501`，结论 `success`。

两次 simulation 红灯 `33475419734` 和 `33475552913` 保留为失败历史。根因是旧版 workflow
在干净 runner 调用了绑定本机旧路径的 R1I 现场复核。当前 workflow 改用仍会复算封存
manifest、来源实体、sidecar 与 Git blob 的可移植模式；本机完整现场模式另行再次通过。

## 当前总账

机器主来源：

`90_候选工作区/current/G0_全项目完成度与实验前暂停治理/project-state-ledger.json`

状态要点：

- WP-R0：`INCONCLUSIVE`，仅为主机关机治理事实；
- WP-R1：`SUPERSEDED`，正常串行产物封存分支不可达；
- WP-R1I、WP-G1、WP-HW1、WP-E1、WP-F1、WP-S1：`PASS`；
- WP-HW2：`NOT_STARTED`，前置工作包已经通过；
- WP-HW3、WP-A8T、WP-I1 和 WP-Z1：仍等待前置；
- WP-PHY：仍为条件推迟；
- WP-DOC：持续进行中。

## 下一批次

下一批次为：

`BATCH-HW2-STATIC-INVENTORY-BOUNDED-RESULT-BLIND-PROBE-AND-PR2`

顺序如下：

1. 重新读取顶层 `AGENTS.md`，fetch，并确认 `main`、工作树干净且
   `HEAD == origin/main`；
2. 确认没有活动结果承载运行，不访问旧历史工作区，不读取科学 payload；
3. 只采集静态 CPU、GPU、内存、swap、cgroup、温度能力和无关进程 inventory；
4. 若实际 host adapter、oracle 或 probe runner 尚未完整实现，先以结果盲方式实现、测试、
   commit 并 push，性能观察必须发生在代码提交之后；
5. 按 H1 v2 的六类候选和安全门执行有界非科学资格；禁止完整八轨迹、规范 A8R 产物和
   科学值输出；
6. 保存所有候选，包括失败、不可用和因 GPU 占用而推迟的候选；不得只保留最快者；
7. 只有完整候选覆盖、重复性、加速、CPU/GPU 利用率、内存、swap、OOM、热、cgroup 和
   soak 门全部按冻结合同判定后，才能形成 H2 候选选择；
8. 候选选择后停止在 PR-2，不运行 `HW1-primary` 或 `HW1-repeat`。

PR-2 应请 Pro 独立详细审查：

- H2 候选选择与是否存在 H2-N；
- 是否需要受保护路径修改及其逐文件授权；
- 整个项目的技术债是否过重，是否需要局部或大范围重构；
- 硬件利用和执行架构是否真正充分利用本机算力；
- H3 的精确解锁条件和结论边界。

给 Pro 的请求以目标、证据、提交和独立判断问题为主，不预设实现路线或预期结论。

## 当前允许范围

继续允许：

- `90_候选工作区/current/G0_全项目完成度与实验前暂停治理/**`；
- `90_候选工作区/current/H1_硬件利用与执行架构/**`；
- `90_候选工作区/current/E1_实验准备与辨识协议/**`；
- `90_候选工作区/current/F1_前向数值资格与闭合包接口/**`；
- `90_候选工作区/current/S1_结构分析实验前最小工具/**`；
- `.github/workflows/simulation-check.yml`；
- 两份交接。

必须保持不变：

- `01_最终理论/**`；
- `02_模拟程序/**`；
- 顶层 `AGENTS.md`；
- H1 v1 Markdown、机器合同、schema 和冻结说明；
- R0、R1I 与 PR-1 既有证据；
- 所有既有 A2/A8 文件和科学产物。

当前不授权：

- D54、完整八轨迹或任何结果承载运行；
- `HW1-primary`、`HW1-repeat` 或 H3；
- 旧串行重跑、checkpoint 恢复或 90% 进度抵扣；
- 科学 payload 读取；
- 正式理论或正式模拟程序修改；
- 未经 PR-2 的受保护路径修改；
- 创建或使用其他分支。

## Markdown 格式门

通用 Markdown 格式检查只覆盖：

- `01_最终理论/**/*.md`；
- `90_候选工作区/交接说明_current.md`。

其他 Markdown 不检查格式，不建立历史 baseline，也不为格式绿灯修改历史文件。

## 结论上限

G1、H1 v2、E1、F1 和 S1 的 PASS 只证明结果前候选实现与合成资格。它们不证明硬件
性能候选、A8R 数值结果、公共流动物理、装置参数、装置分岔、实验趋势或实验状态。

长期终点仍为：

`EXPERIMENT_PREPARATION_PAUSE_READY_NO_EXECUTABLE_NONEXPERIMENTAL_TASKS`
