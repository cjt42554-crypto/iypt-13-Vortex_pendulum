# R1：IYPT 2027 第 13 题 “Vortex pendulum” 官方题意与一级证据矩阵

> 文档性质：论文级重写的 R1 研究备忘录；不是最终答案，也不是装置参数冻结稿。<br>
> 核验日期：2026-08-20（Asia/Singapore）。<br>
> 证据边界：技术论据只采用 IYPT 官方材料、同行评审原始论文及其作者稿；综述、教材、网页科普和 Reference Kit 只可用于找线索，不能替代下列原始证据。

## 0. 先行结论与证据门

1. 官方只冻结了“竖直取向圆柱摆锤—部分浸水—通道来流—横流摆动—研究相关参数”这一最小问题；没有冻结悬挂拓扑、严格自由度、摆长、圆柱尺寸、浸没率、流速、通道尺寸、端部间隙、阻尼或任何数值范围。项目现已把**顺流固定轴、横流 1-DOF、刚性旋转摆**冻结为研究者选择的 canonical apparatus；保持圆柱全过程竖直的四杆平移摆、球摆和柔线摆均为显式对照/扩展，不能写成官方规定。
2. 与这一 canonical 高度同构、且正文已经核验的一手研究是 Huera-Huarte 2026：直径 50 mm、湿长 620 mm 的圆柱从自由表面穿出，绕与来流平行的轴作横流单自由度转动，实验覆盖约 \(U^*=5\!\sim\!12\)、\(Re=9.0\times10^3\!\sim\!2.1\times10^4\)。它足以证明“自由表面贯穿、平衡位形竖直的圆柱刚性旋转摆”是可操作的 canonical 研究类，但仍不是官方唯一装置；“IYPT 题目可能受此论文启发”没有官方证据，只能列为未证推断。
3. 可由一级证据支持的主机理是：圆柱分离剪切层和交替尾涡产生非定常横向载荷；物体运动又反馈改变涡形成。当尾迹与物体同步，并且一周期流体输入功补偿结构与流体耗散且该能量平衡稳定时，出现自维持 VIV。**锁频不是简单的外力共振同义词**；低质量比时尾迹—物体可以同步而响应频率明显偏离静水或真空固有频率。
4. 固定圆柱的一次 Hopf 起振阈值、固定圆柱 Strouhal 关系、三维 Mode A/B 阈值、自由 VIV 起振、upper/lower 分支和摆式锁频分别属于不同问题。它们能提供尺度和机制，却不能合并成一个“临界 \(Re\)”或把经典直线 1-DOF 的 \(U^*\approx5\) 硬移植到题面装置。
5. 自由表面、有限湿长和水槽阻塞不是小修正：正文证据显示，自由表面会削弱近界面的相干周期脱涡；湿长比 \(h/D\) 会改变尾迹和力；阻塞甚至在 5% 时就可能明显改变低 \(Re\) 自由 VIV 的滞回。端板、自由端和跨展向长宽比同样会改变脱涡频率、相关长度和同步带。

上述五条是当前 R1 可以冻结的证据结论；所有精确幅值、阈值和分支端点仍须以所选装置的自有实验或高保真 FSI 重新取得。

## 1. 核验方法、等级与可迁移性标签

### 1.1 证据等级

| 等级 | 含义 | 本备忘录允许的用途 |
|---|---|---|
| **O1** | IYPT 官方网页、最终 PDF 或官方原图；正文/图已直接核对 | 冻结题意、版次和图中直接可见事实 |
| **P1** | 同行评审原始论文的出版正文，或与出版论文一致的作者稿；方法、参数和关键图/表已核正文 | 可作定量或定性技术论据，但仍须遵守该论文几何和参数域 |
| **P2** | 原始同行评审论文身份可靠，正文仅部分可访问或关键数值由同一实验系列的 companion paper 补足 | 只使用已直接看到的内容；不填猜测数值 |
| **P3** | 仅核到出版元数据和原始论文摘要 | 只作待取证线索；不得作为关键定量结论 |
| **X** | 综述、教材、学位论文、数据库摘要、Reference Kit、百科或转载 | 可找词和找 DOI，不作为本矩阵的技术证据 |

“P1”不代表结论可无条件迁移，只代表来源核验强。表中另用迁移标签：**T0** 为题面高度同构的直接装置；**T1** 为可迁移机制/无量纲组织；**T2** 为只可迁移边界敏感性；**T3** 为反例或不可迁移警示。

### 1.2 正文核验约定

- “核正文”至少包括方法/装置、无量纲定义、参数域、结果或结论段；关键数值尽量交叉核图注或表格，而不是只读摘要。
- DOI 一律写成 `https://doi.org/...` 稳定链接；开放作者稿另列稳定仓储页或附件。
- 不同论文的 \(U^*\)、质量比、惯量比、阻尼和振幅定义不自动等价。没有看到定义时宁可记 `NR`，不从图像像素或二手转述补数。
- 论文的作者用语也接受量纲和内部一致性审查；发现明显排版错误时保留原始事实并明示修正，不盲抄公式。

### 1.3 核心来源书目与全文访问台账

下表的访问日期均为 **2026-08-20**。DOI 是永久书目入口；“全文边界”记录本轮究竟看到了什么，避免把数据库摘要误当正文。

