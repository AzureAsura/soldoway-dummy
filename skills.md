# Soldoway V2 — Complete Technical & Business Reference

## 1. Apa itu Soldoway?

Soldoway adalah **decentralized B2B sales rewards marketplace** yang berjalan di blockchain Solana (Devnet). Platform ini menghubungkan dua pihak:

- **Business** — perusahaan yang ingin memperluas pipeline penjualan. Mereka deposit SOL ke escrow untuk mendanai campaign, dan hanya membayar ketika sales rep berhasil deliver meeting prospek yang di-approve.
- **Sales Rep** — individu yang mencari & menjalankan meeting dengan prospek bisnis, kemudian mendapatkan reward SOL otomatis setiap meeting di-approve.

**Tagline:** "Scalable Sales. Programmable Payouts." — reward sales otomatis, on-chain, trustless.

---

## 2. Business Model & Revenue

### Sumber Pendapatan Tunggal: Platform Take-Rate
Platform mengambil **5% dari setiap payout** yang berhasil (meeting di-approve).

```
Reward per meeting: 1 SOL
├── Sales rep terima:   0.95 SOL  (95%)
├── Platform terima:    0.05 SOL  (5%)  ← revenue Soldoway
└── (jika rep punya referrer: platform 0.04 SOL + referrer 0.01 SOL)
```

- Fee rate default: `NEXT_PUBLIC_PLATFORM_FEE_RATE=0.05` (configurable via env)
- Referrer dapat 20% dari fee platform = 1% net (`NEXT_PUBLIC_REFERRER_SHARE_OF_FEE=0.2`)
- **Tanpa referrer:** platform 5%, rep 95%
- **Dengan referrer:** platform 4%, referrer 1%, rep 95%
- Platform wallet: `PLATFORM_WALLET_ADDRESS` (env)
- Revenue dicatat di tabel DB: `PlatformRevenue`

### Model ini disebut Commission/Take-Rate Model
Mirip Upwork (5–20%), Fiverr (20%), Tokopedia (1.8–5.5%). Platform tidak untung dari listing, subscription, atau token — hanya dari **transaksi yang berhasil**.

### Gas Fee
Platform menanggung semua gas fee Solana untuk payout/claim/withdraw (~0.000005 SOL per tx, sangat murah). User hanya bayar gas untuk deposit awal saat create campaign. Ini jadi selling point: **gasless untuk sales reps**.

### Yield (MOCK — belum asli)
Business melihat estimasi yield 5% APY dari dana escrow mereka. Ini **simulasi off-chain** (`MOCK_APY = 0.05` di `lib/yield.ts`), dibayar dari server wallet. Integrasi Kamino/Marinade (yield asli) sudah dirancang tapi belum diimplementasi (kode CPI di-comment out di Anchor program).

---

## 3. Tech Stack

| Layer | Teknologi |
|---|---|
| Frontend | Next.js 16.2.4 (App Router), React 19, Tailwind CSS 4, shadcn/ui |
| Auth & Wallet | Privy (`@privy-io/react-auth` v3.29.2) — social + wallet login |
| Blockchain | Solana Devnet, Anchor 0.32.1, `@solana/web3.js` |
| Database | PostgreSQL via Supabase, Prisma ORM v5.22.0 |
| State Management | Zustand, TanStack React Query |
| Meeting Scheduling | Cal.com API v2 |
| RPC | Helius (`NEXT_PUBLIC_SOLANA_RPC_URL`) |
| Animation | Framer Motion, Embla Carousel |
| Monitoring | Sentry (DSN dikonfigurasi tapi kosong) |

---

## 4. Arsitektur Sistem

### Alur Uang (Devnet)
```
1. Business create campaign
   → deposit SOL ke SERVER WALLET (bukan PDA asli — Devnet simplification)
   → DB: Campaign record dibuat dengan escrow_pda = server wallet address

2. Sales rep submit meeting
   → Cal.com booking dibuat otomatis
   → DB: Meeting record PENDING

3. Business approve meeting
   → Server wallet mengirim SOL ke rep (95%), platform (5%)
   → DB: Payout SUCCESS, PlatformRevenue dibuat, Campaign budget_used naik

4. Business withdraw sisa escrow
   → Server wallet mengirim remaining SOL + mock yield ke business
   → DB: Withdrawal dibuat, Campaign status WITHDRAWN

5. Sales rep claim (opsional, jika payout masih PENDING)
   → Server wallet mengirim semua pending payout sekaligus
```

