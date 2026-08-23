# R0：需求—产物—验收—证据追溯矩阵

> **历史快照，不是当前交付状态。** 本文冻结于 2026-08-20 17:00，记录的是重写前缺口和当时自拟的发布级追溯方案。用户随后明确把软件目标调整为“能按现有理论运行且便于未来修改”，并在 2026-08-21 按新的严格顺序完成四阶段研究。当前规范入口、真实执行证据和 NO-GO 以根目录 `README.md`、`WORKLOG.md` 及四份 `paper/` 文档为准；不得用本快照中的“未满足”覆盖后续事实，也不得反向把后续窄范围通过写回成本快照的发布门通过。

- 状态快照：2026-08-20 17:00（Asia/Singapore）
- 适用项目：IYPT 2027 第 13 题 **Vortex pendulum（涡激摆）**
- 判定基线：重写前原型是不可交付基线；除本文明确列出的窄范围实测项外，不把任何旧 TypeScript 文件、接口声明、静态界面或未执行方案视为通过。

## 0. 文档目的与证据规则

本文把通用需求实例化为本项目的可验收质量契约。它同时服务于四件事：防止需求遗漏；防止局部证据越级外推；给后续实现提供唯一验收 ID；在发布时建立“原始意图—涡流摆模型—软件/论文产物—执行记录”的双向追溯。

### 0.1 规范性输入

| 代号 | 输入 | 本次实际读取范围 | 权威用途 |
|---|---|---|---|
| `S` | `/home/cjt/竞赛物理研究四层通用框架与统一计算平台需求说明.md` | 全文 1–706 行；本次副本 SHA-256 为 `e4c622f6a236642ce6c8eb94f8ad45097f268b016919bb0d1965108cfa23918e` | 四层框架、双后端、统一 GUI、分析/实验/多题扩展的原始需求 |
| `W` | `WORKLOG.md` | 本快照读取 1–57 行 | 本项目加严后的论文级完成条件、F0–F4 冻结门、禁止性声明、已有执行记录 |
| `N` | `research_notes/README.md` | 全文 1–5 行 | 备忘录命名和“备忘录不等于冻结结论”的证据等级 |
| `A0` | `research_notes/R0-pre-rewrite-prototype-audit.md` | 全文 1–86 行 | 原型失败事实、不得沿用的物理内容、允许保留但仍需重验的纯软件思想 |

冲突时采用更严格规则：`W` 的论文级重写门禁高于 `S` 第 18 行的最低竞赛级目标；`N` 要求未通过冻结门的研究备忘录只能是候选证据；`A0` 禁止把旧原型当成交付证明。

### 0.2 状态词的封闭定义

| 状态 | 唯一含义 |
|---|---|
| **未满足** | 必须产物缺失，或验收没有执行，或执行失败，或现有证据明确证明不合格。 |
| **候选** | 已有实质性草案、推导、接口思想或来源记录，但尚未完成规定的独立审稿、冻结、执行测试或证据封装。候选不得在论文、GUI 或发布说明中写成“验证通过”。 |
| **实测通过** | 在本行定义的精确范围内，验收命令已经实际执行成功，原始输入、日志、度量和输出可定位，且没有把较窄结论外推到父需求。 |

状态聚合采用最弱环节规则：一个父需求只有在所有强制子项均为“实测通过”时才可通过；“候选 + 通过”仍是候选；任一强制子项未满足则父需求未满足。高保真、前向数值和实验三者之间不得互相替代证据。条件能力门只约束相应能力声明：本项目至少必须通过 `HF-003` 的研究级独立高保真后端；只有通过 `HF-006` 才可再宣称“完整三维自由表面 FSI/DNS 级后端”。若 `HF-006` 未通过，发布说明必须把二维条带、2D sectional、URANS 或其他降级路径按实际能力诚实标注，不能因此否定已经满足原文第 243 行降级条款的 `HF-003`，也不能反过来冒充三维成熟度。

### 0.3 可执行验收与证据回执约定

下表中的命令是规范性验收入口；未创建的脚本本身就是缺口。每个成功验收必须在 `artifacts/acceptance/<ID>/` 留下至少：

1. `result.json`：`requirement_id`、严格的通过阈值、实际度量、退出码、开始/结束时间；
2. `command.txt` 与未裁剪的 `stdout.log`、`stderr.log`；
3. `inputs.sha256` 与 `outputs.sha256`；
4. `run-manifest.json`：Git 提交/dirty 状态、依赖锁、解释器/浏览器/硬件、后端版本、配置哈希、随机种子或无随机性声明；
5. 对图形或实验项，保存机器可读底层数据；截图、视频或绘图只能是补充证据。

验收程序必须 fail closed：证据缺失、阈值未声明、日志被截断、输出含 `NaN/Inf`、运行目录脏而未记录、输入哈希不一致或命令未执行时必须返回非零。本文中的“证据路径占位”是目标位置，不代表该文件当前存在。

## 1. 冻结门与发布门总图

| 门 | 覆盖范围 | 开门所需 ID | 当前状态 | 阻断含义 |
|---|---|---|---|---|
| `F0 题意冻结` | 官方原文、canonical apparatus、自由度、几何、坐标、符号、观测目标 | `GOV-006`、`SRC-001`、`FWD-001` | 候选 | 未冻结前不得声称某个装置拓扑就是官方唯一要求。 |
| `F1 场方程冻结` | 三维自由表面流固耦合母模型、边界/初值、功率与能量恒等式 | `HF-001`、`HF-002`、`FWD-006`、`REV-001`、`REV-002` | 未满足 | R2 备忘录可供审稿，但未通过两轮独立审稿。 |
| `F2 降阶冻结` | 机械骨架、流体广义力、经验闭合、适用域、事件/升级分支 | `FWD-002`–`FWD-007`、`STR-001`–`STR-004`、`REV-001`、`REV-002` | 未满足 | 未冻结前不得把候选尾流振子或拟合阻尼写成确定模型。 |
| `F3 观测与验证冻结` | 标定、观测算子、数据契约、切分、指标、不确定度、盲测 | `DAT-001`–`EXP-001`、`VAL-002`、`VAL-003` | 未满足 | 未冻结前不得开放验证集或据实验反复调模型。 |
| `F4 软件接口冻结` | 双后端、GUI、运行协议、检查点、provenance、模块 API | `NUM-001`–`RUN-005`、`REP-001`–`REP-005`，且 F0–F3 已开 | 未满足 | 旧原型只能提供接口反例/候选思想，不能增量修补为生产实现。 |
| `R 发布门` | 论文、实验协议、软件、测试、审稿、复现与哈希 | 所有强制 ID，尤其 `REL-001`–`REL-005` | 未满足 | 任一强制行非“实测通过”均不得发布为完成版。 |

## 2. 总体体系与范围治理

