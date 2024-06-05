import { uniqueId } from '../../base/common.ts';
import { JSONObject } from '../../base/interfaces.ts';
import { Record } from '../../cfds/base/record.ts';
import { Commit } from '../../repo/commit.ts';
import { Repository } from '../../repo/repo.ts';
import { ServerServices } from './server.ts';
import { shuffle } from '../../base/array.ts';

const K_TEST_SIZE = 1000000;
const CHUNK_SIZE = 50000; // Number of operations per batch
const numConcurrentTests = 5; // Number of concurrent benchmark groups

export interface BenchmarkResults extends JSONObject {
  benchmarkId: string;
  testSize: number;
  totalInsertTime: number;
  avgInsertTime: number;
  totalGetTime: number;
  avgGetTime: number;
  chunkSize: number;
  concurrentGroups: number;
}

export function newBenchmarkResults(
  chunkSize: number,
  concurrentGroups: number
): BenchmarkResults {
  return {
    benchmarkId: uniqueId(),
    testSize: 0,
    totalInsertTime: 0,
    avgInsertTime: 0,
    totalGetTime: 0,
    avgGetTime: 0,
    chunkSize,
    concurrentGroups,
  };
}

export function benchmarkResultsJoin(
  r1: BenchmarkResults,
  r2: BenchmarkResults
): BenchmarkResults {
  return {
    benchmarkId: uniqueId(),
    testSize: r1.testSize + r2.testSize,
    totalInsertTime: r1.totalInsertTime + r2.totalInsertTime,
    avgInsertTime:
      (r1.totalInsertTime + r2.totalInsertTime) / (r1.testSize + r2.testSize),
    totalGetTime: r1.totalGetTime + r2.totalGetTime,
    avgGetTime:
      (r1.totalGetTime + r2.totalGetTime) / (r1.testSize + r2.testSize),
    chunkSize: r1.chunkSize,
    concurrentGroups: r1.concurrentGroups,
  };
}

const kSampleRecord = Record.fromJS({
  s: { __t: 'E', __v: { ns: 'notes', version: 6 } },
  d: {
    creationDate: { __t: 'D', __v: 1714459980.869 },
    isDeleted: 0,
    lastModified: { __t: 'D', __v: 1714908622.103 },
    createdBy: '4wuon9uhi55odoopu9ajyod2',
    workspace: 'nge5x0hdqeppjl8ycph7vrrn',
    assignees: { __t: 'S', __v: ['4wuon9uhi55odoopu9ajyod2'] },
    attachments: { __t: 'S', __v: [] },
    tags: {},
    type: 'note',
    title: {
      root: {
        children: [
          {
            tagName: 'p',
            children: [{ text: 'v3.4.5 - Minor Fixes - 9/5' }],
          },
        ],
      },
    },
    body: {
      root: {
        children: [
          { ref: 'x0iofqz0c4rljdpnuumpqo0c', type: 'inter-doc' },
          { ref: '43slpwf28ujpopr7gerkemu7', type: 'inter-doc' },
          { ref: 'x4gc30yx91wisxktrfickuqs', type: 'inter-doc' },
          { ref: 'whhtlzmy9glyfvrvga9d0dm3', type: 'inter-doc' },
          { ref: '9l6im74my29uj7c02v3tyiy7', type: 'inter-doc' },
          { ref: 'ma8aveo10iycz0xzniujob4c', type: 'inter-doc' },
          { ref: 'cngwkf8998qh0lejzl02foeg', type: 'inter-doc' },
        ],
      },
    },
    pinnedBy: {
      __t: 'S',
      __v: [
        'budhwh21un4wmoxt28wdibkq',
        'r6o7p924kui34h7htxbwjx6q',
        '4wuon9uhi55odoopu9ajyod2',
      ],
    },
  },
  n: true,
});

export async function runInsertBenchmark(
  services: ServerServices,
  results?: BenchmarkResults,
  chunkSize: number = K_TEST_SIZE
): Promise<BenchmarkResults> {
  if (!results) {
    results = newBenchmarkResults(chunkSize, 1);
  }
  const repo = services.sync.getRepository('data', results.benchmarkId);
  const startTime = performance.now();
  const promises: Promise<Commit | undefined>[] = [];
  for (let i = 0; i < chunkSize; ++i) {
    promises.push(repo.setValueForKey(uniqueId(), kSampleRecord, undefined));
  }
  await Promise.allSettled(promises);
  await services.sync.waitForBackup(Repository.id('data', results.benchmarkId));
  const testTime = performance.now() - startTime;
  results.testSize += chunkSize;
  results.totalInsertTime += testTime;
  results.avgInsertTime = results.totalInsertTime / results.testSize;
  return results;
}

export function runReadBenchmark(
  services: ServerServices,
  results?: BenchmarkResults
): BenchmarkResults {
  if (!results) {
    results = newBenchmarkResults(CHUNK_SIZE, 1);
  }
  const repo = services.sync.getRepository('data', results.benchmarkId);
  const keys = shuffle(Array.from(repo.keys()));
  const startTime = performance.now();
  const testSize = keys.length * 10;
  for (let i = 0; i < testSize; ++i) {
    const k = keys[i % keys.length];
    repo.valueForKey(k);
  }
  const testTime = performance.now() - startTime;
  results.totalGetTime = testTime;
  results.avgGetTime = testTime / testSize;
  return results;
}

export async function runBenchmarks(
  services: ServerServices
): Promise<BenchmarkResults> {
  const chunkSize = CHUNK_SIZE;
  const iterations = Math.ceil(K_TEST_SIZE / CHUNK_SIZE / numConcurrentTests);
  let finalResults = newBenchmarkResults(chunkSize, numConcurrentTests);

  for (let i = 0; i < iterations; ++i) {
    const benchmarkPromises: Promise<BenchmarkResults>[] = [];

    for (let j = 0; j < numConcurrentTests; ++j) {
      console.log(
        `Starting insert benchmark iteration ${
          i + 1
        }/${iterations}, concurrent group ${j + 1}/${numConcurrentTests}`
      );
      benchmarkPromises.push(
        runInsertBenchmark(services, undefined, chunkSize)
      );
    }

    const results = await Promise.all(benchmarkPromises);

    for (const result of results) {
      finalResults = benchmarkResultsJoin(finalResults, result);
    }

    console.log(
      `Starting read benchmark after iteration ${i + 1}/${iterations}`
    );
    finalResults = runReadBenchmark(services, finalResults);
  }

  console.log('All benchmark groups completed.');
  return finalResults;
}
