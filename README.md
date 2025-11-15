# HelpHive

## Project Overview
HelpHive connects elderly and differently‑abled residents with verified volunteers for everyday assistance. Users can submit text-based help requests, Claude categorizes and prioritizes them, and volunteers accept tasks via a map-based feed.

## Installation & Setup
1. **Clone & install**
   ```bash
   git clone <repo-url>
   cd HelpHive
   npm install
   ```
2. **Environment variables**
   ```bash
   cp env.example .env
   ```
   Fill in Firebase config, Google OAuth/Maps keys, Claude API key, and emergency phone number.
3. **Run locally**
   ```bash
   npm start
   ```
   Visit `http://localhost:3000`.

## Usage Guide
1. Sign in with Google (OAuth).
2. Complete your profile (role, contact info, location).
3. **Requesters**: go to “New Request”, enter the text description and preferred location source (profile/current/manual), submit.
4. **Volunteers**: open the map feed, review AI-prioritized cards, and accept tasks. Each acceptance updates the volunteer count and status.

## Tech Stack
- **Languages**: JavaScript (ES6/JSX), CSS
- **Frameworks/Libraries**: React 18, React Router DOM, Firebase SDK, @react-oauth/google, @googlemaps/js-api-loader, Jest & React Testing Library, ESLint
- **APIs/Services**: Google OAuth 2.0, Firebase Authentication, Cloud Firestore, Firebase Storage, Google Maps JavaScript API, Google Places API (via Maps JS SDK), Anthropic Claude API
- **Tooling**: Create React App, npm, Git/GitHub

## Claude API Integration
- **Request parsing**: Claude receives raw text request descriptions and returns structured title, category, and urgency.
- **Task prioritization**: feed requests are sent to Claude with context (distance, urgency) to compute a sorted priority list.
- Prompting technique: role assignment + JSON schema specification + chain-of-thought example for consistent outputs.

## Challenges & Solutions
| Challenge | Solution | Lessons/Learnings | Next Time |
|-----------|----------|-------------------|-----------|
| Prompting Claude reliably | Used structured prompts (role, schema, example) to stabilize JSON output | Prompt engineering is critical for deterministic responses | Standardize prompts before coding integrations |
| End-to-end integration (Auth → Firestore → Maps/Places) | Wired each service incrementally, tested UI at each stage | Integrations expose schema gaps; incremental testing saves time | Plan integration checkpoints & schemas up front |
| Geocoding/Places in browser (CORS/key restrictions) | Switched to the Maps JS SDK loader + PlacesService instead of REST fetches | Learned Google Maps platform nuances; script loading matters | Use official SDKs or backend proxies for restricted APIs |
| Time/scope creep | Focused on MVP flow (auth → request → volunteer) and tracked stretch ideas separately | Prioritization keeps MVP shippable | Finalize feature list before build sprint |

## Future Plans
- Voice input & SMS/Push notifications
- Real-time Firestore listeners for updates
- Rating & reputation system
- Admin verification workflow and trust/safety tooling

## Team Members & Contributions
- **Frontend/UX**: React pages (Login, Dashboard, RequestForm, VolunteerFeed), styling, accessibility. - Sun Kongsonthana nk577
- **Backend/Integration**: Firebase setup (Auth, Firestore schema, Storage), Google OAuth/Maps/Places integration - Boss Ratchaphon rl896
- **AI & Prioritization**: Claude prompt design, request parsing, volunteer feed prioritization logic - Boss Ratchaphon rl896
- **Product & QA**: Feature scoping, documentation, README, and manual testing of request/volunteer flows -  Sun Kongsonthana nk577
