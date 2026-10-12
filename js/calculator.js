// Modul Kalkulator & Logika Finansial untuk Smart Grocery & Budget Safety Tracker
// Menangani F-02 (Perhitungan Kuantitas), F-03 (Diskon Bertingkat), F-04 (Komparator Harga), F-05 (Safety Cap)

const Calculator = {
  /**
   * Format angka ke format Rupiah standar (contoh: "Rp 25.000")
   */
  formatRupiah(amount) {
    if (amount === undefined || amount === null || isNaN(amount)) return 'Rp 0';
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(Math.round(amount));
  },

  /**
   * Parse input angka dari string (membersihkan titik, koma, spasi, Rp)
   */
  parseNumber(str) {
    if (typeof str === 'number') return str;
    if (!str) return 0;
    const clean = str.toString().replace(/[^0-9.-]/g, '');
    const num = parseFloat(clean);
    return isNaN(num) ? 0 : num;
  },

  /**
   * F-03: Kalkulator Diskon Bertingkat (Single / Tiered / Stacked Discount)
   * Mendukung:
   * 1. Persen tunggal: "25" atau "25%"
   * 2. Nominal langsung: "5000" atau "Rp 5.000"
   * 3. Diskon bertingkat/bertumpuk: "50% + 20%", "50+20", "30+10+5"
   * 
   * Rumus Matematis:
   * Harga setelah D1 = P * (1 - d1/100)
   * Harga setelah D2 = P1 * (1 - d2/100) ... dst.
   * Potongan Total = P - Harga Akhir
   */
  calculateTieredDiscount(basePrice, discountInput) {
    const price = Math.max(0, this.parseNumber(basePrice));
    if (!discountInput || price === 0) {
      return {
        finalUnitPrice: price,
        totalSavingsPerUnit: 0,
        effectiveDiscountPercent: 0,
        tiers: [],
        breakdownText: 'Tanpa Diskon',
        hasDiscount: false,
        rawInput: discountInput || ''
      };
    }

    const inputStr = discountInput.toString().trim();

    // Cek apakah diskon adalah nominal langsung (contoh: ada kata "Rp" atau angka murni tanpa "%" dan > 100)
    // Jika mengandung tanda '+', ini bertingkat persen
    const isStacked = inputStr.includes('+');
    const hasPercent = inputStr.includes('%');

    // Nominal murni jika tanpa % dan angka > 100 dan bukan bertingkat
    const pureNominal = !hasPercent && !isStacked && this.parseNumber(inputStr) > 100;

    if (pureNominal) {
      const nominalCut = Math.min(price, this.parseNumber(inputStr));
      const finalPrice = Math.max(0, price - nominalCut);
      const effectivePct = price > 0 ? (nominalCut / price) * 100 : 0;
      return {
        finalUnitPrice: finalPrice,
        totalSavingsPerUnit: nominalCut,
        effectiveDiscountPercent: Math.round(effectivePct),
        tiers: [{ type: 'nominal', value: nominalCut, cut: nominalCut, priceAfter: finalPrice }],
        breakdownText: `Potongan ${this.formatRupiah(nominalCut)} (Hemat ${Math.round(effectivePct)}%)`,
        hasDiscount: nominalCut > 0,
        rawInput: inputStr
      };
    }

    // Parse tiers persen (contoh "50 + 20" atau "50% + 20%")
    const tierTokens = inputStr.split('+').map(t => this.parseNumber(t.replace('%', '').trim()));
    const validTiers = tierTokens.filter(t => t > 0);

    if (validTiers.length === 0) {
      return {
        finalUnitPrice: price,
        totalSavingsPerUnit: 0,
        effectiveDiscountPercent: 0,
        tiers: [],
        breakdownText: 'Tanpa Diskon',
        hasDiscount: false,
        rawInput: inputStr
      };
    }

    let currentPrice = price;
    const tierDetails = [];

    validTiers.forEach((pct, index) => {
      const clampedPct = Math.min(100, Math.max(0, pct));
      const cut = currentPrice * (clampedPct / 100);
      const priceAfter = Math.max(0, currentPrice - cut);
      tierDetails.push({
        tierIndex: index + 1,
        percent: clampedPct,
        cut: cut,
        priceBefore: currentPrice,
        priceAfter: priceAfter
      });
      currentPrice = priceAfter;
    });

    const finalUnitPrice = currentPrice;
    const totalSavingsPerUnit = price - finalUnitPrice;
    const effectiveDiscountPercent = price > 0 ? ((totalSavingsPerUnit / price) * 100) : 0;

    // Buat penjelasan langkah matematis
    let breakdownText = '';
    if (tierDetails.length === 1) {
      breakdownText = `Diskon ${tierDetails[0].percent}% (-${this.formatRupiah(totalSavingsPerUnit)})`;
    } else {
      const tierParts = tierDetails.map(t => `${t.percent}%`).join(' + ');
      breakdownText = `Disc Bertingkat (${tierParts}) ➔ Hemat ${this.formatRupiah(totalSavingsPerUnit)} (Efektif ${effectiveDiscountPercent.toFixed(1)}%)`;
    }

    return {
      finalUnitPrice: Math.round(finalUnitPrice),
      totalSavingsPerUnit: Math.round(totalSavingsPerUnit),
      effectiveDiscountPercent: parseFloat(effectiveDiscountPercent.toFixed(1)),
      tiers: tierDetails,
      breakdownText: breakdownText,
      hasDiscount: totalSavingsPerUnit > 0,
      rawInput: inputStr
    };
  },

  /**
   * F-02: Perhitungan Item Baris Otomatis
   * Subtotal = Qty * FinalUnitPrice
   */
  calculateItemTotals(item) {
    const qty = Math.max(0.01, this.parseNumber(item.qty || 1));
    const unitPrice = Math.max(0, this.parseNumber(item.unitPrice || 0));
    const discountInfo = this.calculateTieredDiscount(unitPrice, item.discount);

    const normalLineTotal = Math.round(qty * unitPrice);
    const finalLineTotal = Math.round(qty * discountInfo.finalUnitPrice);
    const totalLineSavings = normalLineTotal - finalLineTotal;

    return {
      qty,
      unitPrice,
      discountInfo,
      normalLineTotal,
      finalLineTotal,
      totalLineSavings
    };
  },

  /**
   * F-04: Komparator Harga Realtime vs Bulan Lalu
   * Menghasilkan status: 'up' (merah naik), 'down' (hijau turun), 'equal' (stabil), 'new' (produk baru)
   */
  comparePrice(currentPrice, lastMonthPrice) {
    const curr = Math.max(0, this.parseNumber(currentPrice));
    
    if (lastMonthPrice === undefined || lastMonthPrice === null || lastMonthPrice <= 0) {
      return {
        status: 'new',
        symbol: '★',
        label: 'Produk Baru',
        diffNominal: 0,
        diffPercent: 0,
        badgeClass: 'badge-new',
        tooltip: 'Belum ada data belanja bulan lalu'
      };
    }

    const last = this.parseNumber(lastMonthPrice);
    const diff = curr - last;
    const diffPercent = last > 0 ? (Math.abs(diff) / last) * 100 : 0;

    if (diff > 0) {
      return {
        status: 'up',
        symbol: '↑',
        label: `Naik +${this.formatRupiah(diff)}`,
        diffNominal: diff,
        diffPercent: parseFloat(diffPercent.toFixed(1)),
        badgeClass: 'badge-price-up',
        tooltip: `Naik Rp ${diff.toLocaleString('id-ID')} (+${diffPercent.toFixed(1)}%) dibanding bulan lalu (${this.formatRupiah(last)})`
      };
    } else if (diff < 0) {
      const drop = Math.abs(diff);
      return {
        status: 'down',
        symbol: '↓',
        label: `Turun -${this.formatRupiah(drop)}`,
        diffNominal: -drop,
        diffPercent: parseFloat(diffPercent.toFixed(1)),
        badgeClass: 'badge-price-down',
        tooltip: `Turun Rp ${drop.toLocaleString('id-ID')} (-${diffPercent.toFixed(1)}%) dibanding bulan lalu (${this.formatRupiah(last)}) - Lebih Hemat!`
      };
    } else {
      return {
        status: 'equal',
        symbol: '=',
        label: 'Stabil',
        diffNominal: 0,
        diffPercent: 0,
        badgeClass: 'badge-price-equal',
        tooltip: `Harga sama persis dengan bulan lalu (${this.formatRupiah(last)})`
      };
    }
  },

  /**
   * F-05: Pengendali Anggaran (Safety Cap)
   * Menghitung persentase dompet, sisa saldo, dan level status
   * - safe (< 80%): Hijau/Emerald
   * - warning (80% - 99%): Kuning/Amber
   * - danger (>= 100%): Merah Menyala/Crimson Over-budget!
   */
  evaluateBudgetSafety(totalCart, budgetCap) {
    const total = Math.max(0, this.parseNumber(totalCart));
    const cap = Math.max(1, this.parseNumber(budgetCap || 500000));
    const remaining = cap - total;
    const ratio = total / cap;
    const percent = Math.min(200, Math.round(ratio * 100)); // Cap visual max 200%

    let status = 'safe';
    let statusText = 'Aman Terkendali';
    let alertClass = 'status-safe';
    let message = `Sisa dompet masih ${this.formatRupiah(remaining)}`;

    if (ratio >= 1.0) {
      status = 'danger';
      statusText = '🚨 OVER BUDGET!';
      alertClass = 'status-danger';
      const over = total - cap;
      message = `Melebihi batas dompet ${this.formatRupiah(over)}! Segera sortir barang.`;
    } else if (ratio >= 0.80) {
      status = 'warning';
      statusText = '⚠️ Waspada Limit';
      alertClass = 'status-warning';
      message = `Mendekati batas maksimal! Tersisa ${this.formatRupiah(remaining)}`;
    }

    return {
      total,
      budgetCap: cap,
      remaining,
      percent,
      status,
      statusText,
      alertClass,
      message,
      isOverBudget: ratio >= 1.0
    };
  }
};

window.Calculator = Calculator;
