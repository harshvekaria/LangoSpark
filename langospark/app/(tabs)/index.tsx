import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { FontAwesome } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import { useColorScheme } from 'react-native';
import { Colors } from '../../constants/Colors';
import { SpotifyCard } from '../../components/ui/SpotifyCard';
import { SpotifyButton } from '../../components/ui/SpotifyButton';

export default function HomeScreen() {
  const router = useRouter();
  const { user, signOut } = useAuth();
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];

  return (
    <View style={[styles.mainContainer, { backgroundColor: colors.background }]}>
      <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.text }]}>Welcome, {user?.name}!</Text>
          <TouchableOpacity onPress={signOut} style={styles.logoutButton}>
            <FontAwesome name="sign-out" size={24} color={colors.tint} />
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Your Learning Journey</Text>
          <View style={styles.statsContainer}>
            <SpotifyCard style={styles.statCard} variant="elevated">
              <FontAwesome name="language" size={24} color={colors.tint} />
              <Text style={[styles.statNumber, { color: colors.text }]}>3</Text>
              <Text style={[styles.statLabel, { color: colors.secondaryText }]}>Languages</Text>
            </SpotifyCard>
            <SpotifyCard style={styles.statCard} variant="elevated">
              <FontAwesome name="book" size={24} color={colors.tint} />
              <Text style={[styles.statNumber, { color: colors.text }]}>12</Text>
              <Text style={[styles.statLabel, { color: colors.secondaryText }]}>Lessons</Text>
            </SpotifyCard>
            <SpotifyCard style={styles.statCard} variant="elevated">
              <FontAwesome name="star" size={24} color={colors.tint} />
              <Text style={[styles.statNumber, { color: colors.text }]}>85%</Text>
              <Text style={[styles.statLabel, { color: colors.secondaryText }]}>Progress</Text>
            </SpotifyCard>
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Continue Learning</Text>
            <TouchableOpacity onPress={() => router.push('/languages')}>
              <Text style={[styles.seeAllText, { color: colors.tint }]}>See all</Text>
            </TouchableOpacity>
          </View>
          
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalScroll}>
            <SpotifyCard 
              style={styles.languageCard}
              variant="elevated"
              onPress={() => router.push('/languages')}
            >
              <Image 
                source={{ uri: 'https://images.unsplash.com/photo-1464802686167-b939a6910659?ixlib=rb-1.2.1&auto=format&fit=crop&w=1350&q=80' }} 
                style={styles.languageImage} 
              />
              <View style={styles.languageInfo}>
                <Text style={[styles.languageName, { color: colors.text }]}>Spanish</Text>
                <Text style={[styles.languageProgress, { color: colors.secondaryText }]}>Beginner • Lesson 3/10</Text>
              </View>
            </SpotifyCard>
            
            <SpotifyCard 
              style={styles.languageCard}
              variant="elevated"
              onPress={() => router.push('/languages')}
            >
              <Image 
                source={{ uri: 'https://images.unsplash.com/photo-1493956103509-9ea7df12ba76?ixlib=rb-1.2.1&auto=format&fit=crop&w=1350&q=80' }} 
                style={styles.languageImage} 
              />
              <View style={styles.languageInfo}>
                <Text style={[styles.languageName, { color: colors.text }]}>French</Text>
                <Text style={[styles.languageProgress, { color: colors.secondaryText }]}>Intermediate • Lesson 5/12</Text>
              </View>
            </SpotifyCard>
            
            <SpotifyCard 
              style={styles.languageCard}
              variant="elevated"
              onPress={() => router.push('/languages')}
            >
              <Image 
                source={{ uri: 'https://images.unsplash.com/photo-1523731407965-2430cd12f5e4?ixlib=rb-1.2.1&auto=format&fit=crop&w=1350&q=80' }} 
                style={styles.languageImage} 
              />
              <View style={styles.languageInfo}>
                <Text style={[styles.languageName, { color: colors.text }]}>Japanese</Text>
                <Text style={[styles.languageProgress, { color: colors.secondaryText }]}>Beginner • Lesson 1/15</Text>
              </View>
            </SpotifyCard>
          </ScrollView>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Quick Actions</Text>
          <View style={styles.actionButtonsRow}>
            <SpotifyButton 
              title="Explore Languages" 
              onPress={() => router.push('/explore')}
              style={styles.actionButton}
            />
            <SpotifyButton 
              title="View Profile" 
              variant="secondary"
              onPress={() => router.push('/profile')}
              style={styles.actionButton}
            />
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  mainContainer: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  contentContainer: {
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
  },
  logoutButton: {
    padding: 8,
  },
  section: {
    padding: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 15,
  },
  seeAllText: {
    fontSize: 14,
    fontWeight: '600',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    padding: 15,
    marginHorizontal: 5,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 5,
  },
  statLabel: {
    fontSize: 14,
    marginTop: 5,
  },
  horizontalScroll: {
    marginLeft: -5,
    marginRight: -5,
  },
  languageCard: {
    width: 180,
    marginHorizontal: 5,
    padding: 0,
    overflow: 'hidden',
  },
  languageImage: {
    width: '100%',
    height: 120,
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
  },
  languageInfo: {
    padding: 12,
  },
  languageName: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  languageProgress: {
    fontSize: 12,
    marginTop: 4,
  },
  actionButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  actionButton: {
    flex: 1,
    marginHorizontal: 5,
  },
});
