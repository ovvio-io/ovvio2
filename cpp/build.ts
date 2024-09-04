let optimization = '-O1';
let sanitizer = '';

for (let i = 0; i < Deno.args.length; i++) {
  const arg = Deno.args[i];
  if (['-O0', '-O1', '-O2', '-O3', '-Os', '-Oz'].includes(arg)) {
    optimization = arg;
  } else if (arg.startsWith('--sanitize=')) {
    sanitizer = arg.split('=')[1];
  } else {
    console.error(`Unknown parameter: ${arg}`);
    Deno.exit(1);
  }
}

const checkEmscripten = Deno.run({
  cmd: ['which', 'emcc'],
  stdout: 'null',
  stderr: 'null',
});

const { success } = await checkEmscripten.status();
if (!success) {
  console.error(
    "Emscripten could not be found. Please install it and make sure it's in your PATH."
  );
  Deno.exit(1);
}

// Build the compilation flags
let cflags = `-std=c++20 -s WASM=1 \
-I. \
-I../external \
-I/opt/homebrew/include \
-s EXPORTED_FUNCTIONS="['_malloc', '_free', '_createBloomFilter', '_addToFilter', '_checkInFilter', '_deleteBloomFilter', '_serializeBloomFilter', '_deserializeBloomFilter', '_freeSerializedData']" \
-s EXPORTED_RUNTIME_METHODS="['ccall', 'cwrap', 'UTF8ToString']" \
-s DISABLE_EXCEPTION_CATCHING=0 \
-s ALLOW_MEMORY_GROWTH=1 \
-s INITIAL_MEMORY=256MB \
-s MAXIMUM_MEMORY=4GB \
-s NO_EXIT_RUNTIME=1 \
-s ENVIRONMENT='web' \
--no-entry \
-s ERROR_ON_UNDEFINED_SYMBOLS=0 \
-s ASSERTIONS=1`;

// Add optimization flag
cflags += ` ${optimization}`;

// Add sanitizer if specified
if (sanitizer) {
  cflags += ` -fsanitize=${sanitizer}`;
}

// Run the emcc command to compile
const compileCommand = `emcc ${cflags} -o bloom_filter.js BloomFilter.cpp ../external/MurmurHash3.cpp`;
const compile = Deno.run({
  cmd: ['sh', '-c', compileCommand],
  stdout: 'inherit',
  stderr: 'inherit',
});

const compileStatus = await compile.status();
if (compileStatus.success) {
  console.log(
    'Compilation complete. Output files: bloom_filter.js and bloom_filter.wasm'
  );
  console.log(`Optimization level: ${optimization}`);
  if (sanitizer) {
    console.log(`Sanitizer: ${sanitizer}`);
  }
} else {
  console.error('Compilation failed.');
  Deno.exit(1);
}
