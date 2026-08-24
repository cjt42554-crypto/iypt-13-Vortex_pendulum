# R3：从连续场到可检验涡激摆模型的系统降阶

> **文档角色**：F2“降阶冻结”的候选推导，不是已经冻结的生产方程。
> **对象**：部分浸水有限圆柱在横向来流中的单主横流摆动；多自由度、湿润拓扑切换和三维跨向失相干作为显式升级分支。
> **证据边界**：本文只证明“在列出的假设成立时，哪些模型形式被允许、怎样从上一层得到下一层、怎样证伪”。本文不为本装置给出尚未测量的系数数值，也不把固定无限圆柱的结果直接移植成有限部分浸水圆柱的定量结论。

---

## 0. 先给结论：最低可辩护的模型不是 `F=-c v`，也不是预设 Van der Pol

1. 连续场到机械自由度之间唯一不需要经验闭合的流体接口，是湿表面牵引和（锐界面、钉扎润湿分支中的）毛细接触线力对虚位移的共同投影：

   $$
   \begin{aligned}
   Q_f(t)={}&\int_{\Gamma_b(t)}
   (\boldsymbol\sigma\boldsymbol n_b)\cdot
   \frac{\partial\boldsymbol r}{\partial q}\,\mathrm dS\\
   &-\oint_{\mathcal C_b(t)}
   \gamma\boldsymbol m\cdot
   \frac{\partial\boldsymbol r}{\partial q}\,\mathrm d\ell .
   \end{aligned}
   \tag{R3.1}
   $$

   $\boldsymbol n_b$ 是刚体指向液体的法向，$\boldsymbol m$ 是 R2 定义的自由面片外余法向。局部相对速度、湿表面、接触线、力臂和跨向相位均必须先保留在积分内。把它们提前压成一个常数升力系数或一个固定力臂，是闭合而不是恒等式。

2. 在稳态基流附近做小扰动，最一般的一阶、因果、时不变流体闭合是卷积记忆核或其等价状态空间实现。常数附加质量与常数阻尼只是该频率相关阻抗的低频矩展开；若尾流有靠近虚轴的涡脱落极点，这一展开失效，必须保留至少一个动态尾流状态。

3. 若**本装置同一固定几何**的稳态尾流在一个简单共轭特征值对处发生光滑 Hopf 分岔，且其余模态有谱隙，则中心流形给出复 Stuart–Landau（SL）幅值方程。SL 是局部分岔正规形；它不是“任何有涡的流动都服从”的全局经验律。

4. 只有在近 Hopf、窄带、1:1 近共振、弱阻尼、弱耦合、缓慢参数变化且高次谐波较小的多尺度极限下，复 SL 才能写成一个实的二阶尾流振子。标准 Van der Pol 又是其中令非线性频移为零、只留一种耦合、固定幅值规范后的特例，不能从题意直接假设。

5. 必须至少区分工作日志要求的三种“阈值”：固定体尾流 Hopf、锁频舌入口、实验可见振幅阈值。为避免遗漏，本文另列“耦合稳态基流的数学失稳阈值”；它只在稳态基流仍存在时有意义。四者一般不相等。

6. ROM 的能量结论只使用不变量 $Q_f\dot q$。SL 幅值的模平方在未固定模态归一化前不是可测的“尾流能量”。

---

## 1. 证据等级、适用对象与同 R1/R2 的接口

### 1.1 本文的四种陈述标签

| 标签 | 含义 | 可否直接进入冻结模型 |
|---|---|---|
| **[恒等]** | 由运动学、虚功或变量定义得到 | 可，但几何对象必须由 F0 固定 |
| **[渐近]** | 在给定小参数与谱条件下有受控余项 | 只可在运行时检查适用域后使用 |
| **[闭合]** | 形式受对称性约束，但系数需实验/高保真数据标定 | 可作为候选，不能冒充第一性原理 |
| **[经验选择]** | 从多个同阶允许项中选出的简化 | 需模型比较和真正盲测后才可冻结 |

### 1.2 几何接口，不预判尚未冻结的装置拓扑

令 $q$ 为横流主自由度；在单摆分支可取相对竖直方向的摆角 $q=\theta$。材料点 $\boldsymbol X$ 的位置写成

$$
\boldsymbol r=\boldsymbol r(\boldsymbol X,q),\qquad
\boldsymbol J_q(\boldsymbol X,q)=\frac{\partial\boldsymbol r}{\partial q}.
\tag{R3.2}
$$

定义水动力参考位移 $y_h(q)$，并在下垂平衡 $q=0$ 处定义

$$
h:=\left.\frac{\mathrm dy_h}{\mathrm dq}\right|_0,\qquad
y_h(q)=h q+O(q^3)
\tag{R3.3}
$$

其中第二个等号只在装置关于横流反射对称时成立；若支承或水槽横向不对称，则允许 $q^2$ 项。$h$ 是局部运动学导数，不得同时无证据地充当质心、浮心和合力作用点的共同力臂。

本文主线只要求 R1/R2 向 R3 提供以下对象：

- 刚体/绳/支承的配置映射 $\boldsymbol r(\boldsymbol X,q)$；
- 质心、浮心、湿表面 $\Gamma_b(q,\eta)$ 与接触线 $\mathcal C_b(q,\eta)$；$\eta$ 表示自由表面状态；
- 结构动能 $T_s(q,\dot q)$、保守势能 $V(q)$、非保守结构广义力 $R_s(q,\dot q,\ldots)$；
- 场模型给出的湿表面牵引、毛细线力及其功率符号约定。

符号防混注记：无下标的 $\gamma$ 始终是表面张力；$\gamma_0,\gamma_1,\gamma_2$ 是第 6 节的复尾流耦合系数，与表面张力没有等同关系。

若圆柱保持竖直的双线/平行四边形机构、随单线摆倾斜的刚体机构、流向—横流双自由度机构给出不同的 $\boldsymbol r,\Gamma_b,\mathcal C_b$，它们会给出不同的 $h(s,q)$、附加惯量和载荷积分；不能共用一套数值系数。

### 1.3 R1 canonical 的显式实例：绕顺流轴转动的刚性倾斜摆

R1 当前 canonical 取固定转轴平行顺流方向 $\boldsymbol e_x$ 的单自由度刚性旋转摆。以枢轴 $O$ 为原点，$z$ 向上、$y$ 横流，圆柱轴向单位向量与轴线上距枢轴 $r$ 的点为

$$
\boldsymbol d(\theta)=\sin\theta\,\boldsymbol e_y-
\cos\theta\,\boldsymbol e_z,
\qquad
\boldsymbol X_{\rm ax}(r,\theta)=\boldsymbol O+r\boldsymbol d(\theta),
\quad r\in[\ell_t,\ell_b].
\tag{R3.3a}
$$

因此

$$
y(r,\theta)=r\sin\theta,\qquad
\frac{\partial y}{\partial\theta}=r\cos\theta,\qquad
h(r,0)=r.
\tag{R3.3b}
$$

若枢轴高出未扰动平水面 $h_O$，圆柱**轴线**与平水面的交点为

$$
r_f(\theta)=\frac{h_O}{\cos\theta},
\tag{R3.3c}
$$

从而轴线湿长可作几何预估

$$
L_{w,\rm ax}(\theta)=
\operatorname{clip}[\ell_b-r_f(\theta),0,L_c].
\tag{R3.3d}
$$

但 (R3.3d) 不是有限半径圆柱的精确排水体积、湿侧面或端盖面积。精确量必须对每个 $r$ 的圆弓湿面积 $A_w(r,\theta)$ 和真实湿表面做积分。canonical 的广义流体力矩为

$$
\begin{aligned}
Q_\theta^f={}&\boldsymbol e_x\cdot
\int_{\Gamma_b}(\boldsymbol X-\boldsymbol O)
\times(\boldsymbol\sigma\boldsymbol n_b)\,\mathrm dS\\
&-\oint_{\mathcal C_b}\gamma\boldsymbol m\cdot
\frac{\partial\boldsymbol X_b}{\partial\theta}\,\mathrm d\ell ,
\end{aligned}
\tag{R3.3e}
$$

而不是横向合力乘一个输入常数。第一行等价于 R2 关于支点的湿面应力力矩，第二行是钉扎锐界面接触线的毛细广义力。在线性下垂位形，局部力臂就是 $r$，所以 (R3.14) 中的 $h(s)^2$ 对 canonical 具体化为 $r^2$。

作为装置变体，若平行四边形机构令圆柱保持竖直平移，才可能出现
$L_w=\operatorname{clip}[L_{w0}-\ell(1-\cos\theta),0,L_c]$ 这类参考点抬升公式；它不得用于当前刚性倾斜 canonical。

### 1.4 R1/R2 到 R3 的逐式接口表

| 上游冻结对象 | R3 中的唯一用法 | 必须同时携带的记账标签 |
|---|---|---|
| R1 有限圆柱实体、湿实体/湿面/接触线与虚位移核 | 式 (R3.2)–(R3.3e) 的 $\boldsymbol r,\boldsymbol J_q,\Gamma_b,\mathcal C_b$ | `P0` 旋转 canonical 或某个明示变体；不允许混用几何 |
| R2 连续场式 (3.4) 的湿面应力+毛细线力虚功 | 式 (R3.1)/(R3.8) 的 $Q_f$ | `total-traction` 或 `hydrostatic-split`；静水压不得同时出现两次 |
| R2 变分力学式 (4.12a,b)/(6.12) | 式 (R3.19) 的机械骨架 | `HF-total`、`HF-split` 或 `ROM-energy` 三者只选一个 |
| R2 式 (6.13) 的配置依赖加入质量功率恒等式 | 式 (R3.17)/(R3.21) 中 $+\tfrac12J_a'\dot q^2$ | $J_a$ 来源、频带和从余下流体载荷中扣除的部分 |
| R2 连续场式 (10.1) 的保功映射 | 式 (R3.9) 以及残差 (R3.95) | 同一时层、同一湿面、同一法向/正方向 |
| R2 变分力学式 (12.1) 的 $h_y$ | 式 (R3.3)/(R3.50) 的坐标缩放与 $m_e=J_e/h^2$ | 必须记录选的观测点/载荷参考位移；$m_e$ 不是新的独立质量 |

这个表只冻结“接口怎样对接”，不宣称 R1/R2 已通过 F0/F1 冻结门。若上游文档的法向、湿润分支或静水记账改变，R3 必须解冻并重做功率对账，而不是只重拟合一个系数。

### 1.5 本文不跨越的边界

- 自由表面破碎、接触线钉扎/脱钉、端盖穿越水面、绳松弛、碰壁和触底会改变状态空间或湿表面拓扑；这些不是光滑 SL/卷积 ROM 的“小误差”。
- 固定**无限**圆柱或二维截面的 Hopf 系数只能支持模型机制，不能给有限跨距、端部、自由表面和阻塞条件下的系数数值。
- 若固定体尾流已经是极限环，零尾流幅值不是稳定参考态；此时摆动通常先是周期升力的受迫响应，而不是结构零解的 Hopf。

---

## 2. 相对速度、分布载荷与广义力

### 2.1 刚体速度与“相对来流”

材料点速度为

$$
\boldsymbol u_b(\boldsymbol X,t)
=\left.\frac{\partial\boldsymbol r}{\partial t}\right|_q
+\boldsymbol J_q(\boldsymbol X,q)\dot q .
\tag{R3.4}
$$

对刚体，也可写成

$$
\boldsymbol u_b=\dot{\boldsymbol x}_c+
\boldsymbol\omega_b\times(\boldsymbol r-\boldsymbol x_c).
\tag{R3.5}
$$

准稳态载荷中的相对速度必须用外缘/未扰动参考流 $\boldsymbol U_e$ 定义：

$$
\boldsymbol u_r(\boldsymbol X,t)=
\boldsymbol U_e(\boldsymbol r,t)-\boldsymbol u_b(\boldsymbol X,t).
\tag{R3.6}
$$

