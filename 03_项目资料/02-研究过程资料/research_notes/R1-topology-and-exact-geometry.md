# R1：官方装置边界、悬挂拓扑与有限圆柱精确几何

> 状态：F0（题意/装置冻结）候选稿；仅冻结几何、拓扑、观测映射与事件语义，不冻结流体闭合或动力学系数。  
> 研究对象：IYPT 2027 Problem 13 **Vortex pendulum**。  
> 结论先行：**官方题面没有指定悬挂拓扑。本文主研究装置 `P0` 选为固定转轴平行来流、刚性圆柱总成绕该轴作一自由度横流旋转的摆；圆柱仅在平衡位严格竖直，离开平衡位会倾斜。**这一选择有一篇在悬挂拓扑与主运动学上高度同构、早于题面批准的开放实验论文，作为已搭建、可测角、可标定的可行先例；但它仍是研究者选择，不是官方事实，也不是对唯一性或最优性的证明。保持圆柱全过程竖直的平行四边形平移摆、单点球摆、双柔索及松弛分支均保留为显式变体，绝不与 `P0` 共用未经变换的几何或惯性公式。

---

## 0. 本文回答什么、不回答什么

本文只解决以下 F0 问题：

1. 官方题面和官方示意图究竟约束了什么；
2. 哪些装置细节是图示弱推断，哪些必须由研究者自行选择；
3. 主装置 `P0` 的自由度、坐标、有限圆柱实体、自由表面、槽壁和槽底如何无歧义定义；
4. “轴线浸没长度”“排水体积”“湿表面积”“迎流投影面积”为什么不是同一个量；
5. 入水、出水、碰壁、碰底、机械止挡和柔索松弛/重接如何定义为事件；
6. 理论状态如何映射到标记点、相机像素和可比较的实验量；
7. 所有公式是否通过量纲、极限和分段连续性检查。

本文不在此处冻结：

- Navier--Stokes/自由表面/湍流模型；
- 经验升阻力、尾流振子或附加质量闭合；
- 弹簧、轴承、结构阻尼的最终本构参数；
- VIV 起振、锁频或饱和振幅结论；
- 任何尚未运行的数值或实验验证。

因此，本文的“精确”只指：**在声明的刚体、平端圆柱、给定水槽边界和给定自由表面下，几何定义及其积分是精确的**；它不等于“自由表面永远平坦”或“真实流体已被精确求解”。

---

## 1. 一级证据与主张等级

### 1.1 官方来源

本稿核对了以下 IYPT 一级来源：

