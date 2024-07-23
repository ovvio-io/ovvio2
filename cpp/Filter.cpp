// BloomFilter.cpp
#include "BloomFilter.h"
#include "MurmurHash3.h"
#include "MurmurHash3.cpp"
#include <cmath>
#include <algorithm>
#include <sstream>
#include <emscripten.h>
#include <random>
#include <chrono>

// BloomFilter implementation
BloomFilter::BloomFilter(size_t size, double fpr, size_t maxHashes)
    : _size(calculateOptimalM(size, fpr)),
      _numHashes(calculateOptimalK(size, calculateOptimalM(size, fpr))),
      bits((calculateOptimalM(size, fpr) + 63) / 64, 0)
{
    if (maxHashes > 0 && _numHashes > maxHashes)
    {
        _numHashes = maxHashes;
    }

    std::ostringstream oss;
    oss << "BloomFilter constructor:\n"
        << "  Requested size: " << size << "\n"
        << "  Requested FPR: " << fpr << "\n"
        << "  Actual filter size: " << _size << "\n"
        << "  Number of hash functions: " << _numHashes << "\n"
        << "  Seeds:\n";

    _seeds.resize(_numHashes);
    std::mt19937 gen(std::chrono::system_clock::now().time_since_epoch().count());
    std::uniform_int_distribution<> dis(0, std::numeric_limits<int>::max());
    for (size_t i = 0; i < _numHashes; ++i)
    {
        _seeds[i] = dis(gen);
        oss << "    " << i << ": " << _seeds[i] << "\n";
    }

    debugLog += oss.str();
}
void BloomFilter::setBit(size_t index)
{
    bits[index / 64] |= (1ULL << (index % 64));
}

bool BloomFilter::getBit(size_t index) const
{
    return (bits[index / 64] & (1ULL << (index % 64))) != 0;
}

void BloomFilter::add(const std::string &value)
{
    for (size_t i = 0; i < _numHashes; ++i)
    {
        uint32_t hash = hashString(value, _seeds[i]);
        setBit(hash % _size);
    }
}

bool BloomFilter::has(const std::string &value) const
{
    for (size_t i = 0; i < _numHashes; ++i)
    {
        uint32_t hash = hashString(value, _seeds[i]);
        if (!getBit(hash % _size))
        {
            return false;
        }
    }
    return true;
}
uint32_t BloomFilter::hashString(const std::string &value, uint32_t seed) const
{
    uint32_t hash;
    MurmurHash3_x64_128(value.data(), value.length(), seed, &hash);
    return hash;
}

void BloomFilter::clear()
{
    std::fill(bits.begin(), bits.end(), 0);
}

double BloomFilter::fillRate() const
{
    size_t count = 0;
    for (const auto &block : bits)
    {
        count += __builtin_popcountll(block);
    }
    return static_cast<double>(count) / _size;
}

size_t BloomFilter::byteSize() const
{
    return bits.size() * sizeof(uint64_t);
}

std::string BloomFilter::serialize() const
{
    std::ostringstream oss;
    oss << _size << "|";
    for (const auto &block : bits)
    {
        for (int i = 0; i < 64; ++i)
        {
            oss << ((block & (1ULL << i)) ? '1' : '0');
        }
    }
    oss << "|";
    for (size_t i = 0; i < _seeds.size(); ++i)
    {
        if (i > 0)
            oss << ",";
        oss << _seeds[i];
    }
    return oss.str();
}

BloomFilter BloomFilter::deserialize(const std::string &serialized)
{
    std::istringstream iss(serialized);
    std::string token;

    std::getline(iss, token, '|');
    size_t filterSize = std::stoull(token);
    // Note: The current deserialization method doesn't preserve
    // the original false positive rate (FPR). If you need to preserve this,
    //  you should include it in the serialized string and use it when
    // constructing the new BloomFilter in the deserialization method.
    BloomFilter bf(filterSize, 0.01); // We'll set the correct number of hashes later

    std::getline(iss, token, '|');
    size_t blockIndex = 0;
    uint64_t currentBlock = 0;
    for (size_t i = 0; i < token.length(); ++i)
    {
        if (i > 0 && i % 64 == 0)
        {
            bf.bits[blockIndex++] = currentBlock;
            currentBlock = 0;
        }
        if (token[i] == '1')
        {
            currentBlock |= (1ULL << (i % 64));
        }
    }
    if (currentBlock != 0)
    {
        bf.bits[blockIndex] = currentBlock;
    }

    std::getline(iss, token);
    std::istringstream seedStream(token);
    std::string seedStr;
    bf._seeds.clear();
    while (std::getline(seedStream, seedStr, ','))
    {
        bf._seeds.push_back(std::stoul(seedStr));
    }
    bf._numHashes = bf._seeds.size();

    return bf;
}
size_t BloomFilter::calculateOptimalM(size_t size, double fpr)
{
    return static_cast<size_t>(std::ceil(-(size * std::log(fpr)) / (std::log(2) * std::log(2))));
}

size_t BloomFilter::calculateOptimalK(size_t size, size_t m)
{
    return static_cast<size_t>(std::round((m / size) * std::log(2)));
}

std::string BloomFilter::debugInfo() const
{
    std::ostringstream oss;
    // oss << "Filter size: " << _size << "\n";
    // oss << "Number of hash functions: " << _numHashes << "\n";
    // oss << "Fill rate: " << fillRate() << "\n";
    // oss << "Set bits: ";
    // for (size_t i = 0; i < _size; ++i)
    // {
    //     if (getBit(i))
    //     {
    //         oss << i << " ";
    //     }
    // }
    // oss << "\n";
    return oss.str();
}

