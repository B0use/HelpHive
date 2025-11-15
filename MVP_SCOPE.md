# HelpHive MVP Scope

## ✅ MVP Features (Implemented)

### 1. Authentication
- Google OAuth login
- User profile creation
- User type selection (elderly, differently-abled, volunteer, service)
- Protected routes

### 2. Help Request Creation
- Text input for requests
- Photo upload (with Firebase Storage or base64 fallback)
- Automatic location capture (browser geolocation)
- Request submission to Firestore

### 3. Claude API Request Parsing
- Automatic title generation
- Category classification (medical, transportation, shopping, household, companionship, technology, other)
- Urgency level determination (low, medium, high)
- Task prioritization for volunteer feed

### 4. Request Response
- Volunteers can view nearby requests
- Proximity-based distance calculation
- AI-powered request prioritization
- Response submission with optional message
- Request status update (open → assigned)
- Response saved to database

## ❌ Removed Features (Not in MVP)

### Emergency Features
- ❌ Emergency button component
- ❌ Emergency phone number calling
- ❌ Emergency-related CSS and styling

### Ride Share Integration
- ❌ Ride share service integration (not implemented)

### Other Non-MVP Features
- ❌ Rating system (post-MVP)
- ❌ Voice input (post-MVP)
- ❌ Google Maps visualization (post-MVP)
- ❌ Real-time notifications (post-MVP)

## 📁 Files Changed

### Removed
- `src/components/EmergencyButton.js`
- `src/components/EmergencyButton.css`

### Modified
- `src/pages/Dashboard.js` - Removed EmergencyButton import and usage
- `src/pages/RequestForm.js` - Removed EmergencyButton, implemented location capture
- `src/pages/RequestList.js` - Removed EmergencyButton
- `src/pages/VolunteerFeed.js` - Removed EmergencyButton, implemented response functionality
- `src/pages/Profile.js` - Removed EmergencyButton
- `src/App.css` - Removed emergency button styles
- `env.example` - Removed emergency phone number
- `README.md` - Updated to reflect MVP scope

## 🗄️ Database Collections (MVP)

### `users`
- User profiles
- Authentication data
- User type and verification status
- Location data

### `requests`
- Help requests
- AI-processed metadata (title, category, urgency)
- Location data
- Status (open, assigned, in_progress, completed)
- Photos (URLs)

### `responses`
- Volunteer responses to requests
- Response status
- Optional message
- Timestamps

## 🔄 Request Flow (MVP)

1. **User creates request**
   - Selects text or photo input
   - Provides request details
   - Location captured automatically
   - Claude API processes request
   - Request saved to Firestore with status "open"

2. **Volunteer views feed**
   - Sees all open requests
   - Requests sorted by proximity
   - Claude API prioritizes by urgency

3. **Volunteer responds**
   - Clicks "Respond" button
   - Adds optional message
   - Response saved to `responses` collection
   - Request status updated to "assigned"
   - Request removed from open feed

## 🎯 MVP Success Criteria

- ✅ Users can authenticate with Google
- ✅ Users can create help requests
- ✅ Requests are automatically categorized and prioritized
- ✅ Volunteers can see and respond to requests
- ✅ Request status is tracked
- ✅ Location-based matching works

## 📝 Next Steps (Post-MVP)

1. Voice input functionality
2. Google Maps visualization
3. Rating system
4. Real-time notifications
5. Advanced verification workflow
6. In-app messaging
7. Ride share integration (if needed)
8. Emergency features (if needed)

