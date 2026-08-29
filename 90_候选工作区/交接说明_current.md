# 当前交接

## 当前状态

A8R v2.1 无结果实现提交已完成独立 Pro 审查：

`d42efeb192f10a433d0f2a02d2a3cb119ac26c42`

新增审查文件：

`90_候选工作区/current/A8_二维特征开放边界实验后端/27_A8R_v2_1_网页版Pro无结果实现审查与P1修订裁决.md`

现行裁决为：

`ACCEPT-A8R-V2P1-PRO-NO-RESULT-SCIENTIFIC-CORE-IN-PRINCIPLE`

`REJECT-A8R-V2P1-PRO-FORMAL-SMOKE-OR-RESEARCH-UNLOCK`

`REQUIRE-A8R-V2P1-PRO-P1-ASSERTION-REPEAT-PROVENANCE-AND-AUTHORIZATION-REPAIR`

`KEEP-A8R-V2P1-PRO-FORMAL-SMOKE-RESEARCH-AND-DOWNSTREAM-LOCKED`

无结果实现的周期统计、三值趋势、D54 双 mask/双相位屏蔽、D24 公共投影、控制体人口动量恒等式和 A2 公式重算核心原则上可保留；但当前实现不能进入正式 40 步烟雾或八轨迹研究矩阵。

正式 `01_最终理论/**` 与 `02_模拟程序/**` 未修改。A8Q 科学源、产物、报告与门值未修改。当前不存在任何 A8R 数值 PASS、INCONCLUSIVE 或 NO-GO。

## 本轮发现的阻塞问题

### 1. 产物断言器 sidecar 换行错误

研究运行器写 sidecar 时使用真实 `"\n"`；当前产物断言器却使用反斜杠加物理换行的 JavaScript 行续接，实际不会产生换行字符。因此合法 sidecar 会被断言器错误拒绝。

### 2. 独立完整复跑门未 fail-closed

当前 repeat 参数可缺省；同时把同一个文件作为 primary 和 repeat 也会得到字节一致。P1 必须强制 distinct repeat 路径，并要求 gzip 与 sidecar 双字节一致，否则非零失败。

### 3. 缺少后实现 Pro 执行授权门

`package.json` 已暴露完整八轨迹运行入口，而前置门只绑定“允许建立无结果实现”的旧裁决，没有绑定后实现审查后的烟雾/研究授权。P1 必须在第一个正式求解器构造之前默认 fail-closed。

### 4. 运行时来源身份链不完整

A8R 结果相关依赖至少还包括公开固定圆柱基准的 `benchmark-metrics.ts`、`benchmark-contract.ts` 和候选包 `package-lock.json`。这些当前未完整纳入运行前身份树，可能在不触发现有门的情况下漂移。

### 5. P1 提交身份需可修订

当前前置门要求所有实现路径的“最后修改提交”完全相同。P1 若只修阻塞文件会被该门自身拒绝。应改为绑定明确 P1 提交下的完整实现字节树，并验证工作树与该提交一致，而不是要求每个文件都在 P1 中被人为修改。

## 下一步唯一任务

Codex 只建立一个结果盲 P1 修订提交，不执行任何正式求解器步骤。

必须完成：

- 修复断言器 sidecar 的真实 `"\n"`；
- 强制 repeat 存在、primary/repeat 规范化绝对路径不同、两份 sidecar 路径不同，并要求双 gzip/sidecar 逐字节一致；
- 增加缺 repeat、同路径、错误 sidecar、合法双文件的 CLI 或等价端到端测试；
- 在正式求解器构造前加入后实现 Pro 授权 fail-closed 门，当前默认锁定；
- 补齐 `benchmark-metrics.ts`、`benchmark-contract.ts`、`package-lock.json` 和静态导入图中的其余结果相关运行依赖身份；
- 将实现身份改为完整 P1 提交树绑定，不要求所有文件最后修改提交相同；
- 保留 v2.1 周期、趋势、D54、D24、控制体和 A2 科学算法，不回改合同或合同测试；
- 更新相应测试、README 和交接；
- 运行候选包 `npm ci`、`npm test`、`npm run typecheck`、Node 语法检查、A8Q 流式身份核验和纯合成前置门负向测试；
- 作为独立提交直接推送远程 `main`，随后停止并再次交回独立 Pro。

## 当前继续禁止

P1 再次获得独立 Pro 接受前，禁止：

- 固定圆柱或 `body=null` 的正式 40 步烟雾；
- 任何 A8R $D=24,36,54$ 或格点相位研究轨迹；
- 生成、覆盖或断言 A8R 冻结研究产物；
- 修改 v1、v2、v2.1 合同或合同测试；
- 修改 A8Q 科学源、产物、报告或门值；
- 修改正式理论或正式程序；
- Richardson、GCI、锐界面、无滑移极限或载荷物理资格；
- S9 正式接入、S10、规定横移、weak-FSI、三维、自由表面、装置预测或实验拟合。

## 本轮验证边界

本轮实际完成：源码逐段审查、与正式 `lbm.ts` 步进时序交叉核对、JavaScript 行续接最小反例检查、提交范围与远程祖先关系核对，以及本审查文档的 Pandoc 解析和基础 Markdown 检查。

本轮未重新执行：候选包 `npm test`、`npm run typecheck`、`npm ci`、正式 `npm run validate`、A8Q 规范 JSON 复算、正式烟雾或任何 A8R 研究轨迹。