| ID | 原文意图（来源） | 涡流摆实例化 | 必须产物 | 可执行验收 | 证据路径占位 | 状态 | 不允许的替代证明 |
|---|---|---|---|---|---|---|---|
| `GOV-001` | 四层必须形成统一研究闭环，而非四份互不相连材料（`S:5–16,602–620,673–696`；`W:9`） | 从确定的涡流摆装置和输入出发，贯通前向理论、三维自由表面 FSI、高保真/前向双后端、实验观测与分岔/锁频结构研究 | 四层架构说明；跨层接口表；每个结论的来源层和去向层；端到端案例 | `python3 qa/accept.py --id GOV-001`；从一个冻结配置自动生成两后端结果、同量实验比较和结构性结论，且追溯图无孤立强制节点 | `docs/architecture/four-layer-vortex-pendulum.md`；`artifacts/acceptance/GOV-001/` | **未满足** | 四篇独立备忘录；只有框图；只跑任一后端；展示一张相似曲线 |
| `GOV-002` | 物理自洽、数学明确、可预测、计算可靠、可验证、可比较、可扩展且研究逻辑完整（`S:18–27,698–706`；`W:6,9`） | 每个核心论断都给方程/假设/输入/输出/误差/适用域和可证伪试验，不能靠术语密度充当深度 | 质量属性清单；论断—检验矩阵；停止/升级规则 | `python3 qa/accept.py --id GOV-002`；机器检查每个核心 claim 均链接来源、方程、测试、适用域和证据回执，人工审稿无 P0/P1 遗留 | `quality/claims.yaml`；`artifacts/acceptance/GOV-002/` | **候选** | 公式数量；文档长度；界面美观；“结果合理”叙述 |
| `GOV-003` | 研究方法统一、物理内容按题目自适应，不给所有题套固定模型（`S:5–7,269–293,626–669,698–703`） | 通用平台只规定生命周期/API；涡流摆模块自行定义自由表面 FSI、湿润几何、尾流状态和锁频分析 | 通用/题目职责边界；模块能力声明；禁止硬编码题目字段的规则 | `npm test -- --run tests/acceptance/problem-module-boundary.test.ts`；静态依赖图证明通用层不导入涡流摆内部类型，并加载一个最小第二题模块通过 | `docs/architecture/module-boundary.md`；`artifacts/acceptance/GOV-003/` | **候选** | 目录名叫 `problems/`；仅有注册表单元测试；把涡流摆字段改成泛化名称 |
| `GOV-004` | 论文级重写按 F0–F4 顺序冻结，备忘录本身不等于结论（`W:42–48`；`N:3`） | 先冻结题意/场模型/降阶/观测验证，再冻结生产接口；每次冻结有版本、审稿意见和解冻规则 | 五份冻结记录；依赖图；签署/哈希；变更控制记录 | `python3 qa/check_freeze_gates.py --manifest quality/freeze-gates.yaml`；验证依赖顺序、签署、哈希和零未解决阻断意见 | `quality/freeze-gates.yaml`；`research_notes/F0-*.md` 至 `F4-*.md`；`artifacts/acceptance/GOV-004/` | **候选** | `WORKLOG` 中写出门名；某代理称“已冻结”；文件存在但无审稿和哈希 |
| `GOV-005` | 旧原型只能作为不可交付基线和反例（`W:7–9`；`A0:1–17,69–76`） | 把旧 wake oscillator、湿润长度、单力臂、字段拷贝观测和缺失后端明确隔离，不继承其默认参数/方程/结果 | R0 审计；原型隔离清单；生产代码来源声明 | 已执行 `npm test -- --run`、`npx tsc --noEmit`、`npm run build` 并在 R0 记录实际结果；`python3 qa/accept.py --id GOV-005` 还应确认生产包不导入被隔离模块 | `research_notes/R0-pre-rewrite-prototype-audit.md`；`artifacts/acceptance/GOV-005/` | **实测通过**（仅“原型被正确判为不可交付”的审计结论） | 把 6/6 接口测试说成物理通过；把本行通过解释为原型通过；沿旧方程小修后声称重写完成 |
| `GOV-006` | 给定具体问题必须先确定无歧义的物理对象和输入（`S:35–60`；`W:7,20–22,44`；`A0:20–28,80–86`） | 核对官方“竖直圆柱、部分浸水、横流振动”，再明确候选一自由度刚性旋转悬挂是否为本研究 canonical；冻结枢轴、圆柱轴、质心、浮心、自由面、流向/横向和可能变体 | 官方逐字摘录；示意图；几何/自由度/坐标字典；canonical 与对照变体表 | `python3 qa/accept.py --id GOV-006`；两名独立审稿者可从文档唯一重建几何，参数 schema 无同名多义，官方要求与研究者选择逐项分栏 | `research_notes/R1-official-and-primary-evidence.md`；`research_notes/F0-scope-freeze.md`；`artifacts/acceptance/GOV-006/` | **候选** | 二手网页摘要；旧 `pendulumLength` 字段；不标注研究者自选拓扑；把 canonical 候选称官方唯一装置 |

## 3. 第一层：闭合、确定、可预测的前向理论

| ID | 原文意图（来源） | 涡流摆实例化 | 必须产物 | 可执行验收 | 证据路径占位 | 状态 | 不允许的替代证明 |
|---|---|---|---|---|---|---|---|
| `FWD-001` | 完整输入应原则上唯一确定研究区间内的状态演化（`S:35–60,85–95`） | 明确定义机械状态、尾流/记忆状态、必要的湿润/事件状态，以及几何、质量、惯量、流体、环境、初值、边界、来流历史和控制输入 | 规范性符号表；状态/参数 schema；初边值问题；单位和允许域 | `python3 qa/accept.py --id FWD-001`；对 20 组边界配置做 schema 验证，任一状态导数、代数变量、事件后状态或系数均可由冻结输入求得，不访问隐式默认值 | `paper/model/forward-theory.md`；`schemas/vortex-forward.schema.json`；`artifacts/acceptance/FWD-001/` | **候选** | 只有 ODE 右端；GUI 中有字段；在运行中临时补系数；从图形倒推未声明初值 |
| `FWD-002` | 必须给状态、参数、方程、本构、约束、初边界条件和外部作用（`S:64–79`） | 从刚体/悬挂动力学与湿面牵引广义力出发；若用记忆核、Stuart–Landau、Van der Pol、准稳态升阻力或摩擦，逐项定义来源、归一化和可辨识组合 | 完整方程组；本构表；约束/Jacobian；流体广义力投影；量纲表；参数函数定义 | `python3 qa/accept.py --id FWD-002`；符号解析与量纲检查全通过，功率配对方向一致，所有经验项可追溯且不存在同一水动力重复计数 | `research_notes/R3-systematic-model-reduction.md`；`paper/model/forward-equations.md`；`artifacts/acceptance/FWD-002/` | **候选** | 直接写 `F=-cv`；沿用常数 `C_D/C_L/St` 扫遍参数；未标定尾流振子；方程能积分但能量符号错误 |
| `FWD-003` | 理论优先，不得为数值方便主动删掉闭合物理；不允许计算中临时补规则（`S:66,87–95`） | 从连续场到 ROM 的每次约化声明小参数、保留阶、首个遗漏项、误差阶和升级触发；缺失物理时停止/升级而非静默裁剪 | 降阶链；假设账本；闭合依赖 DAG；失效时的错误码/升级路径 | `python3 qa/accept.py --id FWD-003`；对所有模型层运行闭合 DAG 检查，并用越界配置证明求解器拒绝或显式切换而不是继续给数值 | `research_notes/R3-systematic-model-reduction.md`；`quality/model-closure.yaml`；`artifacts/acceptance/FWD-003/` | **候选** | “常用近似”一句话；拟合好看；把数值截断当物理事件；缺参数时使用隐藏默认值 |
| `FWD-004` | 必须明确模型适用范围（`S:78`；`W:46,53–56`；`A0:44–54`） | 为每级模型声明 `Re`、约化速度、振幅比、浸深比、长径比、阻塞比、Froude/Weber、接触线/湍流处理、小角/弱耦合/近 Hopf 条件和可辨识域 | 机器可读 domain guards；适用域表；边界测试；域外行为契约 | `python3 qa/accept.py --id FWD-004`；在域内边界、域外和交叉边界样例上验证接受/警告/拒绝结果与文档一致，且输出携带 domain 状态 | `quality/model-domains.yaml`；`tests/physics/model-domain.test.*`；`artifacts/acceptance/FWD-004/` | **候选** | 只写“适用于小角度”；`maxAbsAngle` 数值裁剪；以训练数据范围代替物理适用域；域外仍静默输出 |
| `FWD-005` | 接触、碰撞、脱离、重接合、摩擦等允许采用事件驱动/混合分支（`S:79–81`；`A0:52–54`） | 明确水线穿越端盖/侧面、完全出水/浸没、绳松弛（若为绳悬挂）、轴间隙/静动摩擦、触壁/触底、自由度解锁、上扫/下扫分支及重接规则 | 事件面、方向、优先级、容差、后状态映射、互斥/并发规则和 Zeno 防护 | `python3 qa/accept.py --id FWD-005`；事件解析测试覆盖双事件、擦边、步长缩小和恢复，事件时刻/后状态收敛且守恒/耗散跳量符合规定 | `paper/model/hybrid-events.md`；`tests/physics/hybrid-events.test.*`；`artifacts/acceptance/FWD-005/` | **候选** | 角度硬裁剪；积分失败后重启；只画事件标记；负约束反力仍继续同一分支 |
| `FWD-006` | 模型需物理自洽、数学明确并可由极限/守恒检验（`S:20–24,68–79`；`W:23–40,45`） | 当前窄项验证有限半径圆柱—平面自由面的精确排水体积和浮力矩；完整项还需机械/流体功率、静态平衡、零流速、细长、无限水深等极限 | 解析推导；独立变分复核；数值积分脚本/数据；完整能量与极限测试 | 本次复跑 `python3 research_notebooks/check_exact_geometry.py`，退出码 0，输出 `PASS: exact geometry, springs, slender and finite-radius buoyancy, inertia energy, disk segments, drag power`；本行仅验收精确几何脚本覆盖的分支 | `research_notebooks/check_exact_geometry.py`；`artifacts/data/exact-hydrostatics-summary.json`；`WORKLOG.md:25–40` | **实测通过**（仅脚本所列解析/数值几何与局部力学检查） | 外推为完整前向理论通过；外推为三维自由表面 FSI；把一组参数吻合称普遍恒等式；忽略脚本未覆盖的事件/尾流/实验 |
| `FWD-007` | 第一层必须有强预测能力而非只解释已有轨迹（`S:18–27,35,85–95`；`W:54–56`） | 预注册自然频率/静水切线、固定体 Hopf、耦合失稳、锁频入口、饱和振幅/相位、滞回宽度、功率转移和适用域内参数趋势，并明确三类阈值不等价 | 预测表：独立输入、数值输出、容差/不确定度、失败判据、所需层级和实验设计 | `python3 qa/accept.py --id FWD-007`；冻结后对保留的完整运行生成预测，验证程序按预注册指标判定，不允许重新拟合后覆写原预测 | `quality/predictions.yaml`；`research_notes/R3-bifurcation-and-predictions.md`；`artifacts/acceptance/FWD-007/` | **候选** | 事后解释；只给趋势无误差带；把可调参数拟合曲线称无拟合预测；混淆三种阈值 |

## 4. 第二层：相对独立的高保真物理模拟

