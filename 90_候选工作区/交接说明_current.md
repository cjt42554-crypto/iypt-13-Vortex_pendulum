# 当前交接

## 本轮独立裁决

已对 A8R v2 结果前 Markdown 与 TypeScript 机器合同完成独立 Pro 审查。
新增：

`90_候选工作区/current/A8_二维特征开放边界实验后端/23_A8R_v2_网页版Pro独立审查与v2_1修订裁决.md`

独立审查提交为：

`cfcb554ae7ca59cf04780040a6b81618d5bcfdb9`

裁决为：

`ACCEPT-A8R-V2-PRO-CYCLE-ENVELOPE-AND-FORCE-SEPARATION-STRUCTURE`

`REJECT-A8R-V2-PRO-AS-EXECUTABLE-FINAL-CONTRACT`

`REQUIRE-A8R-V2P1-PRO-CROSSING-PLAUSIBILITY-AND-PRIMARY-METRIC-PHASE-GATES`

`KEEP-A8R-PRO-RESULT-BEFORE-EXECUTION-LOCKED`

A8R v1 和 v2 都仍是未产生数值结果的结果盲历史。正式
`01_最终理论/**` 与 `02_模拟程序/**` 未修改。

## v2 已接受的结构

v2 以下内容可原样保留到 v2.1：

- $D=24$ 新运行与 A8Q 公共投影零容差一致；
- 基线六轨迹及 $D=54$ 双 mask 的两条半格横向相位轨迹；
- 线性插值过零时间、插值端点和分段线性复合梯形周期积分；
- 六周期按实际时长直接聚合；
- 周期包络 Minkowski 差的 `RESOLVED-PASS`、
  `UNRESOLVED-INCONCLUSIVE` 和 `RESOLVED-NO-GO` 三值门；
- 精确平台不得判 NO-GO；
- `independentRawPopulationMomentumIdentity` 与
  `independentA2FormulaRecomputation` 的分离；
- 逐人口、逐链路、逐格 Brinkman 力和逐格 $\chi\rho u$ 的绝对
  Neumaier 舍入账；
- `literatureProximityScreen` 不参与终局。

原始人口控制体恒等式的结论上限仍只是正式原始 Brinkman 反力的离散
身份；A2 重算只检查同一公式的实现一致性，不是第二种物理取力法。

## 阻塞问题

### 1. 原始过零点可能不是主脱涡周期

v2 直接取最后 7 个正斜率过零点。信号

$$
z(t)
=\sin\left(\frac{2\pi t}{T}\right)
+0.1\sin\left(\frac{40\pi t}{T}\right)
$$

在 $t=T/2$ 也有正斜率过零点，因此当前规则可能把 $T/2$ 误认成完整
周期。

v2.1 必须保留“最后 7 个原始交叉”的唯一选择，并要求其六个周期全部
满足：

$$
\frac{1}{0.24}
\le T_j
\le
\frac{1}{0.15}.
$$

不得跳过不合格交叉并向前寻找替代点；任一周期不合格即判周期证据
不完整，终局为 INCONCLUSIVE。

### 2. 双相位门遗漏平均阻力和周期

v2 的相邻分辨率趋势审查平均阻力和去均值升力 RMS，但 $D=54$ 双
mask、双相位门只约束两种升力 RMS。当前合同允许半格相位显著改变
平均阻力或脱涡周期后仍输出 PASS。

v2.1 的聚合和逐周期 $6\times6$ 最坏相对差门必须同时覆盖：

- 平均阻力；
- 原始升力 RMS；
- 去均值升力 RMS；
- 平均周期。

四类指标的门均严格低于 5%。A8Q 精确常数
`0.04995122077720906` 仍只用于基线相位两种升力 RMS 的额外严格
上界。平均升力接近零，只作有符号和绝对值诊断。

### 3. 结论必须保持两点相位屏蔽身份

当前矩阵只覆盖两个相差半格的横向相位，不覆盖其余横向相位、纵向
相位或完整相位扫描。未来 PASS 只能写成“两个预注册横向相位屏蔽
通过”，不能写成完整格点相位不变或相位收敛。

## 下一步唯一任务

下一次由 Codex 只建立 A8R v2.1 结果前合同和机器合同：

- `90_候选工作区/current/A8_二维特征开放边界实验后端/24_A8R_v2_1_周期有效性与主指标相位屏蔽预注册合同.md`；
- `90_候选工作区/current/A8_二维特征开放边界实验后端/src/brinkman-multiresolution-contract-v2-1.ts`。

v2 的两份合同保留为被本轮结果盲审查取代的历史，不回写、不删除。
v2.1 两文件必须位于同一个独立提交并推送到远程 `main`。完成后停止，
再次交回独立 Pro 审查。

v2.1 还必须明确：

- `body=null` 烟雾测试仍使用冻结数值定义中的控制体中心；
- 独立逐格宏观重建使用固定方向 0 至 8 的确定性求和顺序；
- 正式比较值只能在全部独立量形成后读取；
- `literatureProximityScreen` 分别标明原始和去均值升力 RMS；
- 四个固定时间分块继续只作诊断。

## 当前禁止

在 v2.1 再次获得独立 Pro 接受前，禁止：

- 创建 v1、v2 或 v2.1 合同测试；
- 创建 A8R 无结果科学实现、支持测试、运行器或断言器；
- 执行 A8R 强迫或无强迫正式求解器烟雾测试；
- 执行任何 A8R $D=24,36,54$ 或格点相位研究轨迹；
- 修改 A8Q 科学源、产物、报告或冻结裁决；
- 修改正式理论或正式程序；
- 输出 Richardson 外推、GCI、锐界面、无滑移极限或载荷物理资格；
- 进入 S9 正式接入、S10、规定横移、weak-FSI、三维、自由表面、
  装置预测或实验拟合。

## 本轮验证

已执行：

- 读取现行 `AGENTS.md` 和当前交接；
- 逐段核对 A8R v2 Markdown 与 TypeScript 机器合同；
- 核对 v2 与 A8R v1 后独立 Pro 裁决的对应关系；
- 复核正式 `lbm.ts` 的力源、迁移和内部控制体恒等式适用条件；
- 构造高频小振荡导致额外正斜率过零点的解析反例；
- 新独立审查通过 Pandoc
  `--from=markdown --to=json --fail-if-warnings`；
- 新独立审查按仓库 Markdown 数学检查逻辑为零错误，无制表符和
  非预期尾随空格。

未执行：

- A8R 合同测试、无结果实现、运行器、断言器、烟雾测试或研究矩阵；
- A8Q 数值重跑、LFS 产物解压或机器断言；
- 候选包 `npm ci`、`npm test` 或 `npm run typecheck`；
- 正式程序 `npm run validate`；
- Zettlr 应用本体预览；
- 规定横移、weak-FSI、三维、自由表面、装置预测或实验验证。
