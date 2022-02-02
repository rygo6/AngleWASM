#include <stdio.h>
#include <stdlib.h>
#include <wasm.h>
#include <wasi.h>
#include "wasm_context.h"
#include "esUtil.h"

#define own

static void PrintError(const char *message, wasmtime_error_t *error, wasm_trap_t *trap) {
    fprintf(stderr, "error: %s\n", message);
    wasm_byte_vec_t error_message;
    if (error != NULL) {
        wasmtime_error_message(error, &error_message);
        wasmtime_error_delete(error);
    } else {
        wasm_trap_message(trap, &error_message);
        wasm_trap_delete(trap);
    }
    fprintf(stderr, "%.*s\n", (int) error_message.size, error_message.data);
    wasm_byte_vec_delete(&error_message);
}

static void ExitWithError(const char *message, wasmtime_error_t *error, wasm_trap_t *trap) {
    PrintError(message, error, trap);
    exit(1);
}

static void PrintArgs(const char* name, const wasmtime_val_t *args, size_t nargs) {
    char print_result[128];
    strcpy(print_result,  "> ");
    strncat(print_result, name, strlen(name));
    char buf[128];
    int n = 0;
    for (int i = 0; i < nargs; i++) {
        if (args[i].kind == WASMTIME_I32){
            n = sprintf(buf, " |  %d ", args[i].of.i32);
        }
        strncat(print_result, buf, n);
    }
    printf("%s\n", print_result);
}

wasm_trap_t* EmWasmCallStart(em_wasm_context_data_t *data) {
    const char* start_func_name = "_start";
    wasmtime_extern_t start_func;
    if (!wasmtime_instance_export_get(data->context, &data->instance, start_func_name, strlen(start_func_name), &start_func))
        fprintf(stderr, "Failed to find start function.\n");

    wasm_trap_t *trap = NULL;
    wasmtime_error_t *error = wasmtime_func_call(data->context, &start_func.of.func, NULL, 0, NULL, 0, &trap);
    if (error != NULL || trap != NULL)
        PrintError("error calling start", error, trap);

    return trap;
}

wasm_trap_t* EmWasmCallMainLoop(em_wasm_context_data_t *data) {
    wasm_trap_t *trap = NULL;
    wasmtime_error_t *error = wasmtime_func_call(data->context, &data->mainLoopFunc, NULL, 0, NULL, 0, &trap);
    if (error != NULL || trap != NULL)
        PrintError("error calling MainLoop", error, trap);
    return trap;
}

static wasm_trap_t* gl_attach_shader_cb(
        void *env,
        wasmtime_caller_t *caller,
        const wasmtime_val_t *args,
        size_t nargs,
        wasmtime_val_t *results,
        size_t nresults) {
    //  (type (;4;) (func (param i32 i32)))
    PrintArgs("gl_attach_shader_cb", args, nargs);
    GLuint program = args[0].of.i32;
    GLuint shader = args[1].of.i32;
    em_wasm_context_data_t *data = env;

//    function _glAttachShader(program, shader) {
//        GLctx.attachShader(GL.programs[program], GL.shaders[shader]);
//    }

    glAttachShader(program, shader);

    return NULL;
}

static wasm_trap_t* gl_get_shader_iv_cb(
        void *env,
        wasmtime_caller_t *caller,
        const wasmtime_val_t *args,
        size_t nargs,
        wasmtime_val_t *results,
        size_t nresults) {
    //  (type (;2;) (func (param i32 i32 i32)))
    PrintArgs("gl_get_shader_iv_cb", args, nargs);
    GLuint shader = args[0].of.i32;
    int pname = args[1].of.i32;
    int p = args[2].of.i32;
    em_wasm_context_data_t *data = env;

//    function _glGetShaderiv(shader, pname, p) {
//        if (!p) {
//            // GLES2 specification does not specify how to behave if p is a null pointer. Since calling this function does not make sense
//            // if p == null, issue a GL error to notify user about it.
//            GL.recordError(0x501 /* GL_INVALID_VALUE */);
//            return;
//        }
//        if (pname == 0x8B84) { // GL_INFO_LOG_LENGTH
//            var log = GLctx.getShaderInfoLog(GL.shaders[shader]);
//            if (log === null) log = '(unknown error)';
//            // The GLES2 specification says that if the shader has an empty info log,
//            // a value of 0 is returned. Otherwise the log has a null char appended.
//            // (An empty string is falsey, so we can just check that instead of
//            // looking at log.length.)
//            var logLength = log ? log.length + 1 : 0;
//            HEAP32[((p)>>2)] = logLength;
//        } else if (pname == 0x8B88) { // GL_SHADER_SOURCE_LENGTH
//            var source = GLctx.getShaderSource(GL.shaders[shader]);
//            // source may be a null, or the empty string, both of which are falsey
//            // values that we report a 0 length for.
//            var sourceLength = source ? source.length + 1 : 0;
//            HEAP32[((p)>>2)] = sourceLength;
//        } else {
//            HEAP32[((p)>>2)] = GLctx.getShaderParameter(GL.shaders[shader], pname);
//        }
//    }

    if (p == 0) {
        fprintf(stderr, "p is 0!");
        return wasm_trap_new((wasm_store_t *) data->store, "gl_get_shader_iv_cb p is 0!");
    }

    GLint compiled;

    if (pname == GL_INFO_LOG_LENGTH) {
        printf("GL_INFO_LOG_LENGTH");
        fprintf(stderr, "NOT IMPLEMENTED");
    } else if (pname == GL_SHADER_SOURCE_LENGTH) {
        printf("GL_SHADER_SOURCE_LENGTH");
        fprintf(stderr, "NOT IMPLEMENTED");
    } else if (pname == GL_COMPILE_STATUS){
        glGetShaderiv(shader, GL_COMPILE_STATUS, &compiled);
        wasmtime_memory_data(data->context, &data->memory)[p] = compiled;
        fprintf(stdout,"GL_COMPILE_STATUS %i\n\n", compiled);
    } else {
        fprintf(stderr, "PNAME NOT IMPLEMENTED");
    }

//    glGetShaderiv(shader, GL_COMPILE_STATUS, &compiled);

    return NULL;
}

