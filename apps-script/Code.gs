/**
 * SLONTEC — receptor de la página de reseñas.
 * Guarda en esta Hoja de Google:
 *   - "Reseñas":  todas las valoraciones (estrellas + comentario)
 *   - "Clientes": solo quien ha dado su consentimiento, con sus preferencias
 *   - "Bajas":    registro de solicitudes de baja / borrado
 *
 * Instalación: ver README.md del repositorio (apartado "Guardar los datos").
 */

// Email que recibe un aviso con cada reseña nueva y cada baja. Dejar "" para no avisar.
var EMAIL_AVISOS = "";

var HOJAS = {
  "Reseñas": ["Fecha", "Estrellas", "Comentario", "Técnico", "Servicio", "Nombre", "Teléfono", "Email"],
  "Clientes": ["Alta", "Nombre", "Teléfono", "Email", "Consentimiento gestión interna",
               "Consentimiento comunicaciones", "Versión texto consentimiento", "Última actualización", "Baja comunicaciones"],
  "Bajas": ["Fecha", "Teléfono", "Email", "Acción", "Cliente encontrado"]
};

function doPost(e) {
  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    var d = JSON.parse(e.postData.contents);
    if (d.tipo === "resena") guardarResena_(d);
    else if (d.tipo === "baja") guardarBaja_(d);
    return ContentService.createTextOutput(JSON.stringify({ ok: true })).setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ ok: false, error: String(err) })).setMimeType(ContentService.MimeType.JSON);
  } finally {
    lock.releaseLock();
  }
}

function doGet() {
  return ContentService.createTextOutput("Slontec: receptor activo.");
}

function hoja_(nombre) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(nombre);
  if (!sh) {
    sh = ss.insertSheet(nombre);
    sh.appendRow(HOJAS[nombre]);
    sh.setFrozenRows(1);
    sh.getRange(1, 1, 1, HOJAS[nombre].length).setFontWeight("bold");
  }
  return sh;
}

function limpio_(v, max) { return String(v == null ? "" : v).slice(0, max || 500); }
function normTel_(t) { return String(t || "").replace(/[^\d+]/g, "").replace(/^\+34/, ""); }
function normEmail_(m) { return String(m || "").trim().toLowerCase(); }

function guardarResena_(d) {
  var fecha = new Date();
  var conDatos = d.consentimientoGestion === true;
  hoja_("Reseñas").appendRow([
    fecha,
    Number(d.estrellas) || "",
    limpio_(d.comentario, 4000),
    limpio_(d.tecnico, 100),
    limpio_(d.servicio, 100),
    conDatos ? limpio_(d.nombre, 200) : "",
    conDatos ? limpio_(d.telefono, 50) : "",
    conDatos ? limpio_(d.email, 200) : ""
  ]);

  if (conDatos && (d.telefono || d.email)) upsertCliente_(d, fecha);

  if (EMAIL_AVISOS) {
    MailApp.sendEmail(EMAIL_AVISOS, "Nueva valoración: " + d.estrellas + "★",
      "Estrellas: " + d.estrellas + "\nComentario: " + (d.comentario || "-") +
      "\nTécnico: " + (d.tecnico || "-") + "\nCliente: " + (conDatos ? (d.nombre || "") + " " + (d.telefono || "") + " " + (d.email || "") : "anónimo"));
  }
}

function buscarCliente_(sh, tel, email) {
  var datos = sh.getDataRange().getValues();
  var t = normTel_(tel), m = normEmail_(email);
  for (var i = 1; i < datos.length; i++) {
    if ((t && normTel_(datos[i][2]) === t) || (m && normEmail_(datos[i][3]) === m)) return i + 1; // fila
  }
  return 0;
}

function upsertCliente_(d, fecha) {
  var sh = hoja_("Clientes");
  var fila = buscarCliente_(sh, d.telefono, d.email);
  var valores = [
    fecha,
    limpio_(d.nombre, 200),
    limpio_(d.telefono, 50),
    limpio_(d.email, 200),
    "SÍ",
    d.consentimientoComercial === true ? "SÍ" : "NO",
    limpio_(d.versionTextoConsentimiento, 40),
    fecha,
    ""
  ];
  if (fila) {
    var alta = sh.getRange(fila, 1).getValue();
    var previo = sh.getRange(fila, 1, 1, valores.length).getValues()[0];
    valores[0] = alta || fecha;
    valores[1] = valores[1] || previo[1];
    valores[2] = valores[2] || previo[2];
    valores[3] = valores[3] || previo[3];
    sh.getRange(fila, 1, 1, valores.length).setValues([valores]);
  } else {
    sh.appendRow(valores);
  }
}

function guardarBaja_(d) {
  var fecha = new Date();
  var sh = hoja_("Clientes");
  var fila = buscarCliente_(sh, d.telefono, d.email);
  if (fila) {
    if (d.accion === "borrar_todo") {
      sh.deleteRow(fila);
    } else {
      sh.getRange(fila, 6).setValue("NO");
      sh.getRange(fila, 8).setValue(fecha);
      sh.getRange(fila, 9).setValue(fecha);
    }
  }
  // Si pide borrar todo, se anonimizan también sus reseñas internas (se conservan estrellas y comentario).
  if (d.accion === "borrar_todo") anonimizarResenas_(d.telefono, d.email);

  // Por coherencia con el borrado, en "Bajas" solo se guarda lo imprescindible para acreditar la petición.
  hoja_("Bajas").appendRow([fecha, limpio_(d.telefono, 50), limpio_(d.email, 200),
    d.accion === "borrar_todo" ? "Borrar datos" : "Baja comunicaciones", fila ? "Sí" : "No"]);

  if (EMAIL_AVISOS) {
    MailApp.sendEmail(EMAIL_AVISOS, "Solicitud de baja (" + (d.accion === "borrar_todo" ? "borrar datos" : "comunicaciones") + ")",
      "Teléfono: " + (d.telefono || "-") + "\nEmail: " + (d.email || "-") +
      "\nCliente encontrado: " + (fila ? "Sí" : "No — revisar manualmente") +
      (d.accion === "borrar_todo" ? "\n\nRecuerda borrar también este cliente de agendas, WhatsApp u otros sistemas." : ""));
  }
}

function anonimizarResenas_(tel, email) {
  var sh = hoja_("Reseñas");
  var datos = sh.getDataRange().getValues();
  var t = normTel_(tel), m = normEmail_(email);
  for (var i = 1; i < datos.length; i++) {
    if ((t && normTel_(datos[i][6]) === t) || (m && normEmail_(datos[i][7]) === m)) {
      sh.getRange(i + 1, 6, 1, 3).setValues([["", "", ""]]);
    }
  }
}
