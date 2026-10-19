// ==========================================================================
// FIREBASE CLOUD FIRESTORE SERVICE - TROLI BIJAK
// Mengelola integrasi Database Cloud Firestore, Offline Persistence, & Multi-User Isolation (user1, user2, dst.)
// ==========================================================================

// Konfigurasi resmi proyek Firebase TroliBijak
const FIREBASE_DEFAULT_CONFIG = {
  apiKey: "AIzaSyBlw_oCY0LRA90Sp2UQ1aTJjVUk-HWnH7M",
  authDomain: "repo1214mung.firebaseapp.com",
  projectId: "repo1214mung",
  storageBucket: "repo1214mung.firebasestorage.app",
  messagingSenderId: "491466435754",
  appId: "1:491466435754:web:4ae80a50db16c5ce4a74d3"
};

class FirebaseServiceManager {
  constructor() {
    this.STORAGE_KEY = 'trolibijak_firebase_config_v1';
    this.USER_ID_KEY = 'trolibijak_user_id_v1';
    this.LAST_SYNC_KEY = 'trolibijak_firebase_last_sync_v1';
    
    this.app = null;
    this.db = null;
    this.isInitialized = false;
    this.status = 'connecting'; // 'connecting' | 'connected' | 'offline' | 'error' | 'not_configured'
    this.lastError = null;
    this.listeners = [];
    this.statusCallback = null;

    // Inisialisasi service
    this.init();
  }

