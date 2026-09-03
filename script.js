/**
 * ============================================================================
 * JUERGA CIVIL - EVOLUCIÓN
 * Archivo Principal JavaScript (script.js)
 * ============================================================================
 */

// ============================================================================
// 1. CONFIGURACIÓN DE FIREBASE Y PROTECCIÓN
// ============================================================================
const firebaseConfig = {
    apiKey: "AIzaSyDYPbqh0-tLpwJK-hHXuG1fwABr-fkGXtA",
    authDomain: "juerga-civil-2026.firebaseapp.com",
    projectId: "juerga-civil-2026",
    storageBucket: "juerga-civil-2026.firebasestorage.app",
    messagingSenderId: "945369478500",
    appId: "1:945369478500:web:7eacbff81462189f46f671",
    measurementId: "G-X8LNCK1J29"
};

let db = null;
try {
    if (!firebase.apps.length) {
        firebase.initializeApp(firebaseConfig);
    }
    db = firebase.firestore();

    if (typeof firebase.appCheck === "function") {
        const appCheck = firebase.appCheck();
        appCheck.activate('6Lcc05ktAAAAALl7v4Zcw806WegjhVel9DUQ1Ryu', true);
    }
} catch (e) {
    console.warn("Firebase bloqueado o sin conexión. Jugando en local.");
}

function subirPuntuacion() {
    if (!db || nombreJugador === "Desconocido") return; 
    db.collection("ranking").doc(nombreJugador).set({
        nombre: nombreJugador,
        nivelMaximo: maxNivelDesbloqueado + 1,
        cubatasTotales: estadisticasLogros.cubatasTotalesGanados || cubatas,
        esVIP: casinoVIP,
        chupitosReales: estadisticasLogros.chupitosGanados || 0,
        cubatasReales: estadisticasLogros.cubatasRealesGanados || 0,
        fechaActualizacion: firebase.firestore.FieldValue.serverTimestamp()
    }, { merge: true }).catch(() => {});
}
setInterval(subirPuntuacion, 120000);

// ============================================================================
// 2. VARIABLES GLOBALES Y ESTADO DEL JUEGO
// ============================================================================
document.addEventListener('dblclick', function(e) { e.preventDefault(); }, { passive: false });
document.addEventListener('gesturestart', function(e) { e.preventDefault(); });

const board = document.getElementById('game-board');
const contadorCubatas = document.getElementById('contador-cubatas');

const levels = [
    'n1.png', 'n2.png', 'n3.png', 'n4.png', 'n5.png', 'n6.png', 'n7.png', 
    'n8.png', 'n9.png', 'n10.png', 'n11.png', 'n12.png', 'n125.png', 'n13.png', 
    'n14.png', 'n15.png', 'n16.png', 'n17.png', 'n18.png'
]; 
const nombresJuerguistas = [
    "Adrian Juan", "Iñaki Gonzalez", "Ander Garmon", "Victor Santos", "Noa Ugidos", 
    "Natalia Gonzalez", "Ivan Orletdas", "Guillermo Bango", "Lucia Grande", "Ruben Pelayo", 
    "Karen Beneitez", "Aina Fernandez", "Iñigo Fernandez", "Hugo Barragan", 
    "Natalia Armendariz", "Elena Vivas", "Naroa Chamorro", "Gerardo Pascual", "Pablo Martinez"
];

let nombreJugador = "Desconocido";
let cubatas = 0; 
let maxNivelDesbloqueado = 0; 
let dragItem = null; 
let offsetX = 0; 
let offsetY = 0;

let multiplicadorPasivo = 1;
let multiplicadorClic = 1; 
let timeoutMultiplicador = null;
let juegoPausado = false; 

let nivelVelocidad = 0; const maxNivelVelocidad = 10;
let nivelAparicion = 0; const maxNivelCalidad = 6;
let nivelTractor = 0;   const maxNivelTractor = 10;

let tiempoSpawnBase = 2200; let tiempoSpawnActual = 2200; let costeVelocidad = 1000;
let tiempoPasivo = 3000;    let costeTractor = 5000;
let limpiezaActivada = false;
let boostVelocidadActivo = false;

let casinoVIP = localStorage.getItem('casinoVIP') === 'true';
let sobresGratisEpico = 0; 
let sobreAbriendo = false;
let inventarioCupones = []; 
let cuponActivoIndex = -1;  
let stockChupitosHoy = 15;
let stockCubatasHoy = 5;
let claveStaffActiva = ""; 
// 👇 VARIABLES DE EVENTO 👇
let eventoHoraLocaGlobal = false;
let finEventoHoraLoca = 0;
let stockChupitosEvento = 0;
let stockCubatasEvento = 0;

let regalosReclamados = { '2026-09-03': false, '2026-09-04': false, '2026-09-05': false, '2026-09-06': false, '2026-09-07': false };
let cuponesCanjeados = { '2026-09-03': false, '2026-09-04': false, '2026-09-05': false, '2026-09-06': false, '2026-09-07': false };

let intervalCajas, intervalVomitar, intervalRecoger, intervalPasivo;

// ============================================================================
// 3. TABLAS DE DATOS (ECONOMÍA Y PROBABILIDADES)
// ============================================================================
const INGRESOS_POR_NIVEL = [
    1, 3, 7, 15, 35, 75, 140, 220, 
    320, 430, 550, 670, 790, 890, 950, 975, 990, 995, 1000
];

const TABLA_CALIDAD_VIP = [
    { nivel: 0, prob: [{ nvl: 0, p: 1.0 }], desc: "100% Nv.1", sig: "90% Nv.1 / 10% Nv.2", coste: 10000 },
    { nivel: 1, prob: [{ nvl: 0, p: 0.90 }, { nvl: 1, p: 0.10 }], desc: "10% Nv.2", sig: "25% Nv.2", coste: 75000 },
    { nivel: 2, prob: [{ nvl: 0, p: 0.75 }, { nvl: 1, p: 0.25 }], desc: "25% Nv.2", sig: "50% Nv.2", coste: 500000 },
    { nivel: 3, prob: [{ nvl: 0, p: 0.50 }, { nvl: 1, p: 0.50 }], desc: "50% Nv.2", sig: "80% Nv.2 / 20% Nv.3", coste: 2000000 },
    { nivel: 4, prob: [{ nvl: 1, p: 0.80 }, { nvl: 2, p: 0.20 }], desc: "20% Nv.3", sig: "50% Nv.3", coste: 8000000 },
    { nivel: 5, prob: [{ nvl: 1, p: 0.50 }, { nvl: 2, p: 0.50 }], desc: "50% Nv.3", sig: "75% Nv.3 (Tope)", coste: 25000000 },
    { nivel: 6, prob: [{ nvl: 1, p: 0.25 }, { nvl: 2, p: 0.75 }], desc: "75% Nv.3 / 25% Nv.2", sig: "MÁXIMO", coste: 0 }
];

// 🎁 CONFIGURACIÓN DE SOBRES DEL CASINO
const SOBRES = {
    epico: {
        nombre: "Sobre VIP", 
        // 👇 Coste fijo eliminado. El juego usa calcularPrecioSobre() 👇
        premios: [
            { tipo: 'cubatas',     peso: 98.5, minMult: 0.2, maxMult: 1.25, texto: "🥃 +{x} cubatas" },
            { tipo: 'chupito',     peso: 1.2,  texto: "🥂 ¡CHUPITO GANADO!" },
            { tipo: 'cubata_real', peso: 0.3,  texto: "🍹 ¡CUBATA GRATIS EN LA BARRA!" }
        ]
    }
};

const DIAS_EVENTO = [
    { fecha: '2026-09-03', nombre: 'Jueves 3', premioDesc: '3 🎁 Sobres', cantidad: 3 },
    { fecha: '2026-09-04', nombre: 'Viernes 4', premioDesc: '4 🎁 Sobres', cantidad: 4 },
    { fecha: '2026-09-05', nombre: 'Sábado 5', premioDesc: '5 🎁 Sobres', cantidad: 5 },
    { fecha: '2026-09-06', nombre: 'Domingo 6', premioDesc: '6 🎁 Sobres', cantidad: 6 },
    { fecha: '2026-09-07', nombre: 'Lunes 7 (El Gordo)', premioDesc: '7 🎁 Sobres', cantidad: 7, esFinal: true }
];

// ============================================================================
// 4. SISTEMA DE LOGROS
// ============================================================================
let estadisticasLogros = { 
    cajasAbiertas: 0, vomitosLipiados: 0, frenesisActivados: 0, ansiasActivado: 0, 
    cubatasTotalesGanados: 0, chupitosGanados: 0, cubatasRealesGanados: 0, intentoTicketDorado: false 
};
let logrosDesbloqueados = { 
    'calentamiento': false, 'estomago_hierro': false, 'lluvia_litros': false, 
    'tesorero_pena': false, 'vip_barra': false, 'frenesi_loco': false, 
    'el_ansias': false, 'la_resaca': false, 'coleccionista': false 
};

const infoLogros = {
    'calentamiento': { titulo: "🐣 El Calentamiento", desc: "Fusiona tus dos primeros colegas.", premio: 50 },
    'estomago_hierro': { titulo: "🤮 Estómago de Hierro", desc: "Limpia 50 vómitos manuales con el dedo.", premio: 300, meta: 50, campo: "vomitosLipiados" },
    'lluvia_litros': { titulo: "📦 Lluvia de Litros", desc: "Abre 100 cajas sorpresas del cielo.", premio: 1000, meta: 100, campo: "cajasAbiertas" },
    'tesorero_pena': { titulo: "💸 Tesorero de la Peña", desc: "Gana un total acumulado de 10.000 cubatas.", premio: 2000, meta: 10000, campo: "cubatasTotalesGanados" },
    'vip_barra': { titulo: "🚜 VIP de la Barra", desc: "Compra el Tractor del Kzurro.", premio: 505 },
    'frenesi_loco': { titulo: "🚀 Frenesí Descontrolado", desc: "Activa la Hora Loca 5 veces.", premio: 800, meta: 5, campo: "frenesisActivados" },
    'el_ansias': { titulo: "💥 El Ansias (Oculto)", desc: "Intenta abrir cajas con la pradera llena (20/20).", premio: 100, meta: 1, campo: "ansiasActivado" },
    'la_resaca': { titulo: "🛌 La Resaca", desc: "Vuelve al juego tras pasar 4 hours fuera.", premio: 500 },
    'coleccionista': { titulo: "🃏 Álbum Completado", desc: "Abre un sobre de cada diseño (12 distintos).", premio: 0, premioSobre: 1, meta: 12, campo: "tiposSobres" }
};