| ID | 原文意图（来源） | 涡流摆实例化 | 必须产物 | 可执行验收 | 证据路径占位 | 状态 | 不允许的替代证明 |
|---|---|---|---|---|---|---|---|
| `HF-001` | 从比前向理论更基础、更局部、较少约化的规律建立独立路径（`S:99–135`） | 采用冻结装置的三维不可压 Navier–Stokes、自由表面、刚体 Newton–Euler/约束和湿面牵引；不求解第一层尾流振子或经验升力 ODE | 连续场强/弱式；域和边界；初值；FSI/接触线/湍流层级；与 ROM 独立性声明 | `python3 qa/accept.py --id HF-001`；依赖审计确认 HF 后端不导入 ROM 载荷闭合，方程/边界/能量式通过两轮独审 | `research_notes/R2-continuum-free-surface-FSI.md`；`research_notes/F1-field-equations-freeze.md`；`artifacts/acceptance/HF-001/` | **候选** | 把二维固定无限圆柱 LBM 称三维 DNS；用 ROM 生成 HF 参考；只有方程名无初边值问题 |
| `HF-002` | 高保真模型应更直接近似实际系统并能识别遗漏物理（`S:103–105,139–147`；`W:45,52`） | 有限水槽、有限跨圆柱、自由表面/接触线、入口出口、壁底间隙和运动刚体双向耦合；分层说明气相、湍流、润湿模型及失效域 | 可计算弱式；网格/界面表示；动量交换；功率恒等式；升级层级 | `python3 qa/accept.py --id HF-002`；制造解/静水/刚体极限和连续能量审查通过，所有边界有唯一类型且流固作用反作用闭合 | `research_notes/R2-continuum-free-surface-FSI.md`；`tests/high-fidelity/continuum-contract/`；`artifacts/acceptance/HF-002/` | **候选** | 无自由表面的单相 CFD；二维截面；固定圆柱；只算压力不回传刚体；把经验接触角隐藏为默认值 |
| `HF-003` | 第二层应有实际、相对独立的数值路径；若合理独立高保真模拟不存在或成本过高，可降低实现程度但必须保留接口（`S:16,198–243`；`W:9,13,52`；`A0:15,62–65`） | 最低发布门是一个**真实可运行、独立于 ROM 载荷闭合、经过基准和误差说明的研究级近似后端**；可以是诚实标注的多条带、2D sectional、较低保真自由表面/FSI 或其他可辩护方案，但必须说明删去了哪些三维、端部、自由表面、接触线和湍流效应 | `src/solvers/highFidelity/` 研究级实现；能力等级 manifest；独立性证明；基准案例；误差/失效域；统一后端适配器 | `python3 qa/accept.py --id HF-003`；实际运行非平凡流—固耦合案例，输出非占位场/载荷/运动和守恒/收敛回执；依赖审计确认不调用冻结 ROM 载荷闭合；GUI 显示精确能力级别 | `src/solvers/highFidelity/`；`benchmarks/high-fidelity/`；`quality/hf-capability-levels.yaml`；`artifacts/acceptance/HF-003/` | **未满足** | 仅有格子尺寸字段；生成假场；调用前向后端改标签；二维动画无求解；把 2D sectional、条带法或 URANS 称 3D DNS；因 3D 太贵就只保留空接口 |
| `HF-006` | 本项目论文级成熟度扩展：只有实际执行才能宣称三维自由表面 FSI；未执行不得写“已验证”（`W:9,13,45,52,57`；原文降级边界 `S:243`） | 在冻结 canonical 几何上实现有限槽、有限跨圆柱、自由表面/接触线、入口出口和运动刚体双向耦合的真正三维后端；明确 DNS/LES/URANS 等离散与湍流能力，不越级命名 | 3D 求解器；网格/界面/FSI 实现；三维基准与收敛；能力声明；资源与复现记录 | `python3 qa/accept.py --id HF-006`；实际完成至少一个三维耦合基准及空间/时间/FSI refinement，保存三维场、网格和守恒回执；只有全项通过才允许发布材料出现“完整三维后端已验证” | `verification/high-fidelity/3d-free-surface-fsi/`；`artifacts/acceptance/HF-006/` | **未满足**（条件能力门；不阻止按 `HF-003` 诚实降级交付） | 三维方程文档；二维切片外推；渲染伪三维；未跑网格收敛；URANS 称 DNS；以 `HF-006` 未满足为理由把空接口算作 `HF-003` 通过 |
| `HF-004` | 高保真路径必须计算可靠、给收敛和误差，而非只产出一条结果（`S:22–25,141–147,175–194`；`W:13,57`） | 对所声明的实际能力层级做空间、时间、耦合、域尺寸和统计窗口收敛；若声称 `HF-006`，再强制覆盖界面/接触线、跨展向和三维边界 refinement；监控质量、动量、角动量和能量/功率残差 | 分层收敛计划；至少三层离散数据；观察阶/GCI 或适当误差界；守恒时间序列；能力层级标签 | `python3 qa/accept.py --id HF-004`；预先阈值下至少三层非退化收敛，关键 QoI 外推误差和守恒残差达标，且检查集合与声明的 HF 能力等级一致；所有原始日志/网格哈希齐全 | `verification/high-fidelity/`；`artifacts/acceptance/HF-004/` | **未满足** | 单网格运行；动画平滑；残差下降但 QoI 不收敛；用 2D 收敛证明 3D；声称未运行的三维/网格测试通过 |
| `HF-005` | 高保真用于独立参考、检验近似和识别遗漏效应（`S:139–147,376–419`） | 用冻结共同输入输出可观测量、湿面广义力、能量交换、涡量/压力和事件，量化 ROM 偏差及残差结构 | HF 基准数据集；共享 observable 输出；ROM 对照报告；模型升级触发记录 | `python3 qa/accept.py --id HF-005`；至少三个预注册工况的共同物理输入哈希一致，比较报告区分 HF 离散误差与 ROM 误差并触发/拒绝升级 | `benchmarks/cross-backend/`；`artifacts/acceptance/HF-005/` | **未满足** | 两后端分别手调参数；只比较图片；用同一经验力生成二者；HF 无误差带却当真值 |

## 5. 第三层：前向理论的忠实计算实现

| ID | 原文意图（来源） | 涡流摆实例化 | 必须产物 | 可执行验收 | 证据路径占位 | 状态 | 不允许的替代证明 |
|---|---|---|---|---|---|---|---|
| `NUM-001` | 第三层直接执行第一层，不得重新定义物理（`S:151–172`） | 代码中的状态、系数、事件和观测接口逐项映射 F2 冻结方程；生成代码/手写代码均保留公式 ID | 方程—代码映射；冻结模型版本；前向后端；schema 版本 | `python3 qa/accept.py --id NUM-001`；符号/自动微分参考与实现对随机域内点逐项比较，覆盖全部 RHS、代数约束和事件函数，误差低于声明阈值 | `src/solvers/forward/`；`quality/equation-code-map.yaml`；`artifacts/acceptance/NUM-001/` | **未满足** | 旧 `src/solvers/forward/model.ts` 能运行局部函数；输出曲线看似合理；代码重新引入冻结文档没有的项 |
| `NUM-002` | 选择适合问题的 ODE/DAE、约束、事件、自适应和刚性求解（`S:175–194`） | 支持涡流摆机械—尾流耦合、可能的记忆状态、事件定位、上/下扫连续延拓初值和刚性参数区；记录求解器拒步和容差 | 求解器策略；误差控制；事件求根；失败码；基准问题 | `python3 qa/accept.py --id NUM-002`；解析解/制造解、刚性案例、事件案例和扫参分支均在容差内，缩步时事件时刻和状态收敛，无静默失败 | `tests/forward/integrator.test.*`；`benchmarks/forward/`；`artifacts/acceptance/NUM-002/` | **未满足** | 固定步长画图；捕获异常后返回最后一点；`maxAbsAngle` 截断；只测试平滑无事件案例 |
| `NUM-003` | 前向数值结果需收敛、稳定并有误差估计（`S:187–192`） | 对时间容差、事件容差、延拓步长、FFT 窗口和周期轨道残差做 refinement；把数值误差传给比较指标 | 收敛套件；解析/高精度参考；误差预算；回归基线 | `python3 qa/accept.py --id NUM-003`；至少三档容差出现预期阶或给出保守误差界，关键 QoI 的数值误差低于实验/模型比较预算 | `verification/forward/`；`artifacts/acceptance/NUM-003/` | **未满足** | 只比较两档步长；默认容差无理由；轨迹短时重合；FFT 峰值肉眼一致 |
| `NUM-004` | 第三层应输出完整状态和共享可观测接口（`S:163–169,247–261`） | 输出机械、尾流、功率/能量、约束反力、domain guard、事件和误差估计；再经冻结观测算子映射到实验量 | 版本化 trajectory/field contract；stream/batch 两种输出；单位元数据 | `npm test -- --run tests/acceptance/backend-output-contract.test.ts`；前向样例通过 schema，时间严格单调，单位/坐标齐全，事件与状态一致，流式和批式结果同值 | `schemas/backend-output.schema.json`；`artifacts/acceptance/NUM-004/` | **未满足** | 只输出角度数组；把内部状态直接改名为实验量；CSV 无单位/坐标/误差 |

## 6. 统一平台、双后端、配置与运行控制

