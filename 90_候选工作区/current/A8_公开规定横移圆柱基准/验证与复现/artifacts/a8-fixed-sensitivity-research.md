# A8 固定圆柱离散敏感性结果

- 生成时间：2026-08-25T15:15:38.772Z
- profile：`research`
- 总判定：**NO-GO-A8S-MASK-DOMINANT-STILL-REFERENCE-MISMATCH**
- 结论：没有单因素算例进入全部文献容差；当前诊断为 mask-half-thickness，A8 固定基线继续闭锁。

## 离散设置

| variant | group | dx | dy | mask half | eta hat |
|---|---|---:|---:|---:|---:|
| baseline | baseline | 0.00 | 0.00 | 0.75 | 6.2500e-3 |
| phase-x-half | grid-phase | 0.50 | 0.00 | 0.75 | 6.2500e-3 |
| phase-y-half | grid-phase | 0.00 | 0.50 | 0.75 | 6.2500e-3 |
| phase-xy-half | grid-phase | 0.50 | 0.50 | 0.75 | 6.2500e-3 |
| mask-half-0p50 | mask-half-thickness | 0.00 | 0.00 | 0.50 | 6.2500e-3 |
| mask-half-1p00 | mask-half-thickness | 0.00 | 0.00 | 1.00 | 6.2500e-3 |
| mask-half-1p25 | mask-half-thickness | 0.00 | 0.00 | 1.25 | 6.2500e-3 |
| eta-half | penalization | 0.00 | 0.00 | 0.75 | 3.1250e-3 |
| eta-double | penalization | 0.00 | 0.00 | 0.75 | 1.2500e-2 |

## 载荷与门

| variant | mean Cd | CL rms | St | mature | literature | score |
|---|---:|---:|---:|---|---|---:|
| baseline | 1.844837 | 0.639329 | 0.19925 | PASS | FAIL | 16.915 |
| phase-x-half | 1.846595 | 0.630929 | 0.19975 | PASS | FAIL | 16.840 |
| phase-y-half | 1.870241 | 0.652613 | 0.20000 | PASS | FAIL | 17.905 |
| phase-xy-half | 1.862063 | 0.641468 | 0.19950 | PASS | FAIL | 17.363 |
| mask-half-0p50 | 1.766883 | 0.581699 | 0.20100 | PASS | FAIL | 14.265 |
| mask-half-1p00 | 1.952864 | 0.695625 | 0.19600 | PASS | FAIL | 19.833 |
| mask-half-1p25 | 2.002575 | 0.709555 | 0.19475 | PASS | FAIL | 21.025 |
| eta-half | 1.841495 | 0.656685 | 0.19825 | PASS | FAIL | 17.082 |
| eta-double | 1.860304 | 0.615279 | 0.20100 | PASS | FAIL | 16.973 |

## 因素幅度

- grid-phase：最大相对载荷偏差 2.0356e-2；最大绝对 St 偏移 7.5000e-4；算例 phase-x-half, phase-y-half, phase-xy-half。
- mask-half-thickness：最大相对载荷偏差 9.8972e-2；最大绝对 St 偏移 4.5000e-3；算例 mask-half-0p50, mask-half-1p00, mask-half-1p25。
- penalization：最大相对载荷偏差 3.7617e-2；最大绝对 St 偏移 1.7500e-3；算例 eta-half, eta-double。

## 门状态

- 数值稳定：PASS
- 全算例成熟：PASS
- 原基线复现：PASS
- 任一单点进入全部文献容差：NO
- 因素诊断：mask-half-thickness
- 最低文献误差分数算例：mask-half-0p50

## 结论边界

这是固定圆柱、单一网格与单一 Mach 下的一次一因素离散敏感性诊断。它不能把某个参数点解释为校准结果；即使单点进入文献容差，也必须在网格、Mach、域和参数联合收敛中独立复现，才能解除 A8 闭锁。规定横移长时分支、weak-FSI、三维装置和实验验证均未执行。
