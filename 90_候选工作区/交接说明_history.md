# 交接历史

## 历史归档边界

截至本条之前的完整交接历史未删除，固定于：

- 提交：`9ae80d2da5a29e79e123d3ddc84c376d06fd2bce`；
- 文件路径：`90_候选工作区/交接说明_history.md`；
- Git blob SHA：`4391b97dc9c8e6aaa9d6636cbb59f8876c8769d9`。

需要追溯时使用：

```bash
git show 9ae80d2da5a29e79e123d3ddc84c376d06fd2bce:"90_候选工作区/交接说明_history.md"
```

本文件自下条起继续记录新的交接历史。

## 2026-09-02

- 以 `main@9ae80d2...` 为基线复核用户独立执行审查；根 README 未读取。
- 确认空计划身份和冻结时间、跨装置拼接、标定域越界、condition ID 路径逃逸、production synthetic 输入及水深/转轴水面高度混淆均会造成错误正式配置，原实验前暂停状态在修复前不成立。
- 只在 E1 桥接内做最小修正：生产/合成 classification 隔离、计划/装置/系数包一致绑定、显式 `pivotHeightM`、流速/水深/转轴水面高度/Reynolds 域检查、安全 condition ID 和输出路径检查。
- 新增生产 CLI 正反例与关键回归测试；不修改正式理论、正式程序、A8S 结果或旧冻结证据，不恢复 HW2R/H2/H3。
- 修复闭合后状态恢复为 `EXPERIMENT_PREPARATION_PAUSE_READY_AFTER_BRIDGE_CORRECTION`；科学结论仍为 `NONE`，当前无可执行的非实验批次。
