
# 🚗 Vehicle Document Manager - India

A clean, minimal app for Indian vehicle owners to track their cars, documents, and get automated reminders for expiring certificates.

---

## Core Features

### 1. User Authentication
- Simple email/password signup and login
- Secure session management
- Each user has their own private vehicle dashboard

### 2. Vehicle Management
- **Add unlimited vehicles** to your account
- **Two ways to add a vehicle:**
  - **Auto-fetch**: Enter registration number (e.g., KL01AY7070) and click "Fetch Details" - pulls data from RapidAPI
  - **Manual entry**: Fill in details yourself
- View all your vehicles in a clean card-based layout
- Edit or remove vehicles anytime

### 3. Document & Certificate Tracking
Based on data from the RapidAPI, we'll track:
- **Insurance** - Expiry date + upload policy document
- **PUCC (Pollution Certificate)** - Expiry date
- **Fitness Certificate** - Validity date
- **Registration Certificate (RC)** - Upload document
- **Road Tax** - Validity status

### 4. Document Repository
- Upload and store PDFs/images of:
  - Insurance policy
  - RC book
  - PUCC certificate
  - Other related documents
- Quick access when needed (traffic stops, renewals)

### 5. Expiry Reminders & Alerts
- Visual indicators on dashboard:
  - 🟢 **Valid** - More than 30 days remaining
  - 🟡 **Expiring Soon** - Less than 30 days
  - 🔴 **Expired** - Needs immediate attention
- Email reminders before documents expire (optional enhancement)

---

## Design & User Experience

**Clean & Minimal approach:**
- White/light background with subtle shadows
- Card-based vehicle display
- Color-coded status badges for quick scanning
- Mobile-responsive for on-the-go access
- Simple navigation: Dashboard → Add Vehicle → Vehicle Details

---

## Technical Approach

### Backend (Lovable Cloud)
- Supabase database for storing vehicles & documents
- Supabase Storage for document uploads (PDFs, images)
- Edge Function to securely call RapidAPI (keeps API key safe)

### Data Structure
- **Users** - Authentication handled by Supabase Auth
- **Vehicles** - Registration number, owner, make, model, fetched details
- **Documents** - Linked to vehicles, expiry dates, uploaded files

---

## Pages

1. **Login/Signup** - Authentication entry point
2. **Dashboard** - All vehicles at a glance with status indicators
3. **Add Vehicle** - Form with manual entry + "Fetch from RapidAPI" button
4. **Vehicle Details** - Full info, all documents, upload section

---

## What You'll Need to Provide

- **RapidAPI Key** - I'll securely store this and use it in the backend
- That's it! I'll handle everything else.

