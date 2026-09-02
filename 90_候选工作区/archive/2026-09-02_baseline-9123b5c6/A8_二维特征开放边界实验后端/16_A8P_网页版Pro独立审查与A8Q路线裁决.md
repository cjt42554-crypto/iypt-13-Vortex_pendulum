# A8P 网页版 Pro 独立审查与 A8Q 路线裁决

## 1. 总裁决

A8P 的结果前合同、无结果实现、完整主运行、仓库外完整复跑、机器产物和报告之间形成了透明且可追踪的候选证据链。本轮接受其为候选级正负证据：

`ACCEPT-A8P-PRO-EVIDENCE-CHAIN-CANDIDATE-ONLY`

A8P 冻结合同下的机器总裁决不得回改：

`CONFIRM-A8P-PRO-FROZEN-NO-GO`

短时离散参考的窄结论可以接受：

`ACCEPT-A8P-PRO-FINITE-TIME-DISCRETE-REFERENCE-CANDIDATE-ONLY`

高参数零种子镜像锁定、非零反对称种子增长的分类证据可以接受：

`ACCEPT-A8P-PRO-SYMMETRY-LOCK-AND-SEED-GROWTH-CANDIDATE-ONLY`

但横向宽度门失败只能解释为当前高阻塞比、周期横向域和未饱和瞬态的联合敏感性，不能提升为 S1 或 S9 的二维边界算法失败：

`REINTERPRET-A8P-PRO-WIDTH-FAIL-AS-HIGH-BLOCKAGE-UNSATURATED-TRANSIENT-SENSITIVITY`

A8P 仍不能选择 S1 或 S9，也不解锁正式二维接入：

`NO-GO-A8P-PRO-S1-S9-PHYSICS-SELECTION-OR-FORMAL-INTEGRATION`

下一阶段不创建 S10，不继续叠加入口补丁，也不直接扩大 A8P 的窄域成熟性矩阵。优先建立 A8Q，审查当前 Brinkman 弥散固体在网格加密时是否沿一条明确的无滑移极限路径收敛：

`PRIORITIZE-A8Q-BRINKMAN-SHARP-INTERFACE-SCALING-PATH`

正式 `01_最终理论/**` 和 `02_模拟程序/**` 继续保持只读。

## 2. 审查范围与复现边界

本次核对了：

- A8P 结果前合同提交 `a45413e48d2ba86255d0b0819642e1f8690c27cb`；
- 合同测试提交 `ca4f76e31b5906ff5e03f9f001560c59975ac8fc`；
- 无结果实现提交 `3d37519d7d0c539012501b3c06aea79b5983ebd3`；
- 机器产物提交 `93e8b256fda5f8a485fbb8abf1a9111059c9acc9`；
- 收口提交 `c9463a0f5621738cf0d8052fb2e079b166f88136`；
- A8P Markdown 与 TypeScript 合同、运行器、断言器、报告、README 和交接；
- A8 公开固定圆柱包的网格--mask、域、入口距离和文献失配证据；
- 正式 `lbm.ts` 中 Brinkman 力、弥散 mask 和 `penalizationTimeSteps` 的实际实现。

A8P 压缩产物的 Git LFS 身份为：

- 压缩 SHA-256：`0aec8ce335baab93224608d01f6de0d5afcf8779226d2be8d40a5e946ae31868`；
- 规范 JSON SHA-256：`56dd50ed6c941b4581d5f7fa7faabafb2459f334749a5b321a64329c0abf00ff`。

本轮没有重新执行 40 条 A8P 轨迹，也没有通过 GitHub 连接器解压并逐记录重算 174,836,651 字节规范 JSON。因此，本次接受的是预注册、源码、提交顺序、机器断言、报告汇总、LFS 身份和既有完整独立复跑之间的绑定关系，不冒充新的独立数值复现。

## 3. A8P 证据链裁决

### 3.1 冻结 NO-GO 有效

