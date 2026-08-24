#!/usr/bin/env python3
"""Render the phase-4 evidence figure from generated audit artifacts.

The plot is descriptive evidence for the frozen illustrative prior and the
inconclusive 2-D CFD grid study.  It is not an experimental state diagram.
"""

from __future__ import annotations

import csv
import json
from collections import defaultdict
from pathlib import Path

import matplotlib.pyplot as plt


ROOT = Path(__file__).resolve().parent.parent
ARTIFACTS = ROOT.parent / "90_候选工作区/current/验证与复现/artifacts"
REPORT = json.loads((ARTIFACTS / "phase4-structural-baseline.json").read_text())
LONG = json.loads((ARTIFACTS / "phase4-prior-long-run.json").read_text())
GRID = json.loads((ARTIFACTS / "phase3-fixed-cylinder-grid-study.json").read_text())
with (ARTIFACTS / "phase4-linear-spectrum-scan.csv").open(newline="") as handle:
    SCAN = list(csv.DictReader(handle))


plt.rcParams.update({
    "font.size": 9,
    "axes.titlesize": 10,
    "axes.labelsize": 9,
    "legend.fontsize": 8,
    "figure.dpi": 140,
})
fig, axes = plt.subplots(2, 2, figsize=(11.2, 7.2), constrained_layout=True)

# A: local equilibrium spectrum.
ax = axes[0, 0]
reynolds = [float(row["reynolds"]) for row in SCAN]
spectral = [float(row["spectralAbscissa"]) for row in SCAN]
growth = [float(row["wakeGrowthRate"]) for row in SCAN]
ax.plot(reynolds, spectral, lw=1.7, label=r"full zero-state $\max\Re\lambda$")
ax.plot(reynolds, growth, lw=1.25, ls="--", label=r"fixed-body wake $\mu$")
ax.axhline(0, color="black", lw=0.7)
fixed = REPORT["boundariesUnderIllustrativePrior"]["fixedBodyWakeGrowth"]
coupled = REPORT["boundariesUnderIllustrativePrior"]["coupledEquilibrium"]
ax.axvline(fixed["reynolds"], color="#d97706", lw=1, ls=":")
ax.axvline(coupled["point"]["reynolds"], color="#7c3aed", lw=1, ls=":")
ax.set(xlabel="Re", ylabel=r"growth rate [s$^{-1}$]", title="A  Local spectrum of the frozen prior")
ax.set_xlim(0, max(reynolds))
ax.legend(loc="upper left")
ax.text(0.98, 0.04, "not an apparatus threshold", transform=ax.transAxes,
        ha="right", va="bottom", color="#991b1b")

# B: long-run transient versus wake saturation.
ax = axes[0, 1]
times = [sample["time"] for sample in LONG["samples"]]
diameter = LONG["derived"]["cylinderDiameter"]
displacement = [sample["displacement"] / diameter for sample in LONG["samples"]]
wake_amplitude = [sample["wakeAmplitude"] for sample in LONG["samples"]]
ax.plot(times, displacement, color="#0f766e", lw=0.75, label=r"$y/D$")
ax.set(xlabel="time [s]", ylabel=r"$y/D$", title="B  240 s nominal-prior trajectory")
ax2 = ax.twinx()
ax2.plot(times, wake_amplitude, color="#7c3aed", lw=0.8, alpha=0.85, label=r"$|A|$")
ax2.set_ylabel(r"wake amplitude $|A|$")
lines = ax.get_lines() + ax2.get_lines()
ax.legend(lines, [line.get_label() for line in lines], loc="upper right")

# C: late block amplitude gate.
ax = axes[1, 0]
blocks = REPORT["extendedPriorRun"]["stationarityBlocks"]
midpoints = [0.5 * (block["start"] + block["end"]) for block in blocks]
observation_radius = LONG["config"]["geometry"]["observationDistance"]
block_amplitude = [
    block["halfPeakToPeakAngle"] * observation_radius / diameter for block in blocks
]
ax.plot(midpoints, block_amplitude, marker="o", lw=1.4, color="#0369a1")
ax.set(xlabel="block midpoint [s]", ylabel=r"half peak-to-peak $y/D$",
       title="C  Stationarity audit (20 s blocks)")
last_change = abs(block_amplitude[-1] - block_amplitude[-2]) / block_amplitude[-2]
ax.text(0.03, 0.08, f"last-block change = {100*last_change:.2f}%\n1% gate: NOT MET",
        transform=ax.transAxes, color="#991b1b")

# D: unresolved shedding-frequency discriminator.
ax = axes[1, 1]
cells = [entry["diameterCells"] for entry in GRID["entries"]]
strouhal = [entry["qoi"]["strouhal"] for entry in GRID["entries"]]
ax.plot(cells, strouhal, marker="o", lw=1.4, label="2-D CFD grid sequence")
rom_st = REPORT["crossBackendFrequencyDiscriminator"]["romPriorStrouhal"]
ax.axhline(rom_st, color="#d97706", lw=1.3, ls="--", label="ROM literature prior")
ax.set_xticks(cells)
ax.set(xlabel="diameter resolution [cells/D]", ylabel="St",
       title="D  Cross-backend frequency discriminator")
ax.legend(loc="best")
ax.text(0.04, 0.08, "CFD verdict: INCONCLUSIVE", transform=ax.transAxes, color="#991b1b")

