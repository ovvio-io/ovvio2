import { assertEquals } from 'https://deno.land/std@0.114.0/testing/asserts.ts';
import { JSONObject } from './interfaces.ts';
import { JSONLogFile } from './json-log.ts';

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

Deno.test('JSONLogFile: Append Entries (Async)', async () => {
  const filePath = `${TEST_DIR}/test_append_async.log`;
  const logFile = new JSONLogFile(filePath, true);
  const gen = logFile.open();
  for (const entry of gen) {
    // Consume the generator to ensure file operations are completed
  }
  const entries: JSONObject[] = [{ key: 'value1' }, { key: 'value2' }];
  await logFile.append(entries);
  await logFile.close();
  console.log('Entries appended and log file closed');
  const readLogFile = new JSONLogFile(filePath, false);
  const readGen = readLogFile.open();
  const readEntries = Array.from(readGen);
  console.log('Entries read from log file:', readEntries);
  assertEquals(readEntries, entries);
  await readLogFile.close();
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