A8P 的横向宽度与联合扩展门按结果前阈值失败。不得因为其他分项通过而把总裁决改写为 PASS，也不得在看到结果后放宽 10% 平均阻力门或 5% 平均速度场门。

因此，以下裁决保持有效：

`NO-GO-A8P-DISCRETE-REFERENCE-OR-MATURITY-PROTOCOL-GATES`

这是一项完整执行后的科学负结果，不是崩溃、非有限值、缺少统计窗或复跑不一致。

### 3.2 短时离散参考可以保留，但不是物理真值

A8P 使用 D2Q9 一格每接受步的最大离散传播速度，对左边界、右边界和横向周期接缝分别施加严格过去锥门。24 条短时轨迹全部位于冻结边界影响的离散过去锥之外，S1/S9 与两种宽度的公共区逐值一致。

这足以建立以下候选级结论：

- 冻结 $3D$ 时窗内存在一条不由 S1/S9 平均构造的直接有限时间轨迹；
- 该时窗内 S1、S9 和两个横向宽度尚未通过外边界影响彼此区分；
- A8O 原“严格因果参考”的声速锥缺口已被修正。

它不能建立：

- 无限域或长时物理真值；
- 网格收敛载荷；
- S1 或 S9 的物理优越性；
- 固定圆柱或涡流摆实验符合性。

### 3.3 镜像锁定与种子增长分类可以保留

名义 $Re=72$ 屏蔽点中，零种子在 96 个对流时间的升力 RMS 仍约为 $7.58\times10^{-13}$，而两种幅值、正负符号的反对称种子给出可复现增长。该结果足以否定“零种子无可检测升力等于已证明成熟稳态”的解释。

因此可以保留：

- `symmetry-lock-present`；
- `unstable-growing-not-saturated`；
- A8O 对应零种子结果只能解释为与镜像对称锁定相容。

但该分类仍有明确上限：

- 96 个对流时间时尚未饱和；
- 大、小种子增长率相对差约 22.443%，只是在冻结 25% 门内；
- 没有建立线性稳定特征值、饱和极限环或域无关统计；
- 不能把该单一屏蔽点外推为装置参数区的普遍涡脱落规律。

## 4. 横向宽度失败的正确解释

### 4.1 A8P 基准域具有高周期阻塞比

高参数点使用 $D=12$、基准横向格数 $n_y=56$，所以：

$$
\frac{W_{\mathrm{base}}}{D}=\frac{56}{12}=4.666\ldots,
$$

对应周期阵列阻塞比为：

$$
\beta_{\mathrm{base}}=\frac{D}{W_{\mathrm{base}}}=21.43\%.
$$

扩展域为 $W=7D$，对应：

$$
\beta_{\mathrm{wide}}=14.29\%.
$$

这两种几何都不是弱阻塞的孤立圆柱远场。横向周期边界把问题改写为周期圆柱阵列；从 $4.67D$ 扩展到 $7D$ 时，平均阻力变化约 15% 并不构成边界算法异常的独立证据。

### 4.2 比较发生在未饱和增长阶段

四种几何都被分类为 `unstable-growing-not-saturated`。A8P 对 $(84,96]$ 对流时间窗的平均阻力和平均场进行比较时，各轨迹仍可能位于不同的非线性增长阶段。

因此，冻结宽度门的失败混合了至少三类效应：

1. 周期镜像与高阻塞比；
2. 横向宽度对失稳增长率和非线性演化的影响；
3. 未饱和瞬态在固定绝对时窗中的阶段差异。

A8P 机器 NO-GO 保持不变，但不能将 15% 阻力差写成“成熟长时载荷对宽度不收敛”，更不能据此淘汰 S1 或 S9。

### 4.3 与公开固定圆柱包的交叉证据

公开固定圆柱包在 $Re=185$、成熟尾流和更宽周期域下已经得到：

