#define _GNU_SOURCE
#include <dlfcn.h>
#include <errno.h>
#include <inttypes.h>
#include <math.h>
#include <omp.h>
#include <stdint.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <time.h>

typedef struct _cl_platform_id *cl_platform_id;
typedef struct _cl_device_id *cl_device_id;
typedef struct _cl_context *cl_context;
typedef struct _cl_command_queue *cl_command_queue;
typedef struct _cl_mem *cl_mem;
typedef struct _cl_program *cl_program;
typedef struct _cl_kernel *cl_kernel;
typedef struct _cl_event *cl_event;
typedef int32_t cl_int;
typedef uint32_t cl_uint;
typedef uint64_t cl_ulong;
typedef uint32_t cl_bool;
typedef uint64_t cl_bitfield;
typedef cl_bitfield cl_device_type;
typedef cl_bitfield cl_mem_flags;
typedef cl_bitfield cl_command_queue_properties;
typedef intptr_t cl_context_properties;

enum {
  CL_SUCCESS = 0,
  CL_TRUE = 1,
  CL_DEVICE_TYPE_GPU = 1 << 2,
  CL_MEM_READ_WRITE = 1 << 0,
  CL_MEM_COPY_HOST_PTR = 1 << 5,
  CL_QUEUE_PROFILING_ENABLE = 1 << 1,
  CL_DEVICE_NAME = 0x102B,
  CL_DEVICE_EXTENSIONS = 0x1030,
  CL_PROGRAM_BUILD_LOG = 0x1183,
  CL_PROFILING_COMMAND_START = 0x1282,
  CL_PROFILING_COMMAND_END = 0x1283,
};

typedef struct {
  cl_int (*GetPlatformIDs)(cl_uint, cl_platform_id *, cl_uint *);
  cl_int (*GetDeviceIDs)(cl_platform_id, cl_device_type, cl_uint, cl_device_id *, cl_uint *);
  cl_int (*GetDeviceInfo)(cl_device_id, cl_uint, size_t, void *, size_t *);
  cl_context (*CreateContext)(const cl_context_properties *, cl_uint, const cl_device_id *, void *, void *, cl_int *);
  cl_command_queue (*CreateCommandQueue)(cl_context, cl_device_id, cl_command_queue_properties, cl_int *);
  cl_program (*CreateProgramWithSource)(cl_context, cl_uint, const char **, const size_t *, cl_int *);
  cl_int (*BuildProgram)(cl_program, cl_uint, const cl_device_id *, const char *, void *, void *);
  cl_int (*GetProgramBuildInfo)(cl_program, cl_device_id, cl_uint, size_t, void *, size_t *);
  cl_kernel (*CreateKernel)(cl_program, const char *, cl_int *);
  cl_mem (*CreateBuffer)(cl_context, cl_mem_flags, size_t, void *, cl_int *);
  cl_int (*SetKernelArg)(cl_kernel, cl_uint, size_t, const void *);
  cl_int (*EnqueueNDRangeKernel)(cl_command_queue, cl_kernel, cl_uint, const size_t *, const size_t *, const size_t *, cl_uint, const cl_event *, cl_event *);
  cl_int (*EnqueueWriteBuffer)(cl_command_queue, cl_mem, cl_bool, size_t, size_t, const void *, cl_uint, const cl_event *, cl_event *);
  cl_int (*EnqueueReadBuffer)(cl_command_queue, cl_mem, cl_bool, size_t, size_t, void *, cl_uint, const cl_event *, cl_event *);
  cl_int (*Finish)(cl_command_queue);
  cl_int (*GetEventProfilingInfo)(cl_event, cl_uint, size_t, void *, size_t *);
  cl_int (*ReleaseEvent)(cl_event);
  cl_int (*ReleaseMemObject)(cl_mem);
  cl_int (*ReleaseKernel)(cl_kernel);
  cl_int (*ReleaseProgram)(cl_program);
  cl_int (*ReleaseCommandQueue)(cl_command_queue);
  cl_int (*ReleaseContext)(cl_context);
} OpenClApi;

typedef struct {
  const char *backend;
  const char *output_path;
  const char *kernel_path;
  int nx;
  int ny;
  int steps;
  int diameter;
  double mask_half_thickness;
  double phase_offset;
  int body_mode;
  int threads;
  int batch_count;
} Config;

typedef struct {
  size_t cells;
  double *initial;
  double *distributions;
  double *streamed;
  double *rho;
  double *ux;
  double *uy;
  double *mask;
  double *force_x;
  double *force_y;
} Arrays;

typedef struct {
  double cold_initialization;
  double steady_compute;
  double transfer;
  double synchronization;
  double audit;
  double cleanup;
  double device_compute;
  char device_name[256];
} Timings;

static const int CX[9] = {0, 1, 0, -1, 0, 1, -1, -1, 1};
static const int CY[9] = {0, 0, 1, 0, -1, 1, 1, -1, -1};
static const double WEIGHT[9] = {
  4.0 / 9.0,
  1.0 / 9.0, 1.0 / 9.0, 1.0 / 9.0, 1.0 / 9.0,
  1.0 / 36.0, 1.0 / 36.0, 1.0 / 36.0, 1.0 / 36.0,
};
static const uint32_t FIXTURE_SEED = UINT32_C(0x8ab858a0);
static const double INLET_VELOCITY = 0.05;
static const double REYNOLDS_NUMBER = 185.0;

