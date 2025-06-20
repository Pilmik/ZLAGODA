// ===================== УТИЛІТИ =====================

// Функція для форматування дати з рядка у формат ДД.ММ.РРРР
function formatDate(dateStr) {
  const d = new Date(dateStr);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}.${month}.${year}`;
}

// Змінна-флаг: чи зараз режим редагування
let isEditMode = false;
// ID працівника, якого редагують
let currentEditingId = null;
// Поточний обʼєкт працівника для перегляду
let currentEmployee = null;

let token = null; 
// Зберігатиме всі категорії для доступу в модалках
let categories = []; 
// зберігає товари у магазині
let storeProducts = []; 

// ===================== DOMContentLoaded =====================
  document.addEventListener("DOMContentLoaded", () => {
    token = localStorage.getItem("token");
    if (!token) return (window.location.href = "/");
    const payload = JSON.parse(atob(token.split(".")[1]));
    if (payload.roles !== "MANAGER") {
      alert("Доступ не надано.");
      return (window.location.href = "/");
    }

    document.querySelector(".client-search").addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      document.querySelector(".client-search-btn").click();
    }
  });

  // ==== СОРТУВАННЯ ДЛЯ ТОВАРІВ У МАГАЗИНІ ====
  let currentSort = { field: null, direction: 'asc' };

  document.querySelectorAll('.sortable').forEach(th => {
    th.addEventListener('click', () => {
      const field = th.dataset.sort;
      const isSameField = currentSort.field === field;
      currentSort.direction = isSameField && currentSort.direction === 'asc' ? 'desc' : 'asc';
      currentSort.field = field;

      document.querySelectorAll('.sortable .sort-icon').forEach(icon => {
        icon.classList.remove('sort-asc', 'sort-desc');
      });

      const icon = th.querySelector(".sort-icon");
        if (icon) {
          icon.classList.remove("sort-asc", "sort-desc");
          icon.classList.add(currentSort.direction === 'asc' ? 'sort-asc' : 'sort-desc');
        }

      sortTableData(field, currentSort.direction);
    });
  });

  function safeAddListener(selector, type, handler) {
    const el = document.querySelector(selector);
    if (el) el.addEventListener(type, handler);
  }

  // === ВІДКРИТТЯ/ЗАКРИТТЯ модалки клієнтського звіту ===
  document.querySelector(".client-report-btn").addEventListener("click", () => {
    document.getElementById("clientReportModal").style.display = "flex";
  });
  document.getElementById("closeClientReportModal").addEventListener("click", () => {
    document.getElementById("clientReportModal").style.display = "none";
  });
  document.getElementById("cancelClientReport").addEventListener("click", () => {
    document.getElementById("clientReportModal").style.display = "none";
  });
  document.getElementById("clientReportModal").addEventListener("click", (e) => {
    if (e.target.id === "clientReportModal") {
      document.getElementById("clientReportModal").style.display = "none";
    }
  });

  // === ВІДКРИТТЯ/ЗАКРИТТЯ модалки звіту категорій ===
  safeAddListener("#categories .employee-report-btn", "click", () => {
    document.getElementById("categoryReportModal").style.display = "flex";
  });

  safeAddListener("#closeCategoryReportModal", "click", () => {
    document.getElementById("categoryReportModal").style.display = "none";
  });

  safeAddListener("#cancelCategoryReport", "click", () => {
    document.getElementById("categoryReportModal").style.display = "none";
  });

  safeAddListener("#categoryReportModal", "click", (e) => {
    if (e.target.id === "categoryReportModal") {
      document.getElementById("categoryReportModal").style.display = "none";
    }
  });

  // === Submit звіту клієнтів ===
  document.getElementById("clientReportForm").addEventListener("submit", (e) => {
    e.preventDefault();
    const start = e.target.start_date.value;
    const end = e.target.end_date.value;
    const f3 = e.target.filter_3.checked;
    const f5 = e.target.filter_5.checked;
    const f8 = e.target.filter_8.checked;

    const selected = [];
    if (f3) selected.push(3);
    if (f5) selected.push(5);
    if (f8) selected.push(8);

    const filter = selected.length > 0 ? `&filter=${selected.join(",")}` : "";

    window.open(`/dashboard-manager/clients-report?start=${start}&end=${end}${filter}`, "_blank");
  });

  // DOM-посилання
  const cashierOnlyToggle = document.getElementById("cashierOnlyToggle");
  const searchBtn = document.querySelector(".employee-search-btn");
  const searchInput = document.querySelector(".employee-search");

  searchInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    e.preventDefault();
    searchBtn.click();
  }
});

  const logoutBtn = document.getElementById("logoutBtn");
    if (logoutBtn) {
      logoutBtn.addEventListener("click", (e) => {
        e.preventDefault();
        localStorage.removeItem("token");
        window.location.href = "login.html";
      });
    }

  // Першочергове завантаження працівників
  fetchEmployees();

  document.querySelector("#categories .employee-search-btn").addEventListener("click", () => {
    fetchCategories(); 
  });

  document.querySelector("#categories .category-search").addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      document.querySelector("#categories .employee-search-btn").click();
    }
  });

  // Cлухачі подій до кнопки пошуку товарів
  document.querySelector(".product-search-btn").addEventListener("click", () => {
    fetchProducts();
  });

  // Відкриття модалки створення товару
  document.querySelector(".product-new-btn").addEventListener("click", () => {
    document.getElementById("addProductModalTitle").textContent = "Новий товар";
    document.getElementById("submitProductBtn").textContent = "Додати";
    document.querySelector("#productForm").reset();
    isEditMode = false;
    currentEditingId = null;
    document.getElementById("addProductModal").style.display = "flex";
    populateCategorySelect();
  });

  document.querySelector(".product-search").addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      fetchProducts();
    }
  });

  document.querySelector(".product-category-filter").addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      fetchProducts();
    }
  });

    // === Новий клієнт: відкриття модалки ===
    document.querySelector(".client-new-btn").addEventListener("click", () => {
    document.getElementById("clientModalTitle").textContent = "Новий клієнт";
    document.getElementById("addClientModal").style.display = "flex";
  });
    document.querySelector("#addClientModal form").addEventListener("submit", async (e) => {
      e.preventDefault();
      const form = e.target;
      const formData = new FormData(form);
      const raw = {
      card_number: currentEditingId,
      cust_surname: formData.get("cust_surname"),
      cust_name: formData.get("cust_name"),
      cust_patronymic: formData.get("cust_patronymic"),
      phone_number: formData.get("phone_number"),
      city: formData.get("city"),
      street: formData.get("street"),
      zip_code: formData.get("zip_code"),
      percent: Number(formData.get("percent")),
    };

      const method = isEditMode ? "PUT" : "POST";
      const url = `/dashboard-manager/customers`;

      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(raw),
      });

      const data = await res.json();

      if (res.ok) {
        alert(data.message || (isEditMode ? "Клієнта оновлено." : "Клієнта додано."));
        form.reset();
        document.getElementById("addClientModal").style.display = "none";
        fetchClients();
        isEditMode = false;
        currentEditingId = null;
        document.querySelector("#clientModalTitle").textContent = "Новий клієнт";
        document.querySelector("#submitClientBtn").textContent = "Додати";
      } else {
        alert(data.message || "Помилка");
      }
  });

    // === НОВА КАТЕГОРІЯ: відкриття модалки ===
    document.querySelector(".category-new-btn").addEventListener("click", () => {
      document.getElementById("categoryModalTitle").textContent = "Нова категорія";
      document.getElementById("submitCategoryBtn").textContent = "Додати";
      document.querySelector("#categoryForm").reset();
      isEditMode = false;
      currentEditingId = null;
      document.getElementById("addCategoryModal").style.display = "flex";
    });

  // === Submit форми додавання/редагування категорії ===
  document.querySelector("#categoryForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const form = e.target;
    const formData = new FormData(form);
    const raw = {
      category_number: currentEditingId,
      category_name: formData.get("category_name"),
    };

    const method = isEditMode ? "PUT" : "POST";
    const url = `/dashboard-manager/category`;

    try {
      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(raw),
      });

      const data = await res.json();
      if (res.ok) {
        alert(data.message || (isEditMode ? "Категорію оновлено." : "Категорію додано."));
        form.reset();
        document.getElementById("addCategoryModal").style.display = "none";
        fetchCategories(); 
        isEditMode = false;
        currentEditingId = null;
        document.querySelector("#submitCategoryBtn").textContent = "Додати";
        document.querySelector("#categoryModalTitle").textContent = "Нова категорія";
      } else {
        alert(data.message || "Помилка");
      }
    } catch (err) {
      alert("Помилка при з'єднанні з сервером.");
      console.error(err);
    }
  });

  // === Закриття модалки: кнопка "Скасувати" ===
  document.getElementById("cancelAddCategory").addEventListener("click", () => {
    document.querySelector("#categoryForm").reset();
    document.getElementById("addCategoryModal").style.display = "none";
    isEditMode = false;
    currentEditingId = null;
  });

  // === Закриття модалки: хрестик ===
  document.getElementById("closeAddCategoryModal").addEventListener("click", () => {
    document.querySelector("#categoryForm").reset();
    document.getElementById("addCategoryModal").style.display = "none";
    isEditMode = false;
    currentEditingId = null;
  });

  // === Закриття модалки по кліку на overlay ===
  document.getElementById("addCategoryModal").addEventListener("click", (e) => {
    if (e.target.id === "addCategoryModal") {
      document.querySelector("#categoryForm").reset();
      document.getElementById("addCategoryModal").style.display = "none";
      isEditMode = false;
      currentEditingId = null;
    }
  });


  // === Закриття кнопкою або overlay ===
  document.getElementById("cancelAddClient").addEventListener("click", () => {
    document.querySelector("#addClientModal form").reset();
    document.getElementById("addClientModal").style.display = "none";
  });

  document.getElementById("closeAddClientModal").addEventListener("click", () => {
    document.querySelector("#addClientModal form").reset();
    document.getElementById("addClientModal").style.display = "none";
  });

  document.getElementById("addClientModal").addEventListener("click", (e) => {
    if (e.target.id === "addClientModal") {
      document.querySelector("#addClientModal form").reset();
      document.getElementById("addClientModal").style.display = "none";
    }
  });

  // Перемикач для фільтрації лише касирів
  cashierOnlyToggle.addEventListener("change", (e) => {
    fetchEmployees(e.target.checked);
  });

  // Пошук працівника по прізвищу
  searchBtn.addEventListener("click", async () => {
    const surname = searchInput.value.trim();
    if (!surname) return fetchEmployees();
    const res = await fetch(`/dashboard-manager/employees/by-surname/${surname}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    renderEmployeeTable(data);
  });

  // Обробка форми створення/редагування працівника
  document.querySelector("#addEmployeeModal form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const form = e.target;
    const formData = new FormData(form);
    const raw = Object.fromEntries(formData.entries());

    const body = {
      empl_surname: raw.surname,
      empl_name: raw.name,
      empl_patronymic: raw.patronymic,
      empl_role: raw.position,
      salary: raw.salary,
      date_of_birth: raw.birth_date,
      date_of_start: raw.start_date,
      phone_number: raw.phone,
      city: raw.city,
      street: raw.street,
      zip_code: raw.zipcode
    };

    // У режимі створення додається пароль, у редагуванні — ID
    if (!isEditMode) {
      body.empl_password = raw.empl_password || "default123";
    } else {
      body.display_id = currentEditingId;
    }

    // Запит на створення або оновлення
    const res = await fetch("/dashboard-manager/employees", {
      method: isEditMode ? "PUT" : "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(body),
    });

    if (res.ok) {
      alert(isEditMode ? "Працівника оновлено." : "Працівника додано.");
      form.reset();
      document.getElementById("addEmployeeModal").style.display = "none";
      fetchEmployees();
      // Скидання режиму
      isEditMode = false;
      currentEditingId = null;
      document.querySelector("#addEmployeeModal h2").textContent = "Новий працівник";
      document.querySelector("#addEmployeeModal .btn-filled").textContent = "Додати";
    } else {
      const err = await res.json();
      alert(err.message || "Помилка створення/редагування.");
    }
  });

  // Кнопка "Скасувати" очищає форму й закриває модалку
  document.getElementById("cancelAddEmployee").addEventListener("click", () => {
    const form = document.querySelector("#addEmployeeModal form");
    form.reset();
    document.getElementById("addEmployeeModal").style.display = "none";
    isEditMode = false;
    currentEditingId = null;
    document.querySelector("#addEmployeeModal h2").textContent = "Новий працівник";
    document.querySelector("#addEmployeeModal .btn-filled").textContent = "Додати";
  });

  // Закриття модалки (хрестик)
  document.getElementById("closeAddModal").addEventListener("click", () => {
    const form = document.querySelector("#addEmployeeModal form");
    form.reset();
    isEditMode = false;
    currentEditingId = null;
    document.querySelector("#addEmployeeModal h2").textContent = "Новий працівник";
    document.querySelector("#addEmployeeModal .btn-filled").textContent = "Додати";
    document.getElementById("addEmployeeModal").style.display = "none";
  });

  // Кнопка "Додати працівника" — ініціалізує модалку
  document.querySelector(".employee-new-btn").addEventListener("click", () => {
    const passwordInput = document.getElementById("passwordField");
    passwordInput.disabled = false;
    passwordInput.style.backgroundColor = "";
    passwordInput.style.cursor = "text";
    
    document.querySelector("#addEmployeeModal h2").textContent = "Новий працівник";
    document.querySelector("#addEmployeeModal .btn-filled").textContent = "Додати";
    isEditMode = false;
    currentEditingId = null;
    document.getElementById("addEmployeeModal").style.display = "flex";
  });

  // Закриття модалки по кліку на overlay — лише в режимі створення
  const addModal = document.getElementById("addEmployeeModal");
  addModal.addEventListener("click", (e) => {
    if (e.target === addModal && !isEditMode) {
      addModal.style.display = "none";
    }
  });

  // Модалка звіту
  const reportBtn = document.querySelector(".employee-report-btn");
  const reportModal = document.getElementById("reportModal");
  const closeReportBtn = document.getElementById("closeReportModal");
  const cancelReportBtn = document.getElementById("cancelReport");

  reportBtn.addEventListener("click", () => reportModal.style.display = "flex");
  closeReportBtn.addEventListener("click", () => reportModal.style.display = "none");
  cancelReportBtn.addEventListener("click", () => reportModal.style.display = "none");
  reportModal.addEventListener("click", e => {
    if (e.target === reportModal) reportModal.style.display = "none";
  });

  // Генерація звіту (PDF)
  document.getElementById("reportForm").addEventListener("submit", (e) => {
    e.preventDefault();
    const start_date = e.target.start_date.value;
    const end_date = e.target.end_date.value;
    const cashiersOnly = e.target.cashiersOnly.checked;
    window.open(
      `/dashboard-manager/employees-report?start=${start_date}&end=${end_date}&cashiersOnly=${cashiersOnly}`,
      "_blank"
    );
  });

  // Закриття модалки працівника
  const modal = document.getElementById("employeeModal");
  const closeBtn = document.getElementById("closeModal");
  closeBtn.addEventListener("click", () => modal.style.display = "none");
  modal.addEventListener("click", (e) => {
    if (e.target === modal) modal.style.display = "none";
  });

  // Перемикання між секціями панелі
  const links = document.querySelectorAll(".nav-link");
  const dashboardContent = document.getElementById("dashboard-content");
  links.forEach(link => {
    link.addEventListener("click", e => {
      e.preventDefault();
      links.forEach(l => l.classList.remove("active"));
      link.classList.add("active");

      const section = link.getAttribute("data-section");
      const allSections = dashboardContent.querySelectorAll("div[id]");
      allSections.forEach(div => div.style.display = "none");
      const activeSection = document.getElementById(section);
      if (activeSection) {
        activeSection.style.display = "block";
        if (section === "clients") {
          fetchClients();
        }
        if (section === "categories") {
        fetchCategories();
        }
        if (section === "products") {
        fetchProducts(); // завантаження всіх товарів
      }
      fetchCategories(); 
      }
    });
  });
});