这里不能使用无滑移壁面上的实际流速，因为该处流速按边界条件等于 $\boldsymbol u_b$，会平凡地得到零“相对速度”。设圆柱局部轴向单位向量为 $\boldsymbol e_c$，则参与截面升阻力的法向分量是

$$
\boldsymbol u_{r\perp}=(\boldsymbol I-\boldsymbol e_c\boldsymbol e_c^{\mathsf T})\boldsymbol u_r.
\tag{R3.7}
$$

式 (R3.4)–(R3.7) 为 **[恒等/定义]**；选择哪个 $\boldsymbol U_e$ 代表局部外缘流则是 **[闭合]**，在强阻塞、自由表面波或明显剪切流中必须测量或由更高层模型提供。

### 2.2 牵引投影是连续场到 ROM 的功率一致接口

取 $\boldsymbol\sigma\boldsymbol n_b$ 为液体应力作用在固体上的牵引。单自由度广义流体力为式 (R3.1)。多自由度 $\boldsymbol q$ 时，

$$
\boldsymbol Q_f=
\int_{\Gamma_b}\boldsymbol J_q^{\mathsf T}
(\boldsymbol\sigma\boldsymbol n_b)\,\mathrm dS
-\oint_{\mathcal C_b}\boldsymbol J_q^{\mathsf T}
\gamma\boldsymbol m\,\mathrm d\ell .
\tag{R3.8}
$$

由虚功立即得到

$$
Q_f\dot q=
\int_{\Gamma_b}(\boldsymbol\sigma\boldsymbol n_b)
\cdot\boldsymbol u_b\,\mathrm dS
-\oint_{\mathcal C_b}\gamma\boldsymbol m
\cdot\boldsymbol u_b\,\mathrm d\ell ,
\tag{R3.9}
$$

前提是 $\boldsymbol u_b=\boldsymbol J_q\dot q$ 已包含该分支的全部刚体运动。式 (R3.9) 与 R2 式 (3.4)/(10.1) 同号，是 ROM 与场模型之间最重要的功率审计式。若采用无表面张力模型，第二项消失；若把准静态毛细自由能变分移入机械势能，则必须从 $Q_f$ 中删去同一项，防止再次双计数。

若只记录横向总合力（含采用该锐界面表述时的毛细线力）$F_y$，则所谓合力臂只能定义为

$$
h_Q(t)=\frac{Q_f(t)}{F_y(t)}\quad(F_y\ne0).
\tag{R3.10}
$$

它一般随湿润几何、跨向相位和载荷分布变化；在 $F_y$ 过零时也不适定。因此数值实现应优先积 $Q_f$，而不是先积 $F_y$ 再乘固定长度。

### 2.3 准稳态升阻力只是一个可检验的载荷分解

对局部圆柱条带 $\mathrm ds$，一个常用但非唯一的准稳态候选为

$$
\begin{aligned}
\mathrm d\boldsymbol F_D
&=\tfrac12\rho D C_D
|\boldsymbol u_{r\perp}|\boldsymbol u_{r\perp}\,\mathrm ds,\\
\mathrm d\boldsymbol F_L
&=\tfrac12\rho D C_L(s,t)|\boldsymbol u_{r\perp}|^2
\boldsymbol R_{90}\widehat{\boldsymbol u}_{r\perp}\,\mathrm ds,
\end{aligned}
\tag{R3.11}
$$

其中 $C_L(s,t)$ 是有符号的动态尾流输出，不是预先固定常数；$\boldsymbol R_{90}$ 的方向约定必须同横向正方向一致。广义力仍需逐条带投影：

$$
Q_{D,L}=\int_{\mathcal L_w}
\boldsymbol J_q^{\mathsf T}\,\mathrm d\boldsymbol F_{D,L}.
\tag{R3.12}
$$

对均匀顺流 $U\boldsymbol e_x$，局部横向速度
$v_y(s)=h(s)\dot q$，且

$$
\epsilon_v:=\max_s\frac{|h(s)\dot q|}{U}\ll1,
\tag{R3.13}
$$

式 (R3.11) 的横向阻力投影给出

$$
Q_D=-c_D^{(q)}\dot q\,[1+O(\epsilon_v^2)],
\qquad
c_D^{(q)}=\frac12\rho D U
\int_{\mathcal L_w}C_D(s)h(s)^2\,\mathrm ds .
\tag{R3.14}
$$

因此“线性流体阻尼”只有在 (R3.11)、小相对横速和缓变系数都成立时才从相对速度展开得到；其系数应随 $\rho,D,U,L_w,C_D$ 和运动学力臂平方变化。直接写一个跨工况常数 $-c\dot q$ 会丢失这些预测。

若一级反对称尾流沿湿跨完全相干，式 (R3.12) 可近似为

$$
Q_L=\frac12\rho U^2DL_w h_L C_L(t),
\qquad
h_L:=\frac{1}{L_w}\int_{\mathcal L_w}h(s)\,\mathrm ds .
\tag{R3.15}
$$

若跨向相位 $\phi(s)$ 不同，则应保留复相干积分
$\int h(s)\widehat C_L(s)e^{i\phi(s)}\mathrm ds$；用 $L_w h_L$ 相乘会系统性高估相干升力。

### 2.4 附加质量必须通过动能或高频阻抗定义

若所选近似允许把一部分流体惯性写成局部附加动能，令 $m_a(s,q)$ 表示单位轴向长度的局部附加质量并定义

$$
T_a=\frac12J_a(q)\dot q^2,
\qquad
J_a(q)=\int_{\mathcal L_w}m_a(s,q)h(s,q)^2\,\mathrm ds .
\tag{R3.16}
$$

则其拉格朗日项为

$$
J_a(q)\ddot q+\frac12J_a'(q)\dot q^2.
\tag{R3.17}
$$

第二项不能在浸没长度或力臂随配置变化时删掉。多自由度时，$J_a$ 升级为配置依赖矩阵，并产生相应 Christoffel 型惯性项。

**双计数禁则**：若 $J_a$ 已由流体传递函数的高频极限或势流附加动能移到机械方程左端，拟合余下记忆核/尾流力时必须先减去同一惯性分量；反之，若完整流体求解器在右端返回全部牵引，就不得再额外加一次经验附加质量。

---

## 3. 功率一致的单自由度机械骨架

对标量 $q$，令结构与已分离附加流体的总惯量为

$$
J(q)=J_s(q)+J_a(q).
\tag{R3.18}
$$

对 R2 当前固定轴刚性旋转 canonical，结构惯量 $J_s=I_P\equiv I_O$ 为常数；$P$ 与 $O$ 都指同一固定顺流枢轴。配置依赖只可能来自降阶后分离出的 $J_a(q)$ 或更复杂支承。若直接调用 R2 全场牵引与毛细线力，则令 $J_a=0$，把全部流体效应保留在右端。

最小功率一致方程为

$$
J(q)\ddot q+\frac12J'(q)\dot q^2+V'(q)
+R_s(q,\dot q,\mathcal H_s)=Q_w[q,\mathcal H_f;U],
\tag{R3.19}
$$

其中：

- $V$ 包含当前光滑分支内已明确移入机械侧的重力、静水浮力或准静态毛细自由能；同一静水/毛细贡献不能同时留在 $Q_w$；
- $R_s\dot q\ge0$ 表示轴承、材料和支承等结构耗散；$\mathcal H_s$ 允许结构滞后，但若该内部状态会暂存并返还能量，就必须把其储能 $E_{s,\rm int}$ 加入 (R3.20)，改用 $\dot E_{s,\rm int}+R_s\dot q=\mathcal D_s\ge0$，而不强求 $R_s\dot q$ 逐时非负；
- $Q_w$ 是从 R2 完整 $Q_f$ 中减去已移入左端的附加惯性和已移入 $V$ 的准静态项后的流体余量，仍可包含动态毛细/接触线、自由表面和尾流历史；$\mathcal H_f$ 表示这些流体历史。

机械能

$$
E_m=\frac12J(q)\dot q^2+V(q)
\tag{R3.20}
$$

满足

$$
\frac{\mathrm dE_m}{\mathrm dt}=Q_w\dot q-R_s\dot q.
\tag{R3.21}
$$

式 (R3.17) 中的 $\tfrac12J'\dot q^2$ 正是保证 (R3.21) 闭合的项。任何降阶实现都应把 (R3.21) 作为逐步和周期平均的测试，而不仅比较轨迹外观。

式 (R3.20)–(R3.21) 是“只看机械端口”的账本。若降阶模型还显式保留 R2-C1 的湿面滑移和移动接触线状态，则总降阶能量还必须加入自由面能与固–液/固–气表面能，并在功率式中保留
$\mathcal D_{\rm slip}\ge0$ 和 $\mathcal D_{\rm cl}\ge0$。若 ROM 没有这些状态，它们的合力只能留在 $Q_w[\mathcal H_f]$ 的历史依赖中；未经独立识别不得又加一份“接触线阻尼”。

在线性化前先求平均平衡 $q_0$：

$$
V'(q_0)=\overline{Q_w}(q_0,U).
\tag{R3.22}
$$

后文为简洁把坐标平移到 $q_0=0$。若平均横向力非零，未先平移便强行施加奇对称会把安装偏置误当成非线性流体效应。

---

## 4. 对称性先于经验方程

### 4.1 横流反射

若水槽、支承、来流和圆柱关于中心纵剖面对称，则反射 $\mathscr R_y:y\mapsto-y$ 给出

$$
(q,\dot q,\ddot q,A,Q_y)
\xmapsto{\mathscr R_y}
(-q,-\dot q,-\ddot q,-A,-Q_y),
\tag{R3.23}
$$

而 $U,\mathrm{Re},L_w,|A|^2$ 与平均顺流阻力为偶量。这里 $A$ 表示一级反对称尾流模态的复坐标。

由此得到：

- 横流机械回复和横流载荷的无偏展开只能含总奇次数项；
- 浸没长度、惯量和对称几何力臂以 $q^2$ 起变；
- 横流力中单独的常数、$q^2$、$|A|^2$ 不允许；但 $q|A|^2$、$q^3$、$q^2\dot q$ 允许；
- 尾流方程中 $A,q,\dot q,\ddot q,|A|^2A,q^2A,q|A|^2$ 都满足反射奇性；是否同阶还需多尺度计数。

对称性只排除项，不决定剩余项的系数和符号。若测得可靠的均值偏置、二次谐波或 $+q$ 与 $-q$ 响应不对称，应先检查水槽侧壁、支承、相机坐标、流入剪切和水线几何，不得用违反对称性的自由多项式静默吸收。

### 4.2 Hopf 的相位对称与耦合后的区别

固定体、无外迫的简单 Hopf 在正规形坐标中还具有时间平移诱导的相位等变性

$$
A\mapsto Ae^{i\varphi},
\tag{R3.24}
$$

所以自治立方正规形只能含 $A|A|^2$，不能任意放入 $\overline A$ 或 $A^2$。圆柱运动成为外迫/耦合变量后，单独的尾流相位对称不再约束全部瞬时方程；在共同 1:1 慢流中，应使用结构和尾流包络的**共同**相位等变性。这个区分是“允许线性位移、速度或加速度耦合”但“不允许随意堆非共振项”的依据。

---

## 5. 线性响应、延迟与记忆核

### 5.1 稳态基流附近的因果形式

在固定湿润拓扑、定常 $U$、小扰动且稳态基流线性稳定的条件下，流体广义力的一阶 Volterra 项可写成

$$
Q_f'(t)=K_fq(t)-J_\infty\ddot q(t)
-\int_0^\infty K_m(s)\dot q(t-s)\,\mathrm ds
+Q_{\mathrm{ic}}(t).
\tag{R3.25}
$$

这里 $K_m(s)=0\;(s<0)$ 保证因果性，$Q_{\mathrm{ic}}$ 保存初始尾流状态。式 (R3.25) 是 **[渐近：线性化]**，但并没有假设瞬时阻尼。核可以有振荡、变号和长尾；有平均流和涡脱落能量源时，不能未经证明把它当成被动正核。

