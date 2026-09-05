# 2026-09-06 理论—程序对齐记录

结论：13-00—13-05 的有限实现及软件/数值/合成验收已完成；可以等待真实实验输入。**SCIENCE-CONCLUSION-NONE**，二维 CFD 仍为定性参考。活动状态只维护在 [current](../../../00_项目管理/交接说明_current.md)。

源基线 `2ec36bf67fd637bee08f8ddf7286aa8852c9666b`；[源差异](source.patch) 绑定本轮正式程序、测试、理论及输入样例。[最终环境](final-environment.json) 记录实际 Node/npm/Python/依赖/CPU。起始记录 `source-environment.json` 仅描述启动时状态；用户随后禁止子代理，所有代理已中断，后续集成和收尾由主代理完成。

原始日志与补丁保留工具生成的空格、空行；本目录 `.gitattributes` 只对 `.log`、`.patch` 关闭空白风格检查，程序、配置和说明仍按原规则检查，不改写原始证据字节。

## 证据索引

| 验收 | 主要证据 | 范围 |
| --- | --- | --- |
| A 湿区 | `13-00/full-immersion-correction.log`、完整验证日志 | 严格/闭边界、缺输入、全干、零流、步内干区、假阶段越界、独立支撑参考；四档内部步和四倍输出间隔。 |
| B 规范 | `13-01/migration-io-first.log`、`13-01/aligned-frozen-final/`、`13-01/aligned-result.json`、`13-01/aligned-result.csv` | 120 组种子 20260905 常数复规范；RHS 相对差约 6.1e-15、轨迹约 3.1e-14；新旧实缩放文件回读及正式输出一致。 |
| C SS | `13-02/final-targeted.log`、`13-02/mode-and-wake-limits.log`、完整验证日志 | C1/C2 自由停转/斜坡及功账本，四档事件细化，严格粘着、尾流增长脱粘、反向、零阈值、擦边、同时域退出。尾流脱粘参考 0.0264194239275 s，误差约 1e-11 s。 |
| D DW | `13-02/final-targeted.log`、完整验证日志 | 180 组独立边界极值、150 组独立笛卡尔载荷，被动性；求积 16/32/64/128，生产时间步 .02/.01/.005/.0025 s，接受步 4/8/16/32，状态参考误差 8.5e-12 降至 8.5e-15。 |
| E 辨识/UQ | `13-04/correlation-scale.log`、`13-04/identification-report.json`、`13-04/uncertainty-report.json`、完整验证日志 | 饱和/单频退化、过渡/多频秩、未知初态、增长/衰减/零增长解析式；奇异 PSD、单位尺度、相关与共享误差；128 个小噪声样本按抽样误差界验收，24 个跨模式情景保留全部结果。 |
| 组合与入口 | `13-05/browser-first.log`、`validate-first.log` | 四模式正式求解；实际浏览器/Worker/CLI/JSON/CSV 一致、初始全干空结果、SS/DW 不套用光滑结构分析。 |

主要命令在仓库的 `02_模拟程序` 内运行：`npm ci`、`npm run validate`。完整日志为 `validate-first.log`：**27 个文件、170 项测试通过**，随后构建、桌面入口、浏览器和文档/数学检查均通过。源级测试内固定各模型/参数/初态和参考算法；各事件日志保留实际接受步、重启、根区间、模式和误差，不拿输出间隔当内部时间细化。

根目录 `python3 -m unittest discover -s tools -p 'test_repository_docs.py' -v` 与 `python3 tools/check_repository_docs.py` 通过；见 `docs-unittest.log`、`docs.log`。`npm run diagnose:identifiability`、`npm run analyze:uncertainty` 的实际命令和完整输出在 `13-04/*-cli.log`。正式 v2 冻结/CLI 命令在 `13-01/build-final.log`、`13-01/run-final-corrected.log`。输入例位于 `02_模拟程序/experiments/examples/synthetic-alignment/`，均明确为合成。

## 失败、更正与证据限制

