// ===============================================
// === 1. CONFIGURACIÓN GLOBAL (DECLARACIÓN ÚNICA)
// ===============================================

// URL base de tu backend Spring Boot (PROXY API)
const BASE_API_URL = 'http://localhost:8080/api';

// ===============================================
// === 2. LÓGICA DE AUTENTICACIÓN Y ADMIN
// ===============================================

// --- FUNCIONES DE AUTENTICACIÓN ---

function getJwtToken() {
    return localStorage.getItem('jwtToken');
}

function checkAdminAccess() {
    // Si no es la página de login y no hay token, redirigir al login
    if (!window.location.pathname.includes('admin_login.html') && !getJwtToken()) {
        window.location.href = '../premieradmin/admin_login.html'; // Ajustar ruta
        return false;
    }
    return true;
}

function handleLogin(username, password) {
    const loginUrl = `${BASE_API_URL}/auth/login`;

    $.ajax({
        url: loginUrl,
        method: 'POST',
        contentType: 'application/json',
        data: JSON.stringify({ username: username, password: password }),
        success: function(response) {
            // Guardar el token y el rol
            localStorage.setItem('jwtToken', response.token);
            localStorage.setItem('userRole', response.role);

            $('#login-mensaje').text('Login exitoso. Redirigiendo...');
            
            // Redirigir al dashboard si el login es exitoso
            window.location.href = '../premieradmin/admin_dashboard.html'; 
        },
        error: function(xhr) {
            let errorMsg = 'Error al iniciar sesión. Credenciales incorrectas o servidor no disponible.';
            if (xhr.responseJSON && xhr.responseJSON.message) {
                errorMsg = xhr.responseJSON.message;
            } else if (xhr.status === 401) {
                errorMsg = 'Usuario o contraseña inválida.';
            }
            $('#login-mensaje').text(errorMsg).addClass('error');
        }
    });
}

function handleLogout() {
    localStorage.removeItem('jwtToken');
    localStorage.removeItem('userRole');
    alert('Sesión cerrada.');
    // Redirigir al login del admin (asumiendo que solo se hace logout desde el admin)
    window.location.href = '../premieradmin/admin_login.html';
}

// --- FUNCIONES DEL PANEL ADMIN ---

function loadAdminUsers() {
    const usersUrl = `${BASE_API_URL}/admin/usuarios`;
    const token = getJwtToken();

    $.ajax({
        url: usersUrl,
        method: 'GET',
        headers: {
            'Authorization': 'Bearer ' + token 
        },
        success: function(users) {
            const $tableBody = $('#usuarios-table-body');
            $tableBody.empty();
            
            users.forEach(user => {
                const row = `
                    <tr>
                        <td>${user.idUsuario}</td>
                        <td>${user.nombreUsuario}</td>
                        <td><td>${user.email}</td>
                        <td>${user.rol.nombre.replace("ROLE_", "")}</td> 
                        <td>${new Date(user.fechaRegistro).toLocaleDateString()}</td>
                        <td>
                            <button class="btn-accion btn-bloquear" data-id="${user.idUsuario}">Bloquear</button>
                            <button class="btn-accion btn-eliminar" data-id="${user.idUsuario}">Eliminar</button>
                        </td>
                    </tr>
                `;
                $tableBody.append(row);
            });
        },
        error: function(xhr) {
            if (xhr.status === 403) {
                $('#usuarios-table-body').html('<tr><td colspan="6">Acceso Denegado. Se requiere ser Administrador.</td></tr>');
            } else {
                $('#usuarios-table-body').html('<tr><td colspan="6">Error al cargar datos.</td></tr>');
            }
        }
    });
}


// ===============================================
// === 3. LÓGICA DE CARGA DE DATOS DE LA API (PROXY)
// ===============================================

// --- Utilerías de Acceso a la API Externa ---

/**
 * Función genérica para hacer peticiones GET a tu API Proxy
 */
function fetchPremierData(endpoint) {
    const url = `${BASE_API_URL}${endpoint}`;
    return $.ajax({
        url: url,
        method: 'GET',
        dataType: 'json',
    });
}

// --- Funciones de Renderizado por Vista ---

