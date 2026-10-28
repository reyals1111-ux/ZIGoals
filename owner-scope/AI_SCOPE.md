# Session AI — ZIGi scope (owner-approved; read-only, never commit)

The full rows behind the ZIGi IDs in the Session AI prompt, from the owner's two answered Grok picklists (20 Oct on Alpha #44, 21 Oct on Alpha #45). Finding IDs (B-, N-, D-, L-, M-, T-, BUG-) refer to the Grok reports (not in the repo); the rows carry what the bots found. Where a picklist-2 row says "overlaps 20 Oct item X", treat them as one fix.

## Picklist 2 (Alpha #45): ZIGi rows
- **DE7** [Next → S2 (ZIGi)] Hide ZIGi's suggested prompts until they pass?. ZIGi scored 37.5% (no AI key) and 14/20 in Nairobi's round. (L-004, L-051, B-002, N-066) *Claude:* Already planned for S2 (G2 + G6 regression set, 80% gate). (overlaps 20 Oct item G2)
- **HE17** [Later → Later] Photo food logging with a visible estimate range. Yazio/Lose It. (Tokyo) *Claude:* Fits a ZIGi session with your own key. **Owner note:** Make sure to incoorporate this into the zigi session
- **ZI1** [Next → S2 (ZIGi)] Questions turned into write previews. 'How much water did I drink?' → 'Will save: Water'; 'Explain my P&L' offers to save water. (L-004, N-075, N-010, T-066, BUG-057) *Claude:* Valid. (overlaps 20 Oct item G1) **Owner note:** All ZIGI answers go into ZIGI session, the rest goes into the Polish session
- **ZI2** [Next → S2 (ZIGi)] Natural questions fall back to the canned list. 'did I sleep enough?', 'am I on track for my €5k fund?', 'which habit am I worst at?' (empty card). (N-063, M-002, M-088, B-047, B-132, N-020, N-021, BUG-054) *Claude:* Valid. (overlaps 20 Oct item G2) **Owner note:** All ZIGI answers go into ZIGI session, the rest goes into the Polish session
- **ZI3** [Next → S2 (ZIGi)] ZIGi's numbers differ from the pages. ETH 4 vs 1.5; wrong net worth; 'worth in EUR' answered in USD; tied streaks. (N-066, B-002, N-181, B-080, B-118, B-133, N-064) *Claude:* Valid. (overlaps 20 Oct item G7) **Owner note:** All ZIGI answers go into ZIGI session, the rest goes into the Polish session
- **ZI4** [Next → S2 (ZIGi)] Connecting a ChatGPT subscription disables local answers for good. Even after reload ZIGi only writes prompts; 'Summarise my day' gives no in-app answer. (N-067, N-022) *Claude:* New and important: local answers must keep working with any connection. **Owner note:** All ZIGI answers go into ZIGI session, the rest goes into the Polish session
- **ZI5** [Next → S2 (ZIGi)] 'Include Health' switch hidden until a connection is chosen. Help points to a switch people can't find. (N-019, M-089) *Claude:* Valid.
- **ZI6** [Next → S2 (ZIGi)] ZIGi panel on narrow screens. Chat area ~130 px; Enter adds a newline on phones; focus lost on close; send looks active when disabled. (D-131, D-067, M-073, L-088, M-090, D-032) *Claude:* Valid.
- **ZI7** [Next → S2 (ZIGi)] 'Your Personal AI Companion' greets with 'with no AI'. Three 'not connected' messages. (D-160, D-256) *Claude:* Valid copy fix.
- **ZI8** [Next → S2 (ZIGi)] 'Which setup fits me?' quiz. Result names paid products as 'OUR SUGGESTION'; appears below the fold; no action button; the quiz hides 'Set up'. (D-092, D-242, M-019, M-020) *Claude:* Valid.
- **ZI9** [Next → S2 (ZIGi)] ZIGi switched off leaves dead 'Ask ZIGi' links. Button missing while its switch is ON; chevron hides ZIGi at once. (D-059, D-030, B-125, N-203, D-240) *Claude:* Valid.
- **ZI10** [Next → S2 (ZIGi)] Advice questions. Answers with a generic list; never says it can't advise. (D-061) *Claude:* Was G8 (Later). (overlaps 20 Oct item G8) **Owner note:** All ZIGI answers go into ZIGI session, the rest goes into the Polish session
- **ZI11** [Next → S2 (ZIGi)] '/log' advertised but needs AI; simple commands do nothing. 'Create a habit called Yoga', 'I spent 12 euro on lunch'. (T-104, T-067) *Claude:* Valid; fits J10.
- **ZI12** [Next → S2 (ZIGi)] Can't answer staking or price questions. (L-052) *Claude:* Valid; the Earn coach covers some with AI.
- **ZI13** [Next → S2 (ZIGi)] Privacy defaults and Help claims. Sharing starts on for Wealth and Goals; Help says ZIGi sees 'never a number'; no clear AI opt-out. (B-055, B-107, T-052) *Claude:* Make Help match the real defaults.
- **ZI14** [Next → S2 (ZIGi)] Streak length impossible for the check-in count. (M-044) *Claude:* Valid.
- **ZI15** [Next → S2 (ZIGi)] 20,000-character messages echoed in full. (L-003) *Claude:* Valid. (overlaps 20 Oct item G5)

