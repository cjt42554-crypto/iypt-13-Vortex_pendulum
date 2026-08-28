# A8Q 网页版 Pro 独立审查与 A8R 路线裁决

## 1. 审查范围与证据边界

本轮独立审查覆盖：

- A8Q 结果前 Markdown/TypeScript 合同；
- 合同测试、科学实现、运行器、产物断言器与资格报告；
- 正式 `lbm.ts` 中 Brinkman 力、隐式半步速度和 mask 实现；
- A8Q sidecar、提交顺序、冻结来源哈希、主运行与完整复跑记录；
- 当前 README 与交接文件。

本轮没有重新执行十算例矩阵，也没有直接解压 Git LFS 中约 22 MB 的压缩产物。因此，下述裁决属于源代码、合同、报告、哈希与既有复跑证据的独立科学审查，不是第三次独立数值复现。既有主运行与完整复跑逐字节一致只按其冻结身份链接受，不被改写成实验或物理验证。

正式 `01_最终理论/**` 和 `02_模拟程序/**` 均未修改。

## 2. 独立裁决

A8Q 的独立裁决为：

`ACCEPT-A8Q-PRO-EVIDENCE-CHAIN-CANDIDATE-ONLY`

`CONFIRM-A8Q-PRO-FROZEN-MACHINE-PASS`

`REJECT-A8Q-PRO-SHARP-INTERFACE-OR-FORCE-VALIDATION`

`UNLOCK-A8R-PRO-RESULT-BEFORE-CONTRACT-ONLY`

具体含义如下：

1. A8Q 的结果前身份链、十算例完整性、确定性完整复跑和冻结机器门可接受；
2. 冻结机器裁决 `PASS-A8Q-BRINKMAN-SCALING-PATH-CANDIDATE-ONLY-UNLOCK-A8R` 保持有效，不作结果后回改；
3. 唯一可带入下一阶段的仍是固定 $\eta_{\mathrm{lu}}=1$ 路径；
4. 该路径只获得“离散固定惩罚时间多分辨率候选”身份，不获得 Brinkman 锐界面、无滑移极限、载荷真值或正式接入资格；
5. 当前只允许编写新的 A8R 结果前合同。未冻结合同、合同测试和无结果实现前，不得直接运行第三或更高分辨率。

## 3. 合同与实现一致性

源代码逐项实现了 A8Q 冻结语义：

- 唯一矩阵为 $D\in\{16,24\}$、$w_\chi\in\{0.50,0.75\}$、$\eta_{\mathrm{lu}}\in\{1,2\}$，另含两个 $D=24,\eta_{\mathrm{lu}}=3$ 控制点；
- $Re=185$、$U_{\mathrm{lu}}=0.05$、$14D/19.5D/10D$ 域和 80/40 对流时间窗均按合同构造；
- 路径门确实检查核心滑移不升高、双 mask 变化方向兼容和 $D=24$ 跨 mask 载荷差；
- 全局门检查算例数量、顺序、有限性、稳定性、成熟性、冻结来源与控制点；
- 总裁决只要求至少一条固定 $\eta_{\mathrm{lu}}$ 路径通过；
- 单点文献接近程度不参与选参；
- 运行器验证合同、测试、实现的提交祖先顺序和冻结哈希；
- 断言器重新计算派生统计、路径门、总裁决和产物身份。

没有发现足以翻转冻结机器 PASS 的合同实现偏差。

但“力分解重组残差为零”的含义必须收窄。每步最终载荷在运行时直接定义为：

$$
\boldsymbol C_{\mathrm{corr}}
=\boldsymbol C_{\mathrm{raw}}
+\boldsymbol C_{\mathrm{fict}},
$$

断言器随后检查同一代数关系。因此零残差证明的是记录、序列化和派生计算没有破坏该定义，不是与控制体动量通量、完整应力积分或另一独立取力法的一致性验证。

## 4. 关键科学问题

### 4.1 通过裕量不稳健

固定 $\eta_{\mathrm{lu}}=1$ 的 $D=24$ 跨 mask 升力 RMS 相对差为 4.99512%，只比 5% 门低：

$$
5.00000\%-4.99512\%=0.00488\ \text{个百分点}.
$$

该余量仅为门值的约 0.0976%。完整复跑逐字节一致说明结果是确定的，但不能把一个几乎贴门的确定性点估计解释为对统计窗、分辨率、格点相位或实现微扰稳健。

因此，机器 PASS 保持有效；科学解释必须是“边界型候选 PASS”。

### 4.2 当前惩罚层远未在格点上解析

合同使用：

