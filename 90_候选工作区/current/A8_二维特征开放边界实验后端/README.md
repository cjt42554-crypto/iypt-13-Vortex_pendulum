# A8 高保真开放边界当前研究包

## 当前用途

本目录保留 A8N/A8O 的冻结复现链，并作为下一阶段 A8P 的候选工作区。正式 `01_最终理论/**` 和 `02_模拟程序/**` 保持只读；候选区代码不是正式模拟程序的补丁层，也不得原样迁入正式步进路径。

A8O 已完成 72 个因果算例、72 个统计算例和 24 对二维扰动，并按冻结合同得到负裁决。网页版 Pro 已完成独立审查：

- 接受 A8O 为透明的负面或未收口候选证据；
- 保留原合同机器 NO-GO；
- 拒绝把 A8O 的 $14D$ S1/S9 平均称为严格因果或独立物理参考；
- S9 只保留为声学低反射基线，不得接入正式二维程序；
- 下一阶段先建立 A8P 离散因果参考与破除镜像锁定的成熟性协议。

完整裁决见：

- `10_A8N_网页版Pro独立审查与参考基准裁决.md`；
- `13_A8O_网页版Pro独立审查与下一路线裁决.md`；
- `90_候选工作区/交接说明_current.md`。

## 冻结活动代码

当前源码保留：

- `src/formal-incoming-characteristic-*.ts`：冻结 S9 算法、启动与法向声学实现；
- `src/formal-inlet-qualification-ledger.ts` 与相关类型、合同：A8N 逐人口质量账；
- `src/formal-causal-reference-*.ts`：A8O 因果、统计、扰动和流式产物链；
- `src/formal-boundary-factorization-boundaries.ts` 与类型：冻结复现依赖；
- `src/d2q9.ts`：候选边界宏观量工具；
- A8N/A8O 的运行器、断言器和测试。

名称中仍含 A8M/A8K 的少量文件是冻结 S9 复现链的直接依赖，不是准备继续叠加的旧算法。任何清理或中性重命名都必须先保证 A8N/A8O 哈希与复现链不被破坏。

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
- 下一阶段：`PRIORITIZE-A8P-DISCRETE-CAUSAL-REFERENCE-AND-SYMMETRY-BROKEN-MATURITY`。

A8O 的原始结论码继续保留，不因 Pro 审查而改写：

- `NO-GO-A8O-EVIDENCE-INCOMPLETE-OR-INTERNAL-GATES`；
- `HOLD-A8O-S9-PHYSICS-SELECTION-QUALIFICATION-GATES`。

## 冻结验证入口

```bash
cd 90_候选工作区/current/A8_二维特征开放边界实验后端
npm ci
npm test
npm run typecheck
npm run formal-incoming-characteristic
npm run assert:formal-incoming-characteristic-artifact
```

A8O 完整研究入口为：

```bash
npm run formal-causal-reference
```

在冻结负裁决下，该命令形成产物后预期退出 2。A8O 默认断言：

```bash
npm run assert:formal-causal-reference-artifact
```

预期在冻结人口账第一处超门记录上退出 1；不得把这一结果列为 PASS。

A8N 主产物：

`验证与复现/artifacts/a8-formal-mrt-incoming-characteristic-qualification.json.gz`

- 压缩 SHA-256：`b3df6c32ef922d7bc464f77da736f42be0fbf21ebec031b3aacb27d56fddbff4`；
- 解压规范 JSON SHA-256：`68a267662d7a2841f39cfc3fbff3238996fb0f3fa6f08df6ac8cbd3b9209fd5c`。

A8O 主产物：

`验证与复现/artifacts/a8-formal-causal-reference-2d-qualification.json.gz`

- 压缩 SHA-256：`c0b61e23823903454c3e5c4e4057722a5db70b5db164add17d357d8201a50005`；
- 解压规范 JSON SHA-256：`e81a1a430c29423a196927f1eb5bf7397d9735eb516ccc1f828b1646884e0d00`；
- Git LFS 对象大小：168,801,056 字节。

## 下一任务 A8P

A8P 必须在结果前建立独立合同，并保持 S1、S9 与正式源不变。重点是：

1. 以 D2Q9 最大流向离散速度一格每步构造严格数值域依赖，而不是使用 $c_s$ 声学锥；
2. 同时隔离左、右边界，参考不得由 S1/S9 平均构造；
3. 用正负反对称种子和固定时长层级区分真实稳态、失稳增长、运行不足和镜像锁定；
4. 将人口账补偿求和只作为次级新合同审计，不回改 A8O；
5. A8P 完成后停止并交回独立 Pro，不创建新正式边界策略。

## 结论边界

尚未建立严格离散因果参考、统计成熟分类、一般二维涡量相容入口、来源级高分辨率固定圆柱载荷真值、规定横移定量长时、weak-FSI、三维、自由表面、装置预测或实验验证。

不得把：

- S9 的低声学反射；
- A8O 相对非独立平均的小误差比；
- 统计层零升力频率；
- 人口账浮点解释；

写成正式二维边界、固定圆柱物理真值或涡激摆预测 PASS。
