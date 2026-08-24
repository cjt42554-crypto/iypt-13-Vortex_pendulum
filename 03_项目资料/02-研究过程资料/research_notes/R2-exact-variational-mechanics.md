# R2：涡流摆精确变分力学、静水几何与观测接口

> 状态：独立推导备忘录，服务于 `F1 场方程冻结`、`F2 降阶冻结` 与 `F3 观测冻结`；不是生产代码说明。
> 对象：IYPT 2027 Problem 13 **Vortex pendulum**，即流水中部分浸没的竖直圆柱摆；不是电磁涡流制动摆。
> 坐标：世界系 $W$ 中 $\mathbf e_x$ 顺流、$\mathbf e_y$ 横流、$\mathbf e_z$ 竖直向上，$g>0$，重力加速度为 $-g\mathbf e_z$。角度均用 rad（量纲为 1）。

## 0. 结论先行与不可混用的模型分支

官方题面只规定“竖直圆柱形摆锤、位于流水槽上方、部分浸没、可能沿横流方向振荡”，没有规定悬挂是刚轴、刚杆、单索、双索还是四杆，也没有规定圆柱在运动中是否保持竖直。[IYPT 官方题面](https://iypt.org/wp-content/uploads/2026/07/IYPT-Problems-for-2027-final-edition-web.pdf) 的圆形截面、流向箭头和横摆箭头支持把示意图读作俯视/平面示意，但图内没有标注视角；无论如何都不能从图中反推出悬挂拓扑。本文冻结的主拓扑与已经实现过的一自由度圆柱摆同构：固定转轴平行来流 $\mathbf e_x$，圆柱—径向臂为一个刚性总成，只允许绕该轴作横流转动；这类一自由度轴式装置也见 Huera-Huarte 的水槽研究（[DOI: 10.1016/j.jfluidstructs.2025.104449](https://doi.org/10.1016/j.jfluidstructs.2025.104449)）。官方范围与本文选型必须分开陈述。

本文得到四个决定性结论：

1. **主方程的流体输入必须是实际湿表面上的牵引虚功**

   $$
   Q_i^f[\mathbf u,p,\eta;q]
   =\int_{S_w(q,\eta)}(\boldsymbol\sigma_f\mathbf n_s)\cdot
     \frac{\partial\mathbf x_s}{\partial q_i}\,\mathrm dS,
   \tag{0.1}
   $$

   而不是“总升力乘湿段中点力臂”。即使把表面应力积分成合力，也必须另行积分力矩；仅由合力不能恢复力矩。式 (0.1) 对角坐标的量纲为 $\mathrm{Pa\,m^2\,m=N\,m}$，与广义力矩一致。

2. **静水浮力可从严格势能导出，但只能与去掉静水压的动态牵引并用**

   $$
   \Pi_h(q)=\rho_f g\int_{\mathcal B}[\eta_0-z(\mathbf X,q)]_+\,\mathrm dV,
   \qquad Q_i^B=-\partial_{q_i}\Pi_h .
   \tag{0.2}
   $$

   $[s]_+=\max(s,0)$。$\rho_f g[\eta-z]\,\mathrm dV$ 的量纲为 $\mathrm{kg\,m^2\,s^{-2}}=\mathrm J$。若式 (0.1) 的 $p$ 已含静水压，就不得再加 $\Pi_h$。

3. **有限半径会改变浮力矩，即使细轴近似恰好给对排水体积**。对本文圆柱、平水面且水线不切端盖的区间，令 $A=\pi a^2$、$I_{wp,x}=\pi a^4/4$、轴点到水面竖距 $h_p=O_z-\eta_0$，圆柱远端轴坐标为 $\ell_b$，则

   $$
   V_d=A(\ell_b-h_p\sec\theta),
   \tag{0.3a}
   $$

   $$
   Q_B^{\mathrm{exact}}-Q_B^{\mathrm{axis}}
   =-\rho_f gI_{wp,x}\sin\theta
     \left(1+\frac12\tan^2\theta\right).
   \tag{0.3b}
   $$

   所以线性浮力矩系数比轴线单力臂结果少 $\rho_f gI_{wp,x}$。这个差异来自水线圆盘内各点的不同力臂，不能用重新选择一个未经验证的“湿段中心”消掉。

4. **若使用配置依赖加入质量，几何惯性项的符号是固定的**。一自由度流体动能

   $$
   T_a=\frac12 I_a(q)\dot q^2
   $$

   给出

   $$
   [I_s+I_a(q)]\ddot q+\frac12I_a'(q)\dot q^2+\Pi'(q)=Q_{\mathrm{residual}}.
   \tag{0.4}
   $$

   若把加入质量力留在右端，它就是 $-I_a\ddot q-\tfrac12I_a'\dot q^2$。漏掉或反号都会破坏动能恒等式。使用完整 Navier–Stokes/自由面牵引的分支不得再加 $I_a$。

## 1. 拓扑、几何与符号冻结

### 1.1 主拓扑 P0：固定横流转轴的刚性圆柱摆

固定轴通过点 $O$，方向为 $\mathbf e_x$。唯一广义坐标 $\theta$ 按右手定则绕 $+\mathbf e_x$；$\theta=0$ 时圆柱轴竖直向下，$\theta>0$ 时摆向 $+y$。定义

$$
\mathbf d(\theta)=\sin\theta\,\mathbf e_y-\cos\theta\,\mathbf e_z,
\qquad
\mathbf c(\theta)=\cos\theta\,\mathbf e_y+\sin\theta\,\mathbf e_z,
\tag{1.1}
$$

于是 $\mathbf d'=\mathbf c$、$\mathbf c'=-\mathbf d$，且 $(\mathbf e_x,\mathbf c,\mathbf d)$ 为随体正交基。圆柱半径为 $a$，轴向近端、远端坐标分别为 $\ell_t$、$\ell_b$，长度 $L_c=\ell_b-\ell_t$。实体圆柱集合为

$$
\mathcal C(\theta)=\left\{
O+r\mathbf d(\theta)+\xi\mathbf e_x+v\mathbf c(\theta):
r\in[\ell_t,\ell_b],\ \xi^2+v^2\le a^2
\right\}.
\tag{1.2}
$$

更一般的圆柱、径向臂、配重和编码器转子统一记作刚体 $\mathcal B$。以 $\theta=0$ 的随体坐标 $\mathbf X$ 表示物质点，精确运动映射为

$$
\mathbf x(\mathbf X,\theta)=O+R_x(\theta)\mathbf X,
\quad
\dot{\mathbf x}=\dot\theta\,\mathbf e_x\times(\mathbf x-O),
\quad
\boldsymbol\Omega=\dot\theta\mathbf e_x .
\tag{1.3}
$$

式 (1.3) 没有小角近似。其虚位移核

$$
\mathbf J_\theta(\mathbf x)=\partial_\theta\mathbf x
=\mathbf e_x\times(\mathbf x-O)
\tag{1.4}
$$

的量纲为 m，因此表面力、体力或点力与它点乘后都是 $\mathrm{N\,m}$。

### 1.2 必须分列的变体

- **V1，始终竖直的平移摆**：四杆/平行导向使圆柱姿态固定，质心走圆弧

  $$
  \mathbf r_C=O+\ell(\sin\theta\,\mathbf e_y-\cos\theta\,\mathbf e_z),
  \qquad R_{WB}=R_0 .
  \tag{1.5}
  $$

  它的每个物质点有相同平移速度，水线不因圆柱倾斜而形成圆弓；其浮力刚度与 P0 不同。

- **S1，单根柔索的空间刚体摆**：只有 $|\mathbf x_A-O|\le\ell$ 的单边长度约束；单索不约束圆柱姿态，必须保留刚体转动和松弛/绷紧事件。

- **S2，双柔索/分叉悬挂**：每根索各有单边约束和张力；两索同时绷紧时才可能近似锁定某些姿态。不能预先假设两索等张力。

- **P1，刚杆或轴承球铰**：长度约束可受拉也可受压，不存在柔索松弛；其负“张力”是压杆反力而不是失效。

这些变体共享后文的刚体映射和表面牵引投影，但不能共享未经变换的质量矩阵、浮力刚度或约束反力。

## 2. 质量分布、刚体动能与重力势

设参考构型中的固体密度为 $\rho_s(\mathbf X)$，包括壳体、密封内部配重、径向臂、夹具和随摆转子；轴承固定端不计入。若圆柱开口且内部水与外界交换，则它不是定质量刚体，必须转入流固多相场模型，不能把内部水随意并入 $m$。定义

$$
m=\int_{\mathcal B}\rho_s\,\mathrm dV,
\qquad
\mathbf X_G=\frac1m\int_{\mathcal B}\rho_s\mathbf X\,\mathrm dV,
\tag{2.1}
$$

$$
\mathbf J_O^B=\int_{\mathcal B}\rho_s
\left[(\mathbf X\cdot\mathbf X)\mathbf I-\mathbf X\mathbf X^T\right]\mathrm dV,
\qquad
I_O=\mathbf e_x^T\mathbf J_O^B\mathbf e_x .
\tag{2.2}
$$

$m$ 的量纲为 kg，$\mathbf J_O^B,I_O$ 为 $\mathrm{kg\,m^2}$。P0 的结构动能严格为

$$
T_s=\frac12I_O\dot\theta^2 .
\tag{2.3}
$$

由于转轴和刚体内的 $\mathbf e_x$ 是同一条固定轴，$I_O$ 与 $\theta$ 无关。对均匀实心圆柱，中心轴向坐标 $\ell_c=(\ell_t+\ell_b)/2$，其贡献是

$$
I_{O,c}=m_c\left[\ell_c^2+\frac{3a^2+L_c^2}{12}\right],
\qquad m_c=\rho_c\pi a^2L_c .
\tag{2.4}
$$

其余部件逐件用 (2.2) 或平行轴定理相加。把圆柱全部质量放在某个“等效点”会漏掉 $(3a^2+L_c^2)/12$。

若总成质心在对称轴上，$\mathbf X_G=-L_G\mathbf e_z$（参考构型中 $L_G>0$），则

$$
\Pi_g=mg\,\mathbf e_z\cdot\mathbf x_G=-mgL_G\cos\theta+\text{const},
\qquad
\Pi_g'=mgL_G\sin\theta .
\tag{2.5}
$$

$\Pi_g$ 和 $\Pi_g'$ 对角坐标分别为 J 和 $\mathrm{N\,m}$。若质心有横向偏置，应直接使用 (2.1) 的 $\mathbf X_G$，不得强制写成余弦势。

## 3. 实际湿体积、浮心与静水势

### 3.1 坐标无关定义

平静自由面为 $z=\eta_0$。排水域、排水体积和浮心定义为

$$
\mathcal D(q)=\{\mathbf X\in\mathcal B:z(\mathbf X,q)\le\eta_0\},
\quad
V_d(q)=\int_{\mathcal B}H(\eta_0-z)\,\mathrm dV,
\tag{3.1}
$$

$$
\mathbf x_B(q)=\frac1{V_d}\int_{\mathcal D(q)}\mathbf x(\mathbf X,q)\,\mathrm dV
\quad (V_d>0).
\tag{3.2}
$$

静水势就是 (0.2)。对任意广义坐标，固定水面且避开润湿拓扑切换时

$$
\partial_i\Pi_h
=-\rho_f g\int_{\mathcal D}\mathbf e_z\cdot\mathbf J_i\,\mathrm dV,
\qquad
Q_i^B=\rho_f g\int_{\mathcal D}\mathbf e_z\cdot\mathbf J_i\,\mathrm dV.
\tag{3.3}
$$

因此静水合力和关于任一点 $P$ 的力矩为

$$
\mathbf F_B=\rho_f gV_d\mathbf e_z,
\qquad
\boldsymbol\tau_B^P=(\mathbf x_B-P)\times\mathbf F_B .
\tag{3.4}
$$

式 (3.4) 是体积分的结果，不是假设浮力“作用在湿段中点”。对 P0，$\mathbf e_z\cdot\mathbf J_\theta=y-y_O$，故

$$
Q_B=\rho_f gV_d(y_B-y_O).
\tag{3.5}
$$

### 3.2 圆柱实际湿表面

圆柱侧面和两端盖分别参数化为

$$
\mathbf x_L(r,\phi)=O+r\mathbf d
+a(\cos\phi\,\mathbf e_x+\sin\phi\,\mathbf c),
\quad
\mathbf n_L=\cos\phi\,\mathbf e_x+\sin\phi\,\mathbf c,
\quad \mathrm dS=a\,\mathrm dr\,\mathrm d\phi,
\tag{3.6}
$$

$$
\mathbf x_E(r_\pm,s,\phi)=O+r_\pm\mathbf d
+s(\cos\phi\,\mathbf e_x+\sin\phi\,\mathbf c),
\quad r_-=\ell_t,\ r_+=\ell_b,
\tag{3.7a}
$$

$$
\mathbf n_E(r_-)=-\mathbf d,
\quad \mathbf n_E(r_+)=+\mathbf d,
\quad \mathrm dS=s\,\mathrm ds\,\mathrm d\phi,
\quad 0\le s\le a.
\tag{3.7b}
$$

动态自由面为图 $z=\eta(x,y,t)$ 时，每一个表面点用

$$
\chi_w(\mathbf x,t)=H[\eta(x,y,t)-z]
\tag{3.8}
$$

筛选。侧面和端盖都必须筛选；大角度时端盖可能部分润湿。实际湿面 $S_w$ 是 (3.6)–(3.8) 的并集，而不是“轴线湿长乘周长”。

### 3.3 任意倾角的精确一维圆弓积分

对平水面，令 $h_p=O_z-\eta_0$、$\beta=|\sin\theta|$。当 $\beta>0$ 时取

$$
\mathbf b_u=\operatorname{sgn}(\sin\theta)\mathbf c,
\qquad
z_r=O_z-r\cos\theta,
\qquad
d_r=\frac{\eta_0-z_r}{\beta}=\frac{r\cos\theta-h_p}{\beta}.
\tag{3.9}
$$

半径 $a$ 圆盘内 $u\le d$ 的面积和关于圆心的一阶矩为

$$
A_<(d)=
\begin{cases}
0,&d\le-a,\\
a^2[\arcsin(d/a)+\pi/2]+d\sqrt{a^2-d^2},&|d|<a,\\
\pi a^2,&d\ge a,
\end{cases}
\tag{3.10}
$$

$$
M_u(d)=\int_{u\le d}u\,\mathrm dA=
\begin{cases}
-\dfrac23(a^2-d^2)^{3/2},&|d|<a,\\
0,&|d|\ge a.
\end{cases}
\tag{3.11}
$$

于是无需网格化实体就有

$$
V_d(\theta)=\int_{\ell_t}^{\ell_b}A_<(d_r)\,\mathrm dr,
\tag{3.12}
$$

$$
\mathbf x_B=\frac1{V_d}\int_{\ell_t}^{\ell_b}
\left[(O+r\mathbf d)A_<(d_r)+\mathbf b_uM_u(d_r)\right]\mathrm dr,
\tag{3.13}
$$

$$
\Pi_h=\rho_f g\int_{\ell_t}^{\ell_b}
\left[(r\cos\theta-h_p)A_<(d_r)-\beta M_u(d_r)\right]\mathrm dr.
\tag{3.14}
$$

(3.12)–(3.14) 的被积量量纲依次为 $\mathrm{m^2}$、$\mathrm{m^3}$、$\mathrm{m^3}$；乘 $\mathrm dr$ 或 $\rho_f g$ 后分别得到 $\mathrm{m^3}$、$\mathrm{m^4}$、J。积分时必须把 $d_r=\pm a$ 的圆弓切换点显式给自适应求积器；否则小 $\theta$ 的窄过渡带可能被跳过，数值上恰好退化成错误的细轴结果。

### 3.4 水线不切端盖时的闭式与有限半径修正

以下闭式冻结在通常的下垂分支 $\cos\theta>0$（即 $|\theta|<\pi/2$）。若对所有截面坐标 $|v|\le a$，水线根

$$
r_0(v)=h_p\sec\theta+v\tan\theta
\tag{3.15}
$$

都满足 $\ell_t<r_0(v)<\ell_b$，即

$$
\ell_t<h_p\sec\theta-a|\tan\theta|,
\qquad
h_p\sec\theta+a|\tan\theta|<\ell_b,
\tag{3.16}
$$

则可先沿 $r$ 精确积分。记 $A=\pi a^2$、$I_{wp,x}=\int_Av^2\mathrm dA=\pi a^4/4$，有

$$
V_d=A(\ell_b-h_p\sec\theta),
\tag{3.17}
$$

$$
\frac{\Pi_h}{\rho_f g}
=\frac{A}{2\cos\theta}(\ell_b\cos\theta-h_p)^2
+\frac{I_{wp,x}\sin^2\theta}{2\cos\theta},
\tag{3.18}
$$

为消除“轴线近似”的歧义，本文专门定义 $Q_B^{\mathrm{axis}}$：把每个完整横截面积 $A$ 压到轴心，并把湿轴段取为 $r\in[h_p\sec\theta,\ell_b]$。于是

$$
Q_B^{\mathrm{exact}}
=\frac{\rho_f gA\sin\theta}{2}
\left(\ell_b^2-h_p^2\sec^2\theta\right)
-\rho_f gI_{wp,x}\sin\theta
\left(1+\frac12\tan^2\theta\right).
\tag{3.19}
$$

直接微分 (3.18) 给 $Q_B=-\Pi_h'$，所以 (3.19) 的符号同时通过虚功和势能两条路径固定。第一项正是上述 $Q_B^{\mathrm{axis}}$；第二项是有限半径圆弓修正。另一种“保留真实截面湿面积 $A_w(r)$，但把每个圆弓形心压回轴心”的近似不是本文的 $Q_B^{\mathrm{axis}}$，其误差式也不同，二者不得混称。若 $\cos\theta\le0$，水下部分不再是水线根的远端侧 $r\ge r_0$；即使根仍落在圆柱内，也不能使用 (3.17)–(3.19)。因此只要 $\cos\theta\le0$ 或条件 (3.16) 失效，就必须回到 (3.12)–(3.14)，不能外推本闭式。

### 3.5 竖直平衡处的体积、浮心和静水刚度

令 $\theta=0$，水面在轴坐标 $r=h_p$。设 $r_s=\max(\ell_t,h_p)$。当 $r_s<\ell_b$ 时

$$
V_{d0}=A(\ell_b-r_s),
\qquad
r_{B0}=\frac{\ell_b+r_s}{2},
\qquad
\mathbf x_{B0}=O-r_{B0}\mathbf e_z,
\tag{3.20}
$$

$$
\Pi_h(0)=\frac{\rho_f gA}{2}
\left[(\ell_b-h_p)^2-(r_s-h_p)^2\right].
\tag{3.21}
$$

若 $\ell_t<h_p<\ell_b$，水线圆盘存在；若全浸没或完全离水，则没有水线项。由 (0.2) 两次微分，P0 的静水切线刚度为

$$
K_h\equiv\Pi_h''(0)
=\rho_f g\left[V_{d0}(z_{B0}-O_z)+I_{wp,x}\right]
=\rho_f g(-V_{d0}r_{B0}+I_{wp,x})
\tag{3.22}
$$

（部分浸没且水线切侧面）；全浸没时删掉 $I_{wp,x}$，离水时 $K_h=0$。更一般地，绕固定 $x$ 轴

$$
\Pi_h''(0)=\rho_f g\left[
\int_{\mathcal D_0}(z-O_z)\,\mathrm dV
+\int_{A_{wp}}(y-y_O)^2\,\mathrm dA
\right].
\tag{3.23}
$$

式 (3.23) 要求平水面固定、刚体绕固定 $x$ 轴转动且水线截交正则；端盖恰好入/出水、切触或水线拓扑切换处只能取相应分支的单侧导数。第一项通常为负，表示位于轴下方的向上浮力对下垂平衡有失稳作用；第二项是水线几何的恢复贡献。把二者的符号都称作“浮力减重”会漏掉水线项。

### 3.6 动态水面、毛细力与记账边界

若 $\eta=\eta(x,y,t)$ 是与刚体耦合的未知场，静水势一般不再是仅关于 $q$ 的自治势；应优先用总牵引 (0.1)。若采用压力分裂 $p=p_h+p'$，只有在冻结的平水面参考态下才把 $p_h$ 化成 (0.2)，剩余 $p'$ 和黏性应力进入动态牵引。

小尺度时接触线力可写成

$$
Q_i^\gamma=\oint_{C_{cl}}\mathbf f_\gamma\cdot\mathbf J_i\,\mathrm dl,
\tag{3.24}
$$

或从固–液、固–气、液–气表面能变分得到；两者只能选一个。若自由面场模型已含表面张力和动态接触角，机械方程不得再次添加 (3.24)。

## 4. Lagrange–d'Alembert 精确广义方程

### 4.1 任意有限自由度刚体/机构

令 $q\in\mathbb R^n$ 是无奇异局部坐标，$\mathbf x(\mathbf X,q)$ 是所有随动固体点的映射，$\mathbf J_i=\partial_{q_i}\mathbf x$。结构质量矩阵由真实质量分布产生：

$$
M_{ij}(q)=\int_{\mathcal B}\rho_s\mathbf J_i\cdot\mathbf J_j\,\mathrm dV,
\qquad
T_s=\frac12\dot q^TM(q)\dot q .
\tag{4.1}
$$

若有双边完整约束 $c_\alpha(q,t)=0$，$A_{\alpha i}=\partial c_\alpha/\partial q_i$，可容许虚位移满足 $A\delta q=0$。Lagrange–d'Alembert 原理

$$
\delta\int_{t_0}^{t_1}(T_s-\Pi)\,\mathrm dt
+\int_{t_0}^{t_1}Q_i^{nc}\delta q_i\,\mathrm dt=0
\tag{4.2}
$$

给出

$$
M_{ij}\ddot q_j+\Gamma_{ijk}\dot q_j\dot q_k+\partial_i\Pi
=Q_i^{nc}+A_{\alpha i}\lambda_\alpha,
\tag{4.3}
$$

$$
\Gamma_{ijk}=\frac12
(\partial_kM_{ij}+\partial_jM_{ik}-\partial_iM_{jk}).
\tag{4.4}
$$

对角坐标时 (4.3) 每项都是 $\mathrm{N\,m}$；平移坐标时每项都是 N。理想双边约束的功率为

$$
\dot q^TA^T\lambda=\lambda^TA\dot q=0
\tag{4.5}
$$

（固定约束），因此约束反力不应出现在能量耗散中。四元数等冗余姿态坐标应把单位范数也列为约束，或改用 $SO(3)$ 局部图；不能把四个分量当四个独立转角。

### 4.2 流体、空气和毛细广义力

固体外法向（从固体指向环境）为 $\mathbf n_s$。牛顿流体应力

$$
\boldsymbol\sigma_f=-p\mathbf I+\mu_f(\nabla\mathbf u+\nabla\mathbf u^T)
\tag{4.6}
$$

给出实际湿面的 (0.1)。干表面同理：

$$
Q_i^{\mathrm{air}}=\int_{S_d(q,\eta)}(\boldsymbol\sigma_a\mathbf n_s)\cdot\mathbf J_i\,\mathrm dS .
\tag{4.7}
$$

两相都用相对大气压的规范应力，或两边都用绝对应力；只在湿面减大气压而在干面遗漏大气压会在开口分面上制造假合力。总环境虚功是 (0.1)、(4.7) 和必要时 (3.24) 之和。

若没有空气场解，可把静止空气的局部分布阻力写为

$$
\mathbf t_a^{drag}=-\mathbf C_a(\mathbf x,|\mathbf w_a|)\mathbf w_a,
\qquad
\mathbf w_a=\dot{\mathbf x}-\mathbf u_a,
\qquad \mathbf C_a\succeq0,
\tag{4.8}
$$

再代入 (4.7)。二次阻力是 $\mathbf C_a\sim\tfrac12\rho_aC_D|\mathbf w_a|\mathbf I$ 的经验特例。空气静止时

$$
\sum_iQ_i^{\mathrm{air}}\dot q_i
=-\int_{S_d}\mathbf w_a\cdot\mathbf C_a\mathbf w_a\,\mathrm dS\le0.
\tag{4.9}
$$

若有外部风，空气可做正功，(4.9) 只对相对运动耗散成立。

### 4.3 弹性、轴摩擦与主拓扑方程

固定锚点 $\mathbf a_j$ 与刚体连接点 $\mathbf b_j$ 之间的真实弹簧长度为

$$
\ell_j(\theta)=\left|\mathbf a_j-[O+R_x(\theta)\mathbf b_j]\right|,
\quad
\Pi_{el}=\sum_j\frac{k_j}{2}[\ell_j(\theta)-\ell_{0j}]^2
+\frac{k_\theta}{2}(\theta-\theta_0)^2+\Pi_{nl}(\theta).
\tag{4.10}
$$

拉索弹簧应把平方项替换为 $[\ell_j-\ell_{0j}]_+^2$。式 (4.10) 保留锚点几何和预紧；直接写 $k\theta$ 只在小角标定后成立。若弹性片有不可忽略的分布变形，必须增加梁/壳模态；单个 $\Pi_{nl}(\theta)$ 只是降阶闭合。

轴摩擦的可审计模型为

$$
Q_{ax}=-c_p\dot\theta-\tau_c\operatorname{Sign}(\dot\theta),
\quad
\operatorname{Sign}(0)=[-1,1],
\tag{4.11}
$$

并可用 $|Q_{ax}|\le\tau_s$ 表示静摩擦粘住区。滑动时
$Q_{ax}\dot\theta=-c_p\dot\theta^2-\tau_c|\dot\theta|\le0$。

P0 的精确一自由度方程分成两种等价但不可叠加的写法。总牵引分支为

$$
I_O\ddot\theta+mgL_G\sin\theta+\Pi_{el}'(\theta)
=Q_f^{tot}+Q_{\mathrm{air}}+Q_{ax}+Q_c,
\tag{4.12a}
$$

静水分裂分支为

$$
I_O\ddot\theta+mgL_G\sin\theta+\Pi_{el}'(\theta)+\Pi_h'(\theta)
=Q_f^{dyn}+Q_{\mathrm{air}}+Q_{ax}+Q_c,
\tag{4.12b}
$$

其中 $Q_{\mathrm{air}}\equiv Q_\theta^{\mathrm{air}}$，且

$$
Q_f^{(\cdot)}
=\int_{S_w}(\boldsymbol\sigma_f^{(\cdot)}\mathbf n_s)\cdot
[\mathbf e_x\times(\mathbf x-O)]\,\mathrm dS+Q_\theta^\gamma .
\tag{4.13}
$$

$Q_c$ 是墙/底接触广义力。P0 的结构惯量常数意味着 (4.12a)–(4.12b) 没有结构性的 $\dot\theta^2$ Christoffel 项；后文出现的 $\tfrac12I_a'\dot\theta^2$ 只来自配置依赖的流体降阶动能。

### 4.4 分布截面模型也必须保留投影核

只有在明确采用截面经验闭合时，(4.13) 才可降成沿湿轴的分布力。例如截面合力密度 $\mathbf f(r,t)\,[\mathrm{N/m}]$ 给

$$
Q_f^{\sec}=\int_{r\in\mathcal I_w}
\mathbf f(r,t)\cdot[r\mathbf c(\theta)]\,\mathrm dr
+\int_{r\in\mathcal I_w}m_x(r,t)\,\mathrm dr .
\tag{4.14}
$$

在 $\theta=0$ 且只有横向密度 $f_y$ 时，$Q_f^{\sec}=\int r f_y(r,t)\mathrm dr$。只有 $f_y$ 沿湿长均匀时才等于总力乘湿段中点；涡脱落、自由面、端部和墙面都会破坏该条件。

## 5. 支承反力、柔索松弛与绷紧冲量

### 5.1 P0 固定轴的反力/反矩

拉格朗日方程消去了固定轴反力，但实验载荷传感器需要它。令 $\mathbf F_{ext}$、$\boldsymbol\tau_{ext}^O$ 包含重力、真实流体/空气牵引、弹簧、轴摩擦和接触，不含理想轴承约束。总成质心加速度为

$$
\mathbf a_G=L_G[\ddot\theta\mathbf c(\theta)-\dot\theta^2\mathbf d(\theta)]
\tag{5.1}
$$

（质心在径向对称轴上的情形）。支承对摆的反力和反矩是

$$
\mathbf R_O=m\mathbf a_G-\mathbf F_{ext},
\qquad
\mathbf M_O^R=\frac{\mathrm d\mathbf H_O}{\mathrm dt}-\boldsymbol\tau_{ext}^O .
\tag{5.2}
$$

理想转轴在允许方向上满足 $\mathbf M_O^R\cdot\mathbf e_x=0$；弹簧和摩擦矩应作为已知轴向外矩单列。固定点速度为零、理想反矩垂直角速度，所以支承反力功率为零。传感器读到的是符号相反的支架受力，具体正负由标定矩阵冻结。

### 5.2 单柔索 S1 的完整 $SE(3)$ 方程

以刚体质心 $\mathbf r_G$、姿态 $R$、体坐标角速度 $\boldsymbol\omega$ 表示 S1。连接点相对质心的体向量为 $\mathbf a$，

$$
\mathbf x_A=\mathbf r_G+R\mathbf a,
\quad
\mathbf d_A=\mathbf x_A-O,
\quad
\mathbf n=\frac{\mathbf d_A}{|\mathbf d_A|}
\quad(\mathbf d_A\ne\mathbf0),
\quad
\mathbf v_A=\mathbf v_G+R(\boldsymbol\omega\times\mathbf a).
\tag{5.3}
$$

绷紧边界上 $|\mathbf d_A|=\ell$，故此时也有 $\mathbf n=\mathbf d_A/\ell$；张力 $T\ge0$ 对刚体的力为 $-T\mathbf n$。令 $\mathbf n_B=R^T\mathbf n$，$\mathbf F$、$\boldsymbol\tau^B$ 为除索力外的真实合力和质心体坐标力矩，则

$$
m\dot{\mathbf v}_G=\mathbf F-T\mathbf n,
\qquad
\mathbf J_G\dot{\boldsymbol\omega}
+\boldsymbol\omega\times(\mathbf J_G\boldsymbol\omega)
=\boldsymbol\tau^B-T\mathbf a\times\mathbf n_B,
\qquad
\dot R=R\widehat{\boldsymbol\omega}.
\tag{5.4}
$$

由二次约束导数 $\mathbf n\cdot\mathbf a_A=-|\mathbf v_A|^2/\ell$ 可直接解出张力。记

$$
\mathbf c_A=\mathbf a\times\mathbf n_B,
\qquad
D_T=\frac1m+\mathbf c_A\cdot\mathbf J_G^{-1}\mathbf c_A,
\tag{5.5}
$$

则

$$
T=\frac{
|\mathbf v_A|^2/\ell
+\mathbf n\cdot\mathbf F/m
+\mathbf c_A\cdot\mathbf J_G^{-1}
(\boldsymbol\tau^B-\boldsymbol\omega\times\mathbf J_G\boldsymbol\omega)
+\mathbf n_B\cdot[\boldsymbol\omega\times(\boldsymbol\omega\times\mathbf a)]
}{D_T}.
\tag{5.6}
$$

分子量纲为 $\mathrm{m/s^2}$，$D_T$ 为 $\mathrm{kg^{-1}}$，故 $T$ 为 N。对点质体 $\mathbf a=0$、最低点且无水，(5.6) 退化为 $T=m(g+\ell\dot\theta^2)$，验证了符号。

柔索的单边条件是

$$
\psi=\ell-|\mathbf d_A|\ge0,
\qquad T\ge0,
\qquad T\psi=0.
\tag{5.7}
$$

绷紧解若算得 $T<0$，物理上不是“压缩张力”，而是应在 $T=0$ 释放为无索力飞行。对竖直索下的点质体，或对姿态力矩也已平衡且外部竖向合力仅为重力减静水浮力的刚体，静态最低点有 $T=(m-\rho_fV_d)g$；若 $m\le\rho_fV_d$，上方柔索不能以正张力维持该平衡，必须松弛、上浮或接触其他限位。一般偏心刚体若仍有未平衡力矩，不能只用这条标量式判断张力。

松弛体到达 $|\mathbf d_A|=\ell$ 且 $\mathbf n\cdot\mathbf v_A^- >0$ 时发生绷紧冲量。若径向恢复系数为 $e_s\in[0,1]$，冲量大小

$$
P_s=\frac{(1+e_s)\mathbf n\cdot\mathbf v_A^-}{D_T},
\tag{5.8}
$$

并更新

$$
\mathbf v_G^+=\mathbf v_G^- -\frac{P_s}{m}\mathbf n,
\qquad
\boldsymbol\omega^+=\boldsymbol\omega^-
-P_s\mathbf J_G^{-1}(\mathbf a\times\mathbf n_B).
\tag{5.9}
$$

动能损失为

$$
\Delta T_s=-\frac{1-e_s^2}{2D_T}(\mathbf n\cdot\mathbf v_A^-)^2\le0.
\tag{5.10}
$$

当 $e_s>0$ 时，$\mathbf n\cdot\mathbf v_A^+=-e_s\mathbf n\cdot\mathbf v_A^-<0$，连接点在长度上限处反弹后立即向内，索应重新进入松弛分支；只有 $e_s=0$ 才可能保持绷紧，还必须继续检查 $T\ge0$。

式 (5.6)、(5.8)–(5.10) 的标量 $D_T$ 只适用于自由 $SE(3)$ 刚体加这一根活动索。若另一根索、墙接触或导向约束同时活动，必须把所有活动约束放入同一个 Delassus 系统。式 (5.8)–(5.10) 还是以刚体结构惯量作瞬时重置的结果，适用于干态或绷紧时间尺度内流体冲量可忽略的分支。若不可压流体在绷紧冲量期间仍与湿面满足不可穿透条件，必须把 $D_T$ 换成单体耦合系统的冲量 Schur 补（ROM-energy 中至少含一致的加入质量，HF 中则由离散流体—刚体冲量联立求解），并用结构加流体总动能计算损失；不得把 (5.8) 的干结构冲量和另一份经验“流体冲量”事后叠加。

### 5.3 双柔索 S2 与活动集

第 $j$ 根柔索取 $\psi_j=\ell_j-|\mathbf x_{A_j}-O_j|\ge0$、$T_j\ge0$、$T_j\psi_j=0$。给定一组假定绷紧索，约束加速度和刚体方程形成 Delassus 系统

$$
W\mathbf T=\mathbf b,
\qquad W=J_cM^{-1}J_c^T\succeq0,
\tag{5.11}
$$

其中 $J_c$ 是各索端径向速度的雅可比。若解中任何 $T_j<0$，删除该索并重解；若松索到达长度上限且径向速度向外，则把它加入冲量活动集。两索等长不蕴含等张力；姿态、质心偏置、浮心和非均匀流体牵引都会破坏对称性。

## 6. 静态平衡、约束线性化与固有频率

### 6.1 一般双边约束系统

把所有在静止时仍存在的非保守准静态广义力记为 $Q_0(q)$。平衡点 $(q_*,\lambda_*)$ 满足

$$
c(q_*)=0,
\qquad
\nabla\Pi(q_*)-Q_0(q_*)-A(q_*)^T\lambda_*=0.
\tag{6.1}
$$

假设 $A(q_*)$ 在邻域内具有恒定满行秩；取在平衡点求值的列满秩矩阵 $N$ 使 $A_*N=0$，即 $\delta q=N\xi$ 是约束切空间。线性化时必须保留约束预应力产生的几何刚度：

$$
M_T=N^TM_*N,
\tag{6.2a}
$$

$$
K_T=N^T\left[
\nabla^2\Pi-\partial_qQ_0
-\sum_\alpha\lambda_{*\alpha}\nabla^2c_\alpha
\right]_*N .
\tag{6.2b}
$$

若在速度零附近 $Q^{nc}=Q_0+Q_{\dot q}\delta\dot q+\cdots$，则

$$
C_T=-N^TQ_{\dot q,*}N
\tag{6.2c}
$$

再加显式 Rayleigh 阻尼矩阵。无耗散、无流体记忆时的固有频率由

$$
\det(K_T-\omega^2M_T)=0
\tag{6.3}
$$

给出。只有当线性化后的力是保守的、$M_T\succ0$ 且 $K_T$ 在约束切空间对称正定时，(6.3) 才给出通常意义下的实固有频率；非保守随动力会使 $K_T$ 非对称，必须报告联合一阶系统的复特征值而不是强行取平方根。$M_T$、$K_T$、$C_T$ 对角坐标的量纲分别为 $\mathrm{kg\,m^2}$、$\mathrm{N\,m}$、$\mathrm{N\,m\,s}$。如果使用已经消去约束的最小坐标，式 (6.2b) 的几何刚度已隐含在最小坐标 Hessian 中；不能再加一次。对柔索/接触等单边约束，只有在活动集冻结且严格互补时才能用 (6.2a)–(6.2c)；在 $T=0$、$\lambda_n=0$、掠碰或活动集切换点不存在唯一的光滑切线刚度。

完整自由面 FSI 中，$\delta Q_f(t)$ 一般依赖流场状态和历史，而不是常数闭合 $K_f\delta q+C_f\delta\dot q$。此时 (6.3) 只给机械/静水子系统的频率；真正的起振阈值、锁频和耦合特征值必须线性化流体与刚体的联合状态。

### 6.2 P0 的静态平衡

对静水分裂式 (4.12b)，周期流动只能先取相位/长时平均的准静态分量。平衡条件是

$$
\mathcal R(\theta_*)
=mgL_G\sin\theta_*+\Pi_{el}'(\theta_*)+\Pi_h'(\theta_*)
-\overline{Q_f^{dyn}}(\theta_*,0)-Q_{\mathrm{air}}(\theta_*,0)=0.
\tag{6.4}
$$

若轴静摩擦存在，等式改为集合条件

$$
|\mathcal R_{\text{不含静摩擦}}(\theta_*)|\le\tau_s.
\tag{6.5}
$$

在几何关于 $y=0$ 对称、来流沿 $x$、轴/弹簧无偏置时，平均横向牵引在 $\theta=0$ 为零，因而 $\theta_*=0$ 是平衡。顺流阻力沿 $\mathbf e_x$，对绕 $\mathbf e_x$ 的理想 P0 不做广义功；若实验出现顺流偏转，说明装置有额外自由度或轴未与来流平行。

P0 在 $\theta=0$ 的机械—静水—准静态环境切线刚度为

$$
K_0=mgL_G+K_{el}+K_h
-\left.\partial_\theta\overline{Q_f^{dyn}}\right|_0
-\left.\partial_\theta Q_{\mathrm{air}}(\theta,0)\right|_0,
\qquad
K_{el}=\Pi_{el}''(0),
\tag{6.6}
$$

其中 $K_h$ 用 (3.22)/(3.23)。静止空气且使用 (4.8) 的纯相对速度阻力时 $Q_{\mathrm{air}}(\theta,0)=0$，最后一个导数自动为零。若只问“静水但无来流的机械—静水固有频率”，应删去两个准静态环境斜率；若问干态频率，还应再令 $K_h=0$。不能把稳态升力斜率冒充第一性原理结构刚度。

### 6.3 从流体动能得到加入质量，而不是手添惯性系数

在**静止、无背景流、零环量、不可压、所选自由面边界条件已冻结**的势流降阶中，为单位广义速度求速度势 $\phi_i$：

$$
\nabla^2\phi_i=0,
\qquad
\nabla\phi_i\cdot\mathbf n_s=\mathbf J_i\cdot\mathbf n_s
\quad\text{on }S_w,
\tag{6.7}
$$

并在槽壁、自由面、远场采用与该近似一致的边界条件。流体扰动动能为

$$
T_a=\frac{\rho_f}{2}\int_{\Omega_f}
\left|\sum_i\dot q_i\nabla\phi_i\right|^2\mathrm dV
=\frac12\dot q^TM_a(q)\dot q,
\tag{6.8}
$$

$$
(M_a)_{ij}=\rho_f\int_{\Omega_f}
\nabla\phi_i\cdot\nabla\phi_j\,\mathrm dV,
\qquad M_a=M_a^T\succeq0.
\tag{6.9}
$$

角坐标下 $M_a$ 的量纲为 $\mathrm{kg\,m^2}$。墙、底、有限湿长、端面和自由面都会改变 (6.9)；无限流体中无限圆柱的常数 $C_A$ 不能未经检验搬到本装置。

总动能 $T=(\dot q^T[M+M_a]\dot q)/2$ 的变分给

$$
[M_{ij}+(M_a)_{ij}]\ddot q_j
+[\Gamma_{ijk}+\Gamma^a_{ijk}]\dot q_j\dot q_k
+\partial_i\Pi=Q_i^{res},
\tag{6.10}
$$

$$
\Gamma^a_{ijk}=\frac12
[\partial_k(M_a)_{ij}+\partial_j(M_a)_{ik}-\partial_i(M_a)_{jk}].
\tag{6.11}
$$

P0 的特例就是

$$
[I_O+I_a(\theta)]\ddot\theta
+\frac12I_a'(\theta)\dot\theta^2
+\Pi'(\theta)=Q^{res}.
\tag{6.12}
$$

符号可用功率立即审查：

$$
\dot\theta\left([I_O+I_a]\ddot\theta
+\frac12I_a'\dot\theta^2\right)
=\frac{\mathrm d}{\mathrm dt}
\left[\frac12(I_O+I_a)\dot\theta^2\right].
\tag{6.13}
$$

如果把加入质量作用写在右端，则

$$
Q_{\mathrm{am}}^{\mathrm{inertia}}=-I_a\ddot\theta-\frac12I_a'\dot\theta^2.
\tag{6.14}
$$

$M_a'(q)$ 必须包含流体积分域的形变和各 $\phi_i(q)$ 的形状导数；只对经验“湿长系数”求导并不等于 (6.11)。配置变化跨过润湿端盖时 $M_a(q)$ 可只有分段光滑性；这时应事件化切换或保留场模型，不能用噪声很大的数值 $I_a'$ 硬穿过拐点。真实自由面辐射通常产生频率依赖的加入质量和记忆核；单个瞬时 $M_a(q)$ 只在声明的势流/频率区间内成立。若存在背景来流、环量或历史，还可能出现线性速度、陀螺或辐射耦合，不能由单一自治 $M_a(q)$ 代替。

### 6.4 三套互斥的流体记账

| 分支 | 左端保留 | 右端流体输入 | 禁止叠加 |
|---|---|---|---|
| HF-total | 干结构 $M,\Pi_g,\Pi_{el}$ | 含静水压、非定常压、黏性和必要毛细线力的完整实际湿面牵引 | $\Pi_h$、$M_a$、Morison 惯性项、另一个经验升力 |
| HF-split | 干结构 $M,\Pi_g,\Pi_{el}$ 加平水面 $\Pi_h$ | 已减去同一 $p_h$ 的动态应力牵引 | 完整总压再积分、$M_a$ |
| ROM-energy | 干结构加 $\Pi_h$ 与由 (6.8) 得到的 $M_a$ | 只含未被势流动能解释的黏性、尾流、辐射记忆/来流功，并写清校准来源 | 同一流场的完整牵引、重复的经验加入质量 |

“加入质量 + 全流体牵引”不是更完整，而是把同一非定常压力惯性算了两次。若 ROM 的记忆核在高频极限已经包含瞬时惯性，也必须从核中剥离该部分后才能另列 $M_a$。

### 6.5 线性频率与稳定条件

在 $\theta_*=0$、线性黏性阻尼 $c_0$、加入转动惯量 $I_{a0}$ 的 ROM 中，

$$
I_e\,\delta\ddot\theta+c_0\,\delta\dot\theta+K_0\,\delta\theta
=\delta Q_{wake/memory},
\qquad I_e=I_O+I_{a0}.
\tag{6.15}
$$

这里 $\delta Q_{wake/memory}$ **按定义**是剥离后的残差：已经从总线性流体/空气力中扣除了 (6.6) 吸收的两个准静态 $\delta\theta$ 斜率、$I_{a0}$ 吸收的瞬时惯性，以及 $c_0$ 已吸收的局部线性耗散；它只保留尾流潜状态、辐射记忆或其他尚未左移的动态反馈。用同一标定力同时填入 $K_0$、$I_{a0}$、$c_0$ 和右端残差会重复计数。

忽略右端动态流体反馈时

$$
\omega_n=\sqrt{K_0/I_e},
\qquad
f_n=\omega_n/(2\pi),
\qquad
\zeta=\frac{c_0}{2\sqrt{I_eK_0}}.
\tag{6.16}
$$

必须先有 $I_e>0$、$K_0>0$。若 $K_0\le0$，下垂态是静态失稳或临界态，不能继续报告实数“固有频率”。VIV 极限环的观测频率由流固耦合决定，不能与 (6.16) 无条件等同。

## 7. 极限、特例与可证伪检查

### 7.1 小角、无水、部分浸没、全浸没

对 P0，若圆柱部分浸没且水线切侧面、不切端盖，由 (3.22)

$$
K_{0,\mathrm{partial}}
=mgL_G+K_{el}
+\rho_f g(-V_{d0}r_{B0}+I_{wp,x})
\tag{7.1}
$$

（未计动态流体斜率）。对应频率由 (6.16) 给出。有限半径项 $+\rho_f gI_{wp,x}$ 在势能刚度中是正号；等价地，浮力驱动力斜率是

$$
Q_B'(0)=\rho_f g(V_{d0}r_{B0}-I_{wp,x}),
\tag{7.2}
$$

所以有限半径使浮力的失稳斜率**减小**。

- **无水极限**：$S_w=\varnothing$、$V_d=0$、$\Pi_h=0$、$I_a=0$，

  $$
  \omega_{dry}^2=(mgL_G+K_{el})/I_O.
  \tag{7.3}
  $$

- **全浸没极限**：没有水线项。若浮心在 $O+L_B\mathbf d$ 上，

  $$
  \Pi_h'=-\rho_f gV_dL_B\sin\theta,
  \qquad
  K_{full}=mgL_G+K_{el}-\rho_f gV_dL_B,
  \tag{7.4a}
  $$

  $$
  \omega_{full}^2=\frac{K_{full}}{I_O+I_{a0}}
  \tag{7.4b}
  $$

  （在瞬时加入质量近似内）。若浮力矩超过重力/弹性恢复矩，竖直向下态失稳。

- **恰好润湿/出水端盖**：$\eta_0$ 等于 $\ell_t$ 或 $\ell_b$ 对应高度时，湿润拓扑切换；体积与势能连续，但更高阶导数可不连续。线性化必须取所处物理分支的一侧极限。

### 7.2 姿态锁定的 V1 不能套用 P0 的水线刚度

V1 中圆柱不转动，所有点的竖直位移导数为 $\partial_\theta z=\ell\sin\theta$。若总成质量为 $m$，静水分裂后精确重力—浮力项为

$$
m\ell^2\ddot\theta
+[m-\rho_fV_d(\theta)]g\ell\sin\theta
+\Pi_{guide/el}'=Q_f^{dyn}+Q_{diss},
\tag{7.5}
$$

其中导向机构若有质量，应把真实机构惯量加到 $m\ell^2$。小角刚度为

$$
K_{V1}=[m-\rho_fV_{d0}]g\ell+K_{guide/el}.
\tag{7.6}
$$

没有 $I_{wp,x}$ 项，因为圆柱姿态未倾斜；导向约束提供保持姿态所需的反矩。实验若把 P0 和 V1 的频率数据混拟合，会把拓扑差异错误吸收到“加入质量”或“阻尼”中。

### 7.3 零阻尼与零来流不是同一极限

轴摩擦、空气阻力、黏性和接触均置零，且采用闭合静水/势流动能时，机械—加入质量能量守恒。可是只把结构阻尼设为零而保留有能量通量的来流，并不会得到保守系统；入口可通过非定常牵引向摆持续做功。零来流但保留黏性水体时仍可能有辐射/黏性衰减。任何“零阻尼极限”必须同时列出保留的流体端口。

### 7.4 一组最小的极限回归

1. $\rho_f\to0$：几何量 $V_d,\mathbf x_B,A_{wp}$ 保持定义，但 (3.18)–(3.23) 中所有带 $\rho_f$ 的势、力矩和刚度，以及 (6.9) 的加入质量，都随 $\rho_f$ 线性趋零。
2. 固定 $\rho_f,g,\ell_t,\ell_b,h_p$ 并令 $a\to0$：$I_{wp,x}=O(a^4)$，而排水体积及其轴线浮力矩为 $O(a^2)$，所以有限半径修正更快消失。
3. $\theta\to0$：(3.19) 给出 (7.2)，且奇函数 $Q_B$ 无常数项。
4. 全浸没：水面位置只改变 $\Pi_h$ 的常数，不改变 $Q_B$；水线 Hessian 项为零。
5. 理想约束：支承/索力的连续功率为零；任何非零值应被记为离散约束功残差。
6. 无耗散、无端口：总能量漂移应随时间步和空间误差收敛到零，而不是靠事后重标能量曲线。

## 8. 墙面、槽底接触与冲击事件

### 8.1 圆柱对平面的精确间隙

P0 圆柱中心为

$$
\mathbf x_C=O+\ell_c\mathbf d,
\qquad \ell_c=(\ell_t+\ell_b)/2.
\tag{8.1}
$$

关于中心的有限圆柱对单位方向 $|\mathbf n|=1$ 的支撑函数为

$$
h_C(\mathbf n)=a\sqrt{1-(\mathbf n\cdot\mathbf d)^2}
+\frac{L_c}{2}|\mathbf n\cdot\mathbf d|.
\tag{8.2}
$$

直槽侧壁 $y=\pm W/2$、平底 $z=z_b$ 的非穿透间隙可写为

$$
g_R=\frac W2-y_C-h_C(\mathbf e_y),
\quad
g_L=\frac W2+y_C-h_C(\mathbf e_y),
\quad
g_b=z_C-z_b-h_C(\mathbf e_z).
\tag{8.3}
$$

要求 $g_k\ge0$。式 (8.2) 同时包含侧面和端缘，计算最小间隙时无需先猜接触点；但在 $\mathbf n\cdot\mathbf d=0$（整条母线成为支撑集）或 $|\mathbf n\cdot\mathbf d|=1$（整个端面成为支撑集）时，支撑函数对姿态不可微，接触力矩/冲量没有唯一的单点 Jacobian。此时应使用单侧 Jacobian、法锥/次梯度，或把候选端面/边缘点列为多接触互补问题。若径向臂、配重也可能碰壁，应对刚体并集的每个凸部件取最小间隙；弯曲槽底则直接求 $\min_{\mathbf X\in\mathcal B}[z(\mathbf X,q)-z_b(x,y)]$。

### 8.2 持续接触与冲击

持续无粘着接触采用

$$
g_n(q)\ge0,
\qquad \lambda_n\ge0,
\qquad g_n\lambda_n=0.
\tag{8.4}
$$

在首次到达 $g_n=0$、$\dot g_n^-<0$ 时不能让连续 ODE 穿透。令 $J_n=\partial g_n/\partial q$、$W_n=J_nM^{-1}J_n^T$。单接触、法向恢复系数 $e_n\in[0,1]$ 时

$$
P_n=-\frac{(1+e_n)\dot g_n^-}{W_n}\ge0,
\qquad
M(\dot q^+-\dot q^-)=J_n^TP_n,
\qquad
\dot g_n^+=-e_n\dot g_n^-.
\tag{8.5}
$$

其动能损失为

$$
\Delta T=-\frac{1-e_n^2}{2W_n}(\dot g_n^-)^2\le0.
\tag{8.6}
$$

多点同时接触需解非负冲量互补问题，不能按任意顺序逐点反弹。若冲击前另有双边约束 $B\dot q=0$，(8.5) 中的自由逆质量应先投影为

$$
M_c^{-1}=M^{-1}-M^{-1}B^T(BM^{-1}B^T)^\dagger BM^{-1},
\qquad
\dot q^+-\dot q^-=M_c^{-1}J_n^TP_n,
\qquad
W_n=J_nM_c^{-1}J_n^T,
\tag{8.7}
$$

再与所有新接触组成同一个 Delassus 系统；此时不能继续沿用 (8.5) 的裸动量更新，否则会破坏原约束。库仑摩擦满足 $|\mathbf P_t|\le\mu P_n$，粘着时切向相对速度为零，滑动时冲量反向于切向速度。持续滑动摩擦功率非正；理想持续法向反力因 $\dot g_n=0$ 不做功。

式 (8.5)–(8.6) 中的 $M$ 必须与所选流体记账一致：干态取结构质量矩阵；ROM-energy 取含同一 $M_a$ 的有效矩阵；HF 若在冲击时间尺度仍施加不可压界面约束，则应使用流体—结构离散系统消元后的有效冲量算子，而不是先用干结构 $M$ 反弹、再额外加一份流体冲量。相应能量损失也必须用同一有效动能度量。

接触前的薄隙润滑压力属于流体牵引，可能在几何接触前急剧增大；它不能被一个刚性碰撞冲量替代。接触事件会改变流体域和湿面拓扑，HF 分支必须同步更新网格/界面，ROM 则必须声明冲击期间失效或另有校准。

## 9. 从真实状态到相机、角度和探针的观测算子

### 9.1 统一状态与刚体标记

高保真状态取

$$
X_{HF}(t)=\{q,\dot q,\mathbf u(\mathbf x,t),p(\mathbf x,t),\eta(x,y,t),\mathcal A_c\},
\tag{9.1}
$$

其中 $\mathcal A_c$ 是绷紧索/接触活动集。ROM 的尾流变量若存在，只是潜状态，不是实验直接观测。对任一拓扑冻结齐次变换 $T_{WB}(q)$。体固连标记 $\mathbf r_k^B$ 的真实位置为

$$
\begin{bmatrix}\mathbf r_k^W\\1\end{bmatrix}
=T_{WB}(q)
\begin{bmatrix}\mathbf r_k^B\\1\end{bmatrix}.
\tag{9.2}
$$

P0 特例是 $\mathbf r_k^W=O+R_x(\theta)\mathbf r_k^B$；S1 则为 $\mathbf r_G+R\mathbf r_k^B$。这层几何映射必须先于任何像素拟合冻结。

### 9.2 相机与滚动快门

令相机内参 $K$、畸变参数 $\mathbf d_{cam}$、世界到相机外参 $(R_{CW},\mathbf t_{CW})$。理想齐次点投影为

$$
\mathbf z_{kn}^{pix}=
\Pi_{K,\mathbf d_{cam}}\!\left[
R_{CW}(t_{row})\mathbf r_k^W(t_{row})
+\mathbf t_{CW}(t_{row})\right]
+\mathbf b_{seg}+\boldsymbol\epsilon_{kn},
\tag{9.3}
$$

其中校准投影把畸变施加在归一像平面，再乘内参：

$$
\Pi_{K,\mathbf d}([X,Y,Z]^T)
=\pi\!\left(K\,\operatorname{hom}_2
\{\mathcal D_{\mathbf d}([X/Z,Y/Z]^T)\}\right),
\qquad
\operatorname{hom}_2([u,v]^T)=[u,v,1]^T,
\qquad
\pi([u,v,w]^T)=[u/w,v/w]^T.
\tag{9.3a}
$$

令 $\bar v_{kn}(t)$ 是 (9.3) 去掉 $\mathbf b_{seg},\boldsymbol\epsilon_{kn}$ 后的无噪声预测纵坐标，$\delta_{cam}$ 是相机时钟相对实验主时基的偏置，$v_{ref}$ 是读出计时的参考行，$N_{row}$ 是传感器总行数，$t_{read}$ 是从首个到末个有效行的读出时长。滚动快门行时刻满足隐式关系

$$
t_{row}=t_n+\delta_{cam}
+\frac{\bar v_{kn}(t_{row})-v_{ref}}{N_{row}-1}t_{read}.
\tag{9.4}
$$

因为 $\bar v_{kn}$ 本身由 (9.3) 的无噪声前向模型决定，快速摆动时应迭代求解或在曝光区间内插值状态；加性像素/分割噪声不得反向改变物理曝光时刻。若相机提供逐行硬件时间戳，则应直接以该时间戳替代 (9.4) 的名义线性读出模型。把整帧都赋给 $t_n$ 会产生与速度相关的系统偏差。

由两端标记重建圆柱轴单位向量 $\widehat{\mathbf d}$ 后，P0 的真实横流角为

$$
\theta_{opt}=\operatorname{atan2}(\widehat d_y,-\widehat d_z).
\tag{9.5}
$$

其对 $(d_x,d_y,d_z)$ 的局部梯度为

$$
\nabla_{\mathbf d}\theta
=\frac{(0,-d_z,d_y)}{d_y^2+d_z^2}.
\tag{9.6}
$$

编码器可直接输出 $z_\theta=\theta+b_\theta+\epsilon_\theta$，但零位、比例和轴不共线误差仍属于标定参数。不要用逐帧差分把像素噪声放大后称作直接测得的 $\dot\theta,\ddot\theta$；它们应由带动力学残差的状态平滑器连同协方差输出。

### 9.3 力、流速、水面和流量探针

六轴支承传感器的理想输入是 (5.2) 的支承力旋量，而不是流体力本身。本文固定运动旋量排列为 $\mathsf V=[\mathbf v^T,\boldsymbol\omega^T]^T$，功率共轭的力旋量排列为 $\mathsf W=[\mathbf F^T,\mathbf M^T]^T$，满足 $\mathsf W^T\mathsf V=\mathbf F\cdot\mathbf v+\mathbf M\cdot\boldsymbol\omega$。令 $T_{SO}$ 的伴随矩阵把 $O$ 坐标下的运动旋量变换到传感器坐标 $S$，则力旋量用逆转置变换：

$$
\mathbf z_W=S_W\,\operatorname{Ad}_{T_{SO}}^{-T}
\begin{bmatrix}-\mathbf R_O\\-\mathbf M_O^R\end{bmatrix}
+\mathbf b_W+B_\Theta(\Theta-\Theta_0)+\boldsymbol\epsilon_W.
\tag{9.7}
$$

其中 $S_W$ 是六维力旋量到传感器通道的灵敏度/串扰标定矩阵，$\Theta$ 是传感器温度，$B_\Theta$ 是温漂系数。负号表示传感器通常测支架所受反作用；最终由加载标定冻结。单柔索张力计则是 $z_T=s_TT+b_T+\epsilon_T$，其中 $T$ 用 (5.6)，不能用摆角单独推断。

场探针统一写成算子：

$$
z_{PIV}=\mathcal M_{PIV}[\mathbf u]+b_{peak}+\epsilon_{PIV},
\quad
z_\eta=\mathcal M_{opt}[\eta]+b_{refract}+\epsilon_\eta,
\tag{9.8}
$$

$$
\mathcal Q_{\mathrm{flow}}(t)=\int_{\mathcal A_{\mathrm{flow}}(x_0,t)}u_x\,\mathrm dA,
\qquad
z_{\mathrm{flow}}=s_{\mathrm{flow}}\mathcal Q_{\mathrm{flow}}
+b_{\mathrm{flow}}+\epsilon_{\mathrm{flow}}.
\tag{9.9}
$$

点式热线/ADV/Pitot 应把有限采样体积、方向响应、自由面折射或动压—静压转换写进各自 $\mathcal M$。由机械平衡反演的流体力矩

$$
\widehat Q_f^{inv}=I_O\widehat{\ddot\theta}
+mgL_G\sin\widehat\theta+\widehat{\Pi_{el}'}
+\widehat{\Pi_h'}-\widehat Q_{\mathrm{air}}-\widehat Q_{ax}-\widehat Q_c
\tag{9.10}
$$

是**派生观测**，不是直接传感器量；它对加速度、摩擦和几何误差高度敏感，并且只能在与所选压力分支一致时使用。

### 9.4 误差传播和共享标定相关性

活动集 $\mathcal A_c$ 是离散分支标签，不能与连续场一起直接塞进高斯状态向量。条件于某个固定分支 $\mathcal A_c$，令 $\mathbf x_c$ 表示进入观测算子的连续有限维状态（包括离散后的场自由度或其不确定度参数），把几何、相机、时基、密度、水位和传感器标定记为 $\boldsymbol\kappa$：

$$
\mathbf y=h_{\mathcal A_c}(\mathbf x_c,\boldsymbol\kappa)+\boldsymbol\epsilon,
\qquad
\boldsymbol\xi=[\mathbf x_c^T,\boldsymbol\kappa^T]^T .
\tag{9.11}
$$

一阶协方差传播应使用完整联合协方差：

$$
\Sigma_y=J_\xi\Sigma_\xi J_\xi^T+\Sigma_\epsilon,
\qquad
J_\xi=\partial h_{\mathcal A_c}/\partial\boldsymbol\xi .
\tag{9.12}
$$

若明确假定状态与标定独立，才可拆成 $J_{x_c}\Sigma_{x_c}J_{x_c}^T+J_\kappa\Sigma_\kappa J_\kappa^T$。同一组 $K,R_{CW},O,a,\ell_t,\ell_b,\eta_0,\delta_{cam}$ 被所有帧共用；只要其标定协方差非零且相应灵敏度非零，就会产生跨帧非对角协方差。把这种情形强行处理成逐帧独立误差条，会低估频率、相位和反演力矩的不确定度。

对向量派生量 $\mathbf r=g(\mathbf y,\boldsymbol\kappa)$，令 $\boldsymbol\nu=[\mathbf y^T,\boldsymbol\kappa^T]^T$ 且 $J_g=\partial g/\partial\boldsymbol\nu$，再用

$$
\Sigma_{\mathbf r}=J_g\Sigma_{\boldsymbol\nu}J_g^T.
\tag{9.13}
$$

接近透视奇点、索松弛、接触或润湿端盖切换时，算子不光滑/强非线性；活动集本身不确定时还应对各分支作概率混合或集合传播。此时应使用分支条件下的 Monte Carlo、无迹变换或区间界，而不是强行报告单个高斯一阶小数点误差。原始像素/电压、标定数据和派生 $q,Q_f,V_d$ 应分层保存，避免把派生量当原始证据。

## 10. 能量恒等式与逐式量纲审计

### 10.1 机械能账本

HF-split 的连续、无冲击 P0 能量定义为

$$
E_m=\frac12I_O\dot\theta^2+\Pi_g+\Pi_{el}+\Pi_h.
\tag{10.1}
$$

用 (4.12b) 点乘 $\dot\theta$ 得

$$
\frac{\mathrm dE_m}{\mathrm dt}
=\dot\theta(Q_f^{dyn}+Q_{\mathrm{air}}+Q_{ax}+Q_c).
\tag{10.2}
$$

每项都是 W。HF-total 则从 $E_m$ 删去 $\Pi_h$，右端换 $Q_f^{tot}$。ROM-energy 把 $I_O$ 换成 $I_O+I_a(\theta)$，由于 (6.13) 仍得到同一形式。三种分支的能量账本因此提供了双计数检测：若同一次计算中既有 $\dot\Pi_h$ 又有总静水牵引功，或既有 $\dot T_a$ 又有完整惯性压力功，接口和结构能量不会正确对消。

实际湿面接口功率满足

$$
Q_f\dot\theta
=\int_{S_w}(\boldsymbol\sigma_f\mathbf n_s)\cdot\dot{\mathbf x}_s\,\mathrm dS
+Q_\theta^\gamma\dot\theta.
\tag{10.3}
$$

流体域能量方程在刚体边界出现其相反数，因此联合 FSI 能量中界面功严格相消。理想固定轴反力、绷紧索力满足零功；轴摩擦和静止空气满足非正功；冲击按 (5.10)/(8.6) 产生离散负能量跃变。

### 10.2 量纲审计表

| 式/量 | 组成量纲 | 结果 | 审计结论 |
|---|---|---|---|
| (2.2) $I_O$ | $\rho_s[\mathrm{kg/m^3}](\mathbf X\cdot\mathbf X)[\mathrm{m^2}]\,\mathrm dV[\mathrm{m^3}]$ | $\mathrm{kg\,m^2}$ | 与 $I_O\ddot\theta$ 的 $\mathrm{N\,m}$ 一致 |
| (0.1)/(4.13) $Q_f$ | $\boldsymbol\sigma_f[\mathrm{N/m^2}]\,\mathrm dS[\mathrm{m^2}]J_\theta[\mathrm m]$ | $\mathrm{N\,m}$ | 实际湿面投影核必有长度 |
| (0.2) $\Pi_h$ | $\rho_f g[\mathrm{N/m^3}][\eta-z][\mathrm m]\,\mathrm dV[\mathrm{m^3}]$ | J | 势导数对角度仍是 $\mathrm{N\,m}$ |
| (3.4) $\mathbf F_B,\boldsymbol\tau_B^P$ | $\rho_f gV_d[\mathrm N]$、再乘臂长 | N、$\mathrm{N\,m}$ | 浮心是一阶体积矩除体积 |
| (3.22) $K_h$ | $\rho_f g[-V_{d0}r_{B0}+I_{wp,x}]=[\mathrm{N/m^3}][\mathrm{m^4}]$ | $\mathrm{N\,m}$ | rad 无量纲，故也是每 rad 刚度 |
| (4.10) 弹性能 | $k_j[\mathrm{N/m}](\Delta\ell)^2$ 或 $k_\theta[\mathrm{N\,m}]\theta^2$ | J | 预紧通过真实长度进入 |
| (4.8) 表面阻力 | $\mathbf C_a[\mathrm{kg/(m^2s)}]\mathbf w_a[\mathrm{m/s}]$ | $\mathbf t_a^{drag}$ 为 $\mathrm{N/m^2}$ | 再经 (4.7) 得广义力矩 |
| (5.6) 张力 | 分子 $\mathrm{m/s^2}$，分母 $\mathrm{kg^{-1}}$ | N | 点质体极限给 $m(g+\ell\dot\theta^2)$ |
| (5.8)/(8.5) 冲量 | 速度除逆有效质量 | $P$ 为 $\mathrm{N\,s}$ | $J^TP$ 与对应广义动量同量纲：平移为 $\mathrm{kg\,m/s}$，角坐标为 $\mathrm{kg\,m^2/s}$ |
| (6.9) $M_a$ | $\rho_f[\mathrm{kg/m^3}]\nabla\phi_i\nabla\phi_j\,\mathrm dV$ | 依坐标；角坐标为 $\mathrm{kg\,m^2}$ | $\phi_i$ 对单位角速度含 $\mathrm{m^2}$ 尺度 |
| (6.12) $I_a'\dot\theta^2/2$ | $\mathrm{kg\,m^2/s^2}$ | $\mathrm{N\,m}$ | 正号由 (6.13) 固定 |
| (9.3) 像素 | $K$ 把无量纲归一像平面乘以像素尺度 | pixel | 几何位置仍必须先用 m 的一致世界系 |
| (9.12) 协方差 | $J\Sigma J^T$ | 输出单位平方 | 共享标定产生跨帧协方差 |

### 10.3 符号与能量的互补闭环

下面四条是互补的一致性路径；它们并非统计独立证据，但任一不合都应拒绝冻结：

1. **浮力符号**：由表面压力积分得 $\mathbf F_B=+\rho_f gV_d\mathbf e_z$；由势能得 $Q_B=-\Pi_h'$；由 (3.18) 微分得 (3.19)。三者一致。
2. **有限半径项**：$Q_B'(0)=\rho_f g(V_{d0}r_{B0}-I_{wp,x})$，而 $K_h=\Pi_h''=\rho_f g(-V_{d0}r_{B0}+I_{wp,x})$，两者互为负号。
3. **加入质量项**：Christoffel 变分给 $+I_a'\dot\theta^2/2$，功率导数 (6.13) 给同号。
4. **约束/冲击**：连续理想反力功率为零；松索绷紧和墙碰撞能量跃变分别由 (5.10)、(8.6) 非正。

## 11. 已执行的解析—数值交叉核验

本节只记录本备忘录推导期间实际执行的检查，不把未运行的三维 FSI、实验或网格收敛写成“已验证”。

### 11.1 圆弓静水势二阶差分

取

$$
a=0.03\,\mathrm m,
\quad \ell_t=0.20\,\mathrm m,
\quad \ell_b=0.50\,\mathrm m,
\quad h_p=0.32\,\mathrm m,
\quad \rho_f=998\,\mathrm{kg/m^3},
\quad g=9.81\,\mathrm{m/s^2}.
$$

由 (3.20)/(3.22) 得

$$
V_{d0}=5.089380098815\times10^{-4}\,\mathrm{m^3},
\quad r_{B0}=0.41\,\mathrm m,
\quad I_{wp,x}=6.361725123519\times10^{-7}\,\mathrm{m^4},
$$

$$
K_h^{analytic}=-2.036677199764\,\mathrm{N\,m}.
$$

对 (3.14) 作一维自适应积分，并把 $d_r=\pm a$ 的两个圆弓断点显式传入求积器；中心二阶差分 $\varepsilon=10^{-4}$ 得

$$
K_h^{FD}=-2.036677204664\,\mathrm{N\,m},
\qquad
\frac{|K_h^{FD}-K_h^{analytic}|}{|K_h^{analytic}|}
=2.41\times10^{-9}.
\tag{11.1}
$$

若不给断点，小角窄圆弓带会被求积器跳过，数值结果趋向 $-\rho_f gV_{d0}r_{B0}=-2.042905570405\,\mathrm{N\,m}$，恰好漏掉 $+\rho_f gI_{wp,x}$。这不是物理近似，而是积分分支解析失败。

### 11.2 解析恒等式检查

下列前三项已同时作手推和计算机代数化简。本次核验是独立交互命令，不宣称现有项目脚本已经覆盖；为使证据可复跑，完整核心命令如下（实际环境：Python 3.12.3、SymPy 1.12、SciPy 1.11.4）：

~~~python
import math
import sympy as sp
from scipy.integrate import quad

# 四个符号残差
th, q, v, acc, A, lb, h, I, rho, g, m, ell = sp.symbols(
    "th q v acc A lb h I rho g m ell", nonzero=True
)
Pi = rho*g*(
    A*(lb*sp.cos(th)-h)**2/(2*sp.cos(th))
    + I*sp.sin(th)**2/(2*sp.cos(th))
)
Q = (
    rho*g*A*sp.sin(th)/2*(lb**2-h**2/sp.cos(th)**2)
    - rho*g*I*sp.sin(th)*(1+sp.tan(th)**2/2)
)
Ia = sp.Function("Ia")
residuals = (
    sp.trigsimp(sp.diff(Pi, th) + Q),
    sp.simplify(
        sp.diff(Pi, th, 2).subs(th, 0)
        - rho*g*(-A*(lb-h)*(lb+h)/2 + I)
    ),
    sp.simplify(
        v*(Ia(q)*acc + sp.diff(Ia(q), q)*v**2/2)
        - (Ia(q)*v*acc + sp.diff(Ia(q), q)*v**3/2)
    ),
    sp.simplify((v**2/ell + g)/(1/m) - m*(g + v**2/ell)),
)
assert residuals == (0, 0, 0, 0)

# (3.10)–(3.14) 的分段圆弓积分与 (11.1)
a, lt, lb_, hp, rho_, g_ = 0.03, 0.20, 0.50, 0.32, 998.0, 9.81
A_ = math.pi*a*a
I_ = math.pi*a**4/4

def area_moment(d):
    if d <= -a:
        return 0.0, 0.0
    if d >= a:
        return A_, 0.0
    root = math.sqrt(max(0.0, a*a-d*d))
    return (
        a*a*(math.asin(d/a)+math.pi/2) + d*root,
        -2*root**3/3,
    )

def potential(theta):
    sine, cosine = math.sin(theta), math.cos(theta)
    beta = abs(sine)
    if beta == 0.0:
        lo = max(lt, hp)
        return rho_*g_*A_*((lb_-hp)**2-(lo-hp)**2)/2
    def integrand(r):
        area, moment = area_moment((r*cosine-hp)/beta)
        return (r*cosine-hp)*area-beta*moment
    cuts = [lt, lb_]
    for sign in (-1, 1):
        root_r = (hp+sign*a*beta)/cosine
        if lt < root_r < lb_:
            cuts.append(root_r)
    cuts = sorted(set(cuts))
    return rho_*g_*sum(
        quad(integrand, x0, x1, epsabs=1e-13, epsrel=1e-13)[0]
        for x0, x1 in zip(cuts, cuts[1:])
    )

step = 1e-4
K_fd = (potential(step)-2*potential(0.0)+potential(-step))/step**2
K_exact = rho_*g_*(-A_*(lb_-hp)*(lb_+hp)/2+I_)
relative_error = abs(K_fd-K_exact)/abs(K_exact)
assert relative_error < 1e-8
print(residuals, K_exact, K_fd, relative_error)
~~~

实际输出为

~~~text
(0, 0, 0, 0) -2.036677199763999 -2.0366772046642723 2.4060136170672932e-09
~~~

因此浮力势导数、静水 Hessian、加入质量功率恒等式和点质体张力极限的符号残差均严格为零；圆弓数值积分则给出 (11.1) 的有限精度误差。

- 把 (3.18) 直接求导并化简，得到 (3.19)；再在 $\theta=0$ 求导，得到 (7.2)。
- 把 $T_a=I_a(q)\dot q^2/2$ 代入 Euler–Lagrange 算子，得到 $I_a\ddot q+I_a'\dot q^2/2$；点乘 $\dot q$ 后逐项等于 $\mathrm dT_a/\mathrm dt$。
- 把 S1 退化为 $\mathbf a=0$ 点质体，(5.6) 在最低点给 $m(g+\ell\dot\theta^2)$；把 $V_d>0$ 的静水浮力加入 $\mathbf F$ 后给 $(m-\rho_f V_d)g$ 的静态张力。
- 对全浸没体，令 $z_B=\mathbf e_z\cdot\mathbf x_B$，则 (0.2) 化为 $\rho_f gV_d(\eta_0-z_B)$；竖直平移导数给向上 $+\rho_f gV_d\mathbf e_z$，绕轴导数给 (7.4a)。

### 11.3 尚未执行、不得冒充证据的项目

- 尚未用三维自由面求解器验证动态牵引、接触线或有限槽壁效应；
- 尚未由实验 CAD/称量冻结 $I_O,L_G,a,\ell_t,\ell_b$；
- 尚未测得轴摩擦、空气阻力、弹簧预紧和支承柔度；
- 尚未做加入质量边值问题、辐射核或 FSI 特征值计算；
- 尚未用真实相机标定/滚动快门数据执行 (9.3)–(9.13)。

这些项目属于后续验证输入，不影响本文方程的变分一致性，但决定其能否对具体装置作数值预测。

## 12. 冻结接口、实现门槛与审稿清单

### 12.1 传给场模型/ROM/实验的最小接口

1. **几何映射**：$T_{WB}(q)$、真实实体 $\mathcal B$、实际湿面选择器 $S_w(q,\eta)$、每点 $\mathbf J_i$。
2. **结构量**：$M(q)$、$\Pi_g,\Pi_{el}$、轴摩擦/空气阻力、约束 $c,A$ 与活动集。
3. **静水量**：$V_d,\mathbf x_B,\Pi_h,\Pi_h',\Pi_h''$，同时标记 dry/partial/full/end-cap-cut 分支。
4. **场到结构**：同一时层同一湿面上的 $Q_i^f$ 和界面功率 $\sum_iQ_i^f\dot q_i=\mathbf Q_f^T\dot{\mathbf q}$；合力与力矩分项输出。
5. **结构到场**：$\mathbf x_s,\dot{\mathbf x}_s$ 及其时间戳，不能只给摆角。
6. **观测**：分支条件下的原始像素/电压算子 $h_{\mathcal A_c}(\mathbf x_c,\boldsymbol\kappa)$、共享标定 $\boldsymbol\kappa$、完整协方差和活动集标签。

R3 降阶可把 P0 横流坐标记为 $q=\theta$，并定义任一关注点的横移灵敏度

$$
h_y=\left.\frac{\partial y_h}{\partial\theta}\right|_0 .
\tag{12.1}
$$

若选择轴向位置 $r_h$ 的中心线点，则 $h_y=r_h$。只对 $h_y\ne0$ 的关注点，相应等效平移质量才可定义为 $m_e=I_e/h_y^2$；轴线上横移灵敏度为零的点不能用于这种坐标变换。这个变换只改变坐标，不改变 (6.12) 的 $I_a'/2$ 或表面牵引投影。

### 12.2 进入冻结门前必须逐项回答

- [x] 官方没有冻结悬挂，本文明确声明了 P0 的额外选择并分列 V1/S1/S2/P1。
- [x] 刚体质量、质心、惯量来自体积分，均匀圆柱的横向自转惯量没有遗漏。
- [x] 湿体积、浮心、侧面、端盖和动态水面均有实际几何定义。
- [x] 静水势与总牵引/动态牵引的互斥记账已写明。
- [x] P0 方程由 Lagrange–d'Alembert 得到，任意约束系统保留乘子和几何刚度。
- [x] 加入质量来自流体动能矩阵，Christoffel/$I_a'/2$ 符号通过能量审计。
- [x] 静态平衡、线性化、固有频率和 dry/partial/full/zero-damping 极限均有失效条件。
- [x] 固定轴反力、单/双索张力、松弛、绷紧冲量和能量损失均可恢复。
- [x] 墙/底间隙、互补接触、冲击和摩擦分支已定义。
- [x] 相机、角度、支承、PIV、水面、流量及误差传播共享同一真实状态。
- [x] 每类方程有量纲和能量闭环；圆弓浮力刚度已作独立数值差分核验。
- [x] 已由独立审稿通道逐式重做 (3.18)–(3.23)、(5.6)/(5.8)–(5.10)、(6.2b)、(6.12) 与 (8.2)/(8.5)–(8.6)；核心符号一致，其指出的 $\cos\theta>0$ 闭式分支、单边活动集、受约束冲量和支撑函数非光滑条件均已就地补入。

## 13. 一级题意与相关原始研究索引

1. International Young Physicists' Tournament. *Problems for the 40th IYPT 2027*, Problem 13 “Vortex pendulum”. [官方 PDF](https://iypt.org/wp-content/uploads/2026/07/IYPT-Problems-for-2027-final-edition-web.pdf).
2. Huera-Huarte, F. J. (2026). *Energy harvesting from vortex-induced vibrations using a pendulum*. **Journal of Fluids and Structures, 140**, 104449. [DOI](https://doi.org/10.1016/j.jfluidstructs.2025.104449).
3. Kim, J., Song, M. & Kim, D. (2018). *Large-amplitude flow-induced vibration of cylindrical pendulums*. **Journal of Fluids and Structures, 79**, 39–49. [DOI](https://doi.org/10.1016/j.jfluidstructs.2018.01.011). 该研究使用弹性片允许圆柱横流摆动，说明弹性悬挂是一个相关变体，不是官方唯一拓扑。

本文的变分、静水圆弓、约束冲量与观测方程均在此独立展开；上述研究用于确认题意和现实装置类别，不作为未经检查公式的替代。
