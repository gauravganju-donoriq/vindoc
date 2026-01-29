

# Plan: Update Landing Page with New Features

## Overview

Add the newly implemented Roadside Assistance and Parts Request features to the landing page, maintaining the existing "Polished Minimal" design aesthetic and benefit-driven, human-first messaging tone.

---

## Content Analysis

### Existing Tone & Pattern
- **Headlines**: Short, action-oriented (e.g., "Smart Reminders", "All Documents in One Place")
- **Descriptions**: 1-2 sentences max, focus on user benefit not technical details
- **Language**: No em dashes, conversational, focuses on "peace of mind" and "convenience"
- **Badges**: "Coming Soon" for features not fully launched

### New Features to Highlight

1. **Roadside Assistance** - Request help when stranded, get assigned a helper
2. **Parts Request** - Request used or OEM parts, get quotes from VinDoc network

---

## Changes Summary

### 1. FeaturesGrid.tsx Updates

Add two new feature cards for the new capabilities:

| Feature | Title | Description | Badge |
|---------|-------|-------------|-------|
| Roadside Assistance | "Help When You Need It" | "Stranded on the road? Request roadside assistance and get connected to verified help in minutes." | None (feature is live) |
| Parts Request | "Find Parts, Skip the Hassle" | "Need a spare part? Request used or OEM parts and get quotes delivered to you. No dealer runs." | None (feature is live) |

**Grid Layout Adjustment:**
- Current: 6 features in a 3-column grid
- New: 8 features, reorganize for visual balance
- Move some single-column features to maintain visual harmony

### 2. TrustSection.tsx Updates

**Add to "Why Choose Us" list:**
- "Roadside assistance on demand"
- "Easy parts sourcing for repairs"

**Update Trust Badges:**
- Add "Roadside Help" badge with LifeBuoy or Wrench icon

**Add new FAQ:**
- "How does roadside assistance work?"
- "Can I request vehicle parts through VinDoc?"

### 3. BeforeAfter.tsx Updates

Add a new comparison point highlighting the assistance features:

**Without VinDoc:** "Scrambling for help when stranded"
**With VinDoc:** "One tap to request roadside assistance"

---

## File Changes

| File | Action | Changes |
|------|--------|---------|
| `src/components/landing/FeaturesGrid.tsx` | Update | Add 2 new feature cards, adjust grid layout |
| `src/components/landing/TrustSection.tsx` | Update | Add trust badges, FAQ items, "why choose" points |
| `src/components/landing/BeforeAfter.tsx` | Update | Add assistance-related comparison items |

---

## New Feature Cards (Exact Copy)

### Roadside Assistance Card
```text
Icon: LifeBuoy (from lucide-react)
Title: Help When You Need It
Description: Stranded on the road? Request roadside assistance and get connected to verified help in minutes.
Badge: None (live feature)
```

### Parts Request Card
```text
Icon: Wrench (from lucide-react)
Title: Find Parts, Skip the Hassle
Description: Need a spare part? Request used or OEM parts and get quotes delivered to you. No dealer runs.
Badge: None (live feature)
```

---

## Updated Grid Layout

The features grid will be reorganized to accommodate 8 features:

```text
Row 1: [Roadside Assistance (2 cols)] [Documents (1 col)]
Row 2: [Smart Reminders (1 col)] [Parts Request (1 col)] [Vehicle Profiles (1 col)]
Row 3: [Expert Inspections (1 col)] [Sell Direct (2 cols)]
Row 4: [Verified Seller (2 cols)] [Placeholder or remove]
```

Alternative (cleaner):
```text
Row 1: [Roadside Assistance (1 col)] [Parts Request (1 col)] [Documents (1 col)]
Row 2: [Smart Reminders (1 col)] [Vehicle Profiles (1 col)] [Expert Inspections (1 col)]
Row 3: [Sell Direct (2 cols)] [Verified Seller (1 col)]
```

---

## Updated Trust Section

### New Trust Badge
```text
Icon: LifeBuoy
Label: Roadside Help
```

### New "Why Choose" Points
- "Roadside assistance on demand"
- "Easy parts sourcing for repairs"

### New FAQ Items
```text
Q: How does roadside assistance work?
A: Simply open VinDoc, select your vehicle, and tap "Request Assistance." Describe your situation and location, and we'll connect you with verified help nearby.

Q: Can I request vehicle parts through VinDoc?
A: Yes! You can request used or OEM parts for any of your vehicles. Our team sources quotes from trusted vendors and delivers them to you.
```

---

## Updated Before/After Section

### Add New Comparison Items

**Before (Without VinDoc):**
- Existing items remain
- Add: "Scrambling for help when stranded" (icon: PhoneOff or AlertTriangle)

**After (With VinDoc):**
- Existing items remain
- Add: "One tap to request roadside help" (icon: LifeBuoy or Phone)

---

## Design Consistency Checklist

- No em dashes used in any text
- All descriptions under 25 words
- Icons from lucide-react only
- Gray color scheme maintained
- No "Coming Soon" badge on live features
- Benefit-focused language (what user gets, not what feature does)

---

## Implementation Order

1. Update `FeaturesGrid.tsx` with new feature cards
2. Update `TrustSection.tsx` with trust badges, FAQ, and "why choose" list
3. Update `BeforeAfter.tsx` with new comparison points
4. Test visual layout on desktop and mobile

