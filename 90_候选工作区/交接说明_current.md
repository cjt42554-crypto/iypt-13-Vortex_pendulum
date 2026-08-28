# 当前交接

## 本轮拉取与当前状态

本轮先在干净 `main` 上把远程 GitHub 从
`8b242fd2f48bfe006ad13d03ca53516ba654e15f` fast-forward 拉取到
`a20ec3fd35f4fe9a19854ae3bb38e09156815820`，收到 A8Q 网页版 Pro
独立审查与 A8R 路线裁决。

A8Q 冻结机器裁决保持：

`PASS-A8Q-BRINKMAN-SCALING-PATH-CANDIDATE-ONLY-UNLOCK-A8R`

独立裁决为：

`ACCEPT-A8Q-PRO-EVIDENCE-CHAIN-CANDIDATE-ONLY`

`CONFIRM-A8Q-PRO-FROZEN-MACHINE-PASS`

`REJECT-A8Q-PRO-SHARP-INTERFACE-OR-FORCE-VALIDATION`

`UNLOCK-A8R-PRO-RESULT-BEFORE-CONTRACT-ONLY`

本轮已按该裁决只冻结 A8R 结果前合同，并作为独立提交
`eb4d5c41bea6de653491d7fe0d27382c7912985b` 推送到远程 `main`。
当前没有 A8R 数值结果。

## 新冻结的 A8R 合同

阶段名：

`VP-A8R-FIXED-ETA-LU-MULTIRESOLUTION-ROBUSTNESS-AND-FORCE-IDENTITY-v1`

新增文件：

- `90_候选工作区/current/A8_二维特征开放边界实验后端/20_A8R_固定惩罚时间多分辨率稳健性与力身份预注册合同.md`；
- `90_候选工作区/current/A8_二维特征开放边界实验后端/src/brinkman-multiresolution-contract.ts`。

提交后文件 SHA-256：

- Markdown：
  `92bacf8992a622ab09d8b574c4085be2ea4b7a2120ec898c457f87c663429e37`；
- TypeScript：
  `44b2eeb3be274d3cd11c80b1d806655bcf39809bd4b255c8fb5b5b77fa7559c6`。

正式 `lbm.ts` 仍保持：

`6949dd9f215595bde4162078f9cb026456bcbed83fd2ebd08131001e03ec2dc2`

正式 `01_最终理论/**`、`02_模拟程序/**`、S1、S9、A8O、A8P 和 A8Q
科学源与产物均未修改。

## 冻结矩阵与统计身份

主矩阵为：

$$
D\in\{24,36,54\},
\qquad
w_\chi\in\{0.50,0.75\},
\qquad
\eta_{\mathrm{lu}}=1.
$$

固定细化比为 $r=1.5$，共 6 条从统一初态开始的唯一轨迹。
$D=24$ 两点必须从头重跑，并与通过压缩、规范 JSON 和 sidecar
身份验证的 A8Q 锚公共字段逐字段、零容差一致；$D=16$ 只作哈希
绑定的冻结历史锚。

每条轨迹预注册全窗、后半窗和四个等长分块，分别记录平均阻力、
平均升力、原始升力 RMS、去均值升力 RMS、Strouhal 数和频谱幅值。
核心/过渡带滑移、逐点最大滑移、有效几何、惩罚层尺度及
`penaltyLayerAtLeastOneCell` 布尔诊断继续保存。

## 独立力身份

A8Q 的“原始反力 + 虚拟内部流体修正 = A2 最终载荷”重组残差继续
只算数据完整性门。

A8R 新预注册的独立路径是位于全局边界内部的封闭 D2Q9 链路控制体
人口动量预算：

$$
\boldsymbol F_{\mathrm{CV,raw}}^n
=-\left(
\boldsymbol P_\Omega^{n+1}
-\boldsymbol P_\Omega^n
+\boldsymbol\Phi_\Omega^n
\right).
$$

它只使用步前/步后人口、固定控制体和穿越控制面的离散链路通量；
不得读取正式 `forceX`、`forceY`、`penaltyReaction()` 或正式原始
反力返回值来构造独立结果。虚拟内部流体修正也从步前/步后只读
宏观状态重新计算。

