# ข้อกำหนดโครงการ (Project Specification): ระบบร้านขายหนังสือดิจิทัล EbookGenZ

## 1. ภาพรวมโครงการ (Project Overview)
โครงการ **EbookGenZ (GenZ Digital Bookstore & Cloud Database System)** เป็นแพลตฟอร์มเว็บแอปพลิเคชันสำหรับจัดจำหน่ายและให้บริการดาวน์โหลดหนังสือดิจิทัล (E-Book) ที่มุ่งเน้นกลุ่มผู้อ่านคนรุ่นใหม่ (Gen Z) โดยเชื่อมต่อกับระบบฐานข้อมูลคลาวด์เชิงสัมพันธ์ (Relational Cloud Database) บน Supabase (PostgreSQL)

ระบบแบ่งออกเป็น 2 ส่วนหลัก:
1. **ส่วนหน้าร้าน (Customer Storefront):** สำหรับลูกค้าในการสมัครสมาชิก ค้นหา คัดกรองหมวดหมู่ เพิ่มลงตะกร้า ชำระเงินแบบจำลอง (Simulated Payment QR PromptPay พร้อมแนบสลิป) และเข้าถึงคลังดาวน์โหลดเฉพาะรายการที่ได้รับการยืนยันแล้ว
2. **ส่วนหลังบ้าน (Admin Management Portal):** สำหรับผู้ดูแลระบบในการตรวจสอบสลิปการโอนเงิน อนุมัติคำสั่งซื้อ ปลดล็อกสิทธิ์ดาวน์โหลด บริหารจัดการข้อมูลหนังสือ หมวดหมู่ สมาชิก (CRUD Studio) และออกรายงานวิเคราะห์ยอดขายเชิงลึกจากข้อมูลจริง

---

## 2. ขอบเขตระบบและสถาปัตยกรรม (System Scope & Architecture)

### 2.1 ส่วนหน้าร้าน (Customer Portal)
* **การจัดการสมาชิก (Authentication):**
  * สมัครสมาชิกใหม่ ตรวจสอบความซ้ำซ้อนของ Username/Email ด้วยฐานข้อมูล
  * เข้าสู่ระบบด้วย Username/Email พร้อมตรวจสอบรหัสผ่านและสิทธิ์การใช้งาน
  * ระบบจัดเก็บ Client Session และตรวจสอบสถานะการอนุมัติ (`is_approved`)
* **การค้นหาและเรียกดูหนังสือ (Catalog & Discovery):**
  * แสดงรายการ E-Book พร้อมรายละเอียด: ชื่อเรื่อง, ผู้แต่ง, ราคา, หมวดหมู่, ภาพปก, คำอธิบาย, รูปแบบไฟล์ และสถานะเปิดขาย (`is_active = 1`)
  * ระบบค้นหาแบบเรียลไทม์ (Live Search) ด้วยชื่อหนังสือและคีย์เวิร์ด
  * การคัดกรองตามหมวดหมู่ (เช่น Programming & Tech, AI & Data Science, Business & Startup, Lifestyle & Design)
* **ตะกร้าสินค้าและการสั่งซื้อ (Cart & Checkout):**
  * เพิ่มหนังสือลงตะกร้า ปรับเพิ่ม/ลดจำนวน ลบรายการสินค้า และคำนวณยอดเงินรวมสุทธิแบบอัตโนมัติ
  * ระบบบันทึกคำสั่งซื้อลงตาราง `orders` และรายการย่อยใน `order_items` โดยบันทึกราคา Snapshot ณ วันที่สั่งซื้อ
* **การชำระเงินจำลอง (Simulated Payment):**
  * แสดง QR Code สำหรับชำระเงินผ่าน PromptPay จำลอง
  * ลูกค้าสามารถอัปโหลดภาพสลิปหลักฐานการโอนเงินเข้าสู่ระบบ (บันทึกลงตาราง `payments`)
  * สถานะคำสั่งซื้อเริ่มต้นเป็น `pending` (รอการตรวจสอบสลิป)
* **ระบบดาวน์โหลดที่ปลอดภัย (Secure Download Hub):**
  * หน้า `downloads.html` แสดงเฉพาะหนังสือจากคำสั่งซื้อที่มีสถานะ **"ยืนยันแล้ว (confirmed)"** เท่านั้น
  * ป้องกันการเข้าถึงไฟล์โดยตรงหากคำสั่งซื้อยังไม่ได้รับการอนุมัติ

### 2.2 ส่วนหลังบ้าน (Admin Portal)
* **การจัดการคำสั่งซื้อและตรวจสอบสลิป (Order & Slip Verification):**
  * แสดงรายการคำสั่งซื้อใหม่แบบ Realtime
  * สามารถเปิดดูภาพสลิปการโอนเงินจริงที่ดึงจากฐานข้อมูล
  * ปุ่มอนุมัติคำสั่งซื้อ (`confirmed`) เพื่อปลดล็อกลิงก์ดาวน์โหลดให้ลูกค้า หรือปฏิเสธคำสั่งซื้อ (`cancelled`)
* **การจัดการคลังหนังสือ (E-Book Management):**
  * เพิ่มหนังสือเล่มใหม่ กำหนดราคา หมวดหมู่ และลิงก์ไฟล์
  * แก้ไขข้อมูลหนังสือและเปิด/ปิดการจำหน่าย (`is_active`)
* **การจัดการผู้ใช้ (User & Role Management):**
  * ดูรายชื่อผู้ใช้งานทั้งหมด อนุมัติสิทธิ์ (`is_approved = true`) หรือระงับสิทธิ์
  * กำหนดบทบาทผู้ใช้ (`role_id`: Customer, Admin, Staff)
