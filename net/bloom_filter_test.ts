import { assertEquals } from 'https://deno.land/std@0.200.0/assert/assert_equals.ts';
import { BloomFilter } from '../base/bloom.ts';
import { assert } from '../base/error.ts';

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

function testSyncSets(setN: Set<string>, setM: Set<string>, fpr: number): void {
  const maxEntries = Math.max(setN.size, setM.size);
  const expectedCycles = calculateExpectedSyncCycles(fpr, maxEntries);
  //TODO: i want to "fpr" to be dynamic and be calc by expectedSyncCycles, but i dont know how to get this without knowing fpr. i need Ofri for that.

  // const fpr = fpr
  //   ? fpr
  //   : Math.min(
  //       0.5,
  //       1 / Math.pow(numberOfEntries, 1 / (0.5 * expectedSyncCycles))
  //     );
  console.log('Initial Sets:');
  console.log('Set N:', [...setN]);
  console.log('Set M:', [...setM]);

  let cycles = 0;

  while (cycles < expectedCycles) {
    const bloomFilterN = new BloomFilter({ size: setN.size, fpr });
    const bloomFilterM = new BloomFilter({ size: setM.size, fpr });

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
  }

  // console.log('Final Sets:');
  // console.log('Set N:', [...setN]);
  // console.log('Set M:', [...setM]);
  console.log(`Synchronized in ${cycles} cycles`);

  assertEquals(setM, setN, 'Test pass');
}

Deno.test('BloomFilter - identical sets', () => {
  const size = 1000;
  const fpr = 0.44;
  const set = generateRandomSet(size);
  testSyncSets(set, new Set(set), fpr);
});

Deno.test('BloomFilter - almost identical sets', () => {
  const size = 1000;
  const fpr = 0.4;
  const setN = generateRandomSet(size);
  const setM = new Set(setN);
  setM.add(Math.random().toString(36).substring(2, 15));
  testSyncSets(setN, setM, fpr);
});

Deno.test('BloomFilter - huge difference between sets', () => {
  const sizeN = 100;
  const sizeM = 100000;
  const fpr = 0.4;
  const setN = generateRandomSet(sizeN);
  const setM = generateRandomSet(sizeM);
  testSyncSets(setN, setM, fpr);
});

Deno.test('BloomFilter - empty sets', () => {
  const setN = new Set<string>();
  const setM = new Set<string>();
  const fpr = 0.04;
  testSyncSets(setN, setM, fpr);
});

Deno.test('BloomFilter - one empty set', () => {
  const size = 1000;
  const setN = generateRandomSet(size);
  const setM = new Set<string>();
  const fpr = 0.04;
  testSyncSets(setN, setM, fpr);
});

Deno.test('BloomFilter - disjoint sets', () => {
  const size = 100;
  const setN = generateRandomSet(size);
  const setM = generateRandomSet(size);
  const fpr = 0.4;
  testSyncSets(setN, setM, fpr);
});

Deno.test('BloomFilter - identical elements multiple times', () => {
  const size = 100;
  const fpr = 0.4;
  const setN = new Set<string>();
  const setM = new Set<string>();
  for (let i = 0; i < size; i++) {
    const element = Math.random().toString(36).substring(2, 15);
    setN.add(element);
    setN.add(element);
    setM.add(element);
    setM.add(element);
  }
  testSyncSets(setN, setM, fpr);
});

Deno.test('BloomFilter - sets with different sizes but same elements', () => {
  const size = 100;
  const fpr = 0.4;
  const setN = generateRandomSet(size);
  const setM = new Set(setN);
  for (let i = 0; i < 10; i++) {
    setM.add(Math.random().toString(36).substring(2, 15)); // Add extra elements to setM
  }
  testSyncSets(setN, setM, fpr);
});

Deno.test('BloomFilter - high false positive rate 0.5', () => {
  const size = 100;
  const fpr = 0.5;
  const setN = generateRandomSet(size);
  const setM = generateRandomSet(size);
  testSyncSets(setN, setM, fpr);
});

Deno.test('BloomFilter - low false positive rate', () => {
  const size = 10000;
  const fpr = 1 / (size * 100);
  const setN = generateRandomSet(size);
  const setM = generateRandomSet(size);
  testSyncSets(setN, setM, fpr);
});
