

# Plan: Universal Document Analysis & Auto-Extraction

## Overview

Transform the document upload workflow to automatically analyze and extract data from any uploaded document, regardless of whether the user tags it with a specific type. The AI will detect the document type and extract all relevant vehicle fields.

## Current Behavior vs New Behavior

| Current | New |
|---------|-----|
| User must select document type dropdown | Document type selection becomes optional (can default to "auto-detect") |
| AI only extracts fields for selected type | AI extracts ALL possible fields from any document |
| Limited extraction if wrong type selected | AI detects document type automatically |
| User might skip tagging entirely | Every image upload triggers smart extraction |

## Implementation Plan

### 1. Update Edge Function for Universal Extraction

Modify `supabase/functions/analyze-document/index.ts`:

- Add a new "auto" document type that triggers universal extraction
- When document type is "auto" or not recognized, extract ALL possible fields
- Improve the AI prompt to first identify the document type, then extract relevant fields
- Return the detected document type along with extracted fields

**Key Changes:**
```text
- Add universal field list for "auto" mode (all fields from all document types)
- Update system prompt to: "First identify what type of document this is, then extract all visible fields"
- Always return document_type_detected in response
```

### 2. Update Document Type Dropdown

Modify `src/pages/VehicleDetails.tsx`:

- Add "Auto-Detect" as the first/default option in the dropdown
- Change default `selectedDocType` from "insurance" to "auto"
- Keep existing document types for users who want to explicitly tag

**New dropdown options:**
```text
- Auto-Detect (Recommended) ← NEW default
- Insurance Policy
- Registration Certificate (RC)
- PUCC Certificate
- Fitness Certificate
- Other Document
```

### 3. Update Document Storage with Detected Type

After AI analysis completes:

- Update the document record in the database with the AI-detected document type
- This way, even if user selected "auto", the stored document will have the correct type for future reference

### 4. Enhanced AI Prompt for Better Detection

Improve the AI prompt to:
- First analyze the document and identify its type (insurance, RC, PUCC, fitness, or other)
- Then extract ALL visible fields that match vehicle data
- Provide confidence level for both detection and extraction

## File Changes Summary

| File | Changes |
|------|---------|
| `supabase/functions/analyze-document/index.ts` | Add "auto" mode, universal field list, improved prompts |
| `src/pages/VehicleDetails.tsx` | Add "Auto-Detect" option, change default, update document type after analysis |

## Technical Details

### Edge Function Changes

1. **Universal field list for auto-detection:**
   ```text
   All fields combined: owner_name, insurance_company, insurance_expiry, 
   chassis_number, engine_number, registration_date, manufacturer, maker_model, 
   fuel_type, color, seating_capacity, cubic_capacity, vehicle_class, body_type, 
   vehicle_category, gross_vehicle_weight, unladen_weight, pucc_valid_upto, 
   fitness_valid_upto, road_tax_valid_upto, emission_norms
   ```

2. **Updated AI system prompt:**
   - Instruct AI to first identify the document type
   - Then extract all visible fields regardless of document type
   - Return both detected type and extracted fields

### Frontend Changes

1. **Default to auto-detect:**
   - Users can still manually select a type if they prefer
   - Auto-detect ensures maximum extraction without user effort

2. **Update stored document type:**
   - After successful analysis, update the `document_type` field in the `documents` table with the AI-detected type
   - This provides accurate categorization for the document repository

## User Experience Flow

1. User clicks "Upload Document" button
2. Consent dialog appears (existing behavior)
3. User selects file (document type defaults to "Auto-Detect")
4. File uploads and AI analysis begins automatically
5. AI detects document type and extracts all visible fields
6. Document Analysis Modal shows extracted data with detected type badge
7. User reviews and selects which fields to apply
8. Document is saved with AI-detected type in repository

## Benefits

- No dependency on user correctly tagging documents
- Maximum data extraction from every upload
- Cleaner user experience (less decisions needed)
- Documents still get properly categorized via AI detection
- Backward compatible (manual tagging still works)

