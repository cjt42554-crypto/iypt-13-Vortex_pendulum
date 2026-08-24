# R2：独立高保真计算方法、分层后端与验证合同

> **状态**：F1“场方程冻结”和 F4“软件接口冻结”的候选数值备忘录；不是已经完成三维 CFD 的报告。当前国赛软件交付推荐只实现易修改的二维参考后端，三维内容是论文级数值路线与升级接口，不是本轮必须交付或通过的门。
> **对象**：固定顺流轴的一自由度刚性旋转摆（canonical P0）。平衡时圆柱轴竖直，圆柱表面贯穿自由表面，具有有限湿跨，置于有限自由表面水槽中。四杆/平行四边形机构使圆柱始终竖直平移的 V1 只作为独立对照，不得复用 P0 的几何、惯量或湿面。
> **核验日期**：2026-08-20（Asia/Singapore）。文末所有外部技术来源均为原始论文或官方软件文档；访问日期统一列出。
> **最重要的证据边界**：本文给出可实现、可验证、可暂停恢复的算法合同；当前仓库尚无高保真求解器，本文也没有运行任何三维 Navier–Stokes、自由表面、FSI、网格收敛或三维转捩计算。只有 WORKLOG 已记录的精确静水几何脚本实际运行过，不能据此把 CFD 标成“通过”。

---

## 0. 结论先行

1. canonical 的参考高保真路径应是**单液相、恒大气压、自由面和刚体面均贴体的三维 ALE，不可压 Navier–Stokes + 1DOF 刚体转动**。空间采用曲边界二次等参 Taylor–Hood $P_2/P_1$ 有限元，时间采用满足离散几何守恒律的二阶 BDF，表面张力用表面 Laplace–Beltrami 弱式，流体、自由面、网格和摆角在同一 Newton 系统中强耦合。第一套可实现算例 C0 是“钉扎材料线 + 无滑”的数学/代码验证基准，结果必须标 wetting=C0-unvalidated-benchmark；它不是实物 canonical 的先验润湿选择。实物候选优先在 C1a 接触角滞后活动集和 C1b Navier 滑移—动态接触角之间，由材料水线观测冻结。
2. 当自由面翻卷、断裂、夹气、接触线大范围滑动或 ALE 网格无法保持可逆时，升级到**显式两相、几何 PLIC-VOF + balanced-force 表面张力 + 保守 cut-cell/保守 overset 刚体处理**。普通非保守 overset 插值会制造质量缺陷和高频假力，不能作为 VIV 的默认实现；level set 只可作为曲率/法向辅助，不能单独承担液体质量。
3. 统一平台至少有两个诚实的数值等级：
   - cfd2d-strip-reference：浏览器 A0-preview 与普通工作站 A1-reference 共用的二维截面求解族。它是“受限二维/strip-theory 参考”，不是三维 DNS，也不包含真实自由表面端区。A1 通过二维基准后可研究二维固定圆柱 $C_D,C_L,St$、规定运动相位以及理想完全相干上界；不能定量给出 canonical 的总力矩、实际锁频边界、端涡、跨向失相干、Mode A/B 或表面波。
   - cfd3d-fs-fsi-local：本地 CPU/GPU/MPI 的真实三维有限槽自由表面 FSI；只有逐工况通过空间、时间、域、统计窗和守恒审计后，才可在相应验证包络内称“3D DNS/LES 结果”。
   **本轮国赛实现只推荐前者**：先完成可跑、可读、可改的固定圆柱和规定运动二维求解，可选加入弱 FSI；三维后端只冻结接口和升级条件，不作为本轮软件验收失败项。
4. $Re$、湿长径比、阻塞和 $Fr$ 不能由一个“最大 Reynolds 数”开关代表。浏览器后端的物理二维性警戒以理想无限圆柱 Mode A 的 $Re_A=188.5\pm1.0$ 为**升级提示**，不是本装置阈值；表面贯穿和有限湿跨从几何上已经是 $O(1)$ 三维端条件。
5. 力矩必须在同一湿面、同一时层直接积分，并用弱反力和固定惯性控制体角动量作两条独立复核。接口离散必须满足“速度映射与牵引映射代数共轭”，从而逐步实现 $Q_\theta\dot\theta=P_{\Gamma_b}$。先积合力再乘固定力臂、在完整 NS 外再加附加质量、或把二维线力直接当 N，均判为阻断性错误。
6. 验证顺序必须是：MMS/GCL/解析极限（code verification）→ 单物理基准 → 规定运动 → 强耦合 FSI → canonical 的三维 solution verification → 与实验的 validation。至少三套系统加密网格、三档时间步、域宽/入口/出口/物理跨度/阻塞/统计窗/初始尾流敏感性和 GCI 或等价不确定度全部进入验收。

---

## 1. canonical、坐标、状态与连续数值目标

### 1.1 唯一允许的 canonical 映射

采用右手实验室坐标：$x$ 从入口指向出口，$y$ 为横流正向，$z$ 竖直向上；固定枢轴线为 $O+\xi\boldsymbol e_x$。摆角 $\theta>0$ 按 $+\boldsymbol e_x$ 右手定则，使圆柱轴向 $+y$ 倾斜。定义

$$
\boldsymbol d(\theta)=\sin\theta\,\boldsymbol e_y-
\cos\theta\,\boldsymbol e_z,
\qquad
\boldsymbol c(\theta)=\cos\theta\,\boldsymbol e_y+
\sin\theta\,\boldsymbol e_z .
\tag{N1}
$$

圆柱半径 $R=D/2$，轴向材料坐标 $r\in[\ell_t,\ell_b]$。实体和任意刚体材料点为

$$
\begin{aligned}
\mathcal C(\theta)=\{\,&O+r\boldsymbol d(\theta)
+\xi\boldsymbol e_x+v\boldsymbol c(\theta):\\
&r\in[\ell_t,\ell_b],\ \xi^2+v^2\le R^2\},\\
\boldsymbol x_b(\boldsymbol X,\theta)&=O+R_x(\theta)\boldsymbol X,
\qquad
\boldsymbol J_\theta=\partial_\theta\boldsymbol x_b
=\boldsymbol e_x\times(\boldsymbol x_b-O).
\end{aligned}
\tag{N2}
$$

因此刚体面速度为

$$
\boldsymbol u_b=\boldsymbol J_\theta\dot\theta,
\qquad \boldsymbol\omega_b=\dot\theta\boldsymbol e_x .
\tag{N3}
$$

自由面用 $\Gamma(t)$ 或 $F(\boldsymbol x,t)=z-\eta(x,y,t)=0$ 表示；真实湿面、干面和圆柱接触线分别是

$$
S_w=\partial\mathcal C\cap\{F\le0\},\qquad
S_d=\partial\mathcal C\cap\{F>0\},\qquad
\mathcal C_b=\partial\mathcal C\cap\{F=0\}.
\tag{N4}
$$

侧面、上/下端盖必须分别作曲面求积。任何只输入一个 pendulumLength、一个“浸没长度”或一个“水动力中心”的求解器都没有消费 canonical 几何。

### 1.2 完整三维单液相母方程

液体域为 $\Omega_f(t)$，密度 $\rho$、动力黏度 $\mu$，网格速度 $\boldsymbol w$，表压 $p=p_{abs}-p_a$。ALE 形式为

$$
\rho\left[
\left.\partial_t\boldsymbol u\right|_{\widehat{\boldsymbol x}}
+((\boldsymbol u-\boldsymbol w)\cdot\nabla)\boldsymbol u
\right]
=-\nabla p+\nabla\cdot(2\mu\boldsymbol D)+\rho\boldsymbol g,
\qquad \nabla\cdot\boldsymbol u=0,
\tag{N5}
$$

其中 $\boldsymbol D=(\nabla\boldsymbol u+\nabla\boldsymbol u^T)/2$，$\boldsymbol g=-g\boldsymbol e_z$。ALE 映射的 Jacobian $J$ 必须满足

$$
\partial_tJ=J\nabla\cdot\boldsymbol w .
\tag{N6}
$$

自由面取从液体指向空气的单位法向 $\boldsymbol n$，曲率约定 $\kappa=-\nabla_s\cdot\boldsymbol n$。基线运动学和动力学条件为

$$
(\boldsymbol u-\boldsymbol w)\cdot\boldsymbol n=0,
\qquad
(-p\boldsymbol I+2\mu\boldsymbol D)\boldsymbol n
=\gamma\kappa\boldsymbol n
\quad\text{on }\Gamma(t).
\tag{N7}
$$

边界合同是：

- 固定侧壁和槽底：$\boldsymbol u=\boldsymbol0$；
- 圆柱湿面：按下述 C0/C1 之一施加；两者都保持法向不穿透并双向传递牵引；
- 入口：规定经过实验标定并与液位相容的 $\boldsymbol u_{in}(y,z,t)$ 及入射自由面特征，禁止同时超定压力；
- 出口：静水一致牵引/特征辐射条件，加足够长的吸收带；出现回流时使用能量稳定的回流项；
- 开放自由面边缘：输入/输出的重力—毛细波特征与平均液位相容。

C0 数学基准取

$$
\boldsymbol u=\boldsymbol u_b,\qquad
\boldsymbol w=\boldsymbol u_b,\qquad
\boldsymbol V_{\mathcal C_b}=\boldsymbol u_b .
$$

不得同时钉扎材料线和强加固定接触角。实物候选 C1 则取

$$
\begin{gathered}
(\boldsymbol u-\boldsymbol u_b)\!\cdot\boldsymbol n_b=0,\qquad
\boldsymbol P_b\boldsymbol\sigma\boldsymbol n_b
=\beta_s\boldsymbol P_b(\boldsymbol u-\boldsymbol u_b),
\qquad \beta_s=\mu/\ell_s>0,\\
(\boldsymbol V_{\mathcal C_b}-\boldsymbol u)\!\cdot\boldsymbol n=0,\qquad
(\boldsymbol V_{\mathcal C_b}-\boldsymbol u_b)\!\cdot\boldsymbol n_b=0 .
\end{gathered}
$$

C1 的 ALE 网格只在圆柱面法向随刚体，接触线节点随
$\boldsymbol V_{\mathcal C_b}$，允许表面节点切向重分布。取 $\boldsymbol m_s$ 指向固面上的前进润湿方向，使 $V_{cl}>0$ 表示润湿面积增加。C1a 用滞后互补图：
$\theta_R<\theta_d<\theta_A\Rightarrow V_{cl}=0$，
$\theta_d=\theta_A\Rightarrow V_{cl}\ge0$，
$\theta_d=\theta_R\Rightarrow V_{cl}\le0$；活动集必须保存切换方向和互补余量。C1b 用
$$
\gamma(\cos\theta_e-\cos\theta_d)=\zeta_{cl}V_{cl},
\qquad
V_{cl}=(\boldsymbol V_{\mathcal C_b}-\boldsymbol u_b)
\!\cdot\boldsymbol m_s .
$$
参数 $\ell_s,\theta_R,\theta_A,\theta_e,\zeta_{cl}$ 必须由材料/水线观测及不确定度冻结，不能作为“第一性原理默认值”。

### 1.3 真实广义力矩和机械方程

取 $\boldsymbol n_b$ 为从刚体指向液体的法向，$\boldsymbol m$ 为自由表面内、指向自由面片外的余法向。压力、黏性和毛细线力给出的广义力矩为

$$
\boxed{
Q_\theta^f=
\int_{S_w}
[(-p\boldsymbol I+2\mu\boldsymbol D)\boldsymbol n_b]
\cdot\boldsymbol J_\theta\,\mathrm dS
-\oint_{\mathcal C_b}\gamma\boldsymbol m\cdot
\boldsymbol J_\theta\,\mathrm d\ell .}
\tag{N8}
$$

生产输出必须同时保存 $Q_p,Q_\mu,Q_\gamma$，并满足 $Q_\theta^f=Q_p+Q_\mu+Q_\gamma$。P0 的机械式为

$$
I_O\ddot\theta+c_\theta\dot\theta+
\partial_\theta[V_g(\theta)+V_{sus}(\theta)]
=Q_\theta^f+Q_\theta^{ext}.
\tag{N9}
$$

若 $p$ 已含静水压，式 (N9) 不得再加静水浮力势；若为专门的动态压力分裂分支，输入清单必须固定 hydrostaticAccounting=split，并把精确 $\Pi_h'(\theta)$ 放在左端。完整 NS 分支也不得另加附加质量或“流体阻尼”。

### 1.4 功率和总能量是离散设计目标，不只是后处理

刚体所得的压力—黏性—毛细功率恒等式为

$$
P_{f\to b}=Q_\theta^f\dot\theta
=\int_{S_w}(\boldsymbol\sigma\boldsymbol n_b)
\cdot\boldsymbol u_b\,\mathrm dS
-\oint_{\mathcal C_b}\gamma\boldsymbol m\cdot
\boldsymbol u_b\,\mathrm d\ell .
\tag{N10}
$$

连续审计能量按润湿分支采用

$$
E_{\rm audit}=\int_{\Omega_f}
\left(\frac12\rho|\boldsymbol u|^2+\rho gz\right)\mathrm dV
+\gamma|\Gamma|+
\frac12I_O\dot\theta^2+V_g+V_{sus}
+\mathbf 1_{\rm C1}(\gamma_{sg}A_{sg}+\gamma_{sl}A_{sl}),
\tag{N11}
$$

并满足

$$
\frac{\mathrm dE_{\rm audit}}{\mathrm dt}
=P_{in/out}+P_{\gamma,o}+P_{ext}
-\int_{\Omega_f}2\mu\boldsymbol D:\boldsymbol D\,\mathrm dV
-c_\theta\dot\theta^2
-\mathcal D_{\rm slip}-\mathcal D_{cl} .
\tag{N12}
$$

C0 中 $\mathcal D_{\rm slip}=\mathcal D_{cl}=0$。C1 中
$\mathcal D_{\rm slip}=\int_{S_w}\beta_s|\boldsymbol P_b(\boldsymbol u-\boldsymbol u_b)|^2\,\mathrm dS\ge0$，
$\mathcal D_{cl}=\oint\zeta_{cl}V_{cl}^2\,\mathrm d\ell\ge0$，或以
C1a 滞后活动集的非负耗散替代。此时流体速度和刚体速度的牵引功不再逐点相等；两者差值必须恰好进入 $\mathcal D_{\rm slip}$，自由面边缘余功与固—液/固—气表面能之和必须进入 $\mathcal D_{cl}$。

任何稳定周期解都还应通过周期功审计

$$
\int_{t_0}^{t_0+T}Q_\theta^f\dot\theta\,\mathrm dt
=\int_{t_0}^{t_0+T}
\left(c_\theta\dot\theta^2- Q_\theta^{ext}\dot\theta\right)\mathrm dt
\quad
\text{（机械能回到同一状态时）}.
\tag{N13}
$$

这条等式比“振幅和图像看起来正确”更严格，也能直接发现力臂符号、时层错位和附加质量双计数。

---

## 2. 界面、移动刚体和接触线方法的选择

### 2.1 方法决策矩阵

| 方法 | 本项目角色 | 选择理由 | 主要风险和强制审计 |
|---|---|---|---|
| 界面贴体 ALE | canonical 三维数值族；C0 为首个代码基准，C1 为实物候选 | 圆柱和自由面均有真实曲面；湿面牵引、毛细线力、力矩和接触线位置最直接；拓扑不变时质量和功率链最清楚 | 大转角/大波形使网格畸变；C1 还需表面切向网格与活动集；必须满足 GCL、曲边界阶数、重网格保守投影和网格可逆性 |
| 几何 VOF/PLIC | 破波、翻卷、合并、夹气升级 | 对相体积守恒强且可处理拓扑变化 | 曲率/接触角和寄生流困难；须 balanced-force、几何通量与质量账本 |
| Level set | VOF 的法向/曲率辅助或独立方法对照 | 光滑法向和曲率、拓扑改变自然 | 重初始化造成质量漂移；单独 level set 不得成为生产质量主变量 |
| body-fitted overset | 大幅刚体转动的可选局部网格 | 保留圆柱附近曲边界解析并避免全域网格扭曲 | 普通插值不守恒且产生高频假力；只能使用严格保守通量/虚拟面实现并做运动重叠区敏感性 |
| cut-cell / sharp immersed boundary | VOF 分支中刚体几何的优先 Eulerian 处理 | 避免弥散惩罚层，圆柱位置独立于背景网格 | 小切单元稳定性、壁面剪切和力矩阶数；需单元合并/隐式通量与独立力审计 |
| 弥散 immersed boundary / Brinkman penalty | 浏览器预览或回归测试 | 实现简单、移动体便捷 | 几何厚度、无滑误差、罚参数依赖和力矩偏差；不可作为默认 3D 参考解 |

VOF 的原始体积分数思想、level-set 的不可压两相应用、浸入边界和 overset/Chimera 的来源见文末 [S4]–[S7]。近期保守 overset 工作明确表明，标准插值可破坏质量并污染移动体力信号 [S10]；因此本项目禁止“普通 overset + VOF + VIV”在未完成保守性验收时进入生产。

