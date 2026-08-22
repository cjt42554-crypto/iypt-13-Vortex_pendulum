#!/usr/bin/env python3
"""Symbolic and numerical checks for the canonical vortex-pendulum geometry.

This notebook-like script is deliberately independent of the TypeScript solver.
It checks identities that the paper derivation and later implementation must obey.
It is not a fluid solver and it does not validate empirical hydrodynamic closures.
"""

from __future__ import annotations

import math

import sympy as sp


def check_rotating_basis() -> None:
    theta, s, radius, phi = sp.symbols(
        "theta s R phi", real=True
    )
    ex = sp.Matrix([1, 0, 0])
    es = sp.Matrix([0, sp.sin(theta), -sp.cos(theta)])
    et = sp.Matrix([0, sp.cos(theta), sp.sin(theta)])
    radius_vector = s * es + radius * (
        sp.cos(phi) * ex + sp.sin(phi) * et
    )

    assert sp.simplify(es.dot(es) - 1) == 0
    assert sp.simplify(et.dot(et) - 1) == 0
    assert sp.simplify(es.dot(et)) == 0
    assert all(
        sp.simplify(value) == 0
        for value in (ex.cross(es) - et)
    )
    assert all(
        sp.simplify(value) == 0
        for value in (sp.diff(radius_vector, theta) - ex.cross(radius_vector))
    )


def check_exact_symmetric_springs() -> None:
    theta, stiffness, arm, preload = sp.symbols(
        "theta k d delta_0", positive=True, real=True
    )
    extension_plus = preload + arm * sp.sin(theta)
    extension_minus = preload - arm * sp.sin(theta)
    potential = sp.Rational(1, 2) * stiffness * (
        extension_plus**2 + extension_minus**2
    )
    torque = -sp.diff(potential, theta)

    assert sp.simplify(
        potential - stiffness * (preload**2 + arm**2 * sp.sin(theta) ** 2)
    ) == 0
    assert sp.simplify(
        torque + 2 * stiffness * arm**2 * sp.sin(theta) * sp.cos(theta)
    ) == 0
    tangent_stiffness = -sp.diff(torque, theta).subs(theta, 0)
    assert sp.simplify(tangent_stiffness - 2 * stiffness * arm**2) == 0


def check_slender_full_section_buoyancy() -> None:
    theta = sp.symbols("theta", real=True)
    rho, gravity, area, height, bottom = sp.symbols(
        "rho g A h s_b", positive=True, real=True
    )
    waterline = height / sp.cos(theta)
    first_axial_moment = (bottom**2 - waterline**2) / 2

    # Potential of the hydrostatic buoyancy force for a planar, zero-pressure
    # free surface.  The moving waterline contributes no boundary term because
    # its vertical coordinate is exactly zero.
    integral_z = area * (
        height * (bottom - waterline)
        - sp.cos(theta) * (bottom**2 - waterline**2) / 2
    )
    buoyancy_potential = -rho * gravity * integral_z
    generalized_buoyancy = -sp.diff(buoyancy_potential, theta)
    expected = rho * gravity * area * first_axial_moment * sp.sin(theta)

    assert sp.simplify(generalized_buoyancy - expected) == 0
    assert sp.simplify(generalized_buoyancy.subs(theta, 0)) == 0


def check_finite_radius_hydrostatic_correction() -> None:
    """Check the closed form while the waterline band misses both end caps.

    Local disk coordinate ``v`` lies in the tilt plane and has disk moments
    integral(v dA)=0 and integral(v**2 dA)=I_wp.  The planar waterline cuts the
    axial line at s_0(v)=h/cos(theta)+v*tan(theta).  Integrating first in s
    avoids any nonuniform small-angle quadrature across the O(R*abs(theta))
    transition layer.
    """
    theta, v = sp.symbols("theta v", real=True)
    area, waterplane_inertia = sp.symbols("A I_wp", positive=True, real=True)
    height, bottom = sp.symbols("h s_b", positive=True, real=True)

    lower = height / sp.cos(theta) + v * sp.tan(theta)
    volume_column = bottom - lower
    y_first_moment_column = (
        sp.sin(theta) * (bottom**2 - lower**2) / 2
        + v * sp.cos(theta) * (bottom - lower)
    )

    def integrate_disk_quadratic(expression: sp.Expr) -> sp.Expr:
        polynomial = sp.Poly(sp.expand(expression), v)
        assert polynomial.degree() <= 2
        return sp.simplify(
            polynomial.coeff_monomial(v**0) * area
            + polynomial.coeff_monomial(v**2) * waterplane_inertia
        )

    exact_volume = integrate_disk_quadratic(volume_column)
    axis_volume = area * (bottom - height / sp.cos(theta))
    assert sp.simplify(exact_volume - axis_volume) == 0

    exact_first_moment = integrate_disk_quadratic(y_first_moment_column)
    axis_first_moment = (
        area
        * sp.sin(theta)
        * (bottom**2 - (height / sp.cos(theta)) ** 2)
        / 2
    )
    expected_correction = (
        -waterplane_inertia
        * sp.sin(theta)
        * (1 + sp.tan(theta) ** 2 / 2)
    )
    assert sp.trigsimp(
        exact_first_moment - axis_first_moment - expected_correction
    ) == 0

    # The tangent correction to the generalized buoyancy coefficient is
    # therefore -rho*g*I_wp, before multiplying the first volume moment by
    # density and gravity.
    assert sp.simplify(sp.diff(expected_correction, theta).subs(theta, 0)
                       + waterplane_inertia) == 0


