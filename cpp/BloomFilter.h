#ifndef BLOOMFILTER_H
#define BLOOMFILTER_H

#include <vector>
#include <string>
#include <cmath>
#include <cstdint>
#include <iostream>

class BitField
{
private:
    std::vector<bool> buffer;

public:
    BitField(size_t size);
    size_t bitSize() const;
    const std::vector<bool> &getBuffer() const;
    void setBuffer(const std::vector<bool> &newBuffer);
    bool get(size_t idx) const;
    void set(size_t idx, bool value);
    void clear();
};

class BloomFilter
{
private:
    BitField filter;
    std::vector<uint32_t> seeds;
    int numHashes;

public:
    BloomFilter(size_t size, double fpr, size_t m = 0, size_t k = 0, size_t maxHashes = 0);
    static size_t calculateM(size_t size, double fpr);
    static int calculateK(size_t size, size_t m, size_t maxHashes);
    void add(const std::string &value);
    bool possiblyContains(const std::string &value) const;
    void clear();
    std::string serialize() const;
    void deserialize(const std::string &data);
    void printBuffer() const;
};

#endif // BLOOMFILTER_H