import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, TextInput, Alert, Modal } from 'react-native';
import { FontAwesome, Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import { Colors } from '../../constants/Colors';
import { useColorScheme } from 'react-native';
import { userService, progressService } from '../../services/endpointService';

interface Progress {
  language: {
    id: string;
    name: string;
    // other language properties
  };
  level: string;
  progress: {
    totalLessons: number;
    completedLessons: number;
    completionRate: number;
    averageScore: number;
  };
}

export default function ProfileScreen() {
  const { user, signOut } = useAuth();
  const [progress, setProgress] = useState<Progress[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];

  useEffect(() => {
    fetchProgress();
  }, []);

  const fetchProgress = async () => {
    try {
      const response = await progressService.getDashboard();
      if (response.success) {
        setProgress(response.data);
      }
    } catch (error) {
      console.error('Failed to fetch progress:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      Alert.alert('Error', 'Please fill in all password fields');
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert('Error', 'New passwords do not match');
      return;
    }

    if (newPassword.length < 6) {
      Alert.alert('Error', 'New password must be at least 6 characters long');
      return;
    }

    setIsChangingPassword(true);
    try {
      const response = await userService.changePassword({
        currentPassword,
        newPassword
      });
      
      Alert.alert('Success', 'Your password has been updated');
      setShowPasswordModal(false);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error: any) {
      console.error('Failed to change password:', error);
      Alert.alert(
        'Password Change Failed',
        error.response?.data?.message || 'An error occurred while changing your password'
      );
    } finally {
      setIsChangingPassword(false);
    }
  };

  if (isLoading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.tint} />
      </View>
    );
  }

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { borderBottomColor: colors.cardBorder }]}>
        <View style={styles.avatarContainer}>
          <FontAwesome name="user-circle" size={80} color={colors.tint} />
        </View>
        <Text style={[styles.name, { color: colors.text }]}>{user?.name}</Text>
        <Text style={[styles.email, { color: colors.secondaryText }]}>{user?.email}</Text>
        
        <View style={styles.actionButtons}>
          <TouchableOpacity 
            style={[styles.actionButton, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}
            onPress={() => setShowPasswordModal(true)}
          >
            <FontAwesome name="lock" size={16} color={colors.tint} style={styles.actionIcon} />
            <Text style={[styles.actionText, { color: colors.text }]}>Change Password</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Learning Progress</Text>
        {progress.length > 0 ? (
          progress.map((item) => (
            <View key={item.language.id} style={[styles.progressCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
              <View style={styles.languageHeader}>
                <Text style={[styles.languageName, { color: colors.text }]}>{item.language.name}</Text>
                <View style={[styles.levelBadge, { backgroundColor: colors.tint }]}>
                  <Text style={styles.levelText}>{item.level}</Text>
                </View>
              </View>
              <View style={[styles.progressContainer, { backgroundColor: colors.navBackground }]}>
                <View style={[styles.progressBar, { width: `${item.progress.completionRate}%`, backgroundColor: colors.tint }]} />
                <Text style={[styles.progressText, { color: colors.secondaryText }]}>{Math.round(item.progress.completionRate)}%</Text>
              </View>
              <Text style={[styles.lessonCount, { color: colors.secondaryText }]}>
                {item.progress.completedLessons} of {item.progress.totalLessons} lessons completed
              </Text>
            </View>
          ))
        ) : (
          <View style={[styles.emptyState, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
            <FontAwesome name="book" size={40} color={colors.secondaryText} />
            <Text style={[styles.emptyText, { color: colors.secondaryText }]}>
              You haven't started learning any languages yet
            </Text>
          </View>
        )}
      </View>

      <TouchableOpacity 
        style={[styles.logoutButton, { backgroundColor: '#ff4444' }]} 
        onPress={signOut}
      >
        <FontAwesome name="sign-out" size={20} color="#fff" />
        <Text style={styles.logoutText}>Sign Out</Text>
      </TouchableOpacity>

      {/* Password Change Modal */}
      <Modal
        visible={showPasswordModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowPasswordModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.background }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Change Password</Text>
              <TouchableOpacity 
                style={styles.closeButton}
                onPress={() => setShowPasswordModal(false)}
              >
                <FontAwesome name="times" size={20} color={colors.secondaryText} />
              </TouchableOpacity>
            </View>

            <View style={[styles.inputContainer, { borderColor: colors.cardBorder }]}>
              <TextInput
                style={[styles.input, { color: colors.text }]}
                placeholder="Current Password"
                placeholderTextColor={colors.secondaryText}
                value={currentPassword}
                onChangeText={setCurrentPassword}
                secureTextEntry={!showCurrentPassword}
              />
              <TouchableOpacity
                style={styles.eyeIcon}
                onPress={() => setShowCurrentPassword(!showCurrentPassword)}
              >
                <Ionicons
                  name={showCurrentPassword ? 'eye-off' : 'eye'}
                  size={24}
                  color={colors.secondaryText}
                />
              </TouchableOpacity>
            </View>

            <View style={[styles.inputContainer, { borderColor: colors.cardBorder }]}>
              <TextInput
                style={[styles.input, { color: colors.text }]}
                placeholder="New Password"
                placeholderTextColor={colors.secondaryText}
                value={newPassword}
                onChangeText={setNewPassword}
                secureTextEntry={!showNewPassword}
              />
              <TouchableOpacity
                style={styles.eyeIcon}
                onPress={() => setShowNewPassword(!showNewPassword)}
              >
                <Ionicons
                  name={showNewPassword ? 'eye-off' : 'eye'}
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
              style={[styles.saveButton, { backgroundColor: colors.tint }]}
              onPress={handleChangePassword}
              disabled={isChangingPassword}
            >
              {isChangingPassword ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.saveButtonText}>Update Password</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    paddingTop: 40,
  },
  avatarContainer: {
    marginBottom: 16,
  },
  name: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  email: {
    fontSize: 16,
    marginBottom: 16,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 10,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
  },
  actionIcon: {
    marginRight: 8,
  },
  actionText: {
    fontSize: 14,
    fontWeight: '500',
  },
  section: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  progressCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
  },
  languageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  languageName: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  levelBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  levelText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  progressContainer: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressBar: {
    height: '100%',
    borderRadius: 4,
  },
  progressText: {
    position: 'absolute',
    right: 0,
    top: -18,
    fontSize: 12,
  },
  lessonCount: {
    fontSize: 14,
  },
  emptyState: {
    alignItems: 'center',
    padding: 30,
    borderRadius: 12,
    borderWidth: 1,
  },
  emptyText: {
    marginTop: 15,
    textAlign: 'center',
    fontSize: 16,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    margin: 20,
    padding: 16,
    borderRadius: 30,
  },
  logoutText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContent: {
    width: '85%',
    borderRadius: 12,
    padding: 20,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  closeButton: {
    padding: 5,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 15,
    marginBottom: 15,
    height: 55,
  },
  input: {
    flex: 1,
    height: '100%',
    fontSize: 16,
  },
  eyeIcon: {
    padding: 5,
  },
  saveButton: {
    padding: 15,
    borderRadius: 30,
    alignItems: 'center',
    marginTop: 10,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
}); 