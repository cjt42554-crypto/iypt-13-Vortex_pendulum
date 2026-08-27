# A8 高保真开放边界当前研究包

## 当前用途

本目录保留 A8N、A8O、A8P 的冻结候选复现链，并记录 A8P 后的独立 Pro 裁决。正式 `01_最终理论/**` 和 `02_模拟程序/**` 保持只读；候选区代码不是正式模拟程序的补丁层，也不得原样迁入正式步进路径。

当前主线资料：

- `13_A8O_网页版Pro独立审查与下一路线裁决.md`；
- `14_A8P_离散因果参考与反对称成熟性预注册合同.md`；
- `15_A8P_离散因果参考与成熟性资格报告.md`；
- `16_A8P_网页版Pro独立审查与A8Q路线裁决.md`；
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

## 下一路线：A8Q

独立 Pro 决定下一阶段不开发 S10，不继续追加 A8P 窄域矩阵，而优先审查 Brinkman 弥散固体的锐界面缩放路径：

`PRIORITIZE-A8Q-BRINKMAN-SHARP-INTERFACE-SCALING-PATH`

阶段名：

`VP-A8Q-BRINKMAN-SHARP-INTERFACE-SCALING-SCREEN-v1`

现有公开固定圆柱运行器使用：

$$
\eta_{\mathrm{lu}}
=\widehat\eta\frac{D}{U_{\mathrm{lu}}}.
$$

既有网格研究固定 $\widehat\eta=0.00625$、$U_{\mathrm{lu}}=0.05$，所以 $D=16,20,24$ 对应 $\eta_{\mathrm{lu}}=2,2.5,3$。该序列没有让无量纲惩罚时间随网格加密趋于零，尚不能识别无滑移锐界面极限。

A8Q 冻结载体：

- 固定圆柱，$Re=185$；
- $U_{\mathrm{lu}}=0.05$；
- S1 只作为冻结数值载体；
- 上游 $14D$、下游 $19.5D$、横向周期宽度 $10D$；
- 总时长 80 个对流时间，舍弃前 40 个；
- A2 修正取力、频谱和文献目标定义不变；
- 正式 `lbm.ts` 保持字节不变。

冻结十算例矩阵：

$$
D\in\{16,24\},
\qquad
w_\chi\in\{0.50,0.75\}\ \text{格},
\qquad
\eta_{\mathrm{lu}}\in\{1,2\}.
$$

$D=24$ 对两个 mask 再运行 $\eta_{\mathrm{lu}}=3$ 作为现有固定 $\widehat\eta$ 路径控制，共十条轨迹。

A8Q 必须新增核心/过渡带速度滑移、有效 mask 几何、惩罚层尺度、原始反力与虚拟流体修正分解等诊断。它只允许筛查候选缩放路径：

- 至少一条固定 $\eta_{\mathrm{lu}}$ 路径通过内部一致性门，最高输出 `PASS-A8Q-BRINKMAN-SCALING-PATH-CANDIDATE-ONLY-UNLOCK-A8R`；
- 两条路径都失败，输出 `NO-GO-A8Q-BRINKMAN-SCALING-PATH-INCOHERENT`；
- 单点偶然进入文献容差仍为 `INCONCLUSIVE-A8Q-SINGLE-POINT-LITERATURE-HIT`。

不得按最接近文献的单点选择 mask 或惩罚时间。完整合同要求见 `16_A8P_网页版Pro独立审查与A8Q路线裁决.md`。

## 冻结活动代码

当前源码保留：

- `src/formal-incoming-characteristic-*.ts`：冻结 S9 算法、启动与法向声学实现；
- `src/formal-inlet-qualification-ledger.ts` 与相关类型、合同：A8N 逐人口质量账；
- `src/formal-causal-reference-*.ts`：冻结 A8O 因果、统计、扰动和产物链；
- `src/formal-discrete-reference-contract.ts`：A8P 机器合同和矩阵构造；
- `src/formal-discrete-reference-support.ts`：A8P 离散锥、求和、镜像、分类和断言支持；
- `src/formal-discrete-reference-runs.ts`：A8P 24 条短时与 16 条成熟性轨迹；
- `src/formal-discrete-reference.ts`：A8P 汇总、门和总裁决；
- `src/formal-boundary-factorization-boundaries.ts` 与类型：冻结复现依赖；
- A8N、A8O、A8P 的运行器、断言器和测试。

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

## 当前停止条件

A8Q 完成并交回独立 Pro 前，不执行：

- A8P 更宽横向域追加矩阵；
- S9 正式接入或 S10 开发；
- $D=32/40/50$ 固定圆柱；
- 规定横移定量长时；
- weak-FSI、三维、自由表面；
- 装置预测或实验拟合。

不得把 S9 的低声学反射、A8P 的短时逐值一致、种子增长分类或补偿人口账 PASS 写成正式二维边界、固定圆柱物理真值或涡流摆预测 PASS。
