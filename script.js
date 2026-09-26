const STORAGE_KEY = "expenses";
const YOLO_MODE_KEY = "yolo-mode";

const form = document.getElementById("expense-form");
const titleInput = document.getElementById("title");
const amountInput = document.getElementById("amount");
const categoryInput = document.getElementById("category");
const submitBtn = document.getElementById("submit-btn");
const cancelBtn = document.getElementById("cancel-btn");
const formHeading = document.getElementById("form-heading");
const formError = document.getElementById("form-error");
const storageStatus = document.getElementById("storage-status");
const expenseList = document.getElementById("expense-list");
const totalAmount = document.getElementById("total-amount");
const searchTitle = document.getElementById("search-title");
const filterCategory = document.getElementById("filter-category");
const clearAllBtn = document.getElementById("clear-all-btn");
const yoloToggle = document.getElementById("yolo-toggle");

let expenses = [];
let editingId = null;
let idCounter = 0;
const validCategories = new Set(["Food", "Transport", "Bills", "Entertainment", "Shopping", "Other"]);

function createId() {
  if (window.crypto && typeof window.crypto.randomUUID === "function") {
    return window.crypto.randomUUID();
  }
  idCounter += 1;
  return `${Date.now()}-${idCounter}`;
}

function formatCurrency(value) {
  return `$${Number(value).toFixed(2)}`;
}

function loadExpenses() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    const parsed = stored ? JSON.parse(stored) : [];
    expenses = normalizeExpenses(parsed);
  } catch (error) {
    console.error("Unable to load saved expenses.", error);
    expenses = [];
    showStorageError("Saved expenses could not be loaded. You can continue using the app for this session.");
  }
}

function normalizeExpenses(values) {
  if (!Array.isArray(values)) {
    return [];
  }

  const ids = new Set();
  return values
    .map(normalizeExpense)
    .filter((expense) => {
      if (!expense || ids.has(expense.id)) {
        return false;
      }
      ids.add(expense.id);
      return true;
    });
}

function saveExpenses() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(expenses));
    storageStatus.hidden = true;
    storageStatus.textContent = "";
    return true;
  } catch (error) {
    console.error("Unable to save expenses.", error);
    showStorageError("Your change could not be saved. Please check browser storage and try again.");
    return false;
  }
}

function normalizeExpense(value) {
  if (!value || typeof value !== "object") {
    return null;
  }

  const title = typeof value.title === "string" ? value.title.trim() : "";
  const amount = Number(value.amount);
  const category = typeof value.category === "string" ? value.category : "";
  const id = typeof value.id === "string" && value.id ? value.id : createId();

  if (!title || !Number.isFinite(amount) || amount <= 0 || !validCategories.has(category)) {
    return null;
  }

  return { id, title, amount, category };
}

function updateTotal() {
  const total = expenses.reduce((sum, expense) => sum + Number(expense.amount), 0);
  totalAmount.textContent = formatCurrency(total);
  clearAllBtn.disabled = expenses.length === 0;
}

function resetForm() {
  form.reset();
  editingId = null;
  submitBtn.textContent = "Add Expense";
  formHeading.textContent = "Add Expense";
  cancelBtn.hidden = true;
  formError.hidden = true;
  formError.textContent = "";
  categoryInput.selectedIndex = 0;
}

function showError(message) {
  formError.hidden = false;
  formError.textContent = message;
}

function showStorageError(message) {
  storageStatus.hidden = false;
  storageStatus.textContent = message;
}

function setYoloMode(enabled) {
  document.body.classList.toggle("yolo-mode", enabled);
  yoloToggle.setAttribute("aria-pressed", String(enabled));
  yoloToggle.textContent = `YOLO Mode: ${enabled ? "On" : "Off"}`;
}

function loadYoloMode() {
  try {
    setYoloMode(localStorage.getItem(YOLO_MODE_KEY) === "true");
  } catch (error) {
    console.error("Unable to load YOLO mode preference.", error);
    setYoloMode(false);
    showStorageError("YOLO mode preference could not be loaded. You can still change it for this session.");
  }
}

function toggleYoloMode() {
  const enabled = !document.body.classList.contains("yolo-mode");
  setYoloMode(enabled);

  try {
    localStorage.setItem(YOLO_MODE_KEY, String(enabled));
  } catch (error) {
    console.error("Unable to save YOLO mode preference.", error);
    showStorageError("YOLO mode changed for this session, but your preference could not be saved.");
  }
}

function getExpenseById(id) {
  return expenses.find((expense) => expense.id === id);
}

function getFilteredExpenses() {
  const query = searchTitle.value.trim().toLowerCase();
  const category = filterCategory.value;

  return expenses.filter((expense) => {
    const matchesTitle = expense.title.toLowerCase().includes(query);
    const matchesCategory = category === "" || expense.category === category;
    return matchesTitle && matchesCategory;
  });
}