function verificarLogro(id) {
    if (logrosDesbloqueados[id]) return; 
    let l = infoLogros[id]; let cumple = false;
    
    if (l.meta !== undefined) { 
        if (estadisticasLogros[l.campo] >= l.meta) cumple = true; 
    } else { cumple = true; }
    
    if (cumple) { 
        logrosDesbloqueados[id] = true; 
        let textoPremio = "";
        if (l.premio > 0) { ganarCubatas(l.premio); textoPremio = `+${l.premio.toLocaleString('es-ES')} 🍹 cubatas`; }
        if (l.premioSobre > 0) { sobresGratisEpico += l.premioSobre; actualizarBotonesSobres(); textoPremio = `+${l.premioSobre} 🎁 Sobre VIP Gratis`; }
        setTimeout(() => { alert(`🏆 ¡LOGRO DESBLOQUEADO! 🏆\n\n🎯 ${l.titulo}\n🎁 Premio: ${textoPremio}`); }, 10); 
        guardarPartida(); 
    }
}

// ============================================================================
// 5. NÚCLEO DEL JUEGO: MATEMÁTICAS Y CÁLCULOS
// ============================================================================
function calcularIngresoColega(level) {
    if (level < 0) return 1;
    if (level >= INGRESOS_POR_NIVEL.length) return 1000;
    return INGRESOS_POR_NIVEL[level];
}

function calcularPrecioSobre() {
    let cpsActual = 0;
    document.querySelectorAll('.friend').forEach(f => { cpsActual += calcularIngresoColega(parseInt(f.dataset.level)); });
    cpsActual = cpsActual * multiplicadorPasivo;
    return Math.max(15000, Math.floor(cpsActual * 120)); 
}

function calcularNivelCajaNormal() {
    const info = TABLA_CALIDAD_VIP[nivelAparicion] || TABLA_CALIDAD_VIP[0];
    const r = Math.random();
    let acumulado = 0;
    for (let item of info.prob) {
        acumulado += item.p;
        if (r <= acumulado) return item.nvl;
    }
    return info.prob[info.prob.length - 1].nvl;
}

function obtenerDiaDeFiesta() {
    let fecha = new Date(); fecha.setHours(fecha.getHours() - 5); return fecha.toDateString(); 
}

function ganarCubatas(cantidad) { 
    cubatas += cantidad; 
    if (cantidad > 0) estadisticasLogros.cubatasTotalesGanados += cantidad; 
    if (contadorCubatas) contadorCubatas.innerText = Math.floor(cubatas).toLocaleString('es-ES'); 
    verificarLogro('tesorero_pena'); 
}

function actualizarCubatasPorSegundo() { 
    const friends = document.querySelectorAll('.friend'); 
    let cpsBase = 0; 
    friends.forEach(f => { cpsBase += calcularIngresoColega(parseInt(f.dataset.level)); }); 
    let cpsTotal = cpsBase * multiplicadorPasivo; 
    const elCps = document.getElementById('cubatas-segundo');
    if (elCps) elCps.innerText = `${cpsTotal.toLocaleString('es-ES')} cubatas/seg`; 
}

function iniciarBuclePasivo() { 
    clearInterval(intervalPasivo); 
    intervalPasivo = setInterval(() => { 
        if (juegoPausado) return; 
        const friends = document.querySelectorAll('.friend'); 
        let cpsBase = 0; 
        friends.forEach(f => { cpsBase += calcularIngresoColega(parseInt(f.dataset.level)); }); 
        let segundosBucle = tiempoPasivo / 1000;
        let ganancia = Math.floor(cpsBase * multiplicadorPasivo * segundosBucle);
        if (ganancia > 0) ganarCubatas(ganancia); 
    }, tiempoPasivo); 
    actualizarCubatasPorSegundo(); 
}

// ============================================================================
// 6. CONTROL DE ESTADOS Y TEXTOS FLOTANTES
// ============================================================================
function pausarJuego() { 
    juegoPausado = true; 
    clearInterval(intervalCajas); clearInterval(intervalVomitar); 
    clearInterval(intervalRecoger); clearInterval(intervalPasivo); 
}

function reanudarJuego() { 
    juegoPausado = false; 
    clearInterval(intervalCajas); clearInterval(intervalVomitar); 
    clearInterval(intervalRecoger); clearInterval(intervalPasivo);
    intervalCajas = setInterval(crearCaja, tiempoSpawnActual); 
    intervalVomitar = setInterval(generarVomito, 3500); 
    if (limpiezaActivada) intervalRecoger = setInterval(recogerVomitoAutomatico, 4000); 
    iniciarBuclePasivo(); 
}

function mostrarTextoFlotante(x, y, cantidad) { 
    const texto = document.createElement('div'); texto.classList.add('floating-text'); 
    texto.innerText = `+${cantidad.toLocaleString('es-ES')}`; texto.style.left = `${x}px`; texto.style.top = `${y}px`; 
    board.appendChild(texto); setTimeout(() => { texto.remove(); }, 1000); 
}
function mostrarAvisoFlotante(x, y, mensaje) { 
    const texto = document.createElement('div'); texto.classList.add('floating-text'); texto.style.color = "#ff4444"; 
    texto.innerText = mensaje; texto.style.left = `${x}px`; texto.style.top = `${y}px`; texto.style.zIndex = "400"; 
    board.appendChild(texto); setTimeout(() => { texto.remove(); }, 1000); 
}
function mostrarTextoFlotanteEpico(x, y, mensaje) { 
    const texto = document.createElement('div'); texto.classList.add('floating-text-epic'); 
    texto.innerText = mensaje; texto.style.left = `${x}px`; texto.style.top = `${y}px`; 
    board.appendChild(texto); setTimeout(() => { texto.remove(); }, 1500); 
}
function mostrarNotificacion(mensaje) { alert(mensaje); }

// ============================================================================
// 7. MECÁNICAS EN PANTALLA: SPAWNS Y FUSIÓN
// ============================================================================
function crearCaja() { 
    if (juegoPausado || document.querySelectorAll('.caja').length > 7) return; 
    const esDorada = Math.random() < 0.05; 
    const caja = document.createElement('div'); 
    caja.classList.add('caja'); 
    if (esDorada) caja.classList.add('caja-dorada');
    
    let segundosCaida = 5.0; 
    if (tiempoSpawnActual <= 4000) segundosCaida = 4.0; 
    if (tiempoSpawnActual <= 2000) segundosCaida = 3.5; 
    
    caja.style.transition = `top ${segundosCaida}s linear`; 
    const randomX = Math.random() * (window.innerWidth - 95); 
    const randomY = Math.random() * (window.innerHeight - 200) + 20; 
    caja.style.left = `${randomX}px`; caja.style.top = `-95px`; 
    board.appendChild(caja); 
    
    setTimeout(() => { if(!juegoPausado) caja.style.top = `${randomY}px`; }, 50); 
    
    caja.addEventListener('pointerdown', () => { 
        if (juegoPausado) return; 
        if (navigator.vibrate) navigator.vibrate(esDorada ? [100, 50, 100] : 30);
        
        if (document.querySelectorAll('#game-board .friend').length >= 20 && !esDorada) { 
            mostrarAvisoFlotante(parseFloat(caja.style.left), parseFloat(caja.style.top) - 20, "¡LLENO!"); 
            estadisticasLogros.ansiasActivado++; verificarLogro('el_ansias'); 
            return; 
        }
        
        caja.style.pointerEvents = "none"; 
        const rect = caja.getBoundingClientRect(); const boardRect = board.getBoundingClientRect(); 
        const x = rect.left - boardRect.left; const y = rect.top - boardRect.top; 
        caja.remove(); 
        
        if (esDorada) { 
            let cps = 0; document.querySelectorAll('.friend').forEach(f => { cps += calcularIngresoColega(parseInt(f.dataset.level)); }); 
            let premioDorado = Math.max(300, Math.floor((cps * multiplicadorPasivo) * 45)); 
            ganarCubatas(premioDorado); 
            mostrarTextoFlotanteEpico(x - 20, y, "¡+" + premioDorado.toLocaleString('es-ES') + " 🥃!"); 
            
            let suerte = Math.random(); let nivelDorado = 0;
            if (suerte < 0.15) { nivelDorado = maxNivelDesbloqueado; } 
            else if (suerte < 0.50) { nivelDorado = Math.max(0, maxNivelDesbloqueado - 1); } 
            else { nivelDorado = Math.max(0, maxNivelDesbloqueado - 2); }
            
            let tableroDestino = nivelDorado >= 8 ? '#game-board-vip' : '#game-board';
            if (document.querySelectorAll(`${tableroDestino} .friend`).length < 20) {
                createFriend(nivelDorado, x, y);
            } else {
                mostrarAvisoFlotante(x, y - 20, "¡SALA LLENA!"); ganarCubatas(premioDorado * 2); 
            }
        } else { 
            ganarCubatas(1 * multiplicadorClic); createFriend(calcularNivelCajaNormal(), x, y); 
        }
        guardarPartida(); 
    }); 
}

function crearCajaOffline(esDorada = false, posX = null, posY = null) { 
    if (document.querySelectorAll('.caja').length >= 7) return; 
    const caja = document.createElement('div'); caja.classList.add('caja'); 
    if (esDorada) caja.classList.add('caja-dorada');
    caja.style.transition = "none"; 
    
    let targetX = posX !== null ? parseFloat(posX) : Math.random() * (window.innerWidth - 95);
    let targetY = posY !== null ? parseFloat(posY) : Math.random() * (window.innerHeight - 200) + 20;
    caja.style.left = `${targetX}px`; caja.style.top = `${targetY}px`; 
    board.appendChild(caja); 
    
    caja.addEventListener('pointerdown', () => { 
        if (juegoPausado) return; 
        if (document.querySelectorAll('#game-board .friend').length >= 20 && !esDorada) { 
            mostrarAvisoFlotante(parseFloat(caja.style.left), parseFloat(caja.style.top) - 20, "¡LLENO!"); 
            estadisticasLogros.ansiasActivado++; verificarLogro('el_ansias'); 
            return; 
        } 
        
        caja.style.pointerEvents = "none";
        const rect = caja.getBoundingClientRect(); const boardRect = board.getBoundingClientRect(); caja.remove(); 
        
        if (esDorada) {
            let cps = 0; document.querySelectorAll('.friend').forEach(f => { cps += calcularIngresoColega(parseInt(f.dataset.level)); }); 
            let premioDorado = Math.max(300, Math.floor((cps * multiplicadorPasivo) * 45)); 
            ganarCubatas(premioDorado); 
            mostrarTextoFlotanteEpico(rect.left - boardRect.left - 20, rect.top - boardRect.top, "¡+" + premioDorado.toLocaleString('es-ES') + " 🥃!"); 
            
            let suerte = Math.random(); let nivelDorado = 0;
            if (suerte < 0.15) { nivelDorado = maxNivelDesbloqueado; } 
            else if (suerte < 0.50) { nivelDorado = Math.max(0, maxNivelDesbloqueado - 1); } 
            else { nivelDorado = Math.max(0, maxNivelDesbloqueado - 2); }
            createFriend(nivelDorado, rect.left - boardRect.left, rect.top - boardRect.top);
        } else {
            ganarCubatas(1 * multiplicadorClic); createFriend(calcularNivelCajaNormal(), rect.left - boardRect.left, rect.top - boardRect.top); 
        }
        estadisticasLogros.cajasAbiertas++; verificarLogro('lluvia_litros'); guardarPartida(); 
    }); 
}

