// POS JavaScript
document.addEventListener('DOMContentLoaded', function() {
  // Cart data
  let cart = [];
  
  // Elements
  const barcodeInput = document.getElementById('barcodeInput');
  const searchInput = document.getElementById('searchInput');
  const productGrid = document.getElementById('productGrid');
  const cartItems = document.getElementById('cartItems');
  const emptyCart = document.getElementById('emptyCart');
  const subtotalEl = document.getElementById('subtotal');
  const totalEl = document.getElementById('total');
  const payBtn = document.getElementById('payBtn');
  const clearBtn = document.getElementById('clearBtn');
  const categoryBtns = document.querySelectorAll('.category-btn');
  
  // Templates
  const productCardTemplate = document.getElementById('productCardTemplate');
  const cartItemTemplate = document.getElementById('cartItemTemplate');
  
  let selectedCategory = '';
  let searchTimeout;
  
  // Barcode scan handler
  barcodeInput.addEventListener('keypress', async function(e) {
    if (e.key === 'Enter') {
      e.preventDefault();
      const barcode = this.value.trim();
      if (barcode) {
        await addProductByBarcode(barcode);
        this.value = '';
      }
    }
  });
  
  // Search handler
  searchInput.addEventListener('input', function() {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
      searchProducts(this.value, selectedCategory);
    }, 300);
  });
  
  // Category filter
  categoryBtns.forEach(btn => {
    btn.addEventListener('click', function() {
      categoryBtns.forEach(b => b.classList.remove('active'));
      this.classList.add('active');
      selectedCategory = this.dataset.category;
      searchProducts(searchInput.value, selectedCategory);
    });
  });
  
  // Add product by barcode
  async function addProductByBarcode(barcode) {
    try {
      const response = await fetch(`/api/products/barcode/${barcode}`);
      const data = await response.json();
      
      if (data.success) {
        addToCart(data.data);
        showToast(`${data.data.name} ditambahkan`);
      } else {
        Swal.fire('Error', data.message || 'Produk tidak ditemukan', 'error');
      }
    } catch (error) {
      console.error('Error:', error);
      Swal.fire('Error', 'Gagal mencari produk', 'error');
    }
  }
  
  // Search products
  async function searchProducts(query, category) {
    if (!query && !category) {
      productGrid.innerHTML = `
        <div class="col-12 text-center text-muted py-5">
          <i class="bi bi-search fs-1"></i>
          <p class="mt-2">Cari produk atau scan barcode</p>
        </div>
      `;
      return;
    }
    
    try {
      const params = new URLSearchParams();
      if (query) params.append('q', query);
      if (category) params.append('category', category);
      
      const response = await fetch(`/api/products/search?${params}`);
      const data = await response.json();
      
      if (data.success && data.data.length > 0) {
        renderProducts(data.data);
      } else {
        productGrid.innerHTML = `
          <div class="col-12 text-center text-muted py-5">
            <i class="bi bi-inbox fs-1"></i>
            <p class="mt-2">Tidak ada produk ditemukan</p>
          </div>
        `;
      }
    } catch (error) {
      console.error('Error:', error);
    }
  }
  
  // Render products grid
  function renderProducts(products) {
    productGrid.innerHTML = '';
    
    products.forEach(product => {
      const clone = productCardTemplate.content.cloneNode(true);
      const card = clone.querySelector('.product-card');
      
      clone.querySelector('.product-name').textContent = product.name;
      clone.querySelector('.product-barcode').textContent = product.barcode || '';
      clone.querySelector('.product-price').textContent = formatCurrency(product.sell_price);
      
      const stockEl = clone.querySelector('.product-stock');
      if (product.stock <= product.min_stock) {
        stockEl.innerHTML = `<span class="badge bg-warning text-dark">Stok: ${product.stock}</span>`;
      } else {
        stockEl.innerHTML = `<span class="badge bg-success">Stok: ${product.stock}</span>`;
      }
      
      card.addEventListener('click', () => {
        addToCart(product);
        showToast(`${product.name} ditambahkan`);
      });
      
      productGrid.appendChild(clone);
    });
  }
  
  // Add to cart
  function addToCart(product) {
    const existingItem = cart.find(item => item.product_id === product.id);
    
    if (existingItem) {
      if (existingItem.qty >= product.stock) {
        Swal.fire('Peringatan', 'Stok tidak mencukupi', 'warning');
        return;
      }
      existingItem.qty++;
    } else {
      cart.push({
        product_id: product.id,
        name: product.name,
        price: product.sell_price,
        stock: product.stock,
        qty: 1
      });
    }
    
    renderCart();
    barcodeInput.focus();
  }
  
  // Render cart
  function renderCart() {
    if (cart.length === 0) {
      cartItems.innerHTML = '';
      cartItems.appendChild(emptyCart.cloneNode(true));
      payBtn.disabled = true;
    } else {
      cartItems.innerHTML = '';
      
      cart.forEach((item, index) => {
        const clone = cartItemTemplate.content.cloneNode(true);
        
        clone.querySelector('.item-name').textContent = item.name;
        clone.querySelector('.item-price').textContent = formatCurrency(item.price);
        clone.querySelector('.item-qty').textContent = item.qty;
        
        clone.querySelector('.qty-minus').addEventListener('click', () => {
          if (item.qty > 1) {
            item.qty--;
            renderCart();
          }
        });
        
        clone.querySelector('.qty-plus').addEventListener('click', () => {
          if (item.qty < item.stock) {
            item.qty++;
            renderCart();
          } else {
            Swal.fire('Peringatan', 'Stok tidak mencukupi', 'warning');
          }
        });
        
        clone.querySelector('.item-remove').addEventListener('click', () => {
          cart.splice(index, 1);
          renderCart();
        });
        
        cartItems.appendChild(clone);
      });
      
      payBtn.disabled = false;
    }
    
    updateTotals();
  }
  
  // Update totals
  function updateTotals() {
    const subtotal = cart.reduce((sum, item) => sum + (item.price * item.qty), 0);
    subtotalEl.textContent = formatCurrency(subtotal);
    totalEl.textContent = formatCurrency(subtotal);
  }
  
  // Clear cart
  clearBtn.addEventListener('click', function() {
    if (cart.length === 0) return;
    
    Swal.fire({
      title: 'Kosongkan Keranjang?',
      text: 'Semua item akan dihapus',
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#dc3545',
      cancelButtonColor: '#6c757d',
      confirmButtonText: 'Ya, Kosongkan',
      cancelButtonText: 'Batal'
    }).then((result) => {
      if (result.isConfirmed) {
        cart = [];
        renderCart();
      }
    });
  });
  
  // Pay button
  payBtn.addEventListener('click', async function() {
    const total = cart.reduce((sum, item) => sum + (item.price * item.qty), 0);
    
    // Step 1: Pilih metode pembayaran
    Swal.fire({
      title: 'Pilih Metode Pembayaran',
      html: `
        <div class="text-center mb-3">
          <strong class="fs-4">${formatCurrency(total)}</strong>
        </div>
        <div class="d-grid gap-2">
          <button type="button" class="btn btn-lg btn-success" id="cashPaymentBtn">
            <i class="bi bi-cash-stack me-2"></i>Tunai
          </button>
          <button type="button" class="btn btn-lg btn-primary" id="qrisPaymentBtn">
            <i class="fa-solid fa-qrcode me-2"></i>QRIS
          </button>
        </div>
      `,
      showConfirmButton: false,
      showCancelButton: true,
      cancelButtonText: 'Batal',
      didOpen: () => {
        document.getElementById('cashPaymentBtn').addEventListener('click', async () => {
          Swal.close();
          await processCashPayment(total);
        });
        
        document.getElementById('qrisPaymentBtn').addEventListener('click', async () => {
          Swal.close();
          await processQRISPayment(total);
        });
      }
    });
  });
  
  // Process Cash Payment
  async function processCashPayment(total) {
    const { value: payment } = await Swal.fire({
      title: 'Pembayaran Tunai',
      html: `
        <div class="text-start mb-3">
          <strong>Total: ${formatCurrency(total)}</strong>
        </div>
        <input type="number" id="paymentInput" class="swal2-input" placeholder="Jumlah Bayar" min="${total}" value="${total}">
        <div id="changeDisplay" class="mt-2 text-success"></div>
      `,
      focusConfirm: false,
      showCancelButton: true,
      confirmButtonText: 'Proses',
      cancelButtonText: 'Batal',
      didOpen: () => {
        const input = document.getElementById('paymentInput');
        const changeDisplay = document.getElementById('changeDisplay');
        
        input.addEventListener('input', () => {
          const pay = parseFloat(input.value) || 0;
          const change = pay - total;
          if (change >= 0) {
            changeDisplay.innerHTML = `<strong>Kembalian: ${formatCurrency(change)}</strong>`;
          } else {
            changeDisplay.innerHTML = `<span class="text-danger">Kurang: ${formatCurrency(Math.abs(change))}</span>`;
          }
        });
        
        input.dispatchEvent(new Event('input'));
        input.select();
      },
      preConfirm: () => {
        const payment = parseFloat(document.getElementById('paymentInput').value);
        if (!payment || payment < total) {
          Swal.showValidationMessage('Pembayaran kurang!');
          return false;
        }
        return payment;
      }
    });
    
    if (payment) {
      await processSale(payment, 'cash');
    }
  }
  
  // Process QRIS Payment
  async function processQRISPayment(total) {
    console.log('processQRISPayment called with total:', total);
    
    try {
      // Show loading
      Swal.fire({
        title: 'Memuat QRIS...',
        allowOutsideClick: false,
        didOpen: () => Swal.showLoading()
      });
      
      // Get QRIS base string from server
      console.log('Fetching QRIS from server...');
      const response = await fetch('/payment-settings/api/qris');
      const data = await response.json();
      
      console.log('QRIS response:', data);
      
      if (!data.success) {
        Swal.fire('Error', data.message || 'QRIS belum dikonfigurasi. Hubungi admin.', 'error');
        return;
      }
      
      // Check if modifyQRIS function exists
      if (typeof modifyQRIS === 'undefined') {
        console.error('modifyQRIS function not found!');
        Swal.fire('Error', 'QRIS Utils tidak ditemukan. Refresh halaman.', 'error');
        return;
      }
      
      console.log('Modifying QRIS with amount:', total);
      const qrisString = modifyQRIS(data.qrisString, total);
      
      console.log('Modified QRIS:', qrisString ? 'Success' : 'Failed');
      
      if (!qrisString) {
        Swal.fire('Error', 'QRIS tidak valid atau bukan format IDR', 'error');
        return;
      }
      
      // Show QR Code
      const result = await Swal.fire({
        title: 'Scan QRIS',
        html: `
          <div class="text-center mb-3">
            <strong class="fs-4">${formatCurrency(total)}</strong>
          </div>
          <div id="qrcode-display" class="d-flex justify-content-center my-3"></div>
          <div class="alert alert-info mb-0">
            <small><i class="fa-solid fa-mobile-screen me-1"></i>Scan QR Code dengan aplikasi pembayaran (GoPay, OVO, DANA, dll)</small>
          </div>
        `,
        width: 500,
        showCancelButton: true,
        showDenyButton: true,
        confirmButtonText: '<i class="fa-solid fa-check me-1"></i>Sudah Bayar',
        denyButtonText: '<i class="fa-solid fa-times me-1"></i>Belum Bayar',
        cancelButtonText: 'Batal',
        didOpen: () => {
          console.log('Generating QR Code...');
          // Check if generateQRISCode function exists
          if (typeof generateQRISCode !== 'undefined') {
            generateQRISCode('qrcode-display', qrisString, 256);
          } else if (typeof QRCode !== 'undefined') {
            // Fallback: use QRCode directly
            new QRCode(document.getElementById('qrcode-display'), {
              text: qrisString,
              width: 256,
              height: 256,
              colorDark: '#000000',
              colorLight: '#ffffff',
              correctLevel: QRCode.CorrectLevel.M
            });
          } else {
            console.error('QRCode library not found!');
          }
        }
      });
      
      if (result.isConfirmed) {
        // Customer confirmed payment
        await processSale(total, 'qris');
      } else if (result.isDenied) {
        // Customer hasn't paid - show info
        showToast('Pembayaran dibatalkan', 'info');
      }
    } catch (error) {
      console.error('Error processing QRIS:', error);
      Swal.fire('Error', 'Gagal memproses QRIS: ' + error.message, 'error');
    }
  }
  
  // Process sale
  async function processSale(payment, paymentMethod = 'cash') {
    try {
      Swal.fire({
        title: 'Memproses...',
        allowOutsideClick: false,
        didOpen: () => Swal.showLoading()
      });
      
      const response = await fetch('/sales', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          items: cart.map(item => ({
            product_id: item.product_id,
            qty: item.qty,
            price: item.price
          })),
          payment: payment,
          payment_method: paymentMethod
        })
      });
      
      const data = await response.json();
      
      if (data.success) {
        Swal.fire({
          title: 'Transaksi Berhasil!',
          html: `
            <div class="text-start">
              <p><strong>Invoice:</strong> ${data.data.sale.invoice_no}</p>
              <p><strong>Total:</strong> ${formatCurrency(data.data.sale.total)}</p>
              <p><strong>Bayar:</strong> ${formatCurrency(data.data.sale.payment)}</p>
              <p><strong>Kembali:</strong> ${formatCurrency(data.data.sale.change_amount)}</p>
            </div>
          `,
          icon: 'success',
          showCancelButton: true,
          confirmButtonText: 'Cetak Struk',
          cancelButtonText: 'Tutup'
        }).then((result) => {
          if (result.isConfirmed) {
            window.open(`/sales/${data.data.sale.id}`, '_blank');
          }
        });
        
        // Clear cart
        cart = [];
        renderCart();
        
      } else {
        Swal.fire('Error', data.message || 'Gagal memproses transaksi', 'error');
      }
    } catch (error) {
      console.error('Error:', error);
      Swal.fire('Error', 'Gagal memproses transaksi', 'error');
    }
  }
  
  // Format currency helper
  function formatCurrency(amount) {
    return 'Rp ' + amount.toLocaleString('id-ID');
  }
  
  // Toast helper
  function showToast(message, type = 'success') {
    const Toast = Swal.mixin({
      toast: true,
      position: 'top-end',
      showConfirmButton: false,
      timer: 2000,
      timerProgressBar: true
    });
    
    Toast.fire({
      icon: type,
      title: message
    });
  }
  
  // Initial load - search all products
  searchProducts('', '');
  
  // Focus barcode input
  barcodeInput.focus();
});
