# 当前交接

## 本轮结果

已按 A8R v1 后独立 Pro 裁决，只在候选 A8 后端建立 A8R v2 结果前
Markdown 与 TypeScript 机器合同：

- `90_候选工作区/current/A8_二维特征开放边界实验后端/22_A8R_v2_周期分辨多分辨率mask相位与力身份预注册合同.md`；
- `90_候选工作区/current/A8_二维特征开放边界实验后端/src/brinkman-multiresolution-contract-v2.ts`。

两文件位于同一个独立提交：

`d7e33c64d07fbc17a44c2e0408235cc00528762e`

该提交已推送到远程 `main`。两文件 SHA-256 分别为：

- Markdown：
  `c23015bc5e16b33483d3191d89a6c67b6116aba9870efc00d701cee11b3fb771`；
- TypeScript：
  `b57cce7dc1c0532bb6d1967ce763c4758eac8aa22273089ab73183fdb4c24d18`。

A8R v1 提交 `eb4d5c41bea6de653491d7fe0d27382c7912985b` 保留为
被独立裁决取代的结果盲历史，没有 v1 数值结果。v2 也仍是结果盲
合同；本轮没有创建测试、实现或产物，没有运行 A8R 数值轨迹。

正式 `01_最终理论/**` 与 `02_模拟程序/**` 未修改。正式
`lbm.ts` SHA-256 仍为
`6949dd9f215595bde4162078f9cb026456bcbed83fd2ebd08131001e03ec2dc2`。

## v2 冻结内容

阶段名为：

`VP-A8R-V2-CYCLE-RESOLVED-MULTIRESOLUTION-MASK-PHASE-AND-FORCE-IDENTITY-v1`

v2 结果前合同冻结：

- $D=24$ 两条基线轨迹与 A8Q 公共投影逐字段、逐数组元素零容差一致；
- $D\in\{24,36,54\}$、双 mask、基线相位的六轨迹，另加 $D=54$
  双 mask 的两条半格横向相位轨迹，共 8 条；
- 用完整分析窗平均升力去均值，以最后 7 个有效正斜率过零点定义
  最后 6 个完整周期；少于 7 个时终局为 INCONCLUSIVE；
- 四个固定 10 对流时间分块只作诊断，不直接决定终局；
- 逐周期积分、六周期聚合、最小值、最大值、中位数和确定性周期包络；
- 相邻分辨率周期包络的 Minkowski 差与
  `RESOLVED-PASS`、`UNRESOLVED-INCONCLUSIVE`、
  `RESOLVED-NO-GO` 三值逻辑；精确平台不得判 NO-GO；
- $D=54$ 双 mask、双相位的聚合差和全部 $6\times6$ 周期笛卡尔积
  最坏差屏蔽；
- `independentRawPopulationMomentumIdentity`：只用步前/步后人口、
  固定控制体和 D2Q9 链路通量构造正式原始反力的离散恒等式；
- `independentA2FormulaRecomputation`：从独立人口宏观重建复算
  $\chi\rho u$ 修正，只检查 A2 公式实现一致性，不是第二种物理
  取力法；
- 全部人口、全部跨控制面链路、逐格 Brinkman 力以及步前/步后逐格
  $\chi\rho u$ 的绝对 Neumaier 舍入账；
- `literatureProximityScreen` 只作观察，不参与三终局；
- 三终局代码：
  `PASS-A8R-V2-DISCRETE-MULTIRESOLUTION-MASK-PHASE-CANDIDATE-ONLY`、
  `INCONCLUSIVE-A8R-V2-STATISTICS-PHASE-MARGIN-OR-FORCE-IDENTITY`、
  `NO-GO-A8R-V2-RESOLVED-BRINKMAN-DISCRETE-ROUTE`。

这些终局代码只是未来实现必须遵守的合同字段，不是本轮数值裁决。

## 当前结论上限

本轮最高结论只是“A8R v2 结果前合同候选已经冻结并推送，可交回独立
Pro 审查”。当前没有 A8R 实现级、数值级、物理级或实验级 PASS，
也没有 A8R NO-GO 数值结果。

原始人口控制体恒等式的最高未来结论仍只是正式原始 Brinkman 反力
的离散身份；A2 独立重算只检查公式实现一致性。两者均不建立连续
应力、锐界面、无滑移极限、载荷物理资格或装置预测。

## 下一步唯一任务

下一步只允许独立 Pro 审查：

- v2 周期过零、插值、积分和六周期聚合是否无歧义；
- 周期包络 Minkowski 差三值门和精确平台语义是否可接受；
- 双 mask、双相位及 5% 周期最坏差屏蔽是否充分且不过度解释；
- 原始人口恒等式、A2 公式重算和两套绝对舍入账是否完全分离；
- 三终局优先级是否正确保持证据不完整和格点相位未分辨为
  INCONCLUSIVE。

在 v2 再次获得独立 Pro 接受前，不得由 Codex 创建合同测试、无结果
实现或任何可执行入口。

## 当前禁止

- 创建 v1 或 v2 合同测试；
- 创建 A8R 无结果科学实现、支持测试、运行器或断言器；
- 执行任何 A8R $D=24,36,54$ 或格点相位研究轨迹；
- 执行 v2 预注册的强迫或无强迫正式求解器烟雾恒等式；
- 修改 A8Q 科学源、产物、报告或冻结裁决；
- 修改正式理论或正式程序；
- 输出 Richardson 外推、GCI、锐界面、无滑移极限或载荷物理资格；
- 进入 S9 正式接入、S10、规定横移、weak-FSI、三维、自由表面、
  装置预测或实验拟合。

## 本轮验证

已执行：

- 读取现行 `AGENTS.md`、本轮开始时的当前交接、A8R v1 合同、
  A8R v2 Pro 裁决、A8Q 合同/报告和正式 `lbm.ts` 相关步进；
- 核对本地与远程 `main` 在开始和合同提交前均无分叉；
- 候选包 `npm test`：41/41 PASS；
- 候选包 `npm run typecheck`：PASS；
- v2 Markdown 的 Pandoc
  `--from=markdown --to=json --fail-if-warnings`：PASS；
- 新增 Markdown/TypeScript 无制表符、无非预期尾随空格，
  `git diff --cached --check`：PASS；
- v2 Markdown 生成 MathML HTML 和 Chrome PDF，共 16 页；逐页目视检查
  公式、长代码和列表，未见公式截断、横向溢出或残留公式定界符；
- 仓库级 `tools/check_markdown_math.py` 仍只报告 A8O/A8P 四个既有
  冻结文档命中，新 v2 Markdown 没有新增命中；
- 正式源、v1 合同和 v2 Pro 裁决的冻结 SHA-256 复核一致；
- 两份 v2 合同以独立提交推送后，远程 `main` 与本地提交一致。

未执行：

- v1 或 v2 合同测试、无结果实现、支持测试、运行器或断言器；
- v2 强迫/无强迫烟雾测试和任何 A8R 研究矩阵；
- A8Q 数值重跑、LFS 产物解压或断言；
- `npm ci`；
- 正式程序 `npm run validate`；
- Zettlr 应用本体预览；
- 规定横移、weak-FSI、三维、自由表面、装置预测和实验验证。
