# REV-A：几何—变分力学—自由表面 FSI 独立审稿

> 审稿角色：REV-A，独立于作者自审。  
> 审稿日期：2026-08-20（Asia/Singapore）。  
> 审稿对象：R1 精确拓扑/几何、R2 精确变分力学、R2 三维自由表面 FSI 及两份几何核验脚本。  
> 判定口径：只承认可重算的解析推导、实际执行输出或可定位的文件证据；作者勾选、自称“冻结/通过”、图像看似合理均不单独构成通过证据。

## 0. 结论先行

本轮没有发现会立即把主坐标、静水浮力、Cauchy 牵引、毛细曲率或连续能量整体反号的 **Critical** 错误。有限半径平水面湿几何、静水势/力矩、P0 质量惯量、S1 单索张力与冲量、配置依赖加入惯量、自由面曲率、Navier 滑移耗散、毛细线力及 C0/C1 连续能量的核心符号链，通过了独立推导或临时数值核验。

但当前快照**不能通过 F0/F1/F3 冻结门，也不能称为完整场模型或端到端验证已通过**。主要阻断项是：

1. C1 单体弱式把切向试空间又写回 C0 的全无滑条件，无法推出文中宣称的滑移耗散；
2. 开边界和自由面截断线仍是原则说明，不是唯一可计算的边界算子；
3. 完整刚性总成的质量实体与实际排液/受牵引实体在三份文档间没有使用不同类型和参考点；
4. 动态自由面下的静水分裂没有把“参考湿面”和“实际湿面”的差集修正写成代数恒等式；
5. F0 的候选状态、未勾选实测门与“最终冻结/主装置冻结”的发布语义冲突；
6. 现有脚本和 prose 运行记录不足以构成 fail-closed、可重放的完整几何验证包；
7. 观测算子的核心投影顺序正确，但一般界面状态、曝光积分、可见性和折射尚未闭合；
8. S2/多约束共时冲量只给活动集原则，尚无唯一的联合冲量—恢复—捕获契约。

因此本轮判定为：

| 级别 | 数量 | 冻结含义 |
|---|---:|---|
| Critical | 0 | 未发现主符号链的灾难性反号；不等于全文通过 |
| Major | 8 | 全部关闭前不得宣称 F0/F1/F3 已冻结 |
| Minor | 4 | 应随 Major 修订一并关闭 |
| Verified | 10 组 | 只对列明公式、适用域和本轮证据成立 |

## 1. 审稿输入、快照与证据等级

### 1.1 完整阅读的输入

| 输入 | 审稿快照 SHA-256 | 说明 |
|---|---|---|
| `/home/cjt/竞赛物理研究四层通用框架与统一计算平台需求说明.md` | `e4c622f6a236642ce6c8eb94f8ad45097f268b016919bb0d1965108cfa23918e` | 原始四层需求与可降级高保真条款 |
| `WORKLOG.md` | `95e88191590cf76674a63bb164acdb7365d53211a7e622b2ff547c2e0ea94980` | 冻结门、禁止性声明、运行记录 |
| `research_notes/R1-topology-and-exact-geometry.md` | `35194d3b599b4fb82764f1a10c4236c5ca605de006003f96c5e1b17c10d526d4` | 1707 行、60124 B；作者回报并由 REV-A 复核的冻结快照 |
| `research_notes/R2-exact-variational-mechanics.md` | `1e7e58ee20baf03c4a26c1731af789fef30b0625fe770c6e0ff1c809612e22ba` | 1423 行、58115 B；作者回报并由 REV-A 复核的冻结快照 |
| `research_notes/R2-continuum-free-surface-FSI.md` | `051ca3d103e6d998798309838fea0486d2c63eec873fe21f5275b959a2e693dd` | 1351 行；本轮 continuum 审计快照 |
| `research_notebooks/check_exact_geometry.py` | `066c4c1a29e450edbf7d999744c208eb1b72b52bcb396d9f73a54b15816ed380` | 242 行 |
| `research_notebooks/plot_exact_hydrostatics.py` | `ac8bb7614cbc47072fa0f1fcdce4aae67fc1b5aa6f361668c86eca5965dc3d22` | 365 行 |

审稿期间 R1 与 mechanics 曾被作者并发修改。REV-A 没有把旧快照结论直接搬到新稿：R1 与 mechanics 均按上表最终哈希重核了受影响段；continuum 与两份脚本在审阅期间哈希稳定。

### 1.2 本报告的证据标签

- `A-ALG`：REV-A 从定义重新推导，未引用作者“自审通过”结论；
- `A-NUM`：REV-A 在 `/tmp` 或标准输入中临时执行的符号/数值核验，没有写入工作区；
- `P-RUN`：项目脚本实际运行或既有 artifact 的可复核输出，只证明脚本实际覆盖的内容；
- `DOC`：文档中的定义、式号、状态或未执行声明；
- `NOT-RUN`：本轮和工作区均没有实际运行证据，不能标为通过。

### 1.3 本轮实际执行的独立核验摘要

