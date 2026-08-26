# 正式高保真开放边界重构规划与 Codex 实施合同

## 文档状态

- 文档用途：供 Codex 按阶段实施，并供后续独立科学审查。
- 当前权限：本文件本身不授权修改 `02_模拟程序/**`。
- 当前阶段：A8K 已完成，正式重构前必须先完成候选区 A8L 入口内部机制审计。
- 分支规则：所有提交只进入 `main`，不得新建或使用其他分支。
- 解释规则：任何 PASS 只对其冻结合同、文件、配置、命令和环境有效。

本规划的目的不是把 A8K 的候选覆盖逻辑搬进正式程序，而是先确定入口问题的数值机制，再把边界条件变成正式求解器中的一级算法组件，删除对 `checkpoint/restore` 外层覆盖的依赖。

## 1. 当前问题与证据边界

现有正式高保真后端为 D2Q9 MRT--Brinkman 二维单位跨长模型。当前 `lbm.ts` 同时负责：

1. 宏观量与 Brinkman 力计算；
2. MRT 碰撞；
3. 迁移；
4. 速度 Zou--He 入口；
5. 固定密度 Zou--He 出口；
6. 检查点与诊断。

A8J 已证明，在无物体情况下，从静止按 20D 半余弦协议启动，正式入口与正式出口组合的九个冻结角点全部越过密度门。A8K 保持正式 MRT 碰撞与迁移不变，只在候选区交叉替换入口和出口，得到：

- 正式入口 + 正式出口：0/9；
- 正式入口 + CBC-2D 出口：0/9；
- 正则化规定状态入口 + 正式出口：9/9；
- 正则化规定状态入口 + CBC-2D 出口：9/9。

所以，冻结矩阵内的主要稳定杠杆已经定位到入口侧。但 A8K 的正则化入口同时改变了：

1. 边界密度目标；
2. 被重写的分布函数范围；
3. 非平衡分布的重构方式。

A8K 不能判定三者中哪一项必要或充分，也不能证明正式 Zou--He 公式本身错误。

## 2. 总目标

最终重构必须同时达到以下目标：

1. MRT、Guo forcing、Brinkman 惩罚、力和功记账、SI/格点映射保持科学身份不变；
2. 入口和出口成为与碰撞、迁移解耦的一级数值策略；
3. 时间依赖来流继续由 `flowSpeedAt` 和 `model.ts` 生成，每步只向求解器传入目标格点速度，不在边界模块内再实现一套缓启动；
4. 正式步进路径不再调用 `checkpoint/restore`、`macroscopicCopies` 或整场数组复制来覆盖边界；
5. 旧正式边界模式可精确回归，新边界模式具有独立身份、配置、检查点和 provenance；
6. 不允许自动回退、参数角点特判或为了通过测试增加兜底分支；
7. 候选诊断代码不得原样迁入正式程序。

## 3. 非目标

本轮重构不得顺带处理下列问题：

- 不修改前向预测理论或前向数值实现；
- 不改变 MRT 非水动力松弛率、黏度映射或碰撞矩阵；
- 不改变 Brinkman mask、惩罚时间、Guo 力或 A1 力功合同；
- 不修改圆柱运动映射、weak-FSI 积分、代表条带闭合或装置力矩解释；
- 不把二维单位跨长结果提升为三维装置预测；
- 不运行或宣称来源级高分辨率固定圆柱、规定横移定量长时、weak-FSI 或实验验证；
- 不以代码整洁为理由重写已经通过独立验证的碰撞核心；
- 不把候选数值稳定 PASS 写成物理准确性 PASS。

## 4. 角色分工

### 4.1 规划与科学裁决

由网页版 Pro 负责：

- 冻结问题、模型身份、阶段门和结论上限；
- 审查 A8L 的因果结果；
- 决定哪一种入口算法允许进入正式重构；
- 在 Codex 完成正式实现后作独立科学复审。

### 4.2 Codex 实施职责

Codex 负责：

- 按本合同实现候选 A8L；
- 在获批后实施正式代码重构；
- 补齐配置、检查点、provenance、UI、测试和文档；
- 执行验证并如实记录未执行项；
- 删除因正式实现而失效的重复 wrapper，但不得删除历史机器证据。

Codex 不得自行改变科学门槛、选择一个“看起来最稳定”的算法并直接设为默认，也不得把失败隐藏为 fallback。

