#define _POSIX_C_SOURCE 200809L

#include <dlfcn.h>
#include <errno.h>
#include <inttypes.h>
#include <omp.h>
#include <openssl/sha.h>
#include <pthread.h>
#include <stdint.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <sys/resource.h>
#include <time.h>

typedef int CUresult;
typedef int CUdevice;
typedef struct CUctx_st *CUcontext;
typedef struct CUmod_st *CUmodule;
typedef struct CUfunc_st *CUfunction;
typedef struct CUevent_st *CUevent;
typedef unsigned long long CUdeviceptr;

enum { CUDA_SUCCESS = 0 };

typedef CUresult (*cuInit_fn)(unsigned int);
typedef CUresult (*cuDeviceGet_fn)(CUdevice *, int);
typedef CUresult (*cuCtxCreate_fn)(CUcontext *, unsigned int, CUdevice);
typedef CUresult (*cuCtxDestroy_fn)(CUcontext);
typedef CUresult (*cuModuleLoadDataEx_fn)(CUmodule *, const void *, unsigned int, void *, void **);
typedef CUresult (*cuModuleGetFunction_fn)(CUfunction *, CUmodule, const char *);
typedef CUresult (*cuModuleUnload_fn)(CUmodule);
typedef CUresult (*cuMemAlloc_fn)(CUdeviceptr *, size_t);
typedef CUresult (*cuMemFree_fn)(CUdeviceptr);
typedef CUresult (*cuMemcpyDtoH_fn)(void *, CUdeviceptr, size_t);
typedef CUresult (*cuLaunchKernel_fn)(CUfunction, unsigned int, unsigned int, unsigned int,
                                     unsigned int, unsigned int, unsigned int, unsigned int,
                                     void *, void **, void **);
typedef CUresult (*cuCtxSynchronize_fn)(void);
typedef CUresult (*cuEventCreate_fn)(CUevent *, unsigned int);
typedef CUresult (*cuEventRecord_fn)(CUevent, void *);
typedef CUresult (*cuEventSynchronize_fn)(CUevent);
typedef CUresult (*cuEventElapsedTime_fn)(float *, CUevent, CUevent);
typedef CUresult (*cuEventDestroy_fn)(CUevent);
typedef CUresult (*cuGetErrorName_fn)(CUresult, const char **);
typedef CUresult (*cuGetErrorString_fn)(CUresult, const char **);

typedef struct {
  void *library;
  cuInit_fn Init;
  cuDeviceGet_fn DeviceGet;
  cuCtxCreate_fn CtxCreate;
  cuCtxDestroy_fn CtxDestroy;
  cuModuleLoadDataEx_fn ModuleLoadDataEx;
  cuModuleGetFunction_fn ModuleGetFunction;
  cuModuleUnload_fn ModuleUnload;
  cuMemAlloc_fn MemAlloc;
  cuMemFree_fn MemFree;
  cuMemcpyDtoH_fn MemcpyDtoH;
  cuLaunchKernel_fn LaunchKernel;
  cuCtxSynchronize_fn CtxSynchronize;
  cuEventCreate_fn EventCreate;
  cuEventRecord_fn EventRecord;
  cuEventSynchronize_fn EventSynchronize;
  cuEventElapsedTime_fn EventElapsedTime;
  cuEventDestroy_fn EventDestroy;
  cuGetErrorName_fn GetErrorName;
  cuGetErrorString_fn GetErrorString;
} cuda_api;

typedef struct {
  uint32_t *target;
  uint64_t global_offset;
  uint64_t count;
  uint32_t rounds;
  int gpu_index;
  double transfer_seconds;
  int status;
  char error[256];
} gpu_job;