### 2.2 第一套可执行验证分支 ale-sharp-C0

它的 capability 必须标为 wetting=C0-unvalidated-benchmark，仅用于解析、代码和 C0 极限验证。适用条件同时包括：

- $S_w,S_d,\mathcal C_b$ 的拓扑在时间窗内不变；
- 接触线相对圆柱材料点不滑动；
- 自由面不翻卷、不破碎、不夹气且仍可由无自交三角曲面表示；
- 圆柱与壁/底/机械止挡保持正间隙；
- 弹性网格经局部重网格后仍保持正 Jacobian。

不以一个任意角度上限代替这些几何条件。运行时保存最小网格 scaled Jacobian、接触线到端盖距离、最小壁/底间隙、自由面最大坡度和曲率分辨率。

### 2.3 拓扑升级分支 vof-cutcell-two-phase

若视频/先验或运行诊断显示破面、夹气、越浪、通风空腔或接触线跨越端盖，则采用水—气两相 one-fluid 方程：

$$
\rho(C)=C\rho_l+(1-C)\rho_g,
\quad
\mu(C)=C\mu_l+(1-C)\mu_g,
\quad
\partial_t C+\nabla\cdot(C\boldsymbol u)=0,
\tag{N14}
$$

其中 $C\in[0,1]$ 用 PLIC 几何重构和与动量相同的面通量推进。表面张力在动量方程中用与压力梯度同位置的 balanced-force 离散；可用 level set/高度函数辅助 $\boldsymbol n,\kappa$，但每步以 VOF 体积分数为质量真值。刚体优先用 sharp cut-cell；若用 overset，必须以虚拟控制面或严格 flux correction 保证重叠区全局通量相消。

该分支比单液相 ALE 多了气液密度比、黏度比、接触角/壁面能和界面厚度/重构参数；它不是“更高级所以自动更准”。应分别做水体积、气泡体积、Laplace 压差、寄生流、界面拓扑和 overset/cut-cell 力收敛。

### 2.4 为什么不把二维 LBM 叫 3D 高保真

D2Q9 MRT-LBM 可以在 WebGPU/WASM 上高效求解低马赫二维不可压近似，但其状态没有 $z$ 方向，不能表达有限湿跨、跨向涡、自由面端区、Mode A/B 或真实三维力矩。即使加入若干独立条带，条带间也没有三维压力、涡拉伸或跨向输运。它在本项目中只属于 §4 的 cfd2d-strip-reference/A0-preview profile；只有完成 A1 验收后才可升为二维研究参考。
D2Q9/BGK 模型和矩空间广义/MRT 稳定性分析的原始依据分别见 [S34,S35]；这些论文只支持算法族与格子映射，不替代本项目的曲壁、力和可压缩误差验证。

若采用格子单位，必须显式保存

$$
\Delta x=\frac{D}{D_{lu}},\qquad
\Delta t=\frac{D\,U_{lu}}{D_{lu}U},\qquad
\nu_{lu}=\frac{U_{lu}D_{lu}}{Re},\qquad
s_\nu^{-1}=\tau_\nu=\frac12+3\nu_{lu},
\tag{N15}
$$

其中格子声速取值和其余 MRT 非守恒模态松弛率须随 profile 保存；并要求 $Ma=U_{lu}/c_s$ 和曲壁/力误差完成独立收敛。一个按“每步速度松弛比例”定义的 penalty strength 随 $\Delta t$ 改变物理意义，不能冒充网格无关材料参数。

### 2.5 移动接触线分支

锐界面、无滑移、相对固体移动的接触线具有经典应力/耗散奇性 [S11]；滑移尺度匹配和热力学弥散界面的原始闭合见 [S29,S30]。因此只有以下互斥配置可运行：

1. C1a hysteretic-active-set（优先实物候选之一）：当 $\theta_R<\theta_d<\theta_A$ 时钉扎，达到前进/后退角才滑移，记录所有活动集切换；
2. C1b navier-dynamic-angle（优先实物候选之一）：局部 Navier 滑移长 $\ell_s$ 与经标定的 $\theta_d(V_{cl})$；
3. C0 pinned（仅数学/代码基准）：接触线固定在刚体材料线上，动态接触角是结果；
4. phase-field-wall-energy：Cahn–Hilliard–Navier–Stokes 和壁面自由能，并额外做 $Cn=\epsilon/D\to0$ 与迁移率敏感性。

移动线分支的总能量必须加入固—液/固—气表面能和非负接触线耗散 $\mathcal D_{cl}$。如果求解器同时从表面弱式和机械端再加一次毛细线力，就是双计数。

---

## 3. canonical 三维后端的可执行离散

本节给出论文级、可执行的三维路线，目的在于保证二维结果的升级方向和证据边界无歧义。它不是当前国赛软件必须实现的工作量清单；当前必做实现见 §4.1 的 A1 和文末“实际需运行的验收测试”。

### 3.1 网格、有限元空间与曲边界

在每个已接受时刻 $t^n$，保存一个与自由面、湿圆柱面、侧面/端盖分界及接触线共形的三维非结构网格。四面体或棱柱—四面体混合网格均可，但以下条件是合同而不是建议：

- 圆柱、端盖、自由面和接触线使用二次等参几何；线性折线圆柱会把几何误差直接投进压力矩和黏性矩；
- 速度用连续 $P_2$，压力用连续 $P_1$ Taylor–Hood 对；自由面和 ALE 位移用至少 $P_2$ 几何节点；
- 圆柱边界至少布置一层与黏性尺度相匹配的曲棱柱层；若纯四面体，则用独立的壁面剪切收敛证明替代；
- 侧面、上端盖、下端盖和接触线拥有不同 boundary ID，任何重网格都不得把它们合并；
- 入/出口、侧壁、底面和自由面的交线也分别标记，以便施加相容条件和做通量账本。

网格位移 $\boldsymbol d_m$ 在内部通过带体积加权刚度的伪弹性问题获得，例如

$$
\nabla\!\cdot\!\left[
2\mu_m(\boldsymbol x)\boldsymbol D(\boldsymbol d_m)
+\lambda_m(\boldsymbol x)(\nabla\!\cdot\boldsymbol d_m)\boldsymbol I
\right]=\boldsymbol0,
\qquad
\boldsymbol w=\left.\partial_t\boldsymbol d_m\right|_{\widehat{\boldsymbol x}},
\tag{N16}
$$

其中靠近圆柱、接触线和自由面取更大的网格 Lamé 系数。固定壁法向位移为零；C0 圆柱节点随 $\boldsymbol x_b$，C1 圆柱面节点只在法向随刚体、沿面可重分布且接触线节点随 $\boldsymbol V_{\mathcal C_b}$；自由面法向速度由 (N7) 给出，切向速度通过最小畸变方程选择而不改变物理界面。每次 Newton 线性化都要同时线性化网格、法向、曲面 Jacobian、湿面边界、接触线活动集和刚体映射，禁止先“冻结流体网格”再在步末搬动圆柱。

### 3.2 守恒 ALE 弱式与表面张力

对流项使用满足 GCL 的守恒或守恒—反对称等价形式。表面张力不直接逐点差分曲率，而用 Laplace–Beltrami 弱式

$$
\int_{\Gamma}\gamma\kappa\boldsymbol n\!\cdot\boldsymbol v\,\mathrm dS
=-\int_{\Gamma}\gamma
(\boldsymbol I-\boldsymbol n\boldsymbol n):
\nabla_s\boldsymbol v\,\mathrm dS
+\oint_{\partial\Gamma}\gamma\boldsymbol m\!\cdot\boldsymbol v\,\mathrm d\ell .
\tag{N17}
$$

这样自由面曲率项和接触线项共用同一个离散表面能变分。式 (N17) 的线项与 (N8) 的刚体毛细线矩必须来自同一求积点和相反作用，不能在两段代码中各算一次近似。

压力零空间通过固定全域平均表压或一个明确参考点消除；开放边界若给压力，则不得再固定另一压力基准。重力体力和静水压力应使用相同几何阶数；静水测试中允许采用 well-balanced 压力变量 $p_d=p-\rho g(\eta_0-z)$，但输出必须可恢复总表压，且 hydrostaticAccounting 元数据必须是 total 或 split 中的一个。

### 3.3 二阶时间推进和步长门禁

把结构二阶方程写成 $\dot\theta=\omega$ 与 $I_O\dot\omega=\cdots$，同流体、自由面和网格一起用可变步长 BDF2。首步用 BDF1 或经过验证的二阶启动；任何事件、重网格或不连续入口改变后重新建立多步历史并降低到一阶一个接受步，随后恢复二阶。局部时间步同时满足

$$
\Delta t\le\min\!\left[
C_{\rm adv}\frac{h}{|\boldsymbol u-\boldsymbol w|},
C_\nu\frac{h^2}{\nu},
C_\gamma\sqrt{\frac{\rho h^3}{\gamma}},
C_b\frac{h_b}{|\boldsymbol u_b-\boldsymbol w|+\epsilon_u},
C_\theta\frac{1}{|\omega|+\epsilon_\omega}
\right],
\tag{N18}
$$

其中黏性和毛细限制对完全隐式法并非线性稳定性的必要条件，但仍是相位、曲率和 Newton 可解性的精度门。正式计算不得只按 CFL 自动选步；还要做 $\Delta t,\Delta t/2,\Delta t/4$ 的独立时间收敛。

### 3.4 单体强耦合是基准，分区强耦合是等价实现

在 $t^{n+1}$ 的未知向量取

$$
\boldsymbol z^{n+1}=
\{\boldsymbol u,p,\boldsymbol d_m,\Gamma,\theta,\omega,
\lambda_V,\lambda_c\}^{n+1},
\qquad
\boldsymbol{\mathcal R}(\boldsymbol z^{n+1};
\boldsymbol z^n,\boldsymbol z^{n-1})=\boldsymbol0 ,
\tag{N19}
$$

其中 $\lambda_V$ 是可选液体体积约束乘子，$\lambda_c$ 表示机械约束/接触线活动集；C1 还把 $V_{cl},\theta_d$ 或其多值图乘子放入同一未知组。Newton–Krylov 每次迭代更新全部变量，块预条件器至少区分速度—压力、网格/自由面、润湿活动集和 1DOF 刚体 Schur 补。接受条件不能只看线性残差，而要同时满足

$$
\max\!\left(
\frac{\|\mathcal R_m\|}{S_m},
\frac{\|\mathcal R_c\|}{S_c},
\frac{\|R_{\rm slip}\|}{S_{\rm slip}},
\frac{\|R_{\rm cl}\|}{S_{\rm cl}},
\frac{|R_V|}{S_V},
\frac{|R_P|}{S_P},
\frac{|R_E|}{S_E}
\right)<\varepsilon_{\rm nl},
\qquad
\varepsilon_{\rm nl}\le0.1\,\varepsilon_{\rm disc},
\tag{N20}
$$

其中尺度 $S_\bullet$ 和目标离散误差 $\varepsilon_{\rm disc}$ 在 RunSpec 中冻结。把代数误差压到估计离散误差的十分之一以下，是为了避免把 Newton 未收敛误差误报成网格收敛。

如果复用独立流体和结构程序，允许采用分区强耦合，但每个时步必须反复求解到同一接口状态。不可压流体对轻结构的附加质量会使单次显式 Dirichlet–Neumann 交换即使缩小时间步也可能发散 [S12]。因此分区实现至少用 Aitken $\Delta^2$、IQN-ILS 或界面 Newton，并保存每次子迭代的残差和松弛参数。若质量/惯量比降低时迭代数无界增长，升级到 Robin–Robin、界面准 Newton 或单体法；禁止用增大物理阻尼掩盖算法不稳定。

### 3.5 保功载荷映射和三条力矩路径

设刚体速度在流体边界求积点的映射为

$$
\boldsymbol u_{\Gamma_b}=\boldsymbol H\,\dot{\boldsymbol q},
\qquad
\boldsymbol Q_f=\boldsymbol H^{T}\boldsymbol f_{\Gamma_b}.
\tag{N21}
$$

第二式不是任选插值，而是第一式的代数转置；于是刚体所得功在机器精度下

$$
\dot{\boldsymbol q}^{T}\boldsymbol Q_f
=(\boldsymbol H\dot{\boldsymbol q})^{T}
\boldsymbol f_{\Gamma_b}.
\tag{N22}
$$

匹配网格的 P0 中，$\boldsymbol H$ 就是各求积点的 $\boldsymbol J_\theta$。C0 还以它强制流体无滑；C1 只用它计算刚体速度和刚体功，流体切向速度由 Navier 弱式求出，流体侧与刚体侧牵引功的差必须收敛到 $-\mathcal D_{\rm slip}$。接触线剩余功还须与 $E_{sg/sl}$ 和 $\mathcal D_{cl}$ 闭合。非匹配 overset/浸入边界中仍必须构造共轭映射。生产时同时计算：

1. 湿面压力、黏性、毛细线力的直接力矩；
2. 动量弱式中刚体虚速度测试函数得到的反力力矩；
3. 固定惯性控制体的角动量通量所反演的力矩。

前两者在同一离散系统中应接近代数一致；第三者受控制体时间导数和开边界误差影响，但应随网格/时间收敛到同一结果。任何“先求 $\boldsymbol F$，再乘湿长中点”的结果仅作为错误检测对照，不可进入 canonical 输出。

曲边界牵引用与状态同阶的边界求积；压力和黏性分项不得先在节点上光滑后再积分。对噪声敏感的壁面剪切还要与体积动量平衡对照。二维后端输出的是线力 $f^{2D}\,[\mathrm{N/m}]$ 和线力矩 $m^{2D}\,[\mathrm N]$，三维后端才输出 $\boldsymbol F\,[\mathrm N]$ 与 $\boldsymbol M\,[\mathrm{N\,m}]$。

### 3.6 重网格、保守转移和几何事件

以下任一条件触发“拒绝当前试步并重网格”，阈值在生产实现前冻结：

- 任一单元 Jacobian 非正或 scaled Jacobian/最小二面角低于门槛；
- 自由面曲率半径不足以被规定数量的面单元解析；
- 接触线靠近端盖/边界分片切换；
- 圆柱—壁/底间隙小于规定层数；
- Newton 因网格畸变连续失败。

重网格后的 $\boldsymbol u,p,\Gamma$ 不可用逐节点插值。应做满足液体体积、总动量（在边界通量许可下）和散度约束的保守 $L^2$ 投影；表面网格转移还要约束体积和表面位置。投影前后记录质量、动量、角动量、动能、表面能和机械状态跳变量。重网格若造成比本步误差预算更大的能量跳变，该步失败。

R1 定义的首次入水、全浸没、开始露出、完全出水、壁/底接触和止挡必须在连续时间插值上定位。自由面穿越不自动施加刚体冲量；真实拍水压力由场方程解析。若出现实体接触，当前光滑 ALE–FSI 分支停止并切换到明确的接触/润滑模型，不能用位置裁剪后继续称同一解。

### 3.7 一步算法伪码

~~~text
读取上一已接受 checkpoint：网格、u/p、自由面、theta/omega、多步历史、活动集
若为入口启动：用散度自由的预游流场和无反射 ramp 建立一致初值
选择试探 dt；由 BDF2 外推所有 n+1 变量

repeat Newton/FSI k = 0,1,...
    用 R1 几何核更新有限圆柱、侧面/端盖、J_theta、湿面和接触线
    C0：施加钉扎+无滑；C1：更新滑移弱式、动态角/滞后活动集与表面能
    求伪弹性网格；检查正 Jacobian 与离散 GCL
    组装 ALE 动量、连续性、自由面、网格和结构残差
    用同一曲面求积组装 Qp、Qmu、Qgamma 与接口功
    求块线性系统；线搜索更新全部变量
    若采用分区程序：做界面 Newton/Aitken，重新求流体和结构
    计算运动学、牵引、体积、约束、接口功和能量残差
until 所有残差满足 (N20)

检查 CFL/黏性/毛细精度、网格质量、自由面拓扑和最小间隙
若失败：拒绝试步；缩小 dt、重网格或升级物理分支后重算
若成功：原子写入 accepted state；更新统计累计量
若收到 pause：只在此一致安全点写完整 checkpoint 并确认暂停
~~~

### 3.8 形式阶、实测阶和不能承诺的阶

在光滑解、固定拓扑、无重网格、足够精确求积和 Newton 收敛条件下，目标形式阶为：

| 量 | 目标形式阶 | 必须实测的原因 |
|---|---:|---|
| $\boldsymbol u$ 的 $L^2$ 误差 | $O(h^3+\Delta t^2)$ | $P_2$ 速度与 BDF2 |
| $\boldsymbol u$ 的 $H^1$ 误差、$p$ 的 $L^2$ 误差 | $O(h^2+\Delta t^2)$ | Taylor–Hood 正则解 |
| 光滑自由面位置 | 目标 $O(h^3+\Delta t^2)$ | 受曲率、边缘和网格方程影响 |
| 总力/总力矩 | 不先验高于 $O(h^2+\Delta t^2)$ | 边界导数、压力、曲几何和接触线限制 |
| 接触线/润湿切换 | 仅分支内二阶目标 | 活动集切换处一般非光滑 |