若 (R3.25) 从 R2 完整界面载荷辨识，$K_m$ 可同时含黏性尾流、自由表面波和钉扎弯月面的线性记忆；只有通过模态/频带分离后，才可把其中一对极点专称“尾流状态”。接触线发生滑移或滞后切换时系统不再是单一 LTI 核，应转入不光滑活动集层。

对 $q=\Re\{\widehat q e^{i\omega t}\}$，定义

$$
Z_f(\omega)=K_f+J_\infty\omega^2-i\omega\widehat K_m(\omega),
\qquad
\widehat Q_f=Z_f\widehat q .
\tag{R3.26}
$$

$\Re Z_f$ 主要改变回复/惯性，$\Im Z_f$ 决定同速度相位的平均功率。一个常数 $m_a,c_a,k_a$ 只能逼近一小段频带的 $Z_f$。

纯延迟是记忆核的一个特例。例如

$$
K_m(s)=c_d\,\delta(s-\tau_d)
\quad\Longrightarrow\quad
Q_{\rm delay}(t)=-c_d\dot q(t-\tau_d),
\qquad
\widehat Q_{\rm delay}=-i\omega c_de^{-i\omega\tau_d}\widehat q .
$$

因子 $e^{-i\omega\tau_d}$ 同时改变动态刚度和能量相位；延迟项不能无条件地叫作“正阻尼”。只有 $\omega\tau_d\ll1$ 时才能将它展开成瞬时阻尼/惯性系列；否则保留延迟、用因果状态空间逼近，或直接保留卷积。

### 5.2 何时能把记忆压成附加质量与阻尼

若核矩

$$
M_n=\int_0^\infty s^nK_m(s)\,\mathrm ds
\tag{R3.27}
$$

存在，且运动频率满足 $\epsilon_m=\omega\tau_m\ll1$，则

$$
\begin{aligned}
-\int_0^\infty K_m(s)\dot q(t-s)\,\mathrm ds
={}&-M_0\dot q+M_1\ddot q
-\frac{M_2}{2}q^{(3)}+\cdots .
\end{aligned}
\tag{R3.28}
$$

截到 $N$ 阶的频域相对余项为 $O[(\omega\tau_m)^{N+1}]$，前提是相应高阶矩有界且工作频带内没有近极点。于是瞬时阻尼是 $M_0$，瞬时附加质量组合是 $J_\infty-M_1$；二者取决于采用的分拆规范，只有完整阻抗 $Z_f$ 是规范不变量。

当涡脱落极点的衰减率趋近零，$\tau_m\sim1/|\mu|$ 变长，式 (R3.28) 恰恰在最关心的锁频附近失效。此时“加一个更精确的常数阻尼”不是系统升级，应保留该极点的状态。

### 5.3 记忆核与动态尾流状态的等价

把靠近虚轴的一对流体极点显式写为复状态 $A$：

$$
\dot A=(\mu+i\omega_s)A+
\gamma_0q+\gamma_1\dot q+\gamma_2\ddot q,
\qquad
Q_{w,1}=\Re(\ell A).
\tag{R3.29}
$$

消去 $A$ 得

$$
\begin{aligned}
A(t)={}&e^{(\mu+i\omega_s)t}A(0)\\
&+\int_0^t e^{(\mu+i\omega_s)(t-s)}
[\gamma_0q+\gamma_1\dot q+\gamma_2\ddot q](s)\,\mathrm ds .
\end{aligned}
\tag{R3.30}
$$

因此位移、速度、加速度耦合都只是同一因果响应在不同坐标/分部积分规范下的候选。仅凭“加速度耦合在某组数据上较好”不能把另外两项从理论上置零。$\mu<0$ 时 (R3.30) 是衰减记忆；$\mu>0$ 时线性状态本身增长，必须加入非线性饱和。

多个指数/振荡核可写成

$$
\dot{\boldsymbol z}=\boldsymbol A_f\boldsymbol z+
\boldsymbol B_0q+\boldsymbol B_1\dot q,
\qquad
Q_f=\boldsymbol C_f\boldsymbol z+D_0q+D_1\dot q-D_2\ddot q,
\tag{R3.31}
$$

这给出从一对尾流极点到多模态有理近似的连续升级路径。状态维数应由独立频响/脉冲响应和残差决定，而不是由拟合优度无限增加。

---

## 6. 固定体 Hopf、中心流形与复 Stuart–Landau 层

### 6.1 可以使用中心流形的条件

设控制参数向量为

$$
\boldsymbol p=(\mathrm{Re},L_w/D,D/W,D/H,\mathrm{Fr},\mathrm{We},\ldots).
\tag{R3.32}
$$

只有同时满足下列条件，才把 SL 当作 **[渐近]** 而不是纯经验拟合：

1. 对**实际固定圆柱、实际端部/自由表面/水槽几何**存在一个稳态基流；
2. 线性化算子的一对简单共轭特征值 $\mu\pm i\omega_s$ 穿过虚轴；
3. 其余模态与虚轴有有限谱隙 $g_{\rm sp}>0$；
4. 非线性演化与边界条件在该湿润分支内足够光滑；
5. 没有同时临界的自由表面波、结构模态、流向模态或跨向模态。

自由表面接触线切换或两对模态近同时临界时，单复幅值中心流形不闭合，应升级到混杂/多模态层。

### 6.2 无外迫固定体的正规形

令 $\delta$ 为穿过 Hopf 面的有符号距离，经过近恒等变换后

$$
\dot A=
[\mu(\delta)+i\omega_s(\delta)]A
-(\beta_r+i\beta_i)|A|^2A
+R_5,
\tag{R3.33}
$$

其中

$$
\mu=\mu_1\delta+O(\delta^2),\qquad
R_5=O(|A|^5+|\delta||A|^3+\delta^2|A|).
\tag{R3.34}
$$

写 $A=r e^{i\phi}$，得到

$$
\dot r=\mu r-\beta_r r^3+O(r^5),
\qquad
\dot\phi=\omega_s-\beta_i r^2+O(r^4).
\tag{R3.35}
$$

若 $\beta_r>0$ 且 $\mu>0$，超临界分支的领先阶饱和量为

$$
r_0=\sqrt{\frac{\mu}{\beta_r}},
\qquad
\omega_{\rm lc}=\omega_s-\frac{\beta_i}{\beta_r}\mu,
\tag{R3.36}
$$

并预言 $r_0^2$ 对离阈距离领先阶线性。若 $\beta_r<0$，立方式不能饱和，必须至少加入五次项并允许亚临界分支与滞回；此时继续使用标准 Van der Pol 饱和是定性错误。

$\mu,\omega_s,\beta_r,\beta_i$ 可由直接/伴随全局模态投影或固定体瞬态数据定义。Provansal、Mathis 与 Boyer 对普通圆柱尾流近阈实验给出了 SL 行为的一级机制证据，但它不提供本题有限部分浸水装置的可移植数值系数。

### 6.3 弱运动耦合与流体输出

在横流反射对称、小体动边界扰动下，保留最低阶允许项：

$$
\boxed{
\dot A=(\mu+i\omega_s)A-(\beta_r+i\beta_i)|A|^2A
+\gamma_0q+\gamma_1\dot q+\gamma_2\ddot q+R_A
}
\tag{R3.37}
$$

$$
\boxed{
Q_w=Q_*\left\{
\Re(\ell A)+d_0q+d_1\dot q-d_2\ddot q
+d_3q^3+d_{Aq}q|A|^2
+\Re[\ell_3|A|^2A]+R_Q
\right\}.
}
\tag{R3.38}
$$

这里所有系数都可以依赖 $\boldsymbol p$；$Q_*$ 是稍后定义的载荷尺度。解释如下：

- $\gamma_0,\gamma_1,\gamma_2$ 是移动边界对尾流临界模态的复投影，分别携带幅值与相位；
- $\ell$ 把尾流模态映射到广义升力；
- $d_0,d_1,d_2$ 是未由 $A$ 表示的即时/短记忆线性余量；若 $d_2$ 已移入 $J_a$，应在此置零；
- $\beta_i$ 表示尾流振幅依赖频移，$\ell_3$ 表示输出映射本身的非线性；两者是不同机制；
- $R_A,R_Q$ 包含高次、非共振、跨向和其他模态项。

式 (R3.37)–(R3.38) 是**候选闭合族**。对特定归一化，允许项不等于所有项都可从现有数据同时辨识；应从最低复杂度开始逐项检验。

### 6.4 尾流幅值的规范自由度与真正可标定组合

尾流坐标不是直接观测量。变换

$$
A^*=s e^{i\varphi}A,\qquad s>0
\tag{R3.39}
$$

保持物理轨迹不变，但导致

$$
\beta^*=\frac{\beta}{s^2},\qquad
\ell^*=\frac{\ell e^{-i\varphi}}{s},\qquad
\gamma_j^*=s e^{i\varphi}\gamma_j.
\tag{R3.40}
$$

所以在没有独立尾流模态观测和归一化时，下列组合才具有物理意义：

| 可标定不变量/组合 | 物理含义 | 所需最少数据 |
|---|---|---|
| $\mu,\omega_s$ | 固定体临界模态增长/衰减率与线性频率 | 固定体扰动衰减/增长或场模态 |
| $\beta_i/\beta_r$ | 饱和频率相对饱和幅值的规范无关斜率 | 固定体多离阈工况 |
| $\lvert\ell\rvert\sqrt{\mu/\beta_r}$ | 固定体极限环的一级广义升力幅 | 同步力与尾流瞬态 |
| $\ell\gamma_j$ | 结构→尾流→载荷的复环路增益 | 规定运动的复频响 |
| $Q_*d_j/J_e$、$Q_*\ell/J_e$ | 机械方程实际感受到的系数组合（各 $d_j$ 仍携带与所乘时间导数匹配的单位） | 角度与力矩/力同步测量 |

一个可执行规范是：用固定体一级广义升力的 rms 或复 Fourier 系数定义 $A$，并固定其相位使 $\ell$ 为正实数。若没有同步力测量，就只能报告规范不变量及后验相关性，不应报告“高精度 $\ell,\beta,\gamma$”单参。

---

## 7. 从复 SL 到实尾流振子：推导、不是预设

### 7.1 需要同时成立的小参数条件

令 $\varepsilon\ll1$ 控制以下量：

$$
\frac{|\mu|}{\omega_s}=O(\varepsilon),\quad
\frac{|\omega_n-\omega_s|}{\omega_s}=O(\varepsilon),\quad
\zeta=O(\varepsilon),\quad
\mathcal G=O(\varepsilon),
\tag{R3.41}
$$

其中 $\mathcal G$ 是无量纲闭环耦合强度。此外还要求：
在第 8 节的无量纲化中，一个可执行、且对尾流幅值缩放不变的 1:1 局部定义是

$$
\mathcal G=
\left|\Lambda L_a
(\widehat\gamma_0+i\widehat\gamma_1-\widehat\gamma_2)
\right|,
$$

它就是在单位机械频率 $\lambda=i$ 上的领先闭环复增益幅。若工作频率明显不是 1，应以 $\widehat\gamma_0+i\omega\widehat\gamma_1-\omega^2\widehat\gamma_2$ 评估，不用一个与频率无关的“弱耦合常数”。

$$
\frac{|\dot U|}{\omega_sU}=O(\varepsilon^2),
\quad
\frac{\omega_s}{g_{\rm sp}}\varepsilon\ll1,
\quad
\frac{A_{2f}}{A_f}=O(\varepsilon),
\tag{R3.42}
$$

并且湿润拓扑在许多个脱落周期内不变。式 (R3.41) 给出近 Hopf、近 1:1 共振、弱阻尼和弱耦合；式 (R3.42) 给出参数缓变、被删模态谱隙和窄带条件。

在典型 Hopf 标度 $|A|=O(\varepsilon^{1/2})$ 下，SL 保留项为 $O(\varepsilon^{3/2})$，五次余项为 $O(\varepsilon^{5/2})$，相对误差为 $O(\varepsilon)$。若 $|A|=O(1)$ 或跨向/自由表面模态无谱隙，这个误差估计不成立。

