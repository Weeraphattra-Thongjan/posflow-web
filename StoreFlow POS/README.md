# PosFlow — ระบบ POS ออนไลน์

เว็บแอป POS (Point of Sale) สำหรับร้านค้า สร้างด้วย **TanStack Start (React 19 + Vite)** + **Tailwind CSS v4** + **Lovable Cloud (Supabase)** สำหรับฐานข้อมูล/Auth

> ผู้สร้างเว็บ (Super Admin): `66160121@go.buu.ac.th` — มีสิทธิ์เพิ่ม/ลบผู้ดูแลคนอื่นได้เพียงคนเดียว

---

## 🧱 สแตกที่ใช้

| ชั้น | เทคโนโลยี |
|---|---|
| Frontend | React 19, TanStack Router (file-based), TanStack Query |
| Styling | Tailwind CSS v4 + design tokens (`src/styles.css`) ฟอนต์ IBM Plex Sans Thai / Prompt |
| Backend | Lovable Cloud (Supabase) — Postgres + Auth + RLS |
| Build | Vite 7, Bun |

---

## ✨ ฟีเจอร์หลัก

- 🏪 **หลายร้าน** — แต่ละบัญชีมีร้านของตัวเอง ข้อมูลแยกขาดด้วย RLS
- 🧾 **POS หน้าร้าน** — เลือกสินค้า ตะกร้า ส่วนลด ออกใบเสร็จ ตัดสต็อกอัตโนมัติ
- 📦 **จัดการสินค้า / หมวดหมู่ / โปรโมชั่น**
- 📊 **รายงาน / ประวัติการขาย**
- 👥 **พนักงาน** — เชิญพนักงานเข้าร้านผ่านระบบ invite
- 🛡 **แผงผู้ดูแลระบบ** — เฉพาะคนที่อยู่ใน `app_admins`
- 🎛 **ปรับแถบเมนูของร้าน** — เปิด/ปิดเมนูพื้นฐานได้เอง
- ⭐ **เมนูเฉพาะของร้าน (ใหม่)** — เพิ่มเมนูของตัวเองพร้อม **ไอคอน + เนื้อหา + ลิงก์ภายนอก** กดเข้าไปแก้ไขเนื้อหา/ลิงก์ในหน้านั้นได้เลย
- 🔑 **ลืมรหัสผ่าน / รีเซ็ตรหัสผ่าน** ผ่านอีเมล
- 🌐 **สลับภาษา ไทย/อังกฤษ**

---

## 📁 โครงสร้างโปรเจกต์

### `src/routes/` — หน้าเว็บทั้งหมด (file-based routing)

| ไฟล์ | URL | ทำหน้าที่ |
|---|---|---|
| `__root.tsx` | — | Root layout ครอบทุกหน้า โหลด Google Fonts, ตั้ง `<html>/<head>/<body>` |
| `index.tsx` | `/` | หน้า Landing — Hero + animated blobs + ปุ่ม CTA |
| `signin.tsx` | `/signin` | เข้าสู่ระบบเจ้าของร้าน (มีตรวจกรอกรหัสครบ + ลิงก์ลืมรหัสผ่าน) |
| `signup.tsx` | `/signup` | สมัครสมาชิกร้านค้าใหม่ |
| `forgot-password.tsx` | `/forgot-password` | ส่งอีเมลรีเซ็ตรหัสผ่าน |
| `reset-password.tsx` | `/reset-password` | ตั้งรหัสผ่านใหม่หลังคลิกลิงก์จากอีเมล |
| `login.tsx` / `admin-signin.tsx` | `/login`, `/admin-signin` | เข้าสู่ระบบผู้ดูแลระบบ — ตรวจจาก `app_admins` ถ้าไม่ใช่จะ sign out ทันที |
| `onboarding.tsx` | `/onboarding` | ตั้งค่าร้านครั้งแรก (ชื่อร้าน/slug) |
| `_app.tsx` | layout | Layout ของหลังบ้าน — ครอบด้วย `AuthProvider`, `StoreProvider`, `MenuPrefsProvider`, `AppSidebar`, `Header` |
| `_app/dashboard.tsx` | `/dashboard` | ภาพรวมร้าน + ปุ่ม "ปรับแถบเมนู" |
| `_app/pos.tsx` | `/pos` | หน้าขายหน้าร้าน |
| `_app/products.tsx` | `/products` | จัดการสินค้า |
| `_app/promotions.tsx` | `/promotions` | จัดการโปรโมชั่น |
| `_app/sales.tsx` | `/sales` | ประวัติการขาย |
| `_app/reports.tsx` | `/reports` | รายงานยอดขาย |
| `_app/staff.tsx` | `/staff` | จัดการพนักงาน |
| `_app/admin.tsx` | `/admin` | แผงผู้ดูแลระบบ — เห็นเฉพาะคนใน `app_admins` |
| `_app/custom.$id.tsx` | `/custom/:id` | **หน้าเมนูเฉพาะของร้าน** — แสดง/แก้ไขเนื้อหา + ลิงก์ภายนอก กดเปิดในแท็บใหม่ได้ |

