# Soldoway V2 — Development Report

**Tanggal:** 11 Juni 2026
**Session:** Analisis bisnis + implementasi revenue model + bug fixes

---

## Ringkasan Sesi

Sesi ini dimulai dengan analisis menyeluruh codebase (business model, tech stack, revenue), kemudian dilanjutkan dengan implementasi revenue model yang benar, perbaikan bug kritis, dan sejumlah improvement UX.

---

## Perubahan yang Dilakukan

### 1. Analisis Bisnis & Revenue Model (Discovery)
**Temuan awal:**
- App belum punya revenue yang nyata — platform fee hanya ditarik kalau sales rep punya referrer, dan setengahnya diberikan balik ke referrer
- Majority payout (rep tanpa referrer) menghasilkan Rp0 untuk platform
- Yield 5% APY adalah simulasi (mock), dibayar dari server wallet bukan real staking
- Escrow adalah throwaway `Keypair.generate()` — uang deposit business hilang ke address acak, bukan masuk ke server wallet
- `server-wallet.json` dan `.env` berisi private key yang ter-commit ke repo

---

### 2. Implementasi Platform Take-Rate (Revenue Model)
**File yang dibuat/diubah:**

#### `lib/fees.ts` *(file baru)*
- Helper `computePayoutSplit(reward, hasReferrer)` sebagai single source of truth
- Constants: `PLATFORM_FEE_RATE` (default 5%), `REFERRER_SHARE_OF_FEE` (default 20% dari fee)
- Digunakan oleh API route dan UI components

#### `prisma/schema.prisma`
- Tambah model `PlatformRevenue` untuk mencatat revenue platform per payout
- Tambah field `platform_revenue` pada model `Meeting`
- Jalankan `prisma db push` → tabel terbuat di Supabase

#### `app/api/payout/route.ts`
- **Sebelum:** fee hanya ditarik saat rep punya referrer (`if salesUser.referrer`)
- **Sesudah:** fee 5% ditarik dari SETIAP payout
- Pembagian: platform selalu dapat 4–5%, referrer dapat 1% (hanya jika ada)
- Tambah pencatatan `PlatformRevenue` ke DB transaction
- Bug fix: platform transfer sebelumnya salah kirim `referrerBonus` (1%) bukan `platformFee` (2%)

#### `.env`
- Tambah `NEXT_PUBLIC_PLATFORM_FEE_RATE=0.05`
- Tambah `NEXT_PUBLIC_REFERRER_SHARE_OF_FEE=0.2`

#### `app/campaigns/[id]/page.tsx`
- Import `PLATFORM_FEE_RATE` dari `lib/fees`
- Stat card "Reward / Meeting" menampilkan net amount: *"Rep nets X SOL after 5% fee"*

#### `app/dashboard/sales/page.tsx`
- Import `PLATFORM_FEE_RATE`
- Approved meeting reward menampilkan note: *"after 5% platform fee"*

**Hasil:** Platform fee 5% berlaku di setiap payout. Tanpa referrer → platform 5%. Dengan referrer → platform 4%, referrer 1%. Rep selalu terima 95%.

---

### 3. Meeting Capacity Auto-Calculate
**File:** `app/campaigns/new/page.tsx`

**Sebelum:** 3 input manual — reward per meeting, meeting capacity, total budget

**Sesudah:** 2 input — reward per meeting + total deposit. Meeting capacity auto-calculate:
```
meeting_capacity = floor(budget_total / reward_per_meeting)
```

- `meeting_capacity` dihapus dari form state, jadi derived value
- Tampil sebagai read-only display box (hitam jika valid, abu jika kosong)
- Menampilkan formula: `0.5 SOL × 20 = 10 SOL`
- Validasi disederhanakan: `budget >= reward` (minimal 1 meeting)

---

### 4. Privy Login: Light Theme + Wallet Only
**File:** `app/components/providers.tsx`

| Setting | Sebelum | Sesudah |
|---|---|---|
| `loginMethods` | `["email", "google", "wallet"]` | `["wallet"]` |
| `theme` | `"dark"` | `"light"` |

Login popup sekarang hanya tampilkan Phantom & Solflare, tidak ada Google/email.

---

### 5. Update Privy ke Versi Terbaru
**Package:** `@privy-io/react-auth`

| | Versi |
|---|---|
| Sebelum | `^3.23.1` |
| Sesudah | `^3.29.2` |

Fix: error console `Each child in a list should have a unique "key" prop` yang muncul dari internal Privy.

---

