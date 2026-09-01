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
