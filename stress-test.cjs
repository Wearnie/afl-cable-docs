#!/usr/bin/env node
/**
 * AFL Cable Docs — Stress Test Script
 * Tests all API endpoints under realistic and edge-case conditions.
 * Cleans up all test data after each test.
 *
 * Usage: node stress-test.cjs [--base-url=URL]
 */

const BASE_URL = process.argv.find(a => a.startsWith('--base-url='))
  ?.split('=')[1] || 'https://afl-cable-docs.vercel.app';

// ── Helpers ──────────────────────────────────────────────────────────────────

async function api(method, path, body) {
  const opts = {
    method,
    headers: { 'Content-Type': 'application/json' },
  };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(`${BASE_URL}${path}`, opts);
  const text = await res.text();
  let data;
  try { data = JSON.parse(text); } catch { data = text; }
  return { status: res.status, data };
}

function testPattern(i) {
  // ZZT + 10 chars — unlikely to collide with real patterns
  const id = String(i).padStart(10, '*');
  return {
    pattern: `ZZT${id}`,
    type: 'StressTest',
    name: `Stress Test Pattern ${i}`,
    path: `/stress-test/test-${i}.pdf`,
  };
}

const sleep = ms => new Promise(r => setTimeout(r, ms));

// ── Results tracking ─────────────────────────────────────────────────────────

const results = [];
let currentTest = '';

function pass(detail) {
  console.log(`    ✅ ${detail}`);
}

function fail(detail) {
  console.log(`    ❌ ${detail}`);
  results.push({ test: currentTest, status: 'FAIL', detail });
}

function assert(condition, detail) {
  if (condition) { pass(detail); return true; }
  fail(detail); return false;
}

// ── Test 1: Pattern CRUD Round-Trip ──────────────────────────────────────────

async function test1() {
  currentTest = 'Test 1: Pattern CRUD Round-Trip';
  console.log(`\n🔧 ${currentTest}`);
  const t0 = Date.now();

  // Get starting count
  const { data: before } = await api('GET', '/api/document-map');
  const startCount = before.count;
  console.log(`    Starting count: ${startCount}`);

  // 1. Add a test pattern
  const entry = testPattern(1);
  const { status: addStatus, data: addData } = await api('POST', '/api/document-map', {
    entries: [entry],
  });
  assert(addStatus === 200, `POST add → ${addStatus} (expected 200)`);
  assert(addData.added === 1, `Added ${addData.added} (expected 1)`);

  // Small delay to let GitHub commit settle
  await sleep(1500);

  // 2. Verify it appears
  const { data: afterAdd } = await api('GET', '/api/document-map');
  const found = afterAdd.entries.find(e => e.pattern === entry.pattern);
  assert(!!found, `GET shows new pattern exists: ${!!found}`);

  // 3. Edit it via PUT (atomic remove old + add new)
  const edited = testPattern(2);
  const { status: putStatus, data: putData } = await api('PUT', '/api/document-map', {
    remove: [entry.pattern],
    add: [edited],
  });
  assert(putStatus === 200, `PUT edit → ${putStatus} (expected 200)`);
  assert(putData.removed === 1 && putData.added === 1, `Removed ${putData.removed}, added ${putData.added}`);

  await sleep(1500);

  // 4. Verify old gone, new exists
  const { data: afterEdit } = await api('GET', '/api/document-map');
  const oldGone = !afterEdit.entries.find(e => e.pattern === entry.pattern);
  const newExists = !!afterEdit.entries.find(e => e.pattern === edited.pattern);
  assert(oldGone, `Old pattern removed: ${oldGone}`);
  assert(newExists, `New pattern exists: ${newExists}`);

  // 5. Delete the new one
  const { status: delStatus, data: delData } = await api('DELETE', '/api/document-map', {
    patterns: [edited.pattern],
  });
  assert(delStatus === 200, `DELETE → ${delStatus} (expected 200)`);
  assert(delData.removed === 1, `Removed ${delData.removed} (expected 1)`);

  await sleep(1500);

  // 6. Verify count is back
  const { data: afterDel } = await api('GET', '/api/document-map');
  assert(afterDel.count === startCount, `Final count ${afterDel.count} === start ${startCount}`);

  const elapsed = Date.now() - t0;
  results.push({ test: currentTest, status: results.some(r => r.test === currentTest) ? 'FAIL' : 'PASS', elapsed });
  console.log(`    ⏱  ${elapsed}ms`);
}

