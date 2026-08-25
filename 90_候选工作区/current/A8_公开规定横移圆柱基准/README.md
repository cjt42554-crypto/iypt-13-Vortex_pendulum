# A8 公开规定横移圆柱基准候选包

本目录在不修改正式程序的前提下，对 `VP-HF-CFD2D-v1` 的 A2 修正取力进行公开固定/规定横移圆柱筛查。它针对 A-08，并为 A-09 建立输入与指标链；它不是 DFG 2D-2，因此不会借名将 A-04 标为通过。

## 一级来源

1. E. Guilmineau and P. Queutey, [A Numerical Simulation of Vortex Shedding from an Oscillating Circular Cylinder](https://doi.org/10.1006/jfls.2002.0449), *Journal of Fluids and Structures* 16 (2002), 773–794。这是 $Re=185$、$A_e/D=0.2$ 横向规定振荡的原始主基准。
2. J. Wang, F. Wu, Q. Xu and L. Tan, [Local Inverse Mapping Implicit Hole-Cutting Method for Structured Cartesian Overset Grid Assembly](https://doi.org/10.3390/e25030432), *Entropy* 25 (2023), 432。该开放论文给出了域、初始化、固定圆柱表和 $f_e/f_0=0.8,1.1$ 的规定运动数值表，并列出 Guilmineau–Queutey 原值与多代码比较。

## 冻结合同

基准 ID：`VP-CFD2D-A8-GUILMINEAU-RE185-v1`。

共同输入：

- $Re=185$；
- 文献固定圆柱 $St_0=0.195$；
- 规定位移

$$
\frac{y(t)}{D}=0.2\sin(2\pi f_e t)
$$

- $f_e/f_0=0.8$ 和 $1.1$；
- 数值域 $23D\times10D$，圆心距入口 $3.5D$；
- 先运行固定圆柱，尾流成熟后复制检查点并启动规定横移；
- 力系数使用 A2 半步体力虚拟内部流体修正反力。

系数定义为

$$
C_D=\frac{F'_x}{\frac{1}{2}\rho U^2D},
\qquad
C_L=\frac{F'_y}{\frac{1}{2}\rho U^2D}
$$

对照项为 $\bar{C}_D$、阻力波动 RMS、$C_{L,\mathrm{rms}}$ 和固定圆柱 $St$。数值容差在 `src/benchmark-contract.ts` 中预先冻结，不按运行结果临时改门。

## 与来源的已知差异

- 当前后端使用均匀 Cartesian 网格，来源在圆柱附近使用贴体/重叠细化网格；
- 当前圆柱是弥散 Brinkman 边界，来源是锐界面无滑移表面；
- 当前横向为周期边界，开放复现来源使用顶/底非反射边界；
- 来源后续算例的局部网格达 $N_D=50$，当前筛查只运行 $N_D=8,12,16$。

因此本包最多给出“文献容差筛查”，不会直接给出完整 A-09 PASS。

## 运行

纯指标/合同测试：

```bash
cd 90_候选工作区/current/A8_公开规定横移圆柱基准
npm test
```

从正式程序目录运行低成本 smoke：

```bash
cd 02_模拟程序
npm exec vite-node -- \
  ../90_候选工作区/current/A8_公开规定横移圆柱基准/scripts/run-benchmark.ts \
  --profile=smoke
```

三网格定量筛查：

```bash
npm exec vite-node -- \
  ../90_候选工作区/current/A8_公开规定横移圆柱基准/scripts/run-benchmark.ts \
  --profile=screening
```

`screening` 在一个 Mach 档运行 $N_D=8,12,16$；若最细网格仍不进入文献容差，则失败闭锁，不继续消耗算力运行完整 Mach、域、格点相位与 GCI 矩阵。

## 当前实测状态

- 合同/指标测试：4/4 PASS；
- smoke：`PASS-A8-SMOKE-QUANTITATIVE-SCREENING-NOT-RUN`；
- screening：`NO-GO-A8-FIXED-REFERENCE-MISMATCH`；
- $N_D=16$ 的固定圆柱结果为 $\bar{C}_D=1.84484$、$C_{L,\mathrm{rms}}=0.63933$、$St=0.19925$；
- $St$ 进入冻结文献容差，但阻力和升力 RMS 分别比目标高 0.55784 和 0.19633；
- 固定尾流成熟门与数值稳定门通过，因此当前失败归因于载荷幅值/曲壁数值资格，不是统计窗或运行崩溃；
- 按冻结闭锁，定量 $f_e/f_0=0.8,1.1$ 长时分支未运行；smoke 已证明该分支的运动和取力链可达。

完整机器可读输出见：

- `验证与复现/artifacts/a8-public-benchmark-smoke.json`；
- `验证与复现/artifacts/a8-public-benchmark-screening.json`。

## 结论边界

本基准只检查二维规定运动载荷。它不验证三维有限湿跨、自由表面、代表条带闭合、weak-FSI、水槽或实物装置。
