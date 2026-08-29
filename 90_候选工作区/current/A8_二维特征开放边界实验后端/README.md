# A8 高保真开放边界当前研究包

## 当前状态

A8R v2.1 已完成结果前合同、合同测试、无结果实现，以及最新 Pro 裁决要求的
结果盲 P1 基础设施修订。原无结果实现提交：

`d42efeb192f10a433d0f2a02d2a3cb119ac26c42`

独立 Pro 对该实现的当前裁决为：

`ACCEPT-A8R-V2P1-PRO-NO-RESULT-SCIENTIFIC-CORE-IN-PRINCIPLE`

`REJECT-A8R-V2P1-PRO-FORMAL-SMOKE-OR-RESEARCH-UNLOCK`

`REQUIRE-A8R-V2P1-PRO-P1-ASSERTION-REPEAT-PROVENANCE-AND-AUTHORIZATION-REPAIR`

`KEEP-A8R-V2P1-PRO-FORMAL-SMOKE-RESEARCH-AND-DOWNSTREAM-LOCKED`

P1 修订只修复产物断言、完整复跑闭合、运行时来源身份和后实现授权门，未运行
任何正式求解器步骤。P1 由
`src/brinkman-multiresolution-p1-v2-1.ts` 的最后修改提交标识，前置门会要求
该提交已经推送到远程 `main`，并以该提交中的完整运行依赖字节树为身份。

P1 自身不解锁任何执行范围。正式 40 步烟雾、八轨迹研究矩阵和下游物理任务
继续锁定，必须等待新的独立 Pro 审查。

正式 `01_最终理论/**` 与 `02_模拟程序/**` 保持只读。候选区代码不是正式程序补丁，也不得把不同物理模型或数值后端视为可直接互换。

## 当前主线文件

- `19_A8Q_网页版Pro独立审查与A8R路线裁决.md`；
- `24_A8R_v2_1_周期有效性与主指标相位屏蔽预注册合同.md`；
- `25_A8R_v2_1_网页版Pro独立审查与合同测试解锁裁决.md`；
- `26_A8R_v2_1_网页版Pro合同测试审查与无结果实现解锁裁决.md`；
- `27_A8R_v2_1_网页版Pro无结果实现审查与P1修订裁决.md`；
- `src/brinkman-multiresolution-contract-v2-1.ts`；
- `src/brinkman-multiresolution-p1-v2-1.ts`；
- `tests/brinkman-multiresolution-contract-v2-1.test.ts`；
- `tests/brinkman-multiresolution-p1-v2-1.test.ts`；
- `scripts/assert-brinkman-multiresolution-repeat-v2-1.mjs`；
- `90_候选工作区/交接说明_current.md`。

## A8Q 冻结边界

A8Q 冻结机器裁决为：

`PASS-A8Q-BRINKMAN-SCALING-PATH-CANDIDATE-ONLY-UNLOCK-A8R`

固定 $\eta_{\mathrm{lu}}=1$ 只建立未解析惩罚层下的两分辨率窄裕量候选。$D=24$ 跨 mask 原始升力 RMS 相对差约 4.99512%，不能解释为网格收敛、Brinkman 锐界面、无滑移极限或独立物理载荷验证。

A8Q 压缩/规范 SHA-256：

- `022cc54704ac542b5c148eed5ce026f5701ae79d50426ec3417073f1148ef451`；
- `16dad4a4d95eb91ad0e6f4e427d0d8ea05c8a349b479233479e03a78c6943082`。

## v2.1 已冻结的科学结构

