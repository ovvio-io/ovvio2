import { BloomFilter } from './bloom_filter.ts';

Deno.test('Delete and recreate BloomFilter', async () => {
  await runTest('Delete and recreate BloomFilter', async () => {
    let filter = await BloomFilter.create(1000, 0.01);
    filter.add('apple');
    filter.add('banana');
    filter.delete();
    // Recreate filter and ensure it starts empty
    filter = await BloomFilter.create(1000, 0.01);
    const result = !filter.has('apple') && !filter.has('banana');

    filter.delete();
    return result;
  });
});

Deno.test('Basic serialization/deserialization', async () => {
  await runTest('Basic serialization/deserialization', async () => {
    const filter = await BloomFilter.create(1000, 0.01);
    filter.add('test');
    const serialized = filter.serialize();
    const deserializedFilter = await BloomFilter.deserialize(serialized);

    const result =
      deserializedFilter.has('test') && !deserializedFilter.has('not_test');

    filter.delete();
    deserializedFilter.delete();
    return result;
  });
});

Deno.test('Serialization of empty filter', async () => {
  await runTest('Serialization of empty filter', async () => {
    const emptyFilter = await BloomFilter.create(500, 0.05);
    const serialized = emptyFilter.serialize();
    const deserializedFilter = await BloomFilter.deserialize(serialized);

    const result = !deserializedFilter.has('anything');

    emptyFilter.delete();
    deserializedFilter.delete();
    return result;
  });
});

Deno.test('Serialization of nearly full filter', async () => {
  await runTest('Serialization of nearly full filter', async () => {
    const fullFilter = await BloomFilter.create(500, 0.01);
    for (let i = 0; i < 500; i++) {
      fullFilter.add(`item${i}`);
    }
    const serialized = fullFilter.serialize();
    const deserializedFilter = await BloomFilter.deserialize(serialized);

    const result =
      deserializedFilter.has('item0') &&
      deserializedFilter.has('item499') &&
      !deserializedFilter.has('not_in_filter');

    fullFilter.delete();
    deserializedFilter.delete();
    return result;
  });
});

Deno.test('Serialization with very low FPR', async () => {
  await runTest('Serialization with very low FPR', async () => {
    const lowFPRFilter = await BloomFilter.create(1000, 0.0001);
    lowFPRFilter.add('unique_item');
    const serialized = lowFPRFilter.serialize();
    const deserializedFilter = await BloomFilter.deserialize(serialized);

    const result =
      deserializedFilter.has('unique_item') &&
      !deserializedFilter.has('random_item');

    lowFPRFilter.delete();
    deserializedFilter.delete();
    return result;
  });
});

Deno.test('Deserialization with corrupted data', async () => {
  await runTest('Deserialization with corrupted data', async () => {
    const filter = await BloomFilter.create(1000, 0.01);
    filter.add('safe_item');
    const serialized = filter.serialize();

    // Corrupt the serialized data
    serialized[10] = 0xff;
    serialized[11] = 0xff;

    let errorCaught = false;
    try {
      await BloomFilter.deserialize(serialized);
    } catch (error) {
      errorCaught = error;
    }

    filter.delete();
    return errorCaught;
  });
});

Deno.test('Stress test with large filter', async () => {
  await runTest('Stress test with large filter', async () => {
    const largeFilter = await BloomFilter.create(1000000, 0.01);
    for (let i = 0; i < 1000000; i++) {
      largeFilter.add(`large_item${i}`);
    }
    const serialized = largeFilter.serialize();
    const deserializedFilter = await BloomFilter.deserialize(serialized);
    const result =
      deserializedFilter.has('large_item0') &&
      deserializedFilter.has('large_item999999') &&
      !deserializedFilter.has('not_in_large_filter');

    largeFilter.delete();
    deserializedFilter.delete();
    return result;
  });
});

const fprs = [0.4, 0.1, 0.01, 0.001];
fprs.forEach((fpr) => {
  Deno.test(`Serialization with FPR=${fpr}`, async () => {
    await runTest(`Serialization with FPR=${fpr}`, async () => {
      const filter = await BloomFilter.create(1000, fpr);
      filter.add(`item_fpr_${fpr}`);
      const serialized = filter.serialize();
      const deserializedFilter = await BloomFilter.deserialize(serialized);

      const result =
        deserializedFilter.has(`item_fpr_${fpr}`) &&
        !deserializedFilter.has('random_item');

      filter.delete();
      deserializedFilter.delete();
      return result;
    });
  });
});

Deno.test('Add and check elements in BloomFilter', async () => {
  await runTest('Add and check elements', async () => {
    const filter = await BloomFilter.create(1000, 0.01);
    filter.add('apple');
    filter.add('banana');
    filter.add('orange');

    const result =
      filter.has('apple') &&
      filter.has('banana') &&
      filter.has('orange') &&
      !filter.has('grape');

    filter.delete();
    return result;
  });
});

Deno.test('Handle empty and large strings', async () => {
  await runTest('Handle empty and large strings', async () => {
    const filter = await BloomFilter.create(1000, 0.01);
    filter.add('');
    const largeString = 'a'.repeat(10000);
    filter.add(largeString);
    const result =
      filter.has('') && filter.has(largeString) && !filter.has('nonexistent');

    filter.delete();
    return result;
  });
});

Deno.test('Check behavior with no elements added', async () => {
  await runTest('Check empty BloomFilter', async () => {
    const filter = await BloomFilter.create(1000, 0.01);
    const result = !filter.has('apple') && !filter.has('banana');

    filter.delete();
    return result;
  });
});

Deno.test('Serialize and deserialize BloomFilter', async () => {
  await runTest('Serialize and deserialize BloomFilter', async () => {
    const filter = await BloomFilter.create(1000, 0.01);

    filter.add('apple');
    filter.add('banana');
    const serialized = filter.serialize();

    const deserializedFilter = await BloomFilter.deserialize(serialized);

    const result =
      deserializedFilter.has('apple') &&
      deserializedFilter.has('banana') &&
      !deserializedFilter.has('grape');

    filter.delete();
    deserializedFilter.delete();
    return result;
  });
});

Deno.test('Check serialization and deserialization buffer sizes', async () => {
  await runTest(
    'Check serialization and deserialization buffer sizes',
    async () => {
      const filter = await BloomFilter.create(1000, 0.01);

      filter.add('apple');
      filter.add('banana');
      filter.add('mango');

      const serialized = filter.serialize();
      const deserializedFilter = await BloomFilter.deserialize(serialized);

      const result =
        serialized.length === deserializedFilter.serialize().length;

      filter.delete();
      deserializedFilter.delete();
      return result;
    }
  );
});

async function runTest(
  description: string,
  testFunction: () => Promise<boolean>
) {
  try {
    const result = await testFunction();
    if (!result) {
      throw new Error(`${description}: FAILED`);
    }
    console.log(`${description}: PASSED`);
  } catch (error) {
    console.error(`${description}: ERROR - ${error.message}`);
    throw error;
  }
}
