// Check if user is authenticated
const isAuthenticated = (req, res, next) => {
  if (req.session.user) {
    return next();
  }
  req.flash('error_msg', 'Silakan login terlebih dahulu');
  res.redirect('/login');
};

// Check if user is NOT authenticated (for login page)
const isGuest = (req, res, next) => {
  if (!req.session.user) {
    return next();
  }
  res.redirect('/dashboard');
};

// Check if user is admin
const isAdmin = (req, res, next) => {
  if (req.session.user && req.session.user.role === 'admin') {
    return next();
  }
  req.flash('error_msg', 'Anda tidak memiliki akses ke halaman ini');
  res.redirect('/dashboard');
};

// Check if user is admin or kasir
const isAdminOrKasir = (req, res, next) => {
  if (req.session.user && (req.session.user.role === 'admin' || req.session.user.role === 'kasir')) {
    return next();
  }
  req.flash('error_msg', 'Anda tidak memiliki akses ke halaman ini');
  res.redirect('/dashboard');
};

module.exports = {
  isAuthenticated,
  isGuest,
  isAdmin,
  isAdminOrKasir
};