| ID | 原文意图（来源） | 涡流摆实例化 | 必须产物 | 可执行验收 | 证据路径占位 | 状态 | 不允许的替代证明 |
|---|---|---|---|---|---|---|---|
| `PLT-001` | 第二、三层工程上必须集成在同一 GUI，作为可切换后端（`S:16,198–215,219–243,689–695`） | 一个应用内选择 `highFidelity` 或 `forward`，使用同一项目、配置和结果浏览器；两条后端均为真实实现 | 统一应用入口；后端注册协议；模式选择器；两个生产适配器 | `npx playwright test e2e/dual-backend.spec.ts`；从冷启动分别运行两后端且结果声明真实 backend ID/version，不刷新或换应用 | `src/app/`；`e2e/dual-backend.spec.ts`；`artifacts/acceptance/PLT-001/` | **未满足** | 两个命令行脚本；只有下拉框无后端；HF 选项调用前向求解器；静态原型截图 |
| `PLT-002` | 两后端尽可能共享几何、命名、单位、初边界/输入、时间、观测、输出、可视化和实验接口（`S:247–263`） | 定义 canonical shared input；两后端只对离散/闭合专属参数分层扩展；同一物理量不出现冲突名称或单位 | 共享 schema；单位/坐标字典；backend overlay schema；迁移版本 | `npm test -- --run tests/acceptance/shared-schema.test.ts`；同一配置在两后端解析出相同 shared hash，专属字段不污染共同物理输入，单位换算 round-trip 通过 | `schemas/shared-physics.schema.json`；`schemas/backend-overlays/`；`artifacts/acceptance/PLT-002/` | **候选** | 两份字段相似的 JSON；手工保证输入相同；同名字段语义不同；强迫 HF/ROM 参数虚假统一 |
| `PLT-003` | 模式专属参数应允许独立存在，不得为了统一而扭曲物理（`S:263`） | HF 可有网格、界面、FSI 迭代；前向可有闭合层、记忆核/尾流参数；比较时只锁共享物理输入 | 分层 schema；UI 分组；参数 provenance；比较忽略规则 | `npm test -- --run tests/acceptance/backend-overlay.test.ts`；非法跨模式字段被拒绝，合法 overlay 不改变 shared hash，导出清楚标出作用域 | `schemas/backend-overlays/`；`artifacts/acceptance/PLT-003/` | **候选** | 把所有字段放一张表；隐藏专属默认值；为同名方便把网格参数当物理参数 |
| `PLT-004` | 采用通用前端 + 题目模块 + 求解后端 + 分析模块（`S:267–293,626–669`） | 涡流摆插件注册 schema、几何、两个后端能力、可视化、观测和专属分析；通用层只依赖稳定接口 | 版本化插件 API；能力协商；依赖边界；故障隔离 | `npm test -- --run tests/acceptance/plugin-isolation.test.ts`；卸载/加载模块、缺能力降级、插件异常隔离和 API 版本拒绝均通过 | `src/core/`；`src/problems/vortex-pendulum/`；`docs/architecture/plugin-api.md`；`artifacts/acceptance/PLT-004/` | **候选** | 旧注册表 6 个静态测试；仅目录分层；通用 UI 硬编码涡流摆字段 |
| `PLT-005` | 平台必须可加载不同题目而非单题专用模拟器（`S:628–669`） | 在不改通用层的前提下加载一个独立最小验证模块，字段、几何、可视化和分析均不同于涡流摆 | 第二问题 fixture；扩展教程；兼容性测试；公共 API 覆盖 | `npx playwright test e2e/multi-problem.spec.ts`；构建后动态加载两模块，切换时状态隔离，新增 fixture 的提交不修改 core/UI 通用代码 | `tests/fixtures/second-problem/`；`e2e/multi-problem.spec.ts`；`artifacts/acceptance/PLT-005/` | **未满足** | 复制涡流摆模块改名；只注册两个名称；声称“理论上可扩展”；修改 core 后才加载第二题 |
| `CFG-001` | GUI 支持题目/模式/层级选择、参数、初边界、驱动、求解器、时间及配置存取（`S:297–317`） | 表单由 schema 动态生成，显示单位/定义/范围/domain guard；保存完整共享配置和后端 overlay，载入无损 | 配置 UI；验证器；版本迁移；保存/载入；错误提示 | `npx playwright test e2e/configuration.spec.ts`；覆盖全部字段类型、无效值、单位换算、保存—重启—载入深相等及旧版迁移 | `e2e/configuration.spec.ts`；`artifacts/acceptance/CFG-001/` | **未满足** | 示例 JSON 可读；硬编码默认配置；只保存可见字段；截图显示输入框 |
| `RUN-001` | 支持启动、暂停、继续、停止和单次运行（`S:320–328`） | Worker/进程控制具有明确状态机；暂停不推进模拟时钟，继续不重置，停止可清理资源并保留终止态 provenance | 运行状态机；取消协议；资源清理；单次运行回执 | `npx playwright test e2e/run-control.spec.ts`；对两后端执行 start→pause→resume→stop 和完整单次运行，验证状态、模拟时间、资源与输出一致 | `src/core/run-controller/`；`e2e/run-control.spec.ts`；`artifacts/acceptance/RUN-001/` | **未满足** | 旧 Worker 消息枚举；按钮存在；终止浏览器进程；暂停只停止动画不停止求解 |
| `RUN-002` | 支持批量运行（`S:328–329`） | 批任务由不可变 manifest 定义多个配置，具有队列、并发上限、逐项状态、失败隔离和可恢复汇总 | batch schema；调度器；结果索引；失败策略 | `npx playwright test e2e/batch.spec.ts`；至少 10 个含成功/故障案例，无串参，失败不吞掉其他任务，重跑只选择声明项 | `schemas/batch.schema.json`；`e2e/batch.spec.ts`；`artifacts/acceptance/RUN-002/` | **未满足** | shell 循环；手工运行多次；只返回最后一项；一次失败丢弃整批日志 |
| `RUN-003` | 支持参数扫描（`S:329–330,659–668`） | 声明扫描轴、约束、采样/上扫/下扫协议和派生无量纲组；每个点保留父扫描与实际输入哈希 | scan schema；笛卡尔/列表/延拓策略；状态图数据；失败点记录 | `npx playwright test e2e/parameter-scan.spec.ts`；用解析 fixture 验证网格和顺序，涡流摆上/下扫保持各自延拓历史，缺失点不被插值成成功 | `schemas/scan.schema.json`；`e2e/parameter-scan.spec.ts`；`artifacts/acceptance/RUN-003/` | **未满足** | UI 滑块；只改变流速却声称独立扫描 `Re` 与约化速度；丢弃失败点；上/下扫共用重置初值 |
| `RUN-004` | 支持重复实验/重复仿真（`S:330–331`） | 区分确定性重复、显式随机种子重复和实验重复；汇总分布时保留每次完整运行，不能拆帧伪造样本量 | repeat schema；seed 计划；run-level 汇总；方差分解 | `npx playwright test e2e/repeats.spec.ts`；确定性重复满足 `REP-001`，随机重复种子唯一且可复现，统计样本数等于完整运行数 | `schemas/repeat.schema.json`；`e2e/repeats.spec.ts`；`artifacts/acceptance/RUN-004/` | **未满足** | 同一轨迹复制多份；相邻时间点当独立重复；不保存种子；只给均值曲线 |
| `RUN-005` | 不同模式使用同一输入条件运行（`S:331–332,376–410`） | 由一个冻结 shared manifest 派生两个 backend manifest；共同几何/物性/来流/初态/时间/观测 hash 必须相同，只有 overlay 不同 | paired-run manifest；hash 校验；双后端调度；配对结果索引 | `npx playwright test e2e/same-input.spec.ts`；故意篡改共同字段必须阻止比较；合法配对记录相同 shared hash 并同时显示 backend 专属 hash | `schemas/paired-run.schema.json`；`e2e/same-input.spec.ts`；`artifacts/acceptance/RUN-005/` | **未满足** | 两次手工输入“看起来一样”；只匹配文件名；允许不同几何后仍画误差曲线 |

## 7. 动态可视化与分析