function spawnAmigoInicial() { 
    const xCentro = (window.innerWidth / 2) - 45; const yCentro = (window.innerHeight / 2) - 45; 
    createFriend(0, xCentro, yCentro); 
}

function createFriend(level, x, y) { 
    const friend = document.createElement('div'); friend.classList.add('friend'); 
    friend.style.animation = "pop 0.4s ease-in-out"; friend.dataset.level = level; 
    friend.style.backgroundImage = `url('${levels[level]}')`; 
    friend.style.width = `95px`; friend.style.height = `95px`; 
    friend.style.left = `${x}px`; friend.style.top = `${y}px`; 
    
    friend.addEventListener('pointerdown', startDrag); 
    
    if (level >= 8) document.getElementById('game-board-vip').appendChild(friend); 
    else document.getElementById('game-board').appendChild(friend);
    
    actualizarCubatasPorSegundo(); 
}

function startDrag(e) { 
    if (juegoPausado) return; dragItem = e.target; const rect = dragItem.getBoundingClientRect(); 
    let clientX = e.clientX !== undefined ? e.clientX : e.touches[0].clientX; 
    let clientY = e.clientY !== undefined ? e.clientY : e.touches[0].clientY; 
    offsetX = clientX - rect.left; offsetY = clientY - rect.top; 
    
    document.addEventListener('pointermove', drag); document.addEventListener('pointerup', endDrag); 
    document.addEventListener('touchmove', dragTouch, {passive: false}); document.addEventListener('touchend', endDragTouch); 
}
function drag(e) { 
    if (!dragItem || juegoPausado) return; const boardRect = dragItem.parentElement.getBoundingClientRect(); 
    let newX = Math.max(0, Math.min(e.clientX - boardRect.left - offsetX, boardRect.width - dragItem.offsetWidth)); 
    let newY = Math.max(0, Math.min(e.clientY - boardRect.top - offsetY, boardRect.height - dragItem.offsetHeight));
    dragItem.style.left = `${newX}px`; dragItem.style.top = `${newY}px`; 
}
function dragTouch(e) { 
    if (!dragItem || juegoPausado) return; e.preventDefault(); const boardRect = dragItem.parentElement.getBoundingClientRect(); 
    let newX = Math.max(0, Math.min(e.touches[0].clientX - boardRect.left - offsetX, boardRect.width - dragItem.offsetWidth)); 
    let newY = Math.max(0, Math.min(e.touches[0].clientY - boardRect.top - offsetY, boardRect.height - dragItem.offsetHeight));
    dragItem.style.left = `${newX}px`; dragItem.style.top = `${newY}px`; 
}
function endDrag() { limpiarEventos(); }
function endDragTouch() { limpiarEventos(); }

function limpiarEventos() { 
    if (!dragItem || !dragItem.parentElement) {
        dragItem = null; 
        document.removeEventListener('pointermove', drag); document.removeEventListener('pointerup', endDrag); 
        document.removeEventListener('touchmove', dragTouch); document.removeEventListener('touchend', endDragTouch); 
        return;
    }
    const friends = dragItem.parentElement.querySelectorAll('.friend'); const rect1 = dragItem.getBoundingClientRect(); 
    for (let other of friends) { 
        if (other !== dragItem) { 
            const rect2 = other.getBoundingClientRect(); 
            if (!(rect1.right < rect2.left || rect1.left > rect2.right || rect1.bottom < rect2.top || rect1.top > rect2.bottom)) { 
                if (dragItem.dataset.level === other.dataset.level) { 
                    const currentLevel = parseInt(dragItem.dataset.level); 
                    if (currentLevel < levels.length - 1) { 
                        const newX = parseFloat(other.style.left); const newY = parseFloat(other.style.top); 
                        dragItem.remove(); other.remove(); ganarCubatas((currentLevel + 1) * 5); 
                        const nuevoNivel = currentLevel + 1; createFriend(nuevoNivel, newX, newY); verificarLogro('calentamiento'); 
                        
                        if (nuevoNivel > maxNivelDesbloqueado) { 
                            maxNivelDesbloqueado = nuevoNivel; mostrarCinematica(nuevoNivel); actualizaEstilosExtremos(); 
                            if (nuevoNivel === levels.length - 1) setTimeout(comprobarGanadorGoldenTicket, 3000);
                        }
                        break; 
                    } 
                } 
            } 
        } 
    } 
    dragItem = null; 
    document.removeEventListener('pointermove', drag); document.removeEventListener('pointerup', endDrag); 
    document.removeEventListener('touchmove', dragTouch); document.removeEventListener('touchend', endDragTouch); 
    actualizarCubatasPorSegundo(); guardarPartida(); 
}

// ============================================================================
// 8. MECÁNICAS DE CLICKER SECUNDARIAS
// ============================================================================
function generarVomito() { 
    if (juegoPausado) return; 
    document.querySelectorAll('#game-board .friend').forEach(f => { 
        const vomito = document.createElement('div'); 
        vomito.classList.add('vomito'); vomito.innerText = '🤮'; 
        let x = parseFloat(f.style.left) + (Math.random() * 40 - 10); 
        let y = parseFloat(f.style.top) + 95; 
        vomito.style.left = `${x}px`; vomito.style.top = `${y}px`; 
        vomito.dataset.valor = (parseInt(f.dataset.level) + 1) * 2; 
        
        vomito.addEventListener('pointerdown', (e) => { 
            e.stopPropagation(); e.preventDefault(); 
            if (juegoPausado) return; if (navigator.vibrate) navigator.vibrate(40);
            const valorVomito = parseInt(vomito.dataset.valor); ganarCubatas(valorVomito); 
            mostrarTextoFlotante(x, y, valorVomito); vomito.remove(); 
            estadisticasLogros.vomitosLipiados++; verificarLogro('estomago_hierro'); 
        }); 
        
        f.parentElement.appendChild(vomito); 
        setTimeout(() => { if (vomito && vomito.parentElement) vomito.remove(); }, 10000);
    }); 
}

function recogerVomitoAutomatico() { 
    if (juegoPausado) return; let totalRecolectado = 0; 
    document.querySelectorAll('.vomito').forEach(v => { 
        const valor = parseInt(v.dataset.valor); totalRecolectado += valor; 
        mostrarTextoFlotante(parseFloat(v.style.left), parseFloat(v.style.top), valor); v.remove(); 
    }); 
    if (totalRecolectado > 0) ganarCubatas(totalRecolectado); 
}

// ============================================================================
// 9. TIENDA DE MEJORAS Y PERSONAJES
// ============================================================================
function abrirTienda() { 
    pausarJuego(); ocultarTodosModales(); 
    document.getElementById('shop-modal').classList.remove('oculto'); 
    renderizarMejoras(); actualizarTiendaPersonajes(); 
}

function cambiarTab(pestana) { 
    document.getElementById('tab-mejoras').classList.add('oculto'); document.getElementById('tab-personajes').classList.add('oculto'); 
    document.getElementById('btn-tab-mejoras').style.background = '#000'; document.getElementById('btn-tab-mejoras').style.color = '#00ff00';
    document.getElementById('btn-tab-personajes').style.background = '#000'; document.getElementById('btn-tab-personajes').style.color = '#00ff00';
    document.getElementById(`tab-${pestana}`).classList.remove('oculto'); 
    document.getElementById(`btn-tab-${pestana}`).style.background = '#00ff00'; document.getElementById(`btn-tab-${pestana}`).style.color = '#000';
    if (pestana === 'mejoras') renderizarMejoras();
    if (pestana === 'personajes') actualizarTiendaPersonajes(); 
}

function renderizarMejoras() {
    const tab = document.getElementById('tab-mejoras'); if(!tab) return;
    let html = '<div class="shop-seccion-titulo" style="margin-top:0;">⭐ PERMANENTES</div>';
    
    let pctVel = (nivelVelocidad / maxNivelVelocidad) * 100;
    let btnVel = nivelVelocidad >= maxNivelVelocidad ? `<button class="boton-arcade desactivado" disabled>MÁX</button>` : `<button class="boton-arcade" onclick="comprarVelocidad()">${costeVelocidad.toLocaleString('es-ES')} 🥃</button>`;
    html += `<div class="upgrade-row"><div class="upgrade-icon">🚀</div><div class="upgrade-info"><h4>Reparto Rápido</h4><div class="barra-progreso-bg"><div class="barra-progreso-fill" style="width:${pctVel}%;"></div><span class="barra-texto">NVL ${nivelVelocidad}/${maxNivelVelocidad}</span></div></div>${btnVel}</div>`;
    
    const datosVIP = TABLA_CALIDAD_VIP[nivelAparicion] || TABLA_CALIDAD_VIP[0];
    let pctCal = (nivelAparicion / maxNivelCalidad) * 100;
    let btnCal = nivelAparicion >= maxNivelCalidad ? `<button class="boton-arcade desactivado" disabled>MÁX</button>` : `<button class="boton-arcade" onclick="comprarCalidad()">${datosVIP.coste.toLocaleString('es-ES')} 🥃</button>`;
    let textoProgresoVIP = nivelAparicion >= maxNivelCalidad ? `<p style="font-size:7.5px; color:#00ff00;">Prob: ${datosVIP.desc} (Tope)</p>` : `<p style="font-size:7.5px; color:#ccc;">Prob: <span style="color:#fff;">${datosVIP.desc}</span> ➔ <span style="color:#ffd700;">${datosVIP.sig}</span></p>`;
    html += `<div class="upgrade-row"><div class="upgrade-icon">💎</div><div class="upgrade-info"><h4>Juerguista VIP</h4>${textoProgresoVIP}<div class="barra-progreso-bg"><div class="barra-progreso-fill" style="width:${pctCal}%;"></div><span class="barra-texto">NVL ${nivelAparicion}/${maxNivelCalidad}</span></div></div>${btnCal}</div>`;

    let pctTrac = (nivelTractor / maxNivelTractor) * 100;
    let btnTrac = nivelTractor >= maxNivelTractor ? `<button class="boton-arcade desactivado" disabled>MÁX</button>` : `<button class="boton-arcade" onclick="comprarTractor()">${costeTractor.toLocaleString('es-ES')} 🥃</button>`;
    html += `<div class="upgrade-row"><div class="upgrade-icon">🚜</div><div class="upgrade-info"><h4>Tractor Kzurro</h4><div class="barra-progreso-bg"><div class="barra-progreso-fill" style="width:${pctTrac}%;"></div><span class="barra-texto">NVL ${nivelTractor}/${maxNivelTractor}</span></div></div>${btnTrac}</div>`;

    html += '<div class="shop-seccion-titulo medio">⏳ CONSUMIBLES</div>';

    let cpsActual = 0; document.querySelectorAll('.friend').forEach(f => { cpsActual += calcularIngresoColega(parseInt(f.dataset.level)); }); 
    let precioCharanga = Math.max(25000, Math.floor((cpsActual * multiplicadorPasivo) * 120)); 
    let precioHoraLoca = Math.max(150000, Math.floor((cpsActual * multiplicadorPasivo) * 600)); 

    html += `<div class="upgrade-row" style="border-color:#ffd700;"><div class="upgrade-icon">🎷</div><div class="upgrade-info"><h4 style="color:#ffd700;">La Charanga</h4><p>Dinero pasivo x3 (30s)</p></div><button class="boton-arcade" style="border-color:#ffd700; color:#ffd700;" onclick="boostCharanga(${precioCharanga})">${precioCharanga.toLocaleString('es-ES')} 🥃</button></div>`;
    html += `<div class="upgrade-row" style="border-color:#ff0055;"><div class="upgrade-icon">🌪️</div><div class="upgrade-info"><h4 style="color:#ff0055;">Hora Loca</h4><p>Frenesí de cajas (15s)</p></div><button class="boton-arcade" style="border-color:#ff0055; color:#ff0055;" onclick="boostHoraLoca(${precioHoraLoca})">${precioHoraLoca.toLocaleString('es-ES')} 🥃</button></div>`;

    tab.innerHTML = html;
}

