# A8 高保真开放边界当前研究包

## 当前用途

本目录保留 A8N、A8O、A8P 的冻结候选复现链，A8Q Brinkman 缩放路径
屏蔽的完整候选证据与网页版 Pro 独立裁决，以及 A8R v1、v2 被后续
结果盲审查取代的历史。当前等待 Codex 只建立 A8R v2.1 结果前合同。
正式 `01_最终理论/**` 和 `02_模拟程序/**` 保持只读；候选区代码不是
正式模拟程序的补丁层，也不得原样迁入正式步进路径。

当前主线资料：

- `13_A8O_网页版Pro独立审查与下一路线裁决.md`；
- `14_A8P_离散因果参考与反对称成熟性预注册合同.md`；
- `15_A8P_离散因果参考与成熟性资格报告.md`；
- `16_A8P_网页版Pro独立审查与A8Q路线裁决.md`；
- `17_A8Q_Brinkman锐界面缩放路径预注册合同.md`；
- `18_A8Q_Brinkman锐界面缩放路径资格报告.md`；
- `19_A8Q_网页版Pro独立审查与A8R路线裁决.md`；
- `20_A8R_固定惩罚时间多分辨率稳健性与力身份预注册合同.md`；
- `21_A8R_网页版Pro独立审查与v2合同修订裁决.md`；
- `22_A8R_v2_周期分辨多分辨率mask相位与力身份预注册合同.md`；
- `23_A8R_v2_网页版Pro独立审查与v2_1修订裁决.md`；
- `90_候选工作区/交接说明_current.md`。

## 当前裁决

### A8N 与 A8O

- A8N 证据完整性：
  `ACCEPT-A8N-PRO-EVIDENCE-COMPLETE-CANDIDATE-ONLY`；
- S9 一维法向机制：
  `ACCEPT-A8N-PRO-S9-INCOMING-ONLY-NORMAL-ACOUSTIC-MECHANISM-FROZEN`；
- A8O 负面证据链：
  `ACCEPT-A8O-PRO-TRANSPARENT-NEGATIVE-EVIDENCE-CANDIDATE-ONLY`；
- A8O 冻结机器结果：
  `CONFIRM-A8O-PRO-FROZEN-EVIDENCE-NO-GO`；
- A8O 严格因果参考解释：
  `REJECT-A8O-PRO-STRICT-CAUSAL-REFERENCE-INTERPRETATION`；
- S9 正式二维接入：
  `NO-GO-A8O-PRO-S9-FORMAL-2D-INTEGRATION`；
- S9 当前身份：
  `RETAIN-A8O-PRO-S9-ACOUSTIC-BASELINE-ONLY`。

### A8P

A8P 冻结机器总裁决为：

`NO-GO-A8P-DISCRETE-REFERENCE-OR-MATURITY-PROTOCOL-GATES`

独立 Pro 接受其为透明候选证据链并保持冻结 NO-GO：

- `ACCEPT-A8P-PRO-EVIDENCE-CHAIN-CANDIDATE-ONLY`；
- `CONFIRM-A8P-PRO-FROZEN-NO-GO`。

分项结果：

- 24/24 条短时轨迹完成，24/24 项精确比较为零，短时离散参考门
  PASS；
- 16/16 条成熟性轨迹完成，固定 24/48/96 层级齐全；
- 名义 $Re=24$ 屏蔽点为 `stable-seed-decay`；
- 名义 $Re=72$ 屏蔽点为 `unstable-growing-not-saturated`，并记录
  `symmetry-lock-present`；
- 下游扩展单独通过；横向扩展与联合扩展的平均阻力和平均速度场门
  失败；
- A8P 新人口账通过，但不回改 A8O；
- 主运行与仓库外完整复跑逐字节一致；
- S9 未被选择，正式接入未解锁，也没有创建新边界策略。

## A8P 结果的解释上限

短时结果建立的是冻结 $3D$ 时窗内、位于 D2Q9 左右边界和横向周期
接缝离散过去锥之外的直接有限时间轨迹。它不是无限域、长时或物理
真值，也不能选择 S1 或 S9。

高参数零种子无升力而非零反对称种子增长，足以把相应 A8O 现象重新
解释为与镜像对称锁定相容。它不等于线性特征值、饱和极限环或装置
参数区普遍规律。

A8P 基准横向宽度只有：

$$
W/D=56/12=4.667,
$$

