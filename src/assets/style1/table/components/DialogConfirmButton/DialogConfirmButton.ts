import { componentBox } from '../../ComponentBox.js';
import { element } from '../../dom.js';
import { SpriteAtlas } from '../../SpriteAtlas.js';
import config from './config.json';
import './dialog-confirm-button.css';

export function dialogConfirmButton(label: string | (() => string), onClick: () => void): HTMLButtonElement {
  const button = componentBox(element('button', 'mx-dialog-confirm-button', label), config);
  button.type = 'button';
  button.onclick = onClick;
  SpriteAtlas.paint(button, config.paths.background);
  return button;
}