function renderStoreProductTable() {
  const tbody = document.querySelector("#store-products .product-table tbody");
  const count = document.querySelector("#store-products .products-count");
  tbody.innerHTML = "";

  storeProducts.forEach(item => {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${item.upc}</td>
      <td>${item.product_name}</td>
      <td>${item.selling_price}</td>
      <td>${item.products_number}</td>
      <td>${item.promotional_product ? "Так" : "Ні"}</td>
    `;
    tbody.appendChild(row);
  });

  count.textContent = `Усього знайдено: ${storeProducts.length}`;
}

function sortTableData(field, direction) {
  storeProducts = [...storeProducts].sort((a, b) => {
    let aVal = a[field];
    let bVal = b[field];

    if (typeof aVal === 'string') aVal = aVal.toLowerCase();
    if (typeof bVal === 'string') bVal = bVal.toLowerCase();

    if (aVal < bVal) return direction === 'asc' ? -1 : 1;
    if (aVal > bVal) return direction === 'asc' ? 1 : -1;
    return 0;
  });

  renderStoreProductTable(); 
}

// ===================== ФУНКЦІЇ =====================

// Отримання списку працівників з API
async function fetchEmployees(cashiersOnly = false) {
  const token = localStorage.getItem("token");
  const url = cashiersOnly
    ? "/dashboard-manager/employees?role=CASHIER"
    : "/dashboard-manager/employees";
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();
  renderEmployeeTable(data);
}

// Клієнти — кнопки фільтра
document.querySelectorAll(".discount-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    btn.classList.toggle("active"); // вмикає або вимикає цю кнопку
    fetchClients(); // перезапускає фільтрацію
  });
});

// Отримання списку клієнтів із фільтрацією
async function fetchClients() {
  const token = localStorage.getItem("token");
  const selected = [];

  if (document.querySelector('.discount-btn[data-value="3"]')?.classList.contains('active')) selected.push(3);
  if (document.querySelector('.discount-btn[data-value="5"]')?.classList.contains('active')) selected.push(5);
  if (document.querySelector('.discount-btn[data-value="8"]')?.classList.contains('active')) selected.push(8);

  const query = selected.length > 0 ? `?percent=${selected.join(",")}` : "";

  try {
    const res = await fetch(`/dashboard-manager/customers${query}`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!res.ok) throw new Error("Помилка запиту");

    const data = await res.json();
    renderClientTable(data);
  } catch (err) {
    console.error("Помилка отримання клієнтів:", err.message);
    renderClientTable([]);
  }
}

// Пошук клієнта за номером
document.querySelector(".client-search-btn").addEventListener("click", async () => {
  const number = document.querySelector(".client-search").value.trim();
  if (!number) return fetchClients();
  const res = await fetch(`/dashboard-manager/customers/${number}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();
  if (res.ok) renderClientTable([data]);
  else alert(data.message || "Не знайдено");
});

// Вивід працівників у таблицю
function renderEmployeeTable(data) {
  const tbody = document.querySelector(".employee-table tbody");
  tbody.innerHTML = "";
  const currentUserId = JSON.parse(atob(localStorage.getItem("token").split(".")[1])).id;

  data.forEach((emp) => {
    const row = document.createElement("tr");
    if (emp.display_id === currentUserId) {
      row.classList.add("highlight");
    }
    row.innerHTML = `
      <td>${emp.display_id}</td>
      <td>${emp.empl_surname}</td>
      <td>${emp.empl_name}</td>
      <td>${emp.empl_role === "MANAGER" ? "Менеджер" : "Касир"}</td>
    `;
    row.addEventListener("click", () => openEmployeeModal(emp));
    tbody.appendChild(row);
  });

  document.querySelector(".employee-count").textContent = `Усього знайдено: ${data.length}`;
}

// Вивід клієнтів у таблицю
function renderClientTable(clients) {
  const tbody = document.querySelector(".client-table tbody");
  const count = document.querySelector(".clients-count");
  tbody.innerHTML = "";

  clients.forEach(client => {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${client.card_number || "***"}</td>
      <td>${client.cust_surname}</td>
      <td>${client.cust_name}</td>
      <td>${client.percent}</td>
    `;
    row.addEventListener("click", () => openClientModal(client));
    tbody.appendChild(row);
  });

  count.textContent = `Усього знайдено: ${clients.length}`;
}

// Відкриття модального вікна з деталями клієнта
function openClientModal(client) {
  const modal = document.getElementById("clientModal");
  const shortenedId = client.card_number?.split("-")[3] || "***";
  modal.querySelector("h2").innerHTML = `CARD ID: ${shortenedId}`;
  const list = modal.querySelector(".modal-list");
  list.innerHTML = `
    <li><strong>Ім'я:</strong> ${client.cust_name}</li>
    <li><strong>Прізвище:</strong> ${client.cust_surname}</li>
    <li><strong>По-батькові:</strong> ${client.cust_patronymic || "-"}</li>
    <li><strong>Номер телефону:</strong> ${client.phone_number}</li>
    <li><strong>Місто:</strong> ${client.city || "-"}</li>
    <li><strong>Вулиця:</strong> ${client.street || "-"}</li>
    <li><strong>Індекс:</strong> ${client.zip_code || "-"}</li>
    <li><strong>Знижка %:</strong> ${client.percent}</li>
  `;

  modal.style.display = "flex";
  currentClient = client;

  document.getElementById("deleteClient").onclick = () => deleteClient(client.card_number);
  document.getElementById("editClient").onclick = () => {
    const form = document.querySelector("#addClientModal form");
    document.querySelector("#clientModalTitle").textContent = `Редагування: ${shortenedId}`;
    document.querySelector("#submitClientBtn").textContent = "Готово";
    isEditMode = true;
    currentEditingId = client.card_number;

    form.card_number.value = client.card_number;
    form.cust_surname.value = client.cust_surname;
    form.cust_name.value = client.cust_name;
    form.cust_patronymic.value = client.cust_patronymic || "";
    form.phone_number.value = client.phone_number;
    form.city.value = client.city || "";
    form.street.value = client.street || "";
    form.zip_code.value = client.zip_code || "";
    form.percent.value = client.percent;

    modal.style.display = "none";
    document.getElementById("addClientModal").style.display = "flex";
  };
}

// Закриття модалки клієнта
document.getElementById("closeClientModal").addEventListener("click", () => {
  document.getElementById("clientModal").style.display = "none";
});
document.getElementById("clientModal").addEventListener("click", (e) => {
  if (e.target.id === "clientModal") {
    document.getElementById("clientModal").style.display = "none";
  }
});

// Закриття модалки категорії
document.getElementById("closeCategoryModal").addEventListener("click", () => {
  document.getElementById("categoryModal").style.display = "none";
});
document.getElementById("categoryModal").addEventListener("click", (e) => {
  if (e.target.id === "categoryModal") {
    document.getElementById("categoryModal").style.display = "none";
  }
});

// === Закриття модалки товару ===
document.getElementById("closeProductModal").addEventListener("click", () => {
  document.getElementById("productModal").style.display = "none";
});
document.getElementById("productModal").addEventListener("click", (e) => {
  if (e.target.id === "productModal") {
    document.getElementById("productModal").style.display = "none";
  }
});

// Видалення клієнта
async function deleteClient(card_number) {
  if (!confirm(`Ви дійсно хочете видалити клієнта ${card_number}?`)) return;
  const res = await fetch(`/dashboard-manager/customers/${card_number}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
  });

  if (res.ok) {
    alert("Клієнта видалено.");
    document.getElementById("clientModal").style.display = "none";
    fetchClients();
  } else {
    const err = await res.json();
    alert(err.message || "Помилка при видаленні клієнта.");
  }
}

// Відкриття модального вікна з деталями працівника
function openEmployeeModal(emp) {
  const modal = document.getElementById("employeeModal");
  modal.querySelector("h2").innerHTML = `ID: ${emp.display_id}`;
  const list = modal.querySelector(".modal-list");
  list.innerHTML = `
    <li><strong>Ім'я:</strong> ${emp.empl_name}</li>
    <li><strong>Прізвище:</strong> ${emp.empl_surname}</li>
    <li><strong>По-батькові:</strong> ${emp.empl_patronymic ?? "-"}</li>
    <li><strong>Посада:</strong> ${emp.empl_role === "MANAGER" ? "Менеджер" : "Касир"}</li>
    <li><strong>Зарплата:</strong> ${emp.salary}</li>
    <li><strong>Дата народження:</strong> ${formatDate(emp.date_of_birth)}</li>
    <li><strong>Початок роботи:</strong> ${formatDate(emp.date_of_start)}</li>
    <li><strong>Телефон:</strong> ${emp.phone_number}</li>
    <li><strong>Місто:</strong> ${emp.city}</li>
    <li><strong>Вулиця:</strong> ${emp.street}</li>
    <li><strong>Індекс:</strong> ${emp.zip_code}</li>
  `;

  // Забороняємо редагування пароля у режимі редагування
  const passwordInput = document.getElementById("passwordField");
  passwordInput.disabled = true;
  passwordInput.style.backgroundColor = "#e9ecef";
  passwordInput.style.cursor = "not-allowed";

  modal.style.display = "flex";
  currentEmployee = emp;

  // Кнопка видалити
  document.getElementById("deleteEmployee").onclick = () => deleteEmployee(emp.display_id);

  // Кнопка редагувати
  document.getElementById("editEmployee").onclick = () => {
    const form = document.querySelector("#addEmployeeModal form");
    document.querySelector("#addEmployeeModal h2").textContent = `Редагування: ${emp.display_id}`;
    document.querySelector("#addEmployeeModal .btn-filled").textContent = "Готово";
    isEditMode = true;
    currentEditingId = emp.display_id;

    // Заповнення форми
    form.surname.value = emp.empl_surname;
    form.name.value = emp.empl_name;
    form.patronymic.value = emp.empl_patronymic || "";
    form.position.value = emp.empl_role;
    form.salary.value = emp.salary;
    form.birth_date.value = emp.date_of_birth.slice(0, 10);
    form.start_date.value = emp.date_of_start.slice(0, 10);
    form.phone.value = emp.phone_number;
    form.city.value = emp.city;
    form.street.value = emp.street;
    form.zipcode.value = emp.zip_code;
    form.empl_password.value = "********"; // замінник

    modal.style.display = "none";
    document.getElementById("addEmployeeModal").style.display = "flex";
  };
}

function openCategoryModal(cat) {
  const modal = document.getElementById("categoryModal");
  modal.querySelector("#categoryModalTitle").textContent = `Номер: ${cat.category_number}`;
  modal.querySelector("#categoryName").textContent = cat.category_name;

  modal.style.display = "flex";
  currentEditingId = cat.category_number;

  document.getElementById("deleteCategoryBtn").onclick = () => deleteCategory(cat.category_number);
  document.getElementById("editCategoryBtn").onclick = () => {
    modal.style.display = "none";
    const form = document.querySelector("#categoryForm");
    document.getElementById("addCategoryModal").style.display = "flex";
    document.getElementById("categoryModalTitle").textContent = `Редагування: ${cat.category_number}`;
    document.getElementById("submitCategoryBtn").textContent = "Готово";
    form.category_name.value = cat.category_name;
    isEditMode = true;
    currentEditingId = cat.category_number;
  };
}

// Видалення працівника
async function deleteEmployee(id) {
  if (!confirm(`Ви дійсно хочете видалити працівника ${id}?`)) return;
  const res = await fetch(`/dashboard-manager/employees/${id}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
  });

  if (res.ok) {
    alert("Видалено.");
    document.getElementById("employeeModal").style.display = "none";
    fetchEmployees();
  } else {
    const err = await res.json();
    alert(err.message || "Помилка при видаленні.");
  }
}

async function fetchCategories() {
  const token = localStorage.getItem("token");
  const searchValue = document.querySelector(".category-search")?.value.trim() || "";

  const url = `/dashboard-manager/category${searchValue ? `?name=${encodeURIComponent(searchValue)}` : ""}`;

  try {
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    categories = data; // ← запам’ятовуємо список категорій
    renderCategoryTable(data);
  } catch (err) {
    console.error("Помилка завантаження категорій:", err.message);
    renderCategoryTable([]);
  }
}

function renderCategoryTable(data) {
  const tbody = document.querySelector("#categories .employee-table tbody");
  const count = document.querySelector("#categories .employee-count");
  tbody.innerHTML = "";

  data.forEach(cat => {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${cat.category_number}</td>
      <td>${cat.category_name}</td>
    `;
    row.addEventListener("click", () => openCategoryModal(cat));
    tbody.appendChild(row);
  });

  count.textContent = `Усього знайдено: ${data.length}`;
}