这些是设计阶，不是已经观察到的阶。MMS 必须报告实测收敛阶

$$
p_{\rm obs}=
\frac{\ln(|\phi_3-\phi_2|/|\phi_2-\phi_1|)}
{\ln r}
\quad\text{（三套等比细化且处于单调渐近区时）},
\tag{N23}
$$

并分别对体积、速度、压力、界面、力、力矩和能量残差检查。重网格、接触线切换、尾流统计量或湍流 LES 不应声称点态二阶；它们按守恒误差和统计不确定度验收。

---

## 4. 两级数值后端及其诚实能力边界

### 4.1 Level A：cfd2d-strip-reference

Level A 是一组**二维截面不可压 Navier–Stokes 求解**，而非三维求解的廉价替代品。建议同一物理接口提供两个执行 profile：

| profile | 实现与资源 | 证据等级 |
|---|---|---|
| A0 browser-preview | WebGPU/WASM 的 D2Q9 MRT-LBM 或低阶投影法；固定规则网格、短统计窗 | 交互预览和回归；即使稳定也不自动是研究级 |
| A1 workstation-2d | 曲边界有限元/有限体积，或经曲壁与力验证的高分辨率 MRT-LBM；三网格、三时间步和基准全部可跑 | 通过 §7 相应测试后，是“研究级二维参考”，仍非 3D DNS |

A1 是本轮国赛软件的推荐落点。最小可交付功能依次为：固定圆柱 → 规定横移圆柱 → 可选的一自由度弱/强耦合二维 FSI；代码优先模块清楚、参数可改和输出可审计，不要求 MPI、复杂 AMR、两相拓扑或发布级运维。

A1 的最小执行循环应独立于最终选用的有限体积或 LBM 数值核：

~~~text
校验 SI RunSpec 与 BackendProjectionManifest；拒绝 3D/自由面原生 QoI
生成二维域、圆和边界；读入静止场或已保存的同版本状态
for 每个候选时间步:
    由 fixed / prescribed-motion / surrogate-FSI profile 给出圆边界状态
    推进一步二维流场；若为强 FSI，则流体—振子子迭代到接口残差过门
    由原生边界算法求 lineForce2d，并以固定控制体动量余额独立复核
    计算 linePower2d、质量缺陷、CFL/Mach、代数残差和运动边界功
    若任一硬门失败：拒绝该步、减小步长或终止；不得写入统计样本
    若接受：更新时间序列、舍弃/统计窗和最小本地恢复状态
结束后输出二维 QoI、GCI/时间/域/统计证据与 capability 判定
closure=none 时只输出各条带；禁止构造 force3d/torque3d
~~~

每个条带的平面由来流 $\boldsymbol e_x$ 和局部横移方向 $\boldsymbol c(\theta)$ 张成，条带坐标 $r_i$ 来自 R1 圆柱轴。局部刚体速度必须用

$$
\boldsymbol u_{b,i}=r_i\dot\theta\,\boldsymbol c(\theta),
\qquad
q_i^{2D}(t)=
\int_{\partial C_i}
(\boldsymbol\sigma_i\boldsymbol n_i)\!\cdot
[r_i\boldsymbol c(\theta)]\,\mathrm ds ,
\tag{N24}
$$

其中 $q_i^{2D}$ 的单位是 N，即“每单位跨长的力 N/m”乘“力臂 m”。多个二维条带只能输出

$$
\widetilde Q_A(t)=
\sum_i w_i q_i^{2D}(t),
\qquad [w_i]=\mathrm m ,
\tag{N25}
$$

而权重、端部修正、条带间相位和相干核必须来自已登记的三维/实验 closure ID。没有该闭合时，平台只输出各条带线载荷、完全相干上界/独立相位假设范围，不得把 $\widetilde Q_A$ 命名为 canonical 的预测总矩。

A 的两种几何模式必须分开：

- infinite-span-2d：无限跨单位长度圆柱，可做标准固定/规定运动基准；
- bounded-cross-section-2d：显式画出二维侧壁，研究宽度阻塞 $B_w=D/W$；它仍没有槽底—自由面三维端条件。

A 的原生模型没有有限 $AR_w$ 语义；只有 bounded-cross-section-2d 消费 $B_w$，且不消费三维投影阻塞 $B_A$。没有自由面时 $Fr,We,Bo$ 只作为被投影掉的目标工况标签，不属于 A 的已验证物理轴。A 的 $Re,KC$、幅频和二维 $B_w$ 包络必须由实际二维基准生成，不能由 `maxReynolds` 或条带数量声明。

所谓 rigid-lid、symmetry-top 或 prescribed-pressure-top 都只是反事实边界。对于表面贯穿圆柱，二维平面无法同时表示沿湿跨的自由面端点和水下尾流；因此 $Fr\ll1$ 也不能把该结果升级为真实自由面解。

### 4.2 Level A 能回答与不能回答

在与目标几何、$Re$、$KC$、规定运动幅频和二维阻塞相匹配，且通过相应 V&V 后，A 可以回答：

- 二维固定圆柱的 $C_D,C_L,St$ 和 Hopf/周期尾流；
- 二维规定横移/局部圆弧速度下的载荷幅值、相位、谐波和每单位跨长功率；
- 数值算法、坐标符号、边界 ramp、力积分和 FSI 耦合的低成本回归；
- 在显式 closure 和不确定度下，对某些参数趋势、完全相干上界或条带模型灵敏度作研究级近似。

A 不能回答：

- 有限湿跨总力/总矩、端涡、跨向失相干或接触线附近三维流；
- Mode A/B、三维转捩、有限 $AR_w$ 的真实临界点；
- 真实自由面波、弯月面、表面功率、通风/夹气/破波；
- canonical 的绝对极限环幅值、锁频宽度、起振阈值或多稳定性；
- 侧壁、槽底、自由面和端盖同时存在时的联合阻塞。

只要论文问题包含上述任一项，A 只能作机制对照或先验，不能作最终证据。理想无限圆柱在 $Re_A=188.5\pm1.0$ 出现 Mode A [S24]；这一数值只作为“二维解已失去三维稳定性”的强制提示，有限槽、有限跨和自由面会移动阈值，不能把 188.5 当成本装置经验常数。

### 4.3 Level B：cfd3d-fs-fsi-local

Level B 直接求 §1–3 的有限水槽、有限圆柱、自由表面和 P0 刚体。它在本地多核 CPU/GPU/MPI 上运行，profile 必须明确为：

- B0 ale-C0-code-benchmark：单液相、恒大气、钉扎+无滑、拓扑不变；只作未验证代码基准；
- B1 ale-C1a/C1b-physical-candidate：单液相、恒大气，滞后活动集或 Navier—动态接触角；由材料水线观测选型；
- B2 vof-two-phase-DNS/LES-candidate：显式气相和拓扑变化；
- B3 ale/vof-LES：网格未解析全部小尺度，带冻结 SGS 模型；
- B4 URANS-screening：仅用于工况扫描，不能替代瞬态锁频验证。

DNS-candidate 只有在空间/时间谱、耗散、壁面和跨向最小尺度均已证明解析后才能改名 DNS。LES 必须输出解析黏性耗散、SGS 耗散/回散和滤波/网格尺度；若用动态 SGS，原始依据见 [S31]。URANS 必须输出闭合模型和相位平均语义。

Level B 在其 validatedEnvelope 内可以回答实际湿面压力/黏性/毛细分布、三维总力矩和功率、端区贡献、跨向相干、自由面/接触线反馈、三维尾流、规定运动及强耦合 P0 响应。它仍不能越过自己的子模型：

- 单液相不能回答气体惯性、夹气和破波；
- C0 pinned 不能回答接触角滞后导致的滑移，且始终只作数学/代码基准与可证伪极限；即使观测近似钉扎，实物候选也用带滞后历史的 C1a 表示；
- 刚性 P0 不能回答圆柱/臂弯曲、轴承游隙、柔索松弛或碰撞；
- LES/URANS 不能被重命名为 DNS；
- 一个已验证参数点不能外推为整个 $Re$–$Ur$ 平面。

### 4.4 先验和运行时升级规则

| 触发 | 当前层内动作 | 必须升级 |
|---|---|---|
| 只需二维基准或算法回归 | A 加密到二维 GCI 合格 | 否 |
| 需要真实绝对幅值、总矩、起振/锁频边界 | 无 | A→B |
| $Re$ 接近/超过二维三维失稳区，或出现跨向调制 | 无 | A→B |
| $AR_w=L_w/D$ 仅数个直径、自由面与底部端区重叠 | 无 | A→B |
| 表面贯穿、接触线、波模态是 QoI | A 仅保留反事实对照 | A→B |
| 只因网格/时间 GCI 超限 | 同一层加密/改进数值格式 | 不因数值误差自动换物理模型 |
| 材料水线尚未完成 | C0 只保留代码基准与可证伪极限 | 实物计算并列 C1a/C1b 候选，待观测后选型/校准 |
| $\lvert\eta\rvert/D$、表面坡度或表面功占比超过预注册容差 | C1 同层加密核查 | 单相 ALE→两相/拓扑分支 |
| 接触线相对材料滑移 | 停止 C0；更新 C1 活动集/参数 | C1a/C1b |
| 夹气、界面断裂/合并、越浪 | 停止单相 ALE | 两相 VOF/cut-cell |
| 所需最小尺度超过 DNS 资源 | 先做资源/误差审计 | DNS-candidate→LES，不能降格后仍称 DNS |
| 圆柱/机构柔性、松弛或接触可测 | 停止刚性 P0 | 结构/约束拓扑升级 |

validatedEnvelope 是后端构建时生成的只读证据对象，不能由用户用 maxReynolds 一类字段改写。每个范围都关联基准 ID、代码版本、网格族、QoI 和不确定度；越界运行仍可执行探索，但 status=out-of-envelope，不能进入验证结论。

---

## 5. 解析度、数值耗散与尾流记忆

### 5.1 网格不是“每直径若干格”的单一数字

网格计划至少分六区：圆柱黏性层、近尾流剪切层、远尾流、自由面/接触线、侧壁/槽底边界层和入口/出口吸收区。每区保存 $h_{\min},h_{\max}$、各向异性、曲几何阶、单元数和理由。初始尺度可由

$$
\delta_D\sim\frac{D}{\sqrt{Re}},
\qquad
\lambda_A\simeq3.96D,
\tag{N26}
$$

估计圆柱边界层和 Mode A 跨向尺度，但最终分辨率由 QoI 收敛决定。若 $Re$ 高到需要壁分辨 LES/DNS，报告第一层 $y^+$、层数、增长率和尾流 Kolmogorov/滤波尺度；若用壁模型，则明确不是 wall-resolved DNS。

固定 $D/\Delta x$ 不能保证曲率、接触线、薄隙或自由面波被解析。对表面张力，至少检查曲率半径与面网格；对槽底/侧壁检查其边界层；对最小间隙 $g_{\min}$ 检查有足够单元且网格序列保持相似。

### 5.2 数值耗散必须进入能量账本

每个接受步输出积分质量残差、散度范数、接口功残差和离散能量缺陷：

$$
\begin{aligned}
R_M^{[n,n+1]}&=
\rho(V_f^{n+1}-V_f^n)
+\int_{t^n}^{t^{n+1}}\!\!
\int_{\Gamma_{in}\cup\Gamma_{out}}
\rho\boldsymbol u\!\cdot\boldsymbol n\,\mathrm dS\,\mathrm dt,\\
R_P^{n+1}&=
Q_\theta^{n+1}\omega^{n+1}
-P_{\Gamma_b}^{n+1},\\
R_E^{[n,n+1]}&=
E^{n+1}-E^n-
\int_{t^n}^{t^{n+1}}
(P_{ports}+P_{ext}-\mathcal D_\mu-\mathcal D_s
-\mathcal D_{\rm slip}-\mathcal D_{cl}-\mathcal D_{SGS})\,\mathrm dt .
\end{aligned}
\tag{N27}
$$

若格式含 SUPG、上风、滤波、人工压缩、体积分数 clipping、小切单元合并或重网格投影，其能量/质量作用必须单列为 $\mathcal D_{num}$ 或不可闭合缺陷。不能把 $R_E<0$ 全部归因于真实黏性，也不能以“稳定”为理由不做随 $h,\Delta t$ 消失性检查。周期解还要核对 (N13)；入口能量、出口能量和摆吸收功之差必须与物理及数值耗散闭合。

VOF 分支另输出水体积、气体体积、体积分数越界修正量和界面面积。level-set 辅助重初始化造成的质量修正必须可追踪。ALE 分支输出离散 GCL 缺陷和重网格前后守恒跳变。

### 5.3 启动、尾流记忆和统计窗

“初始全域均匀流 + 瞬时释放摆”会同时激发入口启动波、圆柱启动涡、自由面瞬态和结构瞬态，不能自动代表实验。正式方案至少比较两类初值：

1. fixed-body precursor：在完全相同的槽、自由面、入口和圆柱姿态下固定刚体，运行到力/尾流统计稳定，保存三维场后再释放；
2. smooth-ramp release：从静水或低速流以冻结的 $C^1/C^2$ ramp 增加入口速度，经过若干对流时间后释放。

入口 ramp 形状、持续时间、固定体预运行长度、释放相位和初始 $(\theta,\omega)$ 都是输入及 provenance。使用二维尾流挤出为三维初值时，应加入可重复、幅值冻结的跨向扰动并做幅值/波数敏感性；否则恰好保持二维对称子空间会人为延迟 Mode A。

统计起点不能凭“看起来稳定”选择。对 $\theta,Q_\theta,C_L,\eta$ 做滑动均值/方差、谱峰、周期功和分块均值检查；估计积分自相关时间 $\tau_{\rm int}$ 与有效样本数

$$
N_{\rm eff}\simeq
\frac{T_{\rm stat}}{2\tau_{\rm int}},
\qquad
u_{\rm stat}(\overline\phi)=
\frac{s_\phi}{\sqrt{N_{\rm eff}}}.
\tag{N28}
$$

统计窗持续到预注册 QoI 的置信区间低于容差，而不是固定“20 个周期”即停止。强制振荡在特定频率附近可存在数百周期长瞬态 [S26]；自由 FSI 还可能有滞后和多吸引子。因此至少执行：

- 静止流场、固定体成熟尾流和小正/负初扰三类初值；
- $Ur$ 递增延续、递减延续和每点独立重启；
- 释放相位、跨向扰动谱和统计窗加倍；
- 保存全瞬态，不只保存最终 FFT。

若不同初值收敛到不同稳定态，应报告多稳定分支及吸引域证据，不能把差异平均成一个“数值噪声”误差条。

### 5.4 域和边界的系统敏感性

三维 solution verification 不得只改网格密度。至少独立改变：

- 上游长度 $L_{in}/D$、下游长度 $L_{out}/D$ 和吸收层；
- 物理槽宽 $W/D$、水深 $H/D$；这两者是实验参数，不是可随意外推的数值域；
- 若做理想周期跨向基准，改变计算跨度 $L_z/D$ 与跨向网格；若做 canonical，则保持真实有限湿跨和真实端边界；
- 入口速度剖面、湍流强度/长度尺度和出口回流处理；
- 自由面横向/上下游边缘条件及平均水位控制；
- 圆柱到侧壁、底、入口和出口的实际间隙。

“域独立”只允许通过把人工截断边界移远来证明；真实侧壁、槽底、自由面和有限跨是物理的一部分，不能在收敛研究中偷偷移走后仍比较同一个实验。

---

## 6. 无量纲映射、局部运动与相似性限制

### 6.1 冻结参考量

唯一名义速度取圆柱上游、未受物体扰动截面的液相体积均速

$$
U_0=\frac{Q_0}{A_0},\qquad A_0=WH
\quad\text{（矩形平水面截面）}.
\tag{N29}
$$

同时冻结 $D,\rho_l,\mu_l,\nu_l=\mu_l/\rho_l,g,\gamma,H,W$。不能在不同图中把 $U_0$ 换成中心线速度、喉部速度或瞬时相对速度。入口非均匀性另存完整 $u_{in}(y,z)/U_0$。

P0 沿湿跨的运动尺度不是单一平移速度。对平衡排水体 $\mathcal C_{w0}$，定义

$$
m_d=\rho_lV_{w0},\qquad
I_d=\rho_l\int_{\mathcal C_{w0}}
|\boldsymbol J_\theta|^2\,\mathrm dV,\qquad
r_J=\sqrt{I_d/m_d}.
\tag{N30}
$$

$r_J$ 是排水体关于枢轴的 RMS 力臂，不是任取的“湿段中点”；仍需同时保存远端力臂、体积形心力臂和完整 $\boldsymbol J_\theta(\boldsymbol x)$。

求解器内部采用

