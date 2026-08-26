# 当前交接

## 当前裁决

- A2：`PASS-A2-2D-PRESCRIBED-POWER-SIGN-ONLY`。
- A8 固定圆柱公开基准主线：`NO-GO-A8I-INLET-DISTANCE-SETTLED-REFERENCE-MISMATCH-NONREFLECTING-NOT-RUN`。这里的 A8I 是既有固定圆柱主线阶段名，不是下述 CBC 审计的 A8I。
- A8B 候选 CBC-2D 单点资格：`PASS-A8B-CBC2D-BOUNDARY-QUALIFICATION-CANDIDATE-ONLY`。
- A8C 候选 CBC-2D 四轴稳健性：`NO-GO-A8C-CBC2D-FROZEN-ROBUSTNESS-MATRIX`。
- A8D 候选启动审计：`PASS-A8D-CBC2D-STARTUP-AUDIT-INTERNAL-GATES-CANDIDATE-ONLY`。
- A8E 候选缓启动时长：`NO-GO-A8E-CBC2D-RAMP-SENSITIVITY-INTERNAL-GATES`。
- A8F 候选碰撞核对照：`PASS-A8F-CBC2D-COLLISION-CONTRAST-INTERNAL-GATES-CANDIDATE-ONLY`。
- A8G 候选格点相位对照：`PASS-A8G-CBC2D-LATTICE-PHASE-INTERNAL-GATES-CANDIDATE-ONLY`。
- A8H 正式核只读启动对照：`NO-GO-A8H-READONLY-FORMAL-MRT-BRINKMAN-STARTUP-INTERNAL-GATES`。
- A8I 正式核只读缓启动时长：`NO-GO-A8I-READONLY-FORMAL-MRT-BRINKMAN-RAMP-SENSITIVITY-INTERNAL-GATES`。
- A8J 正式核只读无物体对照：`NO-GO-A8J-READONLY-FORMAL-MRT-NO-BODY-RAMP-INTERNAL-GATES`。

当前总上限：候选正则化 BGK 核在 A8B 冻结中心点的 CBC 边界误差改善仍成立；A8D--A8G 只证明候选核内的启动分类对两种 BGK 碰撞和 16 个圆柱亚格点相位稳健。正式 MRT--Brinkman 核不复现该分类，且无物体时从静止缓启动仍越过密度门。正式接入、来源级固定圆柱、高分辨率、规定横移定量长时、weak-FSI 和装置预测继续闭锁。

## 本轮最新证据

工作目录：`90_候选工作区/current/A8_二维特征开放边界实验后端/`。

- A8D：243 个矩阵算例与 9 个护栏；冲击 15/81 稳定，两种 20D 缓启动各 81/81 稳定；SHA-256 为 `4a04dcf21f5a194ad2e2746836560f88b88af00d3855866111738941bc4ca0fe`。
- A8E：72 个算例；5D、10D、20D 各 9/9 稳定，严格单调门仅 7/9，故 NO-GO；SHA-256 为 `fa454eb4dee6a8d210f24ff2ee2053ead8b9793bd2fc664d1c72cb8ad2d474ee`。
- A8F：36 个矩阵算例与 3 个护栏；正则化 BGK 与 raw BGK 都是冲击 0/9、5D 缓启动 9/9；SHA-256 为 `009d097f15145cdbfa71bb610fba3bdaa5812d826db8e774a00ab273ce7215a9`。
- A8G：288 个算例；16/16 亚格点相位都保持冲击 0/9、5D 缓启动 9/9；SHA-256 为 `5361cd661a5a30c8d6cd4f5b6c0f6f91aa6fcdab0344d8def4d4020c184c188b`。
- A8H：18 个矩阵算例与 3 个护栏；正式核均匀目标初场 9/9 稳定，5D 静止缓启动 0/9；SHA-256 为 `74d953d736aeecc5c17a68f593df2220f36400fa026b6537caf50685d2b7e545`。
- A8I：72 个算例；正式核八档缓启动 0/72，20D 密度与 Mach 门仍失败；SHA-256 为 `b3ecf70dec23d519faaef650fd9af17a0c82ff7a6f2440190fd8f730bace4a23`。
- A8J：72 个算例；无物体仍 0/72，20D 密度偏差 0.148606--0.148615；SHA-256 为 `a1615a5c317cc220f8a313d5b22f9db4f38bd18c301080d939c2dde60d9cf9dc`。

正式源 `02_模拟程序/src/solvers/highFidelity/lbm.ts` 只读导入，SHA-256 为 `6949dd9f215595bde4162078f9cb026456bcbed83fd2ebd08131001e03ec2dc2`。正式理论和正式程序均未修改，CBC 未接入正式核。

## 已收敛的原因边界

1. A8C 的高速度失败不是 CBC 出口独有的误差改善失败；三种出口的共同早期启动密度峰先于圆柱信号到达出口。
2. 候选核的“冲击失败、缓启动通过”分类不依赖正则化 BGK，也不依赖所测 16 个单一圆柱亚格点相位。
3. 候选分类不能转移到正式 MRT--Brinkman 核：正式核在相同高速度角点呈现相反分类。
4. 正式核 20D 缓启动失败不要求 Brinkman 物体存在；A8J 无物体仍为 0/9，故现有速度入口/压力出口启动路径本身已经独立贡献密度失败。
5. 当前证据不能区分速度入口、压力出口、二者特征相容性或有限域瞬态，也不能证明 CBC 一定能修复。

## 已执行验证

- 单元测试：33/33 PASS；
- 严格 TypeScript 静态检查：PASS；
- A8B--A8J 九类冻结 JSON 的机器断言全部 PASS；
- A8D--A8J 各自独立复跑 JSON 均与主证据字节一致；
- A8B 完整回归与冻结 JSON 字节一致，SHA-256 保持 `cdc288be05c882413a29f3912412cad8740c2b1c42b07dafcda60adc0f7ce630`；
- A8C 完整回归 189/189 求解器完成，仍为 54/81 PASS、27/81 FAIL；与冻结 JSON 字节一致，SHA-256 保持 `5cb66d6052f14b2d891841e8282bb5fb2b30f49b007692b09198cd13f94bde98`；
- 5 份实质改写 Markdown 严格 Pandoc 解析、全仓数学分隔符检查和空白扫描通过；主报告、当前交接与验证记录完成 Pandoc+KaTeX 浏览器实际渲染，公式错误、控制台错误和横向溢出均为 0；
- 正式程序 `npm run validate` 未执行：正式程序未修改，本轮只读调用不能写成正式程序全套验证 PASS；
- `tools/check_repository_policy.py` 不存在，仓库治理脚本检查未执行。

## 需要人工裁决的下一步

继续工作会改变数值方法身份，或需要修改受保护正式程序。请在以下路线中裁决：

1. 推荐：仍只在候选区建立正式 MRT 核审计克隆，按“时间依赖入口、出口、物体”逐项替换，先隔离失败机制；不修改正式成果。
2. 授权正式程序新增时间依赖入口和 CBC 边界模式，要求旧 Zou--He 模式保持可回归，再做正式集成矩阵。
3. 保留正式 Zou--He 边界，重新定义与其相容的启动/初场协议，并建立新的数值与物理合同。

裁决前不要继续来源级高分辨率、规定横移长时或 weak-FSI，也不要把候选 A8D/A8F/A8G 的内部 PASS 写成正式核 PASS。