static const char *PTX_SOURCE =
  ".version 8.0\n"
  ".target sm_80\n"
  ".address_size 64\n"
  "\n"
  ".visible .entry hw2_u32_kernel(\n"
  "  .param .u64 output_ptr,\n"
  "  .param .u64 global_offset,\n"
  "  .param .u64 element_count,\n"
  "  .param .u32 round_count\n"
  ")\n"
  "{\n"
  "  .reg .pred %p<4>;\n"
  "  .reg .b32 %r<32>;\n"
  "  .reg .b64 %rd<16>;\n"
  "  ld.param.u64 %rd1, [output_ptr];\n"
  "  ld.param.u64 %rd2, [global_offset];\n"
  "  ld.param.u64 %rd3, [element_count];\n"
  "  ld.param.u32 %r1, [round_count];\n"
  "  mov.u32 %r2, %tid.x;\n"
  "  mov.u32 %r3, %ctaid.x;\n"
  "  mov.u32 %r4, %ntid.x;\n"
  "  mad.lo.u32 %r5, %r3, %r4, %r2;\n"
  "  cvt.u64.u32 %rd4, %r5;\n"
  "  setp.ge.u64 %p1, %rd4, %rd3;\n"
  "  @%p1 bra DONE;\n"
  "  add.u64 %rd5, %rd2, %rd4;\n"
  "  cvt.u32.u64 %r6, %rd5;\n"
  "  xor.b32 %r7, %r6, 0x9e3779b9;\n"
  "  shr.u32 %r8, %r7, 16;\n"
  "  xor.b32 %r7, %r7, %r8;\n"
  "  mul.lo.u32 %r7, %r7, 0x7feb352d;\n"
  "  shr.u32 %r8, %r7, 15;\n"
  "  xor.b32 %r7, %r7, %r8;\n"
  "  mul.lo.u32 %r7, %r7, 0x846ca68b;\n"
  "  shr.u32 %r8, %r7, 16;\n"
  "  xor.b32 %r7, %r7, %r8;\n"
  "  mov.u32 %r9, 0;\n"
  "LOOP:\n"
  "  setp.ge.u32 %p2, %r9, %r1;\n"
  "  @%p2 bra STORE;\n"
  "  shl.b32 %r10, %r7, 13;\n"
  "  xor.b32 %r7, %r7, %r10;\n"
  "  shr.u32 %r10, %r7, 17;\n"
  "  xor.b32 %r7, %r7, %r10;\n"
  "  shl.b32 %r10, %r7, 5;\n"
  "  xor.b32 %r7, %r7, %r10;\n"
  "  mul.lo.u32 %r11, %r9, 0x85ebca6b;\n"
  "  add.u32 %r7, %r7, 0x9e3779b9;\n"
  "  add.u32 %r7, %r7, %r11;\n"
  "  shl.b32 %r12, %r7, 7;\n"
  "  shr.u32 %r13, %r7, 25;\n"
  "  or.b32 %r7, %r12, %r13;\n"
  "  add.u32 %r9, %r9, 1;\n"
  "  bra LOOP;\n"
  "STORE:\n"
  "  mul.wide.u32 %rd6, %r5, 4;\n"
  "  add.u64 %rd7, %rd1, %rd6;\n"
  "  st.global.u32 [%rd7], %r7;\n"
  "DONE:\n"
  "  ret;\n"
  "}\n";

static double monotonic_seconds(void) {
  struct timespec value;
  if (clock_gettime(CLOCK_MONOTONIC, &value) != 0) return 0.0;
  return (double)value.tv_sec + (double)value.tv_nsec / 1e9;
}

static double process_cpu_seconds(void) {
  struct timespec value;
  if (clock_gettime(CLOCK_PROCESS_CPUTIME_ID, &value) != 0) return 0.0;
  return (double)value.tv_sec + (double)value.tv_nsec / 1e9;
}

static uint32_t seed_u32(uint32_t index) {
  uint32_t value = index ^ UINT32_C(0x9e3779b9);
  value = (value ^ (value >> 16)) * UINT32_C(0x7feb352d);
  value = (value ^ (value >> 15)) * UINT32_C(0x846ca68b);
  return value ^ (value >> 16);
}

static uint32_t step_u32(uint32_t value, uint32_t round) {
  value ^= value << 13;
  value ^= value >> 17;
  value ^= value << 5;
  value += UINT32_C(0x9e3779b9) + round * UINT32_C(0x85ebca6b);
  return (value << 7) | (value >> 25);
}

__attribute__((optimize("no-tree-vectorize")))
static void compute_scalar(uint32_t *target, uint64_t offset, uint64_t count, uint32_t rounds) {
  for (uint64_t local = 0; local < count; local += 1) {
    uint32_t state = seed_u32((uint32_t)(offset + local));
    for (uint32_t round = 0; round < rounds; round += 1) state = step_u32(state, round);
    target[local] = state;
  }
}

