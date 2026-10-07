document.addEventListener("DOMContentLoaded", () => {
  const confirmDialog = document.getElementById("confirm-dialog");
  if (confirmDialog) {
    const confirmTitle = document.getElementById("confirm-title");
    const confirmMessage = document.getElementById("confirm-message");
    const confirmAccept = confirmDialog.querySelector("[data-confirm-accept]");
    let pendingForm = null;
    let pendingSubmitter = null;

    document.addEventListener("submit", (event) => {
      const form = event.target;
      const submitter = event.submitter;
      if (!(form instanceof HTMLFormElement)) return;
      if (form.dataset.confirmed === "true") {
        delete form.dataset.confirmed;
        return;
      }

      const message = form.dataset.confirmMessage || submitter?.dataset.confirmMessage;
      if (!message) return;

      event.preventDefault();
      if (typeof confirmDialog.showModal !== "function") {
        if (window.confirm(message)) {
          form.dataset.confirmed = "true";
          form.requestSubmit(submitter);
        }
        return;
      }

      pendingForm = form;
      pendingSubmitter = submitter;
      confirmTitle.textContent = form.dataset.confirmTitle || submitter?.dataset.confirmTitle || "Please confirm";
      confirmMessage.textContent = message;
      confirmAccept.textContent = form.dataset.confirmAction || submitter?.dataset.confirmAction || "Confirm";
      const isDanger = (form.dataset.confirmVariant || submitter?.dataset.confirmVariant) === "danger";
      confirmAccept.classList.toggle("danger", isDanger);
      confirmDialog.classList.toggle("is-danger", isDanger);
      confirmDialog.showModal();
    }, true);

    confirmDialog.querySelector("[data-confirm-cancel]").addEventListener("click", () => confirmDialog.close());
    confirmAccept.addEventListener("click", () => {
      if (!pendingForm) return;
      const form = pendingForm;
      const submitter = pendingSubmitter;
      pendingForm = null;
      pendingSubmitter = null;
      form.dataset.confirmed = "true";
      confirmDialog.close();
      form.requestSubmit(submitter);
    });
    confirmDialog.addEventListener("close", () => {
      pendingForm = null;
      pendingSubmitter = null;
    });
  }

  document.querySelectorAll("[data-line-form]").forEach((form) => {
    const lines = form.querySelector("[data-lines]");
    const add = form.querySelector(".add-line");
    if (!lines || !add) return;
    add.addEventListener("click", () => {
      const row = lines.querySelector(".line-row").cloneNode(true);
      row.querySelectorAll("input").forEach((input) => { input.value = ""; });
      row.querySelectorAll("select").forEach((select) => { select.selectedIndex = 0; });
      lines.appendChild(row);
    });
    lines.addEventListener("click", (event) => {
      if (event.target.closest(".remove-line")) {
        const rows = lines.querySelectorAll(".line-row");
        if (rows.length > 1) event.target.closest(".line-row").remove();
      }
    });
    lines.addEventListener("change", (event) => {
      if (event.target.matches(".item-product")) {
        const option = event.target.selectedOptions[0];
        const cost = event.target.closest("tr").querySelector(".item-cost");
        if (cost && option.dataset.cost) cost.value = option.dataset.cost;
      }
    });
  });

  const form = document.getElementById("checkout-form");
  if (!form) return;
  const cart = new Map();
  const body = document.getElementById("cart-lines");
  const discountInput = document.getElementById("discount");
  const tenderedInput = document.getElementById("tendered");
  const paymentSelect = document.getElementById("payment-method");

  function money(value) {
    return new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" }).format(value);
  }
  function totals() {
    let subtotal = 0;
    cart.forEach((item) => { subtotal += item.quantity * item.price; });
    const discount = Math.max(0, Number(discountInput.value) || 0);
    const total = Math.max(0, subtotal - discount);
    if (paymentSelect.selectedOptions[0]?.dataset.kind !== "CASH" && tenderedInput.dataset.userChanged !== "true") {
      tenderedInput.value = total.toFixed(2);
    }
    const tendered = Number(tenderedInput.value) || 0;
    document.getElementById("subtotal").textContent = money(subtotal);
    document.getElementById("discount-view").textContent = money(discount);
    document.getElementById("total").textContent = money(total);
    document.getElementById("change").textContent = money(Math.max(0, tendered - total));
    document.getElementById("cart-json").value = JSON.stringify([...cart.values()].map(({id, quantity}) => ({id, quantity})));
    return {subtotal, discount, total};
  }
  function renderCart() {
    body.replaceChildren();
    if (!cart.size) {
      const row = document.createElement("tr");
      const cell = document.createElement("td");
      cell.colSpan = 5;
      cell.className = "empty-state";
      cell.textContent = "Select products to start a sale.";
      row.appendChild(cell);
      body.appendChild(row);
    } else {
      cart.forEach((item, id) => {
        const row = document.createElement("tr");
        const name = document.createElement("td");
        name.textContent = item.name;
        const quantityCell = document.createElement("td");
        const quantity = document.createElement("input");
        quantity.type = "number";
        quantity.min = "0.001";
        quantity.step = "0.001";
        quantity.value = item.quantity;
        quantity.className = "input";
        quantity.addEventListener("change", () => {
          const next = Number(quantity.value);
          if (!Number.isFinite(next) || next <= 0 || next > item.stock) {
            quantity.value = item.quantity;
            return;
          }
          item.quantity = next;
          totals();
          renderCart();
        });
        quantityCell.appendChild(quantity);
        const price = document.createElement("td");
        price.className = "numeric";
        price.textContent = money(item.price);
        const lineTotal = document.createElement("td");
        lineTotal.className = "numeric";
        lineTotal.textContent = money(item.price * item.quantity);
        const action = document.createElement("td");
        const remove = document.createElement("button");
        remove.type = "button";
        remove.className = "cart-remove";
        remove.textContent = "×";
        remove.setAttribute("aria-label", "Remove " + item.name);
        remove.addEventListener("click", () => { cart.delete(id); totals(); renderCart(); });
        action.appendChild(remove);
        row.append(name, quantityCell, price, lineTotal, action);
        body.appendChild(row);
      });
    }
    totals();
  }
  document.querySelectorAll(".add-to-cart").forEach((button) => button.addEventListener("click", () => {
    const id = Number(button.dataset.id);
    const item = cart.get(id) || {id, name: button.dataset.name, price: Number(button.dataset.price), stock: Number(button.dataset.stock), quantity: 0};
    if (item.quantity >= item.stock) return;
    item.quantity += 1;
    cart.set(id, item);
    renderCart();
  }));
  document.getElementById("clear-cart").addEventListener("click", () => { cart.clear(); renderCart(); });
  discountInput.addEventListener("input", totals);
  tenderedInput.addEventListener("input", () => { tenderedInput.dataset.userChanged = "true"; totals(); });
  paymentSelect.addEventListener("change", () => { tenderedInput.dataset.userChanged = "false"; totals(); });
  form.addEventListener("submit", (event) => {
    const {subtotal, discount, total} = totals();
    if (!cart.size || discount > subtotal || Number(tenderedInput.value) < total) {
      event.preventDefault();
      window.alert("Check that the cart has items, the discount is valid, and the tender covers the total.");
    }
  });
});
