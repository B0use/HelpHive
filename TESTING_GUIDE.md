# HelpHive MVP Testing Guide

This guide walks you through testing all MVP features step-by-step.

## Prerequisites

Before testing, ensure you have:

1. ✅ All dependencies installed: `npm install`
2. ✅ Environment variables configured (`.env` file)
3. ✅ Firebase project set up
4. ✅ Google OAuth configured
5. ✅ Claude API key configured

## Quick Start

```bash
# Install dependencies (if not done)
npm install

# Start development server
npm start

# App will open at http://localhost:3000
```

---

## Feature 1: Authentication

### Test: Google OAuth Login

**Steps:**
1. Navigate to `http://localhost:3000`
2. You should be redirected to `/login` page
3. Click "Sign in with Google"
4. Select your Google account
5. Grant permissions if prompted

**Expected Result:**
- ✅ Redirected to `/dashboard` after login
- ✅ Your name appears in the dashboard
- ✅ User profile created in Firestore

**Verify in Firebase Console:**
- Go to Firebase Console → Authentication → Users
- You should see your user account
- Go to Firestore → `users` collection
- You should see a document with your `uid`

**Troubleshooting:**
- ❌ "Configuration Error" → Check `REACT_APP_GOOGLE_CLIENT_ID` in `.env`
- ❌ Login fails → Check OAuth consent screen is configured
- ❌ Redirect error → Check authorized redirect URIs in Google Cloud Console

---

## Feature 2: User Profile Setup

### Test: Select User Type

**Steps:**
1. After logging in, you'll see "Select Your Role" on dashboard
2. Choose one:
   - "I need help (Elderly/Differently-abled)"
   - "I want to help (Volunteer)"
   - "I represent an organization (NGO/Service)"
3. Click a button
4. Fill in profile form:
   - Display Name
   - Phone Number (optional)
   - Address (optional)
5. Click "Save Profile"

**Expected Result:**
- ✅ Redirected back to dashboard
- ✅ Dashboard shows role-specific options
- ✅ Profile saved in Firestore

**Verify in Firestore:**
- Go to Firestore → `users` collection → your user document
- Check `userType` field matches your selection
- Check `displayName`, `phoneNumber`, `address` are saved

**For Elderly/Differently-abled Users:**
- ✅ Dashboard shows "Create Help Request" button
- ✅ Dashboard shows "My Requests" button

**For Volunteers:**
- ✅ Dashboard shows "Volunteer Feed" button
- ✅ Dashboard shows "My Responses" button

---

## Feature 3: Help Request Creation

### Test: Create Text Request

**Steps:**
1. Login as Elderly/Differently-abled user
2. Click "Create Help Request" or navigate to `/request/new`
3. Select "Text" input type
4. Enter a request description, e.g.:
   ```
   I need help getting groceries this week. I can't drive and the store is far away.
   ```
5. Click "Submit Request"
6. Allow location access when browser prompts

**Expected Result:**
- ✅ Request processed (may take a few seconds for Claude API)
- ✅ Redirected to `/requests` page
- ✅ Request appears in list with:
  - AI-generated title
  - Category (e.g., "shopping")
  - Urgency level (e.g., "medium")
  - Status: "open"
  - Location information

**Verify in Firestore:**
- Go to Firestore → `requests` collection
- Find your request document
- Check fields:
  - `title`: AI-generated (not your original text)
  - `description`: Your original text
  - `category`: One of: medical, transportation, shopping, household, companionship, technology, other
  - `urgencyLevel`: low, medium, or high
  - `status`: "open"
  - `location`: Contains lat/lng and address
  - `userId`: Your user ID

**Troubleshooting:**
- ❌ "Claude API key not configured" → Check `REACT_APP_CLAUDE_API_KEY` in `.env`
- ❌ Request fails to submit → Check browser console for errors
- ❌ Location is (0, 0) → Check browser location permissions

### Test: Create Photo Request

**Steps:**
1. Navigate to `/request/new`
2. Select "Photo" input type
3. Click "Choose File" and select an image
4. Click "Submit Request"
5. Allow location access

**Expected Result:**
- ✅ Photo uploaded (to Firebase Storage or base64)
- ✅ Request created with photo URL(s)
- ✅ Request appears in list

