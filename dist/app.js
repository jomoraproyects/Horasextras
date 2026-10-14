(function () {
  "use strict";

  const CONCEPTS = [
    ["005", "Recargo nocturno"],
    ["006", "Hora extra diurna"],
    ["007", "Hora extra nocturna"],
    ["008", "Hora extra diurna festiva"],
    ["009", "Hora extra nocturna festiva"],
    ["236", "Simple disponibilidad diurna"],
    ["237", "Simple disponibilidad nocturna"],
    ["238", "Simple disponibilidad diurna festiva"],
    ["239", "Simple disponibilidad nocturna festiva"],
    ["240", "Ejecución disponibilidad diurna"],
    ["241", "Ejecución disponibilidad nocturna"],
    ["242", "Ejecución disponibilidad diurna festiva"],
    ["243", "Ejecución disponibilidad nocturna festiva"],
    ["345", "HORAS EXTRAS DIURNA EN DESCANSO/FESTIVO"],
    ["346", "HORAS EXTRAS NOCTURNA EN DESCANSO/FESTIVO"]
  ];
  const CONCEPT_CODES = new Set(CONCEPTS.map(([code]) => code));
  const SIMPLE_AVAILABILITY_CODES = new Set(["236", "237", "238", "239"]);
  const STORAGE_KEY = "registro-horas-extras-v1";
  let employeeSequence = 0;
  let entrySequence = 0;
  let employees = [];
  let personnel = [];
  let toastTimer;

  const elements = {
    start: document.querySelector("#start-date"),
    end: document.querySelector("#end-date"),
    year: document.querySelector("#period-year"),
    month: document.querySelector("#period-month"),
    employeeList: document.querySelector("#employees-list"),
    preview: document.querySelector("#preview-body"),
    employeeCount: document.querySelector("#employee-count"),
    recordCount: document.querySelector("#record-count"),
    hours: document.querySelector("#hours-total"),
    status: document.querySelector("#status-message"),
    toast: document.querySelector("#toast"),
    personnelCount: document.querySelector("#personnel-count"),
    personnelSearch: document.querySelector("#personnel-search"),
    personnelList: document.querySelector("#personnel-list")
  };

  function makeEntry(values = {}) {
    entrySequence += 1;
    const concept = String(values.concept || "");
    return {
      key: `entry-${entrySequence}`,
      concept,
      hours: SIMPLE_AVAILABILITY_CODES.has(concept) ? "3" : (values.hours === undefined ? "" : String(values.hours))
    };
  }

  function makeEmployee(values = {}) {
    employeeSequence += 1;
    const entries = Array.isArray(values.entries) && values.entries.length
      ? values.entries.map(makeEntry)
      : [makeEntry()];
    return {
      key: `employee-${employeeSequence}`,
      identification: String(values.identification || ""),
      entries
    };
  }

  function toIsoDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  function defaultPeriod() {
    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth();
    if (today.getDate() <= 15) {
      return [toIsoDate(new Date(year, month, 1)), toIsoDate(new Date(year, month, 15))];
    }
    return [toIsoDate(new Date(year, month, 16)), toIsoDate(new Date(year, month + 1, 0))];
  }

  function conceptOptions(selected) {
    const groups = [
      ["Recargos y horas extras", CONCEPTS.slice(0, 5)],
      ["Simple disponibilidad", CONCEPTS.slice(5, 9)],
      ["Ejecución de disponibilidad", CONCEPTS.slice(9, 13)],
      ["Horas extras", CONCEPTS.slice(13)]
    ];
    return `<option value="">Seleccionar concepto</option>${groups.map(([label, concepts]) =>
      `<optgroup label="${label}">${concepts.map(([code, name]) => `<option value="${code}"${selected === code ? " selected" : ""}>${code} — ${name}</option>`).join("")}</optgroup>`
    ).join("")}`;
  }

  function escapeHtml(value) {
    return String(value).replace(/[&<>"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[character]));
  }

  function employeeHours(employee) {
    return employee.entries.reduce((total, entry) => {
      const hours = Number(entry.hours);
      return total + (Number.isFinite(hours) && hours > 0 ? hours : 0);
    }, 0);
  }

  function cleanIdentification(value) {
    return String(value ?? "").replace(/\D/g, "");
  }

  function cleanName(value) {
    return String(value ?? "").trim().replace(/\s+/g, " ");
  }

  function normalizeHeader(value) {
    return cleanName(value).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase().replace(/[^A-Z0-9]/g, "");
  }

  function personnelNameFor(identification) {
    return personnel.find((person) => person.identification === identification)?.name || "";
  }

  function renderEmployees() {
    elements.employeeList.innerHTML = employees.map((employee, employeeIndex) => `
      <article class="employee-card" data-employee-key="${employee.key}">
        <header class="employee-header">
          <div class="employee-identity">
            <span class="employee-number" aria-hidden="true">${employeeIndex + 1}</span>
            <label>Identificación
              <input class="employee-identification" inputmode="numeric" autocomplete="off" maxlength="15" aria-label="Identificación del empleado ${employeeIndex + 1}" placeholder="Ej. 100000001" value="${escapeHtml(employee.identification)}">
              <span class="employee-directory-name">${escapeHtml(personnelNameFor(employee.identification))}</span>
            </label>
          </div>
          <div class="employee-header-actions">
            <div class="employee-hours"><span>Total horas</span><strong>${employeeHours(employee).toLocaleString("es-CO", { maximumFractionDigits: 2 })}</strong></div>
            <button class="remove-employee" type="button" aria-label="Eliminar empleado ${employeeIndex + 1}" title="Eliminar empleado">×</button>
          </div>
        </header>
        <div class="employee-body">
          <div class="concept-columns" aria-hidden="true"><span></span><span>Concepto</span><span>Horas</span><span></span></div>
          <div class="concept-rows">
            ${employee.entries.map((entry, entryIndex) => `
              <div class="concept-row" data-entry-key="${entry.key}">
                <span class="entry-number" aria-hidden="true">${entryIndex + 1}</span>
                <label class="sr-only" for="concept-${entry.key}">Concepto ${entryIndex + 1} del empleado ${employeeIndex + 1}</label>
                <select id="concept-${entry.key}" class="concept" aria-label="Concepto ${entryIndex + 1} del empleado ${employeeIndex + 1}">${conceptOptions(entry.concept)}</select>
                <label class="sr-only" for="hours-${entry.key}">Horas del concepto ${entryIndex + 1}</label>
                <input id="hours-${entry.key}" class="hours${SIMPLE_AVAILABILITY_CODES.has(entry.concept) ? " fixed-hours" : ""}" type="number" min="0.01" max="999.99" step="0.01" inputmode="decimal" aria-label="Horas del concepto ${entryIndex + 1} del empleado ${employeeIndex + 1}" placeholder="0" value="${escapeHtml(entry.hours)}"${SIMPLE_AVAILABILITY_CODES.has(entry.concept) ? ' readonly aria-readonly="true" title="Este concepto siempre corresponde a 3 horas."' : ""}>
                <button class="remove-concept" type="button" aria-label="Eliminar concepto ${entryIndex + 1}" title="Eliminar concepto">×</button>
              </div>`).join("")}
          </div>
          <button class="add-concept" type="button">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14"></path></svg>
            Agregar concepto
          </button>
        </div>
      </article>`).join("");
    updateSummary();
  }

  function formatDate(isoDate) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(isoDate || "")) return "";
    const [year, month, day] = isoDate.split("-");
    return `${day}/${month}/${year}`;
  }

  function periodInfo() {
    if (!elements.start.value) return { year: "—", month: "—" };
    const [year, month] = elements.start.value.split("-").map(Number);
    return { year, month };
  }

  function aggregateRows() {
    const grouped = new Map();
    employees.forEach((employee) => {
      const identification = employee.identification.trim();
      employee.entries.forEach((entry) => {
        const concept = entry.concept;
        const hours = SIMPLE_AVAILABILITY_CODES.has(concept) ? 3 : Number(entry.hours);
        if (!identification || !concept || !Number.isFinite(hours) || hours <= 0) return;
        const key = `${identification}|${concept}`;
        const existing = grouped.get(key);
        if (existing) existing.hours = Math.round((existing.hours + hours) * 100) / 100;
        else grouped.set(key, { identification, concept, hours });
      });
    });
    return [...grouped.values()].sort((a, b) => {
      const idComparison = a.identification.localeCompare(b.identification, "es", { numeric: true });
      return idComparison || Number(a.concept) - Number(b.concept);
    });
  }

  function exportRecords() {
    const { year, month } = periodInfo();
    return aggregateRows().map((row) => ({
      ...row,
      start: elements.start.value,
      end: elements.end.value,
      year,
      month
    }));
  }

  function updateSummary() {
    const aggregated = aggregateRows();
    const employeeIds = new Set(aggregated.map((row) => row.identification));
    const hours = aggregated.reduce((sum, row) => sum + row.hours, 0);
    const period = periodInfo();
    elements.year.textContent = period.year;
    elements.month.textContent = period.month;
    elements.employeeCount.textContent = employeeIds.size;
    elements.recordCount.textContent = aggregated.length;
    elements.hours.textContent = hours.toLocaleString("es-CO", { maximumFractionDigits: 2 });
    elements.employeeList.querySelectorAll(".employee-card").forEach((card) => {
      const employee = employees.find((item) => item.key === card.dataset.employeeKey);
      const total = card.querySelector(".employee-hours strong");
      if (employee && total) total.textContent = employeeHours(employee).toLocaleString("es-CO", { maximumFractionDigits: 2 });
    });
    renderPreview(aggregated, period);
    saveState();
  }

  function renderPreview(aggregated, period) {
    if (!aggregated.length) {
      elements.preview.innerHTML = '<tr><td colspan="7">Agrega empleados y conceptos para ver la vista previa.</td></tr>';
      return;
    }
    elements.preview.innerHTML = aggregated.slice(0, 8).map((row) => `<tr>
      <td>${escapeHtml(row.identification)}</td><td>${row.concept}</td><td>${formatDate(elements.start.value)}</td><td>${formatDate(elements.end.value)}</td><td>${row.hours}</td><td>${period.year}</td><td>${period.month}</td>
    </tr>`).join("") + (aggregated.length > 8 ? `<tr><td colspan="7">Y ${aggregated.length - 8} registros más…</td></tr>` : "");
  }

  function syncFromInput(input) {
    const employeeCard = input.closest(".employee-card");
    const employee = employees.find((item) => item.key === employeeCard?.dataset.employeeKey);
    if (!employee) return;
    if (input.classList.contains("employee-identification")) {
      const clean = cleanIdentification(input.value);
      if (input.value !== clean) input.value = clean;
      employee.identification = clean;
      const name = employeeCard.querySelector(".employee-directory-name");
      if (name) name.textContent = personnelNameFor(clean);
    } else {
      const entryRow = input.closest(".concept-row");
      const entry = employee.entries.find((item) => item.key === entryRow?.dataset.entryKey);
      if (!entry) return;
      if (input.classList.contains("concept")) {
        entry.concept = input.value;
        const hoursInput = entryRow.querySelector(".hours");
        if (SIMPLE_AVAILABILITY_CODES.has(entry.concept)) {
          entry.hours = "3";
          hoursInput.value = "3";
          hoursInput.readOnly = true;
          hoursInput.setAttribute("aria-readonly", "true");
          hoursInput.title = "Este concepto siempre corresponde a 3 horas.";
          hoursInput.classList.add("fixed-hours");
        } else {
          hoursInput.readOnly = false;
          hoursInput.removeAttribute("aria-readonly");
          hoursInput.removeAttribute("title");
          hoursInput.classList.remove("fixed-hours");
        }
      } else if (input.classList.contains("hours")) entry.hours = input.value;
    }
    input.classList.remove("invalid");
    updateSummary();
  }

  function validate() {
    document.querySelectorAll(".invalid").forEach((field) => field.classList.remove("invalid"));
    const errors = [];
    if (!elements.start.value) { errors.push("Selecciona la fecha inicial."); elements.start.classList.add("invalid"); }
    if (!elements.end.value) { errors.push("Selecciona la fecha final."); elements.end.classList.add("invalid"); }
    if (elements.start.value && elements.end.value && elements.end.value < elements.start.value) {
      errors.push("La fecha final no puede ser anterior a la inicial.");
      elements.end.classList.add("invalid");
    }
    if (elements.start.value && elements.end.value && elements.start.value.slice(0, 7) !== elements.end.value.slice(0, 7)) {
      errors.push("El periodo debe comenzar y terminar en el mismo mes.");
      elements.start.classList.add("invalid");
      elements.end.classList.add("invalid");
    }

    let filledEntries = 0;
    const identificationFields = new Map();
    employees.forEach((employee) => {
      const card = elements.employeeList.querySelector(`[data-employee-key="${employee.key}"]`);
      const identificationField = card?.querySelector(".employee-identification");
      const hasEntryData = employee.entries.some((entry) => entry.concept || entry.hours);
      if (!employee.identification && !hasEntryData) return;

      if (!/^\d{3,15}$/.test(employee.identification)) {
        errors.push("Revisa las identificaciones: deben contener solamente números.");
        identificationField?.classList.add("invalid");
      } else {
        const fields = identificationFields.get(employee.identification) || [];
        fields.push(identificationField);
        identificationFields.set(employee.identification, fields);
      }

      let employeeEntries = 0;
      employee.entries.forEach((entry) => {
        const entryRow = card?.querySelector(`[data-entry-key="${entry.key}"]`);
        if (!entry.concept && !entry.hours) return;
        employeeEntries += 1;
        filledEntries += 1;
        if (!CONCEPT_CODES.has(entry.concept)) {
          errors.push("Selecciona un concepto en todas las novedades diligenciadas.");
          entryRow?.querySelector(".concept")?.classList.add("invalid");
        }
        const hours = Number(entry.hours);
        if (!Number.isFinite(hours) || hours <= 0) {
          errors.push("Las horas deben ser mayores que cero.");
          entryRow?.querySelector(".hours")?.classList.add("invalid");
        }
      });
      if (employee.identification && !employeeEntries) {
        errors.push("Agrega al menos un concepto para cada empleado.");
        card?.querySelector(".concept")?.classList.add("invalid");
      }
    });

    identificationFields.forEach((fields) => {
      if (fields.length < 2) return;
      errors.push("Cada cédula debe aparecer una sola vez. Agrega sus conceptos dentro del mismo empleado.");
      fields.forEach((field) => field?.classList.add("invalid"));
    });
    if (!filledEntries) errors.push("Agrega al menos un empleado con un concepto y sus horas.");
    return [...new Set(errors)];
  }

  function showToast(message, isError = false) {
    clearTimeout(toastTimer);
    elements.toast.textContent = message;
    elements.toast.className = `toast show${isError ? " error" : ""}`;
    toastTimer = setTimeout(() => { elements.toast.className = "toast"; }, 3600);
  }

  function downloadExcel() {
    const errors = validate();
    if (errors.length) {
      elements.status.textContent = errors[0];
      showToast(errors[0], true);
      document.querySelector(".invalid")?.focus();
      return { ok: false, errors };
    }
    const records = exportRecords();
    const { year, month } = periodInfo();
    const filename = `Novedades_Horas_Extras_${year}_${String(month).padStart(2, "0")}.xlsx`;
    window.ExcelExporter.download(records, filename);
    elements.status.textContent = `${records.length} registros listos para nómina.`;
    showToast(`Excel descargado: ${filename}`);
    return { ok: true, filename, records: records.length };
  }

  function saveState() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ start: elements.start.value, end: elements.end.value, employees }));
    } catch (_) { /* El registro sigue funcionando sin almacenamiento local. */ }
  }

  function loadPersonnel() {
    const source = Array.isArray(window.PERSONNEL_DATA) ? window.PERSONNEL_DATA : [];
    const unique = new Map();
    source.forEach((person) => {
      const cleanPerson = {
        name: cleanName(person?.name),
        identification: cleanIdentification(person?.identification),
        role: cleanName(person?.role)
      };
      if (cleanPerson.name && cleanPerson.role && /^\d{3,15}$/.test(cleanPerson.identification)) unique.set(cleanPerson.identification, cleanPerson);
    });
    personnel = [...unique.values()].sort((a, b) => a.name.localeCompare(b.name, "es", { sensitivity: "base" }));
  }

  function renderPersonnel() {
    const query = normalizeHeader(elements.personnelSearch.value);
    const visible = personnel
      .filter((person) => !query || normalizeHeader(person.name).includes(query) || person.identification.includes(query))
      .sort((a, b) => a.name.localeCompare(b.name, "es", { sensitivity: "base" }));
    elements.personnelCount.textContent = personnel.length;
    if (!personnel.length) {
      elements.personnelList.innerHTML = '<div class="personnel-empty"><strong>No hay personal disponible.</strong><span>El directorio no pudo cargarse.</span></div>';
      return;
    }
    if (!visible.length) {
      elements.personnelList.innerHTML = '<div class="personnel-empty"><strong>No se encontraron coincidencias.</strong><span>Prueba con otro nombre o identificación.</span></div>';
      return;
    }
    elements.personnelList.innerHTML = `
      <div class="personnel-list-header" aria-hidden="true">
        <span></span><span>Nombre</span><span>Cargo</span><span></span>
      </div>${visible.map((person) => `
      <div class="personnel-row" data-identification="${escapeHtml(person.identification)}">
        <span class="personnel-initial" aria-hidden="true">${escapeHtml(person.name.charAt(0).toUpperCase())}</span>
        <span class="personnel-data"><strong>${escapeHtml(person.name)}</strong><small>Identificación ${escapeHtml(person.identification)}</small></span>
        <span class="personnel-role">${escapeHtml(person.role)}</span>
        <span class="personnel-actions">
          <button class="use-personnel" type="button" title="Agregar a las novedades">Usar</button>
        </span>
      </div>`).join("")}`;
  }

  function usePerson(identification) {
    const existing = employees.find((employee) => employee.identification === identification);
    if (existing) {
      document.querySelector(`[data-employee-key="${existing.key}"]`)?.scrollIntoView({ behavior: "smooth", block: "center" });
      showToast("Esta persona ya está agregada en las novedades.");
      return;
    }
    let employee = employees.find((item) => !item.identification && item.entries.every((entry) => !entry.concept && !entry.hours));
    if (employee) employee.identification = identification;
    else {
      employee = makeEmployee({ identification });
      employees.push(employee);
    }
    renderEmployees();
    const card = elements.employeeList.querySelector(`[data-employee-key="${employee.key}"]`);
    card?.scrollIntoView({ behavior: "smooth", block: "center" });
    card?.querySelector(".concept")?.focus({ preventScroll: true });
    showToast(`${personnelNameFor(identification)} fue agregado a las novedades.`);
  }


  function migrateLegacyRows(rows) {
    const migrated = [];
    const byIdentification = new Map();
    rows.forEach((row) => {
      const identification = String(row?.identification || "");
      const entry = { concept: row?.concept || "", hours: row?.hours === undefined ? "" : row.hours };
      if (!identification) {
        if (entry.concept || entry.hours) migrated.push(makeEmployee({ identification, entries: [entry] }));
        return;
      }
      let employee = byIdentification.get(identification);
      if (!employee) {
        employee = makeEmployee({ identification });
        employee.entries = [];
        byIdentification.set(identification, employee);
        migrated.push(employee);
      }
      employee.entries.push(makeEntry(entry));
    });
    migrated.forEach((employee) => { if (!employee.entries.length) employee.entries.push(makeEntry()); });
    if (!migrated.length) migrated.push(makeEmployee());
    return migrated;
  }

  function loadState() {
    const [defaultStart, defaultEnd] = defaultPeriod();
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
      elements.start.value = saved?.start || defaultStart;
      elements.end.value = saved?.end || defaultEnd;
      if (Array.isArray(saved?.employees) && saved.employees.length) {
        employees = saved.employees.map(makeEmployee);
      } else if (Array.isArray(saved?.rows) && saved.rows.length) {
        employees = migrateLegacyRows(saved.rows);
      } else {
        employees = [makeEmployee()];
      }
    } catch (_) {
      elements.start.value = defaultStart;
      elements.end.value = defaultEnd;
      employees = [makeEmployee()];
    }
  }

  function loadExample() {
    employees = [
      makeEmployee({ identification: "100000001", entries: [{ concept: "006", hours: 2 }, { concept: "007", hours: 3.5 }] }),
      makeEmployee({ identification: "100000002", entries: [{ concept: "242", hours: 4 }, { concept: "346", hours: 2 }] })
    ];
    renderEmployees();
    elements.status.textContent = "Ejemplo cargado. Puedes modificarlo o descargarlo.";
    showToast("Ejemplo cargado correctamente.");
  }

  function clearAll() {
    if (!window.confirm("¿Quieres borrar el periodo y todas las novedades ingresadas?")) return;
    const [start, end] = defaultPeriod();
    elements.start.value = start;
    elements.end.value = end;
    employees = [makeEmployee()];
    renderEmployees();
    elements.status.textContent = "Completa los datos para descargar el Excel.";
  }

  function groupEntriesByEmployee(entries) {
    const grouped = new Map();
    entries.forEach((entry) => {
      const identification = String(entry.identification);
      let employee = grouped.get(identification);
      if (!employee) {
        employee = { identification, entries: [] };
        grouped.set(identification, employee);
      }
      employee.entries.push({ concept: String(entry.concept), hours: entry.hours });
    });
    return [...grouped.values()].map(makeEmployee);
  }

  function registerWebMcp() {
    const context = document.modelContext;
    if (!context?.registerTool) return;
    const annotations = { readOnlyHint: false, untrustedContentHint: false };
    Promise.resolve(context.registerTool({
      name: "stage_overtime_entries",
      title: "Preparar novedades de horas extras",
      description: "Carga un periodo y varias novedades agrupadas por empleado sin descargar todavía el archivo.",
      inputSchema: {
        type: "object",
        properties: {
          startDate: { type: "string", pattern: "^\\d{4}-\\d{2}-\\d{2}$" },
          endDate: { type: "string", pattern: "^\\d{4}-\\d{2}-\\d{2}$" },
          entries: { type: "array", minItems: 1, items: { type: "object", properties: { identification: { type: "string", pattern: "^\\d{3,15}$" }, concept: { type: "string", enum: [...CONCEPT_CODES] }, hours: { type: "number", exclusiveMinimum: 0 } }, required: ["identification", "concept", "hours"], additionalProperties: false } }
        },
        required: ["startDate", "endDate", "entries"],
        additionalProperties: false
      },
      annotations,
      execute(input) {
        const datePattern = /^\d{4}-\d{2}-\d{2}$/;
        if (!input || !datePattern.test(input.startDate || "") || !datePattern.test(input.endDate || "")) {
          throw new Error("Las fechas deben usar el formato AAAA-MM-DD.");
        }
        if (input.endDate < input.startDate || input.startDate.slice(0, 7) !== input.endDate.slice(0, 7)) {
          throw new Error("El periodo debe comenzar y terminar en el mismo mes.");
        }
        if (!Array.isArray(input.entries) || !input.entries.length) throw new Error("Se requiere al menos una novedad.");
        const entriesAreValid = input.entries.every((entry) =>
          entry && /^\d{3,15}$/.test(String(entry.identification || "")) &&
          CONCEPT_CODES.has(String(entry.concept || "")) &&
          Number.isFinite(Number(entry.hours)) && Number(entry.hours) > 0
        );
        if (!entriesAreValid) throw new Error("Hay novedades con identificación, concepto u horas inválidas.");
        elements.start.value = input.startDate;
        elements.end.value = input.endDate;
        employees = groupEntriesByEmployee(input.entries);
        renderEmployees();
        const errors = validate();
        if (errors.length) throw new Error(errors.join(" "));
        return { staged: input.entries.length, employees: employees.length, finalRecords: aggregateRows().length };
      }
    })).catch(() => {});

    Promise.resolve(context.registerTool({
      name: "read_overtime_summary",
      title: "Consultar resumen de novedades",
      description: "Devuelve el periodo, empleados, registros consolidados y total de horas visibles.",
      inputSchema: { type: "object", properties: {}, additionalProperties: false },
      annotations: { readOnlyHint: true, untrustedContentHint: false },
      execute() {
        const aggregated = aggregateRows();
        return { startDate: elements.start.value, endDate: elements.end.value, employees: new Set(aggregated.map((row) => row.identification)).size, finalRecords: aggregated.length, totalHours: aggregated.reduce((sum, row) => sum + row.hours, 0) };
      }
    })).catch(() => {});
  }

  elements.employeeList.addEventListener("input", (event) => syncFromInput(event.target));
  elements.employeeList.addEventListener("change", (event) => syncFromInput(event.target));
  elements.employeeList.addEventListener("click", (event) => {
    const employeeCard = event.target.closest(".employee-card");
    const employee = employees.find((item) => item.key === employeeCard?.dataset.employeeKey);
    if (!employee) return;

    if (event.target.closest(".add-concept")) {
      employee.entries.push(makeEntry());
      renderEmployees();
      elements.employeeList.querySelector(`[data-employee-key="${employee.key}"] .concept-row:last-child .concept`)?.focus();
      return;
    }

    const removeConcept = event.target.closest(".remove-concept");
    if (removeConcept) {
      const entryKey = removeConcept.closest(".concept-row")?.dataset.entryKey;
      employee.entries = employee.entries.filter((entry) => entry.key !== entryKey);
      if (!employee.entries.length) employee.entries.push(makeEntry());
      renderEmployees();
      return;
    }

    if (event.target.closest(".remove-employee")) {
      employees = employees.filter((item) => item.key !== employee.key);
      if (!employees.length) employees.push(makeEmployee());
      renderEmployees();
    }
  });

  document.querySelector("#add-employee").addEventListener("click", () => {
    const employee = makeEmployee();
    employees.push(employee);
    renderEmployees();
    elements.employeeList.querySelector(`[data-employee-key="${employee.key}"] .employee-identification`)?.focus();
  });
  document.querySelector("#load-example").addEventListener("click", loadExample);
  document.querySelector("#download").addEventListener("click", downloadExcel);
  document.querySelector("#clear-all").addEventListener("click", clearAll);
  elements.personnelSearch.addEventListener("input", renderPersonnel);
  elements.personnelList.addEventListener("click", (event) => {
    const row = event.target.closest(".personnel-row");
    if (!row) return;
    if (event.target.closest(".use-personnel")) usePerson(row.dataset.identification);
  });
  elements.start.addEventListener("change", updateSummary);
  elements.end.addEventListener("change", updateSummary);

  loadPersonnel();
  loadState();
  renderEmployees();
  renderPersonnel();
  registerWebMcp();
})();