static void fail(const char *message) {
  fprintf(stderr, "%s\n", message);
  exit(2);
}

static void *checked_calloc(size_t count, size_t size) {
  if (count != 0 && size > SIZE_MAX / count) fail("allocation overflow");
  void *value = calloc(count, size);
  if (value == NULL) fail("allocation failed");
  return value;
}

static double now_seconds(void) {
  struct timespec value;
  if (clock_gettime(CLOCK_MONOTONIC_RAW, &value) != 0) fail("clock_gettime failed");
  return (double)value.tv_sec + 1e-9 * (double)value.tv_nsec;
}

static uint32_t mix32(uint32_t value) {
  value ^= value >> 16;
  value *= UINT32_C(0x7feb352d);
  value ^= value >> 15;
  value *= UINT32_C(0x846ca68b);
  value ^= value >> 16;
  return value;
}

static double equilibrium(int direction, double rho, double ux, double uy) {
  const double cu = (double)CX[direction] * ux + (double)CY[direction] * uy;
  return WEIGHT[direction] * rho
    * (1.0 + 3.0 * cu + 4.5 * cu * cu - 1.5 * (ux * ux + uy * uy));
}

static void initialize_fixture(Arrays *arrays) {
  #pragma omp parallel for schedule(static)
  for (size_t cell = 0; cell < arrays->cells; cell += 1) {
    const uint32_t value = mix32(FIXTURE_SEED ^ (uint32_t)cell);
    const double density = 1.0
      + ((double)(value & UINT32_C(255)) - 127.5) * 0x1p-24;
    const double velocity_x = INLET_VELOCITY
      + ((double)((value >> 8) & UINT32_C(255)) - 127.5) * 0x1p-28;
    const double velocity_y =
      ((double)((value >> 16) & UINT32_C(255)) - 127.5) * 0x1p-28;
    for (int direction = 0; direction < 9; direction += 1) {
      arrays->initial[9 * cell + (size_t)direction] =
        equilibrium(direction, density, velocity_x, velocity_y);
    }
  }
}

static double body_indicator(
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
  const double signed_distance = hypot(dx, dy) - radius;
  if (signed_distance <= -half_thickness) return 1.0;
  if (signed_distance >= half_thickness) return 0.0;
  return 0.5 * (1.0 - sin(M_PI * signed_distance / (2.0 * half_thickness)));
}

static void compute_macros_cpu(const Config *config, Arrays *arrays) {
  const double center_x = 14.0 * (double)config->diameter;
  const double center_y = 0.5 * ((double)config->ny - 1.0) + config->phase_offset;
  const double radius = 0.5 * (double)config->diameter;
  int error_flag = 0;
  #pragma omp parallel for schedule(static) reduction(|:error_flag)
  for (size_t cell = 0; cell < arrays->cells; cell += 1) {
    const int x = (int)(cell % (size_t)config->nx);
    const int y = (int)(cell / (size_t)config->nx);
    const size_t offset = 9 * cell;
    const double f0 = arrays->distributions[offset];
    const double f1 = arrays->distributions[offset + 1];
    const double f2 = arrays->distributions[offset + 2];
    const double f3 = arrays->distributions[offset + 3];
    const double f4 = arrays->distributions[offset + 4];
    const double f5 = arrays->distributions[offset + 5];
    const double f6 = arrays->distributions[offset + 6];
    const double f7 = arrays->distributions[offset + 7];
    const double f8 = arrays->distributions[offset + 8];
    const double density = f0 + f1 + f2 + f3 + f4 + f5 + f6 + f7 + f8;
    if (!(density > 0.0) || !isfinite(density)) {
      error_flag |= 1;
      continue;
    }
    const double momentum_x = f1 - f3 + f5 - f6 - f7 + f8;
    const double momentum_y = f2 - f4 + f5 + f6 - f7 - f8;
    const double indicator = body_indicator(
      x,
      y,
      config->body_mode,
      center_x,
      center_y,
      radius,
      config->mask_half_thickness
    );
    const double penalty = indicator;
    const double raw_ux = momentum_x / density;
    const double raw_uy = momentum_y / density;
    const double denominator = 1.0 + 0.5 * penalty;
    const double velocity_x = raw_ux / denominator;
    const double velocity_y = raw_uy / denominator;
    arrays->rho[cell] = density;
    arrays->ux[cell] = velocity_x;
    arrays->uy[cell] = velocity_y;
    arrays->mask[cell] = indicator;
    arrays->force_x[cell] = density * penalty * -velocity_x;
    arrays->force_y[cell] = density * penalty * -velocity_y;
  }
  if (error_flag != 0) fail("non-positive/non-finite density in CPU backend");
}

