

# Plan: Rebrand from "Valt" to "VinDoc"

## Brand Transformation

**Old Brand:** Valt (implies "vault" - secure storage)
**New Brand:** VinDoc (vindoc.app) - Vehicle + Documents combined

The new name "VinDoc" is cleaner and more descriptive - it immediately communicates what the app does: managing vehicle documents.

---

## All Files Requiring Changes

| File | Current Branding | Changes Required |
|------|-----------------|------------------|
| `index.html` | Title, meta tags, OG tags | Update all "Valt" references to "VinDoc" |
| `src/pages/Index.tsx` | Header logo, footer, solution section | Update brand name in 3 locations |
| `src/pages/Auth.tsx` | Card title, welcome toast, card descriptions | Update brand name and taglines |
| `src/pages/Dashboard.tsx` | Header logo text | Update brand name |
| `src/pages/AddVehicle.tsx` | Header logo text | Update brand name |
| `src/pages/VehicleDetails.tsx` | Header logo text | Update brand name |
| `src/pages/StyleGuide.tsx` | Header, brand section | Update brand name and descriptions |

---

## Branding Changes Detail

### 1. index.html (Meta & SEO)

**Current:**
```html
<title>Valt – Secure Vehicle Vault</title>
<meta name="description" content="Your secure vault for vehicle documents...">
<meta name="author" content="Valt">
<meta property="og:title" content="Valt – Secure Vehicle Vault">
```

**New:**
```html
<title>VinDoc – Your Vehicle Documents, Simplified</title>
<meta name="description" content="AI-powered vehicle document management. Store, track, and never miss a renewal again.">
<meta name="author" content="VinDoc">
<meta property="og:title" content="VinDoc – Your Vehicle Documents, Simplified">
<meta property="og:description" content="AI-powered vehicle document management. Store, track, and never miss a renewal again.">
```

### 2. src/pages/Index.tsx (Landing Page)

**Header Logo (line 94):**
- `Valt` → `VinDoc`

**Solution Section (line 173):**
- "Valt keeps all your vehicle documents..." → "VinDoc keeps all your vehicle documents..."

**Footer (line 305):**
- `Valt` → `VinDoc`

### 3. src/pages/Auth.tsx (Login/Signup)

**Card Title (line 128):**
- `Valt` → `VinDoc`

**Welcome Toast (line 101):**
- "Welcome to Valt." → "Welcome to VinDoc!"

**Card Descriptions (lines 131-132):**
- "Sign in to your secure vault" → "Sign in to your account"
- "Create your secure vault" → "Create your account"

(Moving away from "vault" terminology since the new brand doesn't use it)

### 4. src/pages/Dashboard.tsx (Main App Header)

**Header Logo (line 171):**
- `Valt` → `VinDoc`

### 5. src/pages/AddVehicle.tsx (Add Vehicle Page)

**Header Logo (line 244):**
- `Valt` → `VinDoc`

### 6. src/pages/VehicleDetails.tsx (Vehicle Details Page)

**Header Logo (line 749):**
- `Valt` → `VinDoc`

### 7. src/pages/StyleGuide.tsx (Design System)

**Header (line 80):**
- `Valt` → `VinDoc`

**Brand Section (line 101):**
- `Valt` → `VinDoc`

**Tagline (line 102):**
- "Your secure vault for vehicle documents..." → "AI-powered vehicle document management for Indian vehicle owners"

---

## Updated Taglines

Since "VinDoc" doesn't have "vault" in the name, the messaging should shift:

| Location | Old Copy | New Copy |
|----------|----------|----------|
| Meta description | "Your secure vault for vehicle documents..." | "AI-powered vehicle document management. Store, track, and never miss a renewal." |
| Auth - Sign in | "Sign in to your secure vault" | "Sign in to your account" |
| Auth - Sign up | "Create your secure vault" | "Create your account" |
| StyleGuide tagline | "Your secure vault for vehicle documents, service records, and ownership transfers" | "AI-powered vehicle document management for Indian vehicle owners" |

---

## Logo Considerations

The current logo uses the `Shield` icon from Lucide React. This still works well for VinDoc because:
- Shield implies security and protection
- Documents need to be secure
- Maintains visual continuity

The icon will remain unchanged - only the text changes from "Valt" to "VinDoc".

---

## Technical Summary

| File | Lines to Modify |
|------|-----------------|
| `index.html` | Lines 6, 7, 8, 10, 11 |
| `src/pages/Index.tsx` | Lines 94, 173, 305 |
| `src/pages/Auth.tsx` | Lines 101, 128, 131, 132 |
| `src/pages/Dashboard.tsx` | Line 171 |
| `src/pages/AddVehicle.tsx` | Line 244 |
| `src/pages/VehicleDetails.tsx` | Line 749 |
| `src/pages/StyleGuide.tsx` | Lines 80, 101, 102 |

**Total: 7 files, ~15 text changes**

---

## Brand Identity Summary

| Aspect | Before | After |
|--------|--------|-------|
| **Name** | Valt | VinDoc |
| **Domain** | - | vindoc.app |
| **Logo Icon** | Shield | Shield (unchanged) |
| **Tagline** | "Secure Vehicle Vault" | "Your Vehicle Documents, Simplified" |
| **Core Message** | Security/vault focus | Simplicity/AI-powered |
| **Color Palette** | Unchanged | Unchanged |
| **Typography** | Unchanged | Unchanged |