  // --- Manajemen Konfigurasi ---
  getConfig() {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed && parsed.projectId && parsed.apiKey) return parsed;
      }
    } catch (e) {
      console.warn('Gagal membaca custom config dari storage', e);
    }
    return FIREBASE_DEFAULT_CONFIG;
  }

  isConfigured() {
    const cfg = this.getConfig();
    return !!(cfg && cfg.apiKey && cfg.projectId);
  }

  // --- Multi-User Device Isolation (user1, user2, dst.) ---
  
  /**
   * Mendapatkan ID user saat ini dari localStorage,
   * atau membuat penomoran urut otomatis (user1, user2, ...) jika perangkat baru.
   */
  async getOrAssignUserId() {
    let currentId = localStorage.getItem(this.USER_ID_KEY);
    if (currentId && currentId.trim()) {
      return currentId.trim();
    }

    // Jika belum ada ID di perangkat ini, ambil nomor urut dari Firestore
    let assignedId = 'user1';

    if (this.db) {
      try {
        const counterRef = this.db.collection('system_counters').doc('user_devices');
        await this.db.runTransaction(async (transaction) => {
          const doc = await transaction.get(counterRef);
          let nextCount = 1;
          if (doc.exists && doc.data().lastCount) {
            nextCount = Number(doc.data().lastCount) + 1;
          }
          transaction.set(counterRef, {
            lastCount: nextCount,
            updatedAt: window.firebase.firestore.FieldValue.serverTimestamp()
          }, { merge: true });

          assignedId = `user${nextCount}`;
        });
      } catch (err) {
        console.warn('Gagal transaksi penomoran user otomatis, fallback ke user1:', err);
        assignedId = `user1`;
      }
    }

    localStorage.setItem(this.USER_ID_KEY, assignedId);
    console.log(`Perangkat ini terdaftar sebagai: ${assignedId}`);
    return assignedId;
  }

  getUserIdSync() {
    return localStorage.getItem(this.USER_ID_KEY) || 'user1';
  }

  setUserId(customId) {
    const clean = (customId || 'user1').trim().toLowerCase().replace(/[^a-z0-9_-]/g, '_');
    localStorage.setItem(this.USER_ID_KEY, clean);
    this.notifyStatusChange();
    return clean;
  }

  // --- Inisialisasi Firebase & Cloud Firestore ---
  async init(force = false) {
    if (this.isInitialized && !force) return true;

    if (!window.firebase) {
      this.status = 'error';
      this.lastError = 'Firebase SDK belum dimuat.';
      this.notifyStatusChange();
      return false;
    }

    const config = this.getConfig();

    try {
      if (window.firebase.apps && window.firebase.apps.length > 0) {
        this.app = window.firebase.apps[0];
      } else {
        this.app = window.firebase.initializeApp(config);
      }

      this.db = window.firebase.firestore();

      // Aktifkan Offline Persistence untuk PWA
      try {
        await this.db.enablePersistence({ synchronizeTabs: true });
        console.log('Firestore offline persistence aktif.');
      } catch (persErr) {
        if (persErr.code === 'failed-precondition') {
          console.warn('Persistence notice: Multiple tabs open');
        } else if (persErr.code === 'unimplemented') {
          console.warn('Browser tidak mendukung persistence Firestore');
        }
      }

      // Pastikan User ID sudah terdaftar / terisi
      await this.getOrAssignUserId();

      this.isInitialized = true;
      this.status = navigator.onLine ? 'connected' : 'offline';
      this.lastError = null;

      // Event listener status koneksi jaringan
      window.addEventListener('online', () => {
        this.status = 'connected';
        this.notifyStatusChange();
      });
      window.addEventListener('offline', () => {
        this.status = 'offline';
        this.notifyStatusChange();
      });

      this.notifyStatusChange();
      return true;
    } catch (err) {
      console.error('Firebase init error:', err);
      this.status = 'error';
      this.lastError = err.message || 'Gagal terhubung ke Firebase';
      this.notifyStatusChange();
      return false;
    }
  }

  // --- Helper Referensi Dokumen Terisolasi per User ---
  
  getUserDocRef() {
    const uid = this.getUserIdSync();
    return this.db.collection('users').doc(uid);
  }

  getCartCollectionRef() {
    return this.getUserDocRef().collection('cart');
  }

  getHistoryCollectionRef() {
    return this.getUserDocRef().collection('history');
  }

  getBenchmarksCollectionRef() {
    return this.getUserDocRef().collection('benchmarks');
  }

  // --- Sinkronisasi Data Menyeluruh (Upload & Download Semua Data) ---

  /**
   * Mengunggah seluruh data lokal pengguna saat ini ke Cloud Firestore
   */
  async uploadAllToFirestore(localData) {
    if (!await this.init()) {
      throw new Error(this.lastError || 'Firebase belum dapat diakses!');
    }

    const { budgetCap, cart, history, benchmarks } = localData;
    const batch = this.db.batch();
    const userDocRef = this.getUserDocRef();
    const uid = this.getUserIdSync();

    // 1. Simpan Limit Anggaran & Metadata User
    batch.set(userDocRef, {
      userId: uid,
      budgetCap: budgetCap || 350000,
      updatedAt: window.firebase.firestore.FieldValue.serverTimestamp(),
      deviceInfo: navigator.userAgent
    }, { merge: true });

    // 2. Simpan Troli Aktif User
    if (Array.isArray(cart)) {
      cart.forEach(item => {
        const itemRef = this.getCartCollectionRef().doc(item.id);
        batch.set(itemRef, {
          ...item,
          updatedAt: new Date().toISOString()
        }, { merge: true });
      });
    }

    // 3. Simpan Riwayat Belanja User
    if (Array.isArray(history)) {
      history.forEach(trip => {
        const tripRef = this.getHistoryCollectionRef().doc(trip.id);
        batch.set(tripRef, {
          ...trip,
          updatedAt: new Date().toISOString()
        }, { merge: true });
      });
    }

    // 4. Simpan Patokan Harga (Benchmarks) User
    if (benchmarks && typeof benchmarks === 'object') {
      Object.keys(benchmarks).forEach(key => {
        const safeDocId = encodeURIComponent(key).replace(/\./g, '%2E');
        const benchRef = this.getBenchmarksCollectionRef().doc(safeDocId);
        batch.set(benchRef, {
          ...benchmarks[key],
          key: key,
          updatedAt: new Date().toISOString()
        }, { merge: true });
      });
    }

    await batch.commit();

    const syncTime = new Date().toISOString();
    localStorage.setItem(this.LAST_SYNC_KEY, syncTime);
    this.status = 'connected';
    this.notifyStatusChange();

    return {
      success: true,
      userId: uid,
      syncTime,
      itemCount: (cart?.length || 0) + (history?.length || 0) + Object.keys(benchmarks || {}).length
    };
  }

  /**
   * Mengunduh seluruh data pengguna saat ini dari Cloud Firestore
   */
  async downloadAllFromFirestore() {
    if (!await this.init()) {
      throw new Error(this.lastError || 'Firebase belum dapat diakses!');
    }

    // 1. Ambil Setting Anggaran
    const userDoc = await this.getUserDocRef().get();
    let budgetCap = 350000;
    if (userDoc.exists && userDoc.data().budgetCap) {
      budgetCap = Number(userDoc.data().budgetCap);
    }

    // 2. Ambil Troli Aktif
    const cartSnapshot = await this.getCartCollectionRef().get();
    const cart = [];
    cartSnapshot.forEach(doc => {
      cart.push(doc.data());
    });

    // 3. Ambil Riwayat Belanja
    const historySnapshot = await this.getHistoryCollectionRef().get();
    const history = [];
    historySnapshot.forEach(doc => {
      history.push(doc.data());
    });
    history.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));

    // 4. Ambil Patokan Harga
    const benchSnapshot = await this.getBenchmarksCollectionRef().get();
    const benchmarks = {};
    benchSnapshot.forEach(doc => {
      const data = doc.data();
      const key = data.key || data.name.toLowerCase().trim();
      benchmarks[key] = data;
    });

    const syncTime = new Date().toISOString();
    localStorage.setItem(this.LAST_SYNC_KEY, syncTime);
    this.status = 'connected';
    this.notifyStatusChange();

    return {
      budgetCap,
      cart,
      history,
      benchmarks,
      syncTime,
      userId: this.getUserIdSync()
    };
  }

  // --- Sinkronisasi Realtime Satuan (Background Sync) ---

  async saveCartItem(item) {
    if (!this.isInitialized) return;
    try {
      const ref = this.getCartCollectionRef().doc(item.id);
      await ref.set({
        ...item,
        updatedAt: new Date().toISOString()
      }, { merge: true });
    } catch (e) {
      console.warn('Gagal simpan cart item ke Firestore:', e);
    }
  }

  async deleteCartItem(itemId) {
    if (!this.isInitialized) return;
    try {
      await this.getCartCollectionRef().doc(itemId).delete();
    } catch (e) {
      console.warn('Gagal hapus cart item di Firestore:', e);
    }
  }

  async clearCartInFirestore() {
    if (!this.isInitialized) return;
    try {
      const snapshot = await this.getCartCollectionRef().get();
      const batch = this.db.batch();
      snapshot.forEach(doc => batch.delete(doc.ref));
      await batch.commit();
    } catch (e) {
      console.warn('Gagal bersihkan cart di Firestore:', e);
    }
  }

  async saveBudgetCap(amount) {
    if (!this.isInitialized) return;
    try {
      await this.getUserDocRef().set({
        budgetCap: amount,
        updatedAt: window.firebase.firestore.FieldValue.serverTimestamp()
      }, { merge: true });
    } catch (e) {
      console.warn('Gagal simpan budgetCap ke Firestore:', e);
    }
  }

  async saveHistoryTrip(trip) {
    if (!this.isInitialized) return;
    try {
      await this.getHistoryCollectionRef().doc(trip.id).set({
        ...trip,
        updatedAt: new Date().toISOString()
      }, { merge: true });
    } catch (e) {
      console.warn('Gagal simpan history trip ke Firestore:', e);
    }
  }

  async deleteHistoryTrip(tripId) {
    if (!this.isInitialized) return;
    try {
      await this.getHistoryCollectionRef().doc(tripId).delete();
    } catch (e) {
      console.warn('Gagal hapus history trip di Firestore:', e);
    }
  }

  async saveBenchmark(productName, itemData) {
    if (!this.isInitialized || !productName) return;
    try {
      const cleanKey = productName.toLowerCase().trim();
      const safeDocId = encodeURIComponent(cleanKey).replace(/\./g, '%2E');
      await this.getBenchmarksCollectionRef().doc(safeDocId).set({
        ...itemData,
        key: cleanKey,
        updatedAt: new Date().toISOString()
      }, { merge: true });
    } catch (e) {
      console.warn('Gagal simpan benchmark ke Firestore:', e);
    }
  }

  // --- Realtime Listener untuk Multi-Tab / Sinkronisasi Langsung ---
  subscribeRealtimeUpdates(onCartUpdate, onBudgetUpdate) {
    if (!this.isInitialized) return;
    this.unsubscribeAll();

    try {
      const cartUnsub = this.getCartCollectionRef().onSnapshot(snapshot => {
        const items = [];
        snapshot.forEach(doc => items.push(doc.data()));
        if (typeof onCartUpdate === 'function') onCartUpdate(items);
      }, err => {
        console.warn('Realtime cart notice:', err);
      });
      this.listeners.push(cartUnsub);

      const userUnsub = this.getUserDocRef().onSnapshot(doc => {
        if (doc.exists && doc.data().budgetCap) {
          if (typeof onBudgetUpdate === 'function') onBudgetUpdate(doc.data().budgetCap);
        }
      }, err => {
        console.warn('Realtime user notice:', err);
      });
      this.listeners.push(userUnsub);
    } catch (e) {
      console.warn('Gagal pasang realtime listener:', e);
    }
  }

  unsubscribeAll() {
    this.listeners.forEach(unsub => {
      try { unsub(); } catch(e){}
    });
    this.listeners = [];
  }

  // --- Status Observer ---
  onStatusChange(callback) {
    if (typeof callback === 'function') {
      this.statusCallback = callback;
      callback(this.getStatus());
    }
  }

  notifyStatusChange() {
    if (this.statusCallback) {
      this.statusCallback(this.getStatus());
    }
  }

  getStatus() {
    return {
      status: this.status, // 'connected' | 'offline' | 'error' | 'connecting'
      isConfigured: this.isConfigured(),
      userId: this.getUserIdSync(),
      lastSync: localStorage.getItem(this.LAST_SYNC_KEY),
      lastError: this.lastError
    };
  }
}

// Global Singleton
window.firebaseService = new FirebaseServiceManager();
