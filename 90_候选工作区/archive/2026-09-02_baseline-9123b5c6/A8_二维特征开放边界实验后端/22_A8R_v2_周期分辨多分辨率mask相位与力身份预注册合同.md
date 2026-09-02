# A8R v2 周期分辨多分辨率 mask 相位与力身份预注册合同

## 1. 合同身份与结果盲边界

阶段名冻结为：

`VP-A8R-V2-CYCLE-RESOLVED-MULTIRESOLUTION-MASK-PHASE-AND-FORCE-IDENTITY-v1`

机器合同格式冻结为：

`VP-A8R-V2-CYCLE-RESOLVED-MULTIRESOLUTION-MASK-PHASE-AND-FORCE-IDENTITY-CONTRACT-v1`

本合同以仓库提交
`5a85bb9a07b10275686723667c40a6a0b39fe39c` 为结果前来源基线。
本 Markdown 与
`src/brinkman-multiresolution-contract-v2.ts` 必须位于同一个独立
提交并推送到远程 `main`。

A8R v1 合同提交
`eb4d5c41bea6de653491d7fe0d27382c7912985b` 保留为结果盲历史，
不回写、不删除。v1 在任何合同测试、无结果实现或数值运行之前已被
独立 Pro 裁决取代，因此没有 A8R v1 数值结果。

本轮只冻结 v2 Markdown 与机器合同，并更新候选 README 和交接。
本轮不创建 v1 或 v2 合同测试、科学实现、运行器、断言器或研究
产物，不执行任何 A8R 轨迹，也不执行本合同所述的烟雾测试。

## 2. 独立 Pro 裁决与结论上限

本合同绑定以下裁决：

`ACCEPT-A8R-V1-PRO-RAW-DISCRETE-CONTROL-VOLUME-IDENTITY-IN-PRINCIPLE`

`REJECT-A8R-V1-PRO-STATISTICAL-ROBUSTNESS-CONTRACT-AS-FINAL`

`REQUIRE-A8R-V2-PRO-CYCLE-RESOLVED-AND-LATTICE-PHASE-CONTRACT`

`KEEP-A8R-PRO-RESULT-BEFORE-EXECUTION-LOCKED`

A8R v2 只审查固定 $\eta_{\mathrm{lu}}=1$ 的正式
D2Q9--MRT--Brinkman 离散载体在下列结果前门下是否形成候选级
一致证据：

- $D=24$ 新运行与 A8Q 公共投影零容差一致；
- 三个固定细化比分辨率的最后六个完整脱涡周期可用；
- 平均阻力和去均值升力 RMS 的相邻分辨率增量已被周期包络分辨；
- 两个 mask 和 $D=54$ 两个格点相位通过冻结屏蔽；
- 正式原始 Brinkman 反力满足独立人口控制体离散恒等式；
- A2 虚拟内部流体修正满足独立公式重算一致性。

最高 PASS 仍只建立固定惩罚时间离散路径的候选级多分辨率、mask、
格点相位和力身份结果。它不证明惩罚层已解析、Brinkman 锐界面、
无滑移极限、连续应力积分、载荷物理资格、Richardson 外推、GCI、
正式接入、规定横移、weak-FSI、三维、自由表面、装置预测或实验
验证。

## 3. 冻结来源与 A8Q 机器锚

### 3.1 正式源、v1 与 v2 裁决

以下文件必须逐字节保持：

- 正式 `02_模拟程序/src/solvers/highFidelity/lbm.ts`，SHA-256 为
  `6949dd9f215595bde4162078f9cb026456bcbed83fd2ebd08131001e03ec2dc2`；
- v2 Pro 裁决 `21_A8R_网页版Pro独立审查与v2合同修订裁决.md`，
  SHA-256 为
  `4a8700510b12208b4d5cf48331ef0cc3e86764d759ebf4b34d0505e7925fd8ef`；
- v1 Markdown 合同，SHA-256 为
  `92bacf8992a622ab09d8b574c4085be2ea4b7a2120ec898c457f87c663429e37`；
- v1 TypeScript 机器合同，SHA-256 为
  `44b2eeb3be274d3cd11c80b1d806655bcf39809bd4b255c8fb5b5b77fa7559c6`。

正式 `01_最终理论/**`、`02_模拟程序/**`、S1、S9、A8O、A8P 和
A8Q 的科学源、产物、报告与冻结裁决均只读。v2 不把候选适配器
解释为正式程序修改。