def check_configuration_dependent_inertia_energy() -> None:
    q, qdot, inertia = sp.symbols("q qdot I", real=True)
    inertia_prime, acceleration = sp.symbols("I_q qddot", real=True)
    potential_prime, applied = sp.symbols("V_q Q", real=True)

    # Lagrange equation:
    # I*qddot + 1/2*I_q*qdot^2 + V_q = Q.
    acceleration_solution = (
        applied - potential_prime - sp.Rational(1, 2) * inertia_prime * qdot**2
    ) / inertia
    kinetic_derivative = (
        sp.Rational(1, 2) * inertia_prime * qdot**3
        + inertia * qdot * acceleration_solution
    )
    total_derivative = sp.simplify(kinetic_derivative + potential_prime * qdot)
    assert sp.simplify(total_derivative - applied * qdot) == 0


def disk_segment_area(radius: float, cut: float) -> float:
    """Area of a disk portion with local coordinate v <= cut."""
    if cut <= -radius:
        return 0.0
    if cut >= radius:
        return math.pi * radius * radius
    root = math.sqrt(radius * radius - cut * cut)
    return (
        cut * root
        + radius * radius * (math.asin(cut / radius) + math.pi / 2)
    )


def disk_segment_first_moment(radius: float, cut: float) -> float:
    """Integral of v dA over the disk portion v <= cut."""
    if cut <= -radius or cut >= radius:
        return 0.0
    return -2.0 / 3.0 * (radius * radius - cut * cut) ** 1.5


def check_disk_segment_formulas() -> None:
    radius = 0.037
    for cut in (-radius, -0.7 * radius, 0.0, 0.4 * radius, radius):
        n = 200_000
        dv = 2 * radius / n
        area_numeric = 0.0
        moment_numeric = 0.0
        for index in range(n):
            v = -radius + (index + 0.5) * dv
            if v <= cut:
                strip = 2 * math.sqrt(max(radius * radius - v * v, 0.0)) * dv
                area_numeric += strip
                moment_numeric += v * strip
        assert math.isclose(
            disk_segment_area(radius, cut),
            area_numeric,
            rel_tol=2e-7,
            abs_tol=2e-10,
        )
        assert math.isclose(
            disk_segment_first_moment(radius, cut),
            moment_numeric,
            rel_tol=2e-7,
            abs_tol=2e-10,
        )


def check_quasisteady_drag_is_dissipative() -> None:
    density = 998.0
    diameter = 0.02
    drag_coefficient = 1.1
    flow = 0.13
    for angular_velocity in (-4.0, -0.2, 0.0, 0.5, 3.0):
        integrated_power = 0.0
        for index in range(1, 501):
            s = 0.08 + index * (0.42 / 500)
            transverse_velocity = s * angular_velocity
            relative_speed = math.hypot(flow, transverse_velocity)
            force_transverse = (
                -0.5
                * density
                * diameter
                * drag_coefficient
                * relative_speed
                * transverse_velocity
            )
            integrated_power += force_transverse * transverse_velocity * 0.42 / 500
        assert integrated_power <= 1e-14


def main() -> None:
    check_rotating_basis()
    check_exact_symmetric_springs()
    check_slender_full_section_buoyancy()
    check_finite_radius_hydrostatic_correction()
    check_configuration_dependent_inertia_energy()
    check_disk_segment_formulas()
    check_quasisteady_drag_is_dissipative()
    print(
        "PASS: exact geometry, springs, slender and finite-radius buoyancy, "
        "inertia energy, disk segments, drag power"
    )


if __name__ == "__main__":
    main()
