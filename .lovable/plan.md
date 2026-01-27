

# Fix AI Document Scanner

## Problem Identified

After uploading a document, the AI extraction fails silently. Investigation revealed:

1. **AI Gateway Error**: Google Gemini returns `"Unable to process input image"` (400 error)
2. **Image Format Issue**: The current image format in the API request is not being processed correctly by the Gemini model
3. **Possible Request Size Issue**: Large base64 images may be causing timeout or size issues

## Root Cause

The edge function formats the image as:
```javascript
{
  type: "image_url",
  image_url: {
    url: `data:${mimeType};base64,${documentBase64}`
  }
}
```

This format may not be fully compatible with how the Lovable AI gateway expects images for Gemini vision models.

## Solution

### 1. Update Edge Function Image Handling

Modify the `analyze-document` edge function to:
- Use the correct image format for Gemini via the Lovable AI gateway
- Add image validation (size, format checks)
- Add better error logging and handling
- Return more informative error messages to the frontend

### 2. Add Frontend Image Preprocessing

Before sending to the edge function:
- Resize large images to reduce payload size (max 2048px)
- Validate image format and size
- Show progress indicator during analysis
- Handle specific error codes (429, 402, 400) with helpful messages

### 3. Improve Error Handling & Feedback

- Add more visible loading states during analysis
- Show specific error messages based on error type
- Add retry logic for transient failures

## Files to Modify

| File | Changes |
|------|---------|
| `supabase/functions/analyze-document/index.ts` | Fix image format, add validation, improve logging |
| `src/pages/VehicleDetails.tsx` | Add image preprocessing, better error handling |

## Technical Details

### Edge Function Changes

1. **Validate image before sending**:
   - Check base64 is valid
   - Log image size for debugging
   - Add timeout handling

2. **Update image format** for Gemini compatibility:
   - Use inline_data format instead of image_url for base64 images
   - Format: `{ type: "image", source: { type: "base64", media_type, data } }`

3. **Better error responses**:
   - Return specific error types (image_too_large, invalid_format, ai_error)
   - Include debugging information in non-production

### Frontend Changes

1. **Image preprocessing**:
   - Use canvas to resize images larger than 2048x2048
   - Compress JPEG quality to reduce payload size
   - Validate file type before upload

2. **Enhanced feedback**:
   - Show "Analyzing with AI..." prominently during processing
   - Show step-by-step progress (Uploading → Analyzing → Complete)
   - Better error messages for different failure types

## Implementation Approach

1. First, update the edge function to fix the image format issue
2. Redeploy and test with a sample document
3. Add frontend image preprocessing to handle large images
4. Improve error handling and user feedback

## Expected Outcome

After implementation:
- Users will see clear feedback when uploading documents
- AI extraction will work correctly for supported document types
- Errors will be shown with helpful messages
- Large images will be automatically resized before processing