static wasm_trap_t* gl_bind_buffer_cb(
        void *env,
        wasmtime_caller_t *caller,
        const wasmtime_val_t *args,
        size_t nargs,
        wasmtime_val_t *results,
        size_t nresults) {
    PrintArgs("gl_bind_buffer_cb", args, nargs);
    return NULL;
}

static wasm_trap_t* gl_get_program_iv_cb(
        void *env,
        wasmtime_caller_t *caller,
        const wasmtime_val_t *args,
        size_t nargs,
        wasmtime_val_t *results,
        size_t nresults) {
    //  (type (;2;) (func (param i32 i32 i32)))
    PrintArgs("gl_get_program_iv_cb", args, nargs);
    GLuint programObject = args[0].of.i32;
    int pname = args[1].of.i32;
    int p = args[2].of.i32;
    em_wasm_context_data_t *data = env;

//    function _glGetProgramiv(program, pname, p) {
//        if (!p) {
//            // GLES2 specification does not specify how to behave if p is a null pointer. Since calling this function does not make sense
//            // if p == null, issue a GL error to notify user about it.
//            GL.recordError(0x501 /* GL_INVALID_VALUE */);
//            return;
//        }
//
//        if (program >= GL.counter) {
//            GL.recordError(0x501 /* GL_INVALID_VALUE */);
//            return;
//        }
//
//        program = GL.programs[program];
//
//        if (pname == 0x8B84) { // GL_INFO_LOG_LENGTH
//            var log = GLctx.getProgramInfoLog(program);
//            if (log === null) log = '(unknown error)';
//            HEAP32[((p)>>2)] = log.length + 1;
//        } else if (pname == 0x8B87 /* GL_ACTIVE_UNIFORM_MAX_LENGTH */) {
//            if (!program.maxUniformLength) {
//                for (var i = 0; i < GLctx.getProgramParameter(program, 0x8B86/*GL_ACTIVE_UNIFORMS*/); ++i) {
//                    program.maxUniformLength = Math.max(program.maxUniformLength, GLctx.getActiveUniform(program, i).name.length+1);
//                }
//            }
//            HEAP32[((p)>>2)] = program.maxUniformLength;
//        } else if (pname == 0x8B8A /* GL_ACTIVE_ATTRIBUTE_MAX_LENGTH */) {
//            if (!program.maxAttributeLength) {
//                for (var i = 0; i < GLctx.getProgramParameter(program, 0x8B89/*GL_ACTIVE_ATTRIBUTES*/); ++i) {
//                    program.maxAttributeLength = Math.max(program.maxAttributeLength, GLctx.getActiveAttrib(program, i).name.length+1);
//                }
//            }
//            HEAP32[((p)>>2)] = program.maxAttributeLength;
//        } else if (pname == 0x8A35 /* GL_ACTIVE_UNIFORM_BLOCK_MAX_NAME_LENGTH */) {
//            if (!program.maxUniformBlockNameLength) {
//                for (var i = 0; i < GLctx.getProgramParameter(program, 0x8A36/*GL_ACTIVE_UNIFORM_BLOCKS*/); ++i) {
//                    program.maxUniformBlockNameLength = Math.max(program.maxUniformBlockNameLength, GLctx.getActiveUniformBlockName(program, i).length+1);
//                }
//            }
//            HEAP32[((p)>>2)] = program.maxUniformBlockNameLength;
//        } else {
//            HEAP32[((p)>>2)] = GLctx.getProgramParameter(program, pname);
//        }
//    }

    if (p == 0) {
        fprintf(stderr, "p is 0!");
        return wasm_trap_new((wasm_store_t *) data->store, "gl_get_shader_iv_cb p is 0!");
    }

    GLint linked;
    glGetProgramiv(programObject, pname, &linked);
    wasmtime_memory_data(data->context, &data->memory)[p] = linked;
    fprintf(stdout,"Linked %i\n\n", linked);

//    if (pname == GL_INFO_LOG_LENGTH) {
//        printf("GL_INFO_LOG_LENGTH");
//        fprintf(stderr, "NOT IMPLEMENTED");
//    } else if (pname == GL_ACTIVE_UNIFORM_MAX_LENGTH) {
//        printf("GL_ACTIVE_UNIFORM_MAX_LENGTH");
//        fprintf(stderr, "NOT IMPLEMENTED");
//    } else if (pname == GL_ACTIVE_ATTRIBUTE_MAX_LENGTH){
//        fprintf(stdout,"GL_ACTIVE_ATTRIBUTE_MAX_LENGTH %i\n\n", compiled);
//    } else if (pname == 0x8A35){ //GL_ACTIVE_UNIFORM_BLOCK_MAX_NAME_LENGTH
//        fprintf(stdout,"GL_ACTIVE_UNIFORM_BLOCK_MAX_NAME_LENGTH %i\n\n", compiled);
//    } else {
//        fprintf(stderr, "PNAME NOT IMPLEMENTED");
//    }


    return NULL;
}