## 5. Phase 0：A8L 入口内部机制审计

### 5.1 权限边界

A8L 只允许修改：

- `90_候选工作区/current/**`；
- `90_候选工作区/交接说明_current.md`；
- `90_候选工作区/交接说明_history.md`。

A8L 期间 `02_模拟程序/**` 保持只读。A8L 完成后，Codex必须提交证据、更新交接并停止，等待网页版 Pro 裁决。

### 5.2 为什么不做机械的 2×2×2 全因子

D2Q9 左侧速度边界只有三个未知入射分布。若保持六个已知分布不动，同时独立规定 $\rho$、$u_x$ 和 $u_y$，矩约束通常不相容；正式速度 Zou--He 正是通过给定速度并由已知分布推导密度来闭合。

因此，不得为了凑齐“密度目标 × 人口范围 × 非平衡闭合”八个组合而实现数学上过定或含义不清的边界条件。A8L 使用可解释的机制阶梯，并对不能精确施加目标矩的探针明确记录矩残差。

### 5.3 冻结公共条件

A8L 首次研究运行前，必须单独提交冻结合同。公共条件保持为：

- 正式只读 D2Q9 MRT 碰撞和迁移；
- 正式固定密度 Zou--He 出口；
- 无 Brinkman 物体；
- 均匀静止初场；
- 目标格点速度 $u_\infty=0.08$；
- 20D 半余弦缓启动；
- $N_D\in\{8,12,16\}$；
- $\tau\in\{0.54,0.56,0.58\}$；
- 九个冻结角点；
- 最大密度偏差门为 0.12；
- 最大 Mach 门为 0.30；
- A8J 正式基线逐项零容差锚；
- A8K 正则化入口 + 正式出口逐项零容差锚；
- 独立复跑字节一致门。

合同、角点、阈值和策略定义必须在首个研究结果揭示前提交。结果揭示后不得改门。

### 5.4 入口机制阶梯

每个角点至少运行下列八种策略，共至少 72 个算例：

1. `legacy-zou-he-derived-density`

   正式速度 Zou--He 基线，密度由已知分布和目标速度推导，只重构三个未知入射分布。

2. `legacy-zou-he-density-normalized`

   先执行正式 Zou--He，再把该边界节点九个分布按同一比例缩放到 $\rho=1$。该操作保持局部速度和归一化分布形状不变，用于检验“仅控制密度矩”是否足够。

3. `incoming-equilibrium-derived-density`

   使用与正式 Zou--He 相同的推导密度和目标速度，只把三个入射分布替换为对应平衡分布。必须记录施加后的实际 $\rho$、$u_x$、$u_y$ 残差；不得把它描述为精确规定状态边界。

4. `incoming-regularized-derived-density`

   与上一策略相同，但三个入射分布使用平衡项加正则化非平衡应力。必须记录实际矩残差。

5. `full-equilibrium-derived-density`

   使用正式 Zou--He 推导密度和目标速度，以平衡分布覆盖九个人口。

6. `full-regularized-derived-density`

   使用正式 Zou--He 推导密度和目标速度，以平衡项加正则化非平衡应力覆盖九个人口。

7. `full-equilibrium-fixed-density`

   使用 $\rho=1$ 和目标速度，以平衡分布覆盖九个人口。

8. `full-regularized-fixed-density`

   使用 $\rho=1$ 和目标速度，以平衡项加正则化非平衡应力覆盖九个人口；该策略必须精确复现 A8K 相应锚。

任何策略若需要新的参数，必须在合同中说明其量纲、来源和冻结值。不得加入按 $N_D$、$\tau$、时间步、密度峰或运行 ID 触发的特殊分支。

### 5.5 A8L 必须记录的量

每个算例至少记录：

- 完成状态和完成步数；
- 最大密度偏差及其时间步、位置和极值类型；
- 最大 Mach 及其时间步；
- 最小和最大密度；
- 边界实际 $\rho$、$u_x$、$u_y$ 相对目标的最大残差；
- 总质量和累计边界净质量输入；
- 非有限状态；
- 负分布函数计数和最小分布函数值，作为诊断而非事后新增门；
- 策略 ID、正式源 SHA-256、合同 SHA-256 和继承证据 SHA-256。

### 5.6 A8L 裁决逻辑

A8L 不以“通过算例最多”选算法，而按下列因果关系解释：

