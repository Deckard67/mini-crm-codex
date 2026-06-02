const fs = require("fs");
const path = require("path");
const Database = require("better-sqlite3");

// Lista cerrada de estados que acepta el CRM para mantener datos consistentes.
const validStatuses = ["nuevo", "contactado", "perdido"];

// La base de datos vive dentro del proyecto para que los datos persistan entre reinicios.
const databaseDir = path.join(__dirname, "..", "..", "database");
const databasePath = path.join(databaseDir, "mini-crm.sqlite");

// Creamos la carpeta de base de datos si todavia no existe.
fs.mkdirSync(databaseDir, { recursive: true });

// Abrimos una conexion SQLite reutilizable para todas las operaciones de leads.
const db = new Database(databasePath);

// Activamos claves foraneas por defecto, una buena practica aunque esta tabla aun no tenga relaciones.
db.pragma("foreign_keys = ON");

// Creamos la tabla al iniciar la app para que el archivo SQLite quede listo automaticamente.
db.exec(`
  CREATE TABLE IF NOT EXISTS leads (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    source TEXT,
    status TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT
  )
`);

// Normaliza campos de texto opcionales: elimina espacios y guarda NULL si vienen vacios.
function normalizeText(value) {
  if (typeof value !== "string") return null;
  const trimmedValue = value.trim();
  return trimmedValue || null;
}

// Normaliza el estado y descarta valores que no pertenecen a la lista permitida.
function normalizeStatus(value) {
  if (typeof value !== "string") return null;
  const normalizedValue = value.trim().toLowerCase();

  if (!normalizedValue) return null;
  if (!validStatuses.includes(normalizedValue)) return null;
  return normalizedValue;
}

// Convierte los nombres de columnas de SQLite al formato que ya espera el frontend.
function mapLeadRow(row) {
  if (!row) return null;

  return {
    id: row.id,
    name: row.name,
    email: row.email,
    source: row.source,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

// Lee todos los leads desde SQLite, mostrando primero los mas recientes.
function getAllLeads() {
  const rows = db
    .prepare(
      `
      SELECT id, name, email, source, status, created_at, updated_at
      FROM leads
      ORDER BY id DESC
    `
    )
    .all();

  return rows.map(mapLeadRow);
}

// Inserta un lead nuevo en la base de datos y devuelve el registro ya guardado.
function createLead({ name, email, source, status }) {
  const createdAt = new Date().toISOString();
  const result = db
    .prepare(
      `
      INSERT INTO leads (name, email, source, status, created_at)
      VALUES (@name, @email, @source, @status, @createdAt)
    `
    )
    .run({
      name: name.trim(),
      email: email.trim(),
      source: normalizeText(source),
      status: normalizeStatus(status),
      createdAt
    });

  return getLeadById(result.lastInsertRowid);
}

// Busca un lead por ID para reutilizar la misma forma de respuesta tras crear o editar.
function getLeadById(id) {
  const row = db
    .prepare(
      `
      SELECT id, name, email, source, status, created_at, updated_at
      FROM leads
      WHERE id = ?
    `
    )
    .get(id);

  return mapLeadRow(row);
}

// Actualiza solo los campos recibidos y mantiene intacto el resto del registro.
function updateLead(id, updates) {
  const existingLead = getLeadById(id);

  if (!existingLead) {
    return null;
  }

  const nextLead = {
    name: Object.prototype.hasOwnProperty.call(updates, "name") ? updates.name.trim() : existingLead.name,
    email: Object.prototype.hasOwnProperty.call(updates, "email") ? updates.email.trim() : existingLead.email,
    source: Object.prototype.hasOwnProperty.call(updates, "source") ? normalizeText(updates.source) : existingLead.source,
    status: Object.prototype.hasOwnProperty.call(updates, "status") ? normalizeStatus(updates.status) : existingLead.status,
    updatedAt: new Date().toISOString(),
    id
  };

  db.prepare(
    `
    UPDATE leads
    SET name = @name,
        email = @email,
        source = @source,
        status = @status,
        updated_at = @updatedAt
    WHERE id = @id
  `
  ).run(nextLead);

  return getLeadById(id);
}

// Elimina el lead de SQLite y devuelve el registro que fue eliminado.
function deleteLead(id) {
  const existingLead = getLeadById(id);

  if (!existingLead) {
    return null;
  }

  db.prepare("DELETE FROM leads WHERE id = ?").run(id);
  return existingLead;
}

module.exports = {
  getAllLeads,
  createLead,
  updateLead,
  deleteLead
};
