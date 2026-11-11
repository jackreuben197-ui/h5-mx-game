import test from 'node:test';
import assert from 'node:assert/strict';
import { i18nMgr } from '../.test-build/i18n/i18nMgr.js';
import { i18nLabel } from '../.test-build/i18n/i18nLabel.js';
import { H5EntryController } from '../.test-build/host/H5EntryController.js';
import { FakeTransport } from './helpers/protocol-fixture.mjs';
import { handValueTypeToString } from '../.test-build/logic/HandValueType.js';

// Minimal text-node surface: catches accidental replacement of inputs/images during refresh.
function element() {
  return {
    children: [], attributes: {},
    ownerDocument: { createTextNode: nodeValue => ({ nodeValue, parentNode: null }) },
    replaceChildren(...children) {
      this.children.forEach(child => child.parentNode = null);
      this.children = children;
      children.forEach(child => child.parentNode = this);
    },
    setAttribute(key, value) { this.attributes[key] = value; },
  };
}
test('shared CC language aliases, labels and hand types change synchronously in four languages', async () => {
  await i18nMgr.initLanguage();
  const node = element();
  i18nLabel.bind(node, () => i18nMgr.Get('UICreate_AutoRechage'));
  const text = node.children[0];
  const checkbox = { checked: true, value: '360', parentNode: node };
  node.children.push(checkbox);
  const seen = new Set();
  for (const locale of ['zh_CN', 'zh-Hant', 'en_US', 'pt_BR']) {
    assert.equal(i18nMgr.setLanguage(locale), true);
    assert.equal(node.children[0], text);
    assert.equal(text.nodeValue, i18nMgr.Get('UICreate_AutoRechage'));
    assert.notEqual(handValueTypeToString(1), 'adaptation10062');
    seen.add(text.nodeValue);
    assert.equal(node.children[1], checkbox);
    assert.equal(checkbox.checked, true);
    assert.equal(checkbox.value, '360');
  }
  assert.ok(seen.size >= 3);
  assert.equal(i18nMgr.setLanguage('invalid'), false);
  i18nMgr.setLanguage('cn');
});
test('updating a bound value uses the newest amount after language changes', async () => {
  await i18nMgr.initLanguage();
  const node = element();
  i18nLabel.bind(node, () => `${i18nMgr.Get('UITexas_call')} 10`);
  i18nLabel.bind(node, () => `${i18nMgr.Get('UITexas_call')} 25`);
  i18nLabel.bind(node, () => i18nMgr.Get('UITexas_call'), 'aria-label');
  i18nMgr.setLanguage('en');
  assert.equal(node.children[0].nodeValue, `${i18nMgr.Get('UITexas_call')} 25`);
  assert.equal(node.attributes['aria-label'], i18nMgr.Get('UITexas_call'));
  assert.equal(i18nMgr.Get('missing', ['A', 2], '{0}/{1}/##'), 'A/2/A');
  i18nMgr.setLanguage('cn');
});
test('H5 syncLanguage refreshes existing labels without entering or leaving the room', async () => {
  await i18nMgr.initLanguage();
  const transport = new FakeTransport();
  const entry = new H5EntryController(transport, {
    enter() { assert.fail('language must not re-enter'); },
    leave() { assert.fail('language must not leave'); },
  });
  const node = element();
  i18nLabel.bind(node, () => i18nMgr.Get('UITexas_AddChips'));
  transport.emit('syncLanguage', { locale: 'en' });
  assert.equal(i18nMgr.language, 'en');
  assert.equal(node.children[0].nodeValue, i18nMgr.Get('UITexas_AddChips'));
  entry.destroy();
  i18nMgr.setLanguage('cn');
});
