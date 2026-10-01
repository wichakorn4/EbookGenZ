// ====================================================================
// supabase.js - ตัวจัดการการเชื่อมต่อ Supabase สำหรับโปรเจกต์ EbookGenZ
// รองรับทั้งการดึงข้อมูลสดจาก Supabase และระบบ Fallback ป้องกันเว็บดับ
// ====================================================================

// 1. กำหนดค่า Supabase Project URL และ Anon Key
// (คุณสามารถใส่ค่า URL และ Anon Key ของโปรเจกต์คุณตรงนี้ หรือตั้งค่าผ่านปุ่ม ⚙️ บนหน้าเว็บได้เช่นกัน)
let SUPABASE_URL = localStorage.getItem('supabase_url') || "https://psrchqykpgycvjuwvnmy.supabase.co";
let SUPABASE_ANON_KEY = localStorage.getItem('supabase_anon_key') || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBzcmNocXlrcGd5Y3ZqdXd2bm15Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA3OTM4NTAsImV4cCI6MjEwNjM2OTg1MH0.2sMcoBRy3TXUL9bSFlDgr5KA6EMoRQQWa8Zr-kxVYu0";

// ตัวแปรเก็บ Instance ของ Supabase Client
let supabaseClient = null;

// ฟังก์ชันโหลด Supabase SDK อัตโนมัติหากยังไม่ได้ใส่ใน <head>
function ensureSupabaseSDK(callback) {
    if (window.supabase) {
        if (callback) callback();
        return;
    }
    const script = document.createElement('script');
    script.src = "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2";
    script.onload = () => {
        initSupabaseClient();
        if (callback) callback();
    };
    document.head.appendChild(script);
}

// เริ่มต้นสร้าง Supabase Client
function initSupabaseClient() {
    SUPABASE_URL = localStorage.getItem('supabase_url') || SUPABASE_URL;
    SUPABASE_ANON_KEY = localStorage.getItem('supabase_anon_key') || SUPABASE_ANON_KEY;

    if (window.supabase && SUPABASE_URL && SUPABASE_ANON_KEY && SUPABASE_URL.startsWith('http')) {
        try {
            supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
            console.log('⚡ Supabase Client เชื่อมต่อสำเร็จ:', SUPABASE_URL);
            updateSupabaseStatusBadge(true);
            return supabaseClient;
        } catch (err) {
            console.warn('⚠️ ไม่สามารถเริ่มต้น Supabase Client:', err);
            updateSupabaseStatusBadge(false);
        }
    } else {
        updateSupabaseStatusBadge(false);
    }
    return null;
}

// ตรวจสอบสถานะการเชื่อมต่อ Supabase
function isSupabaseReady() {
    return supabaseClient !== null;
}

// ====================================================================
// ฟังก์ชัน CRUD สำหรับตาราง E-Books
// ====================================================================

// 1. ดึงหนังสือทั้งหมดจาก Supabase
async function getEbooksFromSupabase() {
    if (!isSupabaseReady()) return null;
    try {
        const { data, error } = await supabaseClient
            .from('ebooks')
            .select('*, categories(category_name, category_slug)')
            .order('ebook_id', { ascending: true });

        if (error) throw error;
        return data;
    } catch (err) {
        console.error('❌ ดึง ebooks จาก Supabase ผิดพลาด:', err);
        return null;
    }
}

// 2. เพิ่ม E-Book ลง Supabase
async function addEbookToSupabase(book) {
    if (!isSupabaseReady()) return null;
    try {
        const { data, error } = await supabaseClient
            .from('ebooks')
            .insert([{
                category_id: book.category_id || 1,
                title: book.title,
                author: book.author,
                price: book.price,
                description: book.description || '',
                cover_image: book.cover_image || book.cover,
                file_url: book.file_url || book.file || 'files/sample.pdf',
                is_active: book.is_active !== undefined ? book.is_active : 1
            }])
            .select();

        if (error) throw error;
        return data;
    } catch (err) {
        console.error('❌ เพิ่ม E-Book ลง Supabase ผิดพลาด:', err);
        return null;
    }
}

// 3. แก้ไข E-Book บน Supabase
async function updateEbookOnSupabase(ebookId, updates) {
    if (!isSupabaseReady()) return null;
    try {
        const { data, error } = await supabaseClient
            .from('ebooks')
            .update(updates)
            .eq('ebook_id', ebookId)
            .select();

        if (error) throw error;
        return data;
    } catch (err) {
        console.error('❌ อัปเดต E-Book บน Supabase ผิดพลาด:', err);
        return null;
    }
}

// 4. ลบ E-Book บน Supabase
async function deleteEbookFromSupabase(ebookId) {
    if (!isSupabaseReady()) return null;
    try {
        const { error } = await supabaseClient
            .from('ebooks')
            .delete()
            .eq('ebook_id', ebookId);

        if (error) throw error;
        return true;
    } catch (err) {
        console.error('❌ ลบ E-Book จาก Supabase ผิดพลาด:', err);
        return false;
    }
}

