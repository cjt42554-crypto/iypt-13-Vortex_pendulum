# 当前交接

## 本轮独立裁决

已独立审查 A8R v2.1 合同测试提交：

`b09c9be2cbc20b8785b602a36c7feff45d2fc1d8`

测试文件：

`90_候选工作区/current/A8_二维特征开放边界实验后端/tests/brinkman-multiresolution-contract-v2-1.test.ts`

新增审查文件：

`90_候选工作区/current/A8_二维特征开放边界实验后端/26_A8R_v2_1_网页版Pro合同测试审查与无结果实现解锁裁决.md`

裁决为：

`ACCEPT-A8R-V2P1-PRO-CONTRACT-TESTS-RESULT-BLIND`

`UNLOCK-A8R-V2P1-PRO-NO-RESULT-IMPLEMENTATION-ONLY`

`REQUIRE-A8R-V2P1-PRO-SYNTHETIC-FORCE-IDENTITY-CANONICAL-A8Q-ANCHOR-AND-LFS-MATERIALIZATION-GATES`

`KEEP-A8R-V2P1-PRO-FORMAL-SMOKE-RESEARCH-AND-DOWNSTREAM-LOCKED`

合同测试可接受，但这不是 A8R 科学实现、烟雾测试、数值或物理 PASS。

## 接受理由

合同测试通过内部、不导出的结果盲 oracle，充分覆盖：

- 唯一八算例矩阵、顺序、双 mask、两个预注册横向相位和派生公式；
- v2.1、正式源、上一轮 Pro 裁决和 A8Q 的身份链；
- $D=24$ 公共投影字段及零容差语义；
- 最后 7 个原始交叉的唯一选择、禁止回退、六周期闭区间门及已知
  半周期/双周期反例；
- 周期插值、梯形积分、实际时长加权和偶数中位数；
- Minkowski 差三值门的五类人工样例；
- 四类主指标、四轨迹全部 6 对及每对 36 个逐周期比较；
- A8Q 精确常数的窄适用范围；
- 原始人口恒等式与 A2 重算的字段分离、禁止输入、绝对账、读取屏障、
  三终局和下游锁定。

完整机器合同哈希也已被测试绑定，因此未逐字段单独断言的合同内容
不能静默漂移。

## 下一阶段三个阻塞门

### 1. 合成 D2Q9 力身份

合同测试当前主要冻结声明和纯 oracle。无结果实现必须用合成人口场
验证：

- 均匀零反力；
- 向内/向外链路符号；
- 八个移动方向和对角分量；
- 已知人口动量变化与控制面通量闭合；
- mask/Brinkman 力支撑包含；
- 原始力和 A2 残差独立注入失败；
- 正式比较值提前读取时抛错；
- 逐项绝对账与两类舍入上界。

### 2. A8Q 规范锚

下一阶段在导入任何 $D=24$ 锚前，必须流式核验：

- 压缩对象字节数与 SHA-256；
- sidecar；
- 解压规范 JSON 的 100,105,555 字节和规范 SHA-256。

不得构造超大单字符串，也不得退回报告手抄标量。

### 3. Git LFS 实体化

若压缩文件仍是 133 字节 LFS 指针，必须明确失败并提示完成 LFS
实体化；不得把指针当作 gzip，也不得跳过身份核验。

## 下一步唯一任务

Codex 只建立一个独立的 A8R v2.1 无结果实现提交。职责至少包括：

- 周期、趋势、相位与 D24 锚支持；
- 只读正式求解器适配和八算例采样结构；
- 独立人口控制体恒等式、A2 重算和舍入账；
- 纯合成实现级测试；
- 运行器、产物断言器、包入口和精确 LFS 规则。

建议路径：

- `src/brinkman-multiresolution-support-v2-1.ts`；
- `src/brinkman-multiresolution-runs-v2-1.ts`；
- `src/brinkman-multiresolution-v2-1.ts`；
- `tests/brinkman-multiresolution-support-v2-1.test.ts`；
- `scripts/run-brinkman-multiresolution-v2-1.mjs`；
- `scripts/assert-brinkman-multiresolution-v2-1-artifact.mjs`。

允许执行纯合成测试、候选包 `npm test`、`npm run typecheck` 和 A8Q
流式身份核验。允许用临时目录测试小型确定性 gzip，但不得写入 A8R
冻结研究产物路径。

提交必须直接推送到远程 `main`，然后停止并再次交回独立 Pro。

## 当前继续锁定

在无结果实现再次获得独立 Pro 审查前，禁止：

- 固定圆柱或 `body=null` 的 40 步正式求解器烟雾测试；
- 任何 A8R $D=24,36,54$ 或格点相位研究轨迹；
- 生成、覆盖或断言 A8R 冻结研究产物；
- 修改 v1、v2、v2.1 合同或合同测试；
- 修改 A8Q 科学源、产物、报告或门值；
- 修改正式理论或正式程序；
- Richardson、GCI、锐界面、无滑移极限或载荷物理资格；
- S9 正式接入、S10、规定横移、weak-FSI、三维、自由表面、装置
  预测或实验拟合。

## 本轮验证边界

已执行：合同测试源码逐段审查、提交范围和祖先关系核对、机器合同
对应关系检查、远程 `main` 写入前 HEAD 核对。

未执行：本轮环境中的 `npm test`、`npm run typecheck`、`npm ci`、
A8Q 规范 JSON 复算、无结果实现、正式烟雾、研究矩阵及正式
`npm run validate`。

正式 `01_最终理论/**` 与 `02_模拟程序/**` 未修改。A8R v1、v2、
v2.1 仍未产生任何数值结果。
