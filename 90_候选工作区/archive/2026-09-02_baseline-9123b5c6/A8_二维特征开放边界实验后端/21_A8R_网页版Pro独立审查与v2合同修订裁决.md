# A8R 网页版 Pro 独立审查与 v2 合同修订裁决

## 1. 审查范围与证据边界

本轮独立审查对象为：

- A8R v1 结果前 Markdown 合同；
- A8R v1 TypeScript 机器合同；
- 正式 `lbm.ts` 的 D2Q9--MRT--Brinkman 步进、Guo 力源、迁移和开放边界顺序；
- A8Q 运行实现、统计实现、资格报告和既有 Pro 裁决；
- 当前 README 与交接文件。

本轮没有创建 A8R 合同测试、无结果实现、运行器、断言器或研究产物，没有执行任何 $D=24,36,54$ A8R 轨迹，也没有修改正式理论或正式程序。

A8R v1 仍是结果盲合同。由于尚无 A8R 数值结果，当前可以在不发生结果后选门的前提下建立 v2 合同。

## 2. 独立裁决

本轮裁决为：

`ACCEPT-A8R-V1-PRO-RAW-DISCRETE-CONTROL-VOLUME-IDENTITY-IN-PRINCIPLE`

`REJECT-A8R-V1-PRO-STATISTICAL-ROBUSTNESS-CONTRACT-AS-FINAL`

`REQUIRE-A8R-V2-PRO-CYCLE-RESOLVED-AND-LATTICE-PHASE-CONTRACT`

`KEEP-A8R-PRO-RESULT-BEFORE-EXECUTION-LOCKED`

具体含义如下：

1. v1 预注册的内部 D2Q9 链路控制体人口动量预算，在控制体及一链路 halo 远离全局边界且包含全部 Brinkman 力支撑时，原则上可以独立重建正式原始反力；
2. v1 的统计稳健性门不足以区分离散路线趋势与有限统计窗、尾流相位和格点相位效应，不能作为最终结果前合同；
3. v1 不得进入合同测试、无结果实现或研究矩阵；
4. 下一步只允许建立并推送 A8R v2 结果前合同和对应机器合同，再交回独立 Pro 审查。

## 3. 可以接受的部分

### 3.1 结果前身份链

v1 保持了合同、合同测试、无结果实现和研究运行的分离顺序，绑定正式源与 A8Q 机器锚，并要求 $D=24$ 新运行与 A8Q 公共投影零容差一致。这些原则应原样保留到 v2。

### 3.2 原始反力的离散控制体恒等式

对固定内部控制体 $\Omega$，设 $\boldsymbol P_\Omega^n$ 为步前人口动量，$\boldsymbol\Phi_\Omega^n$ 为碰撞后经迁移穿过控制面的净向外人口动量。正式碰撞在守恒动量模中加入 Brinkman 力，内部链路迁移满足：

$$
\boldsymbol P_\Omega^{n+1}
-\boldsymbol P_\Omega^n
+\boldsymbol\Phi_\Omega^n
=\sum_{\boldsymbol x\in\Omega}\boldsymbol F_B^n(\boldsymbol x).
$$

若全部非零 mask 和 Brinkman 力支撑都位于 $\Omega$ 内，则流体对固体的正式原始反力可以由：

$$
\boldsymbol F_{\mathrm{CV,raw}}^n
=-\left(
\boldsymbol P_\Omega^{n+1}
-\boldsymbol P_\Omega^n
+\boldsymbol\Phi_\Omega^n
\right)
$$

独立重建。正式求解器先碰撞与迁移、再只在全局左右边界执行 Zou--He 覆盖；只要控制体及 halo 位于内部，边界覆盖不会进入该离散恒等式。

该门的结论上限只能是“正式原始 Brinkman 反力与人口动量账一致”。它不是连续应力积分、锐界面力、无滑移极限或实验载荷验证。

### 3.3 A2 代数身份的结论上限

从独立人口视图重新计算：

$$
\Delta\boldsymbol P_\chi^n
=\sum_{\boldsymbol x}\chi(\boldsymbol x)
\left[
\rho^{n+1}\boldsymbol u^{n+1}
-\rho^n\boldsymbol u^n
\right]
$$

并形成：

$$
\boldsymbol F_{\mathrm{CV,A2}}^n
=\boldsymbol F_{\mathrm{CV,raw}}^n
+\Delta\boldsymbol P_\chi^n
$$

可以检查 A2 修正公式的独立重算一致性，但不能把同一 A2 公式的再次计算写成第二种物理取力法。v2 必须把“原始力离散恒等式”和“A2 修正公式重算”拆成两个不同门。

## 4. v1 的实质性缺口

### 4.1 四分块统计过短，不能承担贴门裁决

