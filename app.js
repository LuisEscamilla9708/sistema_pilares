"use strict";

/* ==========================================
   PILARES CDMX
   SISTEMA DE REGISTRO DE VISITAS
   FRONTEND DE DEMOSTRACIÓN
========================================== */

const STORAGE_KEY = "pilares_demo_v1";
const SESSION_KEY = "pilares_session_v1";

const DEMO_USERS = {
    docente: {
        password: "demo123",
        name: "María López",
        role: "docente",
        area: "Ciberescuela"
    },
    admin: {
        password: "demo123",
        name: "Coordinación",
        role: "admin",
        area: null
    }
};

const DEFAULT_AREAS = [
    "Ciberescuela",
    "Cultura",
    "Deporte",
    "Autonomía Económica"
];

const MENU_DOCENTE = [
    ["Inicio", "dashboard", "⌂"],
    ["Alumnos y usuarios", "alumnos", "♙"],
    ["Registro de visitas", "registro", "▣"],
    ["Entradas y salidas", "movimientos", "⇄"],
    ["Asistencias", "asistencias", "✓"],
    ["Historial", "historial", "◷"],
    ["Estadísticas", "estadisticas", "▥"],
    ["Reportes", "reportes", "▤"],
    ["Configuración", "configuracion", "⚙"]
];

const MENU_ADMIN = [
    ["Inicio", "dashboard", "⌂"],
    ["Todas las áreas", "areas", "▦"],
    ["Todos los usuarios", "alumnos", "♙"],
    ["Visitas generales", "movimientos", "⇄"],
    ["Estadísticas", "estadisticas", "▥"],
    ["Reportes", "reportes", "▤"],
    ["Gestión de cuentas", "cuentas", "⚙"],
    ["Permisos", "permisos", "◇"],
    ["Bitácora", "bitacora", "▤"]
];

const $ = id => document.getElementById(id);

let db = loadDatabase();
let session = loadSession();
let currentPage = "dashboard";
let charts = [];
let selectedStudent = null;

/* ==========================================
   DATOS DE DEMOSTRACIÓN
========================================== */

function defaultDatabase() {
    return {
        areas: [...DEFAULT_AREAS],

        students: [
            {
                folio: "PIL-000101",
                name: "Ana García",
                area: "Ciberescuela",
                workshop: "Computación básica",
                active: true
            },
            {
                folio: "PIL-000102",
                name: "Carlos López",
                area: "Ciberescuela",
                workshop: "Computación básica",
                active: true
            },
            {
                folio: "PIL-000103",
                name: "Elena Díaz",
                area: "Cultura",
                workshop: "Música",
                active: true
            },
            {
                folio: "PIL-000104",
                name: "Miguel Torres",
                area: "Deporte",
                workshop: "Acondicionamiento físico",
                active: true
            },
            {
                folio: "PIL-000105",
                name: "Sofía Martínez",
                area: "Autonomía Económica",
                workshop: "Emprendimiento",
                active: true
            }
        ],

        visits: [],
        audit: []
    };
}

function loadDatabase() {
    try {
        const saved = JSON.parse(
            localStorage.getItem(STORAGE_KEY)
        );

        if (
            saved &&
            Array.isArray(saved.students) &&
            Array.isArray(saved.visits)
        ) {
            saved.areas ||= [...DEFAULT_AREAS];
            saved.audit ||= [];
            return saved;
        }
    } catch (error) {
        console.warn("Datos locales no válidos", error);
    }

    return defaultDatabase();
}

function saveDatabase() {
    localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(db)
    );
}

function loadSession() {
    try {
        return JSON.parse(
            sessionStorage.getItem(SESSION_KEY)
        );
    } catch {
        return null;
    }
}

function saveSession() {
    if (session) {
        sessionStorage.setItem(
            SESSION_KEY,
            JSON.stringify(session)
        );
    } else {
        sessionStorage.removeItem(SESSION_KEY);
    }
}

function addAudit(action, detail) {
    db.audit.unshift({
        date: new Date().toISOString(),
        user: session?.name || "Sistema QR",
        action,
        detail
    });

    db.audit = db.audit.slice(0, 200);
    saveDatabase();
}

/* ==========================================
   FUNCIONES GENERALES
========================================== */

function escapeHTML(value) {
    return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#39;");
}

function formatDate(value) {
    return new Date(value).toLocaleDateString(
        "es-MX",
        {
            day: "2-digit",
            month: "2-digit",
            year: "numeric"
        }
    );
}

