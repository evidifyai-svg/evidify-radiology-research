# Evidify v4.2.1-beta Testing Bundle

**Date:** January 9, 2026  
**Tester:** Josh  
**Features:** Policy UI, MDM Packages, Beta Onboarding, Performance Optimization

---

## Quick Start

```bash
# Navigate to project
cd /home/claude/evidify/evidify-v9

# Install frontend dependencies
cd frontend && npm install && cd ..

# Build and run in dev mode
cargo tauri dev
```

---

## Test Matrix

| Feature | Component | Priority | Status |
|---------|-----------|----------|--------|
| Policy UI | PolicySettings.tsx | P1 | ⬜ |
| MDM - Jamf | mobileconfig | P2 | ⬜ |
| MDM - Intune | PowerShell | P2 | ⬜ |
| Onboarding | BetaOnboarding.tsx | P1 | ⬜ |
| Performance - Cache | performance.rs | P1 | ⬜ |
| Performance - Frontend | performance.ts | P1 | ⬜ |

---

## 1. Policy Configuration UI

### 1.1 Access Policy Settings

**Test:** Navigate to policy settings
```typescript
// In App.tsx or test harness, render:
import { PolicySettings } from './components/PolicySettings';

<PolicySettings onClose={() => console.log('closed')} />
```

**Expected:**
- [ ] Settings panel loads without errors
- [ ] Current policy displays (default: "Solo Practice" v1.0.0)
- [ ] All 5 sections visible (Export, Attestation, Recording, Supervision, Retention)

### 1.2 Export Policy Controls

**Test:** Modify export settings
1. Expand "Export Controls" section
2. Change "Cloud-Synced Folders" from Warn → Block
3. Change "Removable Media" from Warn → RequireApproval
4. Add format "ccda" to allowed formats
5. Remove "json" from allowed formats

**Expected:**
- [ ] Dropdowns update immediately
- [ ] Format tags appear/disappear correctly
- [ ] No console errors

### 1.3 Attestation Policy

**Test:** Configure attestation requirements
1. Expand "Attestation Requirements" section
2. Toggle "Allow Not Clinically Relevant" OFF
3. Set attestation timeout to 300 seconds
4. Verify required attestations list shows (should have 7 items)

**Expected:**
- [ ] Checkboxes toggle correctly
- [ ] Number input accepts values
- [ ] Required attestation tags display in red

### 1.4 Recording Policy

**Test:** Configure recording settings
1. Expand "Recording & Consent" section
2. Toggle "Auto-delete audio after signing" OFF
3. Set max retention to 30 days
4. Enable "Re-consent each session"

**Expected:**
- [ ] All checkboxes functional
- [ ] Number input works
- [ ] Help text visible

### 1.5 Supervision Policy

**Test:** Configure supervision requirements
1. Expand "Supervision Requirements" section
2. Check: Intern, Trainee, Postdoc
3. Uncheck: Licensed, Supervisor
4. Set max review delay to 48 hours
5. Enable "competency tracking"

**Expected:**
- [ ] Credential checkboxes in 3-column grid
- [ ] Multiple selections work
- [ ] Number input accepts values

### 1.6 Retention Policy

**Test:** Configure retention settings
1. Expand "Data Retention" section
2. Set note retention to 2555 days (7 years)
3. Set audit log retention to 3650 days (10 years)
4. Enable destruction certificates

**Expected:**
- [ ] Inputs accept large numbers
- [ ] Checkbox toggles

### 1.7 Export/Import Policy

**Test:** Export policy to JSON
1. Click "Export Policy JSON"
2. Save file
3. Open in text editor

**Expected:**
- [ ] File downloads as `evidify-policy-1.0.0.json`
- [ ] JSON is valid and readable
- [ ] All settings reflected in JSON

**Test:** Import policy
1. Click "Import Policy"
2. Select a modified JSON file
3. Verify settings update

**Expected:**
- [ ] File picker opens
- [ ] Settings update to imported values
- [ ] Info message appears

---

## 2. Beta User Onboarding

### 2.1 Trigger Onboarding

**Test:** Display onboarding wizard
```typescript
import { BetaOnboarding } from './components/BetaOnboarding';

<BetaOnboarding 
  onComplete={() => console.log('Onboarding complete')}
  onSkip={() => console.log('Skipped')}
/>
```

**Expected:**
- [ ] Modal overlay appears
- [ ] "Welcome to Evidify Beta" title visible
- [ ] Progress bar shows 6 steps

### 2.2 Welcome Step

**Test:** Review welcome content
1. Read welcome text
2. Verify 4 feature cards visible
3. Check "Beta Tip" box

**Expected:**
- [ ] Trust badge: "🔒 Your data never leaves your device"
- [ ] Cards: Voice Scribe, Local-First, Defensible, Clinical Growth
- [ ] Continue button enabled

### 2.3 System Check Step

**Test:** Run system requirements
1. Click Continue from Welcome
2. Watch checks run automatically