- $10D\to20D$ 的最大载荷变化低于 0.6%；
- $15D\to20D$ 的最大载荷变化低于 0.25%；
- 下游 $19.5D\to26.5D$ 的最大载荷变化低于 0.5%；
- 上游距离 $10.5D\to14D$ 的末段变化低于 0.3%。

这些结果不能回写 A8P，也不能证明 $Re=72$ 已经域收敛；两者 Reynolds 数、分辨率、时窗和失稳阶段不同。它们只说明：仓库中已经存在一组成熟、低几何敏感性的 S1 载荷载体，继续优先扩展 A8P 的 $4.67D/7D$ 窄域矩阵会重复消耗资源，却仍不能解决固定圆柱文献载荷失配。

## 5. 当前更上游的未识别误差：Brinkman 极限路径

### 5.1 现有网格研究保持了有限惩罚模型误差

公开固定圆柱运行器实际设置：

$$
\eta_{\mathrm{lu}}
=\widehat\eta\frac{D}{U_{\mathrm{lu}}},
$$

其中 `penalizationTimeSteps` 即 $\eta_{\mathrm{lu}}$。现有网格--mask 研究固定：

$$
\widehat\eta=0.00625,
\qquad
U_{\mathrm{lu}}=0.05.
$$

所以：

| $D$ | $\eta_{\mathrm{lu}}$ |
|---:|---:|
| 16 | 2 |
| 20 | 2.5 |
| 24 | 3 |

网格加密时，惩罚时间的格子步数反而增加；无量纲惩罚时间 $\widehat\eta$ 保持不变。该序列可以研究固定 Brinkman 模型的空间离散趋势，但不是让无滑移模型误差随 $D\to\infty$ 消失的锐界面极限路径。

### 5.2 体积惩罚的一般理论要求联合收缩 $h$ 与 $\eta$

体积惩罚理论表明，标准方法的主导模型误差与惩罚时间有关，典型位移层尺度与 $\sqrt{\nu\eta}$ 同阶；固定非零 $\eta$ 时，网格加密并不自动得到精确 Dirichlet 无滑移边界。需要同时控制离散尺度、惩罚尺度和弥散 mask。

本项目的对应无量纲量为：

$$
\widehat\eta
=\eta_{\mathrm{lu}}\frac{U_{\mathrm{lu}}}{D},
$$

以及：

$$
\frac{\delta_\eta}{D}
\sim
\frac{\sqrt{\nu_{\mathrm{lu}}\eta_{\mathrm{lu}}}}{D}
=
\sqrt{\frac{\widehat\eta}{Re}}.
$$

若固定 $\eta_{\mathrm{lu}}$ 并增加 $D$，则：

$$
\widehat\eta\propto D^{-1},
\qquad
\frac{\delta_\eta}{D}\propto D^{-1/2},
$$

这才形成当前实现内可执行的候选无滑移极限路径。

这不证明惩罚尺度就是当前载荷偏高的唯一原因。现有 $D=16$ 单网格惩罚因子试验只显示有限敏感性，不能替代联合 $h$--$\eta$ 收敛审查。正确结论是：在继续开发新入口或运行规定横移之前，当前固体边界模型的连续极限身份尚未闭合。

### 5.3 方法学依据

下一路线参考以下体积惩罚研究，但不把其谱方法或连续分析直接冒充本 D2Q9--MRT 实现的资格：

