#ifndef INDEX_H_GENERATED_
#define INDEX_H_GENERATED_
/* Automically generated by wasm2c */
#ifdef __cplusplus
extern "C" {
#endif

#include <stdint.h>

#include "wasm-rt.h"

#ifndef WASM_RT_MODULE_PREFIX
#define WASM_RT_MODULE_PREFIX
#endif

#define WASM_RT_PASTE_(x, y) x ## y
#define WASM_RT_PASTE(x, y) WASM_RT_PASTE_(x, y)
#define WASM_RT_ADD_PREFIX(x) WASM_RT_PASTE(WASM_RT_MODULE_PREFIX, x)

/* TODO(binji): only use stdint.h types in header */
typedef uint8_t u8;
typedef int8_t s8;
typedef uint16_t u16;
typedef int16_t s16;
typedef uint32_t u32;
typedef int32_t s32;
typedef uint64_t u64;
typedef int64_t s64;
typedef float f32;
typedef double f64;

extern void WASM_RT_ADD_PREFIX(init)(void);

/* import: 'wasi_snapshot_preview1' 'proc_exit' */
extern void (*Z_wasi_snapshot_preview1Z_proc_exitZ_vi)(u32);
/* import: 'env' 'glAttachShader' */
extern void (*Z_envZ_glAttachShaderZ_vii)(u32, u32);
/* import: 'wasi_snapshot_preview1' 'fd_write' */
extern u32 (*Z_wasi_snapshot_preview1Z_fd_writeZ_iiiii)(u32, u32, u32, u32);
/* import: 'env' 'glGetShaderiv' */
extern void (*Z_envZ_glGetShaderivZ_viii)(u32, u32, u32);
/* import: 'env' 'glBindBuffer' */
extern void (*Z_envZ_glBindBufferZ_vii)(u32, u32);
/* import: 'env' 'glGetProgramiv' */
extern void (*Z_envZ_glGetProgramivZ_viii)(u32, u32, u32);
/* import: 'env' 'glLinkProgram' */
extern void (*Z_envZ_glLinkProgramZ_vi)(u32);
/* import: 'env' 'glBindAttribLocation' */
extern void (*Z_envZ_glBindAttribLocationZ_viii)(u32, u32, u32);
/* import: 'env' 'glCreateProgram' */
extern u32 (*Z_envZ_glCreateProgramZ_iv)(void);
/* import: 'env' 'glDeleteShader' */
extern void (*Z_envZ_glDeleteShaderZ_vi)(u32);
/* import: 'env' 'glGetShaderInfoLog' */
extern void (*Z_envZ_glGetShaderInfoLogZ_viiii)(u32, u32, u32, u32);
/* import: 'wasi_snapshot_preview1' 'args_get' */
extern u32 (*Z_wasi_snapshot_preview1Z_args_getZ_iii)(u32, u32);
/* import: 'wasi_snapshot_preview1' 'args_sizes_get' */
extern u32 (*Z_wasi_snapshot_preview1Z_args_sizes_getZ_iii)(u32, u32);
/* import: 'env' 'emscripten_set_main_loop' */
extern void (*Z_envZ_emscripten_set_main_loopZ_viii)(u32, u32, u32);
/* import: 'env' 'emscripten_webgl_make_context_current' */
extern u32 (*Z_envZ_emscripten_webgl_make_context_currentZ_ii)(u32);
/* import: 'env' 'emscripten_webgl_create_context' */
extern u32 (*Z_envZ_emscripten_webgl_create_contextZ_iii)(u32, u32);
/* import: 'env' 'emscripten_webgl_init_context_attributes' */
extern void (*Z_envZ_emscripten_webgl_init_context_attributesZ_vi)(u32);
/* import: 'env' 'emscripten_set_canvas_element_size' */
extern u32 (*Z_envZ_emscripten_set_canvas_element_sizeZ_iiii)(u32, u32, u32);
/* import: 'env' 'glDrawArrays' */
extern void (*Z_envZ_glDrawArraysZ_viii)(u32, u32, u32);
/* import: 'env' 'glEnableVertexAttribArray' */
extern void (*Z_envZ_glEnableVertexAttribArrayZ_vi)(u32);
/* import: 'env' 'glVertexAttribPointer' */
extern void (*Z_envZ_glVertexAttribPointerZ_viiiiii)(u32, u32, u32, u32, u32, u32);
/* import: 'env' 'glCompileShader' */
extern void (*Z_envZ_glCompileShaderZ_vi)(u32);
/* import: 'env' 'glUseProgram' */
extern void (*Z_envZ_glUseProgramZ_vi)(u32);
/* import: 'env' 'glClear' */
extern void (*Z_envZ_glClearZ_vi)(u32);
/* import: 'env' 'glViewport' */
extern void (*Z_envZ_glViewportZ_viiii)(u32, u32, u32, u32);
/* import: 'env' 'glBufferData' */
extern void (*Z_envZ_glBufferDataZ_viiii)(u32, u32, u32, u32);
/* import: 'env' 'glGenBuffers' */
extern void (*Z_envZ_glGenBuffersZ_vii)(u32, u32);
/* import: 'env' 'glClearColor' */
extern void (*Z_envZ_glClearColorZ_vffff)(f32, f32, f32, f32);
/* import: 'env' 'glDeleteProgram' */
extern void (*Z_envZ_glDeleteProgramZ_vi)(u32);
/* import: 'env' 'glGetProgramInfoLog' */
extern void (*Z_envZ_glGetProgramInfoLogZ_viiii)(u32, u32, u32, u32);
/* import: 'env' 'glShaderSource' */
extern void (*Z_envZ_glShaderSourceZ_viiii)(u32, u32, u32, u32);
/* import: 'env' 'glCreateShader' */
extern u32 (*Z_envZ_glCreateShaderZ_ii)(u32);

/* export: 'memory' */
extern wasm_rt_memory_t (*WASM_RT_ADD_PREFIX(Z_memory));
/* export: '__indirect_function_table' */
extern wasm_rt_table_t (*WASM_RT_ADD_PREFIX(Z___indirect_function_table));
/* export: '_start' */
extern void (*WASM_RT_ADD_PREFIX(Z__startZ_vv))(void);
/* export: 'fflush' */
extern u32 (*WASM_RT_ADD_PREFIX(Z_fflushZ_ii))(u32);
#ifdef __cplusplus
}
#endif

#endif  /* INDEX_H_GENERATED_ */