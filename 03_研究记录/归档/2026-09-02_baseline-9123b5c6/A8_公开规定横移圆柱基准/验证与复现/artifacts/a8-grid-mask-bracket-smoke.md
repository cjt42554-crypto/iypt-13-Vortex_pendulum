# A8 双 mask 三网格括号结果

- 生成时间：2026-08-25T15:22:11.652Z
- profile：`smoke`
- 总判定：**PASS-A8G-SMOKE-QUANTITATIVE-MATRIX-NOT-RUN**
- 结论：两个 mask 族均可运行；短窗和 N_D=8 不作定量裁决。

## 算例

| N_D | mask half | mean Cd | CL rms | St | mature | literature | score |
|---:|---:|---:|---:|---:|---|---|---:|
| 8 | 0.50 | 1.602155 | 0.120511 | 0.17600 | FAIL | FAIL | 18.165 |
| 8 | 0.75 | 1.718610 | 0.169499 | 0.17100 | PASS | FAIL | 20.270 |

## 网格族诊断


## 门状态

- 数值稳定：PASS
- 全算例成熟：FAIL/NOT-APPLICABLE
- 已提交参考复现：FAIL/NOT-APPLICABLE
- 16→20 双族载荷变化门：FAIL/NOT-APPLICABLE
- N_D=20 跨 mask 载荷差门：FAIL/NOT-APPLICABLE
- 任一文献全门命中：NO

## 结论边界

本结果只比较两个预先保留的弥散 mask 族在三个低分辨率网格上的趋势。三点幂律拟合只作形式诊断，不是 GCI；N_D=20 仍远低于开放复现来源的局部 N_D=50，也没有 Mach、域、边界或格点相位联合矩阵。不得据此选择参数拟合文献，也不得解锁规定横移或 weak-FSI。
