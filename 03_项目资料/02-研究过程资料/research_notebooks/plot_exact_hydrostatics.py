#!/usr/bin/env python3
"""Generate an exact finite-radius hydrostatics cross-check figure.

The geometry is the published one-axis rotational pendulum topology: the pivot
axis is streamwise, the cylinder is vertical at theta=0, and its circular cross
sections cut a planar free surface as it tilts.  When the waterline transition
does not meet either end cap, Cavalieri/Fubini integration gives an exact volume
identity with the centreline model, while the buoyancy torque retains a finite-
radius waterplane correction.  The calculation is geometric; it does not
include free-surface deformation or dynamic pressure.
"""

from __future__ import annotations

import json
import math
from pathlib import Path

import matplotlib.pyplot as plt
import numpy as np
from scipy.integrate import quad


ROOT = Path(__file__).resolve().parents[1]
FIGURE_DIR = ROOT / "artifacts" / "figures"
DATA_DIR = ROOT / "artifacts" / "data"


def segment_area_and_moment(radius: float, eta: np.ndarray) -> tuple[np.ndarray, np.ndarray]:
    """Return A and integral(v dA) for the submerged part v/R <= eta."""
    area = np.empty_like(eta)
    moment = np.zeros_like(eta)
    dry = eta <= -1.0
    wet = eta >= 1.0
    partial = ~(dry | wet)
    area[dry] = 0.0
    area[wet] = math.pi * radius**2
    clipped = eta[partial]
    area[partial] = radius**2 * (
        np.arccos(-clipped) + clipped * np.sqrt(1.0 - clipped**2)
    )
    moment[partial] = -2.0 / 3.0 * radius**3 * (1.0 - clipped**2) ** 1.5
    return area, moment


def exact_hydrostatics(
    theta: float,
    radius: float,
    pivot_height: float,
    s_top: float,
    s_bottom: float,
    density: float,
    gravity: float,
    nodes: np.ndarray,
    weights: np.ndarray,
) -> tuple[float, float]:
    s = (s_bottom - s_top) * (nodes + 1.0) / 2.0 + s_top
    jacobian = (s_bottom - s_top) / 2.0
    sine = math.sin(theta)
    cosine = math.cos(theta)
    kappa = abs(sine)

    if kappa < 1e-12:
        area = np.where(pivot_height - s * cosine < 0.0, math.pi * radius**2, 0.0)
        first_moment = np.zeros_like(area)
        projected_vertical_y = 0.0
    else:
        eta = (s * cosine - pivot_height) / (radius * kappa)
        area, first_moment = segment_area_and_moment(radius, eta)
        projected_vertical_y = math.copysign(cosine, sine)

    volume = jacobian * np.sum(weights * area)
    y_first_volume_moment = jacobian * np.sum(
        weights * (s * sine * area + projected_vertical_y * first_moment)
    )
    torque = density * gravity * y_first_volume_moment
    return float(volume), float(torque)


def exact_hydrostatics_adaptive(
    theta: float,
    radius: float,
    pivot_height: float,
    s_top: float,
    s_bottom: float,
    density: float,
    gravity: float,
) -> tuple[float, float]:
    """Adaptive reference integral resolving the O(R*abs(theta)) waterline layer."""
    sine = math.sin(theta)
    cosine = math.cos(theta)
    kappa = abs(sine)
    if kappa < 1e-14:
        lower = min(max(pivot_height / cosine, s_top), s_bottom)
        return math.pi * radius**2 * (s_bottom - lower), 0.0

    projected_vertical_y = math.copysign(cosine, sine)

    def sectional(s: float) -> tuple[float, float]:
        eta = np.array([(s * cosine - pivot_height) / (radius * kappa)])
        area, first_moment = segment_area_and_moment(radius, eta)
        return float(area[0]), float(first_moment[0])

    points = [s_top, s_bottom]
    if cosine > 0.0:
        for candidate in (
            (pivot_height - radius * kappa) / cosine,
            (pivot_height + radius * kappa) / cosine,
        ):
            if s_top < candidate < s_bottom:
                points.append(candidate)
    points = sorted(set(points))

    volume = 0.0
    y_first_volume_moment = 0.0
    for left, right in zip(points[:-1], points[1:]):
        volume += quad(
            lambda s: sectional(s)[0],
            left,
            right,
            epsabs=2e-14,
            epsrel=2e-12,
            limit=200,
        )[0]
        y_first_volume_moment += quad(
            lambda s: (
                s * sine * sectional(s)[0]
                + projected_vertical_y * sectional(s)[1]
            ),
            left,
            right,
            epsabs=2e-14,
            epsrel=2e-12,
            limit=200,
        )[0]
    return volume, density * gravity * y_first_volume_moment


