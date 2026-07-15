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
let fechaSimulada = null;

// MOTOR DE ECONOMÍA Y CASINO
let multiplicadorPasivo = 1;
let multiplicadorClic = 1; 
let casinoVIP = localStorage.getItem('casinoVIP') === 'true';
let sobresGratisEpico = 0; // Sobres épicos gratis pendientes de abrir (ej. premio del lunes)

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
        nombre: nombreJugador, 
        cubatas: cubatas, 
        maxNivelDesbloqueado: maxNivelDesbloqueado, 
        // 👻 ¡Fantasma de haPagadoEuro eliminado de aquí!
        sobresGratisEpico: sobresGratisEpico, 
        regalosReclamados: regalosReclamados, 
        cuponesCanjeados: cuponesCanjeados, 
        estadisticasLogros: estadisticasLogros, 
        logrosDesbloqueados: logrosDesbloqueados, 
        tiempoSpawnBase: tiempoSpawnBase, 
        costeVelocidad: costeVelocidad, 
        tiempoRecogida: tiempoRecogida, 
        costeLimpieza: costeLimpieza, 
        tiempoPasivo: tiempoPasivo, 
        costePasivo: costePasivo, 
        amigos: amigosEnTablero, 
        timeStamp: Date.now() 
    };
    localStorage.setItem('juergaSave2026', JSON.stringify(estadoJuego));
}

function cargarPartida() {
    const guardado = localStorage.getItem('juergaSave2026');
    if (guardado) {
        const estadoJuego = JSON.parse(guardado);
        nombreJugador = estadoJuego.nombre || "Desconocido"; 
        cubatas = estadoJuego.cubatas || 0; 
        maxNivelDesbloqueado = estadoJuego.maxNivelDesbloqueado || 0; 
        sobresGratisEpico = estadoJuego.sobresGratisEpico || 0;
        regalosReclamados = estadoJuego.regalosReclamados || regalosReclamados; cuponesCanjeados = estadoJuego.cuponesCanjeados || cuponesCanjeados;
        estadisticasLogros = estadoJuego.estadisticasLogros || estadisticasLogros; logrosDesbloqueados = estadoJuego.logrosDesbloqueados || logrosDesbloqueados;
        tiempoSpawnBase = estadoJuego.tiempoSpawnBase || 4000; tiempoSpawnActual = tiempoSpawnBase; costeVelocidad = estadoJuego.costeVelocidad || 50; tiempoRecogida = estadoJuego.tiempoRecogida || 5000; costeLimpieza = estadoJuego.costeLimpieza || 500; tiempoPasivo = estadoJuego.tiempoPasivo || 3000; costePasivo = estadoJuego.costePasivo || 100;
        document.getElementById('coste-vel').innerText = costeVelocidad; document.getElementById('coste-limpieza').innerText = costeLimpieza; document.getElementById('coste-pasivo').innerText = costePasivo;
        if (estadoJuego.amigos && estadoJuego.amigos.length > 0) { estadoJuego.amigos.forEach(a => { createFriend(parseInt(a.level), parseFloat(a.x), parseFloat(a.y)); }); } else { spawnAmigoInicial(); }
        // ... (resto de la función cargarPartida por arriba) ...
        
        if (estadoJuego.timeStamp) {
            const tiempoFueraMs = Date.now() - estadoJuego.timeStamp;
            let tiempoFueraSegundos = tiempoFueraMs / 1000;
            
            // Logro de la resaca (4 horas fuera)
            if (tiempoFueraSegundos >= 14400) { verificarLogro('la_resaca'); }
            
            // 🛑 NUEVO TOPE OFFLINE: Limitamos la fiesta a 8 horas (28800 segundos).
            // Si duermen más de 8 horas, los personajes dejan de generar hasta que abran el juego.
            if (tiempoFueraSegundos > 28800) {
                tiempoFueraSegundos = 28800;
            }

            let ingresosPorBucle = 0; 
            document.querySelectorAll('.friend').forEach(f => { ingresosPorBucle += (parseInt(f.dataset.level) + 1); });
            
            // 💸 ELIMINADO EL LÍMITE DE 3000. ¡Ahora ganas exactamente lo que produces en ese tiempo!
            let cubatasGanadosOffline = Math.floor((ingresosPorBucle / (tiempoPasivo / 1000)) * tiempoFueraSegundos); 
            
            // 📦 Límite de cajas ajustado a 6 (para que no te inunde la pantalla al volver)
            let cajasNuevasOffline = Math.floor(tiempoFueraMs / tiempoSpawnActual); 
            if (cajasNuevasOffline > 6) cajasNuevasOffline = 6;
            
            if (cubatasGanadosOffline > 0 || cajasNuevasOffline > 0) { 
                cubatas += cubatasGanadosOffline; 
                estadisticasLogros.cubatasTotalesGanados += cubatasGanadosOffline; 
                
                setTimeout(() => { 
                    alert(`🍻 ¡DE VUELTA!\nHas estado fuera y tus colegas han seguido de fiesta.\n\nHan recolectado:\n🍹 +${cubatasGanadosOffline} cubatas\n📦 +${cajasNuevasOffline} cajas`); 
                    for (let i = 0; i < cajasNuevasOffline; i++) { 
                        crearCajaOffline(); 
                    } 
                }, 600); 
            }
        }
    } else { spawnAmigoInicial(); pedirNombre(); }
    ganarCubatas(0);  
}

