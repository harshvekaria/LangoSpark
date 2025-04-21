import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  ScrollView,
} from "react-native";
import { useState } from "react";
import { router } from "expo-router";
import { FontAwesome, Ionicons } from "@expo/vector-icons";
import { useAuth } from "../../contexts/AuthContext";
import { Colors } from "../../constants/Colors";
import { useColorScheme } from "react-native";
import { LogoSvg } from "../../components/LogoSvg";
import Toast from "react-native-toast-message";

export default function RegisterScreen() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { register } = useAuth();

  const colorScheme = useColorScheme() ?? "light";
  const colors = Colors[colorScheme];

  const handleRegister = async () => {
    if (!fullName || !email || !password || !confirmPassword) {
      Toast.show({
        type: "error",
        text1: "Error",
        text2: "Please fill in all fields",
      });
      return;
    }

    if (password !== confirmPassword) {
      Toast.show({
        type: "error",
        text1: "Error",
        text2: "Passwords do not match",
      });
      return;
    }

    if (password.length < 6) {
      Toast.show({
        type: "error",
        text1: "Error",
        text2: "Password must be at least 6 characters long",
      });
      return;
    }

    setIsLoading(true);
    try {
      console.log("Attempting to register with:", { fullName, email });
      await register(fullName, email, password);
      console.log("Registration successful");
      Toast.show({
        type: "success",
        text1: "Success",
        text2: "Registration successful! Please log in.",
      });
    } catch (error: any) {
      console.error("Registration error:", error);
      Toast.show({
        type: "error",
        text1: "Registration Failed",
        text2:
          error.response?.data?.message ||
          error.message ||
          "An error occurred during registration",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.contentContainer}
    >
      <View style={styles.logoContainer}>
        <LogoSvg width={160} height={80} color={colors.tint} />
      </View>

      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>
          Create Account
        </Text>
        <Text style={[styles.subtitle, { color: colors.secondaryText }]}>
          Sign up to start your language learning journey
        </Text>
      </View>

      <View style={styles.form}>
        <View
          style={[styles.inputContainer, { borderColor: colors.cardBorder }]}
        >
          <FontAwesome
            name="user"
            size={18}
            color={colors.secondaryText}
            style={styles.inputIcon}
          />
          <TextInput
            style={[styles.input, { color: colors.text }]}
            placeholder="Full Name"
            placeholderTextColor={colors.secondaryText}
            value={fullName}
            onChangeText={setFullName}
            autoCapitalize="words"
          />
        </View>

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
            keyboardType="email-address"
            autoCapitalize="none"
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
            placeholder="Confirm Password"
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
              name={showConfirmPassword ? "eye-off" : "eye"}
              size={24}
              color={colors.secondaryText}
            />
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={[
            styles.button,
            { backgroundColor: colors.tint },
            isLoading && styles.buttonDisabled,
          ]}
          onPress={handleRegister}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Create Account</Text>
          )}
        </TouchableOpacity>

        <View style={styles.footer}>
          <Text style={[styles.footerText, { color: colors.secondaryText }]}>
            Already have an account?
          </Text>
          <TouchableOpacity onPress={() => router.replace("/auth/login")}>
            <Text style={[styles.loginText, { color: colors.tint }]}>
              Sign In
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
    paddingTop: 50,
  },
  logoContainer: {
    alignItems: "center",
    marginBottom: 20,
  },
  header: {
    marginBottom: 30,
  },
  title: {
    fontSize: 32,
    fontWeight: "bold",
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
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 15,
    marginBottom: 20,
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
  button: {
    padding: 15,
    borderRadius: 30,
    alignItems: "center",
    marginVertical: 20,
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
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 20,
    gap: 5,
  },
  footerText: {
    fontSize: 16,
  },
  loginText: {
    fontSize: 16,
    fontWeight: "bold",
  },
});
