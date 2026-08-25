# A8 入口距离括号结果

- 生成时间：2026-08-25T17:10:45.385Z
- profile：`smoke`
- 总判定：**PASS-A8I-SMOKE-QUANTITATIVE-MATRIX-NOT-RUN**
- 结论：双 mask 三入口距离执行链可达；短窗与 N_D=8 不作定量裁决。

## 算例

| upstream/D | mask half | mean Cd | CL rms | St | mature | literature |
|---:|---:|---:|---:|---:|---|---|
| 7.0 | 0.50 | 1.481618 | 0.111512 | 0.16500 | FAIL | FAIL |
| 10.5 | 0.50 | 1.446594 | 0.107528 | 0.16625 | FAIL | FAIL |
| 14.0 | 0.50 | 1.419828 | 0.110554 | 0.17050 | FAIL | FAIL |
| 7.0 | 0.75 | 1.582986 | 0.161415 | 0.15600 | FAIL | FAIL |
| 10.5 | 0.75 | 1.543219 | 0.155070 | 0.15625 | FAIL | FAIL |
| 14.0 | 0.75 | 1.511721 | 0.156904 | 0.16175 | FAIL | FAIL |

## 入口距离诊断


## 门状态

- 数值稳定：PASS
- 全算例成熟：FAIL/NOT-APPLICABLE
- 7D 重复点复现：FAIL/NOT-APPLICABLE
- 10.5D→14D 双族收窄：FAIL/NOT-APPLICABLE
- 任一文献全门命中：NO
- 来源特征非反射边界已运行：NO

## 结论边界

本括号只改变当前 Zou--He 速度入口到圆柱的距离，并保持 10D 横向周期宽度和 19.5D 下游距离。入口距离收窄不等于来源 Whitfield--Janus 特征非反射边界已复现，也不是更高分辨率、GCI、规定横移、weak-FSI、三维或实验验证。
