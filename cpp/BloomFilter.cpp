
#ifdef __EMSCRIPTEN__
#include <emscripten.h>
#endif

#include <algorithm>
#include <array>
#include <cmath>
#include <cstdint>
#include <iterator>
#include <limits>
#include <random>
#include <stdexcept>
#include <string>
#include <vector>

#include "BloomFilter.hpp"
#include "MurmurHash3.h"

constexpr uint64_t MAX_SERIALIZED_SIZE = 1000000000;

BloomFilter::BloomFilter(size_t size, FalsePositiveRate fpr, size_t maxHashes)
    : size_(calculateTotalBits(size, fpr.getValue())),
      num_hashes(calculateOptMaxNumHashes(size, calculateTotalBits(size, fpr.getValue()))),
      // "rounding up" to the nearest multiple of 64.
      bits((calculateTotalBits(size, fpr.getValue()) + 63) / 64, 0) {
  if (maxHashes > 0 && num_hashes > maxHashes) {
    num_hashes = maxHashes;
  }
  seeds.resize(num_hashes);

  // Creates a seed for the random number generator based on the current time.
  const auto seed = std::chrono::system_clock::now().time_since_epoch().count();

  // Creates a Mersenne Twister random number generator
  std::mt19937 gen{static_cast<std::mt19937::result_type>(seed)};
  std::uniform_int_distribution<> dis(0, std::numeric_limits<int>::max());

  for (auto& s : seeds) {
    s = dis(gen);
  }
}

auto BloomFilter::hashString(const std::string& value, uint32_t seed) -> uint32_t {
  std::array<uint64_t, 2> hash = {0, 0};
  MurmurHash3_x64_128(value.data(), static_cast<int>(value.length()), seed, hash.data());
  return static_cast<uint32_t>(hash[0]);
}

void BloomFilter::setBit(size_t index) {
  if (index < size_) {
    bits[index / 64] |= (1ULL << (index % 64));
  }
}

auto BloomFilter::getBit(size_t index) const -> bool {
  if (index < size_) {
    return (bits[index / 64] & (1ULL << (index % 64))) != 0;
  }
  return false;
}

void BloomFilter::add(const std::string& value) {
  for (size_t i = 0; i < num_hashes; ++i) {
    uint32_t hash = 0;
    hash = BloomFilter::hashString(value, seeds[i]);
    setBit(hash % size_);
  }
}

auto BloomFilter::has(const std::string& value) const -> bool {
  for (size_t i = 0; i < num_hashes; ++i) {
    uint32_t hash = 0;
    hash = BloomFilter::hashString(value, seeds[i]);
    if (!getBit(hash % size_)) {
      return false;
    }
  }
  return true;
}

void BloomFilter::clear() {
  std::fill(bits.begin(), bits.end(), 0);
}

auto BloomFilter::fillRate() const -> double {
  size_t count = 0;
  for (const auto& block : bits) {
    count += __builtin_popcountll(block);
  }
  return static_cast<double>(count) / (double)size_;
}

auto BloomFilter::calculateTotalBits(size_t size, double fpr) -> size_t {
  if (size == 0 || fpr <= 0 || fpr >= 1) {
    return 1;
  }

  return static_cast<size_t>(
      std::ceil((size * std::log(fpr)) / std::log(1 / std::pow(2, std::log(2)))));
}

auto BloomFilter::calculateOptMaxNumHashes(size_t itemCount, size_t bitArraySize) -> size_t {
  if (itemCount == 0 || bitArraySize == 0) {
    return 1;
  }
  return static_cast<size_t>(
      std::round(static_cast<double>(bitArraySize) / itemCount * std::log(2)));
}

auto createBloomFilterUnique(size_t size, double fpr) -> std::unique_ptr<BloomFilter> {
  return std::make_unique<BloomFilter>(size, FalsePositiveRate(fpr));
}

void BloomFilter::serialize(msgpack::sbuffer& sbuf) const {
  msgpack::packer<msgpack::sbuffer> packer(sbuf);
  packer.pack_array(4);  // Explicitly state we're packing 4 items
  packer.pack(size_);
  packer.pack(num_hashes);
  packer.pack(bits);
  packer.pack(seeds);
  emscripten_log(EM_LOG_INFO,
                 "Serialized. Size: %zu, NumHashes: %zu, Bits size: %zu, Seeds size: %zu", size_,
                 num_hashes, bits.size(), seeds.size());
}