static void collide_stream_cpu(const Config *config, Arrays *arrays) {
  const double relaxation_time = 0.5
    + 3.0 * INLET_VELOCITY * (double)config->diameter / REYNOLDS_NUMBER;
  const double s_nu = 1.0 / relaxation_time;
  #pragma omp parallel for schedule(static)
  for (size_t cell = 0; cell < arrays->cells; cell += 1) {
    const int x = (int)(cell % (size_t)config->nx);
    const int y = (int)(cell / (size_t)config->nx);
    const size_t offset = 9 * cell;
    const double f0 = arrays->distributions[offset];
    const double f1 = arrays->distributions[offset + 1];
    const double f2 = arrays->distributions[offset + 2];
    const double f3 = arrays->distributions[offset + 3];
    const double f4 = arrays->distributions[offset + 4];
    const double f5 = arrays->distributions[offset + 5];
    const double f6 = arrays->distributions[offset + 6];
    const double f7 = arrays->distributions[offset + 7];
    const double f8 = arrays->distributions[offset + 8];
    const double density = arrays->rho[cell];
    const double velocity_x = arrays->ux[cell];
    const double velocity_y = arrays->uy[cell];
    const double body_fx = arrays->force_x[cell];
    const double body_fy = arrays->force_y[cell];
    const double speed_squared = velocity_x * velocity_x + velocity_y * velocity_y;
    const double force_power = velocity_x * body_fx + velocity_y * body_fy;
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
    m1 += -1.10 * (m1 - equilibrium1) + (1.0 - 0.5 * 1.10) * 6.0 * force_power;
    m2 += -1.00 * (m2 - equilibrium2) + (1.0 - 0.5 * 1.00) * -6.0 * force_power;
    m3 += body_fx;
    m4 += -1.20 * (m4 - equilibrium4) + (1.0 - 0.5 * 1.20) * -body_fx;
    m5 += body_fy;
    m6 += -1.20 * (m6 - equilibrium6) + (1.0 - 0.5 * 1.20) * -body_fy;
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
      if (destination_y < 0) destination_y += config->ny;
      if (destination_y >= config->ny) destination_y -= config->ny;
      if (destination_x < 0 || destination_x >= config->nx) continue;
      const size_t destination_cell =
        (size_t)destination_x + (size_t)config->nx * (size_t)destination_y;
      arrays->streamed[9 * destination_cell + (size_t)direction] = post[direction];
    }
  }
}

static void apply_boundaries_cpu(const Config *config, Arrays *arrays) {
  #pragma omp parallel for schedule(static)
  for (int y = 0; y < config->ny; y += 1) {
    const size_t left = 9 * (size_t)(config->nx * y);
    const double lf0 = arrays->streamed[left];
    const double lf2 = arrays->streamed[left + 2];
    const double lf3 = arrays->streamed[left + 3];
    const double lf4 = arrays->streamed[left + 4];
    const double lf6 = arrays->streamed[left + 6];
    const double lf7 = arrays->streamed[left + 7];
    const double inlet_density =
      (lf0 + lf2 + lf4 + 2.0 * (lf3 + lf6 + lf7)) / (1.0 - INLET_VELOCITY);
    arrays->streamed[left + 1] = lf3 + (2.0 / 3.0) * inlet_density * INLET_VELOCITY;
    arrays->streamed[left + 5] = lf7 + 0.5 * (lf4 - lf2)
      + (1.0 / 6.0) * inlet_density * INLET_VELOCITY;
    arrays->streamed[left + 8] = lf6 + 0.5 * (lf2 - lf4)
      + (1.0 / 6.0) * inlet_density * INLET_VELOCITY;
    const size_t right = 9 * (size_t)((config->nx - 1) + config->nx * y);
    const double rf0 = arrays->streamed[right];
    const double rf1 = arrays->streamed[right + 1];
    const double rf2 = arrays->streamed[right + 2];
    const double rf4 = arrays->streamed[right + 4];
    const double rf5 = arrays->streamed[right + 5];
    const double rf8 = arrays->streamed[right + 8];
    const double outlet_velocity = -1.0
      + (rf0 + rf2 + rf4 + 2.0 * (rf1 + rf5 + rf8));
    arrays->streamed[right + 3] = rf1 - (2.0 / 3.0) * outlet_velocity;
    arrays->streamed[right + 6] = rf8 + 0.5 * (rf4 - rf2)
      - (1.0 / 6.0) * outlet_velocity;
    arrays->streamed[right + 7] = rf5 + 0.5 * (rf2 - rf4)
      - (1.0 / 6.0) * outlet_velocity;
  }
}

static void run_cpu(const Config *config, Arrays *arrays, Timings *timings) {
  omp_set_dynamic(0);
  omp_set_num_threads(config->threads);
  const size_t distribution_bytes = 9 * arrays->cells * sizeof(double);
  const double started = now_seconds();
  for (int batch = 0; batch < config->batch_count; batch += 1) {
    memcpy(arrays->distributions, arrays->initial, distribution_bytes);
    for (int step = 0; step < config->steps; step += 1) {
      compute_macros_cpu(config, arrays);
      collide_stream_cpu(config, arrays);
      apply_boundaries_cpu(config, arrays);
      double *previous = arrays->distributions;
      arrays->distributions = arrays->streamed;
      arrays->streamed = previous;
    }
  }
  timings->steady_compute = now_seconds() - started;
  timings->device_compute = timings->steady_compute;
  compute_macros_cpu(config, arrays);
  snprintf(timings->device_name, sizeof(timings->device_name), "CPU-OPENMP-%d", config->threads);
}

static char *read_all(const char *path, size_t *length) {
  FILE *file = fopen(path, "rb");
  if (file == NULL) fail("unable to open OpenCL kernel source");
  if (fseek(file, 0, SEEK_END) != 0) fail("kernel fseek failed");
  const long size = ftell(file);
  if (size < 0) fail("kernel ftell failed");
  rewind(file);
  char *text = checked_calloc((size_t)size + 1, 1);
  if (fread(text, 1, (size_t)size, file) != (size_t)size) fail("kernel fread failed");
  fclose(file);
  *length = (size_t)size;
  return text;
}

