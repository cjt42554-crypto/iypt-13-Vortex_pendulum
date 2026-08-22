# IYPT 2027 第 13 题“Vortex pendulum”趋势冲突
## A0+A1 第一批实施与验收报告

**实施身份：** `VP-TREND-CONFLICT-A0-A1-IMPLEMENTATION-v1`  
**依据裁决：** `VP-TREND-CONFLICT-ROUTE-RULING-v1`  
**裁决原文 SHA-256：** `f107fe1ee76310a5c77ff828ee60e6ed3c4754eaf59b619399686eaacc8a2216`  
**实施日期：** 2026-08-22（Asia/Singapore）  
**当前结论：** `A0 PASS`、`A1 PASS`；`A2 NOT STARTED`；真实装置趋势继续 `NO-GO`

**程序交付尺度：** 研究用、可正常计算、可随理论继续修改；不按发布版或生产系统验收。本文的回归、哈希和账本检查只用于保证科学语义与修改边界，不构成部署、服务可用性、长期兼容性或生产认证。

---

## 1. 本批只完成了什么

本批严格停在裁决第 10 节允许的 A0+A1：

1. 冻结旧 artifact、原文件 SHA-256、旧缺陷和证据撤回状态；
2. 在 `collideAndStream()` 真正消费的同一组
   \(\rho,\mathbf u,\mathbf f_B,\mathbf u_s\) 上逐格子步累计 Guo/Brinkman source；
3. 返回实际 raw 线力冲量、代表条带 raw 角冲量、实际 raw 功、Brinkman 流体侧功、raw 固体反力功、惩罚耗散与代数余量；
4. 将本步 `applied`、终点重算 `diagnostic` 和逐步累计 `cumulative` 分组；
5. 保留旧 `lineForce/fluidPower/stressLineForce` 字段用于历史复现，但明确降级；
6. metrics 增加由累计 applied work 消费的机械能账本，同时保留旧指标；
7. 增加三个 provenance 哈希、分项证据声明、缺陷标志和 GUI 配对闸门；
8. 拆分 ROM 先验参考频率、机械—静水名义频率和 CFD 尚不可用的辨识频率；
9. GUI 分开显示本步 applied raw 功与终点 diagnostic legacy 功，且不把 ROM 功与 CFD raw 功当作同一物理量叠图；
10. 更新四层文档中的证据状态和术语，但没有修改结构性趋势结论。

本批没有实现：

- 虚拟内部流体动量/动能修正；
- 完整控制体动量取力；
- stress contour 的“修复”或重新升级；
- 规定运动复阻抗与联合收敛；
- weak-FSI 更新顺序、强耦合或自由 FSI 新结果；
- ROM 方程、系数、符号、相位或跨度系数调整；
- schema 4 物理语义迁移；
- 真实装置增长/衰减方向判断。

也没有把安装包、自动更新、远程服务、账号权限、云部署、生产监控或长期 API 兼容列为目标；这些都不属于本项目当前模拟程序和计算程序的交付要求。

---

## 2. A0：历史证据冻结

### 2.1 冻结结果

`artifacts/legacy-a0/legacy-artifact-index.json` 冻结了：

| 项目 | 数值 |
|---|---:|
| 原历史 artifact 数 | 49 |
| 原文件总字节数 | 428,364,115 |
| 原文件身份 | 每个文件保存 `bytes + SHA-256` |
| 伴随清单 | 每个 artifact 各有 `.legacy-manifest.json` |
| 原文件是否覆盖 | 否 |
| 索引 SHA-256 | `0f122bd973bd952cafce95502c1fdafa3dfea0dc2263d69fca4e41690232c583` |

CFD 或混合证据的伴随清单明确写出：

```text
validAsExecuted: true
physicalLoadValidation: withdrawn
apparatusTrendEvidence: withdrawn
knownDefects:
  - applied-and-diagnostic-load-time-level-mismatch
  - incomplete-stress-contour-diagnostic
  - explicit-weak-fsi-when-applicable
  - representative-strip-replication-when-applicable
  - unclosed-load-convergence
```

完整性复核文件：

`artifacts/legacy-a0/a0-artifact-integrity-report.json`

最终结果：

```text
status: PASS
artifactCount: 49
failed checks: 0
```

冻结脚本现在是一次性操作；索引存在时会拒绝重新扫描，防止把 A1 之后的新证据误标成 legacy。后续只运行 `verify:a0-artifacts`。

---

## 3. A1：同一碰撞时层的 raw 交换合同

### 3.1 力合同

```text
VP-CFD2D-RAW-BRINKMAN-A1-v1
```

格子步直接返回：

```text
BrinkmanStepExchange
  bodyForceImpulseX/Y
  rawReactionImpulseX/Y
  fluidBrinkmanWork
  rawSolidReactionWork
  penaltyDissipation
  algebraicWorkResidual
  absoluteWorkScale
```

