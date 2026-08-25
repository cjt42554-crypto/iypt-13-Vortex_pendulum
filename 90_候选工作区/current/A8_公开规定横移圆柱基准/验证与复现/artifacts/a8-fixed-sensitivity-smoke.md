# A8 固定圆柱离散敏感性结果

- 生成时间：2026-08-25T14:56:19.925Z
- profile：`smoke`
- 总判定：**PASS-A8S-SMOKE-QUANTITATIVE-MATRIX-NOT-RUN**
- 结论：格点相位、mask 半厚度和惩罚尺度路径均可运行；短窗结果不用于定量裁决。

## 离散设置

| variant | group | dx | dy | mask half | eta hat |
|---|---|---:|---:|---:|---:|
| baseline | baseline | 0.00 | 0.00 | 0.75 | 6.2500e-3 |
| phase-xy-half | grid-phase | 0.50 | 0.50 | 0.75 | 6.2500e-3 |
| mask-half-0p50 | mask-half-thickness | 0.00 | 0.00 | 0.50 | 6.2500e-3 |
| eta-double | penalization | 0.00 | 0.00 | 0.75 | 1.2500e-2 |

## 载荷与门

| variant | mean Cd | CL rms | St | mature | literature | score |
|---|---:|---:|---:|---|---|---:|
| baseline | 1.718610 | 0.169499 | 0.17100 | PASS | FAIL | 20.270 |
| phase-xy-half | 1.725801 | 0.210078 | 0.15000 | FAIL | FAIL | 23.599 |
| mask-half-0p50 | 1.602155 | 0.120511 | 0.17600 | FAIL | FAIL | 18.165 |
| eta-double | 1.692572 | 0.133859 | 0.18075 | FAIL | FAIL | 18.690 |

## 因素幅度

- grid-phase：最大相对载荷偏差 1.9316e-1；最大绝对 St 偏移 2.1000e-2；算例 phase-xy-half。
- mask-half-thickness：最大相对载荷偏差 2.8902e-1；最大绝对 St 偏移 5.0000e-3；算例 mask-half-0p50。
- penalization：最大相对载荷偏差 2.1027e-1；最大绝对 St 偏移 9.7500e-3；算例 eta-double。

## 门状态

- 数值稳定：PASS
- 全算例成熟：FAIL/NOT-APPLICABLE
- 原基线复现：FAIL/NOT-APPLICABLE
- 任一单点进入全部文献容差：NO
- 因素诊断：multi-factor
- 最低文献误差分数算例：mask-half-0p50

## 结论边界

这是固定圆柱、单一网格与单一 Mach 下的一次一因素离散敏感性诊断。它不能把某个参数点解释为校准结果；即使单点进入文献容差，也必须在网格、Mach、域和参数联合收敛中独立复现，才能解除 A8 闭锁。规定横移长时分支、weak-FSI、三维装置和实验验证均未执行。
