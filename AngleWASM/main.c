#include "wasm_context.h"
#include <stdlib.h>

typedef struct {
    int programObject;
} UserData;

em_wasm_context_data_t *wasm_data;

//bool run_once = false;

void Draw(ESContext *es_context) {
//    if (!run_once){
//        run_once = true;

        EmWasmCallMainLoop(wasm_data);

        eglSwapBuffers(es_context->eglDisplay, es_context->eglSurface);
//    }
}

int main(int argc, char *argv[]) {

    wasm_data = CreateEmWasmContext();

    wasm_data->es_context = malloc(sizeof(ESContext));

    UserData userData;

    esInitContext(wasm_data->es_context);

    wasm_data->es_context->userData = &userData;

    esCreateWindow(wasm_data->es_context, "AngleWASM", 640, 480, ES_WINDOW_RGB);

    esRegisterDrawFunc(wasm_data->es_context, Draw);

    EmWasmCallStart(wasm_data);
}
