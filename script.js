// ==========================================
// 1. DATA INITIALIZATION & PERSISTENCE
// ==========================================

// Initialize data from localStorage or set defaults
let users = JSON.parse(localStorage.getItem('users')) || [
    { id: 'admin1', name: 'Admin User', email: 'admin@pro.com', pass: 'admin123', role: 'admin', room: '', photo: '' }
];
let rooms = JSON.parse(localStorage.getItem('rooms')) || [];
let attendanceLogs = JSON.parse(localStorage.getItem('attendanceLogs')) || [];
let complaints = JSON.parse(localStorage.getItem('complaints')) || [];

// Save all current states to localStorage
const saveAll = () => {
    localStorage.setItem('users', JSON.stringify(users));
    localStorage.setItem('rooms', JSON.stringify(rooms));
    localStorage.setItem('attendanceLogs', JSON.stringify(attendanceLogs));
    localStorage.setItem('complaints', JSON.stringify(complaints));
};

// ==========================================
// 2. HELPER FUNCTIONS (REUSABLE LOGIC)
// ==========================================

// Returns user photo or a generated avatar if empty
const getUserImage = (user) => {
    return (user.photo && user.photo.trim() !== "") 
        ? user.photo 
        : `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=6366f1&color=fff`;
};

// Returns current year and month in YYYY-MM format
const getCurrentMonth = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};

// Calculates dynamic fees based on room price and occupant count
const calculatePayment = (user, month = getCurrentMonth()) => {
    if (!user.room) return { total: 0, due: 0 };
    const room = rooms.find(r => r.number == user.room);
    if (!room) return { total: 0, due: 0 };

    let total = 0;
    if (room.priceType === 'room') {
        const occupants = users.filter(u => u.room === room.number);
        total = occupants.length ? Math.ceil(room.price / occupants.length) : 0;
    } else {
        total = room.price;
    }

    const paid = user.payments?.[month] || 0;
    return { total, paid, due: total - paid };
};

// ==========================================
// 3. AUTHENTICATION SYSTEM
// ==========================================

// Handle login and redirect based on role
window.login = (email, pass) => {
    const user = users.find(u => u.email === email && u.pass === pass);
    if (user) {
        localStorage.setItem('currentUser', JSON.stringify(user));
        window.location.href = user.role === 'admin' ? 'admin.html' : 'student.html';
    } else {
        alert("Invalid login credentials");
    }
};

// Clear session and redirect to home
window.logout = () => {
    localStorage.removeItem('currentUser');
    window.location.href = 'index.html';
};

// ==========================================
// 4. USER MANAGEMENT (ADMIN ONLY)
// ==========================================

// Render list of all users with role controls
window.showUsers = () => {
    document.getElementById('viewTitle').innerText = "User Access Control";
    let html = `<div class="grid-container">`;
    users.forEach(user => {
        const isSelf = user.id === 'admin1';
        html += `
        <div class="card glass-card">
            <div style="display:flex; gap:10px; align-items:center;">
                <img src="${getUserImage(user)}" style="width:45px; height:45px; border-radius:50%;">
                <div>
                    <h4>${user.name}</h4>
                    <p style="font-size:12px;">${user.email}</p>
                </div>
            </div>
            <label>Role</label>
            <select onchange="updateRole('${user.id}', this.value)" ${isSelf ? 'disabled' : ''}>
                <option value="student" ${user.role === 'student' ? 'selected' : ''}>Student</option>
                <option value="admin" ${user.role === 'admin' ? 'selected' : ''}>Admin</option>
            </select>
            <button onclick="deleteUser('${user.id}')" ${isSelf ? 'disabled' : ''}>Remove</button>
        </div>`;
    });
    document.getElementById('content').innerHTML = html + `</div>`;
};

// Update user role and clear room if promoted to admin
window.updateRole = (id, role) => {
    const user = users.find(u => u.id === id);
    user.role = role;
    if (role === 'admin') user.room = '';
    saveAll();
    window.showUsers();
};

