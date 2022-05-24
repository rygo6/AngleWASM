# AngleWASM

This a prototype showing how to issue rendering calls directly from a Standalone WASM VM to WebGL without needing any JavaScript.

This contains index.wasm which was compiled via Emscripten and is the bare necessity to render a single triangle. The Wasmtime VM is placed on top of Google Angle. the Wasmtime VM then loads the index.wasm binary and utilizes the C-API to forward the WebGL rendering calls directly from WASM to Google Angle. This route I believe holds promise for something as through the C-API you can send memory directly from the WASM linear memory space into Google Angle for rendering.
