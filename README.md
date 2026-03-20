# AmplifyKS

A mobile application for tracking Kansas Legislature bills and submitting testimony. Built with Expo and React Native.

## Features

- **Browse Bills**: View all bills from the current Kansas Legislature session
- **Bill Details**: See comprehensive information including sponsors, status, legislative history, and bill text
- **Search**: Search bills by number, title, or description
- **Submit Testimony**: Submit testimony for legislation directly from the app
- **Real-time Data**: Powered by the LegiScan API for up-to-date legislative information

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Configure LegiScan API

This app uses the [LegiScan API](https://legiscan.com/legiscan) to fetch Kansas Legislature data.

1. Get your free API key from [LegiScan](https://legiscan.com/legiscan)
2. Copy `.env.example` to `.env`
3. Add your API key to the `.env` file:

```
LEGISCAN_API_KEY=your_api_key_here
```

**Note**: The `.env` file is already in `.gitignore` to keep your API key secure.

### 3. Start the app

```bash
npx expo start
```

In the output, you'll find options to open the app in a

- [development build](https://docs.expo.dev/develop/development-builds/introduction/)
- [Android emulator](https://docs.expo.dev/workflow/android-studio-emulator/)
- [iOS simulator](https://docs.expo.dev/workflow/ios-simulator/)
- [Expo Go](https://expo.dev/go), a limited sandbox for trying out app development with Expo

You can start developing by editing the files inside the **app** directory. This project uses [file-based routing](https://docs.expo.dev/router/introduction).

## Project Structure

```
app/
├── (tabs)/
│   ├── _layout.tsx      # Tab navigation configuration
│   ├── index.tsx        # Home screen
│   ├── bills.tsx        # Bills list screen
│   ├── testimony.tsx    # Testimony submission form
│   └── explore.tsx      # Explore screen
├── bill-detail.tsx      # Bill detail screen
└── _layout.tsx          # Root layout

services/
└── legiscan.ts          # LegiScan API service

components/
├── themed-text.tsx      # Themed text component
├── themed-view.tsx      # Themed view component
└── ui/                  # UI components
```

## Deployment (Netlify)

The app deploys to Netlify via `netlify.toml`. Set these environment variables in **Site settings → Build & deploy → Environment variables**:

| Variable | Description |
|----------|-------------|
| `EXPO_PUBLIC_FIREBASE_API_KEY` | Firebase project API key |
| `EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN` | e.g. `your-project.firebaseapp.com` |
| `EXPO_PUBLIC_FIREBASE_PROJECT_ID` | Firebase project ID |
| `EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET` | Firebase storage bucket |
| `EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | Firebase messaging sender ID |
| `EXPO_PUBLIC_FIREBASE_APP_ID` | Firebase app ID |
| `EXPO_PUBLIC_OPENSTATES_API_KEY` | OpenStates API key for officials lookup |
| `LEGISCAN_API_KEY` | LegiScan API key for bills data |

Without these, the build may succeed but auth and some features will fail at runtime.

## Technology Stack

- **Framework**: [Expo](https://expo.dev) / React Native
- **Language**: TypeScript
- **Navigation**: Expo Router
- **API**: LegiScan API
- **State Management**: React Hooks

## Learn more

To learn more about developing your project with Expo, look at the following resources:

- [Expo documentation](https://docs.expo.dev/): Learn fundamentals, or go into advanced topics with our [guides](https://docs.expo.dev/guides).
- [Learn Expo tutorial](https://docs.expo.dev/tutorial/introduction/): Follow a step-by-step tutorial where you'll create a project that runs on Android, iOS, and the web.

## Join the community

Join our community of developers creating universal apps.

- [Expo on GitHub](https://github.com/expo/expo): View our open source platform and contribute.
- [Discord community](https://chat.expo.dev): Chat with Expo users and ask questions.
