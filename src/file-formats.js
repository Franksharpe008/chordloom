export function pcmWave(buffer) {
  const count = buffer.numberOfChannels,
    length = buffer.length,
    data = new ArrayBuffer(44 + length * count * 2),
    view = new DataView(data);
  const text = (offset, s) => {
    for (let i = 0; i < s.length; i++)
      view.setUint8(offset + i, s.charCodeAt(i));
  };
  text(0, "RIFF");
  view.setUint32(4, data.byteLength - 8, true);
  text(8, "WAVE");
  text(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, count, true);
  view.setUint32(24, buffer.sampleRate, true);
  view.setUint32(28, buffer.sampleRate * count * 2, true);
  view.setUint16(32, count * 2, true);
  view.setUint16(34, 16, true);
  text(36, "data");
  view.setUint32(40, length * count * 2, true);
  const channels = Array.from({ length: count }, (_, i) =>
    buffer.getChannelData(i),
  );
  const fade = Math.max(1, Math.floor(buffer.sampleRate * 0.008));
  let offset = 44;
  for (let frame = 0; frame < length; frame++)
    for (let c = 0; c < count; c++) {
      const gain = Math.min(1, frame / fade, (length - 1 - frame) / fade);
      const v = Math.max(-1, Math.min(1, channels[c][frame] * gain));
      view.setInt16(offset, Math.round(v * (v < 0 ? 32768 : 32767)), true);
      offset += 2;
    }
  return new Uint8Array(data);
}
const CRC_TABLE = Uint32Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let i = 0; i < 8; i++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
function crc32(bytes) {
  let c = 0xffffffff;
  for (const b of bytes) c = CRC_TABLE[(c ^ b) & 255] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
export function zipFiles(files) {
  const parts = [],
    central = [];
  let offset = 0,
    centralLength = 0;
  for (const [filename, data] of Object.entries(files)) {
    const name = new TextEncoder().encode(filename),
      bytes = typeof data === "string" ? new TextEncoder().encode(data) : data,
      crc = crc32(bytes);
    const header = new Uint8Array(30 + name.length),
      h = new DataView(header.buffer);
    h.setUint32(0, 0x04034b50, true);
    h.setUint16(4, 20, true);
    h.setUint16(6, 0x800, true);
    h.setUint32(14, crc, true);
    h.setUint32(18, bytes.length, true);
    h.setUint32(22, bytes.length, true);
    h.setUint16(26, name.length, true);
    header.set(name, 30);
    const entry = new Uint8Array(46 + name.length),
      v = new DataView(entry.buffer);
    v.setUint32(0, 0x02014b50, true);
    v.setUint16(4, 20, true);
    v.setUint16(6, 20, true);
    v.setUint16(8, 0x800, true);
    v.setUint32(16, crc, true);
    v.setUint32(20, bytes.length, true);
    v.setUint32(24, bytes.length, true);
    v.setUint16(28, name.length, true);
    v.setUint32(42, offset, true);
    entry.set(name, 46);
    parts.push(header, bytes);
    central.push(entry);
    offset += header.length + bytes.length;
    centralLength += entry.length;
  }
  const end = new Uint8Array(22),
    e = new DataView(end.buffer);
  e.setUint32(0, 0x06054b50, true);
  e.setUint16(8, central.length, true);
  e.setUint16(10, central.length, true);
  e.setUint32(12, centralLength, true);
  e.setUint32(16, offset, true);
  return new Blob([...parts, ...central, end], { type: "application/zip" });
}
