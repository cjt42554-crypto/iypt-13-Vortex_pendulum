# A1 当前趋势冲突审查包：验证记录

验证日期：2026-08-23，Asia/Singapore  
源码身份：当前工作区无 Git HEAD；最终由包内 `SHA256SUMS` 和外层 ZIP SHA-256 绑定  
运行环境：Node.js `v24.19.0`，npm `11.17.0`

## 1. 120 s 当前重算

命令：

```bash
npx vite-node scripts/reproduce-a1-current-trend-review.ts \
  --output-dir artifacts/review-a1-current-2026-08-23
```

结果：

```text
forward termination               COMPLETED
forward accepted/rejected         12002 / 0
forward samples                   12001
forward elapsed                   about 32.64 s

CFD termination                   COMPLETED
CFD steps                         81600
CFD samples                       8161
CFD elapsed                       about 123.45 s

sharedPhysicalInputHash           8349ff238a53370ea6d2e71af407e201466031a64832d739b9b491fe45f32056
forward late/early amplitude      0.21528360597569549
CFD late/early amplitude          1.1983666825593484
CFD endpoint diagnostic F'y       0.0015343450304012272 N/m
```

截图显示 `t=120.000 s`、`diagnostic F'y=1.53e-3 N/m`，与当前重算指纹一致。

## 2. 测试

命令：

```bash
npm test
```

结果：

```text
Test Files  10 passed (10)
Tests       50 passed (50)
```

注意：这些测试证明当前测试合同通过，不证明 physical hydrodynamic force、控制体一致性、联合收敛或装置趋势。

## 3. TypeScript 与生产构建

命令：

```bash
npm run build
```

结果：

```text
tsc --noEmit                     PASS
Vite production build           PASS
18 modules transformed
```

该命令也编译了新增的当前审查复现脚本所依赖的全部源类型。

## 4. A0 历史 artifact 完整性

命令：

```bash
npm run verify:a0-artifacts -- \
  artifacts/review-a1-current-2026-08-23/a0-current-integrity-report.json
```

结果：

```text
status        PASS
artifactCount 49
```

这只证明冻结的旧 artifact、companion manifest 与撤回状态仍匹配，不恢复其物理证据资格。

## 5. A1 不改变 legacy 短前缀轨迹

命令：

```bash
npm run baseline:a1-legacy -- \
  --verify artifacts/legacy-a0/a1-legacy-baseline.json \
  --report artifacts/review-a1-current-2026-08-23/a1-current-legacy-regression.json
```

结果：

```text
status PASS
6/6 configurations exact
appliedLegacyReactionExact true for all cases
```

每个配置只比较前 64 个格子步的结构状态、旧 reaction 和完整 LBM distribution SHA-256。不能把它描述成 120 s、81600 步的历史 bitwise 冻结。

## 6. A1 raw Brinkman 同数组功恒等

命令：

```bash
npm run audit:a1-brinkman-work -- \
  artifacts/review-a1-current-2026-08-23/brinkman-work-identity-current.csv \
  artifacts/review-a1-current-2026-08-23/brinkman-work-identity-current.json
```

结果：

```text
status                       PASS
steps                        192
allAppliedReactionsExact     true
allIdentitiesPass            true
maximumAbsoluteResidual      1.3877787807814457e-17
maximumRelativeResidual      6.359154022664429e-16
```

脚本明确列出的 `claimsNotEstablished`：

```text
physical-hydrodynamic-force
virtual-internal-fluid-correction
control-volume-force-agreement
apparatus-trend
```

## 7. 文档合同检查

命令：

```bash
npm run docs:check
```

结果：

```text
DOCS PASS: all four phase documents are present,
equation-tag unique, and separated by namespace/content gates.
```

该检查不覆盖文档中的所有当前 SHA 引用。ROM 审计发现 `paper/numerics/forward-numerical-theory.md` 内引用的旧前向理论 SHA 与当前文件 SHA 不同；此漂移已在自包含材料中披露。

## 8. 未执行或不能成立的验收

本验证没有执行或没有通过以下物理门：

```text
A2 virtual internal-fluid correction        NOT STARTED
complete nested control-volume force         NOT STARTED
prescribed complex impedance convergence     NOT STARTED
grid/Mach/mask/penalty/domain joint study    UNRESOLVED
power-consistent strong FSI                  NOT STARTED
finite-span/free-surface apparatus model     ABSENT
ROM apparatus calibration and held-out test  ABSENT
synchronized experiment                      ABSENT
apparatus growth/decay trend                  NO-GO
```