function formatTime(value) {
    if (!value) return "Pendiente";

    return new Date(value).toLocaleTimeString(
        "es-MX",
        {
            hour: "2-digit",
            minute: "2-digit",
            hour12: false
        }
    );
}

function dateKey(value) {
    const date = new Date(value);

    return [
        date.getFullYear(),
        String(date.getMonth() + 1).padStart(2, "0"),
        String(date.getDate()).padStart(2, "0")
    ].join("-");
}

function todayKey() {
    return dateKey(new Date());
}

function durationMinutes(start, end) {
    if (!start || !end) return null;

    return Math.max(
        0,
        Math.floor(
            (new Date(end) - new Date(start)) / 60000
        )
    );
}

function formatDuration(minutes) {
    if (minutes === null) return "Pendiente";

    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;

    return `${hours}h ${mins}m`;
}

function visibleStudents() {
    if (!session) return [];

    if (session.role === "admin") {
        return db.students;
    }

    return db.students.filter(
        student => student.area === session.area
    );
}

function visibleVisits() {
    const folios = new Set(
        visibleStudents().map(student => student.folio)
    );

    return db.visits.filter(
        visit => folios.has(visit.folio)
    );
}

function findStudent(folio) {
    return db.students.find(
        student => student.folio === folio
    );
}

function studentName(folio) {
    return findStudent(folio)?.name || "Desconocido";
}

function studentArea(folio) {
    return findStudent(folio)?.area || "Sin área";
}

function statusBadge(text, type = "active") {
    return `<span class="status status-${type}">
        ${escapeHTML(text)}
    </span>`;
}

function pageCard(content) {
    return `<div class="content-card">${content}</div>`;
}

function emptyState(message) {
    return `<div class="text-center text-muted p-4">
        ${escapeHTML(message)}
    </div>`;
}

function notify(message) {
    alert(message);
}

/* ==========================================
   PANTALLAS PÚBLICAS
========================================== */

function showWelcome() {
    $("welcome").classList.remove("d-none");
    $("login").classList.add("d-none");
    $("application").classList.add("d-none");

    setTimeout(() => $("qrInput")?.focus(), 50);
}

function showLogin() {
    $("welcome").classList.add("d-none");
    $("login").classList.remove("d-none");
    $("application").classList.add("d-none");

    $("loginError").classList.add("d-none");
    $("username").focus();
}

function showApplication() {
    $("welcome").classList.add("d-none");
    $("login").classList.add("d-none");
    $("application").classList.remove("d-none");

    $("userLabel").textContent = session.name;
    $("todayLabel").textContent =
        new Date().toLocaleDateString("es-MX");

    buildMenu();
    navigate("dashboard");
}

/* ==========================================
   LOGIN Y CIERRE DE SESIÓN
========================================== */

function login(event) {
    event.preventDefault();

    const username = $("username").value.trim();
    const password = $("password").value;

    const user = DEMO_USERS[username];

    if (!user || user.password !== password) {
        $("loginError").classList.remove("d-none");
        return;
    }

    session = {
        username,
        name: user.name,
        role: user.role,
        area: user.area
    };

    saveSession();

    $("password").value = "";
    showApplication();
}

function logout() {
    session = null;
    saveSession();

    charts.forEach(chart => chart.destroy());
    charts = [];

    showWelcome();
}

/* ==========================================
   REGISTRO AUTOMÁTICO MEDIANTE QR
========================================== */

function simulateScan() {
    const input = $("qrInput");
    const folio = input.value.trim();

    if (!folio) {
        showScanResult(
            "Introduce o escanea un folio",
            "pending"
        );
        return;
    }

    const student = findStudent(folio);

    if (!student) {
        showScanResult(
            "Folio no registrado",
            "error"
        );
        input.value = "";
        input.focus();
        return;
    }

    if (!student.active) {
        showScanResult(
            "El alumno está inactivo",
            "error"
        );
        input.value = "";
        input.focus();
        return;
    }

    const now = new Date().toISOString();

    const openVisit = db.visits.find(
        visit =>
            visit.folio === folio &&
            !visit.exit
    );

    let action;

    if (openVisit) {
        const minutes = durationMinutes(
            openVisit.entry,
            now
        );

        // Evita que un escaneo accidental inmediato
        // se interprete como salida.
        if (minutes < 1) {
            showScanResult(
                `${student.name}: entrada ya registrada`,
                "pending"
            );
            input.value = "";
            input.focus();
            return;
        }

        openVisit.exit = now;
        action = "Salida";

        showScanResult(
            `¡Hasta pronto, ${student.name}! Salida registrada.`,
            "success"
        );
    } else {
        db.visits.unshift({
            id: crypto.randomUUID(),
            folio,
            entry: now,
            exit: null
        });

        action = "Entrada";

        showScanResult(
            `¡Bienvenido, ${student.name}! Entrada registrada.`,
            "success"
        );
    }

    saveDatabase();
    addAudit(action, `Folio ${folio}`);

    input.value = "";
    input.focus();
}

