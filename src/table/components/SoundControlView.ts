import settings, { TexasGamePersonalSettings } from '../../data/TexasGamePersonalSettings.js';
import { i18nLabel } from '../../i18n/i18nLabel.js';
import { i18nMgr } from '../../i18n/i18nMgr.js';
import { TableSound } from '../../audio/TableSound.js';
import { element } from '../dom.js';
export class SoundControlView {
  readonly root = element('button', 'mx-sound-toggle', () => i18nMgr.Get("MX_EnableSound", [], "开启声音"));
  private off: () => void;
  constructor(private sound: TableSound) {
    this.root.type='button';
    const refresh=()=>{i18nLabel.bind(this.root,()=>settings.soundOn?i18nMgr.Get('UITexasPlayerInfoCloseAudio'):i18nMgr.Get('MX_EnableSound'));this.root.setAttribute('aria-pressed',String(settings.soundOn));void sound.setEnabled(settings.soundOn);};
    this.off=settings.on(TexasGamePersonalSettings.SOUND_ON_CHANGE,refresh);
    this.root.onclick=()=>settings.setSoundOnToStorage(!settings.soundOn);refresh();
  }
  destroy():void{this.off();this.root.onclick=null;this.root.remove();}
}
