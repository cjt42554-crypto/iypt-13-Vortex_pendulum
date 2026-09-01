# 当前交接

## 当前状态

GitHub 当前活动状态为：

`EXPERIMENT_PREPARATION_PAUSE_READY_AFTER_BRIDGE_CORRECTION`

A8S 终局继续为：

`FREEZE-A8S-2D-CFD-QUALITATIVE-ONLY`

二维 CFD 只作定性流场辅助，不得用于装置载荷、振幅、平均功率或留出工况的定量预测。

项目科学结论仍为：

`NONE`

这表示装置尚未测量、ROM 尚未标定、留出预测尚未执行；不表示桥接工具仍有待完成的软件任务。

## 本轮暂停复核

独立执行审查发现 `main@9ae80d2...` 的 E1 桥接仍可接受空计划身份、跨装置拼接、标定域外工况、不安全 condition ID、production synthetic 输入，以及只改变水深却保留旧转轴水面高度的几何组合。上述问题会生成错误正式配置，因此原暂停状态在修复前被撤回。

最新复核与修正记录：

`90_候选工作区/current/G0_全项目完成度与实验前暂停治理/12_实验前桥接审计修正与暂停复核.md`

最小实验执行说明：

`90_候选工作区/current/E1_实验准备与辨识协议/02_实验前最小采集与留出预测执行说明.md`

修正后，正式配置生成要求：

- plan、apparatus、coefficient package 绑定同一装置、版本和计划；
- plan 已冻结且 `frozenAt` 有效；
- production classification 分别为 `experiment-frozen`、`apparatus-calibrated`、`rom-calibrated`；
- `synthetic-only` 只能用于显式合成资格；
- 每个 condition block 同时冻结 `waterDepthM` 和 `pivotHeightM`；
- 工况位于系数包的流速、水深、转轴水面高度和 Reynolds 标定域内；
- condition ID 不能逃逸输出目录。

工具层结论仍为：

`PASS-EXPERIMENT-PREPARATION-TOOLING-READY-WAITING-FOR-MEASUREMENTS`

它只证明实验前输入工具准备完成，不是数值、物理或实验 PASS。

## 使用入口

在：

`90_候选工作区/current/E1_实验准备与辨识协议/`

执行：

```bash
npm test
npm run qualify:synthetic
npm run check:prediction-ready
```

真实输入完成后执行：

```bash
npm run build:forward-configs -- \
  --plan /path/prediction-plan.json \
  --apparatus /path/apparatus-calibrated.json \
  --coefficients /path/rom-coefficient-package.json \
  --base-config ../../../02_模拟程序/public/examples/vortex-pendulum-default.json \
  --output-dir /path/frozen-forward-configs
```

## 恢复条件

后续首次恢复工作前至少需要：

1. 装置几何、质量、质心、转动惯量及标准不确定度；
2. 无流或静水自由衰减数据；
3. 水温、流体物性、水位和上游来流时间序列；
4. pilot 和冻结的 calibration/holdout condition blocks；
5. 角度或位移时间序列；
6. 若要声称相位或平均功率，校准力矩时间序列。

当前没有可执行的非实验批次。真实输入到位后的下一批次为：

`BATCH-ROM-CALIBRATION-UNCERTAINTY-AND-HOLDOUT-PREDICTION`

该批次只做机械参数估计、最小可辨识 ROM 拟合、不确定度传播、三档数值检查和结果前 holdout 预测冻结。在 holdout 预测提交前不得读取 holdout 结果。

## 当前不应继续

真实数据到位前，不再执行 HW2R、H2-X/H2-N、H3、长时 A8R、二维 CFD 参数追赶、三维 CFD、完整分岔工具、通用平台重构或无实际瓶颈的性能优化。
