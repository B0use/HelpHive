# Urgent Task Proximity Notifications

## Overview
This system sends email notifications to volunteers when they are near urgent/emergency help requests.

## Architecture

```
┌─────────────────┐
│   New Urgent    │
│  Request Added  │
└────────┬────────┘
         │
         ▼
┌─────────────────────────────────┐
│  Firebase Cloud Function        │
│  "onUrgentRequestCreated"       │
│  Triggers on new request        │
└────────┬────────────────────────┘
         │
         ▼
┌─────────────────────────────────┐
│  Query Active Volunteers        │
│  - Online in last 30 min        │
│  - Has location data            │
│  - Notifications enabled        │
└────────┬────────────────────────┘
         │
         ▼
┌─────────────────────────────────┐
│  Calculate Distance             │
│  Use Haversine formula          │
│  Filter by proximity (<5km)     │
└────────┬────────────────────────┘
         │
         ▼
┌─────────────────────────────────┐
│  Check Notification Limits      │
│  - Max 3 emails per hour        │
│  - Deduplicate recent sends     │
└────────┬────────────────────────┘
         │
         ▼
┌─────────────────────────────────┐
│  Send Email Notification        │
│  via SendGrid/Mailgun           │
└─────────────────────────────────┘
```

## Implementation Steps

### Phase 1: Database Schema Updates

Add to `users` collection:
```javascript
{
  email: "volunteer@email.com",
  location: {
    lat: 42.1234,
    lng: -76.5678,
    lastUpdated: timestamp,
    isActive: true  // User is currently online
  },
  notificationPreferences: {
    urgentTasksNearby: true,
    maxRadius: 5, // km
    urgencyLevels: ['high', 'emergency']
  },
  notificationHistory: [
    {
      requestId: "req123",
      sentAt: timestamp,
      type: "urgent_nearby"
    }
  ]
}
```

### Phase 2: Firebase Cloud Functions Setup

#### Install Firebase CLI
```bash
npm install -g firebase-tools
firebase login
firebase init functions
```

#### Install Dependencies
```bash
cd functions
npm install --save sendgrid nodemailer @sendgrid/mail
npm install --save geofire-common
```

### Phase 3: Cloud Function Implementation

Create `functions/index.js`:

