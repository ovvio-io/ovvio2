// #ifndef BLOOM_FILTER_2_H
// #define BLOOM_FILTER_2_H

// #include <cstdint>
// #include <msgpack.hpp>
// #include <stdexcept>
// #include <string>
// #include <vector>

// class FalsePositiveRate {
//  public:
//   explicit FalsePositiveRate(double value) : value_(value) {
//     if (value <= 0 || value >= 1) {
//       throw std::invalid_argument("FPR must be between 0 and 1");
//     }
//   }
//   double getValue() const { return value_; }

//  private:
//   double value_;
// };

// class BloomFilter {
//  private:
//   std::vector<uint64_t> bits{};
//   std::vector<uint32_t> _seeds{};
//   size_t _numHashes{0};
//   size_t _size{0};
//   static size_t calculateOptNumHashes(size_t size, double fpr);
//   static size_t calculateOptMaxNumHashes(size_t itemCount, size_t bitArraySize);
//   static uint32_t hashString(const std::string& value, uint32_t seed);
//   mutable std::string debugLog{};
//   void setBit(size_t index);
//   bool getBit(size_t index) const;

//  public:
//   BloomFilter(size_t size, FalsePositiveRate fpr, size_t maxHashes = 0);
//   void add(const std::string& value);
//   bool has(const std::string& value) const;
//   void clear();
//   double fillRate() const;
//   std::string getDebugLog() const { return debugLog; }
//   size_t getNumberOfHashes() const { return _numHashes; }
//   void serialize(msgpack::sbuffer& sbuf) const;
//   void deserialize(const char* data, size_t size);
// };

// #endif

#ifndef BLOOM_FILTER_2_H
#define BLOOM_FILTER_2_H

#include <cstdint>
#include <msgpack.hpp>
#include <stdexcept>
#include <string>
#include <vector>

class FalsePositiveRate {
 public:
  explicit FalsePositiveRate(double value) : value_(value) {
    if (value <= 0 || value >= 1) {
      throw std::invalid_argument("FPR must be between 0 and 1");
    }
  }
  double getValue() const { return value_; }

 private:
  double value_;
};

class BloomFilter {
 private:
  std::vector<uint64_t> bits{};
  std::vector<uint32_t> seeds{};
  size_t num_hashes{0};
  size_t size_{0};
  mutable std::string debug_log{};

  static size_t calculateOptNumHashes(size_t size, double fpr);
  static size_t calculateOptMaxNumHashes(size_t itemCount, size_t bitArraySize);
  static uint32_t hashString(const std::string& value, uint32_t seed);
  void setBit(size_t index);
  bool getBit(size_t index) const;

 public:
  BloomFilter(size_t size, FalsePositiveRate fpr, size_t maxHashes = 0);
  void add(const std::string& value);
  bool has(const std::string& value) const;
  void clear();
  double fillRate() const;
  std::string getDebugLog() const { return debug_log; }
  size_t getNumberOfHashes() const { return num_hashes; }
  void serialize(msgpack::sbuffer& sbuf) const;
  void deserialize(const char* data, size_t size);
};

#endif  // BLOOM_FILTER_2_H