- [IYPT 2027 官方题目网页](https://iypt.org/iypt-2027-problems/)：页面注明 2026-07-14 经 IOC 批准；
- [IYPT 2027 最终版官方 PDF](https://iypt.org/wp-content/uploads/2026/07/IYPT-Problems-for-2027-final-edition-web.pdf)：该 PDF 无印刷页码，第 13 题位于 PDF 物理第 2 页（文件共 2 页）；
- [官方网页实际嵌入的第 13 题示意图](https://iypt.org/wp-content/uploads/2026/07/image-1.png)：原始 PNG 为 692 px × 351 px，HTML 未提供图题或替代文字。

2026-08-20 下载快照：官方 PDF 为 182,891 bytes，SHA-256 为
`772b1f1ed083b1d3d18745b9e0b16375d259a45ac58fbbb6331095c8b1f072ff`；官方 PNG 的 SHA-256 为
`76cfe3765a8bb1e8b91147e300779283234232d8ba31bb3d08af72dfd7a45aed`。

### 1.2 悬挂拓扑与主运动学高度同构的开放实验论文

同时完整审读并渲染核对了：

F. J. Huera-Huarte, “Energy harvesting from vortex-induced vibrations using a pendulum,” *Journal of Fluids and Structures* **140** (2026) 104449, [DOI: 10.1016/j.jfluidstructs.2025.104449](https://doi.org/10.1016/j.jfluidstructs.2025.104449)。该文为开放获取，文稿记录为 2025-03-04 收稿、2025-10-31 接收、2025-11-06 在线，早于 IYPT 题目在 2026-07 获批。2026-08-20 核对的本地开放版 PDF 共 10 个物理页，SHA-256 为 `a3ffb4d3816d2d2a76f4e6dbe92b1b795e4425a3b7a61bbee1745cc919760a45`。

该文第 2 节及图 1 展示了一个在悬挂拓扑与主运动学上与 `P0` 高度同构、并与官方最小约束相容的装置：

- 主轴由空气轴承支承，主轴平行来流；
- 圆柱与旋转总成刚性连接；
- 总成绕主轴作横流方向的一自由度转动；
- 圆柱平衡时竖直，并穿过自由表面进入水槽；
- 对称弹簧可调刚度；激光传感器测角，轴上可测制动力矩；
- 文中给出空气/水中自由衰减频率作为装置标定证据。

该文的摆锤作为 acrylic pipe 实现；论文不足以把其壁厚、开口/封端或局部接头细节等同于本文第 4.3 节为解析积分所选的“有限长度、平端实体”。因此文献证据仅迁移拓扑、主运动学和仪器化先例，不迁移未报告的端部/壁厚几何。

这篇论文足以证明“单轴刚性旋转摆”已有实际搭建、传感和标定的可行先例；单篇文献本身不证明该装置已被多实验室独立复现，更**不能**证明 IYPT 官方规定了这种拓扑。由于论文先于题面且两者异常相似，“IYPT 题目可能受该装置启发”是合理的来源假说，但当前没有官方归因，故只标为**未证推断**，不得写入官方事实栏。

本文不照抄该文的小角方程，也不沿用其无量纲式中可能由排版造成歧义的 Strouhal 表达；以下几何从有限圆柱实体与集合交独立推导。

### 1.3 主张标签

后文使用如下标签：

| 标签 | 含义 | 可以怎样写 |
|---|---|---|
| `O` | 官方题面明示 | 可写“官方要求/规定” |
| `G` | 官方示意图直接可见 | 只能写“图中画出” |
| `I` | 题面与图共同支持的弱推断 | 必须写“很可能/与……一致”，不得升级为规定 |
| `L` | 经核对的外部文献事实 | 必须给出处，不得升级为官方事实 |
| `C` | 本研究为 canonical 主装置作出的选择 | 必须允许替换为变体 |
| `V` | 显式变体 | 具有独立状态维数、约束和几何闭合 |
| `D` | 本文独立推导 | 需通过量纲、极限和数值基准审计 |

---

## 2. 官方题意冻结：硬约束与空白

### 2.1 官方硬约束 `O`

官方编号和题名是 **13. Vortex pendulum**，不是 “Eddies in a Can”，也不是电磁涡流制动摆。题面首句为：

> “A pendulum with a vertically oriented cylindrical bob is suspended above a channel of flowing water.”

其余题意可准确释义为：摆锤部分浸没时，水流**可能**使摆在垂直于流向的方向振荡；要求解释该现象并确定它对相关参数的依赖。由此得到的硬约束只有：

1. `O1`：对象是一个摆；
2. `O2`：摆锤是圆柱形，并具有竖直取向；
3. `O3`：摆悬置在流水通道上方；
4. `O4`：研究工况包含圆柱摆锤部分浸没；
5. `O5`：水流**可能**导致横流向振荡，官方没有断言任意参数下必振；
6. `O6`：研究目标是解释现象和相关参数依赖。

“vertically oriented”至少要求圆柱在装置定义/平衡构型中竖直。它究竟要求全过程保持竖直，还是只描述未偏转的基准姿态，题面没有进一步说明；两种读法都不能冒充唯一官方解释。

### 2.2 官方示意图 `G` 与弱推断 `I`

图中可直接观察到：

- 两条近似平行的长线围出直通区域；
- 两支同向箭头标注 `water flow`；
- 下游一侧有灰色近圆形轮廓，标注 `pendulum`；
- 旁边双向箭头与水流箭头在图面内正交；
- 没有支点、绳、杆、转轴、轴承、弹簧、侧视水面、槽底、尺寸线或比例尺。

该图**很可能**是俯视关系示意：竖直圆柱投影为近圆形，流向和横流响应均位于水平面内。这是 `I1`，因为官方没有写 `top view`。即使接受该推断，俯视投影仍无法区分“圆柱始终竖直”与“圆柱绕平行来流的轴小角倾斜”，更无法区分柔索、刚杆、球铰或四杆机构。

### 2.3 官方没有冻结的内容

下列内容全部必须由研究者选择或测量：

- 单点万向、单轴铰链、柔索、刚杆、平行四边形或直线导轨；
- 自由度数、顺流运动是否被约束、圆柱离开平衡位后是否倾斜；
- 转轴/支点位置、摆长、附着点、弹簧和阻尼器；
- 圆柱尺寸、壁厚、端部形状、材料、质量、质心和转动惯量；
- 水槽长度、宽度、深度、截面形状和上下游边界条件；
- 水面是否平坦、稳态、无波；来流是否均匀、层流或湍流；
- 初始浸没深度、底隙、壁隙和圆柱在槽宽方向的位置；
- 涡脱落形态、起振阈值、锁频区、幅值、频率和饱和机制；
- 记录方法和“摆角/位移/浸没长度”的观测定义。

因此 F0 必须同时保存两个字段：

```text
official_topology = unspecified
research_topology = P0_rigid_crossflow_rotary_pendulum
```

---

## 3. 拓扑比较与 canonical 决策

### 3.1 不同拓扑不是同一模型的“小改参数”

下列六类常见或有用的装置即使在小角下给出近似相同的横向轨迹，也具有不同的：

- 状态维数与约束反力；
- 圆柱姿态与各轴向站位速度；
- 自由表面截线、排水体积和浮心；
- 刚体惯性与水动力广义力矩；
- 松弛、碰撞和重接事件。

所以不能用一个 `pendulumLength`、一个 `submergedLength` 和一个 `bobMomentOfInertia` 在运行时暗中混合拓扑。

### 3.2 比较矩阵

| ID | 拓扑 | 理想最小 DOF | 圆柱姿态 | 与官方相容性 | 公开装置证据/实现性 | 主要代价 | 本文角色 |
|---|---|---:|---|---|---|---|---|
| `P0` | 固定轴平行来流，刚性总成横流旋转 | 1 | θ=0 竖直，θ≠0 倾斜 | 若“竖直取向”描述基准姿态，则完全相容；俯视图不能排除 | 有 Huera-Huarte 2026 同构实物、传感与衰减标定先例 | 倾斜水线、分布速度、转动惯量必须精确处理 | **canonical** |
| `V1` | 刚性平行四边形/双刚杆平移摆 | 1 | 全过程严格竖直 | 对“全过程竖直”的严格字面解释最强 | 刚性机构原则上可测，但为本文自行选择，未从官方图得到 | 多铰链摩擦、游隙、过约束；与 `P0` 惯性不同 | 关键控制变体 |
| `V2` | 只允许横流的柔索/刚杆平面摆，圆柱与臂共线 | 点质量或姿态闭合的刚杆1；单索有限刚体≥2 | 随摆角倾斜 | 与横流箭头相容 | 结构简单，但有限刚体姿态需额外闭合 | 柔索可松弛；若仅一点连接，有限刚体姿态并不自动闭合 | 旋转拓扑变体 |
| `V3` | 单点万向/球摆 | 点质量 2；有限刚体更多 | 共线时向 x、y 均倾斜；也可另加竖直导向 | 官方未排除 | 中低；顺流拖曳引入下游偏置和 2-DOF 耦合 | 单目不可充分识别；横流子空间通常不是自然不变子空间 | 2-DOF 对照 |
| `V4` | 双柔索“平行四边形” | 平面双绷紧 1；单索松 2；全松 3 | 仅在平面、等索长、等固定/运动端距、非交叉且双绷紧分支才保持竖直 | 官方未排除 | 依赖尺寸匹配、预张力和平面约束 | 单边张力、蠕变、扭转、冲击重接 | 混合系统变体 |
| `V5` | 竖直圆柱二维平移平台 | 2（x、y） | 全过程竖直 | 单有平移平台不满足 `O1` 的“摆”；需另加摆式悬挂才可变成官方对象 | 作为 VIV 平移扩展容易实现 | 研究的是 2-DOF 平移 VIV，不是单轴摆 | 非摆式扩展对照 |

### 3.3 选择 `P0` 作为 canonical 的理由

`P0` 不是因为官方指定，而是因为它同时满足：

1. **在“竖直取向描述基准/平衡姿态”的允许读法下与题面相容**：平衡位是竖直圆柱，运动为横流，转轴反力承受平均顺流拖曳；若把官方文字严格解释为“全过程必须竖直”，则应选 `V1` 而不是 `P0`；
2. **有直接公开装置先例**：开放论文已展示同构装置、空气轴承、弹簧调频、激光测角、轴上测矩和空气/水中衰减标定；
3. **状态闭合**：一个角度即可确定整个刚体位姿，不需要假装单根柔索能保持有限圆柱姿态；
4. **实验可辨识**：编码器或单侧视相机即可测 θ，并可用扭矩传感器形成独立逆动力学核验；
5. **物理机制干净**：平均顺流力不引入第二摆向自由度，横流 VIV 与摆式回复/调频可分层研究；
6. **变体关系清楚**：将 `V1` 作为“始终竖直”的严格控制装置，可直接检验圆柱倾斜和轴向速度梯度的影响。

选择 `P0` 的代价是不能再使用“竖直圆柱整体平移”的简化浸没式。本文后续给出有限半径倾斜圆柱的精确集合和积分，正面承担这项代价。

---

## 4. `P0` 的坐标、广义坐标和刚体位姿

### 4.1 实验室坐标系

取固定于水槽的右手坐标系

$$
\mathcal F_W=(O_W,\mathbf e_x,\mathbf e_y,\mathbf e_z),
$$

其中：

- $\mathbf e_x$：平均来流方向（下游为正）；
- $\mathbf e_y$：横流方向；
- $\mathbf e_z$：竖直向上；
- 重力 $\mathbf g=-g\mathbf e_z$；
- 名义平水面取 $z=\eta_0$，可进一步令 $\eta_0=0$，但数据中必须保存原始测量值。

固定主转轴为

$$
\mathcal A_O=\{\mathbf O+\lambda\mathbf e_x:\lambda\in\mathbb R\},
$$

其中 $\mathbf O=(O_x,O_y,O_z)$ 是轴线上选定参考点。理想 `P0` 规定主轴**平行** $\mathbf e_x$；实物轴线的微小偏差必须作为标定量，而不是偷偷并入阻尼。

### 4.2 唯一广义坐标与符号

定义摆角 $\theta$ 为绕 $+\mathbf e_x$ 的右手转角，并规定

$$
\mathbf d(\theta)
=\sin\theta\,\mathbf e_y-\cos\theta\,\mathbf e_z,
$$

其中 $\mathbf d$ 从主轴指向圆柱下方。于是：

$$
\mathbf d(0)=-\mathbf e_z,
\qquad
\frac{\partial\mathbf d}{\partial\theta}
=\mathbf t(\theta)
=\cos\theta\,\mathbf e_y+\sin\theta\,\mathbf e_z.
$$

$\{\mathbf e_x,\mathbf t,-\mathbf d\}$ 是右手正交基。刚体姿态为

$$
\mathbf R_{WB}(\theta)=\mathbf R_x(\theta),
\qquad
\boldsymbol\Omega=\dot\theta\,\mathbf e_x.
$$

主运动区间由机械止挡限定为

$$
\theta_-<\theta<\theta_+,
\qquad
-\frac{\pi}{2}<\theta_-<0<\theta_+<\frac{\pi}{2}.
$$

这不是官方振幅限制，而是为了保持几何分支单值、避免过中心构型并在碰壁前停止。具体 $\theta_\pm$ 必须测量。

### 4.3 圆柱轴线、端点和实体

设圆柱为半径 $R=D/2$、长度 $L_c$ 的刚性平端直圆柱。用从主轴沿 $\mathbf d$ 的径向坐标 $r$ 表示轴向站位：

$$
r\in[\ell_t,\ell_b],
\qquad
0<\ell_t<\ell_b,
\qquad
\ell_b=\ell_t+L_c.
$$

这里：

- $\ell_t$：主轴到圆柱上端面中心的距离；
- $\ell_b$：主轴到圆柱下端面中心的距离；
- $r_c=(\ell_t+\ell_b)/2$：主轴到圆柱几何中心的距离。

轴线、上端中心、下端中心和几何中心分别为

$$
\Gamma_c(\theta)
=\{\mathbf O+r\mathbf d(\theta):r\in[\ell_t,\ell_b]\},
$$

$$
\mathbf E_t=\mathbf O+\ell_t\mathbf d,
\qquad
\mathbf E_b=\mathbf O+\ell_b\mathbf d,
\qquad
\mathbf C=\mathbf O+r_c\mathbf d.
$$

有限圆柱实体精确定义为

$$
\boxed{
\mathcal C(\theta)=
\left\{
\mathbf O+r\mathbf d
+u\mathbf e_x+v\mathbf t:
r\in[\ell_t,\ell_b],\;u^2+v^2\le R^2
\right\}.
}
$$

该定义同时包含圆柱侧面和两个平端盖。若实物是开口管、圆角端、端部封盖或带接头，必须以新的刚体集合替换，不能继续称此式为精确实物几何。

### 4.4 任意刚体点的运动学

对刚体系坐标为 $\mathbf r_i^B$ 的标记、质点或结构节点，

$$
\mathbf X_i(\theta)=\mathbf O+\mathbf R_x(\theta)\mathbf r_i^B,
$$

$$
\dot{\mathbf X}_i
=\dot\theta\,\mathbf e_x\times(\mathbf X_i-\mathbf O),
$$

$$
\ddot{\mathbf X}_i
=\ddot\theta\,\mathbf e_x\times(\mathbf X_i-\mathbf O)
+\dot\theta^2\mathbf e_x\times
\left[\mathbf e_x\times(\mathbf X_i-\mathbf O)\right].
$$

特别地，轴线上站位 $r$ 的速度为

$$
\dot{\mathbf X}_a(r)
=r\dot\theta
\left(\cos\theta\,\mathbf e_y+\sin\theta\,\mathbf e_z\right).
$$

所以沿圆柱轴的运动幅值和速度正比于 $r$：`P0` 不是“整根圆柱以单一横向速度平移”。

总成质心应独立定义为

$$
\mathbf G(\theta)=\mathbf O+\mathbf R_x(\theta)\mathbf r_G^B,
$$

其中 $\mathbf r_G^B$ 由称量/悬挂平衡确定。它不必等于圆柱几何中心，也不应与水动力中心或相机标记点合并。

---

## 5. 水槽、自由表面与流体域

### 5.1 canonical 水槽几何是研究者选择

官方只说 `channel`。为得到可计算、可复现实验边界，`P0` 选择直矩形开口水槽：

$$
\Omega_{\mathrm{tank}}=
\left\{
(x,y,z):
x_u<x<x_d,\;
y_-<y<y_+,\;
z_b<z
\right\}.
$$

定义：

- 工作段长度 $L_{\mathrm{ch}}=x_d-x_u$；
- 槽宽 $B=y_+-y_-$；居中槽取 $y_\pm=\pm B/2$；
- 名义水深 $H_0=\eta_0-z_b$；
- 入流面 $x=x_u$、出流面 $x=x_d$、侧壁 $y=y_\pm$、槽底 $z=z_b$。

若实物为非矩形槽，只需将固壁改为测得的边界曲面；不能把矩形槽当作官方要求。

### 5.2 动态自由表面：单值图面分支与一般隐式面

对无破碎、无翻卷、每个 $(x,y)$ 最多对应一个水面高度的工况，可把自由表面写成单值图面

$$
F(\mathbf X,t)=X_z-\eta(X_x,X_y,t)=0,
$$

水侧取 $F\le0$。排除圆柱后的瞬时流体域为

$$
\boxed{
\Omega_f(t)=
\left[
\Omega_{\mathrm{tank}}\cap\{F(\mathbf X,t)<0\}
\right]
\setminus\mathcal C(\theta(t)).
}
$$

名义平水面是特例

$$
\eta(x,y,t)=\eta_0.
$$

弯月面、表面波、液面倾斜和圆柱附近仍保持单值的局部变形可包含在 $\eta(x,y,t)$ 中。但 $\eta$ **不能**表示破波、翻卷、夹气或同一 $(x,y)$ 上多个界面高度。要覆盖这些高保真情形，应把 $F(\mathbf X,t)=0$ 直接视为一般隐式界面/level-set（仍约定水侧 $F\le0$），而不再要求 $F=X_z-\eta$。为使事件容差和 $\chi_\pm$ 具有统一量纲，数值接口应在界面邻域把 $F$ 归一化为长度值（优先使用符号距离）。第 5.3 节及第 9 节的集合和事件定义只依赖 $F$，对两种表示均适用。如果把水面变形忽略，必须把“平水面近似”写入模型层级，不能仍声称真实自由表面已精确处理。

### 5.3 精确湿实体、湿面和接触线

定义：

$$
\mathcal C_w(t)
=\mathcal C(\theta(t))\cap\{F(\mathbf X,t)\le0\},
$$

$$
\mathcal S_w(t)
=\partial\mathcal C(\theta(t))\cap\{F(\mathbf X,t)\le0\},
$$

$$
\mathcal L_f(t)
=\partial\mathcal C(\theta(t))\cap\{F(\mathbf X,t)=0\}.
$$

它们分别是湿实体、固液湿面和三相/水线接触线。对一般波动水面，圆柱轴上的湿集合

$$
I_{\mathrm{axis}}(t)
=\{r\in[\ell_t,\ell_b]:F(\mathbf O+r\mathbf d,t)\le0\}
$$

甚至可能由多个不相连区间组成，因此实现中应保存“集合/区间列表”，而不是无条件保存一个标量长度。

---

## 6. 平水面下有限倾斜圆柱的精确湿润几何

本节假定：自由表面为 $z=\eta_0$，$|\theta|<\pi/2$，圆柱为第 4.3 节平端实体。定义枢轴高出名义水面的高度

$$
h_O=O_z-\eta_0.
$$

### 6.1 中心轴水线与轴线湿润区间

轴线上站位 $r$ 的高度为

$$
z_a(r)=O_z-r\cos\theta.
$$

中心轴与水面的交点为

$$
\boxed{
r_f(\theta)=\frac{h_O}{\cos\theta}.
}
$$

于是

$$
I_{\mathrm{axis}}=
\begin{cases}
\varnothing,&r_f\ge\ell_b,\\[1mm]
[\max(\ell_t,r_f),\ell_b],&r_f<\ell_b,
\end{cases}
$$

$$
\boxed{
L_{\mathrm{axis}}(\theta)=
\operatorname{clip}
\left(\ell_b-\frac{h_O}{\cos\theta};0,L_c\right),
}
$$

其中

$$
\operatorname{clip}(x;0,L)=\min[L,\max(0,x)].
$$

这只是**中心轴**的湿长度，不自动等于湿侧面积长度、排水体积等效长度或迎流投影长度。

### 6.2 轴向站位的精确水下截面积

圆柱内部点

$$
\mathbf X(r,u,v)=
\mathbf O+r\mathbf d+u\mathbf e_x+v\mathbf t,
\qquad u^2+v^2\le R^2
$$

的高度为

$$
X_z=O_z-r\cos\theta+v\sin\theta.
$$

当 $\sin\theta\ne0$ 时，定义

$$
\xi(r,\theta)=
\frac{\eta_0-O_z+r\cos\theta}
{R|\sin\theta|}.
$$

再定义单位圆盘位于水平截线以下的面积比例

$$
\Phi(\xi)=
\begin{cases}
0,&\xi\le-1,\\[1mm]
\displaystyle
\frac12+\frac1\pi
\left[
\arcsin\xi+\xi\sqrt{1-\xi^2}
\right],&-1<\xi<1,\\[3mm]
1,&\xi\ge1.
\end{cases}
$$

则站位 $r$ 的精确水下横截面积为

$$
\boxed{
A_w(r,\theta)=\pi R^2\Phi[\xi(r,\theta)].
}
$$

在 $\theta=0$ 的竖直极限，应直接使用

$$
A_w(r,0)=
\pi R^2\,\mathbf 1_{\{r\ge h_O\}},
$$

而不是数值计算含 $|\sin\theta|$ 的 $0/0$ 形式。

### 6.3 排水体积、体积等效长度与浮心

精确排水体积和体积等效浸没长度为

$$
\boxed{
V_w(\theta)=
\int_{\ell_t}^{\ell_b}A_w(r,\theta)\,dr,
\qquad
L_V=\frac{V_w}{\pi R^2}.
}
$$

对部分截面 $|\xi|<1$，令

$$
\widehat{\mathbf v}
=\operatorname{sgn}(\sin\theta)\,\mathbf t,
$$

水下圆段关于截面中心、沿 $\widehat{\mathbf v}$ 的一阶面积矩为

$$
M_v(r)=-\frac{2R^3}{3}
\left[1-\xi(r)^2\right]^{3/2};
$$

在全干或全湿截面取 $M_v=0$。若 $V_w>0$，精确排水体积形心（静水浮心）为

$$
\boxed{
\mathbf C_B=
\frac1{V_w}
\int_{\ell_t}^{\ell_b}
\left[
(\mathbf O+r\mathbf d)A_w(r)
+\widehat{\mathbf v}M_v(r)
\right]dr.
}
$$

倾斜且部分浸没时，$\mathbf C_B$ 一般不在圆柱中心轴上。把浮力作用点直接设为“湿轴段中点”会漏掉横截面圆段偏心。
在 $\theta=0$ 时 $\widehat{\mathbf v}$ 无需定义；应显式取湿圆截面形心在轴上，或直接用 $\mathcal C_w$ 的三维体积定义。这一显式分支也避免数值上计算 $\operatorname{sgn}(0)$。

### 6.4 只切侧面的特殊闭式：体积相等但浮力矩不相等

取连续的截面坐标 $v\mathbf t$。平水面在给定 $v$ 上截得的轴向阈值为

$$
r_0(v)=\frac{h_O}{\cos\theta}+v\tan\theta.
$$

若整个水线过渡带只切圆柱侧面、既不触上端盖也不触下端盖，即

$$
\boxed{
\ell_t<\frac{h_O}{\cos\theta}-R|\tan\theta|,
\qquad
\frac{h_O}{\cos\theta}+R|\tan\theta|<\ell_b,
}
$$

则对每个截面点，水下轴向范围都是 $[r_0(v),\ell_b]$。由于圆截面一阶矩 $\int_Av\,dA=0$，有精确恒等式

$$
\boxed{
V_w
=\pi R^2
\left(\ell_b-\frac{h_O}{\cos\theta}\right)
=\pi R^2L_{\mathrm{axis}}.
}
$$

这说明：有限半径圆弓过渡在该特殊分支中**不修正总体积**。但它仍修正浮心与浮力矩。令

$$
I_\perp=\int_Av^2\,dA=\frac{\pi R^4}{4},
$$

$Q_B=\mathbf e_x\cdot[(\mathbf C_B-\mathbf O)\times(\rho gV_w\mathbf e_z)]$ 为浮力关于主轴的广义力矩。为避免“轴线近似”有多种含义，此处把 $Q_{B,\mathrm{axis}}$ **严格定义**为：用横截面积 $A=\pi R^2$ 的细长轴线柱代替真实圆柱，并把它的湿区取为 $[h_O/\cos\theta,\ell_b]$。因而

$$
Q_{B,\mathrm{axis}}
=\rho g\pi R^2\sin\theta
\int_{h_O/\cos\theta}^{\ell_b}r\,dr.
$$

则真实有限半径结果与这一细长轴线模型之差为

$$
\boxed{
Q_B-Q_{B,\mathrm{axis}}
=-\rho g I_\perp\sin\theta
\left(1+\frac12\tan^2\theta\right).
}
$$

若另外定义“截面中心模型”，保留真实 $A_w(r)$、但把每个水下圆弓的形心投到该站位的轴心，则

$$
Q_{B,\mathrm{cs}}
=\rho g\sin\theta
\int_{\ell_t}^{\ell_b}rA_w(r)\,dr,
\qquad
Q_B-Q_{B,\mathrm{cs}}
=-\rho gI_\perp\sin\theta.
$$

两种“轴线化”不可混同；前者额外丢掉了圆弓湿分数对轴向一阶矩的贡献，所以多出 $-\rho gI_\perp\sin\theta\tan^2\theta/2$ 一项。

小角极限为

$$
Q_B-Q_{B,\mathrm{axis}}
=-\rho gI_\perp\theta+O(\theta^3).
$$

两边单位均为 $\mathrm{N\,m}$。因此“体积恰好等于 $\pi R^2L_{\mathrm{axis}}$”绝不意味着“轴线上浮心/固定力臂也精确”。一旦水线带触及端盖或自由面不平，本节的特殊闭式失效，必须回到集合积分。动态压力不会改变已给自由面下的几何恒等式；它只意味着 $Q_B$ 仅是静水贡献，不能代替第 7 节的总流体力矩。

### 6.5 精确湿侧面、端盖与总湿面积

用在 $\theta=0$ 也连续有定义的 $\mathbf t(\theta)$ 和 $\mathbf e_x$ 参数化侧面：

$$
\mathbf X_s(r,\psi)=
\mathbf O+r\mathbf d
+R\left(
\cos\psi\,\mathbf t
+\sin\psi\,\mathbf e_x
\right).
$$

湿侧面站位集合为

$$
I_w(\psi)=
\left\{
r\in[\ell_t,\ell_b]:
O_z-r\cos\theta+R\sin\theta\cos\psi
\le\eta_0
\right\}.
$$

因此

$$
\boxed{
S_{\mathrm{lat},w}
=R\int_0^{2\pi}|I_w(\psi)|\,d\psi.
}
$$

上、下端盖湿面积分别为

$$
A_{t,w}=A_w(\ell_t),
\qquad
A_{b,w}=A_w(\ell_b),
$$

总湿面积与侧面积等效长度为

$$
\boxed{
S_w=S_{\mathrm{lat},w}+A_{t,w}+A_{b,w},
\qquad
L_S=\frac{S_{\mathrm{lat},w}}{2\pi R}.
}
$$

一般而言

$$
L_{\mathrm{axis}}\ne L_V\ne L_S.
$$

但在第 6.4 节的特殊 `side-only` 分支，对上式的每个周向母线直接积分得

$$
S_{\mathrm{lat},w}
=2\pi R
\left(\ell_b-\frac{h_O}{\cos\theta}\right),
\qquad
\boxed{L_S=L_V=L_{\mathrm{axis}}}.
$$

这一特殊长度恒等仍不能把湿面分布、浮心或力矩等同于细长轴线模型；离开 `side-only` 适用域后，三个长度一般不等。

### 6.6 沿来流方向的湿实体投影面积

平均来流沿 $\mathbf e_x$。对有限倾斜圆柱，湿实体在法向于来流的 $yz$ 平面上的精确正投影面积为

$$
\boxed{
A_{\perp x,w}=
\begin{cases}
\displaystyle
R\int_{\ell_t}^{\ell_b}
\left[
1+\operatorname{clip}(\xi(r);-1,1)
\right]dr,
&\sin\theta\ne0,\\[4mm]
DL_{\mathrm{axis}},&\theta=0.
\end{cases}
}
$$

全浸没时该式给出 $A_{\perp x}=2RL_c=DL_c$。在第 6.4 节的 `side-only` 分支，直接用 $r_0(v)$ 积分还有

$$
A_{\perp x,w}
=\int_{-R}^{R}[\ell_b-r_0(v)]\,dv
=2R\left(\ell_b-\frac{h_O}{\cos\theta}\right)
=DL_{\mathrm{axis}}.
$$

但当水线过渡带触及端盖时，$DL_{\mathrm{axis}}$ 一般不再是精确湿投影面积。显式 $\theta=0$ 分支避免在实现中调用未定义的 $\xi(r,0)$。

即使已知 $A_{\perp x,w}$，水侧牵引仍应由湿面应力积分获得，而完整两相界面力还需按第 7 节处理空气与毛细项；投影面积只是特定降阶系数的归一化选择。

---

## 7. 水动力参考点不能先验固定

先定义 $\mathbf n_s$ 为**从固体指向相邻流体的固体外法向**，$\boldsymbol\sigma_w$ 为水侧 Cauchy 应力。若压力以空间均匀大气压为表压零点，则水侧湿面牵引对圆柱的合力和主轴力矩为

$$
\mathbf F_h(t)=
\int_{\mathcal S_w}
\boldsymbol\sigma_w\mathbf n_s\,dA,
$$

$$
\boxed{
Q_h(t)=
\mathbf e_x\cdot
\int_{\mathcal S_w}
(\mathbf X-\mathbf O)
\times(\boldsymbol\sigma_w\mathbf n_s)\,dA.
}
$$

上式是**水侧湿面牵引项**，不能在未加声明时冒充完整两相界面总力。定义干面 $\mathcal S_{\mathrm{dry}}=\partial\mathcal C\cap\{F>0\}$，$\boldsymbol\sigma_a$ 为空气侧 Cauchy 应力。若不忽略空气动力和接触线毛细力，必须再加

$$
\mathbf F_{\mathrm{air}}
=\int_{\mathcal S_{\mathrm{dry}}}
\boldsymbol\sigma_a\mathbf n_s\,dA,
\qquad
\mathbf F_\gamma
=\int_{\mathcal L_f}\mathbf f_\gamma\,d\ell,
$$

以及它们对 $\mathbf O$ 的对应力矩；其中 $\mathbf f_\gamma$ 是由界面切向和动态接触角决定的单位长度毛细力。若两相求解器用弥散界面体力或毛细应力张量已包含该项，必须记录它归属的积分通道，避免重复计算。只有在显式声明“忽略空气黏性/动压与毛细线力，均匀大气压已用表压消去”的约化下，才可把上述 $\mathbf F_h,Q_h$ 称为该模型的总流体力与广义力。

对一自由度 `P0`，在所声明的界面力集合下，绕主轴的总力矩是唯一与 $\theta$ 共轭的流体广义力。所谓“水动力中心”只有在给定力分布后才可派生。例如，若某降阶模型定义横流线载荷 $f_y(r,t)$，且分母非零，可定义

$$
r_F(t)=
\frac{\int r f_y(r,t)\,dr}
{\int f_y(r,t)\,dr}.
$$

它是随时间、浸没和流态变化的派生量；在合力过零时发散。不能把 $r_F$、总成质心 $\mathbf G$、浮心 $\mathbf C_B$、圆柱中心 $\mathbf C$ 和相机标记点预先设为同一点。

---

## 8. 槽壁、槽底和端壁的精确间隙

### 8.1 有限圆柱支撑函数

对任意单位法向 $\mathbf m$，令

$$
\beta=\mathbf m\cdot\mathbf d.
$$

圆柱在 $\mathbf m$ 方向的支撑函数为

$$
\boxed{
h_{\mathcal C}(\mathbf m)=
\mathbf m\cdot\mathbf O
+\max(\ell_t\beta,\ell_b\beta)
+R\sqrt{1-\beta^2}.
}
$$

对允许半空间 $\mathbf m\cdot\mathbf X\le b$，非穿透间隙为

$$
\boxed{
g(\mathbf m,b)=b-h_{\mathcal C}(\mathbf m)\ge0.
}
$$

该式使用整个有限半径圆柱，而不是仅检查几何中心或轴端点。

### 8.2 矩形水槽各间隙

定义

$$
g_{y+}=y_+-h_{\mathcal C}(\mathbf e_y),
\qquad
g_{y-}=-y_--h_{\mathcal C}(-\mathbf e_y),
$$

$$
g_b=-z_b-h_{\mathcal C}(-\mathbf e_z),
$$

$$
g_{x+}=x_d-h_{\mathcal C}(\mathbf e_x),
\qquad
g_{x-}=-x_u-h_{\mathcal C}(-\mathbf e_x).
$$

在 $|\theta|<\pi/2$ 下，圆柱横向和竖向极值为

$$
y_{\max}=O_y+\max(\ell_t\sin\theta,\ell_b\sin\theta)
+R\cos\theta,
$$

$$
y_{\min}=O_y+\min(\ell_t\sin\theta,\ell_b\sin\theta)
-R\cos\theta,
$$

$$
\boxed{
z_{\min}=O_z-\ell_b\cos\theta-R|\sin\theta|,
}
$$

$$
\boxed{
z_{\max}=O_z-\ell_t\cos\theta+R|\sin\theta|.
}
$$

又因圆柱轴始终垂直来流轴 $\mathbf e_x$，

$$
x_{\min}=O_x-R,
\qquad
x_{\max}=O_x+R.
$$

所以碰底必须检查 $z_{\min}=z_b$，不能只检查下端轴点 $O_z-\ell_b\cos\theta$；倾斜时侧缘还向下伸出 $R|\sin\theta|$。

### 8.3 支撑点与接触法向

当 $0<|\beta|<1$ 时，达到 $h_{\mathcal C}(\mathbf m)$ 的一个支撑点为

$$
\boxed{
\mathbf X_*=\mathbf O+r_*\mathbf d
+R\frac{\mathbf m-\beta\mathbf d}
{\sqrt{1-\beta^2}},
}
$$

其中 $r_*=\ell_b$（$\beta>0$）或 $r_*=\ell_t$（$\beta<0$）。当 $\beta=0$ 时接触集合可能是一条侧面母线；当 $|\beta|=1$ 时接触集合可能位于端盖。事件算法必须允许这种非唯一支撑特征。

### 8.4 不得用“裁剪排水体积”掩盖实体穿墙

槽壁/槽底是刚性不可穿透边界，自由表面是流固界面。合法状态必须先满足所有 $g_i\ge0$，再计算湿实体。不能让圆柱穿进墙或底，再把穿透部分从 $V_w$ 中裁掉；那会把机械几何错误伪装成流体体积变化。

---

## 9. 事件函数、分支与数值语义

### 9.1 入水、出水、全浸没

对一般自由表面定义

$$
\chi_-(q,t)=\min_{\mathbf X\in\mathcal C(q)}F(\mathbf X,t),
\qquad
\chi_+(q,t)=\max_{\mathbf X\in\mathcal C(q)}F(\mathbf X,t).
$$

因 $F<0$ 表示水下，几何状态为

$$
\begin{array}{ll}
\text{完全出水：}&\chi_-\ge0,\\
\text{部分浸没：}&\chi_-<0<\chi_+,\\
\text{完全浸没：}&\chi_+\le0.
\end{array}
$$

平水面 `P0` 中，$\chi_-=z_{\min}-\eta_0$、$\chi_+=z_{\max}-\eta_0$，其中 $z_{\min},z_{\max}$ 见第 8.2 节。必须区分四个有方向事件：

| 事件 | 根条件 | 穿越方向 |
|---|---:|---:|
| 首次入水 | $\chi_-=0$ | $\dot\chi_-<0$ |
| 达到全浸没 | $\chi_+=0$ | $\dot\chi_+<0$ |
| 开始露出 | $\chi_+=0$ | $\dot\chi_+>0$ |
| 完全出水 | $\chi_-=0$ | $\dot\chi_->0$ |

因 $\chi_\pm$ 是对有限实体的 `min/max`，支撑特征切换时它们可能连续但不可微。表中 $\dot\chi_\pm$ 严格指**入射侧的单边时间方向导数**；若激活的支撑点不唯一，应用所有候选支撑特征的方向导数和根前/根后浸没分类判定。当 $\chi=0$ 且入射侧方向导数为零时，记为 `free_surface_grazing`；它是掠触候选，需用局部极值/根两侧分类区分“只接触不穿越”和高阶穿越，不得强制分到表中四个普通有向事件。

自由表面穿越本身不是刚体碰撞，不自动施加机械冲量。拍水、入水冲击、附加质量快速变化或通气/卷气必须由流体模型给出；不能在几何层随意设置一个恢复系数。

官方研究工况要求“部分浸没”。因此 canonical 数据窗口应满足

$$
\boxed{
\chi_-<0<\chi_+.
}
$$

如果一次运行越过全干或全浸边界，应保留事件和新分支数据，但必须另行标记，不能仍称整个运行都处于官方部分浸没工况。

### 9.2 碰壁、碰底与机械止挡

对任一刚性平面间隙 $g_i$，首次碰撞事件为

$$
g_i=0,
\qquad
\dot g_i^-<0.
$$

这里 $\dot g_i^-$ 同样是入射侧单边方向导数。支撑点切换下的非唯一方向导数必须联合候选接触特征处理；$g_i=0,\dot g_i^-=0$ 是 `rigid_contact_grazing`，不自动产生冲量。

持续无黏法向接触满足 Signorini 条件

$$
\boxed{
g_i\ge0,
\qquad
N_i\ge0,
\qquad
g_iN_i=0,
}
$$

其中 $N_i$ 是壁面对圆柱的法向压力大小。若需要冲击，必须另外给定恢复律并在接触点雅可比上求冲量。多个壁/底/止挡同时激活时，应联立求解活动集；顺序“先夹角度、再夹位置”会依赖人为次序并可能增能。

主轴机械止挡事件可写为

$$
g_{\theta+}=\theta_+-\theta,
\qquad
g_{\theta-}=\theta-\theta_-,
$$

且同样要求 $g_{\theta\pm}\ge0$。正常 VIV 研究应设计为在所有计划工况下都不触发止挡；止挡触发是装置超域，不是饱和振幅的可接受模型。

### 9.3 事件定位顺序

每一步应：

1. 在连续插值/高阶密集输出上定位当前步内最早的事件根；
2. 推进到根时刻而不是越过后裁剪；
3. 将容差内共时的所有刚性接触、止挡和绳重接放入同一活动集；
4. 更新浸没分类、接触集和约束集；
5. 从同一物理时刻继续积分；
6. 用步长减半检查事件时间和冲量/力矩收敛。

几何合法性验收至少要求

$$
g_i\ge-\varepsilon_g,
\qquad
\theta_- -\varepsilon_\theta
\le\theta\le
\theta_+ +\varepsilon_\theta.
$$

---

## 10. 弹簧、制动器和附属结构的几何接口

Huera-Huarte 装置使用对称弹簧调频，但官方没有要求弹簧。`P0` 将其定义为可开关、可标定的附属元件，而不是隐藏在“摆长”里。

### 10.1 任意离散弹簧的精确几何

第 $i$ 个弹簧固定端为世界点 $\mathbf a_i^W$，运动端在刚体系中的坐标为 $\mathbf b_i^B$。运动端、弹簧向量和长度为

$$
\mathbf B_i(\theta)=
\mathbf O+\mathbf R_x(\theta)\mathbf b_i^B,
$$

$$
\mathbf s_i(\theta)=\mathbf a_i^W-\mathbf B_i(\theta),
\qquad
\ell_i(\theta)=\|\mathbf s_i(\theta)\|.
$$

若为只能受拉的拉簧，几何张紧条件为

$$
\ell_i>\ell_{0i},
$$

其中 $\ell_{0i}$ 是无载长度。canonical 应通过预拉伸和机械止挡保证整个设计角域内所有弹簧持续张紧；若 $\ell_i=\ell_{0i}$，这是弹簧松弛事件，不能继续使用双边线性弹簧力。

对称布置应由实测坐标满足镜像关系，而不是只在代码中令两个刚度相等。精确回复力矩应由 $\mathbf a_i^W,\mathbf b_i^B,\ell_{0i}$ 和本构计算；小角近似 $2kd_1^2\theta$ 只能在其线性化条件通过后使用。

### 10.2 制动器/发电机

轴上制动器或发电机与主轴同轴，其几何只提供绕 $\mathbf e_x$ 的广义力矩。需要保存：

- 制动器轴线与 $\mathcal A_O$ 的同轴度；
- 扭矩传感器零点、正方向和传递链刚度；
- 联轴器扭转角是否可忽略；
- 目标点/编码器相对主轴的刚体系坐标；
- 制动器或电缆是否给出额外横向力/偏心矩。

若联轴器柔性不可忽略，制动器转角与摆角不再是同一个广义坐标，应升级为至少二自由度扭转系统。

### 10.3 非圆柱附属固体

主轴、型材、接头、传感靶和弹簧通常位于水面以上。它们仍应分别定义刚体系实体 $\mathcal B_j^B$，用

$$
\mathcal B_j^W(\theta)
=\mathbf O+\mathbf R_x(\theta)\mathcal B_j^B
$$

检查支架、槽壁和水面间隙。只有在证明 $\mathcal B_j^W$ 全程不入水、不碰撞且其气动力可忽略后，流体域才可只扣除圆柱 $\mathcal C$。

---

## 11. 观测点与相机映射

### 11.1 直接可测的几何量

canonical 建议至少设置：

- 主轴编码器：直接输出经零点和比例标定的 $\theta(t)$；
- 刚性目标点/激光靶：刚体系坐标 $\mathbf r_L^B$；
- 圆柱上端、下端附近各一组不对称标记；
- 独立扭矩传感器；
- 侧视相机，必要时加俯视相机检查出平面泄漏；
- 水位标记或自由表面重建通道。

轴端点和任意标记点为

$$
\mathbf E_t=\mathbf O+\ell_t\mathbf d,
\qquad
\mathbf E_b=\mathbf O+\ell_b\mathbf d,
$$

$$
\mathbf X_i=\mathbf O+\mathbf R_x(\theta)\mathbf r_i^B.
$$

由任一已知、位于主轴下方正径向一侧的轴向点

$$
\mathbf X_a-\mathbf O=r_a\mathbf d,
\qquad r_a>0,
$$

可反演

$$
\boxed{
\theta=
\operatorname{atan2}
\left[
(\mathbf X_a-\mathbf O)\cdot\mathbf e_y,
-(\mathbf X_a-\mathbf O)\cdot\mathbf e_z
\right].
}
$$

若允许带符号的 $r_a<0$，必须在反演前把 $\mathbf X_a-\mathbf O$ 除以 $r_a$ 的符号，否则 `atan2` 结果会相差 $\pi$。对本文圆柱轴段，第 4.3 节已冻结 $0<\ell_t<\ell_b$，因而两端中心均满足 $r_a>0$。

下端中心的横向位移和竖直升高为

$$
y_b-O_y=\ell_b\sin\theta,
\qquad
z_b^{\mathrm{cyl}}-(O_z-\ell_b)
=\ell_b(1-\cos\theta).
$$

圆柱中心、质心和激光靶使用各自的径向/偏心坐标；不能都写成同一个 $L\sin\theta$。

### 11.2 激光传感器

若传感器沿已标定方向 $\mathbf n_L$ 测量目标点的投影，可写

$$
s_L(t)=
\mathbf n_L\cdot
[\mathbf X_L(\theta(t))-\mathbf X_{L0}]
+b_L+\epsilon_L.
$$

真实三角测距传感器可能具有非线性、有限靶面和角度敏感性，应使用标定函数

$$
z_L=\mathcal H_L[\mathbf X_L(\theta),\mathbf R_x(\theta)]+\epsilon_L
$$

而不是默认 $z_L\propto\theta$。标定扫描必须覆盖正式实验的整个角域。

### 11.3 相机投影

第 $c$ 台相机具有内参 $\mathbf K_c$、外参 $(\mathbf R_{cW},\mathbf t_{cW})$ 和畸变模型 $\mathcal D_c$。世界点先变换为

$$
\mathbf X_c=
\mathbf R_{cW}\mathbf X+\mathbf t_{cW}
=(X_c,Y_c,Z_c)^T,
$$

令 $(x_n,y_n)=(X_c/Z_c,Y_c/Z_c)$，畸变后的归一化坐标为

$$
(x_d,y_d)=\mathcal D_c(x_n,y_n).
$$

再用齐次像素坐标投影：

$$
\boxed{
\widetilde{\mathbf p}_{ic}
\sim\mathbf K_c
\begin{bmatrix}x_d&y_d&1\end{bmatrix}^{T},
\qquad
\mathbf p_{ic}=(u_{ic},v_{ic})^T.
}
$$

实验原始观测应保存为

$$
\mathbf z_{ic}(t)=
\pi_c[\mathbf X_i(\theta(t))]
+\boldsymbol\epsilon_{ic},
$$

并优先在像素空间最小化重投影残差估计 $\theta$，保留像素协方差。若侧视相机光轴近似 $\mathbf e_x$，且已验证所有标记严格位于同一 $yz$ 平面，可使用该平面的单应性；高度变化的点不能套用俯视恒高平面的单应性。

通过玻璃和水观察水下标记/PIV 时，普通空气针孔模型通常不精确。应二选一：

1. 保存空气--玻璃--水界面、壁厚和折射率，做 Snell 射线追踪；
2. 在正式装水、水位和相机位置下，用位于实际测量平面的标定板得到有效映射，并明确它只对该平面有效。

### 11.4 `P0` 的可识别性与泄漏验收

严格一自由度 `P0` 在已标定侧视图中可由一个以上非退化标记识别。但每次实验还应利用第二视角或额外标记检查：

- 主轴是否真正平行来流；
- 圆柱是否有绕非 $x$ 轴的偏航/滚转；
- 圆柱相对轴的安装角是否漂移；
- 主轴/联轴器是否扭转；
- 顺流位移是否低于预先冻结的仪器分辨率相关阈值。

超阈值运行应标为“拓扑泄漏”，不能用更大的有效阻尼吸收。

### 11.5 水动力和 PIV 不是同一层观测

建议冻结四层数据：

1. **原始观测**：时间戳、像素、编码器计数、传感器电压、PIV 原始位移；
2. **几何反演**：$\hat\theta,\mathbf X_i,\eta,\mathcal L_f,V_w$ 及协方差；
3. **运动学派生**：$\dot\theta,\ddot\theta$，由约束轨迹平滑后求导；
4. **模型派生**：$Q_h,C_L$、附加质量、功率和能量，必须注明传感器/逆动力学/流体模型。

扭矩传感器测得的是传递链上的总矩；只有在扣除已标定的惯性、重力、浮力、弹簧、轴承和制动矩后，才能称余量为逆动力学流体矩。二维 PIV 也不能单独给出完整三维总力矩。

---

## 12. 显式拓扑变体

### 12.1 `V1`：刚性平行四边形，竖直圆柱平移摆

这是“圆柱全过程严格竖直”的主要控制变体。所有铰轴平行 $\mathbf e_x$。设固定基座两销轴

$$
\mathbf P_\pm=\mathbf P\pm\frac b2\mathbf e_z,
$$

移动基座两销轴

$$
\mathbf Q_\pm=\mathbf A\pm\frac b2\mathbf e_z,
$$

两根等长刚杆满足

$$
\mathbf Q_\pm-\mathbf P_\pm
=\ell\mathbf d(\theta).
$$

于是

$$
\boxed{
\mathbf A(\theta)=\mathbf P+\ell\mathbf d(\theta),
\qquad
\mathbf R_{WB}=\mathbf I.
}
$$

若圆柱中心位于 $\mathbf A-h_C\mathbf e_z$，则

$$
\mathbf C(\theta)=
\mathbf C(0)
+\ell\sin\theta\,\mathbf e_y
+\ell(1-\cos\theta)\,\mathbf e_z.
$$

整个圆柱只有平动，角速度为零；圆柱本体绕质心的转动惯量不进入其动能，但连杆会有转动惯量。平水面下的竖直圆柱湿长为

$$
\boxed{
L_w(\theta)=
\operatorname{clip}
[L_{w0}-\ell(1-\cos\theta);0,L_c].
}
$$

这正是现有原型 `submergedLength - pendulumLength*(1-cos theta)` 所对应的拓扑。它**不适用于 `P0`**。`P0` 的轴水线是 $h_O/\cos\theta$，并且有限半径截面会修正湿面和浮力矩。

`V1` 的优势是圆柱始终竖直、所有轴向站位横向速度相同；代价是多铰链摩擦、间隙、尺寸失配和过约束。数据中必须记录左右杆角差和载架倾角。

### 12.2 `V2`：横流平面摆

若用刚杆或始终张紧的柔索把连接点限制在 $yz$ 平面圆周上，点质量运动学与 `P0` 的轴向某点相似：

$$
\mathbf A=\mathbf P+\ell\mathbf d(\theta).
$$

但必须另行说明圆柱姿态：

- 与摆杆刚性共线：圆柱像 `P0` 一样倾斜；
- 由万向接头/导向机构保持竖直：浸没几何更像 `V1`；
- 仅用一根柔索连接有限刚体的一点：一个长度约束不足以确定刚体姿态，不能再用单一 $\theta$ 描述实物。

因此“平面摆”只规定质点轨迹，不自动冻结有限圆柱姿态。

### 12.3 `V3`：单点万向/球摆

张紧刚杆方向可用无奇异的切平面坐标 $(u,v)$ 表示：

$$
\mathbf d_s(u,v)=
u\mathbf e_x+v\mathbf e_y
-\sqrt{1-u^2-v^2}\,\mathbf e_z,
\qquad u^2+v^2<1.
$$

或在远离竖直奇点时使用

$$
\mathbf d_s(\vartheta,\varphi)=
\sin\vartheta\cos\varphi\,\mathbf e_x
+\sin\vartheta\sin\varphi\,\mathbf e_y
-\cos\vartheta\,\mathbf e_z.
$$

共线刚性圆柱可把第 4.3 节的 $\mathbf d(\theta)$ 替换为 $\mathbf d_s$。平均顺流拖曳会激发 $u$ 或造成下游静偏，所以横流平面 $u=0$ 通常不会自动保持，除非存在真实导向反力。球摆至少需要两个同步非共线视角或等价三维传感；单个侧视投影不能可靠区分顺流偏移和横流角。

### 12.4 `V4`：双柔索与松弛混合系统

对第 $i$ 条不可伸长、不能承压的柔索，固定端为 $\mathbf P_i$，刚体附着点为 $\mathbf Q_i(q)$，自然/最大长度为 $\ell_i$。定义

$$
g_i(q)=\ell_i-|\mathbf Q_i(q)-\mathbf P_i\|.
$$

允许域和张力互补条件为

$$
\boxed{
g_i\ge0,
\qquad
T_i\ge0,
\qquad
g_iT_i=0.
}
$$

- $g_i=0,T_i>0$：绷紧；
- $g_i>0,T_i=0$：松弛；
- 若强制等长求得 $T_i<0$：当前活动约束不物理，必须释放，不能把 $T_i$ 截零后仍保持等长。

在严格二维刚体中，两条独立绷紧索把 3 DOF 降到 1；一条松弛时变为 2 DOF；全松时为 3 DOF。在自由三维刚体中，两条长度约束只把 6 DOF 降到 4，绝不自动成为一自由度平行四边形。
即使在二维中，“双绷紧”也只说明自由度数，不自动说明圆柱竖直。要得到柔索平行四边形分支，还必须满足：两索等长，两固定端间距与两刚体附着点间距相等且方向匹配，运动保持在同一平面的非交叉装配分支，并且两条索的解算张力全程非负。任一条件失效都必须切换姿态/活动集，不得继续强制“竖直一自由度”。

松索重新拉直的事件为

$$
g_i=0,
\qquad
\dot g_i^-<0
$$

（距离正在增大）。理想无弹性捕获会产生速度冲量；有恢复时可能反弹回松弛侧。所有旧的绷紧索、刚性接触和新拉直索必须同时进入冲量活动集，否则会破坏已有速度约束。重接后只有在候选张力继续非负时，才可捕获为持续绷紧分支。

### 12.5 `V5`：竖直圆柱二维平移平台（非摆式扩展）

令圆柱参考点具有 $(X,Y)$ 两个水平平移 DOF、姿态固定 $\mathbf e_z$。它可独立研究顺流/横流耦合和下游静偏，同时避免圆柱倾斜。这是有价值的 2-DOF VIV 对照，但单有平移平台不满足官方 `O1` 的“摆”；若再加摆式悬挂，那是需重新定义约束的新拓扑。`V5` 不再是 `P0` 的一参数变体；其质量矩阵、水动力投影和观测必须单独实现。

---

## 13. canonical 参数与数据契约

### 13.1 必需几何参数

| 类别 | 参数 | 含义 | SI 单位 |
|---|---|---|---:|
| 坐标 | $\mathbf O$ | 主轴参考点 | m |
| 坐标 | $\mathbf e_x,\mathbf e_y,\mathbf e_z$ | 经标定的正交基 | 1 |
| 主轴 | 轴线方向误差 | 实测轴相对 $\mathbf e_x$ 的两小角 | rad |
| 角域 | $\theta_-,\theta_+$ | 机械止挡 | rad |
| 圆柱 | $R,D,L_c$ | 半径、直径、总长 | m |
| 圆柱 | $\ell_t,\ell_b$ | 主轴到上/下端中心距离 | m |
| 圆柱 | 端部类型 | 平端、开口、封盖或圆角的离散标签 | 1 |
| 质量 | $\mathbf r_G^B$ | 总成质心刚体系坐标 | m |
| 质量 | $\mathbf I_O^B$ | 总成关于主轴的惯量张量/标量 | kg·m² |
| 水槽 | $x_u,x_d,y_-,y_+,z_b$ | 工作段边界 | m |
| 水面 | $F(\mathbf X,t)$、$\eta_0$、$\eta(x,y,t)$ | 长度归一隐式面、名义水位及单值图面特例 | m |
| 弹簧 | $\mathbf a_i^W,\mathbf b_i^B,\ell_{0i}$ | 固定端、运动端、自由长度 | m |
| 标记 | $\mathbf r_i^B$ | 各标记刚体系坐标 | m |
| 相机 | $\mathbf K_c,\mathbf R_{cW},\mathbf t_{cW}$ | 内参和外参 | px、1、m |
| 折射 | 壁面、壁厚、$n_{\mathrm{air}},n_{\mathrm{glass}},n_{\mathrm{water}}$ | 水下成像几何 | m、1 |

圆柱材料密度、质量、粗糙度、弹簧刚度和流体性质不是纯几何量，但必须在相邻参数层保存。所有配置都应携带 `topology_id`；没有该字段的旧数据不得自动解释为 `P0`。

### 13.2 最小状态和派生几何输出

canonical 最小结构状态为

$$
X_s=(\theta,\dot\theta),
$$

但几何后端每个输出时刻至少应派生：

$$
\begin{aligned}
&\mathbf d,\mathbf t,\mathbf E_t,\mathbf E_b,\mathbf C,\mathbf G,\\
&I_{\mathrm{axis}},L_{\mathrm{axis}},V_w,L_V,S_{\mathrm{lat},w},L_S,
A_{\perp x,w},\mathbf C_B,\\
&\chi_-,\chi_+,g_{y+},g_{y-},g_b,g_{x+},g_{x-},
g_{\theta+},g_{\theta-},\\
&\mathbf X_i,\mathbf p_{ic},\text{event flags},\text{topology branch}.
\end{aligned}
$$

所有由归一化产生的“中心”都必须带有效位。特别地，生产 schema 至少实现

```text
C_B_valid = (V_w > V_tol)
C_B       = vector3  if C_B_valid
C_B       = null     otherwise
```

不得用零向量代表全干时不存在的浮心，也不得无声地将 `NaN` 传入动力学。同理，$\mathcal L_f$ 在无接触线时返回空集，轴线交点 $r_f$ 仅在所声明的平水面、$|\theta|<\pi/2$ 分支中有效；任何分母过零的派生水动力中心也必须返回 `valid=false`。

不得继续让一个名为 `submergedLength` 的标量同时驱动体积、湿面积、投影面积、浮心、附加质量和尾流耦合。

### 13.3 拓扑 ID 建议

```text
P0 = rigid-crossflow-rotary-pendulum
V1 = guided-parallelogram-vertical-translation
V2 = planar-link-or-taut-cable-pendulum
V3 = spherical-pendulum
V4 = dual-cable-hybrid-slack
V5 = vertical-cylinder-xy-translation-platform
```

拓扑切换必须改变配置 schema 或至少改变状态维数/约束类；不能只改一个布尔量而保留旧状态。

---

## 14. 量纲审计

| 量 | 量纲/单位 |
|---|---:|
| $x,y,z,h_O,R,D,L_c,\ell_t,\ell_b,r_f,g_i,F,\chi_\pm$ | m（$F$ 按第 5.2 节作长度归一） |
| $\theta,\xi,\Phi,\mathbf d,\mathbf t,\beta$ | 1（角以 rad 记录） |
| $A_w,A_{\perp x,w},S_w$ | m² |
| $V_w$ | m³ |
| $I_\perp=\pi R^4/4$ | m⁴ |
| $\rho gV_w$ | N |
| $\rho gI_\perp$ | N·m |
| $Q_h,Q_B$ | N·m |
| $\mathbf I_O$ | kg·m² |
| $\dot\theta,\ddot\theta$ | s⁻¹、s⁻² |
| $T_i,N_i$ | N |
| $\boldsymbol\sigma_w,\boldsymbol\sigma_a$ | Pa |
| $\mathbf f_\gamma$ | N·m⁻¹ |
| 接触/重接冲量 | N·s |

关键逐式检查：

1. $r_f=h_O/\cos\theta$：长度/无量纲，结果为长度；
2. $\xi=(\eta_0-O_z+r\cos\theta)/(R|\sin\theta|)$：长度/长度，无量纲；
3. $V_w=\int A_wdr$：m²·m=m³；
4. $M_v\sim R^3$：截面一阶面积矩为 m³；再乘 $dr$ 得体积一阶矩 m⁴；除 $V_w$ 得位置 m；
5. 支撑函数三项均为 m；
6. $Q_B-Q_{B,\mathrm{axis}}=\rho gI_\perp\times$无量纲：$(\mathrm{N/m^3})\mathrm{m^4}=\mathrm{N\,m}$；
7. $Q_h=\int r\times(\sigma n)dA$：m·Pa·m²=N·m。

---

## 15. 极限与对称性审计

### 15.1 竖直极限 $\theta\to0$

$$
\mathbf d\to-\mathbf e_z,
\qquad
r_f\to h_O,
$$

$$
L_{\mathrm{axis}}\to
\operatorname{clip}(\ell_b-h_O;0,L_c),
$$

$$
V_w\to\pi R^2L_{\mathrm{axis}}
$$

（水面不恰好经过端部的常规构型）。几何代码不得在 $\theta=0$ 因 $|\sin\theta|$ 分母产生 NaN。

### 15.2 小角水线与 `V1` 的区别

`P0` 的轴水线：

$$
r_f=h_O\sec\theta
=h_O+\frac12h_O\theta^2+O(\theta^4).
$$

`V1` 的整体升高：

$$
\Delta z=\ell(1-\cos\theta)
=\frac12\ell\theta^2+O(\theta^4).
$$

两者只有在额外巧合 $\ell=h_O$ 时才在二阶系数上相同，且湿面、速度分布和惯性仍不相同。因此小角相似不能证明拓扑等价。

### 15.3 细圆柱极限

在非退化水线下

$$
R\to0
\quad\Longrightarrow\quad
\frac{V_w}{\pi R^2}\to L_{\mathrm{axis}},
$$

横截面浮心偏移和 $I_\perp\sim R^4$ 力矩修正消失。

### 15.4 全干、全湿

$$
\chi_-\ge0
\Longrightarrow
V_w=S_w=A_{\perp x,w}=0,
$$

$$
\chi_+\le0
\Longrightarrow
V_w=\pi R^2L_c,
\quad
S_w=2\pi RL_c+2\pi R^2,
\quad
A_{\perp x,w}=DL_c.
$$

### 15.5 宽槽、深槽

$$
B\to\infty
\Longrightarrow
g_{y\pm}\to\infty,
$$

$$
z_b\to-\infty
\Longrightarrow
g_b\to\infty.
$$

远处壁/底不应改变未接触圆柱的纯几何排水体积。

### 15.6 左右反射

在 $O_y=(y_-+y_+)/2$、平水面和左右对称槽中：

$$
V_w(\theta)=V_w(-\theta),
$$

$$
g_{y+}(\theta)=g_{y-}(-\theta),
$$

而浮力广义矩为奇函数。若无不对称附属结构，纯几何代码违反这些关系即为实现错误。

### 15.7 近水平轴向构型

当 $|\theta|\to\pi/2$ 时，$r_f=h_O/\cos\theta$ 失去数值稳定性，轴线与水面近乎平行。物理集合 $\mathcal C_w=\mathcal C\cap\{F\le0\}$ 仍有定义，应回到集合/截面积积分。canonical 用机械止挡避开该区域；不能把解析交点发散误称为体积发散。

---

## 16. 分段连续性与非光滑性

圆段面积函数满足

$$
\Phi(-1)=0,
\qquad
\Phi(1)=1,
$$

$$
\Phi'(\xi)=
\frac{2}{\pi}\sqrt{1-\xi^2},
\qquad |\xi|<1.
$$

因此 $A_w$ 在干--部分--全湿截面切换处连续且一阶导数与常值分支相接；二阶导数可呈平方根奇异。由其积分得到的 $V_w$ 对常规平滑构型连续。

同时必须接受下列真实非光滑性：

- `clip` 保证 $L_{\mathrm{axis}}$ 在全干/全湿阈值连续，但在一般阈值处通常不可一阶微分（仅特殊退化切触才可能一阶相接而二阶不光滑）；
- $|\sin\theta|$ 和支撑函数的 `max` 在主导支撑特征切换处可能不可微，但间隙连续；
- $\chi_-$、$\chi_+$ 也是几何域上的 `min/max`，支撑特征切换时必须用第 9.1 节的单边方向导数与 grazing 语义；
- 湿侧面周角在圆弓端点的斜率可呈平方根奇异；
- 刚性接触、止挡和绳重接允许速度跳变，本来就是非光滑事件；
- 自由表面穿越不应被人为制造刚体速度跳变。

数值实现应检查：

1. $V_w$ 在首次入水、达到全浸、开始露出、完全出水时无有限跳变；
2. $\theta\to0^+$ 与 $\theta\to0^-$ 给出同一体积；
3. 解析圆段积分与三维体素/高阶求积在网格收敛下相符；
4. 所有合法时刻 $g_i\ge-\varepsilon_g$；
5. 柔索绷紧分支无 $T_i<-\varepsilon_T$；
6. 切换时位置连续，只有声明的冲击/重接允许速度跳变。

---

## 17. 几何验证基准与 F0 冻结门

### 17.1 必跑解析基准

几何后端至少通过：

1. **竖直半浸**：$\theta=0$，水线位于轴段内部，验证 $V_w=\pi R^2(\ell_b-h_O)$；
2. **全干/全湿**：验证体积、湿面积和投影面积端点；
3. **侧切闭式**：满足第 6.4 节端盖远离条件，同时验证
   $$
   V_w=\pi R^2\left(\ell_b-\frac{h_O}{\cos\theta}\right),
   \qquad
   L_S=L_V=L_{\mathrm{axis}},
   \qquad
   A_{\perp x,w}=DL_{\mathrm{axis}};
   $$
4. **浮力矩有限半径修正**：验证
   $$
   Q_B-Q_{B,\mathrm{axis}}
   =-\rho g\frac{\pi R^4}{4}\sin\theta
   \left(1+\frac12\tan^2\theta\right);
   $$
5. **端盖过渡**：水线带扫过上/下端盖，和三维独立积分比较；
6. **左右镜像**：$\theta\leftrightarrow-\theta$；
7. **支撑函数**：随机姿态与圆柱表面点云极值比较；
8. **事件收敛**：步长减半后入水/碰壁事件时刻收敛；
9. **像素重投影**：用合成 $\theta(t)$ 和相机参数反演，检查无偏及协方差覆盖。

2026-08-20 又用独立 SciPy 自适应积分复算一个 side-only 测例：

$$
R=0.03\ \mathrm{m},
\quad
(\ell_t,\ell_b,h_O)=(0.10,0.60,0.25)\ \mathrm{m},
\quad
\theta=0.30.
$$

数值积分与第 6.4 节闭式的绝对残差分别为 $1.084\times10^{-19}\ \mathrm{m^3}$（体积）和 $2.220\times10^{-16}\ \mathrm{N\,m}$（浮力矩）；$L_S-L_{\mathrm{axis}}$ 的残差为 $5.551\times10^{-17}\ \mathrm{m}$，$A_{\perp x,w}-DL_{\mathrm{axis}}$ 的残差在输出精度内为零。对该节单独定义的“截面中心模型”，$Q_B-Q_{B,\mathrm{cs}}=-\rho gI_\perp\sin\theta$ 的残差为 $3.847\times10^{-16}\ \mathrm{N\,m}$。随机 $10^4$ 组姿态/法向把解析支撑点代回支撑函数，最大恒等残差为 $2.220\times10^{-16}\ \mathrm{m}$。另一路项目脚本给出的不同测例残差为 $4.34\times10^{-19}\ \mathrm{m^3}$ 和 $3.41\times10^{-13}\ \mathrm{N\,m}$。这些只验证特殊静水平水面闭式和支撑函数恒等式，不等于端盖过渡、动态自由表面或完整 FSI 已验证。

### 17.2 F0 可冻结条件

只有同时满足以下条件，`P0` 才可进入后续场方程和生产 schema：

- [ ] 官方题面、官方图和研究者选择在论文中分栏；
- [ ] 实物确认主轴平行来流，正方向与 $\theta=0$ 已标定；
- [ ] $\mathbf O,R,L_c,\ell_t,\ell_b$、槽壁、槽底和水面坐标已实测；
- [ ] 总成质心、主轴惯量、弹簧端点和止挡已独立标定；
- [ ] 端部形状与解析有限圆柱假设一致，或已有替代几何；
- [ ] 计划角域内圆柱不碰壁/底/止挡，且附属结构不入水；
- [ ] 部分浸没工况域和越界事件已定义；
- [ ] 标记点/相机/折射/水位标定与协方差已冻结；
- [ ] `P0` 与 `V1`--`V5` 使用不同 `topology_id` 和状态接口；
- [ ] 第 17.1 节解析基准和独立积分实际通过；
- [ ] 后续论文不把 Huera-Huarte 同构证据写成 IYPT 官方来源说明。

### 17.3 当前仍未决、不得假装已冻结的项目

本稿已经冻结数学接口和主拓扑选择，但以下实物量尚无工作区内一级测量记录：

1. 实际圆柱是实心、封闭空心、开口管还是圆角/带接头端部；
2. $\mathbf O,R,L_c,\ell_t,\ell_b$、主轴倾斜误差及圆柱同轴度的实测值和不确定度；
3. 槽体是否严格矩形、工作段的 $x_u,x_d,y_\pm,z_b$ 及水位空间倾斜；
4. 正式装置是否采用弹簧、弹簧是否全程预张紧、是否安装制动器/发电机；
5. 计划角域能否同时满足部分浸没、侧/底/止挡净空和所有附属结构不入水；
6. 相机、折射界面、标记点和水位检测的最终布局；
7. 是否将 `V1` 制作为实物控制组，或只作为计算变体；
8. IYPT 出题是否确由 Huera-Huarte 装置启发；当前无官方归因，此项也不影响物理模型成立。

在这些项目完成前，可冻结 `P0` 的**符号、拓扑和通用几何**，但不能把任何示例尺寸、浸没率、壁面影响或量测精度写成已确认实物事实。

---

## 18. 对当前探索性原型的直接几何审计

当前原型尚不能视为任何已冻结拓扑：

1. `immersionGeometry()` 使用
   $$
   L_w=L_{w0}-L_p(1-\cos\theta)
   $$
   的裁剪式，这对应 `V1` 竖直圆柱平移摆；
2. 动能/惯性却把圆柱自身转动惯量加入关于主轴的有效惯量，更接近 `P0`；
3. 水动力把整根湿圆柱用一个横向速度和固定力臂表示，不符合 `P0` 沿 $r$ 线性变化的速度；
4. 可视化若只让圆柱旋转摆角的一小部分，既不是 `P0` 的刚性共转，也不是 `V1` 的零转角；
5. 配置没有 $\mathbf O,\ell_t,\ell_b$、轴线、端盖、水面、槽底和标记点坐标，无法重建精确实物。

这不是要求本 R1 文件修改代码；结论只是：**生产实现必须等待 F0--F3 冻结，且不能在旧字段上继续叠加互相矛盾的物理含义。**

---

## 19. 最终冻结声明

### 官方事实

IYPT 2027 第 13 题要求研究流水通道上方、部分浸没、竖直取向圆柱摆锤可能出现的横流振荡及其参数依赖。官方图表达流向与横流方向关系，但没有规定悬挂。

### canonical 研究选择

主装置冻结为：

```text
topology_id          = P0_rigid_crossflow_rotary_pendulum
motion_dof           = theta_about_fixed_x_axis
pivot_axis           = parallel_to_mean_flow
cylinder_attachment  = rigid_and_coaxial_with_radial_arm
cylinder_orientation = vertical_only_at_theta_zero
constraint_class     = bilateral_rigid_bearing
suspension_slack     = impossible_in_P0
free_surface         = implicit_F_for_HF; graph_eta_is_nonbreaking_branch; flat_eta0_is_reduction
solid_geometry       = finite_radius_finite_length_flat-ended_cylinder
```

### 显式变体

- `V1`：刚性平行四边形，圆柱全过程竖直；
- `V2`：横流平面杆/索摆，必须另定圆柱姿态；
- `V3`：单点万向球摆；
- `V4`：双柔索及松弛/重接混合系统；
- `V5`：竖直圆柱二维平移平台。

后续任何方程、仿真、实验数据或图都必须携带拓扑 ID。若实物最终采用 `V1` 或柔索装置，应切换整套几何与状态，不得只改参数名。

---

## 参考来源

1. International Young Physicists' Tournament, [IYPT 2027 Problems](https://iypt.org/iypt-2027-problems/), approved by the IOC on 14 July 2026.
2. International Young Physicists' Tournament, [IYPT Problems for 2027, final edition](https://iypt.org/wp-content/uploads/2026/07/IYPT-Problems-for-2027-final-edition-web.pdf), Problem 13, physical PDF page 2 of 2 (the PDF has no printed page number).
3. International Young Physicists' Tournament, [official embedded schematic for Problem 13](https://iypt.org/wp-content/uploads/2026/07/image-1.png).
4. F. J. Huera-Huarte, “Energy harvesting from vortex-induced vibrations using a pendulum,” *Journal of Fluids and Structures* **140** (2026) 104449, [https://doi.org/10.1016/j.jfluidstructs.2025.104449](https://doi.org/10.1016/j.jfluidstructs.2025.104449).
