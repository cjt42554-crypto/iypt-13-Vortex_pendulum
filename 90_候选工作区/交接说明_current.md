# 当前交接

## 当前状态

G1 结果前基础、R1I、H1 v2 无结果架构以及 E1/F1/S1 合成资格已经闭合。HW2
静态 inventory 和固定矩阵结果盲 probe 已完成，当前停在 PR-2。状态为：

`HW2_CANDIDATE_ONLY_PASS_PR2_INDEPENDENT_REVIEW_REQUIRED`

已经成立的有限结论为：

- `PASS-R1I-INTERRUPTED-SERIAL-ATTEMPT-EVIDENCE-SEALED`；
- `PASS-G1-RESULT-BEFORE-FOUNDATION`；
- `PASS-HW1-V2-RESULT-BEFORE-FOUNDATION`；
- `PASS-E1-EXPERIMENT-PREPARATION-CANDIDATE-ONLY`；
- `PASS-F1-SYNTHETIC-NUMERICAL-QUALIFICATION-ONLY`；
- `PASS-S1-EXPERIMENT-PREPARATION-STRUCTURAL-TOOLS`；
- `PASS-A8R-HW1-HARDWARE-UTILIZATION-CANDIDATE-ONLY`。

科学结论仍为：

`NONE`

仓库尚未达到“实验前可暂停”，长期任务继续。

## HW2 证据与边界

候选资格与 PR-2 输入报告：

`90_候选工作区/current/H1_硬件利用与执行架构/04_HW2_结果盲硬件候选资格与PR2输入报告.md`

机器证据：

`90_候选工作区/current/H1_硬件利用与执行架构/evidence/hw2-qualification-20260901-attempt-02.json`

机器证据 SHA-256：

`bfcdcabb91ac7f12d10afb7efaa46460ddcc8d59f15b95049ff340a85be835e6`

证据内部哈希：

`a52cee68089a814a2eedc61bf8018008b8b71957a6b35763beccaf7eefa40baa`

性能观察前已提交并推送的源提交：

`998e200960a902f30258e3a5f069aae33d3c6c71`

关键事实：

- 十个固定候选全部实际执行并保留，三个 `PROBE_PASS`，七个 `PROBE_NO_GO`；
- 冻结评估器在已通过候选中选出 `hw2-native-openmp-domain-v1-w02`，加速比
  1.995669，吞吐 1355.535 MLUPS；
- 所有候选的正确性摘要和三次重复摘要均相等；swap 增长、OOM 事件增长均为零；
- 16 核 OpenMP 原始吞吐为 9805.743 MLUPS，GPU 合成原始吞吐为 104580.953 MLUPS，
  但都因 15–60 秒计时窗等冻结门而不是 `PROBE_PASS`；
- 冻结选择器只在已通过候选中计算“最优吞吐”。该语义是否实现原合同对“全部安全候选
  最优吞吐 95%”和充分利用硬件的本意，必须由 PR-2 独立判断；
- 本轮没有读取科学 payload，没有执行结果承载运行，没有写入规范 A8R 产物。

首次尝试在任何校准或性能观察前因 Git Unicode 路径预检缺陷 fail-closed，失败证据已保留。
修正在提交 `998e200...` 推送且 CI 成功后，从首个 probe 开始新的 attempt 02。

成功证据的 sidecar 和内部 evidence hash 已实际重算通过。运行结束后 cgroup unit
为 `inactive/dead`、退出码为 0，无残留 probe 进程或临时 native 构建目录。

## 当前总账

机器主来源：

`90_候选工作区/current/G0_全项目完成度与实验前暂停治理/project-state-ledger.json`

状态要点：

- WP-R0：`INCONCLUSIVE`，仅为主机关机治理事实；
- WP-R1：`INCONCLUSIVE` 且已被 R1I 取代，正常串行产物封存分支不可达；
- WP-R1I、WP-G1、WP-HW1、WP-E1、WP-F1、WP-S1：`PASS`；
- WP-HW2：`IN_PROGRESS`，候选专用 PASS 已有证据，但 H2-X/H2-N 与 PR-2 未闭合；
- WP-HW3、WP-A8T、WP-I1 和 WP-Z1：仍等待前置；
- WP-PHY：仍为条件推迟；
- WP-DOC：持续进行中。

## 下一批次

下一批次为：

`BATCH-PR2-WHOLE-PROJECT-INDEPENDENT-REVIEW-AND-NEXT-STAGE-PLAN`

顺序如下：

1. 将已提交并推送的 HW2 证据、报告和当前总账交给 Pro；
2. 请 Pro 先审查整个项目，不限定技术债范围，再对下一阶段给出完整规划；
3. 请 Pro 独立判断冻结选择器、计时窗、GPU 采样、H2-X/H2-N、受保护路径和 H3
   解锁；
4. 在 Pro 完整回复并形成 PR-2 裁决前，不修改结果后门值，不重试部分候选，不开始 H3。

PR-2 应请 Pro 独立详细审查：

- 当前候选选择是否有效，是否应继续 H2-X、冻结 H2-N 或重建资格协议；
- 是否需要受保护路径修改及其逐文件授权；
- 整个项目的技术债、重复实现和治理成本，是否需要局部或大范围重构；
- 硬件利用和执行架构是否真正充分利用本机算力；
- 具有依赖关系、验收门、停止点和结论上限的完整下一阶段规划。

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

G1、H1 v2、E1、F1 和 S1 的 PASS 只证明结果前候选实现与合成资格。HW2 的 PASS
只是固定合成工作负载下的硬件候选资格，不证明 H2-X、H2-N、A8R 数值结果、公共流动
物理、装置参数、装置分岔、实验趋势或实验状态。

长期终点仍为：

`EXPERIMENT_PREPARATION_PAUSE_READY_NO_EXECUTABLE_NONEXPERIMENTAL_TASKS`
