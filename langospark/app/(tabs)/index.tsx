import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { FontAwesome } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import { useColorScheme } from 'react-native';
import { Colors } from '../../constants/Colors';
import { SpotifyCard } from '../../components/ui/SpotifyCard';
import { SpotifyButton } from '../../components/ui/SpotifyButton';
import { progressService, languageService } from '../../services/endpointService';

interface LanguageProgress {
  language: {
    id: string;
    name: string;
  };
  level: string;
  progress: {
    totalLessons: number;
    completedLessons: number;
    completionRate: number;
    averageScore: number;
  };
}

interface MyLanguage {
  id: string;
  name: string;
  code?: string;
  level?: string;
}

export default function HomeScreen() {
  const router = useRouter();
  const { user, signOut } = useAuth();
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const [languages, setLanguages] = useState<LanguageProgress[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUserLanguages();
  }, []);

  useFocusEffect(
    useCallback(() => {
      console.log('Dashboard screen is focused, refreshing data...');
      fetchUserLanguages();
      return () => {
        console.log('Dashboard screen lost focus');
      };
    }, [])
  );

  const fetchUserLanguages = async () => {
    try {
      setLoading(true);
      
      let combinedLanguages: LanguageProgress[] = [];
      
      try {
        // Get progress data from dashboard
        const progressResponse = await progressService.getDashboard();
        
        if (progressResponse && progressResponse.success && progressResponse.data) {
          combinedLanguages = [...progressResponse.data];
          console.log('Dashboard data loaded:', combinedLanguages.length, 'languages');
        } else {
          console.warn('Dashboard API returned unsuccessful response:', progressResponse);
        }
      } catch (progressError) {
        console.error('Error fetching dashboard data:', progressError);
      }
      
      try {
        // Get languages data from the my-languages endpoint
        const myLanguagesResponse = await languageService.getMyLanguages();
        
        if (myLanguagesResponse && myLanguagesResponse.success && myLanguagesResponse.data) {
          console.log('My-languages API returned:', myLanguagesResponse.data.length, 'languages');
          
          // Create a map of existing language IDs for easy lookup
          const existingLanguageIds = new Set(combinedLanguages.map((lang: LanguageProgress) => lang.language.id));
          
          // Add languages from my-languages that aren't already in the dashboard data
          myLanguagesResponse.data.forEach((myLang: MyLanguage) => {
            if (!existingLanguageIds.has(myLang.id)) {
              // Add with default progress values
              combinedLanguages.push({
                language: {
                  id: myLang.id,
                  name: myLang.name
                },
                level: myLang.level || 'BEGINNER',
                progress: {
                  totalLessons: 0,
                  completedLessons: 0,
                  completionRate: 0,
                  averageScore: 0
                }
              });
            }
          });
          
          console.log('Combined languages count:', combinedLanguages.length);
        } else {
          console.warn('My-languages API returned unsuccessful response:', myLanguagesResponse);
        }
      } catch (myLangError) {
        console.error('Error fetching my-languages data:', myLangError);
      }
      
      // If we still don't have any languages, try the legacy API as fallback
      if (combinedLanguages.length === 0) {
        try {
          const legacyResponse = await languageService.getUserLanguages();
          
          if (legacyResponse && legacyResponse.success && legacyResponse.data) {
            console.log('Legacy API returned:', legacyResponse.data.length, 'languages');
            
            // Map the legacy response to our expected format
            combinedLanguages = legacyResponse.data.map((lang: any) => ({
              language: {
                id: lang.id,
                name: lang.name
              },
              level: lang.level || 'BEGINNER',
              progress: {
                totalLessons: lang.totalLessons || 0,
                completedLessons: lang.completedLessons || 0,
                completionRate: lang.completionRate || 0,
                averageScore: lang.averageScore || 0
              }
            }));
          }
        } catch (legacyError) {
          console.error('Error fetching legacy user languages:', legacyError);
        }
      }
      
      setLanguages(combinedLanguages);
    } catch (error) {
      console.error('Error in fetchUserLanguages:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.mainContainer, { backgroundColor: colors.background }]}>
      <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
        <View style={styles.welcomeSection}>
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
              <Text style={[styles.statNumber, { color: colors.text }]}>{languages.length}</Text>
              <Text style={[styles.statLabel, { color: colors.secondaryText }]}>Languages</Text>
            </SpotifyCard>
            <SpotifyCard style={styles.statCard} variant="elevated">
              <FontAwesome name="book" size={24} color={colors.tint} />
              <Text style={[styles.statNumber, { color: colors.text }]}>
                {languages.reduce((sum, lang) => sum + lang.progress.totalLessons, 0)}
              </Text>
              <Text style={[styles.statLabel, { color: colors.secondaryText }]}>Lessons</Text>
            </SpotifyCard>
            <SpotifyCard style={styles.statCard} variant="elevated">
              <FontAwesome name="star" size={24} color={colors.tint} />
              <Text style={[styles.statNumber, { color: colors.text }]}>
                {languages.length > 0 
                  ? Math.round(languages.reduce((sum, lang) => sum + lang.progress.completionRate, 0) / languages.length)
                  : 0}%
              </Text>
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
          
          {loading ? (
            <View style={styles.loadingContainer}>
              <FontAwesome name="spinner" size={24} color={colors.tint} />
            </View>
          ) : languages.length > 0 ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalScroll}>
              {languages.map((lang) => (
                <SpotifyCard 
                  key={lang.language.id}
                  style={styles.languageCard}
                  variant="elevated"
                  onPress={() => router.push(`/languages/${lang.language.id}`)}
                >
                  <View style={styles.languageInfo}>
                    <Text style={[styles.languageName, { color: colors.text }]}>{lang.language.name}</Text>
                    <Text style={[styles.languageProgress, { color: colors.secondaryText }]}>
                      {lang.level} • Lesson {lang.progress.completedLessons + 1}/{lang.progress.totalLessons}
                    </Text>
                    <View style={styles.progressBarContainer}>
                      <View 
                        style={[
                          styles.progressBar, 
                          { 
                            width: `${lang.progress.completionRate}%`,
                            backgroundColor: colors.tint 
                          }
                        ]} 
                      />
                    </View>
                  </View>
                </SpotifyCard>
              ))}
            </ScrollView>
          ) : (
            <View style={styles.emptyState}>
              <FontAwesome name="language" size={40} color={colors.secondaryText} />
              <Text style={[styles.emptyText, { color: colors.secondaryText }]}>
                Start learning your first language!
              </Text>
            </View>
          )}
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Quick Actions</Text>
          <View style={styles.actionButtonsRow}>
            <SpotifyButton 
              title="Start Practice" 
              onPress={() => router.push('/languages')}
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
  welcomeSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 10,
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 20,
  },
  progressBarContainer: {
    height: 10,
    backgroundColor: '#e0e0e0',
    borderRadius: 5,
    marginTop: 4,
  },
  progressBar: {
    height: '100%',
    borderRadius: 5,
  },
});
