# 当前交接

## 当前状态

独立 Pro 已审查 A8R v2.1 结果盲 P1 提交：

`ffc382921ae31db02f7517866b26330a4b0a2eff`

新增审查：

`90_候选工作区/current/A8_二维特征开放边界实验后端/28_A8R_v2_1_P1_网页版Pro独立审查与双40步正式烟雾解锁裁决.md`

审查提交：

`964225d51ef15fbe5a6ab9cb0e2b9d1da031d08d`

审查文件 SHA-256：

`40e684f6e276fdcc9cee616e23f94f23095c71b343c95a8b86a4dde3169d2868`

现行裁决：

`ACCEPT-A8R-V2P1-PRO-P1-RESULT-BLIND-REPAIR`

`UNLOCK-A8R-V2P1-PRO-DUAL-FORMAL-40-STEP-SMOKE-ONLY`

`REQUIRE-A8R-V2P1-PRO-SCOPED-SMOKE-AUTHORIZATION-AND-SEPARATE-EVIDENCE-COMMIT`

`KEEP-A8R-V2P1-PRO-RESEARCH-MATRIX-ARTIFACT-AND-DOWNSTREAM-LOCKED`

P1 已结束修订循环。当前只解锁两个预注册正式 40 步烟雾；完整研究函数、
八轨迹矩阵和冻结研究产物继续锁定。

正式 `01_最终理论/**` 与 `02_模拟程序/**` 未修改。A8Q 科学证据、v1/v2/v2.1
合同和合同测试未修改。当前仍不存在 A8R 数值 PASS、INCONCLUSIVE 或 NO-GO。

## P1 审查结论

P1 已闭合上一轮四个阻塞点：

- sidecar 使用共享函数生成两个真实 `"\n"`；
- repeat 参数必需，规范化路径、`realpath`、gzip 和 sidecar 均 fail-closed；
- 研究入口和单算例适配器在正式求解器构造前默认硬锁；
- 递归静态依赖树覆盖 benchmark、正式 LBM、A8Q 复用源、锁文件和测试；
- 实现身份改为明确 P1 提交中的完整依赖树字节身份。

非阻塞剩余限制：

- `realpath` 不识别硬链接；研究授权前应在平台支持时拒绝相同 `(dev, ino)`；
- `package-lock.json` 不等于已安装依赖身份，烟雾前必须重新执行干净 `npm ci`；
- 当前 GitHub Actions 只跑 Markdown，红灯仍仅来自 A8O/A8P 四个既有旧命中。

## 下一步唯一任务

Codex 只建立、提交并执行“双 40 步正式烟雾”阶段。

### 结果前实现提交

先建立独立结果前提交并推送到 `main`，建议新增：

- `src/brinkman-multiresolution-smoke-v2-1.ts`；
- `scripts/run-brinkman-multiresolution-smoke-v2-1.mjs`；
- `scripts/assert-brinkman-multiresolution-smoke-v2-1.mjs`；
- `tests/brinkman-multiresolution-smoke-v2-1.test.ts`。

该提交必须绑定本审查提交和文件 SHA-256，并采用显式作用域：

- `FORMAL_FORCED_FIXED_CYLINDER_SMOKE_40`；
- `FORMAL_UNFORCED_BODY_NULL_SMOKE_40`；
- `RESEARCH_MATRIX`。

只允许前两个作用域。现有完整研究入口和
`runBrinkmanMultiresolutionV2P1Case()` 必须继续以 `RESEARCH_MATRIX`
作用域抛错。烟雾不得调用完整研究函数后提前截断。

结果前测试必须覆盖：

- 每种烟雾恰好 40 步，超过 40 步拒绝；
- 研究作用域和完整研究入口继续拒绝；
- 研究 gzip 路径在烟雾前后均不存在；
- 固定圆柱与 `body=null` 使用独立新鲜求解器；
- hard-link 别名在平台可识别时被拒绝；
- 作用域、来源树和输出路径不能由环境变量或 CLI 绕过。

结果前提交推送后，执行干净 `npm ci`、`npm test`、`npm run typecheck`、
相关脚本 `node --check`，并确认 `HEAD == origin/main`、工作树干净和前置门通过。

### 两个正式烟雾

共同定义：

- `D=24`；
- mask 半厚度 `0.75`；
- 基线相位；
- `penalizationTimeSteps=1`；
- 入口格子速度 `0.05`；
- 新鲜均匀初态；
- 恰好 40 个 accepted steps；
- 禁止 checkpoint 恢复。

固定圆柱烟雾必须逐步核验人口副本、解析 mask、控制体支撑、原始人口恒等式、
A2 重算、正式载荷重组和有限性。

`body=null` 烟雾必须保留冻结控制体中心，独立 mask 全零，非零 mask/力计数
为零，正式原始反力和 A2 修正为精确零，并逐步通过独立舍入界。

### 结果后证据提交

建议机器证据：

`验证与复现/smoke/a8r-v2p1-formal-dual-40-step-smoke.json`

对应 sidecar：

`验证与复现/smoke/a8r-v2p1-formal-dual-40-step-smoke.sha256`

建议报告：

`29_A8R_v2_1_正式双40步烟雾测试报告.md`

证据应记录审查提交、烟雾实现提交、依赖树、Node/V8/zlib/平台/架构、两个案例
定义、逐步门汇总、最大残差和最大残差/舍入界比值，以及：

- `researchScopeAuthorized=false`；
- `formalIntegrationUnlocked=false`；
- `researchMatrixUnlocked=false`。

机器证据和报告必须作为独立结果后提交推送到 `main`，随后停止并交回独立 Pro。

## 当前继续禁止

烟雾证据再次获得独立 Pro 审查前，禁止：

- 任何完整 `D=24,36,54` 或格点相位研究轨迹；
- 生成、覆盖或断言 A8R 冻结研究 gzip；
- 独立完整研究复跑；
- 修改 v1、v2、v2.1 合同或合同测试；
- 修改 A8Q 科学源、产物、报告或门值；
- 修改正式理论或正式程序；
- Richardson、GCI、锐界面、无滑移极限、载荷物理资格；
- S9 正式接入、S10、规定横移、weak-FSI、三维、自由表面、装置预测或实验拟合。

## 本轮验证边界

独立 Pro 实际完成：P1 源码逐段审查、提交范围和祖先关系核对、授权门位置核对、
repeat/sidecar/依赖树逻辑审查，以及 P1 GitHub Actions 日志核对。

独立 Pro 未重新执行：`npm ci`、86/86 测试、TypeScript、A8Q 规范 JSON 复算、
正式 `npm run validate`、任何正式求解器烟雾或 A8R 研究轨迹。
