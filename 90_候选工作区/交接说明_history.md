# 交接历史

## 历史归档边界

截至本条之前的完整交接历史未删除，固定于：

- 提交：`1205067b04b213a6e04a766b422bfafec70c1e4c`；
- 文件路径：`90_候选工作区/交接说明_history.md`；
- Git blob SHA：`f2f611421b5428f89aed10b9f18076470a77cdcc`。

该文件内部还保存更早历史的归档身份和恢复命令，因此上述提交与其内部归档共同构成截至 PR-2A 前的完整历史链。需要追溯时使用：

```bash
git show 1205067b04b213a6e04a766b422bfafec70c1e4c:"90_候选工作区/交接说明_history.md"
```

本文件自下条起继续记录新的交接历史。

## 2026-09-01 19:18:12 +09:00

- 以 `main@fa73bda16c42a17a3c63f429c8b8c7e2709c7e66` 为指定基线，按顶层 `AGENTS.md` 先读取 current、PR-2 裁决和链接的 HW2 报告/机器证据，再审查 H1/H2/H3/_shared、冻结 A8R 单 case/聚合源、正式 LBM、GUI/worker、E1/F1/S1、CI、总账和全项目终点路线；根 README 正文未读取。
- 接受 `fa73bda...` 为结果前候选实现基础，最高结论为 `PASS-PR2A-FA73BDA-RESULT-BEFORE-IMPLEMENTATION-BASELINE-ONLY`；正式 HW2R 就绪状态裁定为 `INCONCLUSIVE-PR2A-FA73BDA-FORMAL-HW2R-READINESS`，科学结论仍为 `NONE`。
- 发现七类仍需观测前闭合的 P0：R1/R2 基线与权重、候选 executor 重复、GPU 多尺寸持久生命周期、数值身份时间顺序、deferred/unresolved 选择、资源准入与失败证据、H2-X 实际完成顺序与 worker 覆盖。当前不得启动正式 HW2R、H2-X/H2-N 正式矩阵、H3 或双全量运行。
- 新增 `VP-HW2R-PRE-OBSERVATION-READINESS-v1` 机器门，当前 SHA-256 为 `73dc85806aafcc748d016e85ec90b65738ec66fc707741cf5505231566416699`，`formalObservationAuthorized=false`。closed blocker 必须绑定提交、路径和验证证据，复制 path 数组不能绕过入口门。
- 直接修复跨 workload 比较、高收益 numerical-identity/deferred 阻断、H2-X shard/aggregator schedule 元数据、H2-N full evidence envelope、cgroup peak/headroom 和轻量 CI；`simulation-check.yml` 已扩展到 G0/H1/H2/H3/_shared/E1/F1/S1。
- 中间提交 `c700560ef9de04156d2b27a2bd996c7c2685c224` 的预检字符串拼接语法错误由 `5366063fe7754ae1df42acf666ef95344a3d6cf7` 立即修正，未用于任何正式观测或科学运行。
- 新增完整裁决 `G0_全项目完成度与实验前暂停治理/08_PR2A_fa73bda观测前实现复核与全项目终点规划裁决.md`，提交 `c98af01843bf1b39f01ec24397b02ecf1c4a113a`，文件 SHA-256 为 `acff1a5ccb41b909ad7c6c34e2c21600b774bbaf4ca3df1b6ec2d31e32cabaaf`。
- 下一完整批次为 `BATCH-PR2A-CLOSE-PREOBSERVATION-GATE-THEN-HW2R-H2X-H2N-H3P`。七项及其证据、clean main、CI 和主机安全门全部通过后，Codex 可依据本裁决把机器门改为 `formalObservationAuthorized=true` 并开始正式 HW2R，无需另行询问；但完成 HW2R/H2-X/条件 H2-N/H3P 后必须停在 `READY-FOR-PR2B-H3-UNLOCK-REVIEW`。
- 关键路径固定为 `PR-2A blocker closure -> HW2R -> H2-X -> conditional H2-N -> H3P -> PR-2B -> HW1-primary -> HW1-repeat -> PR-3 -> I1 -> DOC/Z1 -> PR-4`。正式理论、正式程序、AGENTS、冻结科学证据和科学门值均未修改。

