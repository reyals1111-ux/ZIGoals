import {VaultSyncProvider} from "../../components/vault-sync-controls";
import { GoalProvider } from "../../components/goal-provider";
import {LocalContributionSync} from "../../components/platform/local-contribution-sync";
import {MotionPreferenceSync} from "../../components/motion-preference";
import {HideAmountsSync} from "../../components/hide-amounts";
import {PushSync} from "../../components/push/push-sync";
import { Shell } from "../../components/shell";
import { SiteFooter } from "../../components/footer/site-footer";
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <VaultSyncProvider><GoalProvider>
      <Shell footer={<SiteFooter/>}><LocalContributionSync/><MotionPreferenceSync/><HideAmountsSync/><PushSync/>{children}</Shell>
    </GoalProvider></VaultSyncProvider>
  );
}