### Server-Side Custody Architecture
Semua transfer SOL ditandatangani oleh satu **server keypair** (`SERVER_WALLET_PRIVATE_KEY`). Ini berarti:
- Bukan fully trustless (server wallet = single point of trust)
- Payout "gasless" untuk semua user
- Escrow di Devnet adalah server wallet itu sendiri (business deposit langsung ke server wallet)

### Anchor Smart Contract (lib.rs)
Program ID: `23PYHRCqLf7iZ7meK7DKB8bpfTKpNweXCVvc9V5SyHEn`

4 instructions yang sudah ditulis tapi **belum fully wired ke live flow**:
- `create_campaign` — deposit ke PDA escrow
- `approve_payout` — transfer dari PDA ke sales wallet
- `claim` — klaim akumulasi reward
- `withdraw_escrow` — withdraw sisa + yield

Di Devnet, flow aktual menggunakan `SystemProgram.transfer` langsung dari server wallet, bukan melalui Anchor program. Anchor program sudah ada untuk roadmap mainnet.

---

## 5. Database Schema (Prisma)

```
User
├── id (Privy DID)
├── wallet_address (unique)
├── role: BUSINESS | SALES
├── referral_code (= wallet_address)
├── referred_by → User

Campaign
├── business_id → User
├── reward_per_meeting (SOL)
├── meeting_capacity (auto-calculated = floor(budget_total / reward_per_meeting))
├── meetings_used
├── budget_total, budget_used
├── escrow_pda (= server wallet address di Devnet)
├── deposit_timestamp (untuk yield calculation)
├── status: ACTIVE | CLOSED | WITHDRAWN

Meeting
├── campaign_id → Campaign
├── sales_id → User
├── prospect_name, prospect_contact
├── scheduled_at, calendar_event_id (Cal.com)
├── status: PENDING | APPROVED | REJECTED
├── outcome: PRODUCTIVE | NOT_PRODUCTIVE

Payout
├── meeting_id → Meeting (unique)
├── amount (net SOL diterima rep, setelah fee)
├── status: PENDING | SUCCESS | FAILED

PlatformRevenue
├── meeting_id → Meeting (unique)
├── amount (platformCut dalam SOL)
├── tx_signature

ReferralReward
├── referrer_id, referred_id → User
├── meeting_id → Meeting
├── amount (referrerCut dalam SOL)

Withdrawal
├── campaign_id → Campaign
├── amount (SOL dikembalikan ke business)
```

---

## 6. API Routes

| Route | Method | Fungsi |
|---|---|---|
| `/api/auth/onboard` | POST | Upsert user, set role, resolve referral |
| `/api/users/me` | GET | Get current user by Privy ID |
| `/api/campaigns` | GET/POST | List active campaigns / create campaign |
| `/api/campaigns/[id]` | GET/PATCH/DELETE | Detail campaign |
| `/api/meetings` | GET/POST | List meetings / submit meeting + Cal.com booking |
| `/api/meetings/[id]` | GET/PATCH/DELETE | Detail / reject / delete + cancel Cal.com |
| `/api/payout` | POST | Business approve meeting → SOL payout |
| `/api/claim` | POST | Sales rep claim semua pending payout |
| `/api/withdraw` | POST | Business withdraw sisa escrow + mock yield |
| `/api/referrals` | GET | Stats referral (users referred + rewards) |

---

## 7. Halaman & User Flow

### Public
- `/` — Landing page (marketing, login via Privy)
- `/ref/[wallet-address]` — Referral landing, simpan referral_code ke localStorage

### Onboarding
- `/onboarding` — Pilih role: BUSINESS atau SALES (irreversible)

### Business Flow
1. `/dashboard/business` — Overview campaigns, pending meetings, escrow status
2. `/campaigns/new` — Buat campaign: isi reward, deposit, capacity auto-calc
3. `/campaigns/[id]` — Approve/reject meetings, lihat progress, withdraw escrow

