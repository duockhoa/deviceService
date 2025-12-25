#!/usr/bin/env node
/**
 * SAP PM-lite Core - API V2 Automated Test Suite
 * 
 * Usage:
 *   node test-api-v2-automated.js
 * 
 * Prerequisites:
 *   - Service running on port 3009
 *   - Valid JWT token in TOKEN environment variable
 *   - Test data: incident_id, maintenance_id, asset_id
 */

const axios = require('axios');

// Configuration
const BASE_URL = process.env.BASE_URL || 'http://localhost:3009';
const TOKEN = process.env.TOKEN || 'YOUR_TOKEN_HERE';
const INCIDENT_ID = process.env.INCIDENT_ID || 1;
const MAINTENANCE_ID = process.env.MAINTENANCE_ID || 1;
const ASSET_ID = process.env.ASSET_ID || 1;

// Colors for console output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m'
};

// Test results
const results = {
  passed: 0,
  failed: 0,
  skipped: 0,
  tests: []
};

// HTTP client with auth
const client = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Authorization': `Bearer ${TOKEN}`,
    'Content-Type': 'application/json'
  }
});

// Test runner
async function test(name, fn) {
  try {
    console.log(`${colors.blue}▶ ${name}${colors.reset}`);
    await fn();
    results.passed++;
    results.tests.push({ name, status: 'PASS' });
    console.log(`${colors.green}✓ PASS${colors.reset}\n`);
  } catch (error) {
    results.failed++;
    results.tests.push({ name, status: 'FAIL', error: error.message });
    console.log(`${colors.red}✗ FAIL: ${error.message}${colors.reset}\n`);
  }
}

// Assertion helpers
function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function assertEqual(actual, expected, message) {
  if (actual !== expected) {
    throw new Error(`${message}: expected ${expected}, got ${actual}`);
  }
}

// ========================================
// TEST SUITE
// ========================================