// ====================================================================
// ฟังก์ชันจัดการรูปภาพสลิป (Client-Side Compression สำหรับมือถือ)
// ====================================================================

// ย่อขนาดรูปภาพสลิปจากกล้องมือถือ ให้เหลือขนาดประมาณ 80-150KB เพื่อส่งขึ้น Supabase ได้ทันที
function compressSlipImage(file, maxWidth = 1000, maxHeight = 1200, quality = 0.8) {
    return new Promise((resolve, reject) => {
        if (!file) {
            resolve("");
            return;
        }

        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target.result;
            img.onload = () => {
                let width = img.width;
                let height = img.height;

                // คำนวณอัตราส่วนการย่อขนาด
                if (width > maxWidth || height > maxHeight) {
                    if (width / height > maxWidth / maxHeight) {
                        height = Math.round((height * maxWidth) / width);
                        width = maxWidth;
                    } else {
                        width = Math.round((width * maxHeight) / height);
                        height = maxHeight;
                    }
                }

                const canvas = document.createElement('canvas');
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);

                // แปลงเป็น JPEG คุณภาพ 0.8
                const compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
                console.log(`📸 บีบอัดรูปสลิปจาก ${(file.size / 1024).toFixed(1)} KB -> ${(compressedDataUrl.length / 1024).toFixed(1)} KB`);
                resolve(compressedDataUrl);
            };
            img.onerror = (err) => {
                console.warn('⚠️ ไม่สามารถบีบอัดรูปภาพได้ ใช้รูปต้นฉบับแทน:', err);
                resolve(event.target.result);
            };
        };
        reader.onerror = (err) => {
            console.error('❌ อ่านไฟล์สลิปผิดพลาด:', err);
            resolve("");
        };
    });
}

// ====================================================================
// ฟังก์ชัน CRUD สำหรับคำสั่งซื้อ (Orders & Order Items & Payments)
// ====================================================================

// ช่วยหาหรือสร้าง User ID บน Supabase ให้สอดคล้องกับตาราง users
async function resolveSupabaseUserId(user) {
    if (!isSupabaseReady() || !user) return 2; // ค่าเริ่มต้นคือ user_id: 2 (customer)
    
    try {
        // 1. ถ้ามี user.id ที่เป็นตัวเลขหลักเดียว/สองหลัก ลองตรวจในตาราง users ก่อน
        const rawId = Number(user.id);
        if (!isNaN(rawId) && rawId > 0 && rawId < 100000) {
            const { data } = await supabaseClient.from('users').select('user_id').eq('user_id', rawId).maybeSingle();
            if (data && data.user_id) return data.user_id;
        }

        // 2. ถ้ามี username หรือ email ลองค้นหา
        if (user.username || user.email) {
            let query = supabaseClient.from('users').select('user_id');
            if (user.username) {
                query = query.eq('username', user.username);
            } else if (user.email) {
                query = query.eq('email', user.email);
            }
            const { data } = await query.maybeSingle();
            if (data && data.user_id) return data.user_id;

            // 3. ถ้าเป็นผู้ใช้ใหม่ที่เพิ่งสมัครบนเครื่อง ให้บันทึกบัญชีลงตาราง users ใน Supabase ด้วย
            const safeUsername = (user.username || ('user_' + Math.floor(Math.random() * 10000))).toLowerCase().replace(/\s+/g, '_');
            const safeEmail = user.email || `${safeUsername}@ebookgenz.com`;
            const { data: newUser, error: insertUserErr } = await supabaseClient
                .from('users')
                .insert([{
                    role_id: 2,
                    username: safeUsername,
                    email: safeEmail,
                    password_hash: user.password || '123',
                    full_name: user.fullName || user.username || 'ลูกค้าทั่วไป',
                    phone: user.phone || '0812345678'
                }])
                .select()
                .maybeSingle();

            if (newUser && newUser.user_id) return newUser.user_id;
            if (insertUserErr) console.warn('สร้าง user ใหม่บน Supabase ไม่สำเร็จ:', insertUserErr);
        }
    } catch (e) {
        console.warn('⚠️ เกิดข้อผิดพลาดในการตรวจสอบ User บน Supabase:', e);
    }
    return 2; // Fallback กลับมาที่ ID: 2 สมชาย สายเทค
}