### 3.2 A8Q 提交与文件身份

A8Q 提交链继续冻结为：

- 合同提交：`7cd475f63846d9b45da1f89e6406487cedd73042`；
- 合同测试提交：`7335ec55831c76e3a0081c8de7d8b7de18ce6059`；
- 无结果实现提交：`75e71dfc84444ed94ec15a87982efe8e4ac962c3`；
- 证据提交：`0bdd0a57d49bcf56a658c5e2bd498897dbc894c9`；
- 资格收口提交：`8b242fd2f48bfe006ad13d03ca53516ba654e15f`。

A8Q Markdown、机器合同、合同测试、支持、运行、资格汇总、运行器、
断言器和资格报告的逐文件 SHA-256 继续由 v2 机器合同冻结。不得用
报告中的四舍五入标量替代 A8Q 机器锚。

### 3.3 A8Q 产物与贴门常数

A8Q 压缩产物冻结为：

- 相对路径：
  `验证与复现/artifacts/a8-brinkman-sharp-interface-scaling-screen.json.gz`；
- 压缩字节数：22,058,158；
- 规范 JSON 字节数：100,105,555；
- 压缩 SHA-256：
  `022cc54704ac542b5c148eed5ce026f5701ae79d50426ec3417073f1148ef451`；
- 规范 JSON SHA-256：
  `16dad4a4d95eb91ad0e6f4e427d0d8ea05c8a349b479233479e03a78c6943082`；
- sidecar 文件 SHA-256：
  `d22ad3b8e1c29e00988c78aad801ee683362ca719178707be3d43873ae456e50`。

导入 A8Q 锚前必须验证压缩、规范 JSON 和 sidecar 身份。A8Q 的
$D=24,\eta_{\mathrm{lu}}=1$ 跨 mask 原始升力 RMS 相对差按

$$
d(a,b)=\frac{\lvert a-b\rvert}
{\max\left(\lvert a\rvert,\lvert b\rvert,10^{-12}\right)}
$$

精确为：

$$
d_{24,\mathrm{A8Q}}^{C_{L,\mathrm{raw\ RMS}}}
=0.04995122077720906.
$$

该值是 v2 基线相位 $D=54$ 跨 mask 聚合升力门的严格上界，不得
向上舍入为 5%。

## 4. 固定物理与数值载体

共同载体与 A8Q 保持一致：

- 固定圆柱，$Re=185$；
- 格子入口速度 $U_{\mathrm{lu}}=0.05$；
- 上游距离 $14D$；
- 下游距离 $19.5D$；
- 横向周期宽度 $10D$；
- 总时长 80 个对流时间；
- 舍弃前 40 个对流时间；
- 每条轨迹从同一均匀平衡态独立开始；
- 保持 A8Q 的 S1 数值载体、MRT、Brinkman、迁移、初态、A2 修正
  载荷和 A8Q 公共频谱字段不变。

格子运动黏度、松弛时间和无量纲惩罚时间为：

$$
\nu_{\mathrm{lu}}=\frac{U_{\mathrm{lu}}D}{Re},
$$

$$
\tau=0.5+3\nu_{\mathrm{lu}},
$$

$$
\widehat\eta
=\eta_{\mathrm{lu}}\frac{U_{\mathrm{lu}}}{D}.
$$

S1 在 A8R v2 中仍只是冻结数值载体，不获得边界物理选择或正式
入口身份。

## 5. 冻结八算例矩阵与格点相位

### 5.1 六条基线轨迹

基线矩阵冻结为：

$$
D\in\{24,36,54\},
\qquad
w_\chi\in\{0.50,0.75\}\ \text{格},
\qquad
\eta_{\mathrm{lu}}=1.
$$

细化比固定为：

$$
r=\frac{36}{24}=\frac{54}{36}=1.5.
$$

圆柱基线横向相位为：

$$
\phi_y=0.17320508075688773\ \text{格}.
$$

基线六条轨迹按 $D$ 升序、再按 $w_\chi$ 升序排列。

### 5.2 两条半格相位轨迹

在 $D=54$ 对两个 mask 各追加一条横向相位轨迹：

$$
\phi_y'=\phi_y-0.5
=-0.32679491924311227\ \text{格}.
$$

横向边界为周期边界，因此该半格平移保持连续物理几何的平移等价，
只改变圆柱相对格点的亚格点相位。两条追加轨迹按 $w_\chi$ 升序排
在六条基线轨迹之后。最终矩阵必须恰为 8 条唯一轨迹，不得依据中间
结果跳过、删除、重排或追加相位。

