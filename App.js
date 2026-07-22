import RootNavigator from './src/navigation/RootNavigator';
import AppProviders from './src/providers/AppProviders';
import { useOfflineSync } from './src/shared/hooks/useOfflineSync';

export default function App() {
  useOfflineSync();
  return (
    <AppProviders>
      <RootNavigator />
    </AppProviders>
  );
}
