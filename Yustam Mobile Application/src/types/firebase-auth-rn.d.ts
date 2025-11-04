declare module '@firebase/auth/dist/rn/index.js' {
  import type { FirebaseApp } from 'firebase/app';
  import type { Persistence, Auth, PopupRedirectResolver, Dependencies } from 'firebase/auth';
  import type AsyncStorage from '@react-native-async-storage/async-storage';

  export function getReactNativePersistence(storage: typeof AsyncStorage): Persistence;
  export function initializeAuth(
    app: FirebaseApp,
    options?: {
      persistence?: Persistence | Persistence[];
      popupRedirectResolver?: PopupRedirectResolver;
      deps?: Dependencies;
    }
  ): Auth;
}