### 5.3 $D=24$ A8Q 公共投影

$D=24$ 两条基线相位轨迹必须从统一初态重新运行，不得从 A8Q
checkpoint 恢复。它们与 A8Q 对应锚的公共字段必须在规范 JSON
往返后逐字段、逐数组元素、零数值容差一致。公共投影至少包括：

- 数值身份、圆柱身份、有效几何和窗口身份；
- 步数、对流时间、原始反力、虚拟内部流体修正和最终载荷逐步轨迹；
- 核心与过渡带滑移逐步轨迹；
- 极值、全窗/半窗力统计、滑移统计、频谱统计、成熟门、文献字段和
  A8Q 力重组字段。

A8R v2 新增的周期、相位和独立力账字段没有 A8Q 对应字段，不进入
上述零容差投影。若公共投影不完全一致，A8R v2 证据身份无效，终局
只能是 INCONCLUSIVE。

$D=16$ 只从通过身份验证的 A8Q 产物导入为冻结历史锚；它不重新
运行、不进入 v2 三分辨率门，也不得用于四点外推。

## 6. 完整窗、诊断分块与周期分辨统计

### 6.1 固定时间窗

每条轨迹在每个接受步后采样。舍弃窗后的样本数为：

$$
N=\frac{40D}{U_{\mathrm{lu}}}=800D.
$$

继续保存：

1. 全分析窗的全部 $N$ 个样本；
2. 后半窗的最后 $N/2$ 个连续样本；
3. 按数组索引连续切分的四个 $N/4$ 样本诊断块。

四个固定时间分块不共享端点、不遗漏或重复样本，继续保存平均阻力、
平均升力、原始升力 RMS、去均值升力 RMS、Strouhal 数和归一频谱
幅值。但是分块只作非平稳性和实现诊断，不得直接改变 PASS、
INCONCLUSIVE 或 NO-GO，也不得用于挑选周期、mask、相位或分辨率。

原始和窗口去均值升力 RMS 继续定义为：

$$
C_{L,\mathrm{raw\ RMS}}
=\sqrt{\frac{1}{N}\sum_{n=1}^{N}C_{L,n}^{2}},
$$

$$
C_{L,\mathrm{fluc\ RMS}}
=\sqrt{\frac{1}{N}\sum_{n=1}^{N}
\left(C_{L,n}-\overline C_L\right)^2}.
$$

### 6.2 正斜率过零点

先用完整分析窗平均升力去均值：

$$
z_k=C_{L,k}-\overline C_{L,\mathrm{analysis}}.
$$

当且仅当相邻样本满足
$z_k\le0$ 且 $z_{k+1}>0$ 时，登记一个正斜率过零点。过零时间按
线性插值：

$$
t_\times=t_k
-z_k\frac{t_{k+1}-t_k}{z_{k+1}-z_k}.
$$

这一谓词使落在离散样本上的精确零只登记一次。过零时间必须严格
递增；重复或非有限过零时间使该轨迹的周期证据无效。

每条轨迹至少需要 7 个有效正斜率过零点。只保留时间上最后 7 个，
它们定义最后 6 个完整脱涡周期。少于 7 个时，不把短窗解释成稳态
或路线失败，A8R v2 终局为 INCONCLUSIVE。

### 6.3 周期积分与逐周期字段

每个过零边界上的信号值使用相邻样本线性插值。每个完整周期内的
积分使用端点插值后的分段线性复合梯形规则，不通过整步取整移动周期
边界。

对第 $j$ 个周期，令
$T_j=t_{\times,j+1}-t_{\times,j}$。必须分别保存：

- 周期 $T_j$ 和 $St_j=1/T_j$；
- 周期平均阻力和平均升力；
- 周期原始升力 RMS；
- 相对完整分析窗平均升力的周期去均值升力 RMS。

对任意周期信号 $q(t)$，周期平均和 RMS 按：

$$
\langle q\rangle_j
=\frac{1}{T_j}\int_{t_{\times,j}}^{t_{\times,j+1}}q(t)\,dt,
$$

$$
q_{\mathrm{RMS},j}
=\sqrt{\frac{1}{T_j}
\int_{t_{\times,j}}^{t_{\times,j+1}}q(t)^2\,dt}.
$$