// 1. Vista: tabla.html (Clasificación)
function cargarTablaPosiciones() {
    const $tablaCuerpo = $('#tabla-posiciones-body');
    $tablaCuerpo.html('<tr><td colspan="10">Cargando tabla de posiciones...</td></tr>');

    // Endpoint: /api/datos-deportivos/clasificacion
    fetchPremierData('/datos-deportivos/clasificacion')
        .then(data => {
            $tablaCuerpo.empty();
            
            // Asumiendo la estructura JSON común de la API-Football
            const standings = data.response[0].league.standings[0];

            standings.forEach(equipo => {
                const fila = `
                    <tr>
                        <td>${equipo.rank}</td>
                        <td class="equipo-nombre">
                            <img src="${equipo.team.logo}" alt="Escudo ${equipo.team.name}">
                            <p>${equipo.team.name}</p>
                        </td>
                        <td>${equipo.points}</td>
                        <td>${equipo.all.played}</td>
                        <td>${equipo.all.win}</td>
                        <td>${equipo.all.draw}</td>
                        <td>${equipo.all.lose}</td>
                        <td>${equipo.all.goals.for}</td>
                        <td>${equipo.all.goals.against}</td>
                        <td>${equipo.goalsDiff}</td>
                    </tr>
                `;
                $tablaCuerpo.append(fila);
            });
        })
        .catch(error => {
            console.error('Error al cargar la clasificación:', error);
            $tablaCuerpo.html('<tr><td colspan="10">Error al cargar datos. Verifica la API Key y el Backend.</td></tr>');
        });
}


// 2. Vista: jornadas.html (Próximos Partidos)
function cargarPartidosJornada(jornadaNumero) {
    // Ajusta este ID en tu jornadas.html si es necesario
    const $contenedorResultados = $('#contenedor-partidos-dinamico'); 
    $contenedorResultados.html('<p style="color:white; text-align:center;">Cargando partidos de la Jornada ' + jornadaNumero + '...</p>');
    
    const roundApi = 'Matchday ' + jornadaNumero; 

    // Endpoint: /api/datos-deportivos/jornadas/{round}
    fetchPremierData('/datos-deportivos/jornadas/' + encodeURIComponent(roundApi))
        .then(data => {
            $contenedorResultados.empty();
            const partidos = data.response; 
            
            if (partidos.length === 0) {
                 $contenedorResultados.html('<p style="color:white; text-align:center;">No hay partidos programados para esta jornada.</p>');
                 return;
            }

            const partidosPorDia = partidos.reduce((acc, partido) => {
                const fecha = new Date(partido.fixture.date);
                // Formato local del día: "lunes, 2 de diciembre"
                const diaSemana = fecha.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' });
                if (!acc[diaSemana]) acc[diaSemana] = [];
                acc[diaSemana].push(partido);
                return acc;
            }, {});

            for (const dia in partidosPorDia) {
                // Título del día (ej: Sábado, 18 de octubre)
                $contenedorResultados.append(`<h3 style="text-align: center;">${dia.charAt(0).toUpperCase() + dia.slice(1)}</h3>`); 
                const $diaContenedor = $('<div class="contenedor-resultados"></div>');
                
                partidosPorDia[dia].forEach(partido => {
                    const hora = new Date(partido.fixture.date).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
                    
                    const tarjetaPartido = `
                        <div class="partido">
                            <div class="info-partido"><p>${partido.fixture.date.substring(0, 10)} - ${hora}</p></div>
                            <div class="equipo">
                                <img src="${partido.teams.home.logo}" alt="Escudo Local">
                                <p>${partido.teams.home.name}</p>
                                <p class="goles">vs</p>
                            </div>
                            <div class="equipo">
                                <img src="${partido.teams.away.logo}" alt="Escudo Visitante">
                                <p>${partido.teams.away.name}</p>
                                <p class="goles"></p>
                            </div>
                        </div>
                    `;
                    $diaContenedor.append(tarjetaPartido);
                });
                $contenedorResultados.append($diaContenedor);
            }
        })
        .catch(error => {
            console.error('Error al cargar partidos:', error);
            $contenedorResultados.html('<p style="color:white; text-align:center;">Error al obtener los datos de partidos.</p>');
        });
}


