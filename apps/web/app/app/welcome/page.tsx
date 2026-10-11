import { OnboardingFlow } from "../../../components/onboarding/onboarding-flow";
import type {Metadata} from "next";
// Session X Part 12 (WCAG 2.4.2): each page has its own title, "<page> · ZIGoals Alpha" (app/layout.tsx).
export const metadata: Metadata = {title: "Welcome"};

/** The first-run welcome (Session E). Reached from Today's welcome card, or on a phone from Settings. */
export default function Welcome() {
  return <OnboardingFlow />;
}
