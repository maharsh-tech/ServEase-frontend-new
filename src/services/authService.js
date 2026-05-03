import { auth } from "../config/firebaseConfig";
import {
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut,
    updateProfile as firebaseUpdateProfile,
} from "firebase/auth";

/**
 * Register a new user with email & password in Firebase.
 * Optionally sets the displayName on the Firebase profile.
 */
export const registerWithEmail = async (email, password, fullName = '') => {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    if (fullName) {
        await firebaseUpdateProfile(userCredential.user, { displayName: fullName });
    }
    return userCredential;
};

/**
 * Sign in with email & password.
 */
export const loginWithEmail = async (email, password) => {
    return await signInWithEmailAndPassword(auth, email, password);
};

/**
 * Sign out the current user.
 */
export const logoutUser = async () => {
    return await signOut(auth);
};

/**
 * Get the Firebase ID token for the currently signed-in user.
 * Used by apiService.js to authenticate backend API calls.
 */
export const getIdToken = async () => {
    const user = auth.currentUser;
    if (!user) throw new Error('User not authenticated');
    return await user.getIdToken();
};