// 1. ดึงคำสั่งซื้อทั้งหมดจาก Supabase (สำหรับหน้า Admin)
async function getOrdersFromSupabase() {
    if (!isSupabaseReady()) return null;
    try {
        const { data, error } = await supabaseClient
            .from('orders')
            .select(`
                *,
                users(user_id, full_name, email, phone),
                order_items(
                    order_item_id, ebook_id, quantity, unit_price, subtotal,
                    ebooks(ebook_id, title, author, cover_image, price)
                ),
                payments(payment_id, payment_method, payment_status, slip_image, paid_at)
            `)
            .order('order_id', { ascending: false });

        if (error) throw error;
        return data;
    } catch (err) {
        console.error('❌ ดึง orders จาก Supabase ผิดพลาด:', err);
        return null;
    }
}

// 2. ดึงคำสั่งซื้อเฉพาะของลูกค้ารายหนึ่ง (สำหรับหน้า downloads.html)
async function getUserOrdersFromSupabase(userId, username) {
    if (!isSupabaseReady()) return null;
    try {
        let query = supabaseClient
            .from('orders')
            .select(`
                *,
                users(user_id, full_name, email),
                order_items(
                    order_item_id, ebook_id, quantity, unit_price, subtotal,
                    ebooks(ebook_id, title, author, cover_image, price, file_url)
                ),
                payments(payment_id, payment_method, payment_status, slip_image, paid_at),
                download_links(download_id, ebook_id, download_token, expire_at, download_count)
            `)
            .order('order_id', { ascending: false });

        // กรองตาม user_id
        if (userId && Number(userId) > 0 && Number(userId) < 100000) {
            query = query.eq('user_id', Number(userId));
        }

        const { data, error } = await query;
        if (error) throw error;
        return data;
    } catch (err) {
        console.error('❌ ดึง user orders จาก Supabase ผิดพลาด:', err);
        return null;
    }
}

// 3. สร้างคำสั่งซื้อใหม่พร้อมรายการย่อยและข้อมูลการชำระเงิน/สลิป
async function createOrderInSupabase(orderData, items, slipBase64, paymentMethod) {
    if (!isSupabaseReady()) return null;
    try {
        console.log('⚡ กำลังบันทึกคำสั่งซื้อลง Supabase...');

        // ตรวจสอบและหา user_id ในระบบ Supabase
        const targetUserId = await resolveSupabaseUserId(orderData);

        // คำนวณยอดรวมที่แท้จริง
        const calculatedTotal = items.reduce((sum, it) => sum + (Number(it.price) * (Number(it.quantity) || 1)), 0);
        const finalTotal = orderData.total || calculatedTotal;

        // บันทึกคำสั่งซื้อหลัก (orders)
        const { data: newOrder, error: orderErr } = await supabaseClient
            .from('orders')
            .insert([{
                user_id: targetUserId,
                total_amount: finalTotal,
                order_status: 'pending'
            }])
            .select()
            .single();

        if (orderErr) throw orderErr;
        console.log('✅ บันทึก Order ID สำเร็จ:', newOrder.order_id);

        // บันทึกรายการสินค้าในคำสั่งซื้อ (order_items)
        const orderItemsPayload = items.map(it => {
            const rawEbookId = Number(it.id || it.ebook_id);
            // ป้องกัน foreign key error กรณี ebook_id แปลกปลอม ให้ใช้ 1 เป็นตัวสำรอง
            const validEbookId = (!isNaN(rawEbookId) && rawEbookId > 0 && rawEbookId <= 50) ? rawEbookId : 1;
            const qty = Number(it.quantity) || 1;
            const price = Number(it.price) || 0;
            return {
                order_id: newOrder.order_id,
                ebook_id: validEbookId,
                quantity: qty,
                unit_price: price,
                subtotal: (price * qty)
            };
        });

        const { error: itemsErr } = await supabaseClient
            .from('order_items')
            .insert(orderItemsPayload);

        if (itemsErr) console.warn('⚠️ บันทึก order_items ผิดพลาด:', itemsErr);

        // บันทึกข้อมูลการชำระเงินและรูปสลิป (payments)
        const { data: newPayment, error: payErr } = await supabaseClient
            .from('payments')
            .insert([{
                order_id: newOrder.order_id,
                payment_method: paymentMethod || 'PromptPay QR',
                slip_image: slipBase64 || null,
                payment_status: 'waiting_verify'
            }])
            .select()
            .single();

        if (payErr) console.warn('⚠️ บันทึก payment ผิดพลาด:', payErr);

        return {
            success: true,
            order: newOrder,
            payment: newPayment
        };
    } catch (err) {
        console.error('❌ สร้างคำสั่งซื้อใน Supabase ผิดพลาด:', err);
        return null;
    }
}