static void load_symbol(void *library, void **target, const char *name) {
  *target = dlsym(library, name);
  if (*target == NULL) fail("required OpenCL symbol is missing");
}

static void *load_opencl(OpenClApi *api) {
  void *library = dlopen("libOpenCL.so.1", RTLD_NOW | RTLD_LOCAL);
  if (library == NULL) fail("libOpenCL.so.1 is unavailable");
  load_symbol(library, (void **)&api->GetPlatformIDs, "clGetPlatformIDs");
  load_symbol(library, (void **)&api->GetDeviceIDs, "clGetDeviceIDs");
  load_symbol(library, (void **)&api->GetDeviceInfo, "clGetDeviceInfo");
  load_symbol(library, (void **)&api->CreateContext, "clCreateContext");
  load_symbol(library, (void **)&api->CreateCommandQueue, "clCreateCommandQueue");
  load_symbol(library, (void **)&api->CreateProgramWithSource, "clCreateProgramWithSource");
  load_symbol(library, (void **)&api->BuildProgram, "clBuildProgram");
  load_symbol(library, (void **)&api->GetProgramBuildInfo, "clGetProgramBuildInfo");
  load_symbol(library, (void **)&api->CreateKernel, "clCreateKernel");
  load_symbol(library, (void **)&api->CreateBuffer, "clCreateBuffer");
  load_symbol(library, (void **)&api->SetKernelArg, "clSetKernelArg");
  load_symbol(library, (void **)&api->EnqueueNDRangeKernel, "clEnqueueNDRangeKernel");
  load_symbol(library, (void **)&api->EnqueueWriteBuffer, "clEnqueueWriteBuffer");
  load_symbol(library, (void **)&api->EnqueueReadBuffer, "clEnqueueReadBuffer");
  load_symbol(library, (void **)&api->Finish, "clFinish");
  load_symbol(library, (void **)&api->GetEventProfilingInfo, "clGetEventProfilingInfo");
  load_symbol(library, (void **)&api->ReleaseEvent, "clReleaseEvent");
  load_symbol(library, (void **)&api->ReleaseMemObject, "clReleaseMemObject");
  load_symbol(library, (void **)&api->ReleaseKernel, "clReleaseKernel");
  load_symbol(library, (void **)&api->ReleaseProgram, "clReleaseProgram");
  load_symbol(library, (void **)&api->ReleaseCommandQueue, "clReleaseCommandQueue");
  load_symbol(library, (void **)&api->ReleaseContext, "clReleaseContext");
  return library;
}

static void check_cl(cl_int code, const char *label) {
  if (code != CL_SUCCESS) {
    fprintf(stderr, "%s failed with OpenCL code %d\n", label, code);
    exit(2);
  }
}

static void set_arg(OpenClApi *api, cl_kernel kernel, cl_uint index, size_t size, const void *value) {
  check_cl(api->SetKernelArg(kernel, index, size, value), "clSetKernelArg");
}

static double enqueue_profiled(OpenClApi *api, cl_command_queue queue, cl_kernel kernel, size_t global) {
  cl_event event = NULL;
  check_cl(api->EnqueueNDRangeKernel(queue, kernel, 1, NULL, &global, NULL, 0, NULL, &event), "clEnqueueNDRangeKernel");
  check_cl(api->Finish(queue), "clFinish");
  cl_ulong start = 0;
  cl_ulong end = 0;
  check_cl(api->GetEventProfilingInfo(event, CL_PROFILING_COMMAND_START, sizeof(start), &start, NULL), "clGetEventProfilingInfo(start)");
  check_cl(api->GetEventProfilingInfo(event, CL_PROFILING_COMMAND_END, sizeof(end), &end, NULL), "clGetEventProfilingInfo(end)");
  check_cl(api->ReleaseEvent(event), "clReleaseEvent");
  return 1e-9 * (double)(end - start);
}