| ID | 原文意图（来源） | 涡流摆实例化 | 必须产物 | 可执行验收 | 证据路径占位 | 状态 | 不允许的替代证明 |
|---|---|---|---|---|---|---|---|
| `VIS-001` | 可视化应随题目动态加载，不强求所有题相同（`S:297–301,336–353`） | 涡流摆模块注册自己的场、刚体、轨迹、事件和派生量视图；通用前端按 capability 渲染并对缺失量明确降级 | 可视化插件 API；capability 声明；视图生命周期；降级提示 | `npx playwright test e2e/dynamic-visualization.spec.ts`；在两题和两后端间切换，视图集合随能力变化且无陈旧状态/硬编码字段 | `src/visualization/`；`e2e/dynamic-visualization.spec.ts`；`artifacts/acceptance/VIS-001/` | **未满足** | 单一 canvas；静态图片；为所有题固定机械摆视图；缺字段时画零值 |
| `VIS-002` | 展示与题目相适应的运动、场、轨迹、几何和物理量（`S:338–351`） | 前向模式至少显示实际几何、角/横向运动、轨迹、载荷/尾流状态；HF 模式显示速度、压力/涡量、自由表面、湿润区和刚体同步运动；所有量有单位/色标 | 2D/3D 时序渲染器；场切片/表面；几何与坐标标注；时间同步 | `npx playwright test e2e/vortex-visualization.spec.ts`；回放已知 fixture，多时刻像素/数值探针与底层数据一致，非零场不是合成纹理，色标和单位可见 | `src/problems/vortex-pendulum/visualization/`；`e2e/vortex-visualization.spec.ts`；`artifacts/acceptance/VIS-002/` | **未满足** | 静态 SVG；艺术化流线；预录视频冒充当前运行；只有摆锤动画无场数据 |
| `VIS-003` | 接触/事件状态和结果展示应与物理过程同步（`S:347–351`） | 在湿润拓扑、domain guard、分支切换、锁频状态和求解失败处显示精确时间与原因；暂停/检查点后仍一致 | 事件时间线；视图—数据同步契约；探针/游标；错误覆盖层 | `npx playwright test e2e/event-timeline.spec.ts`；已知事件 fixture 上，图表、3D 帧、事件表和导出数据时间误差低于一采样间隔，断点续跑无重复/丢事件 | `e2e/event-timeline.spec.ts`；`artifacts/acceptance/VIS-003/` | **未满足** | 动画角度裁剪；仅控制台日志；事后人工加标记；事件显示与导出时间轴不同 |
| `ANA-001` | 通用分析覆盖时序、相图、频谱、参数依赖、误差、守恒/能量、模型差异、实验比较和导入导出（`S:357–372`） | 对角度/位移、速度、尾流量、升力/力矩、功率、能量和场 QoI 提供统一分析；频谱窗口/去趋势/采样规则显式 | 分析 API；每种分析的算法/参数/单位；可导出机器数据 | `npm test -- --run tests/analysis/common-analysis.test.ts`；用解析正弦、阻尼振子、已知能量和偏差 fixture 验证数值/单位/边界行为 | `src/analysis/`；`tests/analysis/common-analysis.test.ts`；`artifacts/acceptance/ANA-001/` | **候选** | 函数文件存在；只测不崩溃；图形看起来正确；FFT 不说明窗/归一化/采样 |
| `ANA-002` | 分析结果需计算可靠、可比较（`S:22–26,357–370`） | 给频率、幅相、PLV、相位滑移、平均功率、误差指标和不确定度算法建立解析/合成基准，缺数据/非均匀采样显式拒绝或正确处理 | 数值分析验证套件；容差；缺失值/别名/非均匀采样测试 | `python3 qa/accept.py --id ANA-002`；所有合成基准在预注册容差内，错误输入 fail closed，结果含算法版本和参数 | `verification/analysis/`；`artifacts/acceptance/ANA-002/` | **未满足** | 单个真实实验上给出漂亮谱图；与某软件截图近似；忽略采样混叠和置信区间 |
| `ANA-003` | 允许每题增加专属分析与结构研究工具（`S:372,648–657`） | 提供固定体/耦合 Hopf、Routh–Hurwitz、正规形系数、锁频 PLV、伪弧长延拓、Floquet、滞回和分层状态图工具 | 涡流摆分析插件；算法文档；基准问题；与 GUI/导出集成 | `python3 qa/accept.py --id ANA-003`；对具有已知 Hopf/折叠/周期轨道的标准系统复现阈值和稳定性，再对冻结涡流摆模型输出可复算结果 | `src/problems/vortex-pendulum/analysis/`；`verification/structure/`；`artifacts/acceptance/ANA-003/` | **候选** | 备忘录中列公式；彩色扫参图；时域轨迹像周期就声称 Floquet 稳定；单向扫描推断滞回 |

## 8. 数据、实验、观测算子与三方比较

| ID | 原文意图（来源） | 涡流摆实例化 | 必须产物 | 可执行验收 | 证据路径占位 | 状态 | 不允许的替代证明 |
|---|---|---|---|---|---|---|---|
| `DAT-001` | 两后端共享输出和实验接口，支持数据导入导出（`S:247–261,357–370,659–669`；`A0:66`） | 数据契约包含单位、坐标/正方向、时间基准、标定 ID、几何/配置 hash、不确定度/协方差、质量旗标、原始/处理后血缘、后端/模型版本 | JSON Schema/CSV 规范；版本迁移；示例；schema validator | `python3 qa/accept.py --id DAT-001`；好/坏 fixture 验证必填项、单位维度、时间单调、协方差半正定、hash 格式和版本迁移 | `schemas/data-contract/`；`tests/data-contract/`；`artifacts/acceptance/DAT-001/` | **未满足** | CSV 只有 `time,angle`；README 口头说明单位；文件名承载配置；旧模板无血缘 |
| `DAT-002` | GUI/平台支持实验数据导入（`S:261,369–370`） | 导入视频跟踪/PIV/力传感/流速等处理结果，校验 schema、单位、坐标、标定和时间同步；不静默猜列或单位 | 导入向导；解析器；错误报告；预览；原始文件只读 hash | `npx playwright test e2e/experiment-import.spec.ts`；覆盖合法、缺列、歧义单位、时钟漂移、坏协方差和大文件，合法导入保持原始 hash | `e2e/experiment-import.spec.ts`；`artifacts/acceptance/DAT-002/` | **未满足** | `src/io/csv.ts` 存在；能打开某 CSV；自动把未知列当角度；手工修改实验文件后导入 |
| `DAT-003` | 支持数据导出并供比较/复现（`S:259,370,667`） | 导出原始状态、可观测量、事件、误差、不确定度和 provenance；CSV/JSON/场格式不丢单位或精度 | 导出器；格式规范；round-trip fixture；大场数据索引 | `npx playwright test e2e/export-roundtrip.spec.ts`；导出后重新导入，schema 语义深相等、数值误差低于格式界且所有 hash/血缘可恢复 | `e2e/export-roundtrip.spec.ts`；`artifacts/acceptance/DAT-003/` | **未满足** | 浏览器下载成功；复制图表数据；导出只有显示位数；截图/PDF 代替机器数据 |
| `OBS-001` | 比较应通过真实可测量量 `Y=H[X]`，不必也不能总比较内部完整状态（`S:386–410`；`A0:56–58`） | 为相机/编码器/PIV/力传感器定义标定、投影、畸变、遮挡、像素量化、曝光积分、滚动快门、同步、传感器传函和噪声/协方差；HF 与 ROM 使用同一观测语义 | 冻结观测算子；标定文件；合成影像/信号测试；误差传播 | `python3 qa/accept.py --id OBS-001`；从已知三维轨迹合成观测并反检，跨后端同一物理状态得到同一理想 observable，误差传播覆盖标定协方差 | `experiment/observation-operator.md`；`src/observation/`；`artifacts/acceptance/OBS-001/` | **未满足** | `observe()` 原样复制状态；把像素坐标当米；仅平移时间轴；人工挑一个看似重合的通道 |
| `CMP-001` | 在尽可能一致输入下比较高保真与前向后端（`S:376–384`） | 配对 shared hash 后比较同一 `Y`、单位、坐标、时间窗和不确定度；报告数值误差与模型差异 | 两方比较器；对齐协议；指标；差异可视化和机器报告 | `python3 qa/accept.py --id CMP-001`；合成同值/偏移/相位差 fixture 指标正确，真实 paired run 拒绝不一致 shared hash 并传播两侧数值误差 | `src/analysis/comparison/`；`artifacts/acceptance/CMP-001/` | **未满足** | 两张图并排；各自归一化后重合；两后端使用不同初值；HF 被无条件当精确真值 |
| `CMP-002` | 有实验时比较 `Y_HF`、`Y_F`、`Y_exp` 三方（`S:386–410`） | 同一运行/几何、同一观测算子和预注册窗口内叠加三方，报告时间域、频域、幅相、功率/状态分类及联合不确定度 | 三方 comparison bundle；配对索引；指标表；残差数据 | `npx playwright test e2e/three-way-comparison.spec.ts`；载入一组有已知偏差的三方 fixture，GUI 与导出指标一致，任一缺失 provenance/observable 版本时拒绝定量结论 | `e2e/three-way-comparison.spec.ts`；`artifacts/acceptance/CMP-002/` | **未满足** | 模拟内部角度直接对像素；分别对实验调两个模型；三张各自缩放图片；仅报告相关系数 |
| `CMP-003` | 比较要区分理论、数值、参数、HF 近似、测量和未建模误差（`S:412–419`） | 建立误差预算和残差诊断：离散 refinement、参数后验/区间、观测协方差、HF 层级差、结构化残差；不可辨识时只报组合/界 | 误差预算；方差/界传播；残差分类规则；升级日志 | `python3 qa/accept.py --id CMP-003`；合成注入误差能被分到预期通道，无法分解时明确标为混合项，不输出伪精确单因子归因 | `quality/error-budget.yaml`；`artifacts/acceptance/CMP-003/` | **未满足** | 总 RMSE 当模型误差；无 HF 收敛误差；凭残差形状唯一断言机理；不可辨识参数给很多小数 |
| `EXP-001` | 研究需可实验验证并与计算建立联系（`S:24–25,386–419,550–558,706`；`W:9,47`） | 冻结水槽/流速、装置几何/质量、标定、释放/升速协议、重复数、同步、排除标准、安全、原始数据保存和不确定度；完整运行作为样本单位 | 实验手册；标定记录；数据管理计划；预注册指标/切分；至少一套可审计原始数据 | `python3 qa/accept.py --id EXP-001`；按手册从原始数据重建 observables，校准/同步/不确定度检查通过，完整运行 ID 与几何 hash 唯一且无丢弃未记录 | `experiment/PROTOCOL.md`；`experiment/calibration/`；`data/raw/manifest.json`；`artifacts/acceptance/EXP-001/` | **未满足** | 示例 CSV；公开视频截图；无原始数据的处理曲线；只测一次；事后制定排除规则 |