void BloomFilter::deserialize(const char* data, size_t size) {
  try {
    msgpack::object_handle obj_handle = msgpack::unpack(data, size);
    msgpack::object obj = obj_handle.get();

    emscripten_log(EM_LOG_INFO, "Unpacked object type: %d", static_cast<int>(obj.type));
    std::vector<msgpack::object> array;
    obj.convert(array);

    emscripten_log(EM_LOG_INFO, "Unpacked object size: %zu", array.size());

    if (obj.type != msgpack::type::ARRAY || array.size() != 4) {
      throw std::runtime_error("Invalid serialized data format");
    }
    array[0].convert(size_);
    array[1].convert(num_hashes);
    array[2].convert(bits);
    array[3].convert(seeds);

    if (bits.size() != ((size_ + 63) / 64)) {
      throw std::runtime_error("Bits array size does not match the expected size");
    }
    if (seeds.size() != num_hashes) {
      throw std::runtime_error("Seeds array size does not match the number of hashes");
    }

    emscripten_log(EM_LOG_INFO, "Deserialization successful. Size: %zu, NumHashes: %zu", size_,
                   num_hashes);
  } catch (const msgpack::v1::type_error& e) {
    emscripten_log(EM_LOG_ERROR, "MessagePack type error: %s", e.what());
    throw;
  } catch (const std::exception& e) {
    emscripten_log(EM_LOG_ERROR, "Error during deserialization: %s", e.what());
    throw;
  }
}

extern "C" {
EMSCRIPTEN_KEEPALIVE
auto createBloomFilter(size_t size, double fpr) -> BloomFilter* {
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
auto checkInFilter(BloomFilter* filter, const char* value) -> int {
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

EMSCRIPTEN_KEEPALIVE
auto serializeBloomFilter(BloomFilter* filter) -> char* {
  if (filter == nullptr) {
    emscripten_log(EM_LOG_ERROR, "Error: filter is null");
    return nullptr;
  }

  try {
    msgpack::sbuffer sbuf;
    filter->serialize(sbuf);

    if (sbuf.size() > std::numeric_limits<uint32_t>::max()) {
      emscripten_log(EM_LOG_ERROR, "Error: serialized data too large");
      return nullptr;
    }

    // Allocate memory for size + serialized data
    size_t const total_size = sizeof(uint32_t) + sbuf.size();
    char* result = (char*)EM_ASM_INT({ return Module._malloc($0); }, total_size);

    if (result == nullptr) {
      emscripten_log(EM_LOG_ERROR, "Error: memory allocation failed");
      return nullptr;
    }
    auto size_value = static_cast<uint32_t>(sbuf.size());
    std::memcpy(result, &size_value, sizeof(uint32_t));

    std::copy(sbuf.data(), sbuf.data() + sbuf.size(), std::next(result, sizeof(uint32_t)));

    return result;
  } catch (const std::exception& e) {
    emscripten_log(EM_LOG_ERROR, "Error during serialization: %s", e.what());
    return nullptr;
  } catch (...) {
    emscripten_log(EM_LOG_ERROR, "Unknown error during serialization");
    return nullptr;
  }
}

EMSCRIPTEN_KEEPALIVE
void freeSerializedData(const char* data) {
  if (data != nullptr) {
    EM_ASM({ Module._free($0); }, data);
  }
}

EMSCRIPTEN_KEEPALIVE
auto deserializeBloomFilter(BloomFilter* filter, const char* data) -> const char* {
  if (filter == nullptr) {
    return "Error: filter is null";
  }
  if (data == nullptr) {
    return "Error: data is null";
  }
  uint32_t size = 0;
  std::memcpy(&size, data, sizeof(uint32_t));
  emscripten_log(EM_LOG_INFO, "Deserialized size: %u", size);

  if (size == 0 || size > 10000000) {
    return "Error: Invalid size";
  }

  try {
    filter->deserialize(std::next(data, sizeof(uint32_t)), size);
    return nullptr;
  } catch (const std::exception& e) {
    static std::string error_message;
    error_message = "Caught exception in deserializeBloomFilter: ";
    error_message += e.what();
    return error_message.c_str();
  } catch (...) {
    return "Caught unknown exception in deserializeBloomFilter";
  }
}
}