扩展宽度为 $7D$，对应周期阻塞比约 21.43% 与 14.29%。四种几何又
都处于未饱和增长阶段。因此，横向门失败只建立高阻塞周期域和未饱和
瞬态的联合敏感性，不能写成成熟长时载荷不收敛或 S1/S9 边界算法
失败。

## A8Q 已执行

阶段名：

`VP-A8Q-BRINKMAN-SHARP-INTERFACE-SCALING-SCREEN-v1`

机器总裁决为：

`PASS-A8Q-BRINKMAN-SCALING-PATH-CANDIDATE-ONLY-UNLOCK-A8R`

冻结十算例矩阵已全部完成：

- 10/10 轨迹完成且有限；
- 10/10 通过密度、Mach、升力 RMS 和前后半窗漂移门；
- 10/10 的原始 Brinkman 反力、虚拟内部流体修正和最终载荷逐步可
  重组，最大绝对残差为 0；
- 所有冻结源哈希一致；
- 单点文献联合命中为 0/10；
- 主运行和仓库外完整复跑的压缩产物与 sidecar 逐字节一致。

固定 $\eta_{\mathrm{lu}}=1$ 路径通过全部内部门。两个 mask 的核心
滑移均随 $D=16\to24$ 降低，阻力和升力 RMS 的变化方向一致；
$D=24$ 跨 mask 平均阻力差为 2.10034%，升力 RMS 差为 4.99512%。
后者只比 5% 门低约 0.00488 个百分点，所以这是窄裕量候选 PASS，
不是稳健平台或收敛证明。

固定 $\eta_{\mathrm{lu}}=2$ 路径只在细网格跨 mask 门失败：平均阻力
差为 2.55032%，升力 RMS 差为 5.50714%。$\eta_{\mathrm{lu}}=3$
仍只作旧固定 $\widehat\eta=0.00625$ 路径控制，不参与解锁。

A8Q PASS 只允许把唯一通过的 $\eta_{\mathrm{lu}}=1$ 路径交给下一份
结果前预注册的 A8R。它不等于网格收敛、锐界面资格、文献验证、
边界选择、正式接入、规定横移、weak-FSI、装置预测或实验验证。

## A8Q 独立 Pro 裁决

独立裁决为：

- `ACCEPT-A8Q-PRO-EVIDENCE-CHAIN-CANDIDATE-ONLY`；
- `CONFIRM-A8Q-PRO-FROZEN-MACHINE-PASS`；
- `REJECT-A8Q-PRO-SHARP-INTERFACE-OR-FORCE-VALIDATION`；
- `UNLOCK-A8R-PRO-RESULT-BEFORE-CONTRACT-ONLY`。

冻结机器 PASS 不回改，但其科学身份仅为“未解析惩罚层下的离散候选
路径”。对 $\eta_{\mathrm{lu}}=1$，$D=16/24$ 的惩罚层厚度分别只有
0.0657596/0.0805387 格，mask 半厚度约为其 6 至 11 倍；当前两点
不能用于锐界面 Richardson 外推或 GCI。

逐步力重组残差为零只验证“最终载荷等于原始反力加虚拟内部流体修正”
的记录自洽，不是控制体动量预算、完整应力积分或第二取力路径验证。

## A8R v1、v2 与 v2.1 路线

### A8R v1

A8R v1 阶段名为：

`VP-A8R-FIXED-ETA-LU-MULTIRESOLUTION-ROBUSTNESS-AND-FORCE-IDENTITY-v1`

合同提交 `eb4d5c41bea6de653491d7fe0d27382c7912985b` 已推送。它冻结
$D\in\{24,36,54\}$、双 mask、固定 $\eta_{\mathrm{lu}}=1$ 的六轨迹
矩阵，并预注册四分块统计和内部 D2Q9 链路控制体人口动量预算。

独立 Pro 裁决为：

- `ACCEPT-A8R-V1-PRO-RAW-DISCRETE-CONTROL-VOLUME-IDENTITY-IN-PRINCIPLE`；
- `REJECT-A8R-V1-PRO-STATISTICAL-ROBUSTNESS-CONTRACT-AS-FINAL`；
- `REQUIRE-A8R-V2-PRO-CYCLE-RESOLVED-AND-LATTICE-PHASE-CONTRACT`；
- `KEEP-A8R-PRO-RESULT-BEFORE-EXECUTION-LOCKED`。

v1 的原始力控制体恒等式原则成立，但四个固定分块周期数不足、单一
格点相位和无统计分辨力的严格增量门不足以裁决贴门结果。v1 保留为
未产生数值结果的历史，不创建配套测试或实现。

### A8R v2

v2 阶段名为：

