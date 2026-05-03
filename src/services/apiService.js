import { auth } from '../config/firebaseConfig';

// ============================================================
// 🔧  Base URL — dynamically switch based on environment
// ============================================================
export const API_BASE_URL = __DEV__ 
  ? process.env.EXPO_PUBLIC_API_BASE_URL
  : process.env.EXPO_PUBLIC_PROD_API_URL;

if (!API_BASE_URL) {
  console.warn('⚠️ API_BASE_URL is missing! Please make sure EXPO_PUBLIC_API_BASE_URL and EXPO_PUBLIC_PROD_API_URL are set in your .env file.');
}


/**
 * Get the Firebase ID token for the currently signed-in user.
 */
const getIdToken = async () => {
    const user = auth.currentUser;
    if (!user) throw new Error('User not authenticated');
    return await user.getIdToken();
};

/**
 * Build common headers with the Firebase Bearer token.
 */
const getAuthHeaders = async () => {
    const token = await getIdToken();
    return {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        // Required to bypass the localtunnel (loca.lt) interstitial page
        'bypass-tunnel-reminder': 'true',
    };
};

/**
 * Generic request wrapper with error handling.
 */
const apiRequest = async (endpoint, options = {}) => {
    const headers = await getAuthHeaders();

    // 15 second timeout (increased for tunnel latency)
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    try {
        console.log(`📡 API ${options.method || 'GET'} → ${API_BASE_URL}${endpoint}`);
        const response = await fetch(`${API_BASE_URL}${endpoint}`, {
            ...options,
            headers: { ...headers, ...options.headers },
            signal: controller.signal,
        });
        clearTimeout(timeoutId);

        const text = await response.text();
        let data = {};
        if (text) {
            try {
                data = JSON.parse(text);
            } catch (e) {
                console.warn('⚠️ API returned non-JSON (status ' + response.status + '):', text.substring(0, 200));
            }
        }

        if (!response.ok) {
            console.error(`❌ API error (${response.status}):`, data.message || text.substring(0, 200));
            throw new Error(data.message || `Server error (${response.status})`);
        }

        return data;

    } catch (error) {
        clearTimeout(timeoutId);
        // If aborted due to timeout
        if (error.name === 'AbortError' || error.message.includes('aborted')) {
            throw new Error('Network request timed out. Make sure your backend is running.');
        }
        throw error;
    }
};

// ==================== AUTH ====================

/**
 * Sync the current Firebase user with the backend.
 * This is the PRIMARY auth endpoint — called after every login/register.
 *
 * - If user exists in DB → returns their stored profile
 * - If user does NOT exist → creates them with the provided data
 *
 * IDEMPOTENT — safe to call from any device, any number of times.
 */
export const syncUser = async (fullName = null, email = null, role = 'CUSTOMER', phone = null) => {
    return apiRequest('/auth/sync-user', {
        method: 'POST',
        body: JSON.stringify({ fullName, email, role, phone }),
    });
};

/**
 * Register the current Firebase user with the backend (strict — throws if exists).
 * Use syncUser() instead for login flows.
 */
export const registerUser = async (fullName, email = null, role = 'CUSTOMER', phone = null) => {
    return apiRequest('/auth/register', {
        method: 'POST',
        body: JSON.stringify({ fullName, email, role, phone }),
    });
};

/**
 * Get the currently authenticated user's profile.
 */
export const getCurrentUser = async () => {
    return apiRequest('/auth/me');
};

/**
 * Update the FCM token for push notifications.
 */
export const updateFcmToken = async (fcmToken) => {
    return apiRequest('/auth/fcm-token', {
        method: 'PUT',
        body: JSON.stringify({ fcmToken }),
    });
};

// ==================== USERS ====================

/**
 * Get a user by ID.
 */
export const getUserById = async (userId) => {
    return apiRequest(`/users/${userId}`);
};

/**
 * Update the current user's profile.
 */
export const updateProfile = async (updates) => {
    return apiRequest('/users/profile', {
        method: 'PUT',
        body: JSON.stringify(updates),
    });
};

/**
 * Switch the current user's role (CUSTOMER ↔ MAID).
 */
export const switchRole = async (role) => {
    return apiRequest('/users/role', {
        method: 'PUT',
        body: JSON.stringify({ role }),
    });
};

/**
 * Update the current user's location.
 */
