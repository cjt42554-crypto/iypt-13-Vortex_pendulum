# A8 高保真开放边界当前研究包

## 当前用途

本目录保留 A8N、A8O、A8P 的冻结候选复现链，A8Q Brinkman 缩放路径屏蔽的完整候选证据与独立裁决，以及 A8R v1、v2 被后续结果盲审查取代的历史。A8R v2.1 结果前合同已经独立审查接受，当前只解锁合同测试。

正式 `01_最终理论/**` 和 `02_模拟程序/**` 保持只读；候选区代码不是正式模拟程序的补丁层，也不得原样迁入正式步进路径。

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
- `24_A8R_v2_1_周期有效性与主指标相位屏蔽预注册合同.md`；
- `25_A8R_v2_1_网页版Pro独立审查与合同测试解锁裁决.md`；
- `90_候选工作区/交接说明_current.md`。

## 冻结前序裁决

### A8N 与 A8O

- A8N 证据完整性：
  `ACCEPT-A8N-PRO-EVIDENCE-COMPLETE-CANDIDATE-ONLY`；
- S9 一维法向低反射机制：
  `ACCEPT-A8N-PRO-S9-INCOMING-ONLY-NORMAL-ACOUSTIC-MECHANISM-FROZEN`；
- A8O 负面证据链：
  `ACCEPT-A8O-PRO-TRANSPARENT-NEGATIVE-EVIDENCE-CANDIDATE-ONLY`；
- A8O 冻结机器结果：
  `CONFIRM-A8O-PRO-FROZEN-EVIDENCE-NO-GO`；
- S9 正式二维接入：
  `NO-GO-A8O-PRO-S9-FORMAL-2D-INTEGRATION`；
- S9 当前身份：
  `RETAIN-A8O-PRO-S9-ACOUSTIC-BASELINE-ONLY`。

### A8P

A8P 冻结机器裁决为：

`NO-GO-A8P-DISCRETE-REFERENCE-OR-MATURITY-PROTOCOL-GATES`

可保留的窄结论包括短时离散过去锥参考、`symmetry-lock-present` 和 `unstable-growing-not-saturated` 分类，以及新的 Neumaier 人口账。横向扩展失败发生在高周期阻塞域和未饱和瞬态，不能写成成熟长时载荷不收敛或 S1/S9 边界算法失败。

### A8Q

A8Q 冻结机器裁决为：

`PASS-A8Q-BRINKMAN-SCALING-PATH-CANDIDATE-ONLY-UNLOCK-A8R`

固定 $\eta_{\mathrm{lu}}=1$ 是唯一通过的候选路径。$D=24$ 两个 mask 的平均阻力相对差为 2.10034%，原始升力 RMS 相对差为 4.99512%，后者只比 5% 门低约 0.00488 个百分点。

A8Q 只建立未解析惩罚层下的两分辨率窄裕量离散候选。它不建立网格收敛、Brinkman 锐界面、无滑移极限、独立载荷验证、边界选择或正式接入。

## A8R 结果前路线

### v1

v1 预注册内部 D2Q9 链路控制体人口动量恒等式，但四个固定分块只有约 1.95 个脱涡周期、只有一个亚格点相位，且严格增量门会把精确平台误判为失败。

独立裁决为：

- `ACCEPT-A8R-V1-PRO-RAW-DISCRETE-CONTROL-VOLUME-IDENTITY-IN-PRINCIPLE`；
- `REJECT-A8R-V1-PRO-STATISTICAL-ROBUSTNESS-CONTRACT-AS-FINAL`；
- `REQUIRE-A8R-V2-PRO-CYCLE-RESOLVED-AND-LATTICE-PHASE-CONTRACT`。

v1 保留为未产生数值结果的历史。

### v2

v2 加入最后六个完整周期、周期包络 Minkowski 差三值门、$D=54$ 两个横向相位，以及分离的原始人口恒等式和 A2 公式重算。

独立审查接受该结构，但发现原始正斜率过零点可能被高频小振荡污染，且双相位门遗漏平均阻力和周期，因此裁决为：

- `ACCEPT-A8R-V2-PRO-CYCLE-ENVELOPE-AND-FORCE-SEPARATION-STRUCTURE`；
- `REJECT-A8R-V2-PRO-AS-EXECUTABLE-FINAL-CONTRACT`；
- `REQUIRE-A8R-V2P1-PRO-CROSSING-PLAUSIBILITY-AND-PRIMARY-METRIC-PHASE-GATES`。

v2 保留为未产生数值结果的历史。

### v2.1 当前有效合同

v2.1 结果前合同提交为：

`16d70861900ce43070e99e88772c4cf6bbeb90a1`

阶段名为：

`VP-A8R-V2P1-CYCLE-RESOLVED-MULTIRESOLUTION-MASK-PHASE-AND-FORCE-IDENTITY-v1`

