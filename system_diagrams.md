# แผนภาพสถาปัตยกรรมระบบ (System Diagrams): EbookGenZ

เอกสารนี้รวบรวมแผนภาพการออกแบบเชิงโครงสร้างและพฤติกรรมของระบบ **EbookGenZ** ประกอบด้วย **Class Diagram** (โครงสร้างเชิงคลาสและการทำงาน) และ **Sequence Diagram** (ลำดับขั้นตอนการทำงานของระบบ) ตามมาตรฐาน UML เพื่อให้เห็นภาพการทำงานของระบบอย่างชัดเจน

---

## 1. Class Diagram (แผนภาพเชิงคลาส)

Class Diagram แสดงโครงสร้างของระบบในระดับ Domain Models และ Service Layers รวมถึงคุณลักษณะ (Attributes), ฟังก์ชันการทำงาน (Methods) และความสัมพันธ์ระหว่างคลาส (Relationships):

```mermaid
classDiagram
    %% Entities / Models
    class Role {
        +int role_id
        +string role_name
        +string description
        +getPermissions() List~string~
    }

    class User {
        +int user_id
        +int role_id
        +string username
        +string email
        +string password_hash
        +string full_name
        +boolean is_approved
        +datetime created_at
        +register(data) boolean
        +login(credentials) boolean
        +updateProfile(data) boolean
        +isAdmin() boolean
    }

    class Category {
        +int category_id
        +string category_name
        +string description
        +getBooks() List~EBook~
    }

    class EBook {
        +int ebook_id
        +int category_id
        +string title
        +string author
        +decimal price
        +string description
        +string cover_image
        +string file_url
        +int is_active
        +getDetails() dict
        +updatePrice(new_price) boolean
        +toggleActive(status) void
    }

    class CartItem {
        +int cart_item_id
        +int ebook_id
        +int quantity
        +decimal unit_price
        +getSubtotal() decimal
    }

    class Cart {
        +int cart_id
        +int user_id
        +List~CartItem~ items
        +addItem(ebook, qty) void
        +removeItem(ebook_id) void
        +updateQuantity(ebook_id, qty) void
        +calculateTotal() decimal
        +clear() void
    }

    class Order {
        +int order_id
        +int user_id
        +decimal total_amount
        +string order_status
        +datetime created_at
        +List~OrderItem~ items
        +placeOrder() boolean
        +confirmOrder() boolean
        +cancelOrder() boolean
        +canDownload() boolean
    }

    class OrderItem {
        +int order_item_id
        +int order_id
        +int ebook_id
        +int quantity
        +decimal unit_price
        +decimal subtotal
    }

    class Payment {
        +int payment_id
        +int order_id
        +decimal amount
        +string payment_method
        +string slip_image_url
        +string payment_status
        +datetime payment_date
        +uploadSlip(image_data) boolean
        +verifySlip(admin_id) boolean
    }

    class DownloadLink {
        +int download_id
        +int order_id
        +int ebook_id
        +string download_token
        +int download_count
        +int max_downloads
        +datetime created_at
        +isValid() boolean
        +incrementDownload() boolean
        +isLimitReached() boolean
    }

    %% Service Layer
    class AuthService {
        +authenticate(username, password) User
        +registerUser(userData) User
        +approveUser(user_id) boolean
    }

    class OrderService {
        +createOrder(user, cart) Order
        +processPayment(order_id, slip_url) Payment
        +approveOrder(order_id) boolean
        +rejectOrder(order_id, reason) boolean
    }

    class DownloadService {
        +generateDownloadTokens(order_id) List~DownloadLink~
        +validateAndGetFile(token) string
    }

    %% Relationships
    Role "1" <-- "0..*" User : assigned to
    Category "1" <-- "0..*" EBook : categorizes
    User "1" --> "0..*" Order : places
    User "1" --> "1" Cart : owns
    Cart "1" *-- "0..*" CartItem : contains
    CartItem "0..*" --> "1" EBook : references
    Order "1" *-- "1..*" OrderItem : contains
    OrderItem "0..*" --> "1" EBook : references
    Order "1" -- "1" Payment : paid by
    Order "1" --> "0..*" DownloadLink : generates
    DownloadLink "0..*" --> "1" EBook : provides access to

    AuthService ..> User : manages
    OrderService ..> Order : manages
    OrderService ..> Payment : verifies
    DownloadService ..> DownloadLink : manages
```