static wasm_trap_t* gl_link_program_cb(
        void *env,
        wasmtime_caller_t *caller,
        const wasmtime_val_t *args,
        size_t nargs,
        wasmtime_val_t *results,
        size_t nresults) {
    PrintArgs("gl_link_program_cb", args, nargs);

    GLuint programObject = args[0].of.i32;

//    function _glLinkProgram(program) {
//        program = GL.programs[program];
//        GLctx.linkProgram(program);
//        // Invalidate earlier computed uniform->ID mappings, those have now become stale
//        program.uniformLocsById = 0; // Mark as null-like so that glGetUniformLocation() knows to populate this again.
//        program.uniformSizeAndIdsByName = {};
//
//    }

    glLinkProgram(programObject);

    return NULL;
}

static wasm_trap_t* gl_bind_attrib_location_cb(
        void *env,
        wasmtime_caller_t *caller,
        const wasmtime_val_t *args,
        size_t nargs,
        wasmtime_val_t *results,
        size_t nresults) {
    //  (type (;5;) (func (param i32 i32 i32)))
    PrintArgs("gl_bind_attrib_location_cb", args, nargs);
    em_wasm_context_data_t *data = env;

    GLuint programObject = args[0].of.i32;
    GLuint index = args[1].of.i32;
    int name_ptr = args[2].of.i32;

//    function _glBindAttribLocation(program, index, name) {
//        GLctx.bindAttribLocation(GL.programs[program], index, UTF8ToString(name));
//    }

    char buf[1024];
    int offset = 0;
    uint8_t current = 0;
    do {
        current = wasmtime_memory_data(data->context, &data->memory)[name_ptr + offset];
        buf[offset] = (char)current;
        offset++;
    } while (current != 0);
    char *name = (char *)malloc(offset * sizeof(char));
    strcpy_s(name, offset, buf);

    fprintf(stdout, "_glBindAttribLocation %i %i %s\n\n", programObject, index, name);

    glBindAttribLocation(programObject, index, name);

    return NULL;
}

static wasm_trap_t* glCreateProgramCb(
        void *env,
        wasmtime_caller_t *caller,
        const wasmtime_val_t *args,
        size_t nargs,
        wasmtime_val_t *results,
        size_t nresults) {
    //  (type (;13;) (func (result i32)))
    PrintArgs("glCreateProgramCb", args, nargs);
    em_wasm_context_data_t *data = env;

//    function _glCreateProgram() {
//        var id = GL.getNewId(GL.programs);
//        var program = GLctx.createProgram();
//        // Store additional information needed for each shader program:
//        program.name = id;
//        // Lazy cache results of glGetProgramiv(GL_ACTIVE_UNIFORM_MAX_LENGTH/GL_ACTIVE_ATTRIBUTE_MAX_LENGTH/GL_ACTIVE_UNIFORM_BLOCK_MAX_NAME_LENGTH)
//        program.maxUniformLength = program.maxAttributeLength = program.maxUniformBlockNameLength = 0;
//        program.uniformIdCounter = 1;
//        GL.programs[id] = program;
//        return id;
//    }

    data->program_object = glCreateProgram();

    if (data->program_object == 0)
    {
        fprintf(stderr, "Failed to create program!");
        return wasm_trap_new((wasm_store_t *) data->store, (const wasm_message_t *) "gl_get_shader_iv_cb p is 0!");
    }

    fprintf(stdout, "Created program_object %i\n\n", data->program_object);
    results[0].of.i32 = data->program_object;

    //return i32
    return NULL;
}

static wasm_trap_t* gl_delete_shader_cb(
        void *env,
        wasmtime_caller_t *caller,
        const wasmtime_val_t *args,
        size_t nargs,
        wasmtime_val_t *results,
        size_t nresults) {
    PrintArgs("gl_delete_shader_cb", args, nargs);
    return NULL;
}

static wasm_trap_t* gl_get_shader_info_log_cb(
        void *env,
        wasmtime_caller_t *caller,
        const wasmtime_val_t *args,
        size_t nargs,
        wasmtime_val_t *results,
        size_t nresults) {
    PrintArgs("gl_get_shader_info_log_cb", args, nargs);
    return NULL;
}