- 若策略 2 在九个角点全部通过，而策略 1 全部失败，则密度归一化在冻结矩阵内是充分条件；
- 比较策略 5 与 7、策略 6 与 8，用于判断固定密度相对推导密度的作用；
- 比较策略 3 与 5、策略 4 与 6，用于判断只改入射人口与覆盖九个人口的差异，但必须结合矩残差解释；
- 比较策略 3 与 4、策略 5 与 6、策略 7 与 8，用于判断正则化非平衡应力的增量作用；
- 若策略 7 通过而策略 8 也通过，则正则化非平衡应力不是冻结稳定门的必要条件；
- 若策略 7 失败而策略 8 通过，则正则化非平衡应力在固定密度全状态族内是必要条件；
- 若不同角点给出不同模式，或只有策略 8 通过，则结论为交互作用或未分解，不允许正式接入；
- 若 A8J 或 A8K 锚不能零容差复现，A8L 整体 NO-GO；
- A8L 完成后必须停止，交回网页版 Pro 裁决。

## 6. 获批后的目标架构

### 6.1 最小重构原则

正式重构只抽离开放边界层。MRT 碰撞、Brinkman 力和迁移代码先保持原位置与运算顺序，不进行无关拆分。不得借机把 `lbm.ts` 全面重写。

建议新增：

```text
02_模拟程序/src/solvers/highFidelity/open-boundary/
  types.ts
  legacy-zou-he.ts
  selected-inlet.ts
  cbc2d-outlet.ts
  factory.ts
```

其中 `selected-inlet.ts` 必须在 A8L 裁决后改成描述真实机制的文件名和策略 ID，例如 `density-normalized-zou-he.ts` 或 `regularized-full-state.ts`；不得使用 `stable-inlet`、`fixed-inlet`、`new-boundary` 等缺乏算法身份的名称。

### 6.2 边界接口

入口和出口必须是同级策略，不允许一个策略在另一个策略执行后通过检查点覆盖结果。接口至少包含：

```ts
interface LbmBoundaryStepContext {
  nx: number;
  ny: number;
  relaxationTime: number;
  step: number;
  targetInletVelocity: number;
  preCollisionMacros: ReadonlyLbmMacroscopicView;
  streamedDistributions: Float64Array;
}

interface LbmInletBoundary {
  readonly id: string;
  apply(context: LbmBoundaryStepContext): LbmBoundaryDiagnostics;
}

interface LbmOutletBoundary {
  readonly id: string;
  apply(context: LbmBoundaryStepContext): LbmBoundaryDiagnostics;
}
```

实际类型名可调整，但必须保留以下约束：

- 策略只修改本侧边界节点；
- 策略不能调用求解器的 `checkpoint`、`restore`、`step` 或整场复制接口；
- `preCollisionMacros` 以只读引用或仅含必要边界模板的 $O(n_y)$ 缓冲提供；
- 正常步进不得产生 $O(n_xn_y)$ 的额外数组复制；
- 策略返回可追踪诊断，不直接写日志或改变终止门。

### 6.3 正式步进顺序

`D2Q9MrtBrinkmanSolver.step` 的正式顺序固定为：

1. 校验本步入口目标速度；
2. 计算本步碰撞前宏观量与 Brinkman 力；
3. 提取边界算法所需的只读模板；
4. 执行原有 MRT 碰撞和迁移；
5. 执行入口策略；
6. 执行出口策略；
7. 交换分布数组；
8. 增加步数并使宏观缓存失效；
9. 返回原有 Brinkman 交换量和新增边界诊断。

不得在失败时自动改用另一种边界；非有限、非正密度或策略配置错误必须显式失败。

### 6.4 配置身份

`Cfd2dParameters` 应新增显式边界配置，结构建议为：

```ts
openBoundary: {
  inlet: {
    kind: "legacy-zou-he-velocity" | "<A8L批准的明确策略ID>";
    farFieldDensity: number;
  };
  outlet: {
    kind: "legacy-zou-he-pressure" | "cbc2d-regularized";
    farFieldDensity: number;
    pressureRelaxationSigma: number;
    transverseRelaxation: "auto-mach" | number;
    characteristicLength: "domain-cells" | number;
  };
}
```

约束：

- `flowRampTime`、调制和 `flowSpeedAt` 仍是唯一来流时间函数来源；
- 边界配置不得再包含第二套 ramp；
- 旧配置迁移后必须显式得到 legacy 入口和 legacy 出口；
- 默认值在正式资格裁决前保持 legacy，不得因候选模式更稳定而自动更改；
- 未知策略 ID 必须报错；
- CBC 参数必须进入配置哈希和 provenance。