## 2026-09-01 20:17:14 +09:00

- 重新以 GitHub 实际 `main@b864d4c22251ffc356f1b6c8c4d86cdd1d1e41ab` 为准核验 PR-2A v1、v1 机器门、正式 HW2R 入口、current/history、项目总账和绿色 CI；确认此前页面回复中“远端未写入、仍停在 `fa73bda...`”是错误事实陈述，予以废止。
- 新增唯一权威差异裁决 `G0_全项目完成度与实验前暂停治理/09_PR2A_b864页面回复与仓库机器门差异统一裁决.md`，身份为 `IYPT13-PR2A-B864-PREOBSERVATION-RECONCILIATION-v1`，首次写入提交为 `25ec2349fab53970e01acf9e852a33f3d08afe6f`，文件 SHA-256 为 `161bc38d5c8fa57ae5b6d07a2c14bf37218aa56228b05f84fd593fbaf0eb3ba0`。
- 首次正式 HW2R 的唯一通过码统一为 `PASS-PR2A-HW2R-FORMAL-OBSERVATION-READY`；旧码 `PASS-HW2R-PRE-OBSERVATION-READINESS` 只保留历史意义，不再解锁机器门、入口、manifest 或正式观测。
- 新增活动门 `VP-HW2R-PRE-OBSERVATION-READINESS-v2`，SHA-256 为 `ce787bdcff97b884dcb81289688a778f854dacb9b908aeab6eee6b41c4bd57a4`。v2 当前 `NOT_READY`、七项 P0 全 OPEN、无 manifest/sidecar、`formalObservationAuthorized=false`；v1 保持历史字节不变。
- 七项活动 P0 统一为：可比 A8R 操作图和 superseding protocol；distinct executor 与有效资源；运行期持久 GPU/representative hybrid；数值身份时间顺序和 unresolved fail-closed；双向 calibration 与全阶段硬安全；child timeout/PGID/残留和失败证据；pre-observation seal、正式入口强制与唯一通过码。
- 页面回复中额外提出的 H2-X 全负例和实际完成顺序、条件完整 H2-N evaluator/negative dispatcher、H3P 全故障矩阵和真实双环境 seal，被重新放回 HW2R 后、PR-2B 前；但其合同、阈值、触发器和 fail-closed 接受语义必须在首次观测前冻结。
- 发现 v1 门虽有独立 audit 命令，正式 runner 可绕过；本轮更新 `hw2r-pre-observation.mjs` 和 `hw2r-contract.mjs`，使正式 runner 与 finalizer 通过 protocol loader 强制读取 v2 门。新增回归测试锁定七项 P0、旧码拒绝、seal 条件和入口强制。
- current 更新为 `PR2A_RECONCILED_GATE_V2_SEVEN_P0_OPEN_FORMAL_HW2R_LOCKED`。本轮没有关闭任何 P0，没有启动正式观测、H2-X/H2-N/H3 或结果承载运行，没有读取科学 payload；正式理论、正式程序和冻结证据均未修改，科学结论仍为 `NONE`。

## 2026-09-01 21:13:50 +08:00