function actualizarTiendaPersonajes() { 
    const tab = document.getElementById('tab-personajes'); if(!tab) return;
    tab.innerHTML = ''; 
    for (let i = 0; i <= maxNivelDesbloqueado; i++) { 
        if(i >= levels.length) break; 
        let precioPersonaje = Math.floor(100 * Math.pow(2.45, i)); 
        let nombreColega = nombresJuerguistas[i] || "Colega";
        tab.innerHTML += `<div class="upgrade-row"><img src="${levels[i]}" style="width:40px; height:40px; object-fit:contain; filter: drop-shadow(0 0 5px #00ff00); flex-shrink:0;"><div class="upgrade-info"><h4>Nivel ${i + 1}</h4><p>${nombreColega}</p></div><button class="boton-arcade" onclick="comprarPersonaje(${i}, ${precioPersonaje})">${precioPersonaje.toLocaleString('es-ES')} 🥃</button></div>`; 
    } 
}

function comprarVelocidad() {
    if (nivelVelocidad >= maxNivelVelocidad) return;
    if (cubatas >= costeVelocidad) {
        cubatas -= costeVelocidad; nivelVelocidad++;
        tiempoSpawnBase = Math.max(1000, 2200 - (nivelVelocidad * 120)); 
        tiempoSpawnActual = tiempoSpawnBase; costeVelocidad = Math.floor(costeVelocidad * 2.2);
        ganarCubatas(0); clearInterval(intervalCajas); if(!juegoPausado) intervalCajas = setInterval(crearCaja, tiempoSpawnActual);
        guardarPartida(); renderizarMejoras();
    } else alert("¡Te faltan cubatas!");
}

function comprarCalidad() {
    if (nivelAparicion >= maxNivelCalidad) return;
    const datosActuales = TABLA_CALIDAD_VIP[nivelAparicion];
    if (cubatas >= datosActuales.coste) {
        cubatas -= datosActuales.coste; nivelAparicion++;
        ganarCubatas(0); guardarPartida(); renderizarMejoras();
    } else alert("¡Te faltan cubatas!");
}

function comprarTractor() {
    if (nivelTractor >= maxNivelTractor) return;
    if (cubatas >= costeTractor) {
        cubatas -= costeTractor; nivelTractor++;
        if (!limpiezaActivada) { limpiezaActivada = true; if(!juegoPausado) intervalRecoger = setInterval(recogerVomitoAutomatico, 4000); verificarLogro('vip_barra'); }
        tiempoPasivo = Math.max(500, 3000 - (nivelTractor * 250)); costeTractor = Math.floor(costeTractor * 2.2); 
        ganarCubatas(0); iniciarBuclePasivo(); guardarPartida(); renderizarMejoras();
    } else alert("¡Te faltan cubatas!");
}

function boostCharanga(precio) {
    if (cubatas >= precio) { 
        cubatas -= precio; ganarCubatas(0); multiplicadorPasivo = 3; clearTimeout(timeoutMultiplicador); 
        timeoutMultiplicador = setTimeout(() => { multiplicadorPasivo = 1; actualizarCubatasPorSegundo(); renderizarMejoras(); }, 30000);
        actualizarCubatasPorSegundo(); guardarPartida(); renderizarMejoras();
    } else alert("¡Te faltan cubatas!");
}

function boostHoraLoca(precio) {
    if (boostVelocidadActivo) { alert("¡Frenesí ya activo!"); return; }
    if (cubatas >= precio) { 
        cubatas -= precio; ganarCubatas(0); boostVelocidadActivo = true; 
        let backupSpawn = tiempoSpawnActual; tiempoSpawnActual = 400; 
        clearInterval(intervalCajas); intervalCajas = setInterval(crearCaja, tiempoSpawnActual); 
        estadisticasLogros.frenesisActivados++; verificarLogro('frenesi_loco'); 
        setTimeout(() => { boostVelocidadActivo = false; tiempoSpawnActual = backupSpawn; clearInterval(intervalCajas); if(!juegoPausado) intervalCajas = setInterval(crearCaja, tiempoSpawnActual); }, 15000); 
        guardarPartida(); renderizarMejoras();
    } else alert("¡Te faltan cubatas!");
}

function comprarPersonaje(nivel, precio) { 
    let tableroDestino = nivel >= 8 ? document.getElementById('game-board-vip') : document.getElementById('game-board');
    if (tableroDestino.querySelectorAll('.friend').length >= 20) { alert(nivel >= 8 ? "¡El reservado VIP está a tope! (Máx 20)." : "¡La pradera está a tope! (Máx 20)."); return; } 
    if (cubatas >= precio) { 
        cubatas -= precio; ganarCubatas(0); 
        const xCentro = (window.innerWidth / 2) - 45; const yCentro = (window.innerHeight / 2) - 45; 
        createFriend(nivel, xCentro, yCentro); guardarPartida(); actualizarTiendaPersonajes(); 
    } else alert("¡Te faltan cubatas!"); 
}

// ============================================================================
// 10. EL CASINO (SOBRES VIP Y WALKOUTS)
// ============================================================================
function abrirCasino() {
    cerrarModales(); 
    if (casinoVIP) { document.getElementById('casino-modal').classList.remove('oculto'); actualizarBotonesSobres(); } 
    else { document.getElementById('pago-casino-modal').classList.remove('oculto'); }
}

function actualizarBotonesSobres() {
    let precioActual = calcularPrecioSobre(); let precioTexto = "";
    if (precioActual >= 1000000) precioTexto = (precioActual / 1000000).toFixed(1) + "M";
    else if (precioActual >= 1000) precioTexto = Math.floor(precioActual / 1000) + "K";
    else precioTexto = precioActual.toLocaleString('es-ES');

    const packProhibido = document.getElementById('pack-prohibido');
    if (packProhibido) { if (sobresGratisEpico > 0) packProhibido.style.display = 'flex'; else packProhibido.style.display = 'none'; }

    document.querySelectorAll('.etiqueta-precio').forEach(etiqueta => {
        if (sobresGratisEpico > 0) { 
            etiqueta.innerHTML = '<span style="color:#00ff00; text-shadow:none;">GRATIS (' + sobresGratisEpico + ')</span>'; 
            etiqueta.style.borderColor = '#00ff00'; 
        } else { 
            etiqueta.innerHTML = '<span class="icono-moneda">🥃</span> ' + precioTexto; 
            etiqueta.style.borderColor = '#00ff00'; 
        }
    });

    document.querySelectorAll('.stat-num').forEach(num => { 
        num.innerText = (sobresGratisEpico > 0) ? "0" : precioTexto; 
    });
}