$$
\nu_{\mathrm{lu}}=\frac{U_{\mathrm{lu}}D}{Re},
\qquad
\widehat\eta=\eta_{\mathrm{lu}}\frac{U_{\mathrm{lu}}}{D},
\qquad
\delta_{\eta,\mathrm{lu}}
=\sqrt{\nu_{\mathrm{lu}}\eta_{\mathrm{lu}}}.
$$

对唯一通过的 $\eta_{\mathrm{lu}}=1$ 路径：

| $D$ | $\nu_{\mathrm{lu}}$ | $\widehat\eta$ | $\delta_{\eta,\mathrm{lu}}$ | $0.50/\delta_\eta$ | $0.75/\delta_\eta$ |
|---:|---:|---:|---:|---:|---:|
| 16 | 0.00432432 | 0.00312500 | 0.0657596 格 | 7.603 | 11.405 |
| 24 | 0.00648649 | 0.00208333 | 0.0805387 格 | 6.208 | 9.312 |

惩罚边界层厚度低于 0.1 格，而 mask 半厚度为 0.50 或 0.75 格。也就是说，在 A8Q 的两个分辨率上，弥散 mask 尺度约为理论惩罚层的 6 至 11 倍，观测趋势主要处于“未解析惩罚层 + 一格量级 mask”的离散混合区。

有效面积给出的等效直径误差低于 0.1%，只能排除明显面积偏差，不能排除水动力位移长度、有限滑移或 mask 轮廓导致的等效边界偏移。体积惩罚理论已知其主导模型误差可来自与 $\sqrt{\nu\eta}$ 相关的位移长度；原始 mask 在边界层未解析时也不具备可直接套用的高阶渐近解释。

因此，A8Q 的两点趋势不能作为 Richardson 外推、GCI、锐界面阶数或无滑移极限证据。

### 4.3 核心滑移下降是必要条件，不是充分条件

两个 mask 的核心滑移 RMS 随 $D=16\to24$ 下降，支持固定 $\eta_{\mathrm{lu}}=1$ 继续作为候选路径。但 A8Q 同时报告过渡带滑移 RMS 约 0.067 至 0.128，且没有给出边界切向速度剖面、位移长度或独立壁面应力。

核心区滑移单调只能说明固体内部较深区域的惩罚约束增强，不能单独证明界面处已经逼近无滑移圆柱。

### 4.4 载荷仍有显著外部偏差

在 $D=24,\eta_{\mathrm{lu}}=1$ 时：

- $w_\chi=0.50$：平均阻力 1.54686，较冻结目标 1.287 高约 20.19%；升力 RMS 0.528435，较目标 0.443 高约 19.29%；
- $w_\chi=0.75$：平均阻力 1.58005，高约 22.77%；升力 RMS 0.556219，高约 25.56%。

Strouhal 已接近公开结果，而载荷幅值仍系统偏高。这更像“脱涡频率已大致进入正确区间，但壁面/取力/近壁离散仍未资格化”，不能用单一频率接近掩盖载荷失配。

### 4.5 统计成熟门只证明冻结窗内稳定

后 40 个对流时间的前后半窗漂移较小，足以接受 A8Q 的合同内成熟性。但当前升力门使用原始 RMS，而非显式去均值后的波动 RMS；也没有预注册周期分块、块间离散或置信上界。

对 4.99512% 这种贴门结果，A8R 必须同时记录平均升力、原始 RMS、去均值 RMS 和预注册分块统计，不能继续只用一个全窗点估计决定稳健性。

## 5. A8Q 结论上限

可以接受：

- A8Q 身份链和十算例证据完整；
- 冻结机器 PASS 的程序语义正确；
- 固定 $\eta_{\mathrm{lu}}=1$ 是唯一可继续审查的离散候选路径；
- 两个 mask 的核心滑移、平均阻力和升力 RMS 在 $D=16\to24$ 上具有一致方向；
- A8R 结果前合同可以开始制定。

不能接受：

- 已建立网格收敛、锐界面收敛或无滑移极限；
- 已解析 Brinkman 惩罚层；
- A2 修正载荷已获独立取力验证；
- 已通过固定圆柱公开载荷基准；
- 已选择正式入口、S1、S9 或正式高保真后端；
- 已可进入规定横移、weak-FSI、涡流摆装置预测或实验拟合。

## 6. A8R 结果前合同的强制边界

下一阶段建议命名为：

`VP-A8R-FIXED-ETA-LU-MULTIRESOLUTION-ROBUSTNESS-AND-FORCE-IDENTITY-v1`

### 6.1 冻结对象

A8R 必须：

- 只带入 $\eta_{\mathrm{lu}}=1$；
- 绑定 A8Q 合同、实现、压缩产物和规范 JSON 哈希；
- 保持正式 `lbm.ts`、A8Q 科学源和 A8Q 产物只读；
- 在首次结果前依次提交合同、合同测试和无结果实现；
- 禁止根据中途文献接近程度删除 mask、改变分辨率或修改门值。

