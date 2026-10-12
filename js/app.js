// ==========================================================================
// SMART GROCERY & BUDGET SAFETY TRACKER - APP CONTROLLER
// Menghubungkan UI Mobile, Kalkulator, dan Database
// ==========================================================================

document.addEventListener('DOMContentLoaded', () => {
  // --- Inisialisasi Ikon Lucide di Seluruh Slot ---
  renderAllIcons();

  // --- State Aplikasi ---
  const state = {
    currentTab: 'tabBelanja',
    selectedCategoryFilter: 'all',
    editingItemId: null
  };

  // --- Elemen DOM Utama ---
  const hudTotalSpent = document.getElementById('hudTotalSpent');
  const hudBudgetCap = document.getElementById('hudBudgetCap');
  const hudRemainingBudget = document.getElementById('hudRemainingBudget');
  const hudStatusBadge = document.getElementById('hudStatusBadge');
  const hudStatusText = document.getElementById('hudStatusText');
  const hudStatusIcon = document.getElementById('hudStatusIcon');
  const hudProgressFill = document.getElementById('hudProgressFill');
  const budgetSafetyHud = document.getElementById('budgetSafetyHud');
  const hudTriageContainer = document.getElementById('hudTriageContainer');

  const cartItemsList = document.getElementById('cartItemsList');
  const cartCheckoutBar = document.getElementById('cartCheckoutBar');
  const cartTotalSavingsText = document.getElementById('cartTotalSavingsText');
  const navCartBadge = document.getElementById('navCartBadge');

  const historyCardsList = document.getElementById('historyCardsList');
  const historyCountBadge = document.getElementById('historyCountBadge');

  // Modal Tambah/Edit Item Elements
  const modalAddItemBackdrop = document.getElementById('modalAddItemBackdrop');
  const formAddItem = document.getElementById('formAddItem');
  const modalTitleText = document.getElementById('modalTitleText');
  const editItemId = document.getElementById('editItemId');
  const inputItemName = document.getElementById('inputItemName');
  const quickAutosuggestList = document.getElementById('quickAutosuggestList');
  const selectItemCategory = document.getElementById('selectItemCategory');
  const selectItemPriority = document.getElementById('selectItemPriority');
  const unitChipsGrid = document.getElementById('unitChipsGrid');
  const inputItemUnit = document.getElementById('inputItemUnit');
  const inputItemUnitPrice = document.getElementById('inputItemUnitPrice');
  const modalComparisonPreview = document.getElementById('modalComparisonPreview');
  const modalCompDetailText = document.getElementById('modalCompDetailText');
  const modalCompBadgeContainer = document.getElementById('modalCompBadgeContainer');
  const inputItemQty = document.getElementById('inputItemQty');
  const modalSelectedUnitLabel = document.getElementById('modalSelectedUnitLabel');
  const modalQtyMinusBtn = document.getElementById('modalQtyMinusBtn');
  const modalQtyPlusBtn = document.getElementById('modalQtyPlusBtn');
  const inputItemDiscount = document.getElementById('inputItemDiscount');
  const modalDiscountBreakdown = document.getElementById('modalDiscountBreakdown');
  const inputItemNotes = document.getElementById('inputItemNotes');
  const modalCalculatedSubtotal = document.getElementById('modalCalculatedSubtotal');
  const submitBtnText = document.getElementById('submitBtnText');

  // Modal Triage Over-Budget
  const modalTriageBackdrop = document.getElementById('modalTriageBackdrop');
  const triageCandidatesList = document.getElementById('triageCandidatesList');
  const triageWarningDetail = document.getElementById('triageWarningDetail');

  // Modal Rincian Nota Riwayat
  const modalReceiptBackdrop = document.getElementById('modalReceiptBackdrop');
  const receiptModalTitle = document.getElementById('receiptModalTitle');
  const receiptModalContent = document.getElementById('receiptModalContent');

  // Tab Anggaran Elements
  const inputBudgetCapSetting = document.getElementById('inputBudgetCapSetting');
  const btnSaveBudgetCap = document.getElementById('btnSaveBudgetCap');
  const categoryBreakdownList = document.getElementById('categoryBreakdownList');
  const summaryPriceUpCount = document.getElementById('summaryPriceUpCount');
  const summaryPriceDownCount = document.getElementById('summaryPriceDownCount');
  const summaryPriceEqualCount = document.getElementById('summaryPriceEqualCount');

  // ==========================================================================
  // RENDER UTAMA & EVENT LISTENERS
  // ==========================================================================

  // Muat pertama kali
  refreshAppUI();

  // --- Navigasi Tab Bawah ---
  document.querySelectorAll('.nav-tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const targetTab = btn.getAttribute('data-tab');
      switchTab(targetTab);
    });
  });

  function switchTab(tabId) {
    state.currentTab = tabId;
    document.querySelectorAll('.nav-tab-btn').forEach(b => {
      b.classList.toggle('active', b.getAttribute('data-tab') === tabId);
    });
    document.querySelectorAll('.tab-view').forEach(view => {
      view.classList.toggle('active', view.id === tabId);
    });

    if (tabId === 'tabRiwayat') {
      renderHistoryView();
    } else if (tabId === 'tabAnggaran') {
      renderBudgetView();
    } else {
      renderCartView();
    }
  }

  // --- Filter Kategori Cepat di Tab Belanja ---
  document.querySelectorAll('.cat-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      document.querySelectorAll('.cat-chip').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      state.selectedCategoryFilter = chip.getAttribute('data-category');
      renderCartView();
    });
  });

  // --- FAB Buka Modal Tambah Item ---
  document.getElementById('btnOpenAddModal').addEventListener('click', () => {
    openAddEditModal();
  });

  document.getElementById('btnCloseAddModal').addEventListener('click', () => {
    closeAddEditModal();
  });

  modalAddItemBackdrop.addEventListener('click', (e) => {
    if (e.target === modalAddItemBackdrop) closeAddEditModal();
  });

  // --- Chip Satuan di Modal ---
  unitChipsGrid.querySelectorAll('.unit-chip-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      unitChipsGrid.querySelectorAll('.unit-chip-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const unit = btn.getAttribute('data-unit');
      inputItemUnit.value = unit;
      modalSelectedUnitLabel.textContent = unit;
    });
  });

  // --- Presets Diskon Cepat di Modal ---
  document.querySelectorAll('.disc-preset-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      inputItemDiscount.value = chip.getAttribute('data-disc');
      updateModalLiveCalculations();
    });
  });

  // --- Stepper Qty di Modal ---
  modalQtyMinusBtn.addEventListener('click', () => {
    let val = parseFloat(inputItemQty.value) || 1;
    if (val > 1) {
      inputItemQty.value = val - 1;
    } else if (val > 0.1) {
      inputItemQty.value = (val - 0.1).toFixed(1);
    }
    updateModalLiveCalculations();
  });

  modalQtyPlusBtn.addEventListener('click', () => {
    let val = parseFloat(inputItemQty.value) || 0;
    inputItemQty.value = val + 1;
    updateModalLiveCalculations();
  });

  // --- Input Realtime Event Listeners di Modal (F-02, F-03, F-04) ---
  inputItemUnitPrice.addEventListener('input', () => {
    updateModalPriceComparison();
    updateModalLiveCalculations();
  });

  inputItemQty.addEventListener('input', updateModalLiveCalculations);
  inputItemDiscount.addEventListener('input', updateModalLiveCalculations);

  inputItemName.addEventListener('input', () => {
    handleProductNameTyping(inputItemName.value);
    updateModalPriceComparison();
  });

  // --- Submit Form Tambah/Edit Item ---
  formAddItem.addEventListener('submit', (e) => {
    e.preventDefault();
    const name = inputItemName.value.trim();
    const price = parseFloat(inputItemUnitPrice.value);
    const qty = parseFloat(inputItemQty.value) || 1;

    if (!name) {
      showToast('Harap masukkan nama produk!', 'alert-triangle');
      return;
    }
    if (isNaN(price) || price < 0) {
      showToast('Harap masukkan harga satuan yang valid!', 'alert-triangle');
      return;
    }

    const itemData = {
      name,
      category: selectItemCategory.value,
      priority: selectItemPriority.value,
      unit: inputItemUnit.value,
      unitPrice: price,
      qty,
      discount: inputItemDiscount.value.trim(),
      notes: inputItemNotes.value.trim()
    };

    if (state.editingItemId) {
      db.updateCartItem(state.editingItemId, itemData);
      showToast(`Berhasil memperbarui "${name}"`, 'check');
    } else {
      db.addItemToCart(itemData);
      showToast(`"${name}" ditambahkan ke troli`, 'check');
    }

    closeAddEditModal();
    refreshAppUI();
  });

  // --- Selesai Belanja / Checkout Button (F-06) ---
  document.getElementById('btnFinishShopping').addEventListener('click', () => {
    const cart = db.getCart();
    if (cart.length === 0) {
      showToast('Keranjang troli masih kosong!', 'alert-triangle');
      return;
    }

    const confirmCheckout = confirm(
      `Selesaikan belanja bulanan ini?\n\nTotal belanja: ${Calculator.formatRupiah(calculateCurrentCartTotal().total)}\n` +
      `Data akan diarsipkan ke Riwayat dan menjadi patokan harga resmi untuk bulan berikutnya!`
    );

    if (confirmCheckout) {
      const now = new Date();
      const monthName = now.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
      const newTrip = db.finishShoppingSession(`Belanja Bulanan Kost - ${monthName}`);
      showToast('🎉 Belanja selesai! Tersimpan rapi di Riwayat.', 'check-circle');
      refreshAppUI();
      switchTab('tabRiwayat');
    }
  });

  // --- Modal Triage Rekomendasi Coret (Over-Budget Helper) ---
  document.getElementById('btnOpenTriage').addEventListener('click', openTriageModal);
  document.getElementById('btnCloseTriageModal').addEventListener('click', closeTriageModal);
  modalTriageBackdrop.addEventListener('click', (e) => {
    if (e.target === modalTriageBackdrop) closeTriageModal();
  });

  // --- Modal Rincian Nota Close ---
  document.getElementById('btnCloseReceiptModal').addEventListener('click', closeReceiptModal);
  modalReceiptBackdrop.addEventListener('click', (e) => {
    if (e.target === modalReceiptBackdrop) closeReceiptModal();
  });

  // --- Simpan Limit Anggaran di Tab Anggaran ---
  btnSaveBudgetCap.addEventListener('click', () => {
    const cap = parseFloat(inputBudgetCapSetting.value);
    if (!cap || cap <= 0) {
      showToast('Masukkan nominal limit yang valid!', 'alert-triangle');
      return;
    }
    db.setBudgetCap(cap);
    showToast(`Batas anggaran diperbarui ke ${Calculator.formatRupiah(cap)}`, 'check');
    refreshAppUI();
  });

  // --- Backup & Restore JSON ---
  document.getElementById('btnExportJSON').addEventListener('click', () => {
    const jsonStr = db.exportDatabaseJSON();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `TroliBijak_Backup_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Cadangan data berhasil diunduh!', 'download');
  });

  document.getElementById('fileImportJSON').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const success = db.importDatabaseJSON(event.target.result);
      if (success) {
        showToast('Data berhasil dipulihkan dari file JSON!', 'check');
        refreshAppUI();
      } else {
        showToast('Format file JSON tidak valid!', 'alert-triangle');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  });

  document.getElementById('btnResetDemoData').addEventListener('click', () => {
    if (confirm('Kembalikan semua data ke contoh bawaan demo rantau? Riwayat saat ini akan di-reset.')) {
      db.resetToDemoDefaults();
      showToast('Data demo berhasil dimuat ulang!', 'check');
      refreshAppUI();
    }
  });

  document.getElementById('btnQuickInfo').addEventListener('click', () => {
    alert(
      "🛒 TroliBijak - Smart Grocery & Budget Safety Tracker\n\n" +
      "Aplikasi PWA khusus mahasiswa/siswa rantau saat belanja supermarket:\n" +
      "• F-01: Pencatatan item lengkap (Satuan, Kategori, Harga)\n" +
      "• F-02: Kalkulasi Qty otomatis seketika\n" +
      "• F-03: Kalkulator Diskon Bertingkat (contoh 50%+20%)\n" +
      "• F-04: Komparator Harga Realtime vs Bulan Lalu (↑ Naik, ↓ Turun, = Stabil)\n" +
      "• F-05: Pengendali Anggaran (Safety Cap) dengan peringatan bahaya\n" +
      "• F-06: Database Riwayat Belanja resmi antar-bulan\n\n" +
      "Ramah jempol saat mendorong troli!"
    );
  });

  // ==========================================================================
  // LOGIKA RENDERING UI APLIKASI
  // ==========================================================================

  function refreshAppUI() {
    renderSafetyHud();
    if (state.currentTab === 'tabBelanja') renderCartView();
    else if (state.currentTab === 'tabRiwayat') renderHistoryView();
    else if (state.currentTab === 'tabAnggaran') renderBudgetView();
  }

  // --- F-05: RENDER STICKY SAFETY HUD ---
  function renderSafetyHud() {
    const cart = db.getCart();
    const budgetCap = db.getBudgetCap();
    let totalCart = 0;

    cart.forEach(item => {
      const calc = Calculator.calculateItemTotals(item);
      totalCart += calc.finalLineTotal;
    });

    const safety = Calculator.evaluateBudgetSafety(totalCart, budgetCap);

    hudTotalSpent.textContent = Calculator.formatRupiah(safety.total);
    hudBudgetCap.textContent = Calculator.formatRupiah(safety.budgetCap);
    hudRemainingBudget.textContent = safety.remaining >= 0 
      ? Calculator.formatRupiah(safety.remaining) 
      : `Minus ${Calculator.formatRupiah(Math.abs(safety.remaining))}`;

    hudRemainingBudget.style.color = safety.remaining < 0 ? '#f87171' : 'var(--text-main)';

    // Update Progress Bar
    const visualPercent = Math.min(100, safety.percent);
    hudProgressFill.style.width = `${visualPercent}%`;
    hudProgressFill.className = `hud-progress-fill fill-${safety.status}`;

    // Update Hud Card Class & Badge
    budgetSafetyHud.className = `budget-safety-hud ${safety.alertClass}`;
    hudStatusBadge.className = `hud-badge-status ${safety.status}`;
    hudStatusText.textContent = safety.statusText;

    // Toggle Tombol Triage Over Budget
    if (safety.isOverBudget || safety.status === 'warning') {
      hudTriageContainer.style.display = 'block';
    } else {
      hudTriageContainer.style.display = 'none';
    }

    // Update Badge Counter Keranjang Navigasi
    navCartBadge.textContent = cart.length;
    navCartBadge.style.display = cart.length > 0 ? 'flex' : 'none';

    // Getar (Haptic Feedback) jika over budget di perangkat mobile
    if (safety.isOverBudget && 'vibrate' in navigator) {
      try { navigator.vibrate([80, 50, 80]); } catch(e){}
    }
  }

  // --- RENDER TAB BELANJA (KERANJANG AKTIF) ---
  function renderCartView() {
    const cart = db.getCart();
    let filteredCart = cart;

    if (state.selectedCategoryFilter !== 'all') {
      filteredCart = cart.filter(item => item.category === state.selectedCategoryFilter);
    }

    cartItemsList.innerHTML = '';

    if (cart.length === 0) {
      cartItemsList.innerHTML = `
        <div class="empty-trolley-card">
          <div class="empty-icon-wrap">
            ${getLucideIcon('shopping-cart', '', 32)}
          </div>
          <h3 class="empty-title">Troli Masih Kosong</h3>
          <p class="empty-desc">Tekan tombol hijau (+) di pojok kanan bawah untuk mencatat barang yang kamu masukkan ke troli.</p>
        </div>
      `;
      cartCheckoutBar.style.display = 'none';
      return;
    }

    cartCheckoutBar.style.display = 'flex';

    let totalSavings = 0;
    cart.forEach(item => {
      const calc = Calculator.calculateItemTotals(item);
      totalSavings += calc.totalLineSavings;
    });
    cartTotalSavingsText.textContent = Calculator.formatRupiah(totalSavings);

    if (filteredCart.length === 0) {
      cartItemsList.innerHTML = `
        <div class="empty-trolley-card" style="padding: 24px;">
          <p class="empty-desc">Tidak ada barang dalam kategori "${state.selectedCategoryFilter}".</p>
        </div>
      `;
      return;
    }

    // Render Kartu Setiap Barang
    filteredCart.forEach(item => {
      const calc = Calculator.calculateItemTotals(item);
      const benchmark = db.getBenchmarkForProduct(item.name);
      const comp = Calculator.comparePrice(item.unitPrice, benchmark ? benchmark.lastPrice : null);

      const card = document.createElement('div');
      card.className = `grocery-item-card ${item.priority === 'opsional' ? 'is-optional' : 'is-wajib'}`;
      card.id = `card-${item.id}`;

      // Markup F-04: Komparator Harga Visual
      let compBadgeHtml = '';
      if (comp.status === 'up') {
        compBadgeHtml = `<span class="price-comparison-badge badge-price-up" title="${comp.tooltip}">
          ${getLucideIcon('trending-up', '', 13)} ${comp.label} vs Bulan Lalu
        </span>`;
      } else if (comp.status === 'down') {
        compBadgeHtml = `<span class="price-comparison-badge badge-price-down" title="${comp.tooltip}">
          ${getLucideIcon('trending-down', '', 13)} ${comp.label} vs Bulan Lalu (PROMO!)
        </span>`;
      } else if (comp.status === 'equal') {
        compBadgeHtml = `<span class="price-comparison-badge badge-price-equal" title="${comp.tooltip}">
          ${getLucideIcon('equal', '', 13)} ${comp.label} (Harga Sama)
        </span>`;
      } else {
        compBadgeHtml = `<span class="price-comparison-badge badge-new" title="${comp.tooltip}">
          ★ Produk Baru
        </span>`;
      }

      // Markup F-03: Badge Diskon Bertingkat
      let discountBadgeHtml = '';
      if (calc.discountInfo.hasDiscount) {
        discountBadgeHtml = `
          <div class="discount-chip-banner">
            ${getLucideIcon('tag', '', 13)}
            <span>${calc.discountInfo.breakdownText}</span>
          </div>
        `;
      }

      card.innerHTML = `
        <div class="item-card-header">
          <div class="item-title-col">
            <div class="item-name">${escapeHtml(item.name)}</div>
            <div class="item-meta-sub">
              <span class="item-category-tag">${escapeHtml(item.category)}</span>
              <span class="priority-tag ${item.priority}">${item.priority === 'wajib' ? 'Pokok' : 'Opsional'}</span>
              ${item.notes ? `<span style="font-size: 10px; color: var(--text-dim);">• ${escapeHtml(item.notes)}</span>` : ''}
            </div>
            ${compBadgeHtml}
            ${discountBadgeHtml}
          </div>
          <div style="display: flex; gap: 4px;">
            <button class="item-delete-btn btn-edit-item" data-id="${item.id}" title="Edit Item" aria-label="Edit Item">
              ${getLucideIcon('sliders', '', 16)}
            </button>
            <button class="item-delete-btn btn-delete-item" data-id="${item.id}" title="Hapus Item" aria-label="Hapus Item">
              ${getLucideIcon('trash-2', '', 16)}
            </button>
          </div>
        </div>

        <!-- F-02: Baris Kuantitas Stepper & Total Baris Otomatis -->
        <div class="item-card-bottom">
          <div class="qty-stepper-control">
            <button class="stepper-btn btn-step-minus" data-id="${item.id}">
              ${getLucideIcon('minus', '', 15)}
            </button>
            <span class="stepper-qty-val">${item.qty}</span>
            <span class="stepper-unit">${escapeHtml(item.unit)}</span>
            <button class="stepper-btn btn-step-plus" data-id="${item.id}">
              ${getLucideIcon('plus', '', 15)}
            </button>
          </div>

          <div class="item-pricing-col">
            <div class="item-unit-calc">
              ${calc.discountInfo.hasDiscount ? `<span style="text-decoration: line-through; color: var(--text-dim); margin-right: 4px;">${Calculator.formatRupiah(item.unitPrice)}</span>` : ''}
              <span>${Calculator.formatRupiah(calc.discountInfo.finalUnitPrice)}/${item.unit}</span>
            </div>
            <div class="item-line-total">${Calculator.formatRupiah(calc.finalLineTotal)}</div>
            ${calc.totalLineSavings > 0 ? `<div class="item-savings-note">Hemat ${Calculator.formatRupiah(calc.totalLineSavings)}</div>` : ''}
          </div>
        </div>
      `;

      // Event Listener Qty Stepper (+ dan -) (F-02 Realtime)
      const btnMinus = card.querySelector('.btn-step-minus');
      const btnPlus = card.querySelector('.btn-step-plus');
      const btnDelete = card.querySelector('.btn-delete-item');
      const btnEdit = card.querySelector('.btn-edit-item');

      btnMinus.addEventListener('click', (e) => {
        e.stopPropagation();
        handleItemQtyChange(item.id, -1);
      });

      btnPlus.addEventListener('click', (e) => {
        e.stopPropagation();
        handleItemQtyChange(item.id, 1);
      });

      btnDelete.addEventListener('click', (e) => {
        e.stopPropagation();
        if (confirm(`Keluarkan "${item.name}" dari troli?`)) {
          db.removeCartItem(item.id);
          showToast(`"${item.name}" dihapus dari troli`, 'trash-2');
          refreshAppUI();
        }
      });

      btnEdit.addEventListener('click', (e) => {
        e.stopPropagation();
        openAddEditModal(item);
      });

      cartItemsList.appendChild(card);
    });
  }

  // --- F-02: Perubahan Kuantitas Realtime ---
  function handleItemQtyChange(itemId, delta) {
    const cart = db.getCart();
    const item = cart.find(it => it.id === itemId);
    if (!item) return;

    let newQty = item.qty + delta;
    if (newQty <= 0) {
      if (confirm(`Jumlah 0, hapus "${item.name}" dari troli?`)) {
        db.removeCartItem(itemId);
        showToast(`"${item.name}" dihapus dari troli`, 'trash-2');
      }
    } else {
      db.updateCartItem(itemId, { qty: newQty });
    }
    refreshAppUI();
  }

  // --- RENDER TAB RIWAYAT (F-06: HISTORIS & DATABASE PEMBANDING) ---
  function renderHistoryView() {
    const history = db.getHistory();
    historyCountBadge.textContent = `${history.length} Sesi Belanja`;
    historyCardsList.innerHTML = '';

    if (history.length === 0) {
      historyCardsList.innerHTML = `
        <div class="empty-trolley-card">
          <div class="empty-icon-wrap">
            ${getLucideIcon('history', '', 32)}
          </div>
          <h3 class="empty-title">Belum Ada Riwayat</h3>
          <p class="empty-desc">Selesaikan sesi belanja di tab Belanja untuk menyimpannya ke database riwayat.</p>
        </div>
      `;
      return;
    }

    history.forEach(trip => {
      const tripDate = new Date(trip.date);
      const formattedDate = tripDate.toLocaleDateString('id-ID', {
        weekday: 'long',
        day: 'numeric',
        month: 'short',
        year: 'numeric'
      });

      const card = document.createElement('div');
      card.className = 'history-trip-card';
      card.innerHTML = `
        <div class="trip-card-header">
          <div>
            <h3 class="trip-title">${escapeHtml(trip.title)}</h3>
            <span class="trip-date">${formattedDate}</span>
          </div>
          <span style="font-size: 11px; background: rgba(56, 189, 248, 0.15); color: #38bdf8; padding: 2px 8px; border-radius: 6px; font-weight: 700;">
            ${trip.items ? trip.items.length : trip.itemCount} Item
          </span>
        </div>

        <div class="trip-stats-grid">
          <div class="trip-stat-item">
            <div class="stat-item-label">Total Belanja</div>
            <div class="stat-item-val" style="color: #38bdf8;">${Calculator.formatRupiah(trip.totalSpent)}</div>
          </div>
          <div class="trip-stat-item">
            <div class="stat-item-label">Batas Anggaran</div>
            <div class="stat-item-val">${Calculator.formatRupiah(trip.budgetCap)}</div>
          </div>
          <div class="trip-stat-item">
            <div class="stat-item-label">Total Hemat</div>
            <div class="stat-item-val" style="color: #34d399;">${Calculator.formatRupiah(trip.totalSavings || 0)}</div>
          </div>
        </div>

        <div class="trip-actions-row">
          <button class="btn-trip-detail btn-view-receipt" data-id="${trip.id}">
            ${getLucideIcon('receipt', '', 15)}
            <span>Lihat Rincian Nota</span>
          </button>
          <button class="btn-trip-detail btn-copy-to-cart" data-id="${trip.id}" style="color: #34d399;" title="Salin barang belanja ini ke troli aktif sekarang">
            ${getLucideIcon('shopping-cart', '', 15)}
            <span>Salin ke Troli</span>
          </button>
          <button class="btn-trip-delete" data-id="${trip.id}" title="Hapus Riwayat">
            ${getLucideIcon('trash-2', '', 15)}
          </button>
        </div>
      `;

      card.querySelector('.btn-view-receipt').addEventListener('click', () => {
        openReceiptModal(trip);
      });

      card.querySelector('.btn-copy-to-cart').addEventListener('click', () => {
        if (confirm(`Salin seluruh item dari "${trip.title}" ke dalam troli aktif sekarang?`)) {
          let count = 0;
          if (trip.items && trip.items.length > 0) {
            trip.items.forEach(it => {
              db.addItemToCart({
                name: it.name,
                category: it.category,
                unit: it.unit,
                qty: it.qty,
                unitPrice: it.unitPrice,
                discount: it.discount || '',
                priority: it.priority || 'wajib'
              });
              count++;
            });
            showToast(`${count} barang disalin ke troli!`, 'check');
            refreshAppUI();
            switchTab('tabBelanja');
          }
        }
      });

      card.querySelector('.btn-trip-delete').addEventListener('click', () => {
        if (confirm(`Hapus riwayat "${trip.title}"?`)) {
          db.deleteHistoryTrip(trip.id);
          showToast('Riwayat berhasil dihapus', 'trash-2');
          renderHistoryView();
        }
      });

      historyCardsList.appendChild(card);
    });
  }

  // --- RENDER TAB ANGGARAN & ANALISIS ---
  function renderBudgetView() {
    inputBudgetCapSetting.value = db.getBudgetCap();

    const cart = db.getCart();
    let totalSpent = 0;
    const catMap = {};

    cart.forEach(item => {
      const calc = Calculator.calculateItemTotals(item);
      totalSpent += calc.finalLineTotal;
      catMap[item.category] = (catMap[item.category] || 0) + calc.finalLineTotal;
    });

    // Render Distribusi Kategori
    categoryBreakdownList.innerHTML = '';
    const categories = Object.keys(catMap);
    if (categories.length === 0) {
      categoryBreakdownList.innerHTML = `
        <p style="font-size: 12px; color: var(--text-muted); text-align: center; padding: 10px 0;">
          Troli masih kosong. Tambahkan barang untuk melihat grafik pengeluaran.
        </p>
      `;
    } else {
      categories.sort((a, b) => catMap[b] - catMap[a]);
      categories.forEach(cat => {
        const amount = catMap[cat];
        const pct = totalSpent > 0 ? Math.round((amount / totalSpent) * 100) : 0;

        const row = document.createElement('div');
        row.className = 'cat-breakdown-row';
        row.innerHTML = `
          <div class="cat-breakdown-meta">
            <span>${cat}</span>
            <span><strong>${Calculator.formatRupiah(amount)}</strong> (${pct}%)</span>
          </div>
          <div class="cat-progress-track">
            <div class="cat-progress-bar" style="width: ${pct}%;"></div>
          </div>
        `;
        categoryBreakdownList.appendChild(row);
      });
    }

    // Hitung Komparasi Inflasi (Naik/Turun/Stabil)
    let upCount = 0;
    let downCount = 0;
    let equalCount = 0;

    cart.forEach(item => {
      const benchmark = db.getBenchmarkForProduct(item.name);
      if (benchmark && benchmark.lastPrice > 0) {
        const comp = Calculator.comparePrice(item.unitPrice, benchmark.lastPrice);
        if (comp.status === 'up') upCount++;
        else if (comp.status === 'down') downCount++;
        else if (comp.status === 'equal') equalCount++;
      }
    });

    summaryPriceUpCount.textContent = upCount;
    summaryPriceDownCount.textContent = downCount;
    summaryPriceEqualCount.textContent = equalCount;
  }

  // ==========================================================================
  // MODAL TAMBAH & EDIT ITEM LOGIKA
  // ==========================================================================

  function openAddEditModal(item = null) {
    formAddItem.reset();
    quickAutosuggestList.innerHTML = '';
    modalComparisonPreview.style.display = 'none';
    modalDiscountBreakdown.style.display = 'none';

    // Populate sugesti cepat dari benchmark
    populateAutosuggestChips();

    if (item) {
      state.editingItemId = item.id;
      modalTitleText.textContent = 'Edit Barang Belanja';
      submitBtnText.textContent = 'Simpan Perubahan';
      editItemId.value = item.id;
      inputItemName.value = item.name;
      selectItemCategory.value = item.category;
      selectItemPriority.value = item.priority || 'wajib';
      inputItemUnit.value = item.unit || 'pcs';
      inputItemUnitPrice.value = item.unitPrice;
      inputItemQty.value = item.qty;
      inputItemDiscount.value = item.discount || '';
      inputItemNotes.value = item.notes || '';

      // Set active unit chip
      unitChipsGrid.querySelectorAll('.unit-chip-btn').forEach(b => {
        b.classList.toggle('active', b.getAttribute('data-unit') === item.unit);
      });
      modalSelectedUnitLabel.textContent = item.unit;

      updateModalPriceComparison();
      updateModalLiveCalculations();
    } else {
      state.editingItemId = null;
      modalTitleText.textContent = 'Tambah Barang ke Troli';
      submitBtnText.textContent = 'Masukkan ke Keranjang';
      editItemId.value = '';
      inputItemQty.value = 1;
      inputItemUnit.value = 'pcs';
      modalSelectedUnitLabel.textContent = 'pcs';
      unitChipsGrid.querySelectorAll('.unit-chip-btn').forEach(b => {
        b.classList.toggle('active', b.getAttribute('data-unit') === 'pcs');
      });
      updateModalLiveCalculations();
    }

    modalAddItemBackdrop.classList.add('open');
    setTimeout(() => inputItemName.focus(), 150);
  }

  function closeAddEditModal() {
    modalAddItemBackdrop.classList.remove('open');
    state.editingItemId = null;
  }

  function populateAutosuggestChips() {
    const benchmarks = Object.values(db.getBenchmarkMap());
    quickAutosuggestList.innerHTML = '';
    // Tampilkan 6 produk teratas
    benchmarks.slice(0, 8).forEach(bm => {
      const chip = document.createElement('button');
      chip.type = 'button';
      chip.className = 'autosuggest-chip';
      chip.textContent = bm.name;
      chip.addEventListener('click', () => {
        applyBenchmarkSuggestion(bm);
      });
      quickAutosuggestList.appendChild(chip);
    });
  }

  function handleProductNameTyping(typed) {
    if (!typed || typed.length < 2) return;
    const bm = db.getBenchmarkForProduct(typed);
    if (bm && !state.editingItemId) {
      // Auto pilih kategori dan satuan jika belum diisi
      selectItemCategory.value = bm.category;
      if (bm.unit) {
        inputItemUnit.value = bm.unit;
        modalSelectedUnitLabel.textContent = bm.unit;
        unitChipsGrid.querySelectorAll('.unit-chip-btn').forEach(b => {
          b.classList.toggle('active', b.getAttribute('data-unit') === bm.unit);
        });
      }
    }
  }

  function applyBenchmarkSuggestion(bm) {
    inputItemName.value = bm.name;
    selectItemCategory.value = bm.category;
    inputItemUnit.value = bm.unit || 'pcs';
    modalSelectedUnitLabel.textContent = bm.unit || 'pcs';
    inputItemUnitPrice.value = bm.lastPrice;
    unitChipsGrid.querySelectorAll('.unit-chip-btn').forEach(b => {
      b.classList.toggle('active', b.getAttribute('data-unit') === (bm.unit || 'pcs'));
    });
    updateModalPriceComparison();
    updateModalLiveCalculations();
    inputItemUnitPrice.focus();
  }

  // --- F-04: Komparator Harga Realtime di Form Modal ---
  function updateModalPriceComparison() {
    const name = inputItemName.value.trim();
    const currPrice = parseFloat(inputItemUnitPrice.value);

    if (!name || isNaN(currPrice) || currPrice <= 0) {
      modalComparisonPreview.style.display = 'none';
      return;
    }

    const benchmark = db.getBenchmarkForProduct(name);
    const comp = Calculator.comparePrice(currPrice, benchmark ? benchmark.lastPrice : null);

    modalComparisonPreview.style.display = 'flex';

    if (benchmark && benchmark.lastPrice > 0) {
      modalCompDetailText.innerHTML = `Bulan lalu: <strong>${Calculator.formatRupiah(benchmark.lastPrice)}</strong>`;
    } else {
      modalCompDetailText.innerHTML = `Belum ada riwayat harga bulan lalu`;
    }

    if (comp.status === 'up') {
      modalCompBadgeContainer.innerHTML = `<span class="price-comparison-badge badge-price-up">${getLucideIcon('trending-up', '', 12)} ${comp.label}</span>`;
    } else if (comp.status === 'down') {
      modalCompBadgeContainer.innerHTML = `<span class="price-comparison-badge badge-price-down">${getLucideIcon('trending-down', '', 12)} ${comp.label}</span>`;
    } else if (comp.status === 'equal') {
      modalCompBadgeContainer.innerHTML = `<span class="price-comparison-badge badge-price-equal">${getLucideIcon('equal', '', 12)} ${comp.label}</span>`;
    } else {
      modalCompBadgeContainer.innerHTML = `<span class="price-comparison-badge badge-new">★ Produk Baru</span>`;
    }
  }

  // --- F-02 & F-03: Live Calculations di Modal ---
  function updateModalLiveCalculations() {
    const price = parseFloat(inputItemUnitPrice.value) || 0;
    const qty = parseFloat(inputItemQty.value) || 1;
    const discountStr = inputItemDiscount.value.trim();

    const discInfo = Calculator.calculateTieredDiscount(price, discountStr);
    const subtotal = Math.round(qty * discInfo.finalUnitPrice);

    modalCalculatedSubtotal.textContent = Calculator.formatRupiah(subtotal);

    if (discInfo.hasDiscount) {
      modalDiscountBreakdown.style.display = 'block';
      modalDiscountBreakdown.textContent = discInfo.breakdownText;
    } else {
      modalDiscountBreakdown.style.display = 'none';
    }
  }

  // ==========================================================================
  // MODAL TRIAGE OVER-BUDGET (F-05)
  // ==========================================================================

  function openTriageModal() {
    const cart = db.getCart();
    const budgetCap = db.getBudgetCap();
    let total = 0;
    cart.forEach(it => {
      total += Calculator.calculateItemTotals(it).finalLineTotal;
    });

    const over = total - budgetCap;
    if (over > 0) {
      triageWarningDetail.innerHTML = `Kamu sedang <strong>over budget sebesar ${Calculator.formatRupiah(over)}</strong>! Coret barang di bawah untuk kembali aman:`;
    } else {
      const remaining = budgetCap - total;
      triageWarningDetail.innerHTML = `Tersisa <strong>${Calculator.formatRupiah(remaining)}</strong>. Berikut barang opsional yang bisa dikurangi jika ingin lebih berhemat:`;
    }

    triageCandidatesList.innerHTML = '';
    // Cari barang opsional atau camilan terlebih dahulu
    const candidates = cart.filter(it => it.priority === 'opsional' || it.category === 'Camilan' || it.category === 'Minuman');

    if (candidates.length === 0) {
      triageCandidatesList.innerHTML = `
        <p style="font-size: 12px; color: var(--text-muted); text-align: center; padding: 16px;">
          Semua barang di troli berstatus "Wajib". Pertimbangkan untuk mengurangi kuantitas (Qty) beberapa barang pokok.
        </p>
      `;
    } else {
      candidates.forEach(it => {
        const calc = Calculator.calculateItemTotals(it);
        const itemRow = document.createElement('div');
        itemRow.className = 'triage-candidate-item';
        itemRow.innerHTML = `
          <div class="triage-info-col">
            <div class="triage-item-name">${escapeHtml(it.name)} (${it.qty} ${it.unit})</div>
            <div class="triage-item-saving">Hemat +${Calculator.formatRupiah(calc.finalLineTotal)}</div>
          </div>
          <button class="btn-triage-drop" data-id="${it.id}">
            Coret Barang
          </button>
        `;

        itemRow.querySelector('.btn-triage-drop').addEventListener('click', () => {
          db.removeCartItem(it.id);
          showToast(`"${it.name}" dicoret dari troli!`, 'check');
          openTriageModal(); // Re-render triage
          refreshAppUI();
        });

        triageCandidatesList.appendChild(itemRow);
      });
    }

    modalTriageBackdrop.classList.add('open');
  }

  function closeTriageModal() {
    modalTriageBackdrop.classList.remove('open');
  }

  // ==========================================================================
  // MODAL RINCIAN NOTA RIWAYAT
  // ==========================================================================

  function openReceiptModal(trip) {
    receiptModalTitle.textContent = trip.title;
    let itemsHtml = '';

    if (trip.items && trip.items.length > 0) {
      trip.items.forEach(it => {
        itemsHtml += `
          <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px dashed rgba(255,255,255,0.08);">
            <div>
              <div style="font-weight: 700; color: var(--text-main);">${escapeHtml(it.name)}</div>
              <div style="font-size: 11px; color: var(--text-muted);">${it.qty} ${it.unit} × ${Calculator.formatRupiah(it.unitPrice)} ${it.discount ? `(Disc: ${it.discount})` : ''}</div>
            </div>
            <div style="font-weight: 700; color: #38bdf8;">
              ${Calculator.formatRupiah(it.finalTotal)}
            </div>
          </div>
        `;
      });
    } else {
      itemsHtml = '<p style="color: var(--text-muted); padding: 12px 0;">Rincian barang tidak tersedia.</p>';
    }

    receiptModalContent.innerHTML = `
      <div style="background: rgba(0,0,0,0.25); border-radius: 12px; padding: 12px; margin-bottom: 12px;">
        <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
          <span style="color: var(--text-muted);">Tanggal:</span>
          <span>${new Date(trip.date).toLocaleDateString('id-ID', { dateStyle: 'full' })}</span>
        </div>
        <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
          <span style="color: var(--text-muted);">Total Belanja:</span>
          <strong style="color: #38bdf8; font-size: 15px;">${Calculator.formatRupiah(trip.totalSpent)}</strong>
        </div>
        <div style="display: flex; justify-content: space-between;">
          <span style="color: var(--text-muted);">Total Penghematan:</span>
          <strong style="color: #34d399;">${Calculator.formatRupiah(trip.totalSavings || 0)}</strong>
        </div>
      </div>
      <div style="max-height: 50vh; overflow-y: auto; padding-right: 4px;">
        ${itemsHtml}
      </div>
    `;

    modalReceiptBackdrop.classList.add('open');
  }

  function closeReceiptModal() {
    modalReceiptBackdrop.classList.remove('open');
  }

  // ==========================================================================
  // HELPER FUNCTIONS (TOAST, CLOCK, ICONS, CALCULATION)
  // ==========================================================================

  function calculateCurrentCartTotal() {
    const cart = db.getCart();
    let total = 0;
    cart.forEach(it => {
      total += Calculator.calculateItemTotals(it).finalLineTotal;
    });
    return { total, count: cart.length };
  }

  function showToast(message, iconName = 'check') {
    const toast = document.getElementById('appToast');
    const toastMessage = document.getElementById('toastMessageText');
    const toastIcon = document.getElementById('toastIconSlot');

    toastMessage.textContent = message;
    toastIcon.innerHTML = getLucideIcon(iconName, '', 16);
    toast.classList.add('show');

    clearTimeout(toast._timer);
    toast._timer = setTimeout(() => {
      toast.classList.remove('show');
    }, 2800);
  }

  function renderAllIcons() {
    const iconSlots = {
      'infoIconSlot': ['info', '', 18],
      'walletIconSlot': ['wallet', '', 14],
      'triageIconSlot': ['sparkles', '', 14],
      'finishCheckIconSlot': ['check-circle', '', 16],
      'fabPlusIconSlot': ['plus', '', 28],
      'navCartIconSlot': ['shopping-cart', '', 22],
      'navHistoryIconSlot': ['history', '', 22],
      'navBudgetIconSlot': ['wallet', '', 22],
      'modalCloseIconSlot': ['x', '', 18],
      'modalMinusIcon': ['minus', '', 16],
      'modalPlusIcon': ['plus', '', 16],
      'submitCheckIconSlot': ['check', '', 18],
      'triageCloseIconSlot': ['x', '', 18],
      'triageAlertIconSlot': ['alert-triangle', '', 20],
      'receiptCloseIconSlot': ['x', '', 18],
      'budgetCardIconSlot': ['shield-check', '', 18],
      'pieIconSlot': ['sliders', '', 18],
      'trendIconSlot': ['trending-up', '', 18],
      'backupIconSlot': ['download', '', 18],
      'exportIconSlot': ['download', '', 16],
      'importIconSlot': ['upload', '', 16]
    };

    for (const [id, [iconName, extraClass, size]] of Object.entries(iconSlots)) {
      const el = document.getElementById(id);
      if (el) el.innerHTML = getLucideIcon(iconName, extraClass, size);
    }
  }

  function escapeHtml(text) {
    if (!text) return '';
    return text
      .toString()
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
});
