# การทดสอบอัตโนมัติและระบบ CI/CD (Automated Testing & Continuous Integration)

เอกสารนี้รวบรวมรายละเอียดของชุดทดสอบอัตโนมัติ (Automated Test Suite) และระบบบูรณาการอย่างต่อเนื่อง (Continuous Integration: CI Pipeline) บน GitHub Actions สำหรับโครงการ **EbookGenZ**

---

## 1. ลิงก์หน้าผลการรัน CI บน GitHub Actions
* **ลิงก์หน้าผลการรัน GitHub Actions Workflow:** [https://github.com/wichakorn4/EbookGenZ/actions](https://github.com/wichakorn4/EbookGenZ/actions)
* **ไฟล์การตั้งค่า CI Workflow:** [.github/workflows/ci.yml](.github/workflows/ci.yml)

---

## 2. ขอบเขตและสถาปัตยกรรมชุดทดสอบ (Test Scope & Architecture)

ชุดทดสอบอัตโนมัติพัฒนาด้วย **Python 3.12** ร่วมกับเฟรมเวิร์ก **`pytest`** และเครื่องมือตรวจสอบความครอบคลุม **`pytest-cov`** รวมถึง Linting ด้วย **`ruff`** เพื่อรับประกันความถูกต้องของ Business Rules และข้อกำหนดความปลอดภัยของระบบ:

### สรุปกลุ่มกรณีทดสอบ (Test Suites):
1. **`TestEBookItemValidation` (การตรวจสอบข้อมูลหนังสือ E-Book):**
   * ตรวจสอบการสร้างออบเจกต์หนังสือที่ถูกต้อง
   * ตรวจสอบและปฏิเสธราคาที่เป็นลบ (`CHECK (price >= 0)`)
   * ตรวจสอบและปฏิเสธชื่อหนังสือที่เป็นค่าว่าง
2. **`TestShoppingCartLogic` (การคำนวณตะกร้าสินค้า):**
   * ตรวจสอบสถานะเริ่มต้นของตะกร้าว่าง
   * ตรวจสอบการคำนวณยอดเงินรวมย่อย (Subtotal) และยอดสุทธิ (Total Amount)
   * ตรวจสอบการสะสมจำนวนสินค้าเมื่อเพิ่มหนังสือซ้ำเล่มเดิม
   * ตรวจสอบการปฏิเสธการเพิ่มหนังสือที่ปิดการขาย (`is_active = False`)
   * ตรวจสอบการลบสินค้าและการอัปเดตจำนวนสินค้า
   * ตรวจสอบการคำนวณส่วนลดโปรโมชันตามเกณฑ์
   * ตรวจสอบและปฏิเสธส่วนลดที่อยู่นอกช่วง 0 - 100%
3. **`TestDownloadSecurityGuard` (การควบคุมความปลอดภัยในการดาวน์โหลด):**
   * **[Security Critical]** ปฏิเสธการดาวน์โหลดเมื่อสถานะคำสั่งซื้อยังเป็น `pending` (รอตรวจสอบสลิป)
   * **[Security Critical]** ปฏิเสธการดาวน์โหลดเมื่อสถานะคำสั่งซื้อเป็น `cancelled` (ถูกยกเลิก)
   * อนุญาตให้ดาวน์โหลดได้เฉพาะเมื่อสถานะคำสั่งซื้อเป็น `confirmed` (ยืนยันแล้ว)
   * ตรวจสอบการนับจำนวนครั้งการดาวน์โหลดเมื่อลูกค้ากดโหลดสำเร็จ
   * บล็อกการดาวน์โหลดทันทีเมื่อจำนวนครั้งครบขีดจำกัดสูงสุด (`max_downloads = 5`)
   * ป้องกันค่าสถานะคำสั่งซื้อที่ไม่ถูกต้องตาม Enum

---

## 3. คำสั่งสำหรับการรันชุดทดสอบ (How to Run Tests Locally)

### 3.1 ติดตั้ง Dependencies:
```bash
pip install -r requirements.txt
```

### 3.2 ตรวจสอบรูปแบบโค้ดด้วย Ruff Linter:
```bash
ruff check .
```

### 3.3 รันชุดทดสอบพร้อมรายงานความครอบคลุม (Coverage Report):
```bash
pytest -v --cov=ebook_services --cov-report=term-missing
```

---

## 4. บันทึกผลการรันชุดทดสอบจริง (Actual Test Execution Log)

```text
============================= test session starts =============================
platform win32 -- Python 3.12.10, pytest-9.1.1, pluggy-1.6.0
rootdir: C:\Users\Wichakorn44\OneDrive\เดสก์ท็อป\EbookGenZ
plugins: cov-7.1.0
collected 21 items

tests/test_ebook_rules.py::TestEBookItemValidation::test_valid_ebook_creation PASSED       [  4%]
tests/test_ebook_rules.py::TestEBookItemValidation::test_reject_negative_price PASSED       [  9%]
tests/test_ebook_rules.py::TestEBookItemValidation::test_reject_empty_title PASSED          [ 14%]
tests/test_ebook_rules.py::TestShoppingCartLogic::test_cart_empty_initial_state PASSED     [ 19%]
tests/test_ebook_rules.py::TestShoppingCartLogic::test_add_items_calculates_correct_subtotal PASSED [ 23%]
tests/test_ebook_rules.py::TestShoppingCartLogic::test_add_multiple_different_books PASSED [ 28%]
tests/test_ebook_rules.py::TestShoppingCartLogic::test_reject_adding_inactive_ebook PASSED [ 33%]
tests/test_ebook_rules.py::TestShoppingCartLogic::test_remove_item_from_cart PASSED         [ 38%]
tests/test_ebook_rules.py::TestShoppingCartLogic::test_update_quantity_to_zero_removes_item PASSED [ 42%]
tests/test_ebook_rules.py::TestShoppingCartLogic::test_cart_item_rejects_non_positive_quantity PASSED [ 47%]
tests/test_ebook_rules.py::TestShoppingCartLogic::test_cart_add_item_rejects_non_positive_quantity PASSED [ 52%]
tests/test_ebook_rules.py::TestShoppingCartLogic::test_add_existing_ebook_accumulates_quantity PASSED [ 57%]
tests/test_ebook_rules.py::TestShoppingCartLogic::test_update_quantity_positive PASSED     [ 61%]
tests/test_ebook_rules.py::TestShoppingCartLogic::test_apply_valid_discount PASSED          [ 66%]
tests/test_ebook_rules.py::TestShoppingCartLogic::test_apply_invalid_discount_raises_error PASSED [ 71%]
tests/test_ebook_rules.py::TestDownloadSecurityGuard::test_denies_download_when_order_is_pending PASSED [ 76%]
tests/test_ebook_rules.py::TestDownloadSecurityGuard::test_denies_download_when_order_is_cancelled PASSED [ 80%]
tests/test_ebook_rules.py::TestDownloadSecurityGuard::test_allows_download_when_order_is_confirmed PASSED [ 85%]
tests/test_ebook_rules.py::TestDownloadSecurityGuard::test_increments_download_counter_on_success PASSED [ 90%]
tests/test_ebook_rules.py::TestDownloadSecurityGuard::test_blocks_download_when_max_downloads_quota_reached PASSED [ 95%]
tests/test_ebook_rules.py::TestDownloadSecurityGuard::test_invalid_order_status_raises_validation_error PASSED [100%]

=============================== tests coverage ================================
Name                Stmts   Miss  Cover   Missing
-------------------------------------------------
ebook_services.py      89      0   100%
-------------------------------------------------
TOTAL                  89      0   100%
============================= 21 passed in 0.17s ==============================
```

---

## 5. การตั้งค่า CI Pipeline บน GitHub Actions (.github/workflows/ci.yml)

ระบบ CI ได้รับการกำหนดค่าให้ทำงานอัตโนมัติในทุก Pull Request และทุกการ Push ขึ้น Branch `main`:
1. **Checkout Code:** ดึงซอร์สโค้ดล่าสุดจาก Repository
2. **Setup Python Environment:** ติดตั้ง Python 3.12 พร้อม Cache ระบบแพ็กเกจ pip
3. **Install Dependencies:** ติดตั้ง `pytest`, `pytest-cov`, `ruff` จาก `requirements.txt`
4. **Code Quality Linting:** สั่งรัน `ruff check .` ตรวจสอบความสะอาดและมาตรฐานการเขียนโค้ด
5. **Execute Test Suite & Quality Gate:** สั่งรัน `pytest -v --cov=ebook_services --cov-fail-under=80` โดยมีเกณฑ์ขั้นต่ำว่าความครอบคลุมของโค้ด (Code Coverage) ต้องไม่ต่ำกว่า 80% (ผลการรันจริงบรรลุ 100%)