## Picklist 1 (Alpha #44): ZIGi items (Next and the owner-promoted Later items G4, G6, G8, G9, G10, G13, G14, N3), J10, L6, AF5
- **G1** Read vs write mix-up; label replies 'Answer' or 'Proposed change' (BUG-057, #26)
- **G2** Suggested prompts that don't work; test-gated prompts + honest fallback (BUG-054, #23)
- **G3** Picks the wrong goal or calls an exact name ambiguous (PoC)
- **G5** 15k-character input; help text above preview (BUG-038/060)
- **G7** Answers from the same stores as the pages, with source badges (#24)
- **G11** 'Why did it change?' net-worth explainer (#29)
- **G12** 30-second trade-journal check-in (#30)
- **G15** Kind streak-break wording (#32)
- **G4** No follow-up context, typos, 'mark Read done' (BUG-055/056/058)
- **G6** ZIGi regression set: 40 checks on every build, 80% launch gate (#21) — *Owner:* After sunday reset when we do the big ZIGI test run with remaining API credits
- **G8** Money and health guardrail: facts only for buy/sell/stake; 'not medical advice' (#22)
- **G9** 'ZIGi · today' card: 3 rule-based lines + 'Why?' (#27)
- **G10** Screen-aware 'Ask ZIGi' chips (#31)
- **G13** Weekly cross-module recap (#11)
- **G14** ZIGi value metrics and events (#25)
- **J10** One input box for all four modules — *Owner:* Incoorporate this into the zigi session after reset we'll do
- **L6** Competitor AI assistants (new) — *Owner:* Next ZIGI update session after reset we will make sure our AI companion stays top nodge compared to competitors, this is something i don't mind using my 200 api credits for and later even seperate subs  / but as said we let people import their own ai models so we just develop our ai chatbot to do absolutely evrything our competitors ones can do , high priority that our chatbot stays the best in all niches and truly feels premium / we will do alot of testing with my api credits monthyl (200 dollars full) to accomplish this
- **N3** ZIGi claim 'answers questions… never changes anything without your OK'
- **AF5** ZIGi plan bundles are capped at 10 cards, not the planned 24 (H134: one reply's own cap). Recommend keeping 10. → Discuss

## Roadmap
- **RM1** ZIGi real-model round + end-of-month API eval (`ZIGI_REAL_MODEL_ROUND.md`):
  - 92 AF cases (EN/NL) plus AA-Cloud's 9 kinds and AB-Cloud's seeds;
  - Sonnet corpus from 96 to 97 % or more;
  - gemma4 and qwen3.8 on the PC up to target;
  - photo plates;
  - the Batch eval.
  - Together with the owner's **G6, J10, L6**.
  - Must spend the remaining ≈ $80 before the grant expires (31 Oct UTC); the next $200 arrives ~29 Oct. → S2
- **RM2** The ZIGi "Next polish" items **G1, G2, G3, G5, G7, G11, G12, G15** move into the ZIGi lane, so the two sessions never share files. → S2
- **RM3** ZIGi "Later" items the owner may promote into S2: **G4, G8, G9, G10, G13, G14, N3**. *(owner picks)*
- Owner, 28 Oct: RM3's items are all promoted into Session AI. No local models in this session (API credits only).
