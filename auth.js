// auth.js - ระบบสมาชิกและการตรวจสอบสิทธิ์

function initDefaultUsers() {
    if (!localStorage.getItem('users_ebookgenz')) {
        const defaultUsers = [
            { id: 1, username: 'admin', password: '123', role: 'admin', fullName: 'ผู้ดูแลระบบหลัก' },
            { id: 2, username: 'customer', password: '123', role: 'customer', fullName: 'คุณลูกค้า ทดสอบระบบ' }
        ];
        localStorage.setItem('users_ebookgenz', JSON.stringify(defaultUsers));
    }
}

function getCurrentUser() {
    initDefaultUsers();
    return JSON.parse(localStorage.getItem('current_user_ebookgenz')) || null;
}

function login(username, password) {
    initDefaultUsers();
    const users = JSON.parse(localStorage.getItem('users_ebookgenz')) || [];
    const user = users.find(u => u.username === username && u.password === password);
    
    if (user) {
        localStorage.setItem('current_user_ebookgenz', JSON.stringify(user));
        return { success: true, user };
    }
    return { success: false, message: 'ชื่อผู้ใช้งานหรือรหัสผ่านไม่ถูกต้อง' };
}

// ฟังก์ชันสมัครสมาชิกใหม่
function register(fullName, username, password) {
    initDefaultUsers();
    const users = JSON.parse(localStorage.getItem('users_ebookgenz')) || [];
    
    const existing = users.find(u => u.username === username);
    if (existing) {
        return { success: false, message: 'ชื่อผู้ใช้นี้ถูกใช้งานไปแล้ว กรุณาใช้ชื่ออื่น' };
    }

    const newUser = {
        id: Date.now(),
        username,
        password,
        role: 'customer', // สมัครใหม่เป็นลูกค้าทั่วไป
        fullName
    };

    users.push(newUser);
    localStorage.setItem('users_ebookgenz', JSON.stringify(users));
    localStorage.setItem('current_user_ebookgenz', JSON.stringify(newUser)); // สมัครเสร็จล็อกอินให้อัตโนมัติ
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