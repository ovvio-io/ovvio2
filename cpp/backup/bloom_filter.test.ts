import {
  assert,
  assertThrows,
} from 'https://deno.land/std@0.196.0/assert/mod.ts';
import { BloomFilter } from './bloom_filter.ts';

Deno.test('BloomFilter - Basic functionality', async () => {
  await BloomFilter.initNativeFunctions();

  const filter = new BloomFilter({ size: 1000, fpr: 0.01 });

  // Test adding and checking elements
  filter.add('apple');
  filter.add('banana');
  filter.add('cherry');

  assert(filter.has('apple'), "Filter should contain 'apple'");
  assert(filter.has('banana'), "Filter should contain 'banana'");
  assert(filter.has('cherry'), "Filter should contain 'cherry'");
  assert(!filter.has('date'), "Filter should not contain 'date'");
  assert(!filter.has('elderberry'), "Filter should not contain 'elderberry'");
});

Deno.test('BloomFilter - Serialization and Deserialization', async () => {
  await BloomFilter.initNativeFunctions();

  // Use a valid FPR value
  const originalFilter = new BloomFilter({ size: 1000, fpr: 0.01 });

  const testElements = ['red', 'green', 'blue'];
  const nonExistentElement = 'yellow';

  // Add elements
  testElements.forEach((elem) => originalFilter.add(elem));

  // Serialize the filter
  const serialized = originalFilter.serialize();
  assert(serialized.length > 0, 'Serialized string should not be empty');

  // Deserialize into a new filter
  const deserializedFilter = BloomFilter.deserialize(serialized);

  // Check if the deserialized filter contains the same elements
  testElements.forEach((elem) => {
    assert(
      deserializedFilter.has(elem),
      `Deserialized filter should contain '${elem}'`
    );
  });

  assert(
    !deserializedFilter.has(nonExistentElement),
    `Deserialized filter should not contain '${nonExistentElement}'`
  );

  // Test error cases
  try {
    new BloomFilter({ size: 1000, fpr: 0 });
    assert(false, 'Should throw an error for FPR of 0');
  } catch (error) {
    assert(error instanceof Error, 'Error should be thrown for invalid FPR');
  }

  try {
    new BloomFilter({ size: 1000, fpr: 1 });
    assert(false, 'Should throw an error for FPR of 1');
  } catch (error) {
    assert(error instanceof Error, 'Error should be thrown for invalid FPR');
  }

  // Test deserialize with invalid data
  try {
    BloomFilter.deserialize('invalid_data');
    assert(false, 'Deserialize should throw an error for invalid input');
  } catch (error) {
    assert(error instanceof Error, 'Error should be thrown for invalid input');
  }
});

Deno.test('BloomFilter - False Positive Rate', async () => {
  await BloomFilter.initNativeFunctions();
  const filter = new BloomFilter({ size: 10000, fpr: 0.01 });

  // Add a number of elements
  for (let i = 0; i < 1000; i++) {
    filter.add(`element-${i}`);
  }

  // Test for false positives
  let falsePositives = 0;
  for (let i = 1000; i < 2000; i++) {
    if (filter.has(`element-${i}`)) {
      falsePositives++;
    }
  }

  console.log(`num falsePositives: ${falsePositives}`);

  // The actual false positive rate should be close to the specified rate
  const actualFPR = falsePositives / 1000;
  console.log(`Actual false positive rate: ${actualFPR}`);
  assert(
    actualFPR < 0.02,
    `False positive rate ${actualFPR} is higher than expected`
  );
});

Deno.test('BloomFilter - Empty filter behavior', async () => {
  await BloomFilter.initNativeFunctions();
  const filter = new BloomFilter({ size: 100, fpr: 0.01 });

  assert(
    !filter.has('anything'),
    'Empty filter should not contain any elements'
  );
});

Deno.test('BloomFilter - Adding empty string', async () => {
  await BloomFilter.initNativeFunctions();
  const filter = new BloomFilter({ size: 100, fpr: 0.01 });

  filter.add('');
  assert(filter.has(''), 'Filter should contain empty string after adding it');
});

Deno.test('BloomFilter - Adding and checking long strings', async () => {
  await BloomFilter.initNativeFunctions();
  const filter = new BloomFilter({ size: 1000, fpr: 0.01 });

  const longString = 'a'.repeat(10000);
  filter.add(longString);
  assert(filter.has(longString), 'Filter should contain the long string');
  assert(
    !filter.has(longString + 'b'),
    'Filter should not contain a slightly different long string'
  );
});

Deno.test('BloomFilter - Adding many elements', async () => {
  await BloomFilter.initNativeFunctions();
  const filter = new BloomFilter({ size: 10000, fpr: 0.01 });

  const numElements = 5000;
  for (let i = 0; i < numElements; i++) {
    filter.add(`element-${i}`);
  }

  let falseNegatives = 0;
  for (let i = 0; i < numElements; i++) {
    if (!filter.has(`element-${i}`)) {
      falseNegatives++;
    }
  }

  assert(
    falseNegatives === 0,
    `Found ${falseNegatives} false negatives, expected 0`
  );
});

Deno.test('BloomFilter - Serialization of empty filter', async () => {
  await BloomFilter.initNativeFunctions();
  const emptyFilter = new BloomFilter({ size: 100, fpr: 0.01 });

  const serialized = emptyFilter.serialize();
  const deserialized = BloomFilter.deserialize(serialized);

  assert(
    !deserialized.has('anything'),
    'Deserialized empty filter should not contain any elements'
  );
});

Deno.test('BloomFilter - Deserialize with invalid data', () => {
  assertThrows(
    () => {
      BloomFilter.deserialize('invalid data');
    },
    Error,
    'Deserialization should throw an error with invalid data'
  );
});

Deno.test('BloomFilter - Create with invalid parameters', () => {
  assertThrows(
    () => {
      new BloomFilter({ size: 0, fpr: 0.01 });
    },
    Error,
    'Should throw an error when creating a filter with size 0'
  );

  assertThrows(
    () => {
      new BloomFilter({ size: 100, fpr: 0 });
    },
    Error,
    'Should throw an error when creating a filter with fpr 0'
  );

  assertThrows(
    () => {
      new BloomFilter({ size: 100, fpr: 1 });
    },
    Error,
    'Should throw an error when creating a filter with fpr 1'
  );
});

Deno.test('BloomFilter - Consistent hashing', async () => {
  await BloomFilter.initNativeFunctions();
  const filter1 = new BloomFilter({ size: 1000, fpr: 0.01 });
  const filter2 = new BloomFilter({ size: 1000, fpr: 0.01 });

  const testString = 'test string';
  filter1.add(testString);
  filter2.add(testString);

  assert(
    filter1.has(testString) === filter2.has(testString),
    'Both filters should give the same result for the same input'
  );
});
