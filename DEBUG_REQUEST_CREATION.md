# Debugging Request Creation Issues

## The Problem

After submitting a request, you see "no requests yet" instead of your request.

## Common Causes

### 1. Claude API Error (Most Likely)

**Check:**
1. Open browser console (F12)
2. Look for errors when submitting
3. Check if you see: "Claude API key not configured" or API errors

**Fix:**
- Make sure `REACT_APP_CLAUDE_API_KEY` is in your `.env` file
- Restart dev server after adding: `npm start`
- Check API key is valid

**If Claude API fails, the request creation will fail too!**

### 2. Firestore Index Missing

**Symptom:** Error about "index not found" in console

**Fix:**
1. Go to Firebase Console → Firestore Database
2. Click on "Indexes" tab
3. If you see a link to create an index, click it
4. Or use the error message link to create the index

**Quick Fix:** The code now has a fallback that works without indexes.

### 3. Request Created But Not Showing

**Check:**
1. Go to Firebase Console → Firestore Database → `requests` collection
2. Do you see your request there?
3. If yes, it's a query issue
4. If no, request creation failed

### 4. Authentication Issue

**Check:**
- Are you logged in?
- Check browser console for auth errors
- Try logging out and back in

## Step-by-Step Debugging

### Step 1: Check Browser Console

Open DevTools (F12) → Console tab, then:

1. **Submit a request**
2. **Look for errors:**
   - Red error messages
   - Claude API errors
   - Firestore errors
   - Network errors

### Step 2: Check Network Tab

1. Open DevTools → Network tab
2. Submit a request
3. Look for:
   - Claude API call (to `api.anthropic.com`)
   - Firestore write operation
   - Any failed requests (red)

### Step 3: Check Firestore

1. Go to Firebase Console
2. Firestore Database → Data tab
3. Check `requests` collection
4. Is your request there?

### Step 4: Check Claude API

**Is Claude API working?**

The code will fallback if Claude API fails, but let's verify:

1. Check `.env` file has `REACT_APP_CLAUDE_API_KEY`
2. Restart dev server
3. Check browser console for Claude API errors

## Quick Fixes

### Fix 1: Add Claude API Key (If Missing)

1. Get API key from [Anthropic Console](https://console.anthropic.com/)
2. Add to `.env`:
   ```
   REACT_APP_CLAUDE_API_KEY=sk-ant-your-key-here
   ```
3. Restart dev server: `npm start`

### Fix 2: Create Firestore Index

If you see index error:
1. Click the link in the error message
2. Or go to Firestore → Indexes
3. Create the composite index
4. Wait for it to build (can take a few minutes)

### Fix 3: Check Request Creation

Add temporary logging to see what's happening:

```javascript
// In RequestForm.js, add console.logs:
console.log('Submitting request...');
console.log('Processed request:', processedRequest);
console.log('Request data:', requestData);
```

## Testing Without Claude API

If Claude API isn't working, the code should still create requests with fallback values. But let's verify:

1. **Check if request is created in Firestore**
2. **If not, check browser console for the exact error**
3. **The error message will tell you what's wrong**

## Common Error Messages

### "Claude API key not configured"
**Fix:** Add `REACT_APP_CLAUDE_API_KEY` to `.env` and restart

### "Missing or insufficient permissions"
**Fix:** Update Firestore security rules (see FIRESTORE_RULES.md)

### "Index not found"
**Fix:** Create the index or use the fallback query (already added)

### "Network request failed"
**Fix:** Check internet connection, Claude API status

## Verify Request Was Created

1. Go to Firebase Console
2. Firestore Database → Data
3. Click `requests` collection
4. You should see your request document

If it's there but not showing in app:
- It's a query/display issue
- Check RequestList.js query

If it's not there:
- Request creation failed
- Check browser console for errors

## Next Steps

1. ✅ Check browser console for errors
2. ✅ Verify Claude API key is set
3. ✅ Check Firestore for the request
4. ✅ Check network tab for failed requests
5. ✅ Verify authentication is working

The most common issue is Claude API not configured or failing!