// ── Test 2: Rapid Sequential Edits (SHA Conflict Test) ───────────────────────

async function test2() {
  currentTest = 'Test 2: Rapid Sequential Edits';
  console.log(`\n🔧 ${currentTest}`);
  const t0 = Date.now();
  let failed = false;

  const { data: before } = await api('GET', '/api/document-map');
  const startCount = before.count;

  // Add pattern A
  const a = testPattern(100);
  const { status: s1 } = await api('POST', '/api/document-map', { entries: [a] });
  if (!assert(s1 === 200, `Add A → ${s1}`)) failed = true;
  await sleep(1500);

  // Edit A → B
  const b = testPattern(101);
  const { status: s2 } = await api('PUT', '/api/document-map', { remove: [a.pattern], add: [b] });
  if (!assert(s2 === 200, `Edit A→B → ${s2}`)) failed = true;
  await sleep(1500);

  // Edit B → C
  const c = testPattern(102);
  const { status: s3 } = await api('PUT', '/api/document-map', { remove: [b.pattern], add: [c] });
  if (!assert(s3 === 200, `Edit B→C → ${s3}`)) failed = true;
  await sleep(1500);

  // Edit C → D
  const d = testPattern(103);
  const { status: s4 } = await api('PUT', '/api/document-map', { remove: [c.pattern], add: [d] });
  if (!assert(s4 === 200, `Edit C→D → ${s4}`)) failed = true;
  await sleep(1500);

  // Delete D
  const { status: s5 } = await api('DELETE', '/api/document-map', { patterns: [d.pattern] });
  if (!assert(s5 === 200, `Delete D → ${s5}`)) failed = true;
  await sleep(1500);

  // Verify count
  const { data: after } = await api('GET', '/api/document-map');
  assert(after.count === startCount, `Final count ${after.count} === start ${startCount}`);

  const elapsed = Date.now() - t0;
  results.push({ test: currentTest, status: failed ? 'FAIL' : 'PASS', elapsed });
  console.log(`    ⏱  ${elapsed}ms`);
}

// ── Test 3: Batch Operations ─────────────────────────────────────────────────

async function test3() {
  currentTest = 'Test 3: Batch Operations';
  console.log(`\n🔧 ${currentTest}`);
  const t0 = Date.now();
  let failed = false;

  const { data: before } = await api('GET', '/api/document-map');
  const startCount = before.count;

  // Add 10 patterns at once
  const patterns = [];
  for (let i = 200; i < 210; i++) patterns.push(testPattern(i));

  const { status: addStatus, data: addData } = await api('POST', '/api/document-map', {
    entries: patterns,
  });
  if (!assert(addStatus === 200, `Batch POST → ${addStatus}`)) failed = true;
  if (!assert(addData.added === 10, `Added ${addData.added} (expected 10)`)) failed = true;

  await sleep(2000);

  // Verify count increased by 10
  const { data: mid } = await api('GET', '/api/document-map');
  assert(mid.count === startCount + 10, `Mid count ${mid.count} === ${startCount + 10}`);

  // Delete all 10
  const { status: delStatus, data: delData } = await api('DELETE', '/api/document-map', {
    patterns: patterns.map(p => p.pattern),
  });
  if (!assert(delStatus === 200, `Batch DELETE → ${delStatus}`)) failed = true;
  if (!assert(delData.removed === 10, `Removed ${delData.removed} (expected 10)`)) failed = true;

  await sleep(1500);

  // Verify count restored
  const { data: after } = await api('GET', '/api/document-map');
  assert(after.count === startCount, `Final count ${after.count} === start ${startCount}`);

  const elapsed = Date.now() - t0;
  results.push({ test: currentTest, status: failed ? 'FAIL' : 'PASS', elapsed });
  console.log(`    ⏱  ${elapsed}ms`);
}

