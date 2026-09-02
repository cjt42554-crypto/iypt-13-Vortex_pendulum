# A2 控制体取力与规定运动功率审计结果

- 生成时间：2026-08-25T09:53:58.477Z
- profile：`smoke`
- 总判定：**PASS-A2-COMPONENT-SMOKE-RESEARCH-MATRIX-NOT-RUN**
- 结论：A2 实现链可运行，但尚未执行三网格三 Mach 的规定运动研究矩阵；不能裁决功率符号。

## 硬门摘要

- raw 离散控制体与 A1 反力特征尺度对账：PASS
- 控制体边界无 Brinkman 源：PASS
- 控制体位置下功率符号稳定：PASS
- 网格–Mach 矩阵功率符号稳定：FAIL/NOT-RUN

## 算例

| case | N_D | U_lu | Ma_ref | raw max/RMS_ref | raw RMS/RMS_ref | raw CV | CV 功率符号 | mean corrected power range (W/m) |
|---|---:|---:|---:|---:|---:|---|---|---:|
| d08-u0040 | 8 | 3.999e-2 | 6.926e-2 | 1.794e-11 | 3.044e-12 | PASS | negative | -3.303822e-6 … -3.303822e-6 |

## 结论边界

本结果只审计二维单位跨长、规定运动条件下的动态取力与机械端口功率。即使全部硬门通过，也不等同于三维有限湿跨、自由表面、真实水槽或实物装置预测通过。