static void run_opencl(const Config *config, Arrays *arrays, Timings *timings) {
  const double cold_started = now_seconds();
  OpenClApi api = {0};
  void *library = load_opencl(&api);
  cl_uint platform_count = 0;
  check_cl(api.GetPlatformIDs(0, NULL, &platform_count), "clGetPlatformIDs(count)");
  if (platform_count == 0) fail("no OpenCL platform");
  cl_platform_id *platforms = checked_calloc(platform_count, sizeof(*platforms));
  check_cl(api.GetPlatformIDs(platform_count, platforms, NULL), "clGetPlatformIDs(list)");
  cl_device_id device = NULL;
  for (cl_uint index = 0; index < platform_count && device == NULL; index += 1) {
    cl_device_id candidate = NULL;
    if (api.GetDeviceIDs(platforms[index], CL_DEVICE_TYPE_GPU, 1, &candidate, NULL) == CL_SUCCESS) {
      device = candidate;
    }
  }
  free(platforms);
  if (device == NULL) fail("no OpenCL GPU device");
  check_cl(api.GetDeviceInfo(device, CL_DEVICE_NAME, sizeof(timings->device_name), timings->device_name, NULL), "clGetDeviceInfo(name)");
  char extensions[16384] = {0};
  check_cl(api.GetDeviceInfo(device, CL_DEVICE_EXTENSIONS, sizeof(extensions), extensions, NULL), "clGetDeviceInfo(extensions)");
  if (strstr(extensions, "cl_khr_fp64") == NULL) fail("OpenCL GPU lacks cl_khr_fp64");
  cl_int status = CL_SUCCESS;
  cl_context context = api.CreateContext(NULL, 1, &device, NULL, NULL, &status);
  check_cl(status, "clCreateContext");
  cl_command_queue queue = api.CreateCommandQueue(
    context,
    device,
    CL_QUEUE_PROFILING_ENABLE,
    &status
  );
  check_cl(status, "clCreateCommandQueue");
  size_t source_length = 0;
  char *source = read_all(config->kernel_path, &source_length);
  const char *source_pointer = source;
  cl_program program = api.CreateProgramWithSource(
    context,
    1,
    &source_pointer,
    &source_length,
    &status
  );
  check_cl(status, "clCreateProgramWithSource");
  status = api.BuildProgram(
    program,
    1,
    &device,
    "-cl-std=CL1.2 -cl-fp32-correctly-rounded-divide-sqrt",
    NULL,
    NULL
  );
  if (status != CL_SUCCESS) {
    size_t log_size = 0;
    api.GetProgramBuildInfo(program, device, CL_PROGRAM_BUILD_LOG, 0, NULL, &log_size);
    char *log = checked_calloc(log_size + 1, 1);
    api.GetProgramBuildInfo(program, device, CL_PROGRAM_BUILD_LOG, log_size, log, NULL);
    fprintf(stderr, "%s\n", log);
    free(log);
    check_cl(status, "clBuildProgram");
  }
  free(source);
  cl_kernel macro_kernel = api.CreateKernel(program, "compute_macros", &status);
  check_cl(status, "clCreateKernel(compute_macros)");
  cl_kernel collide_kernel = api.CreateKernel(program, "collide_stream", &status);
  check_cl(status, "clCreateKernel(collide_stream)");
  cl_kernel boundary_kernel = api.CreateKernel(program, "apply_open_boundaries", &status);
  check_cl(status, "clCreateKernel(apply_open_boundaries)");
  const size_t distribution_bytes = 9 * arrays->cells * sizeof(double);
  const size_t scalar_bytes = arrays->cells * sizeof(double);
  cl_mem distribution_a = api.CreateBuffer(context, CL_MEM_READ_WRITE, distribution_bytes, NULL, &status);
  check_cl(status, "clCreateBuffer(distribution_a)");
  cl_mem distribution_b = api.CreateBuffer(context, CL_MEM_READ_WRITE, distribution_bytes, NULL, &status);
  check_cl(status, "clCreateBuffer(distribution_b)");
  cl_mem rho = api.CreateBuffer(context, CL_MEM_READ_WRITE, scalar_bytes, NULL, &status);
  check_cl(status, "clCreateBuffer(rho)");
  cl_mem ux = api.CreateBuffer(context, CL_MEM_READ_WRITE, scalar_bytes, NULL, &status);
  check_cl(status, "clCreateBuffer(ux)");
  cl_mem uy = api.CreateBuffer(context, CL_MEM_READ_WRITE, scalar_bytes, NULL, &status);
  check_cl(status, "clCreateBuffer(uy)");
  cl_mem mask = api.CreateBuffer(context, CL_MEM_READ_WRITE, scalar_bytes, NULL, &status);
  check_cl(status, "clCreateBuffer(mask)");
  cl_mem force_x = api.CreateBuffer(context, CL_MEM_READ_WRITE, scalar_bytes, NULL, &status);
  check_cl(status, "clCreateBuffer(force_x)");
  cl_mem force_y = api.CreateBuffer(context, CL_MEM_READ_WRITE, scalar_bytes, NULL, &status);
  check_cl(status, "clCreateBuffer(force_y)");
  cl_mem error_flag = api.CreateBuffer(context, CL_MEM_READ_WRITE, sizeof(cl_int), NULL, &status);
  check_cl(status, "clCreateBuffer(error_flag)");
  timings->cold_initialization += now_seconds() - cold_started;

  const double center_x = 14.0 * (double)config->diameter;
  const double center_y = 0.5 * ((double)config->ny - 1.0) + config->phase_offset;
  const double radius = 0.5 * (double)config->diameter;
  const double body_velocity_x = 0.0;
  const double body_velocity_y = 0.0;
  const double inverse_penalty_time = 1.0;
  const double relaxation_time = 0.5
    + 3.0 * INLET_VELOCITY * (double)config->diameter / REYNOLDS_NUMBER;
  const double shear_relaxation_rate = 1.0 / relaxation_time;
  const size_t global_cells = arrays->cells;
  const size_t global_rows = (size_t)config->ny;
  double device_seconds = 0.0;
  double transfer_seconds = 0.0;
  const double steady_started = now_seconds();
  cl_mem current = distribution_a;
  cl_mem streamed = distribution_b;
  for (int batch = 0; batch < config->batch_count; batch += 1) {
    const double write_started = now_seconds();
    check_cl(api.EnqueueWriteBuffer(queue, current, CL_TRUE, 0, distribution_bytes, arrays->initial, 0, NULL, NULL), "clEnqueueWriteBuffer(initial)");
    cl_int zero = 0;
    check_cl(api.EnqueueWriteBuffer(queue, error_flag, CL_TRUE, 0, sizeof(zero), &zero, 0, NULL, NULL), "clEnqueueWriteBuffer(error)");
    transfer_seconds += now_seconds() - write_started;
    for (int step = 0; step < config->steps; step += 1) {
      cl_uint index = 0;
      set_arg(&api, macro_kernel, index++, sizeof(current), &current);
      set_arg(&api, macro_kernel, index++, sizeof(rho), &rho);
      set_arg(&api, macro_kernel, index++, sizeof(ux), &ux);
      set_arg(&api, macro_kernel, index++, sizeof(uy), &uy);
      set_arg(&api, macro_kernel, index++, sizeof(mask), &mask);
      set_arg(&api, macro_kernel, index++, sizeof(force_x), &force_x);
      set_arg(&api, macro_kernel, index++, sizeof(force_y), &force_y);
      set_arg(&api, macro_kernel, index++, sizeof(config->nx), &config->nx);
      set_arg(&api, macro_kernel, index++, sizeof(config->ny), &config->ny);
      set_arg(&api, macro_kernel, index++, sizeof(config->body_mode), &config->body_mode);
      set_arg(&api, macro_kernel, index++, sizeof(center_x), &center_x);
      set_arg(&api, macro_kernel, index++, sizeof(center_y), &center_y);
      set_arg(&api, macro_kernel, index++, sizeof(radius), &radius);
      set_arg(&api, macro_kernel, index++, sizeof(body_velocity_x), &body_velocity_x);
      set_arg(&api, macro_kernel, index++, sizeof(body_velocity_y), &body_velocity_y);
      set_arg(&api, macro_kernel, index++, sizeof(config->mask_half_thickness), &config->mask_half_thickness);
      set_arg(&api, macro_kernel, index++, sizeof(inverse_penalty_time), &inverse_penalty_time);
      set_arg(&api, macro_kernel, index++, sizeof(error_flag), &error_flag);
      device_seconds += enqueue_profiled(&api, queue, macro_kernel, global_cells);
      index = 0;
      set_arg(&api, collide_kernel, index++, sizeof(current), &current);
      set_arg(&api, collide_kernel, index++, sizeof(streamed), &streamed);
      set_arg(&api, collide_kernel, index++, sizeof(rho), &rho);
      set_arg(&api, collide_kernel, index++, sizeof(ux), &ux);
      set_arg(&api, collide_kernel, index++, sizeof(uy), &uy);
      set_arg(&api, collide_kernel, index++, sizeof(force_x), &force_x);
      set_arg(&api, collide_kernel, index++, sizeof(force_y), &force_y);
      set_arg(&api, collide_kernel, index++, sizeof(config->nx), &config->nx);
      set_arg(&api, collide_kernel, index++, sizeof(config->ny), &config->ny);
      set_arg(&api, collide_kernel, index++, sizeof(shear_relaxation_rate), &shear_relaxation_rate);
      device_seconds += enqueue_profiled(&api, queue, collide_kernel, global_cells);
      index = 0;
      set_arg(&api, boundary_kernel, index++, sizeof(streamed), &streamed);
      set_arg(&api, boundary_kernel, index++, sizeof(config->nx), &config->nx);
      set_arg(&api, boundary_kernel, index++, sizeof(config->ny), &config->ny);
      set_arg(&api, boundary_kernel, index++, sizeof(INLET_VELOCITY), &INLET_VELOCITY);
      device_seconds += enqueue_profiled(&api, queue, boundary_kernel, global_rows);
      cl_mem previous = current;
      current = streamed;
      streamed = previous;
    }
  }
  const double steady_wall_seconds = now_seconds() - steady_started;
  timings->steady_compute = device_seconds;
  timings->synchronization = fmax(
    0.0,
    steady_wall_seconds - transfer_seconds - device_seconds
  );
  timings->device_compute = device_seconds;
  cl_uint index = 0;
  set_arg(&api, macro_kernel, index++, sizeof(current), &current);
  set_arg(&api, macro_kernel, index++, sizeof(rho), &rho);
  set_arg(&api, macro_kernel, index++, sizeof(ux), &ux);
  set_arg(&api, macro_kernel, index++, sizeof(uy), &uy);
  set_arg(&api, macro_kernel, index++, sizeof(mask), &mask);
  set_arg(&api, macro_kernel, index++, sizeof(force_x), &force_x);
  set_arg(&api, macro_kernel, index++, sizeof(force_y), &force_y);
  set_arg(&api, macro_kernel, index++, sizeof(config->nx), &config->nx);
  set_arg(&api, macro_kernel, index++, sizeof(config->ny), &config->ny);
  set_arg(&api, macro_kernel, index++, sizeof(config->body_mode), &config->body_mode);
  set_arg(&api, macro_kernel, index++, sizeof(center_x), &center_x);
  set_arg(&api, macro_kernel, index++, sizeof(center_y), &center_y);
  set_arg(&api, macro_kernel, index++, sizeof(radius), &radius);
  set_arg(&api, macro_kernel, index++, sizeof(body_velocity_x), &body_velocity_x);
  set_arg(&api, macro_kernel, index++, sizeof(body_velocity_y), &body_velocity_y);
  set_arg(&api, macro_kernel, index++, sizeof(config->mask_half_thickness), &config->mask_half_thickness);
  set_arg(&api, macro_kernel, index++, sizeof(inverse_penalty_time), &inverse_penalty_time);
  set_arg(&api, macro_kernel, index++, sizeof(error_flag), &error_flag);
  const double final_macro_seconds =
    enqueue_profiled(&api, queue, macro_kernel, global_cells);
  device_seconds += final_macro_seconds;
  timings->audit += final_macro_seconds;
  const double read_started = now_seconds();
  check_cl(api.EnqueueReadBuffer(queue, current, CL_TRUE, 0, distribution_bytes, arrays->distributions, 0, NULL, NULL), "clEnqueueReadBuffer(distributions)");
  check_cl(api.EnqueueReadBuffer(queue, rho, CL_TRUE, 0, scalar_bytes, arrays->rho, 0, NULL, NULL), "clEnqueueReadBuffer(rho)");
  check_cl(api.EnqueueReadBuffer(queue, ux, CL_TRUE, 0, scalar_bytes, arrays->ux, 0, NULL, NULL), "clEnqueueReadBuffer(ux)");
  check_cl(api.EnqueueReadBuffer(queue, uy, CL_TRUE, 0, scalar_bytes, arrays->uy, 0, NULL, NULL), "clEnqueueReadBuffer(uy)");
  check_cl(api.EnqueueReadBuffer(queue, mask, CL_TRUE, 0, scalar_bytes, arrays->mask, 0, NULL, NULL), "clEnqueueReadBuffer(mask)");
  check_cl(api.EnqueueReadBuffer(queue, force_x, CL_TRUE, 0, scalar_bytes, arrays->force_x, 0, NULL, NULL), "clEnqueueReadBuffer(force_x)");
  check_cl(api.EnqueueReadBuffer(queue, force_y, CL_TRUE, 0, scalar_bytes, arrays->force_y, 0, NULL, NULL), "clEnqueueReadBuffer(force_y)");
  cl_int error = 0;
  check_cl(api.EnqueueReadBuffer(queue, error_flag, CL_TRUE, 0, sizeof(error), &error, 0, NULL, NULL), "clEnqueueReadBuffer(error)");
  transfer_seconds += now_seconds() - read_started;
  timings->transfer = transfer_seconds;
  timings->device_compute = device_seconds;
  if (error != 0) fail("OpenCL density error flag is set");
  api.ReleaseMemObject(error_flag);
  api.ReleaseMemObject(force_y);
  api.ReleaseMemObject(force_x);
  api.ReleaseMemObject(mask);
  api.ReleaseMemObject(uy);
  api.ReleaseMemObject(ux);
  api.ReleaseMemObject(rho);
  api.ReleaseMemObject(distribution_b);
  api.ReleaseMemObject(distribution_a);
  api.ReleaseKernel(boundary_kernel);
  api.ReleaseKernel(collide_kernel);
  api.ReleaseKernel(macro_kernel);
  api.ReleaseProgram(program);
  api.ReleaseCommandQueue(queue);
  api.ReleaseContext(context);
  dlclose(library);
}

