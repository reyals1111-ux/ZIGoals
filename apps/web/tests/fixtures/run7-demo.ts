import type { Page } from "@playwright/test";
import { applyLocal, initialLedger, parseLocalLedger } from "../../lib/local-ledger";
import { createHabit, emptyHabitData, logHabitCount } from "../../lib/habits";
import { createEmptyHealth, saveFood, saveWeight, logHealthItem, saveActivity, setHealthTargets } from "../../lib/health";
/** Fictional local fixtures for repeatable visual review. Never included or seeded by the application. */
export async function installRun7Demo(page: Page) {
  await page.clock.install({ time: new Date("2026-09-15T12:00:00Z") });
  await page.emulateMedia({ reducedMotion: "reduce" });
  let ledger = initialLedger();
  const goals: Record<string, unknown> = {};
  const goalDetails = [["First home", "First Home", "500", "340", "15"], ["Dream trip", "Travel", "500", "180", "20"], ["Emergency fund", "Emergency Fund", "400", "360", "10"]];
  for (const [i, [name, category, targetValue, amount, monthlyContribution]] of goalDetails.entries()) {
    const timestamp = new Date(`2026-09-${String(10 + i).padStart(2, "0")}T10:00:00Z`).toISOString();
    ledger = applyLocal(ledger, { kind: "create" }, timestamp);
    ledger = applyLocal(ledger, { kind: "deposit", id: String(i+1), amount: `${amount}000000000000000000` }, timestamp);
    goals[String(i+1)] = { name, category, currency: "EUR", targetValue, startingAmount: "0", monthlyContribution, targetDate: "2027-09-15", riskPreference: "Conservative", liquidityPreference: "Anytime", deadlineFlexible: false, notes: "Fictional visual review example. Local Demo only." };
  }
  let habits = emptyHabitData();
  for (const [i, [title, category, goalId]] of [["Review my spending", "Finance", "1"], ["Learn a little Italian", "Learning", "2"], ["Walk in the fresh air", "Movement", ""]].entries()) {
    const id = `7ade9000-0000-4000-8000-00000000000${i}`;
    habits = createHabit(habits, { title: title!, category: category!, description: "A small daily intention.", notes: "Fictional review example.", schedule: { kind: "daily" }, target: 1, ...(goalId ? { goalLink: { goalId, chainId: "local-simulation", owner: "local-demo-user" } } : {}) }, new Date("2026-09-01T12:00:00Z"), id);
    for (let day = 1; day <= (i === 1 ? 14 : 15); day++) {
      const date = `2026-09-${String(day).padStart(2, "0")}`;
      if (day === 5 && i === 2) continue;
      habits = logHabitCount(habits, id, date, 1, "", new Date(`${date}T12:00:00Z`));
    }
  }
  let health = createEmptyHealth();
  health = setHealthTargets(health, { kcal: 2100, proteinMg: 120000, carbsMg: 250000, fatMg: 70000, weightGrams: 75000, steps: 8000 });
  const at = "2026-09-15T10:00:00Z";
  for (const [i, [name, kcal, protein, carbs, fat]] of ([['Morning oats & berries', 420, 18000, 58000, 13000], ['Lunch bowl', 610, 38000, 68000, 20000], ['Yogurt & fruit', 180, 14000, 24000, 4000]] as const).entries()) {
    const id = `health_food000${i}`;
    health = saveFood(health, { id, name, brand: "Fictional review sample", servingGrams: 300, nutrients: { kcal, proteinMg: protein, carbsMg: carbs, fatMg: fat }, createdAt: at, updatedAt: at });
    health = logHealthItem(health, { id: `health_diary00${i}`, sourceKind: "food", sourceId: id, date: "2026-09-15", meal: i === 0 ? "Breakfast" : i === 1 ? "Lunch" : "Snacks", quantityMilli: 1000 }, at);
  }
  for (let i=0;i<12;i++) health = saveWeight(health, { id: `health_weight0${String(i).padStart(2,"0")}`, date: `2026-09-${String(i+4).padStart(2,"0")}`, grams: 78500-i*80+(i%3)*110 }, at);
  health = saveActivity(health, { id: "health_walk0001", date: "2026-09-15", name: "A lunchtime walk", steps: 6400, minutes: 45 }, at);
  parseLocalLedger(JSON.stringify(ledger));
  const data = { "zigoals:local-ledger:v1": ledger, "zigoals:metadata:v1:local-simulation:local-demo-user": { schemaVersion: 1, chainId: "local-simulation", walletAddress: "local-demo-user", goals }, "zigoals:habits:v1": habits, "zigoals:health:v1": health };
  await page.addInitScript(data => { for (const [key, value] of Object.entries(data)) if (!localStorage.getItem(key)) localStorage.setItem(key, JSON.stringify(value)); }, data);
}