| 来源（完整书目信息） | DOI / 稳定入口 | 本轮全文边界与可复核指纹 |
|---|---|---|
| International Young Physicists’ Tournament, *IYPT Problems for 2027: final edition web*, Problem 13 “Vortex pendulum”, 2026，物理第 2 页 | [官方最终 PDF](https://iypt.org/wp-content/uploads/2026/07/IYPT-Problems-for-2027-final-edition-web.pdf)；[官方题页](https://iypt.org/iypt-2027-problems/) | 官方 PDF 全 2 页和第 13 题原图均已下载、提取并视觉核对；SHA-256 `772b1f1ed083b1d3d18745b9e0b16375d259a45ac58fbbb6331095c8b1f072ff`。 |
| F. J. Huera-Huarte, “Energy harvesting from vortex-induced vibrations using a pendulum,” *Journal of Fluids and Structures* **140** (2026), 104449 | [10.1016/j.jfluidstructs.2025.104449](https://doi.org/10.1016/j.jfluidstructs.2025.104449)；[开放出版 PDF](https://tethys-engineering.pnnl.gov/sites/default/files/publications/Huera-Huarte%202026.pdf) | 10 页开放出版正文、装置图、方程、Fig. 2–7 与图注全核；本地核验副本 2,382,590 bytes，SHA-256 `a3ffb4d3816d2d2a76f4e6dbe92b1b795e4425a3b7a61bbee1745cc919760a45`。 |
| F. J. Huera-Huarte, “Vortex and wake-induced vibrations of a circular cylinder pendulum,” *Journal of Fluids and Structures* **146** (2026), 104619 | [10.1016/j.jfluidstructs.2026.104619](https://doi.org/10.1016/j.jfluidstructs.2026.104619)；[出版社页](https://www.sciencedirect.com/science/article/pii/S0889974626001192) | 仅出版元数据、许可、参考文献表和摘要可访问；正文 PDF 未取得，故为 P3，具体几何/数值留空。 |
| F. Flemming & C. H. K. Williamson, “Vortex-induced vibrations of a pivoted cylinder,” *Journal of Fluid Mechanics* **522** (2005), 215–252 | [10.1017/S0022112004001831](https://doi.org/10.1017/S0022112004001831) | 期刊正文装置、\(I^*\)、2-DOF 分支、2S/2P/2C 和跨向混合尾迹已核。 |
| R. Bourguet, “Flow-induced vibrations of a cylinder along a circular arc,” *Journal of Fluid Mechanics* **954** (2023), A7 | [10.1017/jfm.2022.980](https://doi.org/10.1017/jfm.2022.980) | Cambridge 正文的 2D DNS 参数图、圆弧曲率扫描和直线极限已核。 |
| M. L. Facchinetti, E. de Langre & F. Biolley, “Coupling of structure and wake oscillators in vortex-induced vibrations,” *Journal of Fluids and Structures* **19**(2) (2004), 123–140 | [10.1016/j.jfluidstructs.2003.12.004](https://doi.org/10.1016/j.jfluidstructs.2003.12.004)；[机构书目页](https://researchportal.ip-paris.fr/en/publications/coupling-of-structure-and-wake-oscillators-in-vortex-induced-vibr/) | 18 页出版社正文、全部模型段、参数标定、Fig. 2–12、讨论和结论已核；本地副本 463,586 bytes，SHA-256 `1dee4824da56300a1db7c341141e158fd50e6e4da68f9ebd0896823396a35312`。机构页只提供书目/摘要，正文核验基于出版社 PDF。 |
| M. Provansal, C. Mathis & L. Boyer, “Bénard–von Kármán instability: transient and forced regimes,” *Journal of Fluid Mechanics* **182** (1987), 1–22 | [10.1017/S0022112087002222](https://doi.org/10.1017/S0022112087002222) | 作者上传的期刊扫描正文已核；DOI 是稳定入口，开放扫描宿主不是出版社永久仓储。 |
| B. Kumar & S. Mittal, “Prediction of the critical Reynolds number for flow past a circular cylinder,” *Computer Methods in Applied Mechanics and Engineering* **195** (2006), 6046–6058 | [10.1016/j.cma.2005.10.009](https://doi.org/10.1016/j.cma.2005.10.009) | 出版正文方法、LSA/DTI 表和域宽收敛数值已核；用于无界临界值，不与作者同年的 blockage 专文混号。 |
| C. H. K. Williamson, “Oblique and parallel modes of vortex shedding in the wake of a circular cylinder at low Reynolds numbers,” *Journal of Fluid Mechanics* **206** (1989), 579–627 | [10.1017/S0022112089002429](https://doi.org/10.1017/S0022112089002429)；[Caltech 作者记录](https://authors.library.caltech.edu/records/wavw6-f7k56) | 期刊全文的装置、端部条件、平行脱涡拟合式和图已核。 |
| C. H. K. Williamson & G. L. Brown, “A series in \(1/\sqrt{Re}\) to represent the Strouhal–Reynolds number relationship of the cylinder wake,” *Journal of Fluids and Structures* **12** (1998), 1073–1085 | [10.1006/jfls.1998.0184](https://doi.org/10.1006/jfls.1998.0184) | 期刊正文附录中的二项/三项系数和适用域已核；不是高 \(Re\) 或运动圆柱公式。 |
| D. Barkley & R. D. Henderson, “Three-dimensional Floquet stability analysis of the wake of a circular cylinder,” *Journal of Fluid Mechanics* **322** (1996), 215–241 | [10.1017/S0022112096002777](https://doi.org/10.1017/S0022112096002777)；[作者 PDF](https://warwick.ac.uk/fac/sci/maths/people/staff/dwight_barkley/home_page/papers/barkley_-_1996_-_journal_of_fluid_mechanics.pdf) | 作者 PDF 正文、Floquet 阈值、跨向波长和 Table 2 已核。 |
| C. H. K. Williamson, “Three-dimensional wake transition,” *Journal of Fluid Mechanics* **328** (1996), 345–407 | [10.1017/S0022112096008750](https://doi.org/10.1017/S0022112096008750) | 期刊正文的端部控制、Mode A/A\(^*\)/B 转换、跨向尺度和实验阈值已核。 |
| A. Slaouti & J. H. Gerrard, “An experimental investigation of the end effects on the wake of a circular cylinder towed through water at low Reynolds numbers,” *Journal of Fluid Mechanics* **112** (1981), 297–314 | [10.1017/S0022112081000414](https://doi.org/10.1017/S0022112081000414) | Cambridge 期刊 PDF 的清洁/污染自由面、固体端板与下自由端对照已核。 |
| C. W. Park & S. J. Lee, “Free end effects on the near wake flow structure behind a finite circular cylinder,” *Journal of Wind Engineering and Industrial Aerodynamics* **88** (2000), 231–246 | [10.1016/S0167-6105(00)00051-9](https://doi.org/10.1016/S0167-6105(00)00051-9) | 出版正文/图表的 AR=6,10,13 主峰与自由端低频分量已核。 |
| R. Szepessy & P. W. Bearman, “Aspect ratio and end plate effects on vortex shedding from a circular cylinder,” *Journal of Fluid Mechanics* **234** (1992), 191–217 | [10.1017/S0022112092000752](https://doi.org/10.1017/S0022112092000752) | 期刊正文的 AR、端板、\(Re\)、升力和胞格/相位结果已核。 |
| C. Norberg, “An experimental investigation of the flow around a circular cylinder: influence of aspect ratio,” *Journal of Fluid Mechanics* **258** (1994), 287–316 | [10.1017/S0022112094003332](https://doi.org/10.1017/S0022112094003332) | 期刊扫描正文与出版元数据交叉核对；用于固定圆柱端部/AR 边界。 |
| B. Kumar & S. Mittal, “Effect of blockage on critical parameters for flow past a circular cylinder,” *International Journal for Numerical Methods in Fluids* **50** (2006), 987–1001 | [10.1002/fld.1098](https://doi.org/10.1002/fld.1098) | Wiley 正文/摘要的 \(0.005\le D/H\le0.125\) 稳定性扫描已核；与 CMAME 的无界临界值论文分列。 |
| B. Sahin & R. G. Owens, “A numerical investigation of wall effects up to high blockage ratios on two-dimensional flow past a confined circular cylinder,” *Physics of Fluids* **16** (2004), 1305–1320 | [10.1063/1.1668285](https://doi.org/10.1063/1.1668285) | 出版正文临界表和高阻塞流态已核；定义用 \(U_{max}\)，不能与均速 \(Re\) 混用。 |
| F. Rehimi et al., “Experimental investigation of a confined flow downstream of a circular cylinder centred between two parallel walls,” *Journal of Fluids and Structures* **24** (2008), 855–882 | [10.1016/j.jfluidstructs.2007.12.011](https://doi.org/10.1016/j.jfluidstructs.2007.12.011) | 期刊正文水槽几何、\(\beta=1/3\)、第一失稳与三维结构已核。 |
| G. S. West & C. J. Apelt, “The effects of tunnel blockage and aspect ratio on the mean flow past a circular cylinder with Reynolds numbers between \(10^4\) and \(10^5\),” *Journal of Fluid Mechanics* **114** (1982), 361–377 | [10.1017/S0022112082000202](https://doi.org/10.1017/S0022112082000202) | 期刊扫描正文全核；<6% 结论严格限于其高 \(Re\)、端板、固定体闭口试验。 |
| T. K. Prasanth, S. Behara, S. P. Singh, R. Kumar & S. Mittal, “Effect of blockage on vortex-induced vibrations at low Reynolds numbers,” *Journal of Fluids and Structures* **22** (2006), 865–876 | [10.1016/j.jfluidstructs.2006.04.011](https://doi.org/10.1016/j.jfluidstructs.2006.04.011) | 期刊 PDF 正文、网格、1%/5% 阻塞及滞回结果已核。 |
| C. H. K. Williamson & A. Roshko, “Vortex formation in the wake of an oscillating cylinder,” *Journal of Fluids and Structures* **2** (1988), 355–381 | [10.1016/S0889-9746(88)90058-8](https://doi.org/10.1016/S0889-9746(88)90058-8) | 期刊正文的强迫运动域、锁频定义和 2S/2P/P+S 图已核。 |
| A. Khalak & C. H. K. Williamson, “Motions, forces and mode transitions in vortex-induced vibrations at low mass-damping,” *Journal of Fluids and Structures* **13** (1999), 813–851 | [10.1006/jfls.1999.0236](https://doi.org/10.1006/jfls.1999.0236) | 期刊原版 PDF 的装置、分支、扫速滞回、瞬时相位和尾迹段已核。 |
| R. Govardhan & C. H. K. Williamson, “Modes of vortex formation and frequency response of a freely vibrating cylinder,” *Journal of Fluid Mechanics* **420** (2000), 85–130 | [10.1017/S0022112000001233](https://doi.org/10.1017/S0022112000001233) | Cambridge 正文/出版摘要及同系列装置资料交叉核；两相变与临界质量结论正文级。 |
| T. L. Morse & C. H. K. Williamson, “Employing controlled vibrations to predict fluid forces on a cylinder undergoing vortex-induced vibration,” *Journal of Fluids and Structures* **22** (2006), 877–884 | [10.1016/j.jfluidstructs.2006.04.004](https://doi.org/10.1016/j.jfluidstructs.2006.04.004)；[Cornell 作者稿](https://ecommons.cornell.edu/bitstreams/4b20b579-2379-46c8-9d88-9fc94cddd22c/download) | 作者稿全文核验；只有匹配几何、端部、\(Re,A,f\) 时才能用于自由响应。 |
| J. T. Klamo, A. Leonard & A. Roshko, “The effects of damping on the amplitude and frequency response of a freely vibrating cylinder in cross-flow,” *Journal of Fluids and Structures* **22** (2006), 845–856 | [10.1016/j.jfluidstructs.2006.04.009](https://doi.org/10.1016/j.jfluidstructs.2006.04.009)；[Caltech 作者记录](https://authors.library.caltech.edu/records/dfb6y-3ft71) | 作者记录/期刊正文的可调阻尼方法和 \(Re\)-阻尼分支变化已核。 |
| T. L. Morse & C. H. K. Williamson, “Fluid forcing, wake modes, and transitions for a cylinder undergoing controlled oscillations,” *Journal of Fluids and Structures* **25** (2009), 697–712；以及 “Prediction of vortex-induced vibration response by employing controlled motion,” *Journal of Fluid Mechanics* **634** (2009), 5–39 | [10.1016/j.jfluidstructs.2008.12.003](https://doi.org/10.1016/j.jfluidstructs.2008.12.003)；[10.1017/S0022112009990516](https://doi.org/10.1017/S0022112009990516) | 两篇正文的高分辨率工况图、2P\(_O\)、能量图与稳定性条件已核。 |

其余表内来源均给 DOI/仓储入口和自身证据等级；若未列入本台账，不表示来源较弱，而是没有用于三条最核心的数值基线。

## 2. 官方题面冻结与示意图审计

### 2.1 官方来源

| 编号 | 官方材料 | 直接核验事实 | 证据等级 |
|---|---|---|---|
| O-1 | [IYPT 2027 Problems 官方页](https://iypt.org/iypt-2027-problems/) | 页面标题为 “Problems for the 40th IYPT 2027”，明确写明 IOC 于 2026-07-14 批准。第 13 题网页正文与最终 PDF 逐字一致（仅换行不同）。 | O1 |
| O-2 | [IYPT 2027 最终题目 PDF](https://iypt.org/wp-content/uploads/2026/07/IYPT-Problems-for-2027-final-edition-web.pdf) | 文件名中的 `final-edition-web` 是唯一显式版次标签；PDF 共 2 个物理页面，第 13 题位于物理第 2 页，文档没有可见印刷页码。核验副本 SHA-256：`772b1f1ed083b1d3d18745b9e0b16375d259a45ac58fbbb6331095c8b1f072ff`，大小 182,891 bytes。 | O1 |
| O-3 | [第 13 题官方 PNG 示意图](https://iypt.org/wp-content/uploads/2026/07/image-1.png) | 原图 692×351、24,927 bytes，SHA-256 `76cfe3765a8bb1e8b91147e300779283234232d8ba31bb3d08af72dfd7a45aed`；图中直接可见两条平行通道边界、两支向右的 `water flow` 箭头、灰色圆形 `pendulum` 和与流向垂直的双向箭头。 | O1 |

官方题目的短引为：“A pendulum with a vertically oriented cylindrical bob …”。完整题意的中文等义转述是：圆柱摆锤轴线竖直、悬于流水通道上方；当圆柱部分浸水，水流可能使摆在横流方向振荡；要求解释并研究对相关参数的依赖。题面使用的是 “may cause”，并未宣称任意工况都会起振。

### 2.2 图与文字能、不能支持什么

| 可直接冻结 | 不能由官方材料推出 |
|---|---|
| 摆锤是圆柱体，题面称其竖直取向 | “竖直”是只指静止位形还是全过程由机构保持竖直 |
| 工作状态为部分浸水 | 水线位置、湿长 \(h\)、浸没比例、是否随摆角变化 |
| 名义水流方向及关注的横流响应方向 | 均匀流、稳态流、层流/湍流状态、速度剖面和任何 \(Re\) |
| 示意图强烈支持平面/俯视表达，但图内没有 `top view` 标注 | 单轴平面摆、球摆、双线摆、刚杆/细线、严格 1-DOF |
| 圆柱的水平截面画为圆形 | 直径、高度、质量、惯量、表面粗糙度和比例尺 |
| 通道存在两条侧向边界 | 通道宽/深、底部间隙、阻塞率、入口/出口条件 |
| 要研究 `relevant parameters` | 官方参数清单、参数数值或建议扫描范围 |

核查的官方题页正文、最终 PDF 和官方原图中没有第 13 题视频、数值参数表或 PDF URI 链接。这个结论只限定于已核材料，不能扩写成“整个 IYPT 官网绝无相关视频”。官方数字签名工具报告签名本身有效，但并非当前文件全部字节均在签名范围内且证书链状态未知，故不把它表述为完整密码学认证。

## 3. 跨文献比较必须统一的量

| 量 | 建议定义 | 必须随数据记录的限定 |
|---|---|---|
| Reynolds 数 | \(Re=UD/\nu\) | \(U\) 是名义来流还是局部湿段速度；水槽非均匀流时两者不同 |
| Strouhal 数 | \(St=f_sD/U\) | \(f_s\) 是固定体自然脱涡、尾迹主峰还是运动锁定后的涡形成频率 |
| 自由振动 reduced velocity | \(U^*=U/(f_ND)\) | \(f_N\) 必须注明空气/真空、静水，及是否含附加质量 |
| 实际频率坐标 | \(U/(fD)\) | 用实际响应频率 \(f\)，更适合把自由振动点映射到强迫振动图 |
| 平移振幅 | \(A^*=A/D\) | 单边幅值还是峰—峰；横流或顺流；RMS、均值峰或谐波基波 |
| 摆式振幅 | \(\Theta\)，或 \(A_y^*=R\sin\Theta/D\) | 是圆柱底端、质心、浮心还是某个湿段截面的位移 |
| 平移质量比 | \(m^*=m/(\rho\pi D^2L/4)\) | \(m\) 是否含支架、弹簧动件；\(L\) 是总长还是湿长 |
| 摆式惯量比 | \(I^*=I/I_d\) | 枢轴、湿段分布和排水流体惯量 \(I_d\) 的定义；不能用 \(m^*\) 简单代替 |
| 阻尼 | \(\zeta=c/(2\sqrt{kI})\)（转动）或平移对应式 | 空气、静水或流动中辨识；结构阻尼和流体阻尼是否分开 |
| 长宽比 | \(AR=L/D\) 或 \(h/D\) | 总圆柱长、湿长、端板间长不可混用 |
| 阻塞 | \(\beta=D/W\) | \(W\) 是横流槽宽；还应给湿长/水深、底隙和运动包络阻塞 |
| Froude 数 | \(Fr=U/\sqrt{gD}\) | 若研究水深波或浅水效应，也可用 \(U/\sqrt{gH}\)，两者必须分开 |
| 圆弧曲率 | \(r=R/D\) | 圆弧相对来流的凹/凸侧、枢轴在上游还是下游 |

重要原文审计：Huera-Huarte 104449 的正文把 Strouhal 数印成 \(S=f_sU/D\)，量纲不成立；本项目不得照抄，统一采用 \(St=f_sD/U\)。同文第 5 节叙述典型 upper-branch 工况为 \(U^*=5.2\)，但 Fig. 5 图注写 \(U^*=4.5\)（二者均配 \(Re=9090\)），亦属正文内部不一致。Fig. 4、5 图注还都称 “without brake actuation”，而第 5 节正文明确把两图放在施加有限制动力矩的工况中，并把 Fig. 5 称为高功率代表工况；因此也不能仅凭图注冻结这两个样例的制动力矩状态。除非取得作者勘误或原始数据，不把这些单点标签当校准真值。

## 4. 与题面直接同构或近同构的摆式圆柱

本项目在官方未指定的自由度空间内作出的研究选择是：主轴沿顺流方向固定，圆柱—摆臂作为刚体绕该轴转动，只保留横流平面内一个角坐标。零角/静平衡处圆柱轴线竖直；非零角时圆柱随刚体倾斜。这个定义与 Huera-Huarte 104449 的装置拓扑同构。四杆机构使圆柱姿态始终竖直的曲线平移模型保留为对照，因为它虽同样符合官方字面，却具有不同的惯量、水线和分布载荷。

### 4.1 一级证据矩阵

| 来源 | 研究几何与参数域（正文核验） | 可迁移结论 | 不可迁移边界 | 等级/迁移 |
|---|---|---|---|---|
| **Huera-Huarte (2026), “Energy harvesting from vortex-induced vibrations using a pendulum”**, JFS 140, 104449；[DOI](https://doi.org/10.1016/j.jfluidstructs.2025.104449)；[开放正文](https://tethys-engineering.pnnl.gov/sites/default/files/publications/Huera-Huarte%202026.pdf) | 约 \(1\times1\,\mathrm{m^2}\) 自由表面水槽；最高速湍流度 2.8%，时空速度变异 <1.6%。主轴平行来流，圆柱刚接主轴并作横流单角转动。丙烯酸圆柱 \(D=50\) mm；枢轴至底端 \(L_t=720\) mm；湿/受流长 \(L=620\) mm；整套转动质量 \(m_a=1.21\) kg。空气衰减 \(\zeta\approx9\%\)，\(f_{n,a}=1.57\) Hz；公式估算静水 \(f_n=0.79\) Hz，实测 0.75 Hz。无制动扫速约 \(U^*=5\!\sim\!12\)、\(Re=9000\!\sim\!21000\)，2 kHz、每点至少 60 s；文中幅值定义为 \(A^*=\theta_oL_t/D\)，其中 \(\theta_o\) 是逐周期峰值平均。 | 当前最强 T0 证据：自由表面贯穿、轴线在平衡位形竖直的圆柱转动摆确能出现 VIV 幅频分支、锁频和力—位移相位跃迁；峰值在其装置约 \(U^*\sim6\)，锁频内 \(f/f_n\approx0.8\!\sim\!1.3\)，约 \(U^*\sim7\) 发生相位跳。给出可直接复用的转动坐标、角位移、力矩残差和功率测量框架。 | 是刚性主轴+两弹簧+空气轴承+粉末制动器，不是柔线重力摆；圆柱随主轴转动而倾斜，不保证全过程竖直；湿长和自由表面变形未作时变三维解析；加质量系数直接取 \(C_a=1\)，小角线性化；“流体力矩”由动力学残差反演并包含流体阻尼。其 \(U^*\)、峰值和相位点仅适用于本装置。题目是否受此论文启发仍是推断。 | **P1 / T0** |
| **Huera-Huarte (2026), “Vortex and wake-induced vibrations of a circular cylinder pendulum”**, JFS 146, 104619；[DOI](https://doi.org/10.1016/j.jfluidstructs.2026.104619)；[出版社页](https://www.sciencedirect.com/science/article/pii/S0889974626001192) | 出版元数据：2026-06-16 online，卷 146、104619，开放许可。摘要明确为旋转单自由度圆柱摆；比较孤立圆柱与其上游固定圆柱后的串列后流干扰。 | 摘要层面支持：孤立摆呈典型 VIV 分支/锁频；置于上游定圆柱尾流后，幅值随 \(U^*\) 单调增加，最小间距最强，频率降低，相位转变移向更高 \(U^*\)。这提示题面若存在入口构件或上游扰动，不能用孤立圆柱模型。 | 本轮尚未取得可独立读取的全文 PDF；因此**不填**圆柱尺寸、间距比、\(Re\)、\(U^*\) 端点或图中幅值。它研究的是人为加入上游定圆柱的 WIV，对官方孤立摆不是默认工况。不能只凭摘要当核心定量证据。 | **P3 / T2，待升级** |
| **Bourguet (2023), “Flow-induced vibrations of a cylinder along a circular arc”**, JFM 954 A7；[DOI](https://doi.org/10.1017/jfm.2022.980) | 二维直接数值模拟；刚性圆柱中心受限沿半径 \(R\) 的圆弧平移，单角 DOF；\(Re=100\)，\(m=M/(\rho D^2)=10\)，结构阻尼 0，\(R/D=0.05\!\sim\!10\)，\(U^*=1\!\sim\!30\)，并含 \(R/D=\infty\) 直线基准。 | 最干净的“有限圆弧—经典直线”桥梁：仅 \(R/D\to\infty\) 回到纯横移；小 \(R/D\) 会因切向阻力投影、顺流分量和曲率产生 2:1、3:1 亚谐同步及准周期态，不能只保留 1:1 lock-in。 | 2D、\(Re=100\)、零阻尼、完全浸没；没有有限跨距、自由表面、重力摆或湿长变化。大角幅甚至多圈轨迹不应直接映射到实际水槽装置。 | **P1 / T1** |
| **Carleton & Modarres-Sadeghi (2024), “Angular vortex-induced vibrations of a cylinder”**, JFS 126, 104087；[DOI](https://doi.org/10.1016/j.jfluidstructs.2024.104087) | 水槽实验；圆柱中心沿凹/凸圆弧作 1-DOF 运动；\(D=25.4\) mm、\(L=255\) mm、\(L/D\approx10\)。可见正文表明凹侧约需 \(\lvert R\rvert/D\gtrsim1\)、凸侧 \(R/D\gtrsim1.25\) 才出现典型高响应。 | 实验确认有限曲率会重构分支、顺流/横流轨迹、频率和尾迹；最大角幅约 \(38^\circ\)，对应 \(A_y/D\approx1.1\)、\(A_x/D\approx0.35\)。凹侧同步区可延至较高 \(U^*\)，频率可升至约 \(1.8f_{N,w}\)。 | 本轮可访问正文没有把完整 \(Re,m^*,\zeta,U^*\) 扫描端点全部显式给出，故不补猜。几何是圆柱中心沿圆弧平移，不等于长圆柱绕端部枢转，也没有自由表面。 | **P2 / T1** |
| **Arionfard & Nishi (2017), “Experimental investigation of a drag assisted vortex-induced vibration energy converter”**, JFS 68, 48–57；[DOI](https://doi.org/10.1016/j.jfluidstructs.2016.10.002) | 水槽单圆柱绕外置上游或下游枢轴作单角运动；臂长比 \(l/D=0.47\!\sim\!3.16\)，\(2880\le Re\le22300\)，三种弹簧/固有频率。 | 枢轴相对圆柱位置改变平均阻力矩的符号与等效刚度；下游枢轴和上游枢轴响应/能量效率差异极大。说明“横流摆”仍须报告枢轴几何和顺流阻力的广义力投影。 | 可访问原文未报告可复核的 \(m^*,\zeta\)；能源效率不是题面的核心观测。完全浸没/支承方式与部分浸水摆不同。 | **P2 / T1** |
| **Flemming & Williamson (2005), “Vortex-induced vibrations of a pivoted cylinder”**, JFM 522, 215–252；[DOI](https://doi.org/10.1017/S0022112004001831) | Cornell 水槽 \(38.1\) cm 宽、约 \(46\) cm 水深；竖直长圆柱上端以短弹簧钢针枢接，下端距固定端板约 2 mm；\(D=12.8\) 或 9.6 mm，\(L/D=31\) 或 41；顺/横流两个等惯量、等固有频率转动 DOF；\(I^*=1.03,2.68,7.69\)，轻体峰值附近 \(Re\sim1000,U^*\sim9\)。 | 低惯量—低阻尼可出现 initial/upper/lower；振幅沿跨度近线性，尾迹可有 2S、2P、2S–2P 混合、涡位错/合并。顺流响应显著时出现 2C（每半周期两个同旋涡）。 | 长圆柱端部枢接、2-DOF、近全浸没且有端板；不是均匀横移 1-DOF，也不是圆柱全过程保持竖直的摆。经典 2S/2P 图只在顺流位移很小时可局部映射。 | **P1 / T1–T3** |
| **Leong & Wei (2008), “Two-degree-of-freedom vortex-induced vibration of a pivoted cylinder below critical mass ratio”**, *Proceedings of the Royal Society A* 464, 2907–2927；[DOI](https://doi.org/10.1098/rspa.2007.0166) | 表面贯穿、底端枢接的倒立圆柱摆，顺/横流 2-DOF；\(m^*=0.45\)，\((m^*+C_A)\zeta=0.0841\)，\(820\le Re\le6050\)，\(1.1\le U^*\le8.3\)。 | 低于临界质量时 lower branch 可消失并出现很宽的高响应区；\(A_y/D\sim2\)、\(A_x/D\sim2.5\)，说明低质量表面贯穿圆柱的顺流自由度不能默认忽略。横向频率与脱涡频率几乎全程相等仍不保证尾迹属于经典 1-DOF 同一分支。 | 倒立、底铰、2-DOF、大顺流运动；与上悬重力摆的稳定性、浮力矩和端部条件不同。 | **P1 / T1–T3** |
| **Kheirkhah, Yarusevych & Narasimhan (2012), “Orbiting response in vortex-induced vibrations of a two-degree-of-freedom pivoted circular cylinder”**, JFS 28, 343–358；[DOI](https://doi.org/10.1016/j.jfluidstructs.2011.08.014) | 钢圆柱底部低摩擦枢点，顺/横流 2-DOF；\(Re=2100\)，\(m^*=15.9\)，\(I^*=66.8\)，\(\zeta=0.4\%\!\sim\!1.1\%\)，\(U^*=3.4\!\sim\!11.3\)。 | 同步区轨迹可由 8 字（\(f_x=2f_y\)）切换为椭圆（\(f_x=f_y\)）；结构两个模态的耦合决定轨迹和频率比。 | 重、完全浸没、2-DOF 倒立摆；不能用单个横流振子或单一 \(m^*\zeta\) 概括。 | **P1 / T2** |
| **Cajas et al. (2021), “Vortex induced vibrations of a pivoted finite height cylinder at low Reynolds number”**, PoF 33, 063602；[DOI](https://doi.org/10.1063/5.0051689) | 3D ALE-FSI；有限高圆柱通过短杆连接底座扭簧，两个倾转 DOF、不自旋；\(L/D=10\)，\(Re=100,200\)，主质量比约 5，扫描 \(U_r^*\) 约 3–11；重力项设为 0，顶部/侧壁采用滑移边界，无可变形自由表面。网格敏感性中均值/RMS 幅值变化 <3%（论文条件）。 | 直接展示端部枢接有限柱的三分支、跨展向非同相脱涡、涡位错和 2C；可用于检验转动力矩与跨展向尾迹模型。 | 低 \(Re\) 层流数值、底座倒立、无重力、无真实自由表面；不能当题面水槽的定量验证。 | **P1 / T2** |
| **Cajas et al. (2023), “Aspect ratio influence on the vortex induced vibrations of a pivoted finite height cylinder at low Reynolds number”**, PoF 35, 083606；[DOI](https://doi.org/10.1063/5.0164452)；[作者稿仓储](https://hdl.handle.net/2117/393465) | 3D FSI，\(Re=100\)，\(m_r^*=5\)，阻尼项取 \(4\pi\zeta_i^*/U_r^*=0.01\)；\(AR=2,3,5,7\)，\(2\le U_r^*\le11\)。域为 \(45D\times22D\times20D\)，入口距柱 10D；上下/侧面滑移，不含可变形自由表面。1.1M 与 3M 网格均值/RMS 幅值差 <2%，力系数 <6%。 | 湿长/AR 会改变起振和同步区：正文给出 initial branch 起点随 AR=2,3,5,7 约由 4.92–4.98、4–4.3、3.8–3.85、3–3.4 依次前移；AR=2,3 低速可形成对称稳态尾迹而不起振，AR=5,7 同步区更宽。 | 数值、低 \(Re\)、倒立、2-DOF、无自由表面；这些精确端点只证明 AR 敏感性，不可搬到题面。 | **P1 / T2** |
| **Kim, Song & Kim (2018), “Large-amplitude flow-induced vibration of cylindrical pendulums”**, JFS 79, 39–49；[DOI](https://doi.org/10.1016/j.jfluidstructs.2018.01.011) | 水槽实验；圆柱用薄弹性片接到固定板，仅沿横流摆动；通过圆柱长度/质量与弹片几何改变回复矩，并研究串列双摆。 | 证明弹性片转动摆可在窄流速带出现大幅自激振动；作者用“弹片回复弯矩/水动力矩”构造速度标度，说明只用传统 \(U^*\) 未必能塌缩不同摆几何。 | 回复来自弹片弯曲而非单纯重力；正文可访问范围不足以冻结完整数值表。串列 wake galloping 不能当孤立摆 VIV。 | **P2 / T1** |

### 4.2 104449 的方程可复用到什么程度

该文小角线性模型写为

\[
I_O\ddot\theta+M_c+M_k+M_B=M_F,
\]

其中

\[
M_k=\left(2kd_1^2+mgd_2-m_vgd_3\right)\theta,
\qquad
M_c=(c_{Os}+c_{Of})\dot\theta,
\]

\[
m_v=C_a\rho\frac{\pi D^2L}{4},\qquad
I_{Ov}=C_a\left(\frac{m_vL^2}{12}+m_vd_3^2\right),
\]

\[
f_n=\frac{1}{2\pi}
\sqrt{\frac{2kd_1^2+mgd_2-m_vgd_3}{I_O}}.
\]

这组式子可迁移的是**关于枢轴写力矩、把重力/浮力/弹簧/制动与流体力矩分开、在静水中辨识固有频率**的结构。不能不加说明地迁移的是：

- \(C_a=1\) 只是二维势流圆柱的简化代理；VIV 中有效附加质量随频率、幅值、相位、端部和自由表面变化；
- 小角线性化丢掉 \(\sin\theta\)、湿长变化、圆柱倾角和切向阻力投影；
- 文中的 \(M_f\) 是由总方程残差估计，包含流体载荷和流体阻尼，并非沿湿段独立测得的分布力矩；
- 题面若采用保持圆柱始终竖直的平移摆，圆柱自身不随摆臂转动，上述惯量和水线几何都要重写；
- 题面若使用柔线，负张力时必须切换松绳分支，不能由本论文的刚性双边轴约束代表。

## 5. 固定圆柱尾流：只作为来流尺度和失稳基线

| 来源 | 几何与参数域 | 经正文许可的结论 | 不可迁移边界 | 等级/迁移 |
|---|---|---|---|---|
| **Provansal, Mathis & Boyer (1987), “Bénard–von Kármán instability: transient and forced regimes”**, JFM 182；[DOI](https://doi.org/10.1017/S0022112087002222) | 空气开路风洞，方形试验段宽 10 cm；光滑钢圆柱 \(D=0.30\!\sim\!2.00\) cm，来流湍流度 <0.3%；在约下游 5D 测速度；通过瞬态增长和强迫响应研究一次失稳。 | \(L/D\to\infty\) 外推 \(Re_c=47\)；近阈值横向速度振幅 \(\lvert u_y\rvert\propto(Re-Re_c)^{1/2}\)，阈下弛豫时间发散，支持超临界 Hopf/Stuart–Landau 正规形。 | \(47\) 是无限长径比外推；同文有限 \(L/D\) 可观测 \(Re_c\sim107\!\sim139\)。固定体 Hopf 不是摆式 VIV 起振阈值。 | **P1 / T1** |
| **Kumar & Mittal (2006), “Prediction of the critical Reynolds number for flow past a circular cylinder”**, CMAME 195；[DOI](https://doi.org/10.1016/j.cma.2005.10.009) | 二维固定圆柱；线性稳定性 LSA 与直接时间积分 DTI；系统检查横向域和网格。 | LSA 给 \(Re_c=47.5548,St_c=0.1158\)，DTI 给 \(46.877,0.1168\)；同一 \(H/D=100\) 网格上分别约 \(47.3181\) 与 \(47.045,0.1177\)。因此无界基线宜写 \(Re_c\approx47,St_c\approx0.116\!\sim\!0.118\)，不伪造唯一超精确常数。 | LSA/DTI 的估计程序不同，域仍有限；差异不是自然流体的不确定度分布。 | **P1 / T1** |
| **Kumar & Mittal (2006), “Effect of blockage on critical parameters for flow past a circular cylinder”**；[DOI](https://doi.org/10.1002/fld.1098) | 二维线性稳定性，\(0.005\le D/H\le0.125\)。 | 一次失稳阈值对侧边界距离呈非单调变化，而临界无量纲频率随阻塞单调升高；解释历史 \(St_c\) 离散的一部分。 | 2D 固定圆柱；不能据此给移动摆的阻塞修正。 | **P1 / T2** |
| **Williamson (1989), “Oblique and parallel modes of vortex shedding …”**, JFM 206；[DOI](https://doi.org/10.1017/S0022112089002429) | 长圆柱低 \(Re\) 尾迹；端部条件可诱导斜脱涡或平行脱涡。正文给平行脱涡关系（\(49\le Re\le180\)）：\(St=-3.3265/Re+0.1816+1.600\times10^{-4}Re\)。 | 低 \(Re\) 的 Strouhal 跳变与斜脱涡模态切换及端部条件有关；即便跨距达数百 \(D\)，端部仍能控制斜脱涡。 | 公式对应固定圆柱、特定平行脱涡处理；自由表面有限湿段不保证满足。 | **P1 / T1–T2** |
| **Williamson & Brown (1998), “A series in \(1/\sqrt{Re}\) …”**；[DOI](https://doi.org/10.1006/jfls.1998.0184) | 汇集并重新组织固定圆柱层流脱涡的一手测量；正文提出两项式 \(St=0.2665-1.0175/\sqrt{Re}\)。 | 可作低至中等 \(Re\) 固定圆柱起始脱涡频率标度，并与设备自有空载谱比较。 | 不是高幅 VIV 锁定后的频率律；不要跨越粗糙度/拖曳危机或自由表面区间外推。 | **P1 / T1** |
| **Barkley & Henderson (1996), “Three-dimensional Floquet stability analysis of the wake of a circular cylinder”**, JFM 322；[DOI](https://doi.org/10.1017/S0022112096002777) | 无限跨距圆柱二维周期基流的三维 Floquet 稳定性；低阻塞数值。 | Mode A：\(Re=188.5\pm1.0\)，\(\lambda_z/D=3.96\pm0.02\)；Mode B：\(Re=259\pm2\)，\(\lambda_z/D=0.822\pm0.007\)。在 \(Re=190\) 的二维周期基流，表 2 给 \(St=0.1954\)、\(\overline C_D=1.3442\)、波动 \(C'_D=0.0293,C'_L=0.4655\)。 | 这是二维基流的线性失稳；真实实验非线性 A→B 可约从 \(Re\sim230\) 开始。表中撇号系数不应擅自改称 RMS。\(Re=190\) 的二维流在三维中已线性不稳，不能当真实三维载荷真值。 | **P1 / T1–T3** |
| **Williamson (1996), “Three-dimensional wake transition”**, JFM 328, 345–407；[DOI](https://doi.org/10.1017/S0022112096008750) | 固定圆柱实验，特别控制端部污染、位错和跨向模态。 | 清洁实验 Mode A 起点约 \(Re=194\)，跨向尺度约 3–4D，与 Floquet 188.5 接近；Mode B 约 \(D\) 尺度，实验中 A/A\(^*\)→B 的非线性转换约分布在 \(Re=230\!\sim260\)。 | 实验有限扰动、端部和 Mode A 的弱亚临界性使阈值不是单一常数；不能把 194 与 188.5 当矛盾，也不能把 Mode B 的 259 当所有有限柱硬门。 | **P1 / T1–T2** |

这些证据给出三个必须分开的门：\(Re\approx47\) 是固定圆柱二维尾迹的 Hopf 门；\(Re\approx189/259\) 是二维周期尾迹对三维扰动的门；摆式 VIV 起振还取决于 \(I^*,\zeta,U^*\)、曲率、湿长、端部、自由表面和阻塞。三者不能压成单个“涡街临界速度”。

## 6. 经典横流 1-DOF VIV：分支、滞回、锁频和能量

### 6.1 核心一级证据

| 来源 | 几何/参数域 | 可迁移结论 | 不可迁移边界 | 等级/迁移 |
|---|---|---|---|---|
| **Williamson & Roshko (1988), “Vortex formation in the wake of an oscillating cylinder”**；[DOI](https://doi.org/10.1016/S0889-9746(88)90058-8) | 规定横流正弦运动，拖曳水槽；\(300<Re<1000\)。总扫描约 \(0<A/D<5\)、\(0<\lambda/D<15\)，基本锁频区重点约 \(0.2<A/D<1.8\)、\(1<\lambda/D<10\)，其中 \(\lambda/D=U/(f_eD)\)。 | 原始定义：lock-in 是涡形成频率与物体运动同步。建立 2S（每周期两个单涡）、2P（两对涡）、P+S（一对加一单涡）图；2S→2P 的突然重组可解释力/相位突跃。 | 强迫而非自由振动；\(A-\lambda\) 图不是 \(A-U/(f_ND)\) 图。作者明确指出 \(Re<300\) 时相关区域可由 P+S 取代 2P，不能把模态边界视为通用。 | **P1 / T1** |
| **Khalak & Williamson (1999), “Motions, forces and mode transitions … at low mass-damping”**；[DOI](https://doi.org/10.1006/jfls.1999.0236) | Cornell 竖直刚性圆柱、空气轴承、端板，横流直线 1-DOF；系列约 \(m^*=1\!\sim\!20\)，代表 \(m^*=10.1,\zeta=0.0013\)，主图约 \(U^*=2\!\sim\!14\)，\(Re\) 数千至约 \(10^4\)。 | 低质量—低阻尼出现 initial/upper/lower 三分支；initial→upper 有升/降速滞回，代表点约 \(U^*=4.70/4.50\)；upper→lower 可在两态间驻留 5–20 周期并伴总力相位近 \(0^\circ/180^\circ\) 切换。峰值和带宽不由 \(m^*\zeta\) 单独决定。 | 端板近二维、完全浸没、均匀直线横移；这些精确 \(U^*\)、幅值和相位只属于该系列。间歇区不能用单个长时平均相位描述。 | **P1 / T1** |
| **Govardhan & Williamson (2000), “Modes of vortex formation and frequency response of a freely vibrating cylinder”**；[DOI](https://doi.org/10.1017/S0022112000001233) | 同一 Cornell 1-DOF 系列；同步位移、总力和 DPIV。低质量比工况降至 \(O(1)\)。 | 两次相变必须分开：响应频率穿过静水固有频率时 vortex phase 跳并发生 2S↔2P；穿过真空固有频率时 total phase 跳，但 upper/lower 均可为 2P。推得临界质量比约 \(m^*_{crit}=0.54\)；其下 lower branch 理论上不可达。 | “无限上分支”是模型外推；实验只观察到设施最高流速。wake–body 同步不等于 \(f=f_N\)。仍是直线、完整浸没、端板条件。 | **P1 / T1** |
| **Morse & Williamson (2006), “Employing controlled vibrations to predict fluid forces …”**；[DOI](https://doi.org/10.1016/j.jfluidstructs.2006.04.004)；[作者稿](https://ecommons.cornell.edu/bitstreams/4b20b579-2379-46c8-9d88-9fc94cddd22c/download) | 同一圆柱、同一浸没/端部配置分别做自由和规定正弦振动；匹配 \(A,f,Re\)。 | 自由响应近正弦且几何/端部/\(Re,A,f\) 精确匹配时，规定运动测得的流体力可近似预测自由 VIV。 | 不能把任意强迫圆柱数据库搬到摆式、非正弦、多 DOF 或时变浸没系统。 | **P1 / T1** |
| **Klamo, Leonard & Roshko (2006), “The effects of damping on the amplitude and frequency response …”**；[DOI](https://doi.org/10.1016/j.jfluidstructs.2006.04.009)；[作者页](https://authors.library.caltech.edu/records/dfb6y-3ft71) | 弹性支承横流 1-DOF，磁涡流阻尼可调；系列约 \(525<Re<2600\)，跨质量、刚度、阻尼。 | upper branch 会随阻尼增大或 \(Re\) 降低而逐步侵蚀；同一 \(m^*\zeta\) 不能唯一分类，\(Re\) 和 \(\zeta\) 有独立作用；低 \(Re\) 时 lower→desynchronization 还可有额外滞回。 | 与题面高 \(Re\)、自由表面和转动坐标不同；只用“质量—阻尼积”做相似准则不充分。 | **P1 / T1** |
| **Morse & Williamson (2009), “Fluid forcing, wake modes, and transitions …”**；[DOI](https://doi.org/10.1016/j.jfluidstructs.2008.12.003)；以及 **“Prediction of VIV response by employing controlled motion”**；[DOI](https://doi.org/10.1017/S0022112009990516) | Cornell 竖直圆柱 \(D=3.81\) cm、\(L/D=10\)，下端板隙约 2 mm；固定 \(Re=4000,12000\)，每个 \(Re\) 5680 工况，每点 100 周期；\(A^*=0.02\!\sim\!1.6\)、\(\lambda^*=2\!\sim\!16\)。 | 高分辨率识别 2P\(_O\)（每周期两对涡、次级涡很弱）和 2P↔2P\(_O\) 间歇。以周期流体输入减结构耗散构成能量图；\(E_{net}=0\) 只给候选幅值，还须用斜率判稳定性，才可预测滞回和间歇。 | 正流体功是自由振动的必要而非充分条件。数据库受端板、直线正弦运动和固定 \(Re\) 限定；摆式必须重新建能量图。 | **P1 / T1** |

### 6.2 Facchinetti–de Langre–Biolley 尾流振子：可用的经验层与严格边界

**完整来源**：M. L. Facchinetti, E. de Langre & F. Biolley, “Coupling of structure and wake oscillators in vortex-induced vibrations,” *Journal of Fluids and Structures* **19**(2) (2004), 123–140；[DOI 10.1016/j.jfluidstructs.2003.12.004](https://doi.org/10.1016/j.jfluidstructs.2003.12.004)。本轮已核 18 页出版社正文，SHA-256 见 §1.3。

论文研究的是均匀稳态横流中、完全浸没、单位跨距、横流直线 1-DOF 弹性圆柱。结构用线性振子，尾迹变量 \(q=2C_L/C_{L0}\) 用 Van der Pol 振子；作者比较位移、速度和加速度三种**预设的线性耦合**。推荐的加速度耦合维度式为

\[
\left(m_s+\frac{\pi}{4}C_M\rho D^2\right)\ddot Y+
\left[r_s+\gamma\,2\pi St\frac{U}{D}\rho D^2\right]\dot Y+hY
=\frac14\rho U^2D C_{L0}q,
\]

\[
\ddot q+\epsilon\left(2\pi St\frac{U}{D}\right)(q^2-1)\dot q+
\left(2\pi St\frac{U}{D}\right)^2q
=\frac{A}{D}\ddot Y.
\]

正文采用/标定的代表常数为 \(C_M=1\)、\(St=0.2\)、\(C_{L0}=0.3\)、放大阻力 \(C_D=2\)（从而 \(\gamma=0.8\)）、\(\epsilon=0.3\)、\(A=12\)，即 \(A/\epsilon=40\)；质量数写成 \(M=0.05/m\)。作者引用的常数假设覆盖所谓亚临界 \(300<Re<1.5\times10^5\)，但这不是在该全域逐点做的新实验验证。

经正文许可的用途：

- 在作者比较的三类最简单线性耦合中，加速度耦合最能同时复现强迫力相位、lift magnification、Griffin 图趋势、锁频范围和低质量比持续同步；
- 模型可作为快速扫参与分岔假设生成器，或作为高保真/实验数据的低阶拟合骨架；
- 它明确区分 wake/vortex lift 与 total lift，且说明质量与阻尼不能只靠单一组合量决定 lock-in 宽度。

不可迁移边界同样是正文级结论，而不是事后苛责：

- 这是经验闭合，不是从 Navier–Stokes、自由表面或有限湿段唯一推导出的方程；加速度耦合只是三种受限候选中表现最好，不证明物理上唯一；
- Van der Pol 自激项预设固定体尾迹已有幅值为 2 的稳定极限环，因而**不含 \(Re\approx47\) 的固定尾迹 Hopf 开关**，也不能自行产生 Mode A/B、端部相消或卷气；
- \(St,C_{L0},C_D,C_M,\epsilon,A\) 被设为常数。论文还明确指出，其 \(A/\epsilon=40\) 标定使用了 \(C_{L,tot}\approx C_L\) 近似；若改用 total-lift magnification，合理比值可降到约 10，说明参数不是装置无关常数；
- 原模型是平移每单位跨距力方程。用于 canonical 旋转摆时，必须把流体作用沿湿段积分成力矩、使用局部速度和力臂，并重新辨识所有尾流参数；不得把 \(Y=R\theta\) 代换后宣称已得到题面的一阶原理模型；
- 该模型适合列为“经验 ROM/结构研究层”，不能替代三维两相 FSI、不能充当 Huera 104449 的无参数定量预测器，也不能作为官方答案。

证据等级：**P1**；迁移等级：**T1（模型形式）/T3（默认常数与定量曲线）**。

### 6.3 统一而不过度简化的状态叙述

| 状态 | 幅频/相位 | 典型尾迹 | 证据允许的说法 |
|---|---|---|---|
| initial 低速段 | 可多频并有相位滑移 | 主要 2S | 不应把整条 initial 都称严格周期 lock-in |
| initial 周期段 | 幅值随速度上升，总力相位靠近 \(0^\circ\) | 2S | 向 upper 可出现升/降速滞回 |
| upper | 最大幅值；低质量比频率可快速升高并偏离 \(f_{N,w}\) | 高分辨率下常见 2P/2P\(_O\) | “upper 必为普通 2P”过度简化 |
| upper–lower 间歇区 | 幅值、频率、总力相位在两态驻留切换 | 不同强度/形态的 2P 类 | 必须看瞬时或条件相位，不能只给长时均值 |
| lower | 中等幅值，总力相位靠近 \(180^\circ\) | 2P | upper→lower 的总相位跳不要求再发生一次 2S↔2P |
| desynchronized | 幅值衰减，多频/准周期 | 尾迹不再稳定锁到物体 | lower→脱锁滞回并非所有 \(Re\) 都有 |

对题面装置，“分支”必须通过上/下扫速和多次重复辨识；只做单向、稀疏扫速会把滞回、双稳态和间歇状态错误压成一条平滑曲线。

## 7. 有限跨距、自由端与端部条件

| 来源 | 几何/参数域 | 可迁移结论 | 不可迁移边界 | 等级/迁移 |
|---|---|---|---|---|
| **Slaouti & Gerrard (1981), “An experimental investigation of the end effects on the wake of a circular cylinder towed through water at low Reynolds numbers”**, JFM 112；[DOI](https://doi.org/10.1017/S0022112081000414) | 竖直圆柱在水中拖曳；\(D=1.00\) 或 1.27 cm，\(L/D\approx25\!\sim\!30\)，\(60\le Re\le200\)；正文对照清洁自由面、污染/有表面膜自由面、半浸没固体端板和下部自由端。 | 最接近题面水面端的端部证据：清洁自由面近似无剪切，涡线趋于垂直界面；污染面或固体端板允许涡线在面下闭合并强相互作用；下自由端使涡线弯向端部、尾流收缩。两端不对称会产生跨向相位差和斜脱涡。 | 低 \(Re\) 固定拖曳和可视化，不给可直接代入摆方程的 \(C_D,C_L\)。水面清洁度/表面膜必须单独记录。 | **P1 / T1–T2** |
| **Park & Lee (2000), “Free end effects on the near wake flow structure behind a finite circular cylinder”**, JWEIA 88；[DOI](https://doi.org/10.1016/S0167-6105(00)00051-9) | 单端固定、另一端自由；\(D=30\) mm，\(Re=2.0\times10^4\)，\(L/D=6,10,13\)，最大阻塞约 4.2%。 | 在给定测点，主 Kármán 峰随 \(L/D=13,10,6\) 约由 \(St=0.180,0.159,0.141\) 下移；自由端附近另有约 \(St_{tip}=0.072\) 的低频分量。常规 Kármán 分量两侧近反相，自由端分量近同相。有限湿段至少需要“交替侧涡+端涡/下洗低频”两类结构假设。 | 一端无滑移壁面、另一端自由，不是上端自由表面贯穿、下端自由的组合；单点谱不能当总跨力谱。 | **P1 / T2** |
| **Szepessy & Bearman (1992), “Aspect ratio and end plate effects on vortex shedding from a circular cylinder”**, JFM 234；[DOI](https://doi.org/10.1017/S0022112092000752) | \(D=60\) mm，\(L/D=0.25\!\sim\!12\)，\(8\times10^3\le Re\le1.4\times10^5\)，两块约 \(8D\times7D\) 大端板，阻塞约 7.7%。 | AR 与端板对升力非单调：在 \(Re\approx4.2\times10^4,L/D=0.8\) 时脉动升力比大 AR 高约 80%；约 \(Re=4.5\times10^4\) 时 \(St\) 从 \(L/D=6.7\) 的约 0.19 降到 \(L/D=1\) 的约 0.17。胞格频差可达 \(\Delta St\sim0.03\)，跨向相位可漂移约 \(180^\circ\)。 | 端板提高相干可能放大总升力；不能把端板当纯二维化/纯减载元件。阻塞也不小，数值不能分离归因给 AR 单项。 | **P1 / T2** |
| **Norberg (1994), “An experimental investigation of the flow around a circular cylinder: influence of aspect ratio”**, JFM 258；[DOI](https://doi.org/10.1017/S0022112094003332) | 固定圆柱，\(Re\approx50\!\sim\!4\times10^4\)，低阻塞；用直径比 10–30 的端板改变有效 AR，测中跨 \(St\) 与基底吸力。 | 即使 AR 很大，均匀流中也不能保证全跨平行脱涡；在 \(Re\sim4\times10^3\!\sim10^4\) 达到 AR 无关状态可能需 \(L/D\sim60\!\sim70\)。小 AR 和小端板可出现规则脱涡/不规则流双稳态。 | 固定圆柱且重点是中跨量；题面湿段的一端是自由表面、另一端可能是自由端或近底部，不等价于双端板。 | **P1 / T2** |
| **Inoue & Sakuragi (2008), “Vortex shedding from a circular cylinder of finite length at low Reynolds numbers”**, PoF 20, 033601；[DOI](https://doi.org/10.1063/1.2844875) | 固定有限长圆柱低 \(Re\) 三维数值，单端壁安装/另一端自由；考察 AR 和端部涡。 | 低 AR 时端部下洗可抑制经典 Kármán 脱涡并产生完全三维的弧形/发卡结构；AR 本身可改变是否出现周期横向力。 | 固壁安装柱，不含自由表面或结构运动；不能把其临界 AR 数字直接当湿长阈值。 | **P1 / T2** |
| **Zhao & Cheng (2014), “Vortex-induced vibration of a circular cylinder of finite length”**, PoF 26, 015111；[DOI](https://doi.org/10.1063/1.4862548) | 有单个自由端的有限长刚性圆柱，1-DOF VIV 数值；低 \(Re\)。 | 自由端流会改变幅值、频率、同步宽度和尾迹；小 AR 可抑制脱涡和 VIV。 | 单端悬臂/完全浸没、低 \(Re\)，与上端自由表面贯穿的竖直摆不同。 | **P2 / T2** |
| **Azadeh-Ranjbar, Elvin & Andreopoulos (2018), “VIV of finite-length circular cylinders with spanwise free-ends: Broadening the lock-in envelope”**, PoF 30, 105104；[DOI](https://doi.org/10.1063/1.5042774) | 两个跨展向自由端的有限长刚性圆柱接弹性支承，实验改变 AR。 | 自由端与 AR 可以显著拓宽 lock-in 包络；不能假定“端部只降低有效面积”。 | 两端自由、平移支承，不是水面贯穿+水下自由端组合；题面需要自己的端部拓扑分类。 | **P2 / T2** |
| **Cajas et al. (2023)**，见 §4 | 枢接有限柱，\(Re=100\)，AR=2,3,5,7。 | 在同一转动 FSI 拓扑下直接显示 AR 改变起振点、同步区和尾迹；AR=2,3 低速甚至无周期横向力。 | 数字不能跨 \(Re\)/自由表面迁移。 | **P1 / T2** |

题面实验至少要冻结并报告：湿长 \(h/D\)、水下自由端到槽底间隙 \(g_b/D\)、水线端的界面条件、圆柱总长/湿长、是否有端板以及端板直径/间隙。仅报告 \(D\) 和 \(Re\) 无法复现实验。

## 8. 表面贯穿与自由表面

| 来源 | 几何/参数域 | 可迁移结论 | 不可迁移边界 | 等级/迁移 |
|---|---|---|---|---|
| **Suh, Yang & Stern (2011), “The effect of air–water interface on the vortex shedding from a vertical circular cylinder”**, JFS 27, 1–22；[DOI](https://doi.org/10.1016/j.jfluidstructs.2010.09.001) | 固定、界面贯穿竖直圆柱的两相 LES；\(Re=2.7\times10^4\)，\(Fr=0.2,0.8\)。域高 6D（水 4D、空气 2D），圆柱中心到外边界 20D；Level-set/ghost-fluid 界面和动态 SGS。 | 深水处有组织的周期脱涡在界面附近被衰减并由小尺度涡替代；近界面流向涡量和向外横向速度使分离剪切层彼此偏离，抑制相互作用；效应随 \(Fr\) 增强。 | 固定圆柱 LES，不含 VIV、摆角、端部运动或通道侧壁；不能由“近表面削弱”直接算题面总力或幅值。 | **P1 / T1–T2** |
| **Ageorges, Peixinho & Perret (2019), “Flow and air-entrainment around partially submerged vertical cylinders”**, PR Fluids 4, 064801；[DOI](https://doi.org/10.1103/PhysRevFluids.4.064801)；[作者稿](https://arxiv.org/abs/1905.08015) | 11 根固定竖直表面贯穿圆柱在静水中拖曳，\(D=1.4\!\sim\!16\) cm；34 m×0.9 m×1.2 m 水槽，水深 0.40 m；恒湿长 \(h=23\) cm 或恒 \(h/D=2.55\)，共 372 次；\(4500<Re<240000\)、\(0.2<Fr<2.4\)。 | 表面贯穿圆柱的阻力系数相对单相基线约低 30%（其比较条件）；\(Fr\approx1.2\) 附近力规律转换，较高 \(Fr\) 会出现尾迹/壁面空腔两种卷气并改变阻力。\(D=5\) cm 示例：无卷气 \(Re=34670,Fr=0.97\)；尾迹卷气 \(39700,1.11\)；空腔卷气 \(45680,1.30\)。 | 固定拖曳而非自由 VIV；高 \(Re\) 湍流。其最大横向阻塞达 0.177，且作者自述部分垂向限制不满足 ITTC 条件；“约低 30%”不能当普适修正系数。 | **P1 / T1–T2** |
| **Chaplin & Teigen (2003), “Steady flow past a vertical surface-piercing circular cylinder”**, JFS 18, 271–285；[DOI](https://doi.org/10.1016/j.jfluidstructs.2003.07.009)；[作者仓储](https://eprints.soton.ac.uk/53806/) | 竖直表面贯穿圆柱拖曳/稳态载荷，较大湿长；扫描基于 \(D\) 的 Froude 数。 | 总阻力随 \(Fr\) 有明显峰值；自由表面附加载荷不可由单相二维 \(C_D\) 常数表示。 | 稳态固定圆柱、不测横向自由响应；只证明自由表面会引入独立 \(Fr\) 依赖。 | **P1 / T2** |
| **Leong & Wei (2008)** 与 **Huera-Huarte (2026) 104449**，见 §4 | 都是表面贯穿且会运动的枢接圆柱；前者底铰 2-DOF、后者上部主轴横流 1-DOF。 | 直接证明自由表面贯穿运动圆柱可以进入宽上分支或典型 VIV 锁频；也证明支承拓扑会显著改变分支。 | 两者装置不同，不能互相视作复现实验；题面若保持圆柱全过程竖直还需第三种几何。 | **P1 / T0–T2** |

因此，题面至少需要 \((Re,U^*,Fr,h/D)\) 四维报告，而不能只画振幅—流速曲线。若观察到气泡、壁面后方空腔、水面破碎或明显波列，应把该运行从“弱自由表面扰动 VIV”单独分支，不能用调整 \(C_D\) 悄悄吸收。

## 9. 水槽阻塞、侧壁与有限水深

| 来源 | 几何/参数域 | 可迁移结论 | 不可迁移边界 | 等级/迁移 |
|---|---|---|---|---|
| **Sahin & Owens (2004), “A numerical investigation of wall effects up to high blockage ratios …”**, PoF 16, 1305–1320；[DOI](https://doi.org/10.1063/1.1668285) | 2D 固定圆柱置于两无滑移壁之间；Poiseuille 入口；\(\beta=D/H\)，且 \(Re=U_{max}D/\nu\)、\(St=fD/U_{max}\)。正文表：\(\beta=0.01,0.10,0.20,0.30\) 时 \(Re_c=46.74,50.75,69.34,94.40\)，\(St_c=0.1167,0.1211,0.1567,0.2093\)。 | 10% 固壁阻塞已使该定义下 \(Re_c\) 增约 8.6%；20% 增约 48%。高阻塞还会出现稳态对称→稳态非对称 pitchfork，不能再作小扰动修正。 | 两固壁、2D、Poiseuille 且用中心最大速度；开放自由表面或用截面均速定义的 \(Re\) 不可直接数值比较。 | **P1 / T2** |
| **Rehimi et al. (2008), “Experimental investigation of a confined flow downstream of a circular cylinder centred between two parallel walls”**, JFS 24, 855–882；[DOI](https://doi.org/10.1016/j.jfluidstructs.2007.12.011) | 闭式水槽 3.3 m×0.30 m×0.03 m；\(D=10\) mm、跨满宽 \(L/D=30\)，\(\beta=1/3\)，\(30\le Re\le277\)。 | 实验第一脱涡约 \(Re_c\simeq108\)，约为无界值 2.3 倍；流向尾迹波长约 3D，而无界通常约 5–6D；Mode A 型约在 \(Re\simeq159,\lambda_z\sim3D\) 出现。壁面可推迟第一 Hopf 却使三维结构相对无界提前，不能用一个“有效 \(Re\)”吸收。 | 极高固壁阻塞、跨满圆柱，不是部分浸水摆；只用作反例和网格/槽宽验证靶。 | **P1 / T2–T3** |
| **West & Apelt (1982), “The effects of tunnel blockage and aspect ratio on the mean flow past a circular cylinder …”**, JFM 114；[DOI](https://doi.org/10.1017/S0022112082000202) | 固定圆柱风/水槽实验，\(10^4\lesssim Re\lesssim10^5\)，阻塞 2%–16%，AR=4–10，全部有端板。 | 在该固定体实验中，阻塞 <6% 时压力、平均阻力变化小且 \(St\) 近乎不变；6%–16% 明显扭曲压力和 \(St\)，常用动量/镜像修正不能可靠恢复无阻塞阻力。 | 这个“6%”不是移动体安全线；振动圆柱尾迹更宽，且题面另有自由表面和有限湿长。 | **P1 / T2** |
| **Kumar & Mittal (2006)**，见 §5 | 固定 2D 圆柱，\(0.5\%\le\beta\le12.5\%\)。 | \(Re_c\) 对阻塞非单调、\(St_c\) 单调增；小域数值会污染固定尾迹基准。 | 不给自由 VIV 的校正公式。 | **P1 / T2** |
| **Prasanth et al. (2006), “Effect of blockage on vortex-induced vibrations at low Reynolds numbers”**, JFS 22, 865–876；[DOI](https://doi.org/10.1016/j.jfluidstructs.2006.04.011) | 2D 低 \(Re\le150\) 有限元 FSI；低无量纲质量 \(m^*=10\)，零结构阻尼，顺/横流 2-DOF；比较 1% 与 5% 等横向阻塞。 | 对振动圆柱，5% 阻塞已可显著改变尾迹、响应与滞回；固定圆柱可接受的阻塞并不保证 VIV 可接受。 | 2D、低 \(Re\)、零阻尼、2-DOF 数值；不能直接给题面高 \(Re\) 的误差百分比。 | **P1 / T2** |
| **Prasanth & Mittal (2008), “Effect of blockage on free vibration of a circular cylinder at low Re”**, *International Journal for Numerical Methods in Fluids* 58, 1063–1080；[DOI](https://doi.org/10.1002/fld.1771) | 2D 低 \(Re\) 自由 VIV，\(m^*=10\)；详细比较 1% 和 5% 阻塞。 | 5% 阻塞时同步区低、高 \(Re\) 两端都可有滞回；1% 时只在高端出现。峰值横幅约 \(0.6D\) 在其扫描中近似不随阻塞，但同步端点与滞回性质会变。 | “峰值不变”不等于阻塞无影响；数值模型和低 \(Re\) 不能迁移为题面误差界。 | **P1 / T2** |

题面装置应同时记录名义横向阻塞 \(D/W\)、最大运动包络阻塞 \((D+2A_y)/W\)、湿长/水深 \(h/H\)、底隙 \(g_b/D\)、圆柱到两侧壁的非对称间隙以及来流剖面。静止圆柱的 <6% 经验不应被当作 VIV 的“无需修正”许可证。

## 10. 证据综合：当前可写入理论的最小因果链

### 10.1 起振与稳态振幅

对选定的单角装置，统一广义方程应写成

\[
I(\theta,h)\ddot\theta+C_s(\theta,\dot\theta) +
\frac{\partial V_g}{\partial\theta}+
\frac{\partial V_b}{\partial\theta}+
M_{\mathrm{support}}(\theta)
=M_f[\theta,\dot\theta;\,\mathbf u,p,\eta],
\]

而不是先假定一个谐波升力。流体由带运动边界和自由表面的 Navier–Stokes 问题决定，湿段、力臂和圆柱姿态都随所选拓扑确定。小扰动起振需满足流固耦合特征值实部过零；非线性稳态需满足

\[
\overline{P_f}
=\frac{1}{T}\int_0^T M_f\dot\theta\,dt
=\overline{P_{\mathrm{diss}}},
\]

并且幅值扰动后的净功斜率给稳定回复。Morse–Williamson 的能量图直接支持这一判断；仅发现 \(f_s\approx f_N\) 或升力谱峰不够证明稳定极限环。

### 10.2 锁频的四个不同问题

实验和成稿必须分别回答：

1. 尾迹/涡形成主频是否与物体频率 1:1、2:1、3:1 或无理比同步？
2. 物体频率是否接近静水固有频率或空气/真空固有频率？
3. 流体力矩相对位移、速度的相位和每周期净功是什么？
4. 该能量平衡是稳定、非稳定还是与另一分支双稳/间歇？

把四者都叫 “resonance” 会掩盖 Govardhan–Williamson 的两次相变、Bourguet 的亚谐同步以及 upper–lower 间歇。

### 10.3 允许迁移与禁止迁移

可以迁移：

- 用固定圆柱 \(St(Re)\) 给初始涡频尺度；
- 用 \(U/(fD)\) 把自由响应映射到强迫振动轨迹图；
- 同步测位移、力矩/载荷、相位和尾迹；
- 用上/下扫速、多次重复、条件统计识别滞回和间歇；
- 用 2S、2P、P+S、2P\(_O\)、2C 作为可证伪尾迹标签；
- 用周期功平衡和稳定性而非“频率接近”预测自维持幅值。

禁止直接迁移：

- 任意固定的 \(U^*\approx5\) 起振/锁频端点或 \(A/D\approx1\) 峰值；
- 直线横移的 \(m^*\) 代替转动惯量比 \(I^*\)；
- 端板近二维圆柱的尾迹和力系数代替水面贯穿有限湿段；
- \(Re<300\) 仍强制使用 2P 模态；
- “相位跳约 \(180^\circ\)”等同于每次都发生 2S→2P；
- “\(f\ne f_N\)”等同于脱锁；
- 104449 的 \(C_a=1\)、小角方程、峰值 \(U^*\) 或作者排版错误作为官方答案。

## 11. 对后续实验/计算的证据驱动优先级

### 11.1 首轮必须冻结的装置量

- 悬挂拓扑、允许自由度、枢轴方向、圆柱是否全过程保持竖直；
- \(D\)、总长、静态湿长 \(h\)、摆臂/圆弧半径 \(R\)、质心/浮心/湿段相对枢轴的位置；
- 结构总质量与枢轴惯量、空气与静水固有频率、空气与静水自由衰减阻尼；
- 槽宽 \(W\)、水深 \(H\)、底隙和侧隙、入口发展段、速度剖面和湍流度；
- 水温与 \(\nu\)、表面状态、是否出现水面破碎/卷气；
- 初始条件、扫速方向、等待稳态的判据、采样率和记录长度。

### 11.2 最小参数地图

优先扫描

\[
(Re,\ U^*,\ I^*,\ \zeta,\ R/D,\ h/D,\ Fr,\ D/W,\ g_b/D),
\]

并在每个工况输出 \(A_y/D\)、可能的 \(A_x/D\)、\(f/f_{N,w}\)、\(U/(fD)\)、载荷/力矩谐波、流体净功、相位、尾迹模态、跨展向相关和水面状态。第一轮不必穷举九维空间，但必须做成分层试验：先固定边界得到 \((U^*,I^*,\zeta)\) 分支，再一次只改变 \(h/D\)、\(Fr\)、阻塞或端隙，并设置重复/回扫。

### 11.3 需要与固定体基线配对的测量

在同一 \(D,h,W,H,U\) 下先固定摆，测 \(f_s,St,C_D,C_L'\) 和跨展向相干；再释放装置。这样才能区分：固定尾迹本来就被自由表面/端部压制、结构运动诱发/恢复脱涡、以及真正的锁频反馈。否则只看到摆的频谱无法验证因果链。

## 12. Reference Kit 与其他二手材料的处理规则

- Reference Kit 不属于 IYPT IOC 官方题面，也不是官方答案；本备忘录没有把其中任何模型、数值、图或解释作为证据。
- 若 Kit 指向 DOI，只把 DOI 当检索入口；关键结论必须回到出版正文或作者稿重新核对。
- Williamson & Govardhan 等综述、Blevins 教材和数据库页面可帮助术语定位，但本矩阵的定量结论均应追溯到上列原始研究。
- 未能取得正文的 104619 已明确降为 P3，而不是用摘要空缺处拼接相邻论文参数。

## 13. 缺口与下一步取证

1. **104619 全文缺口（最高优先）**：已核 DOI、出版元数据和摘要，但尚未取得可独立读取的开放 PDF。下一步从作者/机构仓储或出版社开放附件取得正文，逐项补：是否复用 104449 装置、上游圆柱 \(D\) 和间距比、\(Re/U^*\) 扫描、孤立/串列分支端点、相位定义、是否有 PIV/力矩测量。取得前不得把摘要结果用于校准。
2. **canonical 的实际几何仍待冻结**：拓扑已选为顺流固定轴、横流 1-DOF 刚性旋转摆，但枢轴高度、圆柱轴向端点、质量/惯量分布、零角湿长、底隙及机械限位仍未定。四杆竖直平移摆只作对照；两者的湿润几何、惯量和分布水动力不可共用。
3. **自由表面运动 FSI 数据不足**：当前最直接的是 104449 与 Leong–Wei，但缺少同时测角位移、分布压力/PIV、自由面形状和跨展向涡量的孤立圆柱数据。建议检索作者原始数据或开展同步 PIV/水面测量。
4. **有限湿段与水面端的系统分离实验不足**：固定体研究表明 \(h/D\) 和自由表面重要，但与 \(I^*,\zeta\) 联合扫描的一手 VIV 数据很少。需设计同一装置的 \(h/D\) 系列，而不是借用不同圆柱/不同支架横向比较。
5. **阻塞在高 \(Re\)、表面贯穿摆上的定量误差界缺失**：现有强证据多为固定体或 \(Re\le150\) 的 2D VIV。需做至少两个槽宽/圆柱直径比，或以经过验证的 3D 两相 FSI 对实槽和加宽域配对。
6. **低质量/低惯量极限缺少装置自有验证**：经典 \(m^*_{crit}\approx0.54\) 属直线平移端板圆柱；摆式应以 \(I^*\)、浮力回复和自由表面重新求临界条件，不得直接复用。
7. **阻尼辨识不闭合**：104449 的空气衰减约 9%，但方程又将结构阻尼近似忽略并把流体阻尼并入残差。题面装置需分别做空气/静水自由衰减、轴承摩擦矩与幅值依赖辨识，并给不确定度。
8. **表面张力/润湿与卷气边界缺失**：Ageorges 显示卷气会改变阻力；小直径或污染水面还可能需要 Weber/Bond/接触角。下一步先通过视频判别是否进入破面/卷气，再决定是否扩展参数组。
9. **分支/滞回证据需本装置复现**：每个临界区加密上扫、下扫并重复释放；以瞬时相位和状态驻留时间而非单个 FFT 峰判断 upper–lower 间歇。
10. **原始数据可得性**：104449 声明数据可向作者索取；应优先请求角位移、力矩、流速点和无制动/制动运行元数据，用于独立复算幅值、频率、相位，并处理 Sec. 5/Fig. 5 的 \(U^*\) 及 Fig. 4–5 制动状态标签不一致。

下一轮 R1 工作应先关闭第 1、2、3 项，再把已经冻结的几何和参数范围交给 R2 连续体/变分模型与 R4 实验验证；本备忘录到此不作最终现象答案。
