// ========== АВТОРИЗАЦІЯ ==========
const token = localStorage.getItem("token");

if (!token) {
  window.location.href = "/";
} else {
  const payload = JSON.parse(atob(token.split(".")[1]));
  if (payload.roles !== "CASHIER") {
    alert("Доступ заборонено.");
    window.location.href = "/";
  } else {
    document.getElementById("cashier-name").textContent = payload.name || "Касир";
  }
}

// ========== НАВІГАЦІЯ ==========
const links = document.querySelectorAll(".nav-link");
const sections = document.querySelectorAll(".section");

links.forEach(link => {
  link.addEventListener("click", () => {
    links.forEach(l => l.classList.remove("active"));
    link.classList.add("active");

    const sectionId = link.dataset.section;
    sections.forEach(section => {
      section.classList.remove("active");
      section.style.display = "none";
    });

    const target = document.getElementById(sectionId);
    if (target) {
      target.classList.add("active");
      target.style.display = "block";
      if (sectionId === "products") fetchProducts();
      if (sectionId === "store_products") fetchStoreProducts();
    }
  });
});

// ========== ТОВАРИ ==========
const productsTableBody = document.querySelector("#products .product-table tbody");
const productsCount = document.querySelector("#products .products-count");
const searchInput = document.querySelector(".product-search");
const categoryFilterInput = document.querySelector(".product-category-filter");
const searchButton = document.querySelector(".product-search-btn");

async function fetchProducts() {
  const name = searchInput.value.trim();
  const category = categoryFilterInput.value.trim();

  let url = "/dashboard-cashier/products";
  const params = [];

  if (name !== "") params.push(`name=${encodeURIComponent(name)}`);
  if (category !== "") {
    if (/^\d+$/.test(category)) {
      params.push(`number=${category}`);
    } else {
      params.push(`category=${encodeURIComponent(category)}`);
    }
  }

  if (params.length > 0) {
    url += `?${params.join("&")}`;
  }

  try {
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await response.json();
    renderProducts(data);
  } catch (err) {
    console.error("Помилка завантаження:", err.message);
    productsTableBody.innerHTML = `<tr><td colspan="3">Не вдалося завантажити</td></tr>`;
    productsCount.textContent = `Усього знайдено: 0`;
  }
}

function renderProducts(products) {
  productsTableBody.innerHTML = "";
  if (!products || products.length === 0) {
    productsTableBody.innerHTML = `<tr><td colspan="3">Товарів не знайдено</td></tr>`;
    productsCount.textContent = `Усього знайдено: 0`;
    return;
  }

  for (const p of products) {
    const row = document.createElement("tr");
    row.innerHTML = `<td>${p.id_product}</td><td>${p.category_number}</td><td>${p.product_name}</td>`;
    row.addEventListener("click", () => openProductModal(p.id_product));
    productsTableBody.appendChild(row);
  }

  productsCount.textContent = `Усього знайдено: ${products.length}`;
}

searchButton.addEventListener("click", fetchProducts);

// ========== МОДАЛКА ==========
const productModal = document.getElementById("productModal");
const productModalTitle = document.getElementById("productModalTitle");
const productDetailsList = document.getElementById("productDetailsList");
document.getElementById("closeProductModal").onclick = () => productModal.style.display = "none";
document.getElementById("closeProductDetails").onclick = () => productModal.style.display = "none";

async function openProductModal(id) {
  try {
    const response = await fetch(`/dashboard-cashier/products/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const product = await response.json();

    productModalTitle.textContent = `ID: ${product.id_product}`;
    productDetailsList.innerHTML = `
      <li><strong>Назва:</strong> ${product.product_name}</li>
      <li><strong>Категорія:</strong> ${product.category_name || '-'}</li>
      <li><strong>Номер категорії:</strong> ${product.category_number}</li>
      <li><strong>Опис:</strong><br>${(product.characteristics || "-").replaceAll(";", "<br>")}</li>
    `;
    productModal.style.display = "flex";
  } catch (err) {
    console.error("Помилка:", err.message);
  }
}

// ========== ТОВАРИ В МАГАЗИНІ ==========
const storeProductsTableBody = document.querySelector("#store_products .product-table tbody");
const storeSearchInput = document.querySelector(".product-upc-search");
const storeFilterButtons = document.querySelectorAll(".store-filter-btn");
let currentSortField = "products_number";

storeFilterButtons.forEach(btn => {
  btn.addEventListener("click", () => {
    storeFilterButtons.forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    fetchStoreProducts();
  });
});

document.querySelectorAll("#store_products .sortable").forEach(header => {
  header.addEventListener("click", () => {
    const field = header.dataset.sort;
    if (field) {
      currentSortField = field;
      fetchStoreProducts();
    }
  });
});

storeSearchInput.addEventListener("input", fetchStoreProducts);

async function fetchStoreProducts() {
  const search = storeSearchInput.value.trim();
  const promotional = document.querySelector(".store-filter-btn.active")?.dataset.value;

  let url = `/dashboard-cashier/store_products?sorting=${currentSortField}`;
  const params = [];
  if (search) params.push(`search=${encodeURIComponent(search)}`);
  if (promotional !== undefined) params.push(`promotional=${promotional}`);
  if (params.length > 0) url += `&${params.join("&")}`;

  try {
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await response.json();
    renderStoreProducts(data.store_products || []);
  } catch (err) {
    console.error("Помилка:", err.message);
    storeProductsTableBody.innerHTML = `<tr><td colspan="5">Не вдалося завантажити</td></tr>`;
  }
}

function renderStoreProducts(products) {
  storeProductsTableBody.innerHTML = "";
  if (!products || products.length === 0) {
    storeProductsTableBody.innerHTML = `<tr><td colspan="5">Нічого не знайдено</td></tr>`;
    return;
  }

  for (const p of products) {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${p.upc}</td>
      <td>${p.product_name}</td>
      <td>${p.selling_price}</td>
      <td>${p.products_number}</td>
      <td>${p.promotional_product ? "✔" : ""}</td>
    `;
    row.addEventListener("click", () => openStoreProductModal(p.upc));
    storeProductsTableBody.appendChild(row);
  }
}

async function openStoreProductModal(upc) {
  try {
    const response = await fetch(`/dashboard-cashier/store_products/${upc}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const sp = await response.json();

    productModalTitle.textContent = `UPC: ${sp.upc}`;
    productDetailsList.innerHTML = `
      <li><strong>Назва товару:</strong> ${sp.product_name}</li>
      <li><strong>Ціна (грн):</strong> ${sp.selling_price}</li>
      <li><strong>Кількість:</strong> ${sp.products_number}</li>
      <li><strong>Акційний:</strong> ${sp.promotional_product ? "Так" : "Ні"}</li>
      <li><strong>Характеристики:</strong> <br>${(sp.characteristics || "-").replaceAll(";", "<br>")}</li>
    `;
    productModal.style.display = "flex";
  } catch (err) {
    console.error("Помилка відкриття товару:", err.message);
  }
}