`VP-A8R-V2-CYCLE-RESOLVED-MULTIRESOLUTION-MASK-PHASE-AND-FORCE-IDENTITY-v1`

v2 Markdown 与机器合同位于提交
`d7e33c64d07fbc17a44c2e0408235cc00528762e`。它加入：

- 基线六轨迹及 $D=54$ 双 mask 的两条半格横向相位轨迹；
- 最后 7 个正斜率过零点定义的最后 6 个周期；
- 周期包络 Minkowski 差三值增量门；
- `independentRawPopulationMomentumIdentity` 与
  `independentA2FormulaRecomputation` 两个独立门；
- 逐人口、逐链路、逐格力和逐格 $\chi\rho u$ 绝对舍入账；
- `literatureProximityScreen`。

本轮独立 Pro 接受上述结构，但拒绝 v2 作为可执行最终合同，裁决为：

- `ACCEPT-A8R-V2-PRO-CYCLE-ENVELOPE-AND-FORCE-SEPARATION-STRUCTURE`；
- `REJECT-A8R-V2-PRO-AS-EXECUTABLE-FINAL-CONTRACT`；
- `REQUIRE-A8R-V2P1-PRO-CROSSING-PLAUSIBILITY-AND-PRIMARY-METRIC-PHASE-GATES`；
- `KEEP-A8R-PRO-RESULT-BEFORE-EXECUTION-LOCKED`。

阻塞问题为：

1. 原始正斜率过零点没有主脱涡周期可采信门，高频小振荡可产生额外
   交叉；
2. $D=54$ 双 mask、双相位门只约束两种升力 RMS，没有约束平均阻力
   和周期；
3. 两个横向相位只能形成两点屏蔽，不能宣称完整格点相位不变。

v2 保留为未产生结果的历史，不创建配套测试或实现。

### 下一步 A8R v2.1

下一次只建立：

- `24_A8R_v2_1_周期有效性与主指标相位屏蔽预注册合同.md`；
- `src/brinkman-multiresolution-contract-v2-1.ts`。

v2.1 必须保留 v2 已接受的周期积分、Minkowski 差和两类力身份结构，
并新增：

- 最后 7 个原始交叉定义的六个周期全部满足

$$
\frac{1}{0.24}
\le T_j
\le
\frac{1}{0.15};
$$

- 不得跳过不合格交叉寻找替代点，不合格即 INCONCLUSIVE；
- $D=54$ 四组合的聚合和逐周期 $6\times6$ 最坏相对差门同时覆盖
  平均阻力、原始升力 RMS、去均值升力 RMS 和平均周期；
- 四类指标的相位--mask 门均严格低于 5%；
- A8Q 精确常数 `0.04995122077720906` 仍只约束基线相位两种升力
  RMS；
- 未来 PASS 只解释为两个预注册横向相位的有限屏蔽通过。

v2.1 完成后仍需再次交回独立 Pro，不得直接进入合同测试或实现。
当前没有 A8R 数值结论。

## 冻结活动代码

当前源码保留：

- `src/formal-incoming-characteristic-*.ts`：冻结 S9 算法、启动与法向
  声学实现；
- `src/formal-inlet-qualification-ledger.ts` 与相关类型、合同：A8N
  逐人口质量账；
- `src/formal-causal-reference-*.ts`：冻结 A8O 因果、统计、扰动和
  产物链；
- `src/formal-discrete-reference-contract.ts`：A8P 机器合同和矩阵
  构造；
- `src/formal-discrete-reference-support.ts`：A8P 离散锥、求和、
  镜像、分类和断言支持；
- `src/formal-discrete-reference-runs.ts`：A8P 24 条短时与 16 条
  成熟性轨迹；
- `src/formal-discrete-reference.ts`：A8P 汇总、门和总裁决；
- `src/brinkman-scaling-contract.ts`：A8Q 冻结来源、十算例矩阵、
  诊断和门槛；
- `src/brinkman-scaling-support.ts`：A8Q 有效几何、只读宏观视图、
  滑移、力分解和断言支持；
- `src/brinkman-scaling-runs.ts`：A8Q 十条固定圆柱轨迹；
- `src/brinkman-scaling.ts`：A8Q 路径门、总裁决和产物结构；
- `src/brinkman-multiresolution-contract.ts`：A8R v1 结果盲历史；
- `src/brinkman-multiresolution-contract-v2.ts`：A8R v2 结果盲历史；
- `src/formal-boundary-factorization-boundaries.ts` 与类型：冻结复现
  依赖；