def slender_hydrostatics(
    theta: float,
    radius: float,
    pivot_height: float,
    s_top: float,
    s_bottom: float,
    density: float,
    gravity: float,
) -> tuple[float, float]:
    cosine = math.cos(theta)
    if cosine <= 0:
        return 0.0, 0.0
    waterline = pivot_height / cosine
    lower = min(max(waterline, s_top), s_bottom)
    area = math.pi * radius**2
    volume = area * (s_bottom - lower)
    torque = (
        density
        * gravity
        * area
        * math.sin(theta)
        * (s_bottom**2 - lower**2)
        / 2.0
    )
    return volume, torque


def main() -> None:
    plt.rcParams["font.sans-serif"] = ["Noto Sans CJK JP", "DejaVu Sans"]
    plt.rcParams["axes.unicode_minus"] = False
    radius = 0.025
    pivot_height = 0.100
    s_top = 0.0
    s_bottom = 0.720
    density = 998.2
    gravity = 9.80665
    nodes, weights = np.polynomial.legendre.leggauss(600)
    angles = np.linspace(-0.75, 0.75, 301)

    exact = np.array([
        exact_hydrostatics_adaptive(
            angle,
            radius,
            pivot_height,
            s_top,
            s_bottom,
            density,
            gravity,
        )
        for angle in angles
    ])
    slender = np.array([
        slender_hydrostatics(
            angle,
            radius,
            pivot_height,
            s_top,
            s_bottom,
            density,
            gravity,
        )
        for angle in angles
    ])

    area = math.pi * radius**2
    reference_volume = area * (s_bottom - pivot_height)
    reference_moment_scale = (
        density * gravity * area * (s_bottom**2 - pivot_height**2) / 2.0
    )
    waterplane_second_moment = math.pi * radius**4 / 4.0
    exact_linear_coefficient = density * gravity * (
        area * (s_bottom**2 - pivot_height**2) / 2.0
        - waterplane_second_moment
    )
    slender_linear_coefficient = reference_moment_scale

    small_angle = 1.0e-4
    _, positive_torque = exact_hydrostatics_adaptive(
        small_angle,
        radius,
        pivot_height,
        s_top,
        s_bottom,
        density,
        gravity,
    )
    _, negative_torque = exact_hydrostatics_adaptive(
        -small_angle,
        radius,
        pivot_height,
        s_top,
        s_bottom,
        density,
        gravity,
    )
    numerical_linear_coefficient = (positive_torque - negative_torque) / (2 * small_angle)

    FIGURE_DIR.mkdir(parents=True, exist_ok=True)
    DATA_DIR.mkdir(parents=True, exist_ok=True)

    # In the present angle interval the entire oblique waterline band lies on
    # the lateral surface.  Direct integration over the circular section then
    # yields the following closed-form finite-radius torque correction:
    #
    #   Q_exact - Q_axis
    #       = -rho*g*I_wp*sin(theta)*(1 + tan(theta)^2/2).
    #
    # The volume correction is exactly zero because the first moment of a
    # centred circular section vanishes.  Both identities are checked below
    # against the adaptive sectional integral rather than merely plotted.
    analytic_torque_difference = (
        -density
        * gravity
        * waterplane_second_moment
        * np.sin(angles)
        * (1.0 + 0.5 * np.tan(angles) ** 2)
    )
    numerical_torque_difference = exact[:, 1] - slender[:, 1]
    volume_difference = exact[:, 0] - slender[:, 0]
    difference_scale = density * gravity * waterplane_second_moment

    fig, axes = plt.subplots(3, 1, figsize=(8.6, 10.2), sharex=True)
    axes[0].plot(angles, exact[:, 0] / reference_volume, label="有限半径精确截水", lw=2.2)
    axes[0].plot(angles, slender[:, 0] / reference_volume, "--", label="中心轴细长近似", lw=1.8)
    axes[0].set_ylabel(r"$V_w/V_w(0)$")
    axes[0].grid(alpha=0.25)
    axes[0].legend()
    axes[0].text(
        0.02,
        0.06,
        r"本角度域内 $V_{w,\mathrm{exact}}=V_{w,\mathrm{axis}}$（积分恒等式）",
        transform=axes[0].transAxes,
        fontsize=9.5,
    )

    axes[1].plot(angles, exact[:, 1] / reference_moment_scale, label="有限半径精确浮力矩", lw=2.2)
    axes[1].plot(angles, slender[:, 1] / reference_moment_scale, "--", label="细长近似浮力矩", lw=1.8)
    axes[1].set_ylabel(r"$Q_B/[\rho g A(s_b^2-h_p^2)/2]$")
    axes[1].grid(alpha=0.25)
    axes[1].legend()

    axes[2].plot(
        angles,
        numerical_torque_difference / difference_scale,
        label="自适应截面积分",
        lw=2.2,
    )
    axes[2].plot(
        angles,
        analytic_torque_difference / difference_scale,
        "--",
        label=r"闭式 $-\sin\theta(1+\tan^2\theta/2)$",
        lw=1.8,
    )
    axes[2].axhline(0.0, color="0.35", lw=0.8)
    axes[2].set_xlabel(r"摆角 $\theta$ / rad")
    axes[2].set_ylabel(r"$(Q_{B,\mathrm{exact}}-Q_{B,\mathrm{axis}})/(\rho g I_{wp})$")
    axes[2].grid(alpha=0.25)
    axes[2].legend()
    fig.suptitle("倾斜表面贯穿圆柱：精确静水几何与细长近似")
    fig.tight_layout()
    fig.savefig(FIGURE_DIR / "exact-hydrostatics-vs-slender.svg")
    fig.savefig(FIGURE_DIR / "exact-hydrostatics-vs-slender.png", dpi=220)
    plt.close(fig)

    table = np.column_stack(
        (
            angles,
            exact,
            slender,
            volume_difference,
            numerical_torque_difference,
            analytic_torque_difference,
        )
    )
    np.savetxt(
        DATA_DIR / "exact-hydrostatics-vs-slender.csv",
        table,
        delimiter=",",
        header=(
            "theta_rad,exact_volume_m3,exact_buoyancy_torque_Nm,"
            "slender_volume_m3,slender_buoyancy_torque_Nm,"
            "volume_difference_m3,numerical_torque_difference_Nm,"
            "analytic_torque_difference_Nm"
        ),
        comments="",
    )
    summary = {
        "geometry": {
            "radius_m": radius,
            "pivot_height_m": pivot_height,
            "s_top_m": s_top,
            "s_bottom_m": s_bottom,
        },
        "plot_quadrature": "adaptive Gauss-Kronrod with waterline breakpoints",
        "small_angle_rad": small_angle,
        "exact_linear_buoyancy_torque_coefficient_Nm_per_rad": exact_linear_coefficient,
        "slender_linear_buoyancy_torque_coefficient_Nm_per_rad": slender_linear_coefficient,
        "numerical_linear_buoyancy_torque_coefficient_Nm_per_rad": numerical_linear_coefficient,
        "relative_symbolic_numeric_error": abs(
            numerical_linear_coefficient - exact_linear_coefficient
        ) / abs(exact_linear_coefficient),
        "waterplane_second_moment_m4": waterplane_second_moment,
        "closed_form_validity": (
            "waterline transition lies wholly on the lateral surface; "
            "neither end cap intersects the transition band"
        ),
        "volume_identity": "V_exact = V_axis",
        "max_abs_volume_identity_residual_m3": float(
            np.max(np.abs(volume_difference))
        ),
        "torque_correction_formula": (
            "Q_exact-Q_axis=-rho*g*I_wp*sin(theta)*(1+tan(theta)^2/2)"
        ),
        "max_abs_torque_formula_residual_Nm": float(
            np.max(np.abs(numerical_torque_difference - analytic_torque_difference))
        ),
    }
    (DATA_DIR / "exact-hydrostatics-summary.json").write_text(
        json.dumps(summary, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    print(json.dumps(summary, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
