# 🏠 ServeEase — Homepage Implementation Guide

This guide walks you through building the **HomeScreen** for the ServeEase app. The homepage is the first screen users see after logging in via phone authentication.

---

## 📁 Current Project Structure

```
ServeEase-Frontend/
├── App.js                          # Entry point → loads AppNavigator
├── src/
│   ├── config/
│   │   └── firebaseConfig.js       # Firebase setup + auth persistence
│   ├── navigation/
│   │   └── AppNavigator.js         # Stack navigator (PhoneLogin → Home)
│   ├── screens/
│   │   ├── PhoneLoginScreen.js     # ✅ Done — Phone OTP login
│   │   └── HomeScreen.js           # ⚠️ Bare-bones — needs full implementation
│   └── services/
│       └── authService.js          # Auth helpers (register, login, logout)
```

---

## 🎯 What the Homepage Should Include

| Section              | Description                                                    |
| -------------------- | -------------------------------------------------------------- |
| **Header**           | Greeting with user's phone number, profile icon, notification bell |
| **Search Bar**       | Search for available services                                  |
| **Service Categories** | Horizontal scrollable list of categories (Cleaning, Plumbing, Electrical, etc.) |
| **Featured Services**  | Card-based grid/list of popular or nearby services             |
| **Quick Actions**      | Buttons for Book Now, My Bookings, Offers                     |
| **Bottom Navigation**  | Tabs — Home, Bookings, Profile, Settings                      |

---

## 🛠️ Step-by-Step Implementation

### Step 1: Create Required Components Folder

Create a `components` folder to keep UI pieces reusable:

```
src/
└── components/
    ├── Header.js
    ├── SearchBar.js
    ├── CategoryList.js
    ├── ServiceCard.js
    └── QuickActions.js
```

---

### Step 2: Build the Header Component

**File:** `src/components/Header.js`

```jsx
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function Header({ phoneNumber }) {
    return (
        <View style={styles.container}>
            <View>
                <Text style={styles.greeting}>Hello 👋</Text>
                <Text style={styles.phone}>{phoneNumber || 'User'}</Text>
            </View>
            <View style={styles.icons}>
                <TouchableOpacity style={styles.iconBtn}>
                    <Ionicons name="notifications-outline" size={24} color="#1f2937" />
                </TouchableOpacity>
                <TouchableOpacity style={styles.iconBtn}>
                    <Ionicons name="person-circle-outline" size={28} color="#1f2937" />
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingTop: 50,
        paddingBottom: 16,
        backgroundColor: '#fff',
    },
    greeting: {
        fontSize: 14,
        color: '#6b7280',
    },
    phone: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#1f2937',
    },
    icons: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    iconBtn: {
        padding: 6,
    },
});
```

> **📦 Dependency:** Install icons — `npx expo install @expo/vector-icons`

---

### Step 3: Build the Search Bar

**File:** `src/components/SearchBar.js`

```jsx
import React from 'react';
import { View, TextInput, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function SearchBar({ onSearch }) {
    return (
        <View style={styles.container}>
            <Ionicons name="search" size={20} color="#9ca3af" />
            <TextInput
                style={styles.input}
                placeholder="Search for services..."
                placeholderTextColor="#9ca3af"
                onChangeText={onSearch}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f3f4f6',
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 12,
        marginHorizontal: 20,
        marginBottom: 20,
    },
    input: {
        flex: 1,
        marginLeft: 10,
        fontSize: 16,
        color: '#111827',
    },
});
```

---

### Step 4: Build the Category List (Horizontal Scroll)

**File:** `src/components/CategoryList.js`

