# 当前状态

更新日期：2026-08-24

## 当前候选

- 名称：P0 预测链闭合隔离候选。
- 路径：[`../90_候选工作区/current/`](../90_候选工作区/current/)。
- 阶段：`VALIDATED_WORKING_CANDIDATE / NOT_PROMOTED`。
- 分支：`main`。
- 成熟基线回写：未执行。

## 资格边界

```text
P0_CANDIDATE_BOUND_EVIDENCE = PASS
CURRENT_COMMIT_REVALIDATION = FAIL_STALE_PATH_REFERENCES
ACTIVE_MARKDOWN_MATH_RENDERING = PASS
ACTIVE_GOVERNANCE_CURRENT_PATHS = PASS
APPARATUS_CALIBRATION = false
QUANTITATIVE_PREDICTION_QUALIFIED = false
CANDIDATE_PROMOTED = false
```

当前候选修正了确定性错误和模型身份混淆，但尚未接入成熟主运行链，也没有建立装置标定或定量预测资格。2026-08-24 对活动及非冻结 Markdown 的公式显示语法已完成修复和实编译验证；这只建立文档渲染资格，不建立新的数值或物理资格。

当前提交复验发现两条与公式无关的失效路径引用：候选 TypeScript 指向不存在的连字符目录 `02-模拟程序/`，成熟程序的跨层测试指向不存在的连字符目录 `03-项目资料/`。既有 PASS 只对其绑定身份有效，不能写成当前提交完整复验 PASS。

## 下一步

1. 单独修复候选与成熟测试中的失效连字符路径，并重新执行两套完整 `npm run validate`。
2. 完成未闭合的长时间、求积、事件和结构分析 P0 门。
3. 对准备回写的组件进行独立审查和逐文件映射。
4. 只有在用户指定具体范围后，才回写成熟基线。