六周期聚合平均和 RMS 直接在六周期并集上按实际周期时长加权积分，
不得先对六个周期 RMS 作无权平均。聚合周期是六个 $T_j$ 的算术
平均，聚合 Strouhal 是该平均周期的倒数。

每个周期指标还必须保存六个逐周期值的最小值、最大值和中位数。
六个值的中位数定义为升序排列后第 3 与第 4 个值的算术平均。闭区间

$$
I_Q=[Q_{\min},Q_{\max}]
$$

称为确定性周期包络。它只描述冻结六周期的确定性散布，不得称为
统计置信区间、误差条或总体分布估计。

## 7. 几何、滑移、稳定与成熟诊断

每条轨迹继续保存：

- 有效 mask 面积 $A_\chi=\sum_i\chi_i$；
- 等效直径 $D_{\mathrm{eq}}=\sqrt{4A_\chi/\pi}$；
- 有符号和绝对相对几何偏差；
- 核心区 $\chi\ge0.99$ 的密度加权滑移 RMS 与逐点最大滑移；
- 过渡带 $0.01<\chi<0.99$ 的密度加权滑移 RMS 与逐点最大滑移；
- mask 数组摘要和核心/过渡带格点数。

惩罚层格子尺度和尺度比继续冻结为：

$$
\delta_{\eta,\mathrm{lu}}
=\sqrt{\nu_{\mathrm{lu}}\eta_{\mathrm{lu}}},
$$

$$
R_{\chi/\eta}
=\frac{w_\chi}{\delta_{\eta,\mathrm{lu}}}.
$$

每条轨迹必须保存
`penaltyLayerAtLeastOneCell = (deltaEtaLu >= 1)`。该字段只界定结论
上限，不是 v2 离散 PASS 的必要条件；只要它为假，锐界面、无滑移
极限、Richardson 外推和 GCI 就保持 NO-GO。

八条轨迹必须全部完成、唯一、有限并通过 A8Q 延续硬门：

- 最大密度偏差不超过 0.08；
- 最大 Mach 数不超过 0.30；
- 全窗原始升力 RMS 大于 $10^{-3}$；
- 前后半窗平均阻力相对漂移不超过 5%；
- 前后半窗原始升力 RMS 相对漂移不超过 10%。

四诊断块不参与上述成熟门。周期覆盖单独要求至少 7 个有效正斜率
过零点。运行崩溃、缺算例、非有限值、来源漂移、锚不一致、周期
不足或复跑不一致属于证据不完整，不能写成物理路线 NO-GO。

## 8. 独立原始人口动量恒等式

### 8.1 固定内部控制体与支撑包含

对每个分辨率、mask 和相位使用同一无量纲控制体：

$$
\Omega_D=
\left\{(x,y):
\lvert x-x_c\rvert\le3D,
\ \lvert y-y_c\rvert\le3D
\right\}.
$$

节点归属按该谓词直接判定，不按结果调整整数边界。必须同时验证：

- 控制体及一链路 halo 完全位于全局左右边界和横向周期接缝内部；
- 控制面及一链路 halo 的最大 mask 精确为 0；
- 全局每个非零 mask 格点均属于控制体；
- 全局每个非零 Brinkman 力格点均属于控制体。

任一条件失败时，原始人口动量恒等式证据无效，终局为
INCONCLUSIVE。

### 8.2 步前、步后人口与链路通量

令 $f_i^n(\boldsymbol x)$ 为一次接受步开始时的人口，
$f_i^{n+1}(\boldsymbol x)$ 为正式 `solver.step()` 完成后的人口，
$\boldsymbol c_i$ 为冻结 D2Q9 速度。控制体人口动量为：

$$
\boldsymbol P_\Omega^n
=\sum_{\boldsymbol x\in\Omega_D}
\sum_{i=0}^{8}\boldsymbol c_i f_i^n(\boldsymbol x).
$$

控制体和一链路 halo 均在全局边界内部，因此正式 Zou--He 覆盖不
进入控制体链路。碰撞后跨控制面的迁移值可以从步后目的格点人口
唯一重建。净向外链路动量冻结为：

$$
\boldsymbol\Phi_\Omega^n=
\sum_{\substack{
\boldsymbol x\in\Omega_D\\
\boldsymbol x+\boldsymbol c_i\notin\Omega_D}}
\boldsymbol c_i f_i^{n+1}(\boldsymbol x+\boldsymbol c_i)
-\sum_{\substack{
\boldsymbol x\notin\Omega_D\\
\boldsymbol x+\boldsymbol c_i\in\Omega_D}}
\boldsymbol c_i f_i^{n+1}(\boldsymbol x+\boldsymbol c_i).
$$

