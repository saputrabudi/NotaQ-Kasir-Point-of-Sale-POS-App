// Sidebar Toggle
document.addEventListener('DOMContentLoaded', function() {
  const sidebarToggle = document.getElementById('sidebarToggle');
  const sidebar = document.getElementById('sidebar');
  const mainContent = document.querySelector('.main-content');
  
  if (sidebarToggle && sidebar) {
    // Create overlay for mobile
    let overlay = document.createElement('div');
    overlay.className = 'sidebar-overlay';
    document.body.appendChild(overlay);
    
    // Check if mobile
    function isMobile() {
      return window.innerWidth < 992;
    }
    
    // Load saved state from localStorage
    const sidebarHidden = localStorage.getItem('sidebarHidden') === 'true';
    if (sidebarHidden && !isMobile()) {
      sidebar.classList.add('hidden');
      document.body.classList.add('sidebar-hidden');
    }
    
    sidebarToggle.addEventListener('click', function() {
      if (isMobile()) {
        // Mobile: show/hide with overlay
        sidebar.classList.toggle('show');
        overlay.classList.toggle('show');
      } else {
        // Desktop: hide/show with margin
        sidebar.classList.toggle('hidden');
        document.body.classList.toggle('sidebar-hidden');
        
        // Save state
        localStorage.setItem('sidebarHidden', sidebar.classList.contains('hidden'));
      }
    });
    
    overlay.addEventListener('click', function() {
      sidebar.classList.remove('show');
      overlay.classList.remove('show');
    });
    
    // Handle resize
    window.addEventListener('resize', function() {
      if (!isMobile()) {
        sidebar.classList.remove('show');
        overlay.classList.remove('show');
      }
    });
  }
  
  // Active nav link
  const currentPath = window.location.pathname;
  document.querySelectorAll('.sidebar-nav .nav-link').forEach(link => {
    const href = link.getAttribute('href');
    if (href && currentPath.startsWith(href) && href !== '/') {
      link.classList.add('active');
    } else if (href === '/dashboard' && currentPath === '/dashboard') {
      link.classList.add('active');
    }
  });
  
  // Auto-hide alerts after 5 seconds
  document.querySelectorAll('.alert').forEach(alert => {
    setTimeout(() => {
      const bsAlert = bootstrap.Alert.getOrCreateInstance(alert);
      if (bsAlert) {
        bsAlert.close();
      }
    }, 5000);
  });
});

// Format currency
function formatCurrency(amount) {
  return 'Rp ' + amount.toLocaleString('id-ID');
}

// Format number input as currency
function formatInputCurrency(input) {
  let value = input.value.replace(/\D/g, '');
  input.value = value ? parseInt(value).toLocaleString('id-ID') : '';
}

// Confirm delete with SweetAlert
function confirmDeleteAction(url, title = 'Hapus data ini?', text = 'Data yang dihapus tidak dapat dikembalikan') {
  Swal.fire({
    title: title,
    text: text,
    icon: 'warning',
    showCancelButton: true,
    confirmButtonColor: '#dc3545',
    cancelButtonColor: '#6c757d',
    confirmButtonText: 'Ya, Hapus!',
    cancelButtonText: 'Batal'
  }).then((result) => {
    if (result.isConfirmed) {
      // Create form and submit
      const form = document.createElement('form');
      form.method = 'POST';
      form.action = url;
      
      const methodInput = document.createElement('input');
      methodInput.type = 'hidden';
      methodInput.name = '_method';
      methodInput.value = 'DELETE';
      form.appendChild(methodInput);
      
      document.body.appendChild(form);
      form.submit();
    }
  });
}

// Toast notification
function showToast(message, type = 'success') {
  const Toast = Swal.mixin({
    toast: true,
    position: 'top-end',
    showConfirmButton: false,
    timer: 3000,
    timerProgressBar: true,
    didOpen: (toast) => {
      toast.addEventListener('mouseenter', Swal.stopTimer);
      toast.addEventListener('mouseleave', Swal.resumeTimer);
    }
  });
  
  Toast.fire({
    icon: type,
    title: message
  });
}
