
# Editable Fields + AI Document Scanner

## Overview

This plan implements two complementary features:
1. **Editable Vehicle Fields** - Allow users to manually fill in missing data that the API didn't provide
2. **AI Document Scanner** - Use Gemini's vision capabilities to automatically extract data from uploaded documents and offer to populate empty fields

## How It Works

### Feature 1: Editable Fields

Users can click an "Edit" button on the Vehicle Details page to enter edit mode. In this mode, empty fields become editable input fields. Changes are saved to the database and logged in vehicle history.

**Editable fields include:**
- Vehicle Identity: Manufacturer, Model, Vehicle Class, Category, Body Type, Color, Registration Date
- Technical Specs: Engine Number, Chassis Number, Cubic Capacity, Seating Capacity, Emission Norms, Wheelbase, Gross/Unladen Weight
- Ownership: Owner Name, Owner Count, Finance Status, Financer, NOC Details
- Document Dates: Insurance Expiry (+ Company), PUCC Expiry, Fitness Expiry, Road Tax Expiry

### Feature 2: AI Document Scanner

When a user uploads a document (insurance policy, RC, PUCC certificate), the system:
1. Sends the document image/PDF to Gemini Pro Vision via Lovable AI
2. Extracts relevant fields based on document type
3. Shows a preview modal with extracted data alongside current values
4. Allows users to accept/reject each extracted field

**Document type to field mapping:**
- **Insurance Policy** - insurance_company, insurance_expiry, owner_name, registration_number
- **RC (Registration Certificate)** - owner_name, chassis_number, engine_number, registration_date, manufacturer, maker_model, fuel_type, color, seating_capacity
- **PUCC Certificate** - pucc_valid_upto
- **Fitness Certificate** - fitness_valid_upto

## User Experience Flow

### Editing Fields
1. User visits Vehicle Details page
2. Clicks "Edit Details" button in header
3. Empty fields become editable inputs; filled fields show current value
4. User fills in missing data
5. Clicks "Save Changes" to persist
6. Action logged to vehicle history

### AI Document Scan
1. User selects document type and uploads a file
2. Loading spinner shows "Analyzing document with AI..."
3. Modal appears showing:
   - Left side: Extracted values from document
   - Right side: Current database values
   - Checkboxes to select which fields to update
4. User reviews and clicks "Apply Selected" or "Cancel"
5. Selected fields are updated and changes logged

## Implementation Steps

### Phase 1: Database & Backend

**1.1 Edge Function: `analyze-document`**
- Accepts: document file (base64), document type, vehicle context
- Uses Lovable AI with google/gemini-2.5-pro (vision-capable model)
- Returns: extracted fields as structured JSON

### Phase 2: Frontend Components

**2.1 Editable Detail Item Component**
Create `EditableDetailItem.tsx`:
- Props: label, value, fieldName, isEditing, onChange, inputType
- Shows value when not editing
- Shows input field when editing

**2.2 Document Analysis Modal**
Create `DocumentAnalysisModal.tsx`:
- Shows side-by-side comparison of extracted vs current values
- Checkboxes for each field
- "Apply Selected" button

**2.3 Update VehicleDetails.tsx**
- Add edit mode state
- Replace DetailItem with EditableDetailItem in relevant sections
- Add "Edit Details" button
- Add save functionality
- Integrate AI analysis after document upload

## Technical Details

### Edge Function: analyze-document

```text
Input:
{
  documentBase64: string,
  documentType: "insurance" | "rc" | "pucc" | "fitness" | "other",
  vehicleContext: {
    registration_number: string,
    current_values: { ... }
  }
}

Output:
{
  success: true,
  extractedFields: {
    owner_name?: string,
    insurance_expiry?: string,
    insurance_company?: string,
    // ... other fields based on doc type
  },
  confidence: "high" | "medium" | "low",
  rawText?: string // Optional debug info
}
```

### AI Prompt Structure

The AI will receive:
- Document image (as base64)
- Document type context
- List of fields to extract based on document type
- Current vehicle registration for verification

And will use tool calling to return structured data:
```text
{
  extracted_fields: {
    field_name: {
      value: string,
      confidence: number,
      source_location: string // "top-right", "table row 3", etc.
    }
  }
}
```

### Field Extraction by Document Type

| Document Type | Fields to Extract |
|---------------|------------------|
| Insurance | insurance_company, insurance_expiry, owner_name, policy_number (for reference) |
| RC | owner_name, chassis_number, engine_number, registration_date, manufacturer, maker_model, fuel_type, color, seating_capacity, cubic_capacity, vehicle_class, body_type |
| PUCC | pucc_valid_upto, emission_norms |
| Fitness | fitness_valid_upto |

### Component Structure

```text
VehicleDetails.tsx
├── isEditing state
├── pendingChanges state
├── analysisResult state
│
├── Header
│   ├── "Edit Details" button (toggles edit mode)
│   └── "Save Changes" button (when editing)
│
├── SectionCard (Vehicle Identity)
│   └── EditableDetailItem (for each field)
│
├── SectionCard (Technical Specs)
│   └── EditableDetailItem (for each field)
│
├── Document Repository
│   ├── Upload triggers AI analysis
│   └── DocumentAnalysisModal (shows when analysis complete)
```

## Files to Create/Modify

| File | Action | Description |
|------|--------|-------------|
| `supabase/functions/analyze-document/index.ts` | Create | Edge function for AI document analysis |
| `supabase/config.toml` | Edit | Register new function |
| `src/components/vehicle/EditableDetailItem.tsx` | Create | Editable field component |
| `src/components/vehicle/DocumentAnalysisModal.tsx` | Create | AI extraction review modal |
| `src/pages/VehicleDetails.tsx` | Edit | Add edit mode and AI integration |

## Cost and Performance

- **Gemini Vision calls**: ~1 per document upload (using google/gemini-2.5-pro for best vision accuracy)
- **Payload size**: Documents are sent as base64 (max 5MB per file)
- **Processing time**: 5-15 seconds per document depending on complexity
- **Lovable AI costs**: Within free tier for typical usage

## Edge Cases Handled

1. **Low confidence extraction**: Show warning icon, let user verify
2. **Conflicting data**: Show both extracted and current values clearly
3. **Document in different language**: Gemini supports multiple languages including Hindi
4. **Unreadable document**: Show error message, suggest re-uploading
5. **PDF documents**: Convert first page to image for analysis
6. **Wrong document type**: AI can detect and suggest correct type

## Security Considerations

- Documents are processed in-memory, not stored permanently
- Base64 data is transmitted securely over HTTPS
- User must be authenticated to upload/analyze documents
- RLS policies ensure users can only update their own vehicles