独立重建的原始固体反力为：

$$
\boldsymbol F_{\mathrm{CV,raw}}^n
=-\left(
\boldsymbol P_\Omega^{n+1}
-\boldsymbol P_\Omega^n
+\boldsymbol\Phi_\Omega^n
\right).
$$

该值只能由步前/步后人口、固定控制体和 D2Q9 速度构造。构造期间
禁止读取正式 `forceX`、`forceY`、`penaltyReaction()`、
`bodyForceImpulse*` 或 `rawReactionImpulse*`。只有独立值构造完成
后，才允许读取正式 `BrinkmanStepExchange.rawReactionImpulse*`
作为比较对象。

该门命名为 `independentRawPopulationMomentumIdentity`。通过只证明
正式原始 Brinkman 反力满足内部离散人口动量恒等式，不证明连续
应力、锐界面力或实验载荷真值。

## 9. 独立宏观重建与绝对舍入账

### 9.1 独立宏观量和逐格 Brinkman 力

步前和步后宏观量必须从只读人口独立重建。对每格：

$$
\rho=\sum_{i=0}^{8}f_i,
$$

$$
\boldsymbol u_{\mathrm{raw}}
=\frac{\sum_i\boldsymbol c_i f_i}{\rho},
$$

$$
\boldsymbol u
=\frac{\boldsymbol u_{\mathrm{raw}}
+\tfrac12(\chi/\eta_{\mathrm{lu}})\boldsymbol u_s}
{1+\tfrac12\chi/\eta_{\mathrm{lu}}},
$$

$$
\boldsymbol F_B
=\rho\frac{\chi}{\eta_{\mathrm{lu}}}
\left(\boldsymbol u_s-\boldsymbol u\right).
$$

mask 必须由冻结解析圆柱指标重建并与只读正式 mask 逐格一致。独立
重建的 $\boldsymbol F_B$ 只用于支撑检查、逐格绝对舍入账和 A2
公式审计，不得替代人口控制体公式构造原始反力。

### 9.2 原始力绝对账

对每个分量 $\alpha\in\{x,y\}$，按固定遍历顺序保存以下非负补偿
和：

$$
A_{\mathrm{pre},\alpha}^n
=\sum_{\boldsymbol x\in\Omega_D}
\sum_{i=0}^{8}
\left\lvert c_{i,\alpha}f_i^n(\boldsymbol x)\right\rvert,
$$

$$
A_{\mathrm{post},\alpha}^n
=\sum_{\boldsymbol x\in\Omega_D}
\sum_{i=0}^{8}
\left\lvert c_{i,\alpha}f_i^{n+1}(\boldsymbol x)\right\rvert,
$$

$$
A_{\mathrm{link},\alpha}^n
=\sum_{\text{全部进出控制面链路}}
\left\lvert c_{i,\alpha}
f_i^{n+1}(\text{目的格点})\right\rvert,
$$

$$
A_{B,\alpha}^n
=\sum_{\text{全局全部格点}}
\left\lvert F_{B,\alpha}^n\right\rvert.
$$

原始力绝对账为：

$$
A_{\mathrm{raw},\alpha}^n
=A_{\mathrm{pre},\alpha}^n
+A_{\mathrm{post},\alpha}^n
+A_{\mathrm{link},\alpha}^n
+A_{B,\alpha}^n.
$$

不得用某个聚合量的绝对值替代逐人口、逐链路或逐格绝对值求和。

### 9.3 A2 逐格绝对账

A2 修正另保存：

$$
A_{\chi,\mathrm{pre},\alpha}^n
=\sum_{\text{全局全部格点}}
\left\lvert\chi\rho^n u_\alpha^n\right\rvert,
$$

$$
A_{\chi,\mathrm{post},\alpha}^n
=\sum_{\text{全局全部格点}}
\left\lvert\chi\rho^{n+1}u_\alpha^{n+1}\right\rvert.
$$

所有人口和绝对项使用 Neumaier 补偿求和。人口顺序固定为先 $y$、
后 $x$、最后 D2Q9 方向 0 至 8；链路顺序固定为源格点 $y$、$x$、
方向 0 至 8；逐格力和 $\chi\rho u$ 顺序固定为先 $y$、后 $x$。

