/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

/**
 * Colors based on Spotify's design language with modified backgrounds
 */

const spotifyGreen = '#1DB954';
const spotifyBlack = '#191414';
const spotifyDarkGray = '#282828';
const spotifyLightGray = '#B3B3B3';
const spotifyWhite = '#FFFFFF';

// New colors
const navBackground = '#F5F5F7';
const navBackgroundDark = '#2E2E2E';
const appBackground = '#FFFFFF';
const appBackgroundDark = '#121212';

export const Colors = {
  light: {
    text: spotifyBlack,
    background: appBackground,
    tint: spotifyGreen,
    tabIconDefault: '#999999',
    tabIconSelected: spotifyGreen,
    card: spotifyWhite,
    cardBorder: '#EEEEEE',
    secondaryText: spotifyLightGray,
    navBackground: navBackground,
  },
  dark: {
    text: spotifyWhite,
    background: appBackgroundDark,
    tint: spotifyGreen,
    tabIconDefault: '#999999',
    tabIconSelected: spotifyGreen,
    card: spotifyDarkGray,
    cardBorder: '#333333',
    secondaryText: spotifyLightGray,
    navBackground: navBackgroundDark,
  },
};