A8Q 的两个 $D=24,\eta_{\mathrm{lu}}=1$ 算例给出 $St=0.19675$ 和 $0.19450$。因此，40 个对流时间的完整分析窗只有约：

$$
N_{\mathrm{cycle}}=40St\approx7.8
$$

个脱涡周期；v1 的每个 10 对流时间分块只有约：

$$
N_{\mathrm{cycle,block}}=10St\approx1.95
$$

个周期。

即使信号是纯正弦，长度为 $L$ 个周期的有限窗均方值仍具有起始相位依赖：

$$
\left\lvert
\left\langle\sin^2\right\rangle_L-\frac12
\right\rvert
\le
\frac{\left\lvert\sin(2\pi L)\right\rvert}{4\pi L}.
$$

当 $L\approx1.95$ 时，右端约为 $0.0126$；对应的 RMS 相位偏差量级约为 1.3%，两个不同相位窗口之间可达到数个百分点。A8Q 的跨 mask 升力 RMS 只有 0.00488 个百分点的门限余量，远小于这一有限窗效应量级。

因此，四个固定时间分块可以保留为诊断，但不能直接承担 PASS、INCONCLUSIVE 或 NO-GO 的终局门。分块内的 Strouhal 搜索也只有约两个周期，其 $0.00025$ 搜索步长不代表同量级的频率分辨能力。

### 4.2 单一格点相位不能支持“稳健性”结论

v1 在所有分辨率只冻结一个圆柱横向亚格点相位。确定性复跑只能证明同一离散相位的可重复性，不能证明对格点相位稳健。

A8Q 已经是 4.99512% 的贴门结果；在这一余量下，仅依靠更高分辨率而不加入任何亚格点相位扰动，仍可能把一个有利的单相位结果误判为 mask 稳健。v2 至少必须在 $D=54$ 对两个 mask 各加入一个相差半格的横向相位算例。

### 4.3 相邻增量严格门存在逻辑误判

v1 要求：

$$
\Delta_1\Delta_2\ge0,
\qquad
\lvert\Delta_2\rvert<\lvert\Delta_1\rvert.
$$

当 $Q_{24}=Q_{36}=Q_{54}$ 时，$\Delta_1=\Delta_2=0$，这是理想平台，但第二式为假，v1 会把它判为离散路线 NO-GO。

更一般地，当两个增量小于有限周期统计散布时，严格比较其符号和大小没有分辨力。未分辨的增量只能判 INCONCLUSIVE，不能自动判为物理或离散路线 NO-GO。

### 4.4 力账舍入尺度仍需完全展开

v1 的 $4096\epsilon_{\mathrm{mach}}$ 尺度可以作为候选起点，但机器合同没有把所有绝对求和项定义到足以无歧义实现的程度。v2 必须显式规定：

- 步前和步后控制体内每个人口动量项 $\lvert c_{i,\alpha}f_i\rvert$；
- 每条进出控制面链路的绝对动量项；
- 正式 Brinkman 力支撑内每格绝对力项；
- A2 修正中步前和步后每格 $\lvert\chi\rho u_\alpha\rvert$；
- mask 的全部非零支撑均位于控制体内部，而不只检查控制面 halo 为零。

合成场测试之外，还必须有不超过 40 步的正式求解器强迫与无强迫烟雾恒等式测试。烟雾输出不进入研究产物。

### 4.5 “外部资格”用语过强

当前固定圆柱目标与本合同的边界、域、近壁表示和取力路径并非同一数值身份。即使 $D=54$ 两个 mask 都进入冻结数值区间，也只能称为“文献接近度屏蔽”或“外部可比性观察”，不能称为外部载荷资格或物理验证。

## 5. A8R v2 的强制修订

### 5.1 文件与版本身份

v1 文件和提交保留为结果盲历史，不在原提交上重写。v2 应使用新阶段名和新文件，例如：

`VP-A8R-V2-CYCLE-RESOLVED-MULTIRESOLUTION-MASK-PHASE-AND-FORCE-IDENTITY-v1`

建议新增：

- `22_A8R_v2_周期分辨多分辨率mask相位与力身份预注册合同.md`；
- `src/brinkman-multiresolution-contract-v2.ts`。

v2 Markdown 和机器合同必须位于同一个独立提交并推送到远程 `main`。在其再次获得独立 Pro 接受前，不创建 v2 合同测试。

### 5.2 保留 A8Q 公共投影，同时新增周期分辨身份

$D=24$ 的 A8Q 公共投影仍按 v1 要求逐字段零容差一致；不得为周期统计改写既有 A8Q 字段。

v2 另建 A8R-only 周期统计。最低规则为：

