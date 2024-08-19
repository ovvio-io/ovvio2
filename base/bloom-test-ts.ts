// import { assertEquals } from 'https://deno.land/std@0.200.0/assert/assert_equals.ts';
import { assertEquals } from 'std/assert/assert_equals.ts';
import { BloomFilter, BloomFilterOptions } from './bloom.ts';

function calculateExpectedSyncCycles(fpr: number, maxEntries: number): number {
  return Math.ceil((2 * Math.log(maxEntries)) / Math.log(1 / fpr));
}

function generateRandomSet(size: number): Set<string> {
  const set = new Set<string>();
  for (let i = 0; i < size; i++) {
    set.add(Math.random().toString(36).substring(2, 15));
  }
  return set;
}

async function testSyncSets(
  setN: Set<string>,
  setM: Set<string>,
  fpr: number
): Promise<void> {
  const maxEntries = Math.max(setN.size, setM.size);
  const expectedCycles = calculateExpectedSyncCycles(fpr, maxEntries);
  console.log('Initial Sets:');
  console.log('Set N:', [...setN]);
  console.log('Set M:', [...setM]);

  let cycles = 0;

  while (cycles < expectedCycles) {
    const options: BloomFilterOptions = { size: setM.size, fpr: fpr };
    const bloomFilterM = new BloomFilter(options);
    const bloomFilterN = new BloomFilter(options);

    setN.forEach((value) => bloomFilterN.add(value));
    setM.forEach((value) => bloomFilterM.add(value));
    cycles++;

    const missingInM = new Set(
      [...setN].filter((value) => !bloomFilterM.has(value))
    );

    missingInM.forEach((value) => {
      setM.add(value);
      bloomFilterM.add(value);
    });

    const missingInN = new Set(
      [...setM].filter((value) => !bloomFilterN.has(value))
    );

    missingInN.forEach((value) => {
      setN.add(value);
      bloomFilterN.add(value);
    });

    console.log(`Cycle ${cycles}:`);
    console.log('Missing in M:', [...missingInM]);
    console.log('Missing in N:', [...missingInN]);
    console.log('Set N:', [...setN]);
    console.log('Set M:', [...setM]);

    bloomFilterM.reuse();
    bloomFilterN.reuse();
  }

  console.log(`Synchronized in ${cycles} cycles`);

  assertEquals(setM, setN, 'Test pass');
}

Deno.test('BloomFilter - identical sets', async () => {
  const size = 1000;
  const fpr = 0.44;
  const set = generateRandomSet(size);
  await testSyncSets(set, new Set(set), fpr);
});

Deno.test('BloomFilter - low false positive rate', async () => {
  const size = 10000;
  const fpr = 1 / (size * 100);
  const setN = generateRandomSet(size);
  const setM = generateRandomSet(size);
  await testSyncSets(setN, setM, fpr);
});

Deno.test('BloomFilter - almost identical sets', async () => {
  const size = 1000;
  const fpr = 0.4;
  const setN = generateRandomSet(size);
  const setM = new Set(setN);
  setM.add(Math.random().toString(36).substring(2, 15));
  await testSyncSets(setN, setM, fpr);
});

Deno.test('BloomFilter - huge difference between sets', async () => {
  const sizeN = 100;
  const sizeM = 1000;
  const fpr = 0.1;
  const setN = generateRandomSet(sizeN);
  const setM = generateRandomSet(sizeM);
  await testSyncSets(setN, setM, fpr);
});

Deno.test('BloomFilter - empty sets', async () => {
  const setN = new Set<string>();
  const setM = new Set<string>();
  const fpr = 0.04;
  await testSyncSets(setN, setM, fpr);
});

Deno.test('BloomFilter - one empty set', async () => {
  const size = 1000;
  const setN = generateRandomSet(size);
  const setM = new Set<string>();
  const fpr = 0.04;
  await testSyncSets(setN, setM, fpr);
});

Deno.test('BloomFilter - disjoint sets', async () => {
  const size = 100;
  const setN = generateRandomSet(size);
  const setM = generateRandomSet(size);
  const fpr = 0.4;
  await testSyncSets(setN, setM, fpr);
});

Deno.test('BloomFilter - identical elements multiple times', async () => {
  const size = 100;
  const fpr = 0.01;
  const setN = new Set<string>();
  const setM = new Set<string>();
  for (let i = 0; i < size; i++) {
    const element = Math.random().toString(36).substring(2, 15);
    setN.add(element);
    setN.add(element);
    setM.add(element);
    setM.add(element);
  }
  await testSyncSets(setN, setM, fpr);
});

Deno.test(
  'BloomFilter - sets with different sizes but same elements',
  async () => {
    const size = 100;
    const fpr = 0.4;
    const setN = generateRandomSet(size);
    const setM = new Set(setN);
    for (let i = 0; i < 10; i++) {
      setM.add(Math.random().toString(36).substring(2, 15)); // Add extra elements to setM
    }
    await testSyncSets(setN, setM, fpr);
  }
);

Deno.test('BloomFilter - high false positive rate 0.5', async () => {
  const size = 100;
  const fpr = 0.49;
  const setN = generateRandomSet(size);
  const setM = generateRandomSet(size);
  await testSyncSets(setN, setM, fpr);
});

if (import.meta.main) {
  console.log('Running tests manually...');
}