1. SymPy 直接微分静水闭式并执行 Euler–Lagrange：

   ```text
   hydro_Q_residual = 0
   hydro_K_residual = 0
   added_inertia_EL = Ia(q)*qdd + Ia'(q)*qdot^2/2
   ```

2. S1 在 1000 组随机正定质量/惯量和姿态样本上重算张力与冲量：

   ```text
   max acceleration-constraint residual = 1.599e-14
   min D_T                              = 3.390e-01
   max restitution residual            = 1.776e-15
   max impulse-energy residual          = 1.105e-14
   ```

3. 用 $2^{21}$ 个 Sobol 体积分点独立比较三维有限圆柱与一维圆弓积分，覆盖
   $\theta=\pm0.55,\pm0.21,\pm0.02,0$：体积最大绝对差约
   $7.95\times10^{-8}\,\mathrm{m^3}$，横向一阶体积矩最大绝对差约
   $1.15\times10^{-8}\,\mathrm{m^4}$。该误差与本次 QMC 分辨率一致；端盖拓扑根两侧
   $\pm10^{-6}$ 的抽查没有有限跳变。

4. 10000 组随机单位法向/姿态的支撑函数见证点：解析见证点与支撑值最大残差
   $1.332\times10^{-15}\,\mathrm m$；随机表面样本没有超过解析支撑值，最接近差为
   $-6.335\times10^{-6}\,\mathrm m$。

5. 随机向量核验 Navier 界面功、动态接触线能量和球面 Laplace 压差：

   ```text
   Navier interface-power residual = 2.842e-14
   contact-line energy residual     = 1.110e-16
   sphere traction residual         = 0 Pa
   ```

6. 以 `PYTHONDONTWRITEBYTECODE=1 python3 -B research_notebooks/check_exact_geometry.py`
   实际运行，退出码为 0 并输出 `PASS`。这只是 `P-RUN`：它不升级为独立流体、端盖、事件、相机或实验验证。

## 2. Critical

### REV-A-C00 — 未发现 Critical，但冻结门仍未通过

在指定重点式中，没有发现如下灾难性错误：坐标旋向整体颠倒、固/液法向互换、浮力势与浮力矩互相同号、球面 Laplace 压差反号、Navier 滑移变成正反馈、毛细线力与自由面边缘功同号相加，或加入惯量 Christoffel 项破坏动能导数。

这项结论只排除已审公式中的 Critical 反号。它**不能替代** Major 修订、REV-B、解析回归、三维求解器验证或完整实验运行。

## 3. Major

### REV-A-M01 — C1 单体弱式的试空间与 Navier 耗散不相容

**位置**：`R2-continuum-free-surface-FSI.md` 式 (2.11)–(2.12)、式 (9.3) 以及第 9.2 节，特别是 1053–1081 行。

**问题**：分区流体子问题中的式 (9.3)

$$
\int_{\Gamma_b}\beta_s\boldsymbol u_{\rm rel,t}\cdot
\boldsymbol P_b\boldsymbol v\,\mathrm dS
$$

放在流体弱式左侧，符号正确。但第 9.2 节随后把单体试函数迹统一写成

$$
\boldsymbol v|_{\Gamma_b}=\delta\boldsymbol u_b,
$$

这是 C0 的全速度相等条件；C1 只允许法向匹配。若照文实现，切向空间会静默退化为无滑，或刚体侧漏掉 Robin 反力，因而不能从已写弱式推出文中声称的
$-\mathcal D_{\rm slip}$。

**必须修复**：对 C1 明确使用成对试空间

$$
(\boldsymbol v-\delta\boldsymbol u_b)\cdot\boldsymbol n_b=0
\quad\text{on }\Gamma_b,
$$

并在合并后的流体—刚体残量左侧写入同一积分点、同一法向、同一投影下的成对 Robin 项

$$
\boxed{
\int_{\Gamma_b}\beta_s\boldsymbol u_{\rm rel,t}\cdot
\boldsymbol P_b(\boldsymbol v-\delta\boldsymbol u_b)\,\mathrm dS.}
\tag{REV-A-1}
$$

取能量试函数 $\boldsymbol v=\boldsymbol u$、
$\delta\boldsymbol u_b=\boldsymbol u_b$ 后，式 (REV-A-1) 必须给出

$$
\int_{\Gamma_b}\beta_s|\boldsymbol u_{\rm rel,t}|^2\,\mathrm dS
=\mathcal D_{\rm slip}\ge0
$$

位于残量左侧，等价于总能量右侧的 $-\mathcal D_{\rm slip}$。C0 则单独使用
$\boldsymbol v=\delta\boldsymbol u_b$ 的全迹匹配，不能共享 C1 试空间。

**关闭证据**：至少增加一个单体离散测试，构造非零纯切向滑移，验证法向残差为零、流体与刚体切向力大小相等方向相反、接口功差等于
$-\mathcal D_{\rm slip}$，并随网格/时间步收敛。