static void compute_simd(uint32_t *target, uint64_t offset, uint64_t count, uint32_t rounds) {
  #pragma omp simd
  for (uint64_t local = 0; local < count; local += 1) {
    uint32_t state = seed_u32((uint32_t)(offset + local));
    for (uint32_t round = 0; round < rounds; round += 1) state = step_u32(state, round);
    target[local] = state;
  }
}

static void compute_threads(uint32_t *target, uint64_t offset, uint64_t count, uint32_t rounds, int threads) {
  omp_set_dynamic(0);
  omp_set_num_threads(threads);
  #pragma omp parallel for schedule(static)
  for (uint64_t local = 0; local < count; local += 1) {
    uint32_t state = seed_u32((uint32_t)(offset + local));
    for (uint32_t round = 0; round < rounds; round += 1) state = step_u32(state, round);
    target[local] = state;
  }
}

static void compute_bandwidth(uint32_t *target, const uint32_t *source, uint64_t count,
                              uint32_t rounds, int threads) {
  omp_set_dynamic(0);
  omp_set_num_threads(threads);
  for (uint32_t round = 0; round < rounds; round += 1) {
    #pragma omp parallel for schedule(static)
    for (uint64_t index = 0; index < count; index += 1) {
      target[index] = target[index] + source[index] + round;
    }
  }
}

static void *load_symbol(void *library, const char *primary, const char *fallback) {
  void *symbol = dlsym(library, primary);
  if (symbol == NULL && fallback != NULL) symbol = dlsym(library, fallback);
  return symbol;
}

static int load_cuda(cuda_api *api, char *error, size_t error_size) {
  memset(api, 0, sizeof(*api));
  api->library = dlopen("libcuda.so.1", RTLD_NOW | RTLD_LOCAL);
  if (api->library == NULL) {
    snprintf(error, error_size, "libcuda.so.1 unavailable: %s", dlerror());
    return 1;
  }
  api->Init = (cuInit_fn)load_symbol(api->library, "cuInit", NULL);
  api->DeviceGet = (cuDeviceGet_fn)load_symbol(api->library, "cuDeviceGet", NULL);
  api->CtxCreate = (cuCtxCreate_fn)load_symbol(api->library, "cuCtxCreate_v2", "cuCtxCreate");
  api->CtxDestroy = (cuCtxDestroy_fn)load_symbol(api->library, "cuCtxDestroy_v2", "cuCtxDestroy");
  api->ModuleLoadDataEx = (cuModuleLoadDataEx_fn)load_symbol(api->library, "cuModuleLoadDataEx", NULL);
  api->ModuleGetFunction = (cuModuleGetFunction_fn)load_symbol(api->library, "cuModuleGetFunction", NULL);
  api->ModuleUnload = (cuModuleUnload_fn)load_symbol(api->library, "cuModuleUnload", NULL);
  api->MemAlloc = (cuMemAlloc_fn)load_symbol(api->library, "cuMemAlloc_v2", "cuMemAlloc");
  api->MemFree = (cuMemFree_fn)load_symbol(api->library, "cuMemFree_v2", "cuMemFree");
  api->MemcpyDtoH = (cuMemcpyDtoH_fn)load_symbol(api->library, "cuMemcpyDtoH_v2", "cuMemcpyDtoH");
  api->LaunchKernel = (cuLaunchKernel_fn)load_symbol(api->library, "cuLaunchKernel", NULL);
  api->CtxSynchronize = (cuCtxSynchronize_fn)load_symbol(api->library, "cuCtxSynchronize", NULL);
  api->EventCreate = (cuEventCreate_fn)load_symbol(api->library, "cuEventCreate", NULL);
  api->EventRecord = (cuEventRecord_fn)load_symbol(api->library, "cuEventRecord", NULL);
  api->EventSynchronize = (cuEventSynchronize_fn)load_symbol(api->library, "cuEventSynchronize", NULL);
  api->EventElapsedTime = (cuEventElapsedTime_fn)load_symbol(api->library, "cuEventElapsedTime", NULL);
  api->EventDestroy = (cuEventDestroy_fn)load_symbol(api->library, "cuEventDestroy_v2", "cuEventDestroy");
  api->GetErrorName = (cuGetErrorName_fn)load_symbol(api->library, "cuGetErrorName", NULL);
  api->GetErrorString = (cuGetErrorString_fn)load_symbol(api->library, "cuGetErrorString", NULL);
  if (!api->Init || !api->DeviceGet || !api->CtxCreate || !api->CtxDestroy ||
      !api->ModuleLoadDataEx || !api->ModuleGetFunction || !api->ModuleUnload ||
      !api->MemAlloc || !api->MemFree || !api->MemcpyDtoH || !api->LaunchKernel ||
      !api->CtxSynchronize || !api->EventCreate || !api->EventRecord ||
      !api->EventSynchronize || !api->EventElapsedTime || !api->EventDestroy) {
    snprintf(error, error_size, "required CUDA driver symbol is unavailable");
    dlclose(api->library);
    api->library = NULL;
    return 1;
  }
  return 0;
}

