import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { useAuth } from "../../contexts/AuthContext";
import { router } from "expo-router";
import { FontAwesome, Ionicons } from "@expo/vector-icons";
import { Colors } from "../../constants/Colors";
import { useColorScheme } from "react-native";
import { LogoSvg } from "../../components/LogoSvg";
import Toast from "react-native-toast-message";

export default function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { signIn } = useAuth();

  const colorScheme = useColorScheme() ?? "light";
  const colors = Colors[colorScheme];

  const handleLogin = async () => {
    if (!email) {
      Toast.show({
        type: "error",
        text1: "Error",
        text2: "Please enter your email.",
      });
      return;
    }
    if (!password) {
      Toast.show({
        type: "error",
        text1: "Error",
        text2: "Please enter your password.",
      });
      return;
    }

    setIsLoading(true);
    try {
      await signIn(email, password);
      // Success navigation is handled by the AuthContext watcher in _layout
      // Show success toast
      Toast.show({
        type: "success",
        text1: "Login Successful",
        text2: "Welcome back!",
      });
    } catch (error: any) {
      console.error("Login failed:", error);
      // Show error toast
      Toast.show({
        type: "error",
        text1: "Login Failed",
        text2:
          error.status === 401
            ? "Invalid email or password. Please try again."
            : error.message || "An error occurred. Please try again.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.logoContainer}>
        <LogoSvg width={180} height={90} color={colors.tint} />
      </View>

      <View style={styles.form}>
        <View
          style={[styles.inputContainer, { borderColor: colors.cardBorder }]}
        >
          <FontAwesome
            name="envelope"
            size={18}
            color={colors.secondaryText}
            style={styles.inputIcon}
          />
          <TextInput
            style={[styles.input, { color: colors.text }]}
            placeholder="Email"
            placeholderTextColor={colors.secondaryText}
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
          />
        </View>

        <View
          style={[styles.inputContainer, { borderColor: colors.cardBorder }]}
        >
          <FontAwesome
            name="lock"
            size={20}
            color={colors.secondaryText}
            style={styles.inputIcon}
          />
          <TextInput
            style={[styles.input, { color: colors.text }]}
            placeholder="Password"
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
              name={showPassword ? "eye-off" : "eye"}
              size={24}
              color={colors.secondaryText}
            />
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={styles.forgotPassword}
          onPress={() => router.push("/auth/forgot-password")}
        >
          <Text
            style={[styles.forgotPasswordText, { color: colors.secondaryText }]}
          >
            Forgot password?
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.button,
            { backgroundColor: colors.tint },
            isLoading && styles.buttonDisabled,
          ]}
          onPress={handleLogin}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Sign In</Text>
          )}
        </TouchableOpacity>
      </View>

      <View style={styles.footer}>
        <Text style={[styles.footerText, { color: colors.secondaryText }]}>
          Don't have an account?
        </Text>
        <TouchableOpacity
          style={[styles.registerButton, { borderColor: colors.cardBorder }]}
          onPress={() => router.push("/auth/register")}
        >
          <Text style={[styles.registerButtonText, { color: colors.text }]}>
            Sign Up
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
  logoContainer: {
    alignItems: "center",
    marginTop: 90,
    marginBottom: 50,
  },
  form: {
    marginBottom: 30,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 15,
    marginBottom: 15,
    height: 55,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    height: "100%",
    fontSize: 16,
  },
  eyeIcon: {
    padding: 5,
  },
  forgotPassword: {
    alignSelf: "flex-end",
    marginBottom: 20,
  },
  forgotPasswordText: {
    fontSize: 14,
  },
  button: {
    padding: 15,
    borderRadius: 30,
    alignItems: "center",
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  footer: {
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",
    marginTop: "auto",
    marginBottom: 30,
    gap: 15,
  },
  footerText: {
    fontSize: 16,
  },
  registerButton: {
    borderWidth: 1,
    borderRadius: 30,
    paddingVertical: 12,
    paddingHorizontal: 40,
  },
  registerButtonText: {
    fontSize: 16,
    fontWeight: "600",
  },
});
