# Dynamo AI - Mobile App Conversion Guide

**Date**: March 31, 2026  
**Project**: Dynamo AI Research OS  
**Target Platforms**: iOS (React Native) & Android

---

## Executive Summary

Dynamo AI is currently a web application with:
- **Backend**: FastAPI (Python) running on port 8000
- **Frontend**: Static HTML/JS with Tailwind CSS on port 5000
- **Database**: Supabase (PostgreSQL)
- **Auth**: Firebase
- **Integrations**: 8+ third-party AI/ML services

This document outlines the strategy and requirements to convert it into a cross-platform mobile application.

---

## Current Architecture Overview

```
┌─────────────────────┐
│   Frontend (Web)    │ Static HTML/JS/Tailwind
│  - index.html       │ Port 5000
│  - chat.js          │
│  - sidebar.js       │
│  - ui.js            │
└──────────┬──────────┘
           │ HTTP Requests
           ↓
┌─────────────────────┐
│   FastAPI Backend   │ Python
│  - main.py          │ Port 8000
│  - supabase_client  │ REST API
│  - payments.py      │
└──────────┬──────────┘
           │ Database Queries
           ↓
┌─────────────────────┐
│ External Services   │
│ - Supabase (Auth)   │
│ - Groq / Gemini     │
│ - Tavily Search     │
│ - Razorpay          │
│ - Pollinations AI   │
│ - Firebase          │
│ - Edge TTS          │
└─────────────────────┘
```

---

## Phase 1: Pre-Mobile Setup (1-2 weeks)

### 1.1 Backend Hardening
- [ ] Ensure all API endpoints return consistent JSON responses
- [ ] Add CORS headers for mobile domain origins
- [ ] Implement rate limiting on all public endpoints
- [ ] Add request validation & error handling (all exceptions should return `{ error: string, code: string }`)
- [ ] Version all endpoints (`/api/v1/...`)
- [ ] Document all API routes in OpenAPI/Swagger format
- [ ] Add request/response timeouts (mobile networks are slower)

### 1.2 API Endpoints Required (Audit)

**Chat & Messages**
- `POST /api/v1/chat/send` — Send a message
- `GET /api/v1/chat/history` — Fetch conversation history (with pagination)
- `DELETE /api/v1/chat/{message_id}` — Delete a message
- `PATCH /api/v1/chat/{message_id}` — Edit a message

**AI Features**
- `POST /api/v1/image/generate` — Generate images
- `POST /api/v1/video/generate` — Generate videos
- `POST /api/v1/analyze` — Data analysis
- `POST /api/v1/flowchart` — Generate flowcharts
- `POST /api/v1/mindmap` — Generate mindmaps
- `POST /api/v1/summarize` — Summarize content
- `POST /api/v1/search` — Web search

**User & Auth**
- `POST /api/v1/auth/login` — Firebase login
- `GET /api/v1/user/profile` — User profile
- `GET /api/v1/user/quota` — Current usage quota
- `PATCH /api/v1/user/profile` — Update profile

**Payments**
- `POST /api/v1/payments/create-order` — Create Razorpay order
- `POST /api/v1/payments/verify` — Verify payment
- `GET /api/v1/payments/subscriptions` — Active subscriptions

**Memory & Knowledge**
- `POST /api/v1/memory/add` — Save to memory
- `GET /api/v1/memory/list` — Retrieve memory
- `DELETE /api/v1/memory/{memory_id}` — Delete memory

**Voice**
- `POST /api/v1/voice/text-to-speech` — Convert text to audio

### 1.3 Authentication Flow

**Current**: Firebase auth (JWT token stored in browser localStorage)

**Mobile Changes**:
- [ ] Move from localStorage → Secure keychain (iOS) / Keystore (Android)
- [ ] Implement refresh token rotation
- [ ] Add biometric auth support (fingerprint/face ID)
- [ ] Store auth state in Redux/Zustand + encrypted persistence