function abrirWalkout(elementoCarta, tier) {
    if (sobreAbriendo) return; const cfg = SOBRES[tier]; if (!cfg) return;
    
    const esGratis = (tier === 'epico' && sobresGratisEpico > 0);
    let precioDinamico = calcularPrecioSobre();
    
    if (!esGratis) { 
        if (cubatas < precioDinamico) { alert("¡Te faltan cubatas para este sobre!"); return; } 
        cubatas -= precioDinamico; ganarCubatas(0); 
    } else { sobresGratisEpico--; }

    let tituloDOM = elementoCarta.querySelector('.titulo-sobre');
    if (tituloDOM) {
        let nombreSobre = tituloDOM.innerText.trim();
        if (!estadisticasLogros.sobresDiferentes) estadisticasLogros.sobresDiferentes = [];
        if (!estadisticasLogros.sobresDiferentes.includes(nombreSobre)) {
            estadisticasLogros.sobresDiferentes.push(nombreSobre);
            estadisticasLogros.tiposSobres = estadisticasLogros.sobresDiferentes.length;
            verificarLogro('coleccionista');
        }
    }

    guardarPartida(); sobreAbriendo = true; document.getElementById('casino-modal').classList.add('oculto');
    
    const modal = document.getElementById('walkout-modal'); const camera = document.getElementById('walkout-camera');
    const neones = document.querySelectorAll('.neon-tube:not(.apagada-caminante)'); const neonCaminante = document.querySelector('.apagada-caminante');
    const flares = document.getElementById('walkout-flares'); const doors = document.getElementById('walkout-doors');
    const flash = document.getElementById('walkout-flash'); const rewardContainer = document.getElementById('walkout-reward-container');
    const rewardImg = document.getElementById('walkout-reward-img'); const premioTxt = document.getElementById('walkout-premio');
    const btnCerrar = document.getElementById('walkout-btn-cerrar');

    modal.classList.remove('oculto'); camera.classList.remove('camera-moving'); doors.classList.remove('doors-glowing', 'doors-open'); flares.classList.remove('flares-on'); flash.classList.remove('flash-boom'); neones.forEach(n => n.classList.remove('on')); if(neonCaminante) neonCaminante.classList.remove('on'); rewardContainer.classList.add('oculto'); rewardContainer.classList.remove('card-fly-in'); rewardImg.classList.add('oculto'); btnCerrar.classList.add('oculto');

    let premiosCalculados = JSON.parse(JSON.stringify(cfg.premios));
    if (eventoHoraLocaGlobal) {
        premiosCalculados.forEach(p => {
            if (p.tipo === 'chupito') p.peso = p.peso * 5;      
            if (p.tipo === 'cubata_real') p.peso = p.peso * 5;  
            if (p.tipo === 'cubatas') p.peso = 92.5;            
        });
    }

    let tirada = Math.random() * 100; let premioBase;
    for (const p of premiosCalculados) { if (tirada < p.peso) { premioBase = p; break; } tirada -= p.peso; }
    if(!premioBase) premioBase = premiosCalculados[0];
    
    let premio = procesarStock(premioBase);
    const esPremioFisico = (premio.tipo === 'chupito' || premio.tipo === 'cubata_real');

    setTimeout(() => {
        camera.classList.add('camera-moving');
        if (esPremioFisico) {
            setTimeout(() => { neones.forEach(n => n.classList.add('on'));
                setTimeout(() => { flares.classList.add('flares-on');
                    setTimeout(() => { doors.classList.add('doors-glowing');
                        setTimeout(() => { doors.classList.add('doors-open');
                            setTimeout(() => { flash.classList.add('flash-boom');
                                setTimeout(() => {
                                    rewardContainer.classList.remove('oculto'); rewardContainer.classList.add('card-fly-in');
                                    rewardImg.src = premio.tipo === 'chupito' ? 'chupito.png' : 'cubata.png'; rewardImg.classList.remove('oculto');
                                    premioTxt.innerText = premio.texto; btnCerrar.dataset.premioFisico = premio.texto;
                                    setTimeout(() => { btnCerrar.classList.remove('oculto'); sobreAbriendo = false; actualizarBotonesSobres(); }, 1500);
                                }, 200); 
                            }, 300); 
                        }, 800); 
                    }, 1000); 
                }, 1400); 
            }, 800); 
        } else {
            setTimeout(() => { neones.forEach(n => n.classList.add('on')); if(neonCaminante) neonCaminante.classList.add('on');
                setTimeout(() => { doors.classList.add('doors-open');
                    setTimeout(() => {
                        rewardContainer.classList.remove('oculto'); rewardContainer.classList.add('card-fly-in');
                        
                        let cantidad = 0;
                        if (premio.minMult) {
                            let costePagado = esGratis ? calcularPrecioSobre() : precioDinamico;
                            cantidad = Math.floor(costePagado * premio.minMult + Math.random() * (costePagado * (premio.maxMult - premio.minMult)));
                        } else {
                            cantidad = Math.floor(premio.min + Math.random() * (premio.max - premio.min));
                        }
                        
                        ganarCubatas(cantidad);
                        premioTxt.style.color = "#00ff00"; premioTxt.innerText = premio.texto.replace('{x}', cantidad.toLocaleString('es-ES'));
                        setTimeout(() => { btnCerrar.classList.remove('oculto'); sobreAbriendo = false; actualizarBotonesSobres(); }, 1000);
                    }, 300);
                }, 600);
            }, 500);
        }
    }, 50);
}

function cerrarWalkout() {
    document.getElementById('walkout-modal').classList.add('oculto');
    const btnCerrar = document.getElementById('walkout-btn-cerrar');
    if (btnCerrar.dataset.premioFisico) { entregarPremioFisico(btnCerrar.dataset.premioFisico); btnCerrar.dataset.premioFisico = ""; }
}

function procesarStock(premioElegido) {
    const hoy = obtenerDiaDeFiesta();
    
    if (premioElegido.tipo === 'chupito') {
        if ((estadisticasLogros.chupitosGanados || 0) >= 2) return { tipo: 'cubatas', min: 3000000, max: 3000000, texto: "LÍMITE ALCANZADO: +3.000.000 🥃" };
        
        // 1. Tira primero del stock del evento
        if (eventoHoraLocaGlobal && stockChupitosEvento > 0) { 
            stockChupitosEvento--; 
            if(db) db.collection("control_barra").doc("evento_global").update({ chupitos: firebase.firestore.FieldValue.increment(-1) }).catch(()=>{}); 
            return premioElegido; 
        } 
        // 2. Si no hay del evento, tira del stock diario normal
        else if (stockChupitosHoy > 0) { 
            stockChupitosHoy--; 
            if(db) db.collection("control_barra").doc(hoy).update({ chupitos: firebase.firestore.FieldValue.increment(-1) }).catch(()=>{}); 
            return premioElegido; 
        } 
        // 3. Si no hay de nada, da dinero
        else { 
            return { tipo: 'cubatas', min: 5000000, max: 5000000, texto: "AGOTADO HOY: +5.000.000 🥃" }; 
        }
        
    } else if (premioElegido.tipo === 'cubata_real') {
        if ((estadisticasLogros.cubatasRealesGanados || 0) >= 2) return { tipo: 'cubatas', min: 8000000, max: 8000000, texto: "LÍMITE ALCANZADO: +8.000.000 🥃" };
        
        if (eventoHoraLocaGlobal && stockCubatasEvento > 0) { 
            stockCubatasEvento--; 
            if(db) db.collection("control_barra").doc("evento_global").update({ cubatas: firebase.firestore.FieldValue.increment(-1) }).catch(()=>{}); 
            return premioElegido; 
        } 
        else if (stockCubatasHoy > 0) { 
            stockCubatasHoy--; 
            if(db) db.collection("control_barra").doc(hoy).update({ cubatas: firebase.firestore.FieldValue.increment(-1) }).catch(()=>{}); 
            return premioElegido; 
        } 
        else { 
            return { tipo: 'cubatas', min: 10000000, max: 10000000, texto: "AGOTADO HOY: +10.000.000 🥃" }; 
        }
    }
    return premioElegido;
}

// ============================================================================
// 11. SISTEMA DE CUPONES Y STAFF VIP
// ============================================================================
function abrirInventarioCupones() {
    ocultarTodosModales(); document.getElementById('cupones-inventario-modal').classList.remove('oculto');
    const contenedor = document.getElementById('lista-cupones'); contenedor.innerHTML = "";
    if (!inventarioCupones || inventarioCupones.length === 0) {
        contenedor.innerHTML = `<div style="padding: 30px 10px;"><span style="font-size: 40px;">🕸️</span><p style="color:#666; margin-top: 15px; font-weight:bold; font-size:12px; line-height:1.6;">No tienes cupones todavía...<br><br>¡Prueba suerte abriendo Sobres VIP o pásate el juego para ganar!</p></div>`; return;
    }
    inventarioCupones.forEach((cupon, index) => {
        contenedor.innerHTML += `<div style="border: 2px dashed #00ff00; background: #111; padding: 15px; margin-bottom: 15px; border-radius: 8px; text-align: center;"><h4 style="color:#ffd700; margin-bottom:10px; font-size:14px; text-shadow: 0 0 5px #ffd700;">${cupon.texto}</h4><p style="color:#ccc; font-size:10px; margin-bottom:15px; font-family: 'Press Start 2P', cursive;">CÓDIGO: ${cupon.codigo}</p><button onclick="verCuponParaQuemar(${index})" class="boton-arcade" style="background:#ff0055; width: 100%; border-color: white;">IR A LA BARRA 🍹</button></div>`;
    });
}

function verCuponParaQuemar(index) {
    cuponActivoIndex = index;
    const modalInv = document.getElementById('cupones-inventario-modal'); if (modalInv) modalInv.classList.add('oculto');
    const cupon = inventarioCupones[index];
    document.getElementById('cupon-desc').innerText = cupon.texto; document.getElementById('cupon-codigo').innerText = cupon.codigo;
    document.getElementById('cupon-modal').classList.remove('oculto');
}

function cerrarCupon() { document.getElementById('cupon-modal').classList.add('oculto'); cuponActivoTipo = ""; reanudarJuego(); }

function entregarPremioFisico(textoPremio) {
    if (!db) { alert("⚠️ Error de conexión. No se pudo registrar en la barra."); return; }
    const codigoGen = Math.random().toString(36).substring(2, 8).toUpperCase(); const codigoCompleto = "#" + codigoGen;
    db.collection("cupones_validos").doc(codigoGen).set({ codigo: codigoCompleto, premio: textoPremio, jugador: nombreJugador, creadoEn: firebase.firestore.FieldValue.serverTimestamp(), activo: true }).then(() => {
        inventarioCupones.push({ texto: textoPremio, codigo: codigoCompleto });
        let textoMayus = textoPremio.toUpperCase();
        if (textoMayus.includes("CHUPITO")) estadisticasLogros.chupitosGanados = (estadisticasLogros.chupitosGanados || 0) + 1;
        if (textoMayus.includes("CUBATA")) estadisticasLogros.cubatasRealesGanados = (estadisticasLogros.cubatasRealesGanados || 0) + 1;
        guardarPartida(); subirPuntuacion(); mostrarNotificacion("🎟️ ¡PREMIO REGISTRADO Y GUARDADO!");
    }).catch(() => { alert("❌ Error al registrar el premio en la barra."); });
}

function quemarCupon() {
    if (cuponActivoIndex === -1 || !db) return;
    const cupon = inventarioCupones[cuponActivoIndex]; const idCupon = cupon.codigo.replace("#", "");
    if (confirm("⚠️ ¿ERES EL CAMARERO?\n\nVerificando autenticidad en la base de datos...")) {
        const docRef = db.collection("cupones_validos").doc(idCupon);
        db.runTransaction((transaction) => {
            return transaction.get(docRef).then((doc) => {
                if (!doc.exists) throw "CUPON_FALSO"; if (!doc.data().activo) throw "CUPON_YA_CANJEADO";
                transaction.update(docRef, { activo: false, canjeadoEn: firebase.firestore.FieldValue.serverTimestamp() }); return true;
            });
        }).then(() => {
            inventarioCupones.splice(cuponActivoIndex, 1); guardarPartida(); cuponActivoIndex = -1; 
            alert("✅ ¡CUPÓN VÁLIDO Y CANJEADO!\nPuedes servir la consumición."); cerrarModales();
        }).catch((error) => {
            if (error === "CUPON_FALSO") alert("🚨 ALERTA: Este cupón es FALSO. No servir.");
            else if (error === "CUPON_YA_CANJEADO") alert("⚠️ Este cupón YA FUE CANJEADO anteriormente.");
            else alert("❌ Error de conexión al validar con la barra.");
        });
    }
}

