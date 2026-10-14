const fs = require("fs");
const path = require("path");
const XLSX = require(path.resolve(__dirname, "../dist/xlsx.full.min.js"));

const sourcePath = process.argv[2];
const outputPath = process.argv[3] || path.resolve(__dirname, "../dist/personnel-data.js");

if (!sourcePath) {
  console.error("Uso: node scripts/build-personnel-data.cjs <archivo.xlsx> [salida.js]");
  process.exit(1);
}

function clean(value) {
  return String(value ?? "").trim().replace(/\s+/g, " ");
}

function normalizeHeader(value) {
  return clean(value).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase().replace(/[^A-Z0-9]/g, "");
}

const workbook = XLSX.read(fs.readFileSync(sourcePath), { type: "buffer", raw: false });
const rows = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]], { header: 1, defval: "", raw: false });
const identificationHeaders = ["CEDULA", "IDENTIFICACION"];
const roleHeaders = ["DESCARGO", "CARGO", "DESCRIPCIONCARGO"];
const headerRow = rows.findIndex((row) => row.map(normalizeHeader).some((header) => identificationHeaders.includes(header)));

if (headerRow < 0) throw new Error('No se encontró la columna "CEDULA" o "IDENTIFICACION" en la primera hoja.');

const headers = rows[headerRow].map(normalizeHeader);
const column = (accepted) => headers.findIndex((header) => accepted.includes(header));
const indexes = {
  identification: column(identificationHeaders),
  firstSurname: column(["APELLIDO1"]),
  secondSurname: column(["APELLIDO2"]),
  firstName: column(["NOMBRE1"]),
  secondName: column(["NOMBRE2"]),
  role: column(roleHeaders)
};

if ([indexes.firstSurname, indexes.firstName, indexes.role].some((index) => index < 0)) {
  throw new Error('El archivo debe incluir "APELLIDO1", "NOMBRE1" y una columna de cargo.');
}

const people = new Map();
let invalidRows = 0;
rows.slice(headerRow + 1).forEach((row) => {
  const identification = String(row[indexes.identification] ?? "").replace(/\D/g, "");
  const name = clean([
    row[indexes.firstName],
    indexes.secondName >= 0 ? row[indexes.secondName] : "",
    row[indexes.firstSurname],
    indexes.secondSurname >= 0 ? row[indexes.secondSurname] : ""
  ].map(clean).filter(Boolean).join(" "));
  const role = clean(row[indexes.role]);
  if (!identification && !name && !role) return;
  if (!/^\d{3,15}$/.test(identification) || !name || !role) {
    invalidRows += 1;
    return;
  }
  people.set(identification, { identification, name, role });
});

const sortedPeople = [...people.values()].sort((a, b) => a.name.localeCompare(b.name, "es", { sensitivity: "base" }));
if (!sortedPeople.length) throw new Error("No se encontraron trabajadores válidos.");

const contents = `window.PERSONNEL_DATA = ${JSON.stringify(sortedPeople, null, 2)};\n`;
fs.writeFileSync(outputPath, contents, "utf8");
console.log(`${sortedPeople.length} trabajadores escritos en ${outputPath}. ${invalidRows} filas inválidas omitidas.`);