function renderExpenses() {
  expenseList.innerHTML = "";
  const visibleExpenses = getFilteredExpenses();

  if (expenses.length === 0) {
    const row = document.createElement("tr");
    row.innerHTML = `<td class="empty-state" colspan="4">No expenses yet</td>`;
    expenseList.appendChild(row);
    return;
  }

  if (visibleExpenses.length === 0) {
    const row = document.createElement("tr");
    row.innerHTML = `<td class="empty-state" colspan="4">No expenses match your search</td>`;
    expenseList.appendChild(row);
    return;
  }

  visibleExpenses.forEach((expense) => {
    const row = document.createElement("tr");
    if (editingId === expense.id) {
      row.classList.add("editing");
    }

    row.innerHTML = `
      <td data-label="Title">${escapeHtml(expense.title)}</td>
      <td data-label="Amount" class="amount-cell">${formatCurrency(expense.amount)}</td>
      <td data-label="Category">${escapeHtml(expense.category)}</td>
      <td data-label="Actions">
        <div class="actions">
          <button type="button" class="icon-btn edit-btn" data-action="edit" data-id="${escapeHtml(expense.id)}" aria-label="Edit ${escapeHtml(expense.title)}">
            <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M4 20h4l10.5-10.5a2.1 2.1 0 0 0-3-3L5 17v3z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
            </svg>
            Edit
          </button>
          <button type="button" class="icon-btn delete-btn" data-action="delete" data-id="${escapeHtml(expense.id)}" aria-label="Delete ${escapeHtml(expense.title)}">
            <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M5 7h14M10 11v6M14 11v6M9 7l1-2h4l1 2M8 7l1 13h6l1-13" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
            Delete
          </button>
        </div>
      </td>
    `;
    expenseList.appendChild(row);
  });
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function startEdit(id) {
  const expense = getExpenseById(id);
  if (!expense) {
    return;
  }

  editingId = id;
  titleInput.value = expense.title;
  amountInput.value = expense.amount;
  categoryInput.value = expense.category;
  submitBtn.textContent = "Update Expense";
  formHeading.textContent = "Edit Expense";
  cancelBtn.hidden = false;
  formError.hidden = true;
  titleInput.focus();
  renderExpenses();
}

function deleteExpense(id) {
  const expense = getExpenseById(id);
  if (!expense) {
    return;
  }

  const confirmed = window.confirm(`Delete "${expense.title}"?`);
  if (!confirmed) {
    return;
  }

  const previousExpenses = expenses;
  expenses = expenses.filter((item) => item.id !== id);
  if (!saveExpenses()) {
    expenses = previousExpenses;
    renderExpenses();
    updateTotal();
    return;
  }

  if (editingId === id) {
    resetForm();
  }
  renderExpenses();
  updateTotal();
}

function clearAllExpenses() {
  if (expenses.length === 0) {
    return;
  }

  const confirmed = window.confirm("Clear all expenses? This action cannot be undone.");
  if (!confirmed) {
    return;
  }

  const previousExpenses = expenses;
  expenses = [];
  if (!saveExpenses()) {
    expenses = previousExpenses;
    renderExpenses();
    updateTotal();
    return;
  }

  if (editingId !== null) {
    resetForm();
  }
  renderExpenses();
  updateTotal();
}

function getFormValues() {
  const title = titleInput.value.trim();
  const amount = Number(amountInput.value);
  const category = categoryInput.value;

  if (!title) {
    showError("Please enter an expense title.");
    return null;
  }

  if (!Number.isFinite(amount) || amount <= 0) {
    showError("Please enter an amount greater than 0.");
    return null;
  }

  if (!category) {
    showError("Please select a category.");
    return null;
  }

  return { title, amount, category };
}

form.addEventListener("submit", (event) => {
  event.preventDefault();
  const values = getFormValues();
  if (!values) {
    return;
  }

  const previousExpenses = expenses;
  if (editingId === null) {
    expenses.push({
      id: createId(),
      title: values.title,
      amount: values.amount,
      category: values.category,
    });
  } else {
    expenses = expenses.map((expense) =>
      expense.id === editingId
        ? {
            ...expense,
            title: values.title,
            amount: values.amount,
            category: values.category,
          }
        : expense
    );
  }

  if (!saveExpenses()) {
    expenses = previousExpenses;
    renderExpenses();
    updateTotal();
    return;
  }

  resetForm();
  renderExpenses();
  updateTotal();
});

cancelBtn.addEventListener("click", () => {
  resetForm();
  renderExpenses();
});

searchTitle.addEventListener("input", renderExpenses);
filterCategory.addEventListener("change", renderExpenses);
clearAllBtn.addEventListener("click", clearAllExpenses);
yoloToggle.addEventListener("click", toggleYoloMode);

expenseList.addEventListener("click", (event) => {
  const button = event.target instanceof Element
    ? event.target.closest("button[data-action]")
    : null;
  if (!button) {
    return;
  }

  const { action, id } = button.dataset;
  if (action === "edit") {
    startEdit(id);
  } else if (action === "delete") {
    deleteExpense(id);
  }
});

document.addEventListener("DOMContentLoaded", () => {
  loadYoloMode();
  loadExpenses();
  renderExpenses();
  updateTotal();
});
