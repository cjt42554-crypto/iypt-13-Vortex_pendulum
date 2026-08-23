# P0 第二轮修复后候选：本地审查同步包

> 同步日期：2026-08-23
> 时区：Asia/Singapore
> 仓库：`cjt42554-crypto/iypt-13-Vortex_pendulum`
> 基线提交：`8d450479fbe45ebff79bced561646db70a0aa19b`
> 被同步的修复候选提交：`69a06a64821865cc29faa7dca210f4af9f0c5f7f`
> 候选分支：`codex/p0-second-review-fixes`

## 1. 裁决

```text
F-01～F-05：FIXED
第二轮本地审查候选：READY FOR SECOND LOCAL REVIEW
正式程序合入：NOT AUTHORIZED BY THIS PACKAGE
装置定量预测资格：NOT ESTABLISHED
```

本目录把 `04-P0预测链闭合修正版/` 中的第二轮修复与验证结果同步到 GitHub 仓库既有的 `本地审查结果/` 归档树中。这里的 READY 仅表示修复候选已经通过任务合同要求的本地门禁，可以再次送交对抗审查；它不是正式合入、物理标定或装置预测资格声明。

## 2. 与根目录旧审查证据的关系

`本地审查结果/` 根目录中的既有文件绑定第一轮候选提交：

```text
fa9ef6771605a02a0fde4cd27ef595251617b27d
```

这些文件记录当时真实存在的 NO-GO 结论和 F-01～F-03 复现证据。本同步包**不修改、不覆盖也不重新解释**那些历史文件，而是新增一个绑定修复候选 `69a06a648…` 的第二轮结果节点。两者共同形成：

```text
第一轮发现缺陷并裁决 NO-GO
→ 第二轮隔离修复 F-01～F-05
→ 真实门禁通过
→ READY FOR SECOND LOCAL REVIEW
```

## 3. 文件索引

- `第二轮修复记录.md`：F-01～F-05 的公式、合同、实现、默认数值尺度和测试映射。
- `第二轮验证结果.md`：环境、命令、测试数、验收矩阵、警告和证据边界。
- `审查证据.json`：机器可读的提交身份、测试结果、Git 范围与限制。
- `文件清单.sha256`：上述文件及本 README 的 SHA-256；清单自身不纳入清单。

候选源码和正式 Vitest 测试仍以被绑定提交中的 `04-P0预测链闭合修正版/` 为准，本同步包不复制源码，避免形成第二份可执行实现。

## 4. 真实验证摘要

候选：

```text
cd "04-P0预测链闭合修正版"
npm ci
npm run validate

TypeScript: PASS
Test Files: 8/8 PASS
Tests: 32/32 PASS
```

原程序回归：

```text
cd "02-模拟程序"
npm ci
npm run validate

Vitest: 47/47 PASS
Vite build: PASS
desktop:check: PASS
E2E: PASS
docs:check: PASS
```

Git：

```text
git diff --check: PASS
origin/main...候选提交路径数: 15
候选修复提交中 04 目录外路径数: 0
远端候选分支推送: PASS
```

## 5. 快速复现

从仓库根目录执行：

```bash
git switch codex/p0-second-review-fixes

cd "04-P0预测链闭合修正版"
npm ci
npm run validate

cd "../02-模拟程序"
npm ci
npm run validate
```

复现时必须记录实际 HEAD。若 HEAD 不等于上方绑定的修复候选提交，结果应归属于新提交，不能反向改写本同步包的身份。

## 6. 仍未建立的事项

- `activationFraction=0.05` 未经装置标定；
- 候选尚未接入正式 GUI、worker、DOPRI 或 CFD 运行链；
- 二维单相完整圆 CFD 不是三维自由液面装置预测；
- 尚未建立二维载荷的装置物理验证；
- 装置定量预测资格未建立；
- 本同步包不构成正式程序合入授权。