### 6.2 最低主矩阵

主矩阵至少应为：

$$
D\in\{24,36,54\},
\qquad
w_\chi\in\{0.50,0.75\},
\qquad
\eta_{\mathrm{lu}}=1,
$$

其余物理载体、域比例、初态和 80/40 对流时间窗保持 A8Q 不变。

选择 $24\to36\to54$ 是为了保持固定细化比 $r=1.5$。$D=24$ 两点应在 A8R 中从头重复，并与 A8Q 锚点逐字段一致；$D=16$ 只作为冻结历史锚导入，不以旧标量手工抄录替代机器绑定。

### 6.3 必须新增的诊断

A8R 至少记录：

- 全窗、后半窗和四个等长分块的平均阻力、平均升力、原始升力 RMS、去均值升力 RMS 与 Strouhal；
- 核心与过渡带滑移、点wise 最大滑移、有效面积、等效直径；
- 每个分辨率的 $\delta_{\eta,\mathrm{lu}}$、$w_\chi/\delta_\eta$ 和“惩罚层是否达到一格”的显式布尔诊断；
- 原始 Brinkman 反力、虚拟内部流体修正和最终载荷；
- 至少一种独立于“最终载荷等于两分量之和”的全局动量预算或经独立基准验证的第二取力路径。

若独立力预算不能在 A8R 中实现，A8R 最高只能给出“离散载荷趋势候选”，不能给出载荷物理资格 PASS。

### 6.4 预注册门

A8R 至少应冻结以下门：

1. $D=24$ 新运行与 A8Q 锚点身份一致；
2. 六条主轨迹全部完成、有限、稳定并满足冻结成熟门；
3. 两个 mask 的核心滑移在 $24\to36\to54$ 上不升高；
4. 平均阻力和去均值升力 RMS 的相邻网格增量不得反复变号，且 $|Q_{54}-Q_{36}|<|Q_{36}-Q_{24}|$；
5. 跨 mask 差异在 $24\to36\to54$ 上不升高；
6. $D=54$ 的全窗跨 mask 升力差必须严格低于 A8Q 的 4.99512%，且预注册分块得到的最坏跨 mask 差必须低于 5%；否则判为 `INCONCLUSIVE-A8R-MASK-MARGIN` 或 FAIL；
7. 文献比较继续禁止选参。只有两个 $D=54$ mask 都通过同一冻结文献容差，才可把外部固定圆柱资格计入 A8R PASS；
8. 力分解重组仍只算数据完整性门；独立动量/取力一致性必须单列；
9. 由于 $D\le54$ 时 $\delta_{\eta,\mathrm{lu}}$ 仍远小于一格，A8R 不得授权 Brinkman 锐界面 Richardson 外推或 GCI。观测阶只能作为离散趋势诊断。

### 6.5 终局语义

A8R 必须至少区分：

- `PASS-A8R-DISCRETE-MULTIRESOLUTION-ROBUSTNESS-CANDIDATE-ONLY`；
- `INCONCLUSIVE-A8R-MASK-MARGIN-OR-FORCE-IDENTITY`；
- `NO-GO-A8R-BRINKMAN-DISCRETE-ROUTE`。

即使获得第一种 PASS，也只允许再次交回独立 Pro；不自动解锁正式程序、规定横移或 weak-FSI。

## 7. 当前停止条件

本轮到此停止。当前允许的下一项工作只有：编写 A8R 结果前合同及其无结果测试/实现计划。

在新的合同、合同测试和无结果实现分别提交并推送前，不执行 $D=36/54$；不修改正式程序；不进入 S9/S10、规定横移、weak-FSI、三维、自由表面、装置预测或实验拟合。

## 8. 方法学参考

1. Angot, P., Bruneau, C.-H., Fabrie, P. “A penalization method to take into account obstacles in incompressible viscous flows.” *Numerische Mathematik* 81, 497--520 (1999). DOI: `10.1007/s002110050401`.
2. Iwakami, W., Yatagai, Y., Hatakeyama, N., Hattori, Y. “A New Approach for Error Reduction in the Volume Penalization Method.” *Communications in Computational Physics* 16, 1181--1200 (2014). DOI: `10.4208/cicp.220513.070514a`.
3. Hester, E. W., Vasil, G. M., Burns, K. J. “Improving accuracy of volume penalised fluid-solid interactions.” *Journal of Computational Physics* 430, 110043 (2021). DOI: `10.1016/j.jcp.2020.110043`.
4. Guilmineau, E., Queutey, P. “A numerical simulation of vortex shedding from an oscillating circular cylinder.” *Journal of Fluids and Structures* 16, 773--794 (2002). DOI: `10.1006/jfls.2002.0449`.