1. 用完整分析窗平均升力去均值；
2. 以去均值升力的正斜率过零点定义周期边界，过零时间作线性插值；
3. 使用最后 7 个有效正斜率过零点定义最后 6 个完整周期；
4. 少于 7 个有效过零点时，统计证据不足，终局为 INCONCLUSIVE；
5. 对每个完整周期分别保存周期、平均阻力、平均升力、原始和去均值升力 RMS；
6. 保存最后 6 周期的聚合值、逐周期最小值、最大值和中位数；不得把确定性周期散布称为统计置信区间。

四个固定时间分块仍保存，但只作非平稳性和实现诊断，不直接决定终局。

### 5.3 冻结格点相位屏蔽

基线相位保持：

$$
\phi_y=0.17320508075688773\ \text{格}.
$$

在 $D=54$ 对两个 mask 追加半格平移相位：

$$
\phi_y'=\phi_y-0.5
=-0.32679491924311227\ \text{格}.
$$

由于横向边界为周期边界，该变化保持连续物理几何平移等价，只改变圆柱相对格点的亚格点相位。v2 的结果矩阵因此至少为 8 条轨迹：6 条基线多分辨率轨迹，加 2 条 $D=54$ 半格相位轨迹。

v2 必须分别记录：

- 两个相位内的跨 mask 差；
- 每个 mask 的跨相位差；
- 四个 $D=54$ 组合中的最坏周期分辨升力 RMS 差；
- 格点相位门失败时的 INCONCLUSIVE 语义。

### 5.4 增量门改为“已分辨 / 未分辨”三值逻辑

对每个分辨率的最后 6 周期指标构造确定性周期包络。相邻分辨率差的区间由两个周期包络的 Minkowski 差得到。

- 若两个增量区间均严格位于零的同一侧，且细一级增量的绝对上界小于粗一级增量的绝对下界，则该指标增量门 PASS；
- 若两个增量区间严格位于零的相反两侧，或细一级增量的绝对下界不小于粗一级增量的绝对上界，则在证据完整时该指标为已分辨 NO-GO；
- 其余包含零或包络重叠情形均为 INCONCLUSIVE；
- 精确平台不得判 NO-GO。

合同测试必须覆盖同向缩小、反向、已分辨不缩小、未分辨重叠和精确平台五类人工样例。

### 5.5 独立力门拆分

v2 至少拆分为：

- `independentRawPopulationMomentumIdentity`：独立人口控制体账与正式原始反力逐步一致；
- `independentA2FormulaRecomputation`：独立宏观重建后的 A2 修正公式与正式 A2 载荷逐步一致。

只有第一项可以称为独立原始力离散身份；第二项只能称为 A2 公式实现一致性。两者均不构成连续应力或实验载荷验证。

### 5.6 文献比较降级为观察项

将 `externalQualification` 改为 `literatureProximityScreen` 或等价名称。该观察项不得改变 A8R 离散终局代码，也不得用于选择 mask、相位或分辨率。

## 6. v2 终局语义建议

v2 仍保留三个终局类别，但 INCONCLUSIVE 必须显式覆盖统计窗和格点相位未分辨：

`PASS-A8R-V2-DISCRETE-MULTIRESOLUTION-MASK-PHASE-CANDIDATE-ONLY`

`INCONCLUSIVE-A8R-V2-STATISTICS-PHASE-MARGIN-OR-FORCE-IDENTITY`

`NO-GO-A8R-V2-RESOLVED-BRINKMAN-DISCRETE-ROUTE`

判定优先级应为：

1. 来源、算例、$D=24$ 锚、复跑、周期覆盖或力账证据不完整：INCONCLUSIVE；
2. 周期或格点相位包络没有分辨趋势或门限：INCONCLUSIVE；
3. 证据完整且稳定性、成熟性、核心滑移或增量趋势出现已分辨路线失败：NO-GO；
4. 只有来源、稳定、成熟、周期分辨趋势、双 mask、双相位和两类力身份全部通过：PASS。

任何 PASS 仍只允许再次交回独立 Pro；不自动解锁正式接入、规定横移、weak-FSI、三维、自由表面、装置预测或实验拟合。

## 7. 下一步与停止条件

下一次 Codex 任务只允许：

- 建立 A8R v2 Markdown 与 TypeScript 机器合同；
- 标记 v1 为被本裁决取代的结果盲历史；
- 更新 README 和交接；
- 对新 Markdown 执行严格 Pandoc 解析、数学分隔符、制表符和尾随空格检查；
- 提交并推送到远程 `main` 后停止。

下一次不得：

- 创建 v1 或 v2 合同测试；
- 创建无结果科学实现、运行器或断言器；
- 执行任何 A8R 研究轨迹；
- 修改 A8Q 科学源、产物、报告或冻结机器裁决；
- 修改正式理论或正式程序；
- 输出 Richardson 外推、GCI、锐界面、无滑移极限或载荷物理资格；
- 进入规定横移、weak-FSI、三维、自由表面、装置预测或实验拟合。