```javascript
const functions = require('firebase-functions');
const admin = require('firebase-admin');
const sgMail = require('@sendgrid/mail');
const { distanceBetween } = require('geofire-common');

admin.initializeApp();
const db = admin.firestore();

// Set your SendGrid API key
sgMail.setApiKey(functions.config().sendgrid.key);

// Configuration
const PROXIMITY_RADIUS_KM = 5; // Notify volunteers within 5km
const MAX_NOTIFICATIONS_PER_HOUR = 3;
const NOTIFICATION_COOLDOWN_MS = 60 * 60 * 1000; // 1 hour

/**
 * Triggers when a new request is created or updated to urgent
 */
exports.onUrgentRequestCreated = functions.firestore
  .document('requests/{requestId}')
  .onWrite(async (change, context) => {
    const request = change.after.exists ? change.after.data() : null;
    const previousRequest = change.before.exists ? change.before.data() : null;

    // Only proceed if this is a new urgent/emergency request
    // Or if an existing request was just updated to urgent
    const isNewUrgent = request &&
      (request.urgencyLevel === 'high' || request.urgencyLevel === 'emergency') &&
      request.status === 'open' &&
      (!previousRequest ||
       previousRequest.urgencyLevel !== request.urgencyLevel);

    if (!isNewUrgent) {
      console.log('Not an urgent request, skipping notification');
      return null;
    }

    const requestLocation = request.location;
    if (!requestLocation?.lat || !requestLocation?.lng) {
      console.log('Request has no location, skipping');
      return null;
    }

    console.log(`Processing urgent request: ${context.params.requestId}`);

    try {
      // Query volunteers who are eligible for notifications
      const volunteersSnapshot = await db.collection('users')
        .where('userType', '==', 'volunteer')
        .where('notificationPreferences.urgentTasksNearby', '==', true)
        .get();

      const notificationPromises = [];
      const now = Date.now();

      for (const volunteerDoc of volunteersSnapshot.docs) {
        const volunteer = volunteerDoc.data();
        const volunteerId = volunteerDoc.id;

        // Check if volunteer has location
        if (!volunteer.location?.lat || !volunteer.location?.lng) {
          continue;
        }

        // Check if volunteer was active recently (within 30 minutes)
        const lastActive = volunteer.location?.lastUpdated?.toMillis() || 0;
        const thirtyMinutesAgo = now - (30 * 60 * 1000);
        if (lastActive < thirtyMinutesAgo) {
          continue; // Volunteer not recently active
        }

        // Calculate distance
        const distance = distanceBetween(
          [requestLocation.lat, requestLocation.lng],
          [volunteer.location.lat, volunteer.location.lng]
        );
        const distanceKm = distance;

        // Check proximity
        const maxRadius = volunteer.notificationPreferences?.maxRadius || PROXIMITY_RADIUS_KM;
        if (distanceKm > maxRadius) {
          continue; // Too far away
        }

        // Check notification rate limit
        const recentNotifications = (volunteer.notificationHistory || [])
          .filter(n => (now - n.sentAt.toMillis()) < NOTIFICATION_COOLDOWN_MS);

        if (recentNotifications.length >= MAX_NOTIFICATIONS_PER_HOUR) {
          console.log(`Volunteer ${volunteerId} has reached notification limit`);
          continue;
        }

        // Check if already notified about this request
        const alreadyNotified = (volunteer.notificationHistory || [])
          .some(n => n.requestId === context.params.requestId);

        if (alreadyNotified) {
          continue;
        }

        // Send notification
        console.log(`Sending notification to ${volunteer.email} (${distanceKm.toFixed(1)}km away)`);

        notificationPromises.push(
          sendUrgentTaskEmail(volunteer, request, distanceKm, context.params.requestId)
            .then(() => {
              // Update notification history
              return db.collection('users').doc(volunteerId).update({
                notificationHistory: admin.firestore.FieldValue.arrayUnion({
                  requestId: context.params.requestId,
                  sentAt: admin.firestore.Timestamp.now(),
                  type: 'urgent_nearby',
                  distance: distanceKm
                })
              });
            })
            .catch(error => {
              console.error(`Failed to notify ${volunteer.email}:`, error);
            })
        );
      }

      await Promise.all(notificationPromises);
      console.log(`Sent ${notificationPromises.length} notifications`);

      return null;
    } catch (error) {
      console.error('Error processing urgent task notifications:', error);
      return null;
    }
  });

/**
 * Send email notification to volunteer
 */
async function sendUrgentTaskEmail(volunteer, request, distanceKm, requestId) {
  const msg = {
    to: volunteer.email,
    from: 'notifications@helphive.com', // Your verified sender
    subject: `🚨 Urgent Help Needed Near You (${distanceKm.toFixed(1)}km away)`,
    text: `
Hello ${volunteer.displayName || 'Volunteer'},

An urgent help request has been posted near your location:

${request.title}
${request.description}

Distance: ${distanceKm.toFixed(1)} km away
Urgency: ${request.urgencyLevel.toUpperCase()}
Category: ${request.category}
Location: ${request.location.address || 'Address provided in app'}

People needed: ${request.peopleNeeded || 1}

View and respond to this request in the HelpHive app:
${functions.config().app.url}/volunteer-feed

Thank you for being a part of our community!

