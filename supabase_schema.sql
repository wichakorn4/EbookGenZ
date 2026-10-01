-- ====================================================================
-- โครงสร้างฐานข้อมูล PostgreSQL / Supabase 8 ตาราง (3NF Compliant)
-- โครงการ: EbookGenZ - GenZ Digital Bookstore
-- คำแนะนำ: คัดลอกโค้ดทั้งหมดนี้ไปวางในหน้า Supabase SQL Editor แล้วกด "Run"
-- ====================================================================

-- 1. ลบตารางเดิมหากมีอยู่ (เรียงตามลำดับความสัมพันธ์ย้อนกลับ)
DROP TABLE IF EXISTS download_links CASCADE;
DROP TABLE IF EXISTS payments CASCADE;
DROP TABLE IF EXISTS order_items CASCADE;
DROP TABLE IF EXISTS orders CASCADE;
DROP TABLE IF EXISTS ebooks CASCADE;
DROP TABLE IF EXISTS categories CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS roles CASCADE;

-- ====================================================================
-- 1. ตารางบทบาทผู้ใช้งาน (roles)
-- ====================================================================
CREATE TABLE roles (
    role_id SERIAL PRIMARY KEY,
    role_name VARCHAR(50) NOT NULL UNIQUE,
    description VARCHAR(255)
);

-- ====================================================================
-- 2. ตารางข้อมูลสมาชิกและผู้ใช้งาน (users)
-- ====================================================================
CREATE TABLE users (
    user_id SERIAL PRIMARY KEY,
    role_id INTEGER NOT NULL DEFAULT 2,
    username VARCHAR(50) NOT NULL UNIQUE,
    email VARCHAR(100) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    phone VARCHAR(20),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    FOREIGN KEY (role_id) REFERENCES roles(role_id) ON DELETE RESTRICT
);

-- ====================================================================
-- 3. ตารางหมวดหมู่หนังสือดิจิทัล (categories)
-- ====================================================================
CREATE TABLE categories (
    category_id SERIAL PRIMARY KEY,
    category_name VARCHAR(100) NOT NULL UNIQUE,
    category_slug VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    icon VARCHAR(50) DEFAULT '📚'
);

-- ====================================================================
-- 4. ตารางข้อมูลอีบุ๊ก (ebooks)
-- ====================================================================
CREATE TABLE ebooks (
    ebook_id SERIAL PRIMARY KEY,
    category_id INTEGER NOT NULL,
    title VARCHAR(255) NOT NULL,
    author VARCHAR(100) NOT NULL,
    price NUMERIC(10, 2) NOT NULL CHECK (price >= 0),
    description TEXT,
    cover_image VARCHAR(500),
    file_url VARCHAR(500) NOT NULL,
    is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    FOREIGN KEY (category_id) REFERENCES categories(category_id) ON DELETE RESTRICT
);

-- ====================================================================
-- 5. ตารางคำสั่งซื้อ (orders)
-- ====================================================================
CREATE TABLE orders (
    order_id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    total_amount NUMERIC(10, 2) NOT NULL CHECK (total_amount >= 0),
    order_status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (order_status IN ('pending', 'confirmed', 'cancelled')),
    order_date TIMESTAMPTZ DEFAULT NOW(),
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE RESTRICT
);

-- ====================================================================
-- 6. ตารางรายการสินค้าในคำสั่งซื้อ (order_items)
-- ====================================================================
CREATE TABLE order_items (
    order_item_id SERIAL PRIMARY KEY,
    order_id INTEGER NOT NULL,
    ebook_id INTEGER NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
    unit_price NUMERIC(10, 2) NOT NULL CHECK (unit_price >= 0),
    subtotal NUMERIC(10, 2) NOT NULL CHECK (subtotal >= 0),
    FOREIGN KEY (order_id) REFERENCES orders(order_id) ON DELETE CASCADE,
    FOREIGN KEY (ebook_id) REFERENCES ebooks(ebook_id) ON DELETE RESTRICT
);