### 7.2 实二阶代表

取可测实尾流坐标

$$
w=A+\overline A=2r\cos\phi .
\tag{R3.43}
$$

对式 (R3.33) 做一阶平均/近恒等变换，可得

$$
\boxed{
\ddot w+\omega_s^2w
=2\mu\dot w-2\beta_r w^2\dot w
+\frac{2}{3}\omega_s\beta_i w^3
+\mathcal F_q+R_w .
}
\tag{R3.44}
$$

为核对 (R3.44) 的系数和符号，令 $w=R\cos\phi$ 并对一周期平均。其慢幅相为

$$
\dot R=\mu R-\frac14\beta_rR^3,\qquad
\dot\phi=\omega_s-\frac14\beta_iR^2.
\tag{R3.44a}
$$

由于 $R=2r$，恰有
$\dot r=\mu r-\beta_rr^3$ 与
$\dot\phi=\omega_s-\beta_ir^2$。特别地，$\beta_i>0$ 应使频率下降，所以 (R3.44) 的立方项在右端为正；移到左端时必须是负号。这也是实现时可独立检查的符号测试。

若

$$
g_q=\gamma_0q+\gamma_1\dot q+\gamma_2\ddot q,
\tag{R3.45}
$$

则在不含立方项的线性子问题中有精确恒等式

$$
\ddot w-2\mu\dot w+(\mu^2+\omega_s^2)w
=2\Re\!\left[(\mathrm d/\mathrm dt-\mu+i\omega_s)g_q\right].
$$

在 $\mu/\omega_s=O(\varepsilon)$、耦合 $g_q=O(\varepsilon)$ 的计数下，$\mu^2w$ 和 $\mu g_q$ 比领先共振项高一阶，所以 (R3.44) 中的线性领先阶 forcing 才可写为

$$
\mathcal F_q=2\Re\left[(\mathrm d/\mathrm dt+i\omega_s)g_q\right],
\tag{R3.46}
$$

再利用近谐波机械方程可把高阶导数换成 $q,\dot q,\ddot q$ 的组合。式 (R3.44) 的平均幅相恰好复现
$\dot r=\mu r-\beta_rr^3$ 和
$\dot\phi=\omega_s-\beta_ir^2$。在 $w,q=O(\varepsilon^{1/2})$ 的 Hopf 计数下，保留的共振向量场为 $O(\varepsilon^{3/2})$，$R_w$ 的**共振投影**首项为 $O(\varepsilon^{5/2})$。近恒等变换还会在瞬时重构中产生被消去的非共振高次谐波，所以这个阶估计不是对原始波形的逐点误差上界。在 $t=O(1/\varepsilon)$ 的慢时间上，常规非退化与有界性条件下包络的相对误差为 $O(\varepsilon)$。

### 7.3 标准 Van der Pol 是哪些额外限制

常见形式

$$
\ddot w+\omega_s^2w
+\epsilon_w\omega_s\left(\frac{w^2}{w_0^2}-1\right)\dot w
=A_a\ddot q
\tag{R3.47}
$$

对应

$$
2\mu=\epsilon_w\omega_s,\qquad
2\beta_r=\frac{\epsilon_w\omega_s}{w_0^2},\qquad
\beta_i=0,\qquad
\mathcal F_q=A_a\ddot q.
\tag{R3.48}
$$

它还预设固定体极限环的 $w$ 峰值为 $2w_0$。因此采用 (R3.47) 等于同时作出四个经验选择：无非线性频移、特定非线性阻尼、只保留加速度耦合、固定尾流幅值规范。Facchinetti、de Langre 与 Biolley 的工作证明这类模型能复现一组典型 VIV 特征，并比较了耦合形式；它不是从本装置连续场唯一推出 (R3.47) 的证明。

若要使用二阶振子，最低可辩护版本应至少把 $\mu(\boldsymbol p)$、$\beta_r(\boldsymbol p)$、$\omega_s(\boldsymbol p)$ 与复耦合相位分开标定；不能让一个固定 $\epsilon_w$ 同时冒充增长率和饱和系数。

---

## 8. 完整无量纲化

### 8.1 机械尺度

在线性平衡点先冻结“哪一部分准静态流体刚度已移到左端”。令 $\overline Q_{w,\rm qs}$ **只**表示已有独立静态证据、并决定移入势能侧的那一部分，则

$$
\begin{gathered}
J_e=J(0),\qquad
K_{w,\rm qs}=
\left.\frac{\partial\overline Q_{w,\rm qs}}{\partial q}\right|_0,
\qquad K_e=V''(0)-K_{w,\rm qs},\\
\widetilde Q_w=Q_w-\overline Q_w(0)-K_{w,\rm qs}q,
\qquad
\omega_n=\sqrt{\frac{K_e}{J_e}}.
\end{gathered}
\tag{R3.49}
$$

后文为简洁仍把重定心后的 $\widetilde Q_w$ 记为 $Q_w$，因此 $C_Q=\widetilde Q_w/Q_*$。若没有独立证据支持这一准静态分拆，必须取 $K_{w,\rm qs}=0$，把整个频率依赖响应保留在右端。不允许既在 $K_e$ 中减去某个拟合斜率，又把同一斜率留在 $D_0x$ 或尾流状态的零频增益中。
这套振动尺度只在 $J_e>0$ 且 $K_e>0$ 时定义。$K_e=0$ 是静态临界，$K_e<0$ 是该平衡的静态失稳；两者都不能继续用实数 $\omega_n$ 和 1:1 锁频慢流。

并令

$$
q_c=\frac{D}{h},\qquad x=\frac q{q_c}\simeq\frac{y_h}{D},
\qquad \tau=\omega_nt,
\qquad m_e=\frac{J_e}{h^2}.
\tag{R3.50}
$$


若平均流体刚度未独立识别，则实验自由衰减只能给组合 $K_e/J_e$，不能把 $V''$ 与流体静态刚度拆开。这里的 $\omega_n$ 是与所声明静态分拆和操作点绑定的参考频率；它不自动等于空气固有频率 $\omega_{n,a}$ 或无来流静水固有频率 $\omega_{n,w}$。报告约化速度时必须把所用频率写在下标中。

取湿跨参考长度 $L_0$，力尺度与广义力尺度

$$
F_*=\frac12\rho U^2DL_0,\qquad Q_*=hF_*.
\tag{R3.51}
$$

定义

$$
\mathcal U=\frac{U}{\omega_nD},\qquad
m_{\rm ROM}^*=\frac{m_e}{\rho D^2L_0}
=\frac{J_e}{\rho D^2L_0h^2},\qquad
\Lambda=\frac{\mathcal U^2}{2m_{\rm ROM}^*}.
\tag{R3.52}
$$

这个 ROM 有效质量比不同于 R2 的原始刚体质量比
$m_b^*=m_b/(\rho D^3)$。R2 对旋转 canonical 还需

$$
I_P^*=\frac{I_P}{\rho D^5},\qquad
m_{\rm ROM}^*
=\frac{J_e/(\rho D^5)}
{(L_0/D)(h/D)^2}.
\tag{R3.52a}
$$

因此同一 $m_b^*$ 而回转半径不同的摆不会有同一 ROM 惯性。若附加惯量尚未分离，$J_e/(\rho D^5)$ 也不等于干体 $I_P^*$。
此外，$m_{\rm ROM}^*$ 随参考位移灵敏度 $h$ 和参考湿跨 $L_0$ 的选择而变，它是坐标缩放后的有效组合，不是新增的可独立称量参数。比较不同数据集时必须同时冻结 $(h,L_0)$；更换这两个参考量后，物理不变的是 $\Lambda C_Q$、$Q_w\dot q$ 和实际轨迹，不是 $m_{\rm ROM}^*$ 单独的数值。

将 (R3.19) 除以 $J_eq_c\omega_n^2$，得到

$$
\boxed{
\mathcal J(x)x''+\frac12\mathcal J_x(x)x'^2
+2\zeta x'+x+\alpha_3x^3+\mathcal R_{s,\rm nl}
=\Lambda\,C_Q[x,A;\boldsymbol\Pi].
}
\tag{R3.53}
$$

撇号表示 $\mathrm d/\mathrm d\tau$，且

$$
\mathcal J=J/J_e,\quad
2\zeta=\frac{c_sq_c\omega_n}{J_eq_c\omega_n^2}
=\frac{c_s}{J_e\omega_n},\quad
\alpha_3=\frac{V^{(4)}(0)q_c^2}{6K_e}.
\tag{R3.54}
$$

$C_Q=Q_w/Q_*$ 已包含分布载荷投影和浸没比。式 (R3.53) 显示为什么质量比、约化速度和载荷系数只能通过 $\Lambda C_Q$ 进入；没有独立力测量时，$m_{\rm ROM}^*$ 与升力标度强相关。

### 8.2 无量纲尾流方程

选定尾流幅值规范 $A=A_0a$。式 (R3.37) 变为

$$
a'=(\widehat\mu+i\Omega)a
-(\widehat\beta_r+i\widehat\beta_i)|a|^2a
+\widehat\gamma_0x+\widehat\gamma_1x'
+\widehat\gamma_2x''+\widehat R_A,
\tag{R3.55}
$$

其中

$$
\begin{gathered}
\widehat\mu=\mu/\omega_n,
\qquad \Omega=\omega_s/\omega_n,\\
\widehat\beta_{r,i}=\beta_{r,i}A_0^2/\omega_n,\\
\widehat\gamma_0=\gamma_0q_c/(A_0\omega_n),\quad
\widehat\gamma_1=\gamma_1q_c/A_0,\quad
\widehat\gamma_2=\gamma_2q_c\omega_n/A_0.
\end{gathered}
\tag{R3.56}
$$

若以 $x$ 而非 $q$ 写 (R3.37)，删除 (R3.56) 中的 $q_c$。线性输出可写

$$
C_Q=\Re(L_a a)+D_0x+D_1x'-D_2x''+\cdots,
\qquad L_a=\ell A_0.
\tag{R3.57}
$$

这里 $D_0$ 和尾流通道的零频增益只表示式 (R3.49) 分拆后**尚未**移入 $K_e$ 的部分。更换分拆规范时，必须联动变更 $K_e,D_0,L_a\Gamma$，使总线性阻抗保持不变。

以 $q$ 为无量纲转角，以 $[A]$ 表示尚未规范化的尾流幅值单位，与上述无量纲化相容的量纲快速审计为：

| 量 | 物理量纲 | 审计用途 |
|---|---|---|
| $J_e,J_a,J_\infty$ | $\mathrm{kg\,m^2}$ | 与 $\ddot q$ 相乘得 $\mathrm{N\,m}$ |
| $K_e,K_f,K_m(s)$ | $\mathrm{N\,m}$ | $\int K_m\dot q\,\mathrm ds$ 为力矩；此处 $s$ 是时间 |
| $c_s$ | $\mathrm{N\,m\,s}$ | $c_s\dot q$ 为力矩 |
| $\mu,\omega_s$ | $\mathrm{s^{-1}}$ | SL 线性增长与频率 |
| $\beta_{r,i}$ | $\mathrm{s^{-1}}[A]^{-2}$ | $\beta\lvert A\rvert^2A$ 与 $\dot A$ 同量纲 |
| $\gamma_0,\gamma_1,\gamma_2$ | $[A]\mathrm{s^{-1}},[A],[A]\mathrm{s}$ | 分别乘 $q,\dot q,\ddot q$ 后得 $[A]\mathrm{s^{-1}}$ |
| $\ell$ | $[A]^{-1}$ | $C_Q=\Re(\ell A)+\cdots$ 无量纲 |

选定 $A=A_0a$ 后，式 (R3.56)–(R3.57) 的带帽系数和 $L_a$ 均为无量纲。该表也说明了为什么未冻结 $[A]$ 时不能比较两套 $\beta$ 或 $\ell$ 的单独数值。

### 8.3 必须记录的无量纲群

