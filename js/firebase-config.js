// ==========================================================================
// FIREBASE CLOUD FIRESTORE & GOOGLE AUTHORIZATION SERVICE - TROLI BIJAK
// Mengelola Google Auth, Realtime onSnapshot Firestore, & Multi-Perangkat
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
    this.USER_CACHE_KEY = 'trolibijak_google_user_v1';
    this.LAST_SYNC_KEY = 'trolibijak_firebase_last_sync_v1';

    this.app = null;
    this.auth = null;
    this.db = null;
    this.currentUser = null;
    this.isInitialized = false;
    this.status = 'connecting'; // 'connected' | 'offline' | 'error' | 'not_authenticated'
    this.lastError = null;
    this.listeners = [];
    this.statusCallback = null;
    this.authCallback = null;
    this.isSyncingFromSnapshot = false;

    // Inisialisasi service saat script dimuat
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

  // --- Inisialisasi Firebase, Auth, & Firestore ---
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

      this.auth = window.firebase.auth();
      this.db = window.firebase.firestore();

      // Offline Persistence Firestore
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

      // Handle redirect login result if any
      this.auth.getRedirectResult().then(result => {
        if (result && result.user) {
          console.log('Google Auth Redirect Berhasil:', result.user.displayName);
          this.handleUserSignedIn(result.user);
        }
      }).catch(err => {
        console.warn('Redirect result notice:', err);
      });

      // Listener Status Autentikasi Google
      this.auth.onAuthStateChanged(user => {
        if (user) {
          this.handleUserSignedIn(user);
        } else {
          this.handleUserSignedOut();
        }
      });

      // Network Listener
      window.addEventListener('online', () => {
        if (this.currentUser) {
          this.status = 'connected';
        }
        this.notifyStatusChange();
      });

      window.addEventListener('offline', () => {
        this.status = 'offline';
        this.notifyStatusChange();
      });

      this.isInitialized = true;
      return true;
    } catch (err) {
      console.error('Firebase init error:', err);
      this.status = 'error';
      this.lastError = err.message || 'Gagal terhubung ke Firebase';
      this.notifyStatusChange();
      return false;
    }
  }

  // --- Google Authorization Methods ---

  /**
   * Masuk menggunakan Akun Google (Google Auth Provider)
   */
  async signInWithGoogle() {
    if (!this.auth) {
      await this.init(true);
    }

    if (!this.auth) {
      throw new Error('Firebase Auth belum siap.');
    }

    const provider = new window.firebase.auth.GoogleAuthProvider();
    provider.setCustomParameters({
      prompt: 'select_account'
    });

    try {
      this.status = 'connecting';
      this.notifyStatusChange();

      // Utamakan signInWithPopup untuk pengalaman desktop/tablet terbaik
      const result = await this.auth.signInWithPopup(provider);
      const user = result.user;
      this.handleUserSignedIn(user);
      return user;
    } catch (popupErr) {
      console.warn('Popup login error, mencoba redirect jika diperlukan:', popupErr);
      if (popupErr.code === 'auth/popup-blocked' || popupErr.code === 'auth/cancelled-popup-request') {
        // Fallback jika popup diblokir oleh browser
        await this.auth.signInWithRedirect(provider);
        return null;
      }
      this.lastError = popupErr.message;
      this.notifyStatusChange();
      throw popupErr;
    }
  }

  /**
   * Keluar dari Akun Google
   */
  async signOut() {
    if (this.auth) {
      this.unsubscribeAll();
      await this.auth.signOut();
      this.handleUserSignedOut();
    }
  }

  handleUserSignedIn(user) {
    this.currentUser = {
      uid: user.uid,
      displayName: user.displayName || user.email.split('@')[0],
      email: user.email,
      photoURL: user.photoURL || null
    };

    try {
      localStorage.setItem(this.USER_CACHE_KEY, JSON.stringify(this.currentUser));
    } catch (e) { }

    this.status = navigator.onLine ? 'connected' : 'offline';
    this.lastError = null;

    // Catat / Update profil user di Firestore
    this.getUserDocRef().set({
      uid: user.uid,
      displayName: this.currentUser.displayName,
      email: this.currentUser.email,
      photoURL: this.currentUser.photoURL,
      lastLogin: window.firebase.firestore.FieldValue.serverTimestamp()
    }, { merge: true }).catch(err => {
      console.warn('Gagal update user profile di Firestore:', err);
    });

    this.notifyStatusChange();
    if (typeof this.authCallback === 'function') {
      this.authCallback(this.currentUser);
    }
  }

  handleUserSignedOut() {
    this.currentUser = null;
    try {
      localStorage.removeItem(this.USER_CACHE_KEY);
    } catch (e) { }

    this.status = 'not_authenticated';
    this.notifyStatusChange();

    if (typeof this.authCallback === 'function') {
      this.authCallback(null);
    }
  }

  onAuthStateChanged(callback) {
    this.authCallback = callback;
    if (this.currentUser) {
      callback(this.currentUser);
    } else {
      const cached = localStorage.getItem(this.USER_CACHE_KEY);
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          if (parsed && parsed.uid) {
            callback(parsed);
          }
        } catch (e) { }
      }
    }
  }

  isUserLoggedIn() {
    return !!(this.currentUser && this.currentUser.uid);
  }

  getCurrentUser() {
    if (this.currentUser) return this.currentUser;
    try {
      const cached = localStorage.getItem(this.USER_CACHE_KEY);
      if (cached) return JSON.parse(cached);
    } catch (e) { }
    return null;
  }

  getUserId() {
    const user = this.getCurrentUser();
    return user ? user.uid : 'guest_local';
  }

  // --- Helper Referensi Dokumen Terisolasi per Akun Google ---

  getUserDocRef() {
    const uid = this.getUserId();
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

  // --- Realtime onSnapshot Listener Sinkronisasi ---

  /**
   * Mengaktifkan listener Realtime onSnapshot untuk Cart, Budget, dan History
   */
  subscribeRealtimeUpdates({ onCartUpdate, onBudgetUpdate, onHistoryUpdate, onBenchmarksUpdate }) {
    if (!this.db || !this.isUserLoggedIn()) return;
    this.unsubscribeAll();

    try {
      // 1. Realtime onSnapshot pada Koleksi Cart
      const cartUnsub = this.getCartCollectionRef().onSnapshot(snapshot => {
        if (this.isSyncingFromSnapshot) return;
        const items = [];
        snapshot.forEach(doc => items.push(doc.data()));

        // Simpan waktu sync
        const now = new Date().toISOString();
        localStorage.setItem(this.LAST_SYNC_KEY, now);
        this.notifyStatusChange();

        if (typeof onCartUpdate === 'function') {
          onCartUpdate(items);
        }
      }, err => {
        console.warn('Realtime cart snapshot error:', err);
      });
      this.listeners.push(cartUnsub);

      // 2. Realtime onSnapshot pada Dokumen Pengaturan User (Budget Cap)
      const userUnsub = this.getUserDocRef().onSnapshot(doc => {
        if (this.isSyncingFromSnapshot) return;
        if (doc.exists && doc.data() && doc.data().budgetCap !== undefined) {
          if (typeof onBudgetUpdate === 'function') {
            onBudgetUpdate(Number(doc.data().budgetCap));
          }
        }
      }, err => {
        console.warn('Realtime budget snapshot error:', err);
      });
      this.listeners.push(userUnsub);

      // 3. Realtime onSnapshot pada Koleksi History
      const histUnsub = this.getHistoryCollectionRef().onSnapshot(snapshot => {
        if (this.isSyncingFromSnapshot) return;
        const historyList = [];
        snapshot.forEach(doc => historyList.push(doc.data()));
        historyList.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));

        if (typeof onHistoryUpdate === 'function') {
          onHistoryUpdate(historyList);
        }
      }, err => {
        console.warn('Realtime history snapshot error:', err);
      });
      this.listeners.push(histUnsub);

      // 4. Realtime onSnapshot pada Koleksi Benchmarks
      const benchUnsub = this.getBenchmarksCollectionRef().onSnapshot(snapshot => {
        if (this.isSyncingFromSnapshot) return;
        const benchmarks = {};
        snapshot.forEach(doc => {
          const data = doc.data();
          const key = data.key || (data.name ? data.name.toLowerCase().trim() : doc.id);
          benchmarks[key] = data;
        });

        if (typeof onBenchmarksUpdate === 'function') {
          onBenchmarksUpdate(benchmarks);
        }
      }, err => {
        console.warn('Realtime benchmarks snapshot error:', err);
      });
      this.listeners.push(benchUnsub);

      console.log('Semua listener Firestore onSnapshot berhasil diaktifkan.');
    } catch (e) {
      console.warn('Gagal mengaktifkan realtime onSnapshot:', e);
    }
  }

  unsubscribeAll() {
    this.listeners.forEach(unsub => {
      try { unsub(); } catch (e) { }
    });
    this.listeners = [];
  }

  // --- Realtime Mutasi ke Firestore ---

  async saveCartItem(item) {
    if (!this.db || !this.isUserLoggedIn()) return;
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
    if (!this.db || !this.isUserLoggedIn()) return;
    try {
      await this.getCartCollectionRef().doc(itemId).delete();
    } catch (e) {
      console.warn('Gagal hapus cart item di Firestore:', e);
    }
  }

  async clearCartInFirestore() {
    if (!this.db || !this.isUserLoggedIn()) return;
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
    if (!this.db || !this.isUserLoggedIn()) return;
    try {
      await this.getUserDocRef().set({
        budgetCap: Number(amount),
        updatedAt: window.firebase.firestore.FieldValue.serverTimestamp()
      }, { merge: true });
    } catch (e) {
      console.warn('Gagal simpan budgetCap ke Firestore:', e);
    }
  }

  async saveHistoryTrip(trip) {
    if (!this.db || !this.isUserLoggedIn()) return;
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
    if (!this.db || !this.isUserLoggedIn()) return;
    try {
      await this.getHistoryCollectionRef().doc(tripId).delete();
    } catch (e) {
      console.warn('Gagal hapus history trip di Firestore:', e);
    }
  }

  async saveBenchmark(productName, itemData) {
    if (!this.db || !this.isUserLoggedIn() || !productName) return;
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

  // --- Sinkronisasi Awal Data Pengguna (Inisialisasi Cloud jika baru) ---
  async syncInitialUserData(localData) {
    if (!this.db || !this.isUserLoggedIn()) return;

    try {
      const cartSnap = await this.getCartCollectionRef().limit(1).get();
      if (cartSnap.empty && Array.isArray(localData.cart) && localData.cart.length > 0) {
        // Cloud masih kosong untuk user ini, unggah data awal
        console.log('Cloud user baru: mengunggah data awal lokal ke Firestore...');
        await this.uploadAllToFirestore(localData);
      }
    } catch (e) {
      console.warn('Initial sync check notice:', e);
    }
  }

  async uploadAllToFirestore(localData) {
    if (!this.db || !this.isUserLoggedIn()) return;
    const { budgetCap, cart, history, benchmarks } = localData;
    const batch = this.db.batch();

    // 1. Simpan Budget
    batch.set(this.getUserDocRef(), {
      budgetCap: budgetCap || 350000,
      updatedAt: window.firebase.firestore.FieldValue.serverTimestamp()
    }, { merge: true });

    // 2. Simpan Cart
    if (Array.isArray(cart)) {
      cart.forEach(item => {
        const itemRef = this.getCartCollectionRef().doc(item.id);
        batch.set(itemRef, { ...item, updatedAt: new Date().toISOString() }, { merge: true });
      });
    }

    // 3. Simpan History
    if (Array.isArray(history)) {
      history.forEach(trip => {
        const tripRef = this.getHistoryCollectionRef().doc(trip.id);
        batch.set(tripRef, { ...trip, updatedAt: new Date().toISOString() }, { merge: true });
      });
    }

    // 4. Simpan Benchmarks
    if (benchmarks && typeof benchmarks === 'object') {
      Object.keys(benchmarks).forEach(key => {
        const safeDocId = encodeURIComponent(key).replace(/\./g, '%2E');
        const benchRef = this.getBenchmarksCollectionRef().doc(safeDocId);
        batch.set(benchRef, { ...benchmarks[key], key, updatedAt: new Date().toISOString() }, { merge: true });
      });
    }

    await batch.commit();
    const syncTime = new Date().toISOString();
    localStorage.setItem(this.LAST_SYNC_KEY, syncTime);
    this.notifyStatusChange();
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
    const user = this.getCurrentUser();
    return {
      status: this.status, // 'connected' | 'offline' | 'error' | 'not_authenticated' | 'connecting'
      isLoggedIn: !!user,
      user: user,
      lastSync: localStorage.getItem(this.LAST_SYNC_KEY),
      lastError: this.lastError
    };
  }
}

// Global Singleton
window.firebaseService = new FirebaseServiceManager();