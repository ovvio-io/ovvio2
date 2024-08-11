
#ifdef __EMSCRIPTEN__
#include <emscripten.h>
#endif
#include <algorithm>
#include <chrono>
#include <cmath>
#include <cstdint>
#include <limits>
#include <random>
#include <sstream>
#include <stdexcept>
#include <string>
#include <vector>

#include "BloomFilter.h"
#include "MurmurHash3.h"

BloomFilter::BloomFilter(size_t size, FalsePositiveRate fpr, size_t maxHashes)
    : _size(calculateOptNumHashes(size, fpr.getValue())),
      _numHashes(calculateOptMaxNumHashes(size, calculateOptNumHashes(size, fpr.getValue()))),
      // "rounding up" to the nearest multiple of 64.
      bits((calculateOptNumHashes(size, fpr.getValue()) + 63) / 64, 0) {
  if (maxHashes > 0 && _numHashes > maxHashes) {
    _numHashes = maxHashes;
  }
  _seeds.resize(_numHashes);
  // Creates a seed for the random number generator based on the current time.
  const auto seed = std::chrono::system_clock::now().time_since_epoch().count();
  // Creates a Mersenne Twister random number generator
  std::mt19937 gen{static_cast<std::mt19937::result_type>(seed)};
  std::uniform_int_distribution<> dis(0, std::numeric_limits<int>::max());
  for (auto& seed : _seeds) {
    seed = dis(gen);
  }
}

uint32_t BloomFilter::hashString(const std::string& value, uint32_t seed) {
  uint32_t hash = 0;
  MurmurHash3_x64_128(value.data(), static_cast<int>(value.length()), seed, &hash);
  return hash;
}

void BloomFilter::setBit(size_t index) {  // this linter's suggestion is wrong.
  if (index < _size) {
    bits[index / 64] |= (1ULL << (index % 64));
  }
}

bool BloomFilter::getBit(size_t index) const {
  if (index < _size) {
    return (bits[index / 64] & (1ULL << (index % 64))) != 0;
  }
  return false;
}

void BloomFilter::add(const std::string& value) {
  for (size_t i = 0; i < _numHashes; ++i) {
    uint32_t hash = 0;
    hash = BloomFilter::hashString(value, _seeds[i]);
    setBit(hash % _size);
  }
}

bool BloomFilter::has(const std::string& value) const {
  for (size_t i = 0; i < _numHashes; ++i) {
    uint32_t hash = 0;
    hash = BloomFilter::hashString(value, _seeds[i]);
    if (!getBit(hash % _size)) {
      return false;
    }
  }
  return true;
}

void BloomFilter::clear() {
  std::fill(bits.begin(), bits.end(), 0);
}

double BloomFilter::fillRate() const {
  size_t count = 0;
  for (const auto& block : bits) {
    count += __builtin_popcountll(block);
  }
  return static_cast<double>(count) / (double)_size;
}

std::string BloomFilter::serialize() const {
  std::ostringstream oss;
  oss << _size << "|";
  for (const auto& block : bits) {
    for (int i = 0; i < 64; ++i) {
      oss << ((block & (1ULL << i)) ? '1' : '0');
    }
  }
  oss << "|";
  for (size_t i = 0; i < _seeds.size(); ++i) {
    if (i > 0) {
      oss << ",";
    }
    oss << _seeds[i];
  }
  return oss.str();
}

size_t BloomFilter::calculateOptNumHashes(size_t size, double fpr) {
  if (size == 0 || fpr <= 0 || fpr >= 1) {
    return 1;
  }

  return static_cast<size_t>(
      std::ceil(-((double)size * std::log(fpr)) / (std::log(2) * std::log(2))));
}

size_t BloomFilter::calculateOptMaxNumHashes(size_t itemCount, size_t bitArraySize) {
  if (itemCount == 0 || bitArraySize == 0) {
    return 1;
  }
  return static_cast<size_t>(
      std::round(static_cast<double>(bitArraySize) / itemCount * std::log(2)));
}

std::unique_ptr<BloomFilter> createBloomFilterUnique(size_t size, double fpr) {
  return std::make_unique<BloomFilter>(size, FalsePositiveRate(fpr));
}

extern "C" {
EMSCRIPTEN_KEEPALIVE
BloomFilter* createBloomFilter(size_t size, double fpr) {
  auto filter = createBloomFilterUnique(size, fpr);
  return filter.release();  // Transfers ownership to the caller
}

EMSCRIPTEN_KEEPALIVE
void addToFilter(BloomFilter* filter, const char* value) {
  if ((filter != nullptr) && (value != nullptr)) {
    filter->add(std::string(value));
  }
}

EMSCRIPTEN_KEEPALIVE
int checkInFilter(BloomFilter* filter, const char* value) {
  if ((filter != nullptr) && (value != nullptr)) {
    return filter->has(std::string(value)) ? 1 : 0;
  }
  return 0;
}

EMSCRIPTEN_KEEPALIVE
void deleteBloomFilter(BloomFilter* filter) {
  // Using raw pointer for WebAssembly/Emscripten compatibility
  // NOLINTNEXTLINE(cppcoreguidelines-owning-memory)
  delete filter;
}
}