$$
\begin{aligned}
\boldsymbol x^*=\frac{\boldsymbol x}{D},\quad
t^*=\frac{tU_0}{D},\quad
\boldsymbol u^*=\frac{\boldsymbol u}{U_0},\quad
p^*=\frac{p}{\rho_lU_0^2},\\[2pt]
\boldsymbol F^*=\frac{\boldsymbol F}{\rho_lU_0^2D^2},\quad
\boldsymbol M^*=\frac{\boldsymbol M}{\rho_lU_0^2D^3},\quad
E^*=\frac{E}{\rho_lU_0^2D^3},\quad
P^*=\frac{P}{\rho_lU_0^3D^2}.
\end{aligned}
\tag{N31}
$$

二维线力、单位跨距力矩和功率的尺度分别是
$\rho_lU_0^2D,\rho_lU_0^2D^2,\rho_lU_0^3D$，绝不能套用三维尺度。

### 6.2 流体与自由表面群

$$
\begin{gathered}
Re_0=\frac{U_0D}{\nu_l},\qquad
Fr_D=\frac{U_0}{\sqrt{gD}},\qquad
Fr_H=\frac{U_0}{\sqrt{gH}},\\
We_D=\frac{\rho_lU_0^2D}{\gamma},\qquad
Bo_D=\frac{(\rho_l-\rho_g)gD^2}{\gamma},\qquad
Ca=\frac{\mu_lU_0}{\gamma}.
\end{gathered}
\tag{N32}
$$

给定 $H/D$ 后 $Fr_H=Fr_D\sqrt{D/H}$；严格两相时
$Bo_D=[(\rho_l-\rho_g)/\rho_l]We_D/Fr_D^2$，且 $Ca=We_D/Re_0$。这些派生关系必须通过输入语义验证，不能让用户填入互相矛盾的值。

局部刚体运动强度和名义相对 Reynolds 数为

$$
\chi(\boldsymbol x,t)=
\frac{|\boldsymbol J_\theta(\boldsymbol x)\dot\theta|}{U_0},
\qquad
Re_m=Re_0\chi,\qquad
Re_{rel,kin}=Re_0\sqrt{1+\chi^2}.
\tag{N33}
$$

最后一式只在名义来流 $U_0\boldsymbol e_x$ 与 P0 速度正交时成立，是运动学指标，不是求解后局部流速。$U_0\to0$ 而摆仍运动时，改用 $V_{\theta,ref}=r_J\omega_{ref}$ 定义 $Re_{osc},Fr_{osc},We_{osc}$，不能因 $Re_0=0$ 宣称没有惯性。

### 6.3 $Ur$、$KC$、质量/惯量与阻尼

只有当所选平衡点线性刚度 $K_0>0$ 时，才定义

$$
f_{n,b}=\frac{1}{2\pi}\sqrt{\frac{K_b}{I_b}},
\qquad
Ur_b=\frac{U_0}{f_{n,b}D},
\qquad
b\in\{\text{dry-air},\text{quiescent-water},
\text{coupled-eigenvalue}\}.
\tag{N34}
$$

每个 $Ur$ 必须带 frequencyBasis；响应频率给出的
$Ur_{resp}=U_0/(f_{resp}D)=1/St_{resp}$ 是输出，不能冒充输入。若
$\theta=\Theta\sin(2\pi f_{resp}t)$，则

$$
KC_b(r)=\frac{2\pi r\Theta}{D},\qquad
KC_J=\frac{2\pi r_J\Theta}{D},\qquad
\frac{A_y(r)}{D}=\frac{r\sin\Theta}{D}.
\tag{N35}
$$

大角时弧长 $r\Theta$ 与横移 $r\sin\Theta$ 不同；非简谐响应必须另报峰值速度、基频幅值和谐波。振荡来流的 $KC_{in}$ 与物体响应的 $KC_b$ 也是不同量。

建议同时保存工程比和正则 Buckingham 比：

$$
\begin{aligned}
m^*=\frac{m_{mov}}{\rho_lV_{w0}},\qquad
J^*=\frac{I_O}{I_d},\qquad
\zeta_s=\frac{c_\theta}{2\sqrt{I_OK_b}},
\\[2pt]
\widehat m=\frac{m_{mov}}{\rho_lD^3},\qquad
\widehat J=\frac{I_O}{\rho_lD^5},\qquad
K_\theta^*=\frac{K_b}{\rho_lU_0^2D^3},\qquad
C_\theta^*=\frac{c_\theta}{\rho_lU_0D^4}.
\end{aligned}
\tag{N36}
$$

$m_{mov}$ 和 $I_O$ 包含所有随摆固体，但不含另加的数值“added mass”；$I_d$ 只是排水体几何惯量。对 P0，$J^*$ 比单一 $m^*$ 更直接。$V_{w0}\to0$ 时 $m^*,J^*$ 发散，应使用 $\widehat m,\widehat J$。静水环降得到的 $\zeta_{qw}$ 已含流体耗散，不能作为结构阻尼再与完整 NS 叠加。

### 6.4 $AR$、阻塞、浸没和间隙不是各一个标量

至少输出

$$
\begin{aligned}
AR_c=\frac{L_c}{D},\qquad
AR_{w,cl}=\frac{L_{\rm axis,0}}{D},\qquad
AR_{w,V}=\frac{V_{w0}}{(\pi D^2/4)D},
\\[2pt]
B_w=\frac{D}{W},\qquad
B_A(t)=
\frac{\operatorname{area}[
\operatorname{proj}_{yz}(\mathcal C_w(t))]}{WH},\qquad
B_{env}=
\frac{y_{\max,\rm wet}-y_{\min,\rm wet}}{W}.
\end{aligned}
\tag{N37}
$$

总圆柱长径比、中心线湿长径比和体积等效湿长径比不得混用；宽度阻塞、湿投影面积阻塞和运动包络阻塞也不得压成一个 blockage。

表面贯穿状态分别保存枢轴余高、上端实体余高、下端浸深、质心浸深：

$$
F_O=\frac{O_z-\eta_0}{D},\quad
F_t=\frac{\max_{\rm top\,cap}z-\eta_0}{D},\quad
S_b=\frac{\eta_0-\min_{\rm bottom\,cap}z}{D},\quad
S_G=\frac{\eta_0-z_G}{D}.
\tag{N38}
$$

左右侧隙、底隙、端盖—最近固壁间隙均由真实有限圆柱表面的欧氏距离除以 $D$，并报告平衡值、$\min_t$ 和分位数。$g/D\le0$ 是几何接触/穿透的硬失败，不是“小间隙修正”。还需分列 $L_{up}/D,L_{down}/D$、圆柱/壁粗糙度类型与 $k_s/D$、入口湍流强度 $I$、积分尺度 $L_I/D$、谱和 Reynolds 应力；一个标量 $I$ 不能描述明显各向异性入口。

### 6.5 缩尺相似的不可能性和升级含义

若模型 2 相对原型 1 的尺度比为
$\lambda_D,\lambda_g,\lambda_\rho$，同时匹配
$Fr,Re,We,Ur,\widehat m,\widehat J,\zeta$ 和全部几何比所要求的必要缩放为

$$
\begin{gathered}
\frac{U_2}{U_1}=\sqrt{\lambda_g\lambda_D},\qquad
\frac{\nu_2}{\nu_1}=\sqrt{\lambda_g}\lambda_D^{3/2},\qquad
\frac{\gamma_2}{\gamma_1}=\lambda_\rho\lambda_g\lambda_D^2,\\
\frac{f_{n2}}{f_{n1}}=\sqrt{\frac{\lambda_g}{\lambda_D}},\qquad
\frac{m_2}{m_1}=\lambda_\rho\lambda_D^3,\qquad
\frac{I_2}{I_1}=\lambda_\rho\lambda_D^5,\\
\frac{K_2}{K_1}=\lambda_\rho\lambda_g\lambda_D^4,\qquad
\frac{c_2}{c_1}=\lambda_\rho\sqrt{\lambda_g}\lambda_D^{9/2}.
\end{gathered}
\tag{N39}
$$

同一水、同一重力且 $\lambda_D\ne1$ 时，匹配 $Fr$ 强制
$U_2/U_1=\sqrt{\lambda_D}$，于是
$Re_2/Re_1=\lambda_D^{3/2}$、
$We_2/We_1=Bo_2/Bo_1=\lambda_D^2$：三者不能同时相似。研究必须预先声明主导相似子集，将其余失真列入模型/参数不确定度。只匹配远端一个 $KC$ 也不能保证 P0 整个湿跨的 $\chi(r,t)$、湿润变化和角波形相似。

极限审计还包括：

- $\Theta\to0$：$KC_b,Re_m\to0$，但 $Re_0$ 可有限，退化为固定体尾流；
- $K_0\to0^+$：$Ur\to\infty$ 是近中性刚度病态，不等于高速；$K_0\le0$ 时 $Ur$ 未定义；
- $H/D\to\infty$：$Fr_H\to0$ 不要求 $Fr_D\to0$；
- $We,Bo\to\infty$：远离接触线的毛细作用可能小，但移动接触线奇异层不能据此自动删除；
- 大角和动态水面下 $AR_w,B_A,F_t,S_b,g/D$ 均为时变量，只报平衡值不足。

---

## 7. 可复现 Verification & Validation 矩阵

### 7.1 先区分四种结论

- code verification：离散方程是否按声明阶正确实现；
- solution verification：某一算例的网格、时间、域、统计和迭代误差是否受控；
- benchmark confirmation：是否复现相同规范问题的数值/解析参考；
- validation：模型是否在未参与校准的目标实验上具有预测能力。

运行状态只允许 PASS、FAIL、INCONCLUSIVE、OUT_OF_SCOPE。INCONCLUSIVE 包括非渐近网格序列、统计不足或多稳态未查清；OUT_OF_SCOPE 包括拿二维全浸没圆柱去“验证”表面贯穿三维摆。两者都不得合并进 PASS。

### 7.2 三网格、三时间步与 GCI

对三维网格 $k=1,2,3$（1 最细）定义

$$
\begin{gathered}
h_k=\left(\frac1{N_k}\sum_{e=1}^{N_k}\Delta V_e\right)^{1/3},
\qquad r_{21}=h_2/h_1,\quad r_{32}=h_3/h_2,\\
\phi_{\rm ext}^{21}=
\frac{r^{p_{\rm obs}}\phi_1-\phi_2}{r^{p_{\rm obs}}-1},\qquad
{\rm GCI}_{21}^{fine}=
1.25\,
\frac{|(\phi_1-\phi_2)/\phi_1|}
{r^{p_{\rm obs}}-1}.
\end{gathered}
\tag{N40}
$$

等比序列的 $p_{\rm obs}$ 用 (N23)；非等比序列必须按 Celik 等人的隐式公式求解 [S17]。要求 $r_{21},r_{32}\ge1.3$，且同步细化体网格、曲面几何、自由面、接触线和边界层；只在远场加单元不算系统细化。除体平均 $h_k$ 外，另报圆柱法向/切向、自由面和跨向的独立尺度。

本项目拟冻结的 GCI 门禁（不是文献普适阈值）为：

- 三层主 QoI 单调进入渐近区，等比序列的
  ${\rm GCI}_{32}/(r^{p_{\rm obs}}{\rm GCI}_{21})\in[0.85,1.15]$；
- MMS 的观测阶不低于形式阶减 0.25；
- 生产网格的均值、频率、摆幅细网格 GCI 目标 $\le1\%$，周期功/等效阻尼目标 $\le2\%$；
- $p_{\rm obs}\le0$、交替收敛或明显误差抵消时标 INCONCLUSIVE，增加第四网格或做带噪回归；
- $p_{\rm obs}>p_{\rm formal}+0.75$ 不能直接庆祝“超收敛”，须用第四网格和另一网格拓扑排除抵消。

时间收敛在至少中细空间网格上用
$\Delta t,\Delta t/2,\Delta t/4$，保持物理初值、统计窗和代数容差一致。BDF2 的光滑 MMS 目标 $p_t\ge1.75$；生产步长主 QoI 时间 GCI 目标 $\le0.5\%$，周期功/相位目标 $\le1\%$。相位漂移问题比较相位对齐的周期波形、频率和周期功，不能比较一个任意绝对时刻的瞬时值。

### 7.3 合并误差和通过规则

对参考量 $\phi_{\rm ref}$，保守误差带取

$$
B_\phi=
U_{h,\phi}+U_{\Delta t,\phi}+U_{\mathrm{domain},\phi}
+U_{\mathrm{stat},95,\phi}+U_{\mathrm{ref},95,\phi}
+U_{\mathrm{digit},\phi}+U_{\mathrm{param},\phi}.
\tag{N41}
$$

各项用同一物理单位；GCI 是误差带估计，不强行解释为高斯标准差。参考构型完全一致时，项目接受规则为

$$
|\phi_h-\phi_{\rm ref}|
\le\max(B_\phi,\delta_{\phi,\mathrm{project}}).
\tag{N42}
$$

$\delta_{\phi,\rm project}$ 必须在看见本次结果前冻结。若几何、边界或物理模型不同，只能作趋势对照；禁止加入任意“模型差异容差”把它放宽成 PASS。

### 7.4 必跑矩阵

下表“建议门禁”中，带文献数字者来自所列原始/官方来源；其余是本项目待 F4 冻结的建议，不是来源作者的普适主张。

| ID | 规范问题与执行配置 | 主要 QoI 与建议门禁 | 能证明 / 不能证明 |
|---|---|---|---|
| V0 | 几何、单位、法向、曲率、$J_\theta$、侧面/两端盖、压力/黏性/毛细力矩的解析多项式求积 | 机器精度或声明求积阶；$\theta\to-\theta$ 镜像；N/m 与 N 类型拒绝测试 | 只证符号、几何与求积 |
| V1 | 三维不可压 NS 制造解：$u_x,u_y,u_z,p$ 均依赖 $x,y,z,t$，非定常/对流/黏性/压力均非零 [S14] | 四网格分离测空间/时间阶；速度、压力、散度、边界牵引同时达到声明阶 | code verification，不证物理 |
| V2 | Ethier–Steinman 三维解析 NS 初边值问题 [S15] | $L^1,L^2,L^\infty$ 的 $\boldsymbol u,p$；按 §3.8 声明阶验收 | 独立解析确认 3D NS 路径 |
| V3 | 强非均匀周期移动网格上的常速度/常压力和静止液体；往返一周期 [S2] | 常状态误差 $\le10$ 倍代数容差；逐单元扫掠体积恒等；质量/动量无有向漂移 | 证离散 GCL，不证 FSI |
| V4 | 平水面、$U=0$、固定有限圆柱；$\theta=0,\pm5^\circ,\pm15^\circ,\pm30^\circ$，覆盖干/部分湿/全湿和端盖切换 | 压力梯度、$F_z=\rho gV_w$、表面力矩 = 排液体积矩；与 R1 精确圆弓积分对照；零矩用绝对尺度 | 证静水、端盖、真实湿面和浮力矩 |
| V5 | C0 静态弯月面/接触角数学基准 | C0 材料线不漂移；Young 角仅作输出；寄生流、表面能和体积随网格收敛 | 只证 C0 实现，不把 C0 验成实物 |
| V6 | C1 平板/曲壁 Navier 滑移 MMS；静态 Young 弯月面；C1a 前进—钉扎—后退循环；C1b 规定线速 | 滑移长度与牵引达到声明阶；$R_{\rm slip},R_{cl}$ 收敛；活动集只在 $\theta_R,\theta_A$ 切换；$E_\gamma+E_{sg/sl}$ 的余功 = $-D_{\rm slip}-D_{cl}$ | 证 C1 数值与热力学闭合；参数仍需材料实验 |
| V7 | DFG 2D-2，严格复制官方几何、抛物入口、Re=100 和系数定义 [S18,S19] | 官方 level-6 值：$C_D^{min}=3.1569,C_D^{max}=3.2200,\overline{C_D}=3.1884$；$C_L^{min}=-1.0206,C_L^{max}=0.9859,\overline{C_L}=-0.0173$；$St=0.30188$。项目目标：极值 $\le1\%$，St $\le0.5\%$，且 GCI 合格 | 证二维尾流、牵引、曲壁；不证目标装置 |
| V8 | 固定全浸没无限长近似圆柱；周期跨向域；$Re=180,\approx188.5,195$，扫描 $\lambda_z/D=3.8,3.96,4.1$ [S24] | 180 的三维扰动衰减、195 增长；项目目标 $Re_A=188.5\pm2,\lambda_A/D=3.96\pm0.05$；不同小扰动得同一线性增长率 | 证真实三维尾流和跨度解析；不证自由面/端部 |
| V9 | 无固体有限水深小幅重力—毛细波；$a/\lambda\le10^{-3}$，覆盖 $kH=0.5,2,\gtrsim10$ 及重力/混合/毛细区 [S20,S21] | $\omega^2=(gk+\gamma k^3/\rho)\tanh(kH)$；项目目标频率 $\le0.5\%$、黏性衰减 $\le2\%$、相位对齐波形 $L^2\le1\%$；体积门禁通过 | 证自由面惯性、重力、毛细和衰减；无接触线 |
| V10 | Dütsch 规定直线振荡速度场；Blackburn–Henderson：Re=500、$A/D=0.25$，先算同网格固定体 $f_v$，再扫 $F=f_o/f_v$ [S22,S26] | 复现速度/载荷波形；在 $F=0.875$ 周期流体对结构净功为正、$F=0.975$ 为负，95% 带不跨零；解析论文所示相位转换、弱混沌和长瞬态 | 证运动壁、力相位和功；主要文献为二维无自由面 |
| V11 | 强 FSI/附加质量：$m^*$ 或 $J^*$ 由重到轻扫描；单体与强分区互证；另跑 Turek–Hron 通用 FSI 回归 [S12,S13,S23] | 运动学/动力学接口残差达预设代数门；累计接口功缺口建议 $<0.1\%$ 交换功或黏性耗散；迭代数随 $\Delta t\to0$ 不假发散；两耦合法差落入 GCI | 专抓 added-mass 和强耦合；柔性梁基准不是刚体摆验证 |
| V12 | Blackburn–Govardhan–Williamson 低 Re 1DOF 横流自由 VIV，按原文质量、阻尼、跨距和 $Ur$ 扫描 [S25] | 先冻结论文图数字化；三维需复现响应包络、锁频频率区和低响应支路 2P；二维不得代替三维 PASS | 最接近自激锁频，但仍无自由面/有限端盖/转动摆 |
| V13 | 目标 P0 的 $U=0$ 小角释放；分别关黏性、结构阻尼和表面张力 | 无耗散极限的能量漂移按 $h,\Delta t$ 收敛；有耗散时与体/滑移/线耗散闭合；$\theta_0\to0$ 频率趋于精确静水线性化 | 连接目标几何与母模型，仍非实验 validation |
| V14 | 目标实验盲验证：先冻结几何、材料水线、入口、参数、QoI 和数值容差；校准集与盲测集按整次运行/几何分组 | 预测区间覆盖预注册 QoI；残差对 $Re,Fr,Ur,AR_w,B_A$、浸没和间隙无系统趋势；失败后不得改 QoI 再宣称通过 | 只有此层支持具体涡流摆预测能力 |