1. E. W. Hester, G. M. Vasil and K. J. Burns, *Improving accuracy of volume penalised fluid-solid interactions*, Journal of Computational Physics 430 (2021) 110043, DOI: [10.1016/j.jcp.2020.110043](https://doi.org/10.1016/j.jcp.2020.110043)。
2. W. Iwakami, Y. Yatagai, N. Hatakeyama and Y. Hattori, *A New Approach for Error Reduction in the Volume Penalization Method*, Communications in Computational Physics 16 (2014) 1181--1200, DOI: [10.4208/cicp.220513.070514a](https://doi.org/10.4208/cicp.220513.070514a)。
3. R. Nguyen van Yen, D. Kolomenskiy and K. Schneider, *Approximation of the Laplace and Stokes operators with Dirichlet boundary conditions through volume penalization: a spectral viewpoint*, Numerische Mathematik 128 (2014) 301--338, DOI: [10.1007/s00211-014-0610-8](https://doi.org/10.1007/s00211-014-0610-8)。

## 6. A8Q 结果前路线

A8Q 名称冻结为：

`VP-A8Q-BRINKMAN-SHARP-INTERFACE-SCALING-SCREEN-v1`

A8Q 只筛查当前 Brinkman 弥散固体是否存在值得继续的锐界面缩放路径。它不修改正式程序，不选择新入口，不运行规定横移、weak-FSI、三维、自由表面或装置预测。

### 6.1 固定载体与几何

共同设置：

- 固定圆柱，$Re=185$；
- $U_{\mathrm{lu}}=0.05$；
- S1 只作为冻结数值载体，不赋予物理真值身份；
- 上游距离 $14D$；
- 下游距离 $19.5D$；
- 横向周期宽度 $10D$；
- 总时长 80 个对流时间，舍弃前 40 个；
- 保持 A2 修正取力、谱指标和文献目标定义不变；
- 正式 `lbm.ts` 字节不变，所有适配、诊断和合同只写候选区。

采用 $14D/19.5D/10D$ 不是声称该边界等价于来源 Whitfield--Janus 非反射条件，而是利用现有 S1 域审计中已经收窄的几何载体，减少入口距离和周期镜像对惩罚缩放筛查的混淆。

### 6.2 冻结十算例矩阵

使用两个分辨率和两个 mask 半厚度：

$$
D\in\{16,24\},
\qquad
w_\chi\in\{0.50,0.75\}\ \text{格}.
$$

候选无滑移路径固定格子惩罚时间：

$$
\eta_{\mathrm{lu}}\in\{1,2\}.
$$

另在 $D=24$ 对两个 mask 增加：

$$
\eta_{\mathrm{lu}}=3,
$$

作为现有固定 $\widehat\eta=0.00625$ 路径的控制点。唯一算例数为：

$$
2\times2\times2+2=10.
$$

全部十个算例必须按新合同从初态重新运行，不直接复用既有标量汇总；旧产物只作为结果后不得改写的外部锚。不得依据中途结果跳过某个 mask、惩罚时间或 $D=24$ 控制点。

### 6.3 必须新增的诊断

每条轨迹除现有载荷、频率、稳定和成熟指标外，至少保存：

1. 无量纲惩罚时间 $\widehat\eta$；
2. 惩罚层尺度 $\sqrt{\nu_{\mathrm{lu}}\eta_{\mathrm{lu}}}$ 及其相对直径；
3. 有效 mask 面积、等效直径与相对几何偏差；
4. 核心固体区 $\chi\ge0.99$ 的密度加权速度滑移 RMS 和最大值；
5. 过渡带 $0.01<\chi<0.99$ 的速度滑移 RMS；
6. 原始 Brinkman 反力、虚拟内部流体动量修正和最终修正载荷的分量统计；
7. 前后半窗的上述滑移与力分解漂移；
8. 全部运行身份、正式源哈希和确定性复跑身份。

核心滑移 RMS 建议冻结为：

$$
S_{\mathrm{core}}
=
\sqrt{
\frac{
\sum_{\chi\ge0.99}\rho\lvert\boldsymbol u-\boldsymbol u_s\rvert^2
}{
U_{\mathrm{lu}}^2\sum_{\chi\ge0.99}\rho
}
}.
$$

过渡带使用同一归一方式单独计算，不与核心区平均。

### 6.4 结果前门与结论上限

A8Q 必须先冻结机器合同、测试和无结果实现，再开始研究运行。至少包含以下门：

- 十条轨迹全部完成且有限；
- 现有密度、Mach 数和成熟性硬门通过；
- 旧正式源、S1、A8P 和公开基准关键哈希保持不变；
- 对每个固定 $\eta_{\mathrm{lu}}$ 和 mask，$D=24$ 的核心滑移不得高于 $D=16$；
- 对每个固定 $\eta_{\mathrm{lu}}$，两个 mask 的 $D=16\to24$ 平均阻力变化方向相容，升力 RMS 变化方向相容；若两族变化均低于 1%，可记为近平台而不强制符号；
- 每个固定 $\eta_{\mathrm{lu}}$ 在 $D=24$ 的跨 mask 最大载荷差不超过 5%；
- 原始反力、虚拟流体修正和最终载荷必须分别有限且可复算；
- 主运行与仓库外完整复跑逐字节一致。

若 $\eta_{\mathrm{lu}}=1$ 或 2 至少一条路径通过全部内部一致性门，A8Q 的最高结论只能是：

`PASS-A8Q-BRINKMAN-SCALING-PATH-CANDIDATE-ONLY-UNLOCK-A8R`

这只解锁后续三分辨率或更高分辨率的 A8R，不证明网格收敛、文献符合或锐界面资格。若两条路径都通过，两条都必须带入 A8R；不得按最接近文献的单点选择。

若两条固定 $\eta_{\mathrm{lu}}$ 路径都失败内部一致性门，则裁决为：

`NO-GO-A8Q-BRINKMAN-SCALING-PATH-INCOHERENT`

此时停止当前 Brinkman 固体路线，不运行 $D=32/40/50$，也不以新入口算法掩盖固体边界身份缺口。

任何单个算例偶然进入文献容差只能记为：

`INCONCLUSIVE-A8Q-SINGLE-POINT-LITERATURE-HIT`

不得据此校准 mask 或惩罚时间。

## 7. 暂不执行的路线

A8Q 完成并交回独立 Pro 前，不执行：

- A8P 更宽横向域的长时追加矩阵；
- S9 正式接入或 S10 开发；
- 来源式 Whitfield--Janus 边界的名义复刻；
- $D=32/40/50$ 高分辨率固定圆柱；
- 规定横移定量长时；
- weak-FSI、三维、自由表面；
- 前向理论参数拟合或实验拟合。

若 A8Q 建立候选缩放路径，A8R 再预注册三分辨率收敛、惩罚尺度与 mask 联合外推，并决定是否需要引入有独立算法身份的位移修正 mask。若 A8Q 失败，优先停止或更换固体边界离散，而不是继续加入口补丁。

## 8. 正式程序权限

当前用户指令只要求读取仓库并接续研究，没有明确授权修改正式理论或正式程序。因此本轮：

- 不修改 `01_最终理论/**`；
- 不修改 `02_模拟程序/**`；
- 不抽离正式边界接口；
- 不接入 S9；
- 不更改默认配置、UI 或 provenance；
- 不运行正式程序验证后冒充正式集成完成。

## 9. 结论上限

A8P 已经完成两个有价值的纠偏：建立真正位于 D2Q9 离散过去锥之外的有限时间直接参考，并证明高参数零种子无升力与镜像锁定相容。其冻结总 NO-GO 仍然有效。

但 A8P 横向失败发生在 $W/D=4.67$ 与 $7$ 的高周期阻塞域，并且比较对象尚未饱和。该结果不能选择入口边界，也不应触发新一轮边界补丁开发。

结合公开固定圆柱包中已经收窄的几何敏感性和持续存在的载荷偏高，当前最上游、最值得先回答的问题是：现有 Brinkman 弥散圆柱的网格序列是否真的趋向无滑移锐界面。A8Q 只负责给出这一缩放路径的候选级筛查；在它完成之前，规定横移和 weak-FSI 继续闭锁。