## 9. 第四层：题目特定的结构性研究

| ID | 原文意图（来源） | 涡流摆实例化 | 必须产物 | 可执行验收 | 证据路径占位 | 状态 | 不允许的替代证明 |
|---|---|---|---|---|---|---|---|
| `STR-001` | 结构问题由主导物理、第一层数学结构和实验关键现象共同决定，不预设模板（`S:423–451`） | 以涡激振动反馈、流体—摆能量交换、同步和自由表面/有限跨效应为主线；只在证据触发时升级到额外模态、摩擦、湿润事件或多自由度 | 结构问题选择书；现象—方程—实验映射；纳入/排除理由 | `python3 qa/accept.py --id STR-001`；每个结构课题同时链接一个主导机制、一个冻结方程对象和一个可测 observable；无“因工具可用而选题”项 | `research_notes/R3-structure-selection.md`；`artifacts/acceptance/STR-001/` | **候选** | 罗列混沌/分岔术语；只因能画图就研究；与实验无观测路径；套用别题模板 |
| `STR-002` | 寻找普遍规律、分类、临界条件、标度、稳定性和状态转换（`S:443–451,491–502`） | 严格区分固定圆柱尾流 Hopf、耦合平衡失稳、锁频入口和实验可见起振；分类去同步/同步、相位滑移、上下分支和滞回 | 操作性状态定义；阈值方程；分类器；状态图协议；误分类/不确定区 | `python3 qa/accept.py --id STR-002`；标准系统和合成信号上正确区分三类阈值与锁频/近频，边界样本输出不确定而非强行分类 | `research_notes/R3-bifurcation-and-predictions.md`；`verification/structure/classification/`；`artifacts/acceptance/STR-002/` | **候选** | 一个 FFT 峰就称锁频；固定体 `Re≈47` 当实验起振速度；振幅超过阈值就称 Hopf；单次上扫称滞回 |
| `STR-003` | 可按问题研究模态、稳定性、锁频、分岔、周期轨道、准周期/混沌等（`S:455–503`） | 对冻结 ROM 做平衡稳定性、Hopf 正规形、周期轨道伪弧长延拓、Floquet 和锁频慢流；只有证据要求时才做准周期/混沌诊断 | 推导；延拓/Floquet 实现；标准基准；分支数据及稳定性标签 | `python3 qa/accept.py --id STR-003`；解析 Hopf/折叠基准通过，周期轨道残差和非平凡 Floquet 乘子收敛，上/下扫与延拓分支关系可复算 | `research_notes/R3-bifurcation-and-predictions.md`；`verification/structure/continuation/`；`artifacts/acceptance/STR-003/` | **候选** | 彩色轨迹复杂就称混沌；时域扫参代替延拓；无乘子就称周期轨道稳定；数值噪声当分岔 |
| `STR-004` | 第四层优先选择核心相关、理论可导、可计算、可实验、解释力强且可完成的方向（`S:546–560`） | 冻结最小无量纲组与受控扫描，避免一次流速扫描把 `Re`、约化速度和阻塞等相关变化误说成独立因果；给参数控制和标度的实验设计 | 无量纲推导；独立控制矩阵；可行性/功效分析；停止规则 | `python3 qa/accept.py --id STR-004`；量纲矩阵秩、Buckingham 组和参数变换测试通过，扫描设计能辨别目标效应或明确不可辨识组合 | `quality/dimensionless-groups.yaml`；`experiment/design-matrix.csv`；`artifacts/acceptance/STR-004/` | **候选** | 改流速后把所有无量纲量当独立；只报相关性；超出装置能力仍列精确临界值；穷尽所有理论主题 |
| `STR-005` | 结构性研究须形成明确、可展示且比轨迹更有解释力的物理结论（`S:550–558,592–597,617–619`） | 至少给出经完整运行盲测的状态边界/标度/相位—功率或分支预测，附误差和失败域；残差决定是否升级模型 | 冻结预测；双后端/实验检验；不确定度状态图；失败案例 | `python3 qa/accept.py --id STR-005`；至少一项 A 级预测在未用于校准的完整工况上按预注册标准检验，且发布表同时列通过、失败和不可判定项 | `quality/structural-predictions.yaml`；`artifacts/acceptance/STR-005/` | **未满足** | 只展示拟合轨迹；隐藏失败工况；验证后改阈值；把不可判定写成支持 |

## 10. 确定性、provenance、检查点与运行血缘

这些是原始文档“可验证、可比较、配置管理、批处理、重复和数据输出”的必要工程化细化，也是论文级复现门；它们不因原文未逐字使用英文术语而成为可选项。

| ID | 原文意图（来源） | 涡流摆实例化 | 必须产物 | 可执行验收 | 证据路径占位 | 状态 | 不允许的替代证明 |
|---|---|---|---|---|---|---|---|
| `REP-001` | 同一输入、重复运行和可靠比较必须有可声明的确定性语义（`S:22–26,247–263,328–332`；`A0:71–74`） | 规范化配置序列化；固定随机种子、线程/归约设置和求解器版本；CPU 确定路径要求 bitwise，确有并行非确定性时预注册数值等价阈值与预算 | canonical serializer；seed policy；determinism profile；重复测试 | `python3 qa/accept.py --id REP-001`；同一环境连续/交错重复至少 3 次，按 profile 达到 bitwise 或声明 QoI 容差；任何差异均可追踪 | `quality/determinism.yaml`；`artifacts/acceptance/REP-001/` | **候选** | 只有配置 hash 函数意图；两张曲线肉眼一样；不记录线程/GPU/seed；事后放宽容差 |
| `REP-002` | 每次结果必须可追溯到精确输入、软件和环境（`S:22–26,247–261,316,659–669`；`W:13`；`A0:11,66–67`） | manifest 记录提交和 dirty diff hash、依赖锁、OS/CPU/GPU/浏览器、后端/模型/schema 版本、配置/数据/网格/标定 hash、seed、命令和时间 | `run-manifest.schema.json`；自动捕获器；敏感信息脱敏规则；验证器 | `python3 qa/accept.py --id REP-002`；从 GUI/CLI/HF/前向/分析各生成 manifest，schema 全通过且能解析到存在的不可变输入；缺字段时运行拒绝“可发布”标记 | `schemas/run-manifest.schema.json`；`artifacts/acceptance/REP-002/` | **未满足** | 文件修改时间；截图上的日期；只记 package 版本；工作树全部未跟踪却声称有精确 commit |
| `REP-003` | 暂停/继续、长 HF 运行和故障恢复需要完整检查点语义（`S:324–327`；论文级可靠性加严） | 序列化机械/尾流状态、事件分支、积分器内部、自适应历史、RNG、HF 场/网格/界面和 FSI 迭代；检查点与配置/代码 hash 绑定 | 版本化 checkpoint schema；原子写入；兼容/拒绝规则；恢复测试 | `python3 qa/accept.py --id REP-003`；在事件前后和 HF 耦合中途断点，恢复结果与不中断运行按 determinism profile 等价；损坏/错版本检查点 fail closed | `schemas/checkpoint.schema.json`；`artifacts/acceptance/REP-003/` | **未满足** | 仅保存当前角度；暂停后从头重算；恢复曲线大致相同；忽略求解器/事件/RNG 状态 |
| `REP-004` | 批量、扫描、重复和同输入运行需可审计组织（`S:328–332,659–669`） | 每个子运行有不可变 ID/父任务 ID、shared/backend hash、扫描坐标、重复号、seed、状态和失败原因；汇总不覆盖原始子结果 | run-index schema；任务 DAG；原子状态转换；重复/失败审计 | `python3 qa/accept.py --id REP-004`；构造含取消、失败、恢复的批扫描，索引无丢失/重复，汇总可反向定位每个完整运行和输入 | `schemas/run-index.schema.json`；`artifacts/acceptance/REP-004/` | **未满足** | 结果按文件夹顺序猜配置；失败点删除；重复运行覆盖原文件；汇总 CSV 无父任务关系 |
| `REP-005` | 数据输出、实验接口和发布结果必须保留原始—处理—分析—图表血缘（`S:259–261,367–370,667–669`；`A0:66–67`） | 每个表/图/论文数值链接原始实验或模拟 run、观测算子版本、处理脚本、分析参数和输出 hash；衍生数据不可覆盖原始数据 | lineage DAG；artifact manifest；内容寻址/哈希；复算脚本 | `python3 qa/accept.py --id REP-005`；随机抽取所有发布图表和表中数值，自动回溯到输入并在干净目录复算出同 hash 或声明容差 | `quality/lineage.yaml`；`artifacts/acceptance/REP-005/` | **未满足** | 图注写“simulation”；人工记忆处理步骤；Excel 手改数据；只有最终 PDF hash |

