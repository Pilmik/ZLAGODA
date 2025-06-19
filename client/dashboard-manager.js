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

// ===================== DOMContentLoaded =====================

document.addEventListener("DOMContentLoaded", () => {
  // Перевірка JWT-токена та ролі
  const token = localStorage.getItem("token");
  if (!token) return (window.location.href = "/");
  const payload = JSON.parse(atob(token.split(".")[1]));
  if (payload.roles !== "MANAGER") {
    alert("Доступ не надано.");
    return (window.location.href = "/");
  }

  // DOM-посилання
  const cashierOnlyToggle = document.getElementById("cashierOnlyToggle");
  const searchBtn = document.querySelector(".employee-search-btn");
  const searchInput = document.querySelector(".employee-search");

  // Першочергове завантаження працівників
  fetchEmployees();

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
      if (activeSection) activeSection.style.display = "block";
    });
  });
});

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
