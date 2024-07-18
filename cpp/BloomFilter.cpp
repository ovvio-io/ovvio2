#include "BloomFilter.h"
#include "MurmurHash3.h"
#include "Base64.h"
#include <algorithm>
#include <sstream>

BitField::BitField(size_t size) : buffer(size) {}

size_t BitField::bitSize() const
{
    return buffer.size();
}

const std::vector<bool> &BitField::getBuffer() const
{
    return buffer;
}

void BitField::setBuffer(const std::vector<bool> &newBuffer)
{
    buffer = newBuffer;
}
bool BitField::get(size_t idx) const
{
    return buffer[idx];
}
void BitField::set(size_t idx, bool value)
{
    buffer[idx] = value;
}
void BitField::clear()
{
    std::fill(buffer.begin(), buffer.end(), false);
}

BloomFilter::BloomFilter(size_t size, double fpr, size_t m, size_t k, size_t maxHashes)
    : filter(m ? m : calculateM(size, fpr)), numHashes(static_cast<int>(k ? k : calculateK(size, m ? m : calculateM(size, fpr), maxHashes)))
{
    std::cout << "numHashes: " << numHashes << std::endl;
    for (int i = 0; i < numHashes; ++i)
    {
        seeds.push_back(static_cast<uint32_t>(i));
    }
}

void BloomFilter::printBuffer() const
{
    std::cout << "Buffer: ";
    const std::vector<bool> &buf = filter.getBuffer();
    for (bool bit : buf)
    {
        std::cout << bit;
    }
    std::cout << std::endl;
}

// Calculate the optimal size of the bit field (m) based on the desired false positive rate (fpr)
size_t BloomFilter::calculateM(size_t size, double fpr)
{
    int x = std::ceil((size * std::log(fpr)) / std::log(1.0 / std::pow(2.0, std::log(2.0))));
    std::cout << "calculated M is: " << x << std::endl;

    return x;
}

// Calculate the optimal number of hash functions (k) based on the size of the bit field (m) and the desired false positive rate (fpr)
int BloomFilter::calculateK(size_t size, size_t m, size_t maxHashes)
{
    int k = std::round((static_cast<double>(m) / static_cast<double>(size)) * std::log(2.0));
    return maxHashes ? std::min(k, static_cast<int>(maxHashes)) : k;
}

void BloomFilter::add(const std::string &value)
{
    for (int i = 0; i < numHashes; ++i)
    {
        uint64_t hashValues[2];
        MurmurHash3_x64_128(value.c_str(), static_cast<int>(value.length()), seeds[i], hashValues); // Explicitly cast length to int
        filter.set(hashValues[0] % filter.bitSize(), true);
        filter.set(hashValues[1] % filter.bitSize(), true);
    }
}

bool BloomFilter::possiblyContains(const std::string &value) const
{
    for (int i = 0; i < numHashes; ++i)
    {
        uint64_t hashValues[2];
        MurmurHash3_x64_128(value.c_str(), static_cast<int>(value.length()), seeds[i], hashValues);
        if (!filter.get(hashValues[0] % filter.bitSize()) || !filter.get(hashValues[1] % filter.bitSize()))
        {
            return false;
        }
    }
    return true;
}

void BloomFilter::clear()
{
    filter.clear();
}

std::string BloomFilter::serialize() const
{
    std::string encodedData = base64_encode(filter.getBuffer());
    std::stringstream serializedStream;
    serializedStream << encodedData << ",";
    for (size_t i = 0; i < seeds.size(); ++i)
    {
        serializedStream << seeds[i];
        if (i != seeds.size() - 1)
        {
            serializedStream << ",";
        }
    }
    return serializedStream.str();
}

void BloomFilter::deserialize(const std::string &data)
{
    size_t pos = data.find(',');
    std::string encodedData = data.substr(0, pos);
    std::string seedsString = data.substr(pos + 1);

    std::vector<bool> decodedBuffer = base64_decode(encodedData);
    filter.setBuffer(decodedBuffer);

    std::stringstream seedsStream(seedsString);
    std::string seed;
    seeds.clear();
    while (std::getline(seedsStream, seed, ','))
    {
        seeds.push_back(static_cast<uint32_t>(std::stoul(seed)));
    }
}