* **เครื่องมือบริหารจัดการฐานข้อมูล (CRUD Studio & SQL Console):**
  * หน้า `admin_crud.html` สำหรับดู เพิ่ม แก้ไข และลบข้อมูลใน 8 ตารางหลัก
  * Live SQL Console สำหรับรันคำสั่ง SQL Query บนฐานข้อมูลคลาวด์
* **ระบบรายงานวิเคราะห์ (Analytics Dashboard):**
  * หน้า `reports.html` แสดง 4 รายงานเชิงลึก พร้อมกราฟและตารางสรุปผล

---

## 3. สถาปัตยกรรมและเทคโนโลยีที่ใช้ (Technology Stack)

| ส่วนประกอบ | เทคโนโลยีที่เลือกใช้ | รายละเอียดการประยุกต์ใช้ |
| :--- | :--- | :--- |
| **Frontend UI** | HTML5, Modern CSS, Vanilla JavaScript (ES6+) | พัฒนาระบบหน้าร้านและหลังบ้านตามแนวคิด Semantic HTML และ Modern Component Design |
| **Cloud Database** | PostgreSQL via Supabase BaaS | รองรับ Relational Data Model, 3NF, Foreign Keys, CHECK Constraints, Realtime Sync |
| **Local Database** | SQLite (`ebookgenz.db`) | ฐานข้อมูลสำรองและสำหรับรัน Local Testing Script |
| **Automated Testing** | Python, `pytest`, `pytest-cov` | ชุดทดสอบกฎทางธุรกิจ ตะกร้าสินค้า และเงื่อนไขความปลอดภัย |
| **Code Quality & CI** | `ruff`, GitHub Actions CI | ตรวจสอบคุณภาพโค้ดและรัน Automated Tests ทุกครั้งที่มีการ Push/PR |

---

## 4. ข้อกำหนดฐานข้อมูล (Database Schema Requirements)
โครงสร้างฐานข้อมูลเชิงสัมพันธ์ประกอบด้วย **8 ตารางหลัก** ตามหลักการ 3NF (Third Normal Form):
1. `roles`: บทบาทของผู้ใช้ (`role_id`, `role_name`, `description`)
2. `users`: บัญชีผู้ใช้งาน (`user_id`, `role_id`, `username`, `email`, `password_hash`, `full_name`, `is_approved`, `created_at`)
3. `categories`: หมวดหมู่หนังสือ (`category_id`, `category_name`, `description`)
4. `ebooks`: ข้อมูลหนังสือดิจิทัล (`ebook_id`, `category_id`, `title`, `author`, `price`, `description`, `cover_image`, `file_url`, `is_active`)
5. `orders`: คำสั่งซื้อ (`order_id`, `user_id`, `total_amount`, `order_status`, `created_at`)
6. `order_items`: รายการย่อยในคำสั่งซื้อ (`order_item_id`, `order_id`, `ebook_id`, `quantity`, `unit_price`, `subtotal`)
7. `payments`: ข้อมูลการชำระเงินและสลิป (`payment_id`, `order_id`, `amount`, `payment_method`, `slip_image_url`, `payment_status`, `payment_date`)
8. `download_links`: โทเคนและสิทธิ์ดาวน์โหลด (`download_id`, `order_id`, `ebook_id`, `download_token`, `download_count`, `max_downloads`, `created_at`)

### กฎข้อจำกัดความสมบูรณ์ของข้อมูล (Integrity Constraints):
* **Primary Key & Foreign Key:** กำหนดครบถ้วนทุกความสัมพันธ์ (1:1, 1:N, N:M) พร้อม `ON DELETE RESTRICT` หรือ `CASCADE` ตามบริบท
* **CHECK Constraints:** ป้องกันราคาและยอดเงินติดลบ (`price >= 0`, `total_amount >= 0`, `quantity > 0`)
* **UNIQUE Constraints:** ป้องกันชื่อผู้ใช้และอีเมลซ้ำ (`UNIQUE(username)`, `UNIQUE(email)`)
* **NOT NULL & DEFAULT:** กำหนดค่าเริ่มต้นสำหรับฟิลด์สถานะ เช่น `order_status DEFAULT 'pending'`

---

## 5. กฎทางธุรกิจและเงื่อนไขความปลอดภัย (Business Rules & Security)
1. **BR-01 (การตั้งราคา):** ราคาของ E-Book ต้องเป็นจำนวนจริงที่ไม่ติดลบเสมอ (`price >= 0`)
2. **BR-02 (การสั่งซื้อ):** คำสั่งซื้อต้องมีรายการสินค้าอย่างน้อย 1 รายการ และยอดรวมต้องคำนวณจากผลรวมของ subtotal ของแต่ละเล่ม
3. **BR-03 (การปลดล็อกดาวน์โหลด):** ลูกค้าจะได้รับสิทธิ์ดาวน์โหลดไฟล์ E-Book เฉพาะเมื่อคำสั่งซื้อได้รับการเปลี่ยนสถานะเป็น `confirmed` โดยผู้ดูแลระบบเท่านั้น
4. **BR-04 (การจำกัดสิทธิ์ดาวน์โหลด):** โทเคนดาวน์โหลดถูกจำกัดจำนวนครั้งการดาวน์โหลด (`max_downloads = 5`) เพื่อป้องกันการส่งต่อลิงก์สาธารณะ
5. **BR-05 (ความปลอดภัยข้อมูลการเงิน):** ระบบใช้การจำลองชำระเงิน (Simulated QR PromptPay) และบันทึกรูปสลิปเพื่อการตรวจสอบ ห้ามจัดเก็บข้อมูลบัตรเครดิตหรือข้อมูลความลับทางการเงินจริง