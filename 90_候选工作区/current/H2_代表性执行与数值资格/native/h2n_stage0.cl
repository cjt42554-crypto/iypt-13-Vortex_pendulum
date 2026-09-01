#pragma OPENCL EXTENSION cl_khr_fp64 : enable
#pragma OPENCL FP_CONTRACT OFF

constant int CX[9] = {0, 1, 0, -1, 0, 1, -1, -1, 1};
constant int CY[9] = {0, 0, 1, 0, -1, 1, 1, -1, -1};

inline double body_indicator(
  int x,
  int y,
  int body_mode,
  double center_x,
  double center_y,
  double radius,
  double half_thickness
) {
  if (body_mode == 0) return 0.0;
  const double dx = (double)x - center_x;
  const double dy = (double)y - center_y;
  const double signed_distance = sqrt(dx * dx + dy * dy) - radius;
  if (signed_distance <= -half_thickness) return 1.0;
  if (signed_distance >= half_thickness) return 0.0;
  return 0.5 * (1.0 - sin(M_PI * signed_distance / (2.0 * half_thickness)));
}

kernel void compute_macros(
  global const double *distributions,
  global double *rho,
  global double *ux,
  global double *uy,
  global double *mask,
  global double *force_x,
  global double *force_y,
  int nx,
  int ny,
  int body_mode,
  double center_x,
  double center_y,
  double radius,
  double body_velocity_x,
  double body_velocity_y,
  double half_thickness,
  double inverse_penalty_time,
  global int *error_flag
) {
  const int cell = (int)get_global_id(0);
  const int cells = nx * ny;
  if (cell >= cells) return;
  const int x = cell % nx;
  const int y = cell / nx;
  const int offset = 9 * cell;
  const double f0 = distributions[offset];
  const double f1 = distributions[offset + 1];
  const double f2 = distributions[offset + 2];
  const double f3 = distributions[offset + 3];
  const double f4 = distributions[offset + 4];
  const double f5 = distributions[offset + 5];
  const double f6 = distributions[offset + 6];
  const double f7 = distributions[offset + 7];
  const double f8 = distributions[offset + 8];
  const double density = f0 + f1 + f2 + f3 + f4 + f5 + f6 + f7 + f8;
  if (!(density > 0.0) || !isfinite(density)) {
    atomic_or((volatile global int *)error_flag, 1);
    return;
  }
  const double momentum_x = f1 - f3 + f5 - f6 - f7 + f8;
  const double momentum_y = f2 - f4 + f5 + f6 - f7 - f8;
  const double indicator = body_indicator(
    x,
    y,
    body_mode,
    center_x,
    center_y,
    radius,
    half_thickness
  );
  const double penalty = indicator * inverse_penalty_time;
  const double raw_ux = momentum_x / density;
  const double raw_uy = momentum_y / density;
  const double denominator = 1.0 + 0.5 * penalty;
  const double velocity_x = (raw_ux + 0.5 * penalty * body_velocity_x) / denominator;
  const double velocity_y = (raw_uy + 0.5 * penalty * body_velocity_y) / denominator;
  rho[cell] = density;
  ux[cell] = velocity_x;
  uy[cell] = velocity_y;
  mask[cell] = indicator;
  force_x[cell] = density * penalty * (body_velocity_x - velocity_x);
  force_y[cell] = density * penalty * (body_velocity_y - velocity_y);
}

