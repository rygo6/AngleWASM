var Module = typeof Module !== "undefined" ? Module : {};
var moduleOverrides = {};
var key;
for (key in Module) {
  if (Module.hasOwnProperty(key)) {
    moduleOverrides[key] = Module[key];
  }
}
var arguments_ = [];
var thisProgram = "./this.program";
var quit_ = function (status, toThrow) {
  throw toThrow;
};
var ENVIRONMENT_IS_WEB = typeof window === "object";
var ENVIRONMENT_IS_WORKER = typeof importScripts === "function";
var ENVIRONMENT_IS_NODE =
  typeof process === "object" &&
  typeof process.versions === "object" &&
  typeof process.versions.node === "string";
var scriptDirectory = "";
function locateFile(path) {
  if (Module["locateFile"]) {
    return Module["locateFile"](path, scriptDirectory);
  }
  return scriptDirectory + path;
}
var read_, readAsync, readBinary, setWindowTitle;
var nodeFS;
var nodePath;
if (ENVIRONMENT_IS_NODE) {
  if (ENVIRONMENT_IS_WORKER) {
    scriptDirectory = require("path").dirname(scriptDirectory) + "/";
  } else {
    scriptDirectory = __dirname + "/";
  }
  read_ = function shell_read(filename, binary) {
    if (!nodeFS) nodeFS = require("fs");
    if (!nodePath) nodePath = require("path");
    filename = nodePath["normalize"](filename);
    return nodeFS["readFileSync"](filename, binary ? null : "utf8");
  };
  readBinary = function readBinary(filename) {
    var ret = read_(filename, true);
    if (!ret.buffer) {
      ret = new Uint8Array(ret);
    }
    assert(ret.buffer);
    return ret;
  };
  readAsync = function readAsync(filename, onload, onerror) {
    if (!nodeFS) nodeFS = require("fs");
    if (!nodePath) nodePath = require("path");
    filename = nodePath["normalize"](filename);
    nodeFS["readFile"](filename, function (err, data) {
      if (err) onerror(err);
      else onload(data.buffer);
    });
  };
  if (process["argv"].length > 1) {
    thisProgram = process["argv"][1].replace(/\\/g, "/");
  }
  arguments_ = process["argv"].slice(2);
  if (typeof module !== "undefined") {
    module["exports"] = Module;
  }
  process["on"]("uncaughtException", function (ex) {
    if (!(ex instanceof ExitStatus)) {
      throw ex;
    }
  });
  process["on"]("unhandledRejection", abort);
  quit_ = function (status, toThrow) {
    if (keepRuntimeAlive()) {
      process["exitCode"] = status;
      throw toThrow;
    }
    process["exit"](status);
  };
  Module["inspect"] = function () {
    return "[Emscripten Module object]";
  };
} else if (ENVIRONMENT_IS_WEB || ENVIRONMENT_IS_WORKER) {
  if (ENVIRONMENT_IS_WORKER) {
    scriptDirectory = self.location.href;
  } else if (typeof document !== "undefined" && document.currentScript) {
    scriptDirectory = document.currentScript.src;
  }
  if (scriptDirectory.indexOf("blob:") !== 0) {
    scriptDirectory = scriptDirectory.substr(
      0,
      scriptDirectory.lastIndexOf("/") + 1
    );
  } else {
    scriptDirectory = "";
  }
  {
    read_ = function (url) {
      var xhr = new XMLHttpRequest();
      xhr.open("GET", url, false);
      xhr.send(null);
      return xhr.responseText;
    };
    if (ENVIRONMENT_IS_WORKER) {
      readBinary = function (url) {
        var xhr = new XMLHttpRequest();
        xhr.open("GET", url, false);
        xhr.responseType = "arraybuffer";
        xhr.send(null);
        return new Uint8Array(xhr.response);
      };
    }
    readAsync = function (url, onload, onerror) {
      var xhr = new XMLHttpRequest();
      xhr.open("GET", url, true);
      xhr.responseType = "arraybuffer";
      xhr.onload = function () {
        if (xhr.status == 200 || (xhr.status == 0 && xhr.response)) {
          onload(xhr.response);
          return;
        }
        onerror();
      };
      xhr.onerror = onerror;
      xhr.send(null);
    };
  }
  setWindowTitle = function (title) {
    document.title = title;
  };
} else {
}
var out = Module["print"] || console.log.bind(console);
var err = Module["printErr"] || console.warn.bind(console);
for (key in moduleOverrides) {
  if (moduleOverrides.hasOwnProperty(key)) {
    Module[key] = moduleOverrides[key];
  }
}
moduleOverrides = null;
if (Module["arguments"]) arguments_ = Module["arguments"];
if (Module["thisProgram"]) thisProgram = Module["thisProgram"];
if (Module["quit"]) quit_ = Module["quit"];
function warnOnce(text) {
  if (!warnOnce.shown) warnOnce.shown = {};
  if (!warnOnce.shown[text]) {
    warnOnce.shown[text] = 1;
    err(text);
  }
}
var wasmBinary;
if (Module["wasmBinary"]) wasmBinary = Module["wasmBinary"];
var noExitRuntime = Module["noExitRuntime"] || false;
if (typeof WebAssembly !== "object") {
  abort("no native wasm support detected");
}
var wasmMemory;
var ABORT = false;
var EXITSTATUS;
function assert(condition, text) {
  if (!condition) {
    abort("Assertion failed: " + text);
  }
}
var UTF8Decoder =
  typeof TextDecoder !== "undefined" ? new TextDecoder("utf8") : undefined;