### 6. Fix Escrow Architecture (Critical Bug)
**File:** `app/campaigns/new/page.tsx`, `.env`

**Masalah:** Business deposit SOL ke `Keypair.generate()` acak (private key dibuang), sehingga server wallet tidak pernah menerima dana. Server wallet terus keluar uang untuk payout tanpa pernah terisi dari deposit.

**Fix:**
- Deposit diarahkan ke `NEXT_PUBLIC_SERVER_WALLET_ADDRESS` (server wallet)
- Tambah `NEXT_PUBLIC_SERVER_WALLET_ADDRESS=9PKXJ2W7MVn2xDVShkWcxYdDh9MZnZ51UngrKC3EiBd4` ke `.env`
- Import `Keypair` dihapus dari dynamic import (tidak lagi dipakai)

**Hasil:** Setiap business create campaign → server wallet bertambah sesuai deposit → payout tidak kekurangan dana.

---

### 7. Fix Payout: Rent-Exempt Minimum Check
**File:** `app/api/payout/route.ts`

**Error:** `Transaction simulation failed: Transaction results in an account (2) with insufficient funds for rent`

**Penyebab:** Solana mewajibkan setiap account punya minimum ~0.00089 SOL (890880 lamports) untuk rent-exempt. Platform wallet yang masih kosong + menerima fee kecil (misal 0.00005 SOL) → di bawah minimum → tx ditolak.

**Fix:**
- Sebelum kirim ke platform wallet → cek balance dahulu
- Jika `balance + fee < 890880 lamports` → skip on-chain transfer, tetap catat di `PlatformRevenue` DB
- Hal yang sama untuk referrer wallet
- Untuk sales wallet → jika di bawah minimum, bump ke minimum agar tx tidak gagal

**Implikasi bisnis:** Platform fee untuk reward sangat kecil (< ~0.018 SOL) dicatat di DB tapi belum dikirim on-chain. Akan dikirim begitu platform wallet sudah punya saldo awal.

---

## Ringkasan File yang Diubah

| File | Jenis Perubahan |
|---|---|
| `lib/fees.ts` | Baru — fee calculation helper |
| `prisma/schema.prisma` | Update — tambah `PlatformRevenue` model |
| `app/api/payout/route.ts` | Update major — revenue model + rent-exempt fix |
| `app/campaigns/new/page.tsx` | Update — auto-calc capacity + fix escrow target |
| `app/components/providers.tsx` | Update — Privy light theme + wallet-only login |
| `app/campaigns/[id]/page.tsx` | Update — tampilkan net fee di UI |
| `app/dashboard/sales/page.tsx` | Update — tampilkan fee note di approved reward |
| `.env` | Update — tambah 3 env vars baru |
| `package.json` | Update — Privy 3.23.1 → 3.29.2 |

---

### 8. Folder Structure Refactor
**Tanggal:** 11 Juni 2026

Struktur folder dirapikan mengikuti konvensi advanced fullstack Next.js.

**Masalah sebelumnya:**
- Dua lokasi `components`: `app/components/` (layout) dan `components/` root (landing) — membingungkan
- Script devnet (`airdrop.js`, `check_balance.js`, test files) berserakan di root

**Perubahan:**

| Dari | Ke | Keterangan |
|---|---|---|
| `app/components/*.tsx` | `components/layout/` | auth-guard, client-only, navbar, providers, sidebar-layout |
| `components/Core.tsx` dll. | `components/landing/` | 7 landing page components |
| `airdrop.js`, `check_balance.js`, `test-*.js` | `scripts/` | Devnet utility scripts |
| `check_balance.js` | `scripts/check-balance.js` | Rename ke kebab-case |

`empty-module.js` tetap di root karena di-reference `next.config.ts` sebagai webpack/turbopack alias.

**Struktur akhir `components/`:**
```
components/
├── ui/         → shadcn/ui primitives (Button, Carousel)
├── layout/     → auth-guard, navbar, providers, sidebar-layout, client-only
└── landing/    → Core, FAQ, EfficiencyGap, FeatureCarousel, FloatingLogo, LiveYieldCounter, SoldowayCycle
```

Semua import paths diupdate otomatis via `sed`. TypeScript: 0 errors setelah refactor.

---

## Status Akhir Sesi

- Server wallet address: `9PKXJ2W7MVn2xDVShkWcxYdDh9MZnZ51UngrKC3EiBd4`
- Server wallet balance: ~10.92 SOL (devnet)
- Database: sync dengan schema terbaru via `prisma db push`
- TypeScript: 0 errors
- Payout flow: berhasil diuji ✓
