cmake_minimum_required(VERSION 3.31)

project(geos_js)

set(CMAKE_CXX_STANDARD 17)

set(SOURCE_FILES src/geos_js.cpp)

set(GEOS_JS geos_js)

find_package(GEOS REQUIRED)

if (DEFINED EMSCRIPTEN)
    add_executable(${GEOS_JS} ${SOURCE_FILES})
    target_link_libraries(${GEOS_JS} PRIVATE GEOS::geos_c)
    target_link_libraries(${GEOS_JS} PRIVATE GEOS::geos)

    # EXPORTED_RUNTIME_METHODS:
    set(EXPORTED_RUNTIME_METHODS_LIST
            wasmTable # needed to export '__indirect_function_table'
    )
    list(JOIN EXPORTED_RUNTIME_METHODS_LIST "," EXPORTED_RUNTIME_METHODS)
    message(STATUS "EXPORTED_RUNTIME_METHODS=[${EXPORTED_RUNTIME_METHODS}]")

    # EXPORTED_FUNCTIONS:
    file(READ exported_functions.txt EXPORTED_FUNCTIONS_LIST) # load GEOS functions from `./exported_functions.txt`
    string(REPLACE "\n" ";" EXPORTED_FUNCTIONS_LIST "${EXPORTED_FUNCTIONS_LIST}")
    list(TRANSFORM EXPORTED_FUNCTIONS_LIST STRIP) # remove leading and trailing spaces from each line
    list(FILTER EXPORTED_FUNCTIONS_LIST EXCLUDE REGEX "^(|#.*)$") # filter out empty/commented lines
    list(PREPEND EXPORTED_FUNCTIONS_LIST
            # add basic functions:
            free
            malloc
    )
    list(APPEND EXPORTED_FUNCTIONS_LIST
            # add custom functions:
            geosify_geomsCoords
            geosify_geoms_r
            jsonify_geoms
            STRtree_create_r
            STRtree_destroy_r
            STRtree_query_r
            STRtree_nearest_r
            STRtree_nearestAll_r
    )
    list(TRANSFORM EXPORTED_FUNCTIONS_LIST PREPEND "_") # add "_" at the beginning of each function name (emscripten convention)
    list(JOIN EXPORTED_FUNCTIONS_LIST "," EXPORTED_FUNCTIONS)
    message(STATUS "EXPORTED_FUNCTIONS=[${EXPORTED_FUNCTIONS}]")


    # emcc settings: https://emscripten.org/docs/tools_reference/emcc.html
    # `-s` settings: https://emscripten.org/docs/tools_reference/settings_reference.html

    target_compile_options(${GEOS_JS}
            PUBLIC
#            -O0
            -O3
            -flto
            -fwasm-exceptions
            -sSUPPORT_LONGJMP=0
    )

    target_link_options(${GEOS_JS}
            PUBLIC
#            -O0
            -O3
            -flto
            -fwasm-exceptions
            --no-entry # no main entry point, no `int main()`
            -sEXPORTED_RUNTIME_METHODS=[${EXPORTED_RUNTIME_METHODS}]
            -sEXPORTED_FUNCTIONS=[${EXPORTED_FUNCTIONS}]
            -g0 # no debug info
#            -g3 # with debug info
#            --profiling-funcs # just to preserve all functions names

#            -sASSERTIONS=1 # to enable error.stack traces
#            -sASSERTIONS=2 # to detect stack overflows

            -sSUPPORT_LONGJMP=0
            -sFILESYSTEM=0
            -sALLOW_TABLE_GROWTH=1 # to dynamically add wasm functions
            -sALLOW_MEMORY_GROWTH=1
            -sMAXIMUM_MEMORY=4GB
            -sABORTING_MALLOC=1 # doesn't seem to work (emscripten 4.0.6)

            -sSTANDALONE_WASM=1
    )
else ()
    add_library(${PROJECT_NAME} STATIC ${SOURCE_FILES})
    target_link_libraries(${PROJECT_NAME} PRIVATE GEOS::geos_c)
    target_link_libraries(${PROJECT_NAME} PRIVATE GEOS::geos)
endif ()