static void allocate_arrays(const Config *config, Arrays *arrays) {
  arrays->cells = (size_t)config->nx * (size_t)config->ny;
  arrays->initial = checked_calloc(9 * arrays->cells, sizeof(double));
  arrays->distributions = checked_calloc(9 * arrays->cells, sizeof(double));
  arrays->streamed = checked_calloc(9 * arrays->cells, sizeof(double));
  arrays->rho = checked_calloc(arrays->cells, sizeof(double));
  arrays->ux = checked_calloc(arrays->cells, sizeof(double));
  arrays->uy = checked_calloc(arrays->cells, sizeof(double));
  arrays->mask = checked_calloc(arrays->cells, sizeof(double));
  arrays->force_x = checked_calloc(arrays->cells, sizeof(double));
  arrays->force_y = checked_calloc(arrays->cells, sizeof(double));
}

static void free_arrays(Arrays *arrays) {
  free(arrays->force_y);
  free(arrays->force_x);
  free(arrays->mask);
  free(arrays->uy);
  free(arrays->ux);
  free(arrays->rho);
  free(arrays->streamed);
  free(arrays->distributions);
  free(arrays->initial);
}

static void audit_finite(const Arrays *arrays) {
  size_t nonfinite = 0;
  const size_t distribution_count = 9 * arrays->cells;
  #pragma omp parallel for schedule(static) reduction(+:nonfinite)
  for (size_t index = 0; index < distribution_count; index += 1) {
    nonfinite += isfinite(arrays->distributions[index]) ? 0u : 1u;
  }
  const double *fields[6] = {
    arrays->rho,
    arrays->ux,
    arrays->uy,
    arrays->mask,
    arrays->force_x,
    arrays->force_y,
  };
  for (int field = 0; field < 6; field += 1) {
    #pragma omp parallel for schedule(static) reduction(+:nonfinite)
    for (size_t index = 0; index < arrays->cells; index += 1) {
      nonfinite += isfinite(fields[field][index]) ? 0u : 1u;
    }
  }
  if (nonfinite != 0) fail("non-finite output detected");
}