**不接受的替代证明**：只重跑 C0、只画速度云图、只验证合力相等、或引用连续能量式 (6.16)；这些都不能证明 C1 离散试空间正确。

### REV-A-M02 — 开边界和自由面截断线尚未形成唯一、能量可验收的算子

**位置**：`R2-continuum-free-surface-FSI.md` 式 (2.8a)–(2.9)、式 (6.3)、式 (6.9)、式 (9.1)–(9.2)、第 12.4 节第 5 项。

**问题**：文档一方面写
$\boldsymbol\sigma\boldsymbol n_f=\boldsymbol t_{\rm out}(\boldsymbol x,t)$，另一方面要求“回流时使用能量稳定处理”，但弱式仍只有给定牵引项。能量稳定回流项通常依赖当前
$u_n=\boldsymbol u\cdot\boldsymbol n_f$，不能表示成只依赖
$(\boldsymbol x,t)$ 的已知函数。自由面截断线 $\mathcal C_o$ 也只说“辐射/吸收”，没有给出线速度、入射特征数和毛细端口归属。

式 (6.3) 和 (6.9) 的**账本符号正确**，但账本只会记录边界输入了多少能量，不会自动使边界稳定或闭合。

**必须修复**：至少冻结下列两个互斥出口分支之一。

1. `OUT-NO-BACKFLOW`：把 $u_n\ge0$ 作为适用域条件；任何积分点出现
   $u_n<-u_{\rm tol}$ 即触发 `outlet_backflow` 超域事件并拒绝该运行的验证资格。
2. `OUT-ENERGY-STABLE`：定义 $s^-=\min(s,0)$，把给定物理参考牵引
   $\boldsymbol t_{\rm ref}$ 与回流稳定项分开：

   $$
   \boxed{
   \boldsymbol\sigma\boldsymbol n_f
   =\boldsymbol t_{\rm ref}
   +\alpha\rho u_n^-\boldsymbol u,
   \qquad \alpha\ge\frac12 .}
   \tag{REV-A-2}
   $$

   扣除可观测物理端口
   $\boldsymbol t_{\rm ref}\cdot\boldsymbol u$ 后，动能边界贡献为

   $$
   \rho|\boldsymbol u|^2
   \left(\alpha u_n^- -\frac12u_n\right)=
   \begin{cases}
   -\frac12\rho|\boldsymbol u|^2u_n,&u_n\ge0,\\
   (\alpha-\frac12)\rho|\boldsymbol u|^2u_n,&u_n<0,
   \end{cases}
   \le0.
   \tag{REV-A-3}
   $$

式 (REV-A-2) 只是一个最小可审计分支；若选择其他回流算子，也必须逐式给出同等级的边界能量不等式。

对固定出口截断平面，至少还要冻结

$$
\boldsymbol V_{\mathcal C}\cdot\boldsymbol n_o=0,
\qquad
(\boldsymbol V_{\mathcal C}-\boldsymbol u)\cdot\boldsymbol n=0
\quad\text{on }\mathcal C_o,
\tag{REV-A-4}
$$

以及与流态相符的**恰好一个入射自由面特征**。例如在明示的亚临界、小幅、浅水出口分支，可把右行无反射关系写成

$$
u_n'-\frac{\sqrt{gH}}{H}\eta'=0,
\tag{REV-A-5}
$$

并将其适用域限定为该线性长波分支；非线性/色散工况应换成经过基准验证的特征或吸收层。式 (9.2) 在
$\mathcal C_o$ 产生的毛细线项与 $P_{\gamma,o}$ 必须只归属一个端口，不能在面积牵引和线力中重复加入。

**关闭证据**：无刚体线性波出域反射率；规定回流脉冲下的边界能量不等式；液体体积、总能量与
$P_o+P_{\gamma,o}$ 的时间积分闭合；入口/出口角点相容性测试。

**不接受的替代证明**：把水槽加长后不检查反射、只说“do-nothing 通常可用”、只展示涡量云图，或只报告全域能量下降；这些不能识别出口是否在偷偷注能。

### REV-A-M03 — 完整刚性总成与排液实体共用同一个 `B/X_C/m_b` 语义

**位置**：

- `R1-topology-and-exact-geometry.md` 274–325 行：圆柱实体
  $\mathcal C$、圆柱几何中心 $\mathbf C$ 与总成质心 $\mathbf G$ 已明确分开；
- `R2-exact-variational-mechanics.md` 式 (1.3)、(2.1)–(2.4)：
  $\mathcal B$ 包含圆柱、径向臂、配重、夹具和随摆转子；
- `R2-continuum-free-surface-FSI.md` 34–65 行、式 (4.1)–(4.7)：
  $\mathcal B_0$ 先定义成圆柱，却同时把 $\boldsymbol X_C$ 称为质心，并用
  $m_b,\boldsymbol J_C$ 写完整刚体方程。

