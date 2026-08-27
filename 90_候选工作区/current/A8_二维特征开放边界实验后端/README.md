# A8 高保真开放边界当前研究包

## 当前用途

本目录保留 A8N、A8O、A8P 的冻结候选复现链。正式 `01_最终理论/**` 和 `02_模拟程序/**` 保持只读；候选区代码不是正式模拟程序的补丁层，也不得原样迁入正式步进路径。

A8P 已按网页版 Pro 的路线裁决建立并执行：

- D2Q9 一格每接受步的短时离散过去锥参考；
- 不使用 S1/S9 平均的直接 S1 规范轨迹；
- 正负反对称种子与 24、48、96 个对流时间层级；
- 下游距离与横向宽度联合敏感性；
- A8P 专用原顺序、成对和 Neumaier 人口账；
- 仓库外完整独立复跑。

最终结果是短时离散参考 PASS，但长时横向宽度敏感性 FAIL，总裁决为：

`NO-GO-A8P-DISCRETE-REFERENCE-OR-MATURITY-PROTOCOL-GATES`

完整 A8P 资料见：

- `13_A8O_网页版Pro独立审查与下一路线裁决.md`；
- `14_A8P_离散因果参考与反对称成熟性预注册合同.md`；
- `15_A8P_离散因果参考与成熟性资格报告.md`；
- `90_候选工作区/交接说明_current.md`。

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
- `src/d2q9.ts`：候选边界宏观量工具；
- A8N、A8O、A8P 的运行器、断言器和测试。

名称中仍含 A8M/A8K 的少量文件是冻结 S9 复现链的直接依赖，不是准备继续叠加的旧算法。任何清理或中性重命名都必须先保证 A8N--A8P 哈希与复现链不被破坏。

固定圆柱几何、载荷和既有域研究位于：

`90_候选工作区/current/A8_公开规定横移圆柱基准/`

## 已移出活动树的旧阶段

A8B--A8M 的一次性候选求解器、wrapper、运行脚本、测试和中间机器矩阵已经从当前 `main` 删除。它们仍由 Git 历史保存，清理前快照为：

`a57aa43e22f4ee578b236c841ae56b43f97cfd27`

删除旧文件不撤销既有裁决；摘要保存在交接历史和当前保留的 Pro 审查文档中。

## 当前裁决

- A8N 证据完整性：`ACCEPT-A8N-PRO-EVIDENCE-COMPLETE-CANDIDATE-ONLY`；
- S9 一维法向机制：`ACCEPT-A8N-PRO-S9-INCOMING-ONLY-NORMAL-ACOUSTIC-MECHANISM-FROZEN`；
- A8O 负面证据链：`ACCEPT-A8O-PRO-TRANSPARENT-NEGATIVE-EVIDENCE-CANDIDATE-ONLY`；
- A8O 冻结机器结果：`CONFIRM-A8O-PRO-FROZEN-EVIDENCE-NO-GO`；
- A8O 严格因果参考解释：`REJECT-A8O-PRO-STRICT-CAUSAL-REFERENCE-INTERPRETATION`；
- S9 正式二维接入：`NO-GO-A8O-PRO-S9-FORMAL-2D-INTEGRATION`；
- S9 当前身份：`RETAIN-A8O-PRO-S9-ACOUSTIC-BASELINE-ONLY`；
- A8P 总裁决：`NO-GO-A8P-DISCRETE-REFERENCE-OR-MATURITY-PROTOCOL-GATES`。

A8P 分项结果为：

- 24/24 条短时轨迹完成，24/24 项精确比较为零，短时离散参考门 PASS；
- 16/16 条成熟性轨迹完成，固定 24/48/96 层级齐全；
- 名义 $Re=24$ 屏蔽点为 `stable-seed-decay`；
- 名义 $Re=72$ 屏蔽点为 `unstable-growing-not-saturated`，并记录 `symmetry-lock-present`；
- 下游扩展单独通过；横向扩展与联合扩展的平均阻力和平均速度场门失败；
- A8P 新人口账通过，但不回改 A8O；
- 正式接入未解锁，S9 未被选择，也没有创建新策略。