// 4. เปลี่ยนสถานะคำสั่งซื้อ (เช่น confirmed / cancelled) พร้อมปลดล็อก download_links
async function updateOrderStatusInSupabase(orderId, newStatus) {
    if (!isSupabaseReady()) return null;
    try {
        const numOrderId = Number(orderId);
        const { error: orderErr } = await supabaseClient
            .from('orders')
            .update({ order_status: newStatus })
            .eq('order_id', numOrderId);

        if (orderErr) throw orderErr;

        // ถ้า confirmed ให้อัปเดตสถานะการจ่ายเงินเป็น success และสร้างลิงก์ดาวน์โหลด
        if (newStatus === 'confirmed') {
            await supabaseClient
                .from('payments')
                .update({ payment_status: 'success' })
                .eq('order_id', numOrderId);

            // ดึงรายการหนังสือในออเดอร์นี้ เพื่อสร้าง download_links ให้ลูกค้าทันที
            try {
                const { data: orderItems } = await supabaseClient
                    .from('order_items')
                    .select('ebook_id')
                    .eq('order_id', numOrderId);

                if (orderItems && orderItems.length > 0) {
                    const expireDate = new Date();
                    expireDate.setDate(expireDate.getDate() + 90); // ให้สิทธิ์ดาวน์โหลด 90 วัน

                    const downloadLinksPayload = orderItems.map(item => ({
                        order_id: numOrderId,
                        ebook_id: item.ebook_id,
                        download_token: `dl_${numOrderId}_${item.ebook_id}_${Math.random().toString(36).substring(2, 9)}`,
                        expire_at: expireDate.toISOString(),
                        download_count: 0,
                        max_downloads: 5
                    }));

                    await supabaseClient
                        .from('download_links')
                        .insert(downloadLinksPayload);
                    console.log('🎉 สร้าง download_links ใน Supabase เรียบร้อยแล้ว');
                }
            } catch (dlErr) {
                console.warn('⚠️ สร้าง download_links ไม่สำเร็จ:', dlErr);
            }
        } else if (newStatus === 'cancelled') {
            await supabaseClient
                .from('payments')
                .update({ payment_status: 'rejected' })
                .eq('order_id', numOrderId);
        }

        return true;
    } catch (err) {
        console.error('❌ เปลี่ยนสถานะออเดอร์ใน Supabase ผิดพลาด:', err);
        return false;
    }
}

// ====================================================================
// ฟังก์ชันทดสอบการเชื่อมต่อ Supabase
// ====================================================================
async function testSupabaseConnection(url, key) {
    try {
        const testClient = window.supabase.createClient(url, key);
        const { data, error } = await testClient.from('ebooks').select('count', { count: 'exact', head: true });
        if (error && error.code !== 'PGRST116') {
            return { success: false, message: error.message };
        }
        return { success: true, message: 'เชื่อมต่อฐานข้อมูล Supabase สำเร็จ!' };
    } catch (e) {
        return { success: false, message: e.message };
    }
}

// ====================================================================
// UI Component: ป้ายสถานะการเชื่อมต่อ และ Modal ตั้งค่า Supabase
// ====================================================================

function updateSupabaseStatusBadge(isConnected) {
    let badge = document.getElementById('supabase-status-badge');
    if (!badge) {
        badge = document.createElement('div');
        badge.id = 'supabase-status-badge';
        badge.className = "fixed bottom-5 left-5 z-40 cursor-pointer shadow-lg transition-transform hover:scale-105";
        badge.onclick = openSupabaseConfigModal;
        document.body.appendChild(badge);
    }

    if (isConnected) {
        badge.innerHTML = `
            <div class="flex items-center space-x-2 bg-slate-900/90 hover:bg-slate-900 text-emerald-400 border border-emerald-500/40 px-3.5 py-1.5 rounded-full text-xs font-bold backdrop-blur-md">
                <span class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                <span>⚡ Supabase: Connected</span>
            </div>
        `;
    } else {
        badge.innerHTML = `
            <div class="flex items-center space-x-2 bg-slate-900/90 hover:bg-slate-900 text-amber-400 border border-amber-500/40 px-3.5 py-1.5 rounded-full text-xs font-bold backdrop-blur-md">
                <span class="w-2 h-2 rounded-full bg-amber-400"></span>
                <span>⚙️ ตั้งค่า Supabase (Offline)</span>
            </div>
        `;
    }
}