```jsx
import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const CATEGORIES = [
    { id: '1', name: 'Cleaning',    icon: 'sparkles-outline',    color: '#3b82f6' },
    { id: '2', name: 'Plumbing',    icon: 'water-outline',       color: '#06b6d4' },
    { id: '3', name: 'Electrical',  icon: 'flash-outline',       color: '#f59e0b' },
    { id: '4', name: 'Painting',    icon: 'color-palette-outline', color: '#8b5cf6' },
    { id: '5', name: 'Carpentry',   icon: 'hammer-outline',      color: '#ef4444' },
    { id: '6', name: 'Gardening',   icon: 'leaf-outline',        color: '#22c55e' },
];

export default function CategoryList({ onSelectCategory }) {
    return (
        <View style={styles.wrapper}>
            <Text style={styles.sectionTitle}>Categories</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scrollContainer}>
                {CATEGORIES.map((cat) => (
                    <TouchableOpacity
                        key={cat.id}
                        style={styles.card}
                        onPress={() => onSelectCategory && onSelectCategory(cat)}
                    >
                        <View style={[styles.iconCircle, { backgroundColor: cat.color + '20' }]}>
                            <Ionicons name={cat.icon} size={28} color={cat.color} />
                        </View>
                        <Text style={styles.label}>{cat.name}</Text>
                    </TouchableOpacity>
                ))}
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    wrapper: {
        marginBottom: 24,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#1f2937',
        paddingHorizontal: 20,
        marginBottom: 12,
    },
    scrollContainer: {
        paddingHorizontal: 16,
        gap: 12,
    },
    card: {
        alignItems: 'center',
        width: 80,
    },
    iconCircle: {
        width: 56,
        height: 56,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 8,
    },
    label: {
        fontSize: 12,
        fontWeight: '600',
        color: '#374151',
        textAlign: 'center',
    },
});
```

---

### Step 5: Build the Service Card

**File:** `src/components/ServiceCard.js`

```jsx
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function ServiceCard({ service, onPress }) {
    return (
        <TouchableOpacity style={styles.card} onPress={onPress}>
            <View style={[styles.imagePlaceholder, { backgroundColor: service.color + '15' }]}>
                <Ionicons name={service.icon} size={36} color={service.color} />
            </View>
            <View style={styles.info}>
                <Text style={styles.name}>{service.name}</Text>
                <Text style={styles.description}>{service.description}</Text>
                <View style={styles.footer}>
                    <View style={styles.rating}>
                        <Ionicons name="star" size={14} color="#f59e0b" />
                        <Text style={styles.ratingText}>{service.rating}</Text>
                    </View>
                    <Text style={styles.price}>₹{service.price}</Text>
                </View>
            </View>
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    card: {
        backgroundColor: '#fff',
        borderRadius: 16,
        marginHorizontal: 20,
        marginBottom: 16,
        overflow: 'hidden',
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
    },
    imagePlaceholder: {
        height: 120,
        justifyContent: 'center',
        alignItems: 'center',
    },
    info: {
        padding: 14,
    },
    name: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#1f2937',
        marginBottom: 4,
    },
    description: {
        fontSize: 13,
        color: '#6b7280',
        marginBottom: 10,
    },
    footer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    rating: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    ratingText: {
        fontSize: 13,
        fontWeight: '600',
        color: '#374151',
    },
    price: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#3b82f6',
    },
});
```

---

### Step 6: Build Quick Actions

**File:** `src/components/QuickActions.js`

```jsx
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const ACTIONS = [
    { id: '1', label: 'Book Now',     icon: 'add-circle-outline',   color: '#3b82f6' },
    { id: '2', label: 'My Bookings',  icon: 'calendar-outline',     color: '#8b5cf6' },
    { id: '3', label: 'Offers',       icon: 'pricetag-outline',     color: '#22c55e' },
    { id: '4', label: 'Support',      icon: 'chatbubble-outline',   color: '#f59e0b' },
];

export default function QuickActions({ onAction }) {
    return (
        <View style={styles.container}>
            {ACTIONS.map((action) => (
                <TouchableOpacity
                    key={action.id}
                    style={styles.actionBtn}
                    onPress={() => onAction && onAction(action)}
                >
                    <View style={[styles.iconCircle, { backgroundColor: action.color + '15' }]}>
                        <Ionicons name={action.icon} size={24} color={action.color} />
                    </View>
                    <Text style={styles.label}>{action.label}</Text>
                </TouchableOpacity>
            ))}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        paddingHorizontal: 20,
        marginBottom: 24,
    },
    actionBtn: {
        alignItems: 'center',
    },
    iconCircle: {
        width: 52,
        height: 52,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 6,
    },
    label: {
        fontSize: 12,
        fontWeight: '600',
        color: '#374151',
    },
});
```