| 类别 | 无量纲群 | 定义/说明 |
|---|---|---|
| 流动 | $\mathrm{Re}$ | $UD/\nu$ |
| 脱落 | $\mathrm{St}$ | $f_sD/U$，因此 $\Omega=2\pi\mathrm{St}\,\mathcal U$ |
| 共振 | $U_{r,e},U_{r,w},U_{r,a}$ | $U_{r,e}=U/(f_nD)=2\pi\mathcal U$ 对应式 (R3.49) 的操作点参考；$U_{r,w}=U/(f_{n,w}D)$、$U_{r,a}=U/(f_{n,a}D)$ 分别用无来流静水/空气频率，三者不混用 |
| 惯性 | $m_b^*,I_P^*,m_{\rm ROM}^*,J_a/J_s$ | R2 刚体质量/惯量、ROM 有效质量比与附加惯量比；须注明湿/干定义 |
| 耗散 | $\zeta$、$\mathrm{Sc}_{\rm ROM}=2m_{\rm ROM}^*\zeta$ | 本文明确采用 $2m_{\rm ROM}^*\zeta$ 的 Scruton-like 约定，避免文献中的 $4\pi$ 约定混淆 |
| 自由表面 | $\mathrm{Fr}_D=U/\sqrt{gD}$、$\mathrm{We}=\rho U^2D/\gamma$、$\mathrm{Bo}=\rho gD^2/\gamma$ | 三者仅两者独立；$\gamma$ 为表面张力，仍记录派生量便于审计 |
| 几何 | $L_0/D,D/W,D/H,s_0/D,h/D$ | 湿跨长、横向阻塞、水深、静水平衡的轴线浸没深度 $s_0$、运动学灵敏度 $h$；还需端/底间隙 |
| 振幅 | $X=Y/D$、$\Theta=Y/h$ | 约化振幅与摆角；两者不能混用 |
| 相对运动 | $\epsilon_v=\omega Y/U=(\widehat\omega/\mathcal U)X$ | 准稳态横向阻力线性化小参数 |
| 来流非定常 | $I_u=u'_{\rm rms}/U,L_t/D,\lvert\dot U\rvert/(\omega_sU)$ | 湍强、积分尺度与缓变率 |
| 尾流局部性 | $\lvert\widehat\mu\rvert,\lvert\Omega-1\rvert,\widehat\beta \lvert a\rvert^2$ | Hopf 离阈、失谐和非线性频移 |

若密度比、圆柱壁厚、支承惯量、自由液面到端部的距离或水槽纵向回流对实验可变，也必须加入 $\boldsymbol\Pi$。“只用 Re 与 $U_r$”不足以比较不同部分浸水几何。

### 8.4 小参数、首个遗漏项和误差阶

为了不把“湿跨变化”与“分布力臂变化”合并成一个含混指标，定义纯几何二阶力臂矩

$$
\mathcal H_2(q)=
\int_{\mathcal L_w(q)}h(s,q)^2\,\mathrm ds,
\qquad
\epsilon_H=
\frac{|\mathcal H_2(q)-\mathcal H_2(0)|}{\mathcal H_2(0)}
\quad[\mathcal H_2(0)>0].
$$

$\epsilon_L$ 监测总湿跨/载荷尺度，$\epsilon_H$ 直接监测准稳态阻力广义矩的几何因子。若基准完全出水，分母为零，该光滑 ROM 无定义，必须转入湿润事件分支。

| 近似 | 小参数/条件 | 保留误差阶 | 首个典型失效信号 |
|---|---|---|---|
| 小摆角机械展开 | $\epsilon_\theta=\lvert q\rvert\ll1$ | 截到立方后向量场 $O(q^5)$（反射对称） | 频率漂移不能由 $\alpha_3$ 解释；浸没拓扑变化 |
| 横向准稳态阻力线性化 | $\epsilon_v\ll1$ | 相对线性阻力 $O(\epsilon_v^2)$ | 阻尼随振幅系统漂移、三次速度残差 |
| 常湿跨/常载荷面积 | $\epsilon_L=\max\lvert L_w-L_0\rvert/L_0\ll1$ | 合力尺度相对误差 $O(\epsilon_L)$ | 残差同水线高度或端盖切换相关 |
| 常分布力臂矩 | $\epsilon_H\ll1$ | 准稳态广义阻力几何因子相对误差 $O(\epsilon_H)$ | 力矩残差同 $q^2$、水线或湿跨一致变化 |
| 核的瞬时矩展开 | $\epsilon_m=\omega\tau_m\ll1$ 且无近极点 | 截到 $N$ 阶为 $O(\epsilon_m^{N+1})$ | 频率依赖相位、长自相关 |
| 单模态中心流形 | $\lvert\mu\rvert/\omega_s=O(\varepsilon)$，谱隙存在 | 立方式相对 $O(\varepsilon)$ | 双峰、跨向失相干、强二次谐波 |
| 一阶锁频慢流 | 弱阻尼/耦合/失谐均 $O(\varepsilon)$ | 慢时包络 $O(\varepsilon)$ | 舌边幅值突变、强相位滑移非 Adler |
| 固定圆柱系数迁移到有限跨装置 | 需要另证 $D/L_0\ll1$、端/自由面远离且局部相似 | **无自动受控误差** | 系数随浸深、端隙或阻塞超不确定度漂移 |

最后一行尤其重要：有限部分浸水、自由表面和端部效应不是仅靠写一个 $O(D/L_0)$ 就自动受控；必须做跨几何标定或高保真/实验比较。

### 8.5 可计算状态、初值与有效质量门

在光滑 L3 单模态层，最小实状态是

$$
X_{\rm ROM}=(x,v,a_R,a_I),
\qquad v=x',\qquad a=a_R+ia_I.
$$

给定完整参数函数、$U(\tau)$ 以及
$X_{\rm ROM}(0)=(x_0,v_0,a_{R0},a_{I0})$ 后，式 (R3.53)、(R3.55)、(R3.57) 才构成四维初值问题。不能把 $a(0)=0$ 当成隐藏默认：在固定体已超临界时，这个初值正处在不稳定不变集上，且有限观测时间的轨迹依赖初始尾流相位。

若 (R3.57) 保留加速度直通项 $-D_2x''$，则机械方程必须先解

$$
M_{\rm eff}(x,a,\boldsymbol\Pi)x''
=F_{\rm no\,acc}(x,v,a,\boldsymbol\Pi),
\qquad
M_{\rm eff}=\mathcal J(x)+\Lambda D_2
$$

（若 $D_2$ 依赖状态，就使用其当前值），再把得到的 $x''$ 代入 (R3.55) 的 $\widehat\gamma_2x''$。标量模型必须在声明域内有
$\inf|M_{\rm eff}|>0$；保能动能分拆还应要求有效惯量为正。多自由度或两个方程都含交叉加速度时，对应条件是质量矩阵非奇异；否则要么是表示双计数/不适定，要么必须把系统按明示 DAE 处理，不得用顺序更新偷渡。

L2 有理记忆层还需给出 $\boldsymbol z_f(0)$；纯延迟或有限支撑/已经给出截断误差界的卷积层，需要给出 $q(\tau),\ \tau\in[-\tau_{\max},0]$ 的历史。对真正无限尾核，则需要全过去历史、一个足够的流体初始状态，或有误差界的有限维充分统计；不能无声将长尾截零。结构滞后、湿润活动集和事件分支也各自需要初始内部状态。任一初值/历史缺失时，前向模型应拒绝运行或记录一个明示、可重现的初始化实验，而不是在求解中临时补规则。

---

## 9. 线性稳定、数学起振与周期基流

### 9.1 稳定固定体基流（$\widehat\mu<0$）的闭环特征式

先把可独立识别的即时流体刚度、阻尼和附加质量吸收到有效线性机械算子中，记

$$
D_s(\lambda)=\lambda^2+2\zeta_e\lambda+1.
\tag{R3.58}
$$

这是一次明示的线性坐标归一化：必须使用与第 8.1 节相同的载荷分拆，并从后面的 $H_w$ 中删去已吸收的那一部分。若某个即时项仍保留在 $D_j$ 或尾流输出中，则不得再把它改写进 (R3.58)；此时应保留一般线性机械多项式而不是强行令常数项为 1。特征根和总阻抗不随这个表示选择改变。

对 (R3.55)–(R3.57) 的线性部分定义

$$
\Gamma(\lambda)=\widehat\gamma_0+\widehat\gamma_1\lambda
+\widehat\gamma_2\lambda^2,\qquad
L=\Lambda L_a.
\tag{R3.59}
$$

实机械位移要求同时保留 $a$ 与 $\overline a$。消去尾流状态得到闭环流体传递函数

$$
H_w(\lambda)=\frac12\left[
\frac{L\Gamma(\lambda)}{\lambda-\widehat\mu-i\Omega}
+\frac{\overline L\,\overline\Gamma(\lambda)}
{\lambda-\widehat\mu+i\Omega}
\right].
\tag{R3.60}
$$

特征方程为

$$
\mathcal D(\lambda)=D_s(\lambda)-H_w(\lambda)=0.
\tag{R3.61}
$$

乘去分母后得到实四阶多项式

$$
\boxed{
\begin{aligned}
P(\lambda)={}&D_s(\lambda)
[(\lambda-\widehat\mu)^2+\Omega^2]\\
&-\frac12\big\{
L\Gamma(\lambda)(\lambda-\widehat\mu+i\Omega)\\
&\hspace{27mm}+\overline L\,\overline\Gamma(\lambda)
(\lambda-\widehat\mu-i\Omega)\big\}=0.
\end{aligned}}
\tag{R3.62}
$$

若写 $L\Gamma(\lambda)=\sum_{j=0}^2(a_j+ib_j)\lambda^j$，其中横线只共轭系数而不共轭形式变量 $\lambda$，耦合项明确为

$$
\sum_{j=0}^2[a_j(\lambda-\widehat\mu)-b_j\Omega]\lambda^j,
\tag{R3.63}
$$

说明复耦合的相位和幅值共同决定稳定性；只比较一个实“耦合常数”不够。

写 $P(\lambda)=\lambda^4+c_1\lambda^3+c_2\lambda^2+c_3\lambda+c_4$，系数为

$$
\begin{aligned}
c_1={}&2(\zeta_e-\widehat\mu)-a_2,\\
c_2={}&1+\widehat\mu^2+\Omega^2-4\zeta_e\widehat\mu
-a_1+\widehat\mu a_2+\Omega b_2,\\
c_3={}&2\zeta_e(\widehat\mu^2+\Omega^2)-2\widehat\mu
-a_0+\widehat\mu a_1+\Omega b_1,\\
c_4={}&\widehat\mu^2+\Omega^2+\widehat\mu a_0+\Omega b_0.
\end{aligned}
\tag{R3.63a}
$$

稳态基流线性渐近稳定的四阶 Routh–Hurwitz 条件为

$$
\begin{gathered}
c_1,c_2,c_3,c_4>0,\qquad
\Delta_2=c_1c_2-c_3>0,\\
\Delta_3=c_1c_2c_3-c_3^2-c_1^2c_4>0.
\end{gathered}
\tag{R3.63b}
$$

非退化 Hopf 边界还可等价写成

$$
\Delta_3=0,\qquad \omega_H^2=c_3/c_1>0,
\tag{R3.63c}
$$

同时保持其余 Hurwitz 侧条件并检查横截性。给定已标定系数后应把 Routh–Hurwitz 与直接特征根互相核对；在系数仍为未知函数时不存在一个可诚实报告的“通用起振速度”。

### 9.2 Hopf 条件的频响与功率写法

令 $\lambda=i\omega$，并把 $H_w(i\omega)=H_R+iH_I$。非退化闭环 Hopf 候选满足

$$
1-\omega^2-H_R(\omega,U)=0,
\qquad
2\zeta_e\omega-H_I(\omega,U)=0,
\tag{R3.64}
$$

再加上

$$
\partial_\lambda P(i\omega,U)\ne0,
\qquad
\Re\left[-\frac{\partial_UP}{\partial_\lambda P}\right]_{i\omega,U_c}\ne0.
\tag{R3.65}
$$

