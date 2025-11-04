declare module '@expo/vector-icons/Ionicons' {
  import type { ComponentType } from 'react';
  import type { TextProps } from 'react-native';

  export interface IoniconsProps extends TextProps {
    name: string;
    size?: number;
    color?: string;
  }

  const Ionicons: ComponentType<IoniconsProps>;
  export default Ionicons;
}