static void cuda_error(cuda_api *api, CUresult result, const char *operation, char *error, size_t error_size) {
  const char *name = NULL;
  const char *description = NULL;
  if (api->GetErrorName) api->GetErrorName(result, &name);
  if (api->GetErrorString) api->GetErrorString(result, &description);
  snprintf(error, error_size, "%s failed: %s (%s)", operation,
           name ? name : "CUDA_ERROR", description ? description : "no description");
}

static int compute_gpu(uint32_t *target, uint64_t offset, uint64_t count, uint32_t rounds,
                       int gpu_index, double *transfer_seconds, char *error, size_t error_size) {
  cuda_api api;
  CUdevice device = 0;
  CUcontext context = NULL;
  CUmodule module = NULL;
  CUfunction function = NULL;
  CUevent start_event = NULL;
  CUevent stop_event = NULL;
  CUdeviceptr device_output = 0;
  CUresult result;
  int status = 1;
  if (load_cuda(&api, error, error_size) != 0) return 1;
  double gpu_operation_start = monotonic_seconds();
  #define CUDA_CALL(expression, label) do { \
    result = (expression); \
    if (result != CUDA_SUCCESS) { cuda_error(&api, result, label, error, error_size); goto cleanup; } \
  } while (0)
  CUDA_CALL(api.Init(0), "cuInit");
  CUDA_CALL(api.DeviceGet(&device, gpu_index), "cuDeviceGet");
  CUDA_CALL(api.CtxCreate(&context, 0, device), "cuCtxCreate");
  CUDA_CALL(api.ModuleLoadDataEx(&module, PTX_SOURCE, 0, NULL, NULL), "cuModuleLoadDataEx");
  CUDA_CALL(api.ModuleGetFunction(&function, module, "hw2_u32_kernel"), "cuModuleGetFunction");
  CUDA_CALL(api.MemAlloc(&device_output, (size_t)count * sizeof(uint32_t)), "cuMemAlloc");
  CUDA_CALL(api.EventCreate(&start_event, 0), "cuEventCreate(start)");
  CUDA_CALL(api.EventCreate(&stop_event, 0), "cuEventCreate(stop)");
  void *arguments[] = {&device_output, &offset, &count, &rounds};
  const unsigned int threads = 256;
  const unsigned int blocks = (unsigned int)((count + threads - 1) / threads);
  CUDA_CALL(api.EventRecord(start_event, NULL), "cuEventRecord(start)");
  CUDA_CALL(api.LaunchKernel(function, blocks, 1, 1, threads, 1, 1, 0, NULL, arguments, NULL), "cuLaunchKernel");
  CUDA_CALL(api.EventRecord(stop_event, NULL), "cuEventRecord(stop)");
  CUDA_CALL(api.EventSynchronize(stop_event), "cuEventSynchronize(stop)");
  float kernel_milliseconds = 0.0f;
  CUDA_CALL(api.EventElapsedTime(&kernel_milliseconds, start_event, stop_event), "cuEventElapsedTime");
  CUDA_CALL(api.MemcpyDtoH(target, device_output, (size_t)count * sizeof(uint32_t)), "cuMemcpyDtoH");
  double gpu_operation_seconds = monotonic_seconds() - gpu_operation_start;
  *transfer_seconds = gpu_operation_seconds > (double)kernel_milliseconds / 1000.0
    ? gpu_operation_seconds - (double)kernel_milliseconds / 1000.0
    : 0.0;
  status = 0;
