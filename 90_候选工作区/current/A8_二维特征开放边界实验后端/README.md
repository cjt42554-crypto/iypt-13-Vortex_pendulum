# A8 二维特征开放边界实验后端

本目录执行 `90_候选工作区/交接说明_current.md` 中推荐的候选路线：在不修改正式求解器的前提下，建立独立 D2Q9 特征开放边界实验后端，并依次运行声学脉冲、对流涡和固定圆柱启动回波三类资格基准。

当前分层裁决：

- A8B 单点边界资格：`PASS-A8B-CBC2D-BOUNDARY-QUALIFICATION-CANDIDATE-ONLY`；
- A8C 冻结稳健性矩阵：`NO-GO-A8C-CBC2D-FROZEN-ROBUSTNESS-MATRIX`；
- A8D 候选启动审计：`PASS-A8D-CBC2D-STARTUP-AUDIT-INTERNAL-GATES-CANDIDATE-ONLY`；
- A8E 候选缓启动时长敏感性：`NO-GO-A8E-CBC2D-RAMP-SENSITIVITY-INTERNAL-GATES`；
- A8F 候选碰撞核对照：`PASS-A8F-CBC2D-COLLISION-CONTRAST-INTERNAL-GATES-CANDIDATE-ONLY`；
- A8G 候选格点相位对照：`PASS-A8G-CBC2D-LATTICE-PHASE-INTERNAL-GATES-CANDIDATE-ONLY`；
- A8H 正式核只读启动对照：`NO-GO-A8H-READONLY-FORMAL-MRT-BRINKMAN-STARTUP-INTERNAL-GATES`；
- A8I 正式核只读缓启动敏感性：`NO-GO-A8I-READONLY-FORMAL-MRT-BRINKMAN-RAMP-SENSITIVITY-INTERNAL-GATES`；
- A8J 正式核只读无物体对照：`NO-GO-A8J-READONLY-FORMAL-MRT-NO-BODY-RAMP-INTERNAL-GATES`；
- A8K 正式 MRT 边界侧因果审计：`PASS-A8K-FORMAL-MRT-INLET-SIDE-CAUSAL-PROBE-CANDIDATE-ONLY`；
- A8L 正式 MRT 入口内部机制审计：`PASS-A8L-FORMAL-MRT-INLET-MECHANISM-AUDIT-CANDIDATE-ONLY`；
- A8M 证据完整性：`PASS-A8M-EVIDENCE-COMPLETE-CANDIDATE-ONLY-RETURN-TO-PRO`；S2 资格标记为 `s2ReadyForProSelection=false`。

A8C 的 NO-GO 不撤销 A8B 冻结中心点的 PASS；它否定的是把该单点结论外推到本轮完整参数包络。81 个算例中有 54 个通过，27 个高入口速度算例因共同的启动密度稳定门失败。全部 81 个算例的 CBC 探针与场误差改善门仍通过，因此该结果不能简写成“CBC 出口性能失败”。

A8D--A8G 把候选核的高速度失败定位为启动路径主导：20D 半余弦缓启动在候选核的 9 个高速度角点全部稳定，冲击启动全部失败；该分类不因换成 raw BGK 或改变 16 个圆柱亚格点相位而改变。A8E 的严格单调门因两个短时长角点的小幅反向变化而失败，所以不能把“缓启动有利”提升为已资格化的唯一时长规律。

A8H--A8J 直接只读导入正式 MRT--Brinkman 源码，得到与候选核相反且更严格的结论：正式核的均匀冲击初场 9/9 稳定，而从静止作 5D 缓启动 0/9 稳定；缓启动延长到 20D 仍为 0/9。移除 Brinkman 物体后，20D 缓启动仍为 0/9，最大密度偏差为 0.148606 至 0.148615，超过冻结的 0.12 门。由此可判入口/开放边界启动路径在无物体时已独立贡献失败，但还不能在不改变正式数值方法的前提下进一步区分入口与出口机制。

A8K 在候选区保持正式碰撞和迁移只读，交叉替换入口与出口，把冻结失败定位到入口侧。A8L 随后用八种可解释入口机制完成 72 个算例；九个角点的通过向量均为 `01000011`，只有密度归一化 Zou--He、固定密度全平衡和固定密度全正则化三种策略通过。该结果把冻结稳定杠杆进一步定位到入口密度控制，并说明正则化非平衡应力在固定密度全状态族内不是稳定必要条件。它仍不批准正式接入，也不建立精确离散质量守恒、反射性能或物理准确性。

A8M 按 Pro 裁决进一步执行精确逐人口质量账、三种启动协议和上游声学反射资格。108/108 个启动算例与 24/24 条声学轨迹完整运行，A8L 36 个锚和 A8H 9 个锚均零差，正式人口影子与质量恒等式全部闭合，独立复跑字节一致。S2 虽为 27/27 启动稳定，却为 0/27 质量资格和 0/3 声学资格；特征振幅反射比为 5.211%--6.640%，超过冻结的 5% 门，且约 78% 的绝对适配器改写落在非入射方向。legacy 在均匀目标流和固定物体已建立来流协议下各 9/9 稳定，故保留为替代路线。A8M 不支持选择 S2，正式程序继续只读。

