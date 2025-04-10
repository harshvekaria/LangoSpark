import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../services/api';
import { Colors } from '../../constants/Colors';
import { useColorScheme } from 'react-native';

export default function ResetPasswordScreen() {
  const params = useLocalSearchParams();
  const token = params.token as string;
  
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];

  const handleResetPassword = async () => {
    if (!password || !confirmPassword) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }

    if (password.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters long');
      return;
    }

    setIsLoading(true);
    try {
      const response = await api.post('/auth/reset-password', {
        token,
        newPassword: password
      });

      Alert.alert(
        'Success',
        'Your password has been reset successfully',
        [{ text: 'Login', onPress: () => router.push('/auth/login') }]
      );
    } catch (error: any) {
      console.error('Password reset failed:', error);
      Alert.alert(
        'Reset Failed',
        error.response?.data?.message || 'An error occurred during password reset'
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>Reset Password</Text>
        <Text style={[styles.subtitle, { color: colors.secondaryText }]}>
          Create a new password for your account
        </Text>
      </View>

      <View style={styles.form}>
        <View style={[styles.inputContainer, { borderColor: colors.cardBorder }]}>
          <TextInput
            style={[styles.input, { color: colors.text }]}
            placeholder="New Password"
            placeholderTextColor={colors.secondaryText}
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!showPassword}
          />
          <TouchableOpacity
            style={styles.eyeIcon}
            onPress={() => setShowPassword(!showPassword)}
          >
            <Ionicons
              name={showPassword ? 'eye-off' : 'eye'}
              size={24}
              color={colors.secondaryText}
            />
          </TouchableOpacity>
        </View>

        <View style={[styles.inputContainer, { borderColor: colors.cardBorder }]}>
          <TextInput
            style={[styles.input, { color: colors.text }]}
            placeholder="Confirm New Password"
            placeholderTextColor={colors.secondaryText}
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry={!showConfirmPassword}
          />
          <TouchableOpacity
            style={styles.eyeIcon}
            onPress={() => setShowConfirmPassword(!showConfirmPassword)}
          >
            <Ionicons
              name={showConfirmPassword ? 'eye-off' : 'eye'}
              size={24}
              color={colors.secondaryText}
            />
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={[styles.button, { backgroundColor: colors.tint }, isLoading && styles.buttonDisabled]}
          onPress={handleResetPassword}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Reset Password</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.backLink}
          onPress={() => router.push('/auth/login')}
        >
          <Text style={[styles.backText, { color: colors.secondaryText }]}>
            Back to <Text style={[styles.backTextBold, { color: colors.tint }]}>Login</Text>
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  header: {
    marginTop: 60,
    marginBottom: 40,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    lineHeight: 24,
  },
  form: {
    flex: 1,
  },
  inputContainer: {
    marginBottom: 15,
    position: 'relative',
    borderWidth: 1,
    borderRadius: 8,
    height: 55,
  },
  input: {
    padding: 15,
    borderRadius: 8,
    fontSize: 16,
    height: '100%',
  },
  eyeIcon: {
    position: 'absolute',
    right: 15,
    top: 15,
  },
  button: {
    padding: 15,
    borderRadius: 30,
    alignItems: 'center',
    marginTop: 20,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  backLink: {
    marginTop: 20,
    alignItems: 'center',
  },
  backText: {
    fontSize: 16,
  },
  backTextBold: {
    fontWeight: 'bold',
  },
}); 