- 用户明确要求停止当前工程工作，并由 ChatGPT Pro 按项目真实用途审查是否过度工程化。Pro 以 GitHub `main@eb679fe9d7469d133b72787ff177004b3c0f4255` 为唯一基线完成全项目复审；根 README 和 Codex 本地未提交硬化均未计入现状。
- Pro 最终裁决为项目已明显且严重过度工程化，废止 `HW2R v3 -> 全候选资格 -> H2-X/H2-N -> H3 双环境` 作为科学前置主线；活动目标改为装置标定、ROM 参数辨识、留出预测、模型形式判别和不确定度传播。
- 新增 `G0_全项目完成度与实验前暂停治理/10_实验预测最小活动计划.md`，只保留轨迹级并行、基础 timeout/本任务进程清理、峰值内存、case 原子 shard、最终后端小规模数值等价和最小运行身份。
- PR-2A、七项 P0、机器门、通过码、G0/H1/H2/H3/_shared 及既有证据全部保留历史字节，但不再是 ROM、E1/F1/S1 或公开物理基准的活动前置；未为去除过度工程而删除或重构历史包。
- 常规 simulation CI 从 G0/H1/H2/H3/_shared/E1/F1/S1 八包矩阵收缩为正式程序测试、build、默认 forward smoke，E1/F1/S1 合成资格，以及 A8 CFD 组件测试和类型检查。
- Codex 未提交 HW2R v3 硬化工作完整保留在 `/home/cjt/.codex/tmp/iypt13-a8r-evidence-20260831`，没有混入本轮正式仓库修改，也没有被删除或宣称已完成。
- 下一批次改为一次有上限的固定圆柱 CFD 科学去留循环，然后准备装置测量、无流机械标定、ROM 辨识和留出工况接口。二维基准仍失配则冻结为定性工具；只有必要科学矩阵周转时间不足时才恢复最小性能优化。
- 本地验证完成：正式程序 17 suite、44/44 tests、build 和默认 12 s forward smoke 通过；E1 10/10、F1 12/12、S1 13/13；A8 组件 97/97 与 typecheck；两份活动 Markdown 的 Pandoc 解析、限定数学检查、Actions YAML 解析和 `git diff --check` 均通过。证据上限仅为实现/合成/smoke，不是装置数值或物理 PASS。
- 首次远端 Scientific core checks 中正式程序、E1/F1/S1 全部通过；A8 全套 97 项只有绑定 22 MB A8Q Git LFS 产物的历史身份测试在浅 checkout 失败。未扩大 CI 下载历史证据，改为 32 项直接 CFD 数值组件测试加 typecheck；这项修正不改 A8 源、测试、冻结产物或物理门值。
- 修正提交 `2540d252c3a5fd5c1916487b40e3c79a2104181b` 的 Markdown workflow 与 Scientific core checks 均通过；正式程序、E1、F1、S1 和精简 CFD 组件五个 job 全绿，路线收缩的远端执行闭环完成。
- 本轮路线变化不形成数值、物理或实验 PASS；正式理论、正式程序、顶层 AGENTS 和冻结科学证据均未修改，科学结论仍为 `NONE`。

## 2026-09-01 21:47:00 +08:00

- 完成科学优先路线的首个只读审计：旧 A8R 串行主运行已因主机关机中断且没有规范产物，当前也没有 A8R 求解进程，因此不存在可复用结果或需要停止的活动模拟。
- 既有 A8Q 在 $Re=185$ 下 Strouhal 接近公开值，但平均阻力和升力 RMS 高约 19%--26%；固定圆柱 A2 修正量不足以解释偏差，横向 $10D$ 周期域与过宽、未按位移长度修正的 Brinkman mask 是本轮有上限复核对象。
- 新增 `36_A8S_固定圆柱有限科学去留循环.md`、轻量 TypeScript 实现、单一 runner 和 3 项测试。矩阵冻结为 3 个主网格加 4 个仅 $D=16$ 的敏感性算例，共 7 条轨迹；不恢复旧 A8R 的全人口复制、常驻绝对账、双环境复跑或性能资格层。
- 零位移紧致正弦 mask 的解析形状常数冻结为 $h_\chi/\sqrt{\nu\eta}=2.949029420641545$，由 Riccati 初值问题在结果前计算并由测试复核；不根据固定圆柱目标反调。
- 无结果实现验证通过：A8 候选包 100/100 tests、TypeScript typecheck、两份活动 Markdown 的 Pandoc 解析、限定数学检查和 `git diff --check`。尚未执行 7 条 A8S 轨迹，科学结论仍为 `NONE`。
