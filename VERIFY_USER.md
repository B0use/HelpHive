# How to Verify a User Account (For Testing)

## Quick Method: Update in Firebase Console

### Step 1: Find Your User
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project
3. Go to **Firestore Database** → **Data** tab
4. Click on `users` collection
5. Find your user document (it will have your user ID as the document ID)

### Step 2: Update Verification Status
1. Click on your user document
2. Find the `verificationStatus` field
3. Click the field value (should say "pending")
4. Change it to: `verified`
5. Click **Update** or press Enter

### Step 3: Verify in App
1. Refresh your app
2. Go to Dashboard
3. The verification notice should be gone
4. All features should be available

## Alternative: Update via Code (For Development)

You can also add a temporary admin function to verify users. Add this to a test page or run in browser console:

```javascript
// In browser console (F12), after logging in:
import { doc, updateDoc } from 'firebase/firestore';
import { db } from './config/firebase'; // Adjust path as needed

// Get current user ID
const userId = firebase.auth().currentUser.uid;

// Update verification status
await updateDoc(doc(db, 'users', userId), {
  verificationStatus: 'verified'
});
```

## What Verification Statuses Mean

- `pending` - User not yet verified (default)
- `verified` - User is verified and has full access
- `rejected` - User verification was rejected

## Testing Different User Types

### Elderly/Differently-abled User
1. Create account
2. Select "I need help" role
3. Verify account (using method above)
4. Should see:
   - ✅ "Create Help Request" button
   - ✅ "My Requests" button
   - ✅ No verification warning

### Volunteer User
1. Create account (different Google account)
2. Select "I want to help" role
3. Verify account
4. Should see:
   - ✅ "Volunteer Feed" button
   - ✅ "My Responses" button
   - ✅ No verification warning

## Quick Test Checklist

- [ ] User account created in Firestore
- [ ] `verificationStatus` field exists
- [ ] Changed from "pending" to "verified"
- [ ] Refreshed app
- [ ] Verification notice gone
- [ ] All features accessible

## Note for Production

In production, you'll want:
- Admin panel to verify users
- Document upload for verification
- Automated verification workflow
- Email notifications

For MVP testing, manual verification in Firestore is fine!