function comprobarGanadorGoldenTicket() {
    if (estadisticasLogros.intentoTicketDorado || !db) return;
    const docRef = db.collection("control_barra").doc("tickets_dorados");
    db.runTransaction((transaction) => {
        return transaction.get(docRef).then((doc) => {
            let entregados = 0; if (doc.exists && doc.data().entregados !== undefined) entregados = doc.data().entregados; 
            if (entregados < 5) { const puesto = entregados + 1; transaction.set(docRef, { entregados: puesto }, { merge: true }); return puesto; } else return false; 
        });
    }).then((puesto) => {
        estadisticasLogros.intentoTicketDorado = true; guardarPartida();
        if (puesto !== false) {
            if (puesto <= 3) { mostrarNotificacion(`🎟️ ¡QUEDASTE #${puesto}! HAS GANADO UN CUBATA`); entregarPremioFisico(`🎟️ TICKET DORADO (${puesto}º PUESTO): ¡UN CUBATA EN BARRA!`); } 
            else { mostrarNotificacion(`🎟️ ¡QUEDASTE #${puesto}! HAS GANADO UN CHUPITO`); entregarPremioFisico(`🎟️ TICKET DORADO (${puesto}º PUESTO): ¡UN CHUPITO EN BARRA!`); }
        } else mostrarNotificacion("😢 Te has pasado el juego, ¡pero los 5 premios ya se agotaron!");
    }).catch(() => {});
}

function abrirPanelCamarero() {
    // Si ya estamos autenticados con Firebase en esta sesión, abrimos directo
    if (firebase.auth().currentUser || claveStaffActiva !== "") {
        mostrarModalStaff();
        return;
    }

    let pass = prompt("Contraseña Maestra de la Barra:");
    if (!pass) return;

    // 👇 VALIDACIÓN EN EL BACKEND DE FIREBASE 👇
    // Enviamos la petición al servidor. Firebase compara el hash y devuelve un JWT seguro.
    firebase.auth().signInWithEmailAndPassword("staff@juergacivil.com", pass)
        .then((userCredential) => {
            // ¡Éxito! El servidor confirmó la contraseña
            claveStaffActiva = "autorizado"; 
            mostrarModalStaff();
        })
        .catch((error) => {
            // El servidor denegó el acceso
            alert("❌ Contraseña incorrecta o error de conexión.");
        });
}

// Función auxiliar para mantener el código limpio
function mostrarModalStaff() {
    ocultarTodosModales(); 
    const modal = document.getElementById('staff-modal'); 
    if(modal) modal.classList.remove('oculto'); 
    cargarPeticionesVIP();
}

function cargarPeticionesVIP() {
    if (!db) return; const lista = document.getElementById('lista-peticiones-vip'); if(!lista) return;
    lista.innerHTML = "<p style='color:#ccc; text-align:center;'>Buscando peticiones... 📡</p>";
    db.collection("pases_vip").where("autorizado", "==", false).onSnapshot((querySnapshot) => {
          lista.innerHTML = ""; 
          if (querySnapshot.empty) { lista.innerHTML = "<div style='text-align:center; padding: 20px 0;'><span style='font-size:30px;'>🍻</span><p style='color:#00ff00; font-size:12px; margin-top:10px;'>Todo despejado.<br>Nadie esperando.</p></div>"; return; }
          querySnapshot.forEach((doc) => {
              const data = doc.data();
              lista.innerHTML += `<div style="background:#222; padding:12px; border-radius:8px; border:2px dashed #ff00ff; display:flex; flex-direction:column; gap:10px;"><span style="color:white; font-weight:bold; font-size:12px; font-family: Arial, sans-serif; text-align:center;">👤 ${data.jugador}</span><div style="display:flex; justify-content:space-between; gap:10px;"><button onclick="denegarJugadorRapido('${data.jugador}')" style="flex:1; background:#ff4444; color:white; padding:10px 0; font-weight:bold; border:3px solid #000; border-radius:6px; cursor:pointer; font-family: 'Press Start 2P', cursive; font-size:10px; box-shadow: 2px 2px 0 #aa0000;">❌ NO</button><button onclick="autorizarJugadorRapido('${data.jugador}')" style="flex:1; background:#00ff00; color:black; padding:10px 0; font-weight:bold; border:3px solid #000; border-radius:6px; cursor:pointer; font-family: 'Press Start 2P', cursive; font-size:10px; box-shadow: 2px 2px 0 #009900;">✅ SÍ</button></div></div>`;
          });
      });
}

function autorizarJugadorRapido(jugador) {
    if (!db) return; // Quitamos el bloqueo de claveStaffActiva
    db.collection("pases_vip").doc(jugador).set({ autorizado: true, claveStaff: "autorizado" }, { merge: true }).catch(err => { alert("❌ Error de conexión al autorizar."); });
}

function denegarJugadorRapido(jugador) {
    if (!db) return; // Quitamos el bloqueo
    if (confirm(`¿Seguro que quieres DENEGAR el acceso a ${jugador}?`)) {
        db.collection("pases_vip").doc(jugador).delete().catch(err => { alert("❌ Error al intentar denegar."); });
    }
}

function activarEventoGlobal() {
    if (!db) return; // Quitamos el bloqueo aquí también para que puedas iniciar la Hora Loca
    
    let chupis = prompt("¿Cuántos CHUPITOS quieres sortear en esta Hora Loca?", "10");
    if (chupis === null) return; 
    
    let cubas = prompt("¿Cuántos CUBATAS quieres sortear en esta Hora Loca?", "2");
    if (cubas === null) return; 
    
    chupis = parseInt(chupis) || 0;
    cubas = parseInt(cubas) || 0;

    if (confirm(`⚠️ ¿ACTIVAR HORA LOCA VIP?\n\nProbabilidad x5 durante 1 HORA con este stock extra:\n🥂 ${chupis} Chupitos\n🍹 ${cubas} Cubatas`)) {
        let unaHoraEnMs = 60 * 60 * 1000;
        db.collection("control_barra").doc("evento_global").set({
            activoHasta: Date.now() + unaHoraEnMs,
            activadoPor: "staff",
            chupitos: chupis,
            cubatas: cubas
        }).then(() => { alert("✅ ¡Hora Loca VIP activada con éxito!"); }).catch(err => { alert("❌ Error al activar."); });
    }
}

function solicitarPaseVIP() {
    if (!db) { alert("Error de conexión a internet."); return; }
    if (nombreJugador === "Desconocido") { pedirNombre(); if (nombreJugador === "Desconocido") return; }
    db.collection("pases_vip").doc(nombreJugador).set({ jugador: nombreJugador, solicitadoEn: firebase.firestore.FieldValue.serverTimestamp(), autorizado: false }).then(() => {
        alert("📩 Solicitud enviada.\n\nPaga 5€ y se te autorizará tu cuenta."); escucharAutorizacionVIP();
    }).catch((err) => { console.error("Error al solicitar VIP:", err); });
}

function escucharAutorizacionVIP() {
    if (!db || nombreJugador === "Desconocido") return;
    let listener = db.collection("pases_vip").doc(nombreJugador).onSnapshot((doc) => {
        if (doc.exists && doc.data().autorizado === true) {
            casinoVIP = true; localStorage.setItem('casinoVIP', 'true'); guardarPartida(); subirPuntuacion();
            const modalPago = document.getElementById('pago-casino-modal'); if (modalPago) modalPago.classList.add('oculto');
            mostrarNotificacion("👑 ¡PASE VIP AUTORIZADO POR LA BARRA!"); abrirCasino(); listener(); 
        } else if (!doc.exists) {
            alert("❌ Tu solicitud VIP ha sido DENEGADA por la barra.");
            const modalPago = document.getElementById('pago-casino-modal'); if (modalPago) modalPago.classList.add('oculto'); listener(); 
        }
    });
}

function verificarEstadoVIPEnNube() {
    if (!db || nombreJugador === "Desconocido") return;
    db.collection("pases_vip").doc(nombreJugador).get().then((doc) => {
        if (doc.exists && doc.data().autorizado === true) { casinoVIP = true; localStorage.setItem('casinoVIP', 'true'); } 
        else { casinoVIP = false; localStorage.setItem('casinoVIP', 'false'); }
        guardarPartida();
    }).catch(() => {});
}

function sincronizarStockGlobal() {
    if (!db) return; const hoy = obtenerDiaDeFiesta();
    
    // 1. Escuchar el Stock normal del día
    db.collection("control_barra").doc(hoy).onSnapshot((doc) => {
        if (doc.exists) { 
            const data = doc.data(); 
            stockChupitosHoy = data.chupitos !== undefined ? Math.max(0, data.chupitos) : 15; 
            stockCubatasHoy = data.cubatas !== undefined ? Math.max(0, data.cubatas) : 5; 
        } else { 
            stockChupitosHoy = 3; stockCubatasHoy = 2; 
            db.collection("control_barra").doc(hoy).set({ chupitos: 3, cubatas: 2 }); 
        }
        const visualChupis = document.getElementById('stock-visual-chupitos'); const visualCubas = document.getElementById('stock-visual-cubatas');
        if (visualChupis) visualChupis.innerText = stockChupitosHoy; if (visualCubas) visualCubas.innerText = stockCubatasHoy;
    }, () => {});

    // 2. Escuchar el Stock y tiempo de la Hora Loca
    db.collection("control_barra").doc("evento_global").onSnapshot((doc) => {
        if (doc.exists) { 
            const data = doc.data();
            finEventoHoraLoca = data.activoHasta || 0; 
            stockChupitosEvento = data.chupitos !== undefined ? Math.max(0, data.chupitos) : 0;
            stockCubatasEvento = data.cubatas !== undefined ? Math.max(0, data.cubatas) : 0;
        }
        chequearEstadoEvento();
    });
}

setInterval(chequearEstadoEvento, 5000);

function chequearEstadoEvento() {
    let ahora = Date.now();
    if (finEventoHoraLoca > ahora) {
        eventoHoraLocaGlobal = true;
        let quedanMin = Math.ceil((finEventoHoraLoca - ahora) / 60000);
        
        // Actualiza el cartel del casino con el stock en tiempo real
        let banner = document.getElementById('banner-evento-casino');
        if (banner) { 
            banner.style.display = 'block'; 
            banner.innerText = `🔥 HORA LOCA VIP (${quedanMin}m) | Quedan: ${stockChupitosEvento}🥂 ${stockCubatasEvento}🍹 🔥`; 
        }
        
        // Actualiza el panel del staff
        let estadoStaff = document.getElementById('staff-estado-evento');
        if (estadoStaff) estadoStaff.innerText = `ACTIVO: ${quedanMin}m | Stock: ${stockChupitosEvento}🥂 ${stockCubatasEvento}🍹`;
    } else {
        eventoHoraLocaGlobal = false;
        let banner = document.getElementById('banner-evento-casino');
        if (banner) banner.style.display = 'none';
        let estadoStaff = document.getElementById('staff-estado-evento');
        if (estadoStaff) estadoStaff.innerText = `Estado: APAGADO`;
    }
}



