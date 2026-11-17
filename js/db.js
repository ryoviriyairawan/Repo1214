// Database & LocalStorage Manager untuk Smart Grocery & Budget Safety Tracker
// Menangani F-01, F-04, dan F-06 (Penyimpanan, Riwayat Belanja, & Integrasi Realtime Firestore)

const STORAGE_KEYS = {
  CART: 'trolibijak_active_cart_v1',
  HISTORY: 'trolibijak_history_v1',
  BUDGET: 'trolibijak_budget_cap_v1',
  BENCHMARKS: 'trolibijak_price_benchmarks_v1',
  STORES: 'trolibijak_stores_v1',
  ACTIVE_STORE: 'trolibijak_active_store_v1'
};

// Data Daftar Toko Belanja Sekitar (Sesuai Permintaan: Indomaret Jl. Jabodetabek & Toko Pasar Lama)
const DEFAULT_STORES = [
  {
    id: 'store-1',
    name: 'Indomaret Jabodetabek',
    address: 'Jl. Jabodetabek No. 42 (Dekat Gerbang Utama Kampus)',
    distance: '350 m',
    hours: '24 Jam',
    type: 'Minimarket Rekomendasi',
    note: 'Sedia sembako, minuman dingin & kebutuhan harian'
  },
  {
    id: 'store-2',
    name: 'Toko Sembako Pasar Lama',
    address: 'Jl. Pasar Lama Raya No. 18 (Depan Toko Beras Berkah)',
    distance: '800 m',
    hours: '06:00 - 17:00',
    type: 'Pasar Tradisional Murah',
    note: 'Harga beras, telur & bumbu dapur grosir murah'
  },
  {
    id: 'store-3',
    name: 'Alfamart Surya Kencana',
    address: 'Jl. Jabodetabek Blok B No. 7',
    distance: '500 m',
    hours: '07:00 - 23:00',
    type: 'Minimarket Promo Mingguan',
    note: 'Promo mingguan sabun mandi, deterjen & camilan'
  },
  {
    id: 'store-4',
    name: 'Superindo Swalayan Margonda',
    address: 'Jl. Margonda Raya No. 120 (Depan Stasiun)',
    distance: '1.2 km',
    hours: '08:00 - 22:00',
    type: 'Supermarket Lengkap & Segar',
    note: 'Lengkap untuk belanja bulanan & bahan segar'
  }
];