// Show form to add new students with image upload
window.showAddUser = () => {
    document.getElementById('content').innerHTML = `
    <div class="card glass-card">
        <input id="newName" placeholder="Name">
        <input id="newEmail" placeholder="Email">
        <input id="newPass" placeholder="Password">
        <input type="file" id="newPhotoFile" accept="image/*">
        <button onclick="processAddUser()">Add User</button>
    </div>`;
};

// Convert image to Base64 before saving
window.processAddUser = () => {
    const file = document.getElementById('newPhotoFile').files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (e) => saveUser(e.target.result);
        reader.readAsDataURL(file);
    } else {
        saveUser('');
    }
};

// Push new user object to array
function saveUser(photoData) {
    users.push({
        id: Date.now().toString(),
        name: document.getElementById('newName').value,
        email: document.getElementById('newEmail').value,
        pass: document.getElementById('newPass').value,
        role: 'student',
        room: '',
        photo: photoData,
        payments: {}
    });
    saveAll();
    alert("User Added successfully");
    window.showUsers();
}

// Remove user from system
window.deleteUser = (id) => {
    if (confirm("Are you sure you want to delete this user?")) {
        users = users.filter(u => u.id !== id);
        saveAll();
        window.showUsers();
    }
};

// ==========================================
// 5. ROOM MANAGEMENT
// ==========================================

// Form to create new hostel rooms
window.showAddRoom = () => {
    document.getElementById('content').innerHTML = `
    <div class="card glass-card">
        <input id="roomNo" placeholder="Room Number">
        <input id="roomCap" type="number" placeholder="Capacity">
        <input id="roomPrice" type="number" placeholder="Price">
        <select id="priceType">
            <option value="room">Per Room (Split)</option>
            <option value="bed">Per Bed (Fixed)</option>
        </select>
        <button onclick="processAddRoom()">Create Room</button>
    </div>`;
};

// Save room details
window.processAddRoom = () => {
    rooms.push({
        id: Date.now(),
        number: document.getElementById('roomNo').value,
        capacity: parseInt(document.getElementById('roomCap').value),
        price: parseInt(document.getElementById('roomPrice').value),
        priceType: document.getElementById('priceType').value
    });
    saveAll();
    window.showRooms();
};

// Display all rooms and occupant status
window.showRooms = () => {
    let html = `<div class="grid-container">`;
    rooms.forEach(room => {
        const occupants = users.filter(u => u.room === room.number);
        html += `
        <div class="card glass-card">
            <h3>Room ${room.number}</h3>
            <p>₹${room.price} (${room.priceType})</p>
            <p>Occupancy: ${occupants.length}/${room.capacity}</p>
            <button onclick="deleteRoom(${room.id})">🗑 Delete</button>
            <select id="sel-${room.number}">
                <option value="">Select Student</option>
                ${users.filter(u => u.role === 'student' && !u.room).map(u => `<option value="${u.id}">${u.name}</option>`).join('')}
            </select>
            <button onclick="assignRoom('${room.number}')">Assign</button>
        </div>`;
    });
    document.getElementById('content').innerHTML = html + `</div>`;
};

// Link a student to a specific room
window.assignRoom = (roomNum) => {
    const id = document.getElementById(`sel-${roomNum}`).value;
    if (!id) return;
    users.find(u => u.id == id).room = roomNum;
    saveAll();
    window.showRooms();
};

// Delete room and unassign its students
window.deleteRoom = (id) => {
    const room = rooms.find(r => r.id == id);
    users.forEach(u => { if (u.room == room.number) u.room = ''; });
    rooms = rooms.filter(r => r.id != id);
    saveAll();
    window.showRooms();
};

// ==========================================
// 6. ATTENDANCE SYSTEM
// ==========================================

// UI for marking daily attendance
// Toggle Dropdown Visibility
window.toggleDropdown = (id) => {
    document.getElementById(id).classList.toggle("show");
};

