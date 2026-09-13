import { GoalProvider } from "../../components/goal-provider";
import { Shell } from "../../components/shell";
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <GoalProvider>
      <Shell>{children}</Shell>
    </GoalProvider>
  );
}