static wasm_trap_t* EmscriptenSetMainLoopCb(
        void *env,
        wasmtime_caller_t *caller,
        const wasmtime_val_t *args,
        size_t nargs,
        wasmtime_val_t *results,
        size_t nresults) {
    //  (type (;2;) (func (param i32 i32 i32)))
    PrintArgs("EmscriptenSetMainLoopCb", args, nargs);
    em_wasm_context_data_t *data = env;

    int funcIndex = args[0].of.i32;
    data->fps = args[1].of.i32;
    data->infiniteLoop = args[2].of.i32;

    wasmtime_val_t func_val;
    bool found = wasmtime_table_get(data->context, &data->indirect_table, funcIndex, &func_val);
    if (!found)
        printf("Failed to find entry in table!");

    data->mainLoopFunc = func_val.of.funcref;
    data->CallMainLoop = EmWasmCallMainLoop;

    // Run once.
//    data->CallMainLoop(data);

    return NULL;
}

static wasm_trap_t* emscripten_webgl_make_context_current_cb(
        void *env,
        wasmtime_caller_t *caller,
        const wasmtime_val_t *args,
        size_t nargs,
        wasmtime_val_t *results,
        size_t nresults) {

    //  (type (;1;) (func (param i32) (result i32)))
    PrintArgs("emscripten_webgl_make_context_current_cb", args, nargs);

//    function _emscripten_webgl_make_context_current(contextHandle) {
//        var success = GL.makeContextCurrent(contextHandle);
//        return success ? 0 : -5;
//    }

    // return 0
    results[0].of.i32= 0;

    return NULL;
}

static wasm_trap_t* emscripten_webgl_create_context_cb(
        void *env,
        wasmtime_caller_t *caller,
        const wasmtime_val_t *args,
        size_t nargs,
        wasmtime_val_t *results,
        size_t nresults) {
    //  (type (;5;) (func (param i32 i32) (result i32)))
    PrintArgs("emscripten_webgl_create_context_cb", args, nargs);

//    function _emscripten_webgl_do_create_context(target, attributes) {
//        var a = attributes >> 2;
//        var powerPreference = HEAP32[a + (24 >> 2)];
//        var contextAttributes = {
//                alpha: !!HEAP32[a + (0 >> 2)],
//                depth: !!HEAP32[a + (4 >> 2)],
//                stencil: !!HEAP32[a + (8 >> 2)],
//                antialias: !!HEAP32[a + (12 >> 2)],
//                premultipliedAlpha: !!HEAP32[a + (16 >> 2)],
//                preserveDrawingBuffer: !!HEAP32[a + (20 >> 2)],
//                powerPreference: __emscripten_webgl_power_preferences[powerPreference],
//                failIfMajorPerformanceCaveat: !!HEAP32[a + (28 >> 2)],
//                majorVersion: HEAP32[a + (32 >> 2)],
//                minorVersion: HEAP32[a + (36 >> 2)],
//                enableExtensionsByDefault: HEAP32[a + (40 >> 2)],
//                explicitSwapControl: HEAP32[a + (44 >> 2)],
//                proxyContextToMainThread: HEAP32[a + (48 >> 2)],
//                renderViaOffscreenBackBuffer: HEAP32[a + (52 >> 2)],
//        };
//        var canvas = findCanvasEventTarget(target);
//        if (!canvas) {
//            return 0;
//        }
//        if (contextAttributes.explicitSwapControl) {
//            return 0;
//        }
//        var contextHandle = GL.createContext(canvas, contextAttributes);
//        return contextHandle;
//    }
//    function _emscripten_webgl_create_context(a0, a1) {
//        return _emscripten_webgl_do_create_context(a0, a1);
//    }

    // return 1
    results[0].of.i32 = 100;

    return NULL;
}

static wasm_trap_t* EmscriptenWebglInitContextAttributesCb(
        void *env,
        wasmtime_caller_t *caller,
        const wasmtime_val_t *args,
        size_t nargs,
        wasmtime_val_t *results,
        size_t nresults) {
    PrintArgs("EmscriptenWebglInitContextAttributesCb", args, nargs);

//    function _emscripten_webgl_init_context_attributes(attributes) {
//        var a = attributes >> 2;
//        for (var i = 0; i < 56 >> 2; ++i) {
//            HEAP32[a + i] = 0;
//        }
//        HEAP32[a + (0 >> 2)] =
//        HEAP32[a + (4 >> 2)] =
//        HEAP32[a + (12 >> 2)] =
//        HEAP32[a + (16 >> 2)] =
//        HEAP32[a + (32 >> 2)] =
//        HEAP32[a + (40 >> 2)] =
//                1;
//    }

    return NULL;
}

static wasm_trap_t* EmscriptenSetCanvasElementSizeCb(
        void *env,
        wasmtime_caller_t *caller,
        const wasmtime_val_t *args,
        size_t nargs,
        wasmtime_val_t *results,
        size_t nresults) {
    //  (type (;3;) (func (param i32 i32 i32) (result i32)))
    PrintArgs("EmscriptenSetCanvasElementSizeCb", args, nargs);

//    function _emscripten_set_canvas_element_size(target, width, height) {
//        var canvas = findCanvasEventTarget(target);
//        if (!canvas) return -4;
//        canvas.width = width;
//        canvas.height = height;
//        return 0;
//    }

    // return 0
    results[0].of.i32 = 0;

    return NULL;
}

static wasm_trap_t* gl_draw_arrays_cb(
        void *env,
        wasmtime_caller_t *caller,
        const wasmtime_val_t *args,
        size_t nargs,
        wasmtime_val_t *results,
        size_t nresults) {
    PrintArgs("gl_draw_arrays_cb", args, nargs);
    return NULL;
}

