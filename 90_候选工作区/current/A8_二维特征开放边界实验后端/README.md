# A8 高保真开放边界当前研究包

## 当前用途

本目录保留 A8N、A8O、A8P 的冻结候选复现链，以及 A8Q Brinkman 缩放路径屏蔽的结果前合同、无结果实现、机器证据、资格报告、独立复跑身份和网页版 Pro 独立裁决。正式 `01_最终理论/**` 和 `02_模拟程序/**` 保持只读；候选区代码不是正式模拟程序的补丁层，也不得原样迁入正式步进路径。

当前主线资料：

- `13_A8O_网页版Pro独立审查与下一路线裁决.md`；
- `14_A8P_离散因果参考与反对称成熟性预注册合同.md`；
- `15_A8P_离散因果参考与成熟性资格报告.md`；
- `16_A8P_网页版Pro独立审查与A8Q路线裁决.md`；
- `17_A8Q_Brinkman锐界面缩放路径预注册合同.md`；
- `18_A8Q_Brinkman锐界面缩放路径资格报告.md`；
- `19_A8Q_网页版Pro独立审查与A8R路线裁决.md`；
- `90_候选工作区/交接说明_current.md`。

## 当前裁决

### A8N 与 A8O

- A8N 证据完整性：`ACCEPT-A8N-PRO-EVIDENCE-COMPLETE-CANDIDATE-ONLY`；
- S9 一维法向机制：`ACCEPT-A8N-PRO-S9-INCOMING-ONLY-NORMAL-ACOUSTIC-MECHANISM-FROZEN`；
- A8O 负面证据链：`ACCEPT-A8O-PRO-TRANSPARENT-NEGATIVE-EVIDENCE-CANDIDATE-ONLY`；
- A8O 冻结机器结果：`CONFIRM-A8O-PRO-FROZEN-EVIDENCE-NO-GO`；
- A8O 严格因果参考解释：`REJECT-A8O-PRO-STRICT-CAUSAL-REFERENCE-INTERPRETATION`；
- S9 正式二维接入：`NO-GO-A8O-PRO-S9-FORMAL-2D-INTEGRATION`；
- S9 当前身份：`RETAIN-A8O-PRO-S9-ACOUSTIC-BASELINE-ONLY`。

### A8P

A8P 冻结机器总裁决为：

`NO-GO-A8P-DISCRETE-REFERENCE-OR-MATURITY-PROTOCOL-GATES`

独立 Pro 接受其为透明候选证据链并保持冻结 NO-GO：

- `ACCEPT-A8P-PRO-EVIDENCE-CHAIN-CANDIDATE-ONLY`；
- `CONFIRM-A8P-PRO-FROZEN-NO-GO`。

分项结果：

- 24/24 条短时轨迹完成，24/24 项精确比较为零，短时离散参考门 PASS；
- 16/16 条成熟性轨迹完成，固定 24/48/96 层级齐全；
- 名义 $Re=24$ 屏蔽点为 `stable-seed-decay`；
- 名义 $Re=72$ 屏蔽点为 `unstable-growing-not-saturated`，并记录 `symmetry-lock-present`；
- 下游扩展单独通过；横向扩展与联合扩展的平均阻力和平均速度场门失败；
- A8P 新人口账通过，但不回改 A8O；
- 主运行与仓库外完整复跑逐字节一致；
- S9 未被选择，正式接入未解锁，也没有创建新边界策略。

## A8P 结果的解释上限

短时结果建立的是冻结 $3D$ 时窗内、位于 D2Q9 左右边界和横向周期接缝离散过去锥之外的直接有限时间轨迹。它不是无限域、长时或物理真值，也不能选择 S1 或 S9。

高参数零种子无升力而非零反对称种子增长，足以把相应 A8O 现象重新解释为与镜像对称锁定相容。它不等于线性特征值、饱和极限环或装置参数区普遍规律。

A8P 基准横向宽度只有：

$$
W/D=56/12=4.667,
$$

扩展宽度为 $7D$，对应周期阻塞比约 21.43% 与 14.29%。四种几何又都处于未饱和增长阶段。因此，横向门失败只建立高阻塞周期域和未饱和瞬态的联合敏感性，不能写成成熟长时载荷不收敛或 S1/S9 边界算法失败。