### Sales Flow
1. `/dashboard/sales` — Overview earnings, claimable rewards, claim button
2. `/tasks` — Browse active campaigns
3. `/tasks/[id]` — Submit meeting ke campaign
4. `/dashboard/sales/referral` — Referral link & stats

---

## 8. Wallet Integration (Privy)

Konfigurasi di `app/components/providers.tsx`:
- **Login method:** wallet only (Phantom & Solflare) — tidak ada email/Google
- **Theme:** light
- **Embedded wallet:** dibuat otomatis untuk user tanpa wallet (`createOnLogin: "users-without-wallets"`) — sudah tidak relevan karena login-nya wallet-only
- **External wallet priority:** Phantom untuk deposit (business), embedded wallet Privy untuk receive payout (sales)

**Penting:** Selalu gunakan `useWallets()` Phantom-first untuk address/balance display, bukan Privy embedded wallet.

---

## 9. Folder Structure

```
soldoway-tes/
├── app/                          # Next.js App Router — routes only
│   ├── api/                      # API routes (server-side handlers)
│   │   ├── auth/onboard/         # Onboarding user
│   │   ├── campaigns/[id]/       # Campaign CRUD
│   │   ├── meetings/[id]/        # Meeting + Cal.com
│   │   ├── payout/               # Approve meeting → SOL transfer
│   │   ├── claim/                # Sales rep claim rewards
│   │   ├── withdraw/             # Business withdraw escrow
│   │   ├── referrals/            # Referral stats
│   │   └── users/me/             # Current user
│   ├── campaigns/                # Business: create & manage campaigns
│   ├── dashboard/                # Role-based dashboards
│   │   ├── business/
│   │   └── sales/referral/
│   ├── meetings/[id]/            # Meeting detail (deprecated redirect)
│   ├── onboarding/               # Role selection
│   ├── ref/[wallet-address]/     # Referral landing
│   ├── tasks/                    # Sales: browse & submit to campaigns
│   ├── home-client.tsx           # Landing page client component
│   ├── page.tsx                  # Landing page (/)
│   ├── layout.tsx                # Root layout (Providers + Navbar)
│   └── globals.css
│
├── components/                   # All React components
│   ├── ui/                       # shadcn/ui primitives (Button, Carousel, etc.)
│   ├── layout/                   # App-wide layout components
│   │   ├── auth-guard.tsx        # Route protection
│   │   ├── client-only.tsx       # SSR guard wrapper
│   │   ├── navbar.tsx            # Top navigation
│   │   ├── providers.tsx         # Privy + ReactQuery + Toaster
│   │   └── sidebar-layout.tsx    # Sidebar layout for dashboard pages
│   └── landing/                  # Landing page section components
│       ├── Core.tsx
│       ├── EfficiencyGap.tsx
│       ├── FAQ.tsx
│       ├── FeatureCarousel.tsx
│       ├── FloatingLogo.tsx
│       ├── LiveYieldCounter.tsx
│       └── SoldowayCycle.tsx
│
├── hooks/                        # React custom hooks
│   ├── use-campaigns.ts
│   ├── use-meetings.ts
│   ├── use-tasks.ts
│   └── use-wallet-balance.ts
│
├── lib/                          # Shared utilities & server helpers
│   ├── fees.ts                   # computePayoutSplit — fee calculation
│   ├── yield.ts                  # calculateMockYield — 5% APY simulation
│   ├── solana.ts                 # Solana connection & PDA helpers
│   ├── prisma.ts                 # Prisma client singleton
│   ├── api.ts                    # API helpers
│   └── utils.ts                  # cn() and misc utilities
│
├── stores/                       # Zustand global state
│   └── app-store.ts
│
├── types/                        # TypeScript type definitions
│   └── index.ts
│
├── prisma/                       # Database
│   └── schema.prisma
│
├── scripts/                      # Devnet utility scripts
│   ├── airdrop.js                # Top up server wallet (devnet)
│   ├── check-balance.js          # Check server wallet balance
│   ├── test-privy.js
│   ├── test-privy-sign.js
│   ├── test-privy-types.js
│   └── test-types.js
│
├── anchor/                       # Solana smart contract (Rust/Anchor)
│   └── programs/soldoway/src/lib.rs
│
├── public/                       # Static assets
├── empty-module.js               # Node.js stub for browser bundle (next.config.ts)
├── next.config.ts
├── tsconfig.json
└── .env
```