**问题**：真实 P0 中通常有一个共享刚性运动的完整质量总成，但只有其中一部分排液并接受可分辨的水侧牵引。若干燥摆臂/配重被排除在流体域外，它们仍必须进入总质量、总质心和总惯量；若浸水夹具加入流体障碍，它又必须进入湿面。当前符号允许实现者把“圆柱几何中心”“排液实体质心”“总成质心”误合并，导致重力矩、Newton–Euler 平动、力矩参考点和网格障碍不一致。

**必须修复**：至少类型化为

$$
\mathcal B_{\rm rb}=\text{完整随动质量总成},
\qquad
\mathcal B_{\rm disp}\subseteq\mathcal B_{\rm rb}
=\text{进入流体域的排液部件并集},
$$

并分别定义

$$
(m_{\rm rb},\boldsymbol X_G,\boldsymbol J_G),
\qquad
\Gamma_b=\partial\mathcal B_{\rm disp}\cap\partial\Omega_f,
\qquad
\boldsymbol C_{\rm cyl}=\text{圆柱几何中心}.
$$

所有部件共享同一刚体映射，但质量积分只对
$\mathcal B_{\rm rb}$，流体域扣除和牵引积分只对
$\mathcal B_{\rm disp}$。力矩可选固定枢轴或总成质心，二者必须用平移矩严格转换。

**关闭证据**：构造“同一圆柱、增加完全干燥偏心配重”的单元例；湿面力必须不变，而
$\boldsymbol X_G,\boldsymbol J_G$、重力矩和支承反力必须按解析值变化。

**不接受的替代证明**：令示例参数恰好使圆柱中心等于总成质心，或只在一自由度标量式中调一个
$I_P$；退化样例会掩盖接口类型错误。

### REV-A-M04 — 动态自由面下的 `HF-split` 缺少湿集合差修正

**位置**：`R2-exact-variational-mechanics.md` 式 (0.2)、第 3.6 节、式 (4.12a)–(4.13) 及第 6.4 节记账表；R1 第 5.2–5.3 节的实际自由面/湿面定义。

**问题**：参考平水面势

$$
\Pi_h^0(q)=\rho g\int_{\mathcal B}[\eta_0-z]_+\,\mathrm dV
$$

产生的是参考湿面 $S_w(q,\eta_0)$ 上的静水广义力。动态场的总牵引却积分于实际湿面
$S_w(q,\eta)$。如果只在实际湿面逐点写
$p=p_h^0+p'$，则

$$
\int_{S_w(q,\eta)}\boldsymbol\sigma'\boldsymbol n_s\cdot
\boldsymbol J_i\,\mathrm dS
=Q_i^{\rm tot}(q,\eta)
-\int_{S_w(q,\eta)}\boldsymbol\sigma_h^0\boldsymbol n_s\cdot
\boldsymbol J_i\,\mathrm dS,
$$

第二项一般不等于
$-\partial_i\Pi_h^0$，因为两个湿集合不同。漏项正是参考/实际湿面的对称差贡献；自由面波动把新表面点润湿或露出时，这个差不能假设为零。

**必须修复**：二选一。

1. 把 `HF-split` 严格限制为
   $\eta=\eta_0$ 且
   $S_w(q,\eta)=S_w(q,\eta_0)$ 的平水面分支；或
2. 对一般动态自由面把残余广义力**代数定义**为

   $$
   \boxed{
   Q_i^{\rm dyn}(q,\eta)
   :=Q_i^{\rm tot}(q,\eta)+\partial_i\Pi_h^0(q),}
   \tag{REV-A-6}
   $$

   并明确它包含实际/参考湿面差修正；不能再把它简写成实际湿面上的
   $p'$ 牵引，除非另行证明两者恒等。

**关闭证据**：选择一个水面波峰使圆柱上新增一小块湿面，分别以总牵引减参考势导数和“实际湿面 $p'$”计算，验证加入差集项后逐时刻、逐功率一致。

**不接受的替代证明**：只在 $\eta=\eta_0$ 的退化样例中对账，或总牵引与静水势同时加入后再靠调零点使总力接近；前者没有覆盖问题，后者是双计数。

### REV-A-M05 — F0 候选状态与“最终冻结”发布语义冲突

**位置**：`R1-topology-and-exact-geometry.md` 第 17.2–17.3 节（1617–1646 行）与第 19 节（1668–1698 行）；文件头仍标为 F0 候选稿。

**问题**：第 17.2 节 11 项 F0 条件全部未勾选，第 17.3 节明确没有实物尺寸、质量性质、槽体、水位、弹簧、接触和相机一级测量；第 19 节却使用“最终冻结声明”和“主装置冻结为”。选择 P0 作为后续研究的 canonical 数学拓扑是允许的，但它不等于 F0 已以实物证据通过。当前措辞容易被后续代码、发布摘要或自动化门禁误读为 F0 已完成。

**必须修复**：把状态拆成三个机器可读字段，例如：

```text
canonical_topology_choice = frozen
symbolic_geometry_contract = candidate_reviewed
F0_apparatus_gate = not_passed
```

将第 19 节改名为“canonical 数学选择与待实测边界”，并在同一屏内重复
`F0_apparatus_gate = not_passed`。只有第 17.2 节每项都有证据路径、哈希、测量不确定度和审核人后，才允许把 F0 状态改为 passed。