## A8Q 已执行

阶段名：

`VP-A8Q-BRINKMAN-SHARP-INTERFACE-SCALING-SCREEN-v1`

机器总裁决为：

`PASS-A8Q-BRINKMAN-SCALING-PATH-CANDIDATE-ONLY-UNLOCK-A8R`

冻结十算例矩阵已全部完成：

- 10/10 轨迹完成且有限；
- 10/10 通过密度、Mach、升力 RMS 和前后半窗漂移门；
- 10/10 的原始 Brinkman 反力、虚拟内部流体修正和最终载荷逐步可重组，最大绝对残差为 0；
- 所有冻结源哈希一致；
- 单点文献联合命中为 0/10；
- 主运行和仓库外完整复跑的压缩产物与 sidecar 逐字节一致。

固定 $\eta_{\mathrm{lu}}=1$ 路径通过全部内部门。两个 mask 的核心滑移均随 $D=16\to24$ 降低，阻力和升力 RMS 的变化方向一致；$D=24$ 跨 mask 平均阻力差为 2.10034%，升力 RMS 差为 4.99512%。后者只比 5% 门低约 0.00488 个百分点，所以这是窄裕量候选 PASS，不是稳健平台或收敛证明。

固定 $\eta_{\mathrm{lu}}=2$ 路径只在细网格跨 mask 门失败：平均阻力差为 2.55032%，升力 RMS 差为 5.50714%。$\eta_{\mathrm{lu}}=3$ 仍只作旧固定 $\widehat\eta=0.00625$ 路径控制，不参与解锁。

A8Q PASS 只允许把唯一通过的 $\eta_{\mathrm{lu}}=1$ 路径交给下一份结果前预注册的 A8R。它不等于网格收敛、锐界面资格、文献验证、边界选择、正式接入、规定横移、weak-FSI、装置预测或实验验证。

## A8Q 独立 Pro 裁决

独立裁决为：

- `ACCEPT-A8Q-PRO-EVIDENCE-CHAIN-CANDIDATE-ONLY`；
- `CONFIRM-A8Q-PRO-FROZEN-MACHINE-PASS`；
- `REJECT-A8Q-PRO-SHARP-INTERFACE-OR-FORCE-VALIDATION`；
- `UNLOCK-A8R-PRO-RESULT-BEFORE-CONTRACT-ONLY`。

冻结机器 PASS 不回改，但其科学身份仅为“未解析惩罚层下的离散候选路径”。对 $\eta_{\mathrm{lu}}=1$，$D=16/24$ 的惩罚层厚度分别只有 0.0657596/0.0805387 格，mask 半厚度约为其 6 至 11 倍；当前两点不能用于锐界面 Richardson 外推或 GCI。

逐步力重组残差为零只验证“最终载荷等于原始反力加虚拟内部流体修正”的记录自洽，不是控制体动量预算、完整应力积分或第二取力路径验证。下一阶段必须先冻结 A8R 结果前合同，并加入分块统计、跨 mask 稳健门和独立力身份。

## 冻结活动代码

当前源码保留：

- `src/formal-incoming-characteristic-*.ts`：冻结 S9 算法、启动与法向声学实现；
- `src/formal-inlet-qualification-ledger.ts` 与相关类型、合同：A8N 逐人口质量账；
- `src/formal-causal-reference-*.ts`：冻结 A8O 因果、统计、扰动和产物链；
- `src/formal-discrete-reference-contract.ts`：A8P 机器合同和矩阵构造；
- `src/formal-discrete-reference-support.ts`：A8P 离散锥、求和、镜像、分类和断言支持；
- `src/formal-discrete-reference-runs.ts`：A8P 24 条短时与 16 条成熟性轨迹；
- `src/formal-discrete-reference.ts`：A8P 汇总、门和总裁决；
- `src/brinkman-scaling-contract.ts`：A8Q 冻结来源、十算例矩阵、诊断和门槛；
- `src/brinkman-scaling-support.ts`：A8Q 有效几何、只读宏观视图、滑移、力分解和断言支持；
- `src/brinkman-scaling-runs.ts`：A8Q 十条固定圆柱轨迹；
- `src/brinkman-scaling.ts`：A8Q 路径门、总裁决和产物结构；
- `src/formal-boundary-factorization-boundaries.ts` 与类型：冻结复现依赖；
- A8N、A8O、A8P、A8Q 的运行器、断言器和测试。