该 PASS 仅说明本候选实现通过冻结的低成本边界资格门。它不表示：

- 已复现 Whitfield--Janus 边界；
- 已与 Guilmineau--Queutey 或开放复现来源保持数值方法同一性；
- A8 固定圆柱载荷/频率公开基准已经通过；
- 正式程序已获授权接入新边界；
- 规定横移长时、weak-FSI 或装置预测可以解锁。

## 数值身份

候选后端包含：

- 等温 D2Q9 正则化 BGK 碰撞；
- 横向周期边界；
- 左侧正则化定值入口；
- 右侧三种可比出口：固定密度 Zou--He、正则化固定压力、CBC-2D 正则化出口；
- CBC-2D 的流出声学波、流入声学波、横向项和压力/横向松弛；
- 基于速度梯度的非平衡应力重构；
- 可选格点圆柱与半格反弹，用于边界回波资格测试。

它是独立实验核，不是 `02_模拟程序/src/solvers/highFidelity/lbm.ts` 的复制品。正式核采用 MRT--Brinkman；本候选使用正则化 BGK 与格点反弹，因此任何通过结论都不能直接转移到正式核。

A8H--A8M 的审计代码例外地从候选区直接导入上述正式源文件，但只调用其公开接口，不复制、不修改正式源码。A8K--A8M 的候选边界覆盖和影子账本使用公开 checkpoint 接口建立因果及质量证据，禁止原样迁入正式步进路径。审计合同锁定该源文件 SHA-256 为 `6949dd9f215595bde4162078f9cb026456bcbed83fd2ebd08131001e03ec2dc2`；这只建立被测代码身份，不等于授权接入任何新边界。

## 运行

```bash
cd 90_候选工作区/current/A8_二维特征开放边界实验后端
npm ci
npm test
npm run typecheck
npm run qualify
npm run assert:artifact
npm run robustness
npm run assert:robustness-artifact
npm run startup-audit
npm run assert:startup-audit-artifact
npm run ramp-sensitivity
npm run assert:ramp-sensitivity-artifact
npm run collision-contrast
npm run assert:collision-contrast-artifact
npm run lattice-phase
npm run assert:lattice-phase-artifact
npm run formal-kernel-startup
npm run assert:formal-kernel-startup-artifact
npm run formal-ramp-sensitivity
npm run assert:formal-ramp-sensitivity-artifact
npm run formal-no-body-ramp
npm run assert:formal-no-body-ramp-artifact
npm run formal-boundary-factorization
npm run assert:formal-boundary-factorization-artifact
npm run formal-inlet-mechanism
npm run assert:formal-inlet-mechanism-artifact
npm run formal-inlet-qualification
npm run assert:formal-inlet-qualification-artifact
```

研究输出：

- A8B：`a8-cbc2d-boundary-qualification-research.json`；
- A8C：`a8-cbc2d-boundary-robustness-matrix.json`；
- A8D：`a8-cbc2d-startup-audit-matrix.json`；
- A8E：`a8-cbc2d-ramp-sensitivity-matrix.json`；
- A8F：`a8-cbc2d-collision-contrast-matrix.json`；
- A8G：`a8-cbc2d-lattice-phase-matrix.json`；
- A8H：`a8-formal-mrt-brinkman-startup-matrix.json`；
- A8I：`a8-formal-mrt-brinkman-ramp-sensitivity-matrix.json`；
- A8J：`a8-formal-mrt-no-body-ramp-matrix.json`；
- A8K：`a8-formal-mrt-boundary-factorization-matrix.json.gz`；
- A8L：`a8-formal-mrt-inlet-mechanism-matrix.json.gz`；
- A8M：`a8-formal-mrt-inlet-qualification.json.gz`。

这些文件均位于 `验证与复现/artifacts/`，并各有同名 `.sha256` 文件。A8C、A8E、A8H、A8I 和 A8J 的研究命令因有效 NO-GO 按设计返回退出码 2；JSON 完整写出后，必须再运行相应 `assert:*` 命令区分“有效 NO-GO 证据”与产物损坏。

方程、A8B--A8M 冻结门、结果和结论上限见 `00_二维特征开放边界合同与裁决.md`、`03_A8L_正式MRT入口内部机制审计.md` 和 `06_A8M_入口质量反射与启动资格报告.md`。当前按 A8M 合同停止并再次交回网页版 Pro：不得选择 S2，不得修改正式程序，不得把候选 wrapper 或影子账本迁入正式核，也不得把证据完整性 PASS 扩写为算法、物理或实验 PASS。