kernel void collide_stream(
  global const double *distributions,
  global double *streamed,
  global const double *rho,
  global const double *ux,
  global const double *uy,
  global const double *force_x,
  global const double *force_y,
  int nx,
  int ny,
  double shear_relaxation_rate
) {
  const int cell = (int)get_global_id(0);
  const int cells = nx * ny;
  if (cell >= cells) return;
  const int x = cell % nx;
  const int y = cell / nx;
  const int offset = 9 * cell;
  const double f0 = distributions[offset];
  const double f1 = distributions[offset + 1];
  const double f2 = distributions[offset + 2];
  const double f3 = distributions[offset + 3];
  const double f4 = distributions[offset + 4];
  const double f5 = distributions[offset + 5];
  const double f6 = distributions[offset + 6];
  const double f7 = distributions[offset + 7];
  const double f8 = distributions[offset + 8];
  const double density = rho[cell];
  const double velocity_x = ux[cell];
  const double velocity_y = uy[cell];
  const double body_fx = force_x[cell];
  const double body_fy = force_y[cell];
  const double speed_squared = velocity_x * velocity_x + velocity_y * velocity_y;
  const double force_power = velocity_x * body_fx + velocity_y * body_fy;
  const double s1 = 1.10;
  const double s2 = 1.00;
  const double s4 = 1.20;
  const double s6 = 1.20;
  const double s_nu = shear_relaxation_rate;

  double m0 = f0 + f1 + f2 + f3 + f4 + f5 + f6 + f7 + f8;
  double m1 = -4.0 * f0 - f1 - f2 - f3 - f4 + 2.0 * (f5 + f6 + f7 + f8);
  double m2 = 4.0 * f0 - 2.0 * (f1 + f2 + f3 + f4) + f5 + f6 + f7 + f8;
  double m3 = f1 - f3 + f5 - f6 - f7 + f8;
  double m4 = -2.0 * f1 + 2.0 * f3 + f5 - f6 - f7 + f8;
  double m5 = f2 - f4 + f5 + f6 - f7 - f8;
  double m6 = -2.0 * f2 + 2.0 * f4 + f5 + f6 - f7 - f8;
  double m7 = f1 - f2 + f3 - f4;
  double m8 = f5 - f6 + f7 - f8;

  const double equilibrium1 = density * (-2.0 + 3.0 * speed_squared);
  const double equilibrium2 = density * (1.0 - 3.0 * speed_squared);
  const double equilibrium3 = density * velocity_x;
  const double equilibrium4 = -equilibrium3;
  const double equilibrium5 = density * velocity_y;
  const double equilibrium6 = -equilibrium5;
  const double equilibrium7 = density * (velocity_x * velocity_x - velocity_y * velocity_y);
  const double equilibrium8 = density * velocity_x * velocity_y;

  m1 += -s1 * (m1 - equilibrium1) + (1.0 - 0.5 * s1) * 6.0 * force_power;
  m2 += -s2 * (m2 - equilibrium2) + (1.0 - 0.5 * s2) * -6.0 * force_power;
  m3 += body_fx;
  m4 += -s4 * (m4 - equilibrium4) + (1.0 - 0.5 * s4) * -body_fx;
  m5 += body_fy;
  m6 += -s6 * (m6 - equilibrium6) + (1.0 - 0.5 * s6) * -body_fy;
  m7 += -s_nu * (m7 - equilibrium7)
    + (1.0 - 0.5 * s_nu) * 2.0 * (velocity_x * body_fx - velocity_y * body_fy);
  m8 += -s_nu * (m8 - equilibrium8)
    + (1.0 - 0.5 * s_nu) * (velocity_x * body_fy + velocity_y * body_fx);

  double post[9];
  post[0] = (4.0 * m0 - 4.0 * m1 + 4.0 * m2) / 36.0;
  post[1] = (4.0 * m0 - m1 - 2.0 * m2 + 6.0 * m3 - 6.0 * m4 + 9.0 * m7) / 36.0;
  post[2] = (4.0 * m0 - m1 - 2.0 * m2 + 6.0 * m5 - 6.0 * m6 - 9.0 * m7) / 36.0;
  post[3] = (4.0 * m0 - m1 - 2.0 * m2 - 6.0 * m3 + 6.0 * m4 + 9.0 * m7) / 36.0;
  post[4] = (4.0 * m0 - m1 - 2.0 * m2 - 6.0 * m5 + 6.0 * m6 - 9.0 * m7) / 36.0;
  post[5] = (4.0 * m0 + 2.0 * m1 + m2 + 6.0 * m3 + 3.0 * m4 + 6.0 * m5 + 3.0 * m6 + 9.0 * m8) / 36.0;
  post[6] = (4.0 * m0 + 2.0 * m1 + m2 - 6.0 * m3 - 3.0 * m4 + 6.0 * m5 + 3.0 * m6 - 9.0 * m8) / 36.0;
  post[7] = (4.0 * m0 + 2.0 * m1 + m2 - 6.0 * m3 - 3.0 * m4 - 6.0 * m5 - 3.0 * m6 + 9.0 * m8) / 36.0;
  post[8] = (4.0 * m0 + 2.0 * m1 + m2 + 6.0 * m3 + 3.0 * m4 - 6.0 * m5 - 3.0 * m6 - 9.0 * m8) / 36.0;

  for (int direction = 0; direction < 9; direction += 1) {
    const int destination_x = x + CX[direction];
    int destination_y = y + CY[direction];
    if (destination_y < 0) destination_y += ny;
    if (destination_y >= ny) destination_y -= ny;
    if (destination_x < 0 || destination_x >= nx) continue;
    const int destination_cell = destination_x + nx * destination_y;
    streamed[9 * destination_cell + direction] = post[direction];
  }
}

kernel void apply_open_boundaries(
  global double *streamed,
  int nx,
  int ny,
  double inlet_velocity
) {
  const int y = (int)get_global_id(0);
  if (y >= ny) return;
  const int left = 9 * (nx * y);
  const double lf0 = streamed[left];
  const double lf2 = streamed[left + 2];
  const double lf3 = streamed[left + 3];
  const double lf4 = streamed[left + 4];
  const double lf6 = streamed[left + 6];
  const double lf7 = streamed[left + 7];
  const double inlet_density =
    (lf0 + lf2 + lf4 + 2.0 * (lf3 + lf6 + lf7)) / (1.0 - inlet_velocity);
  streamed[left + 1] = lf3 + (2.0 / 3.0) * inlet_density * inlet_velocity;
  streamed[left + 5] = lf7 + 0.5 * (lf4 - lf2)
    + (1.0 / 6.0) * inlet_density * inlet_velocity;
  streamed[left + 8] = lf6 + 0.5 * (lf2 - lf4)
    + (1.0 / 6.0) * inlet_density * inlet_velocity;

  const int right = 9 * ((nx - 1) + nx * y);
  const double rf0 = streamed[right];
  const double rf1 = streamed[right + 1];
  const double rf2 = streamed[right + 2];
  const double rf4 = streamed[right + 4];
  const double rf5 = streamed[right + 5];
  const double rf8 = streamed[right + 8];
  const double outlet_velocity = -1.0
    + (rf0 + rf2 + rf4 + 2.0 * (rf1 + rf5 + rf8));
  streamed[right + 3] = rf1 - (2.0 / 3.0) * outlet_velocity;
  streamed[right + 6] = rf8 + 0.5 * (rf4 - rf2)
    - (1.0 / 6.0) * outlet_velocity;
  streamed[right + 7] = rf5 + 0.5 * (rf2 - rf4)
    - (1.0 / 6.0) * outlet_velocity;
}
