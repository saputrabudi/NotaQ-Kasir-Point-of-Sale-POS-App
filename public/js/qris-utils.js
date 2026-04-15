// QRIS Utility Functions
// Based on EMVCo QRIS Standard

// CRC16-CCITT untuk QRIS (wajib sesuai EMVCo)
function calculateCRC16(data) {
  let crc = 0xFFFF;
  const polynomial = 0x1021;

  for (let i = 0; i < data.length; i++) {
    crc ^= data.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      if (crc & 0x8000) {
        crc = (crc << 1) ^ polynomial;
      } else {
        crc = crc << 1;
      }
      crc &= 0xFFFF;
    }
  }

  return crc.toString(16).toUpperCase().padStart(4, '0');
}

function normalizeQRISString(raw) {
  let s = String(raw || '')
    .replace(/[\u0000-\u001F\u007F]/g, '')
    .trim()
    .toUpperCase();

  if (!s) return '';

  const start = s.indexOf('000201');
  if (start > 0) s = s.substring(start);

  const idx63 = s.lastIndexOf('6304');
  if (idx63 !== -1 && s.length >= idx63 + 8) {
    s = s.substring(0, idx63 + 8);
  }

  return s;
}

function parseTLV(payload) {
  const items = [];
  let i = 0;

  while (i < payload.length) {
    if (i + 4 > payload.length) return null;
    const tag = payload.substring(i, i + 2);
    const lenRaw = payload.substring(i + 2, i + 4);
    const len = parseInt(lenRaw, 10);
    if (Number.isNaN(len) || len < 0) return null;

    const valueStart = i + 4;
    const valueEnd = valueStart + len;
    if (valueEnd > payload.length) return null;

    items.push({
      tag,
      value: payload.substring(valueStart, valueEnd)
    });
    i = valueEnd;
  }

  return items;
}

function buildTLV(items) {
  return items
    .map((item) => {
      const value = item.value || '';
      return `${item.tag}${value.length.toString().padStart(2, '0')}${value}`;
    })
    .join('');
}

function isValidQRIS(raw) {
  const normalized = normalizeQRISString(raw);
  if (!normalized || !normalized.startsWith('000201')) return false;

  const idx63 = normalized.lastIndexOf('6304');
  if (idx63 === -1 || normalized.length < idx63 + 8) return false;

  const withoutCRC = normalized.substring(0, idx63 + 4);
  const givenCRC = normalized.substring(idx63 + 4, idx63 + 8).toUpperCase();
  const calcCRC = calculateCRC16(withoutCRC);
  return givenCRC === calcCRC;
}

// Modifikasi QRIS: insert Tag 54 (Transaction Amount)
function modifyQRIS(baseString, nominal) {
  const n = parseInt(nominal, 10);
  if (!n || n <= 0) return null;

  const nominalStr = n.toString();
  const cleaned = normalizeQRISString(baseString);
  if (!cleaned) return null;

  let tlv = parseTLV(cleaned);
  if (!tlv || tlv.length === 0) return null;

  let hasCurrencyIDR = tlv.some((item) => item.tag === '53' && item.value === '360');
  if (!hasCurrencyIDR && cleaned.indexOf('5303360') !== -1) {
    hasCurrencyIDR = true;
  }
  if (!hasCurrencyIDR) return null;

  // Hapus amount lama dan CRC lama
  tlv = tlv.filter((item) => item.tag !== '54' && item.tag !== '63');

  // Wajib dynamic jika nominal terisi
  const poi = tlv.find((item) => item.tag === '01');
  if (poi) {
    poi.value = '12';
  } else {
    const idx00 = tlv.findIndex((item) => item.tag === '00');
    const poiItem = { tag: '01', value: '12' };
    if (idx00 >= 0) tlv.splice(idx00 + 1, 0, poiItem);
    else tlv.unshift(poiItem);
  }

  const tag54Item = { tag: '54', value: nominalStr };
  const idx53 = tlv.findIndex((item) => item.tag === '53');
  if (idx53 >= 0) tlv.splice(idx53 + 1, 0, tag54Item);
  else tlv.push(tag54Item);

  const withoutCRC = `${buildTLV(tlv)}6304`;
  const crc = calculateCRC16(withoutCRC);
  return `${withoutCRC}${crc}`;
}

// Generate QR Code Element
function generateQRISCode(containerId, qrisString, size = 256) {
  const container = document.getElementById(containerId);
  if (!container) return;
  
  container.innerHTML = ''; // Clear previous
  
  new QRCode(container, {
    text: qrisString,
    width: size,
    height: size,
    colorDark: '#000000',
    colorLight: '#ffffff',
    correctLevel: QRCode.CorrectLevel.M
  });
}

// Format Rupiah
function formatRupiah(amount) {
  return 'Rp ' + parseInt(amount).toLocaleString('id-ID');
}