// 3. Vista: estadisticas.html (Goleadores)
function cargarEstadisticas() {
    const $tablaGoleadores = $('#tabla-goleadores-body');
    $tablaGoleadores.html('<tr><td colspan="4">Cargando estadísticas de goleadores...</td></tr>');

    // Endpoint: /api/datos-deportivos/estadisticas/goleadores
    fetchPremierData('/datos-deportivos/estadisticas/goleadores')
        .then(data => {
            $tablaGoleadores.empty();
            const jugadores = data.response; 

            jugadores.slice(0, 10).forEach((item, index) => { 
                const jugador = item.player;
                // La API-Football usa 'statistics' como array; asumimos que [0] es el de la Premier League
                const stats = item.statistics[0]; 

                const fila = `
                    <tr>
                        <td>${index + 1}</td>
                        <td>${jugador.name}</td>
                        <td class="equipo-nombre">
                            <img src="${stats.team.logo}" alt="Escudo ${stats.team.name}">
                            <p>${stats.team.name}</p>
                        </td>
                        <td>${stats.goals.total || 0}</td>
                    </tr>
                `;
                $tablaGoleadores.append(fila);
            });
            
            // Si necesitas cargar las asistencias, duplicas esta lógica con el endpoint y tbody correcto.
        })
        .catch(error => {
            console.error('Error al cargar estadísticas:', error);
            $tablaGoleadores.html('<tr><td colspan="4">Error al cargar datos.</td></tr>');
        });
}


// ===============================================
// === 4. INICIALIZACIÓN DE LA APLICACIÓN (DOCUMENT READY FINAL)
// ===============================================