-- ====================================================================
-- 7. ตารางข้อมูลการชำระเงิน (payments)
-- ====================================================================
CREATE TABLE payments (
    payment_id SERIAL PRIMARY KEY,
    order_id INTEGER NOT NULL UNIQUE,
    payment_method VARCHAR(50) NOT NULL DEFAULT 'PromptPay QR',
    slip_image TEXT,
    payment_status VARCHAR(20) NOT NULL DEFAULT 'waiting_verify' CHECK (payment_status IN ('waiting_verify', 'success', 'rejected')),
    paid_at TIMESTAMPTZ DEFAULT NOW(),
    FOREIGN KEY (order_id) REFERENCES orders(order_id) ON DELETE CASCADE
);

-- ====================================================================
-- 8. ตารางลิงก์และสิทธิ์ดาวน์โหลด (download_links)
-- ====================================================================
CREATE TABLE download_links (
    download_id SERIAL PRIMARY KEY,
    order_id INTEGER NOT NULL,
    ebook_id INTEGER NOT NULL,
    download_token VARCHAR(100) NOT NULL UNIQUE,
    expire_at TIMESTAMPTZ NOT NULL,
    download_count INTEGER NOT NULL DEFAULT 0 CHECK (download_count >= 0),
    max_downloads INTEGER NOT NULL DEFAULT 5 CHECK (max_downloads > 0),
    FOREIGN KEY (order_id) REFERENCES orders(order_id) ON DELETE CASCADE,
    FOREIGN KEY (ebook_id) REFERENCES ebooks(ebook_id) ON DELETE RESTRICT
);

-- ====================================================================
-- สร้างดัชนี (Indexes) เพื่อเพิ่มความเร็วในการสืบค้นบน PostgreSQL
-- ====================================================================
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_ebooks_category ON ebooks(category_id);
CREATE INDEX IF NOT EXISTS idx_orders_user ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_date ON orders(order_date);
CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_ebook ON order_items(ebook_id);
CREATE INDEX IF NOT EXISTS idx_payments_order ON payments(order_id);
CREATE INDEX IF NOT EXISTS idx_download_token ON download_links(download_token);

-- ====================================================================
-- กำหนดสิทธิ์ Row Level Security (RLS) สำหรับ Supabase
-- เปิดให้ Client เชื่อมต่อผ่าน Anon Key สามารถ อ่าน/เขียน ข้อมูลได้
-- เพื่อความสะดวกตอนนำเสนอโปรเจกต์
-- ====================================================================
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE ebooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE download_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public all roles" ON roles FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public all users" ON users FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public all categories" ON categories FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public all ebooks" ON ebooks FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public all orders" ON orders FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public all order_items" ON order_items FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public all payments" ON payments FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public all download_links" ON download_links FOR ALL USING (true) WITH CHECK (true);

-- ====================================================================
-- ข้อมูลตัวอย่างเริ่มต้น (Seed Data สำหรับ Supabase)
-- ====================================================================

-- 1. เพิ่ม Roles
INSERT INTO roles (role_id, role_name, description) VALUES
(1, 'admin', 'ผู้ดูแลระบบ มีสิทธิ์สูงสุดในการจัดการฐานข้อมูลและอนุมัติออเดอร์'),
(2, 'customer', 'ลูกค้าทั่วไป สามารถเลือกดู สั่งซื้อ และดาวน์โหลดหนังสือที่ชำระเงินแล้ว'),
(3, 'staff', 'เจ้าหน้าที่ฝ่ายบริการ ตรวจสอบสลิปและดูแลคลังสินค้า')
ON CONFLICT (role_id) DO NOTHING;