---
To manage your notification preferences, visit your profile settings.
    `.trim(),
    html: `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #ffeaa2 0%, #ffc152 100%);
              padding: 30px; border-radius: 12px; text-align: center; }
    .header h1 { margin: 0; color: #3f2e10; }
    .urgency-badge {
      display: inline-block;
      padding: 8px 16px;
      border-radius: 20px;
      font-weight: bold;
      margin: 10px 0;
    }
    .urgency-emergency { background: #d32f2f; color: white; }
    .urgency-high { background: #ffebee; color: #c62828; }
    .content { background: white; padding: 30px; border-radius: 12px;
               margin: 20px 0; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
    .task-title { font-size: 24px; margin: 0 0 15px; color: #3f2e10; }
    .meta { color: #666; margin: 10px 0; }
    .meta strong { color: #333; }
    .cta-button {
      display: inline-block;
      background: #ffc152;
      color: #3f2e10;
      padding: 15px 30px;
      border-radius: 8px;
      text-decoration: none;
      font-weight: bold;
      margin: 20px 0;
    }
    .footer { text-align: center; color: #999; font-size: 12px; margin-top: 30px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🚨 Urgent Help Needed Near You</h1>
      <p style="margin: 10px 0 0; color: #3f2e10;">
        <strong>${distanceKm.toFixed(1)} km</strong> from your location
      </p>
    </div>

    <div class="content">
      <h2 class="task-title">${request.title}</h2>

      <span class="urgency-badge urgency-${request.urgencyLevel}">
        ${request.urgencyLevel.toUpperCase()}
      </span>

      <p style="font-size: 16px; line-height: 1.8;">
        ${request.description}
      </p>

      <div class="meta">
        <p><strong>Category:</strong> ${request.category}</p>
        <p><strong>People needed:</strong> ${request.peopleNeeded || 1}</p>
        <p><strong>Location:</strong> ${request.location.address || 'See app for details'}</p>
      </div>

      <center>
        <a href="${functions.config().app.url}/volunteer-feed"
           class="cta-button">
          View & Respond in App →
        </a>
      </center>
    </div>

    <div class="footer">
      <p>You're receiving this because you enabled urgent task notifications.</p>
      <p><a href="${functions.config().app.url}/profile">Manage notification preferences</a></p>
    </div>
  </div>
</body>
</html>
    `.trim()
  };

  return sgMail.send(msg);
}

/**
 * Clean up old notification history (run daily)
 */
exports.cleanupNotificationHistory = functions.pubsub
  .schedule('every 24 hours')
  .onRun(async (context) => {
    const sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);

    const usersSnapshot = await db.collection('users').get();

    const updatePromises = usersSnapshot.docs.map(doc => {
      const data = doc.data();
      if (!data.notificationHistory) return Promise.resolve();

      const recentHistory = data.notificationHistory.filter(
        n => n.sentAt.toMillis() > sevenDaysAgo
      );

      if (recentHistory.length === data.notificationHistory.length) {
        return Promise.resolve(); // No cleanup needed
      }

      return db.collection('users').doc(doc.id).update({
        notificationHistory: recentHistory
      });
    });

    await Promise.all(updatePromises);
    console.log('Cleaned up notification history');
    return null;
  });
```

### Phase 4: Frontend Integration

#### Update User Profile Settings

Add to `src/pages/Profile.js`:

```javascript
// Add notification preferences state
const [notificationPrefs, setNotificationPrefs] = useState({
  urgentTasksNearby: true,
  maxRadius: 5,
  urgencyLevels: ['high', 'emergency']
});

// Save preferences to Firestore
const saveNotificationPreferences = async () => {
  await updateDoc(doc(db, 'users', currentUser.uid), {
    notificationPreferences: notificationPrefs
  });
};

// UI Component
<div className="notification-settings">
  <h3>Notification Preferences</h3>

  <label>
    <input
      type="checkbox"
      checked={notificationPrefs.urgentTasksNearby}
      onChange={(e) => setNotificationPrefs({
        ...notificationPrefs,
        urgentTasksNearby: e.target.checked
      })}
    />
    Email me about urgent tasks near my location
  </label>

  <div className="radius-setting">
    <label>Notification radius: {notificationPrefs.maxRadius} km</label>
    <input
      type="range"
      min="1"
      max="20"
      value={notificationPrefs.maxRadius}
      onChange={(e) => setNotificationPrefs({
        ...notificationPrefs,
        maxRadius: parseInt(e.target.value)
      })}
    />
  </div>

  <button onClick={saveNotificationPreferences}>
    Save Preferences
  </button>
</div>
```

#### Update Location Tracking

Add to `src/pages/VolunteerFeed.js`:

```javascript
// Update volunteer location periodically
useEffect(() => {
  if (!currentUser || !userLocation) return;

  const updateLocationInDB = async () => {
    await updateDoc(doc(db, 'users', currentUser.uid), {
      'location.lat': userLocation.lat,
      'location.lng': userLocation.lng,
      'location.lastUpdated': serverTimestamp(),
      'location.isActive': true
    });
  };

  // Update immediately
  updateLocationInDB();

  // Update every 5 minutes while on the page
  const interval = setInterval(updateLocationInDB, 5 * 60 * 1000);

  // Mark as inactive when leaving
  return () => {
    clearInterval(interval);
    updateDoc(doc(db, 'users', currentUser.uid), {
      'location.isActive': false
    });
  };
}, [currentUser, userLocation]);
```

### Phase 5: Email Service Setup

#### Option A: SendGrid (Recommended)

1. **Sign up**: https://sendgrid.com/
2. **Get API key**: Settings → API Keys → Create API Key
3. **Verify sender**: Sender Authentication → Verify Single Sender
4. **Set config**:
```bash
firebase functions:config:set sendgrid.key="YOUR_API_KEY"
firebase functions:config:set app.url="http://localhost:3000"
```

#### Option B: Mailgun

1. **Sign up**: https://www.mailgun.com/
2. **Get API key**: Settings → API Keys
3. **Update functions** to use Mailgun instead

#### Option C: Firebase Extensions

```bash
firebase ext:install firebase/firestore-send-email
```

### Phase 6: Testing

#### Local Testing
```bash
cd functions
npm run serve

# In another terminal
firebase functions:shell
> onUrgentRequestCreated({requestId: 'test123'})
```

#### Deploy
```bash
firebase deploy --only functions
```

### Phase 7: Environment Variables

Create `functions/.env`:
```
SENDGRID_API_KEY=your_key_here
APP_URL=https://helphive.com
```

## Security Rules

Update `firestore.rules`:

```javascript
match /users/{userId} {
  allow read: if request.auth != null;
  allow write: if request.auth.uid == userId;

  // Only allow updating own notification preferences
  allow update: if request.auth.uid == userId
    && request.resource.data.diff(resource.data).affectedKeys()
      .hasOnly(['notificationPreferences', 'location']);
}
```

## Cost Estimation

- **SendGrid**: Free tier = 100 emails/day (enough for testing)
- **Firebase Functions**: Free tier = 2M invocations/month
- **Firestore**: Free tier = 50K reads/day

For production, estimate:
- 100 volunteers × 3 notifications/hour × 12 hours = 3,600 emails/day
- SendGrid: ~$15/month (40K emails)

## Privacy Considerations

1. **User Consent**: Clearly explain location tracking in terms of service
2. **Opt-in**: Notifications are opt-in only
3. **Data Retention**: Clean up location data after 7 days
4. **Transparency**: Show users when they were last tracked

## Future Enhancements

- [ ] SMS notifications (Twilio)
- [ ] Push notifications (Firebase Cloud Messaging)
- [ ] In-app notifications
- [ ] Smart scheduling (don't send at night)
- [ ] Volunteer skill matching
- [ ] Language preferences
- [ ] Digest emails (daily summary instead of real-time)

## Monitoring

Add analytics to track:
- Email open rates
- Click-through rates
- Response times
- Notification effectiveness
