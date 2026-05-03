import React, { useState, useRef } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    Alert,
    SafeAreaView,
} from 'react-native';
import { FirebaseRecaptchaVerifierModal } from 'expo-firebase-recaptcha';
import { PhoneAuthProvider, signInWithCredential } from 'firebase/auth';
import { auth, firebaseConfig } from '../config/firebaseConfig';
import { syncUser } from '../services/apiService';

export default function PhoneLoginScreen({ navigation }) {
    const [phoneNumber, setPhoneNumber] = useState('');
    const [verificationId, setVerificationId] = useState(null);
    const [verificationCode, setVerificationCode] = useState('');
    const recaptchaVerifier = useRef(null);
    const [message, setMessage] = useState('');

    const sendVerification = async () => {
        // Validation: 10 digits
        if (!phoneNumber || phoneNumber.length !== 10) {
            Alert.alert('Error', 'Please enter a valid 10-digit phone number.');
            return;
        }

        const formattedPhoneNumber = `+91${phoneNumber}`;

        try {
            const phoneProvider = new PhoneAuthProvider(auth);
            const verificationId = await phoneProvider.verifyPhoneNumber(
                formattedPhoneNumber,
                recaptchaVerifier.current
            );
            setVerificationId(verificationId);
            Alert.alert('Success', 'Verification code has been sent to your phone.');
        } catch (err) {
            console.error("Firebase Verification Error:", err);
            Alert.alert('Error', `Failed to send verification code: ${err.message}`);
        }
    };

    const confirmCode = async () => {
        try {
            const credential = PhoneAuthProvider.credential(
                verificationId,
                verificationCode
            );
            const userCredential = await signInWithCredential(auth, credential);
            console.log('✅ Phone auth successful, UID:', userCredential.user.uid);

            // Sync user with backend (idempotent — creates if not exists)
            try {
                const phone = userCredential.user.phoneNumber || '';
                const displayName = userCredential.user.displayName || 'User';
                const response = await syncUser(displayName, null, 'CUSTOMER', phone);
                console.log('✅ Backend sync complete:', JSON.stringify(response?.data));

                const userRole = response?.data?.user?.role || 'CUSTOMER';
                const isNewUser = response?.data?.isNewUser ?? false;

                if (userRole === 'MAID') {
                    navigation.replace(isNewUser ? 'MaidSetup' : 'MaidHome');
                } else {
                    navigation.replace('MainTabs');
                }
            } catch (syncErr) {
                console.error('❌ Backend sync failed:', syncErr.message);
                Alert.alert('Warning', 'Logged in but could not sync with server. Some features may not work.');
                navigation.replace('MainTabs');
            }
        } catch (err) {
            console.error('Firebase Confirm Error:', err);
            Alert.alert('Error', `Invalid verification code: ${err.message}`);
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <FirebaseRecaptchaVerifierModal
                ref={recaptchaVerifier}
                firebaseConfig={firebaseConfig}
                title="Prove you are human!"
                cancelLabel="Close"
            />

            <View style={styles.content}>
                <Text style={styles.title}>Welcome Back</Text>
                <Text style={styles.subtitle}>Login with your phone number</Text>

                {!verificationId ? (
                    <View style={styles.inputContainer}>
                        <Text style={styles.label}>Phone Number</Text>
                        <View style={styles.phoneInputRow}>
                            <Text style={styles.countryCode}>+91</Text>
                            <TextInput
                                style={styles.phoneInput}
                                placeholder="9876543210"
                                placeholderTextColor="#9ca3af"
                                autoComplete="tel"
                                keyboardType="number-pad"
                                maxLength={10}
                                onChangeText={setPhoneNumber}
                                value={phoneNumber}
                            />
                        </View>
                        <TouchableOpacity style={styles.button} onPress={sendVerification}>
                            <Text style={styles.buttonText}>Send Verification Code</Text>
                        </TouchableOpacity>
                    </View>
                ) : (
                    <View style={styles.inputContainer}>
                        <Text style={styles.label}>Verification Code</Text>
                        <TextInput
                            style={styles.input}
                            editable={!!verificationId}
                            placeholder="123456"
                            placeholderTextColor="#9ca3af"
                            onChangeText={setVerificationCode}
                            value={verificationCode}
                            keyboardType="number-pad"
                            maxLength={6}
                        />
                        <TouchableOpacity style={styles.button} onPress={confirmCode}>
                            <Text style={styles.buttonText}>Confirm Verification Code</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.textButton} onPress={() => setVerificationId(null)}>
                            <Text style={styles.textButtonLabel}>Change Phone Number</Text>
                        </TouchableOpacity>
                    </View>
                )}
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },
    content: {
        flex: 1,
        justifyContent: 'center',
        paddingHorizontal: 24,
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        marginBottom: 8,
        textAlign: 'center',
        color: '#1f2937',
    },
    subtitle: {
        fontSize: 16,
        color: '#6b7280',
        marginBottom: 32,
        textAlign: 'center',
    },
    inputContainer: {
        marginBottom: 16,
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        color: '#374151',
        marginBottom: 8,
        marginLeft: 4,
    },
    input: {
        backgroundColor: '#f9fafb',
        borderWidth: 1,
        borderColor: '#e5e7eb',
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 14,
        fontSize: 16,
        color: '#111827',
        marginBottom: 20,
    },
    phoneInputRow: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f9fafb',
        borderWidth: 1,
        borderColor: '#e5e7eb',
        borderRadius: 12,
        marginBottom: 20,
        overflow: 'hidden',
    },
    countryCode: {
        fontSize: 16,
        color: '#111827',
        paddingLeft: 16,
        paddingRight: 8,
        fontWeight: '600',
        backgroundColor: '#f3f4f6',
        paddingVertical: 14,
        borderRightWidth: 1,
        borderRightColor: '#e5e7eb',
    },
    phoneInput: {
        flex: 1,
        paddingHorizontal: 16,
        paddingVertical: 14,
        fontSize: 16,
        color: '#111827',
    },
    button: {
        backgroundColor: '#3b82f6',
        borderRadius: 12,
        paddingVertical: 14,
        alignItems: 'center',
        shadowColor: '#3b82f6',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 4,
    },
    buttonText: {
        color: '#ffffff',
        fontSize: 16,
        fontWeight: 'bold',
    },
    textButton: {
        marginTop: 16,
        alignItems: 'center',
    },
    textButtonLabel: {
        color: '#3b82f6',
        fontWeight: '600',
    },
});