// ============================================================================
// 12. MENÚS E INTERFAZ
// ============================================================================
function abrirLogros() { 
    ocultarTodosModales(); document.getElementById('logros-modal').classList.remove('oculto'); 
    const contenedor = document.getElementById('lista-logros-contenedor'); contenedor.innerHTML = ''; 
    for (let id in infoLogros) { 
        let l = infoLogros[id]; let completado = logrosDesbloqueados[id]; 
        let textoProgreso = completado ? `<span style="color:#00c853; font-weight:bold;">🏆 COMPLETADO</span>` : `<span style="color:#ffaa00;">En progreso...</span>`; 
        contenedor.innerHTML += `<div class="libro-item" style="background:${completado ? '#e8f5e9' : 'white'};"><div class="libro-info" style="width:100%;"><h4 style="color:${completado ? '#00c853' : '#ff0055'};">${l.titulo}</h4><p style="color:#555; font-size:12px; font-weight:normal; margin-bottom:4px;">${l.desc}</p><div style="display:flex; justify-content:space-between; font-size:11px; font-weight:bold;"><span>Premio: +${l.premio.toLocaleString('es-ES')} 🍹</span>${textoProgreso}</div></div></div>`; 
    } 
}

function abrirMenuPrincipal() { pausarJuego(); ocultarTodosModales(); document.getElementById('menu-modal').classList.remove('oculto'); }
function abrirJuerguistas() { ocultarTodosModales(); document.getElementById('juerguistas-modal').classList.remove('oculto'); renderizarJuerguistas(); }
function abrirOpciones() { ocultarTodosModales(); document.getElementById('opciones-modal').classList.remove('oculto'); }
function abrirManualDirecto() { ocultarTodosModales(); document.getElementById('manual-modal').classList.remove('oculto'); }
function volverAlMenu() { ocultarTodosModales(); document.getElementById('menu-modal').classList.remove('oculto'); }
function cerrarModales() { ocultarTodosModales(); reanudarJuego(); }
function ocultarTodosModales() { document.querySelectorAll('.modal').forEach(m => m.classList.add('oculto')); }
function toggleVIPRoom() {
    let boardNormal = document.getElementById('game-board'); let boardVIP = document.getElementById('game-board-vip'); let btnVip = document.getElementById('btn-vip-room');
    if (boardNormal.style.display !== 'none') { boardNormal.style.display = 'none'; boardVIP.style.display = 'block'; btnVip.innerText = "VOLVER"; btnVip.style.color = "#00ff00"; btnVip.style.borderColor = "#00ff00"; } 
    else { boardVIP.style.display = 'none'; boardNormal.style.display = 'block'; btnVip.innerText = "ZONA VIP"; btnVip.style.color = "#ff00ff"; btnVip.style.borderColor = "#ff00ff"; }
}
function mostrarCinematica(nivel) { 
    pausarJuego(); if (navigator.vibrate) navigator.vibrate([200, 100, 200, 100, 400]); 
    const cinematic = document.getElementById('unlock-cinematic'); document.getElementById('unlock-img').src = levels[nivel]; document.getElementById('unlock-desc').innerText = `¡NIVEL ${nivel + 1} ALCANZADO!`; 
    cinematic.classList.remove('oculto'); setTimeout(() => { cinematic.classList.add('activo'); }, 20); 
    cinematic.onclick = () => { cinematic.classList.add('oculto'); cinematic.classList.remove('activo'); reanudarJuego(); }; 
}

function renderizarJuerguistas() {
    const contenedor = document.getElementById('juerguistas-contenedor'); if(!contenedor) return; contenedor.innerHTML = ''; 
    levels.forEach((img, index) => {
        const desbloqueado = index <= maxNivelDesbloqueado;
        contenedor.innerHTML += `<div class="libro-item"><img src="${img}" class="${desbloqueado ? '' : 'silueta-bloqueada'}" alt="Colega"><div class="libro-info"><h4>${desbloqueado ? nombresJuerguistas[index] : "???"}</h4><p>${desbloqueado ? `Nivel ${index + 1}` : "Bloqueado"}</p></div></div>`;
    });
}

function abrirMenuDiario() { 
    ocultarTodosModales(); pausarJuego(); 
    document.getElementById('diario-modal').classList.remove('oculto'); renderizarCalendario(); 
}

