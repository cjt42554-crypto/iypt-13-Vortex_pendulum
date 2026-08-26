# 当前交接

## 当前裁决

- A2：`PASS-A2-2D-PRESCRIBED-POWER-SIGN-ONLY`。
- A8 固定圆柱公开基准主线：`NO-GO-A8I-INLET-DISTANCE-SETTLED-REFERENCE-MISMATCH-NONREFLECTING-NOT-RUN`。这里的 A8I 是既有固定圆柱主线阶段名，不是 CBC 审计阶段名。
- A8B 候选 CBC-2D 单点资格：`PASS-A8B-CBC2D-BOUNDARY-QUALIFICATION-CANDIDATE-ONLY`。
- A8C 候选 CBC-2D 四轴稳健性：`NO-GO-A8C-CBC2D-FROZEN-ROBUSTNESS-MATRIX`。
- A8D 候选启动审计：`PASS-A8D-CBC2D-STARTUP-AUDIT-INTERNAL-GATES-CANDIDATE-ONLY`。
- A8E 候选缓启动时长：`NO-GO-A8E-CBC2D-RAMP-SENSITIVITY-INTERNAL-GATES`。
- A8F 候选碰撞核对照：`PASS-A8F-CBC2D-COLLISION-CONTRAST-INTERNAL-GATES-CANDIDATE-ONLY`。
- A8G 候选格点相位对照：`PASS-A8G-CBC2D-LATTICE-PHASE-INTERNAL-GATES-CANDIDATE-ONLY`。
- A8H 正式核只读启动对照：`NO-GO-A8H-READONLY-FORMAL-MRT-BRINKMAN-STARTUP-INTERNAL-GATES`。
- A8I 正式核只读缓启动时长：`NO-GO-A8I-READONLY-FORMAL-MRT-BRINKMAN-RAMP-SENSITIVITY-INTERNAL-GATES`。
- A8J 正式核只读无物体对照：`NO-GO-A8J-READONLY-FORMAL-MRT-NO-BODY-RAMP-INTERNAL-GATES`。
- A8K 正式核候选区边界因子审计：`PASS-A8K-FORMAL-MRT-INLET-SIDE-CAUSAL-PROBE-CANDIDATE-ONLY`。

当前总上限：A8K 已在不修改正式程序的前提下，把 A8J 的无物体 20D 密度失败定位到入口侧处理。只替换出口仍为 0/9，通过替换入口的两组均为 9/9；但正则化入口同时改变密度目标、九人口覆盖和非平衡应力，尚未确定三者中的主导项。正式接入、来源级固定圆柱、高分辨率、规定横移定量长时、weak-FSI 和装置预测继续闭锁。

## 本轮最新证据

工作目录：`90_候选工作区/current/A8_二维特征开放边界实验后端/`。

- A8K 合同在结果揭示前以提交 `e3e102add750ff46f077eb0fb54741bb9946ede3` 冻结；
- 矩阵为 3 个直径尺度、3 个松弛时间、2 种入口和 2 种出口，共 36 个无物体 20D 缓启动算例；
- 36/36 正常结束，18/36 通过密度与 Mach 门；
- 正式入口加正式出口：0/9，通过范围 $\max|\rho-1|=0.148605674$--$0.148614592$；
- 正式入口加 CBC 出口：0/9，通过范围 $\max|\rho-1|=0.148639171$--$0.148701427$；
- 正则化入口加正式出口：9/9，通过范围 $\max|\rho-1|=0.080642238$--$0.081332687$；
- 正则化入口加 CBC 出口：9/9，通过范围 $\max|\rho-1|=0.080652585$--$0.081356305$；
- A8J 九个正式基线的完成步数、密度/Mach 极值、出现步和极值位置均零容差一致；
- 九个角点归因均为 `INLET_REPLACEMENT_SUFFICIENT`；
- 紧凑无损机器产物解压后的规范 JSON SHA-256 为 `7fc06fb4568718502a546c7348adb8093605ecc54678c7b2c03fec415ffbd1bc`，仓库存储的确定性 gzip SHA-256 为 `df07f32dedbfd9af5c0345ba5ddf2d8e7cd3955dfa15437707c42eb5ecc61ac9`；研究阶段展开工作 JSON 独立复跑字节一致，SHA-256 为 `9d1319399e4217727d3f3f6cb263fbf8ba71a9ebae181522771412a0f236ff8b`。

正式源 `02_模拟程序/src/solvers/highFidelity/lbm.ts` 仍只读，SHA-256 为 `6949dd9f215595bde4162078f9cb026456bcbed83fd2ebd08131001e03ec2dc2`。正式理论和正式程序均未修改，CBC 与正则化入口均未接入正式核。

## 已收敛的原因边界

1. A8C 的高速度失败不是 CBC 出口独有的误差改善失败；三种出口的共同早期启动密度峰先于圆柱信号到达出口。
2. 候选核的“冲击失败、缓启动通过”分类不依赖所测两种 BGK 碰撞，也不依赖 16 个圆柱亚格点相位。
3. 候选分类不能直接转移到正式 MRT--Brinkman 核；正式核在相同高速度角点呈现相反分类。
4. 正式核 20D 缓启动失败不要求 Brinkman 物体存在；A8J 无物体仍为 0/9。
5. A8K 已区分边界侧：只替换出口 0/9，只替换入口 9/9，双替换 9/9。因此在冻结矩阵内，入口侧处理是充分且主导的稳定杠杆。
6. A8K 不能区分入口侧的密度目标、完整人口覆盖和非平衡应力重构；不得写成“正式 Zou--He 入口公式已被证明错误”。
7. CBC 出口在 A8K 中降低最大 Mach，但未越过入口主导的密度门；不得据此否定 CBC 在其他问题或更相容入口下的价值。

## 已执行验证

- A8K 冻结矩阵与独立复跑完成；
- A8J 九个 20D 正式基线 9/9 零容差一致；
- A8K 三项定向测试此前在正式只读导入路径下为 3/3 PASS；
- 最终候选源严格 TypeScript 接口检查 PASS；模块化实现与先前单文件实现的 36 算例 JSON 在同一核下逐字节一致；
- 紧凑机器产物的 36 唯一算例、九角点归因、18 个稳定算例和哈希链均有断言器；
- A8K 报告、验证记录、当前交接和历史使用 Pandoc 严格解析并通过数学分隔符检查；
- 正式程序 `npm run validate` 未执行：正式程序未修改；
- 既有 A8B--A8J 全测试集本轮未在完整 checkout 中重跑，前轮 33/33 PASS 只作为继承证据；
- `tools/check_repository_policy.py` 不存在，仓库治理脚本检查未执行。

## 下一步任务

继续留在候选区做 A8L 入口内部机制因子审计，不修改正式成果：

1. 冻结密度目标、人口覆盖范围和非平衡重构三项可区分入口变体；
2. 保持正式 MRT 碰撞、正式出口、无物体 20D 几何与 A8K 九角点不变；
3. 先确定哪一项或哪一组机制对密度门通过是必要/充分条件；
4. 在 A8L 结果揭示前不得接入正式程序，也不得启动来源级高分辨率、规定横移长时或 weak-FSI。