- $D\in\{24,36,54\}$、双 mask、基线相位六轨迹；
- $D=54$ 双 mask 的第二个半格横向相位两轨迹；
- $D=24$ 与 A8Q 公共投影零容差身份；
- 全部原始正斜率过零点、最后 7 个唯一选择和禁止回退；
- 六周期闭区间 `1/0.24 <= T_j <= 1/0.15`；
- 周期端点插值、复合梯形积分和实际时长加权；
- 周期包络 Minkowski 差三值趋势门；
- 平均阻力、原始升力 RMS、去均值升力 RMS、平均周期四类主指标；
- D54 四条轨迹全部 6 对及每指标每对 36 个逐周期比较；
- 原始人口控制体恒等式与 A2 公式重算分离；
- 逐人口、逐链路、逐格 Brinkman 力和逐格 $\chi\rho u$ 的绝对 Neumaier 账；
- 三终局优先级和下游锁定。

逐周期 $6\times6$ 门是轨迹内部散布和轨迹间差异的联合窄带屏蔽。失败只能判 INCONCLUSIVE，不能单独归因于 mask 或格点相位。当前两个横向相位也不能建立完整格点相位不变或相位收敛。

## P1 结果盲修订

当前候选实现完成以下机器闭合：

1. sidecar 期望文本只有一个实现，并显式写入两个真实 `"\n"`；
2. 完整产物断言器要求 repeat 参数存在；primary/repeat 的规范化绝对路径、
   真实文件和 sidecar 均必须不同；gzip 与 sidecar 必须分别逐字节一致，否则
   非零退出；
3. 新增小型确定性双文件 CLI 测试，覆盖缺 repeat、同路径、错误 sidecar 和
   合法双文件；路径不同仍不冒充“确实独立执行”的不可伪造证明，研究阶段还须
   在资格报告中记录第二次运行从干净环境和第一个算例开始；
4. 研究入口和单算例适配器均在第一个
   `D2Q9MrtBrinkmanSolver` 构造前执行硬锁；当前授权状态为
   `LOCKED_PENDING_POST_P1_PRO_REVIEW`，授权范围为空；
5. 前置门从研究运行器、完整产物断言器和双文件断言 CLI 出发，使用 TypeScript
   语法树递归收集全部仓库内静态导入，并额外绑定 `package.json`、
   `package-lock.json`、`tsconfig.json`、精确 LFS 规则和 P1 测试；因此
   `benchmark-metrics.ts`、`benchmark-contract.ts`、正式 LBM 源、A8Q 复用源和
   其他传递依赖都由 P1 提交字节树覆盖；
6. 前置门不再要求每个旧科学文件的最后修改提交相同，而是验证工作树中每个
   依赖文件与明确 P1 提交中的字节完全相同。

P1 没有修改 v1、v2、v2.1 合同或合同测试，也没有改变周期、趋势、D54、D24、
控制体人口恒等式或 A2 重算算法。

## 当前允许

```bash
cd 90_候选工作区/current/A8_二维特征开放边界实验后端
npm ci
npm test
npm run typecheck
```

还允许 Node 语法检查、A8Q 流式身份核验、临时目录小型确定性 gzip/sidecar/双文件断言测试，以及不构造正式求解器的授权门负向测试。

小型双文件机器闭合入口为：

```bash
npm run assert:brinkman-multiresolution-v2-1-repeat -- \
  /path/to/primary.json.gz /different/path/to/repeat.json.gz
```

完整研究产物断言入口也必须同时提供这两个不同路径；它不再接受省略 repeat
或把同一文件与自身比较。

## 当前禁止

P1 再次获得独立 Pro 审查前，禁止：

- 固定圆柱或 `body=null` 的正式 40 步烟雾；
- A8R 的任何 $D=24,36,54$ 或格点相位研究轨迹；
- 生成、覆盖或断言 A8R 冻结研究产物；
- 修改 v1、v2、v2.1 合同或合同测试；
- 修改 A8Q 科学源、产物、报告和门值；
- 修改正式理论或正式程序；
- Richardson、GCI、锐界面、无滑移极限或载荷物理资格；
- S9 正式接入、S10、规定横移、weak-FSI、三维、自由表面、装置预测或实验拟合。
