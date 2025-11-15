# Fixing Google OAuth "origin_mismatch" Error

## The Problem

You're seeing this error because Google OAuth doesn't recognize `http://localhost:3000` as an authorized origin.

## Quick Fix (5 minutes)

### Step 1: Go to Google Cloud Console
1. Open [Google Cloud Console](https://console.cloud.google.com/)
2. Select your project (or create one if needed)

### Step 2: Navigate to OAuth Settings
1. Go to **APIs & Services** → **Credentials**
2. Find your **OAuth 2.0 Client ID** (the one you're using in `.env`)
3. Click the **pencil icon** (Edit) next to it

### Step 3: Add Authorized JavaScript Origins
In the **Authorized JavaScript origins** section, click **+ ADD URI** and add:

```
http://localhost:3000
```

**Important:** 
- ✅ Include `http://` (not `https://`)
- ✅ Include the port number `:3000`
- ✅ No trailing slash

### Step 4: Add Authorized Redirect URIs
In the **Authorized redirect URIs** section, click **+ ADD URI** and add:

```
http://localhost:3000
```

**Note:** For React apps with `@react-oauth/google`, the redirect URI is typically the same as the origin.

### Step 5: Save
Click **SAVE** at the bottom

### Step 6: Wait & Test
- Wait 1-2 minutes for changes to propagate
- Refresh your app (`http://localhost:3000`)
- Try logging in again

## Visual Guide

Your OAuth Client settings should look like this:

```
Authorized JavaScript origins:
  http://localhost:3000

Authorized redirect URIs:
  http://localhost:3000
```

## For Production (Later)

When you deploy to production, add your production URL:

```
Authorized JavaScript origins:
  http://localhost:3000
  https://yourdomain.com

Authorized redirect URIs:
  http://localhost:3000
  https://yourdomain.com
```

## Common Mistakes

❌ **Wrong:**
- `localhost:3000` (missing `http://`)
- `http://localhost:3000/` (trailing slash)
- `https://localhost:3000` (wrong protocol for localhost)

✅ **Correct:**
- `http://localhost:3000`

## Still Not Working?

### Check Your .env File
Make sure `REACT_APP_GOOGLE_CLIENT_ID` matches the Client ID in Google Cloud Console.

### Verify OAuth Consent Screen
1. Go to **APIs & Services** → **OAuth consent screen**
2. Make sure it's configured (even if in "Testing" mode)
3. Add your email as a test user if in testing mode

### Check Browser Console
Open DevTools (F12) → Console tab
- Look for any additional error messages
- Check if the Client ID is being loaded correctly

### Clear Browser Cache
Sometimes cached OAuth settings cause issues:
- Clear browser cache
- Try incognito/private window
- Or use a different browser

## Testing Mode vs Production

### Testing Mode (Current)
- Add test users in OAuth consent screen
- Only test users can sign in
- Good for development

### Production Mode
- Anyone with Google account can sign in
- Requires app verification
- Use after MVP is ready

## Quick Checklist

- [ ] Added `http://localhost:3000` to Authorized JavaScript origins
- [ ] Added `http://localhost:3000` to Authorized redirect URIs
- [ ] Clicked SAVE
- [ ] Waited 1-2 minutes
- [ ] Refreshed the app
- [ ] Checked `.env` has correct `REACT_APP_GOOGLE_CLIENT_ID`
- [ ] OAuth consent screen is configured
- [ ] Added yourself as test user (if in testing mode)

## Need More Help?

If it still doesn't work:
1. Double-check the Client ID in `.env` matches Google Cloud Console
2. Make sure you're using the correct OAuth Client (Web application type)
3. Check browser console for specific error messages
4. Verify OAuth consent screen is in "Testing" or "Production" mode

The error should be resolved after adding the origin! 🎉

