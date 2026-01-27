
# Detailed Vehicle Profile Page

## Overview
Enhance the existing VehicleDetails page to display all vehicle fields in an organized, sectioned layout. The page will present comprehensive vehicle information that's useful for both document tracking and potential resale purposes.

## Page Structure

The profile will be organized into 6 distinct sections:

```text
+------------------------------------------+
|  Header: Registration + Quick Status     |
+------------------------------------------+
|  Section 1: Vehicle Identity             |
|  - Reg Number, Make/Model, Color, etc.   |
+------------------------------------------+
|  Section 2: Technical Specifications     |
|  - Engine, CC, Seats, Weight, etc.       |
+------------------------------------------+
|  Section 3: Ownership & Finance          |
|  - Owner, Count, Finance Status, NOC     |
+------------------------------------------+
|  Section 4: Document Expiry Status       |
|  - Insurance, PUCC, Fitness, Road Tax    |
+------------------------------------------+
|  Section 5: Document Repository          |
|  - Upload & manage documents             |
+------------------------------------------+
```

## Detailed Sections

### 1. Header Card (Enhanced)
- Large registration number display with RC status badge
- Manufacturer + Model as subtitle
- Quick summary: Fuel type, Year registered, Owner count
- Visual icon representing vehicle class

### 2. Vehicle Identity Section
| Field | Description |
|-------|-------------|
| Registration Number | Primary identifier |
| Manufacturer | Brand name (e.g., BMW INDIA PVT LTD) |
| Model | Maker/model name |
| Vehicle Class | Type classification |
| Vehicle Category | Category classification |
| Body Type | Sedan, SUV, Hatchback, etc. |
| Color | Vehicle color |
| Registration Date | Initial registration |
| RC Status | Active/Inactive status with badge |

### 3. Technical Specifications Section
| Field | Description |
|-------|-------------|
| Engine Number | Engine identification |
| Chassis Number | Chassis identification |
| Cubic Capacity | Engine CC |
| Fuel Type | Petrol/Diesel/CNG/Electric |
| Seating Capacity | Number of seats |
| Emission Norms | BS-IV, BS-VI, etc. |
| Wheelbase | If available |
| Gross Vehicle Weight | If available |
| Unladen Weight | If available |

### 4. Ownership & Finance Section
| Field | Description |
|-------|-------------|
| Owner Name | Current registered owner |
| Owner Count | Number of previous owners |
| Finance Status | Financed/Not Financed with badge |
| Financer Name | If financed |
| NOC Details | No Objection Certificate status |

### 5. Document Expiry Status (Already exists, will enhance)
- Insurance expiry with company name
- PUCC validity
- Fitness certificate validity
- Road tax validity
- Each with visual status badges (Valid/Expiring/Expired)

### 6. Document Repository (Keep existing)
- Document upload functionality
- List of uploaded documents
- Download and delete actions

## Technical Implementation

### File Changes
**`src/pages/VehicleDetails.tsx`** - Major update:

1. **Update Vehicle Interface**
   - Add all new fields from the database schema:
   ```
   engine_number, chassis_number, color, seating_capacity,
   cubic_capacity, owner_count, emission_norms, is_financed,
   financer, noc_details, vehicle_category, body_type,
   wheelbase, gross_vehicle_weight, unladen_weight
   ```

2. **Create Reusable DetailItem Component**
   - Clean display of label/value pairs
   - Handles null/undefined values gracefully

3. **Add Collapsible Sections**
   - Use existing Collapsible component from shadcn
   - Allow users to expand/collapse sections
   - Default all sections open

4. **Implement Section Components**
   - VehicleIdentitySection
   - TechnicalSpecsSection
   - OwnershipFinanceSection
   - Each renders a grid of detail items

5. **Visual Enhancements**
   - Use appropriate icons for each section (Car, Settings, User, Calendar, Shield)
   - Highlight important values (finance status, owner count)
   - Show "Not Available" for missing data in muted style

### New UI Components Used
- Existing: Card, Badge, Button, Collapsible
- Icons: Car, Settings, User, Users, Banknote, Fuel, Calendar, Shield, FileText, Gauge, Palette

### Responsive Design
- Single column on mobile
- 2-column grid on tablet (sm:grid-cols-2)
- 3-column grid on desktop for technical specs (lg:grid-cols-3)

## User Experience

1. **Clean Information Hierarchy**
   - Most important info (reg number, status) at top
   - Detailed specs organized logically
   - Documents and expiry tracking easily accessible

2. **Resale-Ready Information**
   - Owner count prominently displayed
   - Finance status clearly shown
   - All technical specs for buyer reference

3. **Visual Status Indicators**
   - Green badge for active/valid status
   - Yellow badge for expiring soon
   - Red badge for expired/issues

## Implementation Order

1. Update Vehicle interface with all fields
2. Create DetailItem helper component
3. Restructure header card with enhanced info
4. Add Vehicle Identity section
5. Add Technical Specifications section
6. Add Ownership & Finance section
7. Keep existing Document Expiry and Repository sections
8. Add Collapsible wrappers for each section
9. Test responsive behavior
