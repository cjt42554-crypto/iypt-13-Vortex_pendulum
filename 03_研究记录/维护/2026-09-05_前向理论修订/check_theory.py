"""Algebraic regression for the theory contract; not a solver/device validation."""
import math
import unittest
from pathlib import Path
class TheoryChecks(unittest.TestCase):
    def test_shrinking_wet_area_keeps_uniform_speed(self):
        for area in (1., 1e-6, 1e-30):
            self.assertAlmostEqual(math.sqrt(area*.4**2/area), .4)
    def test_zero_area_has_no_weighted_speed(self):
        with self.assertRaises(ZeroDivisionError):
            _ = 0./0.
    def test_zero_flow_tail_is_passive(self):
        for a2 in (0., .1, 1., 100.):
            self.assertLessEqual(2*(-.2)*a2-2*.3*a2*a2, 0.)
    def test_correlated_covariance(self):
        for cov, expected in ((1., 4.), (0., 2.), (-1., 0.)):
            self.assertEqual(1.+1.+2*cov, expected)
    def test_conditional_total_variance(self):
        for a in (-2., -1., 0., 3.):
            vp, ve = 2., .4
            vc, cp = a*a*vp+ve, a*vp
            self.assertAlmostEqual(vc+vp+2*cp, ve+(a+1)**2*vp)
    def test_shared_observation_calibration(self):
        self.assertEqual(1.+1.-2*1., 0.)
        self.assertAlmostEqual(1.+1.-2*.9, .2)
    def test_dry_mechanical_energy(self):
        J, w, vp, rs, qc = 3., .7, .4, .2, -.1
        alpha = (qc-vp-rs)/J
        self.assertAlmostEqual(J*w*alpha+vp*w, (qc-rs)*w)
    def test_manuscript_contract(self):
        s=Path('01_最终理论/01-前向预测理论.md').read_text()
        e=Path('01_最终理论/04-实验辨识、标定与留出预测协议.md').read_text()
        self.assertIn('不把 $A$ 清零', s)
        self.assertIn('不启动正式四状态预测', s)
        self.assertNotIn('零来流和全干时使用第 5.4 节给出的连续退化分支', s)
        self.assertIn(r'2\nabla_{\boldsymbol c}g^{\mathsf T}\mathbf\Sigma_{cp}', e)
        self.assertIn(r'\operatorname{Cov}(g_{\rm obs},g_{\rm pred})', e)
if __name__=='__main__': unittest.main(verbosity=2)
