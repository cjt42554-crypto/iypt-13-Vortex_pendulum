# A8 高保真开放边界当前研究包

## 当前状态

A8R v2.1 已完成结果前合同、合同测试、无结果科学实现、P1 结果盲修订，以及
固定圆柱和 `body=null` 两个正式 40 步烟雾。

最新独立 Pro 审查：

`30_A8R_v2_1_双40步烟雾独立审查与研究矩阵解锁裁决.md`

审查提交：

`d5e0662cdee163e82da3dfe2bb2554c3d1cff2b9`

审查文件 SHA-256：

`c46634b2975996903d7c3cb3eb5d2999bb7412630d95496d832bb480d284553c`

现行裁决：

`ACCEPT-A8R-V2P1-PRO-DUAL-FORMAL-40-STEP-SMOKE`

`UNLOCK-A8R-V2P1-PRO-FROZEN-EIGHT-TRAJECTORY-RESEARCH-MATRIX-ONLY`

`REQUIRE-A8R-V2P1-PRO-RESULT-BLIND-RESEARCH-AUTHORIZATION-PRIMARY-ARTIFACT-AND-CLEAN-FULL-REPEAT`

`KEEP-A8R-V2P1-PRO-FORMAL-INTEGRATION-PHYSICAL-LOAD-AND-DOWNSTREAM-LOCKED`

双烟雾已获接受。当前只解锁 v2.1 合同冻结的八轨迹研究矩阵、冻结研究产物和
一次从干净环境开始的完整独立复跑。正式接入、物理载荷资格和全部下游任务继续
锁定。

结果盲研究授权实现已作为提交
`a298ee2976cbfd3738fc4ba17cdb52189b1e0da6` 推送。完整 33 路径静态实现树
SHA-256 为 `6b11ea23cca5b514c5d2a4f8d34ea11f3202e5c92434b567a828c2fa1f03579f`。

当前仍不存在 A8R 数值 PASS、INCONCLUSIVE 或 NO-GO。

正式 `01_最终理论/**` 与 `02_模拟程序/**` 保持只读。候选区实现不是正式程序
补丁，也不得把候选离散身份闭合解释为锐界面力、实验载荷或装置预测。

## 当前主线文件

- `24_A8R_v2_1_周期有效性与主指标相位屏蔽预注册合同.md`；
- `26_A8R_v2_1_网页版Pro合同测试审查与无结果实现解锁裁决.md`；
- `27_A8R_v2_1_网页版Pro无结果实现审查与P1修订裁决.md`；
- `28_A8R_v2_1_P1_网页版Pro独立审查与双40步正式烟雾解锁裁决.md`；
- `29_A8R_v2_1_正式双40步烟雾测试报告.md`；
- `30_A8R_v2_1_双40步烟雾独立审查与研究矩阵解锁裁决.md`；
- `src/brinkman-multiresolution-contract-v2-1.ts`；
- `src/brinkman-multiresolution-p1-v2-1.ts`；
- `scripts/brinkman-multiresolution-preflight-v2-1.mjs`；
- `scripts/run-brinkman-multiresolution-v2-1.mjs`；
- `scripts/assert-brinkman-multiresolution-v2-1-artifact.mjs`；
- `scripts/assert-brinkman-multiresolution-repeat-v2-1.mjs`；
- `验证与复现/smoke/a8r-v2p1-formal-dual-40-step-smoke.json`；
- `90_候选工作区/交接说明_current.md`。

## 已接受的烟雾证据

结果前烟雾实现提交为：

`9811120482a387158115e4e5565bd25a50bf2e3b`

结果后证据提交为：

`c69051ab0f4051ed67a8e7637a97c1023dda7aec`

机器证据 SHA-256 为：

`50fc8d7ccb3f5a0570f334aec8e31d7eb51cacfc4b07bce558c7b367db42ba08`

固定圆柱和 `body=null` 均完成 40/40 步。冻结人口副本、解析 mask、控制体
支撑、原始人口恒等式、A2 重算、正式载荷重组、精确零负对照和有限性门均通过。

烟雾结论只支持短时正式求解器集成和机器离散恒等式闭合，不支持长期稳定、物理
载荷或实验验证。

## 唯一允许的下一阶段

授权提交已完成干净安装、97/97 测试、TypeScript、Node 语法和推送后完整前置门。
下一阶段只允许按以下顺序执行：

1. 推送本轮交接收口，并从同一结果前远端快照建立第二个独立干净环境；
2. 在主工作区证明工作树干净、`HEAD == origin/main`、主 gzip 和 sidecar 不存在；
3. 从第一条算例和新鲜初态执行冻结八轨迹主研究矩阵；
4. 只写一次冻结主 gzip 与 sidecar，提交并推送主产物和初始机器报告；
5. 不修改任何结果相关源码、合同或门值，在第二环境从第一条算例完整复跑八轨迹；
6. 核验主产物与复跑产物的规范路径、`realpath` 和可用时 `(dev, ino)` 均不同；
7. 执行主产物断言及 gzip、sidecar 逐字节一致断言；
8. 写资格报告、验证记录和交接，推送后停止并再次交回独立 Pro。

若运行、来源门、周期证据或断言失败，保留证据并进入冻结的 INCONCLUSIVE 路径。
第一份结果出现后禁止修改结果相关源码、科学算法、矩阵或门值。

## 当前禁止

- 修改正式理论或正式程序；
- 修改 A8R v2.1 合同、合同测试或科学门；
- 修改 A8Q 科学源、产物、报告或门值；
- 额外挑选分辨率、mask、相位、时间窗或文献有利点；
- Richardson、GCI、锐界面、无滑移、连续应力载荷资格；
- S9 正式接入；
- 规定横移、weak-FSI、三维、自由表面；
- 装置预测、实验拟合或实验验证。

## 结论上限

当前只到“烟雾独立审查通过，冻结研究矩阵获准进入结果盲授权与执行”这一层级。
研究矩阵尚未运行，因此没有 A8R 数值终局，也没有正式程序或物理载荷结论。
