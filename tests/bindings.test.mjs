import test from 'node:test';
import assert from 'node:assert/strict';
import { BindingScope } from '../.test-build/binding/BindingScope.js';
import { bindEvent } from '../.test-build/binding/bindEvent.js';
import { SeatData } from '../.test-build/data/SeatData.js';
import { TableData } from '../.test-build/data/TableData.js';
function decorate(cls, name, tag, priority = 0) {
  bindEvent(SeatData.CHANGE, { dataSource: tag, initPriority: priority })(
    cls.prototype,
    name,
    Object.getOwnPropertyDescriptor(cls.prototype, name),
  );
}
test('decorator binding syncs initial state, rebinds once and destroys only its own listeners', () => {
  class Widget {
    calls = [];
    render(value) {
      this.calls.push(value);
    }
  }
  decorate(Widget, 'render', 'seat');
  const a = new SeatData(1),
    b = new SeatData(2),
    one = new Widget(),
    two = new Widget(),
    scope = new BindingScope(one),
    other = new BindingScope(two);
  scope.bind({ seat: a });
  other.bind({ seat: a });
  assert.equal(one.calls.length, 1);
  scope.bind({ seat: a });
  assert.equal(one.calls.length, 1);
  scope.bind({ seat: b });
  a.state = { ...a.state, handNum: 10 };
  assert.equal(one.calls.length, 2);
  assert.equal(two.calls.length, 2);
  b.state = { ...b.state, handNum: 11 };
  assert.equal(one.calls.length, 3);
  scope.destroy();
  b.state = { ...b.state, handNum: 12 };
  assert.equal(one.calls.length, 3);
  other.destroy();
});
test('binding priorities work across sources and subclass metadata does not leak to base', () => {
  class Base {
    calls = [];
    low() {
      this.calls.push('low');
    }
  }
  class Sub extends Base {
    high() {
      this.calls.push('high');
    }
  }
  decorate(Base, 'low', 'low', 0);
  decorate(Sub, 'high', 'high', 10);
  const base = new Base(),
    sub = new Sub();
  new BindingScope(base).bind({ low: new SeatData(1), high: new SeatData(2) });
  new BindingScope(sub).bind({ low: new SeatData(1), high: new SeatData(2) });
  assert.deepEqual(base.calls, ['low']);
  assert.deepEqual(sub.calls, ['high', 'low']);
});
test('authoritative model replacement empties absent seats/cards/pot and preserves stable seat objects', () => {
  const data = new TableData(),
    seat = data.seats.get(1),
    s = {
      roomID: 1,
      matchID: 0,
      handNum: 1,
      revision: 1,
      name: 'table',
      players: [{ seat: 1, name: 'A', chips: 10, cards: [14, 29], action: '' }],
      community: [2, 18, 36],
      pot: 30,
      mySeat: 1,
      seatCount: 9,
      actions: [],
      presentation: 'sync',
    };
  data.replace(s);
  assert.equal(seat.state.player.name, 'A');
  data.replace({ ...s, players: [], community: [], pot: 0, handNum: 2 });
  assert.equal(data.seats.get(1), seat);
  assert.equal(seat.state.player, undefined);
  assert.equal(data.pot.amount, 0);
  assert.deepEqual(data.publicCards.state.cards, []);
  data.destroy();
});
