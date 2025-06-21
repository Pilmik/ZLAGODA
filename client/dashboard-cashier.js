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

// Navigation
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
      if (sectionId === "sale") initSaleSection();
      if (sectionId === "receipts") {initReceiptsSection(); fetchTodayReceipts();}
    }
  });
});

// Products
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

// Product Modal
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

// Store Products
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

// Sale Section
let cart = [];
let customerCard = null;

function initSaleSection() {
  const saleSearchBtn = document.getElementById("sale-search-btn");
  const saleSearchInput = document.getElementById("sale-search-input");
  const customerSearchBtn = document.getElementById("customer-search-btn");
  const customerCardInput = document.getElementById("customer-card-input");
  const saleConfirmBtn = document.getElementById("sale-confirm-btn");

  saleSearchBtn.addEventListener("click", searchSaleProduct);
  customerSearchBtn.addEventListener("click", searchCustomer);
  saleConfirmBtn.addEventListener("click", confirmSale);
}

async function searchSaleProduct() {
  const search = document.getElementById("sale-search-input").value.trim();
  const productDetails = document.getElementById("sale-product-details");

  if (!search) {
    productDetails.innerHTML = "<p>Введіть UPC або назву товару</p>";
    return;
  }

  try {
    const response = await fetch(`/dashboard-cashier/store_products?search=${encodeURIComponent(search)}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await response.json();
    const products = data.store_products || [];

    if (products.length === 0) {
      productDetails.innerHTML = "<p>Товар не знайдено</p>";
      return;
    }

    const product = products[0]; // Take first result
    productDetails.innerHTML = `
      <p><strong>UPC:</strong> ${product.upc}</p>
      <p><strong>Назва:</strong> ${product.product_name}</p>
      <p><strong>Ціна:</strong> ${product.selling_price} грн</p>
      <p><strong>Наявна кількість:</strong> ${product.products_number}</p>
      <input type="number" id="sale-quantity" min="1" max="${product.products_number}" placeholder="Кількість">
      <button id="add-to-cart-btn">Додати до кошика</button>
    `;

    document.getElementById("add-to-cart-btn").addEventListener("click", () => addToCart(product));
  } catch (err) {
    productDetails.innerHTML = "<p>Помилка пошуку товару</p>";
    console.error("Помилка:", err.message);
  }
}

function addToCart(product) {
  const quantityInput = document.getElementById("sale-quantity");
  const quantity = parseInt(quantityInput.value);

  if (!quantity || quantity <= 0 || quantity > product.products_number) {
    alert("Некоректна кількість");
    return;
  }

  const existingItem = cart.find(item => item.upc === product.upc);
  if (existingItem) {
    existingItem.product_number += quantity;
  } else {
    cart.push({
      upc: product.upc,
      product_name: product.product_name,
      selling_price: product.selling_price,
      product_number: quantity,
    });
  }

  renderCart();
  updateSaleButtonState();
}

function renderCart() {
  const cartTableBody = document.getElementById("cart-table-body");
  const cartTotalSum = document.getElementById("cart-total-sum");
  cartTableBody.innerHTML = "";

  let total = 0;
  cart.forEach((item, index) => {
    const sum = item.selling_price * item.product_number;
    total += sum;
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${item.upc}</td>
      <td>${item.product_name}</td>
      <td>${item.selling_price}</td>
      <td>${item.product_number}</td>
      <td>${sum.toFixed(2)}</td>
      <td><button class="remove-cart-item" data-index="${index}">Видалити</button></td>
    `;
    cartTableBody.appendChild(row);
  });

  cartTotalSum.textContent = total.toFixed(2);

  document.querySelectorAll(".remove-cart-item").forEach(btn => {
    btn.addEventListener("click", () => {
      const index = parseInt(btn.dataset.index);
      cart.splice(index, 1);
      renderCart();
      updateSaleButtonState();
    });
  });
}

