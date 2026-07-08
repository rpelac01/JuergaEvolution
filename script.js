// ==========================================================================
// 🔥 1. CONEXIÓN A LA NUBE (FIREBASE)
// ==========================================================================
const firebaseConfig = {
  apiKey: "AIzaSyDYPbqh0-tLpwJK-hHXuG1fwABr-fkGXtA",
  authDomain: "juerga-civil-2026.firebaseapp.com",
  projectId: "juerga-civil-2026",
  storageBucket: "juerga-civil-2026.firebasestorage.app",
  messagingSenderId: "945369478500",
  appId: "1:945369478500:web:7eacbff81462189f46f671",
  measurementId: "G-X8LNCK1J29"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

function subirPuntuacion() {
    if (nombreJugador === "Desconocido") return; 
    db.collection("ranking").doc(nombreJugador).set({
        nombre: nombreJugador,
        nivelMaximo: maxNivelDesbloqueado + 1,
        cubatasTotales: estadisticasLogros.cubatasTotalesGanados || cubatas,
        fechaActualizacion: firebase.firestore.FieldValue.serverTimestamp()
    }, { merge: true }).catch((error) => console.log("Error de nube:", error));
}

// Sube los datos a internet cada 15 segundos
setInterval(subirPuntuacion, 15000);

// ==========================================================================
// 🎮 2. LÓGICA DEL JUEGO
// ==========================================================================
document.addEventListener('dblclick', function(e) { e.preventDefault(); }, { passive: false });
document.addEventListener('gesturestart', function(e) { e.preventDefault(); });

const board = document.getElementById('game-board');
const contadorCubatas = document.getElementById('contador-cubatas');
const levels = ['n1.png', 'n2.png', 'n3.png', 'n4.png', 'n5.png', 'n6.png', 'n7.png', 'n8.png', 'n9.png', 'n10.png', 'n11.png', 'n12.png','n125.png', 'n13.png', 'n14.png', 'n15.png', 'n16.png', 'n17.png', 'n18.png']; 

let cubatas = 0; let nivelAparicion = 0; 
let dragItem = null; let offsetX = 0; let offsetY = 0;
let maxNivelDesbloqueado = 0; 
let nombreJugador = "Desconocido";
let haPagadoEuro = false;
let fechaSimulada = null;

// MOTOR DE ECONOMÍA Y CASINO
let multiplicadorPasivo = 1;
let multiplicadorClic = 1; 
let casinoVIP = localStorage.getItem('casinoVIP') === 'true';
let fichasCasino = 0;

let regalosReclamados = { '2026-09-03': false, '2026-09-04': false, '2026-09-05': false, '2026-09-06': false, '2026-09-07': false, 'jefe_final': false };
let cuponesCanjeados = { '2026-09-03': false, '2026-09-04': false, '2026-09-05': false, '2026-09-06': false, '2026-09-07': false, 'jefe_final': false };
let cuponActivoTipo = ""; 

let estadisticasLogros = { cajasAbiertas: 0, vomitosLipiados: 0, frenesisActivados: 0, ansiasActivado: 0, cubatasTotalesGanados: 0 };
let logrosDesbloqueados = { 'calentamiento': false, 'estomago_hierro': false, 'lluvia_litros': false, 'tesorero_pena': false, 'vip_barra': false, 'frenesi_loco': false, 'el_ansias': false, 'la_resaca': false };

const infoLogros = {
    'calentamiento': { titulo: "🐣 El Calentamiento", desc: "Fusiona tus dos primeros colegas.", premio: 50 },
    'estomago_hierro': { titulo: "🤮 Estómago de Hierro", desc: "Limpia 50 vómitos manuales con el dedo.", premio: 300, meta: 50, campo: "vomitosLipiados" },
    'lluvia_litros': { titulo: "📦 Lluvia de Litros", desc: "Abre 100 cajas sorpresas del cielo.", premio: 1000, meta: 100, campo: "cajasAbiertas" },
    'tesorero_pena': { titulo: "💸 Tesorero de la Peña", desc: "Gana un total acumulado de 10.000 cubatas.", premio: 2000, meta: 10000, campo: "cubatasTotalesGanados" },
    'vip_barra': { titulo: "🧹 VIP de la Barra", desc: "Compra la mejora del Recoge-Vómito Xtreme.", premio: 505 },
    'frenesi_loco': { titulo: "🚀 Frenesí Descontrolado", desc: "Activa el Frenesí de Cajas 5 veces.", premio: 800, meta: 5, campo: "frenesisActivados" },
    'el_ansias': { titulo: "💥 El Ansias (Oculto)", desc: "Intenta abrir cajas con la pradera llena (20/20).", premio: 100, meta: 1, campo: "ansiasActivado" },
    'la_resaca': { titulo: "🛌 La Resaca", desc: "Vuelve al juego tras pasar 4 horas fuera.", premio: 500 }
};

function verificarLogro(id) {
    if (logrosDesbloqueados[id]) return; 
    let l = infoLogros[id]; let cumple = false;
    if (l.meta !== undefined) { if (estadisticasLogros[l.campo] >= l.meta) cumple = true; } else { cumple = true; }
    if (cumple) { logrosDesbloqueados[id] = true; ganarCubatas(l.premio); setTimeout(() => { alert(`🏆 ¡LOGRO DESBLOQUEADO! 🏆\n\n🎯 ${l.titulo}\n🎁 Premio: +${l.premio} 🍹 cubatas.`); }, 10); guardarPartida(); }
}

let juegoPausado = false;
let tiempoSpawnBase = 4000; let tiempoSpawnActual = 4000; let costeVelocidad = 50;
let tiempoRecogida = 5000; let costeLimpieza = 500; let tiempoPasivo = 3000; let costePasivo = 100;
let boostVelocidadActivo = false;
let intervalCajas; let intervalVomitar; let intervalRecoger; let intervalPasivo; let intervalGuardado;

function guardarPartida() {
    if (juegoPausado && !boostVelocidadActivo) return; 
    const amigosEnTablero = [];
    document.querySelectorAll('.friend').forEach(f => { amigosEnTablero.push({ level: f.dataset.level, x: f.style.left, y: f.style.top }); });
    const estadoJuego = {
        nombre: nombreJugador, cubatas: cubatas, maxNivelDesbloqueado: maxNivelDesbloqueado, haPagadoEuro: haPagadoEuro,
        fichasCasino: fichasCasino, // Guardamos fichas de casino
        regalosReclamados: regalosReclamados, cuponesCanjeados: cuponesCanjeados, estadisticasLogros: estadisticasLogros, logrosDesbloqueados: logrosDesbloqueados, 
        tiempoSpawnBase: tiempoSpawnBase, costeVelocidad: costeVelocidad, tiempoRecogida: tiempoRecogida, costeLimpieza: costeLimpieza, tiempoPasivo: tiempoPasivo, costePasivo: costePasivo, amigos: amigosEnTablero, timeStamp: Date.now() 
    };
    localStorage.setItem('juergaSave2026', JSON.stringify(estadoJuego));
}

function cargarPartida() {
    const guardado = localStorage.getItem('juergaSave2026');
    if (guardado) {
        const estadoJuego = JSON.parse(guardado);
        nombreJugador = estadoJuego.nombre || "Desconocido"; cubatas = estadoJuego.cubatas || 0; maxNivelDesbloqueado = estadoJuego.maxNivelDesbloqueado || 0; haPagadoEuro = estadoJuego.haPagadoEuro || false;
        fichasCasino = estadoJuego.fichasCasino || 0;
        regalosReclamados = estadoJuego.regalosReclamados || regalosReclamados; cuponesCanjeados = estadoJuego.cuponesCanjeados || cuponesCanjeados;
        estadisticasLogros = estadoJuego.estadisticasLogros || estadisticasLogros; logrosDesbloqueados = estadoJuego.logrosDesbloqueados || logrosDesbloqueados;
        tiempoSpawnBase = estadoJuego.tiempoSpawnBase || 4000; tiempoSpawnActual = tiempoSpawnBase; costeVelocidad = estadoJuego.costeVelocidad || 50; tiempoRecogida = estadoJuego.tiempoRecogida || 5000; costeLimpieza = estadoJuego.costeLimpieza || 500; tiempoPasivo = estadoJuego.tiempoPasivo || 3000; costePasivo = estadoJuego.costePasivo || 100;
        document.getElementById('coste-vel').innerText = costeVelocidad; document.getElementById('coste-limpieza').innerText = costeLimpieza; document.getElementById('coste-pasivo').innerText = costePasivo;
        if (estadoJuego.amigos && estadoJuego.amigos.length > 0) { estadoJuego.amigos.forEach(a => { createFriend(parseInt(a.level), parseFloat(a.x), parseFloat(a.y)); }); } else { spawnAmigoInicial(); }
        if (estadoJuego.timeStamp) {
            const tiempoFueraMs = Date.now() - estadoJuego.timeStamp; const tiempoFueraSegundos = tiempoFueraMs / 1000; if (tiempoFueraSegundos >= 14400) { verificarLogro('la_resaca'); }
            let ingresosPorBucle = 0; document.querySelectorAll('.friend').forEach(f => { ingresosPorBucle += (parseInt(f.dataset.level) + 1); });
            let cubatasGanadosOffline = Math.floor((ingresosPorBucle / (tiempoPasivo / 1000)) * tiempoFueraSegundos); if (cubatasGanadosOffline > 3000) cubatasGanadosOffline = 3000;
            let cajasNuevasOffline = Math.floor(tiempoFueraMs / tiempoSpawnActual); if (cajasNuevasOffline > 10) cajasNuevasOffline = 10;
            if (cubatasGanadosOffline > 0 || cajasNuevasOffline > 0) { cubatas += cubatasGanadosOffline; estadisticasLogros.cubatasTotalesGanados += cubatasGanadosOffline; setTimeout(() => { alert(`🍻 ¡DE VUELTA!\nTus colegas produjeron:\n🍹 +${cubatasGanadosOffline} cubatas\n📦 +${cajasNuevasOffline} cajas`); for (let i = 0; i < cajasNuevasOffline; i++) { crearCajaOffline(); } }, 600); }
        }
    } else { spawnAmigoInicial(); pedirNombre(); }
    ganarCubatas(0); 
}

function spawnAmigoInicial() { const xCentro = (window.innerWidth / 2) - 45; const yCentro = (window.innerHeight / 2) - 45; createFriend(0, xCentro, yCentro); }

function pedirNombre() { 
    let nombre = prompt("Cambiar Nombre / Introducir Código Secreto:"); if (!nombre || nombre.trim() === "") return;
    let nomCode = nombre.toUpperCase().trim();
    if (nomCode === "DINERO") { ganarCubatas(50000); alert("🛠️ ADMIN: +50.000 Cubatas."); return; }
    if (nomCode === "VIP") { haPagadoEuro = true; guardarPartida(); alert("🛠️ ADMIN: Pase VIP de 1€ forzado."); return; }
    if (nomCode === "MAXIMO") { maxNivelDesbloqueado = 11; const xC = (board.clientWidth / 2) - 45; const yC = (board.clientHeight / 2) - 45; createFriend(11, xC, yC); alert("🛠️ ADMIN: Desbloqueado Nivel 12."); actualizaEstilosExtremos(); return; }
    nombreJugador = nomCode.substring(0, 15); guardarPartida(); 
}

function cambiarNombre() { pedirNombre(); if(nombreJugador !== "Desconocido") alert("Nombre actualizado a: " + nombreJugador); }
function borrarPartida() { if(confirm("¿Seguro que quieres borrar todo el progreso?")) { localStorage.removeItem('juergaSave2026'); location.reload(); } }

function efectoGastoVisual(event, coste) {
    const flotante = document.createElement('div');
    flotante.className = 'texto-flotante-arcade';
    flotante.innerText = '-' + coste;
    flotante.style.left = (event.clientX - 10) + 'px';
    flotante.style.top = (event.clientY - 20) + 'px';
    document.body.appendChild(flotante);
    setTimeout(() => { flotante.remove(); }, 800);
}
function actualizaEstilosExtremos() {
    const btn1 = document.getElementById('btn-extremo-chupinazo');
    const btn2 = document.getElementById('btn-extremo-barralibre');
    if(btn1 && btn2) {
        if(maxNivelDesbloqueado >= 11) { 
            btn1.className = "btn-unlocked-extremo"; btn2.className = "btn-unlocked-extremo";
        } else {
            btn1.className = "btn-lock"; btn2.className = "btn-lock";
        }
    }
}

function abrirTienda() { pausarJuego(); ocultarTodosModales(); document.getElementById('shop-modal').classList.remove('oculto'); actualizarTiendaPersonajes(); actualizaEstilosExtremos(); }

// 🟢 BOOSTS NIVEL BAJO
function boostBajoRefresco() {
    if (cubatas >= 150) { 
        cubatas -= 150; ganarCubatas(0); cerrarModales();
        multiplicadorClic = 3;
        crearCronometroFlotante('refresco-banner', '🥤 CLIC x3', 10);
        setTimeout(() => { multiplicadorClic = 1; }, 10000);
        guardarPartida();
    } else alert("¡Te faltan cubatas!");
}
function boostBajoTapa() {
    if (cubatas >= 250) { 
        cubatas -= 250; ganarCubatas(0); cerrarModales();
        for(let i = 0; i < 3; i++) setTimeout(crearCajaInstantanea, i*200); 
    } else alert("¡Te faltan cubatas!");
}
function crearCajaInstantanea() {
    const caja = document.createElement('div'); caja.classList.add('caja'); caja.style.transition = "none";
    const randomX = Math.random() * (board.clientWidth - 95); caja.style.left = `${randomX}px`; caja.style.top = `${board.clientHeight * 0.72}px`;
    board.appendChild(caja);
    caja.addEventListener('pointerdown', () => { if (document.querySelectorAll('.friend').length >= 20) { mostrarAvisoFlotante(parseFloat(caja.style.left), parseFloat(caja.style.top) - 20, "¡LLENO!"); return; } const rect = caja.getBoundingClientRect(); const boardRect = board.getBoundingClientRect(); caja.remove(); ganarCubatas(1 * multiplicadorClic); createFriend(nivelAparicion, rect.left - boardRect.left, rect.top - boardRect.top); estadisticasLogros.cajasAbiertas++; verificarLogro('lluvia_litros'); guardarPartida(); });
}

// 🟡 BOOSTS NIVEL MEDIO
function boostMedioCharanga() {
    if (cubatas >= 1200) {
        cubatas -= 1200; ganarCubatas(0); cerrarModales();
        multiplicadorPasivo = 3; crearCronometroFlotante('charanga-banner', '🎷 LA CHARANGA (X3)', 30);
        setTimeout(() => { multiplicadorPasivo = 1; }, 30000);
        guardarPartida();
    } else alert("¡Te faltan cubatas!");
}
function boostMedioBarril() {
    if (document.querySelectorAll('.friend').length >= 20) { alert("¡La pradera está llena!"); return; }
    if (cubatas >= 2000) { cubatas -= 2000; ganarCubatas(0); cerrarModales(); const xCentro = (board.clientWidth / 2) - 45; const yCentro = (board.clientHeight / 2) - 45; createFriend(3, xCentro, yCentro); guardarPartida(); } 
    else alert("¡Te faltan cubatas!");
}

// 🔥 BOOSTS ÉPICOS
function comprarHoraLoca() {
    if (boostVelocidadActivo) { alert("¡Frenesí ya activo!"); return; }
    if (cubatas >= 5000) { cubatas -= 5000; ganarCubatas(0); cerrarModales(); boostVelocidadActivo = true; let backupSpawn = tiempoSpawnActual; tiempoSpawnActual = 300; clearInterval(intervalCajas); intervalCajas = setInterval(crearCaja, tiempoSpawnActual); crearCronometroFlotante('frenesi-banner', '🌪️ HORA LOCA', 15); estadisticasLogros.frenesisActivados++; verificarLogro('frenesi_loco'); setTimeout(() => { boostVelocidadActivo = false; tiempoSpawnActual = backupSpawn; clearInterval(intervalCajas); if(!juegoPausado) intervalCajas = setInterval(crearCaja, tiempoSpawnActual); }, 15000); guardarPartida(); } 
    else alert("¡Te faltan cubatas!");
}
function comprarAmnesia() {
    let coste = 8500;
    if (cubatas >= coste) {
        cubatas -= coste;
        let cps = 0; document.querySelectorAll('.friend').forEach(f => { cps += (parseInt(f.dataset.level) + 1); });
        cps = (cps / (tiempoPasivo / 1000)) * multiplicadorPasivo;
        let gananciasInstantaneas = Math.floor(cps * 900); 
        ganarCubatas(gananciasInstantaneas);
        alert("⏳ ¡Amnesia! Has avanzado en el tiempo y ganado " + gananciasInstantaneas + " 🥃");
        cerrarModales();
    } else alert("¡Te faltan cubatas!");
}
function comprarAutobus() { if (document.querySelectorAll('.friend').length > 18) { alert("¡No hay espacio para 2!"); return; } if (cubatas >= 15000) { cubatas -= 15000; ganarCubatas(0); cerrarModales(); alert("🚌 ¡Llegó el autobús de refuerzos!"); for(let i = 0; i < 2; i++) { setTimeout(() => { const rX = Math.random() * (board.clientWidth - 95); const rY = Math.random() * (board.clientHeight - 150) + 50; createFriend(4, rX, rY); }, i * 400); } guardarPartida(); } else alert("¡Te faltan cubatas!"); }

// 💀 BOOSTS EXTREMOS 
function boostExtremoChupinazo() {
    if (maxNivelDesbloqueado < 11) { alert("🔒 BLOQUEADO: Requieres subir y desbloquear al menos un Juerguista de Nivel 12."); return; }
    if (document.querySelectorAll('.friend').length >= 20) { alert("¡Pradera llena!"); return; }
    if (cubatas >= 50000) {
        cubatas -= 50000; ganarCubatas(0); cerrarModales();
        const xC = (board.clientWidth / 2) - 45; const yC = (board.clientHeight / 2) - 45;
        createFriend(8, xC, yC); 
        guardarPartida();
    } else alert("¡Te faltan cubatas!");
}

function boostExtremoBarraLibre() {
    if (maxNivelDesbloqueado < 11) { alert("🔒 BLOQUEADO: Requieres al menos un Juerguista de Nivel 12."); return; }
    if (cubatas >= 120000) {
        cubatas -= 120000; ganarCubatas(0); cerrarModales();
        multiplicadorPasivo = 10; 
        crearCronometroFlotante('barralibre-banner', '👑 BARRA LIBRE x10', 30);
        setTimeout(() => { multiplicadorPasivo = 1; }, 30000);
        guardarPartida();
    } else alert("¡Te faltan cubatas!");
}

// ==========================================================================
// GESTIÓN MISIONES Y CHUPITOS
// ==========================================================================
const infoChupitos = [
    { id: '2026-09-03', titulo: "Día 1: El Chupitazo", req: "Juega el Jueves 3 de Septiembre" },
    { id: '2026-09-04', titulo: "Día 2: El Desmadre", req: "Juega el Viernes 4 de Septiembre" },
    { id: '2026-09-05', titulo: "Día 3: La Resaca", req: "Juega el Sábado 5 de Septiembre" },
    { id: '2026-09-06', titulo: "Día 4: El Bajón", req: "Juega el Domingo 6 de Septiembre" },
    { id: '2026-09-07', titulo: "Día 5: Lunes Tocho", req: "Juega el Lunes 7 de Septiembre" },
    { id: 'jefe_final', titulo: "Chupito Legendario", req: "Llega al Nivel 10 o superior" }
];

function obtenerFechaActualStr() { if (fechaSimulada) return fechaSimulada; let d = new Date(); let y = d.getFullYear(); let m = String(d.getMonth() + 1).padStart(2, '0'); let day = String(d.getDate()).padStart(2, '0'); return `${y}-${m}-${day}`; }
function abrirMenuChupitos() { ocultarTodosModales(); pausarJuego(); document.getElementById('chupitos-modal').classList.remove('oculto'); renderizarListaChupitos(); }

function renderizarListaChupitos() {
    const grid = document.getElementById('lista-chupitos-contenedor'); grid.innerHTML = ''; let hoyStr = obtenerFechaActualStr();
    infoChupitos.forEach(chupito => {
        let id = chupito.id; let yaReclamado = regalosReclamados[id]; let yaCanjeadoEnBar = cuponesCanjeados[id];
        let cumpleRequisito = (id === 'jefe_final') ? (maxNivelDesbloqueado >= 8) : (id === hoyStr || yaReclamado);
        let claseDia = "calendar-day"; let botonHTML = "";
        if (yaCanjeadoEnBar) { claseDia += " reclamado"; botonHTML = `<button class="btn-reclamar desactivado" disabled>✅ BEBIDO</button>`; } 
        else if (cumpleRequisito) { claseDia += " hoy"; if (yaReclamado) { botonHTML = `<button class="btn-reclamar" style="background:#ffaa00;" onclick="mostrarCuponFisico('${id}')">🎟️ VER CUPÓN</button>`; } else { botonHTML = `<button class="btn-reclamar" onclick="intentarReclamar('${id}')">💥 RECLAMAR</button>`; } } 
        else { botonHTML = `<button class="btn-reclamar desactivado" disabled>🔒</button>`; }
        grid.innerHTML += `<div class="${claseDia}"><div class="day-info"><h4>${chupito.titulo}</h4><p>${chupito.req}</p></div>${botonHTML}</div>`;
    });
}

function intentarReclamar(id) { if (!haPagadoEuro) { document.getElementById('pago-modal').classList.remove('oculto'); } else { concederPremio(id); } }
function cerrarPagoModal() { document.getElementById('pago-modal').classList.add('oculto'); }
function confirmarDonacion() { if(confirm("¿Seguro que ya has completado el pago en Stripe?")) { haPagadoEuro = true; guardarPartida(); cerrarPagoModal(); alert("🎉 ¡PASE VIP ACTIVADO!"); renderizarListaChupitos(); } }
function concederPremio(id) { regalosReclamados[id] = true; if (id === '2026-09-03') ganarCubatas(200); else if (id === '2026-09-04') ganarCubatas(500); else if (id === '2026-09-05') ganarCubatas(1000); else if (id === '2026-09-06') ganarCubatas(2000); else if (id === '2026-09-07') ganarCubatas(5000); else if (id === 'jefe_final') ganarCubatas(1000); guardarPartida(); renderizarListaChupitos(); alert(`🎉 ¡CUPÓN CONFIGURADO!`); }
function mostrarCuponFisico(id) { let titulo = infoChupitos.find(c => c.id === id).titulo; let codigo = `CH-${id.substring(8,10) || 'JF'}-${nombreJugador.substring(0,3)}-${Math.floor(Math.random()*89)+10}`; abrirCuponModal(id, titulo, codigo); }
function abrirCuponModal(tipo, descripcion, codigo) { cuponActivoTipo = tipo; document.getElementById('cupon-desc').innerText = descripcion; document.getElementById('cupon-codigo').innerText = codigo; document.getElementById('cupon-modal').classList.remove('oculto'); }
function cerrarCupon() { document.getElementById('cupon-modal').classList.add('oculto'); }
function quemarCupon() { if(confirm("🚨 ¿CAMARERO DE LA PEÑA?\n\n¿Quemas este cupón?")) { cuponesCanjeados[cuponActivoTipo] = true; guardarPartida(); cerrarCupon(); alert("✅ DESTRUIDO."); renderizarListaChupitos(); } }

// ==========================================================================
// CASINO Y TOTP DEL STAFF
// ==========================================================================
function abrirCasino() {
    cerrarModales(); 
    if (casinoVIP) {
        document.getElementById('casino-modal').classList.remove('oculto');
        document.getElementById('contador-fichas').innerText = fichasCasino;
    } else {
        document.getElementById('pago-casino-modal').classList.remove('oculto');
    }
}

function generarCodigoDinamico(offset = 0) {
    const ventanaTiempo = Math.floor(Date.now() / 20000) + offset;
    let semilla = 7351; 
    let codigo = ((ventanaTiempo + semilla) * 1234) % 10000;
    return codigo.toString().padStart(4, '0');
}

let intervaloCamarero;
function abrirPanelCamarero() {
    let pass = prompt("Contraseña Maestra de la Barra:");
    if (pass === "DeXTer_2007") { 
        cerrarModales();
        document.getElementById('camarero-modal').classList.remove('oculto');
        
        document.getElementById('codigo-vivo').innerText = generarCodigoDinamico();
        intervaloCamarero = setInterval(() => {
            if(document.getElementById('camarero-modal').classList.contains('oculto')) {
                clearInterval(intervaloCamarero); 
            } else {
                document.getElementById('codigo-vivo').innerText = generarCodigoDinamico();
            }
        }, 1000);
    } else if (pass !== null) {
        alert("¡Largo de aquí, cotilla!");
    }
}

function verificarPagoCasino() {
    let password = prompt("🕵️‍♂️ SEGURATA: 'El código cambia cada 20s. Dale tu móvil al camarero para que lo teclee.'\n\nCódigo actual:");
    if (password === null || password === "") return;
    let codigoCorrecto = generarCodigoDinamico();
    let codigoAnterior = generarCodigoDinamico(-1);
    
    if (password === codigoCorrecto || password === codigoAnterior) {
        casinoVIP = true;
        localStorage.setItem('casinoVIP', 'true');
        document.getElementById('pago-casino-modal').classList.add('oculto');
        abrirCasino();
        alert("¡Pase VIP Confirmado! Bienvenido al Clandestino.");
    } else {
        alert("❌ SEGURATA: 'Código incorrecto o caducado.'");
    }
}

function comprarFicha() {
    let costeFicha = 500000; 
    if (cubatas >= costeFicha) {
        cubatas -= costeFicha;
        fichasCasino++;
        document.getElementById('contador-fichas').innerText = fichasCasino;
        ganarCubatas(0);
    } else {
        alert("¡Pobre! Necesitas 500.000 🥃 para una ficha.");
    }
}

let casinoTirando = false;
function tirarTragaperras() {
    if (casinoTirando) return;
    if (fichasCasino < 1) {
        document.getElementById('mensaje-casino').innerText = "¡NO TIENES FICHAS!";
        document.getElementById('mensaje-casino').style.color = "red";
        return;
    }
    fichasCasino--;
    document.getElementById('contador-fichas').innerText = fichasCasino;
    guardarPartida();
    casinoTirando = true;
    
    const slot1 = document.getElementById('slot1');
    const slot2 = document.getElementById('slot2');
    const slot3 = document.getElementById('slot3');
    const msj = document.getElementById('mensaje-casino');
    
    msj.innerText = "GIRANDO...";
    msj.style.color = "#ff00ff";

    const iconos = ["🍒", "🍋", "🍉", "🍇", "⭐", "🔔"];
    let tiempoGiro = 0;
    
    const intervaloGiro = setInterval(() => {
        slot1.innerText = iconos[Math.floor(Math.random() * iconos.length)];
        slot2.innerText = iconos[Math.floor(Math.random() * iconos.length)];
        slot3.innerText = iconos[Math.floor(Math.random() * iconos.length)];
        tiempoGiro += 50;
        
        if (tiempoGiro >= 2000) {
            clearInterval(intervaloGiro);
            calcularPremioCasino(slot1, slot2, slot3, msj);
        }
    }, 50);
}

function calcularPremioCasino(slot1, slot2, slot3, msj) {
    let tirada = Math.floor(Math.random() * 1000) + 1;
    
    if (tirada <= 300) {
        // 30% DE PROBABILIDAD: PERDIDA 
        slot1.innerText = "💀"; slot2.innerText = "💩"; slot3.innerText = "💸";
        msj.innerText = "¡NADA! A SEGUIR BEBIENDO..."; msj.style.color = "red";
    } else if (tirada <= 650) {
        // 35% DE PROBABILIDAD: EL CASI PREMIO
        let posibles = ["🍒", "🍋", "🔔"];
        let randomIcon = posibles[Math.floor(Math.random() * posibles.length)];
        slot1.innerText = randomIcon; slot2.innerText = randomIcon; slot3.innerText = "💀"; 
        msj.innerText = "¡UUUYY! ¡POR LOS PELOS!"; msj.style.color = "orange";
    } else if (tirada <= 980) {
        // 33% DE PROBABILIDAD: PREMIO DIGITAL BASTANTE GORDO
        slot1.innerText = "🍒"; slot2.innerText = "🍒"; slot3.innerText = "🍒";
        let premioDigital = 25000;
        ganarCubatas(premioDigital);
        msj.innerText = "¡BIEN! +" + premioDigital + " 🥃"; msj.style.color = "#00ff00"; 
    } else if (tirada <= 998) {
        // 1.8% DE PROBABILIDAD: CHUPITO FÍSICO
        slot1.innerText = "🥂"; slot2.innerText = "🥂"; slot3.innerText = "🥂";
        msj.innerText = "¡¡BINGO!! ¡CHUPITO GANADO!"; msj.style.color = "#ffd700"; 
        entregarPremioFisico("¡UN CHUPITO EN LA BARRA!");
    } else {
        // 0.2% DE PROBABILIDAD: CUBATA FÍSICO (EL GORDO)
        slot1.innerText = "🥃"; slot2.innerText = "🥃"; slot3.innerText = "🥃";
        msj.innerText = "¡¡JACKPOT!! ¡CUBATAZO!"; msj.style.color = "#ffd700"; 
        entregarPremioFisico("¡UN CUBATA GRATIS EN LA BARRA!");
    }
    casinoTirando = false;
    guardarPartida();
}

function entregarPremioFisico(textoPremio) {
    setTimeout(() => {
        cerrarModales(); 
        document.getElementById('cupon-modal').classList.remove('oculto');
        document.getElementById('cupon-desc').innerText = textoPremio;
        let codigoGen = Math.random().toString(36).substring(2, 8).toUpperCase();
        document.getElementById('cupon-codigo').innerText = "#" + codigoGen;
        cuponActivoTipo = "CASINO"; // Permitir que el camarero lo queme sin problemas
    }, 1500); 
}

// ==========================================================================
// MENÚS AUXILIARES
// ==========================================================================
function abrirLogros() { ocultarTodosModales(); document.getElementById('logros-modal').classList.remove('oculto'); const contenedor = document.getElementById('lista-logros-contenedor'); contenedor.innerHTML = ''; for (let id in infoLogros) { let l = infoLogros[id]; let completado = logrosDesbloqueados[id]; let textoProgreso = ""; if (completado) { textoProgreso = `<span style="color:#00c853; font-weight:bold;">🏆 COMPLETADO</span>`; } else if (l.meta !== undefined) { let actual = estadisticasLogros[l.campo]; if (actual > l.meta) actual = l.meta; textoProgreso = `<span style="color:#666;">Progreso: ${actual}/${l.meta}</span>`; } else { textoProgreso = `<span style="color:#ffaa00;">En progreso...</span>`; } contenedor.innerHTML += `<div class="libro-item" style="background:${completado ? '#e8f5e9' : 'white'};"><div class="libro-info" style="width:100%;"><h4 style="color:${completado ? '#00c853' : '#ff0055'};">${l.titulo}</h4><p style="color:#555; font-size:12px; font-weight:normal; margin-bottom:4px;">${l.desc}</p><div style="display:flex; justify-content:space-between; font-size:11px; font-weight:bold;"><span>Premio: +${l.premio} 🍹</span>${textoProgreso}</div></div></div>`; } }
function abrirMenuPrincipal() { pausarJuego(); ocultarTodosModales(); document.getElementById('menu-modal').classList.remove('oculto'); }
function abrirJuerguistas() { ocultarTodosModales(); document.getElementById('juerguistas-modal').classList.remove('oculto'); }
function abrirOpciones() { ocultarTodosModales(); document.getElementById('opciones-modal').classList.remove('oculto'); }
function abrirRanking() { 
    ocultarTodosModales(); 
    document.getElementById('ranking-modal').classList.remove('oculto'); 
    if (nombreJugador === "Desconocido") { pedirNombre(); subirPuntuacion(); }
    actualizarInterfazRanking(); 
}
function volverAlMenu() { ocultarTodosModales(); document.getElementById('menu-modal').classList.remove('oculto'); }
function cerrarModales() { ocultarTodosModales(); reanudarJuego(); }
function ocultarTodosModales() { document.querySelectorAll('.modal').forEach(m => m.classList.add('oculto')); }
function pausarJuego() { juegoPausado = true; clearInterval(intervalCajas); clearInterval(intervalVomitar); clearInterval(intervalRecoger); clearInterval(intervalPasivo); }
function reanudarJuego() { juegoPausado = false; intervalCajas = setInterval(crearCaja, tiempoSpawnActual); intervalVomitar = setInterval(generarVomito, 3500); intervalRecoger = setInterval(recogerVomitoAutomatico, tiempoRecogida); iniciarBuclePasivo(); }

// ==========================================================================
// LOOP DE PRODUCCIÓN PASIVA CON MULTIPLICADOR
// ==========================================================================
function ganarCubatas(cantidad) { cubatas += cantidad; if (cantidad > 0) estadisticasLogros.cubatasTotalesGanados += cantidad; contadorCubatas.innerText = cubatas; verificarLogro('tesorero_pena'); }
function mostrarTextoFlotante(x, y, cantidad) { const texto = document.createElement('div'); texto.classList.add('floating-text'); texto.innerText = `+${cantidad}`; texto.style.left = `${x}px`; texto.style.top = `${y}px`; board.appendChild(texto); setTimeout(() => { texto.remove(); }, 1000); }
function mostrarAvisoFlotante(x, y, mensaje) { const texto = document.createElement('div'); texto.classList.add('floating-text'); texto.style.color = "#ff4444"; texto.innerText = mensaje; texto.style.left = `${x}px`; texto.style.top = `${y}px`; texto.style.zIndex = "400"; board.appendChild(texto); setTimeout(() => { texto.remove(); }, 1000); }
function actualizarInterfazRanking() {
    const contenedor = document.getElementById('ranking-content');
    contenedor.innerHTML = '<h3 style="color:#333;">Cargando... 📡</h3>';
    db.collection("ranking").orderBy("nivelMaximo", "desc").limit(10).get().then((querySnapshot) => {
            let html = '<h3 style="margin-bottom:10px;">TOP 10 JUERGAS</h3><div style="text-align:left; font-size: 14px;">';
            let i = 1; querySnapshot.forEach((doc) => { let p = doc.data(); html += `<div style="padding: 8px; border-bottom: 1px solid #ccc; display:flex; justify-content:space-between;"><span>${i}. ${p.nombre}</span><span style="font-weight:bold; color:#ff0055;">Nvl ${p.nivelMaximo}</span></div>`; i++; });
            html += '</div>'; contenedor.innerHTML = html;
        }).catch((error) => { console.error("Error ranking: ", error); contenedor.innerHTML = "Error de conexión."; });
}
function actualizarCubatasPorSegundo() { const friends = document.querySelectorAll('.friend'); let ingresosTotales = 0; friends.forEach(f => { ingresosTotales += (parseInt(f.dataset.level) + 1); }); let cps = (ingresosPorBucle = ingresosTotales / (tiempoPasivo / 1000)) * multiplicadorPasivo; document.getElementById('cubatas-segundo').innerText = `${cps.toFixed(1)} cubatas/seg`; }

function iniciarBuclePasivo() { 
    clearInterval(intervalPasivo); 
    intervalPasivo = setInterval(() => { 
        if (juegoPausado) return; 
        const friends = document.querySelectorAll('.friend'); let ingresos = 0; 
        friends.forEach(f => { ingresos += (parseInt(f.dataset.level) + 1); }); 
        if (ingresos > 0) ganarCubatas(ingresos * multiplicadorPasivo); 
    }, tiempoPasivo); 
    actualizarCubatasPorSegundo(); 
}

function generarVomito() { if (juegoPausado) return; const friends = document.querySelectorAll('.friend'); friends.forEach(f => { const vomito = document.createElement('div'); vomito.classList.add('vomito'); vomito.innerText = '🤮'; let x = parseFloat(f.style.left) + (Math.random() * 40 - 10); let y = parseFloat(f.style.top) + 95; vomito.style.left = `${x}px`; vomito.style.top = `${y}px`; const nivelAmigo = parseInt(f.dataset.level); vomito.dataset.valor = (nivelAmigo + 1) * 2; vomito.addEventListener('pointerdown', (e) => { e.stopPropagation(); e.preventDefault(); if (juegoPausado) return; const valorVomito = parseInt(vomito.dataset.valor); ganarCubatas(valorVomito); mostrarTextoFlotante(x, y, valorVomito); vomito.remove(); estadisticasLogros.vomitosLipiados++; verificarLogro('estomago_hierro'); }); board.appendChild(vomito); }); }
function recogerVomitoAutomatico() { if (juegoPausado) return; const vomitos = document.querySelectorAll('.vomito'); let totalRecolectado = 0; vomitos.forEach(v => { const valor = parseInt(v.dataset.valor); totalRecolectado += valor; mostrarTextoFlotante(parseFloat(v.style.left), parseFloat(v.style.top), valor); v.remove(); }); if (totalRecolectado > 0) ganarCubatas(totalRecolectado); }
function cambiarTab(pestana) { document.getElementById('btn-tab-mejoras').classList.remove('tab-activa'); document.getElementById('btn-tab-personajes').classList.remove('tab-activa'); document.getElementById('tab-mejoras').classList.add('oculto'); document.getElementById('tab-personajes').classList.add('oculto'); document.getElementById(`btn-tab-${pestana}`).classList.add('tab-activa'); document.getElementById(`tab-${pestana}`).classList.remove('oculto'); if (pestana === 'personajes') { actualizarTiendaPersonajes(); } }

function actualizarTiendaPersonajes() { const tabPersonajes = document.getElementById('tab-personajes'); tabPersonajes.innerHTML = ''; for (let i = 0; i <= maxNivelDesbloqueado; i++) { if(i >= levels.length) break; let precioPersonaje = Math.floor(100 * Math.pow(2.5, i)); tabPersonajes.innerHTML += `<button onclick="comprarPersonaje(${i}, ${precioPersonaje})" style="display:flex; flex-direction:column; align-items:center; padding:10px;"><img src="${levels[i]}" style="width:55px; height:55px; object-fit:contain; margin-bottom:5px;">Nivel ${i + 1}<br><small style="color:#ffaa00; font-size:13px; margin-top:3px;">${precioPersonaje} 🍹</small></button>`; } }
function comprarPersonaje(nivel, precio) { if (document.querySelectorAll('.friend').length >= 20) { alert("¡La pradera está a tope! (Máx 20)."); return; } if (cubatas >= precio) { cubatas -= precio; ganarCubatas(0); cerrarModales(); const xCentro = (board.clientWidth / 2) - 45; const yCentro = (board.clientHeight / 2) - 45; createFriend(nivel, xCentro, yCentro); guardarPartida(); } else alert("¡Te faltan cubatas!"); }
function comprarVelocidad() { if (boostVelocidadActivo) { alert("¡El Frenesí ya está activo!"); return; } if (cubatas >= costeVelocidad) { cubatas -= costeVelocidad; ganarCubatas(0); cerrarModales(); tiempoSpawnBase = Math.max(500, tiempoSpawnBase - 800); costeVelocidad = Math.floor(costeVelocidad * 1.5); document.getElementById('coste-vel').innerText = costeVelocidad; boostVelocidadActivo = true; tiempoSpawnActual = 800; clearInterval(intervalCajas); intervalCajas = setInterval(crearCaja, tiempoSpawnActual); crearCronometroFlotante('frenesi-banner', 'FRENESÍ DE CAJAS', 30); estadisticasLogros.frenesisActivados++; verificarLogro('frenesi_loco'); setTimeout(() => { boostVelocidadActivo = false; tiempoSpawnActual = tiempoSpawnBase; clearInterval(intervalCajas); if(!juegoPausado) intervalCajas = setInterval(crearCaja, tiempoSpawnActual); }, 30000); guardarPartida(); } else alert("¡Te faltan cubatas!"); }
function comprarEvento() { if (nivelAparicion === 1) { alert("¡La Hora Feliz ya está activa!"); return; } if (cubatas >= 150) { cubatas -= 150; ganarCubatas(0); nivelAparicion = 1; cerrarModales(); crearCronometroFlotante('horafeliz-banner', 'HORA FELIZ', 30); setTimeout(() => { nivelAparicion = 0; }, 30000); guardarPartida(); } else alert("¡Te faltan cubatas!"); }
function comprarPasivo() { if (cubatas >= costePasivo) { cubatas -= costePasivo; ganarCubatas(0); tiempoPasivo = Math.max(400, tiempoPasivo - 400); costePasivo = Math.floor(costePasivo * 1.6); document.getElementById('coste-pasivo').innerText = costePasivo; iniciarBuclePasivo(); guardarPartida(); } else alert("¡Te faltan cubatas!"); }
function comprarLimpieza() { if (cubatas >= costeLimpieza) { cubatas -= costeLimpieza; ganarCubatas(0); tiempoRecogida = Math.max(400, tiempoRecogida / 2); costeLimpieza = Math.floor(costeLimpieza * 2.5); document.getElementById('coste-limpieza').innerText = costeLimpieza; clearInterval(intervalRecoger); intervalRecoger = setInterval(recogerVomitoAutomatico, tiempoRecogida); verificarLogro('vip_barra'); guardarPartida(); } else alert("¡Te faltan cubatas!"); }
function crearCronometroFlotante(id, texto, duracionSegundos) { let viejo = document.getElementById(id); if(viejo) viejo.remove(); const banner = document.createElement('div'); banner.id = id; banner.style.position = 'absolute'; banner.style.top = '130px'; banner.style.left = '50%'; banner.style.transform = 'translateX(-50%)'; banner.style.background = 'rgba(255, 0, 85, 0.9)'; banner.style.color = 'white'; banner.style.padding = '8px 15px'; banner.style.borderRadius = '20px'; banner.style.fontWeight = 'bold'; banner.style.border = '2px solid white'; banner.style.zIndex = '50'; banner.style.boxShadow = '0px 4px 6px rgba(0,0,0,0.5)'; board.appendChild(banner); let segundosRestantes = duracionSegundos; banner.innerText = `${texto}: ${segundosRestantes}s`; const cuentaAtras = setInterval(() => { if(!juegoPausado) { segundosRestantes--; banner.innerText = `${texto}: ${segundosRestantes}s`; if(segundosRestantes <= 0) { clearInterval(cuentaAtras); banner.remove(); } } }, 1000); }

function mostrarCinematica(nivel) { pausarJuego(); const cinematic = document.getElementById('unlock-cinematic'); const imagen = document.getElementById('unlock-img'); const texto = document.getElementById('unlock-desc'); imagen.src = levels[nivel]; texto.innerText = `¡NIVEL ${nivel + 1} ALCANZADO!`; cinematic.classList.remove('oculto'); setTimeout(() => { cinematic.classList.add('activo'); }, 20); cinematic.onclick = () => { cinematic.classList.add('oculto'); cinematic.classList.remove('activo'); reanudarJuego(); }; }
function crearCaja() { 
    if (juegoPausado || document.querySelectorAll('.caja').length > 15) return; 
    const caja = document.createElement('div'); 
    caja.classList.add('caja'); 
    let segundosCaida = (tiempoSpawnActual / 4000) * 3; 
    if (segundosCaida < 0.6) segundosCaida = 0.6; 
    caja.style.transition = `top ${segundosCaida}s linear`; 
    
    const randomX = Math.random() * (board.clientWidth - 95); 
    const randomY = Math.random() * (board.clientHeight - 120) + 20; 
    
    caja.style.left = `${randomX}px`; 
    caja.style.top = `-95px`; 
    board.appendChild(caja); 
    
    setTimeout(() => { 
        if(!juegoPausado) caja.style.top = `${randomY}px`; 
    }, 50); 
    
    caja.addEventListener('pointerdown', () => { 
        if (juegoPausado) return; 
        if (document.querySelectorAll('.friend').length >= 20) { 
            mostrarAvisoFlotante(parseFloat(caja.style.left), parseFloat(caja.style.top) - 20, "¡LLENO!"); 
            estadisticasLogros.ansiasActivado++; 
            verificarLogro('el_ansias'); 
            return; 
        } 
        const rect = caja.getBoundingClientRect(); 
        const boardRect = board.getBoundingClientRect(); 
        caja.remove(); 
        ganarCubatas(1 * multiplicadorClic); 
        createFriend(nivelAparicion, rect.left - boardRect.left, rect.top - boardRect.top); 
        estadisticasLogros.cajasAbiertas++; 
        verificarLogro('lluvia_litros'); 
        guardarPartida(); 
    }); 
}

function crearCajaOffline() { 
    if (document.querySelectorAll('.caja').length > 12) return; 
    const caja = document.createElement('div'); 
    caja.classList.add('caja'); 
    caja.style.transition = "none"; 
    
    const randomX = Math.random() * (board.clientWidth - 95); 
    const randomY = Math.random() * (board.clientHeight - 120) + 20; 
    
    caja.style.left = `${randomX}px`; 
    caja.style.top = `${randomY}px`; 
    board.appendChild(caja); 
    
    caja.addEventListener('pointerdown', () => { 
        if (juegoPausado) return; 
        if (document.querySelectorAll('.friend').length >= 20) { 
            mostrarAvisoFlotante(parseFloat(caja.style.left), parseFloat(caja.style.top) - 20, "¡LLENO!"); 
            return; 
        } 
        const rect = caja.getBoundingClientRect(); 
        const boardRect = board.getBoundingClientRect(); 
        caja.remove(); 
        ganarCubatas(1 * multiplicadorClic); 
        createFriend(nivelAparicion, rect.left - boardRect.left, rect.top - boardRect.top); 
        estadisticasLogros.cajasAbiertas++; 
        verificarLogro('lluvia_litros'); 
        guardarPartida(); 
    }); 
}
function createFriend(level, x, y) { const friend = document.createElement('div'); friend.classList.add('friend'); friend.style.animation = "pop 0.4s ease-in-out"; friend.dataset.level = level; friend.style.backgroundImage = `url('${levels[level]}')`; let tamanoBase = 95; let aumentoPorNivel = level * 10; friend.style.width = `${tamanoBase + aumentoPorNivel}px`; friend.style.height = `${tamanoBase + aumentoPorNivel}px`; friend.style.left = `${x}px`; friend.style.top = `${y}px`; friend.addEventListener('pointerdown', startDrag); board.appendChild(friend); actualizarCubatasPorSegundo(); }
function startDrag(e) { if (juegoPausado) return; dragItem = e.target; const rect = dragItem.getBoundingClientRect(); let clientX = e.clientX !== undefined ? e.clientX : e.touches[0].clientX; let clientY = e.clientY !== undefined ? e.clientY : e.touches[0].clientY; offsetX = clientX - rect.left; offsetY = clientY - rect.top; document.addEventListener('pointermove', drag); document.addEventListener('pointerup', endDrag); document.addEventListener('touchmove', dragTouch, {passive: false}); document.addEventListener('touchend', endDragTouch); }
function drag(e) { 
    if (!dragItem || juegoPausado) return; 
    const boardRect = board.getBoundingClientRect(); 
    let newX = e.clientX - boardRect.left - offsetX;
    let newY = e.clientY - boardRect.top - offsetY;
    newX = Math.max(0, Math.min(newX, boardRect.width - dragItem.offsetWidth));
    newY = Math.max(0, Math.min(newY, boardRect.height - dragItem.offsetHeight));
    dragItem.style.left = `${newX}px`; 
    dragItem.style.top = `${newY}px`; 
}
function dragTouch(e) { 
    if (!dragItem || juegoPausado) return; 
    e.preventDefault(); 
    const boardRect = board.getBoundingClientRect(); 
    let newX = e.touches[0].clientX - boardRect.left - offsetX;
    let newY = e.touches[0].clientY - boardRect.top - offsetY;
    newX = Math.max(0, Math.min(newX, boardRect.width - dragItem.offsetWidth));
    newY = Math.max(0, Math.min(newY, boardRect.height - dragItem.offsetHeight));
    dragItem.style.left = `${newX}px`; 
    dragItem.style.top = `${newY}px`; 
}
function endDrag() { limpiarEventos(); }
function endDragTouch() { limpiarEventos(); }
function limpiarEventos() { if (!dragItem) return; const friends = document.querySelectorAll('.friend'); const rect1 = dragItem.getBoundingClientRect(); for (let other of friends) { if (other !== dragItem) { const rect2 = other.getBoundingClientRect(); if (!(rect1.right < rect2.left || rect1.left > rect2.right || rect1.bottom < rect2.top || rect1.top > rect2.bottom)) { if (dragItem.dataset.level === other.dataset.level) { const currentLevel = parseInt(dragItem.dataset.level); if (currentLevel < levels.length - 1) { const newX = parseFloat(other.style.left); const newY = parseFloat(other.style.top); dragItem.remove(); other.remove(); ganarCubatas((currentLevel + 1) * 5); const nuevoNivel = currentLevel + 1; createFriend(nuevoNivel, newX, newY); verificarLogro('calentamiento'); if (nuevoNivel > maxNivelDesbloqueado) { maxNivelDesbloqueado = nuevoNivel; mostrarCinematica(nuevoNivel); actualizaEstilosExtremos(); } break; } } } } } dragItem = null; document.removeEventListener('pointermove', drag); document.removeEventListener('pointerup', endDrag); document.removeEventListener('touchmove', dragTouch); document.removeEventListener('touchend', endDragTouch); actualizarCubatasPorSegundo(); guardarPartida(); }

cargarPartida(); reanudarJuego(); intervalGuardado = setInterval(guardarPartida, 3000);