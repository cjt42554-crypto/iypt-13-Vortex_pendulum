# 交接历史

## 历史归档边界

截至本条之前的完整交接历史未删除，固定于：

- 提交：`0bdadee1b31a154a795ddd71eb6e6490587a97f1`；
- 文件路径：`90_候选工作区/交接说明_history.md`；
- Git blob SHA：`9be78005e4aa1000a3ed27985187b58521853bf1`。

需要追溯时使用：

```bash
git show 0bdadee1b31a154a795ddd71eb6e6490587a97f1:"90_候选工作区/交接说明_history.md"
```

本文件自下条起继续记录新的交接历史。

## 2026-09-02 00:26:48 +09:00

- 以 GitHub `main@0bdadee1b31a154a795ddd71eb6e6490587a97f1` 为基线，按顶层 `AGENTS.md` 读取 current、A8S 终局、最小活动计划、正式前向理论/程序及 E1/F1/S1；根 README 未读取。
- 独立接受 A8S 唯一终局 `FREEZE-A8S-2D-CFD-QUALITATIVE-ONLY`。二维 CFD 自此只作定性流场辅助，不再用于装置载荷、振幅、平均功率或留出预测的定量来源；不恢复 HW2R、H2-X/H2-N、H3、长时 A8R 或结果后的 CFD 调参。
- 全项目剩余价值审查确认：正式 ROM、数值核心、E1 通用数据规则和实验比较工具已经存在；实验前唯一仍可完成的缺口，是把当前装置实际消费的量值、prediction plan、ROM 系数包、calibration/holdout 隔离和正式 forward 配置生成整合成一个可填写、可机器拒绝错误结论的最小桥接层。
- 在 E1 新增装置参数、预测计划、ROM 系数包和轨迹模板；新增 calibration/holdout 泄漏、二维 CFD 定量误用、尾流坐标规范、无力矩相位/功率主张、量值不确定度检查；新增冻结工况到正式 `SimulationConfig` 的确定性构造器、合成正例和关键负例测试。
- 角度或位移单通道固定 `unit-real-output-v1` 尾流规范：`rom.liftOutputReal=1`、`rom.liftOutputImaginary=0`、`rom.finiteSpanCoherence=1`。该规范只是消除不可辨识的尺度自由度，不是物理载荷标定。
- 明确不在真实 pilot 前预建通用高维 ROM 优化器。参数组、残差权重、噪声相关结构、正则化和不确定度算法依赖实际通道与 pilot 残差；数据到位后先冻结拟合问题，再实现或调用最小有界求解器。
- 当前状态改为 `EXPERIMENT_PREPARATION_PAUSE_READY_WAITING_FOR_APPARATUS_MEASUREMENTS`。当前无可执行的非实验批次；恢复条件是装置量值、无流机械数据、pilot、冻结 prediction plan、calibration 时间序列和可选力矩数据到位。
- 数据到位后的下一批次为 `BATCH-ROM-CALIBRATION-UNCERTAINTY-AND-HOLDOUT-PREDICTION`，且在提交 holdout 预测前不得读取 holdout 结果。
- 正式理论、正式程序、顶层 `AGENTS.md`、A8S 结果和既有冻结证据均未修改；科学结论仍为 `NONE`。