**关闭证据**：F0 清单逐项链接到 CAD/照片/标定/称量/水位/角域数据；自动门禁证明每项非空且哈希可重算。

**不接受的替代证明**：官方示意图、Huera-Huarte 同构装置、示例尺寸、作者口头确认或 R1 内部公式正确；它们都不是本实物的一级测量。

### REV-A-M06 — 现有几何脚本与 prose 运行记录不是 fail-closed 的完整验证包

**位置**：

- `check_exact_geometry.py` 16–58、84–154、177–238 行；
- `plot_exact_hydrostatics.py` 166–175、239–259、326–361 行；
- R1 第 17.1 节；mechanics 第 11.2 节；`WORKLOG.md` 28–43 行。

**已存在的真实证据**：项目 artifact 确实存在，本轮只读核对到：

```text
artifacts/data/exact-hydrostatics-summary.json
  SHA-256 2f0dfd8cd6620a297551e3da01a5471c6da8c65b78065d00cd911f9d9d65727a
artifacts/data/exact-hydrostatics-vs-slender.csv
  SHA-256 a46aeb727e9472febe23532aa49a0c9bbcb40983806b9bd8e6434b6f9520a3c6
artifacts/figures/exact-hydrostatics-vs-slender.svg
  SHA-256 500a10be198764a7bfd2398ae8cf4b506c07acf95242c4bee2944bff8a888dc0
artifacts/figures/exact-hydrostatics-vs-slender.png
  SHA-256 193b8a408a06efc403434fddc1dd1749e52c41917a007fc45d47e95992392737
```

JSON 记录的体积恒等最大残差为
$4.3368\times10^{-19}\,\mathrm{m^3}$，力矩闭式最大残差为
$3.4073\times10^{-13}\,\mathrm{N\,m}$，小角系数相对差为
$1.8195\times10^{-9}$。mechanics 第 11.2 节现已保存四个符号残差及圆弓有限差分的可重放命令，这是合格的局部公式证据。

**仍存在的问题**：

1. `check_exact_symmetric_springs()` 直接假定伸长为
   $\delta_0\pm d\sin\theta$，没有从 R1/mechanics 冻结的锚点—动端欧氏长度
   $\|\mathbf a-[O+R_x(\theta)\mathbf b]\|$ 推导。它验证的是一个理想化仿射伸长恒等式，不是“精确弹簧几何”。
2. `check_exact_geometry.py` 的判定全部使用 Python `assert`；在 `python -O` 下会被删除，而 235–238 行仍打印 `PASS`。
3. `plot_exact_hydrostatics.py` 239–248 行称“checked below”，但 347–355 行只把残差写进 JSON，没有容差断言、非零退出或 schema；公式被破坏时脚本仍可正常结束。
4. R1 1615 行新增的 $L_S$、投影面积和随机支撑数值是有价值的记录，但当前两份脚本没有保存这些测试的同一可重放路径；端盖过渡、事件时刻收敛和像素协方差覆盖仍未执行。

**必须修复**：

- 将仿射弹簧测试改名为 `check_affine_extension_spring_pair`，并新增从真实端点坐标计算长度、势与力矩的独立差分测试；
- 用显式异常/测试框架代替裸 `assert`，在优化模式也必须 fail closed；
- 给所有残差冻结单位、绝对/相对容差、适用域断言和非零退出；
- 在临时输出目录运行，生成包含源码、配置、环境、输出哈希和退出码的 manifest；
- 补齐端盖切换、$\theta\to0^\pm$、全干/全湿、支撑非光滑、事件步长减半、P0/V1 分离及像素反演测试。

**关闭证据**：正常样例退出 0；人为翻转有限半径项、删除接触特征或以 `python -O` 运行时必须退出非零；同一 manifest 可在干净环境重放并得到容差内结果。

**不接受的替代证明**：低残差截图、图线重合、README/论文中的数值、一次交互会话或单个 `PASS` 字符串。

### REV-A-M07 — 观测几何核心正确，但 F3 一般观测算子尚未闭合

**位置**：`R1-topology-and-exact-geometry.md` 第 11 节；`R2-exact-variational-mechanics.md` 式 (9.1)–(9.13)，尤其 1036–1088 行；`R2-continuum-free-surface-FSI.md` 式 (12.1)。

**已验证部分**：R1 和 mechanics 均按“世界点变到相机系 $\rightarrow$ 归一像平面 $\rightarrow$ 畸变 $\rightarrow$ 内参”排序；滚动快门行时刻使用无噪声预测行而非观测噪声；$\theta=\operatorname{atan2}(d_y,-d_z)$ 及其梯度正确；共享标定协方差会产生跨帧相关的结论正确。

**问题**：

1. mechanics 的高保真状态仍固定写成 $\eta(x,y,t)$，而 continuum 母模型允许不可写成单值图面的
   $\Gamma(t)$。界面翻卷/破碎分支会在状态类型层丢失。
