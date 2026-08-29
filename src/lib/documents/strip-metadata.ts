/**
 * Best-effort removal of disposable metadata (EXIF / text chunks).
 * Does not claim forensic scrubbing of all PDF/DOCX metadata.
 */

export function stripDisposableMetadata(
  buf: Uint8Array,
  mime: string,
): Uint8Array {
  if (mime === "image/jpeg") return stripJpegExif(buf);
  if (mime === "image/png") return stripPngTextChunks(buf);
  // PDF / Office: leave bytes intact after malware heuristics; full scrub needs
  // external tools (qpdf, etc.) configured by ops.
  return buf;
}

function stripJpegExif(buf: Uint8Array): Uint8Array {
  if (buf.length < 4 || buf[0] !== 0xff || buf[1] !== 0xd8) return buf;
  const out: number[] = [0xff, 0xd8];
  let i = 2;
  while (i + 3 < buf.length) {
    if (buf[i] !== 0xff) {
      // Copy remainder
      for (; i < buf.length; i += 1) out.push(buf[i]!);
      break;
    }
    const marker = buf[i + 1]!;
    // SOS (start of scan) — copy rest
    if (marker === 0xda) {
      for (; i < buf.length; i += 1) out.push(buf[i]!);
      break;
    }
    // Skip standalone markers
    if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd9)) {
      out.push(0xff, marker);
      i += 2;
      continue;
    }
    const len = (buf[i + 2]! << 8) | buf[i + 3]!;
    const next = i + 2 + len;
    // APP1 (0xE1) often EXIF — drop; APP0 keep (JFIF)
    if (marker === 0xe1) {
      i = next;
      continue;
    }
    for (let j = i; j < next && j < buf.length; j += 1) out.push(buf[j]!);
    i = next;
  }
  return Uint8Array.from(out);
}

function stripPngTextChunks(buf: Uint8Array): Uint8Array {
  const SIG = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  for (let i = 0; i < 8; i += 1) if (buf[i] !== SIG[i]) return buf;

  const out: number[] = [...SIG];
  let i = 8;
  const drop = new Set(["tEXt", "zTXt", "iTXt", "eXIf"]);
  while (i + 8 <= buf.length) {
    const len = (buf[i]! << 24) | (buf[i + 1]! << 16) | (buf[i + 2]! << 8) | buf[i + 3]!;
    const type = String.fromCharCode(buf[i + 4]!, buf[i + 5]!, buf[i + 6]!, buf[i + 7]!);
    const chunkEnd = i + 12 + len; // len + type + data + crc
    if (chunkEnd > buf.length) break;
    if (!drop.has(type)) {
      for (let j = i; j < chunkEnd; j += 1) out.push(buf[j]!);
    }
    i = chunkEnd;
    if (type === "IEND") break;
  }
  return Uint8Array.from(out);
}
