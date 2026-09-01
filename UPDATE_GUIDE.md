# Application Update Guide

A comprehensive guide for managing updates across DisasterLens — from end-user installation to developer workflows to UI/UX transitions.

---

## Table of Contents

1. [Section 1: End-User Instructions](#section-1-end-user-instructions)
2. [Section 2: Developer Best Practices](#section-2-developer-best-practices)
3. [Section 3: Managing UI/UX Transitions](#section-3-managing-uiux-transitions)

---

## Section 1: End-User Instructions

### 1.1 Installing Updates

#### Option A: Web Application (Cloud-Hosted)

DisasterLens is deployed via Vercel. Updates are applied automatically when new code is pushed to the `main` branch. No action is required from end-users — the latest version is always live at the deployed URL.

#### Option B: Local Development Environment

If you are running DisasterLens locally, follow these steps to update:

**Step 1 — Pull the latest changes**

```bash
cd DisasterLens
git pull origin main
```

**Step 2 — Install updated dependencies**

```bash
npm install
```

This reads `package.json` and `package-lock.json` to install or update any changed packages.

**Step 3 — Rebuild the application**

```bash
npm run build
```

A successful build confirms the updated code compiles without errors.

**Step 4 — Start the development server**

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to verify the update.

**Step 5 — Re-seed the database (if schema changed)**

If the update includes database changes, re-seed the data:

```
GET http://localhost:3000/api/seed
```

Or click the **"Initialize Database"** button on the landing page.

### 1.2 Verifying Successful Installation

Perform these checks after every update:

| Check | Command / Action | Expected Result |
|-------|-----------------|-----------------|
| Build passes | `npm run build` | Exits with code 0, no errors |
| Dev server starts | `npm run dev` | Server running on port 3000 |
| Landing page loads | Visit `localhost:3000` | Hero section, feature cards, and navbar render correctly |
| Login works | Enter credentials at `/login` | Redirects to role-appropriate dashboard |
| SOS creation works | Submit SOS form on victim dashboard | Signal appears in rescuer grid with AI triage score |
| Map renders | Check tactical map on rescuer dashboard | Dark-themed Leaflet map with markers displays |

### 1.3 Troubleshooting Common Issues

#### "Module not found" errors

```bash
rm -rf node_modules
npm install
```

Clearing `node_modules` and reinstalling resolves most dependency mismatches.

#### Build fails after pulling updates

Check that your Node.js version matches the project requirement:

```bash
node --version   # Requires Node.js 18+
```

If using an older version, upgrade via [nvm](https://github.com/nvm-sh/nvm):

```bash
nvm install 18
nvm use 18
```

#### Database errors (JSON store)

If `data_store.json` is corrupted or missing fields after an update:

```
GET http://localhost:3000/api/seed
```

This resets the database with fresh demo data.

#### Map not rendering

Ensure you have an active internet connection. Leaflet loads map tiles from CartoDB CDN. If tiles fail to load in a corporate network, check proxy settings or firewall rules blocking `basemaps.cartocdn.com`.

#### Port 3000 already in use

```bash
npx kill-port 3000
npm run dev
```

---

## Section 2: Developer Best Practices

### 2.1 Updating Source Code

#### Git Workflow

Follow a feature-branch workflow to keep `main` stable:

```bash
# Create a feature branch
git checkout -b feature/update-color-scheme

# Make changes, commit atomically
git add -A
git commit -m "refactor: migrate color palette to CSS custom properties"

# Push and open a pull request
git push -u origin feature/update-color-scheme
```

**Commit message conventions:**

| Prefix | Purpose |
|--------|---------|
| `feat:` | New feature |
| `fix:` | Bug fix |
| `refactor:` | Code restructuring without behavior change |
| `style:` | CSS/visual changes only |
| `docs:` | Documentation updates |
| `chore:` | Dependency updates, config changes |

#### Changelog Discipline

Maintain a `CHANGELOG.md` at the project root. For each release, document:

- What changed and why
- Breaking changes (if any)
- Migration steps users or developers must follow

### 2.2 Managing Dependencies

#### Routine Dependency Updates

```bash
# Check for outdated packages
npm outdated

# Update all packages within semver range
npm update

# Update a specific package
npm install next@latest
```

#### Security Audits

```bash
npm audit
npm audit fix
```

Run this regularly and before every release. Address critical vulnerabilities immediately.

#### Lock File Hygiene

- **Always commit `package-lock.json`** — it ensures deterministic installs across environments.
- Never manually edit `package-lock.json`. Let npm manage it.
- If `package-lock.json` and `node_modules` diverge, delete both and reinstall:

```bash
rm -rf node_modules package-lock.json
npm install
```

#### Version Pinning Strategy

| Package Type | Strategy |
|-------------|----------|
| Core framework (next, react) | Pin to exact minor version (e.g., `16.2.1`) |
| Utility libraries (lucide-react, leaflet) | Allow patch updates (`^1.9.4`) |
| Dev tools (eslint, typescript) | Allow minor updates (`^5.0.0`) |

### 2.3 Automated Deployment Workflows

#### CI/CD Pipeline (Vercel + GitHub Actions)

DisasterLens deploys via Vercel's GitHub integration. On every push to `main`:

1. Vercel runs `next build`
2. If the build succeeds, the update goes live
3. Preview deployments are created for pull requests

#### Adding a CI Gate

For additional checks before merging, create `.github/workflows/ci.yml`:

```yaml
name: CI
on: [push, pull_request]
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 18
      - run: npm ci
      - run: npm run build
      - run: npm run lint
```

This ensures every push compiles and passes linting before merge.

#### Rollback Procedure

If a deployed update introduces issues:

1. **Immediate rollback:** Revert to the last working commit on `main`:

```bash
git revert HEAD
git push origin main
```

Vercel auto-deploys the revert, restoring the previous version.

2. **Rollback a dependency:**

```bash
npm install next@16.2.0
git add package.json package-lock.json
git commit -m "chore: rollback next to 16.2.0"
git push
```

---

## Section 3: Managing UI/UX Transitions

### 3.1 Strategy for Interface Changes

UI updates carry high user-facing risk. Follow these principles to minimize friction:

**Incremental delivery.** Ship changes in small, reviewable batches rather than a single large overhaul. Each batch should be visually coherent on its own.

**Preserve muscle memory.** Keep interactive elements (buttons, navigation, forms) in familiar positions. Change their appearance, not their location.

**Maintain visual consistency.** Use a single source of truth for colors, typography, and spacing. In DisasterLens, this means CSS custom properties in `globals.css` rather than scattered inline values.

**Test across roles.** Every visual change must be verified from both the Victim dashboard (`/victim`) and the Rescuer dashboard (`/rescuer`), since each has distinct components and layouts.

### 3.2 Maintaining Visual Consistency

#### Design Tokens via CSS Custom Properties

Centralize all visual values in `globals.css` under `:root`:

```css
:root {
  /* Primary palette */
  --color-primary: #7c3aed;
  --color-primary-hover: #6d28d9;

  /* Status colors */
  --color-critical: #ef4444;
  --color-high: #f97316;
  --color-medium: #eab308;
  --color-success: #10b981;

  /* Typography */
  --font-display: 'Outfit', sans-serif;
  --font-body: 'Inter', sans-serif;

  /* Spacing scale */
  --space-xs: 0.25rem;
  --space-sm: 0.5rem;
  --space-md: 1rem;
  --space-lg: 1.5rem;
  --space-xl: 2rem;
}
```

#### Component-Level Consistency

When updating a component (e.g., buttons), update all variants at once:

| Variant | Current State | Updated State |
|---------|--------------|---------------|
| Primary CTA | Purple gradient | Solid primary color with hover state |
| Dispatch button | Amber gradient | Amber solid with rounded corners |
| Resolve button | Emerald gradient | Green solid matching status palette |

#### Cross-Role Audit Checklist

Before merging any UI change:

- [ ] Landing page (`/`) renders correctly
- [ ] Login page (`/login`) form and button styles match
- [ ] Victim dashboard (`/victim`) SOS form, map, and chat panel are consistent
- [ ] Rescuer dashboard (`/rescuer`) SOS grid, map, triage panel, and comms tab match
- [ ] Dark map tiles still contrast well with updated marker colors
- [ ] Responsive behavior is maintained (no layout breaks at common widths)

---

### 3.3 Case Study: Lohith's Frontend Overhaul

> **Developer:** Lohith
> **Goal:** Modernize the DisasterLens interface — update the color scheme, redesign buttons, and implement modern typography.
> **Scope:** `globals.css`, `src/app/page.tsx`, `src/app/login/page.tsx`, `src/app/victim/page.tsx`, `src/app/rescuer/page.tsx`, `src/components/Map.tsx`

#### Phase 1: Updating the Color Scheme

**Problem:** The current palette uses hardcoded hex values scattered across `globals.css` and inline styles in page components. This makes global color changes fragile and error-prone.

**Approach:**

Lohith begins by auditing every color reference across the codebase. He uses grep to find all hex values:

```bash
grep -rn "#[0-9a-fA-F]\{6\}" src/app/globals.css
```

He then consolidates all colors into CSS custom properties in `globals.css`:

```css
:root {
  --color-bg-primary: #0a0a0f;
  --color-bg-secondary: #111119;
  --color-bg-card: #1a1a2e;
  --color-text-primary: #e2e8f0;
  --color-text-secondary: #94a3b8;
  --color-accent-purple: #7c3aed;
  --color-accent-gold: #fbbf24;
  --color-accent-emerald: #10b981;
  --color-status-pending: #ef4444;
  --color-status-dispatched: #f59e0b;
  --color-status-resolved: #10b981;
}
```

**Migration steps:**

1. Replace all hardcoded `#7c3aed` references with `var(--color-accent-purple)` across `globals.css` (shimmer animation, glow effects, button gradients)
2. Update `Map.tsx` marker colors to reference CSS variables instead of inline hex values
3. Verify the dark map tiles still provide sufficient contrast against the new marker colors

**Result:** A single file change in `:root` now controls the entire application palette. Future color updates require editing one location.

#### Phase 2: Redesigning Buttons

**Problem:** Buttons use inline gradient styles and inconsistent sizing across pages. The login page, victim dashboard, and rescuer dashboard each define button styles independently.

**Approach:**

Lohith defines a unified button system in `globals.css`:

```css
.btn-primary {
  background: var(--color-accent-purple);
  color: white;
  padding: 0.75rem 1.5rem;
  border-radius: 0.75rem;
  font-family: var(--font-display);
  font-weight: 600;
  transition: all 0.2s ease;
}

.btn-primary:hover {
  background: var(--color-accent-purple-hover);
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(124, 58, 237, 0.4);
}

.btn-dispatch {
  background: var(--color-status-dispatched);
  /* ... */
}

.btn-resolve {
  background: var(--color-status-resolved);
  /* ... */
}
```

**Migration steps:**

1. Audit all `<button>` elements in `login/page.tsx`, `victim/page.tsx`, and `rescuer/page.tsx`
2. Replace inline `style={{ background: 'linear-gradient(...)' }}` with semantic class names
3. Ensure the "TRANSMIT SOS" button on the victim dashboard retains its visual prominence as the primary action
4. Verify button hover states, focus outlines (for accessibility), and active states all work across both dashboards

**Result:** Buttons are now consistent in size, spacing, and interaction behavior. A developer changing button appearance edits one CSS block, not five scattered inline styles.

#### Phase 3: Implementing Modern Typography

**Problem:** The current setup loads Outfit and Inter via Google Fonts CDN but uses inconsistent sizing and weight across components. Some headings use Tailwind's default `text-2xl` while others use custom `font-size` values.

**Approach:**

Lohith establishes a typographic scale in `globals.css`:

```css
:root {
  --font-display: 'Outfit', sans-serif;
  --font-body: 'Inter', sans-serif;

  --text-hero: 3.5rem;
  --text-h1: 2.5rem;
  --text-h2: 1.75rem;
  --text-h3: 1.25rem;
  --text-body: 1rem;
  --text-small: 0.875rem;

  --weight-regular: 400;
  --weight-medium: 500;
  --weight-semibold: 600;
  --weight-bold: 700;
}
```

**Migration steps:**

1. Update `page.tsx` (landing page) hero heading to use `var(--text-hero)` and `var(--font-display)`
2. Update section headings across all pages to use the defined scale
3. Ensure body text uses `var(--font-body)` at `var(--text-body)` for readability
4. Verify the AI triage explanation text on the rescuer dashboard remains readable at its smaller size
5. Test that the font loading via Google Fonts CDN (`<link>` in `layout.tsx`) still loads both families correctly

**Result:** A consistent 6-level typographic hierarchy is enforced across all pages. New components inherit the scale automatically.

#### Phase 4: Verification

After completing all three phases, Lohith runs the full verification checklist:

| Check | Status |
|-------|--------|
| `npm run build` succeeds | Verified |
| Landing page renders with new colors, buttons, and typography | Verified |
| Login page form matches updated design system | Verified |
| Victim dashboard SOS form, map, and chat panel are visually consistent | Verified |
| Rescuer dashboard SOS grid, triage panel, and map markers use new palette | Verified |
| Leaflet dark map tiles contrast with updated marker colors | Verified |
| Buttons have consistent sizing and hover behavior across all pages | Verified |
| Typography scale is applied uniformly; no orphaned font-size values | Verified |
| Accessibility: focus outlines visible on all interactive elements | Verified |

#### Key Takeaways from Lohith's Approach

1. **Centralize first.** CSS custom properties turned a 5-file color migration into a single-file define, then reference everywhere.
2. **Component-level, not page-level.** Updating buttons as a shared system prevented the login page from drifting out of sync with the dashboards.
3. **Verify across roles.** DisasterLens has two distinct dashboards — Lohith checked both after every phase to catch inconsistencies early.
4. **Preserve function.** The overhaul changed appearance only. SOS form logic, map behavior, chat polling, and triage scoring were untouched — reducing risk.

---

*Guide maintained by the DisasterLens team. Last updated: June 2026.*