static wasm_trap_t* gl_enable_vertex_attrib_array_cb(
        void *env,
        wasmtime_caller_t *caller,
        const wasmtime_val_t *args,
        size_t nargs,
        wasmtime_val_t *results,
        size_t nresults) {
    PrintArgs("gl_enable_vertex_attrib_array_cb", args, nargs);
    return NULL;
}

static wasm_trap_t* gl_vertex_attrib_pointer_cb(
        void *env,
        wasmtime_caller_t *caller,
        const wasmtime_val_t *args,
        size_t nargs,
        wasmtime_val_t *results,
        size_t nresults) {
    PrintArgs("gl_vertex_attrib_pointer_cb", args, nargs);
    return NULL;
}

static wasm_trap_t* glCompileShaderCb(
        void *env,
        wasmtime_caller_t *caller,
        const wasmtime_val_t *args,
        size_t nargs,
        wasmtime_val_t *results,
        size_t nresults) {
    //  (type (;0;) (func (param i32)))
    PrintArgs("glCompileShaderCb", args, nargs);

    int shader_index = args[0].of.i32;

//    function _glCompileShader(shader) {
//        GLctx.compileShader(GL.shaders[shader]);
//    }

    glCompileShader(shader_index);

    return NULL;
}

static wasm_trap_t* gl_use_program_cb(
        void *env,
        wasmtime_caller_t *caller,
        const wasmtime_val_t *args,
        size_t nargs,
        wasmtime_val_t *results,
        size_t nresults) {
    PrintArgs("gl_use_program_cb", args, nargs);
    return NULL;
}

static wasm_trap_t* gl_clear_cb(
        void *env,
        wasmtime_caller_t *caller,
        const wasmtime_val_t *args,
        size_t nargs,
        wasmtime_val_t *results,
        size_t nresults) {
    PrintArgs("gl_clear_cb", args, nargs);
    return NULL;
}

static wasm_trap_t* gl_viewport_cb(
        void *env,
        wasmtime_caller_t *caller,
        const wasmtime_val_t *args,
        size_t nargs,
        wasmtime_val_t *results,
        size_t nresults) {
    PrintArgs("gl_viewport_cb", args, nargs);
    return NULL;
}

static wasm_trap_t* gl_buffer_data_cb(
        void *env,
        wasmtime_caller_t *caller,
        const wasmtime_val_t *args,
        size_t nargs,
        wasmtime_val_t *results,
        size_t nresults) {
    PrintArgs("gl_buffer_data_cb", args, nargs);
    return NULL;
}

static wasm_trap_t* gl_gen_buffers_cb(
        void *env,
        wasmtime_caller_t *caller,
        const wasmtime_val_t *args,
        size_t nargs,
        wasmtime_val_t *results,
        size_t nresults) {
    PrintArgs("gl_gen_buffers_cb", args, nargs);
    return NULL;
}

static wasm_trap_t* glClearColorCb(
        void *env,
        wasmtime_caller_t *caller,
        const wasmtime_val_t *args,
        size_t nargs,
        wasmtime_val_t *results,
        size_t nresults) {
    //  (type (;15;) (func (param f32 f32 f32 f32)))
    PrintArgs("glClearColorCb", args, nargs);

    GLclampf r = args[0].of.f32;
    GLclampf g = args[1].of.f32;
    GLclampf b = args[2].of.f32;
    GLclampf a = args[3].of.f32;

//    function _glClearColor(x0, x1, x2, x3) { GLctx['clearColor'](x0, x1, x2, x3) }

    glClearColor(r, g, b, a);

    return NULL;
}

static wasm_trap_t* gl_delete_program_cb(
        void *env,
        wasmtime_caller_t *caller,
        const wasmtime_val_t *args,
        size_t nargs,
        wasmtime_val_t *results,
        size_t nresults) {
    PrintArgs("gl_delete_program_cb", args, nargs);
    return NULL;
}

static wasm_trap_t* gl_get_program_info_log_cb(
        void *env,
        wasmtime_caller_t *caller,
        const wasmtime_val_t *args,
        size_t nargs,
        wasmtime_val_t *results,
        size_t nresults) {
    PrintArgs("gl_get_program_info_log_cb", args, nargs);
    return NULL;
}

