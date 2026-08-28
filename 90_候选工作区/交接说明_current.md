# 当前交接

## 本轮独立裁决

本轮在远程 `main` 最新 A8R v1 结果前合同上完成独立 Pro 审查。新增：

`90_候选工作区/current/A8_二维特征开放边界实验后端/21_A8R_网页版Pro独立审查与v2合同修订裁决.md`

裁决为：

`ACCEPT-A8R-V1-PRO-RAW-DISCRETE-CONTROL-VOLUME-IDENTITY-IN-PRINCIPLE`

`REJECT-A8R-V1-PRO-STATISTICAL-ROBUSTNESS-CONTRACT-AS-FINAL`

`REQUIRE-A8R-V2-PRO-CYCLE-RESOLVED-AND-LATTICE-PHASE-CONTRACT`

`KEEP-A8R-PRO-RESULT-BEFORE-EXECUTION-LOCKED`

A8R v1 仍是结果盲历史，没有 A8R 数值结果。正式 `01_最终理论/**` 和 `02_模拟程序/**` 未修改。

## 接受的部分

v1 的内部 D2Q9 链路控制体人口动量预算，在控制体及一链路 halo 位于全局边界内部且包含全部非零 mask 与 Brinkman 力支撑时，原则上可以独立重建正式原始反力：

$$
\boldsymbol F_{\mathrm{CV,raw}}^n
=-\left(
\boldsymbol P_\Omega^{n+1}
-\boldsymbol P_\Omega^n
+\boldsymbol\Phi_\Omega^n
\right).
$$

该门的结论上限仅为离散原始力身份。重新计算虚拟内部流体修正只能检查 A2 公式实现一致性，不是第二种物理取力法。

v1 的结果前提交顺序、A8Q 哈希绑定、$D=24$ 新运行与 A8Q 公共投影零容差一致等原则应保留到 v2。

## v1 未被接受的原因

1. A8Q 的 $St=0.19450$--$0.19675$ 意味着 40 对流时间只有约 7.8 个脱涡周期，四个 10 对流时间分块各约 1.95 个周期。分块 RMS 仍有百分数量级的有限窗相位效应，不能裁决只有 0.00488 个百分点余量的跨 mask 门。
2. v1 只冻结一个圆柱亚格点相位，确定性复跑不能建立格点相位稳健性。
3. v1 的严格相邻增量门会把 $\Delta_1=\Delta_2=0$ 的理想平台判为失败；小于周期散布的增量也会被错误提升为 NO-GO。
4. 原始人口动量恒等式与 A2 修正公式重算没有完全拆分；舍入绝对账和全部力支撑包含条件仍需展开。
5. 当前外部固定圆柱比较只能作为文献接近度屏蔽，不能称为载荷资格或物理验证。

## 下一步唯一任务

下一次由 Codex 只建立 A8R v2 结果前合同和机器合同，建议文件为：

- `90_候选工作区/current/A8_二维特征开放边界实验后端/22_A8R_v2_周期分辨多分辨率mask相位与力身份预注册合同.md`；
- `90_候选工作区/current/A8_二维特征开放边界实验后端/src/brinkman-multiresolution-contract-v2.ts`。

v2 至少必须冻结：

- $D=24$ 与 A8Q 公共投影零容差一致；
- 最后 6 个完整脱涡周期的周期分辨统计，少于 7 个有效正斜率过零点时判 INCONCLUSIVE；
- 四个 10 对流时间分块只作诊断，不直接决定终局；
- 基线六轨迹外，在 $D=54$ 对两个 mask 各追加一个相差半格的横向相位轨迹，总计至少 8 条；
- 增量趋势的“已分辨 PASS / 未分辨 INCONCLUSIVE / 已分辨 NO-GO”三值逻辑，并覆盖精确平台；
- `independentRawPopulationMomentumIdentity` 与 `independentA2FormulaRecomputation` 两个独立门；
- 全部人口、链路、逐格 Brinkman 力和逐格 $\chi\rho u$ 的绝对舍入账；
- `literatureProximityScreen` 或等价的非资格化名称；
- v2 的三终局代码和判定优先级。

v2 Markdown 与机器合同应位于同一个独立提交并推送到远程 `main`。完成后停止并再次交回独立 Pro 审查。

## 当前禁止

- 创建 v1 或 v2 合同测试；
- 创建 A8R 无结果科学实现、运行器或断言器；
- 执行任何 A8R $D=24,36,54$ 或格点相位研究轨迹；
- 修改 A8Q 科学源、产物、报告或冻结裁决；
- 修改正式理论或正式程序；
- 输出 Richardson 外推、GCI、锐界面、无滑移极限或载荷物理资格；
- 进入规定横移、weak-FSI、三维、自由表面、装置预测或实验拟合。

## 本轮已执行与未执行验证

已执行：

- 读取 `AGENTS.md`、当前交接、A8R v1 Markdown/TypeScript 合同；
- 逐段核对正式 `lbm.ts` 的宏观量、Guo 力源、迁移、Zou--He 覆盖顺序与控制体动量式；
- 核对 A8Q 统计实现、A8Q 资格报告和既有 Pro 裁决；
- 对新增独立审查和更新 README 执行 Pandoc `--from=markdown --to=json --fail-if-warnings`；
- 检查新增/改写 Markdown 无制表符、无非预期尾随空格且显示公式分隔符成对；
- 对独立审查生成 MathML HTML，未发现残留显示公式定界符。

未执行：

- A8R 合同测试、无结果实现、运行器、断言器和任何研究矩阵；
- A8Q 数值重跑、LFS 产物解压或断言；
- 候选包 `npm test`、`npm run typecheck`、`npm ci`；
- 正式程序 `npm run validate`；
- Zettlr 应用本体预览、浏览器逐页截图检查；
- 规定横移、weak-FSI、三维、自由表面、装置预测和实验验证。
