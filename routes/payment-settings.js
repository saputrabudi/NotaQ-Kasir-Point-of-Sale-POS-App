const express = require('express');
const router = express.Router();
const database = require('../config/database');
const db = () => database.getDb();
const { isAuthenticated, isAdmin } = require('../middleware/auth');

function calculateCRC16(data) {
  let crc = 0xFFFF;
  const polynomial = 0x1021;
  for (let i = 0; i < data.length; i++) {
    crc ^= data.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      if (crc & 0x8000) crc = (crc << 1) ^ polynomial;
      else crc = crc << 1;
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

function validateQRIS(raw) {
  const normalized = normalizeQRISString(raw);
  if (!normalized || !normalized.startsWith('000201')) {
    return { ok: false, message: 'Format QRIS tidak valid', value: '' };
  }
  if (normalized.indexOf('5303360') === -1) {
    return { ok: false, message: 'QRIS harus menggunakan mata uang IDR (tag 53=360)', value: '' };
  }
  const idx63 = normalized.lastIndexOf('6304');
  if (idx63 === -1 || normalized.length < idx63 + 8) {
    return { ok: false, message: 'CRC QRIS tidak ditemukan', value: '' };
  }

  const withoutCRC = normalized.substring(0, idx63 + 4);
  const givenCRC = normalized.substring(idx63 + 4, idx63 + 8).toUpperCase();
  const calcCRC = calculateCRC16(withoutCRC);
  if (givenCRC !== calcCRC) {
    return { ok: false, message: 'CRC QRIS tidak valid', value: '' };
  }

  return { ok: true, message: 'OK', value: normalized };
}

// Payment Settings Page
router.get('/', isAuthenticated, isAdmin, (req, res) => {
  // Get QRIS settings
  const qrisSetting = db().prepare(`
    SELECT * FROM payment_settings WHERE payment_type = 'qris'
  `).get();

  res.render('settings/payment', {
    title: 'Pengaturan Pembayaran',
    qrisSetting
  });
});

// Save QRIS String
router.post('/qris', isAuthenticated, isAdmin, (req, res) => {
  const { qris_string } = req.body;

  if (!qris_string || !qris_string.trim()) {
    req.flash('error_msg', 'QRIS string tidak boleh kosong');
    return res.redirect('/payment-settings');
  }

  const validation = validateQRIS(qris_string);
  if (!validation.ok) {
    req.flash('error_msg', validation.message);
    return res.redirect('/payment-settings');
  }

  try {
    const existing = db().prepare(`
      SELECT id FROM payment_settings WHERE payment_type = 'qris'
    `).get();

    if (existing) {
      db().prepare(`
        UPDATE payment_settings 
        SET qris_string = ?, updated_at = CURRENT_TIMESTAMP 
        WHERE payment_type = 'qris'
      `).run(validation.value);
    } else {
      db().prepare(`
        INSERT INTO payment_settings (payment_type, qris_string) 
        VALUES ('qris', ?)
      `).run(validation.value);
    }

    req.flash('success_msg', 'QRIS berhasil disimpan');
    res.redirect('/payment-settings');
  } catch (error) {
    console.error('Error saving QRIS:', error);
    req.flash('error_msg', 'Gagal menyimpan QRIS');
    res.redirect('/payment-settings');
  }
});

// Toggle QRIS Active/Inactive
router.post('/qris/toggle', isAuthenticated, isAdmin, (req, res) => {
  try {
    const setting = db().prepare(`
      SELECT is_active FROM payment_settings WHERE payment_type = 'qris'
    `).get();

    if (setting) {
      const newStatus = setting.is_active ? 0 : 1;
      db().prepare(`
        UPDATE payment_settings 
        SET is_active = ?, updated_at = CURRENT_TIMESTAMP 
        WHERE payment_type = 'qris'
      `).run(newStatus);

      req.flash('success_msg', `QRIS ${newStatus ? 'diaktifkan' : 'dinonaktifkan'}`);
    }
  } catch (error) {
    console.error('Error toggling QRIS:', error);
    req.flash('error_msg', 'Gagal mengubah status QRIS');
  }

  res.redirect('/payment-settings');
});

// API: Get QRIS for payment
router.get('/api/qris', isAuthenticated, (req, res) => {
  try {
    const qrisSetting = db().prepare(`
      SELECT * FROM payment_settings WHERE payment_type = 'qris' AND is_active = 1
    `).get();

    if (!qrisSetting || !qrisSetting.qris_string) {
      return res.json({ success: false, message: 'QRIS belum dikonfigurasi' });
    }

    res.json({ 
      success: true, 
      qrisString: qrisSetting.qris_string 
    });
  } catch (error) {
    console.error('Error getting QRIS:', error);
    res.status(500).json({ success: false, message: 'Gagal mengambil QRIS' });
  }
});

module.exports = router;