- 首次程序 CI `33985582617` 绑定提交 `0ce3ff7`，159 项通过、11 项墙钟超时；原始完整日志为 `ci-first-failure.log`。总测试耗时 321 s，对比本地 102 s；能量细化单例 73.5 s、步内干区参考 30.2 s，120 组规范计算超过 60 s。后续仅调整验证资源与时间预算：CI 单 worker、默认看门狗 30 s，数值参考 60/120 s，工作流仍限 15 min；物理容差、时间细化、参考数量和浏览器 20 s 均不变。独立补丁 `ci-validation.patch` 以 `0ce3ff7` 为基线，新增资源记录便于区分机器速度与科学失败。
- `CI=true npm test` 本地复验采用相同单 worker 配置：27 文件、170 项全部通过，墙钟 78.06 s；完整日志为 `ci-serial-local.log`。
- 本地提交 `368234c` 的首次 push 被 OAuth 凭据缺少 `workflow` scope 拒绝，未发布。撤掉仅用于打印 runner 信息的两行工作流修改后，重建这一个未发布提交；工作流保持远端原样。`ci-validation.patch` 保存试验时原差异，最终实际补丁为 `ci-runner-budget.patch`（同样以 `0ce3ff7` 为基线），两者的数值与测试配置相同。
- 第二次 CI `33985958896` 绑定 `3d2bbf5`：170 项测试、TypeScript/Vite、桌面检查通过，串行测试 123.15 s（本地 78.06 s）。`ci-second-failure.log` 保留浏览器 20 s 到期的诊断：`runState=running`，Worker 存在，控制台无错误。以该实测资源差异为独立依据，将 CI 的前向页面完成等待预算设为 60 s，本地保留 20 s；只接受 `COMPLETED`，保持所有物理配置和导出断言。补丁 `ci-browser-wait.patch` 以 `3d2bbf5` 为基线。此修正不证明一般间歇超时机制已经解决。
- `CI=true npm run test:e2e` 本地复验通过，默认运行 15.90 s、整套 19.50 s、控制台无错误、SS-DW 物理差异约 1.2e-16；见 `ci-browser-local.log`。本次仅修改脚本等待预算，因此未重复本地整套数值测试。
- `integration-first-tests.log`、`13-00/exit-first.log` 保留早期夹具/几何问题；对应后续通过日志不覆盖它们。
- `13-05/four-branch-first.log` 的新多算例测试累计超出默认 5 s；缩短已停稳后的无关尾段后通过，事件和能量断言保留。`integration-full-tests.log` 的 5 个失败含并发超时和旧全湿时间预期。独立支撑/机械参考纠正后，以有限 4 worker 和新数值参考测试的有界预算通过完整验证；原物理误差界及浏览器 20 s 保持。
- 本轮两次浏览器通过不消除旧间歇超时记录。实际默认算例约 18.4/14.4 s，控制台无错误；SS-DW 的 CLI/页面最大相对差约 1.2e-16。没有把异常当完成或减少物理积分来换取通过。
- `docs-unittest-first.log` 记录本机没有 `python` 命令；使用 `python3` 后通过。`13-01/run-final.log` 记录一次文件名写错导致 ENOENT，改用实际冻结文件 `SYN-HOLDOUT-01.json` 后完成。
- `13-01/aligned-frozen/` 是早期冻结入口试跑，之后修正合成包的边际不确定度缩放；原输出保留，旧输入字节未另存，不把这组当最终可复算证据。最终冻结另存 `aligned-frozen-final/` 并绑定现存输入。没有原地改写冻结产物。
- 当前 v1 文件迁移只对有完整声明的常数实缩放转换边际不确定度；一般复规范使用完整联合协方差的配置转换 API。缺失联合相关性时不能声称完整 UQ。

软件 PASS 不等于标定、物理或留出 PASS。真实装置实验、实测标定/留出、大型 CFD/GPU 均 **NOT_RUN**。一般无限切换、任意守卫完备性、再入水和未建模水动力为保留限制。仅支持实际有限配置闭合，不把任意理论函数都列为已经实现。