// Data Patokan Realistis & Katalog Belanja Cepat per Kategori
const INITIAL_BENCHMARK_CATALOG = [
  // --- MAKANAN POKOK ---
  { name: 'Beras Premium 5kg', category: 'Makanan Pokok', unit: 'pack', lastPrice: 72000, date: '2026-09-15' },
  { name: 'Telur Ayam Negeri 1kg', category: 'Makanan Pokok', unit: 'kg', lastPrice: 28000, date: '2026-09-15' },
  { name: 'Indomie Goreng (Pack)', category: 'Makanan Pokok', unit: 'pcs', lastPrice: 3100, date: '2026-09-15' },
  { name: 'Indomie Ayam Bawang', category: 'Makanan Pokok', unit: 'pcs', lastPrice: 3100, date: '2026-09-15' },
  { name: 'Tempe & Tahu Segar', category: 'Makanan Pokok', unit: 'pack', lastPrice: 8000, date: '2026-09-15' },
  { name: 'Roti Tawar Gandum', category: 'Makanan Pokok', unit: 'pack', lastPrice: 16000, date: '2026-09-15' },
  { name: 'Kornet Sapi Pronas 198g', category: 'Makanan Pokok', unit: 'kaleng', lastPrice: 24500, date: '2026-09-15' },
  { name: 'Sarden ABC Saus Tomat 155g', category: 'Makanan Pokok', unit: 'kaleng', lastPrice: 11000, date: '2026-09-15' },

  // --- PERLENGKAPAN MANDI & KEBERSIHAN ---
  { name: 'Sabun Mandi Dettol Refill 410ml', category: 'Kebersihan & Mandi', unit: 'pouch', lastPrice: 22000, date: '2026-09-15' },
  { name: 'Sabun Mandi Lifebuoy Bar', category: 'Kebersihan & Mandi', unit: 'pcs', lastPrice: 4500, date: '2026-09-15' },
  { name: 'Shampoo Sunsilk 160ml', category: 'Kebersihan & Mandi', unit: 'botol', lastPrice: 21000, date: '2026-09-15' },
  { name: 'Pasta Gigi Pepsodent 190g', category: 'Kebersihan & Mandi', unit: 'pcs', lastPrice: 14000, date: '2026-09-15' },
  { name: 'Sikat Gigi Formula 3s', category: 'Kebersihan & Mandi', unit: 'pack', lastPrice: 12000, date: '2026-09-15' },
  { name: 'Deterjen Rinso Molto 770g', category: 'Kebersihan & Mandi', unit: 'pack', lastPrice: 19500, date: '2026-09-15' },
  { name: 'Sabun Cuci Piring Sunlight 700ml', category: 'Kebersihan & Mandi', unit: 'pouch', lastPrice: 13500, date: '2026-09-15' },
  { name: 'Pewangi Pakaian Downy 650ml', category: 'Kebersihan & Mandi', unit: 'pouch', lastPrice: 18000, date: '2026-09-15' },
  { name: 'Pembersih Lantai Wipol 750ml', category: 'Kebersihan & Mandi', unit: 'pouch', lastPrice: 16000, date: '2026-09-15' },
  { name: 'Tisu Wajah Paseo 250s', category: 'Kebersihan & Mandi', unit: 'pack', lastPrice: 14500, date: '2026-09-15' },

  // --- BUMBU & MINYAK ---
  { name: 'Minyak Goreng Sania 2L', category: 'Bumbu & Minyak', unit: 'liter', lastPrice: 33500, date: '2026-09-15' },
  { name: 'Bawang Merah Brebes 250g', category: 'Bumbu & Minyak', unit: 'pack', lastPrice: 11000, date: '2026-09-15' },
  { name: 'Bawang Putih 250g', category: 'Bumbu & Minyak', unit: 'pack', lastPrice: 10500, date: '2026-09-15' },
  { name: 'Kecap Manis Bango 520ml', category: 'Bumbu & Minyak', unit: 'pouch', lastPrice: 24000, date: '2026-09-15' },
  { name: 'Saus Sambal ABC 275ml', category: 'Bumbu & Minyak', unit: 'botol', lastPrice: 12500, date: '2026-09-15' },
  { name: 'Garam Dapur Beriodium 250g', category: 'Bumbu & Minyak', unit: 'pack', lastPrice: 4000, date: '2026-09-15' },
  { name: 'Royco Kaldu Ayam 230g', category: 'Bumbu & Minyak', unit: 'pack', lastPrice: 10500, date: '2026-09-15' },

  // --- MINUMAN ---
  { name: 'Susu UHT Full Cream 1L', category: 'Minuman', unit: 'liter', lastPrice: 18500, date: '2026-09-15' },
  { name: 'Kopi Instan Sachet 10s', category: 'Minuman', unit: 'pack', lastPrice: 15000, date: '2026-09-15' },
  { name: 'Teh Celup Sariwangi 25s', category: 'Minuman', unit: 'pack', lastPrice: 7500, date: '2026-09-15' },
  { name: 'Air Mineral Aqua 1500ml', category: 'Minuman', unit: 'botol', lastPrice: 6000, date: '2026-09-15' },
  { name: 'Teh Botol Sosro 450ml', category: 'Minuman', unit: 'botol', lastPrice: 5500, date: '2026-09-15' },

  // --- CAMILAN ---
  { name: 'Chitato Sapi Panggang 68g', category: 'Camilan', unit: 'bungkus', lastPrice: 11500, date: '2026-09-15' },
  { name: 'Biskuit Roma Kelapa 300g', category: 'Camilan', unit: 'pack', lastPrice: 10000, date: '2026-09-15' },
  { name: 'Oreo Vanilla Roll 123g', category: 'Camilan', unit: 'bungkus', lastPrice: 9500, date: '2026-09-15' },
  { name: 'Kacang Kulit Garuda 200g', category: 'Camilan', unit: 'pack', lastPrice: 14000, date: '2026-09-15' }
];

