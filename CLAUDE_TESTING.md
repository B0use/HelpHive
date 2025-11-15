# Testing Claude API Parsing

## How to Test Claude Parsing

### Method 1: Use the Test Page (Recommended)

1. **Navigate to Test Page**
   - Go to `http://localhost:3000/test/claude`
   - Or click "Test Claude" button in the dashboard header

2. **Enter a Request Description**
   - Type or paste a help request description
   - Or click one of the example requests

3. **Click "Test Claude Parsing"**
   - Wait for Claude to process (usually 2-5 seconds)
   - View the results side-by-side

4. **Review Results**
   - **Original Input**: What you typed
   - **Processed by Claude**: 
     - Title (AI-generated)
     - Description (refined and improved)
     - Category
     - Urgency Level
     - People Needed
     - Task Types (array of specific tasks)

### Method 2: Test Through Request Creation

1. **Create a Request**
   - Go to "Create Help Request"
   - Enter a description
   - Submit

2. **Check Browser Console**
   - Open DevTools (F12) → Console
   - Look for: "Claude processed request:"
   - Compare original vs processed

3. **Check Firestore**
   - Go to Firebase Console → Firestore
   - Check `requests` collection
   - Verify new fields: `peopleNeeded`, `taskTypes`

## What Claude Does

### Enhanced Description
- **Original**: "I need groceries"
- **Claude**: "I need help with grocery shopping this week. I am unable to drive and the store is far from my location. I would appreciate assistance getting essential items."

### Tags Generated

1. **Urgency Level**
   - `low`: Non-urgent tasks
   - `medium`: Standard requests
   - `high`: Important/time-sensitive
   - `emergency`: Medical emergencies, urgent situations

2. **People Needed**
   - `1`: Simple tasks (grocery shopping, tech help)
   - `2`: Moderate tasks (moving furniture, medical transport)
   - `3`: Complex tasks (heavy lifting, multiple activities)
   - `multiple`: Large tasks requiring 4+ people

3. **Task Types** (Array)
   - Examples: `["grocery shopping"]`
   - Examples: `["medical transport", "appointment"]`
   - Examples: `["house cleaning", "organization"]`
   - Examples: `["heavy lifting", "furniture moving"]`

## Example Test Cases

### Test Case 1: Grocery Shopping
**Input:**
```
I need help getting groceries this week, I can't drive
```

**Expected Output:**
- Title: "Grocery Shopping Assistance"
- Category: "shopping"
- Urgency: "medium"
- People Needed: 1
- Task Types: ["grocery shopping", "transportation"]

### Test Case 2: Medical Emergency
**Input:**
```
Urgent! I fell and hurt my leg, need to get to the hospital
```

**Expected Output:**
- Title: "Medical Emergency - Hospital Transport"
- Category: "medical"
- Urgency: "emergency"
- People Needed: 1-2
- Task Types: ["medical transport", "emergency assistance"]

### Test Case 3: Heavy Lifting
**Input:**
```
I need someone to help me move some heavy furniture in my living room
```

**Expected Output:**
- Title: "Furniture Moving Assistance"
- Category: "household"
- Urgency: "low" or "medium"
- People Needed: 2-3
- Task Types: ["heavy lifting", "furniture moving"]

## Troubleshooting

### Issue: "Claude API key not configured"
**Solution:** 
- Add `REACT_APP_CLAUDE_API_KEY` to `.env`
- Restart dev server: `npm start`

### Issue: No response or timeout
**Solution:**
- Check API key is valid
- Check network connection
- Check Anthropic Console for API status
- Check browser console for errors

### Issue: Missing fields in response
**Solution:**
- Check Claude API response in browser console
- Verify prompt includes all required fields
- Check fallback extraction functions

### Issue: Task types not showing
**Solution:**
- Check if `taskTypes` is an array in Firestore
- Verify Claude is returning JSON array format
- Check browser console for parsing errors

## Verifying Results

### In Browser Console
Look for:
```javascript
Claude processed request: {
  original: "user input",
  processed: {
    title: "...",
    description: "...",
    category: "...",
    urgencyLevel: "...",
    peopleNeeded: 1,
    taskTypes: [...]
  }
}
```

### In Firestore
Check request document has:
- `title` (string)
- `description` (string - improved version)
- `category` (string)
- `urgencyLevel` (string)
- `peopleNeeded` (number or "multiple")
- `taskTypes` (array of strings)

### In UI
- Request cards show task tags
- People needed displayed
- Description is refined/improved

## Best Practices

1. **Test with various inputs**
   - Short descriptions
   - Long descriptions
   - Medical emergencies
   - Simple tasks
   - Complex requests

2. **Verify all fields**
   - Check title is concise
   - Check description is improved
   - Verify urgency is appropriate
   - Confirm people needed makes sense
   - Ensure task types are specific

3. **Monitor API usage**
   - Check Anthropic Console for usage
   - Watch for rate limits
   - Monitor costs

## Next Steps

After testing:
1. ✅ Verify Claude is working correctly
2. ✅ Check all tags are generated
3. ✅ Ensure descriptions are improved
4. ✅ Test with real user scenarios
5. ✅ Monitor API performance

Happy testing! 🚀

