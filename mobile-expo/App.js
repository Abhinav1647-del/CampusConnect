import React, { useRef, useState } from 'react';
import {
  View,
  StatusBar,
  StyleSheet,
  ActivityIndicator,
  Text,
  TouchableOpacity,
  BackHandler,
  Platform,
} from 'react-native';
import { WebView } from 'react-native-webview';

// Current PC Wi-Fi IP address:
const APP_URL = 'http://10.148.125.102:8080';

export default function App() {
  const webViewRef = useRef(null);
  const [canGoBack, setCanGoBack] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Handle hardware back button on Android
  React.useEffect(() => {
    if (Platform.OS === 'android') {
      const onBackPress = () => {
        if (canGoBack && webViewRef.current) {
          webViewRef.current.goBack();
          return true;
        }
        return false;
      };
      const sub = BackHandler.addEventListener('hardwareBackPress', onBackPress);
      return () => sub.remove();
    }
  }, [canGoBack]);

  const reloadApp = () => {
    setHasError(false);
    setErrorMessage('');
    if (webViewRef.current) {
      webViewRef.current.reload();
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#090d16" />

      {hasError ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorTitle}>Cannot Connect to Server</Text>
          <Text style={styles.errorSubtitle}>
            {errorMessage || 'Make sure your mobile and laptop are on the same hotspot/Wi-Fi and the Vite frontend is running.'}
          </Text>
          <Text style={styles.errorUrl}>{APP_URL}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={reloadApp}>
            <Text style={styles.retryText}>Retry Connection</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <WebView
          ref={webViewRef}
          source={{ uri: APP_URL }}
          style={styles.webview}
          javaScriptEnabled={true}
          domStorageEnabled={true}
          originWhitelist={['*']}
          mixedContentMode="always"
          startInLoadingState={true}
          allowsBackForwardNavigationGestures={true}
          renderLoading={() => (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#3b82f6" />
              <Text style={styles.loadingText}>Loading Campus Connect...</Text>
            </View>
          )}
          onNavigationStateChange={(navState) => {
            setCanGoBack(navState.canGoBack);
          }}
          onError={(syntheticEvent) => {
            const { nativeEvent } = syntheticEvent;
            setErrorMessage(nativeEvent.description || 'Connection failed');
            setHasError(true);
          }}
          onHttpError={(syntheticEvent) => {
            const { nativeEvent } = syntheticEvent;
            if (nativeEvent.statusCode >= 400) {
              setErrorMessage(`HTTP Error: ${nativeEvent.statusCode}`);
              setHasError(true);
            }
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#090d16',
  },
  webview: {
    flex: 1,
    backgroundColor: '#090d16',
  },
  loadingContainer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#090d16',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    color: '#94a3b8',
    fontSize: 14,
    fontWeight: '500',
  },
  errorContainer: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#090d16',
  },
  errorTitle: {
    color: '#f8fafc',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  errorSubtitle: {
    color: '#94a3b8',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 12,
    lineHeight: 20,
  },
  errorUrl: {
    color: '#60a5fa',
    fontSize: 12,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: '#2563eb',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  retryText: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 14,
  },
});