**Expected with Ollama running:**
- [ ] Ollama: ✓ (green) with model count
- [ ] Storage: ✓ (green)
- [ ] Keychain: ✓ (green)
- [ ] Whisper: ! (yellow) or ✓ (green)
- [ ] Continue button enabled

**Expected without Ollama:**
- [ ] Ollama: ✗ (red) with error message
- [ ] Warning box appears
- [ ] Continue button disabled (required check failed)

### 2.4 Profile Step

**Test:** Enter profile information
1. Enter name: "Dr. Test User"
2. Enter credentials: "PhD"
3. Enter license state: "NY"
4. Select practice type: "Telehealth Only"

**Expected:**
- [ ] All inputs accept text
- [ ] Practice type dropdown works
- [ ] Continue button enabled only when name filled

### 2.5 Privacy Step

**Test:** Review privacy and consent
1. Read security explanations
2. Check "I understand this is beta software" (required)
3. Leave feedback opt-in checked
4. Uncheck crash reports

**Expected:**
- [ ] 3 feature cards explaining security
- [ ] Continue disabled until beta terms checked
- [ ] Optional checkboxes don't affect Continue button

### 2.6 Features Step

**Test:** Review feature tour
1. Read Voice Scribe explanation
2. Read Ethics Detection explanation
3. Read Time Metrics explanation
4. Check tip box

**Expected:**
- [ ] Large feature cards with icons
- [ ] Tip box with getting started advice

### 2.7 Ready Step

**Test:** Complete onboarding
1. Verify personalized message with name
2. Click "Get Started"

**Expected:**
- [ ] "You're All Set!" title
- [ ] Resources list visible
- [ ] Trust badge at bottom
- [ ] `onComplete` callback fires

### 2.8 Navigation

**Test:** Step navigation
1. Use Back button to return to previous steps
2. Use Skip Setup (if available)
3. Verify progress bar updates

**Expected:**
- [ ] Back navigates correctly
- [ ] Progress bar reflects current step
- [ ] Skip fires `onSkip` callback

---

## 3. MDM Packages

### 3.1 Jamf Configuration Profile

**Test:** Validate mobileconfig
```bash
# Check XML validity
plutil -lint mdm/jamf/evidify-config.mobileconfig

# Convert to JSON for inspection
plutil -convert json -o /tmp/evidify-profile.json mdm/jamf/evidify-config.mobileconfig
cat /tmp/evidify-profile.json | jq .
```

**Expected:**
- [ ] `plutil -lint` returns OK
- [ ] JSON conversion succeeds
- [ ] Contains PayloadContent array
- [ ] Contains TCC permissions for Microphone

### 3.2 Jamf Post-Install Script

**Test:** Script syntax check
```bash
# Syntax check
bash -n mdm/jamf/postinstall.sh

# Dry run (won't execute, just shows what would happen)
bash -x mdm/jamf/postinstall.sh 2>&1 | head -50
```

**Expected:**
- [ ] No syntax errors
- [ ] Script attempts to check Ollama
- [ ] Script creates default policy if missing

### 3.3 Intune PowerShell Script

**Test:** Script syntax check (if on Windows or with PowerShell Core)
```powershell
# Syntax check
$script = Get-Content mdm/intune/Install-Evidify.ps1 -Raw
[System.Management.Automation.PSParser]::Tokenize($script, [ref]$null)
```

**Or validate structure:**
```bash
# Check for required sections
grep -n "Configuration" mdm/intune/Install-Evidify.ps1
grep -n "Deploy Policy" mdm/intune/Install-Evidify.ps1
grep -n "Check Ollama" mdm/intune/Install-Evidify.ps1
```

**Expected:**
- [ ] No syntax errors
- [ ] Contains installation logic
- [ ] Contains policy deployment
- [ ] Contains Defender exclusions

### 3.4 MDM Documentation

**Test:** Review README completeness
```bash
cat mdm/README.md
```

**Expected:**
- [ ] Jamf Pro instructions complete
- [ ] Intune instructions complete
- [ ] Policy reference table present
- [ ] Troubleshooting section present

---

## 4. Performance Optimization

### 4.1 Backend Cache

**Test:** Cache operations via Tauri commands
```typescript
import { getPerformanceStats, clearCaches } from './lib/tauri';

// Get initial stats
const stats1 = await getPerformanceStats();
console.log('Initial stats:', stats1);

// Clear caches
await clearCaches();

// Get stats after clear
const stats2 = await getPerformanceStats();
console.log('After clear:', stats2);
```

**Expected:**
- [ ] `getPerformanceStats` returns valid object
- [ ] Contains `cache`, `memory`, `pending_background_tasks`
- [ ] `clearCaches` completes without error
- [ ] Cache entries = 0 after clear

### 4.2 Database Optimization

**Test:** Trigger optimization
```typescript
import { optimizeDatabase } from './lib/tauri';

await optimizeDatabase();
console.log('Database optimized');
```

**Expected:**
- [ ] Command completes without error
- [ ] No visible delay (runs in background)

