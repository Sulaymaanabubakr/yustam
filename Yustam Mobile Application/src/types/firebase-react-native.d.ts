declare module 'firebase/auth/react-native' {
  import { Persistence } from 'firebase/auth';

  export * from 'firebase/auth';

  export function getReactNativePersistence(storage: {
    getItem(key: string): Promise<string | null>;
    setItem(key: string, value: string): Promise<void>;
    removeItem(key: string): Promise<void>;
  }): Persistence;
}