Codex 应先搜索实际配置加载路径，再决定 schema 小版本或大版本升级；不得只改 TypeScript 字面量而遗漏保存、导入、worker 或预设。若存在外部配置导入，应提供显式迁移函数和测试。

### 6.5 检查点与复现

边界策略和参数属于数值方法身份，必须进入检查点匹配条件。

推荐：

- 低层检查点升级为 `VP-HF-CFD2D-LBM-CHECKPOINT-v2`；
- 高层检查点相应升级；
- v1 检查点只允许在 legacy/legacy 配置下显式迁移；
- 非 legacy 配置不得读取缺失边界身份的 v1 检查点；
- legacy 连续运行与恢复运行必须逐分布函数相等；
- 每个正式支持的边界组合至少有一个同版本精确恢复测试。

### 6.6 Provenance 与输出

结果中必须记录：

- 入口策略 ID；
- 出口策略 ID；
- 边界参数哈希；
- 求解器版本；
- 是否为 legacy、候选数值模式或已资格模式；
- 已通过和未通过的证据层级。

CBC 或 A8L 批准入口在未完成公开载荷和动态验证前，provenance 仍应标为数值候选或未验证，不得显示为“高保真已验证”。

### 6.7 UI

边界模式放在“高级数值设置”中：

- 显式显示入口和出口策略；
- legacy 为默认值，直到另行裁决；
- 候选策略显示未验证警告；
- 不提供“自动”“推荐”“稳定优先”选项；
- 运行结果页面显示实际使用的策略 ID，而不是只显示“高保真”。

## 7. Codex 正式实施阶段

只有在 A8L 完成且网页版 Pro 明确批准某一入口算法后，才执行下列阶段。

### Stage 1：建立接口，保持 legacy 精确

- 新建开放边界接口和 legacy Zou--He 实现；
- `lbm.ts` 改为委托策略，但 legacy 运算顺序和公式保持不变；
- 所有正式调用显式传入 legacy 配置；
- A8J 九锚、现有 open-boundary 均匀流和检查点测试逐值回归；
- 本阶段不得加入新入口或 CBC。

只有 legacy 精确门通过后才能进入 Stage 2。

### Stage 2：实现 A8L 批准入口

- 只实现裁决批准的算法；
- 复现对应 A8L 九个角点；
- 不实现 A8L 已判定无必要的并列正式策略；
- 不改变默认配置；
- 更新策略诊断、配置验证、检查点和 provenance。

### Stage 3：可选 CBC 出口集成

CBC 出口是独立阶段，不因入口重构自动获得正式资格。

- 复用候选 CBC 方程，但重新核对其与正式 MRT 分布重构的一致性；
- 先通过声学脉冲、对流涡和无物体缓启动；
- 再运行固定圆柱边界资格；
- 入口重构 PASS 不得替代 CBC 出口资格。

若用户没有明确要求 CBC 正式接入，Stage 3 可以不执行。

### Stage 4：应用层接入

- 更新配置、默认值、参数说明、worker 序列化、UI、CSV/provenance；
- 更新脚本和文档；
- 删除仅为正式接入而重复存在的候选运行 wrapper，但保留合同、报告和冻结机器证据；
- 不删除 A8H--A8L 历史证据链。

## 8. 验收门

### 8.1 实现级门

- `npm run typecheck` 或 `npm run build` 通过；
- 全部现有单元测试通过；
- 新边界单元测试通过；
- 无未配对公式、未闭合围栏、制表符和尾随空格；
- 没有正常步进中的整场 `slice`、`checkpoint/restore` 或 `macroscopicCopies` 边界覆盖；
- 没有按参数角点或运行结果触发的特殊分支；
- 没有 catch 后回退至 legacy 的逻辑。

### 8.2 Legacy 回归门

- A8J 九个正式 20D 基线逐项零容差一致；
- 现有 400 步均匀开放流测试保持原精度；
- 周期流、Taylor--Green、Brinkman 功恒等式和力交换测试不退化；
- 同配置检查点恢复逐分布函数一致；
- 高层固定圆柱 smoke 的结果合同和 provenance 不丢字段。

### 8.3 新入口数值门