第一式是动态刚度/频率平衡；第二式是平均功率平衡。确实，对 $x=\Re\{Xe^{i\omega\tau}\}$，流体线性平均功率为

$$
\overline{p}_w=\frac12\omega H_I|X|^2,
\tag{R3.66}
$$

结构线性耗散为 $\zeta_e\omega^2|X|^2$，两者相等正是 (R3.64) 第二式。$H_I>0$ 表示该频率上流体向结构净注能；这不是说完整流体是“负阻尼常数”，而是阻抗的同速度相位在该频率上为主动。

还必须检查 $P(0)=0$ 的静态发散和实正根；不是所有失稳都是 Hopf。

### 9.3 固定体已经超临界（$\widehat\mu>0$）时不能线性化零尾流

此时 $a=0$ 对固定体本身不稳定。领先阶固定体极限环为

$$
r_0=\sqrt{\widehat\mu/\widehat\beta_r},
\qquad
\Omega_{\rm lc}=\Omega-\widehat\beta_i r_0^2.
\tag{R3.67}
$$

即使结构对尾流完全无反馈，一级周期载荷也给线性结构一个非零受迫响应。若把式 (R3.53) 右端的无量纲广义载荷基波幅记为

$$
F_1=\Lambda|L_a|r_0,
\tag{R3.68}
$$

则位移峰值和载荷相对位移相位领先为

$$
X_0=\frac{F_1}
{\sqrt{(1-\Omega_{\rm lc}^2)^2+(2\zeta_e\Omega_{\rm lc})^2}},
\tag{R3.69}
$$

$$
\delta_{Fx}=\operatorname{atan2}
(2\zeta_e\Omega_{\rm lc},1-\Omega_{\rm lc}^2).
\tag{R3.70}
$$

因此“结构开始有可见振幅”可能只是 (R3.69) 穿过检测下限，既不是固定体 Hopf，也不是耦合零解 Hopf。

当结构反馈不可忽略时，正确参考解是“固定体尾流极限环 + 结构周期响应”的周期轨道。其稳定性应由 Floquet 乘子或下节的慢流固定点判断；把 (R3.62) 用在 $\widehat\mu>0$ 的零尾流上会得到一个已知不稳定但物理无关的基点。

---

## 10. 1:1 锁频慢流、幅相方程与饱和

### 10.1 共同相位等变的最小慢流

在 (R3.41)–(R3.42) 成立时，引入慢时间 $T=\varepsilon\tau$，结构和尾流的复包络分别为 $B(T)$、$A(T)$。忽略因弱体动而再高一阶的交叉立方项后，最小 1:1 共振慢流是

$$
\boxed{
\begin{aligned}
\frac{\mathrm dB}{\mathrm dT}
={}&(-\zeta_1+i\Delta_s)B
-(\eta_s+i\nu_s)|B|^2B
+\kappa_s e^{i\alpha_s}A,\\
\frac{\mathrm dA}{\mathrm dT}
={}&(\mu_1+i\Delta_w)A
-(\beta_r+i\beta_i)|A|^2A
+\kappa_w e^{i\alpha_w}B.
\end{aligned}}
\tag{R3.71}
$$

其中 $\eta_s\ge0$ 是结构非线性耗散，$\nu_s$ 是 Duffing/几何频移，$\alpha_s,\alpha_w$ 保存两向耦合的相位。这里 $\zeta_1,\mu_1,\beta_{r,i},\kappa_{s,w}$ 均指除以共同 $\varepsilon$ 后的慢时系数；为保持物理含义沿用字母，但其数值不能未经换算直接等同于 (R3.55) 的快时系数。式 (R3.71) 对共同相位变换
按约定取 $\kappa_s,\kappa_w\ge0$，所有耦合符号和时延相位都收入 $\alpha_s,\alpha_w$；因此后文的余弦/正弦符号不再暗含一个可正可负的 $\kappa$。式 (R3.71) 对共同相位变换

$$
(A,B)\mapsto(Ae^{i\chi},Be^{i\chi})
\tag{R3.72}
$$

等变。

一般 1:1 三次正规形还允许 $B|A|^2,A|B|^2,\overline BA^2,\overline AB^2$ 等共同相位等变项。只有“体动耦合本身再带一个 $O(\varepsilon)$”时，它们才比 (R3.71) 高一阶；若大振幅数据出现交叉饱和或内共振残差，必须恢复这些项。

### 10.2 三个实慢变量

写

$$
B=b e^{i\phi_s},\qquad A=r e^{i\phi_w},
\qquad\psi=\phi_w-\phi_s,
\tag{R3.73}
$$

得到

$$
\boxed{
\begin{aligned}
b_T={}&-\zeta_1b-\eta_sb^3
+\kappa_sr\cos(\psi+\alpha_s),\\
r_T={}&\mu_1r-\beta_rr^3
+\kappa_wb\cos(\alpha_w-\psi),\\
\psi_T={}&\Delta_w-\Delta_s+\nu_sb^2-\beta_ir^2\\
&+\kappa_w\frac br\sin(\alpha_w-\psi)
-\kappa_s\frac rb\sin(\psi+\alpha_s).
\end{aligned}}
\tag{R3.74}
$$

这里 $b,r>0$。在 $b=0$ 或 $r=0$ 附近相位坐标奇异，应回到 (R3.71) 的笛卡尔复坐标积分，不能把数值相位跳变误判成物理相位滑移。

锁频周期解对应 (R3.74) 的固定点：

$$
\begin{aligned}
\zeta_1b+\eta_sb^3
&=\kappa_sr\cos(\psi+\alpha_s),\\
\beta_rr^3-\mu_1r
&=\kappa_wb\cos(\alpha_w-\psi),\\
0&=\psi_T.
\end{aligned}
\tag{R3.75}
$$

式 (R3.75) 是饱和幅 $b,r$ 和相位 $\psi$ 的可计算隐式方程。存在正根还不够；必须检查 (R3.74) 三维 Jacobian 的全部特征值实部为负。多根给出多稳定周期轨道和上/下扫滞回的可能。

### 10.3 弱反馈极限的显式饱和修正

若尾流主导且 $\kappa_w$ 很小，固定体值

$$
r_0=\sqrt{\mu_1/\beta_r}
\tag{R3.76}
$$

的首阶反馈修正为

$$
r=r_0+
\frac{\kappa_wb\cos(\alpha_w-\psi)}{2\mu_1}
+O(\kappa_w^2).
\tag{R3.77}
$$

这清楚地区分“固定体非线性饱和”与“结构反馈改变尾流幅值”。当 $\mu_1\to0^+$ 时 (R3.77) 发散，表示该正则展开失效，必须联立求解 (R3.75)，而不是说真实振幅发散。

结构反馈可忽略时，机械幅相退化为 (R3.69)–(R3.70)；在共振且线性耗散主导时 $X_0\sim F_1/(2\zeta_e\Omega)$，展示质量—阻尼组合对峰值的控制。

### 10.4 Adler 锁频判据

若 $b,r$ 比相位更快地松弛，可在相位方程中把它们冻结。定义

$$
\Delta_{\rm eff}=\Delta_w-\Delta_s+\nu_sb^2-\beta_ir^2,
\tag{R3.78}
$$

$$
A_c=\kappa_w\frac br,\qquad
B_c=\kappa_s\frac rb,
\tag{R3.79}
$$

以及

$$
\begin{aligned}
C_c&=A_c\sin\alpha_w-B_c\sin\alpha_s,\\
S_c&=A_c\cos\alpha_w+B_c\cos\alpha_s,\\
K_{\rm eff}&=\sqrt{C_c^2+S_c^2},\\
\psi_0&=\operatorname{atan2}(C_c,S_c).
\end{aligned}
\tag{R3.80}
$$

则

$$
\psi_T=\Delta_{\rm eff}+K_{\rm eff}\sin(\psi_0-\psi).
\tag{R3.81}
$$

Adler 层的锁频存在条件为

$$
\boxed{|\Delta_{\rm eff}|\le K_{\rm eff}.}
\tag{R3.82}
$$

稳定相位分支可写成

$$
\psi^*=\psi_0+arcsin
\left(\frac{\Delta_{\rm eff}}{K_{\rm eff}}\right),
\quad
\cos(\psi_0-\psi^*)>0.
\tag{R3.83}
$$

在纯 Adler 模型的舌外，平均慢相位滑移率为

$$
|\langle\psi_T\rangle|=
\sqrt{\Delta_{\rm eff}^2-K_{\rm eff}^2}.
\tag{R3.84}
$$

式 (R3.82) 预言弱耦合锁频舌宽领先阶随耦合线性增长，式 (R3.83) 预言舌内相位连续旋转。若舌边幅值剧变、出现多频共存或上/下扫边界不同，幅值不能再绝热消去，应使用完整 (R3.74)、周期延拓和 Floquet 分析。

---

## 11. 相位与能量传递

### 11.1 周期平均功率的直接可测式

设维度量

$$
q(t)=\Theta\cos(\omega t+\phi_q),
\qquad
Q_w(t)=Q_1\cos(\omega t+\phi_Q).
\tag{R3.85}
$$

则流体向机械自由度的周期平均功率为

$$
\boxed{
\overline P_f=\frac12\omega\Theta Q_1
\sin(\phi_Q-\phi_q).
}
\tag{R3.86}
$$

结论不依赖尾流幅值规范：

- 与位移同相的载荷只改动态刚度，平均不做功；
- 与速度同相且方向相同的分量注入能量；
- 与速度反相的分量耗散能量。

线性结构阻尼 $c_s\dot q$ 的平均耗散为

$$
\overline P_s=\frac12c_s\omega^2\Theta^2.
\tag{R3.87}
$$

稳定单周期上，若无其他能量通道，

$$
Q_1\sin(\phi_Q-\phi_q)=c_s\omega\Theta.
\tag{R3.88}
$$

有非线性摩擦、支承损耗或流向运动时，应在右端加入各自实际周期平均损耗/交换功率。式 (R3.88) 是相位与饱和幅的独立交叉检验，而不是另一个拟合方程。

### 11.2 分布载荷的能量拆分

由 (R3.9)，周期平均流体功率可以逐条带分解：

$$
\overline P_f=
\int_{\mathcal L_w}\overline{
\mathrm d\boldsymbol F_L\cdot\boldsymbol u_b}
+\int_{\mathcal L_w}\overline{
\mathrm d\boldsymbol F_D\cdot\boldsymbol u_b}
+\overline P_{\gamma}
+\overline P_{\rm mem}
+\overline P_{\rm other}\,.
\tag{R3.89}
$$

式 (R3.89) 只能在先定义一个**互不重叠**的载荷投影后使用。例如，若动态 $C_L$ 已由同一记忆状态产生，则不能又把该状态的全部输出计入 $P_{\rm mem}$。分项方式具有表示规范自由度，而总和 $\overline{Q_w\dot q}$ 才是规范不变的物理端口。

在 R2 的钉扎锐界面约定下，
$$
\overline P_\gamma=
-\overline{\oint_{\mathcal C_b}
\gamma\boldsymbol m\cdot\boldsymbol u_b\,\mathrm d\ell}.
\tag{R3.89a}
$$
它与自由表面能的接触线边缘项交换能量，不能归入黏性耗散。$P_{\rm other}$ 保存端盖、三维压力和未纳入条带升阻分解的湿面牵引功。

对 R2-C1 滑移/动态接触角分支，湿面滑移的流–固余功率是 $-\mathcal D_{\rm slip}$，而接触线余功率与固–液/固–气表面能的时间导数合并为 $-\mathcal D_{\rm cl}$。因此，显式保留这些状态的 ROM 必须检查

$$
\frac{\mathrm d}{\mathrm dt}
(E_m+E_\gamma+E_{sg/sl}+E_{\rm retained\ fluid})
=P_{\rm ports}-R_s\dot q
-\mathcal D_{\rm slip}-\mathcal D_{\rm cl}
-\mathcal D_{\rm retained\ fluid},
$$

