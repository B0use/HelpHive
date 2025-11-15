# HelpHive

**Connecting elderly and differently-abled citizens with verified volunteers through proximity-based assistance.**

HelpHive is a community platform that enables verified elderly and differently-abled citizens to request help from verified volunteers in their area. The platform uses AI-powered request processing, proximity-based matching, and intelligent task prioritization to ensure timely and appropriate assistance.

## 🎯 Project Overview

### Mission
To create a safe, accessible, and efficient platform that connects those in need with willing volunteers, fostering stronger communities and ensuring no one is left behind.

### Key Features
- **Multi-modal Request Creation**: Text, voice, and photo input options
- **AI-Powered Processing**: Claude API automatically categorizes and prioritizes requests
- **Proximity-Based Matching**: Volunteers see nearby requests based on location
- **Safety Features**: Emergency button, user verification, rating system
- **Real-time Status Updates**: Track request progress from creation to completion

## 🚀 Quick Start

### Prerequisites
- Node.js 16+ and npm
- Firebase account
- Google Cloud Platform account
- Anthropic Claude API key
- Google OAuth credentials

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd HelpHive
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp env.example .env
   ```
   Then edit `.env` with your API keys and configuration (see [Integration Guide](./INTEGRATION_GUIDE.md))

4. **Start development server**
   ```bash
   npm start
   ```

5. **Open in browser**
   Navigate to `http://localhost:3000`

## 📋 Project Structure

```
HelpHive/
├── public/
│   └── index.html          # HTML template
├── src/
│   ├── components/         # Reusable components
│   │   ├── EmergencyButton.js
│   │   └── PrivateRoute.js
│   ├── config/            # Configuration files
│   │   ├── firebase.js    # Firebase setup
│   │   └── claude.js      # Claude API integration
│   ├── contexts/          # React contexts
│   │   └── AuthContext.js # Authentication context
│   ├── pages/             # Page components
│   │   ├── Dashboard.js
│   │   ├── Login.js
│   │   ├── RequestForm.js
│   │   ├── RequestList.js
│   │   ├── VolunteerFeed.js
│   │   └── Profile.js
│   ├── App.js             # Main app component
│   ├── App.css            # Global styles
│   ├── index.js           # Entry point
│   └── index.css          # Base styles
├── .gitignore
├── package.json
├── env.example            # Environment variables template
├── PROJECT_PLAN.md        # Detailed project plan
├── INTEGRATION_GUIDE.md   # Integration setup guide
└── README.md              # This file
```

## 🔧 Technology Stack

### Frontend
- **React 18** - UI framework
- **React Router** - Client-side routing
- **Firebase SDK** - Backend services
- **Google OAuth** - Authentication
- **Google Maps API** - Location services

### Backend
- **Firebase Authentication** - User authentication
- **Cloud Firestore** - NoSQL database
- **Firebase Storage** - File storage
- **Claude API** - AI request processing

## 📱 User Types

### 1. Elderly/Differently-abled Citizens
- Create help requests (text/voice/photo)
- Track request status
- Emergency button access
- Rate volunteers

### 2. Volunteers
- **Individual Volunteers**: Personal volunteers
- **Official Services**: NGOs, hospitals, local services
- View proximity-based requests
- Respond to and accept requests
- Rate users

## 🔐 Security & Safety

### Verification System
- Both users and volunteers require verification
- Verification status tracked in user profiles
- Pending verification limits some features

### Safety Features
- **Emergency Button**: Direct connection to local emergency services
- **Rating System**: Users and volunteers can rate each other
- **Location Privacy**: Location data only shared with relevant parties

## 📊 Database Schema

### Collections

#### `users`
- User profiles with verification status
- Location data for proximity matching
- Ratings and statistics

#### `requests`
- Help requests with AI-processed metadata
- Status tracking (open, assigned, in_progress, completed)
- Location and media attachments

#### `responses`
- Volunteer responses to requests
- Status tracking

