# -*- coding: utf-8 -*-
"""
EbookGenZ - Database Initializer & CLI Inspector
สคริปต์สร้างและทดสอบฐานข้อมูล SQLite 8 ตารางสำหรับโปรเจกต์ EbookGenZ
"""
import sqlite3
import os
import sys

# รองรับภาษาไทยและ Emoji บน Windows Console
if sys.platform.startswith('win'):
    try:
        sys.stdout.reconfigure(encoding='utf-8')
        sys.stderr.reconfigure(encoding='utf-8')
    except Exception:
        pass

DB_FILE = "ebookgenz.db"
SCHEMA_FILE = "schema.sql"

def init_database():
    print("=" * 60)
    print("🚀 เริ่มต้นสร้างฐานข้อมูล SQLite: EbookGenZ (8 ตาราง 3NF)")
    print("=" * 60)

    if not os.path.exists(SCHEMA_FILE):
        print(f"❌ ไม่พบไฟล์ {SCHEMA_FILE}")
        return

    with open(SCHEMA_FILE, "r", encoding="utf-8") as f:
        sql_script = f.read()

    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()

    try:
        cursor.executescript(sql_script)
        conn.commit()
        print(f"✅ สร้างฐานข้อมูลสำเร็จและบันทึกลงไฟล์: {DB_FILE}")
        
        # ตรวจสอบจำนวนข้อมูลในแต่ละตาราง
        tables = [
            ("roles", "บทบาทผู้ใช้"),
            ("users", "ข้อมูลสมาชิก"),
            ("categories", "หมวดหมู่หนังสือ"),
            ("ebooks", "รายการอีบุ๊ก"),
            ("orders", "คำสั่งซื้อ"),
            ("order_items", "รายการสินค้าในคำสั่งซื้อ"),
            ("payments", "ประวัติการชำระเงิน"),
            ("download_links", "ลิงก์ดาวน์โหลดที่ปลอดภัย")
        ]

        print("\n📊 สรุปจำนวนข้อมูลในตารางทั้งหมด 8 ตาราง:")
        print("-" * 60)
        for tbl, desc in tables:
            cursor.execute(f"SELECT COUNT(*) FROM {tbl}")
            count = cursor.fetchone()[0]
            print(f"  • ตาราง {tbl:<16} ({desc:<28}): {count:>3} แถว")
        print("-" * 60)

        # ทดสอบรันคิวรีรายงานวิเคราะห์ 1 ตัวอย่าง
        print("\n📈 ตัวอย่างรายงาน: E-Book ขายดีที่สุด 5 อันดับแรก:")
        report_sql = """
        SELECT e.title, c.category_name, SUM(oi.quantity) as sold_count, SUM(oi.subtotal) as total_revenue
        FROM order_items oi
        JOIN ebooks e ON oi.ebook_id = e.ebook_id
        JOIN categories c ON e.category_id = c.category_id
        JOIN orders o ON oi.order_id = o.order_id
        WHERE o.order_status = 'confirmed'
        GROUP BY e.ebook_id
        ORDER BY sold_count DESC
        LIMIT 5;
        """
        cursor.execute(report_sql)
        top_books = cursor.fetchall()
        for i, row in enumerate(top_books, 1):
            print(f"  {i}. {row[0]} | หมวด: {row[1]} | ยอดขาย: {row[2]} เล่ม | รวมเงิน: ฿{row[3]:,.2f}")

        print("=" * 60)
        print("🎉 ฐานข้อมูลพร้อมใช้งานสำหรับการนำเสนอและการเชื่อมต่อระบบแล้ว!")

    except Exception as e:
        print(f"❌ เกิดข้อผิดพลาดในการประมวลผล SQL: {e}")
    finally:
        conn.close()

if __name__ == "__main__":
    init_database()
