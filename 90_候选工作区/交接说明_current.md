# 当前交接

## 当前状态

- 活动状态：`WAITING-FOR-MEASUREMENTS`
- 工具状态：`PASS-EXPERIMENT-PREPARATION-TOOLING-READY-WAITING-FOR-MEASUREMENTS`
- A8S 上限：`FREEZE-A8S-2D-CFD-QUALITATIVE-ONLY`
- 科学结论：`NONE`

正式理论和正式程序已经吸收审查后允许晋升的通用能力。关闭的候选工作包、冻结结果和审查证据完整归档于：

`90_候选工作区/archive/2026-09-02_baseline-9123b5c6/`

归档的机器可读索引为：

`90_候选工作区/archive/2026-09-02_baseline-9123b5c6/ARCHIVE_MANIFEST.json`

当前候选区只保留 `current/ACTIVE.md`。归档不是新的活动入口，也不改变其历史证据等级。

## 正式入口

实验输入、辨识、冻结和留出协议见：

`01_最终理论/04-实验辨识、标定与留出预测协议.md`

待填写模板和发布说明见：

`02_模拟程序/experiments/README.md`

在 `02_模拟程序/` 内，真实输入完成后运行：

```bash
npm run prepare:forward-configs -- \
  --plan /path/prediction-plan.json \
  --apparatus /path/apparatus-calibrated.json \
  --coefficients /path/rom-coefficient-package.json \
  --base-config public/examples/vortex-pendulum-default.json \
  --output-dir /path/to/new-frozen-config-set \
  --provenance-root /path/to/input-root
```

发布器要求计划、装置、系数包和工况身份一致，工况位于冻结标定域内，并对原始输入及整组输出绑定 SHA-256。任一校验失败时不得形成已提交结果目录。`--allow-synthetic` 只允许用于自动化测试。

## 恢复条件与下一批次

首次恢复前至少需要：

1. 装置几何、质量、质心、转动惯量及标准不确定度；
2. 无流或静水自由衰减数据；
3. 水温、流体物性、水位和上游来流时间序列；
4. pilot 与相互隔离的 calibration/holdout 工况块；
5. 角度或位移时间序列；
6. 若要声称相位或平均功率，校准力矩时间序列。

数据到位后的下一批次仅为：

`BATCH-ROM-CALIBRATION-UNCERTAINTY-AND-HOLDOUT-PREDICTION`

该批次只做机械参数估计、最小可辨识 ROM 拟合、不确定度传播、数值检查和结果前留出预测冻结。在提交冻结预测前不得读取留出结果。

## 当前禁止升级的结论

现有测试仅证明实现、合同、数值记账和历史冻结证据可重演。没有新实验，没有装置标定，也没有留出预测；二维 CFD 不具备定量装置载荷、振幅、平均功率或起振阈值资格。

真实数据到位前，不继续长时 A8、硬件性能优化、三维 CFD、完整分岔平台或新的无实验写作。