### 1.4 Database & Supabase

**Required Tables** (audit existing schema):
- `users` — User profiles, plan, quotas
- `chat_messages` — Chat history with content, metadata
- `subscriptions` — Payment/plan info
- `memory` — User's memory bank
- Ensure indexes on: `user_id`, `created_at`, `plan`

---

## Phase 2: Choose Mobile Framework (Decision Point)

### Option A: React Native + Expo (Recommended for Speed)

**Pros**:
- Code sharing between iOS & Android
- Hot reload during dev
- Existing JS/TS knowledge transfers
- Large community & libraries
- Easier to launch

**Cons**:
- Performance overhead vs native
- Some platform-specific APIs need custom modules

**Tech Stack**:
```
React Native 0.73+
├─ Expo (SDK 50+)
├─ React Navigation (stack, tabs, drawer)
├─ Redux Toolkit + Redux Persist (state management)
├─ React Query (API calls & caching)
├─ Tailwind CSS → NativeWind (styling)
├─ Firebase Auth
├─ Supabase Client (realtime DB)
├─ Razorpay RN SDK
├─ Expo AV (audio/video)
└─ Native modules (camera, file system, biometrics)
```

### Option B: Native (iOS + Android Separately)

**Pros**:
- Best performance
- Full platform access
- Best UX per platform

**Cons**:
- 2x development cost
- Need two teams (Swift + Kotlin)
- Slower feature velocity

### Option C: Flutter

**Pros**:
- Single codebase, native performance
- Google-backed, growing community

**Cons**:
- No JS code reuse
- Smaller ecosystem than React Native

---

## Phase 3: Mobile App Architecture

### Recommended: React Native + Expo Stack

```
dynamo-mobile/
├─ apps/
│  ├─ mobile/
│  │  ├─ app.json (Expo config)
│  │  ├─ src/
│  │  │  ├─ navigation/
│  │  │  │  ├─ AuthNavigator.tsx
│  │  │  │  ├─ MainNavigator.tsx (tabs + drawer)
│  │  │  │  └─ RootNavigator.tsx
│  │  │  ├─ screens/
│  │  │  │  ├─ auth/ (Login, Register, Onboarding)
│  │  │  │  ├─ chat/ (ChatList, ChatDetail, NewChat)
│  │  │  │  ├─ features/ (Image, Video, Analysis, Search)
│  │  │  │  ├─ memory/ (MemoryBank)
│  │  │  │  ├─ profile/ (Profile, Settings, Billing)
│  │  │  │  ├─ pricing/ (Plans & Upgrade)
│  │  │  │  └─ payment/ (Checkout)
│  │  │  ├─ components/
│  │  │  │  ├─ MessageBubble.tsx
│  │  │  │  ├─ QuotaBar.tsx
│  │  │  │  ├─ LoadingIndicator.tsx
│  │  │  │  └─ ... (reusable UI)
│  │  │  ├─ services/
│  │  │  │  ├─ api.ts (axios/fetch wrapper)
│  │  │  │  ├─ auth.ts (Firebase client SDK)
│  │  │  │  ├─ supabase.ts (Supabase client)
│  │  │  │  ├─ payments.ts (Razorpay integration)
│  │  │  │  └─ storage.ts (Secure keychain)
│  │  │  ├─ store/
│  │  │  │  ├─ slices/ (Redux slices)
│  │  │  │  ├─ hooks.ts (custom hooks)
│  │  │  │  └─ store.ts (Redux setup)
│  │  │  ├─ hooks/
│  │  │  │  ├─ useAuth.ts
│  │  │  │  ├─ useChat.ts
│  │  │  │  ├─ useQuota.ts
│  │  │  │  └─ usePagination.ts
│  │  │  ├─ utils/
│  │  │  │  ├─ constants.ts
│  │  │  │  ├─ formatters.ts (date, text)
│  │  │  │  └─ validators.ts
│  │  │  ├─ types/
│  │  │  │  ├─ api.ts (API response types)
│  │  │  │  ├─ domain.ts (business logic types)
│  │  │  │  └─ navigation.ts
│  │  │  └─ App.tsx (entry point)
│  │  ├─ babel.config.js
│  │  ├─ tsconfig.json
│  │  └─ package.json
│  │
│  └─ backend/ (existing, no changes needed)
│
└─ packages/
   ├─ shared/ (TS types shared between web & mobile)
   │  ├─ src/
   │  │  ├─ types/
   │  │  │  ├─ chat.ts
   │  │  │  ├─ user.ts
   │  │  │  ├─ payment.ts
   │  │  │  └─ api.ts
   │  │  └─ constants/
   │  │     ├─ quotas.ts
   │  │     └─ plans.ts
   │  └─ package.json
   └─ backend-client/ (optional, API client library)
      ├─ src/
      │  ├─ client.ts
      │  ├─ endpoints/
      │  │  ├─ chat.ts
      │  │  ├─ auth.ts
      │  │  ├─ payments.ts
      │  │  └─ ...
      │  └─ types.ts
      └─ package.json
```

