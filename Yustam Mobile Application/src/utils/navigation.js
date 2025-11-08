export const goBackOrNavigate = (navigation, fallbackRoute = 'MainTabs') => {
  if (!navigation) {
    return;
  }

  if (typeof navigation.canGoBack === 'function' && navigation.canGoBack()) {
    navigation.goBack();
    return;
  }

  if (fallbackRoute && typeof navigation.navigate === 'function') {
    navigation.navigate(fallbackRoute);
  }
};
