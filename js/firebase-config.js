// ==========================================================================
// FIREBASE CLOUD FIRESTORE & GOOGLE AUTH SERVICE - TROLI BIJAK
// Mengelola Google Authorization, Realtime Sync dengan onSnapshot, & Multi-User Isolation
// ==========================================================================

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
    this.LAST_SYNC_KEY = 'trolibijak_firebase_last_sync_v1';
    this.SIMULATED_USER_KEY = 'trolibijak_simulated_google_user_v1';

    this.app = null;
    this.auth = null;
    this.db = null;
    this.currentUser = null; // { uid, email, displayName, photoURL }
    this.isInitialized = false;
    this.status = 'connecting';
    this.lastError = null;

    // Snapshot listeners unsubscription functions
    this.unsubscribers = [];

    // Callbacks
    this.authListeners = [];
    this.statusListeners = [];
    this.realtimeCallbacks = {
      onCart: null,
      onBudget: null,
      onHistory: null,
      onBenchmarks: null
    };

    // Muat session simulasi jika ada
    try {
      const savedSim = localStorage.getItem(this.SIMULATED_USER_KEY);
      if (savedSim) {
        this.currentUser = JSON.parse(savedSim);
        if (this.currentUser && (this.currentUser.displayName === 'Ryo Viriya' || this.currentUser.displayName === 'Ryo')) {
          this.currentUser.displayName = 'Pengguna';
          this.currentUser.email = 'pengguna@trolibijak.id';
        }
      }
    } catch(e){}

    // Auto init
    this.init();
  }

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

  // --- Inisialisasi Firebase ---
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

      // Tangani hasil sign in redirect jika baru kembali dari halaman Google
      this.auth.getRedirectResult().then(result => {
        if (result && result.user) {
          console.log('[TroliBijak] Google Redirect Sign-in sukses:', result.user.email);
        }
      }).catch(err => {
        console.warn('[TroliBijak] Redirect result notice:', err.code, err.message);
      });

      // Pantau status autentikasi Google Firebase
      this.auth.onAuthStateChanged((user) => {
        if (user) {
          // Bersihkan simulasi jika user real login
          localStorage.removeItem(this.SIMULATED_USER_KEY);
          this.handleAuthStateChanged(user);
        } else if (!this.currentUser) {
          this.handleAuthStateChanged(null);
        }
      });

      // Coba aktifkan Firestore offline persistence
      try {
        await this.db.enablePersistence({ synchronizeTabs: true });
        console.log('[TroliBijak] Firestore offline persistence aktif.');
      } catch (persErr) {
        if (persErr.code === 'failed-precondition') {
          console.warn('[TroliBijak] Persistence: Multi-tab open');
        } else {
          console.warn('[TroliBijak] Persistence notice:', persErr.message);
        }
      }

      this.isInitialized = true;
      this.status = navigator.onLine ? 'connected' : 'offline';
      this.lastError = null;

      window.addEventListener('online', () => {
        this.status = 'connected';
        this.notifyStatusChange();
      });
      window.addEventListener('offline', () => {
        this.status = 'offline';
        this.notifyStatusChange();
      });

      // Jika ada session simulasi tersimpan, emit state
      if (this.currentUser) {
        this.notifyAuthChange(this.currentUser);
      }

      this.notifyStatusChange();
      return true;
    } catch (err) {
      console.error('[TroliBijak] Firebase init error:', err);
      this.status = 'error';
      this.lastError = err.message || 'Gagal menginisialisasi Firebase';
      this.notifyStatusChange();
      return false;
    }
  }

  // --- Google Authorization Handlers ---

  async signInWithGoogle() {
    if (!await this.init()) {
      throw new Error(this.lastError || 'Firebase belum siap');
    }

    const provider = new window.firebase.auth.GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });

    try {
      const result = await this.auth.signInWithPopup(provider);
      return result.user;
    } catch (err) {
      console.warn('[TroliBijak] Google Sign-In error:', err.code, err.message);

      if (err.code === 'auth/popup-blocked') {
        console.log('[TroliBijak] Popup terblokir browser, mencoba signInWithRedirect');
        await this.auth.signInWithRedirect(provider);
        return null;
      }
      throw err;
    }
  }

  simulateGoogleSignIn(customData = {}) {
    const mockUser = {
      uid: 'google-user-' + Math.floor(Math.random() * 899999 + 100000),
      displayName: customData.displayName || 'Pengguna',
      email: customData.email || 'pengguna@trolibijak.id',
      photoURL: customData.photoURL || ''
    };
    this.currentUser = mockUser;
    try {
      localStorage.setItem(this.SIMULATED_USER_KEY, JSON.stringify(mockUser));
    } catch(e){}

    this.saveUserProfileMetadata();
    this.startRealtimeSnapshots();
    this.notifyAuthChange(this.currentUser);
    this.notifyStatusChange();
    return mockUser;
  }

  signInAsGuest() {
    const guestUser = {
      uid: 'guest-' + Math.floor(Math.random() * 899999 + 100000),
      displayName: 'Tamu',
      email: '',
      photoURL: '',
      isGuest: true
    };
    this.currentUser = guestUser;
    try {
      localStorage.setItem(this.SIMULATED_USER_KEY, JSON.stringify(guestUser));
    } catch(e){}

    this.notifyAuthChange(this.currentUser);
    this.notifyStatusChange();
    return guestUser;
  }

  async signOutGoogle() {
    this.unsubscribeRealtimeSnapshots();
    localStorage.removeItem(this.SIMULATED_USER_KEY);
    if (this.auth) {
      try {
        await this.auth.signOut();
      } catch(e){}
    }
    this.currentUser = null;
    this.notifyAuthChange(null);
    this.notifyStatusChange();
  }

  getCurrentUser() {
    return this.currentUser;
  }

  isAuthenticated() {
    return !!(this.currentUser && this.currentUser.uid);
  }

  getUserId() {
    return this.currentUser ? this.currentUser.uid : 'guest';
  }

  async handleAuthStateChanged(user) {
    if (user) {
      this.currentUser = {
        uid: user.uid,
        displayName: user.displayName || user.email?.split('@')[0] || 'Pengguna Google',
        email: user.email || '',
        photoURL: user.photoURL || ''
      };

      this.saveUserProfileMetadata();
      this.startRealtimeSnapshots();
      this.initialCloudSyncCheck();
    } else {
      if (!localStorage.getItem(this.SIMULATED_USER_KEY)) {
        this.currentUser = null;
        this.unsubscribeRealtimeSnapshots();
      }
    }

    this.notifyAuthChange(this.currentUser);
    this.notifyStatusChange();
  }

  async saveUserProfileMetadata() {
    if (!this.isAuthenticated() || !this.db) return;
    try {
      await this.getUserDocRef().set({
        uid: this.currentUser.uid,
        displayName: this.currentUser.displayName,
        email: this.currentUser.email,
        photoURL: this.currentUser.photoURL,
        lastLoginAt: window.firebase.firestore.FieldValue.serverTimestamp()
      }, { merge: true });
    } catch (e) {
      // Abaikan jika database firestore belum aktif di console
    }
  }

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

  // --- Realtime Snapshots ---

  startRealtimeSnapshots() {
    if (!this.isAuthenticated() || !this.db) return;
    this.unsubscribeRealtimeSnapshots();

    try {
      // Cart snapshot
      const unsubCart = this.getCartCollectionRef().onSnapshot(snapshot => {
        const items = [];
        snapshot.forEach(doc => {
          items.push({ id: doc.id, ...doc.data() });
        });
        if (this.realtimeCallbacks.onCart && items.length > 0) {
          this.realtimeCallbacks.onCart(items, snapshot.metadata.hasPendingWrites);
        }
      }, err => {
        console.warn('[Realtime] Cart snapshot notice:', err.message);
      });
      this.unsubscribers.push(unsubCart);

      // User doc snapshot
      const unsubUser = this.getUserDocRef().onSnapshot(doc => {
        if (doc.exists) {
          const data = doc.data();
          if (data && data.budgetCap !== undefined && this.realtimeCallbacks.onBudget) {
            this.realtimeCallbacks.onBudget(Number(data.budgetCap), doc.metadata.hasPendingWrites);
          }
        }
      }, err => {
        console.warn('[Realtime] User snapshot notice:', err.message);
      });
      this.unsubscribers.push(unsubUser);

      // History snapshot
      const unsubHistory = this.getHistoryCollectionRef().onSnapshot(snapshot => {
        const trips = [];
        snapshot.forEach(doc => {
          trips.push({ id: doc.id, ...doc.data() });
        });
        trips.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
        if (this.realtimeCallbacks.onHistory && trips.length > 0) {
          this.realtimeCallbacks.onHistory(trips, snapshot.metadata.hasPendingWrites);
        }
      }, err => {
        console.warn('[Realtime] History snapshot notice:', err.message);
      });
      this.unsubscribers.push(unsubHistory);

      // Benchmarks snapshot
      const unsubBench = this.getBenchmarksCollectionRef().onSnapshot(snapshot => {
        const benchmarks = {};
        snapshot.forEach(doc => {
          const data = doc.data();
          const key = data.key || (data.name ? data.name.toLowerCase().trim() : doc.id);
          benchmarks[key] = data;
        });
        if (Object.keys(benchmarks).length > 0 && this.realtimeCallbacks.onBenchmarks) {
          this.realtimeCallbacks.onBenchmarks(benchmarks, snapshot.metadata.hasPendingWrites);
        }
      }, err => {
        console.warn('[Realtime] Benchmarks snapshot notice:', err.message);
      });
      this.unsubscribers.push(unsubBench);
    } catch (e) {
      console.warn('Gagal startRealtimeSnapshots:', e);
    }
  }

  unsubscribeRealtimeSnapshots() {
    this.unsubscribers.forEach(unsub => {
      try { unsub(); } catch (e) {}
    });
    this.unsubscribers = [];
  }

  subscribeRealtimeSnapshots(handlers = {}) {
    this.realtimeCallbacks = { ...this.realtimeCallbacks, ...handlers };
    if (this.isAuthenticated()) {
      this.startRealtimeSnapshots();
    }
  }

  // --- Operasi Firestore Realtime ---

  async saveCartItem(item) {
    if (!this.isAuthenticated() || !this.db || !item || !item.id) return;
    try {
      await this.getCartCollectionRef().doc(item.id).set({
        ...item,
        updatedAt: new Date().toISOString()
      }, { merge: true });
    } catch (e) {
      console.warn('Realtime saveCartItem error:', e.message);
    }
  }

  async deleteCartItem(itemId) {
    if (!this.isAuthenticated() || !this.db || !itemId) return;
    try {
      await this.getCartCollectionRef().doc(itemId).delete();
    } catch (e) {
      console.warn('Realtime deleteCartItem error:', e.message);
    }
  }

  async clearCartInFirestore() {
    if (!this.isAuthenticated() || !this.db) return;
    try {
      const snapshot = await this.getCartCollectionRef().get();
      const batch = this.db.batch();
      snapshot.forEach(doc => batch.delete(doc.ref));
      await batch.commit();
    } catch (e) {
      console.warn('Realtime clearCartInFirestore error:', e.message);
    }
  }

  async saveBudgetCap(amount) {
    if (!this.isAuthenticated() || !this.db) return;
    try {
      await this.getUserDocRef().set({
        budgetCap: Number(amount),
        updatedAt: window.firebase.firestore.FieldValue.serverTimestamp()
      }, { merge: true });
    } catch (e) {
      console.warn('Realtime saveBudgetCap error:', e.message);
    }
  }

  async saveHistoryTrip(trip) {
    if (!this.isAuthenticated() || !this.db || !trip || !trip.id) return;
    try {
      await this.getHistoryCollectionRef().doc(trip.id).set({
        ...trip,
        updatedAt: new Date().toISOString()
      }, { merge: true });
    } catch (e) {
      console.warn('Realtime saveHistoryTrip error:', e.message);
    }
  }

  async deleteHistoryTrip(tripId) {
    if (!this.isAuthenticated() || !this.db || !tripId) return;
    try {
      await this.getHistoryCollectionRef().doc(tripId).delete();
    } catch (e) {
      console.warn('Realtime deleteHistoryTrip error:', e.message);
    }
  }

  async saveBenchmark(productName, itemData) {
    if (!this.isAuthenticated() || !this.db || !productName) return;
    try {
      const cleanKey = productName.toLowerCase().trim();
      const safeDocId = encodeURIComponent(cleanKey).replace(/\./g, '%2E');
      await this.getBenchmarksCollectionRef().doc(safeDocId).set({
        ...itemData,
        key: cleanKey,
        updatedAt: new Date().toISOString()
      }, { merge: true });
    } catch (e) {
      console.warn('Realtime saveBenchmark error:', e.message);
    }
  }

  async initialCloudSyncCheck() {
    if (!this.isAuthenticated() || !this.db) return;
    try {
      const cartSnap = await this.getCartCollectionRef().get();
      if (cartSnap.empty && window.db) {
        const localCart = window.db.getCart();
        if (Array.isArray(localCart) && localCart.length > 0) {
          const batch = this.db.batch();
          localCart.forEach(item => {
            const ref = this.getCartCollectionRef().doc(item.id);
            batch.set(ref, { ...item, updatedAt: new Date().toISOString() }, { merge: true });
          });
          await batch.commit();
        }
      }
    } catch (e) {}
  }

  // --- Observers ---

  onAuthStateChanged(callback) {
    if (typeof callback === 'function') {
      this.authListeners.push(callback);
      if (this.currentUser !== undefined) {
        callback(this.currentUser);
      }
    }
  }

  notifyAuthChange(user) {
    this.authListeners.forEach(cb => {
      try { cb(user); } catch (e) {}
    });
  }

  onStatusChange(callback) {
    if (typeof callback === 'function') {
      this.statusListeners.push(callback);
      callback(this.getStatus());
    }
  }

  notifyStatusChange() {
    const status = this.getStatus();
    this.statusListeners.forEach(cb => {
      try { cb(status); } catch (e) {}
    });
  }

  getStatus() {
    return {
      status: this.status,
      isAuthenticated: this.isAuthenticated(),
      currentUser: this.currentUser,
      userId: this.getUserId(),
      lastSync: localStorage.getItem(this.LAST_SYNC_KEY),
      lastError: this.lastError
    };
  }
}

// Global Singleton
window.firebaseService = new FirebaseServiceManager();