function spawnAmigoInicial() { const xCentro = (window.innerWidth / 2) - 45; const yCentro = (window.innerHeight / 2) - 45; createFriend(0, xCentro, yCentro); }

function pedirNombre() { 
    let nombre = prompt("Cambiar Nombre / Introducir Código Secreto:"); 
    if (!nombre || nombre.trim() === "") return;
    
    let nomCode = nombre.toUpperCase().trim();
    
    // --- TRUCOS DE ADMIN ---
    if (nomCode === "DINERO29042007") { 
        ganarCubatas(50000); 
        alert("🛠️ ADMIN: +50.000 Cubatas."); 
        return; 
    }
    if (nomCode === "MAXIMO29042007") { 
        // Calcula automáticamente cuál es el último nivel de tu array 'levels'
        let ultimoNivel = levels.length - 1; 
        
        maxNivelDesbloqueado = ultimoNivel; 
        const xC = (board.clientWidth / 2) - 45; 
        const yC = (board.clientHeight / 2) - 45; 
        createFriend(ultimoNivel, xC, yC); 
        
        alert("🛠️ ADMIN: Desbloqueado Nivel Máximo (" + (ultimoNivel + 1) + ")."); 
        actualizaEstilosExtremos(); 
        return; 
    }
    if (nomCode === "SOBRES29042007") { 
        sobresGratisEpico += 5; 
        guardarPartida();
        alert("🛠️ ADMIN: +5 Sobres Épicos gratis para testeo."); 
        return; 
    }

    // --- GUARDAR NOMBRE REAL ---
    nombreJugador = nomCode.substring(0, 15); 
    guardarPartida(); 
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
// 🔓 FUNCIÓN QUE DESBLOQUEA EL BOTÓN AL LLEGAR AL NIVEL 9
function actualizaEstilosExtremos() {
    const btn1 = document.getElementById('btn-extremo-chupinazo');
    const btn2 = document.getElementById('btn-extremo-barralibre');
    const btnVip = document.getElementById('btn-vip-room'); 

    // Cambiamos el 11 por un 8 (Nivel 9)
    if(maxNivelDesbloqueado >= 8) { 
        if(btn1 && btn2) { btn1.className = "btn-unlocked-extremo"; btn2.className = "btn-unlocked-extremo"; }
        // Encendemos el botón VIP para que se vea
        if(btnVip) btnVip.style.display = 'block'; 
    } else {
        if(btn1 && btn2) { btn1.className = "btn-lock"; btn2.className = "btn-lock"; }
        // Mantenemos oculto el botón VIP
        if(btnVip) btnVip.style.display = 'none';
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
    // Bajamos el aviso al Nivel 9 (índice 8)
    if (maxNivelDesbloqueado < 8) { alert("🔒 BLOQUEADO: Requieres subir y desbloquear al menos un Juerguista de Nivel 9."); return; }
    if (document.querySelectorAll('.friend').length >= 20) { alert("¡Pradera llena!"); return; }
    if (cubatas >= 50000) {
        cubatas -= 50000; ganarCubatas(0); cerrarModales();
        const xC = (board.clientWidth / 2) - 45; const yC = (board.clientHeight / 2) - 45;
        createFriend(8, xC, yC); 
        guardarPartida();
    } else alert("¡Te faltan cubatas!");
}

function boostExtremoBarraLibre() {
    // Bajamos el aviso al Nivel 9 (índice 8)
    if (maxNivelDesbloqueado < 8) { alert("🔒 BLOQUEADO: Requieres al menos un Juerguista de Nivel 9."); return; }
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
/// ==========================================================================
// 🎁 SISTEMA DE REGALO DIARIO (TOTALMENTE GRATIS)
// ==========================================================================
const FECHA_INICIO = new Date('2026-08-03T00:00:00');
const FECHA_FIN = new Date('2026-09-07T23:59:59');

function abrirMenuDiario() { 
    ocultarTodosModales(); 
    pausarJuego(); 
    document.getElementById('diario-modal').classList.remove('oculto'); 
    renderizarCalendario(); 
}

function renderizarCalendario() {
    const contenedor = document.getElementById('calendario-contenedor');
    contenedor.innerHTML = ''; 
    
    const hoy = new Date();
    const hoyStr = hoy.toISOString().split('T')[0];
    const yaReclamado = localStorage.getItem('recompensa-' + hoyStr) === 'true';

    // Comprobamos si el evento está activo en estas fechas
    if (hoy < FECHA_INICIO || hoy > FECHA_FIN) {
        contenedor.innerHTML = '<p style="text-align:center; padding:20px; font-weight:bold; color:#333;">📅 El evento de recompensas no está activo actualmente.</p>';
        return;
    }

    const diaEvento = Math.floor((hoy - FECHA_INICIO) / (1000 * 60 * 60 * 24));
    const esLunes = (hoy.getDay() === 1);
    
    // Premio: 1 sobre épico gratis los lunes, cubatas (crecientes) el resto de días
    const premio = esLunes ? "1 🎁 (Sobre Épico Gratis)" : (1000 + (diaEvento * 200)) + " 🥃";

    contenedor.innerHTML = `
        <div class="calendar-day ${yaReclamado ? 'reclamado' : 'hoy'}">
            <div class="day-info">
                <h4>Día ${diaEvento + 1} del Evento</h4>
                <p style="color: #ff0055;">Premio: ${premio}</p>
            </div>
            ${yaReclamado ? 
                '<button class="btn-reclamar desactivado" disabled>✅ RECLAMADO</button>' : 
                // Ahora va directo a reclamarPremio, sin intermediarios
                `<button class="btn-reclamar" onclick="reclamarPremio('${hoyStr}', ${esLunes})">🎁 RECLAMAR</button>`
            }
        </div>
    `;
}

function reclamarPremio(fechaStr, esLunes) {
    if (esLunes) {
        sobresGratisEpico += 1;
        alert("🎁 ¡PREMIO LUNERO! Has recibido 1 Sobre Épico GRATIS.");
    } else {
        let diaEvento = Math.floor((new Date(fechaStr) - FECHA_INICIO) / (1000 * 60 * 60 * 24));
        let premioCubatas = 1000 + (diaEvento * 200);
        ganarCubatas(premioCubatas);
        alert("🥃 ¡RECOMPENSA DIARIA! Has ganado +" + premioCubatas + " cubatas.");
    }

    // Guardamos que hoy ya ha reclamado
    localStorage.setItem('recompensa-' + fechaStr, 'true');
    guardarPartida();
    renderizarCalendario(); // Refrescamos el calendario para mostrar el tick verde
}
// ==========================================================================
// CASINO Y TOTP DEL STAFF
// ==========================================================================
function abrirCasino() {
    cerrarModales(); 
    if (casinoVIP) {
        document.getElementById('casino-modal').classList.remove('oculto');
        actualizarBotonesSobres();
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

function cerrarCupon() {
    document.getElementById('cupon-modal').classList.add('oculto');
    cuponActivoTipo = "";
    reanudarJuego();
}

function quemarCupon() {
    // El camarero pulsa esto en la barra tras servir el premio, para que no se pueda reutilizar el cupón.
    alert("✅ Premio canjeado. ¡Que aproveche!");
    cerrarCupon();
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
// 🎁 SOBRES DE LA PEÑA (packs estilo FIFA) — sustituye al antiguo casino
// ==========================================================================
// AJUSTA AQUÍ los precios y probabilidades ("peso") de cada premio.
// Cuantas más fiestas/gente esperes, más bajos deberían ser los pesos de
// chupito/cubata real para no quedarte sin fondo de barra.
const SOBRES = {
    epico: {
        nombre: "Sobre Épico", coste: 75000,
        premios: [
            { tipo: 'cubatas',     peso: 90.5, min: 25000, max: 65000, texto: "🥃 +{x} cubatas" },
            { tipo: 'chupito',     peso: 7, texto: "🥂 ¡CHUPITO GANADO!" },
            { tipo: 'cubata_real', peso: 2.5, texto: "🍹 ¡CUBATA GRATIS EN LA BARRA!" }
        ]
    }
};

let sobreAbriendo = false;

function elegirPremio(premios) {
    const total = premios.reduce((s, p) => s + p.peso, 0);
    let tirada = Math.random() * total;
    for (const p of premios) {
        if (tirada < p.peso) return p;
        tirada -= p.peso;
    }
    return premios[0];
}

function abrirSobre(tier) {
    if (sobreAbriendo) return;
    const cfg = SOBRES[tier];
    if (!cfg) return;

    const esGratis = (tier === 'epico' && sobresGratisEpico > 0);

    if (!esGratis) {
        if (cubatas < cfg.coste) {
            alert("¡Te faltan cubatas para este sobre!");
            return;
        }
        cubatas -= cfg.coste;
        ganarCubatas(0);
    } else {
        sobresGratisEpico--;
    }
    guardarPartida();

    sobreAbriendo = true;
    const caja = document.getElementById('sobre-animacion');
    const resultado = document.getElementById('sobre-resultado');
    resultado.innerText = "ABRIENDO...";
    resultado.style.color = "#00ff00";
    caja.innerText = "📦";
    caja.style.animation = "none";
    void caja.offsetWidth;
    caja.style.animation = "sobreZarandeo 1.2s ease-in-out";

    setTimeout(() => {
        resolverSobre(cfg, resultado, caja);
    }, 1300);
}
// ================= CINEMÁTICA DE CAMINANTE (WALKOUT ÉPICO Y RÁPIDO) =================
function abrirWalkout(elementoCarta, tier) {
    if (sobreAbriendo) return;
    const cfg = SOBRES[tier];
    if (!cfg) return;

    // Cobrar los cubatas
    const esGratis = (tier === 'epico' && sobresGratisEpico > 0);
    if (!esGratis) {
        if (cubatas < cfg.coste) {
            alert("¡Te faltan cubatas para este sobre!");
            return;
        }
        cubatas -= cfg.coste;
        ganarCubatas(0);
    } else {
        sobresGratisEpico--;
    }
    guardarPartida();

    sobreAbriendo = true;

    // 1. OCULTAMOS LA TIENDA Y PREPARAMOS EL CINE
    document.getElementById('casino-modal').classList.add('oculto');
    
    const modalWalkout = document.getElementById('walkout-modal');
    const flares = document.getElementById('walkout-flares');
    const pIzq = document.getElementById('puerta-izq');
    const pDer = document.getElementById('puerta-der');
    const cardContainer = document.getElementById('walkout-card-container');
    const rewardContainer = document.getElementById('walkout-reward-container');
    const rewardImg = document.getElementById('walkout-reward-img');
    const premioTxt = document.getElementById('walkout-premio');
    const btnCerrar = document.getElementById('walkout-btn-cerrar');

    // 2. RESET TOTAL (Para arreglar el bug de la imagen del chupito atascada)
    cardContainer.innerHTML = '';
    cardContainer.className = 'anim-suspense-carta'; 
    cardContainer.classList.remove('oculto');
    rewardContainer.classList.add('oculto');
    
    // Forzamos que la imagen se oculte y borramos la fuente anterior
    rewardImg.classList.add('oculto');
    rewardImg.className = '';
    rewardImg.src = ''; 
    
    premioTxt.className = '';
    btnCerrar.classList.add('oculto');
    modalWalkout.classList.remove('puertas-abiertas');
    pIzq.classList.add('oculto');
    pDer.classList.add('oculto');
    flares.className = 'anim-flares'; 
    
    modalWalkout.classList.remove('oculto');

    // 3. CLONAMOS TU CARTA
    const cartaClonada = elementoCarta.cloneNode(true);
    cartaClonada.removeAttribute('onclick'); 
    cartaClonada.style.margin = "0"; 
    cardContainer.appendChild(cartaClonada);

    // Tirar los dados
    const premio = elegirPremio(cfg.premios);
    const esPremioFisico = (premio.tipo === 'chupito' || premio.tipo === 'cubata_real' || premio.tipo === 'jackpot');

    // 4. ELEGIMOS EL CAMINO DE ANIMACIÓN
    if (esPremioFisico) {
        // ========================================================
        // CAMINO 1: MODO LENTO (CAMINANTE FIFA) - PREMIO GORDO
        // ========================================================
        setTimeout(() => {
            cardContainer.className = 'anim-explosion-carta';

            setTimeout(() => {
                cardContainer.classList.add('oculto');
                rewardContainer.classList.remove('oculto');

                flares.className = 'anim-flares-doradas';
                pIzq.classList.remove('oculto');
                pDer.classList.remove('oculto');

                // Ponemos la carta de premio que toque
                if (premio.tipo === 'chupito') {
                    rewardImg.src = 'CHUPITO.jpg';
                } else {
                    rewardImg.src = 'cubata.jpg'; 
                }

                setTimeout(() => {
                    modalWalkout.classList.add('puertas-abiertas');
                    
                    // Aseguramos que se muestra la imagen
                    rewardImg.classList.remove('oculto');
                    rewardImg.classList.add('anim-recompensa-epic');
                    
                    premioTxt.style.color = "#ffd700";
                    premioTxt.innerText = premio.texto;
                    premioTxt.classList.add('anim-premio');
                    
                    btnCerrar.dataset.premioFisico = premio.texto;
                    btnCerrar.classList.remove('oculto');

                    sobreAbriendo = false;
                    actualizarBotonesSobres();
                    guardarPartida();
                }, 400);

            }, 500); 
        }, 2600); // MÁXIMO SUSPENSE: 2.6 Segundos esperando

    } else {
        // ========================================================
        // CAMINO 2: MODO RÁPIDO - CUBATAS O NADA
        // ========================================================
        setTimeout(() => {
            cardContainer.className = 'anim-explosion-carta';

            setTimeout(() => {
                cardContainer.classList.add('oculto');
                rewardContainer.classList.remove('oculto');

                // Aseguramos al 100% que la foto no sale aquí
                rewardImg.classList.add('oculto');

                if (premio.tipo === 'nada') {
                    premioTxt.style.color = "#ff4444";
                    premioTxt.innerText = premio.texto;
                } else if (premio.tipo === 'cubatas') {
                    const cantidad = Math.floor(premio.min + Math.random() * (premio.max - premio.min));
                    ganarCubatas(cantidad);
                    premioTxt.style.color = "#00ff00";
                    premioTxt.innerText = premio.texto.replace('{x}', cantidad);
                }
                
                premioTxt.classList.add('anim-premio');
                btnCerrar.classList.remove('oculto');

                sobreAbriendo = false;
                actualizarBotonesSobres();
                guardarPartida();
            }, 300); // Explosión rápida de 0.3 segundos
        }, 600); // APERTURA RÁPIDA: Solo 0.6 Segundos de espera
    }
}
// Cerrar la cinemática
function cerrarWalkout() {
    const modalWalkout = document.getElementById('walkout-modal');
    const btnCerrar = document.getElementById('walkout-btn-cerrar');
    
    modalWalkout.classList.add('oculto');
    
    // Si habia ganado un premio fisico, lanzamos el cupón real ahora
    if (btnCerrar.dataset.premioFisico) {
        entregarPremioFisico(btnCerrar.dataset.premioFisico);
        btnCerrar.dataset.premioFisico = ""; // Limpiar
    }
}
function resolverSobre(cfg, resultado, caja) {
    const premio = elegirPremio(cfg.premios);
    caja.innerText = "🎁";

    if (premio.tipo === 'nada') {
        resultado.style.color = "#ff4444";
        resultado.innerText = premio.texto;
    } else if (premio.tipo === 'cubatas') {
        const cantidad = Math.floor(premio.min + Math.random() * (premio.max - premio.min));
        ganarCubatas(cantidad);
        resultado.style.color = "#00ff00";
        resultado.innerText = premio.texto.replace('{x}', cantidad);
    } else if (premio.tipo === 'chupito') {
        resultado.style.color = "#ffd700";
        resultado.innerText = premio.texto;
        entregarPremioFisico("¡UN CHUPITO EN LA BARRA!");
    } else if (premio.tipo === 'cubata_real') {
        resultado.style.color = "#ffd700";
        resultado.innerText = premio.texto;
        entregarPremioFisico("¡UN CUBATA GRATIS EN LA BARRA!");
    } else if (premio.tipo === 'jackpot') {
        resultado.style.color = "#ffd700";
        resultado.innerText = premio.texto;
        entregarPremioFisico("¡CUBATA + CHUPITO GRATIS EN LA BARRA!");
    }

    sobreAbriendo = false;
    actualizarBotonesSobres();
    guardarPartida();
}

function actualizarBotonesSobres() {
    const costeComun = document.getElementById('coste-sobre-comun');
    const costeRaro = document.getElementById('coste-sobre-raro');
    const costeEpico = document.getElementById('coste-sobre-epico');
    const btnEpico = document.getElementById('btn-sobre-epico');
    if (costeComun) costeComun.innerText = SOBRES.comun.coste;
    if (costeRaro) costeRaro.innerText = SOBRES.raro.coste;
    if (costeEpico && btnEpico) {
        if (sobresGratisEpico > 0) {
            costeEpico.innerText = "GRATIS x" + sobresGratisEpico;
            btnEpico.classList.add('btn-unlocked-extremo');
        } else {
            costeEpico.innerText = SOBRES.epico.coste;
            btnEpico.classList.remove('btn-unlocked-extremo');
        }
    }
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
function cambiarTab(pestana) { 
    // Ocultamos ambos contenidos
    document.getElementById('tab-mejoras').classList.add('oculto'); 
    document.getElementById('tab-personajes').classList.add('oculto'); 
    
    // Apagamos ambos botones (fondo negro, letras verdes)
    document.getElementById('btn-tab-mejoras').style.background = '#000';
    document.getElementById('btn-tab-mejoras').style.color = '#00ff00';
    document.getElementById('btn-tab-personajes').style.background = '#000';
    document.getElementById('btn-tab-personajes').style.color = '#00ff00';

    // Encendemos la pestaña seleccionada (fondo verde, letras negras)
    document.getElementById(`tab-${pestana}`).classList.remove('oculto'); 
    document.getElementById(`btn-tab-${pestana}`).style.background = '#00ff00';
    document.getElementById(`btn-tab-${pestana}`).style.color = '#000';
    
    if (pestana === 'personajes') { actualizarTiendaPersonajes(); } 
}

function actualizarTiendaPersonajes() { 
    const tabPersonajes = document.getElementById('tab-personajes'); 
    tabPersonajes.innerHTML = ''; 
    for (let i = 0; i <= maxNivelDesbloqueado; i++) { 
        if(i >= levels.length) break; 
        let precioPersonaje = Math.floor(100 * Math.pow(2.5, i)); 
        // Aplicada la clase boton-arcade para que todo el diseño fluya igual
        tabPersonajes.innerHTML += `
            <button class="boton-arcade" style="display:flex; flex-direction:column; align-items:center; justify-content:center; padding:10px; margin: 5px;" onclick="comprarPersonaje(${i}, ${precioPersonaje})">
                <img src="${levels[i]}" style="width:50px; height:50px; object-fit:contain; margin-bottom:5px; filter: drop-shadow(0 0 5px #00ff00);">
                Nvl ${i + 1}<br>
                <small style="color:#00ff00; font-size:9px; margin-top:5px; font-family: 'Press Start 2P', cursive;">${precioPersonaje} 🥃</small>
            </button>`; 
    } 
}


function comprarPersonaje(nivel, precio) { if (document.querySelectorAll('.friend').length >= 20) { alert("¡La pradera está a tope! (Máx 20)."); return; } if (cubatas >= precio) { cubatas -= precio; ganarCubatas(0); cerrarModales(); const xCentro = (board.clientWidth / 2) - 45; const yCentro = (board.clientHeight / 2) - 45; createFriend(nivel, xCentro, yCentro); guardarPartida(); } else alert("¡Te faltan cubatas!"); }
function comprarVelocidad() { if (boostVelocidadActivo) { alert("¡El Frenesí ya está activo!"); return; } if (cubatas >= costeVelocidad) { cubatas -= costeVelocidad; ganarCubatas(0); cerrarModales(); tiempoSpawnBase = Math.max(500, tiempoSpawnBase - 800); costeVelocidad = Math.floor(costeVelocidad * 1.5); document.getElementById('coste-vel').innerText = costeVelocidad; boostVelocidadActivo = true; tiempoSpawnActual = 800; clearInterval(intervalCajas); intervalCajas = setInterval(crearCaja, tiempoSpawnActual); crearCronometroFlotante('frenesi-banner', 'FRENESÍ DE CAJAS', 30); estadisticasLogros.frenesisActivados++; verificarLogro('frenesi_loco'); setTimeout(() => { boostVelocidadActivo = false; tiempoSpawnActual = tiempoSpawnBase; clearInterval(intervalCajas); if(!juegoPausado) intervalCajas = setInterval(crearCaja, tiempoSpawnActual); }, 30000); guardarPartida(); } else alert("¡Te faltan cubatas!"); }
function comprarEvento() { if (nivelAparicion === 1) { alert("¡La Hora Feliz ya está activa!"); return; } if (cubatas >= 150) { cubatas -= 150; ganarCubatas(0); nivelAparicion = 1; cerrarModales(); crearCronometroFlotante('horafeliz-banner', 'HORA FELIZ', 30); setTimeout(() => { nivelAparicion = 0; }, 30000); guardarPartida(); } else alert("¡Te faltan cubatas!"); }
function comprarPasivo() { if (cubatas >= costePasivo) { cubatas -= costePasivo; ganarCubatas(0); tiempoPasivo = Math.max(400, tiempoPasivo - 400); costePasivo = Math.floor(costePasivo * 1.6); document.getElementById('coste-pasivo').innerText = costePasivo; iniciarBuclePasivo(); guardarPartida(); } else alert("¡Te faltan cubatas!"); }
function comprarLimpieza() { if (cubatas >= costeLimpieza) { cubatas -= costeLimpieza; ganarCubatas(0); tiempoRecogida = Math.max(400, tiempoRecogida / 2); costeLimpieza = Math.floor(costeLimpieza * 2.5); document.getElementById('coste-limpieza').innerText = costeLimpieza; clearInterval(intervalRecoger); intervalRecoger = setInterval(recogerVomitoAutomatico, tiempoRecogida); verificarLogro('vip_barra'); guardarPartida(); } else alert("¡Te faltan cubatas!"); }
// Función desactivada para que no salgan carteles molestos tapando la pantalla
function crearCronometroFlotante(id, texto, duracionSegundos) { 
    return; 
}
function mostrarCinematica(nivel) { pausarJuego(); const cinematic = document.getElementById('unlock-cinematic'); const imagen = document.getElementById('unlock-img'); const texto = document.getElementById('unlock-desc'); imagen.src = levels[nivel]; texto.innerText = `¡NIVEL ${nivel + 1} ALCANZADO!`; cinematic.classList.remove('oculto'); setTimeout(() => { cinematic.classList.add('activo'); }, 20); cinematic.onclick = () => { cinematic.classList.add('oculto'); cinematic.classList.remove('activo'); reanudarJuego(); }; }
function crearCaja() { 
    if (juegoPausado || document.querySelectorAll('.caja').length > 7) return; 
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
    if (document.querySelectorAll('.caja').length > 6) return; 
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
function createFriend(level, x, y) { 
    const friend = document.createElement('div'); 
    friend.classList.add('friend'); 
    friend.style.animation = "pop 0.4s ease-in-out"; 
    friend.dataset.level = level; 
    friend.style.backgroundImage = `url('${levels[level]}')`; 
    
    // 🛑 TAMAÑO ESTÁNDAR PARA TODOS: Sean Nivel 1 o 19, todos miden lo mismo (95px)
    friend.style.width = `95px`; 
    friend.style.height = `95px`; 
    
    friend.style.left = `${x}px`; 
    friend.style.top = `${y}px`; 
    
    // Asignar el evento para arrastrar
    friend.addEventListener('pointerdown', startDrag); 
    
    // ==========================================
    // EL PORTERO DE LA DISCOTECA (A VIP DESDE EL NIVEL 9)
    // Recordatorio: Nivel 9 en código es el índice 8
    // ==========================================
    if (level >= 8) {
        // A partir de Nivel 9 van al Reservado
        document.getElementById('game-board-vip').appendChild(friend);
    } else {
        // Del Nivel 1 al 8 se quedan en la calle
        document.getElementById('game-board').appendChild(friend);
    }
    
    actualizarCubatasPorSegundo(); 
}

function startDrag(e) { 
    // Si el juego está en pausa (ej: abriendo sobres), no dejamos mover nada
    if (juegoPausado) return; 
    
    dragItem = e.target; 
    const rect = dragItem.getBoundingClientRect(); 
    
    // Detectar si es un toque en la pantalla (móvil) o un click de ratón (PC)
    let clientX = e.clientX !== undefined ? e.clientX : e.touches[0].clientX; 
    let clientY = e.clientY !== undefined ? e.clientY : e.touches[0].clientY; 
    
    // Calcular exactamente de dónde hemos agarrado la imagen para que no dé saltos raros
    offsetX = clientX - rect.left; 
    offsetY = clientY - rect.top; 
    
    // Activar los "oídos" del documento para seguir el movimiento del dedo/ratón y saber cuándo lo soltamos
    document.addEventListener('pointermove', drag); 
    document.addEventListener('pointerup', endDrag); 
    document.addEventListener('touchmove', dragTouch, {passive: false}); 
    document.addEventListener('touchend', endDragTouch); 
}
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
function drag(e) { 
    if (!dragItem || juegoPausado) return; 
    
    // 🌟 LA MAGIA: El juego averigua en qué sala (Calle o VIP) está el personaje
    const currentBoard = dragItem.parentElement; 
    const boardRect = currentBoard.getBoundingClientRect(); 
    
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
    
    // 🌟 LA MAGIA (para móviles): Averiguamos la sala
    const currentBoard = dragItem.parentElement; 
    const boardRect = currentBoard.getBoundingClientRect(); 
    
    let newX = e.touches[0].clientX - boardRect.left - offsetX;
    let newY = e.touches[0].clientY - boardRect.top - offsetY;
    
    newX = Math.max(0, Math.min(newX, boardRect.width - dragItem.offsetWidth));
    newY = Math.max(0, Math.min(newY, boardRect.height - dragItem.offsetHeight));
    
    dragItem.style.left = `${newX}px`; 
    dragItem.style.top = `${newY}px`; 
}
function endDrag() { limpiarEventos(); }
function endDragTouch() { limpiarEventos(); }
function limpiarEventos() { 
    if (!dragItem) return; 

    // ¡IMPORTANTE! Solo buscamos colegas en la misma sala donde estamos arrastrando
    const currentBoard = dragItem.parentElement;
    const friends = currentBoard.querySelectorAll('.friend'); 
    
    const rect1 = dragItem.getBoundingClientRect(); 

    for (let other of friends) { 
        if (other !== dragItem) { 
            const rect2 = other.getBoundingClientRect(); 
            
            // Detectar si están chocando
            if (!(rect1.right < rect2.left || rect1.left > rect2.right || rect1.bottom < rect2.top || rect1.top > rect2.bottom)) { 
                
                // Si tienen el mismo nivel, ¡se fusionan!
                if (dragItem.dataset.level === other.dataset.level) { 
                    const currentLevel = parseInt(dragItem.dataset.level); 
                    
                    // Si no hemos llegado al límite de niveles
                    if (currentLevel < levels.length - 1) { 
                        const newX = parseFloat(other.style.left); 
                        const newY = parseFloat(other.style.top); 
                        
                        dragItem.remove(); 
                        other.remove(); 
                        
                        ganarCubatas((currentLevel + 1) * 5); 
                        
                        const nuevoNivel = currentLevel + 1; 
                        
                        // Creamos al nuevo colega (la función createFriend ya sabrá si mandarlo al VIP o a la calle)
                        createFriend(nuevoNivel, newX, newY); 
                        verificarLogro('calentamiento'); 
                        
                        // Subida de nivel máximo
                        if (nuevoNivel > maxNivelDesbloqueado) { 
                            maxNivelDesbloqueado = nuevoNivel; 
                            mostrarCinematica(nuevoNivel); 
                            actualizaEstilosExtremos(); 
                        } 
                        break; 
                    } 
                } 
            } 
        } 
    } 

    dragItem = null; 
    document.removeEventListener('pointermove', drag); 
    document.removeEventListener('pointerup', endDrag); 
    document.removeEventListener('touchmove', dragTouch); 
    document.removeEventListener('touchend', endDragTouch); 
    
    actualizarCubatasPorSegundo(); 
    guardarPartida(); 
}
let isVIPRoom = false;

// 🔄 FUNCIÓN PARA CAMBIAR DE MUNDO BLINDADA
function toggleVIPRoom() {
    isVIPRoom = !isVIPRoom;
    const boardNormal = document.getElementById('game-board');
    const boardVIP = document.getElementById('game-board-vip');
    const btnVip = document.getElementById('btn-vip-room');

    if (isVIPRoom) {
        // Apagamos la calle y encendemos el VIP
        boardNormal.style.display = 'none'; 
        boardVIP.style.display = 'block';   
        btnVip.innerText = "VOLVER";
        btnVip.style.color = "#00ff00";
        btnVip.style.borderColor = "#00ff00";
    } else {
        // Apagamos el VIP y volvemos a la calle
        boardVIP.style.display = 'none';    
        boardNormal.style.display = 'block'; 
        btnVip.innerText = "ZONA VIP";
        btnVip.style.color = "#ff00ff";
        btnVip.style.borderColor = "#ff00ff";
    }
}

// Array con los nombres en el mismo orden que tus imágenes
const nombresJuerguistas = [
    "Adrian Juan", "Iñaki Gonzalez", "Ander Garmon", 
    "Victor Santos", "Noa Ugidos", "Natalia Gonzalez", 
    "Ivan Ordas", "Guillermo Bango", "Lucia Grande", 
    "Ruben Pelayo", "Karen Beneitez", "Aina Fernandez", 
    "Iñigo Fernandez", "Hugo Barragan", "Natalia Armendariz", 
    "Elena Vivas", "Naroa Chamorro", "Gerardo Pascual", "Pablo Martinez"
];

function abrirJuerguistas() { 
    ocultarTodosModales(); 
    document.getElementById('juerguistas-modal').classList.remove('oculto');
    renderizarJuerguistas(); // Llamamos a la función que dibuja el libro
}

function renderizarJuerguistas() {
    const contenedor = document.getElementById('juerguistas-contenedor');
    contenedor.innerHTML = ''; // Vaciamos antes de dibujar

    levels.forEach((img, index) => {
        // Comprobamos si el nivel está desbloqueado
        const desbloqueado = index <= maxNivelDesbloqueado;
        
        const nombre = desbloqueado ? nombresJuerguistas[index] : "???";
        const claseImagen = desbloqueado ? "" : "silueta-bloqueada";
        const textoNivel = desbloqueado ? `Nivel ${index + 1}` : "Bloqueado";

        contenedor.innerHTML += `
            <div class="libro-item">
                <img src="${img}" class="${claseImagen}" alt="Colega">
                <div class="libro-info">
                    <h4>${nombre}</h4>
                    <p>${textoNivel}</p>
                </div>
            </div>
        `;
    });
}
// ==========================================================================
// 📖 SISTEMA DE MANUAL OBLIGATORIO AL INICIO
// ==========================================================================

document.addEventListener("DOMContentLoaded", () => {
    const pantallaReglas = document.getElementById('pantalla-reglas');
    
    // Comprobamos si ya aceptaron las reglas en una visita anterior
    const reglasLeidas = localStorage.getItem('juergaReglas2026') === 'true';
    
    if (reglasLeidas) {
        // Si ya las leyeron, ocultamos el modal y dejamos jugar
        pantallaReglas.classList.add('oculto');
    } else {
        // Si es su primera vez, pausamos el juego en segundo plano
        pausarJuego();
        
        const detalles = document.querySelectorAll('.regla-item');
        const total = detalles.length;
        let abiertas = new Set(); // Guardamos cuáles se han abierto
        
        const textoProgreso = document.getElementById('progreso-lectura');
        const btnEntrar = document.getElementById('btn-entrar-juego');

        detalles.forEach((detalle, index) => {
            detalle.addEventListener('toggle', (e) => {
                // Si el usuario abre el desplegable, lo registramos
                if (detalle.open) {
                    abiertas.add(index);
                    
                    // Actualizamos el contador visual
                    textoProgreso.innerText = `LEÍDO: ${abiertas.size}/${total}`;
                    
                    // Si ya ha abierto las 7...
                    if (abiertas.size === total) {
                        textoProgreso.innerText = "¡TODO LISTO!";
                        textoProgreso.style.color = "#00ff00"; // Cambia a verde
                        
                        // Activamos el botón
                        btnEntrar.disabled = false;
                        btnEntrar.classList.remove('desactivado');
                    }
                }
            });
        });
    }
});

function aceptarReglas() {
    // Guardamos en la memoria del móvil que ya han leído las reglas
    localStorage.setItem('juergaReglas2026', 'true');
    
    // Ocultamos la pantalla
    document.getElementById('pantalla-reglas').classList.add('oculto');
    
    // Reanudamos el juego (cajas, vómitos, farmeo)
    reanudarJuego();
    
    // Si no tienen nombre, se lo pedimos
    if (nombreJugador === "Desconocido") {
        pedirNombre();
    }
}
cargarPartida(); reanudarJuego(); intervalGuardado = setInterval(guardarPartida, 3000);