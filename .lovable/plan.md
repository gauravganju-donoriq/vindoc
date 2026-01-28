

# Vehicle Details Page Redesign Plan

## Current State Analysis

The current VehicleDetails page has:
- **1,330 lines** of code with 8+ collapsible SectionCard components
- **Excessive vertical scrolling** - users must scroll through multiple stacked cards
- **Shadow-heavy card design** with default Tailwind shadows
- **Unused horizontal real estate** - content constrained to `max-w-4xl` (56rem)
- **Repetitive card patterns** - each section uses the same collapsible Card wrapper

### Current Sections (in order):
1. Vehicle Header Card (registration, manufacturer, quick info)
2. Verification Progress Card
3. Vehicle Verification Section Card
4. Vehicle Identity (SectionCard)
5. Technical Specifications (SectionCard)
6. Ownership & Finance (SectionCard)
7. Document Expiry Status (SectionCard)
8. Document Repository (SectionCard)
9. Service History (separate Card component)
10. Activity History (separate Card component)

---

## Proposed Redesign

### Design Principles

| Principle | Implementation |
|-----------|----------------|
| Fluid layout | Remove `max-w-4xl`, use responsive grid |
| White backgrounds | `bg-white` for content areas |
| Gray borders only | `border border-gray-200`, no shadows |
| Tabbed interface | Consolidate sections into tabs |
| Tailored components | Custom inline layouts, not generic cards |
| Better real estate use | Two-column layout on desktop |

---

### New Layout Structure

```text
+----------------------------------------------------------+
|  HEADER (Valt branding + Back button)                    |
+----------------------------------------------------------+
|                                                          |
|  +----------------------------------------------------+  |
|  |  VEHICLE HERO SECTION (spans full width)           |  |
|  |  - Photo | Reg Number | Make/Model | Quick Stats   |  |
|  |  - Action buttons (Edit, Transfer, Refresh)        |  |
|  +----------------------------------------------------+  |
|                                                          |
|  +----------------------------------------------------+  |
|  |  TABS: Overview | Documents | Service | Activity   |  |
|  +----------------------------------------------------+  |
|                                                          |
|  TAB CONTENT AREA                                        |
|  +------------------------+---------------------------+  |
|  |  LEFT COLUMN           |  RIGHT COLUMN             |  |
|  |  (varies by tab)       |  (varies by tab)          |  |
|  +------------------------+---------------------------+  |
|                                                          |
+----------------------------------------------------------+
```

---

### Tab Structure

#### Tab 1: Overview (Default)
Two-column fluid grid containing:
- **Left**: Vehicle Identity + Technical Specifications  
- **Right**: Ownership & Finance + Document Expiry Status

All in a clean white panel with gray borders, no collapsibles.

#### Tab 2: Documents
- Verification section (photo upload)
- Verification progress checklist
- Document repository with upload

#### Tab 3: Service
- Service history timeline
- Add service button
- Summary stats (total spent, records, next due)

#### Tab 4: Activity
- Activity history log
- Timeline view of all events

---

### Visual Style Changes

| Element | Current | New |
|---------|---------|-----|
| Content wrapper | `max-w-4xl` | `max-w-6xl` (wider) |
| Card backgrounds | `bg-card` with shadows | `bg-white border border-border` |
| Section headers | Collapsible with icons | Clean inline headers, no collapse |
| Spacing | Multiple Cards with `mb-4` | Single white panel per tab |
| Typography | `text-2xl` headers | `text-lg font-medium` section headers |
| Buttons | Scattered across sections | Consolidated in header actions |

---

## Implementation Tasks

### Phase 1: Create Tab-Based Layout
1. **Modify `VehicleDetails.tsx`**:
   - Import and use Tabs component from `@/components/ui/tabs`
   - Remove all SectionCard wrappers
   - Create four TabsContent sections
   - Widen container from `max-w-4xl` to `max-w-6xl`

### Phase 2: Redesign Vehicle Hero
2. **Update the vehicle header section**:
   - Simplify to a clean white panel with gray border
   - Remove shadows
   - Keep registration, make/model, quick stats inline
   - Keep action buttons (Edit, Transfer, Refresh) in header

### Phase 3: Build Overview Tab
3. **Create inline Overview content**:
   - Two-column responsive grid (`grid-cols-1 lg:grid-cols-2`)
   - Left column: Vehicle Identity fields, Technical Specs
   - Right column: Ownership & Finance, Document Expiry
   - Use simple section dividers (border-b) instead of cards
   - Preserve edit mode functionality

### Phase 4: Build Documents Tab
4. **Consolidate document-related sections**:
   - Verification Progress (without card wrapper)
   - Vehicle Verification Section (photo upload)
   - Document Repository (upload + list)
   - All in one fluid white panel

### Phase 5: Build Service Tab
5. **Adapt ServiceHistory component**:
   - Remove outer Card wrapper when used in tab
   - Keep the timeline and summary stats
   - Add service button in tab header

### Phase 6: Build Activity Tab
6. **Adapt VehicleHistory component**:
   - Remove outer Card wrapper
   - Remove collapsible (always open in tab context)
   - Timeline view fills the space

### Phase 7: Style Refinements
7. **Update all panels to match design system**:
   - White backgrounds: `bg-white`
   - Gray borders: `border border-gray-200`
   - No shadows on cards
   - Consistent spacing with `p-6`

---

## Technical Details

### Files to Modify

| File | Changes |
|------|---------|
| `src/pages/VehicleDetails.tsx` | Major restructure - tabs, layout, remove SectionCards |
| `src/components/vehicle/ServiceHistory.tsx` | Add variant prop to remove Card wrapper |
| `src/components/vehicle/VehicleHistory.tsx` | Add variant prop to remove Card wrapper |
| `src/components/vehicle/VerificationProgress.tsx` | Add variant prop for inline mode |
| `src/components/vehicle/VehicleVerificationSection.tsx` | Add variant prop for inline mode |

### New Component Props

Components will accept an optional `variant?: "card" | "inline"` prop:
- `card` (default): Current behavior with Card wrapper
- `inline`: No Card wrapper, just content

### Tabs Implementation

```typescript
<Tabs defaultValue="overview" className="w-full">
  <TabsList className="w-full justify-start border-b rounded-none bg-transparent h-auto p-0">
    <TabsTrigger value="overview" className="...">Overview</TabsTrigger>
    <TabsTrigger value="documents" className="...">Documents</TabsTrigger>
    <TabsTrigger value="service" className="...">Service</TabsTrigger>
    <TabsTrigger value="activity" className="...">Activity</TabsTrigger>
  </TabsList>
  
  <TabsContent value="overview">
    {/* Two-column grid with vehicle details */}
  </TabsContent>
  
  <TabsContent value="documents">
    {/* Verification + Document upload */}
  </TabsContent>
  
  <TabsContent value="service">
    {/* Service history */}
  </TabsContent>
  
  <TabsContent value="activity">
    {/* Activity log */}
  </TabsContent>
</Tabs>
```

### Responsive Behavior

- **Mobile (< 1024px)**: Single column layout, tabs stack horizontally
- **Desktop (>= 1024px)**: Two-column grid in Overview tab

---

## Expected Outcomes

- Reduced scrolling by 60-70%
- Better use of horizontal space
- Cleaner, more modern appearance
- Faster information access via tabs
- Consistent "white + gray border" aesthetic