---

### Step 7: Update `HomeScreen.js`

Replace the current bare-bones HomeScreen with the full implementation:

**File:** `src/screens/HomeScreen.js`

```jsx
import React, { useState } from 'react';
import { ScrollView, StyleSheet, Alert } from 'react-native';
import { auth } from '../config/firebaseConfig';
import { logoutUser } from '../services/authService';

import Header from '../components/Header';
import SearchBar from '../components/SearchBar';
import CategoryList from '../components/CategoryList';
import ServiceCard from '../components/ServiceCard';
import QuickActions from '../components/QuickActions';

// Sample service data — replace with API calls later
const FEATURED_SERVICES = [
    {
        id: '1',
        name: 'Deep Home Cleaning',
        description: 'Professional deep cleaning for your entire home',
        rating: '4.8',
        price: '1,499',
        icon: 'sparkles-outline',
        color: '#3b82f6',
    },
    {
        id: '2',
        name: 'Plumbing Repair',
        description: 'Fix leaks, pipes, and drainage issues',
        rating: '4.6',
        price: '499',
        icon: 'water-outline',
        color: '#06b6d4',
    },
    {
        id: '3',
        name: 'Electrician',
        description: 'Wiring, switches, and appliance repairs',
        rating: '4.7',
        price: '399',
        icon: 'flash-outline',
        color: '#f59e0b',
    },
];

export default function HomeScreen({ navigation }) {
    const [searchQuery, setSearchQuery] = useState('');

    const userPhone = auth.currentUser?.phoneNumber || 'User';

    const handleLogout = async () => {
        try {
            await logoutUser();
            navigation.replace('PhoneLogin');
        } catch (error) {
            console.error(error);
        }
    };

    const handleCategorySelect = (category) => {
        Alert.alert('Category Selected', `You selected: ${category.name}`);
        // TODO: Navigate to category-specific service listing
    };

    const handleServicePress = (service) => {
        Alert.alert('Service Selected', `You selected: ${service.name}`);
        // TODO: Navigate to service detail / booking screen
    };

    const handleQuickAction = (action) => {
        Alert.alert('Action', `You tapped: ${action.label}`);
        // TODO: Navigate to the appropriate screen
    };

    return (
        <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
            <Header phoneNumber={userPhone} />
            <SearchBar onSearch={setSearchQuery} />
            <QuickActions onAction={handleQuickAction} />
            <CategoryList onSelectCategory={handleCategorySelect} />

            {/* Featured Services Section */}
            {FEATURED_SERVICES
                .filter((s) =>
                    s.name.toLowerCase().includes(searchQuery.toLowerCase())
                )
                .map((service) => (
                    <ServiceCard
                        key={service.id}
                        service={service}
                        onPress={() => handleServicePress(service)}
                    />
                ))}
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f9fafb',
    },
});
```

---

### Step 8: Install Required Dependencies

Run this command to install the icon library:

```bash
npx expo install @expo/vector-icons
```

---

## 🔮 Future Enhancements

Once the homepage is working, consider adding:

| Feature                  | Description                                         |
| ------------------------ | --------------------------------------------------- |
| **Bottom Tab Navigation** | Add tabs using `@react-navigation/bottom-tabs`     |
| **Pull-to-Refresh**       | Add `RefreshControl` to reload services from API   |
| **Backend API Integration** | Fetch real services from your ServeEase backend  |
| **Booking Flow**          | Service detail screen → date/time picker → confirm |
| **User Profile Screen**   | Show user info, order history, settings             |
| **Push Notifications**    | Firebase Cloud Messaging for booking updates        |

---

## ✅ Checklist Before Running

- [ ] Created `src/components/` folder with all 5 component files
- [ ] Updated `HomeScreen.js` with full implementation
- [ ] Installed `@expo/vector-icons`
- [ ] Run `npx expo start` and test on your device/emulator

---

> **💡 Tip:** The sample services data (`FEATURED_SERVICES`) is hardcoded for now. Once your backend is ready, replace it with API calls using `fetch()` or `axios` inside a `useEffect` hook.
