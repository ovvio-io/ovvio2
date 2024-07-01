import { assertEquals } from 'https://deno.land/std@0.114.0/testing/asserts.ts';
import { JSONObject } from './interfaces.ts';
import { JSONLogFile } from './json-log-prints.ts';

const TEST_DIR = './test_logs';

Deno.test('JSONLogFile: Open and Close', async () => {
  const filePath = `${TEST_DIR}/test_open_close.log`;
  Deno.mkdirSync(TEST_DIR, { recursive: true });
  const logFile = new JSONLogFile(filePath, true);
  const gen = logFile.open();
  assertEquals(gen.next().done, true); // File should be empty initially
  await logFile.close();
  assertEquals(logFile.file, undefined); // File should be closed
});

Deno.test('JSONLogFile: Append Entries (Sync)', () => {
  const filePath = `${TEST_DIR}/test_append_sync.log`;
  const logFile = new JSONLogFile(filePath, true);
  const gen = logFile.open();
  for (const entry of gen) {
    // Consume the generator to ensure file operations are completed
  }
  const entries: JSONObject[] = [{ key: 'value1' }, { key: 'value2' }];
  logFile.appendSync(entries);
  logFile.close();
  const readLogFile = new JSONLogFile(filePath, false);
  const readEntries = Array.from(readLogFile.open());
  assertEquals(readEntries, entries);
  readLogFile.close();
});

Deno.test('JSONLogFile: Scan and Fix Broken Entries', async () => {
  const filePath = `${TEST_DIR}/test_scan_fix_broken.log`;
  const validEntries: JSONObject[] = [{ key: 'value1' }];
  const brokenEntries = [
    '{ key: "broken"', // Missing closing brace
    '{ "key": "value2",', // Missing closing brace and value
    '{"key": "value3"}\n{\n', // Incomplete nested object
  ];
  const logFile = new JSONLogFile(filePath, true);
  for (const entry of logFile.open()) {
    /* consume generator */
  }
  logFile.appendSync(validEntries);
  const file = logFile.file;
  if (file) {
    for (const brokenEntry of brokenEntries) {
      file.writeSync(new TextEncoder().encode(`\n${brokenEntry}\n`));
    }
  }
  await logFile.close();
  console.log('Valid and broken entries written to the file.');
  const readLogFile = new JSONLogFile(filePath, true);
  const readEntries = [];
  for (const entry of readLogFile.open()) {
    readEntries.push(entry);
  }
  console.log('Read entries from log file:', readEntries);
  assertEquals(readEntries, validEntries);
  await readLogFile.close();
  //  Some additional checks ensure that each specific type of broken entry is correctly handled in isolation
  for (const brokenEntry of brokenEntries) {
    const brokenLogFile = new JSONLogFile(filePath, true);
    const brokenFile = brokenLogFile.file;
    if (brokenFile) {
      brokenFile.writeSync(new TextEncoder().encode(`\n${brokenEntry}\n`));
    }
    await brokenLogFile.close();
    const scanLogFile = new JSONLogFile(filePath, true);
    const scanEntries = [];
    for (const entry of scanLogFile.open()) {
      scanEntries.push(entry);
    }
    console.log(
      `Entries after adding broken entry "${brokenEntry}":`,
      scanEntries
    );
    assertEquals(scanEntries, validEntries);
    await scanLogFile.close();
  }
});

Deno.test('JSONLogFile: Query Entries', () => {
  const filePath = `${TEST_DIR}/test_query_entries.log`;
  const entries: JSONObject[] = [
    { key: 'value1' },
    { key: 'value2' },
    { key: 'value3' },
  ];
  const logFile = new JSONLogFile(filePath, true);
  for (const entry of logFile.open()) {
    /* consume generator */
  }
  logFile.appendSync(entries);
  logFile.close();
  console.log('Entries appended:', entries);
  const readLogFile = new JSONLogFile(filePath, false);
  for (const entry of readLogFile.open()) {
    /* consume generator */
  }
  const result = readLogFile.query((obj) => obj.key === 'value2');
  console.log("Query result for key='value2':", result);
  assertEquals(result, [{ key: 'value2' }]);

  const limitedResult = readLogFile.query(() => true, 2);
  console.log('Query result with limit 2:', limitedResult);
  assertEquals(limitedResult.length, 2);

  readLogFile.close();
});