function showScanResult(message, type) {
    const result = $("scanResult");

    const symbol =
        type === "success" ? "✓" :
        type === "error" ? "✕" : "!";

    const color =
        type === "success" ? "#16865D" :
        type === "error" ? "#B42335" : "#B78015";

    result.innerHTML = `
        <span class="result-check"
              style="color:${color}">
            ${symbol}
        </span>

        <h5>${escapeHTML(message)}</h5>

        <small>Registro de demostración</small>
    `;
}

function cameraInfo() {
    notify(
        "La lectura mediante cámara todavía no está implementada. " +
        "Puedes utilizar el lector QR inalámbrico si funciona " +
        "como teclado, o escribir el folio para probar."
    );
}

/* ==========================================
   MENÚ Y NAVEGACIÓN
========================================== */

function buildMenu() {
    const menu = session.role === "admin"
        ? MENU_ADMIN
        : MENU_DOCENTE;

    $("sideNav").innerHTML = menu.map(
        ([label, page, icon]) => `
            <button
                type="button"
                class="side-link"
                data-page="${page}"
                onclick="navigate('${page}')"
            >
                <span aria-hidden="true">${icon}</span>
                <span>${label}</span>
            </button>
        `
    ).join("");
}

function navigate(page) {
    if (!session) {
        showLogin();
        return;
    }

    const allowed = (
        session.role === "admin"
            ? MENU_ADMIN
            : MENU_DOCENTE
    ).map(item => item[1]);

    if (!allowed.includes(page)) {
        return;
    }

    currentPage = page;

    document.querySelectorAll(
        "#sideNav .side-link"
    ).forEach(button => {
        button.classList.toggle(
            "active",
            button.dataset.page === page
        );
    });

    const titles = {
        dashboard: "Inicio",
        alumnos: "Alumnos y usuarios",
        registro: "Registro de visitas",
        movimientos: "Entradas y salidas",
        asistencias: "Asistencias",
        historial: "Historial",
        estadisticas: "Estadísticas",
        reportes: "Reportes",
        configuracion: "Configuración",
        areas: "Todas las áreas",
        cuentas: "Gestión de cuentas",
        permisos: "Permisos",
        bitacora: "Bitácora"
    };

    $("pageTitle").textContent = titles[page] || page;

    $("pageSubtitle").textContent =
        session.role === "admin"
            ? "Administrador general · PILARES Tepalcates"
            : `PILARES Tepalcates · ${session.area}`;

    charts.forEach(chart => chart.destroy());
    charts = [];

    const pages = {
        dashboard: renderDashboard,
        alumnos: renderStudents,
        registro: renderRegistration,
        movimientos: renderMovements,
        asistencias: renderAttendance,
        historial: renderHistory,
        estadisticas: renderStatistics,
        reportes: renderReports,
        configuracion: renderSettings,
        areas: renderAreas,
        cuentas: renderAccounts,
        permisos: renderPermissions,
        bitacora: renderAudit
    };

    $("pageContent").innerHTML = pages[page]();

    if (
        page === "dashboard" ||
        page === "estadisticas"
    ) {
        drawCharts();
    }

    $("sidebar").classList.remove("open");
}

function toggleMenu() {
    $("sidebar").classList.toggle("open");
}

/* ==========================================
   DASHBOARD
========================================== */

function statCard(title, value, icon) {
    return `
        <div class="stat-card">
            <div class="stat-icon">${icon}</div>
            <h4>${escapeHTML(title)}</h4>
            <div class="stat-number">${value}</div>
            <small>Datos de demostración</small>
        </div>
    `;
}

