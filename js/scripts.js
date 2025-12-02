$(document).ready(function(){
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
                // Remover clases anteriores
                $row.removeClass('filtered-in filtered-out');
                
                setTimeout(() => {
                    if (shouldShow) {
                        $row.addClass('filtered-in').show();
                    } else {
                        $row.addClass('filtered-out');
                        setTimeout(() => $row.hide(), 300);
                    }
                }, index * 50); // Efecto cascada
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
            
            // Esperar a que el usuario deje de escribir
            typingTimer = setTimeout(function() {
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

                // Animar las filas
                animateRows($filasAOcultar, false);
                animateRows($filasAMostrar, true);

                // Actualizar mensaje de resultados con animación
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
            }, 200); // Esperar 200ms después de que el usuario deje de escribir
        });
    });

    // Efecto hover en las filas de las tablas
    $('.tabla-contenedor tbody tr').on('mouseenter', function() {
        $(this).addClass('fila-hover');
    }).on('mouseleave', function() {
        $(this).removeClass('fila-hover');
    });

    // Animación de entrada para las tarjetas de partido
    if ($('.partido').length > 0) {
        $('.partido').each(function(index) {
            $(this).delay(150 * index).fadeIn(400);
        });
    }

    // Efecto de zoom suave en los escudos de equipos
    $('.equipo img').hover(
        function() {
            $(this).stop().animate({ transform: 'scale(1.2)' }, 200);
        },
        function() {
            $(this).stop().animate({ transform: 'scale(1)' }, 200);
        }
    );

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
        let goles = parseInt($(this).text());
        if (goles > 2) {
            $(this).addClass('muchos-goles').fadeIn(400);
        }
    });

    // Tooltip personalizado para los equipos
    $('.equipo').hover(
        function() {
            let equipoNombre = $(this).find('p').text();
            let tooltip = $('<div class="tooltip">' + equipoNombre + '</div>');
            $(this).append(tooltip);
            tooltip.fadeIn(200);
        },
        function() {
            $(this).find('.tooltip').remove();
        }
    );

    // Efecto para la fecha de los partidos
    $('.info-partido p').each(function() {
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


// parte js admin

// URLs base de tu backend Spring Boot
const BASE_API_URL = 'http://localhost:8080/api';

// --- FUNCIONES DE AUTENTICACIÓN ---

function getJwtToken() {
    return localStorage.getItem('jwtToken');
}

function isAdmin() {
    // Implementación simple: verificar si el token existe
    // En una aplicación real, se decodificaría el token para verificar el rol.
    return getJwtToken() !== null; 
}

function handleLogin(username, password) {
    const loginUrl = `${BASE_API_URL}/auth/login`; // Endpoint que tú crearás en Spring Boot

    $.ajax({
        url: loginUrl,
        method: 'POST',
        contentType: 'application/json',
        data: JSON.stringify({ username: username, password: password }),
        success: function(response) {
            // Suponemos que la respuesta JSON contiene { token: 'JWT_TOKEN' }
            localStorage.setItem('jwtToken', response.token);
            $('#login-mensaje').text('Login exitoso. Redirigiendo...');
            
            // Redirigir al panel de administración si el login es exitoso
            window.location.href = 'admin_dashboard.html'; 
        },
        error: function(xhr) {
            let errorMsg = 'Error al iniciar sesión. Credenciales incorrectas.';
            if (xhr.responseJSON && xhr.responseJSON.message) {
                 errorMsg = xhr.responseJSON.message;
            }
            $('#login-mensaje').text(errorMsg).addClass('error');
        }
    });
}

function handleLogout() {
    localStorage.removeItem('jwtToken');
    alert('Sesión cerrada.');
    window.location.href = 'admin_login.html';
}

// --- FUNCIONES DEL PANEL ADMIN ---

function checkAdminAccess() {
    // Si no es la página de login y no hay token, redirigir al login
    if (!window.location.pathname.includes('admin_login.html') && !getJwtToken()) {
        window.location.href = 'admin_login.html';
        return false;
    }
    return true;
}

function loadAdminUsers() {
    const usersUrl = `${BASE_API_URL}/admin/usuarios`; // Endpoint protegido en Spring Boot
    const token = getJwtToken();

    $.ajax({
        url: usersUrl,
        method: 'GET',
        headers: {
            'Authorization': 'Bearer ' + token 
        },
        success: function(users) {
            const tableBody = $('#usuarios-table-body');
            tableBody.empty();
            
            users.forEach(user => {
                const row = `
                    <tr>
                        <td>${user.idUsuario}</td>
                        <td>${user.nombreUsuario}</td>
                        <td>${user.email}</td>
                        <td>${user.rolNombre}</td> 
                        <td>${new Date(user.fechaRegistro).toLocaleDateString()}</td>
                        <td>
                            <button class="btn-accion btn-bloquear" data-id="${user.idUsuario}">Bloquear</button>
                            <button class="btn-accion btn-eliminar" data-id="${user.idUsuario}">Eliminar</button>
                        </td>
                    </tr>
                `;
                tableBody.append(row);
            });
        },
        error: function(xhr) {
            if (xhr.status === 403) {
                $('#usuarios-table-body').html('<tr><td colspan="6">Acceso Denegado. Se requiere ROLE_ADMIN.</td></tr>');
            } else {
                $('#usuarios-table-body').html('<tr><td colspan="6">Error al cargar datos.</td></tr>');
            }
            // Si hay un error, puede ser un token caducado -> forzar logout
            // if (xhr.status === 401) handleLogout(); 
        }
    });
}


// --- LÓGICA DE INICIO DE DOCUMENTO ---

$(document).ready(function() {
    // 1. Manejar el envío del formulario de Login (Solo si estamos en la página de Login)
    $('#login-form').on('submit', function(e) {
        e.preventDefault();
        const username = $('#username').val();
        const password = $('#password').val();
        handleLogin(username, password);
    });

    // 2. Manejar el cierre de sesión (Logout)
    $('#logout-btn').on('click', function(e) {
        e.preventDefault();
        handleLogout();
    });

    // 3. Lógica para el Panel de Administración
    if (window.location.pathname.includes('admin_dashboard.html')) {
        if (checkAdminAccess()) {
            loadAdminUsers();
        }
    }

});