### Key Mobile Considerations

1. **Offline Support**
   - Use React Query for caching
   - Implement local SQLite for message drafts
   - Queue API requests while offline

2. **Push Notifications**
   - Expo Notifications for iOS/Android
   - Firebase Cloud Messaging (FCM) backend integration
   - Send notifications for: new responses, quota alerts, subscription reminders

3. **File Handling**
   - Use Expo Image Picker (photos)
   - Expo Document Picker (files)
   - Expo FileSystem for local storage
   - Handle image compression before upload

4. **Performance Optimization**
   - Image optimization (resize, compress)
   - Lazy load message lists (pagination)
   - Code splitting & dynamic imports
   - Minimize bundle size (tree-shake unused code)

5. **Network Optimization**
   - Implement request deduplication
   - Use WebSockets for real-time chat (optional, use Supabase realtime)
   - Compression (gzip) for payloads
   - Exponential backoff retry strategy

---

## Phase 4: Feature Parity Checklist

### Core Chat Features
- [ ] Real-time message sending
- [ ] Message history with pagination
- [ ] Typing indicators (optional)
- [ ] Message reactions/emoji
- [ ] Image/file attachments
- [ ] Copy/delete/edit messages
- [ ] Message search
- [ ] Conversation management (new, list, delete)

### Smart Actions
- [ ] Smart Summarize
- [ ] Smart Explain
- [ ] Image generation with Pollinations AI
- [ ] Video generation
- [ ] Flowchart generation
- [ ] Mindmap generation
- [ ] Web search
- [ ] Data analysis

### Audio/Voice
- [ ] Text-to-speech (Edge TTS)
- [ ] Audio playback (Expo AV)
- [ ] Speech-to-text (Expo Speech Recognition)

### User Features
- [ ] Profile management
- [ ] Settings (theme, notifications, language)
- [ ] Quota display & tracking
- [ ] Memory bank (save important info)
- [ ] Chat search & filters

### Billing & Payments
- [ ] Plan selection (Free, Plus ₹199, Pro ₹499)
- [ ] Razorpay payment integration
- [ ] Subscription management
- [ ] Usage statistics

---

## Phase 5: Expo Build Setup

### Build Configuration (eas.json)

```json
{
  "cli": {
    "version": ">= 5.0.0"
  },
  "build": {
    "preview": {
      "android": {
        "buildType": "apk"
      }
    },
    "preview2": {
      "android": {
        "buildType": "aab"
      }
    },
    "production": {
      "android": {
        "buildType": "aab"
      },
      "ios": {
        "buildType": "app-store"
      }
    }
  },
  "submit": {
    "production": {
      "android": {
        "serviceAccount": "...",
        "track": "internal"
      },
      "ios": {
        "appleId": "...",
        "ascAppId": "..."
      }
    }
  }
}
```

### Distribution Strategy

