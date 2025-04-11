import React, { useState } from 'react';
import { StyleSheet, Image, View, TextInput, ScrollView, TouchableOpacity, FlatList } from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useColorScheme } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { GradientBackground } from '@/components/ui/GradientBackground';
import { SpotifyCard } from '@/components/ui/SpotifyCard';
import { Colors } from '@/constants/Colors';

// Define category type
interface Category {
  id: string;
  name: string;
  image: string;
}

// Mock data for categories
const CATEGORIES: Category[] = [
  { id: '1', name: 'European Languages', image: 'https://images.unsplash.com/photo-1519677100203-a0e668c92439?ixlib=rb-1.2.1&auto=format&fit=crop&w=1350&q=80' },
  { id: '2', name: 'Asian Languages', image: 'https://images.unsplash.com/photo-1476362174823-3a23f4aa6d76?ixlib=rb-1.2.1&auto=format&fit=crop&w=1350&q=80' },
  { id: '3', name: 'Popular Courses', image: 'https://images.unsplash.com/photo-1516979187457-637abb4f9353?ixlib=rb-1.2.1&auto=format&fit=crop&w=1350&q=80' },
  { id: '4', name: 'For Beginners', image: 'https://images.unsplash.com/photo-1488190211105-8b0e65b80b4e?ixlib=rb-1.2.1&auto=format&fit=crop&w=1350&q=80' },
  { id: '5', name: 'Business Languages', image: 'https://images.unsplash.com/photo-1521791136064-7986c2920216?ixlib=rb-1.2.1&auto=format&fit=crop&w=1350&q=80' },
  { id: '6', name: 'Community Favorites', image: 'https://images.unsplash.com/photo-1517486808906-6ca8b3f8e1c1?ixlib=rb-1.2.1&auto=format&fit=crop&w=1350&q=80' },
];

export default function ExploreScreen() {
  const [searchQuery, setSearchQuery] = useState('');
  const router = useRouter();
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];

  const renderCategoryItem = ({ item }: { item: Category }) => (
    <SpotifyCard 
      style={styles.categoryCard}
      variant="elevated"
      onPress={() => router.push('/languages')}
    >
      <Image 
        source={{ uri: item.image }} 
        style={styles.categoryImage} 
      />
      <View style={styles.categoryTextContainer}>
        <ThemedText style={styles.categoryText}>{item.name}</ThemedText>
      </View>
    </SpotifyCard>
  );

  return (
    <View style={[styles.mainContainer, { backgroundColor: colors.background }]}>
      <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
        <View style={styles.header}>
          <ThemedText type="title" style={styles.title}>Explore</ThemedText>
        </View>

        <View style={[styles.searchContainer, { backgroundColor: colors.card }]}>
          <FontAwesome name="search" size={18} color={colors.secondaryText} style={styles.searchIcon} />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder="Search for languages, courses..."
            placeholderTextColor={colors.secondaryText}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.clearButton}>
              <FontAwesome name="times-circle" size={18} color={colors.secondaryText} />
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.recentSearches}>
          <View style={styles.sectionHeader}>
            <ThemedText style={styles.sectionTitle}>Recent Searches</ThemedText>
            <TouchableOpacity>
              <ThemedText style={[styles.seeAllText, { color: colors.tint }]}>Clear all</ThemedText>
            </TouchableOpacity>
          </View>
          
          <View style={styles.recentItems}>
            <TouchableOpacity style={[styles.recentItem, { backgroundColor: colors.card }]}>
              <FontAwesome name="history" size={16} color={colors.secondaryText} style={styles.recentIcon} />
              <ThemedText style={styles.recentText}>Spanish beginner course</ThemedText>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.recentItem, { backgroundColor: colors.card }]}>
              <FontAwesome name="history" size={16} color={colors.secondaryText} style={styles.recentIcon} />
              <ThemedText style={styles.recentText}>French conversation</ThemedText>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.browseSection}>
          <ThemedText style={styles.sectionTitle}>Browse All</ThemedText>
          <FlatList
            data={CATEGORIES}
            renderItem={renderCategoryItem}
            keyExtractor={item => item.id}
            numColumns={2}
            scrollEnabled={false}
            contentContainerStyle={styles.categoriesContainer}
          />
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
    paddingTop: 60,
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 20,
    marginBottom: 20,
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 8,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    height: 40,
    fontSize: 16,
  },
  clearButton: {
    padding: 5,
  },
  recentSearches: {
    paddingHorizontal: 20,
    marginBottom: 30,
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
    marginBottom: 10,
  },
  seeAllText: {
    fontSize: 14,
    fontWeight: '600',
  },
  recentItems: {
    gap: 10,
  },
  recentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    borderRadius: 8,
  },
  recentIcon: {
    marginRight: 10,
  },
  recentText: {
    fontSize: 14,
  },
  browseSection: {
    paddingHorizontal: 20,
  },
  categoriesContainer: {
    gap: 10,
  },
  categoryCard: {
    flex: 1,
    marginHorizontal: 5,
    aspectRatio: 1,
    padding: 0,
    overflow: 'hidden',
  },
  categoryImage: {
    width: '100%',
    height: '100%',
    position: 'absolute',
  },
  categoryTextContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 12,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  categoryText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: 'white',
  },
});
