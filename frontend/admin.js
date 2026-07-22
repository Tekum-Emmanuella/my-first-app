const API_BASE_URL = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
  ? 'http://localhost:5000'
  : 'https://sylvora-api.onrender.com';

let adminUser = JSON.parse(localStorage.getItem('sylvora_admin_user')) || null;

function checkAdminSession() {
  if (adminUser) {
    document.getElementById('login-container').classList.add('hidden');
    document.getElementById('seller-board').classList.remove('hidden');
    document.getElementById('board-title').innerText = `Sylvora Command Center (${adminUser.full_name})`;

    if (adminUser.role === 'SUPER_ADMIN') {
      document.getElementById('tab-btn-subadmin').classList.remove('hidden');
      document.getElementById('admin-user-badge').classList.remove('hidden');
    }

    loadAdminInventory();
  }
}

function switchDashTab(tabName) {
  document.querySelectorAll('.dash-tab-btn').forEach(btn => btn.classList.remove('active'));
  document.getElementById(`tab-btn-${tabName}`).classList.add('active');

  document.querySelectorAll('.dash-pane').forEach(pane => pane.classList.add('hidden'));
  document.getElementById(`tab-content-${tabName}`).classList.remove('hidden');

  if (tabName === 'inventory') {
    loadAdminInventory();
  }
}

document.getElementById('admin-login-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = document.getElementById('admin-email').value.trim();
  const password = document.getElementById('admin-password').value.trim();

  let localUsers = JSON.parse(localStorage.getItem('sylvora_local_users')) || [
    { email: "admin@sylvora.com", password: "password123", full_name: "Sylvora Admin", role: "SUPER_ADMIN" }
  ];

  const userMatch = localUsers.find(u => u.email === email && u.password === password);

  if (userMatch && (userMatch.role === 'SUPER_ADMIN' || userMatch.role === 'ADMIN')) {
    adminUser = userMatch;
    localStorage.setItem('sylvora_admin_user', JSON.stringify(userMatch));
    checkAdminSession();
  } else {
    alert("❌ Invalid Credentials! Default Login: admin@sylvora.com / password123");
  }
});

function logoutAdmin() {
  localStorage.removeItem('sylvora_admin_user');
  window.location.reload();
}

document.getElementById('create-sub-admin-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const full_name = document.getElementById('sub-name').value.trim();
  const email = document.getElementById('sub-email').value.trim();
  const password = document.getElementById('sub-password').value.trim();

  let localUsers = JSON.parse(localStorage.getItem('sylvora_local_users')) || [];
  localUsers.push({ email, password, full_name, role: "ADMIN" });
  localStorage.setItem('sylvora_local_users', JSON.stringify(localUsers));

  alert(`✨ Sub-Admin privileges created for ${full_name} (${email})!`);
  document.getElementById('create-sub-admin-form').reset();
  switchDashTab('inventory');
});

const fileToBase64 = file => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.readAsDataURL(file);
  reader.onload = () => resolve(reader.result);
  reader.onerror = error => reject(error);
});

document.getElementById('upload-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const submitBtn = document.getElementById('submit-btn');
  submitBtn.disabled = true;
  submitBtn.innerText = "⏳ Publishing...";

  try {
    const selectedCats = Array.from(document.querySelectorAll('input[name="cat"]:checked')).map(c => c.value);
    if (selectedCats.length === 0) return alert("Select at least one category!");

    const fileInput = document.getElementById('media-file').files[0];
    const base64Data = await fileToBase64(fileInput);

    const newProd = {
      name: document.getElementById('name').value,
      price_xaf: parseInt(document.getElementById('price').value),
      size: document.getElementById('size').value,
      image_url: base64Data,
      is_out_of_stock: false,
      media_type: fileInput.type.startsWith('video/') ? "video" : "image",
      vendor_name: adminUser.full_name,
      categories: selectedCats
    };

    const res = await fetch(`${API_BASE_URL}/api/dresses`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newProd)
    });

    if (res.ok) {
      alert("✨ Product published to storefront!");
      document.getElementById('upload-form').reset();
      switchDashTab('inventory');
    }
  } catch (err) {
    alert("❌ Upload error: " + err.message);
  } finally {
    submitBtn.disabled = false;
    submitBtn.innerText = "🚀 PUBLISH TO STOREFRONT";
  }
});

async function loadAdminInventory() {
  const inventoryBox = document.getElementById('seller-inventory');
  try {
    const res = await fetch(`${API_BASE_URL}/api/dresses`);
    const products = await res.json();

    document.getElementById('metric-total-count').innerText = products.length;

    if (!products || products.length === 0) {
      inventoryBox.innerHTML = "<p style='padding:20px; color:#888;'>No products uploaded yet.</p>";
      return;
    }

    inventoryBox.innerHTML = products.map(p => {
      const cats = p.categories || (p.category ? [p.category] : ['WOMEN']);
      return `
        <div class="inventory-card">
          <img src="${p.image_url}" class="inventory-thumb" alt="${p.name}">
          <div class="inventory-info">
            <h4>${p.name}</h4>
            <span class="inv-cats">${cats.join(' • ')}</span>
            <div class="inv-price">${p.price_xaf.toLocaleString()} XAF</div>
          </div>
          <button class="btn-del-item" onclick="deleteProduct(${p.id})">🗑️</button>
        </div>
      `;
    }).join('');
  } catch (err) {
    inventoryBox.innerHTML = "<p style='padding:20px; color:#EF4444;'>Failed to load inventory feed from server.</p>";
  }
}

async function deleteProduct(id) {
  if (confirm("Delete product permanently?")) {
    await fetch(`${API_BASE_URL}/api/dresses/${id}`, { method: 'DELETE' });
    loadAdminInventory();
  }
}

checkAdminSession();