async function deleteCategory(id) {
  if (!confirm(`Ви дійсно хочете видалити категорію ${id}?`)) return;
  try {
    const res = await fetch(`/dashboard-manager/category/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
    });
    const data = await res.json();
    if (res.ok) {
      alert(data.message || "Категорію видалено.");
      document.getElementById("categoryModal").style.display = "none";
      fetchCategories();
    } else {
      alert(data.message || "Помилка при видаленні.");
    }
  } catch (err) {
    alert("Помилка з'єднання з сервером.");
    console.error(err);
  }
}

// ===================== ТОВАРИ =====================

document.getElementById("productForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const form = e.target;
  const formData = new FormData(form);

  const raw = {
    id_product: currentEditingId,
    product_name: formData.get("product_name"),
    category_number: formData.get("category_number"),
    characteristics: formData.get("characteristics"),
  };

  const method = isEditMode ? "PUT" : "POST";

  try {
    const res = await fetch("/dashboard-manager/products", {
      method,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(raw),
    });

    const data = await res.json();
    if (res.ok) {
      alert(data.message || "Успішно");
      fetchProducts();
      document.getElementById("addProductModal").style.display = "none";
    } else {
      alert(data.message || "Помилка");
    }
  } catch (err) {
    alert("Помилка з'єднання з сервером");
  }
});

// Отримати список товарів із фільтрацією
async function fetchProducts() {
  const token = localStorage.getItem("token"); // ← завжди отримуємо заново
  const name = document.querySelector(".product-search").value.trim();
  const category = document.querySelector(".product-category-filter").value.trim();

  let query = [];
  if (name) query.push(`name=${encodeURIComponent(name)}`);
  if (category) {
    if (!isNaN(category)) {
      query.push(`number=${category}`);
    } else {
      query.push(`category=${encodeURIComponent(category)}`);
    }
  }

  const url = `/dashboard-manager/products${query.length > 0 ? `?${query.join("&")}` : ""}`;

  try {
    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`, // ← Ось це треба!
      },
    });

    const data = await res.json();
    renderProductTable(data);
  } catch (err) {
    console.error("Помилка завантаження товарів:", err);
    renderProductTable([]); // Порожній рендер на випадок фейлу
  }
}

