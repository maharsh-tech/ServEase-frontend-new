# ServeEase - Frontend Platform

## 1. Project Overview

ServeEase is a comprehensive React Native (Expo) frontend for a home services booking platform. It connects customers seeking household help with local maids (house workers). The application provides an intuitive interface for users to browse profiles, view real-time availability, and securely book services. It also offers a dedicated dashboard for service providers to manage their profiles and rates.

## 2. Tech Stack

*   **Framework:** React Native managed by [Expo](https://expo.dev/) (SDK 54).
*   **Language:** JavaScript (ES6+).
*   **Navigation:** React Navigation v7 (`@react-navigation/native`, `@react-navigation/native-stack`, `@react-navigation/bottom-tabs`).
*   **Authentication:** Firebase Authentication (`firebase`, `expo-firebase-recaptcha`).
*   **Maps & Geolocation:** `react-native-maps`, `expo-location`.
*   **UI/Styling:** Native StyleSheet, `@expo/vector-icons`, `expo-linear-gradient`.
*   **Storage:** `@react-native-async-storage/async-storage` for local data persistence.
*   **API Client:** Custom `apiService.js` (typically wrapping Fetch or Axios) interacting with a Spring Boot backend.

## 3. Features

*   **Real-Time Availability Matching:** Customers can select a date and time, and the platform dynamically finds nearby available maids.
*   **Customizable Rates:** Service providers (maids) can set and manage their own hourly rates via the Maid Dashboard.
*   **Interactive Maps:** Visual representation of nearby available maids using `react-native-maps` and user geolocation.
*   **Secure Authentication:** Phone number and email/password login flows powered by Firebase.
*   **Role-Based Navigation:** Distinct navigation flows for regular users and service providers.
*   **Profile Management:** Both users and maids can manage their profiles, settings, and view past/upcoming bookings.

## 4. Project Structure

The project follows a modular and scalable directory structure:

```text
ServeEase-Frontend/
├── assets/                 # Images, fonts, and other static assets
├── src/
│   ├── components/         # Reusable UI components
│   │   ├── Header.js
│   │   ├── MaidCard.js
│   │   ├── MaidMapView.js
│   │   └── SearchBar.js
│   ├── config/             # Configuration files (Firebase, Theme, etc.)
│   ├── navigation/         # React Navigation setup
│   │   ├── AppNavigator.js
│   │   ├── BottomTabNavigator.js
│   │   └── MaidTabNavigator.js
│   ├── screens/            # Application screens/pages
│   │   ├── AuthScreen.js
│   │   ├── BookingsScreen.js
│   │   ├── HomeScreen.js
│   │   ├── MaidDashboardScreen.js
│   │   ├── MaidDetailScreen.js
│   │   ├── MaidSetupScreen.js
│   │   ├── PhoneLoginScreen.js
│   │   ├── ProfileScreen.js
│   │   └── SettingsScreen.js
│   └── services/           # API clients, authentication, and state management
│       ├── apiService.js
│       ├── authService.js
│       └── bookingStore.js
├── App.js                  # Application entry point
├── app.json                # Expo configuration file
├── package.json            # Dependencies and scripts
└── .env                    # Environment variables (not checked into source control)
```

## 5. Getting Started

### Prerequisites

*   **Node.js:** v18+ recommended.
*   **npm or yarn:** Package manager.
*   **Expo CLI:** Install globally if needed (`npm install -g expo-cli`).
*   **Expo Go App:** Installed on your iOS or Android device for testing.

### Installation

1.  Clone the repository and navigate to the frontend directory:
    ```bash
    cd ServeEase-Frontend
    ```
2.  Install project dependencies:
    ```bash
    npm install
    ```

### Environment Setup

1.  Duplicate the `.env.example` file and rename it to `.env`:
    ```bash
    cp .env.example .env
    ```
2.  Open `.env` and fill in your Firebase and Backend API details. Note that Expo requires the `EXPO_PUBLIC_` prefix for client-side access.

```ini
# ===== Firebase Configuration =====
EXPO_PUBLIC_FIREBASE_API_KEY=your_firebase_api_key_here
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project-id.firebaseapp.com
EXPO_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project-id.firebasestorage.app
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789012
EXPO_PUBLIC_FIREBASE_APP_ID=1:123456789012:web:abc123def456

# ===== Backend API =====
# For local development, use your machine's LAN IP address
EXPO_PUBLIC_API_BASE_URL=http://YOUR_LAN_IP:8080/api
```

## 6. Running the App

Start the Expo development server:

```bash
npm start
# or
npx expo start
```

*   **To run on a physical device:** Scan the QR code generated in the terminal using the Expo Go app.
*   **To run on Android Emulator:** Press `a` in the terminal.
*   **To run on iOS Simulator:** Press `i` in the terminal.
*   **To run in a web browser:** Press `w` in the terminal.

### Building for Production

To create a standalone build for app stores, use Expo Application Services (EAS):

```bash
# Install EAS CLI
npm install -g eas-cli

# Login to Expo
eas login

# Configure project
eas build:configure

# Build for Android
eas build --platform android

# Build for iOS
eas build --platform ios
```

## 7. Pages & Components Overview

### Key Screens (`src/screens/`)
*   **`AuthScreen.js` / `PhoneLoginScreen.js`:** Handles user authentication (login/registration) utilizing Firebase.
*   **`HomeScreen.js`:** The main landing screen for customers to start their search.
*   **`MaidDashboardScreen.js`:** A dedicated dashboard for maids to view their schedule, requests, and manage settings.
*   **`MaidDetailScreen.js`:** Displays the full profile, reviews, and booking options for a specific maid.
*   **`MaidSetupScreen.js`:** Onboarding screen for new maids to define their services and hourly rates.
*   **`BookingsScreen.js`:** Shows a list of active and past bookings for the user.
*   **`ProfileScreen.js` & `SettingsScreen.js`:** User profile management and app preferences.

### Key Components (`src/components/`)
*   **`MaidMapView.js`:** Integrates `react-native-maps` to display maids on a map based on the user's location.
*   **`MaidCard.js`:** A reusable summary component displaying a maid's basic info, rating, and rate.
*   **`SearchBar.js`:** Input component for filtering maids by name, service, or location.

### State Management
The application utilizes a combination of React's local state (`useState`, `useReducer`) for component-level data and a centralized store pattern (`src/services/bookingStore.js`) for managing global application state related to bookings and user session data.

## 8. API Integration

The frontend communicates with a Spring Boot backend. All API calls are centralized in `src/services/apiService.js`.

**Authentication Flow:**
1. User logs in via Firebase (`authService.js`).
2. Frontend receives a Firebase ID Token.
3. This token is attached to the `Authorization: Bearer <token>` header for all subsequent backend API requests.

**Common Endpoints Consumed (Implied):**
*   `GET /api/maids`: Fetch available maids (with location/filter parameters).
*   `GET /api/maids/{id}`: Fetch specific maid details.
*   `POST /api/bookings`: Create a new booking request.
*   `GET /api/bookings/user`: Fetch user's booking history.
*   `PUT /api/maids/profile`: Update maid settings and hourly rate.

## 9. Third-Party Services
*   **Firebase:** Used for secure user authentication (Email/Password & Phone number).
*   **Google Maps / Apple Maps:** Accessed via `react-native-maps` for location-based features.