这些量不是在输出时重新 `inspect()` 得到，而是在实际 Guo forcing 碰撞循环内累计。

原始功恒等式为

\[
W_{\mathrm{raw},s}^{\prime n}
+W_{B\to f}^{\prime n}
+D_B^{\prime n}=0.
\]

它只证明 raw 交换实现的代数自洽，不证明 raw Brinkman 反力等于修正物理水动力。

### 3.2 结果分组

```text
interfaceExchange.applied
  startTime / midpointTime / endTime
  midpointTheta / midpointOmega
  appliedRawLineImpulseX/Y
  appliedRawLineForceX/Y
  appliedRawLineWork
  appliedRawTorqueImpulse
  appliedRawTorque
  appliedRawWork / appliedRawPower
  brinkmanFluidWork
  rawSolidReactionWork
  brinkmanPenaltyDissipation
  brinkmanAlgebraicResidual

interfaceExchange.diagnostic
  endpointTime
  diagnosticEndpointRawLineForceX/Y
  legacyIncompleteStressContourLineForceX/Y
  legacyIncompleteStressContourRelativeDifference

interfaceExchange.cumulative
  cumulativeAppliedRawLineWork
  cumulativeAppliedRawWork
  cumulativeBrinkmanFluidWork
  cumulativeRawSolidReactionWork
  cumulativeBrinkmanPenaltyDissipation
  cumulativeBrinkmanAlgebraicResidual
```

旧字段仍在 schema 3 中存在，但语义冻结为 legacy：

| 旧字段 | A1 后语义 |
|---|---|
| `lineForceX/Y` | 终点重新计算的 diagnostic raw 线力 |
| `fluidPower` | CFD 中为终点 diagnostic legacy 功率；不代表前一格子步 applied work |
| `stressLineForceX/Y` | legacy incomplete contour diagnostic |
| `forcePathRelativeDifference` | legacy 诊断差；不参与证据通过门 |
| `fully-coherent-upper-bound` | 旧配置键；只表示代表条带完全相干复制情景，不是装置功率上界 |

### 3.3 动力学不变性

为六组原 weak-FSI 配置在 A1 插桩前冻结 64 个逐步状态：

| 配置 | 冻结 trace SHA-256 | A1 后 |
|---|---|---|
| D/8 | `a39cd6abecdddc1091701ebe00218a9b964439f87a4eeb0da710941155b99a51` | exact |
| D/12 默认比较配置 | `c98d580904abaecb2eb8abc4eb4158e228d8f5d1c4461b1fc27da74d939784f9` | exact |
| D/16 | `f0cd8f87267201eeb9e79039e5f57b7d1d09e179120a9fa892429dd6cccc9a2b` | exact |
| D/12 low-Mach | `a846c7019ebc11741430f7a7b684ec6d821953ddb45f8df0ca2c1b9fa5f70d24` | exact |
| D/12 seed 2028 | `3e8bf73be8d97b340b94e65e7842c5d6e11b0e2548a928819b7b3fee8d0e29c4` | exact |
| D/12 quiescent | `eb09964e9c9f96301f9dc700ee1489df8fa50616b739aac18922d8211f0ca8ce` | exact |

每一步比较的对象包括：

- `theta`；
- `omega`；
- 结构加速度；
- 边界累计质量；
- 旧实际推进 reaction；
- 全部 LBM distribution 的 SHA-256。

最终 `artifacts/legacy-a0/a1-legacy-regression.json`：

```text
status: PASS
six traces: exact
appliedLegacyReactionExact: true for every case
```

因此 A1 没有通过改变轨迹来“解决”趋势冲突。

### 3.4 原始 Brinkman 功恒等式

`artifacts/a1/brinkman-work-identity.csv` 记录 192 个移动弥散圆柱格子步。验收门为

\[
|R_B^n|
\le
100\epsilon_{\mathrm{mach}}
\left(
|W_{\mathrm{raw},s}^{\prime n}|
+|W_{B\to f}^{\prime n}|
+D_B^{\prime n}
\right).
\]

`artifacts/a1/brinkman-work-identity.json` 的最终结果：

| 量 | 结果 |
|---|---:|
| `status` | `PASS` |
| 步数 | 192 |
| applied reaction 与旧 reaction | 全部 exact |
| 恒等式通过 | 全部通过 |
| 最大绝对代数余量（格子功单位） | \(1.3877787807814457\times10^{-17}\) |
| 最大相对代数余量 | \(6.359154022664429\times10^{-16}\) |

未由该测试建立的声明：

- physical hydrodynamic force；
- virtual internal fluid correction；
- control-volume force agreement；
- apparatus trend。

---

## 4. provenance 与跨后端配对

现在每个结果显式包含：

```text
sharedPhysicalInputHash
backendDynamicsContractHash
analysisContractHash
backendDisplayName
forceContractId
loadDefinition
couplingAlgorithm
spanClosure
evidenceClaims.*
legacyStatus
knownDefects[]
```

