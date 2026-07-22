const API_BASE_URL = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
  ? 'http://localhost:5000'
  : 'https://sylvora-api.onrender.com';

const catalog = document.getElementById('dress-catalog');

const VENDOR_PHONES = {
  "Sister": "237670691951",
  "Sarah": "237670691951",
  "Grace": "237670691951",
  "Bella": "237670691951"
};

const HERO_SLIDES = [
  { subtitle: "DISCOVER YOUR STYLE", title: "Elevate Your Everyday", desc: "Timeless fashion pieces crafted for confidence and effortless style.", img: "https://images.unsplash.com/photo-1515372039744-b8f02a3ae446?q=80&w=1000&auto=format&fit=crop" },
  { subtitle: "NEW SEASON ARRIVALS", title: "Couture Evening Wear", desc: "Exquisite silk party gowns and hand-tailored boutique dresses.", img: "https://images.unsplash.com/photo-1539109136881-3be0616acf4b?q=80&w=1000&auto=format&fit=crop" }
];

let currentSlide = 0;
let allProducts = [];
let activeCategory = 'ALL';
let cart = [];
let currentUser = JSON.parse(localStorage.getItem('sylvora_user')) || null;
let isRegisterMode = false;

let localUsers = JSON.parse(localStorage.getItem('sylvora_local_users')) || [
  { email: "admin@sylvora.com", password: "password123", full_name: "Sylvora Admin", role: "SUPER_ADMIN" }
];