static wasm_trap_t* glShaderSourceCb(
        void *env,
        wasmtime_caller_t *caller,
        const wasmtime_val_t *args,
        size_t nargs,
        wasmtime_val_t *results,
        size_t nresults) {
    //  (type (;6;) (func (param i32 i32 i32 i32)))
    PrintArgs("glShaderSourceCb", args, nargs);
    em_wasm_context_data_t *data = env;

    int shader_index = args[0].of.i32;
    int shader_count = args[1].of.i32;
    int source_arr_ptr = args[2].of.i32;
    int length_arr_ptr = args[3].of.i32;

//    function _glShaderSource(shader, shader_count, string, length) {
//        var source = GL.getSource(shader, shader_count, string, length);
//        GLctx.shaderSource(GL.shaders[shader], source);
//    }
//    getSource: function (shader, shader_count, string, length) {
//        var source = "";
//        for (var i = 0; i < shader_count; ++i) {
//            var len = length ? HEAP32[(length + i * 4) >> 2] : -1;
//            source += UTF8ToString(
//                    HEAP32[(string + i * 4) >> 2],
//                    len < 0 ? undefined : len
//            );
//        }
//        return source;
//    },

    if (shader_count > 1) {
        fprintf(stderr, "More than 1 shader, not implemented!");
    }

    int subshader_index = 0;
    int sourcePtr = wasmtime_memory_data(data->context, &data->memory)[source_arr_ptr + subshader_index + 0] +
                    (wasmtime_memory_data(data->context, &data->memory)[source_arr_ptr + subshader_index + 1] << 8) +
                    (wasmtime_memory_data(data->context, &data->memory)[source_arr_ptr + subshader_index + 2] << 16) +
                    (wasmtime_memory_data(data->context, &data->memory)[source_arr_ptr + subshader_index + 3] << 24);

    int length = -1;
    if (length_arr_ptr != 0){
        length = wasmtime_memory_data(data->context, &data->memory)[length_arr_ptr + subshader_index + 0] +
                     (wasmtime_memory_data(data->context, &data->memory)[length_arr_ptr + subshader_index + 1] << 8) +
                     (wasmtime_memory_data(data->context, &data->memory)[length_arr_ptr + subshader_index + 2] << 16) +
                     (wasmtime_memory_data(data->context, &data->memory)[length_arr_ptr + subshader_index + 3] << 24);
    }
    // length is 0? If not zero need to implement non-null termination

    char buf[1024]; // Can I get rid of buffer and copy into dynamically alloced shader directly?
    int offset = 0;
    uint8_t current = 0;
    do {
        current = wasmtime_memory_data(data->context, &data->memory)[sourcePtr + offset];
        buf[offset] = (char)current;
        offset++;
    } while (current != 0);

    char *shader_source = (char *)malloc(offset * sizeof(char));
    strcpy_s(shader_source, offset, buf);

    printf("\"%s\"\n\n", shader_source);

    data->shader_sources[shader_index] = shader_source;

    glShaderSource(shader_index, 1, &shader_source, NULL);

    return NULL;
}

static wasm_trap_t* glCreateShaderCb(
        void *env,
        wasmtime_caller_t *caller,
        const wasmtime_val_t *args,
        size_t nargs,
        wasmtime_val_t *results,
        size_t nresults) {
    //  (type (;13;) (func (result i32)))
    PrintArgs("glCreateShaderCb", args, nargs);

    GLenum type = args[0].of.i32;
    GLuint shader;

//    function _glCreateShader(shaderType) {
//        var id = GL.getNewId(GL.shaders);
//        GL.shaders[id] = GLctx.createShader(shaderType);
//        return id;
//    }

    shader = glCreateShader(type);

    if (shader == 0){
        fprintf(stderr, "could not create shader: \n");
        return 0;
    }

    results[0].of.i32 = shader;

    return NULL;
}

static wasm_trap_t* generic_cb_unchecked(
        void *env,
        wasmtime_caller_t *caller,
        const wasmtime_val_raw_t *args_and_results) {
    printf("> generic_cb_unchecked!\n");
    return NULL;
}

static void define_func(
        em_wasm_context_data_t *wasmContextData,
        wasmtime_linker_t *linker,
        const char *module,
        const char *name,
        wasm_functype_t *ty,
        wasmtime_func_callback_t cb) {
    wasmtime_error_t* error = wasmtime_linker_define_func(linker, module, strlen(module), name, strlen(name), ty, cb, wasmContextData, NULL);
    if (error != NULL)
        ExitWithError("failed to link wasi", error, NULL);
    wasm_functype_delete(ty);
}

static void define_func_unchecked(
        wasmtime_linker_t *linker,
        const char *module,
        const char *name,
        wasm_functype_t *ty,
        wasmtime_func_unchecked_callback_t cb) {
    wasmtime_error_t* error = wasmtime_linker_define_func_unchecked(linker, module, strlen(module), name, strlen(name), ty, cb, NULL, NULL);
    if (error != NULL)
        ExitWithError("failed to link wasi", error, NULL);
    wasm_functype_delete(ty);
}

static inline own wasm_functype_t* wasm_functype_new_4_0(
        own wasm_valtype_t* p1, own wasm_valtype_t* p2, own wasm_valtype_t* p3, own wasm_valtype_t* p4
) {
    wasm_valtype_t* ps[4] = {p1, p2, p3, p4};
    wasm_valtype_vec_t params, results;
    wasm_valtype_vec_new(&params, 4, ps);
    wasm_valtype_vec_new_empty(&results);
    return wasm_functype_new(&params, &results);
}

static inline own wasm_functype_t* wasm_functype_new_6_0(
        own wasm_valtype_t* p1, own wasm_valtype_t* p2, own wasm_valtype_t* p3, own wasm_valtype_t* p4, own wasm_valtype_t* p5, own wasm_valtype_t* p6
) {
    wasm_valtype_t* ps[6] = {p1, p2, p3, p4, p5, p6};
    wasm_valtype_vec_t params, results;
    wasm_valtype_vec_new(&params, 6, ps);
    wasm_valtype_vec_new_empty(&results);
    return wasm_functype_new(&params, &results);
}

