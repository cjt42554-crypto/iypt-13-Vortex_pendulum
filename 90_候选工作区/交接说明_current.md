# 当前交接

## 当前状态

A8R v2.1 的固定圆柱与 `body=null` 双 40 步正式烟雾已经完成独立 Pro 复审并获
接受。当前状态为：

`PRO_SMOKE_ACCEPTED_RESEARCH_MATRIX_UNLOCKED_PENDING_RESULT_BLIND_AUTHORIZATION_AND_RUN`

现行裁决：

`ACCEPT-A8R-V2P1-PRO-DUAL-FORMAL-40-STEP-SMOKE`

`UNLOCK-A8R-V2P1-PRO-FROZEN-EIGHT-TRAJECTORY-RESEARCH-MATRIX-ONLY`

`REQUIRE-A8R-V2P1-PRO-RESULT-BLIND-RESEARCH-AUTHORIZATION-PRIMARY-ARTIFACT-AND-CLEAN-FULL-REPEAT`

`KEEP-A8R-V2P1-PRO-FORMAL-INTEGRATION-PHYSICAL-LOAD-AND-DOWNSTREAM-LOCKED`

本轮只完成独立审查、裁决、候选 README 和交接更新；没有执行正式求解器、没有
运行八轨迹研究矩阵，也没有修改正式理论或正式程序。

当前仍不存在 A8R 数值 PASS、INCONCLUSIVE 或 NO-GO。

## 本轮独立审查文件

- `90_候选工作区/current/A8_二维特征开放边界实验后端/30_A8R_v2_1_双40步烟雾独立审查与研究矩阵解锁裁决.md`。

- 审查提交：`d5e0662cdee163e82da3dfe2bb2554c3d1cff2b9`；
- 审查文件 SHA-256：`c46634b2975996903d7c3cb3eb5d2999bb7412630d95496d832bb480d284553c`。

该文件审查了：

- 烟雾解锁提交 `964225d51ef15fbe5a6ab9cb0e2b9d1da031d08d`；
- 结果前烟雾实现提交 `9811120482a387158115e4e5565bd25a50bf2e3b`；
- 结果后证据提交 `c69051ab0f4051ed67a8e7637a97c1023dda7aec`；
- 交接收口提交 `2dbbac3310d2713d44207eb3ac21b310a1dce63d`；
- 烟雾 JSON、sidecar、报告、作用域门、独立人口恒等式、A2 重算、前置来源门和结果后断言器。

本轮没有把 Codex 的测试和烟雾运行冒充为独立复跑。独立复跑要求保留给完整研究
矩阵阶段。

## 已接受的烟雾身份与结果

身份链：

- 上一轮 Pro 审查文件 SHA-256：`d16cc0c3dd0517c7795f102da74108b61d02088ca97a44e8a594ba83cffc9c9d`；
- 32 路径实现树 SHA-256：`5b6adfdcecb7822389025a73ca7a673432d07a26cd11a05d9b19730957ec835c`；
- 烟雾机器证据 SHA-256：`50fc8d7ccb3f5a0570f334aec8e31d7eb51cacfc4b07bce558c7b367db42ba08`。

固定圆柱：

- 40/40 步内部门通过；
- 非零 mask 与每步重建非零力计数均为 510，全部位于冻结控制体内；
- 最大绝对残差 `2.787103881018993e-12`；
- 最大残差/舍入界比值 `6.4976458717473926e-6`。

`body=null`：

- 40/40 步非零 mask 和重建非零力计数均为 0；
- 正式原始反力、正式 A2 修正和正式修正载荷逐步精确为 0；
- 独立控制体路径最大残差 `7.579122514774401e-12`；
- 最大残差/舍入界比值 `1.7663650186245528e-5`。

烟雾只建立短时正式求解器集成、机器级人口恒等式、A2 重算、负对照和来源隔离，
不建立长期稳定、锐界面、无滑移、连续载荷、正式接入或实验验证。

## 下一步唯一任务

下一轮由 Codex 完成结果盲研究授权和冻结研究矩阵，不再做额外短烟雾。

### 1. 结果前授权提交

只允许：

- 在 P1 身份中绑定最新 Pro 裁决提交、裁决文件 SHA-256 和四个裁决码；
- 授权 `RESEARCH_MATRIX`；
- 更新前置来源树、祖先链和授权测试；
- 保持研究入口和完整单算例函数在第一个求解器构造前核验作用域；
- 更新候选 README 与交接。

禁止修改 v2.1 合同、合同测试、科学核心、八轨迹矩阵、门值、周期选择、D54
屏蔽、D24 投影、控制体、人口恒等式、A2 公式、A8Q 锚、正式 `lbm.ts` 或任何
正式理论和正式程序文件。

运行 `npm ci`、候选包测试、TypeScript 和相关 Node 语法检查后，先把结果盲授权
提交推送到 `main`。第一条研究轨迹前必须确认工作树干净、
`HEAD == origin/main`、来源树闭合、冻结研究产物不存在。

### 2. 主研究与结果提交

执行 v2.1 合同冻结的 8 条唯一轨迹，生成：

- `验证与复现/artifacts/a8-brinkman-cycle-resolved-multiresolution-phase-force-identity.json.gz`；
- 对应 `.sha256` sidecar；
- 初始机器报告和验证记录。

主产物出现后不得修改任何结果相关源码、合同或门值。将主产物和初始报告作为独立
结果后提交推送。

### 3. 完整独立复跑

在另一个干净环境、使用同一结果前实现提交、从第一条算例和新鲜初态开始完整复跑
八轨迹。复跑不得使用主运行 checkpoint、缓存结果、硬链接或人口状态。

主产物与复跑产物及其 sidecar 必须：

- 规范路径不同；
- `realpath` 不同；
- 在平台提供稳定身份时 `(dev, ino)` 不同；
- gzip 逐字节一致；
- sidecar 逐字节一致；
- 各自与自身的规范 JSON 和存储字节 SHA-256 闭合。

执行研究产物断言和 repeat 断言，写入最终资格报告、验证记录和交接，推送后停止并
再次交回独立 Pro。

若主运行、复跑、来源门、周期证据或产物断言失败，不得看过部分结果后修改科学
实现或阈值继续；保留证据并按合同返回 INCONCLUSIVE 路径。

## 继续锁定

- 正式 `01_最终理论/**` 与 `02_模拟程序/**`；
- A8Q 科学源、产物、报告和门值；
- A8R v1、v2、v2.1 合同及合同测试；
- 正式接入、连续应力载荷、锐界面、无滑移、Richardson、GCI；
- 规定横移、weak-FSI、三维、自由表面；
- 装置预测、实验拟合和实验验证。

无论研究终局为何，均不得自动推进下游，必须再次交回独立 Pro。