- A8N、A8O、A8P、A8Q 的运行器、断言器和测试。

固定圆柱几何、载荷、网格--mask 与既有域研究位于：

`90_候选工作区/current/A8_公开规定横移圆柱基准/`

A8B--A8M 的一次性旧候选求解器、wrapper、脚本和中间矩阵已移出
活动树；清理前快照为：

`a57aa43e22f4ee578b236c841ae56b43f97cfd27`

## 冻结验证入口

```bash
cd 90_候选工作区/current/A8_二维特征开放边界实验后端
npm ci
npm test
npm run typecheck
```

A8N：

```bash
npm run formal-incoming-characteristic
npm run assert:formal-incoming-characteristic-artifact
```

A8O：

```bash
npm run formal-causal-reference
```

冻结负裁决下完整形成产物后预期退出 2。A8O 默认断言按原人口账失败
预期退出 1，不得列为 PASS。

A8P：

```bash
npm run formal-discrete-reference
npm run assert:formal-discrete-reference-artifact
```

`formal-discrete-reference` 在当前负裁决下完整形成产物后预期退出 2；
产物断言预期退出 0，因为它验证负证据结构和裁决语义自洽，而不是
改写总裁决。

A8Q：

```bash
npm run brinkman-scaling
npm run assert:brinkman-scaling-artifact
```

当前 A8Q 候选 PASS 下，运行器和机器断言均预期退出 0。机器断言会
重算派生字段、全局门、两条固定惩罚时间路径门、哈希和裁决语义；
它不把候选 PASS 提升为锐界面或物理资格。

A8R 当前没有可执行入口。v2.1 再次获得独立 Pro 接受前，不得为 v1、
v2 或 v2.1 增加测试、实现或运行脚本。

## 冻结产物

A8N：

- 压缩 SHA-256：
  `b3df6c32ef922d7bc464f77da736f42be0fbf21ebec031b3aacb27d56fddbff4`；
- 规范 JSON SHA-256：
  `68a267662d7a2841f39cfc3fbff3238996fb0f3fa6f08df6ac8cbd3b9209fd5c`。

A8O：

- 压缩 SHA-256：
  `c0b61e23823903454c3e5c4e4057722a5db70b5db164add17d357d8201a50005`；
- 规范 JSON SHA-256：
  `e81a1a430c29423a196927f1eb5bf7397d9735eb516ccc1f828b1646884e0d00`；
- 压缩对象大小：168,801,056 字节。

A8P：

- 压缩 SHA-256：
  `0aec8ce335baab93224608d01f6de0d5afcf8779226d2be8d40a5e946ae31868`；
- 规范 JSON SHA-256：
  `56dd50ed6c941b4581d5f7fa7faabafb2459f334749a5b321a64329c0abf00ff`；
- 压缩/规范 JSON 大小：23,170,223/174,836,651 字节；
- 主运行和仓库外完整复跑逐字节一致。

A8Q：

- 压缩 SHA-256：
  `022cc54704ac542b5c148eed5ce026f5701ae79d50426ec3417073f1148ef451`；
- 规范 JSON SHA-256：
  `16dad4a4d95eb91ad0e6f4e427d0d8ea05c8a349b479233479e03a78c6943082`；
- 压缩/规范 JSON 大小：22,058,158/100,105,555 字节；
- 主运行和仓库外完整复跑逐字节一致。

## 当前停止条件

下一步只允许 Codex 建立 A8R v2.1 结果前 Markdown 与 TypeScript
机器合同。两文件必须位于同一个独立提交并推送到远程 `main`，随后
停止并再次交回独立 Pro。

v2.1 再次获得独立 Pro 接受前，不执行：

- v1、v2 或 v2.1 合同测试；
- A8R 无结果实现、支持测试、运行器或断言器；
- A8R 的任何 $D=24,36,54$ 或格点相位研究轨迹；
- A8R 强迫或无强迫正式求解器烟雾恒等式；
- A8P 更宽横向域追加矩阵；
- S9 正式接入或 S10 开发；
- 规定横移定量长时；
- weak-FSI、三维、自由表面；
- 装置预测或实验拟合。

不得把 S9 的低声学反射、A8P 的短时逐值一致、种子增长分类、补偿
人口账 PASS、A8Q 的两分辨率窄裕量候选 PASS、A8R v1/v2 的结果前
合同或未来 v2.1 合同写成正式二维边界、Brinkman 锐界面资格、独立
A2 物理取力验证、完整格点相位不变、固定圆柱物理真值或涡流摆预测
PASS。
