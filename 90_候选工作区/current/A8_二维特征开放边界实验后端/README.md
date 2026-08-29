# A8 高保真开放边界当前研究包

## 当前状态

A8R v2.1 已完成结果前合同、合同测试、无结果实现和结果盲 P1 修订。

P1 提交：

`ffc382921ae31db02f7517866b26330a4b0a2eff`

最新独立 Pro 审查：

`28_A8R_v2_1_P1_网页版Pro独立审查与双40步正式烟雾解锁裁决.md`

审查提交：

`964225d51ef15fbe5a6ab9cb0e2b9d1da031d08d`

现行裁决：

`ACCEPT-A8R-V2P1-PRO-P1-RESULT-BLIND-REPAIR`

`UNLOCK-A8R-V2P1-PRO-DUAL-FORMAL-40-STEP-SMOKE-ONLY`

`REQUIRE-A8R-V2P1-PRO-SCOPED-SMOKE-AUTHORIZATION-AND-SEPARATE-EVIDENCE-COMMIT`

`KEEP-A8R-V2P1-PRO-RESEARCH-MATRIX-ARTIFACT-AND-DOWNSTREAM-LOCKED`

P1 已获接受。当前只解锁固定圆柱和 `body=null` 两个正式 40 步烟雾。
完整研究函数、八轨迹矩阵、冻结研究产物和下游物理任务继续锁定。

正式 `01_最终理论/**` 和 `02_模拟程序/**` 保持只读。候选区实现不是正式程序
补丁，也不得把候选离散身份通过解释为物理载荷或实验验证。

## 当前主线文件

- `19_A8Q_网页版Pro独立审查与A8R路线裁决.md`；
- `24_A8R_v2_1_周期有效性与主指标相位屏蔽预注册合同.md`；
- `25_A8R_v2_1_网页版Pro独立审查与合同测试解锁裁决.md`；
- `26_A8R_v2_1_网页版Pro合同测试审查与无结果实现解锁裁决.md`；
- `27_A8R_v2_1_网页版Pro无结果实现审查与P1修订裁决.md`；
- `28_A8R_v2_1_P1_网页版Pro独立审查与双40步正式烟雾解锁裁决.md`；
- `src/brinkman-multiresolution-contract-v2-1.ts`；
- `src/brinkman-multiresolution-p1-v2-1.ts`；
- `scripts/brinkman-multiresolution-preflight-v2-1.mjs`；
- `tests/brinkman-multiresolution-p1-v2-1.test.ts`；
- `90_候选工作区/交接说明_current.md`。

## P1 已闭合内容

P1 已完成：

- sidecar 两个真实换行的共享实现；
- primary/repeat 参数、路径、`realpath`、gzip 和 sidecar 的 fail-closed 闭合；
- 正式求解器构造前默认授权硬锁；
- benchmark、正式 LBM、A8Q 复用源、锁文件和测试的递归静态依赖树；
- 明确 P1 提交下的完整依赖树字节身份；
- 缺 repeat、同路径、错误 sidecar、合法双文件和授权负向测试。

P1 没有修改周期、趋势、D54、D24、控制体人口恒等式、A2 重算、合同或合同测试。

两个非阻塞限制仍须保留：

- `realpath` 不识别硬链接；研究授权前应在平台支持时拒绝相同 `(dev, ino)`；
- 锁文件不等于已安装依赖，正式烟雾前必须重新执行干净 `npm ci`。

## 唯一允许的下一阶段

下一阶段必须使用独立结果前提交建立专用烟雾适配器，并采用显式作用域：

- `FORMAL_FORCED_FIXED_CYLINDER_SMOKE_40`；
- `FORMAL_UNFORCED_BODY_NULL_SMOKE_40`；
- `RESEARCH_MATRIX`。

只允许前两个。现有完整研究入口和完整单算例函数必须继续拒绝
`RESEARCH_MATRIX`。不得通过开放一个无参数总开关间接解锁完整运行。

两个烟雾共同使用：

- `D=24`；
- mask 半厚度 `0.75`；
- 基线相位；
- `penalizationTimeSteps=1`；
- 入口格子速度 `0.05`；
- 新鲜均匀初态；
- 恰好 40 个 accepted steps；
- 禁止 checkpoint 恢复。

固定圆柱烟雾逐步检查人口、解析 mask、控制体支撑、原始人口恒等式、A2 重算、
正式载荷重组和有限性。

`body=null` 烟雾保留冻结控制体中心，要求 mask 和 Brinkman 力支撑为零，正式
原始反力与 A2 修正为精确零，并按冻结舍入界核验独立控制体身份。

烟雾实现提交必须在第一个正式求解器步骤前推送到 `main`。烟雾机器证据和报告
必须作为独立结果后提交写入，之后停止并交回独立 Pro。

建议证据路径：

- `验证与复现/smoke/a8r-v2p1-formal-dual-40-step-smoke.json`；
- `验证与复现/smoke/a8r-v2p1-formal-dual-40-step-smoke.sha256`；
- `29_A8R_v2_1_正式双40步烟雾测试报告.md`。

## 当前禁止

烟雾证据再次获得独立 Pro 审查前，禁止：

- 任何完整 `D=24,36,54` 或格点相位研究轨迹；
- 生成、覆盖或断言 A8R 冻结研究 gzip；
- 修改 v1、v2、v2.1 合同或合同测试；
- 修改 A8Q 科学证据；
- 修改正式理论或正式程序；
- Richardson、GCI、锐界面、无滑移、物理载荷资格；
- 规定横移、weak-FSI、三维、自由表面、装置预测或实验拟合。

## 结论上限

P1 接受只说明结果盲基础设施可以进入正式求解器集成烟雾。

即使双烟雾通过，也不建立长期稳定性、周期成熟性、三分辨率趋势、
mask/相位稳健性、锐界面、无滑移、连续应力载荷、正式程序接入或实验验证。