合同冻结：

- $D\in\{24,36,54\}$、双 mask、基线横向相位的六轨迹；
- $D=54$、双 mask、相差半格的第二横向相位两轨迹；
- $D=24$ 基线轨迹与 A8Q 公共投影逐字段、逐数组元素零容差一致；
- 完整分析窗的全部原始正斜率过零点和时间上最后 7 个原始交叉；
- 六个候选周期逐一满足

$$
\frac{1}{0.24}
\le T_j
\le
\frac{1}{0.15};
$$

- 不允许跳过不合格交叉寻找替代点；
- 周期端点线性插值、分段线性复合梯形积分和实际时长加权六周期聚合；
- 周期包络 Minkowski 差的 `RESOLVED-PASS`、`UNRESOLVED-INCONCLUSIVE` 和 `RESOLVED-NO-GO`；
- $D=54$ 四组合的平均阻力、原始升力 RMS、去均值升力 RMS和平均周期四类主指标；
- 每类主指标的聚合全对比较和每个轨迹对 $6\times6$ 逐周期最坏差严格 5% 门；
- `independentRawPopulationMomentumIdentity` 与 `independentA2FormulaRecomputation` 两个不可互相替代的门；
- 逐人口、逐链路、逐格 Brinkman 力和逐格 $\chi\rho u$ 的绝对 Neumaier 舍入账；
- `literatureProximityScreen` 只作观察，不改变终局。

## v2.1 独立审查裁决

独立审查文件为：

`25_A8R_v2_1_网页版Pro独立审查与合同测试解锁裁决.md`

裁决为：

`ACCEPT-A8R-V2P1-PRO-RESULT-BEFORE-CONTRACT`

`UNLOCK-A8R-V2P1-PRO-CONTRACT-TESTS-ONLY`

`KEEP-A8R-V2P1-PRO-IMPLEMENTATION-SMOKE-AND-RESEARCH-LOCKED`

v2.1 没有再发现会造成错误 PASS 或错误 NO-GO 的阻塞缺口。逐周期 $6\times6$ 门会同时受到轨迹内部周期散布影响，因此非常保守；但失败只产生 INCONCLUSIVE，不能被单独归因为 mask 或格点相位，也不能提升为物理路线 NO-GO。

未来最高 PASS 仍只能表述为：固定 $\eta_{\mathrm{lu}}=1$ 的候选离散路径通过三分辨率、双 mask 和 $D=54$ 两个预注册横向相位的有限屏蔽，并通过原始人口身份与 A2 公式重算。它不是完整格点相位不变、锐界面、载荷物理资格或装置预测。

## 冻结活动代码

当前活动源码包括：

- `src/formal-incoming-characteristic-*.ts`：冻结 S9 算法与声学审计；
- `src/formal-causal-reference-*.ts`：冻结 A8O 因果、统计和扰动链；
- `src/formal-discrete-reference-*.ts`：冻结 A8P 离散参考与成熟性链；
- `src/brinkman-scaling-contract.ts`、`brinkman-scaling-support.ts`、`brinkman-scaling-runs.ts` 和 `brinkman-scaling.ts`：冻结 A8Q；
- `src/brinkman-multiresolution-contract.ts`：A8R v1 结果盲历史；
- `src/brinkman-multiresolution-contract-v2.ts`：A8R v2 结果盲历史；
- `src/brinkman-multiresolution-contract-v2-1.ts`：当前有效的 v2.1 机器合同；
- `src/formal-boundary-factorization-boundaries.ts` 与类型：冻结复现依赖。

A8R 当前没有科学实现、支持适配器、运行器、断言器或可执行研究入口。

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

当前 A8Q 候选 PASS 下，运行器和机器断言均预期退出 0。它们不把候选 PASS 提升为锐界面或物理资格。

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

下一步只允许 Codex 创建并推送：

`tests/brinkman-multiresolution-contract-v2-1.test.ts`

允许执行候选包 `npm test`、`npm run typecheck` 和测试文件静态检查。合同测试完成后必须停止并再次交回独立 Pro。

合同测试再次获得独立审查前，不执行：

- A8R 无结果科学实现、适配器、支持测试、运行器或断言器；
- A8R 强迫或无强迫正式求解器烟雾测试；
- A8R 的任何 $D=24,36,54$ 或格点相位研究轨迹；
- A8P 更宽横向域追加矩阵；
- S9 正式接入或 S10 开发；
- 规定横移定量长时；
- weak-FSI、三维、自由表面、装置预测或实验拟合。

不得把 S9 的低声学反射、A8P 的短时逐值一致、A8Q 的窄裕量候选 PASS、A8R v2.1 合同接受或未来合同测试 PASS 写成正式二维边界、Brinkman 锐界面、独立 A2 物理取力验证、完整格点相位不变、固定圆柱物理真值或涡流摆预测 PASS。