#### `ratings`
- User-to-user ratings
- Comments and feedback

See [PROJECT_PLAN.md](./PROJECT_PLAN.md) for detailed schema.

## 🎨 Features in Detail

### Request Creation
1. User selects input type (text/voice/photo)
2. Provides request details
3. Claude API processes and categorizes:
   - Generates clear title
   - Categorizes (medical, transportation, shopping, etc.)
   - Determines urgency level (low, medium, high, emergency)
4. Request posted to feed

### Volunteer Feed
1. Volunteers see nearby requests
2. Requests prioritized by:
   - Urgency level
   - Proximity
   - Time sensitivity
   - User needs
3. Claude API assists in prioritization
4. Volunteers can respond to requests

### Task Prioritization
- AI analyzes multiple factors:
  - Medical emergencies = highest priority
  - Time-sensitive needs
  - User history and patterns
  - Volunteer availability

## 🚧 Current Status: MVP

### Completed ✅
- Project structure and configuration
- React frontend with routing
- Firebase integration setup
- Authentication system
- Basic UI components
- Request creation flow
- Volunteer feed
- Profile management

### In Progress 🚧
- Voice input functionality
- Google Maps integration
- Real-time location tracking
- Response/acceptance workflow
- Rating system implementation

### Planned 📋
- Advanced verification workflow
- Push notifications
- In-app messaging
- Analytics dashboard
- Admin panel

## 📖 Documentation

- **[PROJECT_PLAN.md](./PROJECT_PLAN.md)** - Detailed project plan, timeline, and architecture
- **[INTEGRATION_GUIDE.md](./INTEGRATION_GUIDE.md)** - Step-by-step integration setup for all APIs

## 🔌 Integration Setup

See [INTEGRATION_GUIDE.md](./INTEGRATION_GUIDE.md) for detailed instructions on:
1. Firebase project setup
2. Google OAuth configuration
3. Google Maps API setup
4. Claude API integration
5. Environment variable configuration

## 💰 Monetization Strategy

### Revenue Streams
1. **Government Subsidies**
   - Municipal/state grants
   - Social services partnerships

2. **Company Partnerships**
   - Hospitals: Referral partnerships
   - NGOs: Service provider partnerships
   - Ride Services: Transportation integration

3. **Future Service Fees**
   - Premium features
   - Transaction fees

## 📈 Success Metrics

### User Metrics
- Number of verified users
- Request completion rate
- Average response time
- User satisfaction ratings

### Business Metrics
- Number of partnerships
- Government grant applications
- Service utilization rates

## 🛠️ Development

### Available Scripts

- `npm start` - Start development server
- `npm build` - Build for production
- `npm test` - Run tests

### Environment Variables

Required environment variables (see `env.example`):
- Firebase configuration
- Google Maps API key
- Claude API key
- Google OAuth Client ID
- Emergency phone number

## 🤝 Contributing

This is an MVP project. Contributions and feedback are welcome!

## 📝 License

[Add your license here]

## 👥 Team & Stakeholders

- **Target Users**: Elderly and differently-abled citizens
- **Volunteers**: Individual volunteers, NGOs, official services
- **Partners**: Hospitals, municipal services, ride services

## 🆘 Support

For setup issues, refer to:
- [Integration Guide](./INTEGRATION_GUIDE.md)
- [Project Plan](./PROJECT_PLAN.md)

## 🎯 Next Steps

1. **Complete Integration Setup**
   - Follow [INTEGRATION_GUIDE.md](./INTEGRATION_GUIDE.md)
   - Set up all API keys
   - Configure Firebase

2. **Test Core Features**
   - Authentication flow
   - Request creation
   - Volunteer feed
   - Location services

3. **Implement Missing Features**
   - Voice input
   - Google Maps integration
   - Response workflow
   - Rating system

4. **Deploy MVP**
   - Set up production environment
   - Configure custom domain
   - Deploy to hosting service

---

**Built with ❤️ for stronger communities**