V7 所列数字是 [S18] 官方页“Exemplary Results”中的 level-6、$\Delta t=1/200$ 表值。该页还明确提供采用更高阶圆周线积分的新版官方数据包；实际验收前必须冻结所用 ZIP/数据文件的 SHA-256、离散族和系数定义，不能把旧表与新版曲线择优混用。这仍是数值 benchmark confirmation，不是实验 validation。

V4 的项目建议门限可先取
$|F_z-\rho gV_w|/(\rho gV_w)\le10^{-3}$、
力矩尺度化误差 $\le10^{-3}$、平面漂移 $<10^{-5}D$、寄生速度
$<10^{-6}\sqrt{gD}$；这些阈值必须通过实际离散可达性评审后冻结。对拟合 ALE，闭域累计体积目标可严到 $10^{-10}$ 相对量；VOF 可先取 $10^{-8}$，但都属于项目目标而非方法自动保证。

### 7.5 域、跨度、阻塞、统计窗与初值是五个独立轴

| 敏感性轴 | 最低运行集合 | 比较/通过语义 |
|---|---|---|
| 人工上/下游域 | 例如 $L_{up}/D=10,15,20$，$L_{down}/D=20,30,40$，实际值按波/尾流调整 | 最大两域的力矩、频率、摆幅和反射波差低于主 QoI 容差的 1/3；真实入口/出口构件不可移走 |
| 无界基准横向域 | 至少三宽度、逐级降人工阻塞 | 最大两域 $C_D,C_L,St$ 差建议 $<0.5\%$；真实槽宽是物理量，不做“域独立” |
| 周期跨距基准 | Mode A 至少 $L_z/D=4,8,16$，网格容纳临界波长 | 增长率、跨向谱和力 RMS；避免单一允许模态锁死。目标有限圆柱不得用周期跨向替代端盖 |
| canonical 湿跨/端区 | 真实 $L_c,L_w$；端盖、接触线、近底端分别轴向加密 | 端盖/侧面/线力分项和轴向谱各自 GCI |
| 时间步 | $\Delta t,\Delta t/2,\Delta t/4$ | 频率、周期功、相位和幅值时间 GCI |
| 阻塞物理扫描 | 实测值附近至少三点 $B_w,B_A$ | 作为参数效应，不归入数值误差；若外推无界须另有模型 |
| 统计窗 | $T,2T,4T$ 或直到 $N_{\rm eff}$ 门限 | 均值/RMS/谱/包络的加倍差落入合并 95% 带，建议 $N_{\rm eff}\ge30$ |
| 初值/尾流 | 静水 ramp、成熟固定体尾流、正/负微扰、至少两释放相位 | 单稳区落入总误差；多稳区分别报告吸引子与盆地，禁止平均成唯一解 |
| 网格拓扑 | 同等分辨率的两套独立局部布局 | 差异落入 GCI，否则单一网格族可能有偏 |

若自动时间步被使用，三个时间序列必须按同一比例缩放上限/误差容差并记录实际 $\Delta t(t)$。规定运动问题的 $f_v$ 必须在同一 Re、域、网格和边界上独立求得，不能直接抄一个文献 $St$ 后定义 $F$。

### 7.6 统计不确定度与文献数字化

非严格周期时以 (N28) 的自相关时间或分块均值估计 95% 统计带，保存
$T_{\rm discard},T_{\rm stat},\tau_{\rm int},N_{\rm eff}$ 及前/后半窗漂移。严格周期层流也至少保存 20 个已收敛周期；近分岔或长弛豫区由误差目标决定，可能超过 200 周期 [S26–S28]。

对于只有图形的规定运动/VIV 文献，必须先：

1. 固定出版商 PDF、页码/图号与 SHA-256；
2. 冻结坐标标定、采样点和数字化脚本；
3. 用两名操作者或两种工具估计数字化误差；
4. 冻结数据后再运行求解器。

完成前只能验收功率符号、模态和趋势，不得凭肉眼声称“误差 2%”。

### 7.7 硬失败与停止传播

任一项成立，目标三维结果不得标“已验证高保真”：

- MMS/Ethier 未达到声明阶，或 GCL 常流保持失败；
- 静水存在不收敛的寄生流，浮力/力矩与排液体积不一致；
- C1 滑移、动态角/滞后互补残差或表面能—线耗散不闭合；
- DFG、Mode A、重力—毛细波或规定运动功率符号超出冻结误差带；
- FSI 子迭代未收敛、added-mass 假发散、界面功不共轭；
- 任一 NaN、负体积、倒置单元、未接受时间步、未记录接触线跳格；
- 网格/时间不在渐近区却报告 GCI，或域/跨距/统计窗/初值敏感性超限；
- $N_{\rm eff}<30$ 或启动包络仍漂移却截断；
- 多稳态存在但只保留一支；
- 用二维、全浸没或周期无限跨基准宣称已验证自由面、端盖、接触线和目标装置；
- 文献构型不一致却用任意容差判 PASS；
- 三维目标算例尚未运行，却使用“已经收敛/通过”的完成时态。

失败运行可保存 partial=true 的诊断数据，但验证流水线必须 fail closed，不能让后处理把失败后的样本混进参数图。

---

## 8. 与统一计算平台的机器可校验合同

本节分两档理解。A1 国赛后端只强制实现：SI/坐标/二维单位分型、输入哈希、最小本地状态保存、质量/载荷/功率输出、V&V 证据和容差内可重复。完整原子 checkpoint、跨版本迁移、MPI/GPU 位级确定性和大规模 provenance 属于未来 Level B 推荐合同，不是本轮 A1 的否决门。

### 8.1 两个真值哈希，而不是一个配置文件名

唯一权威输入是带显式单位、经一次转换后存为 SI 的 PhysicalRunSpec。无量纲量全部由 §6 的冻结参考量派生且只读，绝不与 SI 参数形成两个可互相覆盖的真值源。每次运行生成：

- physicalInputHash：只覆盖物理拓扑、坐标、几何、材料、初边值条件、润湿/相模型、启动历史和观测定义；
- resolvedRunHash：覆盖 physicalInputHash、后端/代码版本、解析后的全部数值参数、网格、编译和适配器。

后端默认值必须先展开进 resolvedRunSpec 再哈希。GUI 名称、文件路径和墙钟时间不进 physicalInputHash。P0 与 V1 即使数值参数恰好相同，topology ID 不同，哈希也必须不同。

### 8.2 RunSpec 输入

~~~text
RunSpec
├── schemaVersion / problemId
├── physicalInput
│   ├── topology / coordinateFrame / geometry
│   ├── materials / suspension / constraints
│   ├── flowOperatingPoint / initialConditions
│   ├── boundaryConditions / forcingSchedule
│   ├── wettingModel / phaseModel / turbulenceModel
│   ├── terminationEvents / observationDefinitions
│   └── nondimensionalReference (derived, read-only)
├── backendRequest
├── outputRequest
├── executionPolicy
└── comparisonContext
~~~

geometry 必须直接消费 R1 的 $O,R,\ell_t,\ell_b,\mathcal C(\theta)$、水槽曲面、侧面/两端盖 ID、质心、惯量、止挡和所有间隙；不得再消费一个模糊 pendulumLength 代替几何核。coordinateFrame 固定：

~~~text
frameId = lab
handedness = right
x = inlet_to_outlet
y = positive_crossflow
z = upward
thetaSense = right_hand_about_+x
forceSense = fluid_on_body
momentReference = fixed_pivot_O
pressure = gauge_relative_to_atmosphere
curvature = -surface_divergence(outward_liquid_normal)
~~~

physicalInput 还必须包含完整入口剖面/ramp、出口特征、初始三维场或 precursor checkpoint、自由面、$(\theta,\omega)$、水线材料观测、C0/C1a/C1b、单/两相、DNS-candidate/LES/URANS 以及终止事件。裸数值字段不允许同时可能是 SI、格子单位或无量纲量；LBM 格子量只放在 backendResolved.latticeUnits，并保存 (N15) 映射。

JSON Schema 应关闭未知字段，语义验证再检查正值、量纲、几何不相交、初始通量、初始 ALE Jacobian、相容边界和独立 $\Pi$ 群。后端不能支持的字段必须在分配资源前拒绝，或列入显式 BackendProjectionManifest；禁止静默忽略。

### 8.3 capability 与 validatedEnvelope

后端启动前返回空间维数、拓扑、相模型、自由面方法、润湿分支、DOF、原生载荷类型、暂停恢复、确定性等级和 V&V 包版本。validatedEnvelope 是只读结构：

~~~text
backendBuildHash × discretizationFamily × physicsBranch × topologyId
× parameterDomain × geometryDomain × initialConditionClass
× observableClaim × errorMetric × verificationEvidence
~~~

其参数域至少逐项含 $Re,Fr_D,Fr_H,We/Bo,Ur,KC,m^*,J^*,\zeta$、
$AR_c,AR_w,B_w,B_A$、浸没/余高/间隙、角幅/角速、粗糙度、入口湍流、润湿、相和湍流分支。每个 observableClaim 单独给允许误差；可能频率已验证而瞬时力矩未验证。运行判定为 inside、outside、unknown 或 not_applicable；缺参是 unknown，不是通过。maxReynolds 或 validated=true 这样的用户字段无权修改它。

当前候选后端的初始状态必须是：

- cfd2d-strip-reference：对二维原生量 unvalidated，直到实际完成对应基准；
- cfd3d-fs-fsi-local：unimplemented 或实现后的 unvalidated；
- C0：wetting=C0-unvalidated-benchmark；
- C1a/C1b：在材料参数、单物理 V&V 和盲验证完成前均 unvalidated。

### 8.4 输出量、单位和二维/三维分型

每个 QuantityDescriptor 至少含 quantityId、单位、量纲向量、frameId、正方向、参考点、nativeSpatialDimension、measureKind、extensivity、normalizationId、观测算子、qualityStatus 和 uncertainty。三维后端至少输出：

- $\theta,\dot\theta,\ddot\theta$；
- 压力、黏性、毛细分项及合计的 $\boldsymbol F,\boldsymbol M_O,Q_\theta,P_\Gamma$；
- 湿面侧面/上端盖/下端盖/接触线分项；
- 自由面、湿面、接触线位置/角度/活动集和 $E_{sg/sl}$；
- 三维 $\boldsymbol u,p,\boldsymbol\omega$、涡结构和声明的观测算子；
- 液体体积、质量/动量/角动量/接口功/总能量残差；
- 物理黏性、结构、滑移、接触线、SGS 和数值耗散；
- 网格质量、Newton/线性/FSI 残差、拒绝步和重网格审计；
- 派生幅频/相位/功率的舍弃窗、统计窗、FFT/拟合算法及不确定度。

量纲值和无量纲值同时保存。固定参考面积 $A_{ref}$ 和力臂 $L_{ref}$ 下

