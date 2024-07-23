#ifndef BLOOM_FILTER_2_H
#define BLOOM_FILTER_2_H

#include <vector>
#include <string>
#include <cstdint>

class BloomFilter
{
private:
    std::vector<uint64_t> bits;
    std::vector<uint32_t> _seeds;
    size_t _numHashes;
    size_t _size; // Total number of bits

    static size_t calculateOptimalM(size_t size, double fpr);
    static size_t calculateOptimalK(size_t size, size_t m);
    uint32_t hashString(const std::string &value, uint32_t seed) const;
    mutable std::string debugLog;
    void setBit(size_t index);
    bool getBit(size_t index) const;

public:
    BloomFilter(size_t size, double fpr = 0.01, size_t maxHashes = 0);
    void add(const std::string &value);
    bool has(const std::string &value) const;
    void clear();
    double fillRate() const;
    size_t byteSize() const;
    std::string serialize() const;
    static BloomFilter deserialize(const std::string &serialized);
    std::string getFilterInfo() const;
    std::string getDetailedInfo() const;
    std::string getHashInfo(const std::string &value) const;
    std::string debugInfo() const;
    std::string debugAdd(const std::string &value);
    std::string debugHas(const std::string &value) const;
    std::string getDebugLog() const { return debugLog; }
    size_t getNumberOfHashes() const { return _numHashes; }
};

#endif