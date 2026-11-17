import { componentBox } from '../../ComponentBox.js';
import config from './config.json';
import defaultSettings, { TexasGamePersonalSettings } from '../../../../../data/TexasGamePersonalSettings.js';
import { i18nLabel } from '../../../../../i18n/i18nLabel.js';
import { i18nMgr } from '../../../../../i18n/i18nMgr.js';
import { TableSound } from '../../../audio/TableSound.js';
import { element } from '../../dom.js';
export class SoundControlView {
  readonly root = componentBox(element('button', 'mx-sound-toggle', () => i18nMgr.Get("MX_EnableSound", [], "开启声音")),config);
  private off: () => void;
  constructor(private sound: TableSound, private settings: TexasGamePersonalSettings = defaultSettings) {
    this.root.type='button';
    const refresh=()=>{i18nLabel.bind(this.root,()=>this.settings.soundOn?i18nMgr.Get('UITexasPlayerInfoCloseAudio'):i18nMgr.Get('MX_EnableSound'));this.root.setAttribute('aria-pressed',String(this.settings.soundOn));void sound.setEnabled(this.settings.soundOn);};
    this.off=this.settings.on(TexasGamePersonalSettings.SOUND_ON_CHANGE,refresh);
    this.root.onclick=()=>this.settings.setSoundOnToStorage(!this.settings.soundOn);refresh();
  }
  destroy():void{this.off();this.root.onclick=null;this.root.remove();}
}