2. 式 (9.3) 是瞬时点投影。有限曝光时间内的运动模糊、点扩散函数、遮挡/出视野、玻璃—水折射和分割器的姿态相关偏差没有进入同一个前向算子。R1 虽说明折射需射线追踪或水下平面标定，但尚未与式 (9.3) 组合。
3. 当前没有真实相机标定和滚动快门数据运行；mechanics 第 11.3 节也诚实列为未执行，因此其第 12.2 节的观测勾选只能表示“接口已写”，不能表示 F3 通过。

**必须修复**：把一般状态写成

$$
X_{HF}=\{q,\dot q,\boldsymbol u,p,\Gamma,\mathcal A_c,\ldots\},
$$

只在 `interface_representation = graph` 分支派生 $\eta$。对相机，至少冻结以下组合算子或冻结可忽略判据：

$$
I_{kn}(\boldsymbol p)=
\int_{t_{row}-t_e/2}^{t_{row}+t_e/2}
w(s)\,V_k(s)\,
\operatorname{PSF}\!\left[
\boldsymbol p-\Pi_{\rm refr}\bigl(\boldsymbol r_k^W(s)\bigr)
\right]\mathrm ds,
\tag{REV-A-7}
$$

再由冻结的分割/质心算子从 $I_{kn}$ 产生像素观测。
$V_k$ 必须表达可见性/遮挡，$\Pi_{\rm refr}$ 必须选择空气针孔、Snell 射线追踪或限定测量平面的有效标定之一。若简化为瞬时针孔，应以
$t_e\|\dot{\boldsymbol p}\|$ 与像素噪声/PSF 宽度比较，给出预先冻结的可忽略阈值。

**关闭证据**：合成真值同时覆盖曝光、滚动快门、遮挡边缘和折射，逆算无偏且协方差覆盖达到预注册阈值；随后用真实标定板、硬件时间基和至少一个保留完整运行验证。

**不接受的替代证明**：静态无畸变点的零噪声重投影、相机画面“看起来同步”、或把所有系统误差吸收到常数
$\mathbf b_{\rm seg}$。

### REV-A-M08 — S2 与共时多约束事件尚无唯一联合冲量/捕获律

**位置**：`R2-exact-variational-mechanics.md` 第 5.3 节（673–683 行）、第 8.2 节；R1 第 9.2–9.3 节和 V4 重接事件；mechanics 第 12.2 节当前将“单/双索……冲量和能量损失均可恢复”勾选为完成。

**问题**：式 (5.11) 只写
$W\mathbf T=\mathbf b$，没有定义 $\mathbf b$ 的符号、曲率加速度、旧双边约束投影或解的唯一性。新索、旧索、墙面和止挡共时激活时，正文只要求“放入同一 Delassus 系统”，但没有冻结联合恢复律。对耦合冲击逐分量套 Newton 恢复系数不一定存在一致解，也可能依赖求解顺序。S1 的标量公式已完整，不能替 S2/多接触证明。

**必须修复**：用统一间隙向量
$\boldsymbol g(q)\ge0$ 和
$J_g=\partial\boldsymbol g/\partial q$ 冻结符号。连续活动集上明确

$$
W\boldsymbol\lambda
=-\left[J_gM_{\rm eff}^{-1}\boldsymbol f
+\dot J_g\dot q\right],
\qquad
W=J_gM_{\rm eff}^{-1}J_g^T,
\tag{REV-A-8}
$$

并给出张力/接触乘子的各自非负方向。作为最小且唯一的共时冲量基线，可先冻结完全非弹性投影：

$$
\dot{\boldsymbol g}^{+}
=\dot{\boldsymbol g}^{-}+W\boldsymbol P,
\qquad
0\le\boldsymbol P\ \perp\
\dot{\boldsymbol g}^{+}\ge0,
\tag{REV-A-9}
$$

其中 $M_{\rm eff}$ 必须与 dry、ROM-energy 或 HF 冲量分支一致，所有旧约束和新事件同时进入。若需要
$e>0$，必须指定 Poisson/Newton/能量型多冲击律、摩擦耦合和唯一性/选择规则，不能只给每根索一个标量 $e_i$。冲量后再解连续乘子；候选索张力为负时立即释放，不得保持捕获。

**关闭证据**：至少覆盖两索同时拉直、索与墙共时、冗余约束、近奇异
$W$、不同事件枚举顺序和含/不含流体有效惯量；结果必须保持间隙、旧速度约束、非负冲量和非增能，并对枚举顺序不敏感。

**不接受的替代证明**：两个互不耦合的 S1 测试、依次处理碰撞后恰好不穿透，或把负张力截成零但仍保留等长约束。

## 4. Minor

### REV-A-m01 — C1 初值被无条件缩成 C0 零滑移初值

`R2-continuum-free-surface-FSI.md` 式 (5.2) 无分支地要求
$\boldsymbol u_0=\boldsymbol u_b$ 于 $\Gamma_b(0)$。这对 C0 正确；对 C1 只是可选特例。一般 C1 至少应要求