// Troli Awal Demo (Menampilkan variasi harga naik, turun, stabil & diskon bertingkat)
const INITIAL_DEMO_CART = [
  {
    id: 'item-101',
    name: 'Beras Premium 5kg',
    category: 'Makanan Pokok',
    unit: 'pack',
    qty: 1,
    unitPrice: 75000,
    discount: '',
    priority: 'wajib',
    notes: 'Kebutuhan pokok 1 bulan'
  },
  {
    id: 'item-102',
    name: 'Minyak Goreng Sania 2L',
    category: 'Bumbu & Minyak',
    unit: 'liter',
    qty: 1,
    unitPrice: 31900,
    discount: '5%',
    priority: 'wajib',
    notes: 'Promo weekend supermarket'
  },
  {
    id: 'item-103',
    name: 'Telur Ayam Negeri 1kg',
    category: 'Makanan Pokok',
    unit: 'kg',
    qty: 1,
    unitPrice: 28000,
    discount: '',
    priority: 'wajib',
    notes: 'Stok protein kost'
  },
  {
    id: 'item-104',
    name: 'Sabun Mandi Dettol Refill 410ml',
    category: 'Kebersihan & Mandi',
    unit: 'pouch',
    qty: 2,
    unitPrice: 25000,
    discount: '50% + 20%',
    priority: 'opsional',
    notes: 'Promo buy 2 extra member card'
  },
  {
    id: 'item-105',
    name: 'Chitato Sapi Panggang 68g',
    category: 'Camilan',
    unit: 'bungkus',
    qty: 3,
    unitPrice: 12000,
    discount: '',
    priority: 'opsional',
    notes: 'Camilan begadang nugas'
  }
];

// Riwayat Demo Bulan Lalu (September 2026)
const INITIAL_DEMO_HISTORY = [
  {
    id: 'trip-sept-2026',
    title: 'Belanja Bulanan Kost - September 2026',
    date: '2026-09-15T14:30:00.000Z',
    budgetCap: 450000,
    totalSpent: 428000,
    itemCount: 14,
    totalSavings: 42500,
    items: [
      { name: 'Beras Premium 5kg', qty: 1, unit: 'pack', unitPrice: 72000, finalTotal: 72000, category: 'Makanan Pokok' },
      { name: 'Minyak Goreng Sania 2L', qty: 1, unit: 'liter', unitPrice: 33500, finalTotal: 33500, category: 'Bumbu & Minyak' },
      { name: 'Telur Ayam Negeri 1kg', qty: 1, unit: 'kg', unitPrice: 28000, finalTotal: 28000, category: 'Makanan Pokok' },
      { name: 'Indomie Goreng (Pack)', qty: 15, unit: 'pcs', unitPrice: 3100, finalTotal: 46500, category: 'Makanan Pokok' },
      { name: 'Susu UHT Full Cream 1L', qty: 2, unit: 'liter', unitPrice: 18500, finalTotal: 37000, category: 'Minuman' },
      { name: 'Deterjen Rinso Molto 770g', qty: 1, unit: 'pack', unitPrice: 19500, finalTotal: 19500, category: 'Kebersihan & Mandi' },
      { name: 'Sabun Cuci Piring Sunlight 700ml', qty: 1, unit: 'pouch', unitPrice: 13500, finalTotal: 13500, category: 'Kebersihan & Mandi' },
      { name: 'Sabun Mandi Dettol Refill 410ml', qty: 1, unit: 'pouch', unitPrice: 22000, finalTotal: 22000, category: 'Kebersihan & Mandi' },
      { name: 'Pasta Gigi Pepsodent 190g', qty: 1, unit: 'pcs', unitPrice: 14000, finalTotal: 14000, category: 'Kebersihan & Mandi' },
      { name: 'Bawang Merah Brebes 250g', qty: 1, unit: 'pack', unitPrice: 11000, finalTotal: 11000, category: 'Bumbu & Minyak' },
      { name: 'Bawang Putih 250g', qty: 1, unit: 'pack', unitPrice: 10500, finalTotal: 10500, category: 'Bumbu & Minyak' },
      { name: 'Kopi Instan Sachet 10s', qty: 2, unit: 'pack', unitPrice: 15000, finalTotal: 30000, category: 'Minuman' },
      { name: 'Kecap Manis Bango 520ml', qty: 1, unit: 'pouch', unitPrice: 24000, finalTotal: 24000, category: 'Bumbu & Minyak' },
      { name: 'Chitato Sapi Panggang 68g', qty: 2, unit: 'bungkus', unitPrice: 11500, finalTotal: 23000, category: 'Camilan' }
    ]
  }
];