// UI for Custom Attendance Report
window.showAttendanceReportUI = () => {
    document.getElementById('viewTitle').innerText = "Custom Attendance Report";
    
    let studentOptions = users.filter(u => u.role === 'student')
        .map(u => `<option value="${u.id}">${u.name}</option>`).join('');

    document.getElementById('content').innerHTML = `
    <div class="card glass-card report-form">
        <h3>Filter Attendance</h3>
        <div>
            <label>Select Student</label>
            <select id="rptStudent">
                <option value="all">All Students</option>
                ${studentOptions}
            </select>
        </div>
        <div style="flex-direction: row; gap: 10px;">
            <div style="flex: 1;">
                <label>From Date</label>
                <input type="date" id="rptDateStart">
            </div>
            <div style="flex: 1;">
                <label>To Date</label>
                <input type="date" id="rptDateEnd">
            </div>
        </div>
        <button onclick="generateFilteredAttendance()">Download CSV Report</button>
    </div>`;
};

// Logic to filter and download
window.generateFilteredAttendance = () => {
    const studentId = document.getElementById('rptStudent').value;
    const start = document.getElementById('rptDateStart').value;
    const end = document.getElementById('rptDateEnd').value;

    let filtered = attendanceLogs;

    // Filter by Student
    if (studentId !== 'all') {
        filtered = filtered.filter(log => log.studentId === studentId);
    }

    // Filter by Date Range
    if (start && end) {
        const sDate = new Date(start);
        const eDate = new Date(end);
        filtered = filtered.filter(log => {
            const logDate = new Date(log.date);
            return logDate >= sDate && logDate <= eDate;
        });
    }

    if (filtered.length === 0) return alert("No records found for these filters.");

    let rows = [["Date", "Student Name", "Status"]];
    filtered.forEach(log => {
        const user = users.find(u => u.id === log.studentId);
        rows.push([log.date, user?.name || "Unknown", log.status]);
    });

    downloadCSV(`Attendance_Report_${new Date().toLocaleDateString()}.csv`, rows);
};

// Close dropdowns if user clicks outside
window.onclick = function(event) {
    if (!event.target.matches('.dropdown-btn')) {
        var dropdowns = document.getElementsByClassName("dropdown-content");
        for (var i = 0; i < dropdowns.length; i++) {
            var openDropdown = dropdowns[i];
            if (openDropdown.classList.contains('show')) {
                openDropdown.classList.remove('show');
            }
        }
    }
}
window.showStudents = () => {
    document.getElementById('viewTitle').innerText = "Daily Attendance";
    let html = `<div class="card glass-card"><table><tr><th>Student</th><th>Room</th><th>Action</th></tr>`;
    users.filter(u => u.role === 'student').forEach(s => {
        html += `
        <tr>
            <td style="display:flex; align-items:center; gap:10px;">
                <img src="${getUserImage(s)}" style="width:30px; height:30px; border-radius:50%;"> ${s.name}
            </td>
            <td>${s.room || 'N/A'}</td>
            <td>
                <button onclick="markAt('${s.id}','Present')">Present</button>
                <button class="btn-outline" onclick="markAt('${s.id}','Absent')">Absent</button>
            </td>
        </tr>`;
    });
    document.getElementById('content').innerHTML = html + `</table></div>`;
};

// Log attendance entry with current date
window.markAt = (id, status) => {
    attendanceLogs.push({
        studentId: id,
        date: new Date().toLocaleDateString(),
        status
    });
    saveAll();
    alert(`Marked ${status}`);
};

// View historical logs for all students
window.showAttendance = () => {
    document.getElementById('viewTitle').innerText = "Attendance Logs";
    let html = `<div class="card glass-card"><table><tr><th>Date</th><th>Name</th><th>Status</th></tr>`;
    attendanceLogs.forEach(log => {
        const user = users.find(u => u.id === log.studentId);
        html += `<tr><td>${log.date}</td><td>${user ? user.name : 'Unknown'}</td><td>${log.status}</td></tr>`;
    });
    document.getElementById('content').innerHTML = html + `</table></div>`;
};

// ==========================================
// 7. PAYMENT SYSTEM (ADMIN)
// ==========================================