---

## 10. File Penting

| File | Fungsi |
|---|---|
| `lib/fees.ts` | `computePayoutSplit()` — kalkulasi fee split platform/referrer/rep |
| `lib/yield.ts` | `calculateMockYield()` — simulasi 5% APY |
| `lib/solana.ts` | Koneksi Solana, program ID, helper PDA |
| `lib/prisma.ts` | Prisma client singleton |
| `app/api/payout/route.ts` | Core business logic: approve meeting + distribute SOL |
| `app/api/withdraw/route.ts` | Withdraw escrow + mock yield |
| `anchor/programs/soldoway/src/lib.rs` | Anchor smart contract (belum fully wired) |
| `prisma/schema.prisma` | Database schema lengkap |
| `components/layout/providers.tsx` | Privy config — login method, theme, wallet list |
| `.env` | Semua secret — Privy, Supabase, Helius, Cal.com, server wallet key |

---

## 11. Environment Variables

```env
# Database
DATABASE_URL                        # Supabase PostgreSQL (pooled)
DIRECT_URL                          # Supabase PostgreSQL (direct)

# Auth
NEXT_PUBLIC_PRIVY_APP_ID            # Privy app ID (public)
PRIVY_APP_SECRET                    # Privy secret (server only)

# Solana
NEXT_PUBLIC_SOLANA_NETWORK=devnet
NEXT_PUBLIC_SOLANA_RPC_URL          # Helius RPC endpoint
NEXT_PUBLIC_PROGRAM_ID              # Anchor program ID
NEXT_PUBLIC_SERVER_WALLET_ADDRESS   # Server wallet pubkey (untuk deposit target)
SERVER_WALLET_PRIVATE_KEY           # Server wallet private key (byte array JSON)

# Revenue
PLATFORM_WALLET_ADDRESS             # Wallet penerima platform fee
NEXT_PUBLIC_PLATFORM_FEE_RATE=0.05  # Take-rate (5%)
NEXT_PUBLIC_REFERRER_SHARE_OF_FEE=0.2  # Referrer share dari fee (20%)

# Cal.com
CAL_API_KEY
CAL_EVENT_TYPE_ID
CAL_EVENT_TYPE_SLUG
CAL_USERNAME
```

---

## 12. Known Issues & Roadmap

| Issue | Status | Impact |
|---|---|---|
| Escrow adalah server wallet, bukan PDA asli | Devnet only — aman untuk demo | Perlu fix sebelum mainnet |
| Yield 5% APY adalah simulasi | Mock — dibayar dari server wallet | Perlu integrasi Kamino/Marinade |
| Platform fee di bawah rent-exempt min tidak dikirim on-chain | Dicatat di DB saja | Berlaku untuk reward < ~0.018 SOL |
| `server-wallet.json` dan `.env` ter-commit | Security risk | Rotate semua keys sebelum mainnet |
| Anchor program belum wired ke live flow | Devnet simplification | Implement CPI sebelum mainnet |

---

## 13. Cara Menjalankan

```bash
# Install dependencies
npm install

# Setup database
npx prisma db push
npx prisma generate

# Jalankan dev server
npm run dev

# Cek / top-up server wallet (devnet)
node check_balance.js
node airdrop.js  # atau gunakan https://faucet.solana.com
# Server wallet address: 9PKXJ2W7MVn2xDVShkWcxYdDh9MZnZ51UngrKC3EiBd4
```

---

## 14. Cek Revenue Platform

```sql
-- Total revenue platform
SELECT SUM(amount) AS total_sol FROM "PlatformRevenue";

-- Revenue per meeting
SELECT pr.meeting_id, pr.amount, pr.created_at
FROM "PlatformRevenue" pr
ORDER BY pr.created_at DESC;
```