function renderizarCalendario() {
    const contenedor = document.getElementById('calendario-contenedor'); contenedor.innerHTML = ''; 
    const hoy = new Date(); hoy.setHours(hoy.getHours() - 5); 
    const hoyStr = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}-${String(hoy.getDate()).padStart(2, '0')}`;

    let todosAnterioresReclamados = true;
    for (let i = 0; i < 4; i++) { if (localStorage.getItem('recompensa-' + DIAS_EVENTO[i].fecha) !== 'true') { todosAnterioresReclamados = false; break; } }

    DIAS_EVENTO.forEach((dia) => {
        const yaReclamado = localStorage.getItem('recompensa-' + dia.fecha) === 'true';
        let estadoHTML = ""; let claseExtra = "";

        if (dia.fecha < hoyStr) {
            if (yaReclamado) { estadoHTML = `<button class="btn-reclamar desactivado" disabled>✅ LISTO</button>`; claseExtra = "reclamado"; } 
            else { estadoHTML = `<button class="btn-reclamar desactivado" style="background:#ff4444; border-color:#880000; color:white;" disabled>❌ PASÓ</button>`; claseExtra = "reclamado"; }
        } else if (dia.fecha === hoyStr) {
            if (yaReclamado) { estadoHTML = `<button class="btn-reclamar desactivado" disabled>✅ LISTO</button>`; claseExtra = "reclamado"; } 
            else {
                if (dia.esFinal && !todosAnterioresReclamados) { estadoHTML = `<button class="btn-reclamar desactivado" style="background:#ff4444; border-color:#880000; color:white; font-size:9px;" disabled>❌ FALTAN DÍAS</button>`; claseExtra = "reclamado"; } 
                else { estadoHTML = `<button class="btn-reclamar" onclick="reclamarPremio('${dia.fecha}', ${dia.cantidad})">🎁 RECLAMAR</button>`; claseExtra = "hoy"; }
            }
        } else { estadoHTML = `<button class="btn-reclamar desactivado" style="background:#555; border-color:#222; color:#ccc;" disabled>🔒 ESPERA</button>`; }

        let avisoFinal = dia.esFinal ? '<p style="font-size:8px; color:#ff4444; margin-top:4px;">(Requiere no fallar ni un día)</p>' : '';
        contenedor.innerHTML += `<div class="calendar-day ${claseExtra}"><div class="day-info"><h4 style="color: ${dia.fecha === hoyStr ? '#ff0055' : '#333'};">${dia.nombre}</h4><p style="color: #ffd700; font-size: 11px; font-weight: bold; text-shadow: 1px 1px 0px #000;">${dia.premioDesc}</p>${avisoFinal}</div>${estadoHTML}</div>`;
    });
}

function reclamarPremio(fechaStr, cantidadSobres) {
    sobresGratisEpico += cantidadSobres; 
    alert(`🎁 ¡RECOMPENSA DIARIA!\n\nHas recibido ${cantidadSobres} Sobre(s) de la Peña GRATIS. ¡Ve al Casino a abrirlos!`); 
    localStorage.setItem('recompensa-' + fechaStr, 'true'); guardarPartida(); renderizarCalendario(); actualizarBotonesSobres(); 
}

function abrirRanking() { 
    ocultarTodosModales(); document.getElementById('ranking-modal').classList.remove('oculto'); 
    if (nombreJugador === "Desconocido") { pedirNombre(); subirPuntuacion(); } 
    const contenedor = document.getElementById('ranking-content');
    if (!db) { contenedor.innerHTML = "<p style='color:red;'>Ranking no disponible offline.</p>"; return; }
    contenedor.innerHTML = '<h3 style="color:#333; margin-top:20px;">Cargando... 📡</h3>';
    
    // 👇 Petición a Firebase ordenando por los 3 campos a la vez 👇
    db.collection("ranking")
      .orderBy("cubatasReales", "desc")
      .orderBy("chupitosReales", "desc")
      .orderBy("cubatasTotales", "desc")
      .limit(10)
      .get()
      .then((querySnapshot) => {
        let html = '<h3 style="margin-bottom:15px; color:#ff0055; font-family: \'Press Start 2P\', cursive; font-size:12px; text-shadow: 2px 2px 0px #ccc;">🏆 TOP 10 PEÑA 🏆</h3><div style="text-align:left; font-size: 14px;">';
        let i = 1; 
        
        querySnapshot.forEach((doc) => { 
            let p = doc.data(); 
            let vipIcon = p.esVIP ? '<span title="VIP" style="font-size:12px; margin-left:5px;">💎</span>' : '';
            let colorNombre = "#111"; let fondoFila = (i % 2 === 0) ? '#f5f5f5' : '#ffffff';
            let medalla = ""; let estiloBorde = "border-bottom: 3px solid #333;"; let extraNombre = "";

            if (i === 1) { colorNombre = "#d4af37"; fondoFila = "#fffde7"; medalla = "👑"; estiloBorde = "border: 3px solid #ffd700; box-shadow: 0 0 12px rgba(255,215,0,0.6);"; extraNombre = "text-shadow: 1px 1px 0px #000;"; } 
            else if (i === 2) { colorNombre = "#7a7a7a"; fondoFila = "#f8f9fa"; medalla = "🥈"; estiloBorde = "border: 3px solid #a0a0a0;"; } 
            else if (i === 3) { colorNombre = "#a0522d"; fondoFila = "#fbe9e7"; medalla = "🥉"; estiloBorde = "border: 3px solid #cd7f32;"; }

            html += `<div style="padding: 12px; display:flex; justify-content:space-between; align-items:center; background: ${fondoFila}; border-radius: 8px; margin-bottom: 8px; ${estiloBorde}"><div style="display:flex; flex-direction:column; gap:6px;"><span style="font-weight:bold; font-size:15px; color:${colorNombre}; text-transform:uppercase; ${extraNombre}">${medalla} ${i}. ${p.nombre} ${vipIcon}</span><span style="font-size:10px; color:#555; font-weight:bold; background: #eee; padding: 3px 6px; border-radius: 4px; border: 1px solid #ccc; width: fit-content;">🥂 ${p.chupitosReales || 0}  |  🍹 ${p.cubatasReales || 0}</span></div><div style="display:flex; flex-direction:column; align-items:flex-end; gap:5px;"><div style="background:#ff0055; color:white; padding:4px 8px; border-radius:6px; font-weight:bold; font-size:11px; border:2px solid #333; box-shadow: 2px 2px 0 #000;">Nvl ${p.nivelMaximo}</div><div style="font-size:9px; color:#666; font-weight:bold;">${Math.floor(p.cubatasTotales || 0).toLocaleString('es-ES')} 🥃</div></div></div>`; 
            i++; 
        }); 
        html += '</div>'; contenedor.innerHTML = html;
    }).catch((error) => { 
        console.error("Error cargando ranking:", error);
        contenedor.innerHTML = "<p style='color:red;'>⚠️ Creando índices en Firebase (tarda ~10 min). Revisa la consola del PC.</p>"; 
    });
}

// ============================================================================
// 13. SISTEMA DE GUARDADO LOCAL Y REINICIOS DIARIOS
// ============================================================================
function guardarPartida() {
    if (juegoPausado && !boostVelocidadActivo) return; 
    const amigosEnTablero = [];
    document.querySelectorAll('.friend').forEach(f => { amigosEnTablero.push({ level: f.dataset.level, x: f.style.left, y: f.style.top }); });
    
    const cajasEnTablero = [];
    document.querySelectorAll('.caja').forEach(c => { cajasEnTablero.push({ dorada: c.classList.contains('caja-dorada'), x: c.style.left, y: c.style.top }); });

    const estadoJuego = {
        nombre: nombreJugador, cubatas: cubatas, maxNivelDesbloqueado: maxNivelDesbloqueado, 
        sobresGratisEpico: sobresGratisEpico, regalosReclamados: regalosReclamados, 
        cuponesCanjeados: cuponesCanjeados, estadisticasLogros: estadisticasLogros, 
        logrosDesbloqueados: logrosDesbloqueados, tiempoSpawnBase: tiempoSpawnBase, 
        costeVelocidad: costeVelocidad, nivelVelocidad: nivelVelocidad, nivelAparicion: nivelAparicion,
        tiempoPasivo: tiempoPasivo, costeTractor: costeTractor, nivelTractor: nivelTractor, 
        limpiezaActivada: limpiezaActivada, amigos: amigosEnTablero, inventarioCupones: inventarioCupones, 
        timeStamp: Date.now(), cajasGuardadas: cajasEnTablero 
    };

    const salt = "JuergaCivilSecret_2026_Key!";
    const str = `${estadoJuego.cubatas}_${estadoJuego.maxNivelDesbloqueado}_${estadoJuego.nombre}_${salt}`;
    let hash = 0; for (let i = 0; i < str.length; i++) { hash = (hash << 5) - hash + str.charCodeAt(i); hash |= 0; }
    estadoJuego.firma = hash.toString();

    localStorage.setItem('juergaSave2026', JSON.stringify(estadoJuego));
}

function cargarPartida() {
    const guardado = localStorage.getItem('juergaSave2026');
    if (guardado) {
        let estadoJuego; try { estadoJuego = JSON.parse(guardado); } catch (e) { estadoJuego = null; }
        if (estadoJuego) {
            const salt = "JuergaCivilSecret_2026_Key!";
            const str = `${estadoJuego.cubatas}_${estadoJuego.maxNivelDesbloqueado}_${estadoJuego.nombre}_${salt}`;
            let hash = 0; for (let i = 0; i < str.length; i++) { hash = (hash << 5) - hash + str.charCodeAt(i); hash |= 0; }
            const firmaCalculada = hash.toString();

            if (!estadoJuego.firma || String(estadoJuego.firma) !== firmaCalculada) {
                alert("🚨 Modificación ilegal de datos detectada. Partida reseteada.");
                localStorage.removeItem('juergaSave2026'); location.reload(); return;
            }

            nombreJugador = estadoJuego.nombre || "Desconocido"; 
            cubatas = estadoJuego.cubatas || 0; 
            maxNivelDesbloqueado = estadoJuego.maxNivelDesbloqueado || 0; 
            sobresGratisEpico = estadoJuego.sobresGratisEpico || 0;
            regalosReclamados = estadoJuego.regalosReclamados || regalosReclamados; 
            cuponesCanjeados = estadoJuego.cuponesCanjeados || cuponesCanjeados;
            estadisticasLogros = estadoJuego.estadisticasLogros || estadisticasLogros; 
            logrosDesbloqueados = estadoJuego.logrosDesbloqueados || logrosDesbloqueados;
            inventarioCupones = estadoJuego.inventarioCupones || [];
            
            tiempoSpawnBase = estadoJuego.tiempoSpawnBase || 2200; tiempoSpawnActual = tiempoSpawnBase; 
            costeVelocidad = estadoJuego.costeVelocidad || 100; nivelVelocidad = estadoJuego.nivelVelocidad || 0;
            nivelAparicion = estadoJuego.nivelAparicion || 0; tiempoPasivo = estadoJuego.tiempoPasivo || 3000; 
            costeTractor = estadoJuego.costeTractor || 500; nivelTractor = estadoJuego.nivelTractor || 0; 
            limpiezaActivada = estadoJuego.limpiezaActivada || false;
            
            if (estadoJuego.amigos && estadoJuego.amigos.length > 0) { estadoJuego.amigos.forEach(a => { createFriend(parseInt(a.level), parseFloat(a.x), parseFloat(a.y)); }); } 
            else { spawnAmigoInicial(); }
            
            if (estadoJuego.cajasGuardadas) { estadoJuego.cajasGuardadas.forEach(c => { crearCajaOffline(c.dorada, c.x, c.y); }); }

            if (estadoJuego.timeStamp) {
                const tiempoFueraMs = Date.now() - estadoJuego.timeStamp;
                let tiempoFueraSegundos = tiempoFueraMs / 1000;
                
                if (tiempoFueraSegundos >= 14400) { verificarLogro('la_resaca'); }
                if (tiempoFueraSegundos > 28800) { tiempoFueraSegundos = 28800; }

                let cpsOffline = 0; document.querySelectorAll('.friend').forEach(f => { cpsOffline += calcularIngresoColega(parseInt(f.dataset.level)); });
                let cubatasGanadosOffline = Math.floor(cpsOffline * tiempoFueraSegundos); 
                let cajasNuevasOffline = Math.floor(tiempoFueraMs / tiempoSpawnActual); 
                
                let cajasActuales = document.querySelectorAll('.caja').length;
                if (cajasNuevasOffline > (7 - cajasActuales)) cajasNuevasOffline = Math.max(0, 7 - cajasActuales);
                
                if (cubatasGanadosOffline > 0 || cajasNuevasOffline > 0) { 
                    cubatas += cubatasGanadosOffline; estadisticasLogros.cubatasTotalesGanados += cubatasGanadosOffline; 
                    setTimeout(() => { 
                        alert(`🍻 ¡DE VUELTA!\nHas estado fuera y tus colegas han seguido de fiesta.\n\nHan recolectado:\n🍹 +${cubatasGanadosOffline.toLocaleString('es-ES')} cubatas\n📦 +${cajasNuevasOffline} cajas`); 
                        for (let i = 0; i < cajasNuevasOffline; i++) { crearCajaOffline(false); } 
                    }, 600); 
                }
            }
        }
    } else { spawnAmigoInicial(); pedirNombre(); }
    ganarCubatas(0); sincronizarStockGlobal(); verificarEstadoVIPEnNube(); actualizaEstilosExtremos(); 
}

function pedirNombre() { 
    let nombre = prompt("Introduce tu nombre para el Ranking (Máx 15 letras):"); 
    if (!nombre || nombre.trim() === "") return;
    nombre = nombre.trim().substring(0, 15);

    if (db) {
        db.collection("ranking").doc(nombre).get().then((doc) => {
            if (doc.exists && doc.data().nombre !== nombreJugador) {
                alert("❌ Ese nombre ya está pillado por otra persona. Elige otro por favor."); pedirNombre(); 
            } else {
                nombreJugador = nombre; guardarPartida(); subirPuntuacion();
                if(nombreJugador !== "Desconocido") alert("✅ Nombre registrado: " + nombreJugador);
            }
        }).catch(() => { nombreJugador = nombre; guardarPartida(); });
    } else { nombreJugador = nombre; guardarPartida(); }
}

function cambiarNombre() { pedirNombre(); }
function borrarPartida() { 
    if (confirm("¿Seguro que quieres borrar todo el progreso y liberar tu nombre del ranking?")) { 
        if (db && nombreJugador !== "Desconocido") {
            // Borramos al jugador del ranking y de las peticiones VIP en la nube
            db.collection("ranking").doc(nombreJugador).delete().catch(() => {});
            db.collection("pases_vip").doc(nombreJugador).delete().catch(() => {});
            
            // Damos medio segundo a Firebase para enviar la orden antes de recargar la página
            setTimeout(() => {
                localStorage.removeItem('juergaSave2026'); 
                location.reload(); 
            }, 500);
        } else {
            localStorage.removeItem('juergaSave2026'); 
            location.reload(); 
        }
    } 
}
function actualizaEstilosExtremos() { const btnVip = document.getElementById('btn-vip-room'); if(maxNivelDesbloqueado >= 8) { if(btnVip) btnVip.style.display = 'block'; } else { if(btnVip) btnVip.style.display = 'none'; } }

function comprobarReinicioDiario() {
    const hoy = new Date();
    hoy.setHours(hoy.getHours() - 11);
    
    const fechaString = hoy.toDateString(); 
    const ultimoReinicio = localStorage.getItem('ultimoReinicioJuerga');

    if (ultimoReinicio !== fechaString) {
        let recompensaMax = 5000000; 
        let premio = Math.floor(recompensaMax * (maxNivelDesbloqueado / 18));
        if (premio < 5000) premio = 5000; 

        cubatas = 0; ganarCubatas(premio);
        document.querySelectorAll('.friend, .vomito, .caja').forEach(el => el.remove());
        spawnAmigoInicial();
        
        localStorage.setItem('ultimoReinicioJuerga', fechaString); guardarPartida();
        
        setTimeout(() => { alert(`🌅 ¡NUEVO DÍA DE FIESTA (11:00 AM)!\n\nLa pradera se ha reseteado por completo. Conservas tus logros y desbloqueos, ¡pero te toca volver a fusionar desde cero!\n\n🍹 Bono de arranque: +${premio.toLocaleString('es-ES')} cubatas.`); }, 800);
    }
}

// ============================================================================
// 14. ARRANQUE OFICIAL DEL JUEGO
// ============================================================================
cargarPartida(); 
reanudarJuego(); 
setInterval(guardarPartida, 3000);

setTimeout(() => {
    const hoy = new Date(); hoy.setHours(hoy.getHours() - 5); 
    const hoyStr = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}-${String(hoy.getDate()).padStart(2, '0')}`;
    if (localStorage.getItem('recompensa-' + hoyStr) !== 'true') { abrirMenuDiario(); }
}, 1500);