$$
(\boldsymbol u_0-\boldsymbol u_{b0})\cdot\boldsymbol n_b=0,
\qquad
\boldsymbol P_b\boldsymbol\sigma_0\boldsymbol n_b
=\beta_s\boldsymbol P_b(\boldsymbol u_0-\boldsymbol u_{b0})
$$

（经典相容性层级）。若保留零滑移初值，必须同时承认初始切向牵引需为零才满足高阶 Robin 相容。

### REV-A-m02 — C1 总能量式和统一残差遗漏条件性的约束功

continuum 式 (4.4)、(6.12) 和 C0 式 (6.13) 保留
$P_\lambda$，但 C1 式 (6.16) 与残差式 (11.5) 将其删除。对当前固定齐次枢轴
$P_\lambda=0$ 数值无害；文档却也允许
$\partial_t\Phi\ne0$ 的执行器约束。应在两式前限定“固定齐次约束”，或保留
$+P_\lambda$，或明确定义其已计入 $P_{\rm ext}$。

### REV-A-m03 — 两份 mechanics/basis 表达的有向基顺序应显式统一

R1 明确 $(\mathbf e_x,\mathbf t,-\mathbf d)$ 为右手基；几何脚本验证
$\mathbf e_x\times\mathbf d=\mathbf t$。mechanics 式 (1.1) 后把
$(\mathbf e_x,\mathbf c,\mathbf d)$ 称为随体正交基；该有序组三重积为负，虽“正交”本身没有错，但若被实现者直接作为旋转矩阵列会得到
$\det=-1$。建议所有接口只序列化右手三元组
$(\mathbf e_x,\mathbf d,\mathbf c)$ 或
$(\mathbf e_x,\mathbf c,-\mathbf d)$，并断言
$\det R=+1$。

### REV-A-m04 — 静水绘图函数的实际角域和遗留求积参数没有机器约束

`plot_exact_hydrostatics.py` 的主程序只用
$\theta\in[-0.75,0.75]$，处于 $\cos\theta>0$ 分支；但
`exact_hydrostatics_adaptive()` 的公开签名没有断言该适用域，且只在
$\cos\theta>0$ 时显式插入水线断点。175 行仍生成 600 点 Gauss 节点/权重，却没有用于 adaptive 路径。建议删除死参数并对
$|\theta|<\pi/2$、side-only 条件作显式断言；若要支持过中心构型，应实现另一湿侧分支而不是静默外推。

## 5. Verified

### REV-A-V01 — 坐标、旋向、速度核和力矩投影

`A-ALG` 通过：

$$
\mathbf d=\sin\theta\,\mathbf e_y-\cos\theta\,\mathbf e_z,
\quad
\mathbf t=\mathbf d'=\cos\theta\,\mathbf e_y+\sin\theta\,\mathbf e_z,
$$

$$
\mathbf e_x\times\mathbf d=\mathbf t,
\quad
\mathbf e_x\times\mathbf t=-\mathbf d,
\quad
\dot{\mathbf X}=\dot\theta\,\mathbf e_x\times(\mathbf X-\mathbf O).
$$

因此 P0 中
$Q_h=\mathbf e_x\cdot\int(\mathbf X-\mathbf O)\times(\boldsymbol\sigma\boldsymbol n_s)\,\mathrm dS$
与虚功核 $\partial_\theta\mathbf X$ 同号。R1 第 7 节、mechanics 式 (0.1)/(1.4)/(4.13) 相容。

### REV-A-V02 — 有限半径湿几何、浮心与投影

`A-ALG+A-NUM` 通过：圆弓面积函数、圆弓一阶矩、$\theta=0$ 显式分支、
$V_w=\int A_w\,\mathrm dr$、截面偏心浮心、湿侧面/端盖分解、side-only 下

$$
V_w=\pi R^2\left(\ell_b-h_O\sec\theta\right),
\quad
L_S=L_V=L_{\rm axis},
\quad
A_{\perp x,w}=DL_{\rm axis}
$$

均与直接几何积分一致。上述长度/投影恒等式只在水线带不触端盖的平水面分支成立；它们不意味着浮心或力矩等同细轴模型。

### REV-A-V03 — 静水势、浮力矩与有限半径修正

`A-ALG+A-NUM` 通过 mechanics 式 (3.18)–(3.23)：

$$
Q_B=-\Pi_h',
\qquad
Q_B^{\rm exact}-Q_B^{\rm axis}
=-\rho gI_{wp,x}\sin\theta
\left(1+\frac12\tan^2\theta\right),
$$

$$
K_h=\Pi_h''(0)
=\rho g(-V_{d0}r_{B0}+I_{wp,x}).
$$

$\cos\theta>0$、平水面固定、水线正则和分支单侧导数条件已在最终 mechanics 稿中明示。有限半径项在浮力驱动力斜率中为负、在势能刚度中为正，二者不矛盾。

### REV-A-V04 — 总成质量、质心和均匀圆柱惯量