- 对应 A8L 九锚逐项复现；
- 无物体 20D 九角点满足冻结门；
- 边界实际矩残差符合 A8L 对该策略的合同；
- 总质量变化与累计边界质量输入能够闭合到预注册容差；
- 独立复跑机器产物字节一致。

### 8.4 CBC 出口门

若实施 Stage 3，至少要求：

- 声学脉冲绝对误差与相对改善门；
- 对流涡绝对误差与相对改善门；
- 无物体启动稳定门；
- A8B 固定中心点复现；
- A8C 宽矩阵不得被单点 PASS 覆盖；
- 正式 MRT 中的结果不能借用候选 BGK 的 PASS。

### 8.5 全程序门

修改 `02_模拟程序/**` 后必须执行：

```text
npm run validate
```

若因环境原因无法执行，正式接入不得裁决为完成；必须在交接中明确列为未执行。

## 9. 禁止的“补丁叠加”模式

Codex 不得采用下列实现：

- 在 `model.ts` 每步取得 checkpoint，改数组后 restore；
- 在 boundary 失败时切回 Zou--He；
- 对 $u=0.08$、特定 $\tau$、特定 $N_D$ 或某一步单独限幅；
- 对密度或速度做未进入合同的 clip；
- 用 `try/catch` 吞掉非有限状态；
- 同时保留两套 MRT 核，只为让新旧边界分别运行；
- 复制候选 BGK 求解器并称为正式 MRT；
- 为通过测试降低 0.12 或 0.30 门；
- 只更新 UI 文案而不把策略身份写入配置和 provenance；
- 把 A8K/A8L 的 wrapper 迁入正式路径后继续套 wrapper。

若发现必须使用上述任一方式，立即停止并交回裁决。

## 10. Codex 必须停止并上报的情形

出现下列任一情况时，不得自行继续：

1. A8L 不同角点的因果分类不一致；
2. A8J 或 A8K 锚不能精确复现；
3. 需要改变 MRT 松弛率、Brinkman 力、mask、力功合同或 SI 映射；
4. legacy 策略无法逐值回归；
5. 新接口需要整场复制才能工作；
6. 配置或检查点迁移存在歧义；
7. 新入口只靠限幅、滤波或 fallback 才能过门；
8. CBC 在正式 MRT 中与候选 BGK 给出相反结论；
9. 完整 `npm run validate` 失败；
10. 发现 `main` 上有未纳入规划的并发修改。

上报内容必须包括最小复现、实际输出、相关文件和建议选项，不得只写“测试失败”。

## 11. 提交顺序

建议提交顺序如下，每一步都直接进入 `main`：

1. `preregister A8L inlet mechanism audit`

   只提交冻结合同和不依赖结果的测试骨架。

2. `implement A8L inlet mechanism audit`

   提交候选实现、运行器和断言器。

3. `record A8L evidence and handoff`

   提交机器证据、报告、验证记录和交接，然后停止等待裁决。

获批后：

4. `refactor formal LBM boundary interface with exact legacy behavior`

   只抽离接口和 legacy 实现。

5. `integrate approved inlet strategy`

   接入 A8L 批准入口并补齐身份链。

6. `integrate qualified CBC outlet`

   仅在明确授权和独立资格通过后执行。

7. `complete UI provenance and full validation`

   完成应用层、文档和全套验证。

不得把预注册合同和首次研究结果放在同一个提交中。

## 12. 每阶段交付物

每个阶段至少交付：

- 修改文件清单；
- 模型和算法身份说明；
- 已执行命令及退出码；
- 机器产物及 SHA-256；
- PASS/NO-GO 的严格含义；
- 未执行的数值、物理和实验验证；
- 正式理论与正式程序是否变化；
- 更新后的 `交接说明_current.md` 和历史记录。

## 13. 给 Codex 的首次执行指令

Codex 首次读取本文件后只执行 Phase 0：

> 读取根目录 `AGENTS.md`、`90_候选工作区/交接说明_current.md` 和本合同。先在独立提交中冻结 A8L 合同，再在候选区实现并运行八种入口机制阶梯。保持 `02_模拟程序/**` 只读。完成机器证据、报告、验证和交接后停止，不得进入正式重构，等待网页版 Pro 对 A8L 作科学裁决。

后续只有在用户明确说明“A8L 已由网页版 Pro 裁决，按本合同进入正式重构”时，Codex 才能从 Stage 1 开始修改正式程序。