### `src/components/`

| ไฟล์ | ทำหน้าที่ |
|---|---|
| `Header.tsx` | แถบบนสุด — โลโก้, สลับภาษา, Sign in/out |
| `AppSidebar.tsx` | เมนูข้าง — รวมเมนูพื้นฐาน + เมนูเฉพาะของร้าน (กลุ่ม "เมนูของร้าน") + เมนู Admin |
| `MenuSettingsDialog.tsx` | Dialog "ปรับแถบเมนูของร้าน" — toggle เมนูพื้นฐาน + CRUD เมนูเฉพาะ (label, icon, เนื้อหา, ลิงก์) |
| `SupportTicketDialog.tsx` | ส่งคำขอช่วยเหลือไปยัง `support_tickets` |
| `EmptyState.tsx` | กล่อง "ยังไม่มีข้อมูล" |
| `ui/*` | shadcn/ui components |

### `src/lib/`

| ไฟล์ | ทำหน้าที่ |
|---|---|
| `auth.tsx` | `AuthProvider` + `useAuth()` |
| `store-context.tsx` | โหลดร้านของ user ปัจจุบัน ถ้ายังไม่มีเด้งไป `/onboarding` |
| `menu-prefs.tsx` | อ่าน/เขียน `store_menu_settings` + CRUD `store_custom_menu_items` (label/icon/content/link) |
| `custom-icons.ts` | ชุดไอคอนที่ใช้เลือกในเมนูเฉพาะของร้าน |
| `i18n.tsx` | ระบบสองภาษา ไทย/อังกฤษ |
| `format.ts` | `thb()`, `fmtDateTime()` |
| `utils.ts` | `cn()` รวม Tailwind classes |

### `src/integrations/supabase/` (อย่าแก้เอง)

| ไฟล์ | ทำหน้าที่ |
|---|---|
| `client.ts` | Supabase client ฝั่ง browser |
| `client.server.ts` | Admin client (service role) ใช้ฝั่ง server เท่านั้น |
| `auth-middleware.ts` | `requireSupabaseAuth` สำหรับ server function |
| `auth-attacher.ts` | แนบ `Authorization: Bearer …` ให้ทุก server function อัตโนมัติ |
| `types.ts` | Type ของฐานข้อมูล (auto-generated) |

### `src/styles.css`
Design tokens แบบ `oklch` (สีหลัก deep slate blue + royal blue), gradient, shadow, animation `animate-blob` / `animate-float`, utility `.text-gradient`

### `supabase/migrations/` — สคีมาฐานข้อมูล
- `stores`, `categories`, `products`, `promotions`, `sales`, `sale_items` — ข้อมูลร้าน
- `store_members`, `staff_invites` — พนักงานและคำเชิญ
- `app_admins` — ผู้ดูแลระบบ
- `store_menu_settings` — เก็บเมนูที่ซ่อนของแต่ละร้าน
- `store_custom_menu_items` — เมนูเฉพาะของร้าน (`label`, `icon`, `content`, `link`)
- `support_tickets` — คำขอช่วยเหลือ
- ทุกตารางเปิด **RLS** + `GRANT` ให้ `authenticated`

---

## 🔐 ระบบสิทธิ์และความปลอดภัย

1. **Auth** — Supabase Auth (อีเมล + รหัสผ่าน) + ลิงก์รีเซ็ตรหัสผ่านทางอีเมล
2. **Row Level Security** — เปิดทุกตาราง
   - `is_store_member(store_id, uid)` ใช้ตรวจสิทธิ์ในร้าน
   - `is_store_owner(store_id, uid)` ใช้ตรวจสิทธิ์เจ้าของร้าน
   - `is_app_admin(uid)` / `is_super_admin(uid)` สำหรับผู้ดูแลระบบ
3. **UPDATE policies ทุกตัวมี `WITH CHECK`** — กันการย้ายข้อมูลข้ามร้าน (categories, products, promotions, staff_invites, stores)
4. **`stores` UPDATE** — กันการโอนกรรมสิทธิ์ร้านไปยังผู้ใช้อื่นโดยไม่ตั้งใจ
5. **Admin** — ต้องอยู่ใน `app_admins` เท่านั้น คนแรกคือ `66160121@go.buu.ac.th` (ใส่อัตโนมัติผ่าน trigger `handle_new_user`)

ผ่าน security scan ระดับ Critical/Warning ครบทุกข้อแล้ว ✅

---

## 🚀 รันโปรเจกต์

```bash
bun install
bun run dev      # dev server
bun run build    # production build
```

Lovable Cloud (Supabase) ตั้งค่าให้อัตโนมัติ — ไม่ต้องสร้างโปรเจกต์เอง
