declare module 'firebase/auth/react-native' {
  import type {
    Persistence,
    Auth,
    Dependencies,
    PopupRedirectResolver,
  } from 'firebase/auth';

  export function getReactNativePersistence(storage: unknown): Persistence;
  export function initializeAuth(
    app: import('firebase/app').FirebaseApp,
    options?: {
      persistence?: Persistence | Persistence[];
      popupRedirectResolver?: PopupRedirectResolver;
      deps?: Dependencies;
    }
  ): Auth;
}