export const updateLocation = async (latitude, longitude) => {
    return apiRequest('/users/location', {
        method: 'PUT',
        body: JSON.stringify({ latitude, longitude }),
    });
};

/**
 * Sync maid's live location (updates both user and maid tables).
 * Used for continuous location tracking on the maid's device.
 */
export const syncMaidLocation = async (latitude, longitude) => {
    return apiRequest('/location/sync', {
        method: 'PUT',
        body: JSON.stringify({ latitude, longitude }),
    });
};

// ==================== MAIDS ====================

/**
 * Create a maid profile for the current user.
 * Called from MaidSetupScreen after a new MAID user registers.
 */
export const createMaidProfile = async (profileData) => {
    return apiRequest('/maids/profile', {
        method: 'POST',
        body: JSON.stringify(profileData),
    });
};

/**
 * Update an existing maid profile.
 */
export const updateMaidProfile = async (profileData) => {
    return apiRequest('/maids/profile', {
        method: 'PUT',
        body: JSON.stringify(profileData),
    });
};

/**
 * Find nearby available maids.
 */
export const getNearbyMaids = async (lat, lng, radius = 5) => {
    return apiRequest(`/maids/nearby?lat=${lat}&lng=${lng}&radius=${radius}`);
};

/**
 * Get a maid profile by ID.
 */
export const getMaidById = async (maidId) => {
    return apiRequest(`/maids/${maidId}`);
};

/**
 * Search and filter maids.
 */
export const searchMaids = async (query = '', service = '', minRating = null) => {
    const params = new URLSearchParams();
    if (query) params.append('q', query);
    if (service) params.append('service', service);
    if (minRating) params.append('minRating', minRating);
    return apiRequest(`/maids/search?${params.toString()}`);
};

// ==================== BOOKINGS ====================

/**
 * Create a new booking.
 */
export const createBooking = async (bookingData) => {
    return apiRequest('/bookings', {
        method: 'POST',
        body: JSON.stringify(bookingData),
    });
};

/**
 * Get the current user's bookings.
 */
export const getMyBookings = async () => {
    return apiRequest('/bookings/my');
};

/**
 * Get booking details by ID.
 */
export const getBookingById = async (bookingId) => {
    return apiRequest(`/bookings/${bookingId}`);
};

/**
 * Cancel a booking.
 */
export const cancelBooking = async (bookingId, reason = '') => {
    return apiRequest(`/bookings/${bookingId}/cancel`, {
        method: 'PUT',
        body: JSON.stringify({ reason }),
    });
};

/**
 * Accept a PENDING booking (maid only).
 */
export const acceptBookingAPI = async (bookingId) => {
    return apiRequest(`/bookings/${bookingId}/accept`, {
        method: 'PUT',
    });
};

/**
 * Reject a PENDING booking (maid only).
 */
export const rejectBookingAPI = async (bookingId, reason = '') => {
    return apiRequest(`/bookings/${bookingId}/reject`, {
        method: 'PUT',
        body: JSON.stringify({ reason }),
    });
};

/**
 * Update booking status (maid only).
 * status: 'CONFIRMED' | 'IN_PROGRESS' | 'COMPLETED'
 */
export const updateBookingStatus = async (bookingId, status) => {
    return apiRequest(`/bookings/${bookingId}/status`, {
        method: 'PUT',
        body: JSON.stringify({ status }),
    });
};

/**
 * Get pending booking requests for the current maid.
 */
export const getPendingRequests = async () => {
    return apiRequest('/bookings/requests');
};

/**
 * Get active bookings with customer locations for map display (maid only).
 */
export const getBookingsForMap = async () => {
    return apiRequest('/bookings/map');
};

// ==================== REVIEWS ====================

/**
 * Get all reviews for a maid.
 */
export const getMaidReviews = async (maidId) => {
    return apiRequest(`/reviews/maid/${maidId}`);
};

/**
 * Submit a review for a completed booking.
 */
export const submitReview = async (bookingId, rating, comment = '') => {
    return apiRequest('/reviews', {
        method: 'POST',
        body: JSON.stringify({ bookingId, rating, comment }),
    });
};

/**
 * 📱 Notifications — register device token for push notifications
 */
export const registerDeviceToken = async (fcmToken, deviceType = 'android') => {
    return apiRequest('/users/register-device', {
        method: 'POST',
        body: JSON.stringify({ fcmToken, deviceType }),
    });
};

export { getIdToken };

