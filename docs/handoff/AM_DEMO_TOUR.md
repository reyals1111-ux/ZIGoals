# Session AM — demo tour (12 minutes)

Open NOVA. Everything below runs on your own computer with no model, no key and no account.

```
NEXT_PUBLIC_APP_ENVIRONMENT=LOCAL_DEMO pnpm dev
```

then http://127.0.0.1:3100/app/nova (Chrome or Edge on a computer; a window of 1440 × 900 or larger shows it best).

## 1. The calm stage (an empty profile, 1 minute)
- NOVA takes the whole window: the app's chrome is gone, **Exit NOVA** (or Esc) is the way back, ⌘/Ctrl + J opens NOVA from any page.
- One living star in the centre: a spiral with a bright core, a planet on its orbit, a thin light streak. It is the agent. Under it: its state in words ("Standby · Tap to talk"), today's four figures and the greeting.
- Nothing else is on the stage. Above the command bar: one-tap requests.
- Leave the window alone for a minute, or click another window: the star slows to a rest pace and the sky stops drifting. Come back and press a key: it wakes.

## 2. Load the Showcase (1 minute)
Settings → **Load Showcase Demo**, then open NOVA again. The Showcase's own arrangement stands around the star (labelled "Showcase · fictional example data"): Health, Goals, Habits and Wealth as cut-corner glass instruments, more below.

## 3. Ask, and a widget is made (4 minutes)
Type in the command bar (or tap a chip). A request NOVA has a widget for is answered under the star, with its figure in one sentence and "Answered on this device · no AI used"; the star thinks, speaks and sends a beam to the widget it projects beside it. "Go to …" in the answer puts the keyboard on that widget. Anything else you type is a conversation: it opens at once, as it always did.

Questions to try:
1. **Show my habits this week** — a cyan lattice: each habit against the last seven days, with streaks.
2. **Am I on track for Japan?** — the goal's own widget (it found the goal by its name), with the pace in words; an estimate, never a promise.
3. **Show my net worth** — gold: the tracked wealth, the change since the first recorded valuation, the line.
4. **What did I spend this month?** and **Which bills are due?**
5. **What's the weather?** — in the Showcase: example values, labelled "Showcase example · not a real reading" (the Showcase asks no service). On your own data: "Weather is off", with what MET Norway would see; turn it on in **NOVA → Permissions → Weather (outside data)**, pick your city, and the widget's look follows the sky (sun, night, cloud, rain, snow, fog, thunder), credited "Data from MET Norway (CC BY 4.0)".
6. **What's my weight progress this month?** — the widget is made **locked**: the Showcase, like a new profile, keeps Health off for NOVA. Open Permissions, turn on Health for NOVA and both switches of ZIGi's Health gate: the widget unlocks in magenta, with the heart on its last reading and the hearts for days logged.
7. Dutch works the same: **Hoe gaat mijn gewicht deze maand?**, **Laat mijn gewoontes zien**, **Wat voor weer is het?**
8. **What can you see?**, **Which model are you using?**, **What did I ask before?**, **show the time**.

## 4. Pin, hide, close, open (2 minutes)
- Each widget's header has **Pin**, **Hide** and **Close** (on a very narrow widget: under **More**), and an arrow that opens its full page; Back returns to the same stage. A widget keeps its side of the star while others come and go.
- **Pin** keeps a widget (a small dot beside its title); unpinned widgets leave after 12 hours, or stay until you close them (right bar → Your choices).
- **Hide** folds it into the **Dock** above the command bar; tap the chip to bring it back.
- **Close** has Undo. Say **clear the stage** (Undo too), **pin the net worth**, **sluit het weer**.
- The bolt opens a widget's quick actions (log water, tick a habit, add a task): saved to your records at once, with Undo; the pages show the change live, and a change on a page shows in NOVA live. Anything with money is only a pre-filled card you confirm and sign yourself.
- **View** (bottom left): the arrangements (Command, Health, Wealth, Minimal) in one tap, the layouts, Holo or Classic, and the widget gallery.

## 5. The side bars (1 minute)
- **Left** — everything in the app: Today, your pillars, your plan, your mind, money, more, agents. Type in **Go to…**: "sleep", "bills", "new goal", "rekeningen" jump straight to the place. The arrow at its top folds it to icons or hides it.
- **Right** (the last tile of the top bar, or `]`) — **Requests** (what you asked; "from your phone" when it came from there; Show again; Forget), **On the stage**, **Your choices** (keep made widgets; gentle cards, off by default), then Behind the intelligence.

## 6. Voice, a model, your own window (2 minutes)
- The microphone in the command bar opens the conversation on its Talk button; speech input stays off until you turn it on and says where the audio goes first. While NOVA listens, thinks and speaks, the star shows it (rings falling in, arms winding tighter, the core pulsing) and says it in words.
- **Give NOVA a brain**: the guide at `/app/nova/setup` (a model on this computer with Ollama, LM Studio or llama.cpp, per operating system, with live checks; your own key; your Hermes Agent). With a model connected NOVA can also ask the stage for a widget itself; it can never change a permission, the weather switch, the privacy mode or a page-data switch.
- **NOVA in its own window**: the window tile in the top bar. Keep it beside your work; Exit closes it.
- **Make NOVA yours** (the gear tile): rename NOVA ("Premium · free during the Alpha"), accent, shortcuts.

## 7. Calm and still
Settings → Motion → **Calm**: the star turns at a third of its speed, widgets fade in. **Off** (or the device's reduced motion): nothing moves; the star is one composed frame per state and a made widget is simply there.

## On a phone
Open NOVA on a phone (or a 390 px window): the star, the chips in one row, the command field. A request opens the conversation and is answered in words; it is kept, with the widgets it would make, for your computer (Requests → Show again; across devices once sync is on for your account, on the public Alpha it stays on the device).
