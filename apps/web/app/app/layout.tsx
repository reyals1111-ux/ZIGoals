import {VaultSyncProvider} from "../../components/vault-sync-controls";
import { GoalProvider } from "../../components/goal-provider";
import {LocalContributionSync} from "../../components/platform/local-contribution-sync";
import {MotionPreferenceSync} from "../../components/motion-preference";
import { Shell } from "../../components/shell";
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <VaultSyncProvider><GoalProvider>
      <Shell><LocalContributionSync/><MotionPreferenceSync/>{children}</Shell>
    </GoalProvider></VaultSyncProvider>
  );
}
