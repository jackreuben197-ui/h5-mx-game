export interface Packet {
  code: number;
  roomID: number;
  matchID: number;
  body: Uint8Array;
}
/** CC PacketHead: 57-byte outbound header, 53-byte H5-forwarded inbound header; BE. */
export class PacketCodec {
  encode(
    code: number,
    token: string,
    roomID: number,
    matchID: number,
    body: Uint8Array,
  ): Uint8Array {
    if (!token || token.length > 32 || !/^[\x20-\x7e]+$/.test(token))
      throw new Error('登录凭据无效，请重新登录');
    const result = new Uint8Array(57 + body.byteLength),
      view = new DataView(result.buffer);
    view.setUint32(0, result.length - 4);
    result.set([0x59, 0x4d], 4);
    view.setUint16(6, code);
    result.set(new TextEncoder().encode(token), 8);
    this.writeID(view, 40, roomID);
    this.writeID(view, 48, matchID);
    result[56] = 2;
    result.set(body, 57);
    return result;
  }
  decode(input: ArrayBuffer | ArrayBufferView): Packet {
    const bytes =
      input instanceof ArrayBuffer
        ? new Uint8Array(input)
        : new Uint8Array(input.buffer, input.byteOffset, input.byteLength);
    if (bytes.length < 53 || bytes[0] !== 0x59 || bytes[1] !== 0x4d || bytes[52] !== 2)
      throw new Error('房间协议包头无效');
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    return {
      code: view.getUint16(2),
      roomID: this.readID(view, 36),
      matchID: this.readID(view, 44),
      body: bytes.slice(53),
    };
  }
  private writeID(view: DataView, offset: number, value: number): void {
    if (!Number.isSafeInteger(value) || value < 0) throw new Error('房间标识超出安全整数范围');
    view.setBigUint64(offset, BigInt(value));
  }
  private readID(view: DataView, offset: number): number {
    const value = view.getBigUint64(offset);
    if (value > BigInt(Number.MAX_SAFE_INTEGER)) throw new Error('房间标识超出安全整数范围');
    return Number(value);
  }
}