---

## 2. Sequence Diagrams (แผนภาพลำดับขั้นตอนการทำงาน)

### 2.1 แผนภาพลำดับที่ 1: การสั่งซื้อและการแนบสลิปชำระเงิน (Customer Checkout & Slip Upload Flow)
แสดงขั้นตอนที่ลูกค้าเลือกซื้อหนังสือ ชำระเงินผ่าน QR Code จำลอง แนบภาพสลิป และระบบบันทึกข้อมูลเพื่อรอการตรวจสอบจากแอดมิน:

```mermaid
sequenceDiagram
    autonumber
    actor Customer as ลูกค้า (Customer)
    participant Storefront as หน้าร้าน (index.html / cart.html)
    participant CartService as ตะกร้าสินค้า (Cart System)
    participant OrderService as ระบบจัดการคำสั่งซื้อ (Order Service)
    participant CloudDB as ฐานข้อมูล Supabase (PostgreSQL)
    actor Admin as ผู้ดูแลระบบ (Admin)

    Customer->>Storefront: เลือกหนังสือ และกด "เพิ่มลงตะกร้า"
    Storefront->>CartService: addItem(ebook_id, quantity)
    CartService-->>Storefront: คำนวณราคารวม (Total Amount)

    Customer->>Storefront: กด "ดำเนินการสั่งซื้อ (Checkout)"
    Storefront->>Customer: แสดงหน้าสรุปบิล และ QR Code สำหรับชำระเงิน
    Customer->>Customer: สแกนชำระเงินจำลอง และเตรียมรูปภาพสลิป

    Customer->>Storefront: แนบรูปภาพสลิป และกด "ยืนยันการสั่งซื้อ"
    Storefront->>OrderService: submitOrder(items, slip_image, total_amount)
    
    OrderService->>CloudDB: INSERT INTO orders (user_id, total, status='pending')
    CloudDB-->>OrderService: order_id
    OrderService->>CloudDB: INSERT INTO order_items (order_id, ebook_id, qty, subtotal)
    OrderService->>CloudDB: INSERT INTO payments (order_id, amount, slip_url, status='pending')
    
    CloudDB-->>Storefront: บันทึกข้อมูลสำเร็จ (Order Pending)
    Storefront-->>Customer: แสดงหน้าสำเร็จ "คำสั่งซื้ออยู่ระหว่างรอแอดมินตรวจสอบสลิป"
    CloudDB--)Admin: Real-time Notification: มีคำสั่งซื้อและสลิปใหม่รอการตรวจสอบ
```

---

### 2.2 แผนภาพลำดับที่ 2: การตรวจสอบสลิปและอนุมัติการสั่งซื้อ (Admin Slip Verification & Order Approval Flow)
แสดงขั้นตอนที่ผู้ดูแลระบบตรวจสอบความถูกต้องของสลิป และกดอนุมัติเพื่อปลดล็อกสิทธิ์ดาวน์โหลดให้ลูกค้า:

```mermaid
sequenceDiagram
    autonumber
    actor Admin as ผู้ดูแลระบบ (Admin)
    participant AdminUI as หน้าผู้ดูแล (admin.html)
    participant OrderService as ระบบจัดการคำสั่งซื้อ (Order Service)
    participant DownloadService as ระบบสร้างสิทธิ์ดาวน์โหลด
    participant CloudDB as ฐานข้อมูล Supabase (PostgreSQL)
    actor Customer as ลูกค้า (Customer)

    Admin->>AdminUI: เปิดหน้าตรวจสอบคำสั่งซื้อ (Orders Management)
    AdminUI->>CloudDB: SELECT * FROM orders JOIN payments WHERE status = 'pending'
    CloudDB-->>AdminUI: รายการคำสั่งซื้อพร้อมรูปภาพสลิปการโอนเงิน

    Admin->>AdminUI: ตรวจสอบความถูกต้องของรูปภาพสลิปและยอดเงิน
    Admin->>AdminUI: กดปุ่ม "✅ อนุมัติคำสั่งซื้อ (Confirm Order)"
    
    AdminUI->>OrderService: approveOrder(order_id)
    OrderService->>CloudDB: UPDATE orders SET order_status = 'confirmed' WHERE order_id = ?
    OrderService->>CloudDB: UPDATE payments SET payment_status = 'verified' WHERE order_id = ?
    
    OrderService->>DownloadService: generateDownloadTokens(order_id)
    loop แต่ละรายการ EBook ในคำสั่งซื้อ
        DownloadService->>CloudDB: INSERT INTO download_links (order_id, ebook_id, download_token, download_count=0, max_downloads=5)
    end
    
    CloudDB-->>AdminUI: อนุมัติสำเร็จ ปรับสถานะคำสั่งซื้อเป็น confirmed
    AdminUI-->>Admin: แสดงผลการยืนยันคำสั่งซื้อสำเร็จ
    CloudDB--)Customer: Real-time Update: คำสั่งซื้อได้รับการอนุมัติ ปลดล็อกปุ่มดาวน์โหลด
```