std::string BloomFilter::debugAdd(const std::string &value)
{
    std::ostringstream oss;
    // oss << "Adding value: " << value << "\n";
    // for (size_t i = 0; i < _numHashes; ++i)
    // {
    //     uint32_t hash = hashString(value, _seeds[i]);
    //     size_t bitIndex = hash % _size;
    //     oss << "Hash " << i << ": " << hash << " (bit " << bitIndex << ")\n";
    //     setBit(bitIndex);
    // }
    return oss.str();
}

std::string BloomFilter::debugHas(const std::string &value) const
{
    std::ostringstream oss;
    // oss << "Checking value: " << value << "\n";
    for (size_t i = 0; i < _numHashes; ++i)
    {
        // uint32_t hash = hashString(value, _seeds[i]);
        // size_t bitIndex = hash % _size;
        // oss << "Hash " << i << ": " << hash << " (bit " << bitIndex << " is "
        // << (getBit(bitIndex) ? "set" : "not set") << ")\n";
        // if (!getBit(bitIndex))
        // {
        //     oss << "Value is not in the filter\n";
        //     return oss.str();
        // }
    }
    // oss << "Value might be in the filter\n";
    return oss.str();
}

std::string BloomFilter::getFilterInfo() const
{
    std::ostringstream oss;
    // oss << "Filter size: " << _size << "\n";
    // oss << "Number of hash functions: " << _numHashes << "\n";
    // oss << "Fill rate: " << fillRate() << "\n";

    // size_t setCount = 0;
    // for (size_t i = 0; i < _size; ++i)
    // {
    //     if (getBit(i))
    //     {
    //         setCount++;
    //     }
    // }
    // oss << "Set bits: " << setCount << " / " << _size << "\n";

    // // Print the first 100 bits of the filter
    // oss << "First 100 bits: ";
    // for (size_t i = 0; i < std::min(_size, static_cast<size_t>(100)); ++i)
    // {
    //     oss << (getBit(i) ? '1' : '0');
    // }
    // oss << "\n";

    return oss.str();
}

std::string BloomFilter::getDetailedInfo() const
{
    std::ostringstream oss;
    // oss << "Filter size: " << _size << "\n";
    // oss << "Number of hash functions: " << _numHashes << "\n";
    // oss << "Fill rate: " << fillRate() << "\n";
    // oss << "Set bits: ";
    // for (size_t i = 0; i < _size; ++i)
    // {
    //     if (getBit(i))
    //     {
    //         oss << i << " ";
    //     }
    // }
    // oss << "\n";
    return oss.str();
}

std::string BloomFilter::getHashInfo(const std::string &value) const
{
    std::ostringstream oss;
    // oss << "Hash info for '" << value << "':\n";
    // for (size_t i = 0; i < _numHashes; ++i)
    // {
    //     uint32_t hash = hashString(value, _seeds[i]);
    //     size_t bitIndex = hash % _size;
    //     oss << "Hash " << i << ": " << hash << " (bit " << bitIndex << " is "
    //         << (getBit(bitIndex) ? "set" : "not set") << ")\n";
    // }
    return oss.str();
}
extern "C"
{
EMSCRIPTEN_KEEPALIVE
    BloomFilter *create_bloom_filter(size_t size, double fpr)
    {
        return new BloomFilter(size, fpr);
    }

    EMSCRIPTEN_KEEPALIVE
    void add_to_filter(BloomFilter *filter, const char *value)
    {
        filter->add(std::string(value));
    }

    EMSCRIPTEN_KEEPALIVE
    bool check_in_filter(BloomFilter *filter, const char *value)
    {
        return filter->has(std::string(value));
    }

    EMSCRIPTEN_KEEPALIVE
    void delete_bloom_filter(BloomFilter *filter)
    {
        delete filter;
    }

    EMSCRIPTEN_KEEPALIVE
    const char *debug_info(BloomFilter *filter)
    {
        static std::string info;
        info = filter->debugInfo();
        return info.c_str();
    }

    EMSCRIPTEN_KEEPALIVE
    const char *debug_add(BloomFilter *filter, const char *value)
    {
        static std::string info;
        info = filter->debugAdd(std::string(value));
        return info.c_str();
    }

    EMSCRIPTEN_KEEPALIVE
    const char *debug_has(BloomFilter *filter, const char *value)
    {
        static std::string info;
        info = filter->debugHas(std::string(value));
        return info.c_str();
    }

    EMSCRIPTEN_KEEPALIVE
    const char *get_filter_info(BloomFilter *filter)
    {
        static std::string info;
        info = filter->getFilterInfo();
        return info.c_str();
    }

    EMSCRIPTEN_KEEPALIVE
    const char *get_detailed_info(BloomFilter *filter)
    {
        static std::string info;
        info = filter->getDetailedInfo();
        return info.c_str();
    }

    EMSCRIPTEN_KEEPALIVE
    const char *get_hash_info(BloomFilter *filter, const char *value)
    {
        static std::string info;
        info = filter->getHashInfo(std::string(value));
        return info.c_str();
    }
    EMSCRIPTEN_KEEPALIVE
    const char *get_debug_log(BloomFilter *filter)
    {
        static std::string log;
        log = filter->getDebugLog();
        return log.c_str();
    }
}