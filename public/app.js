const form = document.getElementById("lead-form");
const message = document.getElementById("message");
const leadsBody = document.getElementById("leads-body");
const submitButton = document.getElementById("submit-button");
const cancelEditButton = document.getElementById("cancel-edit-button");
const leadSearch = document.getElementById("lead-search");
const statusFilter = document.getElementById("status-filter");
const visibleCount = document.getElementById("visible-count");
let currentLeads = [];
let editingLeadId = null;

function escapeHtml(value) {
  const htmlChars = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  };

  return String(value ?? "").replace(/[&<>"']/g, (char) => htmlChars[char]);
}

function normalizeStatus(status) {
  if (!status) return "";
  return String(status).trim().toLowerCase();
}

function statusMeta(status) {
  const normalizedStatus = normalizeStatus(status);
  const statuses = {
    nuevo: { label: "Nuevo", className: "status-nuevo" },
    contactado: { label: "Contactado", className: "status-contactado" },
    perdido: { label: "Perdido", className: "status-perdido" }
  };

  return statuses[normalizedStatus] || { label: "Sin estado", className: "status-default" };
}

async function loadLeads() {
  try {
    const response = await fetch("/leads");
    const result = await response.json();

    if (!response.ok) {
      throw new Error("No se pudieron cargar los leads.");
    }

    currentLeads = result.data;
    renderFilteredLeads();
  } catch (error) {
    message.textContent = error.message;
  }
}

function getFilteredLeads() {
  const searchTerm = leadSearch.value.trim().toLowerCase();
  const selectedStatus = statusFilter.value;

  return currentLeads.filter((lead) => {
    const matchesSearch =
      !searchTerm ||
      String(lead.name || "").toLowerCase().includes(searchTerm) ||
      String(lead.email || "").toLowerCase().includes(searchTerm);
    const matchesStatus = selectedStatus === "todos" || normalizeStatus(lead.status) === selectedStatus;

    return matchesSearch && matchesStatus;
  });
}

function renderFilteredLeads() {
  const filteredLeads = getFilteredLeads();
  renderLeads(filteredLeads);
}

function renderLeads(leads) {
  visibleCount.textContent = `${leads.length} ${leads.length === 1 ? "lead visible" : "leads visibles"}`;

  if (!leads.length) {
    const emptyMessage = currentLeads.length ? "No hay leads que coincidan con los filtros." : "Todavia no hay leads.";

    leadsBody.innerHTML = `
      <tr>
        <td colspan="6">${emptyMessage}</td>
      </tr>
    `;
    return;
  }

  leadsBody.innerHTML = leads
    .map((lead) => {
      const { label, className } = statusMeta(lead.status);
      const isEditing = lead.id === editingLeadId;

      return `
      <tr class="${isEditing ? "editing-row" : ""}">
        <td>${lead.id}</td>
        <td>${escapeHtml(lead.name)}</td>
        <td>${escapeHtml(lead.email)}</td>
        <td>${escapeHtml(lead.source || "-")}</td>
        <td><span class="status-tag ${className}">${label}</span></td>
        <td class="row-actions">
          <button class="table-btn edit-lead-btn" data-id="${lead.id}" type="button">${isEditing ? "Editando" : "Editar"}</button>
          <button class="table-btn table-btn-danger delete-lead-btn" data-id="${lead.id}" type="button">Eliminar</button>
        </td>
      </tr>
    `;
    })
    .join("");
}

function fillFormForEdit(lead) {
  form.elements.name.value = lead.name || "";
  form.elements.email.value = lead.email || "";
  form.elements.source.value = lead.source || "";
  form.elements.status.value = normalizeStatus(lead.status) || "nuevo";
  editingLeadId = lead.id;
  submitButton.textContent = "Guardar cambios";
  cancelEditButton.hidden = false;
  message.textContent = `Editando lead #${lead.id}.`;
  renderFilteredLeads();
  form.elements.name.focus();
}

function resetFormMode() {
  editingLeadId = null;
  form.reset();
  submitButton.textContent = "Guardar lead";
  cancelEditButton.hidden = true;
  renderFilteredLeads();
}

async function updateLead(leadId, payload) {
  const response = await fetch(`/leads/${encodeURIComponent(leadId)}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.error || "No se pudo actualizar el lead.");
  }

  return result;
}

async function createLead(payload) {
  const response = await fetch("/leads", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.error || "No se pudo guardar el lead.");
  }

  return result;
}

async function deleteLead(leadId) {
  try {
    const response = await fetch(`/leads/${encodeURIComponent(leadId)}`, {
      method: "DELETE"
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || "No se pudo eliminar el lead.");
    }

    if (editingLeadId === leadId) {
      resetFormMode();
    }

    message.textContent = "Lead eliminado correctamente.";
    await loadLeads();
  } catch (error) {
    message.textContent = "No se pudo eliminar el lead. Recarga la pagina e intentalo de nuevo.";
  }
}

leadsBody.addEventListener("click", async (event) => {
  const button = event.target.closest("button[data-id]");

  if (!button) {
    return;
  }

  const leadId = Number(button.dataset.id);

  if (button.classList.contains("edit-lead-btn")) {
    const lead = currentLeads.find((item) => item.id === leadId);

    if (!lead) {
      message.textContent = "Lead no encontrado.";
      return;
    }

    fillFormForEdit(lead);
    return;
  }

  if (button.classList.contains("delete-lead-btn")) {
    await deleteLead(leadId);
    return;
  }
});

cancelEditButton.addEventListener("click", () => {
  resetFormMode();
  message.textContent = "Edicion cancelada.";
});

leadSearch.addEventListener("input", renderFilteredLeads);
statusFilter.addEventListener("change", renderFilteredLeads);

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  const formData = new FormData(form);
  const payload = {
    name: formData.get("name"),
    email: formData.get("email"),
    source: formData.get("source"),
    status: formData.get("status")
  };

  try {
    if (editingLeadId) {
      await updateLead(editingLeadId, payload);
      message.textContent = "Lead actualizado correctamente.";
    } else {
      await createLead(payload);
      message.textContent = "Lead guardado correctamente.";
    }

    resetFormMode();
    await loadLeads();
  } catch (error) {
    message.textContent = error.message;
  }
});

loadLeads();