-- 2. เพิ่ม Users
INSERT INTO users (user_id, role_id, username, email, password_hash, full_name, phone, created_at) VALUES
(1, 1, 'admin', 'admin@ebookgenz.com', 'scrypt:32768:8:1$admin123', 'ผู้ดูแลระบบหลัก', '081-111-2233', '2026-08-01 08:00:00+07'),
(2, 2, 'customer', 'customer@gmail.com', 'scrypt:32768:8:1$cust123', 'คุณลูกค้า ทดสอบระบบ', '089-222-3344', '2026-08-05 09:30:00+07'),
(3, 2, 'somchai_dev', 'somchai@gmail.com', 'scrypt:32768:8:1$somchai123', 'สมชาย สายโค้ด', '086-333-4455', '2026-08-10 11:20:00+07'),
(4, 2, 'ariya_biz', 'ariya@business.co.th', 'scrypt:32768:8:1$ariya123', 'อริยา นักธุรกิจไฟแรง', '085-444-5566', '2026-08-12 14:15:00+07'),
(5, 2, 'natthapon_k', 'natthapon@hotmail.com', 'scrypt:32768:8:1$nattha123', 'ณัฐพล การุณย์', '082-555-6677', '2026-08-15 16:40:00+07'),
(6, 2, 'pimpa_design', 'pimpa@designstudio.io', 'scrypt:32768:8:1$pimpa123', 'พิมพา ดีไซน์เนอร์', '084-666-7788', '2026-08-18 10:05:00+07'),
(7, 2, 'charlie_tech', 'charlie@gmail.com', 'scrypt:32768:8:1$charlie123', 'ชาลี ซอฟต์แวร์แมน', '083-777-8899', '2026-08-20 13:50:00+07'),
(8, 2, 'kanokwan_m', 'kanokwan@yahoo.com', 'scrypt:32768:8:1$kanok123', 'กนกวรรณ มาร์เก็ตติ้ง', '087-888-9900', '2026-08-22 17:25:00+07'),
(9, 2, 'thanawat_p', 'thanawat@gmail.com', 'scrypt:32768:8:1$thana123', 'ธนวัฒน์ โปรเจกต์', '088-999-0011', '2026-08-25 19:10:00+07'),
(10, 3, 'staff_jane', 'jane.staff@ebookgenz.com', 'scrypt:32768:8:1$jane123', 'เจนจิรา ตรวจสลิป', '080-000-1122', '2026-08-02 08:30:00+07')
ON CONFLICT (user_id) DO NOTHING;

-- 3. เพิ่ม Categories
INSERT INTO categories (category_id, category_name, category_slug, description, icon) VALUES
(1, 'Programming & Tech', 'programming', 'หนังสือการเขียนโปรแกรม โค้ดดิ้ง สถาปัตยกรรมระบบ และเทคโนโลยีสมัยใหม่', '💻'),
(2, 'Business & Marketing', 'business', 'กลยุทธ์การตลาด การบริหารธุรกิจ สตาร์ทอัพ และการเงินการลงทุนสำหรับคนรุ่นใหม่', '📈'),
(3, 'Lifestyle & Design', 'lifestyle', 'การออกแบบ แฟชั่น ดีไซน์ระบบ การพัฒนาตนเอง และศิลปะการใช้ชีวิต', '🎨'),
(4, 'AI & Data Science', 'ai_data', 'ปัญญาประดิษฐ์ วิศวกรรมข้อมูล Machine Learning และ Data Analytics', '🤖')
ON CONFLICT (category_id) DO NOTHING;