class DBManager {
  constructor() {
    this.isSyncingFromRemote = false;
    this.initData();
  }

  initData() {
    // 1. Budget Cap
    if (!localStorage.getItem(STORAGE_KEYS.BUDGET)) {
      localStorage.setItem(STORAGE_KEYS.BUDGET, '350000');
    }

    // 2. Benchmarks Catalog
    if (!localStorage.getItem(STORAGE_KEYS.BENCHMARKS)) {
      const benchmarkMap = {};
      INITIAL_BENCHMARK_CATALOG.forEach(item => {
        benchmarkMap[item.name.toLowerCase().trim()] = item;
      });
      localStorage.setItem(STORAGE_KEYS.BENCHMARKS, JSON.stringify(benchmarkMap));
    }

    // 3. Troli Aktif
    if (!localStorage.getItem(STORAGE_KEYS.CART)) {
      localStorage.setItem(STORAGE_KEYS.CART, JSON.stringify(INITIAL_DEMO_CART));
    }

    // 4. Riwayat Belanja
    if (!localStorage.getItem(STORAGE_KEYS.HISTORY)) {
      localStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify(INITIAL_DEMO_HISTORY));
    }
  }

  // --- Realtime onSnapshot Ingestion (Dari Cloud ke Lokal) ---

  applyCartFromSnapshot(items) {
    if (!Array.isArray(items)) return;
    this.isSyncingFromRemote = true;
    localStorage.setItem(STORAGE_KEYS.CART, JSON.stringify(items));
    this.isSyncingFromRemote = false;
  }

  applyBudgetFromSnapshot(budgetCap) {
    if (budgetCap === undefined || budgetCap === null) return;
    this.isSyncingFromRemote = true;
    localStorage.setItem(STORAGE_KEYS.BUDGET, budgetCap.toString());
    this.isSyncingFromRemote = false;
  }

  applyHistoryFromSnapshot(trips) {
    if (!Array.isArray(trips)) return;
    this.isSyncingFromRemote = true;
    localStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify(trips));
    this.isSyncingFromRemote = false;
  }

  applyBenchmarksFromSnapshot(benchmarksMap) {
    if (!benchmarksMap || typeof benchmarksMap !== 'object') return;
    this.isSyncingFromRemote = true;
    const current = this.getBenchmarkMap();
    const merged = { ...current, ...benchmarksMap };
    localStorage.setItem(STORAGE_KEYS.BENCHMARKS, JSON.stringify(merged));
    this.isSyncingFromRemote = false;
  }

  // --- Budget Methods ---
  getBudgetCap() {
    const val = localStorage.getItem(STORAGE_KEYS.BUDGET);
    return val ? parseFloat(val) : 350000;
  }

  setBudgetCap(amount) {
    const safeAmount = Math.max(10000, parseFloat(amount) || 350000);
    localStorage.setItem(STORAGE_KEYS.BUDGET, safeAmount.toString());

    if (!this.isSyncingFromRemote && window.firebaseService && window.firebaseService.isAuthenticated()) {
      window.firebaseService.saveBudgetCap(safeAmount);
    }

    return safeAmount;
  }

  // --- Active Cart Methods ---
  getCart() {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.CART);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      console.error('Failed to parse cart', e);
      return [];
    }
  }

  saveCart(cart) {
    localStorage.setItem(STORAGE_KEYS.CART, JSON.stringify(cart));
  }

  addItemToCart(itemData) {
    const cart = this.getCart();
    const newItem = {
      id: 'item-' + Date.now() + '-' + Math.floor(Math.random() * 1000),
      name: (itemData.name || '').trim(),
      category: itemData.category || 'Makanan Pokok',
      unit: itemData.unit || 'pcs',
      qty: Math.max(1, parseInt(itemData.qty, 10) || 1),
      unitPrice: Math.max(0, parseFloat(itemData.unitPrice) || 0),
      discount: (itemData.discount || '').toString().trim(),
      priority: itemData.priority || 'wajib',
      notes: (itemData.notes || '').trim()
    };
    cart.unshift(newItem); // Tambahkan ke paling atas troli
    this.saveCart(cart);

    if (!this.isSyncingFromRemote && window.firebaseService && window.firebaseService.isAuthenticated()) {
      window.firebaseService.saveCartItem(newItem);
    }

    return newItem;
  }

  updateCartItem(id, updates) {
    const cart = this.getCart();
    const index = cart.findIndex(it => it.id === id);
    if (index !== -1) {
      cart[index] = { ...cart[index], ...updates };
      this.saveCart(cart);

      if (!this.isSyncingFromRemote && window.firebaseService && window.firebaseService.isAuthenticated()) {
        window.firebaseService.saveCartItem(cart[index]);
      }

      return cart[index];
    }
    return null;
  }

  removeCartItem(id) {
    let cart = this.getCart();
    cart = cart.filter(it => it.id !== id);
    this.saveCart(cart);

    if (!this.isSyncingFromRemote && window.firebaseService && window.firebaseService.isAuthenticated()) {
      window.firebaseService.deleteCartItem(id);
    }

    return cart;
  }

  clearCart() {
    this.saveCart([]);

    if (!this.isSyncingFromRemote && window.firebaseService && window.firebaseService.isAuthenticated()) {
      window.firebaseService.clearCartInFirestore();
    }
  }

  // --- Benchmark / Price Comparator Methods ---
  getBenchmarkMap() {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.BENCHMARKS);
      return raw ? JSON.parse(raw) : {};
    } catch (e) {
      return {};
    }
  }

  getBenchmarkForProduct(productName) {
    if (!productName) return null;
    const clean = productName.toLowerCase().trim();
    const map = this.getBenchmarkMap();

    // Exact match
    if (map[clean]) return map[clean];

    // Fuzzy / Partial match
    const keys = Object.keys(map);
    const foundKey = keys.find(k => k.includes(clean) || clean.includes(k));
    return foundKey ? map[foundKey] : null;
  }

  updateBenchmark(productName, price, category, unit) {
    if (!productName || !price) return;
    const clean = productName.toLowerCase().trim();
    const map = this.getBenchmarkMap();
    map[clean] = {
      name: productName.trim(),
      category: category || (map[clean]?.category || 'Makanan Pokok'),
      unit: unit || (map[clean]?.unit || 'pcs'),
      lastPrice: parseFloat(price),
      date: new Date().toISOString()
    };
    localStorage.setItem(STORAGE_KEYS.BENCHMARKS, JSON.stringify(map));

    if (!this.isSyncingFromRemote && window.firebaseService && window.firebaseService.isAuthenticated()) {
      window.firebaseService.saveBenchmark(productName, map[clean]);
    }
  }

  // --- Shopping History Methods ---
  getHistory() {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.HISTORY);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      return [];
    }
  }

  saveHistory(historyList) {
    localStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify(historyList));
  }

  /**
   * Finalize current cart into shopping trip history,
   * then updates benchmarks database with new prices!
   */
  finishShoppingSession(sessionTitle) {
    const cart = this.getCart();
    if (cart.length === 0) return null;

    let totalSpent = 0;
    let totalSavings = 0;
    const itemRecords = [];

    cart.forEach(item => {
      const calc = Calculator.calculateItemTotals(item);
      totalSpent += calc.finalLineTotal;
      totalSavings += calc.totalLineSavings;

      itemRecords.push({
        name: item.name,
        category: item.category,
        unit: item.unit,
        qty: item.qty,
        unitPrice: item.unitPrice,
        discount: item.discount,
        finalTotal: calc.finalLineTotal,
        priority: item.priority
      });

      // Update benchmark harga resmi bulan berikutnya
      this.updateBenchmark(item.name, item.unitPrice, item.category, item.unit);
    });

    const now = new Date();
    const defaultTitle = sessionTitle || `Belanja Bulanan - ${now.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}`;

    const newTrip = {
      id: 'trip-' + Date.now(),
      title: defaultTitle,
      date: now.toISOString(),
      budgetCap: this.getBudgetCap(),
      totalSpent,
      itemCount: cart.length,
      totalSavings,
      items: itemRecords
    };

    const history = this.getHistory();
    history.unshift(newTrip);
    this.saveHistory(history);

    // Kosongkan troli aktif setelah checkout
    this.clearCart();

    if (!this.isSyncingFromRemote && window.firebaseService && window.firebaseService.isAuthenticated()) {
      window.firebaseService.saveHistoryTrip(newTrip);
    }

    return newTrip;
  }

  deleteHistoryTrip(tripId) {
    let history = this.getHistory();
    history = history.filter(h => h.id !== tripId);
    this.saveHistory(history);

    if (!this.isSyncingFromRemote && window.firebaseService && window.firebaseService.isAuthenticated()) {
      window.firebaseService.deleteHistoryTrip(tripId);
    }

    return history;
  }

  // --- Backup & Restore (JSON) ---
  exportDatabaseJSON() {
    const backupData = {
      app: 'Smart Grocery & Budget Safety Tracker',
      version: '1.0.0',
      exportedAt: new Date().toISOString(),
      budgetCap: this.getBudgetCap(),
      cart: this.getCart(),
      history: this.getHistory(),
      benchmarks: this.getBenchmarkMap()
    };
    return JSON.stringify(backupData, null, 2);
  }

  importDatabaseJSON(jsonString) {
    try {
      const data = JSON.parse(jsonString);
      if (data.budgetCap) this.setBudgetCap(data.budgetCap);
      if (Array.isArray(data.cart)) {
        this.saveCart(data.cart);
        if (window.firebaseService && window.firebaseService.isAuthenticated()) {
          data.cart.forEach(item => window.firebaseService.saveCartItem(item));
        }
      }
      if (Array.isArray(data.history)) {
        this.saveHistory(data.history);
        if (window.firebaseService && window.firebaseService.isAuthenticated()) {
          data.history.forEach(trip => window.firebaseService.saveHistoryTrip(trip));
        }
      }
      if (data.benchmarks && typeof data.benchmarks === 'object') {
        localStorage.setItem(STORAGE_KEYS.BENCHMARKS, JSON.stringify(data.benchmarks));
      }
      return true;
    } catch (e) {
      console.error('Import failed', e);
      return false;
    }
  }

  resetToDemoDefaults() {
    localStorage.removeItem(STORAGE_KEYS.CART);
    localStorage.removeItem(STORAGE_KEYS.HISTORY);
    localStorage.removeItem(STORAGE_KEYS.BUDGET);
    localStorage.removeItem(STORAGE_KEYS.BENCHMARKS);
    this.initData();
  }
}

window.db = new DBManager();
