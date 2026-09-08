import { ReactNode } from 'react';
import { Text, View, ViewProps } from 'react-native';

type CardProps = ViewProps & {
  children: ReactNode;
  className?: string;
};

export function Card({ children, className = '', ...rest }: CardProps) {
  return (
    <View className={`bg-card border border-line rounded-[13px] ${className}`} {...rest}>
      {children}
    </View>
  );
}

/** Small uppercase mono caption used above every stat and section. */
export function MonoLabel({ children }: { children: ReactNode }) {
  return (
    <Text className="font-mono-med text-[10px] uppercase tracking-label text-ink-5">
      {children}
    </Text>
  );
}
