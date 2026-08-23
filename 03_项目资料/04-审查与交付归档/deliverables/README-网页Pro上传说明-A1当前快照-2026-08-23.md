# 网页版 Pro 上传与使用说明：A1 当前趋势冲突包

## 推荐上传方式

向一个没有此前聊天记忆、不能访问本地文件的网页版 Pro 新会话上传：

1. `pro-review-trend-conflict-a1-current-2026-08-23.zip`
2. `发给Pro的主提示词-趋势冲突-A1当前快照-2026-08-23.md`
3. `Pro审查材料-趋势冲突-A1当前快照-2026-08-23.md`
4. 本次用户截图 PNG

然后把主提示词横线之间的正文直接粘贴到对话框。

同时单独上传两个 Markdown 是为了防止网页端无法可靠查看 ZIP 内文件。若单次附件数量受限，最低组合为：

- 主提示词 Markdown；
- 自包含审查材料 Markdown；
- `current-a1-120s-trend-summary.json`；
- 用户截图。

这四项都已包含在 ZIP 内，也可从 ZIP 解压后单独上传。

## 不应继续使用旧包替代本包

2026-08-21 的 `core/full` 包绑定的是 pre-A1 源码。A1 后已经：

- 把实际 applied、终点 diagnostic 和 cumulative 功账分开；
- 明确撤回 raw Brinkman 作为物理水动力的资格；
- 把旧 stress 圈降级为 legacy；
- 把二维后端标为 `unvalidated-preview`、装置趋势标为 `NO-GO`；
- 新增三个 provenance 合同哈希。

旧包只应作为历史基线，不应提交给一个新 Pro 作为当前源码快照。

## 完整性核对

下载/复制后，在解压目录执行：

```bash
sha256sum -c SHA256SUMS
```

外层 ZIP 的 SHA-256 记录在同目录：

```text
PRO-REVIEW-A1-CURRENT-SHA256.txt
```

当前项目没有 Git commit，因此 `SHA256SUMS` 和外层 ZIP 哈希是本包的实际身份边界。

## 告知 Pro 的证据缺口

项目当前没有保存：

- 第一轮 Pro 完整答复原文；
- `VP-TREND-CONFLICT-ROUTE-RULING-v1` 完整原文。

只有作者转述、裁决 ID、预期哈希和 A0/A1 实施报告。请让 Pro 把它标为缺失证据，不要假设哈希可以替代原文。

## 期望 Pro 返回的最低内容

要求 Pro 至少返回：

- 一句话最终裁决；
- 同题性 YES/NO 表；
- ROM、CFD、GUI、证据合同的错误分类；
- A1 与物理水动力之间的严格边界；
- corrected Brinkman 和两个嵌套控制体的离散方案；
- prescribed replay/复阻抗/联合收敛/强耦合/ROM 留出的硬门；
- A2、B、C、D 和实验的 GO/NO-GO 表；
- 仍无法证明的事项。