function UTF8ArrayToString(heap, idx, maxBytesToRead) {
  var endIdx = idx + maxBytesToRead;
  var endPtr = idx;
  while (heap[endPtr] && !(endPtr >= endIdx)) ++endPtr;
  if (endPtr - idx > 16 && heap.subarray && UTF8Decoder) {
    return UTF8Decoder.decode(heap.subarray(idx, endPtr));
  } else {
    var str = "";
    while (idx < endPtr) {
      var u0 = heap[idx++];
      if (!(u0 & 128)) {
        str += String.fromCharCode(u0);
        continue;
      }
      var u1 = heap[idx++] & 63;
      if ((u0 & 224) == 192) {
        str += String.fromCharCode(((u0 & 31) << 6) | u1);
        continue;
      }
      var u2 = heap[idx++] & 63;
      if ((u0 & 240) == 224) {
        u0 = ((u0 & 15) << 12) | (u1 << 6) | u2;
      } else {
        u0 = ((u0 & 7) << 18) | (u1 << 12) | (u2 << 6) | (heap[idx++] & 63);
      }
      if (u0 < 65536) {
        str += String.fromCharCode(u0);
      } else {
        var ch = u0 - 65536;
        str += String.fromCharCode(55296 | (ch >> 10), 56320 | (ch & 1023));
      }
    }
  }
  return str;
}
function UTF8ToString(ptr, maxBytesToRead) {
  return ptr ? UTF8ArrayToString(HEAPU8, ptr, maxBytesToRead) : "";
}
function stringToUTF8Array(str, heap, outIdx, maxBytesToWrite) {
  if (!(maxBytesToWrite > 0)) return 0;
  var startIdx = outIdx;
  var endIdx = outIdx + maxBytesToWrite - 1;
  for (var i = 0; i < str.length; ++i) {
    var u = str.charCodeAt(i);
    if (u >= 55296 && u <= 57343) {
      var u1 = str.charCodeAt(++i);
      u = (65536 + ((u & 1023) << 10)) | (u1 & 1023);
    }
    if (u <= 127) {
      if (outIdx >= endIdx) break;
      heap[outIdx++] = u;
    } else if (u <= 2047) {
      if (outIdx + 1 >= endIdx) break;
      heap[outIdx++] = 192 | (u >> 6);
      heap[outIdx++] = 128 | (u & 63);
    } else if (u <= 65535) {
      if (outIdx + 2 >= endIdx) break;
      heap[outIdx++] = 224 | (u >> 12);
      heap[outIdx++] = 128 | ((u >> 6) & 63);
      heap[outIdx++] = 128 | (u & 63);
    } else {
      if (outIdx + 3 >= endIdx) break;
      heap[outIdx++] = 240 | (u >> 18);
      heap[outIdx++] = 128 | ((u >> 12) & 63);
      heap[outIdx++] = 128 | ((u >> 6) & 63);
      heap[outIdx++] = 128 | (u & 63);
    }
  }
  heap[outIdx] = 0;
  return outIdx - startIdx;
}
function stringToUTF8(str, outPtr, maxBytesToWrite) {
  return stringToUTF8Array(str, HEAPU8, outPtr, maxBytesToWrite);
}
function writeAsciiToMemory(str, buffer, dontAddNull) {
  for (var i = 0; i < str.length; ++i) {
    HEAP8[buffer++ >> 0] = str.charCodeAt(i);
  }
  if (!dontAddNull) HEAP8[buffer >> 0] = 0;
}
var buffer, HEAP8, HEAPU8, HEAP16, HEAPU16, HEAP32, HEAPU32, HEAPF32, HEAPF64;
function updateGlobalBufferAndViews(buf) {
  buffer = buf;
  Module["HEAP8"] = HEAP8 = new Int8Array(buf);
  Module["HEAP16"] = HEAP16 = new Int16Array(buf);
  Module["HEAP32"] = HEAP32 = new Int32Array(buf);
  Module["HEAPU8"] = HEAPU8 = new Uint8Array(buf);
  Module["HEAPU16"] = HEAPU16 = new Uint16Array(buf);
  Module["HEAPU32"] = HEAPU32 = new Uint32Array(buf);
  Module["HEAPF32"] = HEAPF32 = new Float32Array(buf);
  Module["HEAPF64"] = HEAPF64 = new Float64Array(buf);
}
var INITIAL_MEMORY = Module["INITIAL_MEMORY"] || 16777216;
var wasmTable;
var __ATPRERUN__ = [];
var __ATINIT__ = [];
var __ATMAIN__ = [];
var __ATEXIT__ = [];
var __ATPOSTRUN__ = [];
var runtimeInitialized = false;
var runtimeExited = false;
var runtimeKeepaliveCounter = 0;
function keepRuntimeAlive() {
  return noExitRuntime || runtimeKeepaliveCounter > 0;
}
function preRun() {
  if (Module["preRun"]) {
    if (typeof Module["preRun"] == "function")
      Module["preRun"] = [Module["preRun"]];
    while (Module["preRun"].length) {
      addOnPreRun(Module["preRun"].shift());
    }
  }
  callRuntimeCallbacks(__ATPRERUN__);
}
function initRuntime() {
  runtimeInitialized = true;
  callRuntimeCallbacks(__ATINIT__);
}
function preMain() {
  callRuntimeCallbacks(__ATMAIN__);
}
function exitRuntime() {
  callRuntimeCallbacks(__ATEXIT__);
  flush_NO_FILESYSTEM();
  runtimeExited = true;
}
function postRun() {
  if (Module["postRun"]) {
    if (typeof Module["postRun"] == "function")
      Module["postRun"] = [Module["postRun"]];
    while (Module["postRun"].length) {
      addOnPostRun(Module["postRun"].shift());
    }
  }
  callRuntimeCallbacks(__ATPOSTRUN__);
}
function addOnPreRun(cb) {
  __ATPRERUN__.unshift(cb);
}
function addOnPostRun(cb) {
  __ATPOSTRUN__.unshift(cb);
}
var runDependencies = 0;
var runDependencyWatcher = null;
var dependenciesFulfilled = null;
function addRunDependency(id) {
  runDependencies++;
  if (Module["monitorRunDependencies"]) {
    Module["monitorRunDependencies"](runDependencies);
  }
}
function removeRunDependency(id) {
  runDependencies--;
  if (Module["monitorRunDependencies"]) {
    Module["monitorRunDependencies"](runDependencies);
  }
  if (runDependencies == 0) {
    if (runDependencyWatcher !== null) {
      clearInterval(runDependencyWatcher);
      runDependencyWatcher = null;
    }
    if (dependenciesFulfilled) {
      var callback = dependenciesFulfilled;
      dependenciesFulfilled = null;
      callback();
    }
  }
}
Module["preloadedImages"] = {};
Module["preloadedAudios"] = {};
function abort(what) {
  if (Module["onAbort"]) {
    Module["onAbort"](what);
  }
  what += "";
  err(what);
  ABORT = true;
  EXITSTATUS = 1;
  what = "abort(" + what + "). Build with -s ASSERTIONS=1 for more info.";
  var e = new WebAssembly.RuntimeError(what);
  throw e;
}
var dataURIPrefix = "data:application/octet-stream;base64,";
function isDataURI(filename) {
  return filename.startsWith(dataURIPrefix);
}
function isFileURI(filename) {
  return filename.startsWith("file://");
}
var wasmBinaryFile;
wasmBinaryFile = "index.wasm";
if (!isDataURI(wasmBinaryFile)) {
  wasmBinaryFile = locateFile(wasmBinaryFile);
}
function getBinary(file) {
  try {
    if (file == wasmBinaryFile && wasmBinary) {
      return new Uint8Array(wasmBinary);
    }
    if (readBinary) {
      return readBinary(file);
    } else {
      throw "both async and sync fetching of the wasm failed";
    }
  } catch (err) {
    abort(err);
  }
}
function getBinaryPromise() {
  if (!wasmBinary && (ENVIRONMENT_IS_WEB || ENVIRONMENT_IS_WORKER)) {
    if (typeof fetch === "function" && !isFileURI(wasmBinaryFile)) {
      return fetch(wasmBinaryFile, { credentials: "same-origin" })
        .then(function (response) {
          if (!response["ok"]) {
            throw "failed to load wasm binary file at '" + wasmBinaryFile + "'";
          }
          return response["arrayBuffer"]();
        })
        .catch(function () {
          return getBinary(wasmBinaryFile);
        });
    } else {
      if (readAsync) {
        return new Promise(function (resolve, reject) {
          readAsync(
            wasmBinaryFile,
            function (response) {
              resolve(new Uint8Array(response));
            },
            reject
          );
        });
      }
    }
  }
  return Promise.resolve().then(function () {
    return getBinary(wasmBinaryFile);
  });
}
function createWasm() {
  var info = { env: asmLibraryArg, wasi_snapshot_preview1: asmLibraryArg };
  function receiveInstance(instance, module) {
    var exports = instance.exports;
    Module["asm"] = exports;
    wasmMemory = Module["asm"]["memory"];
    updateGlobalBufferAndViews(wasmMemory.buffer);
    wasmTable = Module["asm"]["__indirect_function_table"];
    removeRunDependency("wasm-instantiate");
  }
  addRunDependency("wasm-instantiate");
  function receiveInstantiationResult(result) {
    receiveInstance(result["instance"]);
  }
  function instantiateArrayBuffer(receiver) {
    return getBinaryPromise()
      .then(function (binary) {
        var result = WebAssembly.instantiate(binary, info);
        return result;
      })
      .then(receiver, function (reason) {
        err("failed to asynchronously prepare wasm: " + reason);
        abort(reason);
      });
  }
  function instantiateAsync() {
    if (
      !wasmBinary &&
      typeof WebAssembly.instantiateStreaming === "function" &&
      !isDataURI(wasmBinaryFile) &&
      !isFileURI(wasmBinaryFile) &&
      typeof fetch === "function"
    ) {
      return fetch(wasmBinaryFile, { credentials: "same-origin" }).then(
        function (response) {
          var result = WebAssembly.instantiateStreaming(response, info);
          return result.then(receiveInstantiationResult, function (reason) {
            err("wasm streaming compile failed: " + reason);
            err("falling back to ArrayBuffer instantiation");
            return instantiateArrayBuffer(receiveInstantiationResult);
          });
        }
      );
    } else {
      return instantiateArrayBuffer(receiveInstantiationResult);
    }
  }
  if (Module["instantiateWasm"]) {
    try {
      var exports = Module["instantiateWasm"](info, receiveInstance);
      return exports;
    } catch (e) {
      err("Module.instantiateWasm callback failed with error: " + e);
      return false;
    }
  }
  instantiateAsync();
  return {};
}
function callRuntimeCallbacks(callbacks) {
  while (callbacks.length > 0) {
    var callback = callbacks.shift();
    if (typeof callback == "function") {
      callback(Module);
      continue;
    }
    var func = callback.func;
    if (typeof func === "number") {
      if (callback.arg === undefined) {
        wasmTable.get(func)();
      } else {
        wasmTable.get(func)(callback.arg);
      }
    } else {
      func(callback.arg === undefined ? null : callback.arg);
    }
  }
}
var SYSCALLS = {
  mappings: {},
  buffers: [null, [], []],
  printChar: function (stream, curr) {
    var buffer = SYSCALLS.buffers[stream];
    if (curr === 0 || curr === 10) {
      (stream === 1 ? out : err)(UTF8ArrayToString(buffer, 0));
      buffer.length = 0;
    } else {
      buffer.push(curr);
    }
  },
  varargs: undefined,
  get: function () {
    SYSCALLS.varargs += 4;
    var ret = HEAP32[(SYSCALLS.varargs - 4) >> 2];
    return ret;
  },
  getStr: function (ptr) {
    var ret = UTF8ToString(ptr);
    return ret;
  },
  get64: function (low, high) {
    return low;
  },
};
function _args_get(argv, argv_buf) {
  var bufSize = 0;
  mainArgs.forEach(function (arg, i) {
    var ptr = argv_buf + bufSize;
    HEAP32[(argv + i * 4) >> 2] = ptr;
    writeAsciiToMemory(arg, ptr);
    bufSize += arg.length + 1;
  });
  return 0;
}
function _args_sizes_get(pargc, pargv_buf_size) {
  HEAP32[pargc >> 2] = mainArgs.length;
  var bufSize = 0;
  mainArgs.forEach(function (arg) {
    bufSize += arg.length + 1;
  });
  HEAP32[pargv_buf_size >> 2] = bufSize;
  return 0;
}
var JSEvents = {
  inEventHandler: 0,
  removeAllEventListeners: function () {
    for (var i = JSEvents.eventHandlers.length - 1; i >= 0; --i) {
      JSEvents._removeHandler(i);
    }
    JSEvents.eventHandlers = [];
    JSEvents.deferredCalls = [];
  },
  registerRemoveEventListeners: function () {
    if (!JSEvents.removeEventListenersRegistered) {
      __ATEXIT__.push(JSEvents.removeAllEventListeners);
      JSEvents.removeEventListenersRegistered = true;
    }
  },
  deferredCalls: [],
  deferCall: function (targetFunction, precedence, argsList) {
    function arraysHaveEqualContent(arrA, arrB) {
      if (arrA.length != arrB.length) return false;
      for (var i in arrA) {
        if (arrA[i] != arrB[i]) return false;
      }
      return true;
    }
    for (var i in JSEvents.deferredCalls) {
      var call = JSEvents.deferredCalls[i];
      if (
        call.targetFunction == targetFunction &&
        arraysHaveEqualContent(call.argsList, argsList)
      ) {
        return;
      }
    }
    JSEvents.deferredCalls.push({
      targetFunction: targetFunction,
      precedence: precedence,
      argsList: argsList,
    });
    JSEvents.deferredCalls.sort(function (x, y) {
      return x.precedence < y.precedence;
    });
  },
  removeDeferredCalls: function (targetFunction) {
    for (var i = 0; i < JSEvents.deferredCalls.length; ++i) {
      if (JSEvents.deferredCalls[i].targetFunction == targetFunction) {
        JSEvents.deferredCalls.splice(i, 1);
        --i;
      }
    }
  },
  canPerformEventHandlerRequests: function () {
    return (
      JSEvents.inEventHandler &&
      JSEvents.currentEventHandler.allowsDeferredCalls
    );
  },
  runDeferredCalls: function () {
    if (!JSEvents.canPerformEventHandlerRequests()) {
      return;
    }
    for (var i = 0; i < JSEvents.deferredCalls.length; ++i) {
      var call = JSEvents.deferredCalls[i];
      JSEvents.deferredCalls.splice(i, 1);
      --i;
      call.targetFunction.apply(null, call.argsList);
    }
  },
  eventHandlers: [],
  removeAllHandlersOnTarget: function (target, eventTypeString) {
    for (var i = 0; i < JSEvents.eventHandlers.length; ++i) {
      if (
        JSEvents.eventHandlers[i].target == target &&
        (!eventTypeString ||
          eventTypeString == JSEvents.eventHandlers[i].eventTypeString)
      ) {
        JSEvents._removeHandler(i--);
      }
    }
  },
  _removeHandler: function (i) {
    var h = JSEvents.eventHandlers[i];
    h.target.removeEventListener(
      h.eventTypeString,
      h.eventListenerFunc,
      h.useCapture
    );
    JSEvents.eventHandlers.splice(i, 1);
  },
  registerOrRemoveHandler: function (eventHandler) {
    var jsEventHandler = function jsEventHandler(event) {
      ++JSEvents.inEventHandler;
      JSEvents.currentEventHandler = eventHandler;
      JSEvents.runDeferredCalls();
      eventHandler.handlerFunc(event);
      JSEvents.runDeferredCalls();
      --JSEvents.inEventHandler;
    };
    if (eventHandler.callbackfunc) {
      eventHandler.eventListenerFunc = jsEventHandler;
      eventHandler.target.addEventListener(
        eventHandler.eventTypeString,
        jsEventHandler,
        eventHandler.useCapture
      );
      JSEvents.eventHandlers.push(eventHandler);
      JSEvents.registerRemoveEventListeners();
    } else {
      for (var i = 0; i < JSEvents.eventHandlers.length; ++i) {
        if (
          JSEvents.eventHandlers[i].target == eventHandler.target &&
          JSEvents.eventHandlers[i].eventTypeString ==
            eventHandler.eventTypeString
        ) {
          JSEvents._removeHandler(i--);
        }
      }
    }
  },
  getNodeNameForTarget: function (target) {
    if (!target) return "";
    if (target == window) return "#window";
    if (target == screen) return "#screen";
    return target && target.nodeName ? target.nodeName : "";
  },
  fullscreenEnabled: function () {
    return document.fullscreenEnabled || document.webkitFullscreenEnabled;
  },
};
function maybeCStringToJsString(cString) {
  return cString > 2 ? UTF8ToString(cString) : cString;
}
var specialHTMLTargets = [
  0,
  typeof document !== "undefined" ? document : 0,
  typeof window !== "undefined" ? window : 0,
];
function findEventTarget(target) {
  target = maybeCStringToJsString(target);
  var domElement =
    specialHTMLTargets[target] ||
    (typeof document !== "undefined"
      ? document.querySelector(target)
      : undefined);
  return domElement;
}
function findCanvasEventTarget(target) {
  return findEventTarget(target);
}
function _emscripten_set_canvas_element_size(target, width, height) {
  var canvas = findCanvasEventTarget(target);
  if (!canvas) return -4;
  canvas.width = width;
  canvas.height = height;
  return 0;
}
function _exit(status) {
  exit(status);
}
function maybeExit() {
  if (!keepRuntimeAlive()) {
    try {
      _exit(EXITSTATUS);
    } catch (e) {
      if (e instanceof ExitStatus) {
        return;
      }
      throw e;
    }
  }
}
function callUserCallback(func, synchronous) {
  if (ABORT) {
    return;
  }
  if (synchronous) {
    func();
    return;
  }
  try {
    func();
  } catch (e) {
    if (e instanceof ExitStatus) {
      return;
    } else if (e !== "unwind") {
      if (e && typeof e === "object" && e.stack)
        err("exception thrown: " + [e, e.stack]);
      throw e;
    }
  }
  maybeExit();
}
function safeSetTimeout(func, timeout) {
  runtimeKeepalivePush();
  return setTimeout(function () {
    runtimeKeepalivePop();
    callUserCallback(func);
  }, timeout);
}
function runtimeKeepalivePush() {
  runtimeKeepaliveCounter += 1;
}
function runtimeKeepalivePop() {
  runtimeKeepaliveCounter -= 1;
}
var Browser = {
  mainLoop: {
    running: false,
    scheduler: null,
    method: "",
    currentlyRunningMainloop: 0,
    func: null,
    arg: 0,
    timingMode: 0,
    timingValue: 0,
    currentFrameNumber: 0,
    queue: [],
    pause: function () {
      Browser.mainLoop.scheduler = null;
      Browser.mainLoop.currentlyRunningMainloop++;
    },
    resume: function () {
      Browser.mainLoop.currentlyRunningMainloop++;
      var timingMode = Browser.mainLoop.timingMode;
      var timingValue = Browser.mainLoop.timingValue;
      var func = Browser.mainLoop.func;
      Browser.mainLoop.func = null;
      setMainLoop(func, 0, false, Browser.mainLoop.arg, true);
      _emscripten_set_main_loop_timing(timingMode, timingValue);
      Browser.mainLoop.scheduler();
    },
    updateStatus: function () {
      if (Module["setStatus"]) {
        var message = Module["statusMessage"] || "Please wait...";
        var remaining = Browser.mainLoop.remainingBlockers;
        var expected = Browser.mainLoop.expectedBlockers;
        if (remaining) {
          if (remaining < expected) {
            Module["setStatus"](
              message + " (" + (expected - remaining) + "/" + expected + ")"
            );
          } else {
            Module["setStatus"](message);
          }
        } else {
          Module["setStatus"]("");
        }
      }
    },
    runIter: function (func) {
      if (ABORT) return;
      if (Module["preMainLoop"]) {
        var preRet = Module["preMainLoop"]();
        if (preRet === false) {
          return;
        }
      }
      callUserCallback(func);
      if (Module["postMainLoop"]) Module["postMainLoop"]();
    },
  },
  isFullscreen: false,
  pointerLock: false,
  moduleContextCreatedCallbacks: [],
  workers: [],
  init: function () {
    if (!Module["preloadPlugins"]) Module["preloadPlugins"] = [];
    if (Browser.initted) return;
    Browser.initted = true;
    try {
      new Blob();
      Browser.hasBlobConstructor = true;
    } catch (e) {
      Browser.hasBlobConstructor = false;
      out("warning: no blob constructor, cannot create blobs with mimetypes");
    }
    Browser.BlobBuilder =
      typeof MozBlobBuilder != "undefined"
        ? MozBlobBuilder
        : typeof WebKitBlobBuilder != "undefined"
        ? WebKitBlobBuilder
        : !Browser.hasBlobConstructor
        ? out("warning: no BlobBuilder")
        : null;
    Browser.URLObject =
      typeof window != "undefined"
        ? window.URL
          ? window.URL
          : window.webkitURL
        : undefined;
    if (!Module.noImageDecoding && typeof Browser.URLObject === "undefined") {
      out(
        "warning: Browser does not support creating object URLs. Built-in browser image decoding will not be available."
      );
      Module.noImageDecoding = true;
    }
    var imagePlugin = {};
    imagePlugin["canHandle"] = function imagePlugin_canHandle(name) {
      return !Module.noImageDecoding && /\.(jpg|jpeg|png|bmp)$/i.test(name);
    };
    imagePlugin["handle"] = function imagePlugin_handle(
      byteArray,
      name,
      onload,
      onerror
    ) {
      var b = null;
      if (Browser.hasBlobConstructor) {
        try {
          b = new Blob([byteArray], { type: Browser.getMimetype(name) });
          if (b.size !== byteArray.length) {
            b = new Blob([new Uint8Array(byteArray).buffer], {
              type: Browser.getMimetype(name),
            });
          }
        } catch (e) {
          warnOnce(
            "Blob constructor present but fails: " +
              e +
              "; falling back to blob builder"
          );
        }
      }
      if (!b) {
        var bb = new Browser.BlobBuilder();
        bb.append(new Uint8Array(byteArray).buffer);
        b = bb.getBlob();
      }
      var url = Browser.URLObject.createObjectURL(b);
      var img = new Image();
      img.onload = function img_onload() {
        assert(img.complete, "Image " + name + " could not be decoded");
        var canvas = document.createElement("canvas");
        canvas.width = img.width;
        canvas.height = img.height;
        var ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0);
        Module["preloadedImages"][name] = canvas;
        Browser.URLObject.revokeObjectURL(url);
        if (onload) onload(byteArray);
      };
      img.onerror = function img_onerror(event) {
        out("Image " + url + " could not be decoded");
        if (onerror) onerror();
      };
      img.src = url;
    };
    Module["preloadPlugins"].push(imagePlugin);
    var audioPlugin = {};
    audioPlugin["canHandle"] = function audioPlugin_canHandle(name) {
      return (
        !Module.noAudioDecoding &&
        name.substr(-4) in { ".ogg": 1, ".wav": 1, ".mp3": 1 }
      );
    };
    audioPlugin["handle"] = function audioPlugin_handle(
      byteArray,
      name,
      onload,
      onerror
    ) {
      var done = false;
      function finish(audio) {
        if (done) return;
        done = true;
        Module["preloadedAudios"][name] = audio;
        if (onload) onload(byteArray);
      }
      function fail() {
        if (done) return;
        done = true;
        Module["preloadedAudios"][name] = new Audio();
        if (onerror) onerror();
      }
      if (Browser.hasBlobConstructor) {
        try {
          var b = new Blob([byteArray], { type: Browser.getMimetype(name) });
        } catch (e) {
          return fail();
        }
        var url = Browser.URLObject.createObjectURL(b);
        var audio = new Audio();
        audio.addEventListener(
          "canplaythrough",
          function () {
            finish(audio);
          },
          false
        );
        audio.onerror = function audio_onerror(event) {
          if (done) return;
          out(
            "warning: browser could not fully decode audio " +
              name +
              ", trying slower base64 approach"
          );
          function encode64(data) {
            var BASE =
              "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
            var PAD = "=";
            var ret = "";
            var leftchar = 0;
            var leftbits = 0;
            for (var i = 0; i < data.length; i++) {
              leftchar = (leftchar << 8) | data[i];
              leftbits += 8;
              while (leftbits >= 6) {
                var curr = (leftchar >> (leftbits - 6)) & 63;
                leftbits -= 6;
                ret += BASE[curr];
              }
            }
            if (leftbits == 2) {
              ret += BASE[(leftchar & 3) << 4];
              ret += PAD + PAD;
            } else if (leftbits == 4) {
              ret += BASE[(leftchar & 15) << 2];
              ret += PAD;
            }
            return ret;
          }
          audio.src =
            "data:audio/x-" +
            name.substr(-3) +
            ";base64," +
            encode64(byteArray);
          finish(audio);
        };
        audio.src = url;
        safeSetTimeout(function () {
          finish(audio);
        }, 1e4);
      } else {
        return fail();
      }
    };
    Module["preloadPlugins"].push(audioPlugin);
    function pointerLockChange() {
      Browser.pointerLock =
        document["pointerLockElement"] === Module["canvas"] ||
        document["mozPointerLockElement"] === Module["canvas"] ||
        document["webkitPointerLockElement"] === Module["canvas"] ||
        document["msPointerLockElement"] === Module["canvas"];
    }
    var canvas = Module["canvas"];
    if (canvas) {
      canvas.requestPointerLock =
        canvas["requestPointerLock"] ||
        canvas["mozRequestPointerLock"] ||
        canvas["webkitRequestPointerLock"] ||
        canvas["msRequestPointerLock"] ||
        function () {};
      canvas.exitPointerLock =
        document["exitPointerLock"] ||
        document["mozExitPointerLock"] ||
        document["webkitExitPointerLock"] ||
        document["msExitPointerLock"] ||
        function () {};
      canvas.exitPointerLock = canvas.exitPointerLock.bind(document);
      document.addEventListener("pointerlockchange", pointerLockChange, false);
      document.addEventListener(
        "mozpointerlockchange",
        pointerLockChange,
        false
      );
      document.addEventListener(
        "webkitpointerlockchange",
        pointerLockChange,
        false
      );
      document.addEventListener(
        "mspointerlockchange",
        pointerLockChange,
        false
      );
      if (Module["elementPointerLock"]) {
        canvas.addEventListener(
          "click",
          function (ev) {
            if (!Browser.pointerLock && Module["canvas"].requestPointerLock) {
              Module["canvas"].requestPointerLock();
              ev.preventDefault();
            }
          },
          false
        );
      }
    }
  },
  createContext: function (
    canvas,
    useWebGL,
    setInModule,
    webGLContextAttributes
  ) {
    if (useWebGL && Module.ctx && canvas == Module.canvas) return Module.ctx;
    var ctx;
    var contextHandle;
    if (useWebGL) {
      var contextAttributes = {
        antialias: false,
        alpha: false,
        majorVersion: 1,
      };
      if (webGLContextAttributes) {
        for (var attribute in webGLContextAttributes) {
          contextAttributes[attribute] = webGLContextAttributes[attribute];
        }
      }
      if (typeof GL !== "undefined") {
        contextHandle = GL.createContext(canvas, contextAttributes);
        if (contextHandle) {
          ctx = GL.getContext(contextHandle).GLctx;
        }
      }
    } else {
      ctx = canvas.getContext("2d");
    }
    if (!ctx) return null;
    if (setInModule) {
      if (!useWebGL)
        assert(
          typeof GLctx === "undefined",
          "cannot set in module if GLctx is used, but we are a non-GL context that would replace it"
        );
      Module.ctx = ctx;
      if (useWebGL) GL.makeContextCurrent(contextHandle);
      Module.useWebGL = useWebGL;
      Browser.moduleContextCreatedCallbacks.forEach(function (callback) {
        callback();
      });
      Browser.init();
    }
    return ctx;
  },
  destroyContext: function (canvas, useWebGL, setInModule) {},
  fullscreenHandlersInstalled: false,
  lockPointer: undefined,
  resizeCanvas: undefined,
  requestFullscreen: function (lockPointer, resizeCanvas) {
    Browser.lockPointer = lockPointer;
    Browser.resizeCanvas = resizeCanvas;
    if (typeof Browser.lockPointer === "undefined") Browser.lockPointer = true;
    if (typeof Browser.resizeCanvas === "undefined")
      Browser.resizeCanvas = false;
    var canvas = Module["canvas"];
    function fullscreenChange() {
      Browser.isFullscreen = false;
      var canvasContainer = canvas.parentNode;
      if (
        (document["fullscreenElement"] ||
          document["mozFullScreenElement"] ||
          document["msFullscreenElement"] ||
          document["webkitFullscreenElement"] ||
          document["webkitCurrentFullScreenElement"]) === canvasContainer
      ) {
        canvas.exitFullscreen = Browser.exitFullscreen;
        if (Browser.lockPointer) canvas.requestPointerLock();
        Browser.isFullscreen = true;
        if (Browser.resizeCanvas) {
          Browser.setFullscreenCanvasSize();
        } else {
          Browser.updateCanvasDimensions(canvas);
        }
      } else {
        canvasContainer.parentNode.insertBefore(canvas, canvasContainer);
        canvasContainer.parentNode.removeChild(canvasContainer);
        if (Browser.resizeCanvas) {
          Browser.setWindowedCanvasSize();
        } else {
          Browser.updateCanvasDimensions(canvas);
        }
      }
      if (Module["onFullScreen"]) Module["onFullScreen"](Browser.isFullscreen);
      if (Module["onFullscreen"]) Module["onFullscreen"](Browser.isFullscreen);
    }
    if (!Browser.fullscreenHandlersInstalled) {
      Browser.fullscreenHandlersInstalled = true;
      document.addEventListener("fullscreenchange", fullscreenChange, false);
      document.addEventListener("mozfullscreenchange", fullscreenChange, false);
      document.addEventListener(
        "webkitfullscreenchange",
        fullscreenChange,
        false
      );
      document.addEventListener("MSFullscreenChange", fullscreenChange, false);
    }
    var canvasContainer = document.createElement("div");
    canvas.parentNode.insertBefore(canvasContainer, canvas);
    canvasContainer.appendChild(canvas);
    canvasContainer.requestFullscreen =
      canvasContainer["requestFullscreen"] ||
      canvasContainer["mozRequestFullScreen"] ||
      canvasContainer["msRequestFullscreen"] ||
      (canvasContainer["webkitRequestFullscreen"]
        ? function () {
            canvasContainer["webkitRequestFullscreen"](
              Element["ALLOW_KEYBOARD_INPUT"]
            );
          }
        : null) ||
      (canvasContainer["webkitRequestFullScreen"]
        ? function () {
            canvasContainer["webkitRequestFullScreen"](
              Element["ALLOW_KEYBOARD_INPUT"]
            );
          }
        : null);
    canvasContainer.requestFullscreen();
  },
  exitFullscreen: function () {
    if (!Browser.isFullscreen) {
      return false;
    }
    var CFS =
      document["exitFullscreen"] ||
      document["cancelFullScreen"] ||
      document["mozCancelFullScreen"] ||
      document["msExitFullscreen"] ||
      document["webkitCancelFullScreen"] ||
      function () {};
    CFS.apply(document, []);
    return true;
  },
  nextRAF: 0,
  fakeRequestAnimationFrame: function (func) {
    var now = Date.now();
    if (Browser.nextRAF === 0) {
      Browser.nextRAF = now + 1e3 / 60;
    } else {
      while (now + 2 >= Browser.nextRAF) {
        Browser.nextRAF += 1e3 / 60;
      }
    }
    var delay = Math.max(Browser.nextRAF - now, 0);
    setTimeout(func, delay);
  },
  requestAnimationFrame: function (func) {
    if (typeof requestAnimationFrame === "function") {
      requestAnimationFrame(func);
      return;
    }
    var RAF = Browser.fakeRequestAnimationFrame;
    RAF(func);
  },
  safeSetTimeout: function (func) {
    return safeSetTimeout(func);
  },
  safeRequestAnimationFrame: function (func) {
    runtimeKeepalivePush();
    return Browser.requestAnimationFrame(function () {
      runtimeKeepalivePop();
      callUserCallback(func);
    });
  },
  getMimetype: function (name) {
    return {
      jpg: "image/jpeg",
      jpeg: "image/jpeg",
      png: "image/png",
      bmp: "image/bmp",
      ogg: "audio/ogg",
      wav: "audio/wav",
      mp3: "audio/mpeg",
    }[name.substr(name.lastIndexOf(".") + 1)];
  },
  getUserMedia: function (func) {
    if (!window.getUserMedia) {
      window.getUserMedia =
        navigator["getUserMedia"] || navigator["mozGetUserMedia"];
    }
    window.getUserMedia(func);
  },
  getMovementX: function (event) {
    return (
      event["movementX"] ||
      event["mozMovementX"] ||
      event["webkitMovementX"] ||
      0
    );
  },
  getMovementY: function (event) {
    return (
      event["movementY"] ||
      event["mozMovementY"] ||
      event["webkitMovementY"] ||
      0
    );
  },
  getMouseWheelDelta: function (event) {
    var delta = 0;
    switch (event.type) {
      case "DOMMouseScroll":
        delta = event.detail / 3;
        break;
      case "mousewheel":
        delta = event.wheelDelta / 120;
        break;
      case "wheel":
        delta = event.deltaY;
        switch (event.deltaMode) {
          case 0:
            delta /= 100;
            break;
          case 1:
            delta /= 3;
            break;
          case 2:
            delta *= 80;
            break;
          default:
            throw "unrecognized mouse wheel delta mode: " + event.deltaMode;
        }
        break;
      default:
        throw "unrecognized mouse wheel event: " + event.type;
    }
    return delta;
  },
  mouseX: 0,
  mouseY: 0,
  mouseMovementX: 0,
  mouseMovementY: 0,
  touches: {},
  lastTouches: {},
  calculateMouseEvent: function (event) {
    if (Browser.pointerLock) {
      if (event.type != "mousemove" && "mozMovementX" in event) {
        Browser.mouseMovementX = Browser.mouseMovementY = 0;
      } else {
        Browser.mouseMovementX = Browser.getMovementX(event);
        Browser.mouseMovementY = Browser.getMovementY(event);
      }
      if (typeof SDL != "undefined") {
        Browser.mouseX = SDL.mouseX + Browser.mouseMovementX;
        Browser.mouseY = SDL.mouseY + Browser.mouseMovementY;
      } else {
        Browser.mouseX += Browser.mouseMovementX;
        Browser.mouseY += Browser.mouseMovementY;
      }
    } else {
      var rect = Module["canvas"].getBoundingClientRect();
      var cw = Module["canvas"].width;
      var ch = Module["canvas"].height;
      var scrollX =
        typeof window.scrollX !== "undefined"
          ? window.scrollX
          : window.pageXOffset;
      var scrollY =
        typeof window.scrollY !== "undefined"
          ? window.scrollY
          : window.pageYOffset;
      if (
        event.type === "touchstart" ||
        event.type === "touchend" ||
        event.type === "touchmove"
      ) {
        var touch = event.touch;
        if (touch === undefined) {
          return;
        }
        var adjustedX = touch.pageX - (scrollX + rect.left);
        var adjustedY = touch.pageY - (scrollY + rect.top);
        adjustedX = adjustedX * (cw / rect.width);
        adjustedY = adjustedY * (ch / rect.height);
        var coords = { x: adjustedX, y: adjustedY };
        if (event.type === "touchstart") {
          Browser.lastTouches[touch.identifier] = coords;
          Browser.touches[touch.identifier] = coords;
        } else if (event.type === "touchend" || event.type === "touchmove") {
          var last = Browser.touches[touch.identifier];
          if (!last) last = coords;
          Browser.lastTouches[touch.identifier] = last;
          Browser.touches[touch.identifier] = coords;
        }
        return;
      }
      var x = event.pageX - (scrollX + rect.left);
      var y = event.pageY - (scrollY + rect.top);
      x = x * (cw / rect.width);
      y = y * (ch / rect.height);
      Browser.mouseMovementX = x - Browser.mouseX;
      Browser.mouseMovementY = y - Browser.mouseY;
      Browser.mouseX = x;
      Browser.mouseY = y;
    }
  },
  resizeListeners: [],
  updateResizeListeners: function () {
    var canvas = Module["canvas"];
    Browser.resizeListeners.forEach(function (listener) {
      listener(canvas.width, canvas.height);
    });
  },
  setCanvasSize: function (width, height, noUpdates) {
    var canvas = Module["canvas"];
    Browser.updateCanvasDimensions(canvas, width, height);
    if (!noUpdates) Browser.updateResizeListeners();
  },
  windowedWidth: 0,
  windowedHeight: 0,
  setFullscreenCanvasSize: function () {
    if (typeof SDL != "undefined") {
      var flags = HEAPU32[SDL.screen >> 2];
      flags = flags | 8388608;
      HEAP32[SDL.screen >> 2] = flags;
    }
    Browser.updateCanvasDimensions(Module["canvas"]);
    Browser.updateResizeListeners();
  },
  setWindowedCanvasSize: function () {
    if (typeof SDL != "undefined") {
      var flags = HEAPU32[SDL.screen >> 2];
      flags = flags & ~8388608;
      HEAP32[SDL.screen >> 2] = flags;
    }
    Browser.updateCanvasDimensions(Module["canvas"]);
    Browser.updateResizeListeners();
  },
  updateCanvasDimensions: function (canvas, wNative, hNative) {
    if (wNative && hNative) {
      canvas.widthNative = wNative;
      canvas.heightNative = hNative;
    } else {
      wNative = canvas.widthNative;
      hNative = canvas.heightNative;
    }
    var w = wNative;
    var h = hNative;
    if (Module["forcedAspectRatio"] && Module["forcedAspectRatio"] > 0) {
      if (w / h < Module["forcedAspectRatio"]) {
        w = Math.round(h * Module["forcedAspectRatio"]);
      } else {
        h = Math.round(w / Module["forcedAspectRatio"]);
      }
    }
    if (
      (document["fullscreenElement"] ||
        document["mozFullScreenElement"] ||
        document["msFullscreenElement"] ||
        document["webkitFullscreenElement"] ||
        document["webkitCurrentFullScreenElement"]) === canvas.parentNode &&
      typeof screen != "undefined"
    ) {
      var factor = Math.min(screen.width / w, screen.height / h);
      w = Math.round(w * factor);
      h = Math.round(h * factor);
    }
    if (Browser.resizeCanvas) {
      if (canvas.width != w) canvas.width = w;
      if (canvas.height != h) canvas.height = h;
      if (typeof canvas.style != "undefined") {
        canvas.style.removeProperty("width");
        canvas.style.removeProperty("height");
      }
    } else {
      if (canvas.width != wNative) canvas.width = wNative;
      if (canvas.height != hNative) canvas.height = hNative;
      if (typeof canvas.style != "undefined") {
        if (w != wNative || h != hNative) {
          canvas.style.setProperty("width", w + "px", "important");
          canvas.style.setProperty("height", h + "px", "important");
        } else {
          canvas.style.removeProperty("width");
          canvas.style.removeProperty("height");
        }
      }
    }
  },
};
function _emscripten_set_main_loop_timing(mode, value) {
  Browser.mainLoop.timingMode = mode;
  Browser.mainLoop.timingValue = value;
  if (!Browser.mainLoop.func) {
    return 1;
  }
  if (!Browser.mainLoop.running) {
    runtimeKeepalivePush();
    Browser.mainLoop.running = true;
  }
  if (mode == 0) {
    Browser.mainLoop.scheduler =
      function Browser_mainLoop_scheduler_setTimeout() {
        var timeUntilNextTick =
          Math.max(
            0,
            Browser.mainLoop.tickStartTime + value - _emscripten_get_now()
          ) | 0;
        setTimeout(Browser.mainLoop.runner, timeUntilNextTick);
      };
    Browser.mainLoop.method = "timeout";
  } else if (mode == 1) {
    Browser.mainLoop.scheduler = function Browser_mainLoop_scheduler_rAF() {
      Browser.requestAnimationFrame(Browser.mainLoop.runner);
    };
    Browser.mainLoop.method = "rAF";
  } else if (mode == 2) {
    if (typeof setImmediate === "undefined") {
      var setImmediates = [];
      var emscriptenMainLoopMessageId = "setimmediate";
      var Browser_setImmediate_messageHandler = function (event) {
        if (
          event.data === emscriptenMainLoopMessageId ||
          event.data.target === emscriptenMainLoopMessageId
        ) {
          event.stopPropagation();
          setImmediates.shift()();
        }
      };
      addEventListener("message", Browser_setImmediate_messageHandler, true);
      setImmediate = function Browser_emulated_setImmediate(func) {
        setImmediates.push(func);
        if (ENVIRONMENT_IS_WORKER) {
          if (Module["setImmediates"] === undefined)
            Module["setImmediates"] = [];
          Module["setImmediates"].push(func);
          postMessage({ target: emscriptenMainLoopMessageId });
        } else postMessage(emscriptenMainLoopMessageId, "*");
      };
    }
    Browser.mainLoop.scheduler =
      function Browser_mainLoop_scheduler_setImmediate() {
        setImmediate(Browser.mainLoop.runner);
      };
    Browser.mainLoop.method = "immediate";
  }
  return 0;
}
var _emscripten_get_now;
if (ENVIRONMENT_IS_NODE) {
  _emscripten_get_now = function () {
    var t = process["hrtime"]();
    return t[0] * 1e3 + t[1] / 1e6;
  };
} else
  _emscripten_get_now = function () {
    return performance.now();
  };