---

### 2.3 แผนภาพลำดับที่ 3: การตรวจสอบสิทธิ์และการดาวน์โหลดไฟล์ E-Book (Secure Download Flow)
แสดงกลไกการรักษาความปลอดภัยในระดับข้อมูล โดยระบบจะไม่อนุญาตให้ดาวน์โหลดจนกว่าคำสั่งซื้อจะมีสถานะ `confirmed` เท่านั้น:

```mermaid
sequenceDiagram
    autonumber
    actor Customer as ลูกค้า (Customer)
    participant DownloadsUI as หน้าดาวน์โหลด (downloads.html)
    participant DownloadService as ระบบควบคุมการดาวน์โหลด (Download Service)
    participant CloudDB as ฐานข้อมูล Supabase (PostgreSQL)

    Customer->>DownloadsUI: เข้าสู่หน้าคลังดาวน์โหลดส่วนตัว
    DownloadsUI->>CloudDB: ดึงคำสั่งซื้อและลิงก์ดาวน์โหลดของผู้ใช้ปัจจุบัน
    CloudDB-->>DownloadsUI: รายการหนังสือ สถานะคำสั่งซื้อ และจำนวนครั้งดาวน์โหลด

    alt สถานะคำสั่งซื้อยังเป็น 'pending' (รอตรวจสอบ)
        DownloadsUI-->>Customer: ปุ่มดาวน์โหลดถูก Disable แสดงป้าย "⏳ รอแอดมินอนุมัติสลิป"
    else สถานะคำสั่งซื้อเป็น 'confirmed' (อนุมัติแล้ว)
        DownloadsUI-->>Customer: ปุ่มดาวน์โหลดแสดงผลพร้อมใช้งาน "📥 ดาวน์โหลด PDF"
        
        Customer->>DownloadsUI: คลิกปุ่มดาวน์โหลดไฟล์ E-Book
        DownloadsUI->>DownloadService: requestDownload(download_token)
        DownloadService->>CloudDB: ตรวจสอบ download_token และ download_count < max_downloads
        
        alt จำนวนครั้งการดาวน์โหลดยังไม่เกินขีดจำกัด (count < 5)
            DownloadService->>CloudDB: UPDATE download_links SET download_count = download_count + 1
            DownloadService-->>DownloadsUI: ส่งมอบ URL สำหรับดาวน์โหลดไฟล์ PDF
            DownloadsUI-->>Customer: เริ่มต้นการดาวน์โหลดไฟล์หนังสือทันที
        else จำนวนครั้งการดาวน์โหลดเกินกำหนด (count >= 5)
            DownloadService-->>DownloadsUI: ปฏิเสธการเข้าถึง "ครบขีดจำกัดการดาวน์โหลด 5 ครั้งแล้ว"
            DownloadsUI-->>Customer: แจ้งเตือนข้อผิดพลาด
        end
    end
```

---

## 3. สรุปความสอดคล้องกับข้อกำหนดระบบ
* **Class Diagram:** ครอบคลุม Entities ทั้ง 8 ตาราง พร้อม Service Controllers สำหรับ Business Rules ตามข้อกำหนดโครงการ
* **Sequence Diagram:** อธิบายการทำงาน 3 โฟลว์หลักที่แสดงถึงความปลอดภัยในการซื้อขายไฟล์ดิจิทัล การตรวจสอบสลิปของแอดมิน และการควบคุมสิทธิ์ดาวน์โหลดด้วย Token อย่างรัดกุม
