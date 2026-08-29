# 当前交接

## 当前状态

A8R v2.1 独立 Pro 解锁的两个正式 40 步烟雾已完成，冻结内部机器门全部通过。当前状态为：

`COMPLETED_INTERNAL_SMOKE_GATES_PASS_PENDING_PRO_REVIEW`

实现、证据和报告都只位于候选工作区。正式 `01_最终理论/**` 与 `02_模拟程序/**` 未修改；A8Q 科学源、产物、报告和门值未修改；v1、v2、v2.1 合同及合同测试未修改。

当前仍不存在 A8R 数值 PASS、INCONCLUSIVE 或 NO-GO。两个烟雾通过只支持短时正式求解器集成与机器力恒等式闭合。

## 身份链

- Pro 审查提交：`964225d51ef15fbe5a6ab9cb0e2b9d1da031d08d`；
- Pro 审查文件 SHA-256：`d16cc0c3dd0517c7795f102da74108b61d02088ca97a44e8a594ba83cffc9c9d`；
- 结果前烟雾实现提交：`9811120482a387158115e4e5565bd25a50bf2e3b`；
- 完整 32 路径实现树 SHA-256：`5b6adfdcecb7822389025a73ca7a673432d07a26cd11a05d9b19730957ec835c`；
- 结果后证据提交：`c69051ab0f4051ed67a8e7637a97c1023dda7aec`；
- 机器证据 SHA-256：`50fc8d7ccb3f5a0570f334aec8e31d7eb51cacfc4b07bce558c7b367db42ba08`。

旧交接曾把审查文件 SHA-256 误记为 `40e684f6...`。本轮用审查提交实际字节和当前文件双重复核，正确值为上述 `d16cc0c3...`；审查文件本身未修改。

## 烟雾结果

共同定义为 `D=24`、mask 半厚度 0.75、基线相位、`penalizationTimeSteps=1`、入口格子速度 0.05、新鲜均匀初态、不恢复 checkpoint，每案恰好 40 步。

固定圆柱：

- 40/40 步人口副本、解析 mask、控制体支撑、原始人口恒等式、A2 重算、正式载荷重组和有限性门通过；
- 非零 mask 和每步重建非零力计数均为 510，全部位于控制体内；
- 最大绝对残差为 `2.787103881018993e-12`，最大残差/舍入界比值为 `6.4976458717473926e-6`。

`body=null`：

- 保留相同冻结控制体中心，40/40 步非零 mask 和重建非零力计数均为 0；
- 正式原始反力、正式 A2 修正和正式修正载荷 40/40 步均为精确零；
- 独立控制体路径最大消去残差为 `7.579122514774401e-12`，最大残差/舍入界比值为 `1.7663650186245528e-5`，按冻结规则通过。

机器证据与报告：

- `90_候选工作区/current/A8_二维特征开放边界实验后端/验证与复现/smoke/a8r-v2p1-formal-dual-40-step-smoke.json`；
- `90_候选工作区/current/A8_二维特征开放边界实验后端/验证与复现/smoke/a8r-v2p1-formal-dual-40-step-smoke.sha256`；
- `90_候选工作区/current/A8_二维特征开放边界实验后端/29_A8R_v2_1_正式双40步烟雾测试报告.md`。

## 已执行验证

- 结果前与实现推送后的干净 `npm ci`；
- 两轮候选包 95/95 测试、TypeScript 和相关 Node 语法检查；
- `HEAD == origin/main`、工作树干净、裁决/来源/祖先链/依赖树/冻结 A8Q 锚前置门；
- 两个且仅两个正式 40 步烟雾；
- 结果后提交推送后的 `npm run assert:brinkman-multiresolution-v2-1-smoke`，返回 `pass=true`；
- 机器证据 sidecar、Pandoc 解析、5 页 Chrome/PDF 渲染和页首/页尾视觉检查。

仓库级数学检查器仍只报告 A8O/A8P 两份冻结旧文档的 4 个既有命中；本轮新报告无新命中。

## 未执行与继续锁定

未执行 A8R 完整研究矩阵、研究 gzip 生成/断言/独立复跑、正式 `npm run validate`、长时稳定、物理载荷、锐界面、无滑移极限、正式集成、装置预测或实验验证。

机器证据明确保持：

- `researchScopeAuthorized=false`；
- `researchMatrixUnlocked=false`；
- `formalIntegrationUnlocked=false`；
- 研究 gzip 在烟雾前后均不存在。

## 下一步唯一任务

停止 Codex 数值执行和科学实现，将烟雾实现提交 `9811120...`、结果后证据提交 `c69051a...`、机器证据、sidecar 和报告交回独立 Pro 审查。

新裁决前，`RESEARCH_MATRIX`、A8R 研究产物、完整复跑、正式接入和全部下游工作继锁定。
