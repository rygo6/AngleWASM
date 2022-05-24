#ifndef FABRIC_WASM_CONTEXT_H
#define FABRIC_WASM_CONTEXT_H

#include "esUtil.h"
#include <wasmtime.h>

#define MAX_SHADER_COUNT 10

typedef struct em_wasm_context_data em_wasm_context_data_t;

struct em_wasm_context_data {
    wasm_trap_t* (*CallMainLoop)(em_wasm_context_data_t *);

    wasmtime_context_t* context;
    wasmtime_store_t* store;
    wasmtime_instance_t instance;
    wasmtime_module_t* module;
    wasm_engine_t* engine;

    wasmtime_table_t indirect_table;
    wasmtime_memory_t memory;

    wasmtime_func_t main_loop_func;
    wasmtime_func_t start_func;

    char** shader_sources;

    GLuint program_object;

    int fps;
    int infiniteLoop;

    ESContext *es_context;
};

wasm_trap_t* EmWasmCallMainLoop(em_wasm_context_data_t *data);
wasm_trap_t* EmWasmCallStart(em_wasm_context_data_t *data);
em_wasm_context_data_t* CreateEmWasmContext();

#endif //FABRIC_WASM_CONTEXT_H