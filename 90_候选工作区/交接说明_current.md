# 当前交接

## 当前状态

A8R v2.1 已按最新 Pro 裁决完成唯一结果盲 P1 修订，并以独立提交推送到
远程 `main`：

`ffc382921ae31db02f7517866b26330a4b0a2eff`

P1 的上游审查仍为：

`ACCEPT-A8R-V2P1-PRO-NO-RESULT-SCIENTIFIC-CORE-IN-PRINCIPLE`

`REJECT-A8R-V2P1-PRO-FORMAL-SMOKE-OR-RESEARCH-UNLOCK`

`REQUIRE-A8R-V2P1-PRO-P1-ASSERTION-REPEAT-PROVENANCE-AND-AUTHORIZATION-REPAIR`

`KEEP-A8R-V2P1-PRO-FORMAL-SMOKE-RESEARCH-AND-DOWNSTREAM-LOCKED`

本轮没有生成 A8R 数值结果。当前不存在 A8R 数值 PASS、INCONCLUSIVE 或
NO-GO；P1 只是等待独立 Pro 复审的候选实现基础设施。

正式 `01_最终理论/**` 与 `02_模拟程序/**` 未修改。正式 `lbm.ts` SHA-256
仍为：

`6949dd9f215595bde4162078f9cb026456bcbed83fd2ebd08131001e03ec2dc2`

v2.1 机器合同和合同测试未修改，SHA-256 仍分别为：

- `c629337a7199f6c51a23735ca75432eaa5019b633afcf8fb4f908a6f723c335b`；
- `671afe5954034894f03a030ffb1e3c3642006454042f750b4b2d8888e92b548b`。

## P1 已完成内容

1. sidecar 文本统一由
   `scripts/brinkman-multiresolution-artifact-v2-1.mjs` 中的单一函数构造，
   运行器与断言器共享两个真实 `"\n"` 的精确两行格式。
2. 完整产物断言器现在强制 repeat 存在；primary/repeat 的规范化绝对路径、
   `realpath` 实体和 sidecar 实体均必须不同；gzip 与 sidecar 必须分别逐字节
   一致，否则非零退出。
3. 新增
   `scripts/assert-brinkman-multiresolution-repeat-v2-1.mjs` 和对应端到端测试，
   覆盖缺 repeat、同路径、错误 sidecar、合法双文件。路径不同只闭合机器可检
   部分；未来研究报告仍须记录第二次运行从干净环境和第一个算例开始。
4. 新增 `src/brinkman-multiresolution-p1-v2-1.ts`。研究包入口和
   `runBrinkmanMultiresolutionV2P1Case()` 都在第一个正式求解器构造前调用
   授权门；当前状态为 `LOCKED_PENDING_POST_P1_PRO_REVIEW`，授权范围为空。
5. 前置门从三个结果相关入口递归解析仓库内静态导入，并把
   `package.json`、`package-lock.json`、`tsconfig.json`、LFS 规则和 P1 测试
   纳入身份。提交 `ffc3829` 下共绑定 26 个路径，明确包含
   `benchmark-metrics.ts`、`benchmark-contract.ts`、正式 `lbm.ts` 和 A8Q
   复用源。
6. 实现身份改为 P1 提交下完整依赖树的字节身份，不再要求每个旧科学文件的
   最后修改提交相同。P1 树 SHA-256 为：

   `c7b82d28cfe29e6ec52716864b35a05a332374fb71c60bd3fc609c37d245effa`

周期、趋势、D54、D24、控制体人口恒等式和 A2 重算算法没有改变；v1、v2、
v2.1 合同及合同测试没有改变。

## 已执行验证

- GitHub 写接口成功创建本次 P1 新身份文件对应的 blob，随后本地提交和
  `git push origin main` 成功；P1 推送后
  `HEAD == origin/main == ffc382921ae31db02f7517866b26330a4b0a2eff`。
- `npm ci` 成功，安装 3 个包并审计 4 个包，报告 0 个已知漏洞。
- `npm test`：86/86 通过；新增 P1 测试包含四种双文件 CLI 场景、默认授权硬
  锁，以及授权调用位于求解器构造之前的检查。
- `npm run typecheck` 通过。
- 五个 A8R v2.1 相关 `.mjs` 文件的 `node --check` 通过。
- 推送后完整前置门通过：P1 的 26 路径工作树与提交字节一致，来源/祖先/远端/
  LFS 门闭合；A8Q 压缩、规范 JSON 和 sidecar SHA-256 分别复核为
  `022cc54704ac542b5c148eed5ce026f5701ae79d50426ec3417073f1148ef451`、
  `16dad4a4d95eb91ad0e6f4e427d0d8ea05c8a349b479233479e03a78c6943082`、
  `d22ad3b8e1c29e00988c78aad801ee683362ca719178707be3d43873ae456e50`；
  两条 D24 锚 ID 正确。
- 实际调用 `npm run brinkman-multiresolution-v2-1` 进行无求解器负向测试，
  在授权门按预期退出 1，并输出现行锁码；目标 A8R gzip/sidecar 均保持不存在。
- 候选 README 通过 Pandoc `--from=markdown` 严格解析，并经 MathML/Chrome
  实际渲染为 4 页后逐页检查；仓库数学检查器仍只有 A8O/A8P 冻结旧裁决的
  4 个既有命中，本轮没有新增命中。
- `git diff --check` 通过。

`npm test` 中仍包含既有 A8P 小型两步合成 smoke；本轮没有执行任何 A8R
正式求解器步骤、固定圆柱/`body=null` 40 步烟雾或研究轨迹。

## 未执行与当前禁止

本轮未执行：正式 `npm run validate`、A8R 冻结研究产物断言、任何 A8R
$D=24,36,54$ 或格点相位轨迹、Richardson/GCI、锐界面或载荷物理资格、
规定横移、weak-FSI、三维、自由表面、装置预测和实验拟合。

P1 再次获得独立 Pro 接受前继续禁止：

- 固定圆柱或 `body=null` 的正式 40 步烟雾；
- 生成、覆盖或断言 A8R 冻结研究产物；
- 修改 v1、v2、v2.1 合同或合同测试；
- 修改 A8Q 科学源、产物、报告或门值；
- 修改正式理论或正式程序；
- A8R 研究矩阵和全部下游物理任务。

## 下一步唯一任务

独立 Pro 只读审查提交
`ffc382921ae31db02f7517866b26330a4b0a2eff`。在新的精确授权裁决到达前，
Codex 不再修改 A8R 实现，也不运行正式烟雾或研究矩阵。
