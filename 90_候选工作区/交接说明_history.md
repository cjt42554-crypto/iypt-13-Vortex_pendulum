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

## 2026-09-02 17:05 +08

- 以 `main@9123b5c6b608a7ddeaa6c4992b3659a3fa20c8e0`、tree `0729dbd8b423c74872d56961882272c5d0be1e81` 为审查基线，让 ChatGPT Pro 独立检查完整仓库路径树并深读理论—实现—验证—证据主链。Pro 裁决为 `PARTIAL-GO-FORMAL-PROMOTION`、`NO-GO-BROAD-DELETION`、`NO-UNCONDITIONAL-IMMEDIATE-DELETE`、`SCIENCE-CONCLUSION-NONE`。
- 正式理论新增实验辨识、装置标定、不确定度传播和结果前留出预测冻结协议；原三份理论补入入口与结论边界。
- 正式程序吸收严格 canonical JSON、原始输入字节绑定、整组原子发布、E1 实验输入桥接、A2 独立控制体诊断、A8 公开基准合同与 A8S 固定去留判据，并把 F1/S1 的有效意图变成正式求解器、结构根和能量/网格不变性测试。A1 仍是唯一动力学取力，A2 不进入反馈。
- 正式界面和 provenance 显式标记 synthetic、未留出、未验证系数源与 `cfd2d-qualitative-only`；修复正式脚本的过期候选输出路径，CI 只运行正式程序完整验证门。
- 将 `current/` 下 11 个已关闭候选树的 421 个受版本控制条目原样移动到 `archive/2026-09-02_baseline-9123b5c6/`，并生成 `ARCHIVE_MANIFEST.json`。清单逐项绑定基线 Git blob、物化字节和 3 个 LFS 对象；按 `sorted-key-json-utf8-v1` 计算的 entries canonical SHA-256 为 `f4c7f6da6e988f2854987fa3d715ef5c7dee2e2931c471b71cc678bc8d1f4aa6`。没有无条件删除任何受版本控制研究文件。
- 已忽略且可重装的两个候选 `node_modules`（约 78 MiB）移动到桌面回收站；该操作不改变 Git 或研究证据。
- 正式程序 `npm run validate` 通过：16 个测试文件、76 个测试，TypeScript 严格检查与 Vite 构建、桌面入口检查、端到端 UI 合同、Markdown 数学与理论边界检查全部通过。A8S 历史证据重演仍得到 `FREEZE-A8S-2D-CFD-QUALITATIVE-ONLY`。
- 本轮没有运行新实验、长时 CFD 或三维 CFD，也没有装置标定和留出预测。活动状态收敛为 `WAITING-FOR-MEASUREMENTS`，科学结论仍为 `NONE`。