// UI for managing and viewing monthly dues
window.showMonthlyPayments = () => {
    const selectedMonth = document.getElementById('monthPicker')?.value || getCurrentMonth();
    document.getElementById('viewTitle').innerText = `Payments: ${selectedMonth}`;
    let html = `<div class="card glass-card"><input type="month" id="monthPicker" value="${selectedMonth}" onchange="showMonthlyPayments()"></div><div class="grid-container">`;
    
    users.filter(u => u.role === 'student').forEach(u => {
        const { total, paid, due } = calculatePayment(u, selectedMonth);
        html += `
        <div class="card glass-card">
            <h4>${u.name} (Room: ${u.room || 'N/A'})</h4>
            <p>Total: ₹${total} | Paid: ₹${paid} | Due: ₹${due}</p>
            <input type="number" id="mPay-${u.id}" placeholder="Amount">
            <button onclick="payMonthly('${u.id}', '${selectedMonth}')">Update Payment</button>
        </div>`;
    });
    document.getElementById('content').innerHTML = html + `</div>`;
};

// Record a new payment for a student
window.payMonthly = (id, month) => {
    const amount = parseInt(document.getElementById(`mPay-${id}`).value);
    if (!amount || amount <= 0) return alert("Enter valid amount");
    const user = users.find(u => u.id === id);
    if (!user.payments) user.payments = {};
    user.payments[month] = (user.payments[month] || 0) + amount;
    saveAll();
    window.showMonthlyPayments();
};

// ==========================================
// 8. STUDENT FEATURES
// ==========================================

// Helper to get logged-in session data
const getCurrentStudent = () => JSON.parse(localStorage.getItem('currentUser'));

// Student dashboard view
window.viewProfile = () => {
    const user = getCurrentStudent();
    const { total, paid, due } = calculatePayment(user, getCurrentMonth());
    document.getElementById('viewTitle').innerText = "My Profile";
    document.getElementById('content').innerHTML = `
    <div class="card glass-card" style="text-align:center;">
        <img src="${getUserImage(user)}" style="width:100px; height:100px; border-radius:50%;">
        <h3>${user.name}</h3>
        <p>Room: ${user.room || 'Not Assigned'}</p>
        <hr>
        <p>Monthly Bill: ₹${total} | Paid: ₹${paid} | Due: ₹${due}</p>
    </div>`;
};

// Student view of their own attendance
window.viewMyAttendance = () => {
    const user = getCurrentStudent();
    let html = `<div class="card glass-card"><table><tr><th>Date</th><th>Status</th></tr>`;
    attendanceLogs.filter(log => log.studentId === user.id).forEach(log => {
        html += `<tr><td>${log.date}</td><td>${log.status}</td></tr>`;
    });
    document.getElementById('content').innerHTML = html + `</table></div>`;
};

// Submit a grievance
window.submitComplaint = () => {
    const text = document.getElementById('complaintText').value;
    if (!text) return alert("Please enter details");
    const user = getCurrentStudent();
    complaints.push({ id: Date.now(), studentId: user.id, studentName: user.name, text, status: "Pending" });
    saveAll();
    alert("Complaint Submitted");
};

// ==========================================
// 9. EXPORT & REPORTING SYSTEM (CSV)
// ==========================================