$(document).ready(function() {
    // --- Inicialización de Lógica de Admin/Auth ---
    const currentPath = window.location.pathname;

    // A. Manejar el envío del formulario de Login (Solo si estamos en la página de Login)
    if (currentPath.includes('admin_login.html')) {
        $('#login-form').on('submit', function(e) {
            e.preventDefault();
            const username = $('#username').val();
            const password = $('#password').val();
            handleLogin(username, password);
        });
    }

    // B. Lógica para el Panel de Administración (requiere token)
    if (currentPath.includes('admin_dashboard.html')) {
        $('#logout-btn').on('click', function(e) {
            e.preventDefault();
            handleLogout();
        });
        if (checkAdminAccess()) {
            loadAdminUsers();
        }
    }
    
    // --- Inicialización de Carga de Datos Deportivos (Usuario) ---
    if (currentPath.includes('tabla.html')) {
        cargarTablaPosiciones();
    }
    
    if (currentPath.includes('jornadas.html')) {
        // Carga la próxima jornada (debes ajustar este número si es necesario)
        cargarPartidosJornada(8); 
    }
    
    if (currentPath.includes('estadisticas.html')) {
        cargarEstadisticas();
    }


    // --- Lógica de JQuery y Efectos Originales (Consolidada) ---
    
    // Menú de navegación móvil
    $('.mobile-menu a').on('click', function(e) {
        e.preventDefault();
        $('nav.navegacion-principal').slideToggle();
    });

    // Agregar campo de búsqueda a las tablas
    $('.tabla-contenedor').each(function() {
        let $tabla = $(this);
        let $busquedaContainer = $('<div class="contenedor-busqueda"></div>');
        let $busqueda = $('<input type="text" class="campo-busqueda" placeholder="Buscar equipo...">');
        let $resultado = $('<div class="resultado-busqueda"></div>');
        let typingTimer;
        
        $busquedaContainer.insertBefore($tabla);
        $busquedaContainer.append($busqueda);
        $busquedaContainer.append($resultado);

        // Función para animar las filas
        function animateRows($rows, shouldShow) {
            $rows.each(function(index) {
                let $row = $(this);
                $row.removeClass('filtered-in filtered-out');
                
                setTimeout(() => {
                    if (shouldShow) {
                        $row.addClass('filtered-in').show();
                    } else {
                        $row.addClass('filtered-out');
                        setTimeout(() => $row.hide(), 300);
                    }
                }, index * 50);
            });
        }

        // Resaltar coincidencias
        function highlightMatches($row, searchText) {
            if (searchText.length > 0) {
                $row.addClass('highlight-row');
                setTimeout(() => {
                    $row.removeClass('highlight-row');
                }, 1000);
            }
        }

        $busqueda.on('keyup', function() {
            clearTimeout(typingTimer);
            let searchText = $(this).val().toLowerCase();
            
            typingTimer = setTimeout(function() {
                // NOTA: Esta función de búsqueda solo funcionará para las filas ya cargadas.
                // Si la tabla se carga dinámicamente con AJAX, asegúrate de llamarla después de que la AJAX termine.
                let totalFilas = $tabla.find('tbody tr').length;
                let filasOcultas = 0;
                let $filasAMostrar = $();
                let $filasAOcultar = $();
                
                $tabla.find('tbody tr').each(function() {
                    let $row = $(this);
                    let texto = $row.text().toLowerCase();
                    
                    if (texto.indexOf(searchText) === -1) {
                        $filasAOcultar = $filasAOcultar.add($row);
                        filasOcultas++;
                    } else {
                        $filasAMostrar = $filasAMostrar.add($row);
                        highlightMatches($row, searchText);
                    }
                });

                animateRows($filasAOcultar, false);
                animateRows($filasAMostrar, true);

                let filasVisibles = totalFilas - filasOcultas;
                $resultado.removeClass('show');
                
                if (searchText.length > 0) {
                    setTimeout(() => {
                        $resultado
                            .text(`Mostrando ${filasVisibles} de ${totalFilas} equipos`)
                            .addClass('show')
                            .fadeIn();
                    }, 100);
                } else {
                    $resultado.fadeOut();
                }
            }, 200);
        });
    });

    // Efecto hover en las filas de las tablas
    $('.tabla-contenedor tbody').on('mouseenter', 'tr', function() {
        $(this).addClass('fila-hover');
    }).on('mouseleave', 'tr', function() {
        $(this).removeClass('fila-hover');
    });

    // Animación de entrada para las tarjetas de partido
    // NOTA: Esto debe llamarse DENTRO de la función AJAX de carga (cargarPartidosJornada)
    
    // Efecto de zoom suave en los escudos de equipos
    $(document).on('mouseenter', '.equipo img', function() {
        $(this).stop().animate({ transform: 'scale(1.2)' }, 200);
    }).on('mouseleave', '.equipo img', function() {
        $(this).stop().animate({ transform: 'scale(1)' }, 200);
    });

    // Animación para las noticias en la página principal
    $('.noticia-card').hover(
        function() {
            $(this).find('.contenido-noticia').slideDown(300);
        },
        function() {
            $(this).find('.contenido-noticia').slideUp(300);
        }
    );

    // Botón "Volver arriba" que aparece al hacer scroll
    $(window).scroll(function() {
        // ... (Tu código de botón Volver Arriba) ...
        if ($(this).scrollTop() > 300) {
            if (!$('#boton-arriba').length) {
                $('body').append('<button id="boton-arriba">↑</button>');
                $('#boton-arriba').css({
                    position: 'fixed',
                    bottom: '20px',
                    right: '20px',
                    padding: '10px 15px',
                    background: '#1a0033',
                    color: 'white',
                    border: 'none',
                    borderRadius: '5px',
                    cursor: 'pointer',
                    display: 'none'
                }).fadeIn();
            }
            $('#boton-arriba').fadeIn();
        } else {
            $('#boton-arriba').fadeOut();
        }
    });

    $(document).on('click', '#boton-arriba', function() {
        $('html, body').animate({ scrollTop: 0 }, 800);
    });

    // Contador de goles animado en la tabla de estadísticas
    $('.tabla-contenedor td:last-child').each(function() {
        // ... (Tu código de contador) ...
        let $this = $(this);
        let numero = parseInt($this.text());
        if (!isNaN(numero)) {
            $this.prop('Counter', 0).animate({
                Counter: numero
            }, {
                duration: 2000,
                step: function(now) {
                    $this.text(Math.ceil(now));
                }
            });
        }
    });

    // Efecto de resaltado para los resultados de partidos
    $('.goles').each(function() {
        // ... (Tu código de resaltado de goles) ...
        let goles = parseInt($(this).text());
        if (goles > 2) {
            $(this).addClass('muchos-goles').fadeIn(400);
        }
    });

    // Tooltip personalizado para los equipos
    $(document).on('mouseenter', '.equipo', function() {
        // ... (Tu código de tooltip) ...
        let equipoNombre = $(this).find('p').text();
        let tooltip = $('<div class="tooltip">' + equipoNombre + '</div>');
        $(this).append(tooltip);
        tooltip.fadeIn(200);
    }).on('mouseleave', '.equipo', function() {
        $(this).find('.tooltip').remove();
    });

    // Efecto para la fecha de los partidos
    $('.info-partido p').each(function() {
        // ... (Tu código de efecto de fecha) ...
        $(this).hover(
            function() {
                $(this).stop().animate({ fontSize: '1.8rem' }, 200);
            },
            function() {
                $(this).stop().animate({ fontSize: '1.6rem' }, 200);
            }
        );
    });
});