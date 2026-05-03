import React, { useState } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    Alert,
    ScrollView,
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { registerWithEmail, loginWithEmail } from '../services/authService';
import { syncUser } from '../services/apiService';

const ROLES = [
    { key: 'CUSTOMER', label: 'User', icon: 'person-outline', description: 'Find & book maids' },
    { key: 'MAID', label: 'Maid', icon: 'briefcase-outline', description: 'Offer your services' },
];

// ─── Field component MUST live outside AuthScreen ───────────────────────────
// Defining it inside the parent causes React to unmount/remount it on every
// re-render, which drops keyboard focus after every single character typed.
function Field({
    label, value, onChangeText, icon, keyboardType, secureTextEntry,
    errorKey, placeholder, maxLength, rightIcon, onRightIconPress,
    errors, setErrors,
}) {
    return (
        <View style={styles.fieldWrapper}>
            <Text style={styles.label}>{label}</Text>
            <View style={[styles.inputRow, errors[errorKey] && styles.inputError]}>
                <Ionicons name={icon} size={18} color="#9ca3af" style={styles.inputIcon} />
                <TextInput
                    style={styles.input}
                    value={value}
                    onChangeText={(t) => {
                        onChangeText(t);
                        if (errors[errorKey]) setErrors(prev => ({ ...prev, [errorKey]: null }));
                    }}
                    keyboardType={keyboardType || 'default'}
                    secureTextEntry={secureTextEntry || false}
                    placeholder={placeholder || ''}
                    placeholderTextColor="#c4c4c4"
                    autoCapitalize="none"
                    maxLength={maxLength}
                />
                {rightIcon && (
                    <TouchableOpacity onPress={onRightIconPress} style={styles.eyeBtn}>
                        <Ionicons name={rightIcon} size={18} color="#9ca3af" />
                    </TouchableOpacity>
                )}
            </View>
            {errors[errorKey] ? <Text style={styles.errorText}>{errors[errorKey]}</Text> : null}
        </View>
    );
}
// ────────────────────────────────────────────────────────────────────────────

