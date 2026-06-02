const path = require("path");
const express = require("express");
const { getAllLeads, createLead, updateLead, deleteLead } = require("./data/leadsStore");

const app = express();
const publicDir = path.join(__dirname, "..", "public");
const isDevelopment = process.env.NODE_ENV !== "production";
const csvFields = ["name", "email", "source", "status", "created_at"];

function escapeCsvValue(value) {
  const stringValue = String(value ?? "");

  if (/[",\n\r]/.test(stringValue)) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }

  return stringValue;
}

function buildLeadsCsv(leads) {
  const rows = leads.map((lead) =>
    [
      lead.name,
      lead.email,
      lead.source,
      lead.status,
      lead.createdAt
    ]
      .map(escapeCsvValue)
      .join(",")
  );

  return [csvFields.join(","), ...rows].join("\n");
}

// Permite que Express lea cuerpos JSON enviados por el frontend.
app.use(express.json());

// En desarrollo desactivamos cache para ver cambios del frontend sin recargar de mas.
if (isDevelopment) {
  app.use((req, res, next) => {
    res.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
    res.set("Pragma", "no-cache");
    res.set("Expires", "0");
    next();
  });
}

// Sirve los archivos estaticos de la interfaz sin cambiar nada del frontend.
app.use(
  express.static(publicDir, {
    etag: !isDevelopment,
    lastModified: !isDevelopment,
    maxAge: isDevelopment ? 0 : "1h"
  })
);

// Entrega la pantalla principal del mini CRM.
app.get("/", (req, res) => {
  res.type("html");
  res.sendFile(path.join(publicDir, "index.html"));
});

// Endpoint sencillo para comprobar que la API esta viva.
app.get("/status", (req, res) => {
  res.type("text/plain");
  res.status(200).send("La API del mini CRM esta funcionando.");
});

// Lee todos los leads desde SQLite y conserva el formato que consume el frontend.
app.get("/leads", (req, res) => {
  const leads = getAllLeads();

  res.status(200).json({
    total: leads.length,
    data: leads
  });
});

// Exporta todos los leads en CSV para descargar desde el frontend.
app.get("/leads/export.csv", (req, res) => {
  const leads = getAllLeads();
  const csv = buildLeadsCsv(leads);

  res.set({
    "Content-Type": "text/csv; charset=utf-8",
    "Content-Disposition": 'attachment; filename="leads.csv"'
  });
  res.status(200).send(csv);
});

// Crea un lead nuevo en SQLite a partir de los campos enviados por el formulario.
app.post("/leads", (req, res) => {
  const { name, email, source, status } = req.body;
  const normalizedName = typeof name === "string" ? name.trim() : "";
  const normalizedEmail = typeof email === "string" ? email.trim() : "";

  if (!normalizedName || !normalizedEmail) {
    return res.status(400).json({
      error: "Los campos name y email son obligatorios."
    });
  }

  const newLead = createLead({ name: normalizedName, email: normalizedEmail, source, status });

  return res.status(201).json({
    message: "Lead creado correctamente.",
    data: newLead
  });
});

// Edita un lead existente en SQLite usando el ID de la URL.
app.patch("/leads/:id", (req, res) => {
  const leadId = Number(req.params.id);

  if (!Number.isInteger(leadId) || leadId <= 0) {
    return res.status(400).json({
      error: "El ID del lead no es valido."
    });
  }

  const allowedFields = ["name", "email", "source", "status"];
  const updates = {};

  // Solo copiamos campos permitidos para evitar actualizar columnas inesperadas.
  for (const field of allowedFields) {
    if (Object.prototype.hasOwnProperty.call(req.body, field)) {
      updates[field] = req.body[field];
    }
  }

  if (!Object.keys(updates).length) {
    return res.status(400).json({
      error: "No se recibieron campos para actualizar."
    });
  }

  if (Object.prototype.hasOwnProperty.call(updates, "name")) {
    // Name se guarda limpio y nunca puede quedar vacio.
    updates.name = typeof updates.name === "string" ? updates.name.trim() : "";

    if (!updates.name) {
      return res.status(400).json({
        error: "El campo name no puede estar vacio."
      });
    }
  }

  if (Object.prototype.hasOwnProperty.call(updates, "email")) {
    // Email se guarda limpio y nunca puede quedar vacio.
    updates.email = typeof updates.email === "string" ? updates.email.trim() : "";

    if (!updates.email) {
      return res.status(400).json({
        error: "El campo email no puede estar vacio."
      });
    }
  }

  const updatedLead = updateLead(leadId, updates);

  if (!updatedLead) {
    return res.status(404).json({
      error: "Lead no encontrado."
    });
  }

  return res.status(200).json({
    message: "Lead actualizado correctamente.",
    data: updatedLead
  });
});

// Elimina un lead de SQLite usando el ID de la URL.
app.delete("/leads/:id", (req, res) => {
  const leadId = Number(req.params.id);

  if (!Number.isInteger(leadId) || leadId <= 0) {
    return res.status(400).json({
      error: "El ID del lead no es valido."
    });
  }

  const deletedLead = deleteLead(leadId);

  if (!deletedLead) {
    return res.status(404).json({
      error: "Lead no encontrado."
    });
  }

  return res.status(200).json({
    message: "Lead eliminado correctamente.",
    data: deletedLead
  });
});

module.exports = app;
