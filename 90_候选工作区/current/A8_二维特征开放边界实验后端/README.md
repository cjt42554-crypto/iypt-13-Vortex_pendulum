# A8 二维特征开放边界候选研究包

## 当前用途

本目录只用于候选区数值研究。正式 `01_最终理论/**` 和 `02_模拟程序/**` 保持只读；候选 `checkpoint/restore` 适配器和人口影子账本不得原样迁入正式步进路径。

当前活动路线是 A8O：保持 S1 legacy 与现有 S9 公式不变，使用因果延长域参考和二维扰动资格，判断 S9 相对独立参考是否优于高反射 legacy，而不是继续调参或要求 S9 复现 legacy 末态快照。

## 当前裁决

- A8M 已正式淘汰 S2 密度归一化入口；S7、S8 只保留为强投影因果对照。
- A8N 证据完整性已接受：`ACCEPT-A8N-PRO-EVIDENCE-COMPLETE-CANDIDATE-ONLY`。
- S9 的 A8N 冻结合同结果仍为 NO-GO，因为固定物体内部场相对 legacy 的等价门为 0/9。
- 由于 legacy 在同一测试中的特征振幅反射约为 87%，该 NO-GO 不能证明 S9 的物理解更差；S9 当前为参考不足的 HOLD。
- S9 只重建左入口方向 1、5、8，在冻结的一维法向声学测试中将特征振幅反射降至约 0.5%，但尚未取得二维开放边界或正式集成资格。
- 下一阶段：`PRIORITIZE-A8O-CAUSAL-REFERENCE-AND-2D-BOUNDARY-QUALIFICATION`。

完整路线和权限见：

- `10_A8N_网页版Pro独立审查与参考基准裁决.md`；
- `90_候选工作区/交接说明_current.md`。

## A8O 应复用的活动链

- `src/formal-incoming-characteristic-*.ts`：冻结的 S9 算法、启动和法向声学实现；
- `src/formal-inlet-qualification-ledger.ts` 与相关类型：已经过正式人口影子零差验证的逐人口质量账；
- `src/formal-boundary-factorization-boundaries.ts`：公共场类型和冻结缓启动函数；
- `90_候选工作区/current/A8_公开规定横移圆柱基准/**`：固定圆柱几何、载荷指标和既有上游距离研究基础；
- 正式只读源 `02_模拟程序/src/solvers/highFidelity/lbm.ts`。

A8B--A8N 的旧合同、实现、测试和机器产物仍被保留，因为它们承担继承锚、哈希身份、回归和历史裁决的可复现性；它们不是当前需要继续横向扩展的活动算法。

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

旧阶段的运行脚本继续存在，仅用于精确复现冻结证据。A8C、A8E、A8H、A8I、A8J 等有效 NO-GO 命令可能按合同返回非零退出码；必须结合对应机器断言判断产物是否完整。

## 结论边界

本目录尚未完成：

- A8O 因果长域参考；
- 斜入射声学、二维局域压力脉冲及剪切/涡量资格；
- 正式入口或出口集成；
- 来源级高分辨率固定圆柱载荷复现；
- 网格--Mach--域联合收敛；
- 规定横移定量长时、weak-FSI、三维、自由表面或实验验证。

因此不得把候选稳定性、质量账闭合或一维声学低反射写成正式高保真后端、装置预测或实验验证 PASS。
