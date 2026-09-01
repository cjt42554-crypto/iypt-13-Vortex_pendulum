# 当前交接

## 当前状态

GitHub 当前活动状态为：

`EXPERIMENT_PREPARATION_PAUSE_READY_WAITING_FOR_APPARATUS_MEASUREMENTS`

A8S 固定圆柱一次性科学去留循环已在 `main@0bdadee1b31a154a795ddd71eb6e6490587a97f1` 提交并推送，终局为：

`FREEZE-A8S-2D-CFD-QUALITATIVE-ONLY`

七个冻结算例均完成并通过稳定性、主网格趋势、宽域、低 Mach 和格点相位敏感性门；但 $D=36$ 平均阻力 1.397842 未进入 1.287±0.05 的文献容差。二维 CFD 自此只作定性流场辅助，不得提供装置载荷、幅值、平均功率或留出工况的定量预测。

项目科学结论仍为：

`NONE`

这表示装置尚未测量、ROM 尚未标定、留出预测尚未执行；不表示实验前工具链存在未完成的软件任务。

## 实验前暂停裁决

最新终局裁决：

`90_候选工作区/current/G0_全项目完成度与实验前暂停治理/11_A8S后实验前可暂停终局裁决.md`

最小实验执行说明：

`90_候选工作区/current/E1_实验准备与辨识协议/02_实验前最小采集与留出预测执行说明.md`

当前已完成：

- 正式前向理论和数值求解核心；
- F1 前向合成数值资格；
- S1 最小结构和可观测分析工具；
- E1 通用装置、校准、时间序列、辨识和 holdout 规则；
- A8S 二维 CFD 定量去留终局；
- 装置量值、prediction plan 和 ROM 系数包的最小模板；
- calibration/holdout block 隔离、尾流坐标规范、二维 CFD 定量误用和无力矩功率主张检查；
- 冻结工况到正式 forward `SimulationConfig` 的确定性构造；
- 合成正例与关键负例测试；
- 正式程序测试、构建、forward smoke 和收缩后的科学核心 CI。

工具层通过码为：

`PASS-EXPERIMENT-PREPARATION-TOOLING-READY-WAITING-FOR-MEASUREMENTS`

它只证明实验前输入工具已经准备好，不是数值、物理或实验 PASS。

## 需要真实输入后才能继续的事项

后续首次恢复工作前至少需要：

1. 装置几何、质量、质心、转动惯量及标准不确定度；
2. 无流或静水自由衰减数据，用于刚度、黏性阻尼、库仑摩擦和重复释放误差；
3. 水温、密度、黏度、水位；
4. 上游来流时间序列、实际均值、波动和空间均匀性；
5. pilot 结果或明确的流速/水深/初始角范围；
6. 冻结的 calibration 和 holdout condition blocks；
7. 角度或位移时间序列；
8. 若要声称力—速度相位或平均功率符号，校准的力或力矩时间序列。

这些任务依赖实物装置或真实采集，不能由继续写代码或运行二维 CFD 替代。通用高维 ROM 优化器也不在实验前预建：拟合参数组、权重、噪声模型和正则化必须由 pilot 数据决定；数据到位后先冻结拟合问题，再采用最小有界求解器。

## 使用入口

在：

`90_候选工作区/current/E1_实验准备与辨识协议/`

执行：

```bash
npm test
npm run qualify:synthetic
npm run check:prediction-ready
```

复制并填写：

- `templates/apparatus-calibrated.template.json`；
- `templates/prediction-plan.template.json`；
- `templates/rom-coefficient-package.template.json`；
- `templates/trajectory.template.csv`。

数据和系数包完成后生成正式 forward 配置：

```bash
npm run build:forward-configs -- \
  --plan /path/prediction-plan.json \
  --apparatus /path/apparatus-calibrated.json \
  --coefficients /path/rom-coefficient-package.json \
  --base-config ../../../02_模拟程序/public/examples/vortex-pendulum-default.json \
  --output-dir /path/frozen-forward-configs
```

## 当前禁止与不应继续的工作

在真实数据到位前，不再执行：

- HW2R、H2-X/H2-N、H3；
- 长时 A8R；
- 二维 CFD 继续调 mask、域、Mach、网格或文献门；
- 三维 CFD、自由表面或强耦合 FSI；
- 完整分岔、Floquet、Bautin、环面或混沌工具；
- 通用平台、GUI、plugin、桌面或仓库治理重构；
- 新的机器门、通过码、manifest、双环境或 inode 认证；
- 没有实际周转时间瓶颈时的 CPU/GPU 性能优化；
- 为删除历史过度工程文件而进行清理重构。

旧 G0/H1/H2/H3、PR-2A、机器门和冻结证据继续保留历史字节，但不再是活动前置。

## 下一批次

当前没有可执行的非实验批次。

真实输入到位后的下一批次固定为：

`BATCH-ROM-CALIBRATION-UNCERTAINTY-AND-HOLDOUT-PREDICTION`

该批次只允许：

1. 机械参数估计；
2. 最小 ROM 可辨识组合拟合；
3. 参数不确定度与相关性；
4. 三档数值检查；
5. 在读取 holdout 结果前冻结预测区间；
6. 读取 holdout 后裁定误差和是否需要一个明确的新物理机制。

在 holdout 预测提交前不得读取 holdout 结果。