## 冻结验证入口

```bash
cd 90_候选工作区/current/A8_二维特征开放边界实验后端
npm ci
npm test
npm run typecheck
```

A8N 冻结入口：

```bash
npm run formal-incoming-characteristic
npm run assert:formal-incoming-characteristic-artifact
```

A8O 完整研究入口为：

```bash
npm run formal-causal-reference
```

在冻结负裁决下，该命令形成产物后预期退出 2。A8O 默认断言预期在冻结人口账第一处超门记录上退出 1；不得把这一结果列为 PASS。

A8P 完整研究入口为：

```bash
npm run formal-discrete-reference
```

在当前冻结负裁决下，该命令完整形成产物后预期退出 2。退出 2 表示联合敏感性科学门失败，不表示运行崩溃。A8P 产物断言入口为：

```bash
npm run assert:formal-discrete-reference-artifact
```

该断言预期退出 0，因为它检查负证据结构、派生字段、哈希和裁决语义是否自洽；它不把 A8P 总裁决改成 PASS。

## 冻结产物

A8N 主产物：

`验证与复现/artifacts/a8-formal-mrt-incoming-characteristic-qualification.json.gz`

- 压缩 SHA-256：`b3df6c32ef922d7bc464f77da736f42be0fbf21ebec031b3aacb27d56fddbff4`；
- 解压规范 JSON SHA-256：`68a267662d7a2841f39cfc3fbff3238996fb0f3fa6f08df6ac8cbd3b9209fd5c`。

A8O 主产物：

`验证与复现/artifacts/a8-formal-causal-reference-2d-qualification.json.gz`

- 压缩 SHA-256：`c0b61e23823903454c3e5c4e4057722a5db70b5db164add17d357d8201a50005`；
- 解压规范 JSON SHA-256：`e81a1a430c29423a196927f1eb5bf7397d9735eb516ccc1f828b1646884e0d00`；
- Git LFS 对象大小：168,801,056 字节。

A8P 主产物：

`验证与复现/artifacts/a8-formal-discrete-reference-maturity-qualification.json.gz`

- 压缩 SHA-256：`0aec8ce335baab93224608d01f6de0d5afcf8779226d2be8d40a5e946ae31868`；
- 解压规范 JSON SHA-256：`56dd50ed6c941b4581d5f7fa7faabafb2459f334749a5b321a64329c0abf00ff`；
- 压缩/规范 JSON 大小：23,170,223/174,836,651 字节；
- 主运行和仓库外完整独立复跑逐字节一致；
- 该精确压缩路径由候选包内 Git LFS 规则跟踪。

## 下一决策点

A8P 已到冻结停止门。下一步不是直接创建 A8Q，而是交回独立 Pro/人工裁决：

1. 是否接受短时离散参考 PASS 为有限时间候选证据；
2. 是否接受高参数零种子镜像锁定与非零种子增长的分类证据；
3. 如何处理长期横向宽度敏感性 NO-GO；
4. 是否需要另立、预注册新的横向域收敛阶段，或者终止当前边界路线。

在新的独立合同或明确裁决前，不修改 S1、S9、A8O，不创建新边界策略，不修改正式程序，也不运行 weak-FSI、三维、自由表面、装置预测或实验拟合。

## 结论边界

当前已经建立的是有限时间离散参考和可复现的反对称成熟性分类协议。尚未建立：

- 长时横向域不敏感性；
- 网格、Mach 数与域尺寸联合收敛；
- 一般二维涡量相容入口；
- 来源级高分辨率固定圆柱载荷真值；
- 规定横移定量长时；
- weak-FSI、三维、自由表面；
- 装置预测或实验验证。

不得把：

- S9 的低声学反射；
- A8P 短时 S1/S9 逐值一致；
- 高参数种子增长分类；
- A8P 补偿人口账 PASS；

写成正式二维边界、长时载荷收敛、固定圆柱物理真值或涡激摆预测 PASS。
