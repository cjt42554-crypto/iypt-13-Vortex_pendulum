# R2：三维有限水槽—贯穿自由面圆柱摆的连续体自由表面流固耦合母模型

> 状态：F1（场方程冻结）候选备忘录。
> 范围：从质量、动量、角动量和表面能守恒出发，建立三维有限水槽中水流诱导、部分浸没且贯穿气液自由面的刚性圆柱悬挂系统。
> 证据边界：本文是可计算的场模型与验证契约，不是三维 DNS 已运行的声明；任何尾流振子、经验升力系数或附加质量都不属于本层。

## 0. 结论先行：可冻结的母模型是什么

1. 流体母模型是**单液相、恒定大气压、界面贴体 ALE、刚性圆柱、不可压 Newtonian Navier–Stokes**。气相只通过大气压和水—气表面张力出现。润湿必须从两个明示分支选择：C0 是钉扎+无滑的数学基准；C1 是 Navier 滑移+动态接触角/滞后的实物候选。
2. 圆柱以六自由度 Newton–Euler 刚体为母系统，用理想完整约束缩减到真实悬挂拓扑；单角度横流摆只是其一个特例。这避免在 F0 几何尚未最终冻结时偷渡自由度。
3. 流体对刚体的压力—黏性力由真实湿润表面上的 Cauchy 应力积分得到；自由面在圆柱上终止时，毛细线力是独立的接触线项，不能偷塞进湿面应力。
4. 对光滑、拓扑不变的解，粘性耗散、结构阻尼、接触线耗散和进出口机械功率可以在一条连续总能量恒等式中对账。理想悬挂约束功率严格为零。
5. 经典不滑移动接触线产生无穷应力/耗散，因此“无滑+接触线自由滑动+锐界面”不是自洽的完整模型。C0 只在材料水线的相对位移低于观测上限、动态接触角位于滞后窗内时代表实物。对会倾斜的贯穿自由面圆柱，未经观测不得默认钉扎；C1 是更一般的实物候选。
6. 对全场 Navier–Stokes 求解不再额外加“附加质量”或“流体阻尼”；这些效应已在压力与剪应力中。再加一次会双计数。

---

## 1. 实体、坐标、区域和边界

### 1.1 固定有限水槽与坐标

取右手直角坐标

\[
\boldsymbol e_x=\text{入口到出口的顺流向},\qquad
\boldsymbol e_y=\text{水平横流向},\qquad
\boldsymbol e_z=\text{竖直向上},
\]

重力加速度为 \(\boldsymbol g=-g\boldsymbol e_z\), \(g>0\)。固定水槽容器为有界三维集合 \(\Omega_T\subset\mathbb R^3\)，典型长宽水深尺度记为 \(L_T,W_T,H\)，但方程不要求矩形水槽。

### 1.2 刚性圆柱实体

参考位形 \(\mathcal B_0\) 是直径 \(D\)、总轴向长度 \(L_c\) 的实心或空心直圆柱（内部密度分布可非均匀）。刚体位形为

\[
\mathcal B(t)=\boldsymbol X_C(t)
+\boldsymbol R(t)\bigl(\mathcal B_0-\boldsymbol X_{C0}\bigr),
\qquad \boldsymbol R(t)\in SO(3).
\]

\(\boldsymbol X_C\) 为质心，\(\boldsymbol U=\dot{\boldsymbol X}_C\)，角速度 \(\boldsymbol\omega\) 由

\[
\dot{\boldsymbol R}=[\boldsymbol\omega]_\times\boldsymbol R
\]

定义。刚体上一点 \(\boldsymbol x\) 的刚体速度为

\[
\boldsymbol u_b(\boldsymbol x,t)=\boldsymbol U
+\boldsymbol\omega\times(\boldsymbol x-\boldsymbol X_C).
\]

“部分浸没并贯穿自由面”精确意味着：\(\partial\mathcal B(t)\) 同时有非空湿表面和干表面，而水—气界面以一条或多条闭曲线终止于圆柱表面。因此该问题不具有二维平移对称性；自由面、圆柱下端和有限跨度都是三维性来源。

若自由面尚可写成 \(F(\boldsymbol x,t)=x_z-\eta(x_x,x_y,t)=0\)，则刚体的瞬时浸没实体为

\[
\mathcal B_w(t)=\mathcal B(t)\cap\{\boldsymbol x:F(\boldsymbol x,t)\le0\}.
\]

实际湿表面 \(\Gamma_b\) 由这个三维交集决定。对倾斜、有限半径圆柱和起伏自由面，不能仅用“轴线浸没长度 \(\times\) 圆周”代替真实湿面；水线穿过有限圆截面时还包含圆弓几何。

上述 \(\mathcal B_0\) 先按圆柱本体写出。在实际计算域中，\(\mathcal B\) 应是所有与水发生可分辨水动力作用的刚性部件之并。若摆臂、夹具或悬线的任何部分也被浸没，必须将它们加入 \(\mathcal B(t)\) 和 \(\Gamma_b(t)\) 的应力积分；只在它们始终干燥或水动力已被实验界定为可忽略时，才可只把它们作为悬挂约束/惯性的一部分。

### 1.3 液体域、自由面与边界分割

时刻 \(t\) 的液体域记为

\[
\Omega_f(t)\subset \Omega_T\setminus\overline{\mathcal B(t)}.
\]

在忽略零面积的边缘曲线后，它的边界严格分解为

\[
\partial\Omega_f(t)=
\Gamma_{\rm in}(t)\,\dot\cup\,
\Gamma_{\rm out}(t)\,\dot\cup\,
\Gamma_{wb}(t)\,\dot\cup\,
\Gamma(t)\,\dot\cup\,
\Gamma_b(t).
\]

| 记号 | 定义 | 是否移动 | 基线边界类型 |
|---|---|---:|---|
| \(\Gamma_{\rm in}\) | 固定入口截面中当前被液体浸湿的部分 | 支撑平面固定，湿润边缘可移 | 入流速度/流量与入射自由面状态的一组相容条件 |
| \(\Gamma_{\rm out}\) | 固定出口截面中当前被液体浸湿的部分 | 同上 | 规定应力/水位特征或无反射开边界 |
| \(\Gamma_{wb}\) | 侧壁和槽底的当前湿润部分 | 固定 | 无滑 \(\boldsymbol u=\boldsymbol0\) |
| \(\Gamma\) | 水—气自由表面，不含圆柱内部 | 物质法向速度 | 运动学+毛细应力条件 |
| \(\Gamma_b\) | \(\partial\mathcal B\cap\partial\Omega_f\)，圆柱的真实湿润侧面和湿润端面 | 刚体运动 | C0 无滑，或 C1 无穿透+Navier 切向滑移；两者均双向牵引耦合 |

令 \(\boldsymbol n_f\) 始终指向液体域外。在自由面上简写 \(\boldsymbol n=\boldsymbol n_f\)，它从水指向气体；在湿润刚体面上，刚体指向液体的外法向为

\[
\boldsymbol n_b=-\boldsymbol n_f.
\]

这个双法向约定是后续力和功率符号的基准。

### 1.4 接触线不是可忽略的“零测度细节”

自由面的边界分成

\[
\partial\Gamma=
\mathcal C_b\cup\mathcal C_w\cup\mathcal C_o,
\]

其中

- \(\mathcal C_b=\overline\Gamma\cap\overline{\Gamma_b}\)：圆柱上的水—气—固三相接触线；
- \(\mathcal C_w\)：水槽壁上的接触线；
- \(\mathcal C_o\)：自由面与入/出口截断面的交线。

在 \(\partial\Gamma\) 上定义 \(\boldsymbol m\)为**自由面内的外余法向**：它与接触线正交、与 \(\boldsymbol n\) 正交，并指向当前自由面片外。接触线的空间速度记为 \(\boldsymbol V_{\mathcal C}\)。

---

## 2. 界面贴体 ALE 不可压 Navier–Stokes

### 2.1 ALE 映射与网格速度

从参考液体域 \(\widehat\Omega_f\) 到当前域定义可逆映射

\[
\boldsymbol x=\boldsymbol\chi(\widehat{\boldsymbol x},t),
\qquad
\boldsymbol w(\boldsymbol x,t)
=\left.\partial_t\boldsymbol\chi\right|_{\widehat{\boldsymbol x}}
\circ\boldsymbol\chi^{-1}.
\]

ALE 只是坐标/网格选择，不是新的物理近似。基线网格在 \(\Gamma\) 和 \(\Gamma_b\) 上贴体，内部 \(\boldsymbol w\) 可由谐延拓、线弹性网格或伪弹性网格方程给出。它必须满足几何保守律

\[
\partial_t J=J\,\nabla\!\cdot\boldsymbol w,
\qquad J=\det\left(\frac{\partial\boldsymbol\chi}
{\partial\widehat{\boldsymbol x}}\right),
\]