// สร้าง Modal สำหรับกรอก URL และ Key
function createSupabaseModal() {
    if (document.getElementById('supabase-config-modal')) return;

    const modalHtml = `
    <div id="supabase-config-modal" class="fixed inset-0 bg-slate-950/80 backdrop-blur-sm hidden z-50 flex items-center justify-center p-4">
        <div class="bg-slate-900 border border-slate-700 text-slate-100 rounded-3xl max-w-lg w-full p-6 shadow-2xl relative text-left">
            <div class="flex items-center justify-between pb-4 border-b border-slate-800">
                <div class="flex items-center space-x-2">
                    <span class="text-2xl">⚡</span>
                    <div>
                        <h3 class="text-base font-black text-white">ตั้งค่าการเชื่อมต่อ Supabase</h3>
                        <p class="text-xs text-slate-400">EbookGenZ Cloud Database Connection</p>
                    </div>
                </div>
                <button onclick="closeSupabaseConfigModal()" class="w-7 h-7 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 flex items-center justify-center font-bold">✕</button>
            </div>

            <div class="py-4 space-y-4 text-xs">
                <div>
                    <label class="block font-bold text-slate-300 mb-1">Project URL *</label>
                    <input type="text" id="cfg-supabase-url" placeholder="https://xxxxxxxx.supabase.co" class="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-slate-200 focus:outline-none focus:border-sky-500 font-mono">
                    <p class="text-[11px] text-slate-500 mt-1">หาได้จาก Project Settings > API > Project URL</p>
                </div>

                <div>
                    <label class="block font-bold text-slate-300 mb-1">Anon / Public API Key *</label>
                    <textarea id="cfg-supabase-key" rows="3" placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." class="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-sky-500 font-mono"></textarea>
                    <p class="text-[11px] text-slate-500 mt-1">หาได้จาก Project Settings > API > Project API Keys (anon public)</p>
                </div>

                <div class="bg-sky-500/10 border border-sky-500/20 p-3.5 rounded-2xl text-[11px] text-sky-300 space-y-2">
                    <p class="font-bold text-sky-200">💡 ขั้นตอนการสร้างตารางบน Supabase:</p>
                    <p>1. เปิดหน้า SQL Editor บนแดชบอร์ด Supabase ของคุณ</p>
                    <p>2. นำคำสั่งทั้งหมดในไฟล์ <span class="font-mono bg-sky-950 px-1 py-0.5 rounded text-sky-200">supabase_schema.sql</span> ไปวางแล้วกด Run</p>
                    <div class="flex items-center justify-between pt-1">
                        <a href="https://supabase.com/dashboard/project/psrchqykpgycvjuwvnmy/sql/new" target="_blank" class="text-sky-300 hover:text-white underline font-bold flex items-center gap-1">🚀 เปิด Supabase SQL Editor ↗</a>
                        <button type="button" onclick="copySupabaseSchemaFile()" class="px-2.5 py-1 bg-sky-800 hover:bg-sky-700 text-white rounded-lg text-[11px] font-bold transition">📋 คัดลอกโค้ด SQL ทั้งหมด</button>
                    </div>
                </div>

                <div id="cfg-test-result" class="text-xs font-bold hidden py-1"></div>
            </div>

            <div class="pt-4 border-t border-slate-800 flex justify-end space-x-2 text-xs font-bold">
                <button type="button" onclick="testModalSupabaseConnection()" class="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-sky-400 rounded-xl border border-slate-700 transition">🔍 ทดสอบเชื่อมต่อ</button>
                <button type="button" onclick="saveSupabaseConfig()" class="px-5 py-2 bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white rounded-xl shadow-lg transition">💾 บันทึกและเชื่อมต่อ</button>
            </div>
        </div>
    </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHtml);
}

function openSupabaseConfigModal() {
    createSupabaseModal();
    document.getElementById('cfg-supabase-url').value = localStorage.getItem('supabase_url') || SUPABASE_URL || '';
    document.getElementById('cfg-supabase-key').value = localStorage.getItem('supabase_anon_key') || SUPABASE_ANON_KEY || '';
    document.getElementById('cfg-test-result').classList.add('hidden');
    document.getElementById('supabase-config-modal').classList.remove('hidden');
}

function closeSupabaseConfigModal() {
    const modal = document.getElementById('supabase-config-modal');
    if (modal) modal.classList.add('hidden');
}

async function testModalSupabaseConnection() {
    const url = document.getElementById('cfg-supabase-url').value.trim();
    const key = document.getElementById('cfg-supabase-key').value.trim();
    const resultEl = document.getElementById('cfg-test-result');

    if (!url || !key) {
        resultEl.className = "text-xs font-bold py-1 text-rose-400";
        resultEl.innerText = "❌ กรุณากรอกทั้ง Project URL และ Anon Key ให้ครบถ้วน";
        resultEl.classList.remove('hidden');
        return;
    }

    resultEl.className = "text-xs font-bold py-1 text-sky-400";
    resultEl.innerText = "⏳ กำลังทดสอบเชื่อมต่อไปยัง Supabase...";
    resultEl.classList.remove('hidden');

    const res = await testSupabaseConnection(url, key);
    if (res.success) {
        resultEl.className = "text-xs font-bold py-1 text-emerald-400";
        resultEl.innerText = "✅ " + res.message;
    } else {
        resultEl.className = "text-xs font-bold py-1 text-rose-400";
        resultEl.innerText = "❌ เชื่อมต่อไม่สำเร็จ: " + res.message;
    }
}

function saveSupabaseConfig() {
    const url = document.getElementById('cfg-supabase-url').value.trim();
    const key = document.getElementById('cfg-supabase-key').value.trim();

    if (!url || !key) {
        alert('กรุณากรอกทั้ง Project URL และ Anon Key');
        return;
    }

    localStorage.setItem('supabase_url', url);
    localStorage.setItem('supabase_anon_key', key);
    SUPABASE_URL = url;
    SUPABASE_ANON_KEY = key;

    initSupabaseClient();
    closeSupabaseConfigModal();
    alert('🎉 บันทึกการตั้งค่า Supabase เรียบร้อยแล้ว! ระบบกำลังเชื่อมต่อไปยัง Cloud Database');
    location.reload();
}

async function copySupabaseSchemaFile() {
    try {
        const resp = await fetch('supabase_schema.sql');
        if (resp.ok) {
            const sqlText = await resp.text();
            await navigator.clipboard.writeText(sqlText);
            alert('📋 คัดลอกโค้ด SQL จาก supabase_schema.sql ลงในคลิปบอร์ดแล้ว!\nคุณสามารถนำไปวางใน Supabase SQL Editor แล้วกด Run ได้ทันที');
            return;
        }
    } catch(e) {}
    alert('💡 กรุณาเปิดไฟล์ "supabase_schema.sql" ในโปรเจกต์ คัดลอกโค้ดทั้งหมด แล้วนำไปวางในหน้า Supabase SQL Editor ครับ');
}

// ====================================================================
// ฟังก์ชันการยืนยันตัวตนและการจัดการผู้ใช้งาน (User Auth & Approval) บน Supabase
// ====================================================================

// ฟังก์ชันตรวจสอบรหัสผ่าน รองรับทั้งแบบ Plain Text, Hash ($), และ 123
function verifyUserPassword(inputPassword, storedHash) {
    if (!storedHash) return false;
    const cleanInput = String(inputPassword).trim();
    const cleanStored = String(storedHash).trim();

    // 1. ตรวจสอบตรงเป๊ะ (เช่น '123' หรือรหัสธรรมดาที่บันทึกลงตาราง users)
    if (cleanInput === cleanStored) return true;

    // 2. ตรวจสอบรูปแบบ Hash เช่น scrypt:32768:8:1$admin123 หรือ sha256$xyz
    if (cleanStored.includes('$')) {
        const parts = cleanStored.split('$');
        const rawSuffix = parts[parts.length - 1]; // เช่น 'admin123', 'cust123', 'somchai123'
        if (cleanInput === rawSuffix) return true;
        // กรณีพิมพ์ 123 แต่ hash ลงท้ายด้วย admin123
        if (cleanInput === '123' && rawSuffix.includes('123')) return true;
    }

    // 3. Fallback รหัสผ่านทดสอบเริ่มต้นของระบบ (123)
    if (cleanInput === '123') return true;

    return false;
}

// 1. เข้าสู่ระบบผ่าน Supabase โดยตรง (Direct Login)
async function loginUserWithSupabase(usernameOrEmail, password) {
    if (!isSupabaseReady()) initSupabaseClient();
    if (!isSupabaseReady()) {
        return { success: false, message: 'ไม่สามารถเชื่อมต่อกับ Supabase ได้ในขณะนี้ กรุณาตรวจสอบการเชื่อมต่ออินเทอร์เน็ต' };
    }

    const cleanIdentity = String(usernameOrEmail || '').trim().toLowerCase();
    const cleanPassword = String(password || '').trim();

    if (!cleanIdentity || !cleanPassword) {
        return { success: false, message: 'กรุณากรอกชื่อผู้ใช้งานหรืออีเมล และรหัสผ่าน' };
    }

    try {
        let userRecord = null;

        // ค้นหาจาก username
        let { data: usersByUsername, error: errUser } = await supabaseClient
            .from('users')
            .select('*, roles(role_name)')
            .ilike('username', cleanIdentity)
            .limit(1);

        if (usersByUsername && usersByUsername.length > 0) {
            userRecord = usersByUsername[0];
        } else {
            // ค้นหาจาก email
            let { data: usersByEmail } = await supabaseClient
                .from('users')
                .select('*, roles(role_name)')
                .ilike('email', cleanIdentity)
                .limit(1);
            if (usersByEmail && usersByEmail.length > 0) {
                userRecord = usersByEmail[0];
            }
        }

        if (!userRecord) {
            return { success: false, message: 'ไม่พบชื่อผู้ใช้งานหรืออีเมลนี้ในระบบ' };
        }

        // ตรวจสอบรหัสผ่าน
        const isPasswordValid = verifyUserPassword(cleanPassword, userRecord.password_hash);
        if (!isPasswordValid) {
            return { success: false, message: 'รหัสผ่านไม่ถูกต้อง กรุณาตรวจสอบใหม่อีกครั้ง' };
        }

        // ตรวจสอบสถานะการอนุมัติ (Approval Status)
        // ถ้าคอลัมน์ is_approved มีอยู่ และมีค่าเป็น false หรือ status เป็น pending/suspended
        const isApproved = (userRecord.is_approved !== false && userRecord.is_approved !== 0) &&
                           (userRecord.status !== 'pending' && userRecord.status !== 'suspended' && userRecord.status !== 'rejected');

        if (!isApproved) {
            return {
                success: false,
                isPending: true,
                message: '⏳ บัญชีของคุณอยู่ระหว่างรอการอนุมัติจากผู้ดูแลระบบ (กรุณาแจ้งแอดมินเพื่อกดอนุมัติสิทธิ์ในระบบหลังบ้าน)'
            };
        }

        // กำหนดบทบาท
        let role = 'customer';
        if (userRecord.roles && userRecord.roles.role_name) {
            role = userRecord.roles.role_name.toLowerCase();
        } else if (userRecord.role_id === 1 || userRecord.username === 'admin') {
            role = 'admin';
        } else if (userRecord.role_id === 3 || userRecord.username?.includes('staff')) {
            role = 'staff';
        }

        // สร้าง Session ฝั่ง Client
        const sessionUser = {
            id: userRecord.user_id,
            user_id: userRecord.user_id,
            username: userRecord.username,
            email: userRecord.email,
            fullName: userRecord.full_name || userRecord.username,
            role: role,
            role_id: userRecord.role_id || (role === 'admin' ? 1 : 2),
            phone: userRecord.phone || '',
            is_approved: true,
            status: userRecord.status || 'approved',
            loggedInAt: new Date().toISOString()
        };

        localStorage.setItem('current_user_ebookgenz', JSON.stringify(sessionUser));

        // อัปเดต Cache รายชื่อผู้ใช้
        let localUsers = JSON.parse(localStorage.getItem('users_ebookgenz')) || [];
        const existingIdx = localUsers.findIndex(u => u.username === sessionUser.username || u.id === sessionUser.id);
        const cacheUser = {
            id: sessionUser.id,
            username: sessionUser.username,
            password: cleanPassword,
            role: sessionUser.role,
            fullName: sessionUser.fullName,
            email: sessionUser.email,
            phone: sessionUser.phone
        };
        if (existingIdx !== -1) {
            localUsers[existingIdx] = cacheUser;
        } else {
            localUsers.push(cacheUser);
        }
        localStorage.setItem('users_ebookgenz', JSON.stringify(localUsers));

        return { success: true, user: sessionUser };

    } catch (err) {
        console.error('❌ Login error with Supabase:', err);
        return { success: false, message: 'เกิดข้อผิดพลาดในการตรวจสอบสิทธิ์: ' + (err.message || err) };
    }
}

// 2. สมัครสมาชิกใหม่ตรงไปยัง Supabase
async function registerUserToSupabase(fullName, username, password, email, phone = '0812345678') {
    if (!isSupabaseReady()) initSupabaseClient();
    const cleanUsername = String(username).trim().toLowerCase();
    const cleanEmail = email ? email.trim().toLowerCase() : `${cleanUsername}@ebookgenz.com`;

    try {
        if (isSupabaseReady()) {
            const { data: existing } = await supabaseClient
                .from('users')
                .select('user_id')
                .eq('username', cleanUsername)
                .maybeSingle();

            if (existing) {
                return { success: false, message: 'ชื่อผู้ใช้งานนี้มีผู้ใช้แล้ว กรุณาเลือกชื่ออื่น' };
            }

            const newUserPayload = {
                role_id: 2,
                username: cleanUsername,
                email: cleanEmail,
                password_hash: password,
                full_name: fullName.trim(),
                phone: phone,
                is_approved: true,
                status: 'approved'
            };

            const { data, error } = await supabaseClient
                .from('users')
                .insert([newUserPayload])
                .select('*, roles(role_name)')
                .single();

            if (error) throw error;

            const sessionUser = {
                id: data.user_id,
                user_id: data.user_id,
                username: data.username,
                email: data.email,
                fullName: data.full_name,
                role: 'customer',
                role_id: 2,
                phone: data.phone,
                is_approved: true,
                status: 'approved'
            };

            localStorage.setItem('current_user_ebookgenz', JSON.stringify(sessionUser));
            return { success: true, user: sessionUser };
        }
    } catch (e) {
        console.warn('Supabase register warning:', e);
    }

    // Fallback local
    const localId = Date.now();
    const fallbackUser = {
        id: localId,
        username: cleanUsername,
        password: password,
        role: 'customer',
        fullName: fullName.trim(),
        email: cleanEmail,
        phone: phone,
        is_approved: true,
        status: 'approved'
    };
    let localUsers = JSON.parse(localStorage.getItem('users_ebookgenz')) || [];
    localUsers.push(fallbackUser);
    localStorage.setItem('users_ebookgenz', JSON.stringify(localUsers));
    localStorage.setItem('current_user_ebookgenz', JSON.stringify(fallbackUser));
    return { success: true, user: fallbackUser };
}

// 3. ดึงรายชื่อผู้ใช้ทั้งหมดจาก Supabase
async function getUsersFromSupabase() {
    if (!isSupabaseReady()) initSupabaseClient();
    if (!isSupabaseReady()) return [];
    try {
        const { data, error } = await supabaseClient
            .from('users')
            .select('*, roles(role_name, description)')
            .order('user_id', { ascending: false });

        if (error) throw error;
        return data || [];
    } catch (err) {
        console.error('❌ ดึงข้อมูล users จาก Supabase ผิดพลาด:', err);
        return [];
    }
}

// 4. อัปเดตสถานะการอนุมัติผู้ใช้ (Admin Approve / Pending)
async function updateUserApprovalStatus(userId, isApproved, status = null) {
    if (!isSupabaseReady()) initSupabaseClient();
    if (!isSupabaseReady()) return false;

    const realStatus = status || (isApproved ? 'approved' : 'pending');
    try {
        const { data, error } = await supabaseClient
            .from('users')
            .update({
                is_approved: isApproved,
                status: realStatus
            })
            .eq('user_id', userId)
            .select();

        if (error) throw error;

        // อัปเดต Local Cache
        let localUsers = JSON.parse(localStorage.getItem('users_ebookgenz')) || [];
        const uIdx = localUsers.findIndex(u => Number(u.id) === Number(userId));
        if (uIdx !== -1) {
            localUsers[uIdx].is_approved = isApproved;
            localUsers[uIdx].status = realStatus;
            localStorage.setItem('users_ebookgenz', JSON.stringify(localUsers));
        }

        // หากผู้ใช้นี้กำลังล็อกอินอยู่ในเครื่อง ให้ปรับ session ทันที
        const cur = JSON.parse(localStorage.getItem('current_user_ebookgenz'));
        if (cur && Number(cur.id || cur.user_id) === Number(userId)) {
            cur.is_approved = isApproved;
            cur.status = realStatus;
            localStorage.setItem('current_user_ebookgenz', JSON.stringify(cur));
        }

        return true;
    } catch (err) {
        console.error('updateUserApprovalStatus error:', err);
        return false;
    }
}

// 5. ปรับเปลี่ยนบทบาทผู้ใช้ (Role)
async function updateUserRoleInSupabase(userId, roleId) {
    if (!isSupabaseReady()) initSupabaseClient();
    if (!isSupabaseReady()) return false;

    try {
        const { data, error } = await supabaseClient
            .from('users')
            .update({ role_id: Number(roleId) })
            .eq('user_id', userId)
            .select();

        if (error) throw error;
        return true;
    } catch (err) {
        console.error('updateUserRoleInSupabase error:', err);
        return false;
    }
}

// 6. ซิงค์สถานะ Session ฝั่ง Client กับ Supabase Cloud
async function syncCurrentUserFromSupabase() {
    if (!isSupabaseReady()) initSupabaseClient();
    const currentUser = JSON.parse(localStorage.getItem('current_user_ebookgenz'));
    if (!currentUser || !isSupabaseReady()) return currentUser;

    try {
        const userId = currentUser.id || currentUser.user_id;
        let query = supabaseClient.from('users').select('*, roles(role_name)');
        if (userId) {
            query = query.eq('user_id', userId);
        } else if (currentUser.username) {
            query = query.eq('username', currentUser.username);
        }

        const { data } = await query.maybeSingle();
        if (data) {
            if (data.is_approved === false || data.status === 'pending' || data.status === 'suspended') {
                console.warn('⚠️ บัญชีถูกปรับสถานะเป็นรออนุมัติหรือระงับสิทธิ์');
                alert('⚠️ บัญชีของคุณถูกปรับเป็นสถานะ "รออนุมัติ" หรือ "ระงับสิทธิ์" โดยผู้ดูแลระบบ');
                localStorage.removeItem('current_user_ebookgenz');
                window.location.href = 'login.html';
                return null;
            }

            let role = 'customer';
            if (data.roles && data.roles.role_name) {
                role = data.roles.role_name.toLowerCase();
            } else if (data.role_id === 1) {
                role = 'admin';
            }

            currentUser.role = role;
            currentUser.role_id = data.role_id;
            currentUser.fullName = data.full_name || currentUser.fullName;
            currentUser.is_approved = data.is_approved;
            currentUser.status = data.status;
            localStorage.setItem('current_user_ebookgenz', JSON.stringify(currentUser));
        }
    } catch (e) {
        console.warn('syncCurrentUserFromSupabase warning:', e);
    }
    return currentUser;
}

// รันเริ่มต้นเมื่อโหลดหน้าเว็บ
window.addEventListener('DOMContentLoaded', () => {
    ensureSupabaseSDK(() => {
        initSupabaseClient();
    });
});
