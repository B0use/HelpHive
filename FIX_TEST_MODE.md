# Fixing Test Mode Firestore Rules

## The Problem

Even though you're in test mode, you're getting "Missing or insufficient permissions". This usually means:
1. Test mode rules expired (they expire after 30 days)
2. Test mode rules were changed/reset
3. Authentication isn't working properly

## Quick Fix: Refresh Test Mode Rules

### Step 1: Go to Firestore Rules
1. Open [Firebase Console](https://console.firebase.google.com/)
2. Select your project
3. Go to **Firestore Database** → **Rules** tab

### Step 2: Check Current Rules

You should see something like this (test mode):

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if request.time < timestamp.date(2024, 12, 15);
    }
  }
}
```

**The date in the rule is when it expires!**

### Step 3: Update Test Mode Rules

Replace the rules with this (extends test mode for 1 year):

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if request.time < timestamp.date(2025, 12, 31);
    }
  }
}
```

**Or for unlimited test mode (not recommended for production):**

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if true;
    }
  }
}
```

### Step 4: Publish
1. Click **Publish** button
2. Wait a few seconds

### Step 5: Verify
- Check the timestamp shows it was just published
- Refresh your app
- Try again

## Alternative: Check Authentication

If rules are correct but still getting errors, the issue might be authentication:

### Verify User is Logged In
1. Open browser console (F12)
2. Check if you see any authentication errors
3. Try logging out and logging back in

### Check Firebase Authentication
1. Go to Firebase Console → **Authentication** → **Users**
2. Verify your user account exists
3. If not, try logging in again

## Common Test Mode Issues

### Issue 1: Rules Expired
**Symptom:** Rules have old date like `timestamp.date(2024, 11, 15)`
**Solution:** Update date to future date

### Issue 2: Rules Were Changed
**Symptom:** Rules don't match test mode format
**Solution:** Replace with test mode rules above

### Issue 3: Authentication Not Working
**Symptom:** User not authenticated
**Solution:** 
- Check browser console for auth errors
- Verify OAuth is configured correctly
- Try logging out/in

## Verify Rules Are Working

After updating rules:

1. **Check Rules Tab**
   - Should show "Last published: [recent time]"
   - Rules should match test mode format

2. **Test in App**
   - Try creating a request
   - Should work without permission errors

3. **Check Browser Console**
   - No "Missing or insufficient permissions" errors
   - Firebase operations should succeed

## Still Not Working?

### Debug Steps:

1. **Check Rules Syntax**
   - Make sure there are no syntax errors
   - Rules should validate (green checkmark)

2. **Check Authentication**
   ```javascript
   // In browser console, check:
   firebase.auth().currentUser
   // Should return user object, not null
   ```

3. **Check Firestore Connection**
   - Go to Firestore Database → Data tab
   - Should see collections
   - If empty, rules might be blocking reads

4. **Try Simulator**
   - In Rules tab, click "Rules Playground"
   - Test read/write operations
   - Should show "Allow" for authenticated requests

## Quick Test Mode Rules (Copy-Paste Ready)

**For 1 Year:**
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if request.time < timestamp.date(2025, 12, 31);
    }
  }
}
```

**For Unlimited (Development Only):**
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if true;
    }
  }
}
```

## Next Steps

Once test mode is working:
1. ✅ Test all MVP features
2. ✅ Verify data is being saved
3. ⚠️ **Before production**: Replace with proper security rules (see FIRESTORE_RULES.md)

The error should be resolved after refreshing the test mode rules! 🔥