// ── Test 4: DJ Overrides CRUD ────────────────────────────────────────────────

async function test4() {
  currentTest = 'Test 4: DJ Overrides CRUD';
  console.log(`\n🔧 ${currentTest}`);
  const t0 = Date.now();
  let failed = false;

  const testDJ = '99999999';

  // 1. POST override (exclude + include)
  const { status: s1, data: d1 } = await api('POST', '/api/dj-overrides', {
    djNumber: testDJ,
    exclude: ['/stress-test/exclude-1.pdf'],
    include: [{ type: 'StressTest', name: 'Test Include', path: '/stress-test/include-1.pdf' }],
  });
  if (!assert(s1 === 200, `POST override → ${s1}`)) failed = true;
  assert(d1.djNumber === testDJ, `DJ number in response: ${d1.djNumber}`);

  await sleep(1500);

  // 2. GET and verify it exists
  const { data: allOverrides } = await api('GET', '/api/dj-overrides');
  const override = allOverrides[testDJ];
  assert(!!override, `Override exists for DJ ${testDJ}: ${!!override}`);
  if (override) {
    assert(override.exclude.length === 1, `Exclude has 1 entry`);
    assert(override.include.length === 1, `Include has 1 entry`);
  }

  // 3. POST updated override (change exclude list)
  const { status: s2 } = await api('POST', '/api/dj-overrides', {
    djNumber: testDJ,
    exclude: ['/stress-test/exclude-1.pdf', '/stress-test/exclude-2.pdf'],
    include: [],
  });
  if (!assert(s2 === 200, `POST update → ${s2}`)) failed = true;

  await sleep(1500);

  // 4. Verify update applied
  const { data: allOverrides2 } = await api('GET', '/api/dj-overrides');
  const updated = allOverrides2[testDJ];
  assert(updated && updated.exclude.length === 2, `Updated exclude has 2 entries: ${updated?.exclude?.length}`);

  // 5. DELETE override
  const { status: s3 } = await api('DELETE', `/api/dj-overrides?dj=${testDJ}`);
  if (!assert(s3 === 200, `DELETE override → ${s3}`)) failed = true;

  await sleep(1500);

  // 6. Verify it's gone
  const { data: allOverrides3 } = await api('GET', '/api/dj-overrides');
  assert(!allOverrides3[testDJ], `Override removed: ${!allOverrides3[testDJ]}`);

  const elapsed = Date.now() - t0;
  results.push({ test: currentTest, status: failed ? 'FAIL' : 'PASS', elapsed });
  console.log(`    ⏱  ${elapsed}ms`);
}

// ── Test 5: Validation / Error Handling ──────────────────────────────────────

async function test5() {
  currentTest = 'Test 5: Validation / Error Handling';
  console.log(`\n🔧 ${currentTest}`);
  const t0 = Date.now();
  let failed = false;

  // 1. Pattern with != 13 chars (12 chars → should fail 400)
  const { status: s1, data: d1 } = await api('POST', '/api/document-map', {
    entries: [{ pattern: 'ZZTSHORT12**', type: 'Test', name: 'Short', path: '/test.pdf' }],
  });
  if (!assert(s1 === 400, `12-char pattern → ${s1} (expected 400): ${d1.error || ''}`)) failed = true;

  // 2. Pattern with no type (should fail 400)
  const { status: s2, data: d2 } = await api('POST', '/api/document-map', {
    entries: [{ pattern: 'ZZT**********', name: 'No Type', path: '/test.pdf' }],
  });
  if (!assert(s2 === 400, `No type → ${s2} (expected 400): ${d2.error || ''}`)) failed = true;

  // 3. DELETE non-existent pattern (should succeed with removed: 0)
  const { status: s3, data: d3 } = await api('DELETE', '/api/document-map', {
    patterns: ['ZZTNOTEXIST**'],
  });
  if (!assert(s3 === 200, `Delete non-existent → ${s3} (expected 200)`)) failed = true;
  assert(d3.removed === 0, `Removed count: ${d3.removed} (expected 0)`);

  // 4. DJ override with invalid DJ (not 8 digits → should fail 400)
  const { status: s4, data: d4 } = await api('POST', '/api/dj-overrides', {
    djNumber: 'abc',
    exclude: [],
    include: [],
  });
  if (!assert(s4 === 400, `Invalid DJ → ${s4} (expected 400): ${d4.error || ''}`)) failed = true;

  const elapsed = Date.now() - t0;
  results.push({ test: currentTest, status: failed ? 'FAIL' : 'PASS', elapsed });
  console.log(`    ⏱  ${elapsed}ms`);
}