async function searchCustomer() {
  const cardInput = document.getElementById("customer-card-input").value.trim();
  const customerDetails = document.getElementById("customer-details");

  if (!cardInput) {
    customerDetails.innerHTML = "<p>Введіть номер картки або телефон</p>";
    customerCard = null;
    updateSaleButtonState();
    return;
  }

  try {
    const isPhone = /^\+?380\d{9}$/.test(cardInput);
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(cardInput);

    if (isUUID) {
      customerDetails.innerHTML = "<p>Введено номер картки. Введіть номер телефону або прізвище клієнта.</p>";
      customerCard = null;
      updateSaleButtonState();
      return;
    }

    let url;
    if (isPhone) {
      url = `/dashboard-cashier/customers/${encodeURIComponent(cardInput)}`;
    } else {
      url = `/dashboard-cashier/customers?search=${encodeURIComponent(cardInput)}`;
    }

    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!response.ok) {
      throw new Error(`Помилка запиту: ${response.status}`);
    }

    const data = await response.json();

    if (isPhone ? !data.card_number : !data.clients || data.clients.length === 0) {
      customerDetails.innerHTML = "<p>Клієнта не знайдено</p>";
      customerCard = null;
    } else {
      const customer = isPhone ? data : data.clients[0];
      customerCard = customer.card_number;
      customerDetails.innerHTML = `
        <p><strong>Прізвище:</strong> ${customer.cust_surname}</p>
        <p><strong>Ім'я:</strong> ${customer.cust_name}</p>
        <p><strong>Відсоток знижки:</strong> ${customer.percent}%</p>
      `;
    }

    updateSaleButtonState();
  } catch (err) {
    customerDetails.innerHTML = "<p>Помилка пошуку клієнта</p>";
    console.error("Помилка:", err.message);
    customerCard = null;
    updateSaleButtonState();
  }
}

async function confirmSale() {
  if (cart.length === 0) {
    alert("Кошик порожній");
    return;
  }

  const payload = JSON.parse(atob(token.split(".")[1]));
  const saleData = {
    employee_id: payload.internal_id || "00000000-0000-1000-8000-000000000000", // Fallback UUID
    card_number: customerCard || null,
    items: cart.map(item => ({
      upc: item.upc,
      product_number: item.product_number,
    })),
  };

  try {
    const response = await fetch("/dashboard-cashier/sale", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(saleData),
    });
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Помилка продажу");
    }

    alert(`Чек створено! Номер: ${data.check_number}, Сума: ${data.total_sum} грн`);
    cart = [];
    customerCard = null;
    document.getElementById("sale-product-details").innerHTML = "";
    document.getElementById("customer-details").innerHTML = "";
    document.getElementById("sale-search-input").value = "";
    document.getElementById("customer-card-input").value = "";
    renderCart();
    updateSaleButtonState();
  } catch (err) {
    alert(`Помилка: ${err.message}`);
    console.error("Помилка продажу:", err.message);
  }
}

function updateSaleButtonState() {
  const saleConfirmBtn = document.getElementById("sale-confirm-btn");
  saleConfirmBtn.disabled = cart.length === 0;
}

// Receipts Section
function initReceiptsSection() {
  const filterBtn = document.getElementById("receipts-filter-btn");
  const todayBtn = document.getElementById("receipts-today-btn");
  const searchBtn = document.getElementById("receipts-search-btn");

  filterBtn.addEventListener("click", fetchReceipts);
  todayBtn.addEventListener("click", fetchTodayReceipts);
  searchBtn.addEventListener("click", searchReceiptByNumber);

  // Завантажуємо чеки за поточний день при вході в секцію
  fetchTodayReceipts();
}

