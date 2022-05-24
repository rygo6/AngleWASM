cmake_minimum_required(VERSION 3.20)
project(AngleWASM)

set(CMAKE_CXX_STANDARD 17)

include_directories(third_party/esUtil/include)
include_directories(third_party/wasmtime/include)
include_directories(third_party/angle/include)

link_directories(third_party/wasmtime/lib)
link_directories(third_party/angle/lib)
link_libraries(libEGL.dll.lib libGLESv2.dll.lib wasmtime.dll.lib)

add_executable(AngleWASM
        AngleWASM/main.c
        third_party/esUtil/source/esUtil.c
        third_party/esUtil/source/Win32/esUtil_win32.c
        third_party/esUtil/source/Win32/esUtil_TGA.c
        AngleWASM/wasm_context.c AngleWASM/wasm_context.h)