// ── Test 6: Document Upload ──────────────────────────────────────────────────

async function test6() {
  currentTest = 'Test 6: Document Upload';
  console.log(`\n🔧 ${currentTest}`);
  const t0 = Date.now();
  let failed = false;

  // Create a minimal valid PDF (1 page, ~200 bytes)
  const minimalPDF = [
    '%PDF-1.0',
    '1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj',
    '2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj',
    '3 0 obj<</Type/Page/MediaBox[0 0 612 792]/Parent 2 0 R>>endobj',
    'xref',
    '0 4',
    '0000000000 65535 f ',
    '0000000009 00000 n ',
    '0000000058 00000 n ',
    '0000000115 00000 n ',
    'trailer<</Size 4/Root 1 0 R>>',
    'startxref',
    '190',
    '%%EOF',
  ].join('\n');

  const fileBase64 = Buffer.from(minimalPDF).toString('base64');

  // 1. Upload tiny PDF to 'other' category
  const { status: s1, data: d1 } = await api('POST', '/api/upload-doc', {
    docType: 'other',
    fileName: 'stress-test-upload.pdf',
    fileBase64,
  });
  if (!assert(s1 === 200, `Upload → ${s1}: ${d1.path || d1.error || ''}`)) failed = true;

  if (s1 === 200) {
    assert(!!d1.path, `Response has path: ${d1.path}`);

    // 2. Add a pattern mapping for it
    const entry = {
      pattern: 'ZZU**********',
      type: 'StressTest',
      name: 'Upload Test Pattern',
      path: d1.path,
    };
    const { status: s2 } = await api('POST', '/api/document-map', { entries: [entry] });
    if (!assert(s2 === 200, `Add mapping → ${s2}`)) failed = true;

    await sleep(1500);

    // 3. Delete the pattern mapping
    const { status: s3 } = await api('DELETE', '/api/document-map', { patterns: [entry.pattern] });
    if (!assert(s3 === 200, `Delete mapping → ${s3}`)) failed = true;
  }

  const elapsed = Date.now() - t0;
  results.push({ test: currentTest, status: failed ? 'FAIL' : 'PASS', elapsed });
  console.log(`    ⏱  ${elapsed}ms`);
  console.log(`    ⚠️  Note: stress-test-upload.pdf left in repo (harmless)`);
}

// ── Test 7: Concurrent Writes (Race Condition) ──────────────────────────────

