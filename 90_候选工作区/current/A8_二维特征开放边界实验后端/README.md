# A8 高保真开放边界当前研究包

## 当前状态

A8R v2.1 结果前合同和合同测试均已获得独立审查接受。当前只解锁
**无结果实现阶段**；正式求解器烟雾、八轨迹研究矩阵和下游物理任务
继续锁定。

现行裁决：

`ACCEPT-A8R-V2P1-PRO-CONTRACT-TESTS-RESULT-BLIND`

`UNLOCK-A8R-V2P1-PRO-NO-RESULT-IMPLEMENTATION-ONLY`

`REQUIRE-A8R-V2P1-PRO-SYNTHETIC-FORCE-IDENTITY-CANONICAL-A8Q-ANCHOR-AND-LFS-MATERIALIZATION-GATES`

`KEEP-A8R-V2P1-PRO-FORMAL-SMOKE-RESEARCH-AND-DOWNSTREAM-LOCKED`

正式 `01_最终理论/**` 和 `02_模拟程序/**` 保持只读。候选区代码不是
正式程序补丁，也不得把不同物理模型或数值后端视为可直接互换。

## 当前主线文件

- `19_A8Q_网页版Pro独立审查与A8R路线裁决.md`；
- `20_A8R_固定惩罚时间多分辨率稳健性与力身份预注册合同.md`；
- `21_A8R_网页版Pro独立审查与v2合同修订裁决.md`；
- `22_A8R_v2_周期分辨多分辨率mask相位与力身份预注册合同.md`；
- `23_A8R_v2_网页版Pro独立审查与v2_1修订裁决.md`；
- `24_A8R_v2_1_周期有效性与主指标相位屏蔽预注册合同.md`；
- `25_A8R_v2_1_网页版Pro独立审查与合同测试解锁裁决.md`；
- `26_A8R_v2_1_网页版Pro合同测试审查与无结果实现解锁裁决.md`；
- `src/brinkman-multiresolution-contract-v2-1.ts`；
- `tests/brinkman-multiresolution-contract-v2-1.test.ts`；
- `90_候选工作区/交接说明_current.md`。

## 冻结身份链

A8Q 冻结机器裁决：

`PASS-A8Q-BRINKMAN-SCALING-PATH-CANDIDATE-ONLY-UNLOCK-A8R`

A8Q 的固定 $\eta_{\mathrm{lu}}=1$ 只建立未解析惩罚层下的两分辨率
窄裕量候选。$D=24$ 跨 mask 原始升力 RMS 相对差为 4.99512%，不是
网格收敛、Brinkman 锐界面、无滑移极限或独立物理载荷验证。

A8R v1 和 v2 均在产生任何测试或数值结果前被后续结果盲合同取代。
当前有效 v2.1 合同提交：

`16d70861900ce43070e99e88772c4cf6bbeb90a1`

合同测试提交：

`b09c9be2cbc20b8785b602a36c7feff45d2fc1d8`

合同测试 SHA-256：

`671afe5954034894f03a030ffb1e3c3642006454042f750b4b2d8888e92b548b`

A8R v1、v2 和 v2.1 当前均无数值结果。

## v2.1 合同与测试已冻结的内容

- $D\in\{24,36,54\}$、双 mask、基线相位六轨迹；
- $D=54$ 双 mask 的第二个半格横向相位两轨迹；
- $D=24$ 与 A8Q 公共投影零容差身份；
- 全部原始正斜率交叉、最后 7 个的唯一选择和禁止回退；
- 六周期闭区间 `1/0.24 <= T_j <= 1/0.15`；
- 周期端点插值、复合梯形积分和实际时长加权；
- 周期包络 Minkowski 差三值趋势门；
- 平均阻力、原始升力 RMS、去均值升力 RMS、平均周期四类主指标；
- 四条 $D=54$ 轨迹全部 6 对及每对 36 个逐周期严格 5% 比较；
- 原始人口恒等式与 A2 公式重算分离；
- 逐人口、逐链路、逐格力和逐格 $\chi\rho u$ 的绝对 Neumaier 账；
- 三终局优先级、文献观察项和全部下游锁定。

