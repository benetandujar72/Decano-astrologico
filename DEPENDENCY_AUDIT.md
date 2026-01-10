# Dependency Audit Report
**Date:** 2026-01-10
**Project:** Decano Astrológico (gem-core:-benet-interface)
**Total Dependencies:** 433 (284 production, 149 dev)

---

## 🔒 Security Analysis

### ✅ Security Status: EXCELLENT
- **Total Vulnerabilities:** 0
- **Critical:** 0
- **High:** 0
- **Moderate:** 0
- **Low:** 0

**Recommendation:** No immediate security actions required. Continue monitoring with `npm audit` regularly.

---

## 📦 Outdated Packages

The following packages have updates available:

### Production Dependencies

| Package | Current | Wanted | Latest | Update Type |
|---------|---------|--------|--------|-------------|
| `@google/genai` | 1.31.0 | 1.35.0 | 1.35.0 | Minor (4 versions) |
| `lucide-react` | 0.556.0 | 0.562.0 | 0.562.0 | Patch (6 versions) |
| `react` | 19.2.1 | 19.2.3 | 19.2.3 | Patch |
| `react-dom` | 19.2.1 | 19.2.3 | 19.2.3 | Patch |
| `recharts` | 3.5.1 | 3.6.0 | 3.6.0 | Minor |
| `serve` | 14.2.1 | 14.2.5 | 14.2.5 | Patch |

**Priority:** Medium - These are minor/patch updates that should be safe to apply.

---

## 🗑️ Unused Dependencies (Bloat Analysis)

### ❌ REMOVE - Confirmed Unused

**1. `@stripe/react-stripe-js` (5.4.1)**
   - **Reason:** Not imported in any source file
   - **Impact:** The app uses Stripe Checkout redirect flow via backend API
   - **Savings:** ~45KB minified
   - **Files checked:** All `.ts`, `.tsx`, `.js`, `.jsx` files
   - **Alternative:** Backend handles Stripe via `backend/app/services/stripe_service.py`

**2. `@stripe/stripe-js` (8.5.3)**
   - **Reason:** Not imported in any source file
   - **Impact:** Redundant with redirect-based payment flow
   - **Savings:** ~55KB minified
   - **Usage pattern:** App redirects to Stripe Checkout instead of using embedded Stripe Elements

**Total Savings:** ~100KB minified, reduced dependency tree complexity

### ✅ KEEP - False Positives (Correctly Used)

The following were flagged by `depcheck` but are **actively used**:

| Package | Actual Usage |
|---------|--------------|
| `serve` | Used in `package.json` scripts: `"start": "serve -s dist -l 3000"` |
| `tailwindcss` | Required by `tailwind.config.js` |
| `@tailwindcss/postcss` | Used in `postcss.config.js` |
| `autoprefixer` | Used in `postcss.config.js` |
| `postcss` | Build-time CSS processing |
| `typescript` | Required for all `.tsx` and `.ts` files |

---

## 📊 Dependency Statistics

- **Total packages:** 433
  - Production: 284
  - Development: 149
  - Optional: 73
- **Duplicate packages:** 0 (no deduplication issues)
- **Extraneous packages:** 0

---

## 🎯 Recommendations

### Priority 1: Remove Unused Dependencies (Immediate)
```bash
npm uninstall @stripe/react-stripe-js @stripe/stripe-js
```
**Impact:**
- Reduces bundle size by ~100KB
- Simplifies dependency tree
- Removes potential security surface area
- Faster `npm install` times

### Priority 2: Update Outdated Packages (This Week)

**Low-risk updates (patches):**
```bash
npm update react react-dom lucide-react serve
```

**Medium-risk updates (review changelogs first):**
```bash
# Review Google GenAI v1.35.0 changelog before updating
npm install @google/genai@latest

# Review Recharts v3.6.0 changelog
npm install recharts@latest
```

### Priority 3: Ongoing Maintenance

1. **Monthly Audits:** Run `npm audit` and `npm outdated` monthly
2. **Automated Updates:** Consider using Dependabot or Renovate for automated PR updates
3. **Lock File:** Ensure `package-lock.json` is committed for reproducible builds

---

## 🔍 Notes on Dependency Analysis Tools

- **`depcheck`** produced false positives for build-time dependencies (PostCSS, Tailwind, TypeScript, etc.)
- **Recommendation:** Always verify depcheck results by:
  1. Searching imports in source files
  2. Checking configuration files (postcss.config.js, tailwind.config.js, etc.)
  3. Reviewing package.json scripts

---

## ✅ Action Items

- [ ] Remove `@stripe/react-stripe-js` and `@stripe/stripe-js`
- [ ] Update React and React-DOM to 19.2.3
- [ ] Update lucide-react to 0.562.0
- [ ] Update serve to 14.2.5
- [ ] Review Google GenAI v1.35.0 changelog and update
- [ ] Review Recharts v3.6.0 changelog and update
- [ ] Set up automated dependency monitoring (Dependabot/Renovate)
- [ ] Schedule monthly dependency audits

---

## 📝 Additional Observations

### Positive Aspects
✅ Zero security vulnerabilities
✅ Modern React 19.2.x
✅ Up-to-date Vite 6.2.0
✅ Recent TypeScript 5.8.2
✅ No duplicate dependencies

### Areas for Improvement
⚠️ Some minor/patch updates pending (low priority)
⚠️ Two unused Stripe packages adding bloat

### Overall Health: **9/10**
The dependency health is excellent with zero vulnerabilities and minimal technical debt.
