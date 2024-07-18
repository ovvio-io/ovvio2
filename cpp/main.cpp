#include <emscripten/bind.h>
#include "BloomFilter.h"

using namespace emscripten;

EMSCRIPTEN_BINDINGS(my_module)
{
    class_<BloomFilter>("BloomFilter")
        .constructor<size_t, double, size_t, size_t, size_t>()
        .function("add", &BloomFilter::add)
        .function("possiblyContains", &BloomFilter::possiblyContains)
        .function("serialize", &BloomFilter::serialize)
        .function("deserialize", &BloomFilter::deserialize)
        .function("printBuffer", &BloomFilter::printBuffer);
}