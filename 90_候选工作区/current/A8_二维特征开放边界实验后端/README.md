# A8 二维特征开放边界实验后端

本目录执行 `90_候选工作区/交接说明_current.md` 中推荐的候选路线：在不修改正式求解器的前提下，建立独立 D2Q9 特征开放边界实验后端，并依次运行声学脉冲、对流涡和固定圆柱启动回波三类资格基准。

当前裁决：`PASS-A8B-CBC2D-BOUNDARY-QUALIFICATION-CANDIDATE-ONLY`。

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

## 运行

```bash
cd 90_候选工作区/current/A8_二维特征开放边界实验后端
npm test
npm run typecheck
npm run qualify
npm run assert:artifact
```

研究输出：

- `验证与复现/artifacts/a8-cbc2d-boundary-qualification-research.json`；
- `验证与复现/artifacts/a8-cbc2d-boundary-qualification-research.md`；
- `验证与复现/artifacts/a8-cbc2d-boundary-qualification-research.sha256`。

方程、冻结门、结果和结论上限见 `00_二维特征开放边界合同与裁决.md`。