function setMainLoop(
  browserIterationFunc,
  fps,
  simulateInfiniteLoop,
  arg,
  noSetTiming
) {
  assert(
    !Browser.mainLoop.func,
    "emscripten_set_main_loop: there can only be one main loop function at once: call emscripten_cancel_main_loop to cancel the previous one before setting a new one with different parameters."
  );
  Browser.mainLoop.func = browserIterationFunc;
  Browser.mainLoop.arg = arg;
  var thisMainLoopId = Browser.mainLoop.currentlyRunningMainloop;
  function checkIsRunning() {
    if (thisMainLoopId < Browser.mainLoop.currentlyRunningMainloop) {
      runtimeKeepalivePop();
      maybeExit();
      return false;
    }
    return true;
  }
  Browser.mainLoop.running = false;
  Browser.mainLoop.runner = function Browser_mainLoop_runner() {
    if (ABORT) return;
    if (Browser.mainLoop.queue.length > 0) {
      var start = Date.now();
      var blocker = Browser.mainLoop.queue.shift();
      blocker.func(blocker.arg);
      if (Browser.mainLoop.remainingBlockers) {
        var remaining = Browser.mainLoop.remainingBlockers;
        var next = remaining % 1 == 0 ? remaining - 1 : Math.floor(remaining);
        if (blocker.counted) {
          Browser.mainLoop.remainingBlockers = next;
        } else {
          next = next + 0.5;
          Browser.mainLoop.remainingBlockers = (8 * remaining + next) / 9;
        }
      }
      out(
        'main loop blocker "' +
          blocker.name +
          '" took ' +
          (Date.now() - start) +
          " ms"
      );
      Browser.mainLoop.updateStatus();
      if (!checkIsRunning()) return;
      setTimeout(Browser.mainLoop.runner, 0);
      return;
    }
    if (!checkIsRunning()) return;
    Browser.mainLoop.currentFrameNumber =
      (Browser.mainLoop.currentFrameNumber + 1) | 0;
    if (
      Browser.mainLoop.timingMode == 1 &&
      Browser.mainLoop.timingValue > 1 &&
      Browser.mainLoop.currentFrameNumber % Browser.mainLoop.timingValue != 0
    ) {
      Browser.mainLoop.scheduler();
      return;
    } else if (Browser.mainLoop.timingMode == 0) {
      Browser.mainLoop.tickStartTime = _emscripten_get_now();
    }
    Browser.mainLoop.runIter(browserIterationFunc);
    if (!checkIsRunning()) return;
    if (typeof SDL === "object" && SDL.audio && SDL.audio.queueNewAudioData)
      SDL.audio.queueNewAudioData();
    Browser.mainLoop.scheduler();
  };
  if (!noSetTiming) {
    if (fps && fps > 0) _emscripten_set_main_loop_timing(0, 1e3 / fps);
    else _emscripten_set_main_loop_timing(1, 1);
    Browser.mainLoop.scheduler();
  }
  if (simulateInfiniteLoop) {
    throw "unwind";
  }
}
function _emscripten_set_main_loop(func, fps, simulateInfiniteLoop) {
  var browserIterationFunc = wasmTable.get(func);
  setMainLoop(browserIterationFunc, fps, simulateInfiniteLoop);
}
function __webgl_enable_ANGLE_instanced_arrays(ctx) {
  var ext = ctx.getExtension("ANGLE_instanced_arrays");
  if (ext) {
    ctx["vertexAttribDivisor"] = function (index, divisor) {
      ext["vertexAttribDivisorANGLE"](index, divisor);
    };
    ctx["drawArraysInstanced"] = function (mode, first, count, primcount) {
      ext["drawArraysInstancedANGLE"](mode, first, count, primcount);
    };
    ctx["drawElementsInstanced"] = function (
      mode,
      count,
      type,
      indices,
      primcount
    ) {
      ext["drawElementsInstancedANGLE"](mode, count, type, indices, primcount);
    };
    return 1;
  }
}
function __webgl_enable_OES_vertex_array_object(ctx) {
  var ext = ctx.getExtension("OES_vertex_array_object");
  if (ext) {
    ctx["createVertexArray"] = function () {
      return ext["createVertexArrayOES"]();
    };
    ctx["deleteVertexArray"] = function (vao) {
      ext["deleteVertexArrayOES"](vao);
    };
    ctx["bindVertexArray"] = function (vao) {
      ext["bindVertexArrayOES"](vao);
    };
    ctx["isVertexArray"] = function (vao) {
      return ext["isVertexArrayOES"](vao);
    };
    return 1;
  }
}
function __webgl_enable_WEBGL_draw_buffers(ctx) {
  var ext = ctx.getExtension("WEBGL_draw_buffers");
  if (ext) {
    ctx["drawBuffers"] = function (n, bufs) {
      ext["drawBuffersWEBGL"](n, bufs);
    };
    return 1;
  }
}
function __webgl_enable_WEBGL_multi_draw(ctx) {
  return !!(ctx.multiDrawWebgl = ctx.getExtension("WEBGL_multi_draw"));
}
var GL = {
  counter: 1,
  buffers: [],
  programs: [],
  framebuffers: [],
  renderbuffers: [],
  textures: [],
  shaders: [],
  vaos: [],
  contexts: [],
  offscreenCanvases: {},
  queries: [],
  stringCache: {},
  unpackAlignment: 4,
  recordError: function recordError(errorCode) {
    if (!GL.lastError) {
      GL.lastError = errorCode;
    }
  },
  getNewId: function (table) {
    var ret = GL.counter++;
    for (var i = table.length; i < ret; i++) {
      table[i] = null;
    }
    return ret;
  },
  getSource: function (shader, count, string, length) {
    var source = "";
    for (var i = 0; i < count; ++i) {
      var len = length ? HEAP32[(length + i * 4) >> 2] : -1;
      source += UTF8ToString(
        HEAP32[(string + i * 4) >> 2],
        len < 0 ? undefined : len
      );
    }
    return source;
  },
  createContext: function (canvas, webGLContextAttributes) {
    if (!canvas.getContextSafariWebGL2Fixed) {
      canvas.getContextSafariWebGL2Fixed = canvas.getContext;
      canvas.getContext = function (ver, attrs) {
        var gl = canvas.getContextSafariWebGL2Fixed(ver, attrs);
        return (ver == "webgl") == gl instanceof WebGLRenderingContext
          ? gl
          : null;
      };
    }
    var ctx = canvas.getContext("webgl", webGLContextAttributes);
    if (!ctx) return 0;
    var handle = GL.registerContext(ctx, webGLContextAttributes);
    return handle;
  },
  registerContext: function (ctx, webGLContextAttributes) {
    var handle = GL.getNewId(GL.contexts);
    var context = {
      handle: handle,
      attributes: webGLContextAttributes,
      version: webGLContextAttributes.majorVersion,
      GLctx: ctx,
    };
    if (ctx.canvas) ctx.canvas.GLctxObject = context;
    GL.contexts[handle] = context;
    if (
      typeof webGLContextAttributes.enableExtensionsByDefault === "undefined" ||
      webGLContextAttributes.enableExtensionsByDefault
    ) {
      GL.initExtensions(context);
    }
    return handle;
  },
  makeContextCurrent: function (contextHandle) {
    GL.currentContext = GL.contexts[contextHandle];
    Module.ctx = GLctx = GL.currentContext && GL.currentContext.GLctx;
    return !(contextHandle && !GLctx);
  },
  getContext: function (contextHandle) {
    return GL.contexts[contextHandle];
  },
  deleteContext: function (contextHandle) {
    if (GL.currentContext === GL.contexts[contextHandle])
      GL.currentContext = null;
    if (typeof JSEvents === "object")
      JSEvents.removeAllHandlersOnTarget(
        GL.contexts[contextHandle].GLctx.canvas
      );
    if (GL.contexts[contextHandle] && GL.contexts[contextHandle].GLctx.canvas)
      GL.contexts[contextHandle].GLctx.canvas.GLctxObject = undefined;
    GL.contexts[contextHandle] = null;
  },
  initExtensions: function (context) {
    if (!context) context = GL.currentContext;
    if (context.initExtensionsDone) return;
    context.initExtensionsDone = true;
    var GLctx = context.GLctx;
    __webgl_enable_ANGLE_instanced_arrays(GLctx);
    __webgl_enable_OES_vertex_array_object(GLctx);
    __webgl_enable_WEBGL_draw_buffers(GLctx);
    {
      GLctx.disjointTimerQueryExt = GLctx.getExtension(
        "EXT_disjoint_timer_query"
      );
    }
    __webgl_enable_WEBGL_multi_draw(GLctx);
    var exts = GLctx.getSupportedExtensions() || [];
    exts.forEach(function (ext) {
      if (!ext.includes("lose_context") && !ext.includes("debug")) {
        GLctx.getExtension(ext);
      }
    });
  },
};
var __emscripten_webgl_power_preferences = [
  "default",
  "low-power",
  "high-performance",
];
function _emscripten_webgl_do_create_context(target, attributes) {
  var a = attributes >> 2;
  var powerPreference = HEAP32[a + (24 >> 2)];
  var contextAttributes = {
    alpha: !!HEAP32[a + (0 >> 2)],
    depth: !!HEAP32[a + (4 >> 2)],
    stencil: !!HEAP32[a + (8 >> 2)],
    antialias: !!HEAP32[a + (12 >> 2)],
    premultipliedAlpha: !!HEAP32[a + (16 >> 2)],
    preserveDrawingBuffer: !!HEAP32[a + (20 >> 2)],
    powerPreference: __emscripten_webgl_power_preferences[powerPreference],
    failIfMajorPerformanceCaveat: !!HEAP32[a + (28 >> 2)],
    majorVersion: HEAP32[a + (32 >> 2)],
    minorVersion: HEAP32[a + (36 >> 2)],
    enableExtensionsByDefault: HEAP32[a + (40 >> 2)],
    explicitSwapControl: HEAP32[a + (44 >> 2)],
    proxyContextToMainThread: HEAP32[a + (48 >> 2)],
    renderViaOffscreenBackBuffer: HEAP32[a + (52 >> 2)],
  };
  var canvas = findCanvasEventTarget(target);
  if (!canvas) {
    return 0;
  }
  if (contextAttributes.explicitSwapControl) {
    return 0;
  }
  var contextHandle = GL.createContext(canvas, contextAttributes);
  return contextHandle;
}
function _emscripten_webgl_create_context(a0, a1) {
  return _emscripten_webgl_do_create_context(a0, a1);
}
function _emscripten_webgl_init_context_attributes(attributes) {
  var a = attributes >> 2;
  for (var i = 0; i < 56 >> 2; ++i) {
    HEAP32[a + i] = 0;
  }
  HEAP32[a + (0 >> 2)] =
    HEAP32[a + (4 >> 2)] =
    HEAP32[a + (12 >> 2)] =
    HEAP32[a + (16 >> 2)] =
    HEAP32[a + (32 >> 2)] =
    HEAP32[a + (40 >> 2)] =
      1;
}
function _emscripten_webgl_make_context_current(contextHandle) {
  var success = GL.makeContextCurrent(contextHandle);
  return success ? 0 : -5;
}
function flush_NO_FILESYSTEM() {
  if (typeof _fflush !== "undefined") _fflush(0);
  var buffers = SYSCALLS.buffers;
  if (buffers[1].length) SYSCALLS.printChar(1, 10);
  if (buffers[2].length) SYSCALLS.printChar(2, 10);
}
function _fd_write(fd, iov, iovcnt, pnum) {
  var num = 0;
  for (var i = 0; i < iovcnt; i++) {
    var ptr = HEAP32[(iov + i * 8) >> 2];
    var len = HEAP32[(iov + (i * 8 + 4)) >> 2];
    for (var j = 0; j < len; j++) {
      SYSCALLS.printChar(fd, HEAPU8[ptr + j]);
    }
    num += len;
  }
  HEAP32[pnum >> 2] = num;
  return 0;
}
function _glAttachShader(program, shader) {
  GLctx.attachShader(GL.programs[program], GL.shaders[shader]);
}
function _glBindAttribLocation(program, index, name) {
  GLctx.bindAttribLocation(GL.programs[program], index, UTF8ToString(name));
}
function _glBindBuffer(target, buffer) {
  GLctx.bindBuffer(target, GL.buffers[buffer]);
}
function _glBufferData(target, size, data, usage) {
  GLctx.bufferData(
    target,
    data ? HEAPU8.subarray(data, data + size) : size,
    usage
  );
}
function _glClear(x0) {
  GLctx["clear"](x0);
}
function _glClearColor(x0, x1, x2, x3) {
  GLctx["clearColor"](x0, x1, x2, x3);
}
function _glCompileShader(shader) {
  GLctx.compileShader(GL.shaders[shader]);
}
function _glCreateProgram() {
  var id = GL.getNewId(GL.programs);
  var program = GLctx.createProgram();
  program.name = id;
  program.maxUniformLength =
    program.maxAttributeLength =
    program.maxUniformBlockNameLength =
      0;
  program.uniformIdCounter = 1;
  GL.programs[id] = program;
  return id;
}
function _glCreateShader(shaderType) {
  var id = GL.getNewId(GL.shaders);
  GL.shaders[id] = GLctx.createShader(shaderType);
  return id;
}
function _glDeleteProgram(id) {
  if (!id) return;
  var program = GL.programs[id];
  if (!program) {
    GL.recordError(1281);
    return;
  }
  GLctx.deleteProgram(program);
  program.name = 0;
  GL.programs[id] = null;
}
function _glDeleteShader(id) {
  if (!id) return;
  var shader = GL.shaders[id];
  if (!shader) {
    GL.recordError(1281);
    return;
  }
  GLctx.deleteShader(shader);
  GL.shaders[id] = null;
}
function _glDrawArrays(mode, first, count) {
  GLctx.drawArrays(mode, first, count);
}
function _glEnableVertexAttribArray(index) {
  GLctx.enableVertexAttribArray(index);
}
function __glGenObject(n, buffers, createFunction, objectTable) {
  for (var i = 0; i < n; i++) {
    var buffer = GLctx[createFunction]();
    var id = buffer && GL.getNewId(objectTable);
    if (buffer) {
      buffer.name = id;
      objectTable[id] = buffer;
    } else {
      GL.recordError(1282);
    }
    HEAP32[(buffers + i * 4) >> 2] = id;
  }
}
function _glGenBuffers(n, buffers) {
  __glGenObject(n, buffers, "createBuffer", GL.buffers);
}
function _glGetProgramInfoLog(program, maxLength, length, infoLog) {
  var log = GLctx.getProgramInfoLog(GL.programs[program]);
  if (log === null) log = "(unknown error)";
  var numBytesWrittenExclNull =
    maxLength > 0 && infoLog ? stringToUTF8(log, infoLog, maxLength) : 0;
  if (length) HEAP32[length >> 2] = numBytesWrittenExclNull;
}
function _glGetProgramiv(program, pname, p) {
  if (!p) {
    GL.recordError(1281);
    return;
  }
  if (program >= GL.counter) {
    GL.recordError(1281);
    return;
  }
  program = GL.programs[program];
  if (pname == 35716) {
    var log = GLctx.getProgramInfoLog(program);
    if (log === null) log = "(unknown error)";
    HEAP32[p >> 2] = log.length + 1;
  } else if (pname == 35719) {
    if (!program.maxUniformLength) {
      for (var i = 0; i < GLctx.getProgramParameter(program, 35718); ++i) {
        program.maxUniformLength = Math.max(
          program.maxUniformLength,
          GLctx.getActiveUniform(program, i).name.length + 1
        );
      }
    }
    HEAP32[p >> 2] = program.maxUniformLength;
  } else if (pname == 35722) {
    if (!program.maxAttributeLength) {
      for (var i = 0; i < GLctx.getProgramParameter(program, 35721); ++i) {
        program.maxAttributeLength = Math.max(
          program.maxAttributeLength,
          GLctx.getActiveAttrib(program, i).name.length + 1
        );
      }
    }
    HEAP32[p >> 2] = program.maxAttributeLength;
  } else if (pname == 35381) {
    if (!program.maxUniformBlockNameLength) {
      for (var i = 0; i < GLctx.getProgramParameter(program, 35382); ++i) {
        program.maxUniformBlockNameLength = Math.max(
          program.maxUniformBlockNameLength,
          GLctx.getActiveUniformBlockName(program, i).length + 1
        );
      }
    }
    HEAP32[p >> 2] = program.maxUniformBlockNameLength;
  } else {
    HEAP32[p >> 2] = GLctx.getProgramParameter(program, pname);
  }
}
function _glGetShaderInfoLog(shader, maxLength, length, infoLog) {
  var log = GLctx.getShaderInfoLog(GL.shaders[shader]);
  if (log === null) log = "(unknown error)";
  var numBytesWrittenExclNull =
    maxLength > 0 && infoLog ? stringToUTF8(log, infoLog, maxLength) : 0;
  if (length) HEAP32[length >> 2] = numBytesWrittenExclNull;
}
function _glGetShaderiv(shader, pname, p) {
  if (!p) {
    GL.recordError(1281);
    return;
  }
  if (pname == 35716) {
    var log = GLctx.getShaderInfoLog(GL.shaders[shader]);
    if (log === null) log = "(unknown error)";
    var logLength = log ? log.length + 1 : 0;
    HEAP32[p >> 2] = logLength;
  } else if (pname == 35720) {
    var source = GLctx.getShaderSource(GL.shaders[shader]);
    var sourceLength = source ? source.length + 1 : 0;
    HEAP32[p >> 2] = sourceLength;
  } else {
    HEAP32[p >> 2] = GLctx.getShaderParameter(GL.shaders[shader], pname);
  }
}
function _glLinkProgram(program) {
  program = GL.programs[program];
  GLctx.linkProgram(program);
  program.uniformLocsById = 0;
  program.uniformSizeAndIdsByName = {};
}
function _glShaderSource(shader, count, string, length) {
  var source = GL.getSource(shader, count, string, length);
  GLctx.shaderSource(GL.shaders[shader], source);
}
function _glUseProgram(program) {
  program = GL.programs[program];
  GLctx.useProgram(program);
  GLctx.currentProgram = program;
}
function _glVertexAttribPointer(index, size, type, normalized, stride, ptr) {
  GLctx.vertexAttribPointer(index, size, type, !!normalized, stride, ptr);
}
function _glViewport(x0, x1, x2, x3) {
  GLctx["viewport"](x0, x1, x2, x3);
}
function _proc_exit(code) {
  procExit(code);
}
Module["requestFullscreen"] = function Module_requestFullscreen(
  lockPointer,
  resizeCanvas
) {
  Browser.requestFullscreen(lockPointer, resizeCanvas);
};
Module["requestAnimationFrame"] = function Module_requestAnimationFrame(func) {
  Browser.requestAnimationFrame(func);
};
Module["setCanvasSize"] = function Module_setCanvasSize(
  width,
  height,
  noUpdates
) {
  Browser.setCanvasSize(width, height, noUpdates);
};
Module["pauseMainLoop"] = function Module_pauseMainLoop() {
  Browser.mainLoop.pause();
};
Module["resumeMainLoop"] = function Module_resumeMainLoop() {
  Browser.mainLoop.resume();
};
Module["getUserMedia"] = function Module_getUserMedia() {
  Browser.getUserMedia();
};
Module["createContext"] = function Module_createContext(
  canvas,
  useWebGL,
  setInModule,
  webGLContextAttributes
) {
  return Browser.createContext(
    canvas,
    useWebGL,
    setInModule,
    webGLContextAttributes
  );
};
var GLctx;
var asmLibraryArg = {
  args_get: _args_get,
  args_sizes_get: _args_sizes_get,
  emscripten_set_canvas_element_size: _emscripten_set_canvas_element_size,
  emscripten_set_main_loop: _emscripten_set_main_loop,
  emscripten_webgl_create_context: _emscripten_webgl_create_context,
  emscripten_webgl_init_context_attributes:
    _emscripten_webgl_init_context_attributes,
  emscripten_webgl_make_context_current: _emscripten_webgl_make_context_current,
  fd_write: _fd_write,
  glAttachShader: _glAttachShader,
  glBindAttribLocation: _glBindAttribLocation,
  glBindBuffer: _glBindBuffer,
  glBufferData: _glBufferData,
  glClear: _glClear,
  glClearColor: _glClearColor,
  glCompileShader: _glCompileShader,
  glCreateProgram: _glCreateProgram,
  glCreateShader: _glCreateShader,
  glDeleteProgram: _glDeleteProgram,
  glDeleteShader: _glDeleteShader,
  glDrawArrays: _glDrawArrays,
  glEnableVertexAttribArray: _glEnableVertexAttribArray,
  glGenBuffers: _glGenBuffers,
  glGetProgramInfoLog: _glGetProgramInfoLog,
  glGetProgramiv: _glGetProgramiv,
  glGetShaderInfoLog: _glGetShaderInfoLog,
  glGetShaderiv: _glGetShaderiv,
  glLinkProgram: _glLinkProgram,
  glShaderSource: _glShaderSource,
  glUseProgram: _glUseProgram,
  glVertexAttribPointer: _glVertexAttribPointer,
  glViewport: _glViewport,
  proc_exit: _proc_exit,
};
var asm = createWasm();
var __start = (Module["__start"] = function () {
  return (__start = Module["__start"] = Module["asm"]["_start"]).apply(
    null,
    arguments
  );
});
var _fflush = (Module["_fflush"] = function () {
  return (_fflush = Module["_fflush"] = Module["asm"]["fflush"]).apply(
    null,
    arguments
  );
});
var calledRun;
function ExitStatus(status) {
  this.name = "ExitStatus";
  this.message = "Program terminated with exit(" + status + ")";
  this.status = status;
}
var calledMain = false;
var mainArgs = undefined;
dependenciesFulfilled = function runCaller() {
  if (!calledRun) run();
  if (!calledRun) dependenciesFulfilled = runCaller;
};
function callMain(args) {
  var entryFunction = Module["__start"];
  mainArgs = [thisProgram].concat(args);
  try {
    entryFunction();
    var ret = 0;
    exit(ret, true);
  } catch (e) {
    if (e instanceof ExitStatus || e == "unwind") {
      return;
    }
    var toLog = e;
    if (e && typeof e === "object" && e.stack) {
      toLog = [e, e.stack];
    }
    err("exception thrown: " + toLog);
    quit_(1, e);
  } finally {
    calledMain = true;
  }
}
function run(args) {
  args = args || arguments_;
  if (runDependencies > 0) {
    return;
  }
  preRun();
  if (runDependencies > 0) {
    return;
  }
  function doRun() {
    if (calledRun) return;
    calledRun = true;
    Module["calledRun"] = true;
    if (ABORT) return;
    initRuntime();
    preMain();
    if (Module["onRuntimeInitialized"]) Module["onRuntimeInitialized"]();
    if (shouldRunNow) callMain(args);
    postRun();
  }
  if (Module["setStatus"]) {
    Module["setStatus"]("Running...");
    setTimeout(function () {
      setTimeout(function () {
        Module["setStatus"]("");
      }, 1);
      doRun();
    }, 1);
  } else {
    doRun();
  }
}
Module["run"] = run;
function exit(status, implicit) {
  EXITSTATUS = status;
  if (keepRuntimeAlive()) {
  } else {
    exitRuntime();
  }
  procExit(status);
}
function procExit(code) {
  EXITSTATUS = code;
  if (!keepRuntimeAlive()) {
    if (Module["onExit"]) Module["onExit"](code);
    ABORT = true;
  }
  quit_(code, new ExitStatus(code));
}
if (Module["preInit"]) {
  if (typeof Module["preInit"] == "function")
    Module["preInit"] = [Module["preInit"]];
  while (Module["preInit"].length > 0) {
    Module["preInit"].pop()();
  }
}
var shouldRunNow = true;
if (Module["noInitialRun"]) shouldRunNow = false;
run();