// Core CSV download trigger
const downloadCSV = (filename, rows) => {
    const csvContent = rows.map(row => row.map(val => `"${(val ?? '').toString().replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
};

// Export attendance report
window.downloadAttendanceCSV = () => {
    let rows = [["Date", "Student Name", "Room", "Status"]];
    attendanceLogs.forEach(log => {
        const user = users.find(u => u.id === log.studentId);
        rows.push([log.date, user?.name || "Unknown", user?.room || "N/A", log.status]);
    });
    downloadCSV("attendance_report.csv", rows);
};

// UI for generating custom data reports
window.showCustomExport = () => {
    document.getElementById('viewTitle').innerText = "Custom Export";
    document.getElementById('content').innerHTML = `
    <div class="card glass-card">
        <h3>Select Columns</h3>
        <label><input type="checkbox" id="f_name" checked> Name</label><br>
        <label><input type="checkbox" id="f_room" checked> Room</label><br>
        <label><input type="checkbox" id="f_due" checked> Due Amount</label><br>
        <label><input type="checkbox" id="f_attendance"> Monthly Attendance Count</label><br>
        <input type="month" id="exportMonth" value="${getCurrentMonth()}">
        <button onclick="downloadCustomCSV()">Download CSV</button>
    </div>`;
};

// Logic for building custom CSV rows
window.downloadCustomCSV = () => {
    const month = document.getElementById('exportMonth').value;
    let headers = [];
    if (document.getElementById('f_name').checked) headers.push("Name");
    if (document.getElementById('f_room').checked) headers.push("Room");
    if (document.getElementById('f_due').checked) headers.push("Due");
    if (document.getElementById('f_attendance').checked) headers.push("Attendance");

    let rows = [headers];
    users.filter(u => u.role === 'student').forEach(u => {
        let row = [];
        const { due } = calculatePayment(u, month);
        const attCount = attendanceLogs.filter(l => l.studentId === u.id && l.date.includes(month)).length;
        
        if (document.getElementById('f_name').checked) row.push(u.name);
        if (document.getElementById('f_room').checked) row.push(u.room || "N/A");
        if (document.getElementById('f_due').checked) row.push(due);
        if (document.getElementById('f_attendance').checked) row.push(attCount);
        rows.push(row);
    });
    downloadCSV("custom_report.csv", rows);
};

// ==========================================
// 10. INITIALIZATION & DROPDOWNS
// ==========================================

// Populate student selectors on load
window.loadStudentDropdown = () => {
    const select = document.getElementById('studentSelect');
    if (!select) return;
    select.innerHTML = `<option value="all">All Students</option>` + 
        users.filter(u => u.role === 'student').map(u => `<option value="${u.id}">${u.name}</option>`).join('');
};

// Auto-run when the script loads
window.onload = () => {
    loadStudentDropdown();
};
// ==========================================
// COMPLAINTS MANAGEMENT (ADMIN VIEW)
// ==========================================
window.showComplaints = () => {
    document.getElementById('viewTitle').innerText = "Student Complaints";
    
    if (complaints.length === 0) {
        document.getElementById('content').innerHTML = `
            <div class="card glass-card">
                <p>No complaints filed yet. Everything looks clear!</p>
            </div>`;
        return;
    }

    let html = `<div class="grid-container">`;
    
    // Sort complaints so newest are first
    const sortedComplaints = [...complaints].reverse();

    sortedComplaints.forEach(c => {
        const statusClass = c.status === 'Resolved' ? 'style="color: #10b981;"' : 'style="color: #fbbf24;"';
        
        html += `
        <div class="card glass-card">
            <div style="display:flex; justify-content:space-between; align-items:flex-start;">
                <h4>${c.studentName}</h4>
                <small ${statusClass}>● ${c.status}</small>
            </div>
            <p style="margin: 15px 0; font-size: 14px; color: var(--text-dim);">"${c.text}"</p>
            <div style="display:flex; gap: 10px; margin-top: 10px;">
                <button onclick="updateComplaintStatus(${c.id}, 'Resolved')">Mark Resolved</button>
                <button class="btn-outline" onclick="deleteComplaint(${c.id})">Delete</button>
            </div>
        </div>`;
    });

    document.getElementById('content').innerHTML = html + `</div>`;
};

// Update status (Pending -> Resolved)
window.updateComplaintStatus = (id, newStatus) => {
    const complaint = complaints.find(c => c.id === id);
    if (complaint) {
        complaint.status = newStatus;
        saveAll();
        window.showComplaints();
    }
};

// Remove a complaint
window.deleteComplaint = (id) => {
    if (confirm("Remove this complaint record?")) {
        complaints = complaints.filter(c => c.id !== id);
        saveAll();
        window.showComplaints();
    }
};