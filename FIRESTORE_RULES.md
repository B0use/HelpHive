# Firestore Security Rules Setup

## The Problem

You're seeing "Missing or insufficient permissions" because Firestore security rules are blocking access. By default, Firestore starts in "test mode" which only allows access for 30 days, or the rules might be too restrictive.

## Quick Fix: Update Firestore Rules

### Step 1: Go to Firebase Console
1. Open [Firebase Console](https://console.firebase.google.com/)
2. Select your project
3. Go to **Firestore Database** → **Rules** tab

### Step 2: Replace Rules with MVP Rules

Copy and paste these rules:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Helper function to check if user is authenticated
    function isAuthenticated() {
      return request.auth != null;
    }
    
    // Helper function to check if user owns the document
    function isOwner(userId) {
      return isAuthenticated() && request.auth.uid == userId;
    }
    
    // Users collection
    match /users/{userId} {
      // Users can read their own profile
      allow read: if isOwner(userId);
      
      // Users can create/update their own profile
      allow create: if isAuthenticated() && request.auth.uid == userId;
      allow update: if isOwner(userId);
      allow delete: if isOwner(userId);
    }
    
    // Requests collection
    match /requests/{requestId} {
      // Anyone authenticated can read requests (for volunteer feed)
      allow read: if isAuthenticated();
      
      // Users can create requests
      allow create: if isAuthenticated() && request.resource.data.userId == request.auth.uid;
      
      // Only the request owner or assigned volunteer can update
      allow update: if isAuthenticated() && (
        resource.data.userId == request.auth.uid || // Owner
        resource.data.assignedTo == request.auth.uid // Assigned volunteer
      );
      
      // Only owner can delete
      allow delete: if isAuthenticated() && resource.data.userId == request.auth.uid;
    }
    
    // Responses collection
    match /responses/{responseId} {
      // Anyone authenticated can read responses
      allow read: if isAuthenticated();
      
      // Volunteers can create responses
      allow create: if isAuthenticated() && request.resource.data.volunteerId == request.auth.uid;
      
      // Only the volunteer who created it can update
      allow update: if isAuthenticated() && resource.data.volunteerId == request.auth.uid;
      
      // Only the volunteer who created it can delete
      allow delete: if isAuthenticated() && resource.data.volunteerId == request.auth.uid;
    }
  }
}
```

### Step 3: Publish Rules
1. Click **Publish** button
2. Wait a few seconds for rules to deploy

### Step 4: Test
Refresh your app and try again!

## Alternative: Test Mode (Development Only)

⚠️ **WARNING: Only for development/testing!**

If you want to allow all reads/writes temporarily for testing:

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

**This allows anyone to read/write until Dec 31, 2025.**
**⚠️ Change this before going to production!**

## Understanding the Rules

### Users Collection
- ✅ Users can read/write their own profile
- ❌ Users cannot read/write other users' profiles

### Requests Collection
- ✅ Anyone authenticated can read (for volunteer feed)
- ✅ Users can create their own requests
- ✅ Request owner can update their requests
- ✅ Assigned volunteer can update status

### Responses Collection
- ✅ Anyone authenticated can read responses
- ✅ Volunteers can create responses
- ✅ Only the volunteer who created it can update/delete

## Common Issues

### Issue: "Missing or insufficient permissions" when creating request
**Solution:** Check that `userId` in request data matches `request.auth.uid`

### Issue: "Missing or insufficient permissions" when reading requests
**Solution:** Make sure user is authenticated (logged in)

### Issue: "Missing or insufficient permissions" when responding
**Solution:** Check that `volunteerId` in response data matches `request.auth.uid`

## Testing Rules

### Test User Profile Access
```javascript
// Should work: User reading their own profile
db.collection('users').doc(userId).get()

// Should fail: User reading someone else's profile
db.collection('users').doc(otherUserId).get()
```

### Test Request Creation
```javascript
// Should work: User creating their own request
db.collection('requests').add({
  userId: currentUser.uid, // Must match auth.uid
  title: "Test",
  // ...
})

// Should fail: User creating request with wrong userId
db.collection('requests').add({
  userId: "someone-else", // Doesn't match auth.uid
  // ...
})
```

## Production Rules (Future)

For production, you'll want stricter rules:
- Add verification checks
- Add rate limiting
- Add data validation
- Restrict certain fields from being updated

## Quick Checklist

- [ ] Opened Firestore Database → Rules
- [ ] Replaced rules with MVP rules above
- [ ] Clicked "Publish"
- [ ] Waited for rules to deploy
- [ ] Refreshed app
- [ ] Tested creating a request
- [ ] Tested viewing requests

## Still Not Working?

1. **Check Authentication**: Make sure user is logged in
2. **Check Browser Console**: Look for specific error messages
3. **Verify Rules Published**: Check timestamp in Rules tab
4. **Check User ID**: Make sure `userId` matches `auth.uid` in requests
5. **Try Test Mode**: Temporarily use test mode rules to verify it's a rules issue

The error should be resolved after updating the rules! 🔥

