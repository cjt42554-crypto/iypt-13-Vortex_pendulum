# 前向程序对齐验收记录

13-00—13-05 的有限实现及软件、数值和合成验收已完成。**科学结论仍为 NONE；二维 CFD 仅作定性参考。** 当前接续见 [current](../../../00_项目管理/交接说明_current.md)。

程序改动从 `2ec36bf67fd637bee08f8ddf7286aa8852c9666b` 开始，正式实现提交为 `0ce3ff72fb6065a389b1b7e657dac1f558f0dbbb`。最终验收版本 `1239b8774cf42442230ceed7ee1fd7e6d97bba10` 仅在其后修正测试资源与等待预算。源码、测试及输入样例以这些 Git 提交为准；已入提交的重复补丁不再留在工作树。[原环境记录](final-environment.json) 中的历史 `source.patch` 字段可在精简前提交 `386cb63` 查取。

## 保留证据

| 内容 | 证据 |
| --- | --- |
| 完整本地验证 | [validate-first.log](validate-first.log)：27 文件、170 项测试，构建、桌面、浏览器及数学检查通过 |
| 完整远端验证 | [ci-success.log](ci-success.log)、[三项 CI 回执](ci-results.json)：程序工作流 2 分 38 秒通过，默认浏览器计算 22.57 s，无控制台错误 |
| 文档检查器 | [docs-unittest.log](docs-unittest.log)：16 项通过 |
| 湿区事件独立参考 | [full-immersion-correction.log](13-00/full-immersion-correction.log)：支撑平面及机械 RK4 参考 0.01636020675 s，生产误差约 5.6e-9 s |
| v2 输入与冻结 | [最终冻结集](13-01/aligned-frozen-final/)、[构建命令](13-01/build-final.log)、[运行命令](13-01/run-final-corrected.log)、[正式结果](13-01/aligned-result.json) |
| 辨识与 UQ | [辨识命令](13-04/identification-cli.log)、[辨识报告](13-04/identification-report.json)、[传播命令](13-04/uncertainty-cli.log)、[传播报告](13-04/uncertainty-report.json) |

源级回归固定种子及参考：120 组复规范、180 组独立方向几何、150 组笛卡尔力矩、SS 解析停转/脱粘及四档时间细化、128 个小噪声相关样本和 24 个跨模式情景。四分支及真实页面/Worker/CLI/导出一致，SS-DW 最大物理差异约 1.2e-16。具体阈值和算法见正式测试及 [验收依据](https://github.com/cjt42554-crypto/iypt-13-Vortex_pendulum/blob/7f4081ca4793aa55cb5ebcbabcec379fa5b69a02/00_项目管理/理论程序对齐_任务单与验收.md)，不以本摘要替代它们。

## 关键失败与边界

- [整合首轮失败](integration-full-tests.log)：并发超时及旧全湿时间预期；独立几何参考修正后通过，物理误差界未放宽。
- [第一次 CI 失败](ci-first-failure.log)：159 项通过、11 项墙钟超时，能量细化约 73.5 s、步内干区参考约 30.2 s。
- [第二次 CI 失败](ci-second-failure.log)：170 项测试、构建与桌面通过，页面 20 s 到期时仍为 running、Worker 存在、无控制台错误。依据实际耗时将 CI 设为单 worker、默认测试看门狗 30 s、数值参考 60/120 s、前向页面等待 60 s；本地 4 worker、页面等待 20 s。模型、积分设置和断言未改，一般间歇超时机制仍未完全定位。
- 早期 `aligned-frozen/` 试跑的输入字节未单独保存，已从工作树移除；最终可复算证据使用 `aligned-frozen-final/`。重复单项通过日志、导出 CSV 和过程补丁可从精简前 Git 版本查阅，不再平行维护。
- v1 文件迁移只在完整声明下作常数实缩放；一般复规范的联合协方差转换使用配置 API。缺完整矩阵时不声称完整 UQ。

原始日志保留工具输出空白，本目录 `.gitattributes` 仅豁免日志的空白风格检查。真实实验、实测标定/留出、大型 CFD/GPU 均未运行。无限切换、任意守卫完备性、再入水和未建模水动力仍是科学限制。