1. **Development**: Expo Go app or development build
2. **Internal Testing**: Ad-hoc/internal track (Google Play, TestFlight)
3. **Production**:
   - iOS: App Store (TestFlight → Production)
   - Android: Google Play (internal → beta → production)

---

## Phase 6: Deployment & Rollout

### Prerequisites
- [ ] Apple Developer Account ($99/year)
- [ ] Google Play Developer Account ($25 one-time)
- [ ] Expo Account & EAS (Expo Application Services)
- [ ] Code signing certificates (iOS)
- [ ] Keystore (Android)

### Release Checklist

#### Pre-Release QA
- [ ] Full feature testing on iOS & Android devices
- [ ] Network error handling (test on WiFi, 4G, offline)
- [ ] Payment flow end-to-end testing
- [ ] Push notification testing
- [ ] Quota enforcement testing
- [ ] Auth flows (login, signup, logout, refresh token)
- [ ] Performance profiling (bundle size, memory, CPU)

#### App Store Setup
- **iOS**:
  - [ ] App name, description, keywords
  - [ ] Privacy policy & terms of service
  - [ ] Screenshots (5-8 per device)
  - [ ] App icon (1024x1024)
  - [ ] Launch screen
  - [ ] Video preview (optional)

- **Android**:
  - [ ] App title, description, short description
  - [ ] Feature graphic (1024x500)
  - [ ] Screenshots (2-8)
  - [ ] App icon (512x512)
  - [ ] Permissions disclosure
  - [ ] Content rating

#### First Release
- [ ] Semantic versioning: `1.0.0` for initial release
- [ ] Detailed release notes
- [ ] Staged rollout (25% → 50% → 100% for Android)
- [ ] Monitor crash analytics (Sentry/LogRocket)
- [ ] Monitor user feedback & ratings

---

## Phase 7: Backend Changes Required

### API Modifications

1. **Add Mobile Device Detection**
   ```python
   @app.get("/api/v1/chat/history")
   async def get_chat_history(
       user_id: str,
       limit: int = 50,
       offset: int = 0,
       device: str = "web"  # "mobile", "web"
   ):
       # Return lighter payload for mobile (exclude non-essential fields)
       pass
   ```

2. **Implement Pagination**
   ```python
   {
       "data": [...],
       "pagination": {
           "total": 1000,
           "limit": 50,
           "offset": 0,
           "hasMore": True
       }
   }
   ```

3. **Add Request Compression**
   - Gzip responses for mobile networks

4. **Implement Proper Error Codes**
   ```python
   {
       "error": "message",
       "code": "QUOTA_EXCEEDED",  # Machine-readable
       "details": {}
   }
   ```

5. **API Rate Limiting**
   - Per user, per endpoint
   - 429 status code for exceeding limits

### Database Optimization

1. **Add Indexes**
   ```sql
   CREATE INDEX idx_chat_messages_user_id_created_at 
   ON chat_messages(user_id, created_at DESC);
   
   CREATE INDEX idx_users_plan ON users(plan);
   ```

2. **Implement Soft Deletes**
   - Add `deleted_at` column instead of hard deletion

3. **Archive Old Data**
   - Move messages older than 1 year to cold storage

---

## Phase 8: Post-Launch Support

### Monitoring & Analytics

**Essential Metrics**:
- Crash rate (Sentry)
- API error rate (Datadog)
- User engagement (Firebase Analytics)
- Conversion rate (plans purchased)
- Subscription churn rate
- Average session duration
- Feature usage (which features are popular)

**Tools**:
- Sentry (error tracking)
- Amplitude or Mixpanel (analytics)
- Firebase Analytics (built-in)
- Datadog or New Relic (backend monitoring)

### Update Strategy

- **Critical bugs**: Push immediately
- **Features**: Bi-weekly releases (gradual rollout)
- **Security patches**: ASAP
- **Minor updates**: Monthly

### Support Channels