// Cleanup test directory
Deno.test('Cleanup Test Directory', () => {
  Deno.removeSync(TEST_DIR, { recursive: true });
});

//Async tests:

async function cleanup() {
  await Deno.remove(TEST_DIR, { recursive: true }).catch(() => {});
}

Deno.test('JSONLogFile: Open and Close (Async)', async () => {
  const filePath = `${TEST_DIR}/test_open_close_async.log`;
  await Deno.mkdir(TEST_DIR, { recursive: true });

  const logFile = new JSONLogFile(filePath, true);
  const gen = await logFile.openAsync();
  assertEquals((await gen.next()).done, true); // File should be empty initially

  await logFile.closeAsync();
  assertEquals(logFile.file, undefined); // File should be closed

  await cleanup();
});

Deno.test('JSONLogFile: Append Entries (Async)', async () => {
  const filePath = `${TEST_DIR}/test_append_async.log`;
  await Deno.mkdir(TEST_DIR, { recursive: true });

  const logFile = new JSONLogFile(filePath, true);
  await logFile.openAsync();

  const entries: JSONObject[] = [{ key: 'value1' }, { key: 'value2' }];
  logFile.appendSync(entries);

  await logFile.closeAsync();

  const readLogFile = new JSONLogFile(filePath, false);
  await readLogFile.openAsync();

  const readEntries = [];
  for await (const entry of readLogFile.scanAsync()) {
    readEntries.push(entry);
  }
  assertEquals(readEntries, entries);
  await readLogFile.closeAsync();

  await cleanup();
});

Deno.test('JSONLogFile: Scan Entries (Async)', async () => {
  const filePath = `${TEST_DIR}/test_scan_async.log`;
  await Deno.mkdir(TEST_DIR, { recursive: true });

  const entries: JSONObject[] = [
    { key: 'value1' },
    { key: 'value2' },
    { key: 'value3' },
  ];

  const logFile = new JSONLogFile(filePath, true);
  await logFile.openAsync();
  logFile.appendSync(entries);
  await logFile.closeAsync();

  const readLogFile = new JSONLogFile(filePath, false);
  await readLogFile.openAsync();

  const readEntries = [];
  for await (const entry of readLogFile.scanAsync()) {
    readEntries.push(entry);
  }

  assertEquals(readEntries, entries);

  await readLogFile.closeAsync();
  // await cleanup();
});

Deno.test('JSONLogFile: Reverse Scan Entries (Async)', async () => {
  const filePath = `${TEST_DIR}/test_reverse_scan_async.log`;
  await Deno.mkdir(TEST_DIR, { recursive: true });

  const entries: JSONObject[] = [
    { key: 'value1' },
    { key: 'value2' },
    { key: 'value3' },
  ];

  const logFile = new JSONLogFile(filePath, true);
  await logFile.openAsync();
  logFile.appendSync(entries);
  await logFile.closeAsync();

  const readLogFile = new JSONLogFile(filePath, false);
  const readGen = await readLogFile.openAsync();

  // deno-lint-ignore no-empty
  for await (const _ of readGen) {
  }

  const reverseEntries = [];
  for await (const entry of readLogFile.reverseScanAsync()) {
    reverseEntries.push(entry);
  }

  assertEquals(reverseEntries, entries.reverse());

  await readLogFile.closeAsync();
  await cleanup();
});

Deno.test('JSONLogFile: Query Entries (Async)', async () => {
  const filePath = `${TEST_DIR}/test_query_async.log`;
  await Deno.mkdir(TEST_DIR, { recursive: true });

  const entries: JSONObject[] = [
    { key: 'value1' },
    { key: 'value2' },
    { key: 'value3' },
  ];

  const logFile = new JSONLogFile(filePath, true);
  await logFile.openAsync();
  logFile.appendSync(entries);
  await logFile.closeAsync();

  const readLogFile = new JSONLogFile(filePath, false);
  await readLogFile.openAsync();
  const result = await readLogFile.queryAsync((obj) => obj.key === 'value2');
  assertEquals(result, [{ key: 'value2' }]);

  const limitedResult = await readLogFile.queryAsync(() => true, 2);
  assertEquals(limitedResult.length, 2);

  await readLogFile.closeAsync();

  await cleanup();
});