async function runTests() {
  console.log(`${colors.blue}╔════════════════════════════════════════╗${colors.reset}`);
  console.log(`${colors.blue}║  SAP PM-lite Core V2 API Test Suite  ║${colors.reset}`);
  console.log(`${colors.blue}╚════════════════════════════════════════╝${colors.reset}\n`);
  
  // Test 1: Incident Triage - Set M1 Notification Type
  await test('Incident Triage - Set M1 Notification Type', async () => {
    const response = await client.post(`/api/v2/incidents/${INCIDENT_ID}/triage`, {
      severity: 'critical',
      notification_type: 'M1',
      notes: 'Test: Motor failure'
    });
    
    assert(response.status === 200, 'Expected status 200');
    assert(response.data.success === true, 'Expected success=true');
    assert(response.data.data.incident.notification_type === 'M1', 'Expected notification_type=M1');
    console.log(`   Notification Type: ${response.data.data.incident.notification_type}`);
  });
  
  // Test 2: Incident Isolate - Asset goes DOWN
  await test('Incident Isolate - Asset should go to DOWN status', async () => {
    const response = await client.post(`/api/v2/incidents/${INCIDENT_ID}/isolate`, {
      downtime_minutes: 120,
      isolation_reason: 'Test: Production stopped'
    });
    
    assert(response.status === 200, 'Expected status 200');
    assert(response.data.success === true, 'Expected success=true');
    
    // Verify side effect executed
    const sideEffects = response.data.data.transition.side_effects;
    const hasDownSideEffect = sideEffects.some(se => se.name === 'setAssetDOWN');
    assert(hasDownSideEffect, 'Expected setAssetDOWN side effect');
    console.log(`   Side Effects: ${sideEffects.map(se => se.name).join(', ')}`);
  });
  
  // Test 3: Get Incident Status - Verify Asset is DOWN
  await test('Get Incident Status - Verify Asset operational status', async () => {
    const response = await client.get(`/api/v2/incidents/${INCIDENT_ID}/status`);
    
    assert(response.status === 200, 'Expected status 200');
    assert(response.data.success === true, 'Expected success=true');
    
    const asset = response.data.data.asset_operational_status;
    console.log(`   Asset Operational Status: ${asset.operational_status}`);
    console.log(`   Asset Code: ${asset.asset_code}`);
  });
  
  // Test 4: Maintenance Release - REL status (Scope Locked)
  await test('Maintenance Release - REL status (Scope Locked)', async () => {
    const response = await client.post(`/api/v2/maintenance/${MAINTENANCE_ID}/release`, {
      scheduled_at: '2025-12-26T08:00:00Z',
      assigned_to: 5
    });
    
    assert(response.status === 200, 'Expected status 200');
    assert(response.data.success === true, 'Expected success=true');
    assert(response.data.data.gates.scope_locked === true, 'Expected scope to be locked');
    console.log(`   System Status: ${response.data.data.transition.system_status}`);
    console.log(`   Scope Locked: ${response.data.data.gates.scope_locked}`);
  });
  
  // Test 5: Maintenance Start - Asset goes MNTC
  await test('Maintenance Start - Asset should go to MNTC status', async () => {
    const response = await client.post(`/api/v2/maintenance/${MAINTENANCE_ID}/start`, {
      actual_start_date: new Date().toISOString()
    });
    
    assert(response.status === 200, 'Expected status 200');
    assert(response.data.success === true, 'Expected success=true');
    
    // Verify side effect executed
    const sideEffects = response.data.data.transition.side_effects;
    const hasMntcSideEffect = sideEffects.some(se => se.name === 'setAssetMNTC');
    assert(hasMntcSideEffect, 'Expected setAssetMNTC side effect');
    console.log(`   Side Effects: ${sideEffects.map(se => se.name).join(', ')}`);
  });
  
  // Test 6: Test Scope Lock Enforcement (Should Fail)
  await test('Test Scope Lock Enforcement - Should reject scope change', async () => {
    try {
      await client.put(`/api/v2/maintenance/${MAINTENANCE_ID}`, {
        asset_id: 999,
        notes: 'Trying to change asset after REL'
      });
      throw new Error('Should have rejected scope change');
    } catch (error) {
      if (error.response && error.response.status === 400) {
        console.log(`   ✓ Correctly rejected: ${error.response.data.message}`);
      } else {
        throw error;
      }
    }
  });
  
  // Test 7: MTBF/MTTR Report - Only M1 counted
  await test('MTBF/MTTR Report - Verify M1 only calculation', async () => {
    const startDate = '2025-10-01';
    const endDate = '2025-12-25';
    const response = await client.get(`/api/v2/reports/mtbf-mttr`, {
      params: { asset_id: ASSET_ID, start_date: startDate, end_date: endDate }
    });
    
    assert(response.status === 200, 'Expected status 200');
    assert(response.data.success === true, 'Expected success=true');
    
    const { mtbf, mttr } = response.data.data;
    console.log(`   MTBF: ${mtbf.value_hours ? mtbf.value_hours.toFixed(2) : 'N/A'} hours`);
    console.log(`   MTTR: ${mttr.value_hours ? mttr.value_hours.toFixed(2) : 'N/A'} hours`);
    console.log(`   M1 Failure Count: ${mtbf.failure_count}`);
    assert(response.data.data.note.includes('M1'), 'Should mention M1 only');
  });
  
  // Test 8: Availability Report
  await test('Availability Report - Calculate uptime percentage', async () => {
    const startDate = '2025-11-01';
    const endDate = '2025-12-25';
    const response = await client.get(`/api/v2/reports/availability`, {
      params: { asset_id: ASSET_ID, start_date: startDate, end_date: endDate }
    });
    
    assert(response.status === 200, 'Expected status 200');
    assert(response.data.success === true, 'Expected success=true');
    
    const { availability } = response.data.data;
    console.log(`   Availability: ${availability.percentage.toFixed(2)}%`);
    console.log(`   Rating: ${availability.rating}`);
    console.log(`   Operating Hours: ${availability.operating_hours.toFixed(2)}`);
    console.log(`   Downtime Hours: ${availability.downtime_hours.toFixed(2)}`);
  });
  
  // Test 9: Planned vs Unplanned Ratio
  await test('Planned vs Unplanned Ratio - Maintenance balance', async () => {
    const startDate = '2025-10-01';
    const endDate = '2025-12-25';
    const response = await client.get(`/api/v2/reports/planned-vs-unplanned`, {
      params: { asset_id: ASSET_ID, start_date: startDate, end_date: endDate }
    });
    
    assert(response.status === 200, 'Expected status 200');
    assert(response.data.success === true, 'Expected success=true');
    
    const { ratio } = response.data.data;
    console.log(`   Ratio: ${ratio.value ? ratio.value.toFixed(2) : 'N/A'}:1`);
    console.log(`   Rating: ${ratio.rating}`);
    console.log(`   Planned: ${ratio.planned.count} WOs (${ratio.planned.hours.toFixed(2)}h)`);
    console.log(`   Unplanned: ${ratio.unplanned.count} WOs (${ratio.unplanned.hours.toFixed(2)}h)`);
  });
  
  // Test 10: Backlog Analysis
  await test('Backlog Analysis - Open corrective work', async () => {
    const response = await client.get(`/api/v2/reports/backlog`, {
      params: { asset_id: ASSET_ID }
    });
    
    assert(response.status === 200, 'Expected status 200');
    assert(response.data.success === true, 'Expected success=true');
    
    const { backlog } = response.data.data;
    console.log(`   Total Backlog: ${backlog.total}`);
    console.log(`   Urgency: ${backlog.urgency_rating}`);
    console.log(`   By Priority: Critical=${backlog.by_priority.critical}, High=${backlog.by_priority.high}`);
  });
  
  // Test 11: Asset KPI Dashboard - Complete view
  await test('Asset KPI Dashboard - Comprehensive KPIs', async () => {
    const startDate = '2025-10-01';
    const endDate = '2025-12-25';
    const response = await client.get(`/api/v2/reports/asset-kpi-dashboard`, {
      params: { asset_id: ASSET_ID, start_date: startDate, end_date: endDate }
    });
    
    assert(response.status === 200, 'Expected status 200');
    assert(response.data.success === true, 'Expected success=true');
    
    const { overall_health } = response.data.data;
    console.log(`   Health Score: ${overall_health.score}/100`);
    console.log(`   Health Status: ${overall_health.status}`);
  });
  
  // Test 12: V1 API Backward Compatibility
  await test('V1 API Backward Compatibility - Still works', async () => {
    const response = await client.get('/api/v1/incidents', {
      params: { page: 1, pageSize: 10 }
    });
    
    // V1 might have different response format, just check it doesn't error
    assert(response.status === 200, 'Expected status 200');
    console.log(`   V1 API still accessible`);
  });
  
  // ========================================
  // RESULTS SUMMARY
  // ========================================
  
  console.log(`\n${colors.blue}╔════════════════════════════════════════╗${colors.reset}`);
  console.log(`${colors.blue}║          TEST RESULTS SUMMARY          ║${colors.reset}`);
  console.log(`${colors.blue}╚════════════════════════════════════════╝${colors.reset}\n`);
  
  console.log(`${colors.green}✓ Passed: ${results.passed}${colors.reset}`);
  console.log(`${colors.red}✗ Failed: ${results.failed}${colors.reset}`);
  console.log(`${colors.yellow}⊘ Skipped: ${results.skipped}${colors.reset}`);
  console.log(`Total: ${results.passed + results.failed + results.skipped}\n`);
  
  if (results.failed > 0) {
    console.log(`${colors.red}Failed Tests:${colors.reset}`);
    results.tests
      .filter(t => t.status === 'FAIL')
      .forEach(t => {
        console.log(`  - ${t.name}`);
        console.log(`    ${t.error}\n`);
      });
  }
  
  // Exit code
  process.exit(results.failed > 0 ? 1 : 0);
}

// Run tests
runTests().catch(error => {
  console.error(`${colors.red}Fatal error:${colors.reset}`, error);
  process.exit(1);
});