void Cleanup(em_wasm_context_data_t* data){
    wasmtime_module_delete(data->module);
    wasmtime_store_delete(data->store);
    wasm_engine_delete(data->engine);
}

em_wasm_context_data_t* CreateEmWasmContext() {
    em_wasm_context_data_t* data = malloc(sizeof(em_wasm_context_data_t));

    // Set up our context
    data->engine = wasm_engine_new();
    assert(data->engine != NULL);

    data->store = wasmtime_store_new(data->engine, NULL, NULL);
    assert(data->store);

    data->context = wasmtime_store_context(data->store);
    assert(data->context != NULL);

    // Create a linker with WASI functions defined
    wasmtime_linker_t *linker = wasmtime_linker_new(data->engine);
    wasmtime_error_t *error = wasmtime_linker_define_wasi(linker);
    if (error != NULL)
        ExitWithError("failed to link wasi", error, NULL);

    const char* env_module = "env";

    define_func(data, linker, env_module, "glAttachShader",
                wasm_functype_new_2_0(
                        wasm_valtype_new_i32(),
                        wasm_valtype_new_i32()),
                gl_attach_shader_cb);

    define_func(data, linker, env_module, "glGetShaderiv",
                wasm_functype_new_3_0(
                        wasm_valtype_new_i32(),
                        wasm_valtype_new_i32(),
                        wasm_valtype_new_i32()),
                gl_get_shader_iv_cb);

    define_func(data, linker, env_module, "glBindBuffer",
                wasm_functype_new_2_0(
                        wasm_valtype_new_i32(),
                        wasm_valtype_new_i32()),
                gl_bind_buffer_cb);

    define_func(data, linker, env_module, "glGetProgramiv",
                wasm_functype_new_3_0(
                        wasm_valtype_new_i32(),
                        wasm_valtype_new_i32(),
                        wasm_valtype_new_i32()),
                gl_get_program_iv_cb);

    define_func(data, linker, env_module, "glLinkProgram",
                wasm_functype_new_1_0(
                        wasm_valtype_new_i32()),
                gl_link_program_cb);

    define_func(data, linker, env_module, "glBindAttribLocation",
                wasm_functype_new_3_0(
                        wasm_valtype_new_i32(),
                        wasm_valtype_new_i32(),
                        wasm_valtype_new_i32()),
                gl_bind_attrib_location_cb);

    define_func(data, linker, env_module, "glCreateProgram",
                wasm_functype_new_0_1(
                        wasm_valtype_new_i32()),
                glCreateProgramCb);

    define_func(data, linker, env_module, "glDeleteShader",
                wasm_functype_new_1_0(
                        wasm_valtype_new_i32()),
                gl_delete_shader_cb);

    define_func(data, linker, env_module, "glGetShaderInfoLog",
                wasm_functype_new_4_0(
                        wasm_valtype_new_i32(),
                        wasm_valtype_new_i32(),
                        wasm_valtype_new_i32(),
                        wasm_valtype_new_i32()),
                gl_get_shader_info_log_cb);

    define_func(data, linker, env_module, "emscripten_set_main_loop",
                wasm_functype_new_3_0(
                        wasm_valtype_new_i32(),
                        wasm_valtype_new_i32(),
                        wasm_valtype_new_i32()),
                EmscriptenSetMainLoopCb);

    define_func(data, linker, env_module, "emscripten_webgl_make_context_current",
                wasm_functype_new_1_1(
                        wasm_valtype_new_i32(),
                        wasm_valtype_new_i32()),
                emscripten_webgl_make_context_current_cb);

    define_func(data, linker, env_module, "emscripten_webgl_create_context",
                wasm_functype_new_2_1(
                        wasm_valtype_new_i32(),
                        wasm_valtype_new_i32(),
                        wasm_valtype_new_i32()),
                emscripten_webgl_create_context_cb);

    define_func(data, linker, env_module, "emscripten_webgl_init_context_attributes",
                wasm_functype_new_1_0(
                        wasm_valtype_new_i32()),
                EmscriptenWebglInitContextAttributesCb);

    define_func(data, linker, env_module, "emscripten_set_canvas_element_size",
                wasm_functype_new_3_1(
                        wasm_valtype_new_i32(),
                        wasm_valtype_new_i32(),
                        wasm_valtype_new_i32(),
                        wasm_valtype_new_i32()),
                EmscriptenSetCanvasElementSizeCb);

    define_func(data, linker, env_module, "glDrawArrays",
                wasm_functype_new_3_0(
                        wasm_valtype_new_i32(),
                        wasm_valtype_new_i32(),
                        wasm_valtype_new_i32()),
                gl_draw_arrays_cb);

    define_func(data, linker, env_module, "glEnableVertexAttribArray",
                wasm_functype_new_1_0(
                        wasm_valtype_new_i32()),
                gl_enable_vertex_attrib_array_cb);

    define_func(data, linker, env_module, "glVertexAttribPointer",
                wasm_functype_new_6_0(
                        wasm_valtype_new_i32(),
                        wasm_valtype_new_i32(),
                        wasm_valtype_new_i32(),
                        wasm_valtype_new_i32(),
                        wasm_valtype_new_i32(),
                        wasm_valtype_new_i32()),
                gl_vertex_attrib_pointer_cb);

    define_func(data, linker, env_module, "glCompileShader",
                wasm_functype_new_1_0(
                        wasm_valtype_new_i32()),
                glCompileShaderCb);

    define_func(data, linker, env_module, "glUseProgram",
                wasm_functype_new_1_0(
                        wasm_valtype_new_i32()),
                gl_use_program_cb);

    define_func(data, linker, env_module, "glClear",
                wasm_functype_new_1_0(
                        wasm_valtype_new_i32()),
                gl_clear_cb);

    define_func(data, linker, env_module, "glViewport",
                wasm_functype_new_4_0(
                        wasm_valtype_new_i32(),
                        wasm_valtype_new_i32(),
                        wasm_valtype_new_i32(),
                        wasm_valtype_new_i32()),
                gl_viewport_cb);

    define_func(data, linker, env_module, "glBufferData",
                wasm_functype_new_4_0(
                        wasm_valtype_new_i32(),
                        wasm_valtype_new_i32(),
                        wasm_valtype_new_i32(),
                        wasm_valtype_new_i32()),
                gl_buffer_data_cb);

    define_func(data, linker, env_module, "glGenBuffers",
                wasm_functype_new_2_0(
                        wasm_valtype_new_i32(),
                        wasm_valtype_new_i32()),
                gl_gen_buffers_cb);

    define_func(data, linker, env_module, "glClearColor",
                wasm_functype_new_4_0(
                        wasm_valtype_new_f32(),
                        wasm_valtype_new_f32(),
                        wasm_valtype_new_f32(),
                        wasm_valtype_new_f32()),
                glClearColorCb);

    define_func(data, linker, env_module, "glDeleteProgram",
                wasm_functype_new_1_0(
                        wasm_valtype_new_i32()),
                gl_delete_program_cb);

    define_func(data, linker, env_module, "glGetProgramInfoLog",
                wasm_functype_new_4_0(
                        wasm_valtype_new_i32(),
                        wasm_valtype_new_i32(),
                        wasm_valtype_new_i32(),
                        wasm_valtype_new_i32()),
                gl_get_program_info_log_cb);

    define_func(data, linker, env_module, "glShaderSource",
                wasm_functype_new_4_0(
                        wasm_valtype_new_i32(),
                        wasm_valtype_new_i32(),
                        wasm_valtype_new_i32(),
                        wasm_valtype_new_i32()),
                glShaderSourceCb);

    define_func(data, linker, env_module, "glCreateShader",
                wasm_functype_new_1_1(
                        wasm_valtype_new_i32(),
                        wasm_valtype_new_i32()),
                glCreateShaderCb);


    // Load our input file to parse it next
    wasm_byte_vec_t wasm;
    FILE* file = fopen("../tests/wasm/index.wasm", "rb");
    if (!file) {
        printf("> Error loading file!\n");
        exit(1);
    }
    fseek(file, 0L, SEEK_END);
    size_t file_size = ftell(file);
    wasm_byte_vec_new_uninitialized(&wasm, file_size);
    fseek(file, 0L, SEEK_SET);
    if (fread(wasm.data, file_size, 1, file) != 1) {
        printf("> Error loading module!\n");
        exit(1);
    }
    fclose(file);

    // Compile our modules
    data->module = NULL;
    error = wasmtime_module_new(data->engine, (uint8_t*)wasm.data, wasm.size, &data->module);
    if (!data->module)
        ExitWithError("failed to compile module", error, NULL);
    wasm_byte_vec_delete(&wasm);

    // Instantiate wasi
    wasi_config_t *wasi_config = wasi_config_new();
    assert(wasi_config);
    wasi_config_inherit_argv(wasi_config);
    wasi_config_inherit_env(wasi_config);
    wasi_config_inherit_stdin(wasi_config);
    wasi_config_inherit_stdout(wasi_config);
    wasi_config_inherit_stderr(wasi_config);
    wasm_trap_t *trap = NULL;
    error = wasmtime_context_set_wasi(data->context, wasi_config);
    if (error != NULL)
        ExitWithError("failed to instantiate WASI", error, NULL);

    // Make Instance
    wasmtime_instance_t instance;
    error = wasmtime_linker_instantiate(linker, wasmtime_store_context(data->store), data->module, &instance, &trap);
    if (error != NULL || trap != NULL)
        ExitWithError("failed to instantiate", error, trap);
    data->instance = instance;

    // Get Table
    const char* table_name = "__indirect_function_table";
    wasmtime_extern_t table;
    bool table_found = wasmtime_instance_export_get(wasmtime_store_context(data->store), &instance, table_name, strlen(table_name), &table);
    if (!table_found)
        printf("Table not found!\n");
    if (table.kind != WASMTIME_EXTERN_TABLE)
        printf("Table extern is not Table!\n");
    data->indirect_table  = table.of.table;

    const char* memory_name = "memory";
    wasmtime_extern_t memory;
    bool memory_found = wasmtime_instance_export_get(wasmtime_store_context(data->store), &instance, memory_name, strlen(memory_name), &memory);
    if (!memory_found)
        printf("Memory not found!\n");
    if (memory.kind != WASMTIME_EXTERN_MEMORY)
        printf("Memory extern is not Memory!\n");
    data->memory = memory.of.memory;

    data->shader_sources = malloc(MAX_SHADER_COUNT * sizeof(char *));

    return data;
}