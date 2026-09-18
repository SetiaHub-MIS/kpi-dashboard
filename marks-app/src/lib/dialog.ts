import { Alert, Platform } from 'react-native';

/**
 * react-native-web's Alert.alert is an empty function, so on the web build —
 * the one most people use — a native-style alert shows nothing at all. The
 * browser's own dialogs stand in there; on a phone the real Alert is used.
 */

/** A notice with one button. */
export function notify(title: string, message?: string): void {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    window.alert(message ? `${title}\n\n${message}` : title);
    return;
  }
  Alert.alert(title, message);
}

/** A yes/no question. Resolves true only when the person confirms. */
export function confirmAction(
  title: string,
  message: string,
  labels: { confirm: string; cancel: string }
): Promise<boolean> {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    return Promise.resolve(window.confirm(`${title}\n\n${message}`));
  }
  return new Promise((resolve) => {
    Alert.alert(
      title,
      message,
      [
        { text: labels.cancel, style: 'cancel', onPress: () => resolve(false) },
        { text: labels.confirm, style: 'destructive', onPress: () => resolve(true) },
      ],
      { cancelable: true, onDismiss: () => resolve(false) }
    );
  });
}