否则即使物理速度均匀，移动网格也会伪造质量和能量源。ALE 的原始计算形式见 [Hirt, Amsden & Cook (1974)](https://doi.org/10.1016/0021-9991(74)90051-5)，移动网格几何保守律见 [Thomas & Lombard (1979)](https://doi.org/10.2514/3.61273)。

### 2.2 液相方程

水的密度 \(\rho\) 和动力黏度 \(\mu\) 取常数。以大气压 \(p_a\) 为基准，定义表压

\[
p=p_{\rm abs}-p_a,
\qquad
\boldsymbol\sigma=-p\boldsymbol I+2\mu\boldsymbol D(\boldsymbol u),
\qquad
\boldsymbol D(\boldsymbol u)
=\tfrac12(\nabla\boldsymbol u+\nabla\boldsymbol u^{\mathsf T}).
\]

在 \(\Omega_f(t)\times(0,T]\) 内，

\[
\boxed{
\rho\left[
\left.\partial_t\boldsymbol u\right|_{\widehat{\boldsymbol x}}
+\bigl((\boldsymbol u-\boldsymbol w)\!\cdot\nabla\bigr)\boldsymbol u
\right]
=\nabla\!\cdot\boldsymbol\sigma+\rho\boldsymbol g,
\qquad
\nabla\!\cdot\boldsymbol u=0.}
\tag{2.1}
\]

此处是全三维时变场方程。即使后续使用 LES/RANS，也必须把滤波/平均后的额外应力明示为闭合，不能把它写回式 (2.1) 后称为 DNS。

### 2.3 自由面运动学条件

若 \(F(\boldsymbol x,t)=0\) 描述 \(\Gamma(t)\)，液体不穿过界面给出

\[
\boxed{\partial_tF+\boldsymbol u\!\cdot\nabla F=0
\quad\text{on }\Gamma(t).}
\tag{2.2}
\]

对贴体 ALE 网格，等价地

\[
(\boldsymbol w-\boldsymbol u)\!\cdot\boldsymbol n=0
\quad\text{on }\Gamma(t),
\tag{2.3}
\]

而切向网格速度是数值自由度。若自由面尚能写成 \(z=\eta(x,y,t)\)，则

\[
\partial_t\eta+u_x\partial_x\eta+u_y\partial_y\eta=u_z
\quad\text{at }z=\eta(x,y,t).
\tag{2.4}
\]

当表面翻卷、夹气或断裂时，式 (2.4) 失效，而隐式界面/两相形式仍可使用。

### 2.4 自由面动力学条件与曲率符号

定义表面投影算子和带符号曲率

\[
\boldsymbol P=\boldsymbol I-\boldsymbol n\boldsymbol n,
\qquad
\kappa=-\nabla_s\!\cdot\boldsymbol n.
\]

在这个约定下，液滴外法向的球面有 \(\kappa=-2/R\)。表面张力 \(\gamma\) 恒定时，忽略气相黏性和惯性的应力条件为

\[
\boxed{\boldsymbol\sigma\boldsymbol n
=\gamma\kappa\boldsymbol n
\quad\text{on }\Gamma(t).}
\tag{2.5}
\]

对半径 \(R\) 的静止球滴，式 (2.5) 给出 \(p_{\rm abs}-p_a=2\gamma/R\)，这是本文曲率符号的快速校验。若 \(\gamma\) 因温度或表面活性剂而非均匀，必须改为

\[
\boldsymbol\sigma\boldsymbol n
=\gamma\kappa\boldsymbol n+\nabla_s\gamma,
\tag{2.6}
\]

并增加表面组分输运和化学自由能；只在动量方程中加 Marangoni 力而不加表面能是不守恒的。宏观表面张力和平衡接触角的经典原始来源是 [Young (1805)](https://doi.org/10.1098/rstl.1805.0005)。

### 2.5 固定壁、入口和出口

固定湿壁和槽底上采用

\[
\boldsymbol u=\boldsymbol0
\quad\text{on }\Gamma_{wb}.
\tag{2.7}
\]

入/出口不能同时任意规定速度、压力、水位和全部波动信息。一个可闭合的基线选择是

\[
\boldsymbol u=\boldsymbol u_{\rm in}(\boldsymbol x,t)
\quad\text{on }\Gamma_{\rm in},
\tag{2.8a}
\]

\[
\boldsymbol\sigma\boldsymbol n_f
=\boldsymbol t_{\rm out}(\boldsymbol x,t)
\quad\text{on }\Gamma_{\rm out},
\tag{2.8b}
\]

再对入射自由面给定恰当数量的入射特征（例如平均水深与无入射波），对出口给定辐射/吸收条件。对静水出口，可在表压下用水深一致的静水牵引；对存在回流的出口，朴素“do-nothing”条件可向计算域注入数值能量，必须使用能量稳定的回流处理。

不可压性与边界运动要求通量相容性

\[
\int_{\Gamma_{\rm in}\cup\Gamma_{\rm out}}
\boldsymbol u\!\cdot\boldsymbol n_f\,dS
+\int_{\Gamma\cup\Gamma_b}
\boldsymbol V_{\partial\Omega}\!\cdot\boldsymbol n_f\,dS=0,
\tag{2.9}
\]

其中物质边界上 \(\boldsymbol V_{\partial\Omega}\!\cdot\boldsymbol n_f=\boldsymbol u\!\cdot\boldsymbol n_f\)。式 (2.9) 是计算前的可解性检查，不是事后任意调节出口速度的借口。

### 2.6 湿润刚体面：C0 无滑基准与 C1 滑移候选

在 C0 钉扎数学基准中，整个光滑湿润刚体面采用

\[
\boxed{\boldsymbol u=\boldsymbol u_b
=\boldsymbol U+\boldsymbol\omega\times
(\boldsymbol x-\boldsymbol X_C)
\quad\text{on }\Gamma_b.}
\tag{2.10}
\]

对实物候选 C1，令

\[
\boldsymbol P_b=\boldsymbol I-
\boldsymbol n_b\boldsymbol n_b,
\qquad
\boldsymbol u_{\rm rel,t}=
\boldsymbol P_b(\boldsymbol u-\boldsymbol u_b),
\]

并以无穿透和耗散型 Navier 滑移闭合湿面：

\[
\boxed{
(\boldsymbol u-\boldsymbol u_b)\!\cdot\boldsymbol n_b=0,
\qquad
\boldsymbol P_b\boldsymbol\sigma\boldsymbol n_b
=\beta_s\boldsymbol u_{\rm rel,t},
\qquad
\beta_s=\frac{\mu}{\ell_s}>0.}
\tag{2.11}
\]

因 \(\boldsymbol n_f=-\boldsymbol n_b\)，式 (2.11) 意味着固体对流体的切向牵引与液体相对速度反向，产生非负界面耗散

\[
\mathcal D_{\rm slip}=
\int_{\Gamma_b}\beta_s
|\boldsymbol u_{\rm rel,t}|^2\,dS\ge0.
\tag{2.12}
\]

在 C1 接触线上，交线必须同时留在水—气物质面和刚体面上：

\[
\boxed{
(\boldsymbol V_{\mathcal C}-\boldsymbol u)
\!\cdot\boldsymbol n=0,
\qquad
(\boldsymbol V_{\mathcal C}-\boldsymbol u_b)
\!\cdot\boldsymbol n_b=0.}
\tag{2.13}
\]

式 (2.13) 是几何运动学；它本身不决定接触线沿固体表面的相对速度，后者由第 6.5 节的动态接触角/滞后律闭合。C0 则直接取 \(\boldsymbol V_{\mathcal C}=\boldsymbol u_b\)。

C0 贴体网格可取 \(\boldsymbol w=\boldsymbol u_b\) 于 \(\Gamma_b\)。C1 只能强制几何无穿透

\[
(\boldsymbol w-\boldsymbol u_b)\!\cdot\boldsymbol n_b=0
\quad\text{on }\Gamma_b,
\]

而允许网格节点沿刚体面切向滑动，并在 \(\mathcal C_b\) 上取 \(\boldsymbol w=\boldsymbol V_{\mathcal C}\)。否则一个同时“锁死于刚体材料点”和“追踪移动接触线”的 ALE 节点会自相矛盾。这是网格几何速度，不要求 C1 液体的切向速度等于网格速度。流体解出的 \(\boldsymbol\sigma\boldsymbol n_b\) 是流体对刚体的单位面积牵引，反作用 \(\boldsymbol\sigma\boldsymbol n_f=-\boldsymbol\sigma\boldsymbol n_b\) 作用于流体。

---

## 3. 从湿面应力到刚体力、力矩和广义力

### 3.1 压力—黏性合力与力矩

以刚体外法向 \(\boldsymbol n_b\) 为准，流体对刚体的应力合力和关于质心的力矩是

\[
\boxed{
\boldsymbol F_h(t)=\int_{\Gamma_b(t)}
\boldsymbol\sigma\boldsymbol n_b\,dS,}
\tag{3.1}
\]

\[
\boxed{
\boldsymbol M_{C,h}(t)=\int_{\Gamma_b(t)}
(\boldsymbol x-\boldsymbol X_C)\times
(\boldsymbol\sigma\boldsymbol n_b)\,dS.}
\tag{3.2}
\]

积分必须包含当前实际湿润的圆柱侧面与端面，不能用一条二维截面上的压力差代替。对移动物体，湿面本身也随接触线变化。

本文使用表压应力。这等价于对湿面用绝对液相应力、对干面用大气应力，再利用均匀大气压对闭合刚体表面的合力和合力矩为零。绝对压应力积分和表压积分不得混用。

### 3.2 毛细接触线力

对恒定 \(\gamma\) 的锐界面，水—气界面对刚体的线力和关于质心的线力矩取为

\[
\boxed{
\boldsymbol F_\gamma=-\oint_{\mathcal C_b}\gamma\boldsymbol m\,d\ell,
\qquad
\boldsymbol M_{C,\gamma}=-\oint_{\mathcal C_b}
(\boldsymbol x-\boldsymbol X_C)\times
\gamma\boldsymbol m\,d\ell.}
\tag{3.3}
\]

负号来自 \(\boldsymbol m\) 是“自由面片的外余法向”这一定义。式 (3.3) 在 C0 中的直接校验是：它的刚体功率恰好抵消自由面能输运定理的 \(\mathcal C_b\) 边缘项。在 C1 中接触线相对刚体移动，两者不再完全抵消；剩余功与固—液/固—气表面能一起产生接触线驱动力和耗散，见第 6.5 节。

如果计算弱式已将 \(\gamma\kappa\boldsymbol n\) 做表面分部积分，其中会自动出现 \(+\oint_{\mathcal C_b}\gamma\boldsymbol v\!\cdot\boldsymbol m\,d\ell\)。与刚体式 (3.3) 组合时它们相消；若又在流体程序中额外加一遍线力，就会双计数。

### 3.3 广义流体载荷

令悬挂系统的独立广义坐标为 \(q_i\)，刚体面点对 \(q_i\) 的虚位移为 \(\partial\boldsymbol x_b/\partial q_i\)。真实场模型给出的广义流体力是

\[
\boxed{
Q_i^{f}=
\int_{\Gamma_b(t)}
(\boldsymbol\sigma\boldsymbol n_b)\!\cdot
\frac{\partial\boldsymbol x_b}{\partial q_i}\,dS
-\oint_{\mathcal C_b(t)}
\gamma\boldsymbol m\!\cdot
\frac{\partial\boldsymbol x_b}{\partial q_i}\,d\ell.}
\tag{3.4}
\]

第二项是水—气自由面的锐界面线力。对 C1，固—液/固—气表面能变分还会给出接触线相对运动的 Young 驱动力；该力用于润湿动力学闭合，不得又当作另一份 \(-\gamma\boldsymbol m\) 加在刚体上。对弥散界面模型，所有面/线力应从总自由能变分统一产生，不再单独套用式 (3.3)。

---

## 4. 刚体平动、转动和悬挂约束

### 4.1 六自由度 Newton–Euler 母系统

设刚体质量为 \(m_b\)，空间坐标下关于质心的惯量张量为

\[
\boldsymbol J_C(t)=\boldsymbol R(t)\boldsymbol J_{C0}\boldsymbol R^{\mathsf T}(t).
\]

则

\[
m_b\dot{\boldsymbol U}
=m_b\boldsymbol g+\boldsymbol F_h+\boldsymbol F_\gamma
+\boldsymbol F_{\rm sus}+\boldsymbol F_{\rm ext}
+\boldsymbol F_\lambda,
\tag{4.1}
\]

\[
\frac{d}{dt}(\boldsymbol J_C\boldsymbol\omega)
=\boldsymbol M_{C,h}+\boldsymbol M_{C,\gamma}
+\boldsymbol M_{C,{\rm sus}}+\boldsymbol M_{C,{\rm ext}}
+\boldsymbol M_{C,\lambda}.
\tag{4.2}
\]

式 (4.1)–(4.2) 与 \(\dot{\boldsymbol R}=[\boldsymbol\omega]_\times\boldsymbol R\) 联立。在刚体坐标下，式 (4.2) 等价于 \(\boldsymbol J_{C0}\dot{\boldsymbol\omega}_b+\boldsymbol\omega_b\times(\boldsymbol J_{C0}\boldsymbol\omega_b)=\boldsymbol M_b\)。

悬挂力可分为保守势 \(V_{\rm sus}\)、非负阻尼和理想约束反力。对广义坐标 \(\boldsymbol q\)，完整理想约束写成

\[
\boldsymbol\Phi(\boldsymbol q,t)=\boldsymbol0,
\qquad
\boldsymbol G\dot{\boldsymbol q}+\partial_t\boldsymbol\Phi=\boldsymbol0,
\qquad
\boldsymbol G=\frac{\partial\boldsymbol\Phi}{\partial\boldsymbol q}.
\tag{4.3}
\]

约束广义力 \(\boldsymbol Q_\lambda=\boldsymbol G^{\mathsf T}\boldsymbol\lambda\)。对固定、齐次的理想约束，

\[
\boxed{
P_\lambda=\dot{\boldsymbol q}^{\mathsf T}
\boldsymbol G^{\mathsf T}\boldsymbol\lambda
=\boldsymbol\lambda^{\mathsf T}
\boldsymbol G\dot{\boldsymbol q}=0.}
\tag{4.4}
\]

若支点本身被执行器驱动，\(\partial_t\boldsymbol\Phi\ne0\)，约束反力可以做功；这时它是外部执行器功率，不得再标成“零功理想约束”。

### 4.2 单角度横流摆特例

当前 canonical 拓扑为：圆柱与径向摆臂共线，刚性总成绕空间中固定的顺流轴 \(\boldsymbol e_x\) 转动，\(\theta=0\) 时圆柱轴竖直，且只有 \(\theta(t)\) 一个自由度。定义从支点 \(\boldsymbol P\) 指向圆柱下方的轴向单位矢量

\[
\boldsymbol d(\theta)=
\sin\theta\,\boldsymbol e_y-
\cos\theta\,\boldsymbol e_z.
\tag{4.5a}
\]

若圆柱沿该射线占据 \(r\in[\ell_t,\ell_b]\)、半径 \(R_c=D/2\)，其精确实体可写成

\[
\mathcal B(\theta)=
\left\{
\boldsymbol P+r\boldsymbol d(\theta)+\boldsymbol\varrho:
r\in[\ell_t,\ell_b],\qquad
\boldsymbol\varrho\!\cdot\boldsymbol d=0,\qquad
|\boldsymbol\varrho|\le R_c
\right\}.
\tag{4.5b}
\]

于是

\[
\boldsymbol X_C=\boldsymbol P
+\ell_C\boldsymbol d(\theta),
\qquad
\boldsymbol\omega=\dot\theta\boldsymbol e_x.
\]

圆柱方位 \(\boldsymbol R(\theta)\) 也随 \(\theta\) 改变，不是仅质心沿圆弧平移而圆柱仍保持竖直。若实验后续确认为导轨约束的竖直平移圆柱，则应改用六自由度母系统的另一约束支路，不应继续使用本节的摆转几何。

关于支点的标量方程为

\[
\boxed{
I_P\ddot\theta+c_\theta\dot\theta
+\frac{\partial V_{\rm sus}}{\partial\theta}
+m_bg\ell_C\sin\theta
=Q_\theta^f+Q_\theta^{\rm ext},}
\tag{4.6}
\]

\[
Q_\theta^f
=\boldsymbol e_x\!\cdot
\left[
\boldsymbol M_{C,h}+\boldsymbol M_{C,\gamma}
+(\boldsymbol X_C-\boldsymbol P)\times
(\boldsymbol F_h+\boldsymbol F_\gamma)
\right].
\tag{4.7}
\]

式 (4.6) 已包含全场流体惯性、黏性和自由面效应。只有降阶之后才可将 \(Q_\theta^f\) 分解成附加质量、流体阻尼和激振项。

---

## 5. 初值、压力定标与经典解相容性

在 \(t=0\) 给定

\[
\Omega_f(0)=\Omega_{f0},\quad
\Gamma(0)=\Gamma_0,\quad
\boldsymbol u(\boldsymbol x,0)=\boldsymbol u_0,
\quad
\boldsymbol X_C(0),\boldsymbol R(0),
\boldsymbol U(0),\boldsymbol\omega(0),
\tag{5.1}
\]

并要求

\[
\nabla\!\cdot\boldsymbol u_0=0,
\quad
\boldsymbol u_0=\boldsymbol0\text{ on }\Gamma_{wb}(0),
\quad
\boldsymbol u_0=\boldsymbol u_b(0)
\text{ on }\Gamma_b(0),
\tag{5.2}
\]

以及入口、自由面法向速度和约束速度的零阶相容性。要求经典光滑解时，还需在边界交线上满足更高阶相容条件。

压力是不可压约束的 Lagrange 乘子，不需独立给定“压力初值”。自由面的表压牵引或出口牵引通常已固定压力常数；若全部是速度边界，则补一个 \(\int_{\Omega_f}p\,dV=0\) 定标，但该定标不得改变物理表压力。

还必须有几何可容许性：\(\boldsymbol\chi(\cdot,0)\) 可逆，刚体不与壁面相交，液体域不自交，并且接触线拓扑与所选润湿分支一致。

---

## 6. 连续功率/能量恒等式

### 6.1 流体机械能

定义液体动能加重力势能

\[
E_f(t)=\int_{\Omega_f(t)}
e_f\,dV,
\qquad
e_f=\tfrac12\rho|\boldsymbol u|^2+\rho gz.
\tag{6.1}
\]

点乘式 (2.1) 与 \(\boldsymbol u\)，使用 \(\nabla\!\cdot\boldsymbol u=0\)、应力对称性和 Reynolds 输运定理，对光滑解得

\[
\frac{dE_f}{dt}
=P_o-\mathcal D_\mu
+\int_\Gamma\gamma\kappa
\boldsymbol u\!\cdot\boldsymbol n\,dS
-P_h-\mathcal D_{\rm slip},
\tag{6.2}
\]

其中 C0 取 \(\mathcal D_{\rm slip}=0\)，C1 取式 (2.12)。该符号可直接由湿面功率核查：

\[
\int_{\Gamma_b}
(\boldsymbol\sigma\boldsymbol n_f)\!\cdot\boldsymbol u\,dS
+P_h
=-\mathcal D_{\rm slip}.
\tag{6.2a}
\]

其中

\[
\boxed{
P_o=\int_{\Gamma_{\rm in}\cup\Gamma_{\rm out}}
\left[(\boldsymbol\sigma\boldsymbol n_f)\!\cdot\boldsymbol u
-e_f\,\boldsymbol u\!\cdot\boldsymbol n_f\right]dS,}
\tag{6.3}
\]

\[
\boxed{
\mathcal D_\mu=
\int_{\Omega_f(t)}2\mu\boldsymbol D:\boldsymbol D\,dV\ge0,}
\tag{6.4}
\]

\[
\boxed{
P_h=\boldsymbol F_h\!\cdot\boldsymbol U
+\boldsymbol M_{C,h}\!\cdot\boldsymbol\omega
=\int_{\Gamma_b}(\boldsymbol\sigma\boldsymbol n_b)
\!\cdot\boldsymbol u_b\,dS.}
\tag{6.5}
\]

\(P_o\) 按“进入计算域为正”定号。展开式 (6.3)可见它同时包含压力功、黏性牵引功、动能对流和重力势能对流。因此对速度入口，仅用 \(\tfrac12\rho Q U^2\) 不是完整入口功率；必须从数值解恢复该处的反力牵引。

### 6.2 自由面能输运

对恒定 \(\gamma\)，

\[
E_\gamma(t)=\gamma|\Gamma(t)|.
\tag{6.6}
\]

自由表面输运定理和表面分部积分给出

\[
\boxed{
\frac{dE_\gamma}{dt}
=-\int_\Gamma\gamma\kappa
\boldsymbol u\!\cdot\boldsymbol n\,dS
+\oint_{\partial\Gamma}
\gamma\boldsymbol V_{\mathcal C}\!\cdot\boldsymbol m\,d\ell.}
\tag{6.7}
\]

式 (6.7) 明确显示：曲率功与表面能变化的面积项相消，但开放自由面的接触线/截断线功率仍然存在。

式 (3.3) 对刚体做的功率是

\[
P_\gamma=\boldsymbol F_\gamma\!\cdot\boldsymbol U
+\boldsymbol M_{C,\gamma}\!\cdot\boldsymbol\omega
=-\oint_{\mathcal C_b}
\gamma\boldsymbol u_b\!\cdot\boldsymbol m\,d\ell.
\tag{6.8}
\]

在 C0 中 \(\boldsymbol V_{\mathcal C}=\boldsymbol u_b\)，它抵消式 (6.7) 中 \(\mathcal C_b\) 的边缘项。在 C1 中两者留下

\[
\oint_{\mathcal C_b}
\gamma(\boldsymbol V_{\mathcal C}-\boldsymbol u_b)
\!\cdot\boldsymbol m\,d\ell,
\tag{6.8a}
\]

它必须与固体表面能变化和接触线动力学一起处理，不是可忽略的高阶项。钉扎于固定水槽壁的线有 \(\boldsymbol V_{\mathcal C}=0\)；若壁面接触线滑动，也必须按 C1 加入壁面能与线耗散。\(\mathcal C_o\) 上的剩余项是截断自由面的毛细能端口

\[
P_{\gamma,o}=\oint_{\mathcal C_o}
\gamma\boldsymbol V_{\mathcal C}\!\cdot\boldsymbol m\,d\ell.
\tag{6.9}
\]

### 6.3 刚体与悬挂系统能量

定义

\[
T_b=\tfrac12m_b|\boldsymbol U|^2
+\tfrac12\boldsymbol\omega\!\cdot
\boldsymbol J_C\boldsymbol\omega,
\qquad
V_b=m_bgz_C+V_{\rm sus}(\boldsymbol q).
\tag{6.10}
\]

若结构阻尼的广义力为 \(-\boldsymbol C(\boldsymbol q)\dot{\boldsymbol q}\)，且 \(\boldsymbol C\) 半正定，则

\[
\mathcal D_s=
\dot{\boldsymbol q}^{\mathsf T}
\boldsymbol C(\boldsymbol q)
\dot{\boldsymbol q}\ge0.
\tag{6.11}
\]

点乘 Newton–Euler/广义坐标方程与刚体速度得

\[
\frac{d}{dt}(T_b+V_b)
=P_h+P_\gamma+P_{\rm ext}
-\mathcal D_s+P_\lambda.
\tag{6.12}
\]

对固定理想约束，\(P_\lambda=0\)。

### 6.4 连续总能量/功率恒等式

对 C0 钉扎+无滑分支，\(\mathcal D_{\rm slip}=0\) 且 \(\boldsymbol V_{\mathcal C}=\boldsymbol u_b\)。将式 (6.2)、(6.7) 和 (6.12) 相加，所有内部流固牵引功、毛细曲率功和圆柱接触线功都成对抵消：

\[
\boxed{
\frac{d}{dt}
\underbrace{\left[
E_f+E_\gamma+T_b+V_b
\right]}_{E_{\rm tot}}
=
\underbrace{P_o}_{\substack{\text{进/出口}\\\text{机械能端口}}}
+\underbrace{P_{\gamma,o}}_{\text{自由面边缘端口}}
+\underbrace{P_{\rm ext}}_{\text{外部执行器/非保守载荷}}
-\underbrace{\mathcal D_\mu}_{\text{黏性耗散}}
-\underbrace{\mathcal D_s}_{\text{结构阻尼}}
+\underbrace{P_\lambda}_{=0\;\text{理想固定约束}}.
}
\tag{6.13}
\]

对闭合无流水槽、无外激励、固定钉扎线，式 (6.13) 退化为

\[
\frac{dE_{\rm tot}}{dt}=-\mathcal D_\mu-\mathcal D_s\le0.
\tag{6.14}
\]

对 \(\mu=0\)、\(\boldsymbol C=0\) 的光滑解，总能量保守。对三维 Navier–Stokes 弱解、界面破碎/合并或冲击解，光滑性不足时只能要求相应的**能量不等式**，并将未解析耗散/拓扑事件记为非负缺陷；不能在这些情况下声称点态恒等式仍经典成立。

### 6.5 C1 移动接触线的闭合和功率式

若接触线相对固体滑移，必须把

\[
E_{sg/sl}=\gamma_{sg}A_{sg}+\gamma_{sl}A_{sl}
\]

加入总能量，并用 Young 平衡关系

\[
\gamma_{sg}-\gamma_{sl}=\gamma\cos\theta_e
\tag{6.15}
\]

或一个明示的动态接触角/滞后定律闭合线驱动力。

为了把符号和耗散写清，在固体表面上定义 \(\boldsymbol m_s\) 为垂直于接触线、由湿区指向干区的单位切向。令

\[
V_{cl}=(\boldsymbol V_{\mathcal C}-\boldsymbol u_b)
\!\cdot\boldsymbol m_s,
\tag{6.15a}
\]

且约定 \(V_{cl}>0\) 为液体向干区前进。动态接触角 \(\theta_d\) 从液体内测量，余法向定向取使

\[
\boldsymbol m\!\cdot\boldsymbol m_s=\cos\theta_d.
\tag{6.15b}
\]

刚体运动不改变总固体面积，而相对接触线运动给出

\[
\frac{dE_{sg/sl}}{dt}
=\oint_{\mathcal C_b}
(\gamma_{sl}-\gamma_{sg})V_{cl}\,d\ell
=-\oint_{\mathcal C_b}
\gamma\cos\theta_e\,V_{cl}\,d\ell.
\tag{6.15c}
\]

将式 (6.8a) 与 (6.15c) 相加，接触线余功率为

\[
\oint_{\mathcal C_b}
\gamma(\cos\theta_d-
\cos\theta_e)V_{cl}\,d\ell
=-\mathcal D_{cl}.
\tag{6.15d}
\]

一个最小、单调耗散的动态接触角定律是

\[
f_Y\equiv
\gamma(\cos\theta_e-\cos\theta_d)
=\zeta_{cl}V_{cl},
\qquad
\mathcal D_{cl}=
\oint_{\mathcal C_b}
\zeta_{cl}V_{cl}^2\,d\ell\ge0,
\tag{6.15e}
\]

其中 \(\zeta_{cl}>0\) 是线摩擦系数。有接触角滞后时，用单调多值图替代式 (6.15e)：\(V_{cl}=0\) 允许 \(\theta_R\le\theta_d\le\theta_A\)；达到边界后才进入前进/后退分支。

因此 C1 的热力学一致总功率式是

\[
\frac{d}{dt}(E_{\rm tot}+E_{sg/sl})
=P_o+P_{\gamma,o}+P_{\rm ext}
-\mathcal D_\mu-\mathcal D_{\rm slip}
-\mathcal D_s-\mathcal D_{cl},
\qquad \mathcal D_{cl}\ge0.
\tag{6.16}
\]

若水槽壁上的 \(\mathcal C_w\) 也滑动，对每条壁面接触线加同样的表面能和 \(\mathcal D_{cl,w}\)。如果实验不能独立确定 \(\ell_s,\zeta_{cl},\theta_A,\theta_R\)，C1 依然是一个有待标定的连续体闭合，不能冒充无参数的“纯第一性原理”。

移动接触线上经典无滑锐界面的应力与耗散发散由 [Huh & Scriven (1971)](https://doi.org/10.1016/0021-9797(71)90188-3) 原始证明；引入微观滑移层后的尺度匹配见 [Cox (1986)](https://doi.org/10.1017/S0022112086000332)，一种热力学弥散界面处理见 [Jacqmin (2000)](https://doi.org/10.1017/S0022112099006874)。

---

## 7. 系统无量纲化与独立 \(\Pi\) 群

### 7.1 基准尺度与无量纲方程

取圆柱直径 \(D\)、入口体积平均速度 \(U\)、液体密度 \(\rho\) 为基准：

\[
\boldsymbol x=D\boldsymbol x^*,\quad
t=\frac DU t^*,\quad
\boldsymbol u=U\boldsymbol u^*,\quad
p=\rho U^2p^*,\quad
\boldsymbol\sigma=\rho U^2\boldsymbol\sigma^*.
\]

则

\[
\partial_{t^*}^{\rm ALE}\boldsymbol u^*
+[(\boldsymbol u^*-\boldsymbol w^*)\!\cdot\nabla^*]
\boldsymbol u^*
=-\nabla^*p^*
+\frac1{Re}\nabla^{*2}\boldsymbol u^*
-\frac1{Fr^2}\boldsymbol e_z,
\qquad
\nabla^*\!\cdot\boldsymbol u^*=0,
\tag{7.1}
\]

\[
\boldsymbol\sigma^*\boldsymbol n
=\frac1{We}\kappa^*\boldsymbol n,
\tag{7.2}
\]

其中

\[
\boxed{
Re=\frac{\rho UD}{\mu},\qquad
Fr=\frac{U}{\sqrt{gD}},\qquad
We=\frac{\rho U^2D}{\gamma}.}
\tag{7.3}
\]

这三个是对 \(\{\rho,\mu,U,D,g,\gamma\}\) 的一组独立 Buckingham 基。不再把

\[
Ca=\frac{\mu U}{\gamma}=\frac{We}{Re},
\quad
Bo=\frac{\rho gD^2}{\gamma}=\frac{We}{Fr^2},
\quad
Ga=\frac{gD^3}{\nu^2}=\frac{Re^2}{Fr^2}
\tag{7.4}
\]

冒充为额外独立群。

### 7.2 C0 参考分支的完整独立输入基

“全部 \(\Pi\) 群”只能相对于一个明示的参数清单而言。对不压缩单液相、恒 \(\rho,\mu,\gamma\)、刚性圆柱、平稳层流入口和 C0 钉扎接触线**数学参考分支**，一组不重复的独立输入基是；实物候选 C1 的新增群另列于第 7.3 节：

| 类别 | 独立无量纲输入 |
|---|---|
| 流体与体力 | \(Re,Fr,We\) |
| 水槽几何 | \(L_T/D,\ W_T/D,\ H/D\)，以及非矩形截面的无量纲形状函数 |
| 圆柱几何 | \(L_c/D\)、平衡浸没长度 \(h_0/D\)、端部/倒角/表面粗糙 \(k_s/D\)、初始方位角 |
| 悬挂几何 | 支点、铰轴、质心和几何中心的所有位置比 \(\boldsymbol r_i/D\)，以及无量纲约束形状 |
| 刚体惯性 | \(m^*=m_b/(\rho D^3)\)；完整对称惯量张量 \(\boldsymbol J^*=\boldsymbol J_C/(\rho D^5)\) |
| 线性化悬挂刚度/阻尼 | 见下方 \(\boldsymbol K^*,\boldsymbol C^*\)；非线性悬挂则给定完整无量纲势函数 \(V_{\rm sus}^*\) 和耗散函数 |
| 定常入/出口 | 无量纲入口剖面 \(\boldsymbol u_{\rm in}^*(\boldsymbol x^*)\)、出口牵引 \(\boldsymbol t_{\rm out}^*(\boldsymbol x^*)\)、相对入口水深；若 \(U\) 就是体积平均速度，平均幅值不再是独立群 |
| 初始状态 | \(\boldsymbol u_0^*(\boldsymbol x^*)\)、\(\Gamma_0^*\)、\(\boldsymbol q_0^*\)、\(\dot{\boldsymbol q}_0^*\)；它们是无限维函数/场数据，不能压成一个伪“初始条件数” |

对小位移的六广义坐标，令

\[
\boldsymbol S_q=\operatorname{diag}(D,D,D,1,1,1),
\qquad
\boldsymbol q=\boldsymbol S_q\boldsymbol q^*.
\]

则不混淆平动/转动量纲的刚度和阻尼基是

\[
\boxed{
\boldsymbol K^*=
\frac{\boldsymbol S_q^{\mathsf T}
\boldsymbol K\boldsymbol S_q}{\rho U^2D^3},
\qquad
\boldsymbol C^*=
\frac{\boldsymbol S_q^{\mathsf T}
\boldsymbol C\boldsymbol S_q}{\rho UD^4}.}
\tag{7.5}
\]

例如平动刚度块的尺度是 \(K_t/(\rho U^2D)\)，转动刚度块是 \(K_r/(\rho U^2D^3)\)；平动阻尼块是 \(C_t/(\rho UD^2)\)，转动阻尼块是 \(C_r/(\rho UD^4)\)。

对单自由度摆，可以用等价基

\[
I_P^*=\frac{I_P}{\rho D^5},\qquad
U_r=\frac{U}{f_nD},\qquad
\zeta=\frac{c_\theta}{2\sqrt{I_PK_{\rm eff}}},
\tag{7.6}
\]

替代相应的 \(I_P^*,K_\theta^*,C_\theta^*\)，但不得同时把两组都计为独立群。这里必须保留 \(I_P^*\)：仅有 \(m^*\) 不能区分同质量但回转半径/质量分布不同的两个摆。\(m^*\) 仍作为重力矩和质心位置所需的独立输入保留在上表中。若 \(f_n\) 完全由重力、\(m^*\)、\(I_P^*\) 和 \(\ell_C/D\) 决定，则 \(U_r\) 又可由 \(Fr\) 和这些群推导，不独立。质量—阻尼参数 \(m^*\zeta\) 同样是派生量。

### 7.3 升级模型才需增加的独立群

| 升级 | 额外独立输入（在各自参数化下） |
|---|---|
| 时变/振荡入口 | \(St_{\rm in}=f_{\rm in}D/U\)、速度幅值比、相位/波形；\(KC=U/(f_{\rm in}D)=1/St_{\rm in}\) 不独立 |
| 入口湍流 | 湍流强度 \(I_u\)、积分尺度 \(L_I/D\)、各向异性和无量纲谱形 |
| 滑移锐接触线 | 平衡/前进/后退角 \(\theta_e,\theta_A,\theta_R\)、滑移长 \(\ell_s/D\)、线摩擦与黏度比 \(\zeta_{cl}/\mu\) |
| 相场接触线 | Cahn 数 \(Cn=\epsilon/D\)、相场 Péclet/迁移率群、壁面自由能参数；这些需做 \(Cn\to0\) 敏感性，不是水槽宏观固有常数 |
| 显式两相 | \(\rho_g/\rho,\ \mu_g/\mu\)；若气体可压，再有 \(Ma_g=U/c_g\) 和 \(p_a/(\rho U^2)\) |
| 空化/溶解气 | 空化数 \((p_a-p_v)/(\tfrac12\rho U^2)\)、气体体分数与相变动力学群 |
| LES/RANS | 滤波尺度 \(\Delta/D\)、壁模型/闭合常数和入口统计；它们是数值/闭合参数，不是原始 NS 的新基本物性 |

### 7.4 物理和渐近极限

| 极限 | 可得近似 | 必须保留的警告 |
|---|---|---|
| \(Re\ll1\) | 瞬时 Stokes/小惯性流 | 若刚体振荡频率高，非定常惯性可仍重要；需另看 Womersley 组合 |
| \(Re\gg1\) | 外区可近无黏 | 这是奇异极限；壁面边界层、分离和尾流耗散不会因 \(1/Re\) 小而可删 |
| \(Fr\ll1\) 且远离水槽波模态 | 静水/刚盖小挠动 | 在重力波共振附近不能仅凭 \(Fr\) 小删除自由面 |
| \(Fr=O(1)\) | 自由面重力波与尾流同阶 | 入/出口特征数随临界/超临界状态改变 |
| \(We\ll1\) 或 \(Bo\ll1\) | 圆柱尺度毛细主导 | 动态润湿和接触角必须闭合 |
| \(We\gg1\), \(Bo\gg1\) | 远离接触线处全局毛细力可小 | 接触线曲率层仍可是奇异的，不可统一删去 \(\gamma\) |
| \(H/D\ll1\) 且水平波长 \(\lambda/H\gg1\) | 浅水/静水压降阶 | 圆柱近场、竖向涡量和分离不必满足浅水假设 |
| \(W_T/D,H/D,L_T/D\to\infty\) | 无限流场理想化 | 有限槽阻塞、壁面边界层和波反射随之被删，不再是官方装置 |
| \(L_c/D\gg1\) | 远离端部和自由面的局部二维区 | 贯穿自由面和有限浸没端部依旧三维 |
| \(m^*\gg1\) | 物体运动对流体反馈弱 | 仍不等于固定圆柱，除非位移误差也证明足够小 |
| \(m^*=O(1)\) 或更小 | 强流固耦合/附加质量显著 | 分区显式一次交换可无条件不稳定 |
| \(A/D\ll1\)、\(|\nabla\eta|\ll1\) | 线性刚体/线性波动化 | 不包含大幅锁频、碰撞、越浪和湿润拓扑切换 |
| \(\rho_g/\rho,\mu_g/\mu\to0\), \(Ma_g\ll1\) | 恒大气压单相自由面 | 夹气、通风、飞溅阻力和气弹簧效应被删 |
| \(\ell_s/D\to0\) 且接触线滑动 | 不存在正则无滑极限 | 是 Huh–Scriven 奇性，不是可安全取零的小参数 |

---

## 8. 接触线、润湿、气相、湍流的建模层级与失效域

### 8.1 接触线/润湿层级

1. **C0：钉扎锐界面数学基准，不是未经验证的实物默认。** \(\mathcal C_b\) 是刚体材料线，\(\mathcal C_w\) 固定；动态接触角是解，不同时强加 \(\theta=\theta_e\)。C0 提供无 Huh–Scriven 奇性、可精确审计式 (6.13) 的参考分支。
2. **C1a：接触角滞后活性集。** 当 \(\theta_R<\theta_d<\theta_A\) 时线钉扎；达到前进/后退角后滑动。这是不光滑切换系统，数值上必须记录活性集和滞回历史。
3. **C1b：Navier 滑移+耗散型动态接触角。** 在湿面用式 (2.11)，在接触线用式 (6.15e) 或 Cox 尺度匹配闭合 \(\theta_d(V_{cl})\)。对会倾斜的贯穿自由面圆柱，在尚无钉扎证据时，C1a/C1b 是更稳妥的实物候选。
4. **C2：弥散界面/相场。** 使用 Cahn–Hilliard–Navier–Stokes 自由能和壁面能，必须同时验证质量、能量耗散和 \(Cn\to0\) 极限。

为看清倾斜圆柱的几何要求，忽略有限半径且暂取平水面 \(z=\eta_0\)，式 (4.5b) 轴线与水面相交的材料坐标是

\[
r_f(\theta)=\frac{P_z-\eta_0}{\cos\theta}.
\tag{8.1}
\]

即使这个理想化里小角位移是 \(O(\theta^2)\)，有限半径、水面斜率/波动和大角运动都会使真实三维水线沿材料面迁移。若强制 C0，自由面必须随那条材料线变形，可能与实验完全不同。

**C0 的可证伪判据。** 在圆柱表面沿轴向和圆周向布置不改变润湿性的材料标记，用双视角高速成像重建 \(\mathcal C_b(t)\)、\(\theta_d(t)\) 与刚体位姿。只有当

\[
\max_{t,\ell}
\left|\bigl(\boldsymbol x_{\mathcal C}(t)-
\boldsymbol x_{\rm material}(t)\bigr)
\!\cdot\boldsymbol m_s\right|
\le\delta_{\rm CL}
\quad\text{且}\quad
\theta_R\le\theta_d(t,\ell)\le\theta_A
\tag{8.2}
\]

时，才在观测分辨率 \(\delta_{\rm CL}\) 下接受 C0。如果观测到有分辨率的 \(V_{cl}\ne0\)，或接触角穿越滞后窗但线仍被数值钉死，C0 被否证。对 C1b，还应检查定向乘积 \(\gamma(\cos\theta_e-\cos\theta_d)V_{cl}\ge0\) 及其周期积分是否与式 (6.15e) 一致。

每一层都需独立标定。钉扎线位置与固定接触角通常不能同时强制，否则过定。

### 8.2 气相层级

- **G0：恒 \(p_a\) 单相。** 适用于小气相特征速度、气体黏性/惯性相对小，且无夹气、通风空腔、泡沫或水面破碎。
- **G1：不可压两相。** 在 \(\Omega_f\cup\Omega_g\) 分别求 NS，在界面上强制速度连续与
  \[
  (\boldsymbol\sigma_f-\boldsymbol\sigma_g)\boldsymbol n
  =\gamma\kappa\boldsymbol n+\nabla_s\gamma.
  \]
  适用于气动力、通风或大自由面变形，但不包含气体可压缩冲击。
- **G2：可压气相/多尺度气泡。** 在液体冲击夹气、高频气弹簧、空化或大量飞溅时需要。

一相假设的可直接检查失效信号包括：高速摄影看到气泡被卷入，圆柱后方形成通风空腔，水面破碎/飞溅，或表压计算使绝对压接近蒸汽压。

### 8.3 湍流层级

- **T0：解析全 NS（DNS 目标）。** 方程 (2.1) 本身包含层流、过渡和湍流；只有网格、时间步和界面分辨率对最小动力学尺度已做收敛证明，才能称 DNS。
- **T1：界面解析 LES。** 必须在动量和能量账本中加子网格应力与其耗散/回散，并处理自由面和移动壁附近滤波。动态 SGS 的原始工作见 [Germano et al. (1991)](https://doi.org/10.1063/1.857955)。
- **T2：URANS/RANS。** 可用于大范围工况扫描，但相位平均和湍流闭合可改变涡脱落相干性、锁频带和自由面能量转移；不得作为对瞬态起振门槛的唯一高保真证据。

### 8.4 其他失效域

- 圆柱/悬线可见弯曲、悬线松弛或铰间隙碰撞：刚体+光滑完整约束失效；
- 液体温度、污染或表面活性剂导致 \(\gamma\) 空间变化：恒表面张力失效；
- 圆柱离壁/底间隙达到网格尺度或真实碰撞：光滑 ALE 映射失去可逆性，需要接触/重网格或浸入法；
- 自由面合并、断裂、越过圆柱顶面：单拓扑 ALE 分支失效；
- 水中颗粒/气泡浓度不可忽略、密度随温度显著改变或马赫数不小：恒 \(\rho\) 不可压 Newtonian 单相失效。

---

## 9. 适合数值离散的弱式

### 9.1 流体 ALE 弱式

取满足本质边界的速度试函数 \(\boldsymbol v\) 和压力试函数 \(r\)。对 C0 分区流体求解，\(\boldsymbol v=0\) 于入口速度边界、固定壁和已给定刚体速度的 \(\Gamma_b\)。一个直接弱式是

\[
\begin{aligned}
&\bigl(\rho\partial_t^{\rm ALE}\boldsymbol u,
\boldsymbol v\bigr)_{\Omega_f}
+\bigl(\rho[(\boldsymbol u-\boldsymbol w)\!\cdot\nabla]
\boldsymbol u,\boldsymbol v\bigr)_{\Omega_f}
+\bigl(2\mu\boldsymbol D(\boldsymbol u),
\boldsymbol D(\boldsymbol v)\bigr)_{\Omega_f}
-\bigl(p,\nabla\!\cdot\boldsymbol v\bigr)_{\Omega_f}
\\
&\quad=
\bigl(\rho\boldsymbol g,\boldsymbol v\bigr)_{\Omega_f}
+\langle\boldsymbol t_{\rm out},\boldsymbol v\rangle_{\Gamma_{\rm out}}
+\int_\Gamma\gamma\kappa\boldsymbol n\!\cdot\boldsymbol v\,dS,
\\
&\bigl(r,\nabla\!\cdot\boldsymbol u\bigr)_{\Omega_f}=0.
\end{aligned}
\tag{9.1}
\]

为避免直接计算二阶曲率，使用

\[
\boxed{
\int_\Gamma\gamma\kappa\boldsymbol n\!\cdot\boldsymbol v\,dS
=-\int_\Gamma\gamma\boldsymbol P:\nabla_s\boldsymbol v\,dS
+\oint_{\partial\Gamma}\gamma\boldsymbol v\!\cdot\boldsymbol m\,d\ell.}
\tag{9.2}
\]

式 (9.2) 同时是曲率符号和接触线力的弱式审计。对 C1，\(\Gamma_b\) 上只将法向无穿透作为本质条件，切向试函数可非零，并将 Navier 项

\[
\int_{\Gamma_b}
\beta_s\boldsymbol u_{\rm rel,t}
\!\cdot\boldsymbol P_b\boldsymbol v\,dS
\tag{9.3}
\]

加到动量弱式左边；接触线还必须联立式 (6.15e) 或滞后多值图。空间离散应使用满足 inf–sup 的速度—压力对，或者明示、可验证的一致稳定化；对流项应采用与 GCL 和开边界通量一致的保守/反对称形式，否则离散能量不会对账。

### 9.2 单体弱耦合的接口消去

单体形式允许 \(\boldsymbol v|_{\Gamma_b}\) 是任意刚体虚速度

\[
\delta\boldsymbol u_b=
\delta\boldsymbol U+
\delta\boldsymbol\omega\times
(\boldsymbol x-\boldsymbol X_C).
\]

将流体动量弱式与刚体虚功式相加后，

- C0 中 \(\Gamma_b\) 上的牵引功在流体和刚体之间严格相消；C1 中留下恰为 \(-\mathcal D_{\rm slip}\) 的界面耗散；
- C0 中式 (9.2) 在 \(\mathcal C_b\) 的线项与式 (3.3) 相消；C1 中与固体表面能和动态接触角弱式组合为 \(-\mathcal D_{cl}\)；
- 约束乘子通过 \(\delta\boldsymbol q^{\mathsf T}\boldsymbol G^{\mathsf T}\boldsymbol\lambda\) 强制几何约束，对可许虚速度零功。

因此“接口功离散相消”是单体实现最有力的程序单元测试之一。

### 9.3 界面表示的可选层

- **ALE 显式贴体面：**界面几何、应力和力矩直接，适合中小幅、拓扑不变的 C0 或 C1 振动；大变形时网格失真。
- **VOF：**局部体积守恒强、可处理破碎/合并，但接触角、曲率和刚体近界面几何需专门重构。原始 VOF 见 [Hirt & Nichols (1981)](https://doi.org/10.1016/0021-9991(81)90145-5)。
- **Level set：**法向和曲率光滑，拓扑变化自然，但重初始化带来体积误差；必须报告液体体积残差。对不可压两相流的原始应用见 [Sussman, Smereka & Osher (1994)](https://doi.org/10.1006/jcph.1994.1155)。
- **浸入边界/截取单元：**可避免大幅刚体运动的重网格，但必须独立验证无滑误差、近壁剪应力和积分力矩，不能因为几何“看起来在动”就称为边界解析。浸入边界的原始工作见 [Peskin (1972)](https://doi.org/10.1016/0021-9991(72)90065-4)。

连续表面力形式中将毛细力布置为界面附近体力的经典原始方法见 [Brackbill, Kothe & Zemach (1992)](https://doi.org/10.1016/0021-9991(92)90240-Y)。选用任何界面方法都不改变第 2–6 节的物理契约。

---

## 10. 分区强耦合算法契约

若复用独立流体和刚体求解器，每个时间步 \(t^n\to t^{n+1}\) 必须在该时间步内做接口强耦合：

1. 预测 \(\boldsymbol q^{n+1,(0)}\)、\(\dot{\boldsymbol q}^{n+1,(0)}\)、\(\Gamma^{n+1,(0)}\)，并生成满足 GCL 的 ALE 网格；
2. C0 以 \(\boldsymbol u|_{\Gamma_b}=\boldsymbol u_b^{(k)}\) 求流体和自由面；C1 以式 (2.11) 的无穿透—Navier 条件及当前接触线活性集求解；
3. 用式 (3.1)–(3.3) 在**同一时层、同一湿面**积分 \(\boldsymbol F_h,\boldsymbol M_h,\boldsymbol F_\gamma,\boldsymbol M_\gamma\)；
4. 求刚体/约束方程，得 \(\boldsymbol q^{n+1,(k+1)}\)；
5. 用 Aitken 松弛、接口准 Newton 或块 Newton 更新，重复 2–4，直到同时满足位移/速度、牵引、接触线、约束和功率残差容差；
6. 仅在耦合残差低于空间/时间离散误差后接受时间步。

在不可压流体与较轻结构耦合中，单次显式 Dirichlet–Neumann 交换可因附加质量而即使 \(\Delta t\to0\) 也不稳定；理论原始分析见 [Causin, Gerbeau & Nobile (2005)](https://doi.org/10.1016/j.cma.2004.12.005)。分区块 Newton 强耦合的经典原始工作见 [Matthies & Steindorf (2003)](https://doi.org/10.1016/S0045-7949(02)00409-1)。

两个程序之间的**刚体载荷映射**必须保功：

\[
\boxed{
\dot{\boldsymbol q}^{\mathsf T}\boldsymbol Q_f
=\int_{\Gamma_b}
(\boldsymbol\sigma\boldsymbol n_b)\!\cdot\boldsymbol u_b\,dS
-\oint_{\mathcal C_b}
\gamma\boldsymbol m\!\cdot\boldsymbol u_b\,d\ell.}
\tag{10.1}
\]

对 C1，不要错误强求“流体界面功+刚体功=0”；正确恒等式是

\[
\int_{\Gamma_b}
(\boldsymbol\sigma\boldsymbol n_f)\!\cdot\boldsymbol u\,dS
+P_h=-\mathcal D_{\rm slip},
\tag{10.2}
\]

并在接触线上另有式 (6.15d)。非匹配网格上，速度插值和牵引转移应使用一对代数共轭算子保证式 (10.1)–(10.2)；单独保证“节点力总和相等”不足以保功。

---

## 11. 守恒恒等式与验证阶梯

### 11.1 每一步都要输出的残差

1. **液体体积/质量残差**
   \[
   R_V(t)=
   \frac{d|\Omega_f|}{dt}
   +\int_{\Gamma_{\rm in}\cup\Gamma_{\rm out}}
   \boldsymbol u\!\cdot\boldsymbol n_f\,dS=0.
   \tag{11.1}
   \]
   对离散时间区间积分，不要用差分噪声很大的瞬时导数伪造残差。

2. **自由面运动学残差**
   \[
   R_\Gamma=
   \| (\boldsymbol w-\boldsymbol u)\!\cdot\boldsymbol n\|_{\Gamma}
   \quad\text{或}\quad
   \|\partial_tF+\boldsymbol u\!\cdot\nabla F\|.
   \tag{11.2}
   \]

3. **流固运动学/滑移/功率残差**
   \[
   R_{u,b}^{C0}=\|\boldsymbol u-\boldsymbol u_b\|_{\Gamma_b},
   \qquad
   R_{n,b}^{C1}=\| (\boldsymbol u-\boldsymbol u_b)
   \!\cdot\boldsymbol n_b\|_{\Gamma_b},
   \tag{11.3a}
   \]
   \[
   R_{\rm Navier}^{C1}=
   \|\boldsymbol P_b\boldsymbol\sigma\boldsymbol n_b
   -\beta_s\boldsymbol u_{\rm rel,t}\|_{\Gamma_b},
   \qquad
   R_P=
   \left|\dot{\boldsymbol q}^{\mathsf T}\boldsymbol Q_f
   -P_h-P_\gamma\right|.
   \tag{11.3b}
   \]

   C1 还需输出接触线动力学残差

   \[
   R_{cl}=\left\|
   \gamma(\cos\theta_e-\cos\theta_d)
   -\zeta_{cl}V_{cl}
   \right\|_{\mathcal C_b},
   \tag{11.3c}
   \]

   或 C1a 滞后多值图的互补/活性集残差。

4. **约束残差和约束功**
   \[
   R_\Phi=\|\boldsymbol\Phi(\boldsymbol q)\|,
   \quad
   R_{\dot\Phi}=\|\boldsymbol G\dot{\boldsymbol q}\|,
   \quad
   R_\lambda=
   |\dot{\boldsymbol q}^{\mathsf T}
   \boldsymbol G^{\mathsf T}\boldsymbol\lambda|.
   \tag{11.4}
   \]

5. **离散能量缺陷**

   令 \(E_{\rm audit}=E_{\rm tot}\) 于 C0，\(E_{\rm audit}=E_{\rm tot}+E_{sg/sl}\) 于 C1；同时 C0 取 \(\mathcal D_{\rm slip}=\mathcal D_{cl}=0\)。则统一定义

   \[
   \begin{aligned}
   R_E^{n+1}={}&E_{\rm audit}^{n+1}-E_{\rm audit}^{n}
   -\int_{t^n}^{t^{n+1}}
   \bigl(P_o+P_{\gamma,o}+P_{\rm ext}
   -\mathcal D_\mu-\mathcal D_{\rm slip}
   -\mathcal D_s-\mathcal D_{cl}\bigr)dt .
   \end{aligned}
   \tag{11.5}
   \]
   有润湿、LES、稳定化或拓扑变化时，必须在右边明示加入各自的模型/数值耗散，不得把所有缺陷统称“物理黏性”。

### 11.2 独立动量与角动量检查

对任意固定惯性原点 \(O\)，运动液体控制体的动量定理给出

\[
\frac{d}{dt}\int_{\Omega_f}\rho\boldsymbol u\,dV
=\int_{\partial\Omega_f}
\left[
\boldsymbol\sigma\boldsymbol n_f
-\rho\boldsymbol u
((\boldsymbol u-\boldsymbol V_{\partial\Omega})
\!\cdot\boldsymbol n_f)
\right]dS
+\int_{\Omega_f}\rho\boldsymbol g\,dV.
\tag{11.6}
\]

物质自由面和湿润刚体面上对流项为零。将 \(\Gamma_b\) 牵引移到等式另一边，得到一个与式 (3.1) 独立的 \(\boldsymbol F_h\) 控制体估计。因为 Cauchy 应力对称，同理有

\[
\frac{d}{dt}\int_{\Omega_f}
\rho(\boldsymbol x-\boldsymbol O)\times\boldsymbol u\,dV
=\int_{\partial\Omega_f}
(\boldsymbol x-\boldsymbol O)\times
\left[
\boldsymbol\sigma\boldsymbol n_f
-\rho\boldsymbol u
((\boldsymbol u-\boldsymbol V_{\partial\Omega})
\!\cdot\boldsymbol n_f)
\right]dS
+\int_{\Omega_f}
\rho(\boldsymbol x-\boldsymbol O)\times\boldsymbol g\,dV.
\tag{11.7}
\]

式 (11.7) 提供与湿面力矩积分独立的角动量核验。不建议以移动质心为该控制体原点，因为那会引入额外输运项。

### 11.3 从单物理到端对端的验证阶梯

| 级别 | 必做问题 | 可核查量 |
|---|---|---|
| V0 程序代数 | 均匀流在任意移动 ALE 网格上的 GCL 测试 | 均匀解保持、单元体积与 \(J\) 更新 |
| V1 静力 | 静水+平自由面+固定部分浸没刚体 | \(p=\rho g(\eta-z)\)、浮力、零速度、零虚假流 |
| V2 毛细 | 球/圆柱 Laplace 压差；静态弯月面 | \(\Delta p=-\gamma\kappa\)、接触角、寄生流随网格收敛 |
| V3 线性波 | 有限水深小幅重力—毛细波 | \(\omega^2=(gk+\gamma k^3/\rho)\tanh(kH)\)和黏性衰减；黏性两相初值的经典解见 [Prosperetti (1981)](https://doi.org/10.1063/1.863522) |
| V4 刚体 | 真空/静水中无阻尼摆，再加已知线性阻尼 | 固有频率、指数衰减、\(P_\lambda=0\)、结构能量 |
| V5 单向圆柱 | 固定刚体的三维有限槽流 | 湿面力/力矩与式 (11.6)–(11.7) 的控制体结果相等 |
| V6 自由面大变形 | 断坝/液柱塌落 | 波前位置、液体体积和能量；经典原始实验见 [Martin & Moyce (1952)](https://doi.org/10.1098/rsta.1952.0006) |
| V7 弱 FSI | 大 \(m^*\)、小初始幅摆 | 网格/时间收敛；C0 的界面功相消，C1 的差值等于滑移/接触线耗散 |
| V8 强 FSI | \(m^*=O(1)\)、大幅横流振动 | 接口子迭代收敛、时步减半、式 (11.1)–(11.7) 全部残差 |
| V9 端对端 | 有限槽、真实入口、湿润分支和实验刚体 | 水位/速度/压力/载荷/位移的盲测，并同时关闭质量与功率账本 |

所有网格和时间收敛都必须对至少 \(\eta\)、\(\boldsymbol F_h\)、\(\boldsymbol M_h\)、主响应频率、相位、总能量缺陷和液体体积同时报告。只展示涡量云图或一条位移曲线不构成场模型验证。

---

## 12. 对后续降阶、实验和软件的冻结接口

### 12.1 连续场状态

\[
\mathcal X(t)=
\left\{
\Omega_f(t),\Gamma(t),\mathcal C_b(t),
\boldsymbol u(\boldsymbol x,t),p(\boldsymbol x,t),
\boldsymbol X_C,\boldsymbol R,
\boldsymbol U,\boldsymbol\omega,
\boldsymbol\lambda;
\quad
\theta_d,V_{cl},\mathcal A_{cl}
\ \text{(仅 C1)}
\right\},
\tag{12.1}
\]

其中 \(\mathcal A_{cl}\) 是 C1a 的钉扎/前进/后退接触线活性集。对动态润湿/两相/湍流升级，再附加相场/气相/子网格状态，不覆盖流体—刚体母变量。

### 12.2 高保真场输入

- 几何：\(\Omega_T,\mathcal B_0\)、支点/铰轴/质心、初始水深和浸没；
- 材料：\(\rho,\mu,\gamma,m_b,\boldsymbol J_{C0}\)、悬挂势和阻尼；
- 边界：\(\boldsymbol u_{\rm in}\)、\(\boldsymbol t_{\rm out}\)、入/出射自由面特征、润湿分支；
- 初值：\(\Gamma_0,\boldsymbol u_0,\boldsymbol q_0,\dot{\boldsymbol q}_0\)。

### 12.3 降阶只能匹配的场输出

- \(\boldsymbol F_h,\boldsymbol M_{C,h}\) 与 \(\boldsymbol F_\gamma,\boldsymbol M_{C,\gamma}\) 的分项时序；
- \(Q_i^f(t)\) 及功率 \(\sum_iQ_i^f\dot q_i\)；
- 自由面 \(\eta\) 或 \(\Gamma\)、表面能、接触线位置/接触角；
- 尾流三维速度/压力/涡量观测量；
- \(P_o,\mathcal D_\mu,\mathcal D_{\rm slip},\mathcal D_{cl},\mathcal D_s,E_{\rm audit},R_E,R_V\)，其中 C0 的滑移/线耗散为零。

任何 ROM 如果只拟合位移而不能重现广义流体功和能量流向，就不能宣称已从本母模型闭合。

### 12.4 F1 冻结前的明示待定项

1. 主 canonical 拓扑已选为第 4.2 节的固定顺流轴1DOF刚性旋转摆，圆柱随刚性总成倾斜；F0 仍需写死 \(\ell_t,\ell_b,\ell_C,I_P\) 和支点坐标。保持圆柱竖直的四杆/导轨平移是对照拓扑，不与 canonical 混用。
2. 要由快照/高速视频决定 \(\mathcal C_b,\mathcal C_w\) 是钉扎、滞后切换还是连续滑移。
3. 要由水面破碎/夹气证据决定 G0 单相还是 G1/G2 两相。
4. 要由 \(Re\)、入口湍流统计和网格资源决定 DNS/LES/URANS；不可先贴“DNS”标签再选网格。
5. 入/出口物理装置（泵、整流段、溢流堰/回水段）必须决定特征边界和 \(P_o\) 的实验可观测形式。

---

## 13. 一级/经典原始来源索引

> 本表只列原始论文或经典原始作品，不以二手综述支撑关键方法归属。基本场方程和功率恒等式已在上文独立推导，文献用于源流、数值分支与经典验证的可追溯性。

1. Young, T. (1805). *An Essay on the Cohesion of Fluids*. **Philosophical Transactions of the Royal Society of London**, 95, 65–87. [DOI](https://doi.org/10.1098/rstl.1805.0005).
2. Hirt, C. W., Amsden, A. A. & Cook, J. L. (1974). *An Arbitrary Lagrangian–Eulerian Computing Method for All Flow Speeds*. **Journal of Computational Physics**, 14, 227–253. [DOI](https://doi.org/10.1016/0021-9991(74)90051-5).
3. Thomas, P. D. & Lombard, C. K. (1979). *Geometric Conservation Law and Its Application to Flow Computations on Moving Grids*. **AIAA Journal**, 17, 1030–1037. [DOI](https://doi.org/10.2514/3.61273).
4. Hirt, C. W. & Nichols, B. D. (1981). *Volume of Fluid (VOF) Method for the Dynamics of Free Boundaries*. **Journal of Computational Physics**, 39, 201–225. [DOI](https://doi.org/10.1016/0021-9991(81)90145-5).
5. Sussman, M., Smereka, P. & Osher, S. (1994). *A Level Set Approach for Computing Solutions to Incompressible Two-Phase Flow*. **Journal of Computational Physics**, 114, 146–159. [DOI](https://doi.org/10.1006/jcph.1994.1155).
6. Peskin, C. S. (1972). *Flow Patterns Around Heart Valves: A Numerical Method*. **Journal of Computational Physics**, 10, 252–271. [DOI](https://doi.org/10.1016/0021-9991(72)90065-4).
7. Brackbill, J. U., Kothe, D. B. & Zemach, C. (1992). *A Continuum Method for Modeling Surface Tension*. **Journal of Computational Physics**, 100, 335–354. [DOI](https://doi.org/10.1016/0021-9991(92)90240-Y).
8. Huh, C. & Scriven, L. E. (1971). *Hydrodynamic Model of Steady Movement of a Solid/Liquid/Fluid Contact Line*. **Journal of Colloid and Interface Science**, 35, 85–101. [DOI](https://doi.org/10.1016/0021-9797(71)90188-3).
9. Cox, R. G. (1986). *The Dynamics of the Spreading of Liquids on a Solid Surface. Part 1. Viscous Flow*. **Journal of Fluid Mechanics**, 168, 169–194. [DOI](https://doi.org/10.1017/S0022112086000332).
10. Jacqmin, D. (2000). *Contact-line Dynamics of a Diffuse Fluid Interface*. **Journal of Fluid Mechanics**, 402, 57–88. [DOI](https://doi.org/10.1017/S0022112099006874).
11. Causin, P., Gerbeau, J.-F. & Nobile, F. (2005). *Added-mass Effect in the Design of Partitioned Algorithms for Fluid–Structure Problems*. **Computer Methods in Applied Mechanics and Engineering**, 194, 4506–4527. [DOI](https://doi.org/10.1016/j.cma.2004.12.005).
12. Matthies, H. G. & Steindorf, J. (2003). *Partitioned Strong Coupling Algorithms for Fluid–Structure Interaction*. **Computers & Structures**, 81, 805–812. [DOI](https://doi.org/10.1016/S0045-7949(02)00409-1).
13. Prosperetti, A. (1981). *Motion of Two Superposed Viscous Fluids*. **Physics of Fluids**, 24, 1217–1223. [DOI](https://doi.org/10.1063/1.863522).
14. Martin, J. C. & Moyce, W. J. (1952). *An Experimental Study of the Collapse of Liquid Columns on a Rigid Horizontal Plane*. **Philosophical Transactions of the Royal Society A**, 244, 312–324. [DOI](https://doi.org/10.1098/rsta.1952.0006).
15. Germano, M., Piomelli, U., Moin, P. & Cabot, W. H. (1991). *A Dynamic Subgrid-scale Eddy Viscosity Model*. **Physics of Fluids A**, 3, 1760–1765. [DOI](https://doi.org/10.1063/1.857955).

---

## 14. F1 自审结论

- [x] 三维有限水槽、液体域、刚体域、自由面、入口、出口、壁/底、湿润刚体面和接触线已分开定义。
- [x] ALE 不可压 Navier–Stokes、自由面运动学/动力学、重力、表面张力和入/出口条件已自洽给出。
- [x] 湿面应力合力/力矩、毛细线力、六自由度刚体与理想约束已连接。
- [x] 初值、压力定标、边界通量和几何相容性已声明。
- [x] 连续总能量恒等式明示包含进/出口功率、黏性耗散、结构阻尼、毛细边缘功率和约束零功。
- [x] 无量纲化给出了不重复的独立基、派生群和模型升级群，并列出奇异/正则极限。
- [x] 接触线、润湿、气相、湍流和界面拓扑的层级与失效域已分支。
- [x] 数值弱式、分区强耦合、保功映射、守恒残差和验证阶梯已给出。
- [x] 符号链已经两路独立交叉审读：\(\kappa=-\nabla_s\!\cdot\boldsymbol n\)、\(\boldsymbol n_b=-\boldsymbol n_f\)、式 (3.3)、(6.2)–(6.16) 和 (10.1)–(10.2) 的界面功/耗散符号一致；单自由度 \(\Pi\) 基已按审读意见保留 \(I_P^*\)。
- [ ] 还需由 F0 精确尺寸和第 8.1 节的材料水线观测选定 C0 或 C1；该实验未执行前，不宣称某一润湿分支已被实物验证。