cleanup:
  if (device_output != 0) api.MemFree(device_output);
  if (start_event != NULL) api.EventDestroy(start_event);
  if (stop_event != NULL) api.EventDestroy(stop_event);
  if (module != NULL) api.ModuleUnload(module);
  if (context != NULL) api.CtxDestroy(context);
  if (api.library != NULL) dlclose(api.library);
  #undef CUDA_CALL
  return status;
}

static void *gpu_thread_main(void *opaque) {
  gpu_job *job = (gpu_job *)opaque;
  job->status = compute_gpu(job->target, job->global_offset, job->count, job->rounds,
                            job->gpu_index, &job->transfer_seconds, job->error, sizeof(job->error));
  return NULL;
}

static void digest_hex(const uint32_t *population, uint64_t count, char output[65]) {
  unsigned char digest[SHA256_DIGEST_LENGTH];
  SHA256((const unsigned char *)population, (size_t)count * sizeof(uint32_t), digest);
  for (size_t index = 0; index < SHA256_DIGEST_LENGTH; index += 1) {
    snprintf(output + index * 2, 3, "%02x", digest[index]);
  }
  output[64] = '\0';
}

static uint64_t parse_u64_allow_zero(const char *value, const char *label) {
  char *end = NULL;
  errno = 0;
  unsigned long long parsed = strtoull(value, &end, 10);
  if (errno != 0 || end == value || *end != '\0') {
    fprintf(stderr, "NO-GO-HW2-NATIVE: invalid %s\n", label);
    exit(2);
  }
  return (uint64_t)parsed;
}

static uint64_t parse_u64(const char *value, const char *label) {
  uint64_t parsed = parse_u64_allow_zero(value, label);
  if (parsed == 0) {
    fprintf(stderr, "NO-GO-HW2-NATIVE: %s must be positive\n", label);
    exit(2);
  }
  return parsed;
}

static int parse_int(const char *value, const char *label) {
  uint64_t parsed = parse_u64(value, label);
  if (parsed > INT32_MAX) {
    fprintf(stderr, "NO-GO-HW2-NATIVE: %s exceeds int range\n", label);
    exit(2);
  }
  return (int)parsed;
}

static int parse_nonnegative_int(const char *value, const char *label) {
  uint64_t parsed = parse_u64_allow_zero(value, label);
  if (parsed > INT32_MAX) {
    fprintf(stderr, "NO-GO-HW2-NATIVE: %s exceeds int range\n", label);
    exit(2);
  }
  return (int)parsed;
}