function renderDashboard() {
    const students = visibleStudents();
    const visits = visibleVisits();

    const today = visits.filter(
        visit => dateKey(visit.entry) === todayKey()
    );

    const exits = today.filter(visit => visit.exit);
    const pending = visits.filter(visit => !visit.exit);

    return `
        <h3 class="mb-4">
            ${session.role === "admin"
                ? "Administrador general"
                : "Panel del área"}
        </h3>

        <div class="dashboard-grid">
            ${statCard(
                "Total de alumnos registrados",
                students.length,
                "♙"
            )}

            ${statCard(
                "Visitas del día",
                today.length,
                "▣"
            )}

            ${statCard(
                "Entradas registradas",
                today.length,
                "→"
            )}

            ${statCard(
                "Salidas registradas",
                exits.length,
                "←"
            )}

            ${statCard(
                "Personas con salida pendiente",
                pending.length,
                "◷"
            )}

            ${statCard(
                "Alumnos activos",
                students.filter(s => s.active).length,
                "✓"
            )}
        </div>

        <div class="chart-grid">
            <div class="chart-card">
                <h3>Asistencia semanal</h3>
                <div class="chart-container">
                    <canvas id="weeklyChart"></canvas>
                </div>
            </div>

            <div class="chart-card">
                <h3>Tendencia mensual</h3>
                <div class="chart-container">
                    <canvas id="monthlyChart"></canvas>
                </div>
            </div>
        </div>
    `;
}

/* ==========================================
   ALUMNOS Y USUARIOS
========================================== */

function renderStudents() {
    return `
        <div class="d-flex flex-wrap gap-3
                    justify-content-between mb-4">

            <h3>Alumnos y usuarios</h3>

            <button class="btn btn-wine"
                    onclick="openStudentModal()">
                + Agregar alumno
            </button>
        </div>

        <div class="table-card">

            <div class="filters-bar">
                <input
                    id="studentSearch"
                    class="form-control search-input"
                    placeholder="Buscar nombre o folio"
                    oninput="updateStudentTable()"
                >

                <select
                    id="studentStatus"
                    class="form-select"
                    style="max-width:180px"
                    onchange="updateStudentTable()"
                >
                    <option value="all">Todos</option>
                    <option value="active">Activos</option>
                    <option value="inactive">Inactivos</option>
                </select>
            </div>

            <div class="table-responsive">
                <table class="table">
                    <thead>
                        <tr>
                            <th>Nombre completo</th>
                            <th>Folio QR</th>
                            <th>Área</th>
                            <th>Taller</th>
                            <th>Estado</th>
                            <th>Acciones</th>
                        </tr>
                    </thead>
                    <tbody id="studentsTable"></tbody>
                </table>
            </div>
        </div>
    `;
}

function updateStudentTable() {
    const query = (
        $("studentSearch")?.value || ""
    ).toLowerCase();

    const status = $("studentStatus")?.value || "all";

    const students = visibleStudents().filter(student => {
        const matchesQuery =
            student.name.toLowerCase().includes(query) ||
            student.folio.toLowerCase().includes(query);

        const matchesStatus =
            status === "all" ||
            (status === "active" && student.active) ||
            (status === "inactive" && !student.active);

        return matchesQuery && matchesStatus;
    });

    $("studentsTable").innerHTML = students.length
        ? students.map(student => `
            <tr>
                <td>${escapeHTML(student.name)}</td>
                <td>${escapeHTML(student.folio)}</td>
                <td>${escapeHTML(student.area)}</td>
                <td>${escapeHTML(student.workshop)}</td>
                <td>
                    ${statusBadge(
                        student.active ? "Activo" : "Inactivo",
                        student.active ? "active" : "inactive"
                    )}
                </td>
                <td>
                    <div class="d-flex flex-wrap gap-2">
                        <button class="btn btn-sm btn-wine"
                            onclick="showStudentProfile(
                                '${encodeURIComponent(student.folio)}'
                            )">
                            Perfil
                        </button>

                        <button class="btn btn-sm btn-outline-secondary"
                            onclick="openStudentModal(
                                '${encodeURIComponent(student.folio)}'
                            )">
                            Editar
                        </button>

                        <button class="btn btn-sm btn-outline-danger"
                            onclick="toggleStudent(
                                '${encodeURIComponent(student.folio)}'
                            )">
                            ${student.active ? "Baja" : "Activar"}
                        </button>
                    </div>
                </td>
            </tr>
        `).join("")
        : `<tr><td colspan="6">
            ${emptyState("No se encontraron alumnos")}
        </td></tr>`;
}