已复现裁决审查包的共享物理输入哈希：

```text
31fd41642ad55f3369ec0173a44f1ae6a58b5509df76a13b9952cc941babc6a2
```

前向与 CFD 在同一共享物理输入下应具有相同 `sharedPhysicalInputHash`，但具有不同且明确展示的 `backendDynamicsContractHash` 和 `analysisContractHash`。后端惯性合同没有塞入共享物理输入哈希。

CFD 派生指标不再借用 ROM 的 \(C_A=1\) 频率：

- CFD：`mechanicalHydrostaticNominalFrequency` 和 `referenceReducedVelocity`；
- ROM：`romPriorReferenceFrequency` 和 `romPriorReferenceReducedVelocity`；
- `cfdIdentifiedSectionalAddedInertia`、`cfdScenarioEffectiveNaturalFrequency`、`cfdScenarioReducedVelocity` 在 B 门前均为 `null`。

---

## 5. GUI 与导出

GUI 顶部显示至少五类合同徽标：

1. 二维/三维层级；
2. 载荷定义；
3. 耦合算法；
4. 跨度闭合；
5. 证据等级。

位移、相平面和频谱的定量叠图会检查：

- `sharedPhysicalInputHash`；
- 观测位置；
- 观测单位/语义；
- 时间区间；
- 两个 dynamics contract 是否明示。

不兼容时禁止叠图，只显示当前结果并报告原因。即使位移配对通过，ROM 流体端口功和 CFD 未修正 raw 功也不会在能量/功率面板中当作同一量叠加；该面板只显示当前后端。

CFD 运行摘要和 CSV/JSON 分开给出：

- 本步实际 applied raw 平均线力/功；
- 终点 diagnostic raw 线力/legacy 功；
- 累计 applied work；
- raw Brinkman 代数余量；
- 三个 provenance 哈希与分项证据。

二维流场画布原有“缓存最近完整场帧、不闪回前向示意图”的逻辑保留。

---

## 6. 第一批验收矩阵

| 裁决验收项 | 状态 | 证据 |
|---|---|---|
| 1. 所冻结 legacy 配置的 \(\theta,\omega\) 和 LBM checksum 不变 | **PASS** | 六组各 64 步的冻结回归窗全 exact；`a1-legacy-regression.json` |
| 2. 新 applied impulse 与旧实际推进反力逐步一致 | **PASS** | 六组每步 exact；192 步独立 audit exact |
| 3. raw Brinkman 功恒等式达舍入精度 | **PASS** | 192/192；最大相对余量 \(6.36\times10^{-16}\) |
| 4. applied 与 diagnostic 时间戳明确 | **PASS** | `start/midpoint/end` 对 `endpointTime`；单元测试覆盖 |
| 5. 旧 artifact 未被覆盖 | **PASS** | 49 个原文件 SHA-256 复核，0 失败 |
| 6. GUI 不再把 diagnostic power 显示为 applied work | **PASS** | 分开图例/摘要；跨后端功语义闸门；浏览器 E2E 覆盖 |
| 7. 两个研究程序可正常执行当前模型 | **PASS** | 前向默认 12 s：`COMPLETED`、1201 样本；二维固定圆柱 0.05 s smoke：`COMPLETED`、34 格子步 |

第一批总状态：

```text
GO：A0/A1 记账与历史冻结完成。
NO-GO：把 raw Brinkman 力称为物理水动力。
NO-GO：把任一当前增长/衰减曲线称为真实装置趋势。
NO-GO：用旧 weak-FSI 或旧规定运动结果标定 ROM。
NOT STARTED：A2、B、C、D。
```

---

## 7. 复核命令

```bash
npm run verify:a0-artifacts

npm run baseline:a1-legacy -- \
  --verify artifacts/legacy-a0/a1-legacy-baseline.json \
  --report artifacts/legacy-a0/a1-legacy-regression.json

npm run audit:a1-brinkman-work
npm run simulate:forward
npm run simulate:high-fidelity -- --duration 0.05
npm test
npm run build
npm run test:e2e
npm run docs:check
```

---

## 8. 下一阶段边界

只有本报告第 6 节全部继续为 PASS，才允许开 A2。A2 的首要对象应是固定/规定运动模式中的：

1. 与同一弥散 mask 一致的虚拟内部流体动量修正；
2. 虚拟内部流体动能审计；
3. 完整固定控制体动量路径；
4. 两个嵌套控制体的一致性；
5. 零流静止、Galilean 共移、镜像、来流反转、零流匀速/加速/谐波被动性。

A2 仍不得直接替换旧 weak-FSI。只有 A2 与 B 的规定运动复阻抗、联合收敛和双功率门通过后，才可开发并验收新的功一致强耦合自由 FSI。ROM 辨识只能消费冻结且通过留出协议的规定运动数据，不能消费自由 FSI 结果回调训练。