figure_dir = ARTIFACTS / "figures"
figure_dir.mkdir(parents=True, exist_ok=True)
fig.suptitle("VP-STRUCT-P0-SL1-v1 — computed evidence with explicit epistemic limits", fontsize=12)
fig.savefig(figure_dir / "phase4-structural-evidence.svg")
fig.savefig(figure_dir / "phase4-structural-evidence.png", dpi=220)
print(figure_dir / "phase4-structural-evidence.svg")
print(figure_dir / "phase4-structural-evidence.png")


# ---------------------------------------------------------------------------
# Independent phase-4 cross-layer evidence figure.
# ---------------------------------------------------------------------------

CROSS_HF = json.loads((ARTIFACTS / "cross-layer/hf-prescribed-response.json").read_text())
CROSS_FORWARD = json.loads((ARTIFACTS / "cross-layer/forward-initial-memory.json").read_text())
with (ARTIFACTS / "cross-layer/forward-initial-memory.csv").open(newline="") as handle:
    FORWARD_TRACE = list(csv.DictReader(handle))

fig2, axes = plt.subplots(2, 2, figsize=(11.2, 7.5), constrained_layout=True)

# A: finite-time initial-condition memory in the forward program.
ax = axes[0, 0]
traces: dict[str, list[dict[str, str]]] = defaultdict(list)
for row in FORWARD_TRACE:
    traces[row["caseId"]].append(row)
colors = {"0p0080": "#2563eb", "0p0096": "#d97706", "0p0110": "#059669"}
for case_id, rows in sorted(traces.items()):
    speed_key = next(key for key in colors if key in case_id)
    start = "hot" if case_id.endswith("hot") else "cold"
    ax.semilogy(
        [float(row["time"]) for row in rows],
        [max(float(row["wakeAmplitude"]), 1e-9) for row in rows],
        color=colors[speed_key],
        ls="--" if start == "hot" else "-",
        lw=1.1,
        label=f"U={speed_key.replace('p', '.')} {start}",
    )
ax.axhline(0.05, color="black", lw=0.7, ls=":", label="declared wake visibility")
ax.set(xlabel="time [s]", ylabel=r"wake amplitude $|A|$",
       title="A  Frozen-prior cold/hot trajectories")
ax.legend(ncol=2, loc="best", fontsize=7)

# B: exact finite-time visibility boundary of the isolated SL radial equation.
ax = axes[0, 1]
visibility = CROSS_FORWARD["isolatedWakeFiniteTimeVisibilityBoundary"]
visibility_points = [point for point in visibility["points"] if point["flowSpeed"] is not None]
ax.semilogx(
    [point["observationTime"] for point in visibility_points],
    [point["flowSpeed"] for point in visibility_points],
    marker="o", lw=1.5, color="#7c3aed", label=r"$V_{obs}(T)$ for $|A|=0.05$",
)
ax.axhline(visibility["fixedWakeGrowthBoundary"], color="#d97706", lw=1.2, ls="--",
           label=r"fixed-wake $mu=0$")
ax.set(xlabel="observation time T [s]", ylabel="flow speed [m/s]",
       title="B  Visibility threshold is protocol-dependent")
ax.legend(loc="best")

# C: prescribed-frequency line power and unresolved residual content.
ax = axes[1, 0]
frequency_cases = CROSS_HF["frequencyResponse"]["cases"]
frequencies = [case["frequency"] for case in frequency_cases]
powers = [case["directMeanLinePowerCoefficient"] for case in frequency_cases]
residuals = [case["residualFraction"] for case in frequency_cases]
ax.plot(frequencies, powers, marker="o", lw=1.5, color="#0f766e", label=r"mean $C_{P,2D}'$")
ax.axhline(0, color="black", lw=0.7)
ax.set(xlabel="prescribed frequency [Hz]", ylabel=r"mean line-power coefficient",
       title="C  Coarse prescribed-motion response")
ax2 = ax.twinx()
ax2.plot(frequencies, residuals, marker="s", ls="--", lw=1.1, color="#b91c1c",
         label="force residual fraction")
ax2.set_ylabel("single-harmonic residual fraction")
lines = ax.get_lines()[:1] + ax2.get_lines()
ax.legend(lines, [line.get_label() for line in lines], loc="lower right")

# D: complex lift transfer. Its imaginary part carries the first-harmonic work sign.
ax = axes[1, 1]
frequency_ids = {case["id"] for case in frequency_cases}
for entry in CROSS_HF["entries"]:
    if entry["case"]["id"] not in frequency_ids:
        continue
    transfer = entry["response"]["dimensionless"]["complexLiftTransferPerDisplacementOverDiameter"]
    ax.scatter(transfer["real"], transfer["imaginary"], s=35)
    ax.annotate(f'{entry["case"]["frequency"]:.2f} Hz',
                (transfer["real"], transfer["imaginary"]), xytext=(4, 4),
                textcoords="offset points", fontsize=8)
ax.axhline(0, color="black", lw=0.7)
ax.axvline(0, color="black", lw=0.7)
ax.set(xlabel=r"Re[$\hat C_L/(\hat y/D)$]", ylabel=r"Im[$\hat C_L/(\hat y/D)$]",
       title="D  Exploratory complex line-load transfer")
ax.text(0.03, 0.05, "Im > 0: positive first-harmonic work",
        transform=ax.transAxes, color="#166534")

fig2.suptitle(
    "VP-STRUCT-CROSS-LAYER-v1 — uncalibrated ROM and unresolved D/8 CFD evidence",
    fontsize=12,
)
fig2.savefig(figure_dir / "phase4-cross-layer-evidence.svg")
fig2.savefig(figure_dir / "phase4-cross-layer-evidence.png", dpi=220)
print(figure_dir / "phase4-cross-layer-evidence.svg")
print(figure_dir / "phase4-cross-layer-evidence.png")