function openStudentModal(encodedFolio = "") {
    const folio = decodeURIComponent(encodedFolio);
    const student = folio ? findStudent(folio) : null;

    if (
        student &&
        !visibleStudents().some(s => s.folio === folio)
    ) {
        return;
    }

    $("modalTitle").textContent =
        student ? "Editar alumno" : "Registrar alumno";

    $("recordIndex").value = student?.folio || "";
    $("recordFolio").value = student?.folio || "";
    $("recordName").value = student?.name || "";
    $("recordWorkshop").value = student?.workshop || "";

    $("recordFolio").readOnly = Boolean(student);

    const areas = session.role === "admin"
        ? db.areas
        : [session.area];

    $("recordArea").innerHTML = areas.map(area => `
        <option value="${escapeHTML(area)}">
            ${escapeHTML(area)}
        </option>
    `).join("");

    $("recordArea").value =
        student?.area || areas[0];

    bootstrap.Modal.getOrCreateInstance(
        $("editModal")
    ).show();
}

function saveStudent(event) {
    event.preventDefault();

    if (!session) return;

    const oldFolio = $("recordIndex").value;
    const folio = $("recordFolio").value.trim();
    const name = $("recordName").value.trim();
    const area = $("recordArea").value;
    const workshop = $("recordWorkshop").value.trim();

    if (!folio || !name || !workshop) {
        notify("Completa todos los campos.");
        return;
    }

    if (
        session.role !== "admin" &&
        area !== session.area
    ) {
        notify("No tienes permiso para modificar esta área.");
        return;
    }

    if (oldFolio) {
        const student = findStudent(oldFolio);
        if (!student) return;

        student.name = name;
        student.area = area;
        student.workshop = workshop;

        addAudit("Editar alumno", folio);
    } else {
        if (findStudent(folio)) {
            notify("Este folio ya existe.");
            return;
        }

        db.students.push({
            folio,
            name,
            area,
            workshop,
            active: true
        });

        addAudit("Agregar alumno", folio);
    }

    saveDatabase();

    bootstrap.Modal.getInstance(
        $("editModal")
    ).hide();

    navigate("alumnos");
}

function toggleStudent(encodedFolio) {
    const folio = decodeURIComponent(encodedFolio);
    const student = findStudent(folio);

    if (!student) return;

    if (
        session.role !== "admin" &&
        student.area !== session.area
    ) {
        return;
    }

    const action = student.active
        ? "dar de baja"
        : "activar";

    if (!confirm(`¿Deseas ${action} a ${student.name}?`)) {
        return;
    }

    student.active = !student.active;

    addAudit("Cambiar estado", folio);
    saveDatabase();
    navigate("alumnos");
}

/* ==========================================
   PERFIL INDIVIDUAL
========================================== */

function showStudentProfile(encodedFolio) {
    const folio = decodeURIComponent(encodedFolio);

    const student = visibleStudents().find(
        s => s.folio === folio
    );

    if (!student) return;

    selectedStudent = folio;

    const visits = visibleVisits().filter(
        visit => visit.folio === folio
    );

    $("pageTitle").textContent =
        "Perfil e historial individual";

    $("pageContent").innerHTML = `
        <div class="profile-header">
            <div class="profile-avatar">♙</div>

            <div class="profile-info">
                <h2>${escapeHTML(student.name)}</h2>

                <p><b>Folio:</b>
                    ${escapeHTML(student.folio)}
                </p>

                <p><b>Área:</b>
                    ${escapeHTML(student.area)}
                </p>

                <p><b>Taller:</b>
                    ${escapeHTML(student.workshop)}
                </p>

                ${statusBadge(
                    student.active ? "Activo" : "Inactivo",
                    student.active ? "active" : "inactive"
                )}
            </div>
        </div>

        <div class="table-card">
            <h3>Historial de visitas</h3>

            <div class="table-responsive">
                <table class="table">
                    <thead>
                        <tr>
                            <th>Fecha</th>
                            <th>Entrada</th>
                            <th>Salida</th>
                            <th>Duración</th>
                        </tr>
                    </thead>

                    <tbody>
                        ${visits.map(visit => `
                            <tr>
                                <td>${formatDate(visit.entry)}</td>
                                <td>${formatTime(visit.entry)}</td>
                                <td>${formatTime(visit.exit)}</td>
                                <td>
                                    ${formatDuration(
                                        durationMinutes(
                                            visit.entry,
                                            visit.exit
                                        )
                                    )}
                                </td>
                            </tr>
                        `).join("") || `
                            <tr>
                                <td colspan="4">
                                    Sin visitas registradas
                                </td>
                            </tr>
                        `}
                    </tbody>
                </table>
            </div>
        </div>

        <button class="btn btn-wine mt-3"
                onclick="navigate('alumnos')">
            Volver a alumnos
        </button>
    `;
}