int main(int argc, char **argv) {
  const char *mode = NULL;
  uint64_t elements = 0;
  uint64_t offset = 0;
  uint32_t rounds = 0;
  int threads = 1;
  int gpu_index = 0;
  for (int index = 1; index < argc; index += 1) {
    if (strcmp(argv[index], "--mode") == 0 && index + 1 < argc) mode = argv[++index];
    else if (strcmp(argv[index], "--elements") == 0 && index + 1 < argc) elements = parse_u64(argv[++index], "elements");
    else if (strcmp(argv[index], "--offset") == 0 && index + 1 < argc) offset = parse_u64_allow_zero(argv[++index], "offset");
    else if (strcmp(argv[index], "--rounds") == 0 && index + 1 < argc) rounds = (uint32_t)parse_u64(argv[++index], "rounds");
    else if (strcmp(argv[index], "--threads") == 0 && index + 1 < argc) threads = parse_int(argv[++index], "threads");
    else if (strcmp(argv[index], "--gpu-index") == 0 && index + 1 < argc) gpu_index = parse_nonnegative_int(argv[++index], "gpu-index");
    else {
      fprintf(stderr, "NO-GO-HW2-NATIVE: unknown or incomplete argument %s\n", argv[index]);
      return 2;
    }
  }
  if (mode == NULL || elements == 0 || rounds == 0 || offset + elements > UINT32_MAX) {
    fprintf(stderr, "NO-GO-HW2-NATIVE: mode/elements/rounds/range are required\n");
    return 2;
  }
  if (threads < 1) {
    fprintf(stderr, "NO-GO-HW2-NATIVE: threads must be positive\n");
    return 2;
  }
  uint32_t *population = NULL;
  if (posix_memalign((void **)&population, 64, (size_t)elements * sizeof(uint32_t)) != 0 || population == NULL) {
    fprintf(stderr, "NO-GO-HW2-NATIVE: allocation failed\n");
    return 3;
  }
  memset(population, 0, (size_t)elements * sizeof(uint32_t));
  double cpu_start = process_cpu_seconds();
  double transfer_seconds = 0.0;
  int gpu_used = 0;
  char error[256] = {0};
  int status = 0;
  uint32_t *bandwidth_source = NULL;
  if (strcmp(mode, "scalar") == 0) {
    compute_scalar(population, offset, elements, rounds);
  } else if (strcmp(mode, "simd") == 0) {
    compute_simd(population, offset, elements, rounds);
  } else if (strcmp(mode, "threads") == 0) {
    compute_threads(population, offset, elements, rounds, threads);
  } else if (strcmp(mode, "gpu") == 0) {
    gpu_used = 1;
    status = compute_gpu(population, offset, elements, rounds, gpu_index,
                         &transfer_seconds, error, sizeof(error));
  } else if (strcmp(mode, "hybrid") == 0) {
    gpu_used = 1;
    uint64_t cpu_count = elements / 4;
    uint64_t gpu_count = elements - cpu_count;
    gpu_job job = {
      .target = population + cpu_count,
      .global_offset = offset + cpu_count,
      .count = gpu_count,
      .rounds = rounds,
      .gpu_index = gpu_index,
      .transfer_seconds = 0.0,
      .status = 1,
      .error = {0},
    };
    pthread_t gpu_thread;
    if (pthread_create(&gpu_thread, NULL, gpu_thread_main, &job) != 0) {
      snprintf(error, sizeof(error), "pthread_create failed");
      status = 1;
    } else {
      compute_threads(population, offset, cpu_count, rounds, threads);
      pthread_join(gpu_thread, NULL);
      status = job.status;
      transfer_seconds = job.transfer_seconds;
      if (status != 0) snprintf(error, sizeof(error), "%s", job.error);
    }
  } else if (strcmp(mode, "bandwidth") == 0) {
    if (posix_memalign((void **)&bandwidth_source, 64, (size_t)elements * sizeof(uint32_t)) != 0 ||
        bandwidth_source == NULL) {
      snprintf(error, sizeof(error), "bandwidth source allocation failed");
      status = 1;
    } else {
      for (uint64_t index = 0; index < elements; index += 1) {
        population[index] = (uint32_t)index;
        bandwidth_source[index] = (uint32_t)(index ^ UINT32_C(0xa5a5a5a5));
      }
      compute_bandwidth(population, bandwidth_source, elements, rounds, threads);
    }
  } else {
    snprintf(error, sizeof(error), "unknown mode %s", mode);
    status = 1;
  }
  double cpu_seconds = process_cpu_seconds() - cpu_start;
  if (status != 0) {
    fprintf(stderr, "NO-GO-HW2-NATIVE: %s\n", error[0] ? error : "execution failed");
    free(bandwidth_source);
    free(population);
    return 4;
  }
  char digest[65];
  digest_hex(population, elements, digest);
  struct rusage usage;
  memset(&usage, 0, sizeof(usage));
  getrusage(RUSAGE_SELF, &usage);
  uint64_t peak_rss_bytes = (uint64_t)usage.ru_maxrss * 1024;
  printf("{\"classification\":\"synthetic-non-scientific\",\"mode\":\"%s\","
         "\"digest\":\"%s\",\"cpuSeconds\":%.9f,\"peakRssBytes\":%" PRIu64 ","
         "\"transferSeconds\":%.9f,\"gpuUsed\":%s}\n",
         mode, digest, cpu_seconds, peak_rss_bytes, transfer_seconds, gpu_used ? "true" : "false");
  free(bandwidth_source);
  free(population);
  return 0;
}