-- 4. เพิ่ม Ebooks
INSERT INTO ebooks (ebook_id, category_id, title, author, price, description, cover_image, file_url, is_active, created_at) VALUES
(1, 1, 'Clean Code ฉบับปรมาจารย์', 'Robert C. Martin', 350.00, 'เรียนรู้หลักการเขียนโค้ดให้สะอาด อ่านง่าย บำรุงรักษาง่าย และได้มาตรฐานระดับโปรแกรมเมอร์มืออาชีพ', 'https://images.unsplash.com/photo-1532012197267-da84d127e765?auto=format&fit=crop&w=500&q=80', 'files/clean_code.pdf', 1, '2026-08-01 10:00:00+07'),
(2, 1, 'Java Object-Oriented Mastery', 'Somchai Tech', 290.00, 'เจาะลึกหลักการเขียนโปรแกรมเชิงวัตถุ (OOP) ด้วยภาษา Java ตั้งแต่พื้นฐานจนถึงโปรเจกต์ระดับองค์กร', 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&w=500&q=80', 'files/java_oop.pdf', 1, '2026-08-01 10:30:00+07'),
(3, 2, 'Marketing Mix 4P & 4C ยุค GenZ', 'GenZ Strategist', 199.00, 'กลยุทธ์การตลาดเจาะกลุ่มผู้บริโภคยุคใหม่ ทำคอนเทนต์ให้ปัง ยิงแอดให้ตรงเป้าหมาย และสร้างแบรนด์ที่ยั่งยืน', 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=500&q=80', 'files/marketing_genz.pdf', 1, '2026-08-02 11:00:00+07'),
(4, 3, 'Gothic Streetwear Design Guide', 'Dark Star Studio', 450.00, 'คู่มือออกแบบเสื้อผ้าสตรีทแฟชั่นสไตล์โกธิค การเลือกเนื้อผ้า ลายสกรีน และเทรนด์แฟชั่นร่วมสมัย', 'https://images.unsplash.com/photo-1558769132-cb1aea458c5e?auto=format&fit=crop&w=500&q=80', 'files/gothic_design.pdf', 1, '2026-08-02 11:30:00+07'),
(5, 1, 'Database Architecture 3NF & SQL', 'Data Pro', 320.00, 'สถาปัตยกรรมฐานข้อมูลเชิงสัมพันธ์ การออกแบบ Normalization (1NF-3NF) และการปรับแต่ง Index ให้เร็วระดับมิลลิวินาที', 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=500&q=80', 'files/database_3nf.pdf', 1, '2026-08-03 09:00:00+07'),
(6, 2, 'Startup Financial Planning 101', 'Ariya Money', 250.00, 'การวางแผนการเงินสำหรับสตาร์ทอัพ งบกระแสเงินสด การระดมทุน และการบริหารงบประมาณอย่างมีประสิทธิภาพ', 'https://images.unsplash.com/photo-1590283603385-17ffb3a7f29f?auto=format&fit=crop&w=500&q=80', 'files/startup_finance.pdf', 1, '2026-08-03 09:30:00+07'),
(7, 1, 'LiftCode: พิชิตโจทย์อัลกอริทึม', 'Ninja Shadow', 899.00, 'ยกระดับสกิลการแก้โจทย์สัมภาษณ์งานบริษัทเทคชั้นนำ อัลกอริทึม Dynamic Programming และกราฟ', 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?auto=format&fit=crop&w=500&q=80', 'files/liftcode.pdf', 1, '2026-08-04 14:00:00+07'),
(8, 4, 'Generative AI & LLM Engineering', 'Dr. Chaiwat AI', 490.00, 'วิศวกรรมปัญญาประดิษฐ์ยุคใหม่ สร้างแอปพลิเคชันด้วย LLM, Prompt Engineering และ RAG Architecture', 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=500&q=80', 'files/llm_ai.pdf', 1, '2026-08-05 15:00:00+07'),
(9, 3, 'Modern UI/UX Design System', 'Pimpa Design', 380.00, 'สร้างระบบการออกแบบ (Design System) ที่ขยายขนาดได้ สวยงาม และเข้าถึงได้ตามมาตรฐาน Web Accessibility', 'https://images.unsplash.com/photo-1507238691740-187a5b1d37b8?auto=format&fit=crop&w=500&q=80', 'files/uiux_system.pdf', 1, '2026-08-06 16:00:00+07'),
(10, 4, 'Data Storytelling with Dashboard', 'Kanya Insight', 280.00, 'เปลี่ยนตัวเลขแห้งแล้งให้เป็นเรื่องราวสร้างแรงบันดาลใจ เทคนิคการสร้างแดชบอร์ดและรายงานวิเคราะห์', 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=500&q=80', 'files/data_story.pdf', 1, '2026-08-07 10:00:00+07')
ON CONFLICT (ebook_id) DO NOTHING;

-- 5. เพิ่ม Orders (32 รายการ)
INSERT INTO orders (order_id, user_id, total_amount, order_status, order_date) VALUES
(101, 2, 700.00, 'confirmed', '2026-09-01 10:15:00+07'),
(102, 3, 899.00, 'confirmed', '2026-09-01 14:20:00+07'),
(103, 4, 449.00, 'confirmed', '2026-09-02 09:45:00+07'),
(104, 5, 450.00, 'confirmed', '2026-09-02 11:30:00+07'),
(105, 6, 380.00, 'confirmed', '2026-09-03 13:10:00+07'),
(106, 7, 670.00, 'confirmed', '2026-09-04 15:55:00+07'),
(107, 8, 199.00, 'confirmed', '2026-09-05 16:40:00+07'),
(108, 9, 770.00, 'confirmed', '2026-09-06 18:25:00+07'),
(109, 3, 350.00, 'confirmed', '2026-09-07 08:30:00+07'),
(110, 4, 740.00, 'confirmed', '2026-09-08 12:15:00+07'),
(111, 2, 899.00, 'confirmed', '2026-09-09 14:50:00+07'),
(112, 5, 320.00, 'confirmed', '2026-09-10 17:05:00+07'),
(113, 6, 830.00, 'confirmed', '2026-09-11 19:40:00+07'),
(114, 7, 490.00, 'confirmed', '2026-09-12 11:20:00+07'),
(115, 8, 449.00, 'confirmed', '2026-09-13 13:35:00+07'),
(116, 9, 290.00, 'confirmed', '2026-09-14 15:10:00+07'),
(117, 3, 810.00, 'confirmed', '2026-09-15 16:45:00+07'),
(118, 4, 250.00, 'confirmed', '2026-09-16 10:25:00+07'),
(119, 2, 450.00, 'confirmed', '2026-09-17 12:00:00+07'),
(120, 5, 1249.00, 'confirmed', '2026-09-18 14:15:00+07'),
(121, 6, 450.00, 'confirmed', '2026-09-19 16:30:00+07'),
(122, 7, 350.00, 'confirmed', '2026-09-20 18:05:00+07'),
(123, 8, 280.00, 'confirmed', '2026-09-21 09:10:00+07'),
(124, 9, 490.00, 'confirmed', '2026-09-22 11:45:00+07'),
(125, 3, 1219.00, 'confirmed', '2026-09-23 13:50:00+07'),
(126, 4, 380.00, 'confirmed', '2026-09-24 15:20:00+07'),
(127, 2, 540.00, 'confirmed', '2026-09-25 17:35:00+07'),
(128, 5, 899.00, 'confirmed', '2026-09-26 19:15:00+07'),
(129, 6, 320.00, 'pending', '2026-09-27 10:00:00+07'),
(130, 7, 640.00, 'pending', '2026-09-27 13:20:00+07'),
(131, 8, 350.00, 'pending', '2026-09-28 15:40:00+07'),
(132, 9, 450.00, 'cancelled', '2026-09-28 17:00:00+07')
ON CONFLICT (order_id) DO NOTHING;

-- 6. เพิ่ม Order Items (42 รายการ)
INSERT INTO order_items (order_item_id, order_id, ebook_id, quantity, unit_price, subtotal) VALUES
(1, 101, 1, 2, 350.00, 700.00),
(2, 102, 7, 1, 899.00, 899.00),
(3, 103, 3, 1, 199.00, 199.00),
(4, 103, 6, 1, 250.00, 250.00),
(5, 104, 4, 1, 450.00, 450.00),
(6, 105, 9, 1, 380.00, 380.00),
(7, 106, 1, 1, 350.00, 350.00),
(8, 106, 5, 1, 320.00, 320.00),
(9, 107, 3, 1, 199.00, 199.00),
(10, 108, 8, 1, 490.00, 490.00),
(11, 108, 10, 1, 280.00, 280.00),
(12, 109, 1, 1, 350.00, 350.00),
(13, 110, 8, 1, 490.00, 490.00),
(14, 110, 6, 1, 250.00, 250.00),
(15, 111, 7, 1, 899.00, 899.00),
(16, 112, 5, 1, 320.00, 320.00),
(17, 113, 4, 1, 450.00, 450.00),
(18, 113, 9, 1, 380.00, 380.00),
(19, 114, 8, 1, 490.00, 490.00),
(20, 115, 3, 1, 199.00, 199.00),
(21, 115, 6, 1, 250.00, 250.00),
(22, 116, 2, 1, 290.00, 290.00),
(23, 117, 1, 1, 350.00, 350.00),
(24, 117, 4, 1, 450.00, 450.00),
(25, 118, 6, 1, 250.00, 250.00),
(26, 119, 4, 1, 450.00, 450.00),
(27, 120, 7, 1, 899.00, 899.00),
(28, 120, 1, 1, 350.00, 350.00),
(29, 121, 4, 1, 450.00, 450.00),
(30, 122, 1, 1, 350.00, 350.00),
(31, 123, 10, 1, 280.00, 280.00),
(32, 124, 8, 1, 490.00, 490.00),
(33, 125, 7, 1, 899.00, 899.00),
(34, 125, 5, 1, 320.00, 320.00),
(35, 126, 9, 1, 380.00, 380.00),
(36, 127, 2, 1, 290.00, 290.00),
(37, 127, 6, 1, 250.00, 250.00),
(38, 128, 7, 1, 899.00, 899.00),
(39, 129, 5, 1, 320.00, 320.00),
(40, 130, 5, 2, 320.00, 640.00),
(41, 131, 1, 1, 350.00, 350.00),
(42, 132, 4, 1, 450.00, 450.00)
ON CONFLICT (order_item_id) DO NOTHING;

-- 7. เพิ่ม Payments (32 รายการ)
INSERT INTO payments (payment_id, order_id, payment_method, slip_image, payment_status, paid_at) VALUES
(1, 101, 'PromptPay QR', 'https://images.unsplash.com/photo-1556742049-0a67d553c2a5?w=500', 'success', '2026-09-01 10:18:00+07'),
(2, 102, 'PromptPay QR', 'https://images.unsplash.com/photo-1556742049-0a67d553c2a5?w=500', 'success', '2026-09-01 14:22:00+07'),
(3, 103, 'Credit Card', NULL, 'success', '2026-09-02 09:46:00+07'),
(4, 104, 'PromptPay QR', 'https://images.unsplash.com/photo-1556742049-0a67d553c2a5?w=500', 'success', '2026-09-02 11:32:00+07'),
(5, 105, 'PromptPay QR', 'https://images.unsplash.com/photo-1556742049-0a67d553c2a5?w=500', 'success', '2026-09-03 13:12:00+07'),
(6, 106, 'Bank Transfer', 'https://images.unsplash.com/photo-1556742049-0a67d553c2a5?w=500', 'success', '2026-09-04 15:58:00+07'),
(7, 107, 'PromptPay QR', 'https://images.unsplash.com/photo-1556742049-0a67d553c2a5?w=500', 'success', '2026-09-05 16:42:00+07'),
(8, 108, 'PromptPay QR', 'https://images.unsplash.com/photo-1556742049-0a67d553c2a5?w=500', 'success', '2026-09-06 18:28:00+07'),
(9, 109, 'PromptPay QR', 'https://images.unsplash.com/photo-1556742049-0a67d553c2a5?w=500', 'success', '2026-09-07 08:32:00+07'),
(10, 110, 'Credit Card', NULL, 'success', '2026-09-08 12:16:00+07'),
(11, 111, 'PromptPay QR', 'https://images.unsplash.com/photo-1556742049-0a67d553c2a5?w=500', 'success', '2026-09-09 14:52:00+07'),
(12, 112, 'PromptPay QR', 'https://images.unsplash.com/photo-1556742049-0a67d553c2a5?w=500', 'success', '2026-09-10 17:08:00+07'),
(13, 113, 'Bank Transfer', 'https://images.unsplash.com/photo-1556742049-0a67d553c2a5?w=500', 'success', '2026-09-11 19:44:00+07'),
(14, 114, 'PromptPay QR', 'https://images.unsplash.com/photo-1556742049-0a67d553c2a5?w=500', 'success', '2026-09-12 11:23:00+07'),
(15, 115, 'PromptPay QR', 'https://images.unsplash.com/photo-1556742049-0a67d553c2a5?w=500', 'success', '2026-09-13 13:38:00+07'),
(16, 116, 'PromptPay QR', 'https://images.unsplash.com/photo-1556742049-0a67d553c2a5?w=500', 'success', '2026-09-14 15:13:00+07'),
(17, 117, 'PromptPay QR', 'https://images.unsplash.com/photo-1556742049-0a67d553c2a5?w=500', 'success', '2026-09-15 16:48:00+07'),
(18, 118, 'Credit Card', NULL, 'success', '2026-09-16 10:26:00+07'),
(19, 119, 'PromptPay QR', 'https://images.unsplash.com/photo-1556742049-0a67d553c2a5?w=500', 'success', '2026-09-17 12:02:00+07'),
(20, 120, 'PromptPay QR', 'https://images.unsplash.com/photo-1556742049-0a67d553c2a5?w=500', 'success', '2026-09-18 14:18:00+07'),
(21, 121, 'PromptPay QR', 'https://images.unsplash.com/photo-1556742049-0a67d553c2a5?w=500', 'success', '2026-09-19 16:32:00+07'),
(22, 122, 'Bank Transfer', 'https://images.unsplash.com/photo-1556742049-0a67d553c2a5?w=500', 'success', '2026-09-20 18:08:00+07'),
(23, 123, 'PromptPay QR', 'https://images.unsplash.com/photo-1556742049-0a67d553c2a5?w=500', 'success', '2026-09-21 09:12:00+07'),
(24, 124, 'PromptPay QR', 'https://images.unsplash.com/photo-1556742049-0a67d553c2a5?w=500', 'success', '2026-09-22 11:48:00+07'),
(25, 125, 'Credit Card', NULL, 'success', '2026-09-23 13:52:00+07'),
(26, 126, 'PromptPay QR', 'https://images.unsplash.com/photo-1556742049-0a67d553c2a5?w=500', 'success', '2026-09-24 15:22:00+07'),
(27, 127, 'PromptPay QR', 'https://images.unsplash.com/photo-1556742049-0a67d553c2a5?w=500', 'success', '2026-09-25 17:38:00+07'),
(28, 128, 'PromptPay QR', 'https://images.unsplash.com/photo-1556742049-0a67d553c2a5?w=500', 'success', '2026-09-26 19:18:00+07'),
(29, 129, 'PromptPay QR', 'https://images.unsplash.com/photo-1556742049-0a67d553c2a5?w=500', 'waiting_verify', '2026-09-27 10:02:00+07'),
(30, 130, 'Bank Transfer', 'https://images.unsplash.com/photo-1556742049-0a67d553c2a5?w=500', 'waiting_verify', '2026-09-27 13:22:00+07'),
(31, 131, 'PromptPay QR', 'https://images.unsplash.com/photo-1556742049-0a67d553c2a5?w=500', 'waiting_verify', '2026-09-28 15:42:00+07'),
(32, 132, 'PromptPay QR', NULL, 'rejected', '2026-09-28 17:02:00+07')
ON CONFLICT (payment_id) DO NOTHING;

-- 8. เพิ่ม Download Links (38 รายการ)
INSERT INTO download_links (download_id, order_id, ebook_id, download_token, expire_at, download_count, max_downloads) VALUES
(1, 101, 1, 'dl_token_101_1_a8f9c2', '2026-12-31 23:59:59+07', 2, 5),
(2, 102, 7, 'dl_token_102_7_b7e3d1', '2026-12-31 23:59:59+07', 1, 5),
(3, 103, 3, 'dl_token_103_3_c4b2a9', '2026-12-31 23:59:59+07', 0, 5),
(4, 103, 6, 'dl_token_103_6_d1e8f7', '2026-12-31 23:59:59+07', 1, 5),
(5, 104, 4, 'dl_token_104_4_e9a3b5', '2026-12-31 23:59:59+07', 3, 5),
(6, 105, 9, 'dl_token_105_9_f2c7d4', '2026-12-31 23:59:59+07', 1, 5),
(7, 106, 1, 'dl_token_106_1_g5h6j7', '2026-12-31 23:59:59+07', 2, 5),
(8, 106, 5, 'dl_token_106_5_k8l9m0', '2026-12-31 23:59:59+07', 0, 5),
(9, 107, 3, 'dl_token_107_3_n1p2q3', '2026-12-31 23:59:59+07', 1, 5),
(10, 108, 8, 'dl_token_108_8_r4s5t6', '2026-12-31 23:59:59+07', 4, 5),
(11, 108, 10, 'dl_token_108_10_u7v8w9', '2026-12-31 23:59:59+07', 1, 5),
(12, 109, 1, 'dl_token_109_1_x0y1z2', '2026-12-31 23:59:59+07', 2, 5),
(13, 110, 8, 'dl_token_110_8_a3b4c5', '2026-12-31 23:59:59+07', 1, 5),
(14, 110, 6, 'dl_token_110_6_d6e7f8', '2026-12-31 23:59:59+07', 0, 5),
(15, 111, 7, 'dl_token_111_7_g9h0j1', '2026-12-31 23:59:59+07', 3, 5),
(16, 112, 5, 'dl_token_112_5_k2l3m4', '2026-12-31 23:59:59+07', 1, 5),
(17, 113, 4, 'dl_token_113_4_n5p6q7', '2026-12-31 23:59:59+07', 2, 5),
(18, 113, 9, 'dl_token_113_9_r8s9t0', '2026-12-31 23:59:59+07', 1, 5),
(19, 114, 8, 'dl_token_114_8_u1v2w3', '2026-12-31 23:59:59+07', 0, 5),
(20, 115, 3, 'dl_token_115_3_x4y5z6', '2026-12-31 23:59:59+07', 1, 5),
(21, 115, 6, 'dl_token_115_6_a7b8c9', '2026-12-31 23:59:59+07', 2, 5),
(22, 116, 2, 'dl_token_116_2_d0e1f2', '2026-12-31 23:59:59+07', 1, 5),
(23, 117, 1, 'dl_token_117_1_g3h4j5', '2026-12-31 23:59:59+07', 2, 5),
(24, 117, 4, 'dl_token_117_4_k6l7m8', '2026-12-31 23:59:59+07', 0, 5),
(25, 118, 6, 'dl_token_118_6_n9p0q1', '2026-12-31 23:59:59+07', 1, 5),
(26, 119, 4, 'dl_token_119_4_r2s3t4', '2026-12-31 23:59:59+07', 3, 5),
(27, 120, 7, 'dl_token_120_7_u5v6w7', '2026-12-31 23:59:59+07', 2, 5),
(28, 120, 1, 'dl_token_120_1_x8y9z0', '2026-12-31 23:59:59+07', 1, 5),
(29, 121, 4, 'dl_token_121_4_a1b2c3', '2026-12-31 23:59:59+07', 1, 5),
(30, 122, 1, 'dl_token_122_1_d4e5f6', '2026-12-31 23:59:59+07', 0, 5),
(31, 123, 10, 'dl_token_123_10_g7h8j9', '2026-12-31 23:59:59+07', 1, 5),
(32, 124, 8, 'dl_token_124_8_k0l1m2', '2026-12-31 23:59:59+07', 2, 5),
(33, 125, 7, 'dl_token_125_7_n3p4q5', '2026-12-31 23:59:59+07', 1, 5),
(34, 125, 5, 'dl_token_125_5_r6s7t8', '2026-12-31 23:59:59+07', 0, 5),
(35, 126, 9, 'dl_token_126_9_u9v0w1', '2026-12-31 23:59:59+07', 2, 5),
(36, 127, 2, 'dl_token_127_2_x2y3z4', '2026-12-31 23:59:59+07', 1, 5),
(37, 127, 6, 'dl_token_127_6_a5b6c7', '2026-12-31 23:59:59+07', 1, 5),
(38, 128, 7, 'dl_token_128_7_d8e9f0', '2026-12-31 23:59:59+07', 4, 5)
ON CONFLICT (download_id) DO NOTHING;

-- รีเซ็ตค่า Sequence ให้เริ่มต่อจาก ID สูงสุดล่าสุด
SELECT setval('roles_role_id_seq', (SELECT MAX(role_id) FROM roles));
SELECT setval('users_user_id_seq', (SELECT MAX(user_id) FROM users));
SELECT setval('categories_category_id_seq', (SELECT MAX(category_id) FROM categories));
SELECT setval('ebooks_ebook_id_seq', (SELECT MAX(ebook_id) FROM ebooks));
SELECT setval('orders_order_id_seq', (SELECT MAX(order_id) FROM orders));
SELECT setval('order_items_order_item_id_seq', (SELECT MAX(order_item_id) FROM order_items));
SELECT setval('payments_payment_id_seq', (SELECT MAX(payment_id) FROM payments));
SELECT setval('download_links_download_id_seq', (SELECT MAX(download_id) FROM download_links));

-- ====================================================================
-- สิ้นสุดสคริปต์สำหรับ Supabase
-- ====================================================================
