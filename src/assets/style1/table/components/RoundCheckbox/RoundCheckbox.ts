import { componentBox } from '../../ComponentBox.js';
import { element } from '../../dom.js';
import config from './config.json';
import './round-checkbox.css';

export function roundSelectionIndicator(): HTMLSpanElement {
  const indicator = element('span', 'mx-round-selection');
  indicator.setAttribute('aria-hidden', 'true');
  return indicator;
}

export class RoundCheckbox {
  readonly root = componentBox(element('label', 'mx-round-checkbox'), config);
  readonly input = element('input', 'mx-round-checkbox-input mx-round-selection');

  constructor(label: string | (() => string), checked = false) {
    this.input.type = 'checkbox';
    this.input.checked = checked;
    this.root.append(this.input, element('span', '', label));
  }
}
