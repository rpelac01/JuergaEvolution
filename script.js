(() => {
    'use strict';

    // ==========================================================================
    // 🔥 1. CONEXIÓN A LA NUBE (FIREBASE) Y PROTECCIÓN OFFLINE
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

    let db = null;
    try {
        if (!firebase.apps.length) {
            firebase.initializeApp(firebaseConfig);
        }
        db = firebase.firestore();
    } catch (e) {
        console.warn("Firebase bloqueado o sin conexión. Jugando en modo local.");
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

    setInterval(subirPuntuacion, 15000);

    // ==========================================================================
    // 🎮 2. LÓGICA DEL JUEGO Y VARIABLES
    // ==========================================================================
    document.addEventListener('dblclick', function(e) { e.preventDefault(); }, { passive: false });
    document.addEventListener('gesturestart', function(e) { e.preventDefault(); });

    const board = document.getElementById('game-board');
    const contadorCubatas = document.getElementById('contador-cubatas');
    const levels = ['n1.png', 'n2.png', 'n3.png', 'n4.png', 'n5.png', 'n6.png', 'n7.png', 'n8.png', 'n9.png', 'n10.png', 'n11.png', 'n12.png','n125.png', 'n13.png', 'n14.png', 'n15.png', 'n16.png', 'n17.png', 'n18.png']; 

    let cubatas = 0; 
    let nivelAparicion = 0; 
    let dragItem = null; 
    let offsetX = 0; 
    let offsetY = 0;
    let maxNivelDesbloqueado = 0; 
    let nombreJugador = "Desconocido";
    let inventarioCupones = []; 
    let cuponActivoIndex = -1;  
    
    let multiplicadorPasivo = 1;
    let multiplicadorClic = 1; 
    let casinoVIP = localStorage.getItem('casinoVIP') === 'true';
    let sobresGratisEpico = 0; 
    let timeoutMultiplicador = null;
    let sobreAbriendo = false;

    let regalosReclamados = { '2026-09-03': false, '2026-09-04': false, '2026-09-05': false, '2026-09-06': false, '2026-09-07': false, 'jefe_final': false };
    let cuponesCanjeados = { '2026-09-03': false, '2026-09-04': false, '2026-09-05': false, '2026-09-06': false, '2026-09-07': false, 'jefe_final': false };

    let estadisticasLogros = { cajasAbiertas: 0, vomitosLipiados: 0, frenesisActivados: 0, ansiasActivado: 0, cubatasTotalesGanados: 0, chupitosGanados: 0, cubatasRealesGanados: 0, intentoTicketDorado: false };
    let logrosDesbloqueados = { 'calentamiento': false, 'estomago_hierro': false, 'lluvia_litros': false, 'tesorero_pena': false, 'vip_barra': false, 'frenesi_loco': false, 'el_ansias': false, 'la_resaca': false };

    const LIMITE_DIARIO_CHUPITOS = 30; 
    const LIMITE_DIARIO_CUBATAS = 10;   
    let stockChupitosHoy = LIMITE_DIARIO_CHUPITOS;
    let stockCubatasHoy = LIMITE_DIARIO_CUBATAS;

    function obtenerDiaDeFiesta() {
        let fecha = new Date();
        fecha.setHours(fecha.getHours() - 5); 
        return fecha.toDateString(); 
    }

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
        let l = infoLogros[id]; 
        let cumple = false;
        if (l.meta !== undefined) { 
            if (estadisticasLogros[l.campo] >= l.meta) cumple = true; 
        } else { cumple = true; }
        if (cumple) { 
            logrosDesbloqueados[id] = true; 
            ganarCubatas(l.premio); 
            setTimeout(() => { alert(`🏆 ¡LOGRO DESBLOQUEADO! 🏆\n\n🎯 ${l.titulo}\n🎁 Premio: +${l.premio} 🍹 cubatas.`); }, 10); 
            guardarPartida(); 
        }
    }

    let juegoPausado = true; // Inicia pausado hasta que lea el manual
    let tiempoSpawnBase = 2200; 
    let tiempoSpawnActual = 2200; 
    let costeVelocidad = 50;
    let tiempoRecogida = 5000; 
    let costeLimpieza = 500; 
    let tiempoPasivo = 3000; 
    let costePasivo = 100;
    let costeAmnesia = 8500;
    let boostVelocidadActivo = false;
    
    let intervalCajas; let intervalVomitar; let intervalRecoger; let intervalPasivo; let intervalGuardado;

    // ==========================================================================
    // 💾 SISTEMA DE GUARDADO BLINDADO
    // ==========================================================================
    function generarFirma(datos) {
        const salt = "JuergaCivilSecret_2026_Key!";
        const str = `${datos.cubatas}_${datos.maxNivelDesbloqueado}_${datos.nombre}_${salt}`;
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            hash = (hash << 5) - hash + str.charCodeAt(i);
            hash |= 0;
        }
        return hash.toString();
    }

    function guardarPartida() {
        if (juegoPausado && !boostVelocidadActivo) return; 
        const amigosEnTablero = [];
        document.querySelectorAll('.friend').forEach(f => { amigosEnTablero.push({ level: f.dataset.level, x: f.style.left, y: f.style.top }); });
        
        const estadoJuego = {
            nombre: nombreJugador, 
            cubatas: cubatas, 
            maxNivelDesbloqueado: maxNivelDesbloqueado, 
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
            costeAmnesia: costeAmnesia, 
            amigos: amigosEnTablero, 
            inventarioCupones: inventarioCupones, 
            timeStamp: Date.now() 
        };

        estadoJuego.firma = generarFirma(estadoJuego);
        localStorage.setItem('juergaSave2026', JSON.stringify(estadoJuego));
    }

    function cargarPartida() {
        const guardado = localStorage.getItem('juergaSave2026');
        if (guardado) {
            let estadoJuego;
            try { estadoJuego = JSON.parse(guardado); } catch (e) { estadoJuego = null; }

            // Anticheat
            if (estadoJuego && estadoJuego.firma) {
                if (estadoJuego.firma !== generarFirma(estadoJuego)) {
                    alert("🚨 Modificación de datos no permitida. Partida reseteada.");
                    localStorage.removeItem('juergaSave2026');
                    location.reload();
                    return;
                }
            }

            if (estadoJuego) {
                nombreJugador = estadoJuego.nombre || "Desconocido"; 
                cubatas = estadoJuego.cubatas || 0; 
                maxNivelDesbloqueado = estadoJuego.maxNivelDesbloqueado || 0; 
                sobresGratisEpico = estadoJuego.sobresGratisEpico || 0;
                regalosReclamados = estadoJuego.regalosReclamados || regalosReclamados; 
                cuponesCanjeados = estadoJuego.cuponesCanjeados || cuponesCanjeados;
                estadisticasLogros = estadoJuego.estadisticasLogros || estadisticasLogros; 
                logrosDesbloqueados = estadoJuego.logrosDesbloqueados || logrosDesbloqueados;
                tiempoSpawnBase = estadoJuego.tiempoSpawnBase || 2200; 
                tiempoSpawnActual = tiempoSpawnBase; 
                costeVelocidad = estadoJuego.costeVelocidad || 50; 
                tiempoRecogida = estadoJuego.tiempoRecogida || 5000; 
                costeLimpieza = estadoJuego.costeLimpieza || 500; 
                tiempoPasivo = estadoJuego.tiempoPasivo || 3000; 
                costePasivo = estadoJuego.costePasivo || 100;
                costeAmnesia = estadoJuego.costeAmnesia || 8500;
                inventarioCupones = estadoJuego.inventarioCupones || [];
                
                const elVel = document.getElementById('coste-vel');
                const elLimp = document.getElementById('coste-limpieza');
                const elPas = document.getElementById('coste-pasivo');
                const elAm = document.getElementById('coste-amnesia');

                if (elVel) elVel.innerText = costeVelocidad; 
                if (elLimp) elLimp.innerText = costeLimpieza; 
                if (elPas) elPas.innerText = costePasivo;
                if (elAm) elAm.innerText = costeAmnesia;
                
                if (estadoJuego.amigos && estadoJuego.amigos.length > 0) { 
                    estadoJuego.amigos.forEach(a => { createFriend(parseInt(a.level), parseFloat(a.x), parseFloat(a.y)); }); 
                } else { 
                    spawnAmigoInicial(); 
                }
                
                if (estadoJuego.timeStamp) {
                    const tiempoFueraMs = Date.now() - estadoJuego.timeStamp;
                    let tiempoFueraSegundos = tiempoFueraMs / 1000;
                    
                    if (tiempoFueraSegundos >= 14400) { verificarLogro('la_resaca'); }
                    if (tiempoFueraSegundos > 28800) { tiempoFueraSegundos = 28800; }

                    let ingresosPorBucle = 0; 
                    document.querySelectorAll('.friend').forEach(f => { ingresosPorBucle += (parseInt(f.dataset.level) + 1); });
                    
                    let cubatasGanadosOffline = Math.floor((ingresosPorBucle / (tiempoPasivo / 1000)) * tiempoFueraSegundos); 
                    let cajasNuevasOffline = Math.floor(tiempoFueraMs / tiempoSpawnActual); 
                    if (cajasNuevasOffline > 6) cajasNuevasOffline = 6;
                    
                    if (cubatasGanadosOffline > 0 || cajasNuevasOffline > 0) { 
                        cubatas += cubatasGanadosOffline; 
                        estadisticasLogros.cubatasTotalesGanados += cubatasGanadosOffline; 
                        setTimeout(() => { 
                            alert(`🍻 ¡DE VUELTA!\nHas estado fuera y tus colegas han seguido de fiesta.\n\nHan recolectado:\n🍹 +${cubatasGanadosOffline} cubatas\n📦 +${cajasNuevasOffline} cajas`); 
                            for (let i = 0; i < cajasNuevasOffline; i++) { crearCajaOffline(); } 
                        }, 600); 
                    }
                }
            }
        } else { 
            spawnAmigoInicial(); 
            pedirNombre(); 
        }
        ganarCubatas(0);  
        sincronizarStockGlobal();
    }

    function spawnAmigoInicial() { const xCentro = (window.innerWidth / 2) - 45; const yCentro = (window.innerHeight / 2) - 45; createFriend(0, xCentro, yCentro); }

    function pedirNombre() { 
        let nombre = prompt("Introduce tu nombre para el Ranking (Máx 15 letras):"); 
        if (!nombre || nombre.trim() === "") return;
        nombreJugador = nombre.trim().substring(0, 15); 
        guardarPartida(); 
    }

    function cambiarNombre() { pedirNombre(); if(nombreJugador !== "Desconocido") alert("Nombre actualizado a: " + nombreJugador); }
    function borrarPartida() { if(confirm("¿Seguro que quieres borrar todo el progreso?")) { localStorage.removeItem('juergaSave2026'); location.reload(); } }

    function actualizaEstilosExtremos() {
        const btn1 = document.getElementById('btn-extremo-chupinazo');
        const btn2 = document.getElementById('btn-extremo-barralibre');
        const btnVip = document.getElementById('btn-vip-room'); 

        if(maxNivelDesbloqueado >= 8) { 
            if(btn1 && btn2) { btn1.className = "boton-arcade btn-unlocked-extremo"; btn2.className = "boton-arcade btn-unlocked-extremo"; }
            if(btnVip) btnVip.style.display = 'block'; 
        } else {
            if(btn1 && btn2) { btn1.className = "boton-arcade btn-lock"; btn2.className = "boton-arcade btn-lock"; }
            if(btnVip) btnVip.style.display = 'none';
        }
    }

    // ==========================================================================
    // 🛒 TIENDA Y BOOSTS
    // ==========================================================================
    function abrirTienda() { pausarJuego(); ocultarTodosModales(); document.getElementById('shop-modal').classList.remove('oculto'); actualizarTiendaPersonajes(); actualizaEstilosExtremos(); }

    function boostBajoRefresco() {
        if (cubatas >= 150) { 
            cubatas -= 150; ganarCubatas(0); cerrarModales();
            multiplicadorClic = 3;
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
    function boostMedioCharanga() {
        if (cubatas >= 1200) {
            cubatas -= 1200; ganarCubatas(0); cerrarModales();
            multiplicadorPasivo = 3; 
            clearTimeout(timeoutMultiplicador); 
            timeoutMultiplicador = setTimeout(() => { multiplicadorPasivo = 1; }, 30000);
            guardarPartida();
        } else alert("¡Te faltan cubatas!");
    }

    function comprarHoraLoca() {
        if (boostVelocidadActivo) { alert("¡Frenesí ya activo!"); return; }
        if (cubatas >= 5000) { 
            cubatas -= 5000; ganarCubatas(0); cerrarModales(); 
            boostVelocidadActivo = true; 
            let backupSpawn = tiempoSpawnActual; 
            tiempoSpawnActual = 500; 
            clearInterval(intervalCajas); 
            intervalCajas = setInterval(crearCaja, tiempoSpawnActual); 
            estadisticasLogros.frenesisActivados++; 
            verificarLogro('frenesi_loco'); 
            setTimeout(() => { boostVelocidadActivo = false; tiempoSpawnActual = backupSpawn; clearInterval(intervalCajas); if(!juegoPausado) intervalCajas = setInterval(crearCaja, tiempoSpawnActual); }, 15000); 
            guardarPartida(); 
        } else alert("¡Te faltan cubatas!");
    }
    function comprarAmnesia() {
        if (cubatas >= costeAmnesia) {
            cubatas -= costeAmnesia;
            let cps = 0; 
            document.querySelectorAll('.friend').forEach(f => { cps += (parseInt(f.dataset.level) + 1); });
            cps = (cps / (tiempoPasivo / 1000)) * multiplicadorPasivo;
            let gananciasInstantaneas = Math.floor(cps * 900); 
            ganarCubatas(gananciasInstantaneas);
            alert("⏳ ¡Amnesia! Has avanzado 15 minutos y ganado " + gananciasInstantaneas + " 🥃");
            
            costeAmnesia = Math.floor(costeAmnesia * 2.5);
            if (costeAmnesia > 500000) costeAmnesia = 500000;
            
            const textoCoste = document.getElementById('coste-amnesia');
            if (textoCoste) textoCoste.innerText = costeAmnesia;
            cerrarModales(); guardarPartida();
        } else alert("¡Te faltan cubatas!");
    }
    function comprarAutobus() { 
        if (document.querySelectorAll('.friend').length > 18) { alert("¡No hay espacio para 2!"); return; } 
        if (cubatas >= 15000) { 
            cubatas -= 15000; ganarCubatas(0); cerrarModales(); 
            alert("🚌 ¡Llegó el autobús de refuerzos!"); 
            for(let i = 0; i < 2; i++) { setTimeout(() => { const rX = Math.random() * (window.innerWidth - 95); const rY = Math.random() * (window.innerHeight - 150) + 50; createFriend(5, rX, rY); }, i * 400); } 
            guardarPartida(); 
        } else alert("¡Te faltan cubatas!"); 
    }
    function boostExtremoChupinazo() {
        if (maxNivelDesbloqueado < 8) { alert("🔒 BLOQUEADO: Requieres subir y desbloquear al menos un Juerguista de Nivel 9."); return; }
        if (document.querySelectorAll('.friend').length >= 20) { alert("¡Pradera llena!"); return; }
        if (cubatas >= 150000) {
            cubatas -= 150000; ganarCubatas(0); cerrarModales();
            const xC = (window.innerWidth / 2) - 45; const yC = (window.innerHeight / 2) - 45;
            createFriend(8, xC, yC); guardarPartida();
        } else alert("¡Te faltan cubatas!");
    }
    function boostExtremoBarraLibre() {
        if (maxNivelDesbloqueado < 8) { alert("🔒 BLOQUEADO: Requieres al menos un Juerguista de Nivel 9."); return; }
        if (cubatas >= 120000) {
            cubatas -= 120000; ganarCubatas(0); cerrarModales();
            multiplicadorPasivo = 10; 
            clearTimeout(timeoutMultiplicador); 
            timeoutMultiplicador = setTimeout(() => { multiplicadorPasivo = 1; }, 30000);
            guardarPartida();
        } else alert("¡Te faltan cubatas!");
    }

    // ==========================================================================
    // 🎁 EVENTOS, REGALOS Y BARRA
    // ==========================================================================
    const FECHA_INICIO = new Date('2026-08-03T00:00:00');
    const FECHA_FIN = new Date('2026-09-07T23:59:59');

    function abrirMenuDiario() { 
        ocultarTodosModales(); pausarJuego(); 
        document.getElementById('diario-modal').classList.remove('oculto'); 
        renderizarCalendario(); 
    }
    function abrirManualDirecto() {
        ocultarTodosModales();
        document.getElementById('manual-modal').classList.remove('oculto');
    }
    function renderizarCalendario() {
        const contenedor = document.getElementById('calendario-contenedor');
        contenedor.innerHTML = ''; 
        const hoy = new Date();
        const hoyStr = hoy.toISOString().split('T')[0];
        const yaReclamado = localStorage.getItem('recompensa-' + hoyStr) === 'true';

        if (hoy < FECHA_INICIO || hoy > FECHA_FIN) {
            contenedor.innerHTML = '<p style="text-align:center; padding:20px; font-weight:bold; color:#333;">📅 El evento de recompensas no está activo actualmente.</p>';
            return;
        }
        const diaEvento = Math.floor((hoy - FECHA_INICIO) / (1000 * 60 * 60 * 24));
        const esLunes = (hoy.getDay() === 1);
        const premio = esLunes ? "1 🎁 (Sobre Épico Gratis)" : (1000 + (diaEvento * 200)) + " 🥃";

        contenedor.innerHTML = `
            <div class="calendar-day ${yaReclamado ? 'reclamado' : 'hoy'}">
                <div class="day-info">
                    <h4>Día ${diaEvento + 1} del Evento</h4>
                    <p style="color: #ff0055;">Premio: ${premio}</p>
                </div>
                ${yaReclamado ? '<button class="btn-reclamar desactivado" disabled>✅ RECLAMADO</button>' : `<button class="btn-reclamar" onclick="reclamarPremio('${hoyStr}', ${esLunes})">🎁 RECLAMAR</button>`}
            </div>
        `;
    }
    function reclamarPremio(fechaStr, esLunes) {
        if (esLunes) { sobresGratisEpico += 1; alert("🎁 ¡PREMIO LUNERO! Has recibido 1 Sobre Épico GRATIS."); } 
        else {
            let diaEvento = Math.floor((new Date(fechaStr) - FECHA_INICIO) / (1000 * 60 * 60 * 24));
            let premioCubatas = 1000 + (diaEvento * 200);
            ganarCubatas(premioCubatas);
            alert("🥃 ¡RECOMPENSA DIARIA! Has ganado +" + premioCubatas + " cubatas.");
        }
        localStorage.setItem('recompensa-' + fechaStr, 'true');
        guardarPartida(); renderizarCalendario(); 
    }

    function abrirCasino() {
        cerrarModales(); 
        if (casinoVIP) { document.getElementById('casino-modal').classList.remove('oculto'); actualizarBotonesSobres(); } 
        else { document.getElementById('pago-casino-modal').classList.remove('oculto'); }
    }
    function generarCodigoDinamico(offset = 0) {
        const ventanaTiempo = Math.floor(Date.now() / 20000) + offset;
        let semilla = 7351; let codigo = ((ventanaTiempo + semilla) * 1234) % 10000;
        return codigo.toString().padStart(4, '0');
    }

    let intervaloCamarero;
    function abrirPanelCamarero() {
        let pass = prompt("Contraseña Maestra de la Barra:");
        if (pass === "DeXTer_2007") { 
            cerrarModales(); document.getElementById('camarero-modal').classList.remove('oculto');
            document.getElementById('codigo-vivo').innerText = generarCodigoDinamico();
            intervaloCamarero = setInterval(() => {
                if(document.getElementById('camarero-modal').classList.contains('oculto')) clearInterval(intervaloCamarero); 
                else document.getElementById('codigo-vivo').innerText = generarCodigoDinamico();
            }, 1000);
        } else if (pass !== null) alert("¡Largo de aquí, cotilla!");
    }
    function verificarPagoCasino() {
        let password = prompt("🕵️‍♂️ SEGURATA: 'El código cambia cada 20s. Dale tu móvil al camarero para que lo teclee.'\n\nCódigo actual:");
        if (password === null || password === "") return;
        if (password === generarCodigoDinamico() || password === generarCodigoDinamico(-1)) {
            casinoVIP = true; localStorage.setItem('casinoVIP', 'true');
            document.getElementById('pago-casino-modal').classList.add('oculto');
            abrirCasino(); alert("¡Pase VIP Confirmado! Bienvenido al Clandestino.");
        } else alert("❌ SEGURATA: 'Código incorrecto o caducado.'");
    }

    // ==========================================================================
    // 🎟️ CUPONES Y WALKOUTS
    // ==========================================================================
    function cerrarCupon() { document.getElementById('cupon-modal').classList.add('oculto'); cuponActivoTipo = ""; reanudarJuego(); }
    function quemarCupon() {
        if (confirm("⚠️ ¿ERES EL CAMARERO?\n\nSi aceptas, el premio desaparecerá de tu móvil para siempre.")) {
            if (cuponActivoIndex > -1) {
                inventarioCupones.splice(cuponActivoIndex, 1);
                guardarPartida(); cuponActivoIndex = -1;
                clearInterval(intervaloRelojCupon);
                alert("✅ ¡PREMIO ENTREGADO! Que aproveche."); cerrarModales();
            }
        }
    }
    function entregarPremioFisico(textoPremio) {
        let codigoGen = Math.random().toString(36).substring(2, 8).toUpperCase();
        inventarioCupones.push({ texto: textoPremio, codigo: "#" + codigoGen });
        let textoMayus = textoPremio.toUpperCase();
        if (textoMayus.includes("CHUPITO")) estadisticasLogros.chupitosGanados = (estadisticasLogros.chupitosGanados || 0) + 1;
        if (textoMayus.includes("CUBATA")) estadisticasLogros.cubatasRealesGanados = (estadisticasLogros.cubatasRealesGanados || 0) + 1;
        guardarPartida(); subirPuntuacion(); mostrarNotificacion("🎟️ ¡PREMIO ENVIADO A TUS CUPONES!");
    }

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

    function procesarStock(premioElegido) {
        const hoy = obtenerDiaDeFiesta();
        if (premioElegido.tipo === 'chupito') {
            if (stockChupitosHoy > 0) {
                stockChupitosHoy--; 
                if(db) db.collection("control_barra").doc(hoy).update({ chupitos: firebase.firestore.FieldValue.increment(-1) }).catch(()=>{});
                return premioElegido;
            } else return { tipo: 'cubatas', min: 50000, max: 50000, texto: "AGOTADO HOY: +50.000 🥃" };
        } else if (premioElegido.tipo === 'cubata_real') {
            if (stockCubatasHoy > 0) {
                stockCubatasHoy--;
                if(db) db.collection("control_barra").doc(hoy).update({ cubatas: firebase.firestore.FieldValue.increment(-1) }).catch(()=>{});
                return premioElegido;
            } else return { tipo: 'cubatas', min: 100000, max: 100000, texto: "AGOTADO HOY: +100.000 🥃" };
        }
        return premioElegido;
    }

    function elegirPremio(premios) {
        const total = premios.reduce((s, p) => s + p.peso, 0);
        let tirada = Math.random() * total;
        for (const p of premios) { if (tirada < p.peso) return p; tirada -= p.peso; }
        return premios[0];
    }

    function abrirWalkout(elementoCarta, tier) {
        if (sobreAbriendo) return;
        const cfg = SOBRES[tier];
        if (!cfg) return;

        const esGratis = (tier === 'epico' && sobresGratisEpico > 0);
        if (!esGratis) {
            if (cubatas < cfg.coste) { alert("¡Te faltan cubatas para este sobre!"); return; }
            cubatas -= cfg.coste; ganarCubatas(0);
        } else sobresGratisEpico--;
        
        guardarPartida(); sobreAbriendo = true;
        document.getElementById('casino-modal').classList.add('oculto');
        
        const modal = document.getElementById('walkout-modal');
        const camera = document.getElementById('walkout-camera');
        const neones = document.querySelectorAll('.neon-tube:not(.apagada-caminante)');
        const neonCaminante = document.querySelector('.apagada-caminante');
        const flares = document.getElementById('walkout-flares');
        const doors = document.getElementById('walkout-doors');
        const flash = document.getElementById('walkout-flash');
        const rewardContainer = document.getElementById('walkout-reward-container');
        const rewardImg = document.getElementById('walkout-reward-img');
        const premioTxt = document.getElementById('walkout-premio');
        const btnCerrar = document.getElementById('walkout-btn-cerrar');

        modal.classList.remove('oculto'); camera.classList.remove('camera-moving');
        doors.classList.remove('doors-glowing', 'doors-open'); flares.classList.remove('flares-on');
        flash.classList.remove('flash-boom'); neones.forEach(n => n.classList.remove('on'));
        if(neonCaminante) neonCaminante.classList.remove('on');
        rewardContainer.classList.add('oculto'); rewardContainer.classList.remove('card-fly-in');
        rewardImg.classList.add('oculto'); btnCerrar.classList.add('oculto');

        let premio = elegirPremio(cfg.premios);
        premio = procesarStock(premio);
        const esPremioFisico = (premio.tipo === 'chupito' || premio.tipo === 'cubata_real');

        setTimeout(() => {
            camera.classList.add('camera-moving');
            if (esPremioFisico) {
                setTimeout(() => {
                    neones.forEach(n => n.classList.add('on'));
                    setTimeout(() => {
                        flares.classList.add('flares-on');
                        setTimeout(() => {
                            doors.classList.add('doors-glowing');
                            setTimeout(() => {
                                doors.classList.add('doors-open');
                                setTimeout(() => {
                                    flash.classList.add('flash-boom');
                                    setTimeout(() => {
                                        rewardContainer.classList.remove('oculto');
                                        rewardContainer.classList.add('card-fly-in');
                                        rewardImg.src = premio.tipo === 'chupito' ? 'CHUPITO.jpg' : 'cubata.jpg';
                                        rewardImg.classList.remove('oculto');
                                        premioTxt.innerText = premio.texto;
                                        btnCerrar.dataset.premioFisico = premio.texto;
                                        setTimeout(() => { btnCerrar.classList.remove('oculto'); sobreAbriendo = false; actualizarBotonesSobres(); }, 1500);
                                    }, 200); 
                                }, 300); 
                            }, 800); 
                        }, 1000); 
                    }, 1400); 
                }, 800); 
            } else {
                setTimeout(() => {
                    neones.forEach(n => n.classList.add('on'));
                    if(neonCaminante) neonCaminante.classList.add('on');
                    setTimeout(() => {
                        doors.classList.add('doors-open');
                        setTimeout(() => {
                            rewardContainer.classList.remove('oculto');
                            rewardContainer.classList.add('card-fly-in');
                            const cantidad = Math.floor(premio.min + Math.random() * (premio.max - premio.min));
                            ganarCubatas(cantidad);
                            premioTxt.style.color = "#00ff00";
                            premioTxt.innerText = premio.texto.replace('{x}', cantidad);
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

    function actualizarBotonesSobres() {
        const costeEpico = document.getElementById('coste-sobre-epico');
        const btnEpico = document.getElementById('btn-sobre-epico');
        if (costeEpico && btnEpico) {
            if (sobresGratisEpico > 0) { costeEpico.innerText = "GRATIS x" + sobresGratisEpico; btnEpico.classList.add('btn-unlocked-extremo'); } 
            else { costeEpico.innerText = SOBRES.epico.coste; btnEpico.classList.remove('btn-unlocked-extremo'); }
        }
    }

    // ==========================================================================
    // ⚙️ NAVEGACIÓN Y MENÚS
    // ==========================================================================
    function abrirLogros() { 
        ocultarTodosModales(); document.getElementById('logros-modal').classList.remove('oculto'); 
        const contenedor = document.getElementById('lista-logros-contenedor'); contenedor.innerHTML = ''; 
        for (let id in infoLogros) { 
            let l = infoLogros[id]; let completado = logrosDesbloqueados[id]; 
            let textoProgreso = completado ? `<span style="color:#00c853; font-weight:bold;">🏆 COMPLETADO</span>` : `<span style="color:#ffaa00;">En progreso...</span>`; 
            contenedor.innerHTML += `<div class="libro-item" style="background:${completado ? '#e8f5e9' : 'white'};"><div class="libro-info" style="width:100%;"><h4 style="color:${completado ? '#00c853' : '#ff0055'};">${l.titulo}</h4><p style="color:#555; font-size:12px; font-weight:normal; margin-bottom:4px;">${l.desc}</p><div style="display:flex; justify-content:space-between; font-size:11px; font-weight:bold;"><span>Premio: +${l.premio} 🍹</span>${textoProgreso}</div></div></div>`; 
        } 
    }

    function abrirMenuPrincipal() { pausarJuego(); ocultarTodosModales(); document.getElementById('menu-modal').classList.remove('oculto'); }
    function abrirJuerguistas() { ocultarTodosModales(); document.getElementById('juerguistas-modal').classList.remove('oculto'); renderizarJuerguistas(); }
    function abrirOpciones() { ocultarTodosModales(); document.getElementById('opciones-modal').classList.remove('oculto'); }
    function abrirRanking() { ocultarTodosModales(); document.getElementById('ranking-modal').classList.remove('oculto'); if (nombreJugador === "Desconocido") { pedirNombre(); subirPuntuacion(); } actualizarInterfazRanking(); }
    function volverAlMenu() { ocultarTodosModales(); document.getElementById('menu-modal').classList.remove('oculto'); }
    function cerrarModales() { ocultarTodosModales(); reanudarJuego(); }
    function ocultarTodosModales() { document.querySelectorAll('.modal').forEach(m => m.classList.add('oculto')); }

    function pausarJuego() { 
        juegoPausado = true; 
        clearInterval(intervalCajas); clearInterval(intervalVomitar); clearInterval(intervalRecoger); clearInterval(intervalPasivo); 
    }

    function reanudarJuego() { 
        juegoPausado = false; 
        clearInterval(intervalCajas); clearInterval(intervalVomitar); clearInterval(intervalRecoger); clearInterval(intervalPasivo);
        intervalCajas = setInterval(crearCaja, tiempoSpawnActual); 
        intervalVomitar = setInterval(generarVomito, 3500); 
        intervalRecoger = setInterval(recogerVomitoAutomatico, tiempoRecogida); 
        iniciarBuclePasivo(); 
    }

    function ganarCubatas(cantidad) { 
        cubatas += cantidad; 
        if (cantidad > 0) estadisticasLogros.cubatasTotalesGanados += cantidad; 
        if (contadorCubatas) contadorCubatas.innerText = cubatas; 
        verificarLogro('tesorero_pena'); 
    }

    function mostrarTextoFlotante(x, y, cantidad) { const texto = document.createElement('div'); texto.classList.add('floating-text'); texto.innerText = `+${cantidad}`; texto.style.left = `${x}px`; texto.style.top = `${y}px`; board.appendChild(texto); setTimeout(() => { texto.remove(); }, 1000); }
    function mostrarAvisoFlotante(x, y, mensaje) { const texto = document.createElement('div'); texto.classList.add('floating-text'); texto.style.color = "#ff4444"; texto.innerText = mensaje; texto.style.left = `${x}px`; texto.style.top = `${y}px`; texto.style.zIndex = "400"; board.appendChild(texto); setTimeout(() => { texto.remove(); }, 1000); }

    function actualizarInterfazRanking() {
        const contenedor = document.getElementById('ranking-content');
        if (!db) { contenedor.innerHTML = "<p style='color:red;'>Ranking no disponible offline.</p>"; return; }
        contenedor.innerHTML = '<h3 style="color:#333; margin-top:20px;">Cargando... 📡</h3>';
        
        db.collection("ranking").orderBy("nivelMaximo", "desc").limit(10).get().then((querySnapshot) => {
            let html = '<h3 style="margin-bottom:15px; color:#ff0055; font-family: \'Press Start 2P\', cursive; font-size:12px; text-shadow: 2px 2px 0px #ccc;">🏆 TOP 10 PEÑA 🏆</h3><div style="text-align:left; font-size: 14px;">';
            let i = 1; 
            querySnapshot.forEach((doc) => { 
                let p = doc.data(); 
                let corona = p.esVIP ? '<span title="VIP" style="font-size:16px; margin-left:5px; filter: drop-shadow(0 0 2px gold);">👑</span>' : '';
                let chupis = p.chupitosReales || 0; let cubis = p.cubatasReales || 0;
                let fondoFila = (i % 2 === 0) ? '#f5f5f5' : '#ffffff';
                html += `
                <div style="padding: 12px; border-bottom: 3px solid #333; display:flex; justify-content:space-between; align-items:center; background: ${fondoFila}; border-radius: 6px; margin-bottom: 4px;">
                    <div style="display:flex; flex-direction:column; gap:6px;">
                        <span style="font-weight:bold; font-size:15px; color:#111;">${i}. ${p.nombre} ${corona}</span>
                        <span style="font-size:11px; color:#555; font-weight:bold; background: #eee; padding: 3px 6px; border-radius: 4px; border: 1px solid #ccc; width: fit-content;">🥂 ${chupis}  |  🍹 ${cubis}</span>
                    </div>
                    <div style="background:#ff0055; color:white; padding:6px 10px; border-radius:8px; font-weight:bold; font-size:12px; border:2px solid #333; box-shadow: 2px 2px 0 #000;">Nvl ${p.nivelMaximo}</div>
                </div>`; 
                i++; 
            });
            html += '</div>'; contenedor.innerHTML = html;
        }).catch(() => { contenedor.innerHTML = "<p style='color:red;'>Error de conexión.</p>"; });
    }

    // 🚨 AQUÍ ESTABA EL ERROR DEL CRASH 🚨
    function actualizarCubatasPorSegundo() { 
        const friends = document.querySelectorAll('.friend'); 
        let ingresosTotales = 0; 
        friends.forEach(f => { ingresosTotales += (parseInt(f.dataset.level) + 1); }); 
        
        // ¡Variables limpias sin reasignaciones globales ocultas!
        let cps = (ingresosTotales / (tiempoPasivo / 1000)) * multiplicadorPasivo; 
        const elCps = document.getElementById('cubatas-segundo');
        if (elCps) elCps.innerText = `${cps.toFixed(1)} cubatas/seg`; 
    }

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

    function generarVomito() { 
        if (juegoPausado) return; 
        document.querySelectorAll('.friend').forEach(f => { 
            const vomito = document.createElement('div'); vomito.classList.add('vomito'); vomito.innerText = '🤮'; 
            let x = parseFloat(f.style.left) + (Math.random() * 40 - 10); let y = parseFloat(f.style.top) + 95; 
            vomito.style.left = `${x}px`; vomito.style.top = `${y}px`; 
            vomito.dataset.valor = (parseInt(f.dataset.level) + 1) * 2; 
            vomito.addEventListener('pointerdown', (e) => { 
                e.stopPropagation(); e.preventDefault(); 
                if (juegoPausado) return; 
                if (navigator.vibrate) navigator.vibrate(40);
                const valorVomito = parseInt(vomito.dataset.valor); ganarCubatas(valorVomito); 
                const texto = document.createElement('div'); texto.classList.add('floating-text'); texto.innerText = `+${valorVomito}`; 
                texto.style.left = `${x}px`; texto.style.top = `${y}px`; 
                f.parentElement.appendChild(texto); setTimeout(() => { texto.remove(); }, 1000);
                vomito.remove(); estadisticasLogros.vomitosLipiados++; verificarLogro('estomago_hierro'); 
            }); 
            f.parentElement.appendChild(vomito); 
        }); 
    }

    function recogerVomitoAutomatico() { 
        if (juegoPausado) return; 
        let totalRecolectado = 0; 
        document.querySelectorAll('.vomito').forEach(v => { 
            const valor = parseInt(v.dataset.valor); totalRecolectado += valor; 
            mostrarTextoFlotante(parseFloat(v.style.left), parseFloat(v.style.top), valor); v.remove(); 
        }); 
        if (totalRecolectado > 0) ganarCubatas(totalRecolectado); 
    }

    function cambiarTab(pestana) { 
        document.getElementById('tab-mejoras').classList.add('oculto'); document.getElementById('tab-personajes').classList.add('oculto'); 
        document.getElementById('btn-tab-mejoras').style.background = '#000'; document.getElementById('btn-tab-mejoras').style.color = '#00ff00';
        document.getElementById('btn-tab-personajes').style.background = '#000'; document.getElementById('btn-tab-personajes').style.color = '#00ff00';
        document.getElementById(`tab-${pestana}`).classList.remove('oculto'); 
        document.getElementById(`btn-tab-${pestana}`).style.background = '#00ff00'; document.getElementById(`btn-tab-${pestana}`).style.color = '#000';
        if (pestana === 'personajes') actualizarTiendaPersonajes(); 
    }

    function actualizarTiendaPersonajes() { 
        const tabPersonajes = document.getElementById('tab-personajes'); tabPersonajes.innerHTML = ''; 
        for (let i = 0; i <= maxNivelDesbloqueado; i++) { 
            if(i >= levels.length) break; 
            let precioPersonaje = Math.floor(100 * Math.pow(2.5, i)); 
            tabPersonajes.innerHTML += `<button class="boton-arcade" style="display:flex; flex-direction:column; align-items:center; justify-content:center; padding:10px; margin: 5px;" onclick="comprarPersonaje(${i}, ${precioPersonaje})"><img src="${levels[i]}" style="width:50px; height:50px; object-fit:contain; margin-bottom:5px; filter: drop-shadow(0 0 5px #00ff00);">Nvl ${i + 1}<br><small style="color:#00ff00; font-size:9px; margin-top:5px; font-family: 'Press Start 2P', cursive;">${precioPersonaje} 🥃</small></button>`; 
        } 
    }

    function comprarPersonaje(nivel, precio) { 
        if (document.querySelectorAll('.friend').length >= 20) { alert("¡La pradera está a tope! (Máx 20)."); return; } 
        if (cubatas >= precio) { 
            cubatas -= precio; ganarCubatas(0); cerrarModales(); 
            const xCentro = (window.innerWidth / 2) - 45; const yCentro = (window.innerHeight / 2) - 45; 
            createFriend(nivel, xCentro, yCentro); guardarPartida(); 
        } else alert("¡Te faltan cubatas!"); 
    }

    function crearCajaInstantanea() {
        const caja = document.createElement('div'); caja.classList.add('caja'); caja.style.transition = "none";
        const randomX = Math.random() * (window.innerWidth - 95); caja.style.left = `${randomX}px`; caja.style.top = `${window.innerHeight * 0.6}px`;
        board.appendChild(caja);
        caja.addEventListener('pointerdown', () => { 
            if (document.querySelectorAll('.friend').length >= 20) { mostrarAvisoFlotante(parseFloat(caja.style.left), parseFloat(caja.style.top) - 20, "¡LLENO!"); return; } 
            const rect = caja.getBoundingClientRect(); const boardRect = board.getBoundingClientRect(); 
            caja.remove(); ganarCubatas(1 * multiplicadorClic); 
            createFriend(nivelAparicion, rect.left - boardRect.left, rect.top - boardRect.top); 
            estadisticasLogros.cajasAbiertas++; verificarLogro('lluvia_litros'); guardarPartida(); 
        });
    }

    function comprarVelocidad() { 
        if (boostVelocidadActivo) { alert("¡El Frenesí ya está activo!"); return; } 
        if (cubatas >= costeVelocidad) { 
            cubatas -= costeVelocidad; ganarCubatas(0); cerrarModales(); 
            tiempoSpawnBase = Math.max(1200, tiempoSpawnBase - 150); costeVelocidad = Math.floor(costeVelocidad * 1.5); 
            document.getElementById('coste-vel').innerText = costeVelocidad; 
            boostVelocidadActivo = true; tiempoSpawnActual = 500; 
            clearInterval(intervalCajas); intervalCajas = setInterval(crearCaja, tiempoSpawnActual); 
            estadisticasLogros.frenesisActivados++; verificarLogro('frenesi_loco'); 
            setTimeout(() => { boostVelocidadActivo = false; tiempoSpawnActual = tiempoSpawnBase; clearInterval(intervalCajas); if(!juegoPausado) intervalCajas = setInterval(crearCaja, tiempoSpawnActual); }, 30000); 
            guardarPartida(); 
        } else alert("¡Te faltan cubatas!");
    }

    function comprarEvento() { 
        if (nivelAparicion === 1) { alert("¡La Hora Feliz ya está activa!"); return; } 
        if (cubatas >= 150) { 
            cubatas -= 150; ganarCubatas(0); nivelAparicion = 1; cerrarModales(); 
            setTimeout(() => { nivelAparicion = 0; }, 30000); guardarPartida(); 
        } else alert("¡Te faltan cubatas!"); 
    }

    function comprarPasivo() { 
        if (cubatas >= costePasivo) { 
            cubatas -= costePasivo; ganarCubatas(0); 
            tiempoPasivo = Math.max(400, tiempoPasivo - 400); costePasivo = Math.floor(costePasivo * 1.6); 
            document.getElementById('coste-pasivo').innerText = costePasivo; 
            iniciarBuclePasivo(); guardarPartida(); 
        } else alert("¡Te faltan cubatas!"); 
    }

    function comprarLimpieza() { 
        if (cubatas >= costeLimpieza) { 
            cubatas -= costeLimpieza; ganarCubatas(0); 
            tiempoRecogida = Math.max(400, tiempoRecogida / 2); costeLimpieza = Math.floor(costeLimpieza * 2.5); 
            document.getElementById('coste-limpieza').innerText = costeLimpieza; 
            clearInterval(intervalRecoger); intervalRecoger = setInterval(recogerVomitoAutomatico, tiempoRecogida); 
            verificarLogro('vip_barra'); guardarPartida(); 
        } else alert("¡Te faltan cubatas!"); 
    }

    function mostrarCinematica(nivel) { 
        pausarJuego(); if (navigator.vibrate) navigator.vibrate([200, 100, 200, 100, 400]); 
        const cinematic = document.getElementById('unlock-cinematic'); 
        document.getElementById('unlock-img').src = levels[nivel]; 
        document.getElementById('unlock-desc').innerText = `¡NIVEL ${nivel + 1} ALCANZADO!`; 
        cinematic.classList.remove('oculto'); setTimeout(() => { cinematic.classList.add('activo'); }, 20); 
        cinematic.onclick = () => { cinematic.classList.add('oculto'); cinematic.classList.remove('activo'); reanudarJuego(); }; 
    }

    function crearCaja() { 
        if (juegoPausado || document.querySelectorAll('.caja').length > 7) return; 
        const esDorada = Math.random() < 0.05;
        const caja = document.createElement('div'); caja.classList.add('caja'); 
        if (esDorada) caja.classList.add('caja-dorada');
        
        let segundosCaida = 5.0; if (tiempoSpawnActual <= 4000) segundosCaida = 4.0; if (tiempoSpawnActual <= 2000) segundosCaida = 3.5; 
        caja.style.transition = `top ${segundosCaida}s linear`; 
        
        const randomX = Math.random() * (window.innerWidth - 95); const randomY = Math.random() * (window.innerHeight - 200) + 20; 
        caja.style.left = `${randomX}px`; caja.style.top = `-95px`; board.appendChild(caja); 
        setTimeout(() => { if(!juegoPausado) caja.style.top = `${randomY}px`; }, 50); 
        
        caja.addEventListener('pointerdown', () => { 
            if (juegoPausado) return; 
            if (navigator.vibrate) navigator.vibrate(esDorada ? [100, 50, 100] : 30);
            if (document.querySelectorAll('.friend').length >= 20 && !esDorada) { mostrarAvisoFlotante(parseFloat(caja.style.left), parseFloat(caja.style.top) - 20, "¡LLENO!"); return; } 
            
            const rect = caja.getBoundingClientRect(); const boardRect = board.getBoundingClientRect(); 
            const x = rect.left - boardRect.left; const y = rect.top - boardRect.top;
            caja.remove(); 
            
            if (esDorada) { ganarCubatas(5000); mostrarTextoFlotanteEpico(x - 20, y, "¡+5000 🥃!"); createFriend(4, x, y); } 
            else { ganarCubatas(1 * multiplicadorClic); createFriend(nivelAparicion, x, y); }
            guardarPartida(); 
        }); 
    }

    function mostrarTextoFlotanteEpico(x, y, mensaje) {
        const texto = document.createElement('div'); texto.classList.add('floating-text-epic'); texto.innerText = mensaje; 
        texto.style.left = `${x}px`; texto.style.top = `${y}px`; board.appendChild(texto); setTimeout(() => { texto.remove(); }, 1500);
    }

    function crearCajaOffline() { 
        if (document.querySelectorAll('.caja').length > 6) return; 
        const caja = document.createElement('div'); caja.classList.add('caja'); caja.style.transition = "none"; 
        const randomX = Math.random() * (window.innerWidth - 95); const randomY = Math.random() * (window.innerHeight - 200) + 20; 
        caja.style.left = `${randomX}px`; caja.style.top = `${randomY}px`; board.appendChild(caja); 
        
        caja.addEventListener('pointerdown', () => { 
            if (juegoPausado) return; 
            if (document.querySelectorAll('.friend').length >= 20) { mostrarAvisoFlotante(parseFloat(caja.style.left), parseFloat(caja.style.top) - 20, "¡LLENO!"); return; } 
            const rect = caja.getBoundingClientRect(); const boardRect = board.getBoundingClientRect(); caja.remove(); 
            ganarCubatas(1 * multiplicadorClic); createFriend(nivelAparicion, rect.left - boardRect.left, rect.top - boardRect.top); 
            estadisticasLogros.cajasAbiertas++; verificarLogro('lluvia_litros'); guardarPartida(); 
        }); 
    }

    function createFriend(level, x, y) { 
        const friend = document.createElement('div'); friend.classList.add('friend'); friend.style.animation = "pop 0.4s ease-in-out"; 
        friend.dataset.level = level; friend.style.backgroundImage = `url('${levels[level]}')`; 
        friend.style.width = `95px`; friend.style.height = `95px`; friend.style.left = `${x}px`; friend.style.top = `${y}px`; 
        friend.addEventListener('pointerdown', startDrag); 
        if (level >= 8) document.getElementById('game-board-vip').appendChild(friend); else document.getElementById('game-board').appendChild(friend);
        actualizarCubatasPorSegundo(); 
    }

    function startDrag(e) { 
        if (juegoPausado) return; 
        dragItem = e.target; const rect = dragItem.getBoundingClientRect(); 
        let clientX = e.clientX !== undefined ? e.clientX : e.touches[0].clientX; let clientY = e.clientY !== undefined ? e.clientY : e.touches[0].clientY; 
        offsetX = clientX - rect.left; offsetY = clientY - rect.top; 
        document.addEventListener('pointermove', drag); document.addEventListener('pointerup', endDrag); 
        document.addEventListener('touchmove', dragTouch, {passive: false}); document.addEventListener('touchend', endDragTouch); 
    }
    function drag(e) { 
        if (!dragItem || juegoPausado) return; 
        const boardRect = dragItem.parentElement.getBoundingClientRect(); 
        let newX = Math.max(0, Math.min(e.clientX - boardRect.left - offsetX, boardRect.width - dragItem.offsetWidth));
        let newY = Math.max(0, Math.min(e.clientY - boardRect.top - offsetY, boardRect.height - dragItem.offsetHeight));
        dragItem.style.left = `${newX}px`; dragItem.style.top = `${newY}px`; 
    }
    function dragTouch(e) { 
        if (!dragItem || juegoPausado) return; e.preventDefault(); 
        const boardRect = dragItem.parentElement.getBoundingClientRect(); 
        let newX = Math.max(0, Math.min(e.touches[0].clientX - boardRect.left - offsetX, boardRect.width - dragItem.offsetWidth));
        let newY = Math.max(0, Math.min(e.touches[0].clientY - boardRect.top - offsetY, boardRect.height - dragItem.offsetHeight));
        dragItem.style.left = `${newX}px`; dragItem.style.top = `${newY}px`; 
    }
    function endDrag() { limpiarEventos(); }
    function endDragTouch() { limpiarEventos(); }

    function limpiarEventos() { 
        if (!dragItem || !dragItem.parentElement) {
            dragItem = null; document.removeEventListener('pointermove', drag); document.removeEventListener('pointerup', endDrag); 
            document.removeEventListener('touchmove', dragTouch); document.removeEventListener('touchend', endDragTouch); return;
        }
        const friends = dragItem.parentElement.querySelectorAll('.friend'); 
        const rect1 = dragItem.getBoundingClientRect(); 
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
        dragItem = null; document.removeEventListener('pointermove', drag); document.removeEventListener('pointerup', endDrag); 
        document.removeEventListener('touchmove', dragTouch); document.removeEventListener('touchend', endDragTouch); 
        actualizarCubatasPorSegundo(); guardarPartida(); 
    }

    let isVIPRoom = false;
    function toggleVIPRoom() {
        isVIPRoom = !isVIPRoom;
        const boardNormal = document.getElementById('game-board'); const boardVIP = document.getElementById('game-board-vip'); const btnVip = document.getElementById('btn-vip-room');
        if (isVIPRoom) { boardNormal.style.display = 'none'; boardVIP.style.display = 'block'; btnVip.innerText = "VOLVER"; btnVip.style.color = "#00ff00"; btnVip.style.borderColor = "#00ff00"; } 
        else { boardVIP.style.display = 'none'; boardNormal.style.display = 'block'; btnVip.innerText = "ZONA VIP"; btnVip.style.color = "#ff00ff"; btnVip.style.borderColor = "#ff00ff"; }
    }

    const nombresJuerguistas = ["Adrian Juan", "Iñaki Gonzalez", "Ander Garmon", "Victor Santos", "Noa Ugidos", "Natalia Gonzalez", "Ivan Ordas", "Guillermo Bango", "Lucia Grande", "Ruben Pelayo", "Karen Beneitez", "Aina Fernandez", "Iñigo Fernandez", "Hugo Barragan", "Natalia Armendariz", "Elena Vivas", "Naroa Chamorro", "Gerardo Pascual", "Pablo Martinez"];
    function abrirJuerguistas() { ocultarTodosModales(); document.getElementById('juerguistas-modal').classList.remove('oculto'); renderizarJuerguistas(); }
    function renderizarJuerguistas() {
        const contenedor = document.getElementById('juerguistas-contenedor'); contenedor.innerHTML = ''; 
        levels.forEach((img, index) => {
            const desbloqueado = index <= maxNivelDesbloqueado;
            contenedor.innerHTML += `<div class="libro-item"><img src="${img}" class="${desbloqueado ? '' : 'silueta-bloqueada'}" alt="Colega"><div class="libro-info"><h4>${desbloqueado ? nombresJuerguistas[index] : "???"}</h4><p>${desbloqueado ? `Nivel ${index + 1}` : "Bloqueado"}</p></div></div>`;
        });
    }

    // ==========================================================================
    // 📖 PANTALLA INICIAL BLINDADA
    // ==========================================================================
    const pantallaReglas = document.getElementById('pantalla-reglas');
    const btnEntrar = document.getElementById('btn-entrar-juego');
    const textoProgreso = document.getElementById('progreso-lectura');

    if (pantallaReglas) {
        let leidas = false;
        try { leidas = localStorage.getItem('juergaReglas2026') === 'true'; } catch(e) {}
        
        if (leidas) {
            pantallaReglas.classList.add('oculto');
        } else {
            let abiertas = new Set();
            document.querySelectorAll('.regla-item').forEach((item, idx) => {
                item.addEventListener('toggle', () => {
                    if (item.open) abiertas.add(idx);
                    if (textoProgreso) textoProgreso.innerText = `LEÍDO: ${abiertas.size}/7`;
                    if (abiertas.size >= 7 && btnEntrar) {
                        textoProgreso.innerText = "¡TODO LISTO!"; textoProgreso.style.color = "#00ff00";
                        btnEntrar.disabled = false; btnEntrar.classList.remove('desactivado');
                    }
                });
            });
        }
    }

    function aceptarReglas() {
        try { localStorage.setItem('juergaReglas2026', 'true'); } catch(e) {}
        if (pantallaReglas) pantallaReglas.classList.add('oculto');
        reanudarJuego();
        if (nombreJugador === "Desconocido") pedirNombre();
    }

    function abrirInventarioCupones() {
        ocultarTodosModales(); document.getElementById('cupones-inventario-modal').classList.remove('oculto');
        const contenedor = document.getElementById('lista-cupones'); contenedor.innerHTML = "";
        if (inventarioCupones.length === 0) {
            contenedor.innerHTML = `<div style="padding: 30px 10px;"><span style="font-size: 40px;">🕸️</span><p style="color:#666; margin-top: 15px; font-weight:bold; font-size:12px; line-height:1.6;">No tienes cupones todavía...<br><br>¡Prueba suerte abriendo Sobres VIP o pásate el juego para ganar!</p></div>`; return;
        }
        inventarioCupones.forEach((cupon, index) => {
            contenedor.innerHTML += `<div style="border: 2px dashed #00ff00; background: #111; padding: 15px; margin-bottom: 15px; border-radius: 8px; text-align: center;"><h4 style="color:#ffd700; margin-bottom:10px; font-size:14px; text-shadow: 0 0 5px #ffd700;">${cupon.texto}</h4><p style="color:#ccc; font-size:10px; margin-bottom:15px; font-family: 'Press Start 2P', cursive;">CÓDIGO: ${cupon.codigo}</p><button onclick="verCuponParaQuemar(${index})" class="boton-arcade" style="background:#ff0055; width: 100%; border-color: white;">IR A LA BARRA 🍹</button></div>`;
        });
    }

    let intervaloRelojCupon;
    function verCuponParaQuemar(index) {
        cuponActivoIndex = index; const cupon = inventarioCupones[index];
        document.getElementById('cupones-inventario-modal').classList.add('oculto'); document.getElementById('cupon-modal').classList.remove('oculto');
        document.getElementById('cupon-desc').innerText = cupon.texto; document.getElementById('cupon-codigo').innerText = cupon.codigo;
        
        const modalFondo = document.getElementById('cupon-fondo'); const modalTitulo = document.getElementById('cupon-titulo'); const modalCodigo = document.getElementById('cupon-codigo');
        if (cupon.texto.toUpperCase().includes("DORADO")) {
            modalFondo.style.background = "linear-gradient(135deg, #ffd700, #ffaa00)"; modalFondo.style.borderLeftColor = "#ffffff"; modalTitulo.style.color = "#ffffff"; modalTitulo.style.textShadow = "0 0 5px rgba(0,0,0,0.5)"; modalCodigo.style.borderColor = "#ffffff";
        } else {
            modalFondo.style.background = "#ffebee"; modalFondo.style.borderLeftColor = "#ff0000"; modalTitulo.style.color = "#ff0000"; modalTitulo.style.textShadow = "none"; modalCodigo.style.borderColor = "#ff0000";
        }

        let zonaReloj = document.getElementById('reloj-anticaptura');
        if (!zonaReloj) {
            zonaReloj = document.createElement('div'); zonaReloj.id = 'reloj-anticaptura';
            zonaReloj.style.marginTop = "15px"; zonaReloj.style.color = "#000"; zonaReloj.style.fontSize = "10px"; zonaReloj.style.fontFamily = "'Press Start 2P', cursive"; zonaReloj.style.animation = "parpadeo 1s infinite"; 
            document.querySelector('#cupon-modal .modal-content').appendChild(zonaReloj);
        }
        clearInterval(intervaloRelojCupon);
        intervaloRelojCupon = setInterval(() => { zonaReloj.innerText = "⏳ HORA REAL: " + new Date().toLocaleTimeString(); }, 1000);
    }

    function mostrarNotificacion(texto) {
        let vieja = document.getElementById('noti-juego'); if (vieja) vieja.remove(); 
        const noti = document.createElement('div'); noti.id = 'noti-juego'; noti.innerText = texto;
        noti.style.position = 'fixed'; noti.style.top = '20px'; noti.style.left = '50%'; noti.style.transform = 'translateX(-50%)'; noti.style.background = '#ff0055'; noti.style.color = 'white'; noti.style.padding = '12px 24px'; noti.style.borderRadius = '8px'; noti.style.zIndex = '999999'; noti.style.fontWeight = 'bold'; noti.style.fontFamily = "'Press Start 2P', cursive"; noti.style.fontSize = '10px'; noti.style.textAlign = 'center'; noti.style.border = '2px solid white'; noti.style.pointerEvents = 'none'; 
        document.body.appendChild(noti); setTimeout(() => { if (noti.parentNode) noti.remove(); }, 2500);
    }

    function comprobarGanadorGoldenTicket() {
        if (estadisticasLogros.intentoTicketDorado || !db) return;
        const docRef = db.collection("control_barra").doc("tickets_dorados");

        db.runTransaction((transaction) => {
            return transaction.get(docRef).then((doc) => {
                let entregados = 0; if (doc.exists && doc.data().entregados !== undefined) entregados = doc.data().entregados; 
                if (entregados < 5) { const puesto = entregados + 1; transaction.set(docRef, { entregados: puesto }, { merge: true }); return puesto; } 
                else return false; 
            });
        }).then((puesto) => {
            estadisticasLogros.intentoTicketDorado = true; guardarPartida();
            if (puesto !== false) {
                if (puesto <= 3) { mostrarNotificacion(`🎟️ ¡QUEDASTE #${puesto}! HAS GANADO UN CUBATA`); entregarPremioFisico(`🎟️ TICKET DORADO (${puesto}º PUESTO): ¡UN CUBATA EN BARRA!`); } 
                else { mostrarNotificacion(`🎟️ ¡QUEDASTE #${puesto}! HAS GANADO UN CHUPITO`); entregarPremioFisico(`🎟️ TICKET DORADO (${puesto}º PUESTO): ¡UN CHUPITO EN BARRA!`); }
            } else mostrarNotificacion("😢 Te has pasado el juego, ¡pero los 5 premios ya se agotaron!");
        }).catch(() => {});
    }

    function sincronizarStockGlobal() {
        if (!db) return;
        const hoy = obtenerDiaDeFiesta();
        db.collection("control_barra").doc(hoy).onSnapshot((doc) => {
            if (doc.exists) {
                const data = doc.data();
                stockChupitosHoy = data.chupitos !== undefined ? data.chupitos : LIMITE_DIARIO_CHUPITOS;
                stockCubatasHoy = data.cubatas !== undefined ? data.cubatas : LIMITE_DIARIO_CUBATAS;
            } else {
                stockChupitosHoy = LIMITE_DIARIO_CHUPITOS; stockCubatasHoy = LIMITE_DIARIO_CUBATAS;
                db.collection("control_barra").doc(hoy).set({ chupitos: LIMITE_DIARIO_CHUPITOS, cubatas: LIMITE_DIARIO_CUBATAS });
            }
            const visualChupis = document.getElementById('stock-visual-chupitos'); const visualCubas = document.getElementById('stock-visual-cubatas');
            if (visualChupis) visualChupis.innerText = stockChupitosHoy; if (visualCubas) visualCubas.innerText = stockCubatasHoy;
        }, () => {});
    }

    // ==========================================================================
    // 🚀 ARRANQUE OFICIAL (Bloqueo de menú solucionado)
    // ==========================================================================
    cargarPartida(); 
    
    // Si ya leyeron el manual, arrancamos, si no, se queda en pause
    if (localStorage.getItem('juergaReglas2026') === 'true') {
        reanudarJuego();
    } else {
        juegoPausado = true;
    }
    
    intervalGuardado = setInterval(guardarPartida, 3000);

    // ==========================================================================
    // 🌐 EXPORTACIÓN DE FUNCIONES (Para que el HTML pueda pulsarlas)
    // ==========================================================================
    window.abrirTienda = abrirTienda;
    window.abrirCasino = abrirCasino;
    window.abrirMenuPrincipal = abrirMenuPrincipal;
    window.cerrarModales = cerrarModales;
    window.comprarVelocidad = comprarVelocidad;
    window.comprarEvento = comprarEvento;
    window.comprarPasivo = comprarPasivo;
    window.comprarLimpieza = comprarLimpieza;
    window.boostBajoRefresco = boostBajoRefresco;
    window.boostBajoTapa = boostBajoTapa;
    window.boostMedioCharanga = boostMedioCharanga;
    window.boostMedioBarril = boostMedioBarril;
    window.comprarHoraLoca = comprarHoraLoca;
    window.comprarAmnesia = comprarAmnesia;
    window.comprarAutobus = comprarAutobus;
    window.boostExtremoChupinazo = boostExtremoChupinazo;
    window.boostExtremoBarraLibre = boostExtremoBarraLibre;
    window.abrirWalkout = abrirWalkout;
    window.cerrarWalkout = cerrarWalkout;
    window.verificarPagoCasino = verificarPagoCasino;
    window.abrirPanelCamarero = abrirPanelCamarero;
    window.cambiarNombre = cambiarNombre;
    window.borrarPartida = borrarPartida;
    window.abrirJuerguistas = abrirJuerguistas;
    window.abrirRanking = abrirRanking;
    window.abrirLogros = abrirLogros;
    window.abrirMenuDiario = abrirMenuDiario;
    window.abrirInventarioCupones = abrirInventarioCupones;
    window.abrirOpciones = abrirOpciones;
    window.reclamarPremio = reclamarPremio;
    window.volverAlMenu = volverAlMenu;
    window.toggleVIPRoom = toggleVIPRoom;
    window.cambiarTab = cambiarTab;
    window.comprarPersonaje = comprarPersonaje;
    window.verCuponParaQuemar = verCuponParaQuemar;
    window.quemarCupon = quemarCupon;
    window.cerrarCupon = cerrarCupon;
    window.abrirManualDirecto = abrirManualDirecto;
    window.aceptarReglas = aceptarReglas; 
})();