## 11. 论文级重写的额外质量门禁

| ID | 原文意图（来源） | 涡流摆实例化 | 必须产物 | 可执行验收 | 证据路径占位 | 状态 | 不允许的替代证明 |
|---|---|---|---|---|---|---|---|
| `SRC-001` | F0 必须以官方题意和一级来源冻结范围；论文级推导不得建立在未经核对摘要上（`W:20–22,44`） | 保存 IYPT final PDF/题图及其版次/hash；canonical 装置、VIV、自由表面/有限跨、Hopf/锁频、FSI/数值方法优先核对原始论文或官方规范全文 | R1 一级证据矩阵；本地来源 manifest；BibTeX；claim—page/figure/equation 定位 | `python3 qa/check_sources.py --manifest references/sources.yaml`；验证文件 hash、链接/DOI、来源等级、全文核对页码和每个关键 claim 的一级来源覆盖 | `research_notes/R1-official-and-primary-evidence.md`；`references/sources.yaml`；`artifacts/acceptance/SRC-001/` | **候选** | 搜索摘要；Reference Kit；综述转引；DOI 存在但未读全文；把来源装置阈值直接移植为本装置定量值 |
| `SRC-002` | 理论、高保真和降阶论断须区分来源事实、自行推导、经验假设和数值发现（`S:20–27,103–135`；`W:46,53–54`） | 对每条公式/参数/阈值标 `SOURCE`、`DERIVED`、`ASSUMED`、`CALIBRATED` 或 `COMPUTED`；经验尾流闭合不能伪装成第一性原理 | claim ledger；公式 provenance；参数来源表；引用覆盖报告 | `python3 qa/check_claim_provenance.py quality/claims.yaml`；零未分类核心 claim，所有移植参数有装置差异说明，所有自推导有独立复核链接 | `quality/claims.yaml`；`artifacts/acceptance/SRC-002/` | **候选** | 参考文献列表很长；段末放一个引用覆盖整段；“经典模型”无原始出处；自行推导暗示文献已证明 |
| `REV-001` | 方程必须经过第一轮独立审稿（`W:9,45–47`；`N:3,5`） | 审查官方范围、几何、符号、量纲、变分/力矩、边界、能量/功率、降阶、事件、适用域和观测；审稿人与作者任务分离 | 冻结稿 hash；REV-1 报告；逐条作者回应；修订 diff；未解决项清单 | `python3 qa/check_review.py --round 1`；报告覆盖 checklist，所有 P0/P1 有可定位修订或明确阻断，审稿输入/输出 hash 和身份/代理 provenance 完整 | `research_notes/REV-1-independent-review.md`；`artifacts/acceptance/REV-001/` | **未满足** | 作者自审；同一代理复述摘要；只查文风；口头“没问题”；无冻结稿 hash 的评论 |
| `REV-002` | 至少两轮独立审稿，第二轮不能由第一轮的结论替代（`W:9`） | 第二审稿者/代理独立获得修订后的冻结候选，重做关键推导、极限和接口检查，并专门检查 REV-1 修复是否引入新错 | REV-2 报告；独立重算附件；交叉问题表；最终关闭记录 | `python3 qa/check_review.py --round 2 --require-independent-from 1`；审稿 provenance 不同，关键式重算有独立中间结果，零未关闭 P0/P1，最终稿 hash 与被审稿一致 | `research_notes/REV-2-independent-review.md`；`artifacts/acceptance/REV-002/` | **未满足** | 把 REV-1 再运行一次；让作者自行确认修改；第二轮只检查拼写；两报告文本复制 |
| `TST-001` | 必须实际执行解析验证（`W:9,13,23–40,57`；`A0:64`） | 覆盖量纲、静平衡、零流速、真空/静水、细长/有限半径、线性频率、能量/功率、正规形/阈值和可得解析解；精确静水几何只是其中一项 | 解析测试清单；符号/高精度参考；每项阈值；执行回执 | `python3 qa/accept.py --id TST-001`；所有强制解析测试实际通过。当前仅 `FWD-006` 的精确几何子集复跑通过，因此本总门不能通过 | `tests/physics/analytic/`；`artifacts/acceptance/TST-001/` | **候选** | 单个精确几何脚本外推全模型；文档中“可验证”；数值曲线接近解析图但无误差阈值 |
| `TST-002` | 必须实际执行数值验证（`W:9,13,23–40,57`；`A0:64–65`） | 覆盖积分阶、约束漂移、事件定位、周期轨道残差、FFT/PLV、参数扫描、高保真守恒及所声明能力层级的空间/时间/耦合收敛 | 分层数值测试；原始运行日志；观察阶/误差表；失败案例 | `python3 qa/accept.py --id TST-002`；`NUM-002`、`NUM-003`、`HF-004`、`ANA-002` 和结构算法测试全通过，无 skipped 强制项 | `verification/numerical/`；`artifacts/acceptance/TST-002/` | **未满足** | 6/6 插件契约测试；构建成功；单一结果稳定；未运行的网格/三维测试写成通过 |
| `TST-003` | 必须实际执行端到端验证（`W:9,13,57`；`A0:13–17,62–67`） | 从新建项目、配置、两后端、暂停恢复、批/扫/重复、可视化、实验导入、观测、三方比较到导出/复载全链；至少 Chromium 与一个不同引擎 | Playwright E2E；固定 fixture；截图/视频/trace；浏览器矩阵；无障碍基本检查 | `npx playwright test` 后 `python3 qa/accept.py --id TST-003`；所有强制浏览器/流程通过，零 `only/skip/fixme`，回执 hash 与构建一致 | `e2e/`；`playwright-report/`；`artifacts/acceptance/TST-003/` | **未满足** | 组件单测；手工点一次；只在开发服务器截图；声称未跑跨浏览器测试通过 |
| `VAL-001` | 不得把未执行工作或较低层结果写成已验证（`W:13,50–57`；`A0:5,64–76`） | 所有“通过/验证/DNS/实验吻合/收敛”措辞必须链接同范围回执；能力和状态标签由 evidence manifest 自动生成，禁止手填升级 | 验证 claim linter；状态生成器；禁止词/能力规则；反例测试 | `python3 qa/check_validation_claims.py --strict paper/ docs/ README.md`；每个强验证动词都有同范围 `result.json`，故意注入无证据 claim 时命令必须失败 | `qa/check_validation_claims.py`；`artifacts/acceptance/VAL-001/` | **候选** | `WORKLOG` 有禁止声明就假定不会误写；代理口头保证；低保真/二维结果支持三维/DNS claim |
| `VAL-002` | 盲测必须按完整释放和完整几何/工况划分，先冻结后打开（`W:47,55`） | 校准、模型选择和预处理只看 calibration runs；按完整 run/geometry/flow condition 分组留出，冻结方程、参数规则、观测算子、窗口、指标、排除标准后再解封 | split manifest；随机化/分组脚本；冻结 commit/hash；访问日志；一次性盲测报告 | `python3 qa/check_blind_split.py --manifest validation/blind-split.yaml`；证明无 run ID/geometry 跨集合，冻结时间早于 validation 解封，测试后无未申报模型修改 | `validation/blind-split.yaml`；`validation/access-log.jsonl`；`artifacts/acceptance/VAL-002/` | **未满足** | 随机拆相邻帧；同一次运行前半拟合后半验证；看过验证结果后调窗口；交叉验证替代最终盲测 |
| `VAL-003` | 比较必须包含不确定度、可辨识性和诚实边界，不报虚假高精度（`S:412–419`；`W:56`） | 联合传播几何/物性/初态/标定/测量/数值误差；做灵敏度秩、profile likelihood/后验诊断；不可辨识时报告组合、区间或界 | 不确定度预算；可辨识性报告；覆盖率测试；参数发布规则 | `python3 qa/accept.py --id VAL-003`；合成参数恢复与覆盖率达到预注册标准，病态方向被识别并禁止输出无依据小数，预测带含主要相关性 | `validation/uncertainty/`；`artifacts/acceptance/VAL-003/` | **未满足** | 优化器 Hessian 对角线直接当真实误差；只报拟合标准误；忽略参数相关；不可辨识参数给单值 |
| `REL-001` | 完成版必须包含论文、实验协议、软件、数据契约和复现记录（`W:9`；`A0:67`） | 发布包含理论论文、来源库、实验手册、两个已声明能力的后端、GUI/CLI、schemas、示例/真实数据索引、测试/审稿/限制和复现说明 | release manifest；完整产物清单；许可证/第三方声明；版本标签 | `python3 qa/check_release.py --gate completeness`；manifest 中所有强制路径存在、非占位、可解析，能力声明与 `HF-003/HF-006` 状态一致 | `release/manifest.json`；`artifacts/acceptance/REL-001/` | **未满足** | 单一 Markdown；源码压缩包无说明；空高保真接口；把未通过 `HF-006` 的降级后端标成完整 3D |
| `REL-002` | 发布前做结构、Markdown、公式和链接审计（论文级加严；`W:9`） | 检查标题层级、表格列、代码围栏、显示数学定界符、公式/图/表编号和交叉引用、术语/符号一致性、内部锚点和外链 | 结构 linter；Pandoc 渲染；公式/交叉引用检查；链接检查报告 | `python3 qa/check_release.py --gate markdown`；再执行 `pandoc paper/vortex-pendulum.md -o artifacts/release/vortex-pendulum.html`；所有检查 0 error，外链状态/检查时间入档 | `qa/check_markdown.py`；`artifacts/acceptance/REL-002/` | **未满足** | 编辑器预览正常；只数公式数量；忽略断链；数学源码存在但渲染失败 |
| `REL-003` | 发布产物必须用 hash 固定并可在干净环境复现（论文级加严；`W:9,13`） | 对论文、代码归档、依赖锁、schemas、数据、图表、审稿和验收回执生成 SHA-256；干净 checkout 一键复建并比较 hash/容差 | `SHA256SUMS`；SBOM/依赖锁；复现脚本；干净环境日志；签名/标签可选 | `python3 qa/check_release.py --gate reproducibility`；临时干净目录按说明构建、测试和生成全部发布图表，校验 hash 或预声明数值容差，无网络隐藏输入 | `release/SHA256SUMS`；`release/reproduce.sh`；`artifacts/acceptance/REL-003/` | **未满足** | 只给最终 PDF hash；在开发脏目录复跑；依赖 `node_modules` 缓存；人工复制图表 |
| `REL-004` | 软件和文档必须无占位、无未解释失败、构建/类型/测试全部通过（`W:9,57`；`A0:11–17,62–67`） | 生产目录不含旧原型物理；TypeScript 严格编译、构建和全测试通过；无 TODO/TBD/FIXME/假数据/空后端；未支持能力显式关闭 | clean-build 脚本；占位扫描；依赖/死代码审计；完整日志 | `python3 qa/check_release.py --gate software`；在干净环境执行类型检查、构建、单元/集成/E2E，零强制 skip，扫描和后端烟测全通过 | `artifacts/acceptance/REL-004/` | **未满足** | 当前 `npm test` 的 6/6；开发模式可打开；忽略 `tsc`/build 失败；空函数返回示例数据 |
| `REL-005` | 需求追踪必须覆盖所有强制项，发布状态只能由证据生成（`W:9`；`A0:67`） | 本矩阵每个 ID 绑定测试/审稿/产物/回执；脚本检查 ID 唯一、来源覆盖、证据存在、状态与回执一致、条件能力声明无越级 | 本矩阵；机器可读 traceability manifest；覆盖率报告；发布判定 | `python3 qa/check_traceability.py research_notes/R0-requirements-traceability.md quality/traceability.yaml`；零重复/孤儿 ID，100% 强制需求有验收与证据，所有发布 claim 的 ID 均实测通过 | `quality/traceability.yaml`；`artifacts/acceptance/REL-005/` | **候选**（本文已建立人工矩阵；机器清单和回执尚缺） | 表格行数多；所有文件存在；人工口头宣布完成；把候选状态改字为通过 |