$$
\begin{gathered}
C_D^{3D}=\frac{F_x}{\tfrac12\rho U_0^2A_{ref}},\qquad
C_L^{3D}=\frac{F_y}{\tfrac12\rho U_0^2A_{ref}},\qquad
C_Q^{3D}=\frac{Q_\theta}
{\tfrac12\rho U_0^2A_{ref}L_{ref}},\\
c_d^{2D}=\frac{f'_x}{\tfrac12\rho U_0^2D},\qquad
c_l^{2D}=\frac{f'_y}{\tfrac12\rho U_0^2D},\qquad
c_m^{2D}=\frac{m'}{\tfrac12\rho U_0^2D^2}.
\end{gathered}
\tag{N43}
$$

二维原生 forcePerSpan、momentPerSpan、powerPerSpan 的单位分别为 N/m、N、W/m；三维原生量才是 N、N·m、W。条带重构必须标
origin=strip_reconstruction、nativeSpatialDimension=2、
reportedSpatialDimension=3、fidelityClass=approximate、
spanCoupling=absent，并保存积分权重/相干 closure。schema 必须阻止把 N/m 写进 N 字段。

场文件用 HDF5/XDMF 或等价自描述容器；CSV 仅存标量时序并带 sidecar 元数据。每个数据集有单位、坐标、时间基、缺测掩码、处理链和内容哈希。

### 8.5 checkpoint、暂停与恢复

对 A1，最小要求是在完整二维时间步末暂停，并能保存/恢复本机同版本的网格/格子状态、刚体状态、时间、配置哈希、步长历史和 RNG；恢复后短时 QoI 在冻结容差内重现即可。浏览器仅在内存暂停也必须明确标 volatile-pause，不能宣称进程退出后可恢复。

未来 Level B 的完整路线才要求协作式安全暂停：pause_requested 后，求解器继续到一个满足下列条件的接受步：Newton/强 FSI 收敛、活动集一致、网格合格、质量/功/能量账本已算、输出已刷新。再写检查点并校验，UI 才显示 paused。强制中断在线性/Newton 子迭代中只能生成不可恢复 diagnosticDump。

Level B 完整 checkpoint 建议包含：

- 已接受的 $t^n$、步号、物理时间原点及全部 BDF 历史；
- 网格拓扑、曲几何、ALE 映射/速度、分区和重网格祖先；
- $\boldsymbol u,p,\Gamma$，或 VOF/level-set 的全部相场与质量修正历史；
- $\theta,\omega,\dot\omega$、结构离散历史、约束和事件活动集；
- C1 接触线位置、$\theta_d,V_{cl}$、滞后状态、$\ell_s,\zeta_{cl}$；
- 上一接受步的 FSI/Aitken/IQN 历史、自适应步长控制器、SGS/壁模型状态；
- 入口/出口 ramp/相位、随机数生成器算法和完整状态；
- 累计统计、质量、动量、功率、耗散和能量积分；
- physicalInputHash、resolvedRunHash、网格/代码/构建哈希、schema 版本、父 checkpoint ID 和字节校验和。

resume 前重验必要哈希和 capability。换 backend、网格或物理分支不是透明恢复，而是具有显式投影算子和 parentRunId 的新 child run。A1 不要求跨版本/跨机器迁移；验收只需从同一状态做“连续运行”和“暂停—恢复”短重放。Level B 若承诺迁移，才需完整版本化迁移测试和原子提交。

### 8.6 “相同输入”跨后端比较

完全同输入要求 physicalInputHash、topology、坐标、符号、初值/启动历史、观测算子和无量纲参考一致。二维后端不能消费完整三维输入，必须生成：

~~~text
BackendProjectionManifest
├── consumedFields
├── derivedFields
├── approximatedFields
├── ignoredFields
├── unsupportedFields
├── projectionEquations
├── closureIds
└── projectionVersion / projectionHash
~~~

有 ignoredFields 时只能称“同一物理输入的二维投影”，不能称完全同输入；改变拓扑/DOF 的字段必须 unsupported 并拒绝。只比较共同观测算子：统一量纲、采样、瞬态剔除、统计窗、FFT 窗函数、频率和幅值定义。不同维数的场不逐点比较；混沌/准周期区比较分布、谱和功率，不要求长期逐时刻轨迹重合。不得无声明地做任意时间平移、动态时间规整或幅值重标。

比较报告把离散、时间、域/跨度、统计、维数投影、模型、参数和实验不确定度分列，不能只给一条“相对误差”。

### 8.7 provenance 与确定性

每次运行保存：代码提交和 dirty diff hash、可执行/容器 hash、编译器/选项/浮点精度、线性代数/网格/单位库、OS/CPU/GPU/驱动/MPI 拓扑、网格生成器及输入/最终网格 hash、两个 RunSpec hash、checkpoint 祖先、RNG、基准 DOI/URL/访问日/文件 hash、V&V 版本、UTC 起止时刻和所有输出 hash。敏感令牌或用户名不是复现信息，不应写入。

确定性不用布尔量，而分：

- D0 unknown/nonreproducible；
- D1 statistical：轨迹可不同，冻结统计量在容差内复现；
- D2 numerical：同构建/硬件类别/并行配置的 QoI 在数值容差内复现；
- D3 bitwise：同构建、硬件和线程/MPI 拓扑逐位一致。

请求等级和实际等级分别保存。A1 以 D2 numerical 为目标，D3 不作为本轮要求。GPU 原子归约、MPI 树变化、自适应网格次序或编译器变化通常使 D3 降级。固定 seed 不等于确定性；物理混沌造成长期轨迹分离也不等于程序随机，应以短重放和统计复现分别审计。

### 8.8 结构化失败

每个 FailureFlag 至少有 code、severity、phase、time/step、quantityId、observedValue、threshold、remediation、recoverable、resultImpact 和 evidenceRef。以下是不可接受结果的硬失败：

~~~text
SCHEMA_INVALID / UNIT_MISMATCH / TOPOLOGY_UNSUPPORTED
CAPABILITY_MISMATCH / GEOMETRY_INTERSECTION
INITIAL_CONDITION_INCOMPATIBLE / NEGATIVE_MESH_JACOBIAN
NONFINITE_STATE / LINEAR_SOLVER_FAILED / NONLINEAR_SOLVER_FAILED
FSI_NOT_CONVERGED / CONTACT_ACTIVE_SET_NOT_CONVERGED
TIMESTEP_RETRY_EXHAUSTED / MASS_BALANCE_HARD_LIMIT
POWER_CONJUGACY_HARD_LIMIT / ENERGY_AUDIT_HARD_LIMIT
CHECKPOINT_CORRUPT / RESUME_HASH_MISMATCH
~~~

可信度警告包括 OUTSIDE_VALIDATED_ENVELOPE、GRID/TIME/DOMAIN/SPAN_CONVERGENCE_NOT_DEMONSTRATED、STATISTICAL_WINDOW_TOO_SHORT、INITIAL_CONDITION_SENSITIVITY_UNKNOWN、DETERMINISM_DOWNGRADED、MODE_A_UPGRADE_TRIGGER、STRIP_RECONSTRUCTION_USED 和 PARTIAL_OUTPUT_ONLY。顶层只用 accepted、accepted_with_warnings、failed；completed 只表示程序走到终点，不表示物理验证通过。

---

## 9. 对现有原型的独立审计：为什么它不是高保真求解器

本节是 2026-08-20 对当前工作树的只读事实审计，不是对未来设计意图的评价。

### 9.1 实际不存在可加载的数值后端

src/worker/runtime.ts:32–40 动态导入 ../solvers/forward 和
../solvers/highFidelity；但 src/solvers/ 下实际只有
forward/model.ts，两个目录入口 forward/index.ts 和
highFidelity/index.ts 都不存在。也就是说：

- forward/model.ts 是一套四状态 Van der Pol 尾流振子 ROM 核，不是可由 worker 加载的完整 backend；
- highFidelity 没有流场推进、碰撞/流固边界、压力、自由面或 FSI 实现；
- 目前“高保真”只存在于类型、表单、能力声明和 UI 标签。

tests/plugin-contract.test.ts 只确认插件列出了 forward/highFidelity 等合同字段；它不能证明求解器存在，更不能证明 PDE 或 V&V。

### 9.2 capability 声明没有实现证据

src/problems/vortex-pendulum/plugin.ts 声明 highFidelity 为“二维浸入边界 LBM”、可 pauseResume、fieldFrames、parameterSweep 和 deterministicSeed。当前没有：

- D2Q9 碰撞/迁移、MRT 矩阵、入口/出口或曲壁力；
- 任何 checkpoint 序列化、原子写和恢复校验；
- seed 到初始扰动/RNG 的实现链；
- 空间/时间收敛、守恒残差或 validatedEnvelope。

runtime 的 paused 只是在同一内存 worker 中等待事件循环；页面/进程退出后没有可恢复状态，不能等同 §8.5 的 checkpoint/resume。

### 9.3 二维类型被命名成三维 SI 总力

src/core/types.ts:115–124 的 FieldFrame 只有 width、height、二维
vorticity/speed 和圆位置，没有 $z$、网格拓扑、单位、坐标 frame 或压力。若未来实现二维 LBM，其自然原生载荷是 N/m、单位跨距力矩是 N；但
SimulationSample.fluidForce 和插件 observable 均固定为 N。没有显式挤出跨长或条带 closure，这会把二维线力悄悄伪装成三维总力。

同一结果类型也没有压力/黏性/毛细分项、力矩参考点、接口功、质量/动量/能量残差、统计窗算法、QoI 不确定度或 per-quantity qualityStatus。现有 provenance 仅 solver/version/time/configHash 和可选格子 Re/$\tau$，不足以复现。

### 9.4 默认物理槽和默认格子域互相矛盾

默认物理参数为 $D=0.012\,\mathrm m,L_{w0}=0.06\,\mathrm m,W=0.18\,\mathrm m,H=0.12\,\mathrm m,U=0.017\,\mathrm{m/s},\nu=1.004\times10^{-6}\,\mathrm{m^2/s}$。它们给

$$
\begin{gathered}
Re_0=203.187,\quad AR_w=5,\quad B_w=0.06667,\quad
B_A=0.03333,\\
Fr_D=0.04956,\quad Fr_H=0.01567 .
\end{gathered}
\tag{N44}
$$

但默认 highFidelity 取
$n_x\times n_y=144\times72,D_{lu}=18$，即格子域只有
$8D\times4D$，数值横向阻塞 $D/L_y=0.25$，不是物理输入的
$D/W=0.0667$，也没有 $H/D=10$ 的竖直/自由面维度。即使未来这套 LBM 能跑，输出也不代表用户所填的有限水槽。

默认 $\tau=0.51196$、$Ma=0.07794$ 只说明按当前映射靠近低黏格子稳定区且名义马赫数较低；它们不证明域足够、曲壁牵引正确、物理阻塞匹配或结果收敛。默认 $Re\approx203$ 还已超过理想无限圆柱 Mode A 的二维稳定边界；这不是断言本装置阈值相同，而是说明把二维结果当真实三维响应尤其无根据。

### 9.5 “验证上限”可以被用户改写

highFidelity.maxReynolds 是普通用户参数，插件允许 1–10000；
validateConfig() 只是比较当前 Re 是否小于这个用户值。因此用户上调数字即可绕过所谓“已验证范围”。验证包络必须由后端版本和证据只读生成，绝不能由被模拟参数修改。

同理，penalizationStrength 是 0–1 的“每步松弛强度”。没有按
$\Delta t$ 和物理罚时间尺度无量纲化，它随时间步改变等效边界条件，不能作为网格无关材料/边界参数。弥散 penalty 也没有厚度和力矩收敛审计。

### 9.6 原型混合了 P0 与 V1，且为完整 NS 预埋双计数

forward/model.ts 的浸没式
$L_w=L_{w0}-L_p(1-\cos\theta)$ 对应圆柱全过程竖直平移的 V1；
但有效惯量又把圆柱/质量按摆长绕轴转动，力矩把合力乘固定
$L_p\cos\theta$，更像点化 P0。它没有 $O,\ell_t,\ell_b$、端盖、真实水面或 $\boldsymbol J_\theta(\boldsymbol x)$，不能成为 P0 几何核。

配置还把 addedMassCoefficient、经验升阻力和静水阻尼放在共享
physical 字段。若以后完整 NS 后端沿用这些量自动加在机械式上，会重复计算非定常压力、黏性和静水。生产 schema 必须将 ROM closure 与 HF-total/HF-split 分型，并强制 hydrostaticAccounting。

### 9.7 审计结论

当前原型是**带有二维 LBM 设想的 ROM/UI 脚手架**，不是二维研究求解器，更不是三维自由表面 FSI 高保真求解器。任何论文图若由当前树生成，只能标为 ROM/界面原型。要升级，不能只补一个 highFidelity 文件；必须实现 §§1–8 的几何、PDE、润湿、保功耦合、守恒、V&V、checkpoint 和 provenance 合同，并实际运行验收。

本轮实际升级应收束为 §4.1 的 A1：先实现固定圆柱、规定横移和单位跨长载荷/功率，完成文末 A 类验收后再选择是否加入二维弱/强 FSI。它只需落实 §§1–8 中与二维投影、单位分型、守恒、基准和最小状态恢复有关的合同。三维 ALE/VOF、C1 润湿、完整强耦合与 Level-B checkpoint 是后续论文级升级路线，不是本轮软件的失败门；未实现时应报告 capability=absent，而不是用占位参数伪装。

---

## 10. 量纲、极限、能量与证据状态总审计

### 10.1 逐链量纲审计

| 对象/公式 | 量纲链 | 结果 |
|---|---|---|
| (N5) 动量项 | $\rho\,\partial_tu$ | kg·m$^{-2}$·s$^{-2}$=N/m³ |
| 压力梯度/黏性散度 | Pa/m、$\mu\nabla^2u$ | N/m³ |
| (N8) 湿面广义矩 | Pa·m²·$J_\theta$[m] | N·m |
| (N8) 毛细线矩 | $\gamma$[N/m]·d$\ell$[m]·$J_\theta$[m] | N·m |
| (N10) $Q_\theta\dot\theta$ | N·m·s$^{-1}$ | W |
| (N11) 流体/表面能 | $\rho u^2dV,\gamma dA$ | J |
| (N16) 网格伪弹性 | $\nabla\cdot[\mu_mD(d_m)]$ | 取决于数值 $\mu_m$，等式两项一致 |
| (N18) 每个步长尺度 | $h/u,h^2/\nu,\sqrt{\rho h^3/\gamma},1/\omega$ | s |
| (N21) P0 映射 | $H$[m]·$\dot\theta$[s$^{-1}$]；$H^Tf_\Gamma$ | m/s；N·m |
| (N24) 二维单位跨矩 | Pa·d$s$[m]·$J_\theta$[m] | N |
| (N25) 条带积分 | $q^{2D}$[N]·$w_i$[m] | N·m |
| (N27) $R_M,R_P,R_E$ | kg、W、J | 三种残差不可混归一化 |
| (N30) $I_d,r_J$ | $\rho J_\theta^2dV$、$\sqrt{I_d/m_d}$ | kg·m²、m |
| (N36) $C_\theta^*$ | $c_\theta/(\rho UD^4)$ | 1 |
| (N43) 二/三维系数 | 对应载荷/对应同量纲尺度 | 1 |

角度以 rad 存储但量纲为 1。二维单位跨距力矩为 N 不是 N·m，是本项目最容易漏掉的量纲陷阱。

### 10.2 正则与奇异极限

| 极限 | 正确行为 | 失败信号 |
|---|---|---|
| $h,\Delta t\to0$ | 光滑分支误差按实测阶下降，人工耗散/守恒缺陷消失 | QoI 不收敛、误差平台高于代数容差 |
| $\rho,\mu,\gamma\to0$ 分别取极限 | 流体惯性、黏性、毛细项分别消失；但每次只改变一个物理极限 | 一项关闭引发无关项跳变 |
| $U_0\to0$ | 仍可有摆致非定常流与黏性衰减，换振荡速度基准 | 把所有水动力置零 |
| $\theta\to0$ | P0 保留沿 $r$ 的速度梯度；静水矩趋于 R1 线性化 | 偷换成 V1 整体平移 |
| $W,H,L_{up},L_{down}\to\infty$ | 相应人工/物理壁影响逐步消失 | 用一个“有效 Re”吸收所有边界 |
| $AR_w\to\infty$ | 中段趋于无限跨，但自由面/底端仍是局部端区 | 有限 $AR_w$ 被二维全相干乘长替代 |
| $\ell_s\to0$ 且 $V_{cl}\ne0$ | C1 回到移动线奇异极限，不保证平滑收敛到 C0 | 把网格依赖应力峰称物理解 |
| $m^*,J^*\to0$ | added-mass 耦合更强，需单体/稳健强耦合 | 仅靠减步长或加物理阻尼维持 |
| $Fr_D\to0$ | 远场波幅可能小；表面贯穿端条件仍存在 | 由小 Fr 推断可删自由面 |
| $We\to\infty$ | 全局毛细相对小；接触线局部层可能仍重要 | 自动删除润湿模型 |

### 10.3 能量和记账互斥

每个运行必须选择且只选择一种：

| accounting | 机械端 | 流体端 | 明令禁止 |
|---|---|---|---|
| HF-total | 干结构重力/弹性 | 总表压+黏性+毛细的真实牵引 | 再加 $\Pi_h$、added mass、经验流体阻尼 |
| HF-split | 干结构+$\Pi_h$ | 减去同一静水参考压的动态牵引 | 又积分总压或加 added mass |
| ROM-energy | 结构+$\Pi_h$+经势流/标定的 $I_a$ | 仅剩余尾流/黏性/记忆闭合 | 与同一完整 NS 牵引并用 |

C0 需闭合 (N12) 且 $\mathcal D_{\rm slip}=\mathcal D_{cl}=0$；C1 需把
$E_{sg/sl},\mathcal D_{\rm slip},\mathcal D_{cl}$ 全部纳入。Level A 的账本按单位跨距输出 J/m 和 W/m；只有条带积分后才形成三维 J/W。稳定周期的结构功还须通过 (N13)。

### 10.4 已执行与未执行证据账本

| 项目 | 当前状态 | 可以怎样表述 |
|---|---|---|
| R1 平水面有限圆柱静水几何脚本 | 已执行；R1 记录体积残差约 $4.34\times10^{-19}\,\mathrm{m^3}$、特殊闭式力矩残差约 $3.41\times10^{-13}\,\mathrm{N\,m}$ | 只证明该解析几何分支 |
| R2 精确静水势二阶差分 | 已由相邻备忘录记录执行 | 只证明静水符号/圆弓积分 |
| 当前 highFidelity backend | 不存在 | 不得写“LBM 已运行” |
| A0/A1 二维 CFD、DFG、规定运动 | 未运行 | 全部是实施/验收计划 |
| 三维 ALE/VOF、Mode A、自由面波、FSI | 未运行 | 全部是论文级路线 |
| canonical 网格/时间/GCI/域/统计 | 未运行 | 没有任何“收敛通过”结论 |
| 目标实验盲验证 | 未运行 | 尚无具体装置预测能力证据 |

因此本文的贡献是**数值方法设计、证据边界和可复现验收合同**，不是一份计算结果报告。

---

## 11. 符号表

| 符号 | 定义 | SI/量纲 |
|---|---|---:|
| $O,\boldsymbol e_x,\boldsymbol e_y,\boldsymbol e_z$ | 固定枢轴参考点及实验室基 | m、1 |
| $\theta,\omega,\dot\omega$ | 绕 $+\boldsymbol e_x$ 的角、角速度、角加速度 | 1、s$^{-1}$、s$^{-2}$ |
| $\boldsymbol d,\boldsymbol c$ | 圆柱轴向和局部横移单位向量 | 1 |
| $R,D,L_c,\ell_t,\ell_b$ | 圆柱半径、直径、总长、近/远端轴坐标 | m |
| $\boldsymbol J_\theta$ | 刚体面虚位移核 $\partial_\theta\boldsymbol x_b$ | m |
| $\Omega_f,\Gamma,S_w,S_d,\mathcal C_b$ | 液体域、自由面、湿/干刚体面、接触线 | 集合 |
| $\eta,F$ | 自由面高程、隐式面函数 | m、m（按本文定义） |
| $\boldsymbol u,\boldsymbol w,\boldsymbol u_b$ | 流速、ALE 网格速度、刚体面速度 | m/s |
| $p,\rho,\mu,\nu$ | 表压、密度、动力/运动黏度 | Pa、kg/m³、Pa·s、m²/s |
| $g,\gamma,\kappa$ | 重力加速度、表面张力、曲率 | m/s²、N/m、m$^{-1}$ |
| $\gamma_{sg},\gamma_{sl},A_{sg},A_{sl}$ | 固—气/固—液表面能密度及相应面积 | N/m、m² |
| $\boldsymbol n,\boldsymbol n_b,\boldsymbol m,\boldsymbol m_s$ | 自由面法向、固体外法向、自由面/固面余法向 | 1 |
| $\boldsymbol\sigma,\boldsymbol D$ | Cauchy 应力、应变率张量 | Pa、s$^{-1}$ |
| $I_O,c_\theta,K_0$ | 干结构枢轴惯量、转动阻尼、切线刚度 | kg·m²、N·m·s、N·m |
| $\boldsymbol F,\boldsymbol M_O,Q_\theta$ | 三维合力、关于 $O$ 的矩、广义流体矩 | N、N·m、N·m |
| $P,E,\mathcal D$ | 功率、能量、耗散率 | W、J、W |
| $V_w,m_d,I_d,r_J$ | 排水体积、排水质量、排水几何惯量、RMS 力臂 | m³、kg、kg·m²、m |
| $C$ | VOF 液相体积分数（仅两相分支） | 1 |
| $\ell_s,\beta_s$ | Navier 滑移长、切向摩擦系数 $\mu/\ell_s$ | m、Pa·s/m |
| $\theta_d,\theta_e,\theta_R,\theta_A$ | 动态、平衡、后退、前进接触角 | 1 |
| $V_{cl},\zeta_{cl}$ | 相对固体接触线速度、线摩擦系数 | m/s、N·s/m² |
| $\lambda_V,\lambda_c$ | 体积约束与机械/润湿活动集乘子 | 依所乘约束而定 |
| $D_{lu},U_{lu},s_\nu,\tau_\nu$ | 格子直径/速度及剪切模态松弛率/时间 | 格子单位、1 |
| $h,\Delta t,p_{\rm obs}$ | 代表网格尺度、时间步、观测收敛阶 | m、s、1 |
| $R_M,R_P,R_E$ | 时间积分质量、接口功率、能量缺陷 | kg、W、J |
| $U_0,Q_0,A_0$ | 上游体积均速、流量、湿截面积 | m/s、m³/s、m² |
| $Re,Fr,We,Bo,Ca$ | 黏性、重力波、毛细相似群 | 1 |
| $Ur,KC,St$ | 约化速度、运动幅频群、Strouhal 数 | 1 |
| $m^*,J^*,\widehat m,\widehat J,\zeta_s$ | 工程/正则质量惯量比与结构阻尼比 | 1 |
| $AR_c,AR_w,B_w,B_A,B_{env}$ | 总/湿长径比及三种阻塞量 | 1 |
| $F_O,F_t,S_b,S_G,g/D$ | 余高、浸深和无量纲间隙 | 1 |
| $GCI,U_\bullet,B_\phi$ | 离散/各源/合并误差带 | 与 QoI 相同或相对量 |

---

## 12. 原始论文与官方文档索引

> 本节所有链接访问日期均为 **2026-08-20**。只使用方法原始论文、基准原始论文或官方项目/题面页面。文献证明的是所列方法、规范问题或历史数值；它不证明本仓库实现正确，更不证明 canonical 三维算例已经运行。

1. **[S1] ALE 原始方法。** Hirt, C. W., Amsden, A. A. & Cook, J. L. (1974), “An Arbitrary Lagrangian–Eulerian Computing Method for All Flow Speeds,” *Journal of Computational Physics* 14, 227–253. [DOI: 10.1016/0021-9991(74)90051-5](https://doi.org/10.1016/0021-9991(74)90051-5)。证据边界：ALE 方法源流，不给本项目自由面/FSI 收敛保证。
2. **[S2] 几何守恒律。** Thomas, P. D. & Lombard, C. K. (1979), “Geometric Conservation Law and Its Application to Flow Computations on Moving Grids,” *AIAA Journal* 17, 1030–1037. [DOI: 10.2514/3.61273](https://doi.org/10.2514/3.61273)。证据边界：支持 GCL/常流保持验收。
3. **[S3] Taylor–Hood 元。** Taylor, C. & Hood, P. (1973), “A Numerical Solution of the Navier–Stokes Equations Using the Finite Element Technique,” *Computers & Fluids* 1, 73–100. [DOI: 10.1016/0045-7930(73)90027-3](https://doi.org/10.1016/0045-7930(73)90027-3)。证据边界：有限元对的原始来源；本文的三维误差阶仍须 MMS 实测。
4. **[S4] VOF。** Hirt, C. W. & Nichols, B. D. (1981), “Volume of Fluid (VOF) Method for the Dynamics of Free Boundaries,” *JCP* 39, 201–225. [DOI: 10.1016/0021-9991(81)90145-5](https://doi.org/10.1016/0021-9991(81)90145-5)。证据边界：VOF 原始方法，不证明现代曲率/接触线精度。
5. **[S5] level set 两相流。** Sussman, M., Smereka, P. & Osher, S. (1994), “A Level Set Approach for Computing Solutions to Incompressible Two-Phase Flow,” *JCP* 114, 146–159. [DOI: 10.1006/jcph.1994.1155](https://doi.org/10.1006/jcph.1994.1155)。证据边界：方法源流；质量误差须另验。
6. **[S6] 浸入边界。** Peskin, C. S. (1972), “Flow Patterns Around Heart Valves: A Numerical Method,” *JCP* 10, 252–271. [DOI: 10.1016/0021-9991(72)90065-4](https://doi.org/10.1016/0021-9991(72)90065-4)。证据边界：IB 原始思想，不支持未经收敛的圆柱力矩。
7. **[S7] Chimera/overset。** Benek, J. A., Buning, P. G. & Steger, J. L. (1985), “A 3-D Chimera Grid Embedding Technique,” AIAA Paper 85-1523. [DOI: 10.2514/6.1985-1523](https://doi.org/10.2514/6.1985-1523)。证据边界：overset 源流，不证明插值守恒。
8. **[S8] 连续表面力。** Brackbill, J. U., Kothe, D. B. & Zemach, C. (1992), “A Continuum Method for Modeling Surface Tension,” *JCP* 100, 335–354. [DOI: 10.1016/0021-9991(92)90240-Y](https://doi.org/10.1016/0021-9991(92)90240-Y)。证据边界：CSF 原始公式。
9. **[S9] balanced-force。** François, M. M. et al. (2006), “A Balanced-Force Algorithm for Continuous and Sharp Interfacial Surface Tension Models within a Volume Tracking Framework,” *JCP* 213, 141–173. [DOI: 10.1016/j.jcp.2005.08.004](https://doi.org/10.1016/j.jcp.2005.08.004)。证据边界：压力—毛细平衡设计，仍须本项目寄生流测试。
10. **[S10] overset 通量修正。** Chandar, D. D. J. & Sitaraman, J. (2022), “A Flux Correction Approach for the Pressure Equation in Incompressible Flows on Overset Meshes in OpenFOAM,” *Computer Physics Communications* 273, 108279. [DOI: 10.1016/j.cpc.2021.108279](https://doi.org/10.1016/j.cpc.2021.108279)。证据边界：说明标准 overset 插值的守恒风险及一种修正；不是本项目实现证明。
11. **[S11] 移动接触线奇性。** Huh, C. & Scriven, L. E. (1971), “Hydrodynamic Model of Steady Movement of a Solid/Liquid/Fluid Contact Line,” *Journal of Colloid and Interface Science* 35, 85–101. [DOI: 10.1016/0021-9797(71)90188-3](https://doi.org/10.1016/0021-9797(71)90188-3)。证据边界：经典无滑锐线奇性。
12. **[S12] added-mass instability。** Causin, P., Gerbeau, J.-F. & Nobile, F. (2005), “Added-Mass Effect in the Design of Partitioned Algorithms for Fluid–Structure Problems,” *CMAME* 194, 4506–4527. [DOI: 10.1016/j.cma.2004.12.005](https://doi.org/10.1016/j.cma.2004.12.005)。证据边界：分区不稳定机理，不给本装置具体质量比阈值。
13. **[S13] 分区强耦合。** Matthies, H. G. & Steindorf, J. (2003), “Partitioned Strong Coupling Algorithms for Fluid–Structure Interaction,” *Computers & Structures* 81, 805–812. [DOI: 10.1016/S0045-7949(02)00409-1](https://doi.org/10.1016/S0045-7949(02)00409-1)。证据边界：块 Newton 等方法依据。
14. **[S14] MMS。** Salari, K. & Knupp, P. (2000), *Code Verification by the Method of Manufactured Solutions*, Sandia report SAND2000-1444. [DOI: 10.2172/759450](https://doi.org/10.2172/759450)。证据边界：code verification 程序，不是物理 validation。
15. **[S15] 三维解析 NS。** Ethier, C. R. & Steinman, D. A. (1994), “Exact Fully 3D Navier–Stokes Solutions for Benchmarking,” *IJNMF* 19, 369–375. [DOI: 10.1002/fld.1650190502](https://doi.org/10.1002/fld.1650190502)。证据边界：解析初边值基准。
16. **[S16] GCI 原始报告框架。** Roache, P. J. (1994), “Perspective: A Method for Uniform Reporting of Grid Refinement Studies,” *Journal of Fluids Engineering* 116, 405–413. [DOI: 10.1115/1.2910291](https://doi.org/10.1115/1.2910291)。证据边界：统一报告方法。
17. **[S17] 非等比网格/GCI 实施程序。** Celik, I. B. et al. (2008), “Procedure for Estimation and Reporting of Uncertainty Due to Discretization in CFD Applications,” *Journal of Fluids Engineering* 130, 078001. [DOI: 10.1115/1.2960953](https://doi.org/10.1115/1.2960953)。证据边界：GCI 计算与报告；本文百分比门禁是项目选择。
18. **[S18] DFG 2D-2 官方数据页。** FeatFlow, “DFG Benchmark 2D-2 (Re=100, periodic).” [官方稳定页面](https://wwwold.mathematik.tu-dortmund.de/~featflow/en/benchmarks/cfdbenchmarking/flow/dfg_benchmark2_re100.html)。证据边界：规范几何、边界、时间步和官方数值参考；是 benchmark confirmation，不是实验 validation。
19. **[S19] DFG 原始基准论文。** Schäfer, M. & Turek, S. (1996), “Benchmark Computations of Laminar Flow Around a Cylinder,” in *Flow Simulation with High-Performance Computers II*. [DOI: 10.1007/978-3-322-89849-4_39](https://doi.org/10.1007/978-3-322-89849-4_39)。证据边界：规范问题来源。
20. **[S20] 黏性表面波解析。** Prosperetti, A. (1981), “Motion of Two Superposed Viscous Fluids,” *Physics of Fluids* 24, 1217–1223. [DOI: 10.1063/1.863522](https://doi.org/10.1063/1.863522)。证据边界：小幅黏性波解析分支。
21. **[S21] 自适应界面/波基准。** Popinet, S. (2009), “An Accurate Adaptive Solver for Surface-Tension-Driven Interfacial Flows,” *JCP* 228, 5838–5866. [DOI: 10.1016/j.jcp.2009.04.042](https://doi.org/10.1016/j.jcp.2009.04.042)。证据边界：数值方法及基准，不证明本实现。
22. **[S22] 低 KC 振荡圆柱。** Dütsch, H., Durst, F., Becker, S. & Lienhart, H. (1998), “Low-Reynolds-Number Flow Around an Oscillating Circular Cylinder at Low Keulegan–Carpenter Numbers,” *JFM* 360. [DOI: 10.1017/S002211209800860X](https://doi.org/10.1017/S002211209800860X)。证据边界：规定运动速度场/流态对照。
23. **[S23] 通用 FSI 基准。** Turek, S. & Hron, J. (2006), “Proposal for Numerical Benchmarking of Fluid–Structure Interaction between an Elastic Object and Laminar Incompressible Flow.” [DOI: 10.1007/3-540-34596-5_15](https://doi.org/10.1007/3-540-34596-5_15)。证据边界：柔性体耦合回归，不是刚体摆 validation。
24. **[S24] Mode A/B。** 证据边界：无限长全浸没固定圆柱的 $Re_A,\lambda_A$，不是有限自由面装置阈值。来源：Barkley, D. & Henderson, R. D. (1996), “Three-Dimensional Floquet Stability Analysis of the Wake of a Circular Cylinder,” *JFM* 322, 215–241. [DOI: 10.1017/S0022112096002777](https://doi.org/10.1017/S0022112096002777)。
25. **[S25] 自由 VIV 二维/三维对照。** Blackburn, H. M., Govardhan, R. N. & Williamson, C. H. K. (2001), “A Complementary Numerical and Physical Investigation of Vortex-Induced Vibration,” *Journal of Fluids and Structures* 15, 481–488. [DOI: 10.1006/jfls.2000.0345](https://doi.org/10.1006/jfls.2000.0345)。证据边界：证明该规范中三维模拟对响应包络/2P 的必要性；几何仍非本装置。
26. **[S26] 规定横振圆柱。** Blackburn, H. M. & Henderson, R. D. (1999), “A Study of Two-Dimensional Flow Past an Oscillating Cylinder,” *JFM* 385, 255–286. [DOI: 10.1017/S0022112099004309](https://doi.org/10.1017/S0022112099004309)。证据边界：Re=500、规定幅频下的相位、功率和长瞬态；二维无自由面。
27. **[S27] DNS 统计不确定度。** Oliver, T. A., Malaya, N., Ulerich, R. & Moser, R. D. (2014), “Estimating Uncertainties in Statistics Computed from Direct Numerical Simulation,” *Physics of Fluids* 26, 035101. [DOI: 10.1063/1.4866813](https://doi.org/10.1063/1.4866813)。证据边界：相关采样与离散误差估计方法。
28. **[S28] 时间平均统计误差。** Russo, S. & Luchini, P. (2017), “A Fast Algorithm for the Estimation of Statistical Error in DNS (or Experimental) Time Averages,” *JCP*. [DOI: 10.1016/j.jcp.2017.07.005](https://doi.org/10.1016/j.jcp.2017.07.005)。证据边界：相关时间序列误差估计。
29. **[S29] 滑移尺度匹配。** Cox, R. G. (1986), “The Dynamics of the Spreading of Liquids on a Solid Surface. Part 1. Viscous Flow,” *JFM* 168, 169–194. [DOI: 10.1017/S0022112086000332](https://doi.org/10.1017/S0022112086000332)。证据边界：移动线的宏微尺度关系；参数仍需材料标定。
30. **[S30] 热力学弥散接触线。** Jacqmin, D. (2000), “Contact-Line Dynamics of a Diffuse Fluid Interface,” *JFM* 402, 57–88. [DOI: 10.1017/S0022112099006874](https://doi.org/10.1017/S0022112099006874)。证据边界：相场/壁面能一致闭合的一种原始方案。
31. **[S31] 动态 SGS。** Germano, M., Piomelli, U., Moin, P. & Cabot, W. H. (1991), “A Dynamic Subgrid-Scale Eddy Viscosity Model,” *Physics of Fluids A* 3, 1760–1765. [DOI: 10.1063/1.857955](https://doi.org/10.1063/1.857955)。证据边界：LES 闭合来源；采用它不自动验证目标自由面 LES。
32. **[S32] 同构摆实验。** Huera-Huarte, F. J. (2026), “Energy Harvesting from Vortex-Induced Vibrations Using a Pendulum,” *Journal of Fluids and Structures* 140, 104449. [DOI: 10.1016/j.jfluidstructs.2025.104449](https://doi.org/10.1016/j.jfluidstructs.2025.104449)。证据边界：支持固定顺流轴一自由度装置的现实可实现性；不代表 IYPT 官方冻结该拓扑，也不验证本文数值法。
33. **[S33] 官方题面。** International Young Physicists’ Tournament, [IYPT 2027 Problems](https://iypt.org/iypt-2027-problems/) 与 [最终版官方 PDF](https://iypt.org/wp-content/uploads/2026/07/IYPT-Problems-for-2027-final-edition-web.pdf)。证据边界：只冻结官方题意，不规定悬挂、润湿或求解器。
34. **[S34] D2Q9/BGK 格子模型。** Qian, Y. H., d’Humières, D. & Lallemand, P. (1992), “Lattice BGK Models for Navier–Stokes Equation,” *Europhysics Letters* 17, 479–484. [DOI: 10.1209/0295-5075/17/6/001](https://doi.org/10.1209/0295-5075/17/6/001)。证据边界：支持离散速度 BGK 模型及其低马赫流体极限，不证明本项目 D2Q9 实现、曲壁载荷或高 Re 稳定性。
35. **[S35] 矩空间 LBM/MRT 分析。** Lallemand, P. & Luo, L.-S. (2000), “Theory of the Lattice Boltzmann Method: Dispersion, Dissipation, Isotropy, Galilean Invariance, and Stability,” *Physical Review E* 61, 6546–6562. [DOI: 10.1103/PhysRevE.61.6546](https://doi.org/10.1103/PhysRevE.61.6546)。证据边界：支持矩空间松弛、色散/耗散与稳定性分析；不证明某组 MRT 参数已验证。

---

## 13. 生产实现前冻结问题

这里的“生产实现”分为两个范围：**本次国赛软件范围 A1** 和 **未来论文级 Level B**。A1 的未决项会阻塞当前编码或定量作图；Level B 的未决项只阻塞未来三维实物预测，不得反过来扩大本次软件范围。冻结结果应写入版本化 `modelDefinition`，而不是散落在 UI 默认值中。

### 13.1 本次 A1 必须冻结

| ID | 冻结问题 | 推荐决定 | 未冻结的后果 |
|---|---|---|---|
| F-A01 | A1 的数值核究竟是哪一种 | 只选一个可维护主核：二维不可压有限体积/投影法，或经曲壁与力验证的 D2Q9 MRT-LBM；浏览器 A0 可与 A1 共核，但证据等级分开 | 同一名称下算法不同，网格/GCI 和基准证据不可复用 |
| F-A02 | A1 表示哪一个物理投影 | `infinite-span-2d` 为默认；`bounded-cross-section-2d` 另 profile。二者均无自由面、端盖和有限湿跨 | 把二维截面误标为 canonical 三维水槽 |
| F-A03 | 圆柱运动功能序列 | 固定体是最低门；规定 $y_b(t)$ 是第二门；二维单振子 FSI 仅作可选第三门 | 尚未验证移动边界时就用自由响应掩盖载荷错误 |
| F-A04 | P0 到条带的运动映射 | 每条带消费 $r_i,\theta,\dot\theta$，用 (N24)；单个二维 FSI 振子必须标 `surrogate-translation-2d`，不得继承整摆 $I_O$ | 把局部平移模型冒充绕轴有限圆柱 |
| F-A05 | 外部单位和载荷类型 | 外部一律 SI；二维输出 `lineForce2d[N/m]`、`linePower2d[W/m]` 和 `stripTorqueDensity[N]`；三维 `force3d[N]`/`torque3d[N m]` 是不同类型 | 暗中乘一个未声明挤出跨长 |
| F-A06 | 参考尺度与系数定义 | 冻结 $D,U_0,\rho_l$；入口非均匀时仍用体积均速 $U_0$，系数按 (N43)，不允许 UI 自选中心线速度 | 同名 $Re,C_D,St$ 不能比较 |
| F-A07 | 边界和域族 | 分别冻结入口剖面/ramp、出口条件、上下远场或实体壁；预注册至少三套 $L_{up}/D,L_{down}/D,W/D$ | 尾迹回流、阻塞或入口瞬态伪装成物理效应 |
| F-A08 | 圆边界和载荷算法 | 保存圆心/半径的解析几何；同时给表面应力积分和控制体动量余额，二者误差随加密收敛 | 楼梯圆或单一经验升阻力无法作研究参考 |
| F-A09 | 网格/时步族 | 冻结三网格、三时步、精细化比、圆周最小分辨率、尾迹加密区和最大 CFL/Mach（视算法） | 只能展示一张图，不能给离散不确定度 |
| F-A10 | 初值、ramp 和统计窗 | 固定静止/成熟尾流两套 IC、ramp 公式、丢弃周期数、统计周期数和相关误差算法 | 相位、$St$、均值和起振阈值依赖任意启动历史 |
| F-A11 | 二维 FSI 耦合（若实现） | 明确显式弱耦合仅作教学；研究结果需子迭代收敛或单体耦合，并冻结单位跨长质量、刚度、阻尼 | added-mass 数值不稳定被误认为真实分岔 |
| F-A12 | 条带闭合策略 | 默认 `closure=none`，只展示每条带和带清楚假设的相干上/下界；只有 3D/实验 closure ID 才允许用 (N25) 形成总矩 | 二维线力乘湿长形成虚假精确总矩 |
| F-A13 | 通过称谓 | A 类全过才允许 `validated-2d-reference`；部分通过为 `verified-component`；否则 `unvalidated-preview` | “high fidelity”“DNS”成为 UI 宣传词而非证据结论 |
| F-A14 | 最小恢复与复现 | 同版本同网格保存已接受时层、分布函数或 $u,p$、运动状态、边界相位、统计累计、配置/代码哈希 | 暂停后换了初值或统计窗却仍称同一运行 |
| F-A15 | 目标 QoI 与容差 | 预注册至少 $\overline{C_D},C_{L,\mathrm{rms}},St$、规定运动载荷幅相和周期功；逐项给数值/实验允许误差 | 运行后挑选“看起来最接近”的指标和阈值 |

F-A01 不能由界面便利性独自决定。若沿用 LBM，必须冻结碰撞算子、格子声速、$\tau_\nu$/黏度映射、其余 MRT 松弛率、曲壁规则、移动壁修正、入口/出口和动量交换力；`D=18 cells` 只能作为预览，不得先验称收敛网格。若选有限体积/投影法，则必须冻结速度—压力位置、压力 Poisson 边界、对流通量、曲边界/移动网格处理和应力恢复。两条路线都要经过同一 A 类黑箱验收，不能以“方法文献已验证”替代本代码证据。

### 13.2 实物参数与 Level B 升级前再冻结

以下问题不阻塞 A1 二维参考后端，但阻塞任何 canonical 三维绝对预测：

1. R1 的实测 $O,R,\ell_t,\ell_b$、圆柱/连接件质量分布、$I_O$、质心、轴承摩擦和机械止挡；几何 CAD、质量表和测量不确定度须有版本。
2. 水槽 $W,H,L_{up},L_{down}$、底/侧/端壁粗糙度、入口均值/湍流/自由面条件，以及动态最小壁隙和底隙。
3. 水温对应的 $\rho_l,\mu_l,\gamma$，若进入两相分支还要气相性质、密度/黏度比和可压缩性假设。
4. 真实材料水线观测：是否钉扎、$\theta_R,\theta_A$、动态角—速度关系、滑移尺度/线摩擦和表面粗糙度。C0 不得作为默认答案；观测后在 C1a/C1b 或更合适的闭合中冻结。
5. 单液相 ALE 是否覆盖实测最大角、波高和接触线拓扑；若发生夹气、断裂、越浪或反复入/出水，转 B2 两相 VOF/cut-cell。
6. 目标 $Re,Fr,We/Bo,Ur,KC,J^*,m^*,\zeta_s,AR,B_w,B_A$ 包络和主要相似子集；无法同时匹配的相似群列为已知失真，而非调一个“有效 Re”。
7. DNS/LES/URANS 名称、入口湍流、壁面/界面最小尺度和资源预算；资源不足时可以选 LES，但 capability 必须随之降级。
8. Level B 的实际软件栈、网格生成器、线性/非线性求解器、并行分区、重网格和保守投影；这些是未来实施选择，不是本文已经存在的功能。

### 13.3 冻结记录的最低格式

每一项冻结记录至少含 `decisionId`、选择值及单位、适用 profile、责任人/日期、输入证据、被否决备选及理由、允许修改条件和语义版本。任何冻结项改变都产生新的 child run；旧的 V&V 证据只有在影响分析证明等价后才能继承。尤其禁止静默改变 $U_0$ 定义、二维挤出跨长、润湿 profile 或 `hydrostaticAccounting`。

---

## 14. 实际需运行的验收测试

**截至本文冻结时，下列 CFD/FSI 测试均未在本仓库执行。** 这一节是执行清单，不是通过记录。每项运行必须归档配置、代码/依赖哈希、网格摘要、原始时间序列、残差、QoI 提取脚本、图表数据和 PASS/FAIL/INCONCLUSIVE 判定；仅保存截图不算证据。

### 14.1 本轮 A1 的硬验收门

A-03 的默认解析支路冻结为二维周期衰减涡：在 $[0,2\pi/k]^2$ 取周期边界、零均值压力，并令

$$
\begin{aligned}
u_x&=U_a\sin(kx)\cos(ky)e^{-2\nu k^2t},\\
u_y&=-U_a\cos(kx)\sin(ky)e^{-2\nu k^2t},\\
p&=\frac{\rho U_a^2}{4}
[\cos(2kx)+\cos(2ky)]e^{-4\nu k^2t}.
\end{aligned}
$$

这组场逐点满足二维不可压 Navier–Stokes，可直接审计速度、压力、散度和黏性衰减。空间阶用足够小的固定 $\Delta t$ 测，时间阶用足够细的固定网格测；若二者未分离，不得从同步细化猜测各自阶数。曲壁和开边界不由它验证，另由 A-04/A-05 负责。

| ID | 实际运行 | 记录的 QoI/残差 | 通过条件 | 失败后的动作 |
|---|---|---|---|---|
| A-00 | 后端可达性：从统一入口启动固定圆柱最小算例 | 实际 backend ID、capability、代码/配置哈希、退出状态 | 不再动态导入不存在文件；请求级与实际级一致 | FAIL；禁止展示 CFD 标签 |
| A-01 | schema/坐标/单位负测试 | $x,y,z$ 定义、SI 转换、2D/3D 载荷类型 | 反向来流、负直径、N/m 当 N、P0/V1 混用均被拒绝；符号测试符合 §1 | FAIL；先修接口，不运行物理图 |
| A-02 | 静止流/常流保持与质量守恒 | 速度漂移、全域质量缺陷、入口—出口流量差 | 精确零流不自发；常流误差随代数容差/网格收敛，质量门符合预注册值 | FAIL；先修边界/压力耦合 |
| A-03 | 上述周期衰减涡；必要时再加非周期 MMS；三网格×三时步 | $L_1,L_2,L_\infty$ 的 $u,p$，散度/质量误差，$p_h,p_t$ | 进入单调渐近区；实测阶与所选格式设计阶相容；非单调则 INCONCLUSIVE | 不得计算 GCI 或称空间/时间收敛 |
| A-04 | DFG 2D-2，按 [S18,S19] 的原规范而非目标水槽 | $C_D^{max/min},C_L^{max/min},St,\Delta p$，三网格/三时步 | 各 QoI 的误差带与官方参考区间相交，且力/压差不靠调参逐项拟合 | FAIL；曲壁、边界、力或统计实现未确认 |
| A-05 | 圆柱载荷双路径 | 表面应力/动量交换与控制体动量余额，黏/压分项 | 差值随 $h,\Delta t$ 收敛并落入预注册载荷误差；符号一致 | FAIL；任何升阻力图无效 |
| A-06 | 域宽/入口/出口/阻塞矩阵 | $\overline{C_D},C_{L,\mathrm{rms}},St$ 对 $W,L_{up},L_{down}$ 的变化 | 最后两级域变化小于其离散+统计不确定度；否则只报告该有限域 | 扩域或把阻塞写入结论 |
| A-07 | 固定圆柱初值/启动记忆 | 静止 IC、成熟尾流 IC、不同 ramp 的瞬态与统计 | 丢弃窗后统计区间重叠；若落入不同吸引子则完整报告多稳态 | 延长运行/分支，不准挑单条轨迹 |
| A-08 | 规定横移圆柱，复现 [S22] 或 [S26] 的一个完整规范点 | 位移/速度、线力幅相、谐波、每周期流体—壁功、速度场探针 | 载荷和功率符号一致；关键量与文献数据在合并误差带内；明确二维规范差异 | FAIL；移动边界和功率链未确认 |
| A-09 | 规定运动的网格/时步/相位收敛 | 幅值、相位、谐波、周期功的 GCI/时间误差 | 满足 §7 的预注册门；用周期相位对齐，不用任意瞬时点 | 加密或降级为定性预览 |
| A-10 | 同版本暂停—恢复 | 连续运行 vs 中途保存/恢复的短窗场与 QoI | 达到 D2 容差；边界相位、运动状态和统计累计连续 | FAIL；禁用 pause/resume 宣称 |
| A-11 | 相同输入重复两次 | 短期状态差、统计 QoI、哈希与运行环境 | 达到声明的 D2；不要求跨硬件位级相同 | 降低 determinismLevel 并扩展统计误差 |
| A-12 | 2D/strip 诚实边界测试 | capability、导出字段、图题和 API 响应 | 无 3D 场、自由面、closure 时拒绝 `force3d/torque3d/DNS/canonical prediction`；只给 N/m/W/m | FAIL；属于科学误标，阻塞发布 |
| A-13 | GCI 与不确定度流水线自检 | (N40)–(N42) 中间量、渐近性、统计窗、总误差带 | 用手算/独立脚本样例复核；未进渐近区时返回 INCONCLUSIVE 而非小 GCI | FAIL；不得输出“误差 ±x%” |
| A-14 | 极限与量纲回归 | $U_0\to0$、规定运动关/开、$\theta\to0$、单位缩放 | 不出现除零/NaN；物理等价 SI 输入产生等价无量纲结果；载荷量纲符合 §10 | FAIL；修参考尺度或状态机 |

若本轮实现的是 LBM，还要加跑 A-L01～A-L04：固定 $Re$ 下同时改变 $D_{lu}$ 与 $U_{lu}$ 以分离网格/可压缩误差；至少三档 Mach 检查 $Ma^2$ 趋势；曲壁圆相位相对格点平移敏感性；$\tau_\nu$ 远离 $1/2$ 后相同物理工况的一致性。任一失败都只能标 `preview`。若实现有限体积/投影法，则相应增加压力 Poisson 容差、棋盘模态、非正交/曲边界和移动网格 GCL 灵敏度。

### 14.2 可选二维 FSI 的附加门

只有 A-00～A-14 和规定运动功率链通过后，才进入以下测试：

| ID | 实际运行 | 通过条件 |
|---|---|---|
| FSI-A1 | 流体关闭的单位跨长振子解析解 | 无流时频率、衰减率和机械能误差按时间阶收敛 |
| FSI-A2 | 规定运动反演 | 用已知 $y(t)$ 的流体载荷驱动结构残差；位移—力—功符号闭合 |
| FSI-A3 | 低质量比/小惯量强耦合压力测试 | 逐步减质量比；FSI 子迭代收敛，结果对松弛初值不敏感；显式弱耦合发散可作为反例但不得解释为物理 |
| FSI-A4 | 耦合步长和子迭代容差矩阵 | 振幅、频率、相位、周期功对 $\Delta t$ 和接口容差收敛，$R_P,R_E$ 过门 |
| FSI-A5 | 初值/方向/统计窗分支 | $+y/-y$、静止/成熟尾流和微扰初值分别运行；若结果不同则登记共存吸引子，不合并平均 |
| FSI-A6 | 与一个公开二维自由 VIV 基准或冻结台架子集盲比 | 预测区间覆盖参考；只验证二维平移 surrogate，不据此验证 P0 三维摆 |

### 14.3 条带组合在使用前的附加门

没有以下证据，默认 `closure=none`：

1. 用至少一个真实有限湿跨三维计算或带轴向分段测力/流场的实验，得到端区载荷、跨向相干和相位核；
2. 将 closure 校准集与验证集按完整工况分开，不按相邻时间点随机切分；
3. 对条带数、$r_i$、积分权重、端区长度和核参数做敏感性/不确定度传播；
4. 对 withheld 工况比较总矩、周期功、主频、幅值和相位，而非只拟合平均阻力；
5. 报告“完全相干乘长”“独立相位”与标定 closure 的差距。若差距超过目标 QoI 容差，A1 只能继续作局部机制对照。

### 14.4 未来 Level B 验收——路线，不是本轮门

未来真正实施三维后端时，必须实际执行 §7 的 V0～V14：MMS/Ethier/GCL、静水压力/浮力矩、C0 与 C1 接触线基准、DFG/圆柱 $C_D,C_L,St$、Mode A 跨向转捩、自由面波、规定振荡、强耦合 added-mass、自由 FSI 锁频、canonical solution verification 和冻结实验盲验证。还必须完成网格、时间步、域宽、入口/出口、真实跨度、阻塞、统计窗和初值矩阵，并同时通过质量、功率、能量与 GCI/统计不确定度门。

这一清单不表示三维测试已排队、已获得算力或已通过。B0 的 C0 结果只能写 `wetting=C0-unvalidated-benchmark`；实物预测需先用水线观测冻结 C1a/C1b。Mode A 的文献阈值只能确认标准无限圆柱的三维稳定性实现，不能替代有限槽 P0 的 validation。

### 14.5 最终放行规则与验收包

本轮 A1 只有在 A-00～A-14 全部为 PASS（算法相关附加项亦 PASS）、不存在硬失败、每个目标 QoI 都有空间/时间/统计不确定度且运行处于 `validatedEnvelope` 内时，才可放行为 `cfd2d-strip-reference/validated-2d-reference`。某项缺数据为 INCONCLUSIVE，不是 PASS；超包络为 OUT_OF_SCOPE，不得用更宽误差条回避。可选 FSI/strip 未通过只关闭相应 capability，不应阻塞已经通过的固定体/规定运动二维功能。

每次放行包最低包含：

- `RunSpec`、`modelDefinition`、`dimensionlessMap`、后端/代码/依赖/网格哈希；
- 三网格、三时步、域和初值矩阵的原始 QoI 时间序列与日志；
- 力的双路径、质量/功率/能量残差和 GCI/统计不确定度中间量；
- 独立生成的表格/图及其脚本版本，而非只有前端截图；
- capability/envelope 判定、每项 PASS/FAIL/INCONCLUSIVE/OUT_OF_SCOPE、已知限制与复现命令。

在上述实际运行完成前，仓库状态必须保持 `unvalidated`；本文只能被引用为**论文级数值设计与国赛级二维实施/验收规范**，不能被引用为“已经获得三维涡流摆高保真结果”。