固定圆柱几何、载荷、网格--mask 与既有域研究位于：

`90_候选工作区/current/A8_公开规定横移圆柱基准/`

A8B--A8M 的一次性旧候选求解器、wrapper、脚本和中间矩阵已移出活动树；清理前快照为：

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

冻结负裁决下完整形成产物后预期退出 2。A8O 默认断言按原人口账失败预期退出 1，不得列为 PASS。

A8P：

```bash
npm run formal-discrete-reference
npm run assert:formal-discrete-reference-artifact
```

`formal-discrete-reference` 在当前负裁决下完整形成产物后预期退出 2；产物断言预期退出 0，因为它验证负证据结构和裁决语义自洽，而不是改写总裁决。

A8Q：

```bash
npm run brinkman-scaling
npm run assert:brinkman-scaling-artifact
```

当前 A8Q 候选 PASS 下，运行器和机器断言均预期退出 0。机器断言会重算派生字段、全局门、两条固定惩罚时间路径门、哈希和裁决语义；它不把候选 PASS 提升为锐界面或物理资格。

## 冻结产物

A8N：

- 压缩 SHA-256：`b3df6c32ef922d7bc464f77da736f42be0fbf21ebec031b3aacb27d56fddbff4`；
- 规范 JSON SHA-256：`68a267662d7a2841f39cfc3fbff3238996fb0f3fa6f08df6ac8cbd3b9209fd5c`。

A8O：

- 压缩 SHA-256：`c0b61e23823903454c3e5c4e4057722a5db70b5db164add17d357d8201a50005`；
- 规范 JSON SHA-256：`e81a1a430c29423a196927f1eb5bf7397d9735eb516ccc1f828b1646884e0d00`；
- 压缩对象大小：168,801,056 字节。

A8P：

- 压缩 SHA-256：`0aec8ce335baab93224608d01f6de0d5afcf8779226d2be8d40a5e946ae31868`；
- 规范 JSON SHA-256：`56dd50ed6c941b4581d5f7fa7faabafb2459f334749a5b321a64329c0abf00ff`；
- 压缩/规范 JSON 大小：23,170,223/174,836,651 字节；
- 主运行和仓库外完整复跑逐字节一致。

A8Q：

- 压缩 SHA-256：`022cc54704ac542b5c148eed5ce026f5701ae79d50426ec3417073f1148ef451`；
- 规范 JSON SHA-256：`16dad4a4d95eb91ad0e6f4e427d0d8ea05c8a349b479233479e03a78c6943082`；
- 压缩/规范 JSON 大小：22,058,158/100,105,555 字节；
- 主运行和仓库外完整复跑逐字节一致。

## 当前停止条件

A8Q 独立 Pro 审查已完成。当前只解锁“编写 A8R 结果前合同”；在合同、合同测试和无结果实现分别提交并推送前，不运行新的高分辨率矩阵。

A8R 最低主矩阵建议为：

$$
D\in\{24,36,54\},
\qquad
w_\chi\in\{0.50,0.75\},
\qquad
\eta_{\mathrm{lu}}=1.
$$

获得冻结 A8R 合同前，不执行：

- $D=36/54$ 或其他新增固定圆柱分辨率；
- A8P 更宽横向域追加矩阵；
- S9 正式接入或 S10 开发；
- 规定横移定量长时；
- weak-FSI、三维、自由表面；
- 装置预测或实验拟合。

不得把 S9 的低声学反射、A8P 的短时逐值一致、种子增长分类、补偿人口账 PASS 或 A8Q 的两分辨率窄裕量候选 PASS 写成正式二维边界、Brinkman 锐界面资格、独立载荷验证、固定圆柱物理真值或涡流摆预测 PASS。