### 9.4 两类舍入上界

系数尺度冻结为：

$$
q_D=\frac12U_{\mathrm{lu}}^2D.
$$

原始力和 A2 上界分别为：

$$
B_{\mathrm{raw},\alpha}^n
=4096\epsilon_{\mathrm{mach}}
\max\left(
\frac{A_{\mathrm{raw},\alpha}^n}{q_D},
\epsilon_{\mathrm{mach}}
\right),
$$

$$
B_{\mathrm{A2},\alpha}^n
=4096\epsilon_{\mathrm{mach}}
\max\left(
\frac{A_{\mathrm{raw},\alpha}^n
+A_{\chi,\mathrm{pre},\alpha}^n
+A_{\chi,\mathrm{post},\alpha}^n}{q_D},
\epsilon_{\mathrm{mach}}
\right).
$$

八条轨迹的每个接受分析步、每个分量都必须保存各部分绝对账和两类
上界。不得用全窗平均抵消逐步失败。

## 10. A2 公式独立重算门

从第 9 节独立人口宏观量重算虚拟内部流体修正：

$$
\Delta\boldsymbol P_\chi^n
=\sum_{\text{全局全部格点}}
\chi\left(
\rho^{n+1}\boldsymbol u^{n+1}
-\rho^n\boldsymbol u^n
\right).
$$

独立 A2 载荷为：

$$
\boldsymbol F_{\mathrm{CV,A2}}^n
=\boldsymbol F_{\mathrm{CV,raw}}^n
+\Delta\boldsymbol P_\chi^n.
$$

对每个分量和每个接受分析步，必须分别满足：

$$
\left\lvert
C_{\mathrm{CV,raw},\alpha}^n
-C_{\mathrm{formal,raw},\alpha}^n
\right\rvert
\le B_{\mathrm{raw},\alpha}^n,
$$

$$
\left\lvert
C_{\Delta\chi,\alpha}^n
-C_{\mathrm{formal},\Delta\chi,\alpha}^n
\right\rvert
\le B_{\mathrm{A2},\alpha}^n,
$$

$$
\left\lvert
C_{\mathrm{CV,A2},\alpha}^n
-C_{\mathrm{formal,A2},\alpha}^n
\right\rvert
\le B_{\mathrm{A2},\alpha}^n.
$$

第一式属于 `independentRawPopulationMomentumIdentity`；后两式属于
`independentA2FormulaRecomputation`。两个门独立且不可互相替代，
原始力失败不得被 A2 修正的抵消掩盖。

A2 门通过只证明同一 A2 公式由独立人口宏观重建后仍与正式候选
载荷实现一致。它不是第二种物理取力法，不得写成独立连续应力积分、
外部载荷资格或实验验证。

## 11. 周期包络与三值增量门

### 11.1 适用指标

只对基线相位的六条轨迹判定相邻分辨率趋势。对每个 mask 分别审查：

- 六周期聚合平均阻力；
- 六周期聚合的完整分析窗均值去除后升力 RMS。

门值不使用四个固定时间分块。每个分辨率的判定区间来自六个逐周期
值的确定性包络：

$$
I_{24}=[L_{24},U_{24}],
\quad
I_{36}=[L_{36},U_{36}],
\quad
I_{54}=[L_{54},U_{54}].
$$

### 11.2 Minkowski 差区间

两个相邻增量区间冻结为：

$$
I_{\Delta_1}
=I_{36}\ominus I_{24}
=[L_{36}-U_{24},\ U_{36}-L_{24}],
$$

$$
I_{\Delta_2}
=I_{54}\ominus I_{36}
=[L_{54}-U_{36},\ U_{54}-L_{36}].
$$

对于严格排除零的区间 $I=[L,U]$，绝对下界和上界定义为：

$$
a_{\min}(I)=\min(\lvert L\rvert,\lvert U\rvert),
\qquad
a_{\max}(I)=\max(\lvert L\rvert,\lvert U\rvert).
$$

### 11.3 三值分类

每个 mask 和指标只能得到下列三种状态之一。

`RESOLVED-PASS`：两个增量区间均严格排除零、位于零的同一侧，并且

$$
a_{\max}(I_{\Delta_2})
<a_{\min}(I_{\Delta_1}).
$$

`RESOLVED-NO-GO`：证据完整并满足以下任一条件：