function updateAuthUI() {
  const userBtn = document.getElementById('user-auth-btn');
  if (currentUser) {
    userBtn.innerHTML = `<span style="font-size:0.75rem; font-weight:bold; color:var(--color-gold);">👤 ${currentUser.full_name.split(' ')[0]}</span>`;
    document.getElementById('user-dropdown-name').innerText = currentUser.full_name;
    document.getElementById('user-dropdown-email').innerText = currentUser.email;
  } else {
    userBtn.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`;
  }
}

function handleUserIconClick() {
  if (currentUser) {
    document.getElementById('user-dropdown').classList.toggle('hidden');
  } else {
    openAuthModal();
  }
}

function signOutUser() {
  currentUser = null;
  localStorage.removeItem('sylvora_user');
  document.getElementById('user-dropdown').classList.add('hidden');
  updateAuthUI();
  alert("👋 You have been signed out successfully.");
}

function openAuthModal() { document.getElementById('auth-modal').classList.remove('hidden'); }
function closeAuthModal() { document.getElementById('auth-modal').classList.add('hidden'); }

function toggleAuthMode() {
  isRegisterMode = !isRegisterMode;
  document.getElementById('auth-title').innerText = isRegisterMode ? "📝 Register Account" : "🔐 Sign In to Sylvora";
  document.getElementById('name-group').classList.toggle('hidden', !isRegisterMode);
  document.getElementById('auth-submit-btn').innerText = isRegisterMode ? "CREATE ACCOUNT" : "SIGN IN";
  document.getElementById('auth-toggle-msg').innerText = isRegisterMode ? "Already have an account?" : "Don't have an account?";
  document.getElementById('auth-toggle-btn').innerText = isRegisterMode ? "Sign In" : "Create One";
}

document.getElementById('auth-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = document.getElementById('auth-email').value.trim();
  const password = document.getElementById('auth-password').value.trim();
  const fullName = document.getElementById('auth-name').value.trim();

  if (isRegisterMode) {
    const existing = localUsers.find(u => u.email === email);
    if (existing) {
      alert("❌ Email already registered! Please sign in.");
      toggleAuthMode();
      return;
    }

    const newUser = { email, password, full_name: fullName, role: "CUSTOMER" };
    localUsers.push(newUser);
    localStorage.setItem('sylvora_local_users', JSON.stringify(localUsers));

    currentUser = { full_name: fullName, email: email, role: "CUSTOMER" };
    localStorage.setItem('sylvora_user', JSON.stringify(currentUser));

    alert(`✨ Account created successfully! Welcome to Sylvora, ${fullName}.`);
    closeAuthModal();
    updateAuthUI();
  } else {
    const userMatch = localUsers.find(u => u.email === email && u.password === password);
    if (userMatch) {
      currentUser = { full_name: userMatch.full_name, email: userMatch.email, role: userMatch.role };
      localStorage.setItem('sylvora_user', JSON.stringify(currentUser));
      alert(`Welcome back, ${userMatch.full_name}!`);
      closeAuthModal();
      updateAuthUI();
    } else {
      alert("❌ Invalid credentials! If you don't have an account yet, click 'Create One' below.");
    }
  }
});

const IMAGE_BANK = {
  WOMEN: [
    'https://images.unsplash.com/photo-1515372039744-b8f02a3ae446?q=80&w=600&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1539109136881-3be0616acf4b?q=80&w=600&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1566174053879-31528523f8ae?q=80&w=600&auto=format&fit=crop'
  ],
  MEN: [
    'https://images.unsplash.com/photo-1507679799987-c73779587ccf?q=80&w=600&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1617137968427-85924c800a22?q=80&w=600&auto=format&fit=crop'
  ],
  CHILDREN: [
    'https://images.unsplash.com/photo-1518831959646-742c3a14ebf7?q=80&w=600&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1503944583220-79d8926ad5e2?q=80&w=600&auto=format&fit=crop'
  ],
  ACCESSORIES: [
    'https://images.unsplash.com/photo-1584917865442-de89df76afd3?q=80&w=600&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?q=80&w=600&auto=format&fit=crop'
  ],
  SHOES: [
    'https://images.unsplash.com/photo-1549298916-b41d501d3772?q=80&w=600&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1560769629-975ec94e6a86?q=80&w=600&auto=format&fit=crop'
  ]
};

function generateSeedProducts() {
  const seed = [];
  const categories = ['WOMEN', 'MEN', 'CHILDREN', 'ACCESSORIES', 'SHOES'];
  const vendors = ['Sister', 'Sarah', 'Grace', 'Bella'];
  
  const titles = {
    WOMEN: ['Silk Evening Gown', 'Floral Summer Dress', 'Velvet Cocktail Dress'],
    MEN: ['Bespoke Tailored Suit', 'Linen Button-Down', 'Slim Fit Blazer'],
    CHILDREN: ['Cotton Kids Party Dress', 'Junior Tailored Suit Set', 'Soft Knit Cardigan'],
    ACCESSORIES: ['Gold Embossed Leather Bag', 'Polarized Sunglasses', 'Silk Scarf'],
    SHOES: ['Pointed Stiletto Heels', 'Leather Dress Oxfords', 'Minimalist Sneakers']
  };

  for (let i = 1; i <= 100; i++) {
    const cat = categories[i % categories.length];
    const titleArr = titles[cat];
    const baseTitle = titleArr[i % titleArr.length];
    const imgList = IMAGE_BANK[cat];
    const imgUrl = imgList[i % imgList.length];

    const hasDiscount = i % 3 === 0;
    const originalPrice = 25000 + (i * 1500) % 70000;
    const priceXaf = hasDiscount ? Math.floor(originalPrice * 0.8) : originalPrice;

    seed.push({
      id: 1000 + i,
      name: `${baseTitle} Vol. ${i}`,
      price_xaf: priceXaf,
      original_price_xaf: hasDiscount ? originalPrice : null,
      discount_percent: hasDiscount ? 20 : null,
      discount_expiry: hasDiscount ? "2026-12-31T23:59:59" : null,
      size: (i % 3 === 0) ? 'S, M, L' : 'M, L, XL',
      image_url: imgUrl,
      is_out_of_stock: false,
      media_type: 'image',
      vendor_name: vendors[i % vendors.length],
      categories: [cat]
    });
  }
  return seed;
}

async function loadDresses() {
  let dbProducts = [];
  try {
    const res = await fetch(`${API_BASE_URL}/api/dresses`);
    dbProducts = await res.json();
  } catch (err) {
    dbProducts = [];
  }

  const categoriesList = ['WOMEN', 'MEN', 'CHILDREN', 'ACCESSORIES', 'SHOES'];
  dbProducts = dbProducts.map((p, idx) => {
    if (!p.categories || p.categories.length === 0) {
      p.categories = [categoriesList[idx % categoriesList.length]];
    }
    return p;
  });

  allProducts = [...dbProducts, ...generateSeedProducts()];
  renderCatalog();
  startDiscountTimers();
}

function selectCategory(cat) {
  activeCategory = cat;
  document.querySelectorAll('.cat-btn').forEach(btn => btn.classList.toggle('active', btn.id === `filter-${cat}`));
  document.getElementById('catalog-title').innerText = cat === 'ALL' ? 'FEATURED PRODUCTS' : `${cat} COLLECTION`;
  renderCatalog();

  const catalogElem = document.getElementById('catalog');
  if (catalogElem) catalogElem.scrollIntoView({ behavior: 'smooth' });
}

function renderCatalog() {
  const searchInput = document.getElementById('search-input');
  const search = searchInput ? searchInput.value.toLowerCase() : '';

  let filtered = allProducts.filter(item => {
    const itemCats = item.categories || (item.category ? [item.category] : ['WOMEN']);
    const matchesCat = activeCategory === 'ALL' || itemCats.includes(activeCategory);
    const matchesSearch = item.name.toLowerCase().includes(search);
    return matchesCat && matchesSearch;
  });

  if (filtered.length === 0) {
    catalog.innerHTML = "<p style='grid-column: 1/-1; text-align: center; padding: 2rem;'>No items found matching your criteria.</p>";
    return;
  }

  catalog.innerHTML = filtered.map(item => {
    const cats = item.categories || (item.category ? [item.category] : ['WOMEN']);
    
    const discountBadge = item.discount_percent 
      ? `<div class="discount-tag">${item.discount_percent}% OFF</div>` 
      : '';

    const priceHtml = item.original_price_xaf
      ? `<div class="price-wrap">
           <span class="price">${item.price_xaf.toLocaleString()} XAF</span>
           <span class="original-price">${item.original_price_xaf.toLocaleString()} XAF</span>
         </div>`
      : `<div class="price">${item.price_xaf.toLocaleString()} XAF</div>`;

    const timerHtml = item.discount_expiry
      ? `<div class="countdown-timer-box" data-expiry="${item.discount_expiry}">⏳ Sale Ends In: 12h 45m 10s</div>`
      : '';

    return `
      <div class="card ${item.is_out_of_stock ? 'disabled' : ''}">
        ${discountBadge}
        <div class="media-box"><img src="${item.image_url}" alt="${item.name}"></div>
        ${timerHtml}
        <div class="card-body">
          <div>
            <span class="badge">${cats.join(' • ')}</span>
            <h4 class="product-title">${item.name}</h4>
          </div>
          <div>
            ${priceHtml}
            <div class="moq">Size: ${item.size}</div>
            <div class="btn-group">
              <button class="btn-chat" onclick="handleGatedChat('${item.name.replace(/'/g, "\\'")}', ${item.price_xaf})">💬 CHAT</button>
              <button class="order-btn" onclick="addToBag(${item.id})">🛍️ ADD TO BAG</button>
            </div>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

function startDiscountTimers() {
  setInterval(() => {
    document.querySelectorAll('.countdown-timer-box').forEach(box => {
      const now = new Date().getTime();
      const distance = new Date("2026-12-31T23:59:59").getTime() - now;

      const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((distance % (1000 * 60)) / 1000);

      box.innerText = `🔥 FLASH SALE: ${hours}h ${minutes}m ${seconds}s`;
    });
  }, 1000);
}

function addToBag(id) {
  if (!currentUser) {
    alert("🔐 Please sign in or create an account before adding items to your bag!");
    openAuthModal();
    return;
  }

  const prod = allProducts.find(p => p.id === id);
  if (!prod) return;
  const existing = cart.find(c => c.id === id);
  if (existing) existing.qty += 1;
  else cart.push({ ...prod, qty: 1 });

  updateCartUI();
  toggleCartDrawer(true);
}

function handleGatedChat(name, price) {
  if (!currentUser) {
    alert("🔐 Please sign in to chat directly with Sylvora stylists!");
    openAuthModal();
    return;
  }
  openChat(name, price, 'M', 'Sister');
}

function updateCartUI() {
  document.getElementById('cart-count').innerText = cart.reduce((a, b) => a + b.qty, 0);
  const body = document.getElementById('cart-drawer-body');
  const subtotal = document.getElementById('cart-subtotal-price');

  if (cart.length === 0) {
    body.innerHTML = "<p style='text-align:center; padding: 20px; color:#888;'>Your bag is empty.</p>";
    subtotal.innerText = "0 XAF";
    return;
  }

  let total = 0;
  body.innerHTML = cart.map(i => {
    total += i.price_xaf * i.qty;
    return `
      <div style="display:flex; justify-content:space-between; margin-bottom:10px;">
        <span>${i.name} (x${i.qty})</span>
        <strong>${(i.price_xaf * i.qty).toLocaleString()} XAF</strong>
      </div>
    `;
  }).join('');
  subtotal.innerText = `${total.toLocaleString()} XAF`;
}

function toggleCartDrawer(open) {
  const drawer = document.getElementById('cart-drawer');
  if (open !== undefined) drawer.classList.toggle('hidden', !open);
  else drawer.classList.toggle('hidden');
}

function checkoutCartWhatsApp() {
  if (cart.length === 0) return alert("Your bag is empty!");
  let msg = `Hello Sylvora! Order placed by ${currentUser.full_name} (${currentUser.email}):\n\n`;
  let tot = 0;
  cart.forEach(i => {
    tot += i.price_xaf * i.qty;
    msg += `• *${i.name}* (x${i.qty}) - ${(i.price_xaf * i.qty).toLocaleString()} XAF\n`;
  });
  msg += `\n*TOTAL:* ${tot.toLocaleString()} XAF`;

  const phone = VENDOR_PHONES["Sister"];
  const webWhatsappUrl = `https://api.whatsapp.com/send?phone=${phone}&text=${encodeURIComponent(msg)}`;
  window.open(webWhatsappUrl, '_blank');
}

function openPaymentModal() {
  if (cart.length === 0) return alert("Your bag is empty!");
  const total = cart.reduce((sum, item) => sum + item.price_xaf * item.qty, 0);
  document.getElementById('momo-amount').value = `${total.toLocaleString()} XAF`;
  document.getElementById('payment-modal').classList.remove('hidden');
}

function closePaymentModal() {
  document.getElementById('payment-modal').classList.add('hidden');
}

function processNativePayment() {
  const phone = document.getElementById('momo-phone').value;
  if (!phone) return alert("Please enter your Mobile Money account number!");

  alert(`✅ Payment Request Sent to ${phone}! Please confirm the USSD prompt on your phone to complete your order.`);
  cart = [];
  updateCartUI();
  closePaymentModal();
  toggleCartDrawer(false);
}

function openChat(name, price, size, vendor) {
  const widget = document.getElementById('chat-widget');
  const chatBody = document.getElementById('chat-body');
  widget.classList.remove('hidden');
  chatBody.innerHTML = `
    <div class="chat-product-preview"><strong>Inquiring about:</strong> ${name}<br><small>${price.toLocaleString()} XAF</small></div>
    <div class="message system">Hello ${currentUser ? currentUser.full_name : ''}! 👋 How can we help you with this item?</div>
  `;
}

function closeChat() { document.getElementById('chat-widget').classList.add('hidden'); }
function filterCatalog() { renderCatalog(); }
function toggleMobileNav() { document.getElementById('nav-links').classList.toggle('mobile-open'); }
function toggleSearchInput() {
  const inp = document.getElementById('search-input');
  inp.classList.toggle('hidden');
  if (!inp.classList.contains('hidden')) inp.focus();
}

updateAuthUI();
loadDresses();