#!/usr/bin/env python3
"""Independent symbolic checks for the candidate ROM linear theory.

This script checks algebraic identities in the R3 research memoranda.  It does
not validate the empirical closure or its coefficients against experiment.
"""

from __future__ import annotations

import sympy as sp


def check_general_complex_mode_characteristic() -> None:
    lam, zeta, mu, omega, coupling = sp.symbols(
        "lambda zeta mu Omega Lambda", real=True
    )
    u0, u1, u2, v0, v1, v2 = sp.symbols(
        "u0 u1 u2 v0 v1 v2", real=True
    )
    structure = lam**2 + 2 * zeta * lam + 1
    wake_denominator = (lam - mu) ** 2 + omega**2
    h_real = u0 + u1 * lam + u2 * lam**2
    h_imag = v0 + v1 * lam + v2 * lam**2
    characteristic = sp.Poly(
        sp.expand(
            structure * wake_denominator
            - coupling * ((lam - mu) * h_real - omega * h_imag)
        ),
        lam,
    )

    expected = [
        sp.Integer(1),
        2 * (zeta - mu) - coupling * u2,
        1 + mu**2 + omega**2 - 4 * zeta * mu
        - coupling * (u1 - mu * u2 - omega * v2),
        2 * zeta * (mu**2 + omega**2) - 2 * mu
        - coupling * (u0 - mu * u1 - omega * v1),
        mu**2 + omega**2 + coupling * (mu * u0 + omega * v0),
    ]
    assert all(
        sp.simplify(actual - target) == 0
        for actual, target in zip(characteristic.all_coeffs(), expected)
    )


def check_quartic_hopf_identity() -> None:
    c1, c2, c3, c4 = sp.symbols("c1 c2 c3 c4", real=True, nonzero=True)
    frequency_squared = c3 / c1
    real_part = frequency_squared**2 - c2 * frequency_squared + c4
    delta3 = c1 * c2 * c3 - c3**2 - c1**2 * c4
    assert sp.simplify(real_part + delta3 / c1**2) == 0


def check_acceleration_coupling_special_case() -> None:
    lam, zeta, sigma, omega, kappa, acceleration_gain = sp.symbols(
        "lambda zeta sigma Omega kappa A", real=True
    )
    gamma = kappa * acceleration_gain
    jacobian = sp.Matrix(
        [
            [0, 1, 0, 0],
            [-1, -2 * zeta, kappa, 0],
            [0, 0, 0, 1],
            [
                -acceleration_gain,
                -2 * acceleration_gain * zeta,
                acceleration_gain * kappa - omega**2,
                2 * sigma,
            ],
        ]
    )
    determinant = sp.expand((lam * sp.eye(4) - jacobian).det())
    product_form = sp.expand(
        (lam**2 + 2 * zeta * lam + 1)
        * (lam**2 - 2 * sigma * lam + omega**2)
        - gamma * lam**2
    )
    assert sp.simplify(determinant - product_form) == 0

    coefficients = sp.Poly(product_form, lam).all_coeffs()
    expected = [
        1,
        2 * (zeta - sigma),
        1 + omega**2 - 4 * zeta * sigma - gamma,
        2 * (zeta * omega**2 - sigma),
        omega**2,
    ]
    assert all(
        sp.simplify(actual - target) == 0
        for actual, target in zip(coefficients, expected)
    )

    hopf_frequency_squared = (zeta * omega**2 - sigma) / (zeta - sigma)
    gamma_hopf = (
        1
        + omega**2
        - 4 * zeta * sigma
        - hopf_frequency_squared
        - omega**2 / hopf_frequency_squared
    )
    assert sp.simplify(gamma_hopf.subs(omega, 1) + 4 * zeta * sigma) == 0


def check_hopf_crossing_direction() -> None:
    c1, c2, omega = sp.symbols("c1 c2 omega", positive=True, real=True)
    gamma = sp.symbols("Gamma", real=True)
    lam = sp.symbols("lambda")

    # The acceleration-coupling parameter appears only as -Gamma*lambda**2.
    # At a Hopf root, implicit differentiation gives d lambda / d Gamma.
    c3 = c1 * omega**2
    c4 = omega**2 * (c2 - omega**2)
    polynomial = lam**4 + c1 * lam**3 + (c2 - gamma) * lam**2 + c3 * lam + c4
    derivative = -sp.diff(polynomial, gamma) / sp.diff(polynomial, lam)
    crossing = sp.simplify(sp.re(sp.expand_complex(derivative.subs({lam: sp.I * omega, gamma: 0}))))
    expected = c1 * omega**2 / (
        2 * (c1**2 * omega**2 + (c2 - 2 * omega**2) ** 2)
    )
    assert sp.simplify(crossing - expected) == 0


def check_wake_energy_average() -> None:
    phase = sp.symbols("phase", real=True)
    sigma, beta, omega, amplitude = sp.symbols(
        "sigma beta Omega Q", real=True
    )
    q = amplitude * sp.cos(phase)
    qdot = -amplitude * omega * sp.sin(phase)
    energy_rate = (2 * sigma - beta * q**2) * qdot**2
    average = sp.integrate(energy_rate, (phase, 0, 2 * sp.pi)) / (2 * sp.pi)
    expected = -omega**2 * amplitude**2 * (
        beta * amplitude**2 - 8 * sigma
    ) / 8
    assert sp.simplify(average - expected) == 0


def main() -> None:
    check_general_complex_mode_characteristic()
    check_quartic_hopf_identity()
    check_acceleration_coupling_special_case()
    check_hopf_crossing_direction()
    check_wake_energy_average()
    print(
        "PASS: complex-mode characteristic, quartic Hopf condition, "
        "acceleration-coupled special case, crossing direction, wake energy"
    )


if __name__ == "__main__":
    main()
