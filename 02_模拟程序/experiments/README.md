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


## 联合标定域（2026-09-05 修订）

`calibrationDomain` 的四个边际范围仍用于快速越界检查，但不再自动形成合法的笛卡尔积。正式系数包还必须填写 `calibrationDomain.jointSupport`：

- `kind: "covered-cells"`：`cells` 是明确覆盖的联合单元列表。每个单元都要给出 `flowSpeedMps`、`waterDepthM`、`pivotHeightM`、`reynolds` 的 `minimum` / `maximum`，且不能超出边际范围。候选工况必须完整落入同一个单元；不自动补凸包，也不跨过覆盖空洞。
- `kind: "validated-box"`：只有整个边际矩形域确有独立支持时才使用；不是旧系数包的默认迁移方式。

两种类型都必须提供非空 `evidence`，指向实际标定设计、覆盖检验或其记录。软件只验证声明的结构和成员关系，不自动证明该证据真实、充分或具有物理效力。几何及工况中的 Re 仍由装置半径、黏度与流速重算。

待填写模板使用 `{"kind":"covered-cells","evidence":null,"cells":[]}`，因此不能用于正式发布。历史仅含边际范围的系数包会被拒绝，需根据真实覆盖情况迁移；自动化 fixture 中的矩形域明确只是合成测试，不是装置标定。
