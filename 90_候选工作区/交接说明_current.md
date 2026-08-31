# 当前交接

## 当前状态

用户报告 A8R v2.1 冻结八轨迹主运行已持续约 12 小时，前四条完成，正在第五条，
观测约 127% CPU、11 个线程；规范主 gzip 和 sidecar 尚未生成。该实时进程状态
不能由 GitHub 直接核验，必须按最新裁决先在运行主机固化机器证据。

当前状态更新为：

`A8R_PRIMARY_RUN_LIVE_PAUSE_AUTHORIZED_PENDING_RESULT_BLIND_PARALLEL_SPEED_GATE`

先前交接中“尚未执行任何八轨迹研究算例”的表述已被实时运行事实取代，但当前仍无
规范 A8R 主产物，也不存在可审查的数值 PASS、INCONCLUSIVE 或 NO-GO。

## 最新独立 Pro 裁决

裁决文件：

`90_候选工作区/current/A8_二维特征开放边界实验后端/31_A8R_v2_1_长时主运行安全暂停与结果盲轨迹并行裁决.md`

- 裁决提交：`ffa9b115141bd7c7fadf942f17676d7c65f0a5d6`；
- 裁决文件 SHA-256：`6b8e97f031025cd012203b3bdf4146f4aba37c9e46756f271f6c2aec19a63765`；
- 审查基线：`88c4e9e8ba57b02a06315679e9b30dd10999b30c`。

裁决码：

- `PAUSE-A8R-V2P1-PRO-CURRENT-PRIMARY-RUN-REVERSIBLY-NOW`；
- `UNLOCK-A8R-V2P1-PRO-RESULT-BLIND-PROCESS-LEVEL-TRAJECTORY-PARALLELIZATION-ONLY`；
- `REQUIRE-A8R-V2P1-PRO-MEASURED-NET-SPEED-MEMORY-AND-BYTE-IDENTITY-GATES-BEFORE-TERMINATION`；
- `FORBID-A8R-V2P1-PRO-GPU-INTRACASE-NUMERIC-SCIENTIFIC-OR-THRESHOLD-CHANGES`；
- `KEEP-A8R-V2P1-PRO-RESULT-CLAIMS-FORMAL-INTEGRATION-AND-DOWNSTREAM-LOCKED`。

独立核验表明当前八轨迹由同步 `.map()` 严格串行执行。前四条只占冻结格点更新代理
总量的 `16.11047181%`；即使第五条几乎完成，仍至少剩余三条完整 D54，等于全矩阵
工作量的 `62.91714614%`。现有程序在八条全部完成前不写规范 gzip/sidecar，也没有
足以恢复 trace、逐步力身份、窗口和周期证据的持久 checkpoint。

## 下一步唯一固定顺序

### 1. 立即保全并可逆暂停

在旧运行工作区不 pull、不改文件、不 attach 调试器：

1. 记录目标作业完整 PID/PPID/PGID/SID、启动身份、命令、cwd、exe、线程、CPU、
   `VmRSS`、`VmHWM`、affinity、cgroup、内存和 swap；
2. 记录日志路径、字节数、SHA-256、最后一条纯进度行以及第五条
   `completedSteps/86400`；
3. 核验工作区来源身份、规范 gzip、sidecar、`.partial-*` 和相关打开文件；
4. 若规范产物尚未出现，暂停专用进程组或完整目标进程树并证明 CPU 与日志停止增长；
5. 只允许 `SIGSTOP` 作为第一步；不得先发送 `SIGTERM`、`SIGKILL`、导出 heap 或
   尝试抢救内存对象。

如果规范 gzip/sidecar 已出现或正在最终写入，停止本路线，保全现场并交回 Pro。

### 2. 在独立克隆建立结果盲轨迹级多进程候选

只允许新增父调度器、单轨迹 worker、隔离临时传输、清理、性能探针、测试和来源绑定。
每个 worker 必须继续调用未改动的单算例函数，从 step 0 和新鲜初态开始。父进程按
冻结矩阵索引收集并调用现有汇总；完成时序、PID、worker 数和计时不得进入科学结果。