static size_t write_output(const Config *config, const Arrays *arrays) {
  FILE *file = fopen(config->output_path, "wbx");
  if (file == NULL) {
    fprintf(stderr, "unable to create output: %s\n", strerror(errno));
    exit(2);
  }
  size_t written = 0;
  const size_t distribution_count = 9 * arrays->cells;
  if (fwrite(arrays->distributions, sizeof(double), distribution_count, file)
    != distribution_count) fail("failed to write distributions");
  written += distribution_count * sizeof(double);
  const double *fields[6] = {
    arrays->rho,
    arrays->ux,
    arrays->uy,
    arrays->mask,
    arrays->force_x,
    arrays->force_y,
  };
  for (int field = 0; field < 6; field += 1) {
    if (fwrite(fields[field], sizeof(double), arrays->cells, file) != arrays->cells) {
      fail("failed to write field");
    }
    written += arrays->cells * sizeof(double);
  }
  if (fflush(file) != 0) fail("fflush failed");
  if (fclose(file) != 0) fail("fclose failed");
  return written;
}

static int parse_int(const char *text, const char *name) {
  char *end = NULL;
  const long value = strtol(text, &end, 10);
  if (end == text || *end != '\0' || value < 0 || value > INT32_MAX) {
    fprintf(stderr, "invalid %s\n", name);
    exit(2);
  }
  return (int)value;
}