- [ ] In-app crash reporter (Sentry)
- [ ] Feedback form (feature requests)
- [ ] Email support integration
- [ ] FAQ/Help section in app
- [ ] Discord/Community (optional)

---

## Timeline Estimate

| Phase | Task | Duration | Team |
|-------|------|----------|------|
| Phase 1 | Backend hardening & API setup | 1-2 weeks | 1 Backend Dev |
| Phase 2 | Framework decision & project setup | 2-3 days | 1 Tech Lead |
| Phase 3 | Navigation & authentication | 1 week | 1-2 Frontend Devs |
| Phase 4 | Core chat & features | 3-4 weeks | 2 Frontend Devs |
| Phase 5 | Payments, notifications, polish | 2 weeks | 1-2 Frontend Devs |
| Phase 6 | QA & bug fixes | 2 weeks | 1 QA + Devs |
| Phase 7 | App store submissions | 1 week | 1 DevOps + PM |
| Phase 8 | Launch & monitoring | Ongoing | All |
| **Total** | | **10-12 weeks** | 2-3 Devs |

---

## Technology Stack Summary

| Layer | Technology | Reason |
|-------|-----------|--------|
| Framework | React Native + Expo | Code sharing, JS ecosystem, fast iteration |
| State Management | Redux Toolkit + Persist | Proven, offline support, dev tools |
| Networking | React Query + Axios | Caching, retries, optimistic updates |
| Database (local) | SQLite (Expo) | Lightweight, reliable |
| Database (remote) | Supabase (PostgreSQL) | Already in use, good RN client |
| Authentication | Firebase Auth | Already in use, cross-platform |
| Styling | NativeWind | Tailwind-like DX, matches web |
| Navigation | React Navigation | Industry standard |
| Payments | Razorpay RN SDK | Already integrated in web |
| Analytics | Firebase Analytics | Built-in, free tier good |
| Error Tracking | Sentry | Best React Native support |

---

## Risk Mitigation

| Risk | Impact | Mitigation |
|------|--------|-----------|
| Expo limitations | Might need custom modules | Research early, test with PoC |
| API scalability | More concurrent requests from mobile users | Add caching, rate limiting, CDN |
| Storage quota exceeding | Users hit Supabase limits | Implement data archival, cleanup |
| Payment processing failures | Lost revenue, confused users | Implement retry logic, email notifications |
| Poor offline support | Bad UX on mobile networks | Use React Query caching, SQLite |
| Long build times | Slow development cycle | Use Expo Go for dev, optimize for production |

---

## Next Steps

1. **Week 1**: Audit backend API & begin Phase 1 hardening
2. **Week 1-2**: Set up Expo project with authentication
3. **Week 2-4**: Build navigation and core chat UI
4. **Week 4-6**: Integrate all AI features
5. **Week 6-8**: Payments, notifications, and polish
6. **Week 8-10**: QA, bug fixes, and store submissions
7. **Week 10-12**: Launch and post-launch monitoring

---

## Questions to Answer Before Starting

1. What's the launch timeline? (MVP vs feature-complete)
2. Is offline functionality critical?
3. Should we support older iOS/Android versions? (impacts framework choice)
4. Do we need video calling/screenshare? (requires additional setup)
5. Budget for app store accounts + code signing certificates?
6. Team size and React Native experience level?

---

## Resources & Documentation

- [React Native Official](https://reactnative.dev/)
- [Expo Documentation](https://docs.expo.dev/)
- [React Navigation](https://reactnavigation.org/)
- [Firebase RN SDK](https://rnfirebase.io/)
- [Supabase RN Client](https://supabase.com/docs/reference/javascript/introduction)
- [EAS Build Documentation](https://docs.expo.dev/build/introduction/)
- [App Store Connect](https://appstoreconnect.apple.com/)
- [Google Play Console](https://play.google.com/console/)

---

**Document Version**: 1.0  
**Last Updated**: March 31, 2026  
**Author**: AI Agent