禁止 GPU、单轨迹内部多线程、格点域分解、共享内存归约、SIMD 内核替换，以及修改
正式 `lbm.ts`、合同、合同测试、矩阵、分辨率、mask、相位、窗口、控制体、人口
恒等式、A2 公式、门值或科学字段。

### 3. 执行来源、字节、内存和显著净提速门

必须按裁决文件完整执行。核心终止门为：

- 1-worker 子进程路径与原同步双 40 步烟雾规范 JSON 逐字节一致；
- 不同 worker 完成顺序仍给出逐字节一致的冻结排序；
- 任一缺失、重复、中断或预存产物均不得生成规范 gzip/sidecar；
- 既有 97 项回归、新测试、TypeScript、Node 语法和新来源前置门全部通过；
- 2、3、4 worker 依次受物理内存、`MemAvailable`、`VmHWM`、swap 和 OOM 门约束；
- 从暂停到优化完成的实际时间计入成本，保守预计从头并行重跑必须满足

$$
T_{\mathrm{restart},W}\le 0.80\,T_{\mathrm{resume}}.
$$

### 4. 按性能门二分

若没有任何 worker 数通过全部门：

- 不提交并行候选源码；
- 保留失败性能证据；
- 对原作业发送 `SIGCONT`，证明它从同一第五条进度继续；
- 旧运行继续完成主产物和原冻结独立复跑。

若至少一个 worker 数通过全部门：

- 保存暂停与性能证据；
- 对 stopped 旧作业发送 `SIGTERM` 后 `SIGCONT`，必要时才 `SIGKILL`；
- 证明旧进程树退出且没有规范或临时主产物；
- 把结果盲并行实现作为独立提交推送；
- 从该实现提交重新建立两个独立干净环境；
- 主运行和完整复跑都从第一条轨迹、新鲜初态开始，不复用当前四条、第五条、旧
  checkpoint、临时结果或 inode；
- 完成规范 gzip/sidecar 逐字节复跑断言后停止并再次交回 Pro。

现有第二环境
`/home/cjt/.codex/tmp/iypt13-a8r-repeat-HyC6La`
只有在恢复旧串行实现时继续有效；若并行实现通过并提交，它只保留为历史证据，必须
为新实现重新建立独立复跑环境。

## 结果前身份与锁定

当前结果前科学身份仍为：

- 授权实现提交：`a298ee2976cbfd3738fc4ba17cdb52189b1e0da6`；
- 静态实现树 SHA-256：`6b11ea23cca5b514c5d2a4f8d34ea11f3202e5c92434b567a828c2fa1f03579f`；
- 正式烟雾实现提交：`9811120482a387158115e4e5565bd25a50bf2e3b`；
- 冻结 A8Q gzip SHA-256：`022cc54704ac542b5c148eed5ce026f5701ae79d50426ec3417073f1148ef451`。

继续锁定：

- `01_最终理论/**` 与 `02_模拟程序/**`；
- A8Q 科学证据和 A8R v2.1 科学合同、合同测试及全部科学门；
- 正式接入、连续载荷、锐界面、无滑移、Richardson、GCI；
- 规定横移、weak-FSI、三维、自由表面；
- 装置预测、实验拟合和实验验证；
- 根据任何已见部分结果修改参数、阈值或选择路线。

## 当前结论上限与长期终点

当前只形成性能治理结论：应先安全、可逆暂停，并只评估轨迹级独立进程并行。尚未
证明主机一定能安全多进程，也没有 A8R 数值或物理结论。

A8R 终局完成后，必须继续总审计所有尚可在无实验条件下执行的任务。只有这些任务
均已完成、明确 NO-GO，或被证明必须依赖新实验数据时，才能把仓库状态设为：

`EXPERIMENT_PREPARATION_PAUSE_READY_NO_EXECUTABLE_NONEXPERIMENTAL_TASKS`