async function fetchReceipts() {
  const dateStart = document.getElementById("receipts-date-start").value;
  const dateEnd = document.getElementById("receipts-date-end").value;
  const receiptsTableBody = document.getElementById("receipts-table-body");
  const receiptsCount = document.querySelector(".receipts-count");
  const totalSalesSum = document.getElementById("total-sales-sum");

  let url = "/dashboard-cashier/receipts";
  const params = [];
  if (dateStart) params.push(`date_of_start=${encodeURIComponent(dateStart)}`);
  if (dateEnd) params.push(`date_of_end=${encodeURIComponent(dateEnd)}`);
  if (params.length > 0) url += `?${params.join("&")}`;

  try {
    console.log("11111")
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok) throw new Error(`Помилка запиту: ${response.status}`);
    const data = await response.json();
    console.log("2222")
    renderReceipts(data.receipts, data.total_sales);
    receiptsCount.textContent = `Усього знайдено: ${data.receipts.length}`;
    totalSalesSum.textContent = Number(data.total_sales).toFixed(2);
  } catch (err) {
    console.error("Помилка:", err.message);
    receiptsTableBody.innerHTML = `<tr><td colspan="5">Не вдалося завантажити</td></tr>`;
    receiptsCount.textContent = `Усього знайдено: 0`;
    totalSalesSum.textContent = "0.00";
  }
}

async function fetchTodayReceipts() {
  const today = new Date().toISOString().split("T")[0];
  document.getElementById("receipts-date-start").value = today;
  document.getElementById("receipts-date-end").value = today;
  fetchReceipts();
}

function renderReceipts(receipts, totalSales) {
  const receiptsTableBody = document.getElementById("receipts-table-body");
  receiptsTableBody.innerHTML = "";

  if (!receipts || receipts.length === 0) {
    receiptsTableBody.innerHTML = `<tr><td colspan="5">Чеків не знайдено</td></tr>`;
    return;
  }

  receipts.forEach(receipt => {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${receipt.check_number}</td>
      <td>${new Date(receipt.print_date).toLocaleString("uk-UA")}</td>
      <td>${receipt.sum_total}</td>
      <td>${receipt.vat}</td>
      <td>${receipt.card_number || "Немає"}</td>
    `;
    row.addEventListener("click", () => searchReceiptByNumber(String(receipt.check_number))); // Передаємо рядок check_number
    receiptsTableBody.appendChild(row);
  });
}

async function searchReceiptByNumber(checkNumber) {
  const searchInput = document.getElementById("receipts-search-input");
  const receiptDetails = document.getElementById("receipt-details");
  const check_number = checkNumber || searchInput.value.trim();

  if (!check_number) {
    receiptDetails.innerHTML = "<p>Введіть номер чеку</p>";
    return;
  }

  if (!check_number || typeof check_number !== "string") {
    receiptDetails.innerHTML = "<p>Некоректний номер чеку</p>";
    console.error("Некоректний check_number:", check_number);
    return;
  }

  try {
    const response = await fetch(`/dashboard-cashier/receipts/${encodeURIComponent(check_number)}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    console.log(encodeURIComponent(check_number))
    if (!response.ok) throw new Error(`Помилка запиту: ${response.status}`);
    const receipt = await response.json();

    receiptDetails.innerHTML = `
      <h3>Чек №${receipt.check_number}</h3>
      <p><strong>Дата:</strong> ${new Date(receipt.print_date).toLocaleString("uk-UA")}</p>
      <p><strong>Сума:</strong> ${receipt.sum_total} грн</p>
      <p><strong>ПДВ:</strong> ${receipt.vat} грн</p>
      <p><strong>Картка клієнта:</strong> ${receipt.card_number || "Немає"}</p>
      <h4>Товари:</h4>
      <table class="receipt-items-table">
        <thead>
          <tr>
            <th>UPC</th>
            <th>Назва</th>
            <th>Кількість</th>
            <th>Ціна (грн)</th>
            <th>Сума (грн)</th>
          </tr>
        </thead>
        <tbody>
          ${receipt.items.map(item => `
            <tr>
              <td>${item.upc}</td>
              <td>${item.product_name}</td>
              <td>${item.product_number}</td>
              <td>${item.selling_price}</td>
              <td>${(item.product_number * item.selling_price).toFixed(2)}</td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    `;
  } catch (err) {
    receiptDetails.innerHTML = "<p>Чек не знайдено або помилка пошуку</p>";
    console.error("Помилка:", err.message);
  }
}