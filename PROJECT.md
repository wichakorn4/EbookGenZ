# โครงงาน: EbookGenZ (GenZ Digital Bookstore & Cloud Database System)

## ข้อมูลโครงงานและผู้จัดทำ (Project Information)
* **ชื่อโครงงาน:** EbookGenZ - ระบบร้านขายหนังสือดิจิทัลและบริหารจัดการฐานข้อมูลคลาวด์
* **คลังซอร์สโค้ด (Repository):** [https://github.com/wichakorn4/EbookGenZ](https://github.com/wichakorn4/EbookGenZ)
* **สมาชิกกลุ่ม:**
  1. **นายวิชชากร เดชสุภา** (รหัสนักศึกษา: 67332110038-9)
  2. **นายนันทพงส์ ชุมศร** (รหัสนักศึกษา: 67332110088-8)

---

## สารบัญหัวข้อตรวจโครงงาน (Project Evaluation Links)

ผู้สอนสามารถคลิกลิงก์ของแต่ละเรื่องตามข้อกำหนด 5 หัวข้อด้านล่างนี้ เพื่อตรวจสอบเอกสารและผลงานฉบับเต็มได้ทันที:

### 1. [spec ของระบบ](project_specification.md)
* **ลิงก์เอกสาร:** [project_specification.md](project_specification.md) *(หรือดู [user_story_and_acceptance_criteria.md](user_story_and_acceptance_criteria.md))*
* **สรุปเนื้อหา:** ข้อกำหนดโครงการระบบร้านขายหนังสือดิจิทัล EbookGenZ, ภาพรวมระบบ, ขอบเขตหน้าร้าน (Customer Portal) และหลังบ้าน (Admin Portal), สถาปัตยกรรมเทคโนโลยี, ข้อกำหนดฐานข้อมูล 8 ตารางหลักตามมาตรฐาน 3NF, ข้อกำหนดรายงานวิเคราะห์ข้อมูลเชิงลึก 4 หัวข้อ และกฎทางธุรกิจ (Business Rules)

---

### 2. [class diagram หรือ sequence diagram](system_diagrams.md)
* **ลิงก์เอกสาร:** [system_diagrams.md](system_diagrams.md)
* **สรุปเนื้อหา:** แผนภาพสถาปัตยกรรมระบบในรูปแบบ Mermaid.js:
  * **Class Diagram:** โครงสร้าง Domain Models และ Service Layers ครบถ้วน (`User`, `Role`, `EBook`, `Cart`, `Order`, `Payment`, `DownloadLink`, `OrderService`, `DownloadService` ฯลฯ)
  * **Sequence Diagrams (3 แผนภาพ):** 
    1. การสั่งซื้อและชำระเงินจำลองพร้อมแนบสลิป (Customer Checkout & Slip Upload Flow)
    2. การตรวจสอบสลิปและอนุมัติคำสั่งซื้อโดยผู้ดูแลระบบ (Admin Slip Verification & Order Approval Flow)
    3. การตรวจสอบสิทธิ์และความปลอดภัยในการดาวน์โหลดไฟล์ (Secure E-Book Download Access Flow)

---

### 3. [งานฝั่งผู้ใช้ คือ persona, wireframe และผลตรวจ accessibility](user_experience.md)
* **ลิงก์เอกสาร:** [user_experience.md](user_experience.md)
* **สรุปเนื้อหา:** 
  * **User Personas:** ข้อมูลกลุ่มเป้าหมายผู้ใช้งานจริง 2 มิติ (Persona 1: ลูกค้า Gen Z นักศึกษาคณะวิศวะฯ, Persona 2: ผู้ดูแลระบบและจัดการคลัง E-Book)
  * **Wireframes:** โครงร่างหน้าจอระบบหลักทั้ง 6 หน้าจอ (หน้าร้าน, ตะกร้าสินค้า, หน้าคลังดาวน์โหลด, หน้าแอดมินตรวจสลิป, หน้า CRUD Studio และแดชบอร์ดรายงาน)
  * **ผลตรวจ Accessibility (WCAG 2.1 AA Audit):** ตารางประเมินผลตรวจ 7 เกณฑ์สากล (Color Contrast, Text Alternatives, Persistent Labels, Required Indicators, Error Non-Color, Keyboard Navigation, Descriptive Buttons) พร้อมบันทึกการแก้ไขจุดบกพร่องที่พบจาก AI ด้วยตนเอง

---

### 4. [test อัตโนมัติ และหน้าผลการรัน CI](tests_and_ci.md)
* **ลิงก์เอกสาร:** [tests_and_ci.md](tests_and_ci.md)
* **ลิงก์หน้าผลการรัน CI บน GitHub Actions:** [https://github.com/wichakorn4/EbookGenZ/actions](https://github.com/wichakorn4/EbookGenZ/actions)
* **ไฟล์เวิร์กโฟลว์ CI:** [.github/workflows/ci.yml](.github/workflows/ci.yml)
* **สรุปเนื้อหา:** 
  * ชุดทดสอบอัตโนมัติด้วย **Pytest** จำนวน 21 Test Cases ครอบคลุมกฎการตั้งราคา, การคำนวณเงินในตะกร้า, และกลไกความปลอดภัยของการล็อกสิทธิ์ดาวน์โหลด (Code Coverage 100%)
  * เวิร์กโฟลว์ GitHub Actions CI Pipeline รันตรวจสอบอัตโนมัติทั้งการ Linting ด้วย `ruff` และการรัน Pytest Suite ทุกครั้งที่มีการ Push/Pull Request

---

### 5. [บันทึกการใช้ AI](ai_usage_log.md)
* **ลิงก์เอกสาร:** [ai_usage_log.md](ai_usage_log.md) *(หรือดู [ai_usage_policy_and_guidelines.md](ai_usage_policy_and_guidelines.md))*
* **สรุปเนื้อหา:** นโยบายการใช้ AI อย่างรับผิดชอบ (Responsible AI Principles), ตารางบันทึกประวัติการใช้งาน AI ตลอดโครงการอย่างละเอียด (วันเวลา, Prompt, สิ่งที่นำมาใช้, และวิธีที่สมาชิกตรวจสอบ/ทดสอบรันด้วยตนเอง), กรณีศึกษาการแก้ไขข้อผิดพลาดที่ตรวจพบจาก AI และคำรับรองความซื่อสัตย์ทางวิชาการ (Academic Integrity Sign-off)

---

## รายการเอกสารอื่น ๆ ในโครงงาน (Additional Project Deliverables)
* [เล่มรายงาน Mini Project ฉบับสมบูรณ์ (DATABASE_MINI_PROJECT_REPORT.md)](DATABASE_MINI_PROJECT_REPORT.md)
* [สคริปต์โครงสร้างฐานข้อมูลคลาวด์ (supabase_schema.sql)](supabase_schema.sql)
* [สคริปต์โครงสร้างฐานข้อมูล SQLite (schema.sql)](schema.sql)
* [ซอร์สโค้ดบริการทางธุรกิจและกฎของระบบ (ebook_services.py)](ebook_services.py)
* [ชุดไฟล์ Automated Tests (tests/test_ebook_rules.py)](tests/test_ebook_rules.py)
