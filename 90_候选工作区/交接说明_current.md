# 当前交接：2026-09-05 数值审查修复

## 当前状态

本轮修复基于 `71437d1f76502957b9dc630568ff1a8483fc4ad8`，在 `main` 上继续。仍等待真实装置测量及 ROM 标定；A8S 保持 `FREEZE-A8S-2D-CFD-QUALITATIVE-ONLY`，没有新的装置物理结论。

本轮按用户 2026-09-05 的明确授权直接修复正式实现和测试；项目按短期个人科研工具处理。未新增实验数据，未把实现测试晋升为装置级验证。`交接说明_history.md` 按要求清空为零字节，Git 提交历史及既有原始计算/冻结证据不删除、不改写。

## 本轮实际修改

文件均位于 `02_模拟程序/`：

1. `src/experiments/coefficients.ts`：正式系数包必须给出 `calibrationDomain.jointSupport`。仅支持有明确依据的 `validated-box` 或 `covered-cells`；后者按完整联合单元作成员检查，保留覆盖空洞，不自动把边际范围做笛卡尔积或取凸包。单元需要四个完整范围且不得超出边际包络。
2. 更新待填写模板、合成 fixture 和 `experiments/README.md`。空模板不能通过正式发布；旧边际范围包必须依据真实覆盖迁移。`evidence` 非空只代表有声明，程序不自动证明其科学充分性；测试 fixture 的矩形域仅为 synthetic。
3. `tests/forward-solver.test.ts` 中原“时间细化”由最大步长 0.01/0.003 秒改为 0.001/0.0005 秒，均小于共同输出间隔 0.002 秒，并断言实际接受步数和最大接受步确实变化。
4. `dopri54.ts` 增加 Dormand–Prince 四次密集输出；`dense-events.ts` 计算插值多项式极值及几何关键角的时刻。`forward/index.ts` 对接受步内部检查守卫，在发现的最早括区上定位；湿润分支变化另行二分定位，不再记在接受步末。
5. 补修 Re 等参数恰在系数包合法闭边界时的定位错误：`COEFFICIENT-OOD` 的合法侧允许余量为零，不能因此把之后才发生的角度越界定位到近零时刻。初始尝试步也显式受 `maximumStep` 限制。求解器版本更新为 `2.1.0`。
6. 新增联合域、密集输出/窄步内角度越界/重根、闭标定边界和湿润切换时间测试。修正干湿 RHS “全局连续”的错误注释，明确状态连续并不等于尾流切换已获物理标定。

## 本地复核

已用项目真实 TypeScript 源码运行默认 0.2 秒前向算例，完成且输出 21 个时刻。闭标定边界反例正确在约 `0.00200110 s` 退出，而不是误定位到起点。湿润切换在最大步长 0.02/0.001 秒下分别约为 `0.01925541496/0.01925540924 s`。这些是针对性复核，不代替下方远端完整测试记录。

## 适用边界

密集输出的误差来自数值轨迹本身；`eventTimeTolerance` 仅限定已发现根的括区宽度。机械极值和几何关键角改善了步内穿越检查，但有限检查点仍不能保证任意非线性/快速来流守卫的所有穿越都被捕获；临界工况仍须事件时间细化和独立检查。

没有增加尾流模态、三维 CFD、动态自由表面或再入水记忆模型；干湿尾流硬切换未作物理平滑或实验标定。二维 CFD 的定量资格没有提升；不能凭振幅包络一致替代力矩—角速度相位及周期平均功率验证。

## 后续接续

真实装置、无流衰减、上游来流、几何/惯量及校准力矩数据到位后，继续最小 ROM 标定、不确定度与留出预测。正式入口仍为 `npm run prepare:forward-configs`，但现在会拒绝没有联合支持的旧系数包。先补联合覆盖证据，不得为了让程序通过随意填写 `validated-box`。

旧关闭工作包、原始结果和审查证据仍在 `90_候选工作区/archive/2026-09-02_baseline-9123b5c6/`，原 `ARCHIVE_MANIFEST.json` 不改写。

完整验证首轮 85 项通过，能量细化测试触发默认 5 秒超时。仅将该测试超时设为 30 秒，保留计算时长、真实步长减半和全部数值断言；步内检查有额外求值开销，未宣称整体加速。

## 本轮提交验证记录

下方记录由实际执行修复测试的提交工作流写入；完整日志位于 `current/2026-09-05_数值审查修复/validation.log`。

实际远端验证：`npm ci && npm run validate`，退出码 `0`。包含 Vitest、TypeScript/Vite 构建、桌面入口检查、浏览器端到端测试与文档检查。

工作流运行编号：`33922056682`；测试对象是基于 `318ccfc733747e2e1a89f832fbfa92a476cd9ae4` 应用本轮补丁后的工作树。

```text
 Test Files  18 passed (18)
      Tests  86 passed (86)
✓ built in 888ms
E2E PASS: bidirectional visual parameters, five evidence-contract badges, incompatible-overlay gate, applied/diagnostic CFD summary, stable field rendering, light monochrome UI/plots, and blue-orange scene palette verified.
DOCS PASS: final theory boundaries, forward input/system ordering, equation namespaces, tags and math delimiters are valid.
```