- 两个增量区间均严格排除零，但位于零的相反两侧；
- 两个增量区间均严格排除零，并且
  $a_{\min}(I_{\Delta_2})\ge a_{\max}(I_{\Delta_1})$。

`UNRESOLVED-INCONCLUSIVE`：其余全部包含零、周期包络重叠或无法严格
比较的情形。

若三个分辨率的六周期值形成精确平台，则两个增量区间均为 $[0,0]$，
按 Pro 的“包含零”规则判 `UNRESOLVED-INCONCLUSIVE`，明确不得判
NO-GO。后续合同测试必须覆盖同向缩小、反向、已分辨不缩小、未分辨
重叠和精确平台五类人工样例。

### 11.4 核心滑移门

对每个 mask 的六条基线轨迹，全分析窗核心滑移 RMS 仍必须满足：

$$
S_{\mathrm{core},24}
\ge S_{\mathrm{core},36}
\ge S_{\mathrm{core},54}.
$$

在来源、周期、相位和力证据均完整且已分辨的前提下，任一相邻加密
使核心滑移升高，属于离散路线 NO-GO。

## 12. $D=54$ 双 mask、双相位屏蔽

四条 $D=54$ 组合为两个 mask 与两个冻结相位的笛卡尔积。对原始
升力 RMS 和完整分析窗均值去除后的升力 RMS，必须分别保存：

- 每个相位内两个 mask 的六周期聚合相对差；
- 每个 mask 在两个相位间的六周期聚合相对差；
- 四个组合的全部六个无序轨迹对之间的相对差；
- 每个轨迹对的 $6\times6=36$ 个逐周期笛卡尔积相对差及其最坏值。

不同轨迹之间不得独立挑选最有利周期，也不要求不同相位的周期按
绝对时间对齐。

双 mask、双相位门必须同时满足：

1. 基线相位的聚合原始和去均值升力 RMS 跨 mask 差均严格小于
   0.04995122077720906；
2. 每个相位内的聚合跨 mask 差均严格小于 0.05；
3. 每个 mask 的聚合跨相位差均严格小于 0.05；
4. 四个组合任意轨迹对、任意两个逐周期值的最坏相对差均严格小于
   0.05。

同时记录四组合的平均阻力、平均升力、平均周期和 Strouhal 差异，
但这些附加诊断不替代升力 RMS 门。

任一 mask 或相位门未通过、等于阈值或周期包络不足时，终局为
`INCONCLUSIVE-A8R-V2-STATISTICS-PHASE-MARGIN-OR-FORCE-IDENTITY`，
不得把单相位有利结果提升为 mask 稳健，也不得将格点相位敏感性
直接写成物理路线 NO-GO。

## 13. 文献接近度屏蔽

固定观察目标和绝对容差保持为：平均阻力 $1.287\pm0.05$、升力
RMS $0.443\pm0.04$、Strouhal 数 $0.195\pm0.005$。

该字段只命名为 `literatureProximityScreen`。必须对四个 $D=54$
mask--相位组合分别记录接近度，不得使用 `externalQualification`、
“载荷资格”或“物理验证”等名称。

文献接近度不得改变 A8R v2 三终局代码，不得用于选择 mask、相位、
分辨率或统计周期。单个或全部组合命中都不建立相同边界、近壁表示、
取力路径或连续物理身份。

## 14. 终局语义与判定优先级

终局只允许以下三种代码：

`PASS-A8R-V2-DISCRETE-MULTIRESOLUTION-MASK-PHASE-CANDIDATE-ONLY`

`INCONCLUSIVE-A8R-V2-STATISTICS-PHASE-MARGIN-OR-FORCE-IDENTITY`

`NO-GO-A8R-V2-RESOLVED-BRINKMAN-DISCRETE-ROUTE`

判定优先级冻结为：

1. 若来源、算例、有限性、$D=24$ 锚、复跑、周期覆盖、原始人口
   恒等式或 A2 公式重算证据不完整，判 INCONCLUSIVE；
2. 若周期增量趋势未分辨，或双 mask、双相位门未通过或未分辨，
   判 INCONCLUSIVE；
3. 只有在证据完整、周期趋势和相位裕量均已分辨的前提下，稳定性、
   成熟性、核心滑移或任一指标的 `RESOLVED-NO-GO` 才判路线 NO-GO；
4. 只有来源、稳定、成熟、周期趋势、双 mask、双相位、原始人口
   恒等式和 A2 公式重算全部通过，才判 PASS。