逐周期 $6\times6$ 门是轨迹内部散布与轨迹间差异的联合窄带屏蔽。
失败只能判 INCONCLUSIVE，不能单独归因于 mask 或格点相位。当前只
比较两个预注册横向相位，不能宣称完整格点相位不变或相位收敛。

## 无结果实现阶段的强制门

下一提交必须在候选区建立实现、纯合成测试、运行器、断言器、包入口
和精确 LFS 规则，并满足：

1. **合成 D2Q9 力身份**：验证内外链路符号、八个移动方向、人口动量
   闭合、支撑包含、独立失败注入、读取屏障和舍入账；
2. **A8Q 规范锚**：流式验证压缩对象、sidecar、解压规范 JSON 的
   字节数和 SHA-256，不得退回手抄标量；
3. **LFS 实体化**：检测 133 字节 LFS 指针并明确失败，不得把指针
   当作 gzip；
4. **结果盲**：纯合成测试不得写入冻结研究产物路径，不得执行正式
   40 步烟雾或八轨迹矩阵。

建议实现职责：

- `src/brinkman-multiresolution-support-v2-1.ts`；
- `src/brinkman-multiresolution-runs-v2-1.ts`；
- `src/brinkman-multiresolution-v2-1.ts`；
- `tests/brinkman-multiresolution-support-v2-1.test.ts`；
- `scripts/run-brinkman-multiresolution-v2-1.mjs`；
- `scripts/assert-brinkman-multiresolution-v2-1-artifact.mjs`。

## 允许的验证

```bash
cd 90_候选工作区/current/A8_二维特征开放边界实验后端
npm test
npm run typecheck
```

还允许 A8Q 压缩、sidecar 与规范 JSON 的流式身份核验，以及临时目录
中的小型确定性 gzip 测试。

## 当前禁止

无结果实现再次获得独立 Pro 审查前，禁止：

- 固定圆柱或 `body=null` 的正式 40 步烟雾测试；
- A8R 的任何 $D=24,36,54$ 或格点相位研究轨迹；
- 生成、覆盖或断言 A8R 冻结研究产物；
- 修改 v1、v2、v2.1 合同或合同测试；
- 修改 A8Q 科学源、产物、报告和门值；
- 修改正式理论或正式程序；
- Richardson、GCI、锐界面、无滑移极限或载荷物理资格；
- S9 正式接入、S10、规定横移、weak-FSI、三维、自由表面、装置预测
  或实验拟合。

## 冻结产物摘要

- A8N 压缩/规范 SHA-256：
  `b3df6c32ef922d7bc464f77da736f42be0fbf21ebec031b3aacb27d56fddbff4` /
  `68a267662d7a2841f39cfc3fbff3238996fb0f3fa6f08df6ac8cbd3b9209fd5c`；
- A8O 压缩/规范 SHA-256：
  `c0b61e23823903454c3e5c4e4057722a5db70b5db164add17d357d8201a50005` /
  `e81a1a430c29423a196927f1eb5bf7397d9735eb516ccc1f828b1646884e0d00`；
- A8P 压缩/规范 SHA-256：
  `0aec8ce335baab93224608d01f6de0d5afcf8779226d2be8d40a5e946ae31868` /
  `56dd50ed6c941b4581d5f7fa7faabafb2459f334749a5b321a64329c0abf00ff`；
- A8Q 压缩/规范 SHA-256：
  `022cc54704ac542b5c148eed5ce026f5701ae79d50426ec3417073f1148ef451` /
  `16dad4a4d95eb91ad0e6f4e427d0d8ea05c8a349b479233479e03a78c6943082`。
