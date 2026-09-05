# 实验输入到冻结前向配置

本目录保存正式程序的待填写输入模板。模板不是测量、标定或预测证据；所有空值均表示真实实验依赖尚未满足。

正式发布命令为：

```bash
npm run prepare:forward-configs -- \
  --plan experiments/templates/prediction-plan.template.json \
  --apparatus experiments/templates/apparatus-calibrated.template.json \
  --coefficients experiments/templates/rom-coefficient-package.template.json \
  --base-config public/examples/vortex-pendulum-default.json \
  --output-dir /path/to/new-frozen-config-set \
  --provenance-root /path/to/input-root
```

发布器先验证预测计划、装置记录、ROM 系数包、所有标定与留出工况，以及最终 `SimulationConfig`。任一项失败时不会创建结果目录。通过后，整组配置在同一文件系统内一次可见，并生成：

- 每个原始输入文件的字节数与 SHA-256；
- 每个输出配置的 canonical SHA-256 与实际落盘字节 SHA-256；
- 绑定上述输出的 `manifest.json`；
- 绑定 manifest 的 `COMMITTED.json`。

读取结果时必须运行同一套校验或调用 `verifyJsonArtifactSet`，不能仅以目录存在作为成功证据。`--allow-synthetic` 只用于自动化测试，生产发布不得使用。


## 正式 v2 身份与联合标定域

`calibrationDomain` 的八个边际范围用于快速越界检查，但不再自动形成合法的笛卡尔积。正式系数包还必须填写 `calibrationDomain.jointSupport`：

- `kind: "covered-cells"`：`cells` 是明确覆盖的联合单元列表。每个单元都要给出 `flowSpeedMps`、`waterDepthM`、`pivotHeightM`、`reynolds`、`wetSpanM`、`absThetaRad`、`velocityRatio`、`normalizedInflowRate` 的 `minimum` / `maximum`，且不能超出边际范围。候选工况必须完整落入同一个单元；不自动补凸包，也不跨过覆盖空洞。
- `kind: "validated-box"`：只有整个边际矩形域确有独立支持时才使用；不是旧系数包的默认迁移方式。

两种类型都必须提供非空 `evidence`，指向实际标定设计、覆盖检验或其记录。软件只验证声明的结构和成员关系，不自动证明该证据真实、充分或具有物理效力。几何及工况中的 Re 仍由装置半径、黏度与流速重算。

待填写模板使用 `{"kind":"covered-cells","evidence":null,"cells":[]}`，因此不能用于正式发布。历史仅含边际范围的系数包会被拒绝，需根据真实覆盖情况迁移；自动化 fixture 中的矩形域明确只是合成测试，不是装置标定。


v2 模板固定参考坐标 `C_L_ref=2Re(A)`，输出为无量纲截面系数，跨距相干因子另行标定。`calibrationMinWetSpan` 的单位是 m，定义为 `streamwise-projected-area-over-diameter`，其下界来自独立覆盖证据。运行中的全部 RK 阶段和密集事件检查都受该联合域限制。首次失去覆盖或全干终止；初始非法时没有有效样本。

`modelId` 允许基线、SS、DW、SS-DW；`wakeGauge.modelId` 必须匹配。SS 的静/动阈值从装置记录生成，替换平滑摩擦；DW 仅替换阻力宽度。模型增量输入缺失时生成失败，不从默认值猜测。

## 旧包与坐标转换

旧 v1 包保留历史/明确合成回读，不能直接发布为新协议的装置定量配置。`src/experiments/migration.ts` 的 `migrateLegacyCoefficientPackage` 要求显式源规范、独立湿区声明、新包和新计划身份；不会从旧字段猜测它们。历史只有边际不确定度时仅支持常数实缩放；复旋转需要完整联合协方差，使用 `convertWakeGaugeConfig` 同时转换。

[等价新旧合成样例](examples/synthetic-alignment/) 给出源包、源计划、完整声明、转换请求及 v2 输出。其 `A_new=A_old/2`，强迫和初态减半、立方系数乘四、输出乘二；相干因子独立保留。缺元数据、时间变化规范或零输出通道的自动转换被拒绝。规范转换不证明参数可辨识，也不补出缺失的协方差。

## 辨识与联合不确定度

```bash
npm run diagnose:identifiability -- \
  --input experiments/examples/synthetic-alignment/identification-design.json \
  --output /tmp/vortex-identification-report.json

npm run analyze:uncertainty -- \
  --config experiments/examples/synthetic-alignment/uncertainty-config.json \
  --samples 32 --seed 20260905 \
  --output /tmp/vortex-uncertainty-report.json
```

这两个输出路径必须尚不存在，避免覆盖证据。辨识输入明确标注 `dataRole=calibration`、来源身份和尾流规范，可以提供规定运动的 `theta,omega,acceleration` 或实际灵敏度的 `columns,rows,weights`。报告仅给所提供设计的秩和相关性；未包括未知初始尾流灵敏度时明确显示未解决。不能把观测谱峰直接填成尾流线性频率。

完整协方差放在 v2 系数包 `jointUncertainty` 中，或用 `jointUncertaintyByCondition` 按工况绑定。二者不同时填写；初态不同不能复用不匹配的均值。`wakeGauge.covarianceIdentity` 绑定矩阵的 `basisId`。矩阵保留装置、系数、初态交叉项和各参数的单位/角色，允许奇异半正定；已边际化的装置误差不能再加一遍。没有联合矩阵仍可运行确定性预测，但不能称已给出完整不确定度。

传播报告保留全部样本的分类与参数值。完整预测、物理终止、输入拒绝、脱粘与未脱粘分别计数；只对完成样本给出的数值统计明确写有条件和总分母。线性传播只用于无事件平滑邻域，跨分支不报告整体高斯结果。`scenario-envelope` 表示相关情景包络，不能称置信区间。正式残差应调用 `residualVariance` 纳入观测与预测的共享交叉误差。
