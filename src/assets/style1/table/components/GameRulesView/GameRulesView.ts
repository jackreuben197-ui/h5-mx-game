import type { TableSnapshot } from '../../../../../core/types.js';
import { i18nMgr } from '../../../../../i18n/i18nMgr.js';
import { element } from '../../dom.js';
import { CardView } from '../CardView/CardView.js';
import { RecordDialogView } from '../RecordDialogView/RecordDialogView.js';

const ruleKeys = ['UITexasRule_Introduce', 'UIPlO4Rule_Introduce', 'UIPlO5Rule_Introduce', 'UIPlO6Rule_Introduce'];
const handExamples = [
  ['adaptation10053', [14, 13, 12, 11, 10]],
  ['adaptation10054', [28, 27, 26, 25, 24]],
  ['adaptation10055', [14, 29, 44, 59, 8]],
  ['adaptation10056', [28, 43, 58, 37, 52]],
  ['adaptation10057', [27, 25, 23, 21, 22]],
  ['adaptation10058', [26, 10, 24, 38, 52]],
  ['adaptation10059', [25, 40, 55, 36, 50]],
  ['adaptation10060', [24, 39, 22, 37, 51]],
  ['adaptation10061', [23, 38, 22, 39, 51]],
  ['adaptation10062', [22, 36, 24, 55, 58]],
] as const;

type RuleOptions = Pick<TableSnapshot, 'gameType' | 'pokerType'> & { criticalHit: boolean };

export class GameRulesView {
  private readonly dialog = new RecordDialogView(() => i18nMgr.Get('UITexas_RuleTips'), () => this.close());
  readonly root = this.dialog.root;
  private readonly rulesTab = element('button', '', () => i18nMgr.Get('UITexasRule_RlNZ1ysZ'));
  private readonly handsTab = element('button', '', () => i18nMgr.Get('UITexasRule_Ug7QXzjK'));
  private options?: RuleOptions;
  private hands?: HTMLElement;
  private showHands = false;

  constructor() {
    this.root.classList.add('mx-rules-overlay', 'mx-game-rules');
    this.dialog.footer.hidden = true;
    this.dialog.body.tabIndex = 0;
    const tabs = element('div', 'mx-game-rules-tabs');
    this.rulesTab.type = this.handsTab.type = 'button';
    this.rulesTab.onclick = () => this.select(false);
    this.handsTab.onclick = () => this.select(true);
    tabs.append(this.rulesTab, this.handsTab);
    this.dialog.header.append(tabs);
    i18nMgr.register(this);
  }

  open(options: RuleOptions): void {
    this.options = options;
    this.select(false);
    this.dialog.show(true);
    this.dialog.body.scrollTop = 0;
  }

  close(): void {
    this.dialog.show(false);
  }

  refreshLanguage(): void {
    if (!this.root.hidden && !this.showHands) this.renderRules();
  }

  private select(hands: boolean): void {
    this.showHands = hands;
    this.rulesTab.setAttribute('aria-pressed', String(!hands));
    this.handsTab.setAttribute('aria-pressed', String(hands));
    if (hands) this.dialog.body.replaceChildren(this.hands ??= this.makeHands());
    else this.renderRules();
    this.dialog.body.scrollTop = 0;
  }

  private renderRules(): void {
    const keys = [ruleKeys[this.options?.gameType ?? 0] ?? ruleKeys[0]!];
    if (this.options?.pokerType === 2) keys.push('UI6Plus_Introduce');
    if (this.options?.criticalHit) keys.push('UICriticalHit_GameRuleTips');
    const copy = element('div', 'mx-rules-copy');
    for (const key of keys) {
      const text = i18nMgr.Get(key, [], '').replace(/\\\s*n/g, '\n').replace(/<br\s*\/?>/gi, '\n');
      // The shared translations mark headings with Unity rich-text tags.
      const blocks = text.split(/<b>\s*<size=\d+>(.*?)<\/size>\s*<\/b>/gi);
      blocks.forEach((block, index) => {
        const plain = block.replace(/<[^>]*>/g, '').trim();
        if (plain) copy.append(element(index % 2 ? 'h3' : 'p', '', plain));
      });
    }
    if (!copy.childElementCount) copy.append(element('p', '', i18nMgr.Get('MsgContentUnRead')));
    this.dialog.body.replaceChildren(copy);
  }

  private makeHands(): HTMLElement {
    const list = element('ul', 'mx-game-rules-hands');
    for (const [key, values] of handExamples) {
      const row = element('li', 'mx-game-rules-hand');
      const cards = element('div', 'mx-game-rules-cards');
      cards.append(...values.map(value => new CardView(value).root));
      row.append(cards, element('span', '', () => i18nMgr.Get(key)));
      list.append(row);
    }
    return list;
  }

  destroy(): void {
    this.dialog.destroy();
  }
}