static double parse_double(const char *text, const char *name) {
  char *end = NULL;
  const double value = strtod(text, &end);
  if (end == text || *end != '\0' || !isfinite(value)) {
    fprintf(stderr, "invalid %s\n", name);
    exit(2);
  }
  return value;
}

static Config parse_args(int argc, char **argv) {
  Config config = {
    .backend = NULL,
    .output_path = NULL,
    .kernel_path = NULL,
    .nx = 0,
    .ny = 0,
    .steps = 0,
    .diameter = 0,
    .mask_half_thickness = 0.0,
    .phase_offset = 0.0,
    .body_mode = -1,
    .threads = 1,
    .batch_count = 1,
  };
  for (int index = 1; index < argc; index += 2) {
    if (index + 1 >= argc) fail("missing CLI value");
    const char *key = argv[index];
    const char *value = argv[index + 1];
    if (strcmp(key, "--backend") == 0) config.backend = value;
    else if (strcmp(key, "--output") == 0) config.output_path = value;
    else if (strcmp(key, "--kernel") == 0) config.kernel_path = value;
    else if (strcmp(key, "--nx") == 0) config.nx = parse_int(value, "nx");
    else if (strcmp(key, "--ny") == 0) config.ny = parse_int(value, "ny");
    else if (strcmp(key, "--steps") == 0) config.steps = parse_int(value, "steps");
    else if (strcmp(key, "--diameter") == 0) config.diameter = parse_int(value, "diameter");
    else if (strcmp(key, "--mask") == 0) config.mask_half_thickness = parse_double(value, "mask");
    else if (strcmp(key, "--phase") == 0) config.phase_offset = parse_double(value, "phase");
    else if (strcmp(key, "--body") == 0) config.body_mode = strcmp(value, "body-null") == 0 ? 0 : strcmp(value, "fixed-body") == 0 ? 1 : -1;
    else if (strcmp(key, "--threads") == 0) config.threads = parse_int(value, "threads");
    else if (strcmp(key, "--batch-count") == 0) config.batch_count = parse_int(value, "batch-count");
    else fail("unknown CLI argument");
  }
  if (config.backend == NULL || config.output_path == NULL || config.kernel_path == NULL
    || config.nx < 8 || config.ny < 8 || config.steps < 0 || config.diameter < 1
    || !(config.mask_half_thickness > 0.0) || config.body_mode < 0
    || config.threads < 1 || config.batch_count < 1) {
    fail("incomplete or invalid CLI configuration");
  }
  if (strcmp(config.backend, "cpu") != 0 && strcmp(config.backend, "opencl") != 0) {
    fail("backend must be cpu or opencl");
  }
  return config;
}

int main(int argc, char **argv) {
  const Config config = parse_args(argc, argv);
  const double wall_started = now_seconds();
  Arrays arrays = {0};
  Timings timings = {0};
  const double cold_started = now_seconds();
  allocate_arrays(&config, &arrays);
  initialize_fixture(&arrays);
  timings.cold_initialization = now_seconds() - cold_started;
  if (strcmp(config.backend, "cpu") == 0) {
    run_cpu(&config, &arrays, &timings);
  } else {
    run_opencl(&config, &arrays, &timings);
  }
  const double audit_started = now_seconds();
  audit_finite(&arrays);
  timings.audit += now_seconds() - audit_started;
  const double transfer_started = now_seconds();
  const size_t output_bytes = write_output(&config, &arrays);
  timings.transfer += now_seconds() - transfer_started;
  const double cleanup_started = now_seconds();
  free_arrays(&arrays);
  timings.cleanup = now_seconds() - cleanup_started;
  const double wall_time = now_seconds() - wall_started;
  const uint64_t work_units = (uint64_t)config.batch_count
    * (uint64_t)config.steps
    * (uint64_t)config.nx
    * (uint64_t)config.ny;
  printf(
    "{\"backend\":\"%s\",\"device\":\"%s\",\"nx\":%d,\"ny\":%d,"
    "\"steps\":%d,\"batchCount\":%d,\"threads\":%d,"
    "\"workUnits\":%" PRIu64 ",\"outputBytes\":%zu,"
    "\"wallTimeSeconds\":%.17g,\"coldInitializationSeconds\":%.17g,"
    "\"steadyComputeSeconds\":%.17g,\"deviceComputeSeconds\":%.17g,"
    "\"transferSeconds\":%.17g,\"synchronizationSeconds\":%.17g,"
    "\"auditSeconds\":%.17g,"
    "\"cleanupSeconds\":%.17g,\"scientificPayloadPersisted\":false}\n",
    config.backend,
    timings.device_name,
    config.nx,
    config.ny,
    config.steps,
    config.batch_count,
    config.threads,
    work_units,
    output_bytes,
    wall_time,
    timings.cold_initialization,
    timings.steady_compute,
    timings.device_compute,
    timings.transfer,
    timings.synchronization,
    timings.audit,
    timings.cleanup
  );
  return 0;
}
