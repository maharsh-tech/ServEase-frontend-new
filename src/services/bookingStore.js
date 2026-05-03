/**
 * In-memory booking store for demo/presentation purposes.
 * Shared between Customer and Maid views so bookings flow end-to-end
 * even when the backend is unreachable.
 */

let _bookings = [];
let _listeners = [];
let _nextId = 1;

/** Subscribe to booking changes. Returns an unsubscribe function. */
export const subscribe = (listener) => {
    _listeners.push(listener);
    return () => {
        _listeners = _listeners.filter(l => l !== listener);
    };
};

const notify = () => _listeners.forEach(fn => fn(_bookings));

/** Create a new booking (called by customer). */
export const addBooking = (booking) => {
    const newBooking = {
        id: _nextId++,
        ...booking,
        status: 'PENDING',
        createdAt: new Date().toISOString(),
    };
    _bookings = [newBooking, ..._bookings];
    console.log('📋 Local booking created:', newBooking);
    notify();
    return newBooking;
};

/** Get all bookings. */
export const getAllBookings = () => [..._bookings];

/** Get bookings for a specific role. */
export const getBookingsForCustomer = (customerEmail) => {
    return _bookings.filter(b => b.customerEmail === customerEmail);
};

export const getBookingsForMaid = () => {
    // For demo: return all bookings (single maid scenario)
    return [..._bookings];
};

/** Accept a booking (called by maid). */
export const acceptBooking = (bookingId) => {
    _bookings = _bookings.map(b =>
        b.id === bookingId ? { ...b, status: 'CONFIRMED' } : b
    );
    console.log('✅ Booking accepted:', bookingId);
    notify();
};

/** Decline a booking (called by maid). */
export const declineBooking = (bookingId) => {
    _bookings = _bookings.map(b =>
        b.id === bookingId ? { ...b, status: 'CANCELLED' } : b
    );
    console.log('❌ Booking declined:', bookingId);
    notify();
};

/** Complete a booking (called by maid). */
export const completeBooking = (bookingId) => {
    _bookings = _bookings.map(b =>
        b.id === bookingId ? { ...b, status: 'COMPLETED' } : b
    );
    console.log('🎉 Booking completed:', bookingId);
    notify();
};

/** Cancel a booking (called by customer). */
export const cancelLocalBooking = (bookingId) => {
    _bookings = _bookings.map(b =>
        b.id === bookingId ? { ...b, status: 'CANCELLED' } : b
    );
    console.log('🚫 Booking cancelled:', bookingId);
    notify();
};