文献接近度只作独立观察，不改变上述优先级。任何 PASS 只允许再次
交回独立 Pro，不自动解锁正式程序、规定横移或 weak-FSI。任何
NO-GO 只否定本合同冻结的 Brinkman 离散路线，不自动选择 S1、S9、
S10 或另一固体算法。

## 15. 产物、测试计划与结果前提交顺序

### 15.1 冻结产物身份

后续若获独立 Pro 接受，无结果实现必须使用：

- 机器产物格式：
  `VP-A8R-V2-CYCLE-RESOLVED-MULTIRESOLUTION-MASK-PHASE-FORCE-IDENTITY-ARTIFACT-v1`；
- 相对路径：
  `验证与复现/artifacts/a8-brinkman-cycle-resolved-multiresolution-phase-force-identity.json.gz`；
- sidecar 路径：
  `验证与复现/artifacts/a8-brinkman-cycle-resolved-multiresolution-phase-force-identity.sha256`；
- gzip level 9、mtime 0；
- 禁止时间戳和非有限 JSON 值；
- 八算例确定性顺序；
- 仓库外干净克隆完整复跑与逐字节一致断言。

烟雾测试和合成场输出不得进入研究产物。

### 15.2 后续合同测试计划

只有 v2 再次获得独立 Pro 接受后，才允许另建合同测试提交。测试
至少覆盖：

- 唯一八算例矩阵、顺序、$r=1.5$、双相位和新鲜初态；
- $D=24$ 基线轨迹与 A8Q 公共投影清单和零容差；
- A8Q 压缩、规范 JSON 和 sidecar 身份；
- 四诊断块无重叠、无遗漏且不进入终局；
- 正斜率过零点、精确离散零去重、线性插值和末六周期选择；
- 周期端点梯形积分、聚合值、最小值、最大值和偶数中位数；
- 同向缩小、反向、已分辨不缩小、未分辨重叠和精确平台；
- 双 mask、双相位、36 周期对比较和严格阈值；
- 只读人口视图与公开 checkpoint 逐元素相等；
- 合成 D2Q9 人口场的控制体链路方向、进出符号和动量闭合；
- 全部非零 mask 与 Brinkman 力支撑包含；
- 原始人口恒等式与 A2 公式重算的门和绝对账完全分离；
- 禁止 Richardson、GCI、载荷资格、正式接入和下游物理授权。

除合成场外，后续测试必须包含两个正式求解器烟雾恒等式：

- $D=24$、$w_\chi=0.75$、基线相位、固定圆柱、40 个接受步；
- 相同数值载体、`body=null`、40 个接受步。

两个烟雾测试均不得超过 40 步，不得写研究产物或用于修改门值。

### 15.3 后续无结果实现与提交顺序

若后续获接受，提交顺序必须是：

1. 本 v2 Markdown 与机器合同独立提交；
2. v2 合同测试单独提交；
3. 无结果实现、支持测试、运行器、断言器、包入口和精确 LFS 规则
   单独提交；
4. 三个结果前提交均已推送、工作树干净且祖先关系通过机器检查后，
   才允许执行第一条研究轨迹。

正式求解器只通过公开 `solver.step()` 推进。候选适配不得写正式
私有数组、复制或替换正式碰撞步、checkpoint 覆盖、限幅、自动
fallback，也不得按分辨率、mask 或相位特判物理逻辑。

## 16. 当前停止条件与禁止事项

本轮在 v2 Markdown 与机器合同完成解析、数学、实际渲染、类型检查、
独立提交和推送，并更新 README 与交接后停止，再次交回独立 Pro。

在 v2 获得新的独立 Pro 接受前，禁止：

- 创建 v1 或 v2 合同测试；
- 创建 A8R 无结果科学实现、运行器或断言器；
- 执行任何 A8R $D=24,36,54$ 或格点相位研究轨迹；
- 执行本合同中的强迫或无强迫烟雾测试；
- 修改 A8Q 科学源、产物、报告或冻结门；
- 修改正式理论或正式程序；
- 使用旧标量替代 A8Q 机器锚；
- 结果后改变矩阵、mask、相位、周期窗、控制体、容差或判定优先级；
- 输出 Richardson 外推、GCI、锐界面、无滑移极限或载荷物理资格；
- 按文献接近程度选参；
- 开发 S10、接入 S9 或修改开放边界；
- 运行规定横移、weak-FSI、三维、自由表面、装置预测或实验拟合。