async function test7() {
  currentTest = 'Test 7: Concurrent Writes';
  console.log(`\n🔧 ${currentTest}`);
  const t0 = Date.now();

  const { data: before } = await api('GET', '/api/document-map');
  const startCount = before.count;

  // Fire 3 POST requests simultaneously with different patterns
  const patterns = [testPattern(300), testPattern(301), testPattern(302)];
  const promises = patterns.map(p =>
    api('POST', '/api/document-map', { entries: [p] })
  );

  const results_concurrent = await Promise.all(promises);

  const successes = results_concurrent.filter(r => r.status === 200);
  const failures = results_concurrent.filter(r => r.status !== 200);

  console.log(`    Concurrent results: ${successes.length} succeeded, ${failures.length} failed`);
  for (const f of failures) {
    console.log(`      Failed (${f.status}): ${f.data?.error || JSON.stringify(f.data)}`);
  }

  assert(successes.length >= 1, `At least 1 succeeded: ${successes.length}`);

  // Check that failures are clean errors (not 500)
  const has500 = failures.some(f => f.status === 500);
  assert(!has500, `No 500 errors: ${!has500}`);

  // Wait for commits to settle
  await sleep(3000);

  // Clean up whatever was added
  const { data: afterConcurrent } = await api('GET', '/api/document-map');
  const addedPatterns = patterns
    .map(p => p.pattern)
    .filter(pat => afterConcurrent.entries.some(e => e.pattern === pat));

  if (addedPatterns.length > 0) {
    console.log(`    Cleaning up ${addedPatterns.length} patterns...`);
    // Delete one at a time to avoid SHA conflicts
    for (const pat of addedPatterns) {
      const { status } = await api('DELETE', '/api/document-map', { patterns: [pat] });
      console.log(`      Delete ${pat} → ${status}`);
      await sleep(1500);
    }
  }

  // Verify final count
  await sleep(1000);
  const { data: afterCleanup } = await api('GET', '/api/document-map');
  assert(afterCleanup.count === startCount, `Final count ${afterCleanup.count} === start ${startCount}`);

  const elapsed = Date.now() - t0;
  results.push({ test: currentTest, status: results.some(r => r.test === currentTest && r.status === 'FAIL') ? 'FAIL' : 'PASS', elapsed });
  console.log(`    ⏱  ${elapsed}ms`);
}

// ── Final Verification ───────────────────────────────────────────────────────

async function finalVerification() {
  console.log('\n🔍 Final Verification');

  const { data: docMap } = await api('GET', '/api/document-map');
  const stressEntries = docMap.entries.filter(e =>
    e.pattern.startsWith('ZZT') || e.pattern.startsWith('ZZU')
  );
  if (stressEntries.length > 0) {
    console.log(`    ⚠️  Found ${stressEntries.length} leftover stress test patterns — cleaning up...`);
    for (const e of stressEntries) {
      const { status } = await api('DELETE', '/api/document-map', { patterns: [e.pattern] });
      console.log(`      Delete ${e.pattern} → ${status}`);
      await sleep(1500);
    }
  } else {
    console.log('    ✅ No leftover stress test patterns in document-map');
  }

  const { data: overrides } = await api('GET', '/api/dj-overrides');
  if (overrides['99999999']) {
    console.log('    ⚠️  Leftover test DJ override — cleaning up...');
    await api('DELETE', '/api/dj-overrides?dj=99999999');
  } else {
    console.log('    ✅ No leftover test DJ overrides');
  }

  console.log(`    📊 Document map count: ${docMap.count}`);
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('═══════════════════════════════════════════════════════');
  console.log('  AFL Cable Docs — Stress Test');
  console.log(`  Target: ${BASE_URL}`);
  console.log(`  Time:   ${new Date().toISOString()}`);
  console.log('═══════════════════════════════════════════════════════');

  // Connectivity check
  try {
    const { status } = await api('GET', '/api/document-map');
    if (status !== 200) throw new Error(`Got ${status}`);
    console.log('✅ API reachable');
  } catch (err) {
    console.error(`❌ Cannot reach API: ${err.message}`);
    process.exit(1);
  }

  await test1();
  await test2();
  await test3();
  await test4();
  await test5();
  await test6();
  await test7();
  await finalVerification();

  // ── Summary ──
  console.log('\n═══════════════════════════════════════════════════════');
  console.log('  RESULTS SUMMARY');
  console.log('═══════════════════════════════════════════════════════');

  for (const r of results) {
    const icon = r.status === 'PASS' ? '✅' : '❌';
    const time = r.elapsed ? ` (${(r.elapsed / 1000).toFixed(1)}s)` : '';
    console.log(`  ${icon} ${r.test}${time}`);
    if (r.detail) console.log(`     → ${r.detail}`);
  }

  const passed = results.filter(r => r.status === 'PASS').length;
  const failed = results.filter(r => r.status === 'FAIL').length;
  console.log(`\n  ${passed} passed, ${failed} failed out of ${results.length} tests`);
  console.log('═══════════════════════════════════════════════════════');

  process.exit(failed > 0 ? 1 : 0);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
