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
