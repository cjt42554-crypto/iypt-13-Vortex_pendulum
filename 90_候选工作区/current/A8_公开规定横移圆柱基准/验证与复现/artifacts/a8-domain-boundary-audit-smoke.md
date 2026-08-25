# A8 域与边界审计结果

- 生成时间：2026-08-25T16:29:32.043Z
- profile：`smoke`
- 总判定：**PASS-A8D-SMOKE-QUANTITATIVE-MATRIX-NOT-RUN**
- 结论：双 mask 五几何执行链可达；短窗与 N_D=8 不作定量裁决。

## 几何

| geometry | mask half | L/D | W/D | upstream/D | downstream/D |
|---|---:|---:|---:|---:|---:|
| source-domain | 0.50 | 23.0 | 10.0 | 3.5 | 19.5 |
| width-15d | 0.50 | 23.0 | 15.0 | 3.5 | 19.5 |
| width-20d | 0.50 | 23.0 | 20.0 | 3.5 | 19.5 |
| outlet-26p5d | 0.50 | 30.0 | 10.0 | 3.5 | 26.5 |
| inlet-7d | 0.50 | 26.5 | 10.0 | 7.0 | 19.5 |
| source-domain | 0.75 | 23.0 | 10.0 | 3.5 | 19.5 |
| width-15d | 0.75 | 23.0 | 15.0 | 3.5 | 19.5 |
| width-20d | 0.75 | 23.0 | 20.0 | 3.5 | 19.5 |
| outlet-26p5d | 0.75 | 30.0 | 10.0 | 3.5 | 26.5 |
| inlet-7d | 0.75 | 26.5 | 10.0 | 7.0 | 19.5 |

## 载荷与门

| geometry | mask half | mean Cd | CL rms | St | mature | literature |
|---|---:|---:|---:|---:|---|---|
| source-domain | 0.50 | 1.602155 | 0.120511 | 0.17600 | FAIL | FAIL |
| width-15d | 0.50 | 1.585516 | 0.119244 | 0.17275 | FAIL | FAIL |
| width-20d | 0.50 | 1.577927 | 0.119539 | 0.17275 | FAIL | FAIL |
| outlet-26p5d | 0.50 | 1.601443 | 0.120462 | 0.17700 | PASS | FAIL |
| inlet-7d | 0.50 | 1.481618 | 0.111512 | 0.16500 | FAIL | FAIL |
| source-domain | 0.75 | 1.718610 | 0.169499 | 0.17100 | PASS | FAIL |
| width-15d | 0.75 | 1.699017 | 0.167633 | 0.16600 | FAIL | FAIL |
| width-20d | 0.75 | 1.690050 | 0.167406 | 0.16550 | FAIL | FAIL |
| outlet-26p5d | 0.75 | 1.719549 | 0.168586 | 0.17250 | PASS | FAIL |
| inlet-7d | 0.75 | 1.582986 | 0.161415 | 0.15600 | FAIL | FAIL |

## 几何敏感性


## 门状态

- 数值稳定：PASS
- 全算例成熟：FAIL/NOT-APPLICABLE
- source-domain 重复点复现：FAIL/NOT-APPLICABLE
- 15D→20D 双族收窄：FAIL/NOT-APPLICABLE
- 任一几何轴显著：NO
- 任一文献全门命中：NO
- 来源特征非反射边界已运行：NO

## 结论边界

所有算例仍使用当前正式 LBM 的横向周期回绕、Zou--He 速度入口和固定密度压力出口。扩大域是周期镜像与入口/出口距离诊断，不是 Whitfield--Janus 特征非反射边界复现。没有运行来源局部 N_D=50、高分辨率 GCI、规定横移、weak-FSI、三维或实验验证。
