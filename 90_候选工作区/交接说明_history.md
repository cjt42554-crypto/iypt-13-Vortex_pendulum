# 交接历史

## 2026-08-25 18:33:07 +08

- 在完整本地仓库续跑 A2：修复首次 smoke 暴露的报告变量名错误，将过零病态逐步相对残差改为诊断，并用全程参考反力 RMS 归一的最大/RMS 双门完成九算例 research。
- A2 裁决更新为 `PASS-A2-2D-PRESCRIBED-POWER-SIGN-ONLY`；只通过功率符号稳健性，不通过幅值、FSI 或装置预测。
- 新建 A8 公开规定横移圆柱候选包，冻结 $Re=185$ 文献合同，完成 smoke 和 $N_D=8,12,16$ 固定圆柱 screening。
- A8 裁决为 `NO-GO-A8-FIXED-REFERENCE-MISMATCH`：尾流成熟与数值稳定通过，$St$ 接近文献，但平均阻力和升力 RMS 明显偏高；规定横移定量长时分支按合同闭锁。
- A2 10/10、A8 4/4 测试和严格 TypeScript 检查通过；正式程序全套 `npm run validate` 通过；本轮 13 份 Markdown 通过 Pandoc 严格解析和浏览器实际渲染检查。
- 正式理论与正式程序未修改。下一轮只推进固定圆柱格点相位、mask/惩罚、域/边界和更高分辨率资格，不进入 weak-FSI。