/* ==========================================
   REGISTRO Y MOVIMIENTOS
========================================== */

function renderRegistration() {
    return pageCard(`
        <h3>Registro de visitas</h3>

        <p>
            El registro público se realiza mediante
            el QR de la credencial existente.
        </p>

        <p>
            Los movimientos se almacenan localmente
            en esta demostración.
        </p>

        <button class="btn btn-wine"
                onclick="navigate('movimientos')">
            Ver entradas y salidas
        </button>
    `);
}

function renderMovements() {
    const visits = visibleVisits();

    return `
        <h3 class="mb-4">
            Historial de entradas y salidas
        </h3>

        <div class="table-card">
            <div class="table-responsive">
                <table class="table">
                    <thead>
                        <tr>
                            <th>Alumno</th>
                            <th>Área</th>
                            <th>Fecha</th>
                            <th>Entrada</th>
                            <th>Salida</th>
                            <th>Permanencia</th>
                            <th>Estado</th>
                        </tr>
                    </thead>

                    <tbody>
                        ${visits.map(visit => `
                            <tr>
                                <td>
                                    ${escapeHTML(
                                        studentName(visit.folio)
                                    )}
                                </td>
                                <td>
                                    ${escapeHTML(
                                        studentArea(visit.folio)
                                    )}
                                </td>
                                <td>${formatDate(visit.entry)}</td>
                                <td>${formatTime(visit.entry)}</td>
                                <td>${formatTime(visit.exit)}</td>
                                <td>
                                    ${formatDuration(
                                        durationMinutes(
                                            visit.entry,
                                            visit.exit
                                        )
                                    )}
                                </td>
                                <td>
                                    ${visit.exit
                                        ? statusBadge(
                                            "Completada",
                                            "success"
                                        )
                                        : statusBadge(
                                            "Salida pendiente",
                                            "pending"
                                        )}
                                </td>
                            </tr>
                        `).join("") || `
                            <tr>
                                <td colspan="7">
                                    Sin movimientos registrados
                                </td>
                            </tr>
                        `}
                    </tbody>
                </table>
            </div>
        </div>
    `;
}

/* ==========================================
   ASISTENCIAS
========================================== */

function renderAttendance() {
    return pageCard(`
        <h3>Asistencias por taller</h3>

        <p>
            Esta pantalla mostrará las asistencias
            calculadas automáticamente según:
        </p>

        <ul>
            <li>Folio del alumno.</li>
            <li>Inscripción a uno o varios talleres.</li>
            <li>Días y horarios de clase.</li>
            <li>Hora de entrada y salida de PILARES.</li>
            <li>Porcentaje de permanencia.</li>
        </ul>

        <div class="alert alert-warning">
            Pendiente: implementar horarios,
            inscripciones múltiples y cálculo
            automático por clase.
        </div>
    `);
}

function renderHistory() {
    return renderMovements();
}

/* ==========================================
   ESTADÍSTICAS Y GRÁFICAS
========================================== */

function renderStatistics() {
    const visits = visibleVisits();
    const completed = visits.filter(v => v.exit);

    const durations = completed.map(v =>
        durationMinutes(v.entry, v.exit)
    );

    const average = durations.length
        ? Math.round(
            durations.reduce((a, b) => a + b, 0) /
            durations.length
        )
        : 0;

    return `
        <h3 class="mb-4">Estadísticas y reportes</h3>

        <div class="dashboard-grid">
            ${statCard(
                "Visitas totales",
                visits.length,
                "▣"
            )}

            ${statCard(
                "Visitas completadas",
                completed.length,
                "✓"
            )}

            ${statCard(
                "Permanencia promedio",
                `${average} min`,
                "◷"
            )}
        </div>

        <div class="chart-grid">
            <div class="chart-card">
                <h3>Visitas por día</h3>
                <div class="chart-container">
                    <canvas id="weeklyChart"></canvas>
                </div>
            </div>

            <div class="chart-card">
                <h3>Visitas por mes</h3>
                <div class="chart-container">
                    <canvas id="monthlyChart"></canvas>
                </div>
            </div>
        </div>
    `;
}

