/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

/**
 * Spotify-inspired color palette for LangoSpark
 */

const spotifyGreen = '#1DB954';
const spotifyBlack = '#191414';
const spotifyDarkGray = '#282828';
const spotifyLightGray = '#B3B3B3';
const spotifyWhite = '#FFFFFF';

// App-specific colors
const navBackground = '#F5F5F7';
const navBackgroundDark = '#121212';
const appBackground = '#FFFFFF';
const appBackgroundDark = '#121212';
const cardBackground = '#F7F7F7';
const cardBackgroundDark = '#282828';
const cardBorder = '#E5E5E5';
const cardBorderDark = '#333333';

export const Colors = {
  light: {
    text: spotifyBlack,
    background: appBackground,
    tint: spotifyGreen,
    tabIconDefault: '#999999',
    tabIconSelected: spotifyGreen,
    card: cardBackground,
    cardBorder: cardBorder,
    secondaryText: '#737373',
    navBackground: navBackground,
    modalBackground: spotifyWhite,
    inputBackground: '#F0F0F0',
    buttonBackground: spotifyGreen,
    buttonText: spotifyWhite,
    error: '#E25D56',
    success: spotifyGreen,
  },
  dark: {
    text: spotifyWhite,
    background: appBackgroundDark,
    tint: spotifyGreen,
    tabIconDefault: '#777777',
    tabIconSelected: spotifyGreen,
    card: cardBackgroundDark,
    cardBorder: cardBorderDark,
    secondaryText: spotifyLightGray,
    navBackground: navBackgroundDark,
    modalBackground: spotifyDarkGray,
    inputBackground: '#333333',
    buttonBackground: spotifyGreen,
    buttonText: spotifyWhite,
    error: '#E25D56',
    success: spotifyGreen,
  },
};