其中每个保留流体状态的能量内积和耗散必须单独定义。若做不到，就只检查机械端口式 (R3.21)，不得把一个未定义的 $|A|^2$ 当成缺失的流体能量。

在 (R3.13) 的准稳态条件下，横向阻力项领先阶为

$$
\overline P_D=-\frac12\rho DU
\int_{\mathcal L_w}C_Dh(s)^2\,\mathrm ds
\;\overline{\dot q^2}\le0.
\tag{R3.90}
$$

因此持续振幅必须由相干尾流升力或其他主动流体分量补偿 (R3.90) 与结构损耗。若模型给出稳定周期但数值上

$\overline{Q_w\dot q-R_s\dot q}\ne0$，则不是“新物理”，而是周期未收敛、载荷投影/能量记账或积分器有错。

### 11.3 不能把 $|A|^2$ 直接叫尾流能量

在 (R3.39) 下 $|A|^2\mapsto s^2|A|^2$，所以它的数值由任意模态尺度改变。除非 $A$ 由场能量内积规范化并给出重构算子，否则只可称为“尾流模态幅值平方”。可跨模型比较的是物理载荷、功率、频率、相位及规范不变量，不是未注明规范的“尾流能量”。

---

## 12. “阈值”词必须绑定数学对象与观测协议

### 12.1 工作日志要求区分的三种阈值

| 阈值 | 严格定义 | 计算/测量方法 | 它不等于什么 |
|---|---|---|---|
| **T1 固定体尾流 Hopf** | 在固定实际几何上 $\mu(\boldsymbol p_H)=0$，一对流体特征值穿过虚轴 | 固定摆、扰动增长/衰减或全局稳定分析；检查超/亚临界 | 不等于摆开始可见，也不等于锁频入口 |
| **T2 锁频入口** | 稳定有界相位差解首次存在；Adler 层为 (R3.82)，一般层为锁频周期轨道的鞍结/稳定性边界 | 连续相位、频率比、相干与上/下扫；完整模型用延拓/Floquet | 不等于零解线性失稳；可在已有受迫摆动上发生 |
| **T3 实验可见阈值** | 预注册观测量的振幅/谱线/相干下置信界首次越过检测准则 | 固定相机、记录长度、预处理、噪声模型与显著性 | 不是材料常数；依检测下限、等待时间、流速斜坡而变 |

三者的顺序没有普适保证。超临界固定体尾流可先产生微弱受迫摆动，摆动越过 T3 后才进入 T2；强结构反馈也可能在固定体仍亚临界时产生耦合振荡。必须报告扫描方向与初始条件。

### 12.2 补充但不可遗漏：耦合稳态基流的数学失稳

当 $\widehat\mu<0$、稳态基流存在时，可另定义

$$
T_{\rm FSI}:\quad
\max_j\Re\lambda_j(P)=0,
\tag{R3.91}
$$

并由 (R3.64)–(R3.65) 判别 Hopf。它是线性自治系统的“数学起振”。当 $\widehat\mu>0$ 时，零尾流已不是基解，$T_{\rm FSI}$ 的该定义不适用，必须对周期轨道做 Floquet 分析。

因此论文中若使用“起振速度”，必须在符号旁写明是 $U_H,U_{\rm FSI},U_{\rm lock}$ 还是 $U_{\rm vis}$，不能只写 $U_c$。

### 12.3 可见阈值为何依实验时间

若某稳态基流有小正增长率 $\sigma(U)$，从有效噪声/初始幅 $X_0$ 增长到检测限 $X_{\min}$ 至少需要

$$
\sigma(U)T_{\rm obs}\gtrsim
\ln\left(\frac{X_{\min}}{X_0}\right).
\tag{R3.92}
$$

改变等待时间、流速斜坡或环境扰动就会移动 $U_{\rm vis}$。若固定体已经有周期升力，则应把受迫幅 (R3.69) 的不确定度下界与 $X_{\min}$ 比较，而不是套用指数增长式。

锁频的观测定义也应预注册，例如在连续 $N$ 个周期内：解缠相位差无净漂移、主频比的置信区间包含 1、相干超过噪声基线。具体 $N$、频带和显著性由 R4 在看盲测前冻结。

---

## 13. 系数的物理定义、可辨识组合与顺序标定

### 13.1 参数不是一张可由同一条自由响应同时拟合的清单

| 参数/函数 | 物理定义 | 单靠 $q(t)$ 可辨识什么 | 需要的额外激励/观测 |
|---|---|---|---|
| $J_e,K_e,c_s$ | 湿态线性惯量、回复梯度、结构耗散 | 主要是 $\omega_n^2=K_e/J_e$、$2\zeta\omega_n=c_s/J_e$ | 独立惯量/质量几何、静态力矩、无流/静水自由衰减 |
| $J_a(q)$ | 附加流体动能或高频阻抗定义的配置惯量 | 与 $J_s$ 强相关 | 空气/静水对比、宽带规定运动或场能量投影 |
| $c_D^{(q)}$ | (R3.14) 的分布准稳态阻尼组合 | 只能见 $c_D^{(q)}/J_e$ | 同步角速度与力矩；多 $U$、多幅值强迫 |
| $L_w(\theta),h(r,\theta)$ | 湿几何和局部虚位移力臂 | 视频可给角度，不能自动给水下圆弓几何 | 标尺/相机标定、水线与圆柱三维几何、排水量测量 |
| $K_m(t)$ 或 $(A_f,B_f,C_f,D_f)$ | 线性因果流体脉冲响应 | 自由数据中与结构极点混叠 | 固定/规定运动的脉冲、多正弦或扫频复力矩 |
| $\mu,\omega_s$ | 固定体临界尾流模态增长率与频率 | 自由摆中受反馈污染 | 固定体尾流/力瞬态，多 Re 和多几何 |
| $\beta_r,\beta_i$ | 固定体模态饱和与非线性频移 | 依赖 $A$ 规范 | 固定体从增长到饱和的幅相瞬态；先固定规范 |
| $\ell$ | 尾流模态到广义力矩的输出投影 | 只同 $A$ 标度乘积出现 | 同步尾流模态与力矩；或令 $A$ 直接等于一级力矩系数 |
| $\gamma_{0,1,2}$ | 规定体动到临界尾流模态的复响应 | 自由响应只给 $\ell\gamma_j/J_e$ 类环路组合 | 独立规定运动、跨频率复升力/尾流测量 |
| $\alpha_3,\eta_s,\nu_s$ | 机械立方回复、非线性耗散与慢流频移 | 与尾流 $\beta_i$ 混淆 | 无流多幅自由衰减/规定力矩先验标定 |

若只观测单目二维视频角度，不观测同步力矩、流场或规定运动，则一套四状态 ROM 即使轨迹拟合很好，也通常只能识别若干频率、阻尼比、总环路增益和相对相位；不能把所有物理系数逐个报告为唯一值。

### 13.2 推荐的非循环标定顺序

1. **几何与机械空载层**：称量/几何测 $J_s,V$，无流空气中辨识轴承/支承损耗及机械非线性。
2. **静水层**：无来流时测浮力平衡、静水湿几何与湿态自由衰减，得到 $J_e,K_e,c_s$ 的可辨识组合；不把自由表面辐射记忆硬塞入常数阻尼。
3. **固定体流体层**：锁住摆，跨 $\mathrm{Re},L_w/D,D/W,D/H$ 测力与尾流；识别 $Z_f$ 或 $\mu,\omega_s,\beta_i/\beta_r$ 及固定体物理载荷幅。
4. **规定运动层**：用小幅多频位移/速度/加速度输入识别复环路 $\ell\gamma_j$ 和残余阻抗，检验只留某一种耦合是否足够。
5. **自由耦合校准层**：只校准前四步仍未识别的少量组合和随机效应；完整释放/完整工况分组。
6. **冻结后验证与真正盲测**：先做模型结构验证，再只打开从未用于模型选择的完整几何/工况。

步骤 3–4 若实验设备做不到，可以由经过独立验证的三维自由表面 FSI 提供候选先验，但必须把“数值先验”与“实验标定”分栏，并传播模型差异。

### 13.3 系数应是有约束的参数函数

系数一般写成

$$
\vartheta=\vartheta(\mathrm{Re},L_w/D,D/W,D/H,
\mathrm{Fr},\mathrm{We},I_u,\ldots),
\tag{R3.93}
$$

而不是跨全部工况固定。可用低阶样条、高斯过程或分层回归表示，但必须：

- 在校准域外给出外推警告而不是无界延伸；
- 对 $J_e>0$、$c_s\ge0$ 以及在已确认超临界分支上才成立的 $\beta_r>0$ 等约束显式施加；
- 联合传播系数协方差，因为 $\mu,\beta_r,\ell,\gamma$ 高度相关；
- 报告不变量和预测区间，不用更多小数位掩盖结构不可辨识。

---

## 14. 模型层级、升级规则与结构化残差触发器

### 14.1 不是“一步从 Navier–Stokes 跳到四状态”

| 层级 | 状态与闭合 | 可回答的问题 | 明确不能回答 |
|---|---|---|---|
| **L0 功率接口** | 精确机械式 (R3.19) + R2 湿面牵引与毛细线力共同投影的 $Q_f(t)$ | 几何、广义力、能量记账是否正确 | 未测工况的流体预测 |
| **L1 准稳态/外给尾流** | 分布相对速度阻力 + 固定体实测周期升力 | 小反馈受迫幅相、阻尼尺度 | 锁频反馈、长记忆、尾流重构 |
| **L2 线性记忆** | (R3.25) 或多状态 (R3.31) | 亚临界小扰动、频率相关附加质量/阻尼 | 超临界饱和和大振幅锁频 |
| **L3 单复模态 SL** | (R3.37)–(R3.38) + 精确/非线性机械骨架 | 近简单 Hopf 的饱和、反馈、1:1 锁频 | 多尾流模态、强跨向失相干、湿拓扑切换 |
| **L4 多模态/分布 ROM** | 多极点、跨向复幅值、自由表面模态、2DOF/混杂机械 | 双峰、行波/驻波、流向耦合、事件分支 | 未经验证的任意三维湍流外推 |
| **L5 三维自由表面 FSI** | R2 连续场的经验证离散实现 | ROM 训练、机制审计、超出 ROM 域的候选预测 | 未做网格/时间/域收敛时不能称 DNS 真值 |

选择规则是：使用能通过当前证据门的最低层；只有出现可重复、可归因的结构化残差才升级。L5 也不是免验证的“真值标签”。

### 14.2 动力学残差与功率残差

给定同步观测，定义物理量纲广义力残差

$$
r_Q(t)=J(q)\ddot q+\frac12J'(q)\dot q^2+V'(q)
+R_s-Q_{w,\rm model},
\tag{R3.94}
$$

和累计能量残差

$$
r_E(t)=E_m(t)-E_m(0)
-\int_0^t[Q_{w,\rm model}\dot q-R_s\dot q]\,\mathrm ds.
\tag{R3.95}
$$

加速度微分会放大视频噪声；实际比较应在状态空间观测模型中联合估计，或把 (R3.94) 乘平滑测试函数后分部积分，不能先粗暴二次差分再把高频噪声判成流体记忆。

标准化创新

$$
e_k=S_k^{-1/2}(y_k-\widehat y_{k|k-1})
\tag{R3.96}
$$

应在完整运行、完整几何留出集上近似零均值、白化，并同预注册物理特征无条件相关。$S_k$ 必须含观测噪声、初值和参数不确定度，而不仅是拟合残差方差。

### 14.3 残差形状到升级动作的一一映射