## 12. 需求覆盖反查

| 原始/加严主题 | 主验收 ID | 覆盖判定 |
|---|---|---|
| 四层体系与贯通 | `GOV-001`、`FWD-*`、`HF-*`、`NUM-*`、`STR-*` | 已建立验收，尚未贯通 |
| 双后端与统一 GUI | `HF-003`、`NUM-001`、`PLT-001`、`RUN-005` | 高保真实现和 GUI 均缺失 |
| 高保真降级条款与 3D 能力边界 | `HF-003`（最低研究级门）、`HF-006`（完整 3D 条件能力门）、`REL-001` | 已区分；当前两门均未通过 |
| 配置、保存/载入 | `CFG-001`、`PLT-002`、`PLT-003` | 未满足 |
| 启停、暂停/继续、单次 | `RUN-001` | 未满足 |
| 批处理、扫描、重复 | `RUN-002`、`RUN-003`、`RUN-004`、`REP-004` | 未满足 |
| 同输入双模式 | `RUN-005`、`REP-001`、`CMP-001` | 未满足 |
| 动态物理可视化 | `VIS-001`、`VIS-002`、`VIS-003` | 未满足 |
| 通用/专属分析 | `ANA-001`、`ANA-002`、`ANA-003` | 只有候选函数/备忘录 |
| 实验导入导出 | `DAT-001`、`DAT-002`、`DAT-003`、`EXP-001` | 未满足 |
| 观测算子与三方比较 | `OBS-001`、`CMP-001`、`CMP-002`、`CMP-003` | 未满足 |
| 模块化多题扩展 | `GOV-003`、`PLT-004`、`PLT-005` | 接口思想候选；未作第二题证明 |
| 确定性/provenance/checkpoint | `REP-001`、`REP-002`、`REP-003`、`REP-004`、`REP-005` | 未形成生产证据 |
| 适用域/事件分支 | `FWD-004`、`FWD-005`、`STR-002` | 理论候选；未冻结/未数值执行 |
| 一级来源 | `SRC-001`、`SRC-002`、`GOV-006` | R1 证据备忘录为候选 |
| 两轮独立审稿 | `REV-001`、`REV-002` | 未满足 |
| 解析/数值/E2E | `TST-001`、`TST-002`、`TST-003` | 仅精确静水几何窄项实测通过 |
| 无虚假验证 | `VAL-001`、`GOV-005` | 原型隔离已实测；自动 claim 审计未实现 |
| 完整运行盲测 | `VAL-002`、`VAL-003`、`STR-005` | 未满足 |
| 结构/Markdown/公式/链接/hash 发布审计 | `REL-001`–`REL-005` | 未满足 |

## 13. 当前阻塞项与最短开门顺序

以下阻塞项按依赖而非按界面可见度排序。它们不是建议删减项；每一项都必须关闭，或在原文允许的高保真降级分支上明确降低能力声明。

本快照共登记 **73 个唯一需求 ID**：**2 个窄范围实测通过、27 个候选、44 个未满足**。两个“实测通过”分别只证明“旧原型被正确隔离为不可交付基线”和“精确静水几何脚本所列分支通过”，均不能向父级质量门传递为整体验收。

1. **F0 未冻结**：`research_notes/R1-official-and-primary-evidence.md` 已存在且有一级来源候选，但 canonical apparatus、对照变体、唯一几何/schema 和最终观测目标尚无签署冻结记录。
2. **F1 尚无两轮独审**：三维自由表面 FSI 母模型和精确变分机械备忘录已出现，但 `REV-001/002` 未执行；文档方程不能等同运行过的三维模拟。
3. **F2 尚未关闭**：系统降阶与分岔推导是候选；闭合系数、标定顺序、适用域、事件/升级分支和方程—代码接口未冻结。
4. **F3 完全未闭环**：没有版本化数据契约、标定/观测算子、实验手册、完整运行切分、盲测访问日志和不确定度协议。
5. **高保真最低门缺失**：`HF-003` 尚无可运行且独立于 ROM 的研究级近似后端。原文允许诚实降级，但不允许空接口或假场；`HF-006` 的真正三维自由表面 FSI 更未运行，不能宣称 3D/DNS。
6. **前向生产后端缺失**：R0 记录求解器入口缺失、构建失败；旧 `model.ts` 未映射冻结方程，也无事件/收敛/误差验证。
7. **统一 GUI 和运行闭环缺失**：配置、启停、批量、扫描、重复、同输入双后端、动态可视化和结果管理均未实现。
8. **比较闭环缺失**：没有共享 observable schema、双后端配对 hash、实验导入导出或三方同量比较；旧状态字段拷贝不是观测算子。
9. **结构算法未实测**：尚无延拓、Floquet、锁频/阈值分类、状态图和预注册预测的实际数值验证，更无完整运行盲测。
10. **复现基础缺失**：全部工作树仍未建立可追溯提交基线；缺 run manifest、依赖/环境 provenance、确定性 profile、检查点和数据血缘。
11. **总测试门未开**：当前唯一认可的窄范围通过是 `FWD-006` 精确几何脚本复跑；解析总套件、数值收敛和浏览器 E2E 均未通过。
12. **发布门未开**：论文/实验/软件/数据/复现包、两轮审稿、结构/Markdown/公式/链接检查、干净重建和 SHA-256 发布清单均缺失。

最短合法顺序是：关闭 `F0` → 独审并关闭 `F1` → 关闭 `F2` → 预注册并关闭 `F3` → 重写并验收 `F4` → 在不解封盲测的情况下完成解析/数值/E2E → 打开完整运行验证集 → 做三方比较与结构结论 → 执行 `R` 发布门。并行工作可以缩短墙钟时间，但不能改变这些证据依赖。

## 14. 当前可承认的结论边界

- 可以承认：R0 已实际证明旧原型不可交付；这不是“原型通过”。
- 可以承认：`research_notebooks/check_exact_geometry.py` 本次复跑退出码为 0，精确静水几何及脚本列出的局部力学检查在其明示分支内通过；这不是完整理论、求解器、实验或 FSI 通过。
- 可以称为候选：R1 一级证据、R2 连续场/变分模型、R3 系统降阶和分岔推导；在两轮独审和冻结前均不得进入“已验证”列。
- 不能承认：可运行生产构建、任一生产双后端、统一 GUI、实验闭环、三方比较、盲测、三维 FSI、网格收敛、跨浏览器 E2E 或可复现发布已经通过。
