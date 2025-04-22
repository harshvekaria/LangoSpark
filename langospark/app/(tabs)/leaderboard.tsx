import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  FlatList, 
  TouchableOpacity, 
  ActivityIndicator, 
  ScrollView,
  useColorScheme,
  RefreshControl
} from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import { useNavigation, useLocalSearchParams } from 'expo-router';
import { leaderboardService, languageService } from '../../services/endpointService';
import { Colors } from '../../constants/Colors';
import { useFocusEffect } from '@react-navigation/native';

type TabType = 'global' | 'language' | 'quiz' | 'myStats';
type Language = { id: string; name: string; code: string };

interface LeaderboardEntry {
  userId: string;
  userName: string;
  rank: number;
  score: number;
  quizzesCompleted?: number;
  averageScore?: number;
  totalScore?: number;
  timeTaken?: number;
}

interface UserStats {
  quizzesCompleted: number;
  averageScore: number;
  bestScore: number;
  languageBreakdown: {
    languageId: string;
    languageName: string;
    quizzesCompleted: number;
    averageScore: number;
  }[];
}

export default function LeaderboardScreen() {
  // Get URL parameters
  const params = useLocalSearchParams();
  const initialView = params.initialView as string;
  const initialQuizId = params.quizId as string;
  
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const navigation = useNavigation();
  
  const [activeTab, setActiveTab] = useState<TabType>('global');
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [globalLeaderboard, setGlobalLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [languageLeaderboard, setLanguageLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [quizLeaderboard, setQuizLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [currentQuizId, setCurrentQuizId] = useState<string | null>(null);
  const [quizInfo, setQuizInfo] = useState<{ id: string; lessonTitle: string } | null>(null);
  const [userStats, setUserStats] = useState<UserStats | null>(null);
  const [languages, setLanguages] = useState<Language[]>([]);
  const [selectedLanguage, setSelectedLanguage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Handle initial view selection based on parameters
  useEffect(() => {
    if (initialView === 'quiz' && initialQuizId) {
      setActiveTab('quiz');
      setCurrentQuizId(initialQuizId);
    }
  }, [initialView, initialQuizId]);

  // Fetch all languages on component mount
  useEffect(() => {
    fetchLanguages();
  }, []);
  
  // Refresh data when the screen comes into focus or when parameters change
  useFocusEffect(
    React.useCallback(() => {
      loadLeaderboardData();
    }, [activeTab, selectedLanguage, currentQuizId])
  );

  const fetchLanguages = async () => {
    try {
      const response = await languageService.getAllLanguages();
      if (response.success && response.data.length > 0) {
        setLanguages(response.data);
        setSelectedLanguage(response.data[0].id);
      }
    } catch (error) {
      console.error('Error fetching languages:', error);
      setError('Failed to load languages');
    }
  };

  const loadLeaderboardData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      if (activeTab === 'global') {
        await fetchGlobalLeaderboard();
      } else if (activeTab === 'language' && selectedLanguage) {
        await fetchLanguageLeaderboard(selectedLanguage);
      } else if (activeTab === 'quiz' && currentQuizId) {
        await fetchQuizLeaderboard(currentQuizId);
      } else if (activeTab === 'myStats') {
        await fetchUserStats();
      }
    } catch (error) {
      console.error('Error loading leaderboard data:', error);
      setError('Failed to load leaderboard data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchGlobalLeaderboard = async () => {
    const response = await leaderboardService.getGlobalLeaderboard();
    if (response.success) {
      setGlobalLeaderboard(response.data.map((entry: any, index: number) => ({
        ...entry,
        rank: index + 1
      })));
    } else {
      setError('Failed to load global leaderboard');
    }
  };

  const fetchLanguageLeaderboard = async (languageId: string) => {
    const response = await leaderboardService.getLanguageLeaderboard(languageId);
    if (response.success) {
      setLanguageLeaderboard(response.data.leaderboard.map((entry: any, index: number) => ({
        ...entry,
        rank: index + 1
      })));
    } else {
      setError('Failed to load language leaderboard');
    }
  };

  const fetchQuizLeaderboard = async (quizId: string) => {
    const response = await leaderboardService.getQuizLeaderboard(quizId);
    if (response.success) {
      setQuizLeaderboard(response.data.leaderboard);
      setQuizInfo(response.data.quizInfo);
    } else {
      setError('Failed to load quiz leaderboard');
    }
  };

  const fetchUserStats = async () => {
    const response = await leaderboardService.getUserStats();
    if (response.success) {
      setUserStats(response.data);
    } else {
      setError('Failed to load user statistics');
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadLeaderboardData();
  };

  const renderTabs = () => {
    return (
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[
            styles.tab,
            activeTab === 'global' && [styles.activeTab, { borderColor: colors.tint }]
          ]}
          onPress={() => setActiveTab('global')}
        >
          <Text 
            style={[
              styles.tabText, 
              activeTab === 'global' && [styles.activeTabText, { color: colors.tint }],
              { color: activeTab === 'global' ? colors.tint : colors.text }
            ]}
          >
            Global
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[
            styles.tab,
            activeTab === 'language' && [styles.activeTab, { borderColor: colors.tint }]
          ]}
          onPress={() => setActiveTab('language')}
        >
          <Text 
            style={[
              styles.tabText, 
              activeTab === 'language' && [styles.activeTabText, { color: colors.tint }],
              { color: activeTab === 'language' ? colors.tint : colors.text }
            ]}
          >
            By Language
          </Text>
        </TouchableOpacity>
        
        {currentQuizId && (
          <TouchableOpacity
            style={[
              styles.tab,
              activeTab === 'quiz' && [styles.activeTab, { borderColor: colors.tint }]
            ]}
            onPress={() => setActiveTab('quiz')}
          >
            <Text 
              style={[
                styles.tabText, 
                activeTab === 'quiz' && [styles.activeTabText, { color: colors.tint }],
                { color: activeTab === 'quiz' ? colors.tint : colors.text }
              ]}
            >
              Quiz
            </Text>
          </TouchableOpacity>
        )}
        
        <TouchableOpacity
          style={[
            styles.tab,
            activeTab === 'myStats' && [styles.activeTab, { borderColor: colors.tint }]
          ]}
          onPress={() => setActiveTab('myStats')}
        >
          <Text 
            style={[
              styles.tabText, 
              activeTab === 'myStats' && [styles.activeTabText, { color: colors.tint }],
              { color: activeTab === 'myStats' ? colors.tint : colors.text }
            ]}
          >
            My Stats
          </Text>
        </TouchableOpacity>
      </View>
    );
  };

  const renderLanguageDropdown = () => {
    if (activeTab !== 'language' || languages.length === 0) return null;
    
    return (
      <View style={styles.dropdownContainer}>
        <Text style={[styles.dropdownLabel, { color: colors.text }]}>Select Language:</Text>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.languageList}
        >
          {languages.map(language => (
            <TouchableOpacity
              key={language.id}
              style={[
                styles.languageButton,
                selectedLanguage === language.id && [styles.selectedLanguage, { backgroundColor: colors.tint }]
              ]}
              onPress={() => setSelectedLanguage(language.id)}
            >
              <Text 
                style={[
                  styles.languageText,
                  selectedLanguage === language.id && styles.selectedLanguageText,
                  { color: selectedLanguage === language.id ? '#fff' : colors.text }
                ]}
              >
                {language.name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    );
  };

  const renderLeaderboardItem = ({ item }: { item: LeaderboardEntry }) => {
    // Determine what data to show based on which tab is active
    const primaryStat = activeTab === 'global' ? 
      `${item.averageScore?.toFixed(1) || 0}%` : 
      `${item.score}%`;
    
    const secondaryStat = activeTab === 'global' ? 
      `${item.quizzesCompleted || 0} Quizzes` : 
      item.timeTaken ? `${Math.floor(item.timeTaken / 60)}:${(item.timeTaken % 60).toString().padStart(2, '0')}` : '';

    return (
      <View style={[styles.leaderboardItem, { backgroundColor: colors.card }]}>
        <View style={styles.rankContainer}>
          <Text style={[styles.rankText, { color: colors.text }]}>
            {item.rank}
          </Text>
        </View>
        
        <View style={styles.userInfo}>
          <Text style={[styles.userName, { color: colors.text }]}>{item.userName}</Text>
        </View>
        
        <View style={styles.scoreContainer}>
          <Text style={[styles.scoreText, { color: colors.tint }]}>{primaryStat}</Text>
          {secondaryStat ? (
            <Text style={[styles.secondaryText, { color: colors.secondaryText }]}>
              {secondaryStat}
            </Text>
          ) : null}
        </View>
      </View>
    );
  };

  const renderUserStats = () => {
    if (!userStats) return null;
    
    return (
      <ScrollView 
        style={styles.userStatsContainer}
        contentContainerStyle={styles.userStatsContent}
      >
        <View style={[styles.statCard, { backgroundColor: colors.card }]}>
          <Text style={[styles.statCardTitle, { color: colors.text }]}>Your Performance</Text>
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: colors.tint }]}>{userStats.quizzesCompleted}</Text>
              <Text style={[styles.statLabel, { color: colors.secondaryText }]}>Quizzes Completed</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: colors.tint }]}>{userStats.averageScore.toFixed(1)}%</Text>
              <Text style={[styles.statLabel, { color: colors.secondaryText }]}>Average Score</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: colors.tint }]}>{userStats.bestScore}%</Text>
              <Text style={[styles.statLabel, { color: colors.secondaryText }]}>Best Score</Text>
            </View>
          </View>
        </View>
        
        {userStats.languageBreakdown.length > 0 && (
          <View style={[styles.statCard, { backgroundColor: colors.card }]}>
            <Text style={[styles.statCardTitle, { color: colors.text }]}>Performance by Language</Text>
            {userStats.languageBreakdown.map((langStats) => (
              <View key={langStats.languageId} style={styles.languageStatsRow}>
                <Text style={[styles.languageStatName, { color: colors.text }]}>
                  {langStats.languageName}
                </Text>
                <View style={styles.languageStatDetails}>
                  <Text style={[styles.languageStatValue, { color: colors.tint }]}>
                    {langStats.averageScore.toFixed(1)}%
                  </Text>
                  <Text style={[styles.languageStatSecondary, { color: colors.secondaryText }]}>
                    {langStats.quizzesCompleted} Quizzes
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    );
  };

  const renderContent = () => {
    if (loading) {
      return (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.tint} />
        </View>
      );
    }
    
    if (error) {
      return (
        <View style={styles.centerContainer}>
          <Text style={[styles.errorText, { color: colors.error }]}>{error}</Text>
          <TouchableOpacity 
            style={[styles.retryButton, { backgroundColor: colors.tint }]} 
            onPress={loadLeaderboardData}
          >
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      );
    }
    
    if (activeTab === 'global') {
      return (
        <FlatList
          data={globalLeaderboard}
          renderItem={renderLeaderboardItem}
          keyExtractor={(item) => item.userId}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={[styles.emptyText, { color: colors.secondaryText }]}>
                No leaderboard data available yet
              </Text>
            </View>
          }
        />
      );
    }
    
    if (activeTab === 'language') {
      return (
        <FlatList
          data={languageLeaderboard}
          renderItem={renderLeaderboardItem}
          keyExtractor={(item) => item.userId}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={[styles.emptyText, { color: colors.secondaryText }]}>
                No leaderboard data available for this language yet
              </Text>
            </View>
          }
        />
      );
    }

    if (activeTab === 'quiz') {
      return (
        <View style={styles.quizLeaderboardContainer}>
          {quizInfo && (
            <View style={[styles.quizInfoBox, { backgroundColor: colors.tint + '20' }]}>
              <Text style={[styles.quizInfoTitle, { color: colors.text }]}>
                {quizInfo.lessonTitle}
              </Text>
            </View>
          )}
          <FlatList
            data={quizLeaderboard}
            renderItem={renderLeaderboardItem}
            keyExtractor={(item) => item.userId}
            contentContainerStyle={styles.listContent}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
            }
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Text style={[styles.emptyText, { color: colors.secondaryText }]}>
                  No leaderboard data available for this quiz yet
                </Text>
              </View>
            }
          />
        </View>
      );
    }
    
    if (activeTab === 'myStats') {
      return renderUserStats();
    }
    
    return null;
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Leaderboard</Text>
      </View>
      {renderTabs()}
      {activeTab === 'language' && renderLanguageDropdown()}
      {renderContent()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  tabContainer: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginBottom: 16,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomWidth: 2,
  },
  tabText: {
    fontSize: 16,
    fontWeight: '500',
  },
  activeTabText: {
    fontWeight: 'bold',
  },
  dropdownContainer: {
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  dropdownLabel: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 8,
  },
  languageList: {
    paddingBottom: 8,
  },
  languageButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  selectedLanguage: {
    borderWidth: 0,
  },
  languageText: {
    fontSize: 14,
    fontWeight: '500',
  },
  selectedLanguageText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    marginBottom: 16,
    textAlign: 'center',
  },
  retryButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  leaderboardItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    marginBottom: 10,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  rankContainer: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  rankText: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
  },
  scoreContainer: {
    alignItems: 'flex-end',
  },
  scoreText: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  secondaryText: {
    fontSize: 12,
    marginTop: 4,
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    textAlign: 'center',
    fontSize: 16,
  },
  userStatsContainer: {
    flex: 1,
  },
  userStatsContent: {
    padding: 16,
  },
  statCard: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  statCardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    textAlign: 'center',
  },
  languageStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  languageStatName: {
    fontSize: 16,
    fontWeight: '500',
    flex: 1,
  },
  languageStatDetails: {
    alignItems: 'flex-end',
  },
  languageStatValue: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  languageStatSecondary: {
    fontSize: 12,
    marginTop: 2,
  },
  quizLeaderboardContainer: {
    flex: 1,
  },
  quizInfoBox: {
    margin: 16,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  quizInfoTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
}); 