| 可重复残差结构 | 首选物理诊断 | 允许的下一步 | 禁止的“修补” |
|---|---|---|---|
| $r_Q$ 同 $\dot q$ 且随 $U$ 线性、随幅值出现三次趋势 | 相对速度阻力展开不足 | 从 (R3.14) 升到完整 (R3.11)，标定 $C_D(\mathrm{Re},\epsilon_v)$ | 任意常数阻尼吸收全部工况 |
| $r_Q$ 同 $\ddot q$ 或频率实部系统相关 | 附加质量/高频阻抗遗漏 | 识别 $J_a(q)$ 或 L2 阻抗；执行双计数检查 | 同时在左端和尾流力中加惯性 |
| 长自相关、频率依赖相位、脉冲后振铃 | 流体记忆/近极点遗漏 | L1→L2，增加最少可辨识极点 | 用更高阶局部多项式假装记忆 |
| 脱落频附近窄峰且幅值饱和 | 单临界尾流模态 | L2→L3；先验证 (R3.36) 标度 | 无证据直接固定 VdP 参数 |
| 振幅依赖频移 | $\beta_i$、机械 $\nu_s$ 或两者混叠 | 先用无流/固定体数据拆分，再加入相应项 | 在自由耦合单数据集同时任意拟合两者 |
| 舌内相位稳定、舌外有规则滑移但边界偏差 | 耦合相位/幅值 slaving 不足 | 从 Adler 升回 (R3.74)，再做周期延拓 | 只改“锁频指数”阈值 |
| 上扫/下扫不同、周期轨道跳变 | 亚临界尾流、非线性机械或周期轨道折叠 | 加五次/交叉项并做分支稳定性 | 把两方向平均成单曲线 |
| 均值偏置、二次谐波、$+q/-q$ 不对称 | 反射对称破缺、流向 DOF 或观测偏置 | 查装置/相机；必要时加入破缺参数、2DOF | 无来源地加所有偶次项 |
| 双峰、拍振、跨向相干长度缩短 | 多尾流/自由表面/跨向模态 | L3→L4 分布或多模态 ROM | 用单个时变 $\mathrm{St}$ 吞并全部 |
| 残差同水线、端隙、$q^2$ 或浸没事件同步 | 湿几何和端/自由面效应 | 恢复 $A_w(r,\theta)$、配置系数或切换到混杂分支 | 延长固定圆柱系数外推范围 |
| 残差随接触角达到前进/后退界后跳变并有路径滞后 | 接触线从钉扎切到滑移/滞后 | 接入 R2-C1a/C1b（必要时 C2）润湿层及毛细自由能/耗散 | 把跳变拟成光滑尾流五次项 |
| 残差同 $\dot U$、流速历史或湍流团相关 | 非定常来流/随机强迫 | 时变参数、输入滤波或随机状态；保留因果性 | 把每次释放单独拟一组确定性参数 |
| $r_E$ 有单向漂移而轨迹看似吻合 | 力臂、符号、附加质量双计数或数值耗散 | 回到 L0 功率接口审计 | 继续调尾流饱和参数 |

### 14.4 触发与停止规则必须预注册

一次残差图“看起来有结构”不足以升级。建议在看真正盲测前冻结：

1. 自相关/交叉相关的显著性与多重比较控制；
2. 谱峰/相干的噪声基线、最小持续周期数和效应下限；
3. 在至少两个完整重复或两个相邻但未参与拟合的工况上复现；
4. 新层在分组验证集上的对数预测密度或预注册误差至少改善 $\Delta_{\min}$，且参数后验不是沿规范方向无界；
5. 新层通过维度、对称性、极限、因果性和功率闭合检查；
6. 模型选择后再锁定一次，最终只打开真正盲测集。

若创新与物理特征不相关、覆盖率校准、功率闭合在不确定度内且更高层参数不可辨识，则**停止升级**。复杂模型不是论文级的同义词；可证伪且适用域清楚的低层模型优于无法识别的高层拟合。

---

## 15. 适用域守卫与层级降级/升级算法

每次运行先计算

$$
\boldsymbol\epsilon=
(\epsilon_\theta,\epsilon_v,\epsilon_L,\epsilon_H,\epsilon_m,
|\widehat\mu|,|\Omega-1|,\epsilon_U,
A_{2f}/A_f,\ldots).
\tag{R3.97}
$$

建议的可执行判定是：

1. **几何守卫**：若湿表面拓扑、绳/支承活动集或碰撞状态变化，退出光滑 ROM，进入相应混杂/场模型；不允许只发 warning 后继续同一方程。
2. **线性守卫**：若扰动小但 $\epsilon_m\not\ll1$，使用 L2 记忆而非常数 $m,c$。
3. **Hopf 守卫**：只有 $|\widehat\mu|$、幅值和谱隙指标在标定域内才启用 L3；$\beta_r\le0$ 时要求五次项/分支证据。
4. **慢流守卫**：只有弱失谐、弱耦合、窄带且幅值松弛快于相位时使用 Adler；否则积分完整 L3 或 (R3.74)。
5. **三维守卫**：跨向相干、端部和自由表面指标超出校准域时升到 L4/L5，或返回“模型域外”，不得悄悄复用二维系数。
6. **辨识守卫**：若 Fisher/后验显示新增参数只沿规范自由度变化，退回较低层并报告可辨识组合。

所有 `within-domain` 结论都应随结果保存当次 $\boldsymbol\epsilon$、参数域包络、模型版本和触发器状态。

---

## 16. 可证伪的领先阶预测

这些预测用于决定模型层是否值得保留，不是已验证结果。

1. **准稳态横向阻尼尺度**：在 $\epsilon_v\ll1$ 且几何固定时，$c_D^{(q)}\propto\rho DUL_w\langle h^2\rangle C_D$。若随 $U$ 或力臂平方不缩放，常数准稳态层不充分。
2. **固定体近 Hopf 标度**：超临界时物理一级升力幅平方对离阈参数领先阶线性，频率偏移也领先阶线性；亚临界/远离阈值将破坏该关系。
3. **因果频响**：规定运动得到的幅值和相位应由同一 $Z_f(\omega)$ 同时解释；只拟幅值、不能预测相位的常数阻尼模型应被拒绝。
4. **弱反馈受迫响应**：固定体载荷输入 L1 后，摆幅与相位应服从 (R3.69)–(R3.70)，周期平均功率服从 (R3.86)–(R3.88)。
5. **锁频舌**：弱耦合时舌宽领先阶随 $K_{\rm eff}$ 线性，舌内相位依 (R3.83) 连续变化，舌外出现相位滑移；若只有频率相近而相位无界，不能称锁频。
6. **对称性**：反射对称装置的横流载荷/回复为奇、湿长和惯量为偶；稳定二次谐波或均值偏置应触发对称破缺诊断。
7. **饱和能量**：稳定周期上总流体输入功率等于结构及准稳态阻力损耗；不闭合的“正确振幅”不能接受。
8. **跨几何迁移**：把结果按 $(\mathrm{Re},U_{r,e}\ \text{或明示的 }U_{r,w/a},m_{\rm ROM}^*,I_P^*,\zeta,L_w/D,D/W,D/H,\mathrm{Fr},\mathrm{We})$ 对齐后才检验塌缩；若仍随端隙/自由表面距离系统漂移，应把它们加入参数函数，而不是宣布“普适 St”。

---

## 17. F2 冻结前的最小核查表

- [ ] R1 canonical 的 $\boldsymbol r(\boldsymbol X,q)$、有限半径湿表面和观测坐标已冻结；变体没有混入 canonical 公式。
- [ ] R2 的牵引符号、广义力矩和能量恒等式与 (R3.1)、(R3.9)、(R3.21) 一致。
- [ ] 附加质量只出现一次，配置依赖时保留 $\tfrac12J_a'\dot q^2$。
- [ ] 固定体数据确认实际几何是否存在简单 Hopf、超/亚临界和单模态谱隙。
- [ ] 尾流幅值规范、参数函数的校准域和可辨识组合已写入数据契约。
- [ ] 常数阻尼、核、SL、二阶尾流振子分别通过其适用域守卫；未把便利的特例冒充推导唯一结果。
- [ ] 最小状态、全部初值/历史和参数函数已闭合；有效质量/质量矩阵在声明域内非奇异。
- [ ] 若使用 C1 滑移/动态接触角层，表面能、$\mathcal D_{\rm slip}$ 和 $\mathcal D_{\rm cl}$ 已进入能量账本且没有同 $Q_w$ 双计数。
- [ ] $U_H,U_{\rm FSI},U_{\rm lock},U_{\rm vis}$ 分别定义并报告扫描协议。
- [ ] 慢流固定点除存在性外完成稳定性检查；域外使用周期延拓/Floquet 或返回域外。
- [ ] 每个完整验证运行都保存动力学残差、功率残差、相位滑移、谱/相干和触发器。
- [ ] 模型升级使用分组验证，最终真正盲测没有参与结构选择。

### 17.1 已执行的可复跑代数核验及其严格边界

2026-08-20 在项目根目录实际执行：

```bash
python3 research_notebooks/check_rom_linearization.py
```

进程退出码为 0，输出为：

```text
PASS: complex-mode characteristic, quartic Hopf condition, acceleration-coupled special case, crossing direction, wake energy
```

| 脚本核验项 | 本文对应对象 | 它实际证明什么 |
|---|---|---|
| 一般复尾流模态消元 | (R3.62)–(R3.63a) | 实四次特征式与逐项系数的符号/因子恒等 |
| 四次 Hopf 恒等式 | (R3.63b,c) | $\Delta_3=0$ 与 $\omega_H^2=c_3/c_1$ 的代数相容性 |
| 纯加速度耦合特例 | (R3.45)–(R3.48) 的线性子类 | 四状态 Jacobian、乘积特征式和系数一致 |
| Hopf 横截方向 | (R3.65) 的特例 | 指定耦合参数的隐式特征根导数符号 |
| 尾流振子平均功 | (R3.47)–(R3.48) 的子类 | 线性负阻尼与三次耗散的周期平均符号/系数 |

这个 `PASS` 只是符号代数自洽性证据。它**不**验证：实际湿面场确实可约化为单复模态；$\mu,\beta,\ell,\gamma_j$ 的数值或可辨识性；慢流在本装置幅值下的误差；任何锁频边界或实验预测。这些仍分别需要模态/频响数据、数值收敛、完整运行分组验证和冻结后盲测。

---

## 18. 一级来源与本文自行推导的边界

1. W. E. Cummins, *The Impulse Response Function and Ship Motions*, David Taylor Model Basin Report 1661 (1962), [MIT DSpace 原报告](https://dome.mit.edu/handle/1721.3/49049)。该来源支持线性因果流体载荷可写成速度历史卷积及频率无关瞬时项；本文把这一响应结构用作一般 ROM 接口，不声称船舶势流核可直接移植到分离尾流。
2. J. T. Stuart, “On the non-linear mechanics of wave disturbances in stable and unstable parallel flows. Part 1,” *Journal of Fluid Mechanics* **9** (1960), 353–370, [doi:10.1017/S002211206000116X](https://doi.org/10.1017/S002211206000116X)。该来源支持近临界弱非线性幅值展开的机制；式 (R3.33) 对本装置的采用仍要求 6.1 节条件。
3. M. Provansal, C. Mathis & L. Boyer, “Bénard–von Kármán instability: transient and forced regimes,” *Journal of Fluid Mechanics* **182** (1987), 1–22, [doi:10.1017/S0022112087002222](https://doi.org/10.1017/S0022112087002222)。该固定圆柱实验支持近尾流阈值的 SL 描述、受迫与同步机制；不提供本装置的阈值或系数。
4. M. L. Facchinetti, E. de Langre & F. Biolley, “Coupling of structure and wake oscillators in vortex-induced vibrations,” *Journal of Fluids and Structures* **19** (2004), 123–140, [doi:10.1016/j.jfluidstructs.2003.12.004](https://doi.org/10.1016/j.jfluidstructs.2003.12.004)。该来源比较了经验尾流振子及不同线性耦合；本文把 Van der Pol 明确放在 SL 的受限二阶代表层，而非第一性原理层。

式 (R3.1)–(R3.22) 的虚功、相对速度、附加动能和功率推导，式 (R3.39)–(R3.40) 的规范变换，式 (R3.58)–(R3.66) 的闭环特征式/功率条件，以及式 (R3.71)–(R3.90) 的慢流、Adler 合并和能量关系均为本文在所列假设下的自行推导；它们需要 R2 符号对接、代数复核和数据验证后方可进入 F2。