function drawCharts() {
    if (typeof Chart === "undefined") return;

    const visits = visibleVisits();
    const now = new Date();

    const days = Array.from(
        { length: 7 },
        (_, index) => {
            const date = new Date(now);
            date.setDate(now.getDate() - (6 - index));
            return date;
        }
    );

    const dailyValues = days.map(day =>
        visits.filter(
            visit =>
                dateKey(visit.entry) === dateKey(day)
        ).length
    );

    const dayLabels = days.map(day =>
        day.toLocaleDateString("es-MX", {
            weekday: "short",
            day: "numeric"
        })
    );

    const months = Array.from(
        { length: 6 },
        (_, index) => new Date(
            now.getFullYear(),
            now.getMonth() - (5 - index),
            1
        )
    );

    const monthlyValues = months.map(month =>
        visits.filter(visit => {
            const date = new Date(visit.entry);

            return (
                date.getMonth() === month.getMonth() &&
                date.getFullYear() === month.getFullYear()
            );
        }).length
    );

    const monthLabels = months.map(month =>
        month.toLocaleDateString("es-MX", {
            month: "short",
            year: "2-digit"
        })
    );

    createChart(
        "weeklyChart",
        "bar",
        dayLabels,
        dailyValues
    );

    createChart(
        "monthlyChart",
        "line",
        monthLabels,
        monthlyValues
    );
}

function createChart(id, type, labels, values) {
    const canvas = $(id);

    if (!canvas || typeof Chart === "undefined") {
        return;
    }

    const chart = new Chart(canvas, {
        type,
        data: {
            labels,
            datasets: [{
                label: "Visitas",
                data: values,
                backgroundColor:
                    type === "bar"
                        ? "#980023"
                        : "rgba(152,0,35,.12)",
                borderColor: "#980023",
                borderWidth: 2,
                borderRadius:
                    type === "bar" ? 6 : 0,
                fill: type === "line",
                tension: .3
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        precision: 0
                    }
                }
            }
        }
    });

    charts.push(chart);
}

/* ==========================================
   REPORTES
========================================== */

function renderReports() {
    return pageCard(`
        <h3>Reportes de visitas</h3>

        <p>
            Exporta los movimientos visibles
            para tu usuario.
        </p>

        <button class="btn btn-green"
                onclick="exportCSV()">
            Exportar CSV
        </button>

        <p class="small text-muted mt-3">
            El archivo CSV puede abrirse en Excel.
            La exportación PDF se implementará después.
        </p>
    `);
}

function exportCSV() {
    const rows = [
        [
            "Folio",
            "Alumno",
            "Área",
            "Fecha",
            "Entrada",
            "Salida",
            "Duración (minutos)"
        ]
    ];

    visibleVisits().forEach(visit => {
        rows.push([
            visit.folio,
            studentName(visit.folio),
            studentArea(visit.folio),
            formatDate(visit.entry),
            formatTime(visit.entry),
            visit.exit ? formatTime(visit.exit) : "",
            durationMinutes(
                visit.entry,
                visit.exit
            ) ?? ""
        ]);
    });

    const csv = "\uFEFF" + rows.map(row =>
        row.map(value =>
            `"${String(value).replaceAll('"', '""')}"`
        ).join(",")
    ).join("\r\n");

    const blob = new Blob(
        [csv],
        { type: "text/csv;charset=utf-8;" }
    );

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = "reporte_pilares.csv";
    link.click();

    URL.revokeObjectURL(url);
}

/* ==========================================
   ADMINISTRACIÓN GENERAL
========================================== */

/* ==========================================
   ADMINISTRACIÓN GENERAL
========================================== */

function renderAreas() {
    if (session.role !== "admin") return "";

    return `
        <div class="d-flex justify-content-between
                    flex-wrap gap-3 mb-4">

            <h3>Gestión de áreas</h3>

            <button class="btn btn-wine"
                    onclick="addArea()">
                + Agregar área
            </button>
        </div>

        <div class="area-grid">
            ${db.areas.map(area => {
                const count = db.students.filter(
                    student => student.area === area
                ).length;

                return `
                    <div class="area-card">
                        <h3>${escapeHTML(area)}</h3>

                        <p>
                            <b>Alumnos registrados:</b>
                            ${count}
                        </p>

                        <p>
                            <b>Estado:</b> Activa
                        </p>
                    </div>
                `;
            }).join("")}
        </div>
    `;
}

function addArea() {
    if (session?.role !== "admin") return;

    const name = prompt("Nombre de la nueva área:");

    if (!name?.trim()) return;

    const area = name.trim();

    if (
        db.areas.some(
            existing =>
                existing.toLowerCase() === area.toLowerCase()
        )
    ) {
        notify("El área ya existe.");
        return;
    }

    db.areas.push(area);

    addAudit("Agregar área", area);
    saveDatabase();
    navigate("areas");
}

/* ==========================================
   GESTIÓN DE CUENTAS
========================================== */