**Verify:**
- Check Firestore → `requests` → your request
- `photos` field should contain array of URLs
- If Storage not configured, photos stored as base64 in Firestore

**Troubleshooting:**
- ❌ Photo upload fails → Check Firebase Storage is configured
- ❌ "Photo too large" → Compress image or enable Firebase Storage

---

## Feature 4: Claude API Request Parsing

### Test: Verify AI Processing

**Steps:**
1. Create a request with text: "I need urgent medical help, I fell and hurt my leg"
2. Submit the request
3. Check the request details

**Expected Result:**
- ✅ Title is AI-generated (not your exact text)
- ✅ Category is "medical"
- ✅ Urgency level is "high" or "emergency"

**Test Different Categories:**

| Input Text | Expected Category | Expected Urgency |
|-----------|------------------|------------------|
| "Need groceries" | shopping | low/medium |
| "Can't drive to doctor" | transportation | medium/high |
| "Feeling lonely" | companionship | medium |
| "Computer not working" | technology | low |
| "Medical emergency" | medical | high/emergency |

**Verify Claude API is Working:**
- Check browser console (Network tab)
- Look for API call to Anthropic
- Response should contain parsed data

**Troubleshooting:**
- ❌ Category is always "general" → Claude API may not be working
- ❌ Urgency is always "medium" → Check Claude API response
- ❌ Request takes too long → Check Claude API key and network

---

## Feature 5: Volunteer Feed

### Test: View Nearby Requests

**Steps:**
1. Login as a Volunteer user
2. Click "Volunteer Feed" or navigate to `/volunteer/feed`
3. Allow location access when prompted

**Expected Result:**
- ✅ List of open requests appears
- ✅ Requests show:
  - Title
  - Description
  - Category
  - Urgency badge
  - Distance (if location available)
  - "Respond" button
- ✅ Requests sorted by priority (Claude API)

**Verify:**
- Only "open" status requests are shown
- Distance calculated if both user and request have location
- Requests prioritized by urgency

**Troubleshooting:**
- ❌ No requests shown → Create some requests as elderly user first
- ❌ Distance shows "null" → Check location permissions
- ❌ Requests not prioritized → Check Claude API is working

---

## Feature 6: Request Response

### Test: Respond to Request

**Steps:**
1. Login as Volunteer
2. Go to Volunteer Feed
3. Find an open request
4. Click "Respond" button
5. Enter optional message, e.g.: "I can help with this!"
6. Click OK (or Cancel to cancel)

**Expected Result:**
- ✅ Success message: "Response submitted successfully!"
- ✅ Request disappears from feed (status changed to "assigned")
- ✅ Response saved to database

**Verify in Firestore:**

**Check `responses` collection:**
- New document created with:
  - `requestId`: ID of the request
  - `volunteerId`: Your user ID
  - `status`: "pending"
  - `message`: Your message (or empty string)
  - `createdAt`: Timestamp

**Check `requests` collection:**
- Find the request you responded to
- `status` should be "assigned"
- `assignedTo` should be your user ID
- `updatedAt` should be recent timestamp

**Test Multiple Responses:**
- Try responding to another request
- Each response creates a new document
- Each request can only be assigned once

**Troubleshooting:**
- ❌ Response fails → Check browser console for errors
- ❌ Request still shows in feed → Refresh page
- ❌ "Already Assigned" button → Request was already responded to

---

## Feature 7: Request Status Tracking

### Test: View My Requests (Elderly User)

**Steps:**
1. Login as Elderly/Differently-abled user
2. Create a few requests
3. Click "My Requests" or navigate to `/requests`

**Expected Result:**
- ✅ All your requests are listed
- ✅ Shows status badges:
  - "open" (blue)
  - "assigned" (orange)
  - "in_progress" (purple)
  - "completed" (green)
- ✅ Shows urgency badges
- ✅ Shows creation date and location

**Test Status Updates:**
1. Create a request (status: "open")
2. Login as volunteer and respond (status: "assigned")
3. Login back as elderly user
4. Check "My Requests" - should show "assigned"

---

## End-to-End Test Flow

### Complete User Journey

