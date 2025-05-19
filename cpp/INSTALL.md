Required tools:
- wget, tar, make, cmake, doxygen
- [Emscripten](https://emscripten.org/docs/getting_started/downloads.html)
- [Node.js](https://nodejs.org/en/download) (for running [process-geos-docs](./scripts/process-geos-docs/index.mjs) script)


to build GEOS dependency:
```shell
make geos-build
```

to generate [`./build/js/geos_js.wasm`](./build/js/geos_js.wasm) from [`./src/geos_js.cpp`](./src/geos_js.cpp):
```shell
make geos-js-build
```

`make` by default uses emscripten from the PATH, if it is not there it could be added by calling `source <path to emsdk here>/emsdk_env.sh`.
Alternatively it could be passed to `make` explicitly by calling `make <target> EMCMAKE=<path to emsdk here>/upstream/emscripten/emcmake`.

---

to inspect generated .wasm file:
```shell
wasm-objdump -x ./build/js/geos_js.wasm
```

---

to add/remove GEOS C-API function from the .wasm file first uncomment/comment selected function from the [`./exported_functions.txt`](./exported_functions.txt) file and then rebuild .wasm file by calling `make geos-js-build`.

---

for Windows users WSL is recommended.
