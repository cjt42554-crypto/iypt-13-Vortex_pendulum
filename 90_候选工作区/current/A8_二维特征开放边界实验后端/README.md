# A8 高保真开放边界当前研究包

## 当前用途

本目录现在只保留 A8O 直接需要的活动链。正式 `01_最终理论/**` 和 `02_模拟程序/**` 保持只读；候选区代码不是正式模拟程序的补丁层，也不得原样迁入正式步进路径。

当前任务是保持 S1 legacy 与现有 S9 公式不变，使用因果延长域参考、时间分辨场与载荷以及二维扰动资格，判断 S9 是否比高反射 legacy 更接近无边界返回波解。

## 活动代码

当前源码只保留：

- `src/formal-incoming-characteristic-*.ts`：冻结的 S9 算法、启动与法向声学实现；
- `src/formal-inlet-qualification-ledger.ts` 与相关类型、合同：已经过正式人口影子零差验证的逐人口质量账；
- `src/formal-boundary-factorization-boundaries.ts` 与类型：A8N 冻结实现仍依赖其中的公共场类型和缓启动函数；
- `src/d2q9.ts`：候选边界宏观量工具；
- A8N 的运行器、断言器和三项单元测试。

名称中仍含 A8M/A8K 的少量文件是冻结 S9 复现链的直接依赖，不是准备继续叠加的旧算法。A8O 建立自己的结果前合同后，可以再把公共量迁入中性命名模块；在此之前修改这些文件会破坏 A8N 的哈希和零容差复现身份。

固定圆柱几何、载荷和既有上游距离基础位于：

`90_候选工作区/current/A8_公开规定横移圆柱基准/`

## 已移出活动树的旧阶段

A8B--A8M 的一次性候选求解器、wrapper、运行脚本、测试和中间机器矩阵已经从当前 `main` 删除。它们仍由 Git 历史永久保存，需要复查时可从清理前快照恢复：

`a57aa43e22f4ee578b236c841ae56b43f97cfd27`

删除旧文件不撤销既有裁决；裁决摘要仍保存在交接历史和当前保留的 Pro 审查文档中。当前树只保留 A8N/A8O 所需的 A8M legacy 锚产物与 A8N 主产物。

## 当前裁决

- A8N 证据完整性：`ACCEPT-A8N-PRO-EVIDENCE-COMPLETE-CANDIDATE-ONLY`；
- S9 的冻结合同结果：`CONFIRM-A8N-PRO-S9-FROZEN-CONTRACT-NO-GO-LEGACY-EQUIVALENCE`；
- S9 的物理选择状态：`HOLD-A8N-PRO-S9-PHYSICS-SELECTION-REFERENCE-INCONCLUSIVE`；
- S9 的一维法向机制：`ACCEPT-A8N-PRO-S9-INCOMING-ONLY-NORMAL-ACOUSTIC-MECHANISM-FROZEN`；
- S9 正式接入：`NO-GO-A8N-PRO-S9-FORMAL-INTEGRATION-REFERENCE-AND-2D-QUALIFICATION-REQUIRED`；
- 下一阶段：`PRIORITIZE-A8O-CAUSAL-REFERENCE-AND-2D-BOUNDARY-QUALIFICATION`。

完整裁决见：

- `10_A8N_网页版Pro独立审查与参考基准裁决.md`；
- `90_候选工作区/交接说明_current.md`。

## 当前验证入口

```bash
cd 90_候选工作区/current/A8_二维特征开放边界实验后端
npm ci
npm test
npm run typecheck
npm run formal-incoming-characteristic
npm run assert:formal-incoming-characteristic-artifact
```

A8N 主产物：

`验证与复现/artifacts/a8-formal-mrt-incoming-characteristic-qualification.json.gz`

- 压缩 SHA-256：`b3df6c32ef922d7bc464f77da736f42be0fbf21ebec031b3aacb27d56fddbff4`；
- 解压规范 JSON SHA-256：`68a267662d7a2841f39cfc3fbff3238996fb0f3fa6f08df6ac8cbd3b9209fd5c`。

A8M legacy 锚产物：

`验证与复现/artifacts/a8-formal-mrt-inlet-qualification.json.gz`

- 压缩 SHA-256：`ac6dc54eb5d9a6ece86fa266007e1fae5ccccb3532223fb9a3e8953827c1d3ba`；
- 解压规范 JSON SHA-256：`cbc790d2b07089b6c294e980d9a21af41bc6911ca7c180bb50631efffb39681e`。

## 结论边界

尚未完成 A8O 因果长域参考、斜入射声学、二维局域压力脉冲、剪切/涡量资格、正式边界接口重构、来源级高分辨率、规定横移定量长时、weak-FSI 或实验验证。不得把候选稳定性、质量账闭合或一维声学低反射写成正式高保真后端或装置预测 PASS。