六个冻结几何上，控制体和一链路 halo 均在全局边界内部，控制面
halo 的最大 mask 值精确为 0。该路径通过时只建立离散动量身份，
不建立连续应力积分、锐界面或实验载荷真值。

## 冻结门与终局语义

A8R 至少冻结：

- 六条轨迹完整、唯一、有限、稳定并满足 A8Q 成熟硬门；
- $D=24$ 新运行与 A8Q 锚零容差一致；
- 两个 mask 的核心滑移满足 $S_{24}\ge S_{36}\ge S_{54}$；
- 平均阻力和去均值升力 RMS 的相邻增量不反复变号，且细一级增量
  绝对值严格缩小；
- 平均阻力和去均值升力 RMS 的跨 mask 差异在
  $24\to36\to54$ 上不升高；
- $D=54$ 全窗原始和去均值升力 RMS 跨 mask 差均严格低于 A8Q
  精确锚 0.04995122077720906；
- 四个对齐分块的最坏原始和去均值升力 RMS 跨 mask 差均严格低于
  0.05；
- 每个接受分析步的独立控制体原始力与 A2 载荷身份通过；
- 主运行和仓库外完整复跑逐字节一致。

终局代码只允许：

`PASS-A8R-DISCRETE-MULTIRESOLUTION-ROBUSTNESS-CANDIDATE-ONLY`

`INCONCLUSIVE-A8R-MASK-MARGIN-OR-FORCE-IDENTITY`

`NO-GO-A8R-BRINKMAN-DISCRETE-ROUTE`

证据缺失、来源漂移、锚或复跑不一致只能判 INCONCLUSIVE，不能冒充
物理 NO-GO。外部固定圆柱文献资格是独立子门，不是离散稳健性 PASS
的必要条件；若失败，即使离散 PASS 也必须明确记录外部资格未通过。

## 本轮已执行验证

- 本地 `main` 安全 fast-forward pull，拉取后与 `origin/main` 一致；
- A8R 机器合同六算例构造核对；
- 正式源、Pro 裁决、A8Q 合同/测试/实现/报告和 sidecar 逐文件
  SHA-256 审计 PASS；
- A8Q gzip 解压、22,058,158/100,105,555 字节数、压缩与规范 JSON
  SHA-256 审计 PASS；
- 六个控制体边界与 mask halo 几何审计 PASS；
- `npm run typecheck` PASS；
- 既有候选包测试 41/41 PASS；
- A8R 合同 Pandoc `--from=markdown --to=json --fail-if-warnings` PASS；
- A8R 合同目标数学检查 PASS，无制表符和非预期尾随空格；
- A8R 合同经 Pandoc MathML 和 Google Chrome 实际渲染为 12 页，
  逐页检查未见公式截断、错位或未渲染标记；
- 合同提交已推送到远程 `main`。

仓库级 `tools/check_markdown_math.py` 仍以 1 退出，因为拉取前后均已
存在的 A8O/A8P 四处独立显示公式标记问题：

- `13_A8O_网页版Pro独立审查与下一路线裁决.md` 第 117、125 行；
- `16_A8P_网页版Pro独立审查与A8Q路线裁决.md` 第 194、289 行。

本轮没有修改这些冻结旧裁决文档；新 A8R 文件未出现在失败列表中。

未执行：Zettlr 应用本体预览、`npm ci`、正式程序
`npm run validate`、A8R 合同测试、无结果实现、运行器、断言器、
非研究烟雾、任何 $D=24/36/54$ A8R 轨迹、产物、仓库外 A8R 复跑、
资格报告、规定横移、weak-FSI、三维、自由表面、装置预测或实验
验证。

## 下一步与停止条件

下一步先交回独立 Pro 审查 A8R 合同。若合同被接受，下一次只按
冻结顺序创建合同测试并独立提交、推送；再经允许后创建无结果实现
提交。三项结果前提交均冻结前，不运行第一条 A8R 主矩阵轨迹。

当前禁止：

- 执行 A8R 的 $D=24,36,54$ 主矩阵；
- 修改正式理论或正式程序；
- 修改 A8Q 科学源、产物、报告或冻结门；
- 依据文献接近程度选参；
- 输出 Richardson 外推、GCI 或锐界面资格；
- 开发 S10、接入 S9 或修改开放边界；
- 运行规定横移、weak-FSI、三维、自由表面、装置预测或实验拟合。
