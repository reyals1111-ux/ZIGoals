"""PK-10: the help-page.tsx patch (run from apps/web). Anchored on ids and exact text, not line numbers; asserts each anchor."""
import re
import sys
P = sys.argv[1] if len(sys.argv) > 1 else 'components/help/help-page.tsx'
s = open(P).read()
def sub(old, new, count=1):
    global s
    assert s.count(old) == count, (old[:80], s.count(old))
    s = s.replace(old, new)
# 1. imports
sub("import {HelpQuestion} from './help-question';\n", "import {HelpQuestion} from './help-question';\n// Session AV lane 2 (PK-10): chain answers wait for the chain choice (lib/help/chain-help.ts).\nimport {ChainHelp, ChainText} from './chain-help';\nimport {CHAIN_TOPIC_PLAIN} from '../../lib/help/chain-help';\n")
# 2. Section takes a node for its eyebrow and title (ChainText)
sub("function Section({id, eyebrow, title, updated, children}: {id: string; eyebrow: string; title: string; updated: string; children: ReactNode}) {",
    "function Section({id, eyebrow, title, updated, children}: {id: string; eyebrow: ReactNode; title: ReactNode; updated: string; children: ReactNode}) {")
# 3. the topic index's plain label
sub("<HelpTopics topics={TOPICS}/>", "<HelpTopics topics={TOPICS} plain={CHAIN_TOPIC_PLAIN}/>")
# 4. headings that name the chain (and their dates: the heading's text changed)
sub('<Section id="more-pages" updated="Nov 5, 2026" eyebrow="MORE PAGES" title="Earn, Staking, Governance, Ecosystem and Chess">',
    '<Section id="more-pages" updated="Nov 22, 2026" eyebrow="MORE PAGES" title={<ChainText chosen="Earn, Staking, Governance, Ecosystem and Chess" plain="More pages and Chess"/>}>')
sub('<Section id="ae" updated="Nov 1, 2026 or earlier" eyebrow="TODAY&rsquo;S SCENE, THE SIDEBAR AND WALLETS" title=',
    '<Section id="ae" updated="Nov 22, 2026" eyebrow={<ChainText chosen="TODAY&rsquo;S SCENE, THE SIDEBAR AND WALLETS" plain="TODAY&rsquo;S SCENE AND THE SIDEBAR"/>} title=')
sub('<Section id="af" updated="Nov 5, 2026" eyebrow="EARN, STAKING AND THE CHECKLIST" title="Earn, stake in your own wallet, and your day as one path">',
    '<Section id="af" updated="Nov 22, 2026" eyebrow={<ChainText chosen="EARN, STAKING AND THE CHECKLIST" plain="ZIGI AND THE CHECKLIST"/>} title={<ChainText chosen="Earn, stake in your own wallet, and your day as one path" plain="ZIGi, and your day as one path"/>}>')
# 5. the plain question nothing links to
sub('<Question question="Are my Goals on the blockchain?"><p>Not yet. The on-chain Goal contract is not deployed, so Goals stay in this app.</p></Question>',
    '<ChainHelp><Question question="Are my Goals on the blockchain?"><p>Not yet. The on-chain Goal contract is not deployed, so Goals stay in this app.</p></Question></ChainHelp>')
# 6. every chain answer (lib/help/chain-help.ts CHAIN_HELP_IDS), each on its own line
IDS = 'av-move-alert al-more-pages al-wallets al-ledger al-ecosystem al-reward-goals w-portfolio ae-wallets ae-wallet-card af-earn af-staking af-governance af-practice-badges af-start-here af-academy af-earn-dock af-validator-alerts af-wallets af-add-money af-goal-vaults af-earn-coach aj-wealth aj-v6 ak-wallets ak-staking-clarity'.split()
lines = s.split('\n')
for i in IDS:
    hits = [k for k, l in enumerate(lines) if f'<HelpQuestion id="{i}"' in l]
    assert len(hits) == 1, i
    k = hits[0]; l = lines[k]
    indent = l[:len(l) - len(l.lstrip())]
    body = l.strip()
    assert body.startswith(f'<HelpQuestion id="{i}"') and body.endswith('</HelpQuestion>') and body.count('<HelpQuestion') == 1, i
    lines[k] = f'{indent}<ChainHelp id="{i}">{body}</ChainHelp>'
s = '\n'.join(lines)
open(P, 'w').write(s)
print('patched', len(IDS), 'answers')