`A-ALG` 通过 mechanics 式 (2.1)–(2.4)：总成质量与惯量来自真实密度体积分；均匀实心圆柱对顺流枢轴的贡献

$$
I_{O,c}=m_c\left[\ell_c^2+\frac{3a^2+L_c^2}{12}\right]
$$

正确包含圆柱质心横轴惯量和平行轴项。REV-A-M03 针对的是该正确质量积分与 FSI 排液实体的**类型接口**，不是这条惯量公式。

### REV-A-V05 — S1 张力、绷紧冲量与单接触冲量

`A-ALG+A-NUM` 通过 mechanics 式 (5.5)–(5.10)、(8.5)–(8.7)：
$D_T=1/m+\mathbf c_A^T\mathbf J_G^{-1}\mathbf c_A>0$，点质体最低点退化为
$m(g+v^2/\ell)$；恢复速度和能量损失符号正确。单光滑接触的
$P_n\ge0$、受约束逆质量投影和
$-\tfrac{1-e_n^2}{2W_n}(\dot g_n^-)^2$ 正确。适用域只到单索/单光滑接触或已冻结的活动集，不替代 REV-A-M08。

### REV-A-V06 — 配置依赖加入惯量和三套互斥记账

`A-ALG` 通过：

$$
[I_O+I_a(q)]\ddot q+\frac12I_a'(q)\dot q^2+\Pi'(q)=Q_{\rm res}
$$

的 $+I_a'/2$ 与
$\mathrm d[(I_O+I_a)\dot q^2/2]/\mathrm dt$ 一致；移到右侧后两项均取负。HF-total、HF-split、ROM-energy 不得叠加的原则正确；HF-split 的动态湿集合问题另见 REV-A-M04。

### REV-A-V07 — 自由表面法向、曲率、Navier 与毛细线力

`A-ALG+A-NUM` 通过 continuum 式 (2.5)、(2.11)、(3.3)–(3.4)：

- $\boldsymbol n_f$ 指向液体域外、
  $\boldsymbol n_b=-\boldsymbol n_f$；
- $\kappa=-\nabla_s\cdot\boldsymbol n$ 使球面
  $\kappa=-2/R$，并给 $\Delta p=2\gamma/R$；
- $\boldsymbol P_b\boldsymbol\sigma\boldsymbol n_b=\beta_s\boldsymbol u_{\rm rel,t}$ 给界面总功
  $-\int\beta_s|\boldsymbol u_{\rm rel,t}|^2\,\mathrm dS$；
- 自由面外余法向定义下，刚体毛细线力为
  $-\oint\gamma\boldsymbol m\,\mathrm d\ell$，与自由面面积输运边缘项相消。

### REV-A-V08 — ALE 强式、连续开域能量和无量纲群

`A-ALG` 通过 continuum 式 (2.1)–(2.4)、(6.2)–(6.16)、(7.1)–(7.6)：ALE 对流速度
$\boldsymbol u-\boldsymbol w$、GCL、开域机械能通量、黏性耗散和接触线能量符号一致。

$$
Re=\frac{\rho UD}{\mu},\quad
Fr=\frac{U}{\sqrt{gD}},\quad
We=\frac{\rho U^2D}{\gamma}
$$

独立；
$Ca=We/Re$、$Bo=We/Fr^2$、$Ga=Re^2/Fr^2$ 为派生群。
$\boldsymbol K^*=\boldsymbol S_q^T\boldsymbol K\boldsymbol S_q/(\rho U^2D^3)$ 和
$\boldsymbol C^*=\boldsymbol S_q^T\boldsymbol C\boldsymbol S_q/(\rho UD^4)$
正确区分平移/转动尺度。REV-A-M02 针对边界**闭合算子**，不否定连续账本。

### REV-A-V09 — P0/V1 不可混用及观测投影核心

`A-ALG` 通过：P0 是圆柱与径向臂共同转动，轴向速度随 $r$ 线性变化，水线为
$h_O\sec\theta$；V1 是保持圆柱竖直的平行四边形平移，所有圆柱点平移速度相同，湿长变化为
$L_{w0}-\ell(1-\cos\theta)$。二者即使小角二阶项偶然相等，也不能共享质量、静水刚度或状态接口。

相机核心映射的畸变顺序、
$\operatorname{atan2}(d_y,-d_z)$ 和梯度
$(0,-d_z,d_y)/(d_y^2+d_z^2)$ 正确；REV-A-M07 只否定“完整 F3 已闭合”。

### REV-A-V10 — 极限、连续性和非光滑事件语义

`A-ALG+A-NUM` 通过：圆弓面积在干—部分—全湿处连续且一阶接续；
$V_w(\theta)=V_w(-\theta)$；
$\theta\to0^\pm$ 有同一体积极限；支撑函数给正确侧壁/底部见证点；
$\beta=0$ 和
$|\beta|=1$ 的支撑特征不唯一已被最终稿识别。自由面穿越只改变湿润分支，不自动施加刚体恢复冲量；碰壁/止挡/绳重接才进入冲量活动集。这些是正确的事件分类原则。
