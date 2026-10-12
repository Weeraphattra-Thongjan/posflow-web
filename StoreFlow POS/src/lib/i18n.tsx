import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type Lang = "th" | "en";

type Dict = Record<string, { th: string; en: string }>;

const dict: Dict = {
  // Nav / common
  "nav.features": { th: "ฟีเจอร์", en: "Features" },
  "nav.pricing": { th: "ราคา", en: "Pricing" },
  "nav.signin": { th: "เข้าสู่ระบบ", en: "Sign in" },
  "nav.signup": { th: "สมัครใช้งาน", en: "Get started" },
  "common.save": { th: "บันทึก", en: "Save" },
  "common.cancel": { th: "ยกเลิก", en: "Cancel" },
  "common.delete": { th: "ลบ", en: "Delete" },
  "common.edit": { th: "แก้ไข", en: "Edit" },
  "common.add": { th: "เพิ่ม", en: "Add" },
  "common.search": { th: "ค้นหา", en: "Search" },
  "common.loading": { th: "กำลังโหลด...", en: "Loading..." },
  "common.empty": { th: "ยังไม่มีข้อมูล", en: "No data yet" },
  "common.confirm": { th: "ยืนยัน", en: "Confirm" },
  "common.menu": { th: "เมนู", en: "Menu" },
  "empty.dash.title": { th: "ยังไม่มีข้อมูลร้านของคุณ", en: "Your store is empty" },
  "empty.dash.desc": { th: "เริ่มต้นโดยเพิ่มสินค้าเข้าระบบ แล้วเปิดหน้า POS เพื่อเริ่มขายได้เลย", en: "Add your first product, then open POS to start selling." },
  "empty.dash.cta": { th: "เพิ่มสินค้าแรก", en: "Add first product" },
  "empty.pos.title": { th: "ยังไม่มีสินค้าให้ขาย", en: "No products to sell yet" },
  "empty.pos.desc": { th: "เพิ่มสินค้าของร้านคุณก่อน เพื่อให้แสดงในหน้า POS", en: "Add products first so they show up in POS." },
  "empty.pos.cta": { th: "ไปที่จัดการสินค้า", en: "Go to products" },
  "empty.prod.title": { th: "ยังไม่มีสินค้าในร้าน", en: "No products yet" },
  "empty.prod.desc": { th: "เริ่มสร้างคลังสินค้าของร้านคุณ เพิ่มชื่อ ราคา และจำนวนสต๊อก", en: "Build your catalog — add a name, price, and stock." },
  "empty.prod.cta": { th: "เพิ่มสินค้า", en: "Add product" },
  "empty.promo.title": { th: "ยังไม่มีโปรโมชั่น", en: "No promotions yet" },
  "empty.promo.desc": { th: "สร้างโค้ดส่วนลดให้ลูกค้าใช้ในหน้า POS", en: "Create discount codes for customers at checkout." },
  "empty.promo.cta": { th: "สร้างโปรโมชั่น", en: "Create promotion" },
  "empty.sales.title": { th: "ยังไม่มีประวัติการขาย", en: "No sales history yet" },
  "empty.sales.desc": { th: "เมื่อทำรายการขายในหน้า POS รายการจะแสดงที่นี่", en: "Sales recorded at POS will appear here." },
  "empty.sales.cta": { th: "เปิดหน้า POS", en: "Open POS" },
  "empty.rep.title": { th: "ยังไม่มีข้อมูลรายงาน", en: "No report data yet" },
  "empty.rep.desc": { th: "รายงานจะเริ่มนับยอดเมื่อมีรายการขายจริง", en: "Reports start counting after your first sale." },
  // Hero
  "hero.badge": { th: "POS ออนไลน์ สำหรับร้านค้ายุคใหม่", en: "Modern POS for retail" },
  "hero.title": { th: "ระบบ POS บนเว็บ ที่ร้านของคุณเปิดใช้เองได้ใน 1 นาที", en: "A web POS your store can launch in under a minute" },
  "hero.subtitle": { th: "สมัคร สร้างร้าน ขายของ ตัดสต๊อก และดูรายงาน — ครบในระบบเดียว ข้อมูลแต่ละร้านแยกขาดจากกันอย่างปลอดภัย", en: "Sign up, create your store, sell, sync stock, and read reports — all in one place." },
  "hero.cta.primary": { th: "เริ่มใช้งานฟรี", en: "Start free" },
  "hero.cta.secondary": { th: "ดูฟีเจอร์ทั้งหมด", en: "Explore features" },
  "features.title": { th: "ทุกอย่างที่ร้านค้าต้องการ", en: "Everything your store needs" },
  "features.subtitle": { th: "ออกแบบมาเพื่อร้านค้าปลีกขนาดเล็กถึงกลาง", en: "Built for small to mid-sized retailers." },
  "feat.pos.t": { th: "หน้า POS รวดเร็ว", en: "Lightning-fast POS" },
  "feat.pos.d": { th: "หน้าจอขายลื่น คลิกน้อย คิดเงินเร็ว", en: "Smooth checkout flow." },
  "feat.stock.t": { th: "ตัดสต๊อกอัตโนมัติ", en: "Auto stock sync" },
  "feat.stock.d": { th: "ขายแล้วตัดสต๊อกทันที", en: "Stock updates the moment a sale lands." },
  "feat.report.t": { th: "รายงานยอดขาย", en: "Sales reports" },
  "feat.report.d": { th: "รายวัน รายเดือน พร้อมกราฟสรุป", en: "Daily/monthly summaries with charts." },
  "feat.team.t": { th: "จัดการพนักงาน", en: "Team management" },
  "feat.team.d": { th: "เพิ่มพนักงาน กำหนดสิทธิ์", en: "Invite cashiers and control roles." },
  "feat.promo.t": { th: "โปรโมชั่น & คูปอง", en: "Promotions & coupons" },
  "feat.promo.d": { th: "สร้างส่วนลดอัตโนมัติ", en: "Create discounts and coupons." },
  "feat.secure.t": { th: "ข้อมูลแยกร้าน", en: "Per-store isolation" },
  "feat.secure.d": { th: "ร้าน A ไม่เห็นข้อมูลร้าน B", en: "Strict tenant isolation by design." },
  "cta.title": { th: "พร้อมเปิดร้านบนระบบใหม่หรือยัง?", en: "Ready to launch your new POS?" },
  "cta.subtitle": { th: "ใช้ฟรี ไม่ต้องใช้บัตรเครดิต", en: "Free to start — no credit card needed." },
  // Auth
  "auth.signin.title": { th: "ยินดีต้อนรับกลับ", en: "Welcome back" },
  "auth.signin.subtitle": { th: "เข้าสู่ระบบเพื่อจัดการร้านของคุณ", en: "Sign in to manage your store." },
  "auth.signup.title": { th: "สร้างบัญชีใหม่", en: "Create your account" },
  "auth.signup.subtitle": { th: "เริ่มใช้งานระบบ POS ได้ทันที", en: "Get your POS running in minutes." },
  "auth.email": { th: "อีเมล", en: "Email" },
  "auth.password": { th: "รหัสผ่าน", en: "Password" },
  "auth.fullname": { th: "ชื่อ-นามสกุล", en: "Full name" },
  "auth.signin.btn": { th: "เข้าสู่ระบบ", en: "Sign in" },
  "auth.signup.btn": { th: "สร้างบัญชี", en: "Create account" },
  "auth.have": { th: "มีบัญชีอยู่แล้ว?", en: "Already have an account?" },
  "auth.no": { th: "ยังไม่มีบัญชี?", en: "Don't have an account?" },
  "auth.forgot": { th: "ลืมรหัสผ่าน?", en: "Forgot password?" },
  "auth.password_required": { th: "กรุณากรอกรหัสผ่าน", en: "Please enter your password" },
  "auth.show_password": { th: "แสดงรหัสผ่าน", en: "Show password" },
  "auth.hide_password": { th: "ซ่อนรหัสผ่าน", en: "Hide password" },
  "auth.is_admin": { th: "เป็นผู้ดูแลระบบ?", en: "Are you an admin?" },
  "auth.admin_signin": { th: "เข้าสู่ระบบผู้ดูแล", en: "Admin sign in" },
  "auth.admin.title": { th: "เข้าสู่ระบบผู้ดูแลระบบ", en: "Admin sign in" },
  "auth.admin.subtitle": { th: "เฉพาะผู้ที่ได้รับอนุญาตจากผู้สร้างระบบเท่านั้น", en: "For authorized administrators only." },
  "auth.admin.btn": { th: "เข้าสู่ระบบผู้ดูแล", en: "Sign in as admin" },
  "auth.admin.is_owner": { th: "เป็นเจ้าของร้าน?", en: "Are you a store owner?" },
  "auth.admin.store_signin": { th: "เข้าสู่ระบบร้านค้า", en: "Store sign in" },
  "auth.admin.request": { th: "ต้องการสิทธิ์ผู้ดูแลระบบ? ติดต่อผู้สร้าง:", en: "Need admin access? Contact the creator:" },
  "auth.email_invalid": { th: "อีเมลไม่ถูกต้อง", en: "Invalid email" },
  "auth.admin.no_rights": { th: "บัญชีนี้ไม่มีสิทธิ์ผู้ดูแลระบบ ติดต่อผู้สร้างระบบ (66160121@go.buu.ac.th) เพื่อขอสิทธิ์", en: "This account has no admin rights. Contact the creator (66160121@go.buu.ac.th) to request access." },
  "auth.admin.success": { th: "เข้าสู่ระบบผู้ดูแลระบบสำเร็จ", en: "Admin sign in successful" },
  // Onboarding
  "onb.title": { th: "ตั้งค่าร้านของคุณ", en: "Set up your store" },
  "onb.subtitle": { th: "เพียงไม่กี่ข้อมูล แล้วเริ่มขายได้เลย", en: "Just a few details and you're ready." },
  "onb.name": { th: "ชื่อร้าน", en: "Store name" },
  "onb.slug": { th: "ชื่อ URL ร้าน", en: "Store URL" },
  "onb.desc": { th: "คำอธิบายร้าน (ไม่บังคับ)", en: "Description (optional)" },
  "onb.create": { th: "สร้างร้าน", en: "Create store" },
  // Sidebar
  "side.overview": { th: "ภาพรวม", en: "Overview" },
  "side.pos": { th: "หน้าขาย (POS)", en: "Point of Sale" },
  "side.products": { th: "จัดการสินค้า", en: "Products" },
  "side.promos": { th: "โปรโมชั่น", en: "Promotions" },
  "side.sales": { th: "ประวัติการขาย", en: "Sales history" },
  "side.reports": { th: "รายงาน", en: "Reports" },
  "side.staff": { th: "พนักงาน", en: "Staff" },
  "side.signout": { th: "ออกจากระบบ", en: "Sign out" },
  "side.owner": { th: "เจ้าของร้าน", en: "Owner" },
  "side.cashier": { th: "พนักงานขาย", en: "Cashier" },
  "side.store_menu": { th: "เมนูของร้าน", en: "Store menu" },
  // Dashboard
  "dash.welcome": { th: "สวัสดี", en: "Hi" },
  "dash.today_sales": { th: "ยอดขายวันนี้", en: "Today's sales" },
  "dash.total_sales": { th: "ยอดขายรวม", en: "Total sales" },
  "dash.total_products": { th: "สินค้าทั้งหมด", en: "Total products" },
  "dash.low_stock": { th: "สินค้าใกล้หมด", en: "Low stock" },
  "dash.orders_today": { th: "{n} รายการ", en: "{n} orders" },
  "dash.orders_total": { th: "{n} รายการทั้งหมด", en: "{n} total orders" },
  "dash.items_count": { th: "รายการสินค้า", en: "items" },
  "dash.below_threshold": { th: "ต่ำกว่าจุดเตือน", en: "below threshold" },
  "dash.quick.pos": { th: "เปิดหน้าขาย", en: "Open POS" },
  "dash.quick.pos.d": { th: "เริ่มขายสินค้าทันที", en: "Start selling now" },
  "dash.quick.add": { th: "เพิ่มสินค้า", en: "Add product" },
  "dash.quick.add.d": { th: "จัดการสินค้าและสต๊อก", en: "Manage products and stock" },
  "dash.quick.report": { th: "ดูรายงาน", en: "View reports" },
  "dash.quick.report.d": { th: "วิเคราะห์ยอดขาย", en: "Analyze your sales" },
  "dash.alert.low": { th: "แจ้งเตือน: สินค้าใกล้หมด", en: "Alert: Low stock" },
  "dash.recent": { th: "รายการขายล่าสุด", en: "Recent sales" },
  "dash.summary": { th: "ภาพรวมวันนี้", en: "Today's overview" },
  "dash.left": { th: "เหลือ", en: "Left" },
  "dash.unit": { th: "ชิ้น", en: "units" },
  // Products
  "prod.title": { th: "จัดการสินค้า", en: "Products" },
  "prod.add": { th: "เพิ่มสินค้า", en: "Add product" },
  "prod.name": { th: "ชื่อสินค้า", en: "Name" },
  "prod.sku": { th: "SKU/รหัส", en: "SKU" },
  "prod.price": { th: "ราคาขาย", en: "Price" },
  "prod.cost": { th: "ต้นทุน", en: "Cost" },
  "prod.stock": { th: "สต๊อก", en: "Stock" },
  "prod.threshold": { th: "จุดเตือน", en: "Low threshold" },
  "prod.category": { th: "หมวดหมู่", en: "Category" },
  "prod.actions": { th: "จัดการ", en: "Actions" },
  "prod.search": { th: "ค้นหาสินค้า...", en: "Search products..." },
  "prod.deleted": { th: "ลบสินค้าแล้ว", en: "Product deleted" },
  "prod.saved": { th: "บันทึกสินค้าแล้ว", en: "Product saved" },
  // POS
  "pos.title": { th: "หน้าขาย", en: "Point of Sale" },
  "pos.cart": { th: "ตะกร้า", en: "Cart" },
  "pos.empty_cart": { th: "ยังไม่มีรายการในตะกร้า", en: "Cart is empty" },
  "pos.subtotal": { th: "รวม", en: "Subtotal" },
  "pos.discount": { th: "ส่วนลด", en: "Discount" },
  "pos.total": { th: "ยอดสุทธิ", en: "Total" },
  "pos.payment": { th: "วิธีการชำระ", en: "Payment" },
  "pos.checkout": { th: "เก็บเงิน", en: "Checkout" },
  "pos.cash": { th: "เงินสด", en: "Cash" },
  "pos.qr": { th: "QR", en: "QR" },
  "pos.card": { th: "บัตร", en: "Card" },
  "pos.transfer": { th: "โอน", en: "Transfer" },
  "pos.success": { th: "บันทึกการขายสำเร็จ #{n}", en: "Sale #{n} completed" },
  "pos.out_of_stock": { th: "สินค้าหมด", en: "Out of stock" },
  "pos.promo_code": { th: "โค้ดส่วนลด", en: "Promo code" },
  "pos.apply": { th: "ใช้", en: "Apply" },
  "pos.invalid_promo": { th: "โค้ดไม่ถูกต้อง", en: "Invalid code" },
  "pos.tab.all": { th: "ทั้งหมด", en: "All" },
  "pos.tab.top": { th: "ขายดี", en: "Top sellers" },
  "pos.tab.recent": { th: "ล่าสุด", en: "Recent" },
  "pos.shortcuts": { th: "คีย์ลัด: / ค้นหา · F2 ชำระเงิน · F3 สแกน · Esc ล้างตะกร้า", en: "Shortcuts: / search · F2 pay · F3 scan · Esc clear" },
  "pos.scan_placeholder": { th: "สแกนบาร์โค้ด / SKU (F3)", en: "Scan barcode / SKU (F3)" },
  "pos.scan_not_found": { th: "ไม่พบสินค้าตามบาร์โค้ดนี้", en: "No product matched this barcode" },
  "pos.print": { th: "พิมพ์ใบเสร็จ", en: "Print receipt" },
  "pos.receipt_title": { th: "ใบเสร็จรับเงิน", en: "Receipt" },
  "pos.cashier": { th: "พนักงาน", en: "Cashier" },
  "pos.thanks": { th: "ขอบคุณที่ใช้บริการ", en: "Thank you!" },
  "pos.close": { th: "ปิด", en: "Close" },
  // Admin
  "admin.title": { th: "ผู้ดูแลระบบ", en: "Admin" },
  "admin.subtitle": { th: "ภาพรวมร้านค้า และเรื่องแจ้งปัญหาจากผู้ใช้", en: "Store overview and support tickets from users" },
  "admin.lowstock": { th: "แจ้งเตือนสต๊อกต่ำ (ภาพรวม)", en: "Low-stock alerts (system-wide)" },
  "admin.affected_stores": { th: "ร้านที่มีสินค้าใกล้หมด", en: "Stores affected" },
  "admin.low_items": { th: "สินค้าใกล้หมดทั้งระบบ", en: "Low-stock items total" },
  "admin.total_stores": { th: "ร้านทั้งหมด", en: "Total stores" },
  "admin.store": { th: "ร้าน", en: "Store" },
  "admin.items": { th: "รายการสินค้าใกล้หมด", en: "Low-stock items" },
  "admin.no_access": { th: "คุณไม่มีสิทธิ์เข้าถึงหน้านี้", en: "You don't have access to this page" },
  "admin.dashboard": { th: "แดชบอร์ด", en: "Dashboard" },
  "admin.all_stores": { th: "ร้านค้าทั้งหมด", en: "All stores" },
  "admin.view_store_list": { th: "กดเพื่อดูรายชื่อร้าน", en: "Click to view store list" },
  "admin.support_tickets": { th: "เรื่องแจ้งปัญหาจากผู้ใช้", en: "Support tickets" },
  "admin.ticket_count": { th: "{n} เรื่อง", en: "{n} tickets" },
  "admin.no_tickets": { th: "ยังไม่มีเรื่องแจ้งปัญหา", en: "No support tickets yet" },
  "admin.status.open": { th: "เปิดเรื่อง", en: "Open" },
  "admin.status.in_progress": { th: "กำลังดำเนินการ", en: "In progress" },
  "admin.status.closed": { th: "ปิดเรื่อง", en: "Closed" },
  "admin.from": { th: "จาก", en: "From" },
  "admin.not_specified": { th: "ไม่ระบุ", en: "Not specified" },
  "admin.mark_in_progress": { th: "กำลังแก้", en: "Start" },
  "admin.close_ticket": { th: "ปิด", en: "Close" },
  "admin.ticket_updated": { th: "อัปเดตสถานะแล้ว", en: "Ticket status updated" },
  "admin.manage_admins": { th: "จัดการผู้ดูแลระบบ", en: "Manage admins" },
  "admin.super_admin": { th: "ผู้ดูแลสูงสุด", en: "Super Admin" },
  "admin.creator_only": { th: "เฉพาะผู้สร้างระบบ ({email}) เท่านั้นที่สามารถเพิ่มหรือลบผู้ดูแลระบบ", en: "Only the system creator ({email}) can add or remove admins" },
  "admin.email_placeholder": { th: "อีเมลผู้ที่ต้องการให้สิทธิ์ (ต้องสมัครบัญชีในระบบแล้ว)", en: "Email to grant access (must already have an account)" },
  "admin.add_success": { th: "เพิ่มผู้ดูแลระบบสำเร็จ", en: "Admin added successfully" },
  "admin.remove_success": { th: "ลบสิทธิ์ผู้ดูแลระบบแล้ว", en: "Admin access removed" },
  "admin.creator": { th: "ผู้สร้าง", en: "Creator" },
  "admin.no_admins": { th: "ยังไม่มีผู้ดูแลระบบ", en: "No admins yet" },
  "admin.stores_dialog_title": { th: "ร้านค้าทั้งหมดในระบบ ({n})", en: "All stores in the system ({n})" },
  "admin.stores_dialog_desc": { th: "รายชื่อร้านค้าที่สมัครใช้งาน PosFlow", en: "Stores registered on PosFlow" },
  "admin.no_stores": { th: "ยังไม่มีร้านค้า", en: "No stores yet" },
  "admin.joined_on": { th: "สมัครเมื่อ", en: "Joined" },
  "admin.store_status.active": { th: "ใช้งานอยู่", en: "Active" },
  "admin.store_status.inactive": { th: "ไม่ได้ใช้งาน", en: "Inactive" },
  "admin.store_status.suspended": { th: "ระงับ", en: "Suspended" },
  "side.admin": { th: "ผู้ดูแลระบบ", en: "Admin" },
  // Support
  "support.report": { th: "แจ้งปัญหา", en: "Report issue" },
  "support.title": { th: "แจ้งปัญหาการใช้งาน", en: "Report an issue" },
  "support.desc": { th: "เจอปัญหาในการใช้ระบบ? กรอกรายละเอียดด้านล่าง ทีมงานจะรีบตรวจสอบและแก้ไขให้", en: "Found a problem while using the system? Share the details and the team will review it quickly." },
  "support.subject": { th: "หัวข้อ", en: "Subject" },
  "support.subject_placeholder": { th: "เช่น พิมพ์ใบเสร็จไม่ได้", en: "e.g. Receipt printing is not working" },
  "support.message": { th: "รายละเอียด", en: "Details" },
  "support.message_placeholder": { th: "อธิบายสิ่งที่เกิดขึ้น ขั้นตอนที่ทำ และผลลัพธ์ที่คาดหวัง", en: "Describe what happened, the steps you took, and the expected result" },
  "support.submit": { th: "ส่งเรื่อง", en: "Submit" },
  "support.success": { th: "ส่งเรื่องแจ้งปัญหาเรียบร้อย ทีมงานจะติดต่อกลับโดยเร็ว", en: "Issue submitted. The team will get back to you soon." },
  // Promos
  "promo.title": { th: "โปรโมชั่น", en: "Promotions" },
  "promo.add": { th: "เพิ่มโปรโมชั่น", en: "New promotion" },
  "promo.name": { th: "ชื่อโปรโมชั่น", en: "Name" },
  "promo.code": { th: "โค้ด", en: "Code" },
  "promo.type": { th: "ประเภทส่วนลด", en: "Discount type" },
  "promo.value": { th: "มูลค่า", en: "Value" },
  "promo.min": { th: "ยอดขั้นต่ำ", en: "Min purchase" },
  "promo.percent": { th: "เปอร์เซ็นต์ (%)", en: "Percent (%)" },
  "promo.amount": { th: "จำนวนเงิน (฿)", en: "Amount (฿)" },
  "promo.active": { th: "เปิดใช้งาน", en: "Active" },
  // Sales
  "sales.title": { th: "ประวัติการขาย", en: "Sales history" },
  "sales.receipt": { th: "เลขที่บิล", en: "Receipt" },
  "sales.date": { th: "วันที่", en: "Date" },
  "sales.items": { th: "จำนวนชิ้น", en: "Items" },
  "sales.amount": { th: "ยอด", en: "Amount" },
  "sales.method": { th: "ชำระโดย", en: "Method" },
  // Reports
  "rep.title": { th: "รายงาน", en: "Reports" },
  "rep.7day": { th: "ยอดขาย 7 วันล่าสุด", en: "Sales — last 7 days" },
  "rep.top": { th: "สินค้าขายดี", en: "Top products" },
  "rep.method": { th: "สัดส่วนวิธีชำระ", en: "Payment methods" },
  // Staff
  "staff.title": { th: "พนักงาน", en: "Staff" },
  "staff.invite": { th: "เพิ่มพนักงาน", en: "Invite staff" },
  "staff.email": { th: "อีเมลพนักงาน", en: "Staff email" },
  "staff.role": { th: "บทบาท", en: "Role" },
  "staff.status": { th: "สถานะ", en: "Status" },
  "staff.pending": { th: "รอเชิญ", en: "Pending" },
};

interface I18nCtx {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: string, vars?: Record<string, string | number>) => string;
}

const Ctx = createContext<I18nCtx | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>("th");

  useEffect(() => {
    if (typeof window === "undefined") return;
    const saved = localStorage.getItem("lang") as Lang | null;
    if (saved === "th" || saved === "en") setLangState(saved);
  }, []);

  const setLang = (l: Lang) => {
    setLangState(l);
    if (typeof window !== "undefined") localStorage.setItem("lang", l);
  };

  const t = (key: string, vars?: Record<string, string | number>) => {
    let s = dict[key]?.[lang] ?? key;
    if (vars) for (const [k, v] of Object.entries(vars)) s = s.replace(`{${k}}`, String(v));
    return s;
  };

  return <Ctx.Provider value={{ lang, setLang, t }}>{children}</Ctx.Provider>;
}

export function useI18n() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useI18n must be inside I18nProvider");
  return ctx;
}