**As Elderly User:**
1. ✅ Login with Google
2. ✅ Select "I need help" role
3. ✅ Create help request: "Need groceries this week"
4. ✅ Verify request appears in "My Requests"
5. ✅ Verify request has AI-generated title and category

**As Volunteer:**
1. ✅ Login with Google (different account)
2. ✅ Select "I want to help" role
3. ✅ Go to Volunteer Feed
4. ✅ See the request created by elderly user
5. ✅ Click "Respond"
6. ✅ Add message: "I can help!"
7. ✅ Verify request disappears from feed

**Back to Elderly User:**
1. ✅ Refresh "My Requests" page
2. ✅ Verify request status changed to "assigned"

---

## Testing Checklist

### Authentication
- [ ] Can login with Google
- [ ] User profile created in Firestore
- [ ] Can logout
- [ ] Protected routes work (redirect to login if not authenticated)

### Request Creation
- [ ] Can create text request
- [ ] Can create photo request
- [ ] Location captured automatically
- [ ] Request saved to Firestore
- [ ] Claude API processes request correctly

### Claude API
- [ ] Title is generated
- [ ] Category is assigned correctly
- [ ] Urgency level is determined
- [ ] Different request types get different categories

### Volunteer Feed
- [ ] Shows open requests only
- [ ] Distance calculated correctly
- [ ] Requests prioritized by urgency
- [ ] Can see request details

### Request Response
- [ ] Can respond to request
- [ ] Response saved to database
- [ ] Request status updated to "assigned"
- [ ] Request removed from open feed
- [ ] Can't respond to already assigned request

### Status Tracking
- [ ] Can view own requests
- [ ] Status updates correctly
- [ ] Status badges display correctly

---

## Common Issues & Solutions

### Issue: "Firebase not initialized"
**Solution:** Check all Firebase environment variables in `.env`

### Issue: "Claude API key not configured"
**Solution:** Add `REACT_APP_CLAUDE_API_KEY` to `.env`

### Issue: Location is (0, 0)
**Solution:** 
- Check browser location permissions
- Test on HTTPS (localhost works)
- Check browser console for geolocation errors

### Issue: Requests not appearing
**Solution:**
- Check Firestore security rules allow reads
- Verify user is authenticated
- Check browser console for errors

### Issue: Response doesn't update status
**Solution:**
- Check Firestore security rules allow writes
- Verify user has permission to update requests
- Check browser console for errors

### Issue: Photos not uploading
**Solution:**
- Check Firebase Storage is configured
- Check Storage security rules
- For base64 fallback, ensure images are < 500KB

---

## Browser Console Testing

Open browser DevTools (F12) and check:

### Network Tab
- Firebase requests should succeed
- Claude API requests should return 200
- No CORS errors

### Console Tab
- No JavaScript errors
- Check for Firebase initialization messages
- Check for API call logs

### Application Tab
- Local Storage: Check for Firebase auth tokens
- Session Storage: Check for user data

---

## Firebase Console Verification

### Authentication
- Go to Firebase Console → Authentication
- Verify users are created
- Check sign-in providers

### Firestore
- Go to Firebase Console → Firestore Database
- Check collections:
  - `users`: User profiles
  - `requests`: Help requests
  - `responses`: Volunteer responses

### Storage (if configured)
- Go to Firebase Console → Storage
- Check `requests/` folder for uploaded photos

---

## Performance Testing

### Request Creation
- Should complete in < 5 seconds (including Claude API)
- Photo upload should complete in < 10 seconds

### Volunteer Feed
- Should load in < 3 seconds
- Should handle 50+ requests smoothly

### Response Submission
- Should complete in < 2 seconds

---

## Next Steps After Testing

Once all features are tested and working:

1. ✅ Test with multiple users (different accounts)
2. ✅ Test edge cases (empty fields, large photos, etc.)
3. ✅ Test on mobile devices
4. ✅ Test with slow network (throttle in DevTools)
5. ✅ Verify security rules work correctly
6. ✅ Test error handling (disconnect network, invalid API keys)

---

## Need Help?

If something doesn't work:
1. Check browser console for errors
2. Check Firebase Console for data
3. Verify all environment variables
4. Check network tab for failed API calls
5. Review security rules in Firebase

Happy testing! 🚀

