#!/bin/bash

# Check if Emscripten is installed
if ! command -v emcc &> /dev/null
then
    echo "Emscripten could not be found. Please install it and make sure it's in your PATH."
    exit 1
fi

# Compile C++ to WebAssembly
emcc -std=c++17 -O3 -s WASM=1 \
-s EXPORTED_FUNCTIONS="['_create_bloom_filter', '_add_to_filter', '_check_in_filter', '_delete_bloom_filter', '_get_debug_log', '_get_filter_info', '_get_detailed_info', '_get_hash_info']" \
-s EXPORTED_RUNTIME_METHODS="['ccall', 'cwrap']" \
-s ALLOW_MEMORY_GROWTH=1 \
-s MAXIMUM_MEMORY=4GB \
-s NO_EXIT_RUNTIME=1 \
-s ENVIRONMENT='web' \
--no-entry \
-o bloom_filter.js BloomFilter.cpp
echo "Compilation complete. Output files: bloom_filter.js and bloom_filter.wasm"




# git clone https://github.com/emscripten-core/emsdk.git
# cd emsdk
# ./emsdk install latest
# ./emsdk activate latest
# source ./emsdk_env.sh




# MAXIMUM_MEMORY=4GB to allow for larger Bloom filters if needed.
# NO_EXIT_RUNTIME=1 to keep the runtime alive, which can be beneficial for persistent objects like your Bloom filter.
# ENVIRONMENT='web' to optimize for web environments.
# --no-entry to indicate that there's no main function, which is typical for library-like WASM modules.
