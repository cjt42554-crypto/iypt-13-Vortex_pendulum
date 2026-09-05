# 13-03 DW 独立组件数值证据

记录时间：2026-09-06T01:49:49+08:00。

## 身份与范围

- 源基线：`2ec36bf67fd637bee08f8ddf7286aa8852c9666b`，分支 `main`。
- 本记录绑定的组件文件及 SHA-256 见 `provenance.json`。生成记录时工作区还包含其他并行阶段的未提交文件，因此不能只用基线 commit 复现本轮状态。
- 模型身份：`VP-FWD-P0-SL1-DW-v1` 的独立 F13 湿圆盘支撑函数、方向宽度和截面阻力积分组件。
- 单位：SI；半径和轴向位置为 m，速度为 m/s，密度为 kg/m^3，力为 N，力矩为 N m，功率为 W。
- 固定随机种子：`20260905`。180 组几何样例与 150 组载荷样例各自从同一确定性 LCG 初态开始。
- 独立参考：几何参考枚举湿圆弧驻点与水线弦两端；载荷参考在实验坐标构造三维相对速度和阻力，再以位置向量叉乘力求轴矩，并用复合 Simpson 沿湿跨积分。生产实现使用分段 Gauss-Legendre 求积。
- 本记录只证明独立组件的软件/数值性质。正式模型注册、系数身份、前向积分、时间细化、CLI/GUI/Worker/导出和 SS+DW 组合均由主任务后续完成，不能据此宣布 13-03 全部完成或装置物理已验证。

## 结果

### PASS

- 180 组独立圆弧/水线极值参考：最大相对误差 `1.1212883240599575e-15`，阈值 `2e-11`。
- 150 组独立笛卡尔力与叉乘参考：顺流力、切向力、力矩最大相对误差依次为 `1.635350813919488e-7`、`1.0187394940833391e-7`、`6.111440581258646e-8`，阈值均为 `2e-6`。
- 被动性：150 组中最大机械功率为 `-0.0036377264430340257 W`，满足 `Q_D * omega <= 0`；测试允许的浮点上界为 `2e-13 W`。
- 150 组中 149 组相对顺流湿宽基线出现大于 `1e-4` 的力矩相对差，证明用例能分辨 DW，而非只验证退化支路。
- 退化/边界覆盖：全湿宽 `2R`、全干与相切宽零、半湿 `R/1.5R/2R`、零相对速度零载荷、纯顺流恢复旧湿宽、角度与流向反射、方向拐点有限对称、截面变入流和非负变 `C_D`。
- 四档真实湿跨求积阶数 `16/32/64/128`，相对独立 65536-panel-per-interval Simpson 参考的绝对力矩误差为 `3.434771343790999e-6`、`3.484384754059988e-7`、`6.63099646303067e-8`、`9.909320475287586e-9 N m`，逐档下降；最细档相对误差 `1.4857785720080405e-9`。
- 修复输入域回归：原实现以 `cos(theta)>0` 代替声明的 `|theta|<pi/2`，会接受 `2pi`，并可能接受边界 `pi/2`；现已按严格角度区间拒绝。
- DW 源码隔离严格 TypeScript 检查通过；对尚未跟踪的指定两文件执行 `git diff --no-index --check /dev/null <file>`，没有空白错误诊断（`no-index` 因存在新增内容按约定返回 1）。

### FAIL（保留，不改标）

- 新增严格角度域反例后的首次定向运行为 1 failed / 9 passed，证实旧校验错误接受域外角度。原始输出见 `first-failure.txt`；修复后为 10 passed。
- 仓库级 `npx tsc --noEmit` 在同一共享工作区失败，错误位于并行开发中的 `src/experiments/identifiability.ts`、`src/experiments/uncertainty.ts` 与 `src/solvers/forward/index.ts`，没有 DW 文件错误。原始输出见 `repository-typecheck-failure.txt`。本记录不把隔离组件通过提升为仓库构建通过。

### NOT_RUN

- 正式前向轨迹的内部时间步细化、模型四格、CLI/GUI/Worker/导出、冻结系数包回读和 SS+DW 组合：独立组件阶段未运行。
- 真实装置、标定/留出、CFD/GPU 和长时任务：未运行。

## 复现命令

工作目录除特别注明外为仓库根目录。

```bash
cd '02_模拟程序'
DW_REPORT=1 npx vitest run tests/directional-drag.test.ts --reporter=verbose
npx tsc --noEmit --strict --noUncheckedIndexedAccess --target ES2022 --module ESNext --moduleResolution Bundler --lib ES2023,DOM --skipLibCheck src/problems/vortex-pendulum/directional-drag.ts
cd ..
git diff --no-index --check /dev/null '02_模拟程序/src/problems/vortex-pendulum/directional-drag.ts'
git diff --no-index --check /dev/null '02_模拟程序/tests/directional-drag.test.ts'
```

`directional-drag-report.txt` 保存带实际误差的最终定向输出，`isolated-typecheck.txt` 保存隔离类型检查结果和命令身份。