// Вивід товарів у таблицю
function renderProductTable(data) {
  const tbody = document.querySelector(".product-table tbody");
  const count = document.querySelector(".products-count");
  tbody.innerHTML = "";

  data.forEach(prod => {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${prod.id_product}</td>
      <td>${prod.category_number}</td>
      <td>${prod.product_name}</td>
    `;
    row.addEventListener("click", () => openProductModal(prod));
    tbody.appendChild(row);
  });

  count.textContent = `Усього знайдено: ${data.length}`;
}

document.getElementById("cancelAddProduct").addEventListener("click", () => {
  document.getElementById("productForm").reset();
  document.getElementById("addProductModal").style.display = "none";
});

document.getElementById("closeAddProductModal").addEventListener("click", () => {
  document.getElementById("productForm").reset();
  document.getElementById("addProductModal").style.display = "none";
});

// === ВІДКРИТТЯ МОДАЛКИ З ІНФОРМАЦІЄЮ ПРО ТОВАР ===
function openProductModal(prod) {
  const modal = document.getElementById("productModal");
  modal.querySelector("#productModalTitle").textContent = `ID: ${prod.id_product}`;

  // Пошук назви категорії за номером
  const cat = categories.find(c => c.category_number === prod.category_number);
  const categoryName = cat ? cat.category_name : "(невідомо)";

  const list = modal.querySelector("#productDetailsList");
  list.innerHTML = `
    <li><strong>Назва:</strong> ${prod.product_name}</li>
    <li><strong>Категорія:</strong> ${categoryName}</li>
    <li><strong>Номер категорії:</strong> ${prod.category_number}</li>
    <li><strong>Опис:</strong> <span class="modal-description">${prod.characteristics || "-"}</span></li>
  `;

  modal.style.display = "flex";

  document.getElementById("deleteProductBtn").onclick = () => deleteProduct(prod.id_product);
  document.getElementById("editProductBtn").onclick = () => {
    isEditMode = true;
    currentEditingId = prod.id_product;

    const form = document.querySelector("#productForm");
    form.product_name.value = prod.product_name;
    form.category_number.value = prod.category_number;
    form.characteristics.value = prod.characteristics || "";

    document.getElementById("addProductModalTitle").textContent = `Редагування товару: ${prod.id_product}`;
    document.getElementById("submitProductBtn").textContent = "Готово";

    document.getElementById("productModal").style.display = "none";
    populateCategorySelect().then(() => {
    form.category_number.value = prod.category_number;
  });
    document.getElementById("addProductModal").style.display = "flex";
  };
}

// === ЗАКРИТТЯ модалки товару ===
document.getElementById("closeProductModal").addEventListener("click", () => {
  document.getElementById("productModal").style.display = "none";
});
document.getElementById("productModal").addEventListener("click", (e) => {
  if (e.target.id === "productModal") {
    document.getElementById("productModal").style.display = "none";
  }
});

// === ВИДАЛЕННЯ ТОВАРУ ===
async function deleteProduct(id_product) {
  if (!confirm(`Ви дійсно хочете видалити товар ${id_product}?`)) return;
  try {
    const res = await fetch(`/dashboard-manager/products/${id_product}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
    });
    const data = await res.json();
    if (res.ok) {
      alert(data.message || "Товар видалено.");
      document.getElementById("productModal").style.display = "none";
      fetchProducts(); // оновлення таблиці
    } else {
      alert(data.message || "Помилка при видаленні.");
    }
  } catch (err) {
    alert("Помилка з'єднання з сервером.");
    console.error(err);
  }
}

async function populateCategorySelect() {
  const select = document.querySelector('#addProductModal select[name="category_number"]');
  select.innerHTML = ''; // очищення перед новим завантаженням

  try {
    const res = await fetch("/dashboard-manager/category", {
      headers: {
        Authorization: `Bearer ${localStorage.getItem("token")}`
      }
    });

    if (!res.ok) throw new Error("Помилка отримання категорій");

    const categories = await res.json();

    categories.forEach(cat => {
      const option = document.createElement("option");
      option.value = cat.category_number;
      option.textContent = cat.category_name;
      select.appendChild(option);
    });
  } catch (err) {
    console.error("Помилка завантаження категорій у select:", err.message);
    const option = document.createElement("option");
    option.value = '';
    option.textContent = 'Категорії не завантажено';
    option.disabled = true;
    select.appendChild(option);
  }
}