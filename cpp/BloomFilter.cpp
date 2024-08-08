#include "BloomFilter.h"

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

#include "MurmurHash3.h"

// BloomFilter implementation

BloomFilter::BloomFilter(size_t size, FalsePositiveRate fpr, size_t maxHashes)
    : _size(calculateOptimalM(size, fpr.getValue())),
      _numHashes(calculateOptimalK(size, calculateOptimalM(size, fpr.getValue()))),
      bits((calculateOptimalM(size, fpr.getValue()) + 63) / 64, 0) {
  if (maxHashes > 0 && _numHashes > maxHashes) {
    _numHashes = maxHashes;
  }
  std::ostringstream oss;
  oss << "BloomFilter constructor:\n"
      << "  Requested size: " << size << "\n"
      << "  Requested FPR: " << fpr.getValue() << "\n"
      << "  Actual filter size: " << _size << "\n"
      << "  Number of hash functions: " << _numHashes << "\n"
      << "  Seeds:\n";

  _seeds.resize(_numHashes);
  std::mt19937 gen(std::chrono::system_clock::now().time_since_epoch().count());
  std::uniform_int_distribution<> dis(0, std::numeric_limits<int>::max());
  for (size_t i = 0; i < _numHashes; ++i) {
    _seeds[i] = dis(gen);
    oss << "    " << i << ": " << _seeds[i] << "\n";
  }

  debugLog += oss.str();
}

void BloomFilter::setBit(size_t index) {
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
    uint32_t hash = hashString(value, _seeds[i]);
    setBit(hash % _size);
  }
}

bool BloomFilter::has(const std::string& value) const {
  for (size_t i = 0; i < _numHashes; ++i) {
    uint32_t hash = hashString(value, _seeds[i]);
    if (!getBit(hash % _size)) {
      return false;
    }
  }
  return true;
}

uint32_t BloomFilter::hashString(const std::string& value, uint32_t seed) const {
  uint32_t hash;
  MurmurHash3_x64_128(value.data(), value.length(), seed, &hash);
  return hash;
}

void BloomFilter::clear() {
  std::fill(bits.begin(), bits.end(), 0);
}

double BloomFilter::fillRate() const {
  size_t count = 0;
  for (const auto& block : bits) {
    count += __builtin_popcountll(block);
  }
  return static_cast<double>(count) / _size;
}

size_t BloomFilter::byteSize() const {
  return bits.size() * sizeof(uint64_t);
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
    if (i > 0) oss << ",";
    oss << _seeds[i];
  }
  return oss.str();
}

size_t BloomFilter::calculateOptimalM(size_t size, double fpr) {
  if (size == 0 || fpr <= 0 || fpr >= 1) return 1;
  return static_cast<size_t>(std::ceil(-(size * std::log(fpr)) / (std::log(2) * std::log(2))));
}

size_t BloomFilter::calculateOptimalK(size_t size, size_t m) {
  if (size == 0 || m == 0) return 1;
  return static_cast<size_t>(std::round((m / static_cast<double>(size)) * std::log(2)));
}

extern "C" {
EMSCRIPTEN_KEEPALIVE
BloomFilter* create_bloom_filter(size_t size, double fpr) {
  try {
    return new BloomFilter(size, FalsePositiveRate(fpr));
  } catch (const std::invalid_argument& e) {
    return nullptr;
  }
}

EMSCRIPTEN_KEEPALIVE
void add_to_filter(BloomFilter* filter, const char* value) {
  if (filter && value) {
    filter->add(std::string(value));
  }
}

EMSCRIPTEN_KEEPALIVE
int check_in_filter(BloomFilter* filter, const char* value) {
  if (filter && value) {
    return filter->has(std::string(value)) ? 1 : 0;
  }
  return 0;
}

EMSCRIPTEN_KEEPALIVE
void delete_bloom_filter(BloomFilter* filter) {
  delete filter;
}
}