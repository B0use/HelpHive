# HelpHive MVP Project Plan

## Project Overview
HelpHive is a platform connecting verified elderly and differently-abled citizens with verified volunteers through proximity-based alerts and intelligent task prioritization.

## MVP Scope

### Phase 1: Core Infrastructure (Week 1-2)
- [x] Project setup and configuration
- [ ] Firebase project initialization
- [ ] Authentication system (Google OAuth)
- [ ] User verification system
- [ ] Basic routing structure

### Phase 2: User Features (Week 2-3)
- [ ] Elderly/Differently-abled User Dashboard
  - [ ] Request creation (text/voice/photo)
  - [ ] Request status tracking
  - [ ] Emergency button
- [ ] Volunteer Dashboard
  - [ ] Proximity-based request feed
  - [ ] Request response system
  - [ ] Task acceptance/rejection

### Phase 3: Intelligence & Safety (Week 3-4)
- [ ] Claude API integration for request parsing
- [ ] Task prioritization algorithm
- [ ] Rating system
- [ ] Emergency call functionality
- [ ] Google Maps integration

### Phase 4: Verification & Polish (Week 4-5)
- [ ] User verification workflow
- [ ] Volunteer verification workflow
- [ ] UI/UX improvements
- [ ] Testing and bug fixes

## Technical Architecture

### Frontend Stack
- **React 18** - UI framework
- **React Router** - Navigation
- **Google OAuth** - Authentication
- **Google Maps API** - Location services
- **React Speech Recognition** - Voice input
- **Firebase SDK** - Backend services

### Backend Stack
- **Firebase Authentication** - User auth
- **Firebase Firestore** - Database
- **Firebase Storage** - Image storage
- **Firebase Cloud Functions** - Serverless functions (optional)
- **Claude API** - AI request processing

### Key Features

#### User Types
1. **Verified Elderly/Differently-abled Citizen**
   - Can create help requests
   - Track request status
   - Emergency button access
   - Rate volunteers

2. **Verified Volunteer**
   - Individual volunteers
   - Official/NGO/Local services
   - View proximity-based requests
   - Accept/respond to requests
   - Rate users

#### Core Functionality
- **Request Creation**: Text, voice, or photo input
- **AI Processing**: Claude API parses and categorizes requests
- **Proximity Alerts**: Location-based request matching
- **Task Prioritization**: AI-driven urgency assessment
- **Safety Features**: Emergency button, ratings, verification

## Database Schema (Firestore)

### Collections

#### `users`
```
{
  uid: string,
  email: string,
  displayName: string,
  userType: 'elderly' | 'differently_abled' | 'volunteer' | 'service',
  verificationStatus: 'pending' | 'verified' | 'rejected',
  verificationDocuments: string[],
  location: {
    lat: number,
    lng: number,
    address: string
  },
  rating: number,
  totalRatings: number,
  createdAt: timestamp,
  updatedAt: timestamp
}
```

#### `requests`
```
{
  requestId: string,
  userId: string,
  title: string,
  description: string,
  category: string,
  urgencyLevel: 'low' | 'medium' | 'high' | 'emergency',
  status: 'open' | 'assigned' | 'in_progress' | 'completed' | 'cancelled',
  location: {
    lat: number,
    lng: number,
    address: string
  },
  photos: string[],
  audioUrl: string,
  assignedTo: string | null,
  createdAt: timestamp,
  updatedAt: timestamp,
  completedAt: timestamp | null
}
```

#### `responses`
```
{
  responseId: string,
  requestId: string,
  volunteerId: string,
  status: 'pending' | 'accepted' | 'rejected',
  message: string,
  createdAt: timestamp
}
```

#### `ratings`
```
{
  ratingId: string,
  fromUserId: string,
  toUserId: string,
  requestId: string,
  rating: number,
  comment: string,
  createdAt: timestamp
}
```

## Next Steps for Integration

### 1. Firebase Setup
1. Create Firebase project at https://console.firebase.google.com
2. Enable Authentication (Google provider)
3. Create Firestore database
4. Set up Storage bucket
5. Configure security rules
6. Get API keys and add to `.env`

### 2. Google OAuth Setup
1. Go to Google Cloud Console
2. Create OAuth 2.0 credentials
3. Add authorized redirect URIs
4. Get Client ID and add to `.env`

### 3. Google Maps API Setup
1. Enable Maps JavaScript API in Google Cloud Console
2. Enable Geocoding API
3. Enable Places API (for address autocomplete)
4. Get API key and add to `.env`
5. Set up billing (required for Maps API)

### 4. Claude API Setup
1. Get API key from Anthropic
2. Add to `.env`
3. Set up API endpoint for request processing

### 5. Development Workflow
1. Install dependencies: `npm install`
2. Copy `.env.example` to `.env` and fill in values
3. Start development server: `npm start`
4. Test authentication flow
5. Test Firebase connection
6. Test Maps integration

## Security Considerations

### Firebase Security Rules
- Users can only read/write their own data
- Requests are readable by verified volunteers within proximity
- Ratings are public but only creatable by involved parties
- Verification documents are private

### API Security
- Never expose API keys in client-side code (use environment variables)
- Implement rate limiting for Claude API calls
- Validate all user inputs
- Sanitize data before storing in Firestore

## Monetization Strategy

### Revenue Streams
1. **Government Subsidies**
   - Apply for municipal/state grants
   - Document social impact metrics
   - Partner with social services departments

2. **Company Partnerships**
   - Hospitals: Referral partnerships
   - NGOs: Service provider partnerships
   - Ride Services: Transportation integration

3. **Service Fees** (Future)
   - Premium features for services
   - Transaction fees for paid services

## Success Metrics

### User Metrics
- Number of verified users (elderly + volunteers)
- Request completion rate
- Average response time
- User satisfaction ratings

### Business Metrics
- Number of partnerships
- Government grant applications
- Service utilization rates

## Risk Mitigation

### Safety Risks
- Implement robust verification system
- Emergency button with direct police connection
- Rating system to filter bad actors
- Background checks for volunteers (future)

### Technical Risks
- API rate limits (implement caching)
- Location accuracy (use multiple sources)
- Offline functionality (implement service workers)

## Timeline

- **Week 1-2**: Infrastructure & Authentication
- **Week 2-3**: Core User Features
- **Week 3-4**: AI Integration & Safety Features
- **Week 4-5**: Verification & Testing
- **Week 5-6**: Polish & Launch Preparation

