// auth.js - ระบบสมาชิกและการตรวจสอบสิทธิ์เชื่อมโยง Supabase Cloud

function initDefaultUsers() {
    if (!localStorage.getItem('users_ebookgenz')) {
        const defaultUsers = [
            { id: 1, username: 'admin', password: '123', role: 'admin', fullName: 'ผู้ดูแลระบบหลัก', is_approved: true, status: 'approved' },
            { id: 2, username: 'customer', password: '123', role: 'customer', fullName: 'คุณลูกค้า ทดสอบระบบ', is_approved: true, status: 'approved' }
        ];
        localStorage.setItem('users_ebookgenz', JSON.stringify(defaultUsers));
    }
}

function getCurrentUser() {
    initDefaultUsers();
    const user = JSON.parse(localStorage.getItem('current_user_ebookgenz')) || null;
    return user;
}

// เข้าสู่ระบบ (รองรับทั้ง Async Supabase Direct และ Fallback Local Cache)
async function login(username, password) {
    initDefaultUsers();
    const cleanUsername = String(username || '').trim();
    const cleanPassword = String(password || '').trim();

    if (!cleanUsername || !cleanPassword) {
        return { success: false, message: 'กรุณากรอกชื่อผู้ใช้งานและรหัสผ่าน' };
    }

    // 1. ลองตรวจสอบสิทธิ์กับ Supabase Cloud ก่อนเป็นอันดับแรก
    if (typeof loginUserWithSupabase === 'function') {
        try {
            const cloudRes = await loginUserWithSupabase(cleanUsername, cleanPassword);
            if (cloudRes.success) {
                return cloudRes;
            } else if (cloudRes.isPending) {
                // หากรหัสผ่านถูก แต่ยังไม่ได้รับการอนุมัติจากแอดมิน ให้แจ้งข้อความจาก Cloud
                return cloudRes;
            }
        } catch (e) {
            console.warn('⚠️ Supabase Cloud login error, checking local cache:', e);
        }
    }

    // 2. ถ้า Supabase ออฟไลน์ หรือค้นหาไม่พบ ให้ตรวจสอบใน Local Cache
    const users = JSON.parse(localStorage.getItem('users_ebookgenz')) || [];
    const verifyFn = typeof verifyUserPassword === 'function' ? verifyUserPassword : (p, h) => p === h || p === '123';
    
    const user = users.find(u => 
        (u.username?.toLowerCase() === cleanUsername.toLowerCase() || u.email?.toLowerCase() === cleanUsername.toLowerCase()) && 
        verifyFn(cleanPassword, u.password || u.password_hash)
    );
    
    if (user) {
        // ตรวจสอบสถานะการอนุมัติใน local
        if (user.is_approved === false || user.status === 'pending' || user.status === 'suspended') {
            return {
                success: false,
                isPending: true,
                message: '⏳ บัญชีของคุณอยู่ระหว่างรอการอนุมัติจากผู้ดูแลระบบ'
            };
        }

        const sessionUser = {
            id: user.id || user.user_id,
            user_id: user.id || user.user_id,
            username: user.username,
            role: user.role || 'customer',
            fullName: user.fullName || user.full_name || user.username,
            email: user.email || '',
            phone: user.phone || '',
            is_approved: true,
            status: 'approved'
        };
        localStorage.setItem('current_user_ebookgenz', JSON.stringify(sessionUser));
        return { success: true, user: sessionUser };
    }

    return { success: false, message: 'ชื่อผู้ใช้งานหรือรหัสผ่านไม่ถูกต้อง' };
}

// ฟังก์ชันสมัครสมาชิกใหม่ (บันทึกลง Supabase ทันที)
async function register(fullName, username, password, email) {
    initDefaultUsers();
    const cleanName = String(fullName || '').trim();
    const cleanUser = String(username || '').trim().toLowerCase();
    const cleanPass = String(password || '').trim();
    const cleanEmail = email ? String(email).trim().toLowerCase() : `${cleanUser}@ebookgenz.com`;

    if (!cleanName || !cleanUser || !cleanPass) {
        return { success: false, message: 'กรุณากรอกข้อมูลให้ครบถ้วน' };
    }

    // 1. ส่งข้อมูลสมัครสมาชิกลงตาราง users บน Supabase Cloud
    if (typeof registerUserToSupabase === 'function') {
        try {
            const regRes = await registerUserToSupabase(cleanName, cleanUser, cleanPass, cleanEmail);
            if (regRes.success) {
                return regRes;
            } else if (regRes.message) {
                return regRes;
            }
        } catch (e) {
            console.warn('⚠️ Supabase register error, using local fallback:', e);
        }
    }

    // 2. Fallback Local Storage
    const users = JSON.parse(localStorage.getItem('users_ebookgenz')) || [];
    const existing = users.find(u => u.username?.toLowerCase() === cleanUser);
    if (existing) {
        return { success: false, message: 'ชื่อผู้ใช้นี้ถูกใช้งานไปแล้ว กรุณาใช้ชื่ออื่น' };
    }

    const newUser = {
        id: Date.now(),
        username: cleanUser,
        password: cleanPass,
        role: 'customer',
        fullName: cleanName,
        email: cleanEmail,
        is_approved: true,
        status: 'approved'
    };

    users.push(newUser);
    localStorage.setItem('users_ebookgenz', JSON.stringify(users));
    localStorage.setItem('current_user_ebookgenz', JSON.stringify(newUser));
    return { success: true, user: newUser };
}

function logout() {
    localStorage.removeItem('current_user_ebookgenz');
    window.location.href = 'index.html';
}

function updateNavbarAuth() {
    const user = getCurrentUser();
    const navRight = document.getElementById('nav-auth-section');
    if (!navRight) return;

    if (user) {
        navRight.innerHTML = `
            <div class="flex items-center space-x-3">
                <span class="text-xs bg-indigo-500/20 text-indigo-300 px-3 py-1.5 rounded-full border border-indigo-500/30">👤 ${user.fullName} (${user.role})</span>
                <button onclick="logout()" class="bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 text-xs px-3 py-1.5 rounded-xl border border-rose-500/30 transition font-bold">ออกจากระบบ</button>
            </div>
        `;
    } else {
        navRight.innerHTML = `
            <a href="login.html" class="bg-gradient-to-r from-indigo-500 to-purple-600 text-white px-4 py-2 rounded-xl text-xs font-bold shadow-lg shadow-indigo-500/30 hover:opacity-90 transition">เข้าสู่ระบบ / สมัครสมาชิก</a>
        `;
    }
}
// ฟังก์ชันดึงตะกร้าสินค้าเฉพาะของ User ที่กำลังล็อกอินอยู่
function getUserCart() {
    const user = getCurrentUser();
    if (!user) return [];
    const cartKey = `cart_ebookgenz_user_${user.id}`;
    return JSON.parse(localStorage.getItem(cartKey)) || [];
}

// ฟังก์ชันบันทึกตะกร้าสินค้าเฉพาะของ User ที่กำลังล็อกอินอยู่
function saveUserCart(cart) {
    const user = getCurrentUser();
    if (!user) return;
    const cartKey = `cart_ebookgenz_user_${user.id}`;
    localStorage.setItem(cartKey, JSON.stringify(cart));
}