export default function AuthScreen({ navigation }) {
    const [mode, setMode] = useState('login'); // 'login' | 'register'
    const [role, setRole] = useState('CUSTOMER');
    const [fullName, setFullName] = useState('');
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState({});

    const validate = () => {
        const errs = {};
        if (mode === 'register') {
            if (!fullName.trim()) errs.fullName = 'Full name is required';
            if (!phone.trim() || phone.length < 10) errs.phone = 'Enter a valid 10-digit phone number';
            if (password !== confirmPassword) errs.confirmPassword = 'Passwords do not match';
        }
        if (!email.trim() || !/\S+@\S+\.\S+/.test(email)) errs.email = 'Enter a valid email address';
        if (!password || password.length < 6) errs.password = 'Password must be at least 6 characters';
        setErrors(errs);
        return Object.keys(errs).length === 0;
    };

    /**
     * Navigate user to the appropriate dashboard based on their role.
     * For MAID + new user → go to MaidSetup first.
     */
    const navigateByRole = (userRole, isNewUser = false) => {
        console.log('🚀 Navigating — role:', userRole, 'isNewUser:', isNewUser);
        if (userRole === 'MAID') {
            // New maid → setup profile first, existing maid → dashboard
            navigation.replace(isNewUser ? 'MaidSetup' : 'MaidHome');
        } else {
            navigation.replace('MainTabs');
        }
    };

    /**
     * REGISTER flow:
     * 1. Create user in Firebase Auth
     * 2. Sync with backend (creates DB record)
     * 3. Navigate based on role
     */
    const handleRegister = async () => {
        if (!validate()) return;
        setLoading(true);
        try {
            // Step 1: Create Firebase user
            await registerWithEmail(email, password, fullName);
            console.log('✅ Firebase user created');

            // Step 2: Sync with backend (creates user in DB)
            const response = await syncUser(fullName, email, role, phone);
            console.log('✅ Backend sync complete:', JSON.stringify(response?.data));

            const userRole = response?.data?.user?.role || role;
            const isNewUser = response?.data?.isNewUser ?? true;

            // Step 3: Navigate
            navigateByRole(userRole, isNewUser);
        } catch (err) {
            console.error('❌ Registration failed:', err.message);

            // If email already exists in Firebase, offer to login instead
            if (err.message?.includes('email-already-in-use')) {
                Alert.alert(
                    'Account Exists',
                    'This email is already registered. Would you like to login instead?',
                    [
                        { text: 'Cancel', style: 'cancel' },
                        {
                            text: 'Login',
                            onPress: () => {
                                setMode('login');
                                setErrors({});
                            },
                        },
                    ]
                );
            } else {
                Alert.alert('Registration Failed', err.message.replace('Firebase: ', ''));
            }
        } finally {
            setLoading(false);
        }
    };

    /**
     * LOGIN flow:
     * 1. Sign in with Firebase Auth
     * 2. Sync with backend (returns existing profile OR creates new if missing)
     * 3. Navigate based on backend-stored role
     */
    const handleLogin = async () => {
        if (!validate()) return;
        setLoading(true);
        try {
            // Step 1: Firebase sign in
            const credential = await loginWithEmail(email, password);
            console.log('✅ Firebase login successful, UID:', credential.user?.uid);

            // Step 2: Sync with backend — this is IDEMPOTENT
            // Sends role + name so if user is missing from DB, they get created
            const displayName = credential.user?.displayName || email.split('@')[0];
            const userPhone = credential.user?.phoneNumber || '';
            const response = await syncUser(displayName, email, role, userPhone);
            console.log('✅ Backend sync complete:', JSON.stringify(response?.data));

            // Step 3: Navigate — use BACKEND role as source of truth
            const userRole = response?.data?.user?.role || role;
            const isNewUser = response?.data?.isNewUser ?? false;

            navigateByRole(userRole, isNewUser);
        } catch (err) {
            console.error('❌ Login failed:', err.message);
            Alert.alert('Login Failed', err.message.replace('Firebase: ', ''));
        } finally {
            setLoading(false);
        }
    };

    // Shared props passed to every Field so it can clear its own error
    const fieldProps = { errors, setErrors };

    return (
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
            <LinearGradient colors={['#1e3a5f', '#2563eb', '#3b82f6']} style={styles.gradient}>
                {/* Header */}
                <View style={styles.headerArea}>
                    <View style={styles.logoCircle}>
                        <Ionicons name="home-outline" size={32} color="#fff" />
                    </View>
                    <Text style={styles.appName}>ServeEase</Text>
                    <Text style={styles.tagline}>Home services, simplified.</Text>
                </View>

                {/* Card */}
                <ScrollView
                    contentContainerStyle={styles.scrollContent}
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator={false}
                >
                    <View style={styles.card}>
                        {/* Mode Toggle */}
                        <View style={styles.modeToggle}>
                            <TouchableOpacity
                                style={[styles.modeBtn, mode === 'login' && styles.modeBtnActive]}
                                onPress={() => { setMode('login'); setErrors({}); }}
                            >
                                <Text style={[styles.modeBtnText, mode === 'login' && styles.modeBtnTextActive]}>Login</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.modeBtn, mode === 'register' && styles.modeBtnActive]}
                                onPress={() => { setMode('register'); setErrors({}); }}
                            >
                                <Text style={[styles.modeBtnText, mode === 'register' && styles.modeBtnTextActive]}>Register</Text>
                            </TouchableOpacity>
                        </View>

                        {/* Role Toggle — shown on BOTH Login & Register */}
                        <View>
                            <Text style={styles.sectionLabel}>
                                {mode === 'login' ? 'Login as…' : 'I am a…'}
                            </Text>
                            <View style={styles.roleToggle}>
                                {ROLES.map((r) => (
                                    <TouchableOpacity
                                        key={r.key}
                                        style={[styles.roleBtn, role === r.key && styles.roleBtnActive]}
                                        onPress={() => setRole(r.key)}
                                        activeOpacity={0.8}
                                    >
                                        <Ionicons
                                            name={r.icon}
                                            size={22}
                                            color={role === r.key ? '#fff' : '#6b7280'}
                                        />
                                        <Text style={[styles.roleBtnLabel, role === r.key && styles.roleBtnLabelActive]}>
                                            {r.label}
                                        </Text>
                                        <Text style={[styles.roleBtnDesc, role === r.key && styles.roleBtnDescActive]}>
                                            {r.description}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </View>

                        {/* Fields */}
                        {mode === 'register' && (
                            <Field
                                {...fieldProps}
                                label="Full Name"
                                value={fullName}
                                onChangeText={setFullName}
                                icon="person-outline"
                                errorKey="fullName"
                                placeholder="John Doe"
                            />
                        )}

                        <Field
                            {...fieldProps}
                            label="Email Address"
                            value={email}
                            onChangeText={setEmail}
                            icon="mail-outline"
                            keyboardType="email-address"
                            errorKey="email"
                            placeholder="you@example.com"
                        />

                        {mode === 'register' && (
                            <Field
                                {...fieldProps}
                                label="Phone Number"
                                value={phone}
                                onChangeText={setPhone}
                                icon="call-outline"
                                keyboardType="phone-pad"
                                errorKey="phone"
                                placeholder="9876543210"
                                maxLength={10}
                            />
                        )}

                        <Field
                            {...fieldProps}
                            label="Password"
                            value={password}
                            onChangeText={setPassword}
                            icon="lock-closed-outline"
                            secureTextEntry={!showPassword}
                            errorKey="password"
                            placeholder="Min. 6 characters"
                            rightIcon={showPassword ? 'eye-off-outline' : 'eye-outline'}
                            onRightIconPress={() => setShowPassword(!showPassword)}
                        />

                        {mode === 'register' && (
                            <Field
                                {...fieldProps}
                                label="Confirm Password"
                                value={confirmPassword}
                                onChangeText={setConfirmPassword}
                                icon="lock-closed-outline"
                                secureTextEntry={!showPassword}
                                errorKey="confirmPassword"
                                placeholder="Re-enter password"
                            />
                        )}

                        {/* Submit */}
                        <TouchableOpacity
                            style={[styles.submitBtn, loading && styles.submitBtnDisabled]}
                            onPress={mode === 'register' ? handleRegister : handleLogin}
                            disabled={loading}
                            activeOpacity={0.85}
                        >
                            {loading ? (
                                <ActivityIndicator color="#fff" />
                            ) : (
                                <Text style={styles.submitText}>
                                    {mode === 'register' ? 'Create Account' : 'Sign In'}
                                </Text>
                            )}
                        </TouchableOpacity>

                        {/* Switch Mode Link */}
                        <TouchableOpacity
                            style={styles.switchLink}
                            onPress={() => { setMode(mode === 'login' ? 'register' : 'login'); setErrors({}); }}
                        >
                            <Text style={styles.switchLinkText}>
                                {mode === 'login'
                                    ? "Don't have an account? "
                                    : 'Already have an account? '}
                                <Text style={styles.switchLinkBold}>
                                    {mode === 'login' ? 'Register' : 'Login'}
                                </Text>
                            </Text>
                        </TouchableOpacity>
                    </View>
                </ScrollView>
            </LinearGradient>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    gradient: { flex: 1 },
    headerArea: {
        alignItems: 'center',
        paddingTop: 60,
        paddingBottom: 24,
    },
    logoCircle: {
        width: 68,
        height: 68,
        borderRadius: 34,
        backgroundColor: 'rgba(255,255,255,0.18)',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 10,
        borderWidth: 2,
        borderColor: 'rgba(255,255,255,0.3)',
    },
    appName: {
        fontSize: 30,
        fontWeight: '800',
        color: '#fff',
        letterSpacing: 0.5,
    },
    tagline: {
        fontSize: 14,
        color: 'rgba(255,255,255,0.75)',
        marginTop: 4,
    },
    scrollContent: {
        paddingBottom: 40,
    },
    card: {
        backgroundColor: '#fff',
        marginHorizontal: 16,
        borderRadius: 24,
        padding: 24,
        elevation: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.18,
        shadowRadius: 16,
    },
    modeToggle: {
        flexDirection: 'row',
        backgroundColor: '#f3f4f6',
        borderRadius: 14,
        padding: 4,
        marginBottom: 22,
    },
    modeBtn: {
        flex: 1,
        paddingVertical: 10,
        borderRadius: 11,
        alignItems: 'center',
    },
    modeBtnActive: {
        backgroundColor: '#fff',
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.08,
        shadowRadius: 4,
    },
    modeBtnText: {
        fontSize: 15,
        fontWeight: '600',
        color: '#9ca3af',
    },
    modeBtnTextActive: {
        color: '#2563eb',
    },
    sectionLabel: {
        fontSize: 13,
        fontWeight: '600',
        color: '#6b7280',
        marginBottom: 10,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    roleToggle: {
        flexDirection: 'row',
        gap: 10,
        marginBottom: 20,
    },
    roleBtn: {
        flex: 1,
        borderRadius: 14,
        borderWidth: 2,
        borderColor: '#e5e7eb',
        paddingVertical: 14,
        paddingHorizontal: 10,
        alignItems: 'center',
        gap: 4,
    },
    roleBtnActive: {
        borderColor: '#2563eb',
        backgroundColor: '#2563eb',
    },
    roleBtnLabel: {
        fontSize: 15,
        fontWeight: '700',
        color: '#374151',
    },
    roleBtnLabelActive: { color: '#fff' },
    roleBtnDesc: {
        fontSize: 11,
        color: '#9ca3af',
        textAlign: 'center',
    },
    roleBtnDescActive: { color: 'rgba(255,255,255,0.8)' },
    fieldWrapper: { marginBottom: 14 },
    label: {
        fontSize: 13,
        fontWeight: '600',
        color: '#374151',
        marginBottom: 6,
    },
    inputRow: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f9fafb',
        borderWidth: 1.5,
        borderColor: '#e5e7eb',
        borderRadius: 12,
        paddingHorizontal: 12,
        paddingVertical: Platform.OS === 'ios' ? 12 : 0,
    },
    inputError: { borderColor: '#ef4444' },
    inputIcon: { marginRight: 8 },
    input: {
        flex: 1,
        fontSize: 15,
        color: '#111827',
        paddingVertical: 10,
    },
    eyeBtn: { padding: 4 },
    errorText: {
        fontSize: 12,
        color: '#ef4444',
        marginTop: 4,
        marginLeft: 2,
    },
    submitBtn: {
        backgroundColor: '#2563eb',
        borderRadius: 14,
        paddingVertical: 15,
        alignItems: 'center',
        marginTop: 8,
        elevation: 4,
        shadowColor: '#2563eb',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.35,
        shadowRadius: 8,
    },
    submitBtnDisabled: { opacity: 0.7 },
    submitText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '700',
        letterSpacing: 0.3,
    },
    switchLink: {
        marginTop: 18,
        alignItems: 'center',
    },
    switchLinkText: {
        fontSize: 14,
        color: '#6b7280',
    },
    switchLinkBold: {
        color: '#2563eb',
        fontWeight: '700',
    },
});