### 4.3 Paginated Notes

**Test:** Fetch notes with pagination
```typescript
import { getNotesPaginated } from './lib/tauri';

// First page
const page1 = await getNotesPaginated(1, 10);
console.log('Page 1:', page1);

// Second page (if exists)
if (page1.has_next) {
  const page2 = await getNotesPaginated(2, 10);
  console.log('Page 2:', page2);
}
```

**Expected:**
- [ ] Returns `PaginatedResponse` structure
- [ ] `page`, `page_size`, `total_count` present
- [ ] `has_next`, `has_prev` booleans work

### 4.4 Frontend Cache

**Test:** FrontendCache utility
```typescript
import { FrontendCache } from './lib/performance';

const cache = new FrontendCache<string>(10, 5000); // 10 items, 5s TTL

// Set and get
cache.set('key1', 'value1');
console.log(cache.get('key1')); // 'value1'

// Wait for expiry
setTimeout(() => {
  console.log(cache.get('key1')); // null (expired)
}, 6000);
```

**Expected:**
- [ ] Set/get works immediately
- [ ] Returns null after TTL expires
- [ ] Stats show correct entry count

### 4.5 Debounce/Throttle

**Test:** Timing utilities
```typescript
import { debounce, throttle } from './lib/performance';

const debouncedFn = debounce(() => console.log('debounced'), 300);
const throttledFn = throttle(() => console.log('throttled'), 300);

// Rapid calls
for (let i = 0; i < 10; i++) {
  debouncedFn(); // Should only log once after 300ms
  throttledFn(); // Should log ~3-4 times over 300ms
}
```

**Expected:**
- [ ] Debounce logs once after delay
- [ ] Throttle logs at interval

### 4.6 Lazy Loader

**Test:** Lazy loading utility
```typescript
import { createLazyLoader } from './lib/performance';

const loader = createLazyLoader(
  async (page) => {
    // Mock API
    return {
      data: [`item-${page}-1`, `item-${page}-2`],
      page,
      pageSize: 2,
      totalCount: 10,
      totalPages: 5,
      hasNext: page < 5,
      hasPrev: page > 1,
    };
  },
  { onLoad: (items) => console.log('Loaded:', items) }
);

// Load first page
await loader.loadNext();
console.log(loader.getState()); // { isLoading: false, hasMore: true, currentPage: 2 }
```

**Expected:**
- [ ] First page loads
- [ ] State updates correctly
- [ ] `hasMore` reflects pagination

### 4.7 Virtual List

**Test:** Virtual list calculations
```typescript
import { calculateVirtualList } from './lib/performance';

const result = calculateVirtualList(1000, 500, {
  itemHeight: 50,
  overscan: 5,
  containerHeight: 400,
});

console.log(result);
// { startIndex: 5, endIndex: 23, offsetY: 250, visibleCount: 8 }
```

**Expected:**
- [ ] `startIndex` accounts for scroll and overscan
- [ ] `endIndex` bounded by total items
- [ ] `offsetY` equals `startIndex * itemHeight`

### 4.8 Memoization

**Test:** Memoize utility
```typescript
import { memoize } from './lib/performance';

let callCount = 0;
const expensive = memoize((n: number) => {
  callCount++;
  return n * 2;
});

expensive(5); // Computes
expensive(5); // Cached
expensive(5); // Cached
console.log(callCount); // 1
```

**Expected:**
- [ ] Function called once for same args
- [ ] Different args trigger new computation

---

## 5. Integration Tests

### 5.1 Full Onboarding → Policy Flow

1. Start app fresh (clear localStorage)
2. Complete onboarding wizard
3. Navigate to Policy Settings
4. Modify export policy
5. Export policy JSON
6. Reload app
7. Verify policy persists (if saved)

**Expected:**
- [ ] Flow completes without errors
- [ ] Settings accessible after onboarding

### 5.2 Performance Under Load

1. Create 100+ test notes (via console/script)
2. Check performance stats
3. Verify cache hit rate increases with repeated queries
4. Test paginated loading in UI

**Expected:**
- [ ] No UI freezing
- [ ] Cache hit rate > 50% after warm-up
- [ ] Pagination works with large datasets

---

## 6. Known Limitations

1. **Policy persistence:** Currently exports to JSON file; actual save command not implemented
2. **Voice status check:** `get_voice_status` may not exist, onboarding handles gracefully
3. **Background tasks:** Placeholder implementation, actual indexing not wired up
4. **Windows memory stats:** Requires winapi crate features

---

## 7. Test Sign-Off

| Area | Tester | Date | Pass/Fail |
|------|--------|------|-----------|
| Policy UI | | | |
| Onboarding | | | |
| MDM Jamf | | | |
| MDM Intune | | | |
| Performance Backend | | | |
| Performance Frontend | | | |
| Integration | | | |

**Notes:**

---

**Ready for Beta:** ⬜ Yes / ⬜ No

**Blocking Issues:**

**Reviewer Sign-off:**