function renderAccounts() {
    return pageCard(`
        <h3>Gestión de cuentas</h3>

        <p>
            Este módulo permitirá crear usuarios
            responsables y asignarles una o varias áreas.
        </p>

        <div class="alert alert-warning">
            En esta demostración existen dos cuentas
            fijas: docente y admin.
            Las cuentas reales se administrarán
            mediante Spring Security y MySQL.
        </div>
    `);
}

/* ==========================================
   PERMISOS
========================================== */

function renderPermissions() {
    return pageCard(`
        <h3>Permisos del sistema</h3>

        <table class="table">
            <thead>
                <tr>
                    <th>Función</th>
                    <th>Docente</th>
                    <th>Administrador</th>
                </tr>
            </thead>

            <tbody>
                <tr>
                    <td>Consultar su área</td>
                    <td>Sí</td>
                    <td>Sí</td>
                </tr>

                <tr>
                    <td>Consultar todas las áreas</td>
                    <td>No</td>
                    <td>Sí</td>
                </tr>

                <tr>
                    <td>Agregar alumnos</td>
                    <td>Su área</td>
                    <td>Todas</td>
                </tr>

                <tr>
                    <td>Consultar estadísticas</td>
                    <td>Su área</td>
                    <td>Todas</td>
                </tr>

                <tr>
                    <td>Administrar cuentas</td>
                    <td>No</td>
                    <td>Sí</td>
                </tr>
            </tbody>
        </table>

        <p class="text-muted small">
            Estos permisos son ilustrativos.
            La seguridad real deberá aplicarse
            en el servidor.
        </p>
    `);
}

/* ==========================================
   BITÁCORA
========================================== */

function renderAudit() {
    if (session.role !== "admin") return "";

    return `
        <div class="table-card">
            <h3>Bitácora de movimientos</h3>

            <div class="table-responsive">
                <table class="table">
                    <thead>
                        <tr>
                            <th>Fecha</th>
                            <th>Usuario</th>
                            <th>Acción</th>
                            <th>Detalle</th>
                        </tr>
                    </thead>

                    <tbody>
                        ${db.audit.map(item => `
                            <tr>
                                <td>
                                    ${formatDate(item.date)}
                                    ${formatTime(item.date)}
                                </td>

                                <td>
                                    ${escapeHTML(item.user)}
                                </td>

                                <td>
                                    ${escapeHTML(item.action)}
                                </td>

                                <td>
                                    ${escapeHTML(item.detail)}
                                </td>
                            </tr>
                        `).join("") || `
                            <tr>
                                <td colspan="4">
                                    Sin movimientos registrados
                                </td>
                            </tr>
                        `}
                    </tbody>
                </table>
            </div>
        </div>
    `;
}

/* ==========================================
   CONFIGURACIÓN
========================================== */

function renderSettings() {
    return pageCard(`
        <h3>Configuración</h3>

        <p>
            <b>Sede:</b> PILARES Tepalcates
        </p>

        <p>
            <b>Usuario:</b>
            ${escapeHTML(session.name)}
        </p>

        <p>
            <b>Rol:</b>
            ${escapeHTML(session.role)}
        </p>

        <p>
            <b>Área:</b>
            ${escapeHTML(session.area || "Todas")}
        </p>

        <div class="alert alert-info">
            Esta es una versión frontend
            de demostración.
            No existe conexión con MySQL.
        </div>
    `);
}

/* ==========================================
   EVENTOS INICIALES
========================================== */

document.addEventListener("DOMContentLoaded", () => {

    // Inicio de sesión
    $("loginForm").addEventListener(
        "submit",
        login
    );

    // Formulario para registrar alumnos
    $("recordForm").addEventListener(
        "submit",
        saveStudent
    );

    // Lector QR mediante teclado
    $("qrInput").addEventListener(
        "keydown",
        event => {
            if (event.key === "Enter") {
                event.preventDefault();
                simulateScan();
            }
        }
    );

    // Mostrar pantalla inicial
    if (session) {
        showApplication();
    } else {
        showWelcome();
    }

    // Actualizar fecha y hora
    setInterval(() => {
        if (session && $("todayLabel")) {
            $("todayLabel").textContent =
                new Date().toLocaleString("es-MX");
        }
    }, 60000);

    // Inicializar tabla al abrir alumnos
    const originalNavigate = navigate;

    window.navigate = function(page) {
        originalNavigate(page);

        if (page === "alumnos") {
            updateStudentTable();
        }
    };

});