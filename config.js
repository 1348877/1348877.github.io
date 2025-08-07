
// Configuración de Supabase
// ⚠️ IMPORTANTE: Para desarrollo local, se usarán valores demo
// En producción, reemplaza estos valores con los de tu proyecto Supabase

const SUPABASE_CONFIG = {
    url: 'https://demo.supabase.co', // URL demo para desarrollo local
    anonKey: 'demo-anon-key', // Key demo para desarrollo local
    serviceRoleKey: 'demo-service-role-key' // Key demo para desarrollo local
};

// Configuración de Sentry para monitoreo de errores
const SENTRY_CONFIG = {
    // ✅ DSN real configurado
    dsn: 'https://db9dacf914f7fae45d7ba634f3ff0d70@o4509803229347840.ingest.us.sentry.io/4509803293376513',
    
    // Configuración del entorno
    environment: SUPABASE_CONFIG.url === 'https://demo.supabase.co' ? 'development' : 'production',
    
    // Configuración adicional
    tracesSampleRate: 1.0, // 100% de las transacciones
    beforeSend(event) {
        // Filtrar errores que no queremos enviar
        if (event.exception) {
            const error = event.exception.values[0];
            // No enviar errores de extensiones del navegador
            if (error.stacktrace && error.stacktrace.frames) {
                const isExtensionError = error.stacktrace.frames.some(frame => 
                    frame.filename && (
                        frame.filename.includes('extension://') ||
                        frame.filename.includes('chrome-extension://') ||
                        frame.filename.includes('moz-extension://')
                    )
                );
                if (isExtensionError) return null;
            }
        }
        return event;
    }
};

// Configuración de la aplicación
const APP_CONFIG = {
    // Credenciales para acceso admin (Super Usuario ya existe en la BD)
    adminPassword: 'admin123', // Contraseña para admin@senati.pe
    adminEmail: 'admin@senati.pe',
    
    // Credenciales para Super Admin
    superAdminPassword: 'superadmin123', // Contraseña para superadmin@senati.pe
    superAdminEmail: 'superadmin@senati.pe',
    
    // URLs del sistema (se evaluarán dinámicamente)
    getUrls: function() {
        const origin = window.location.origin;
        return {
            admin: origin + '/admin/',
            usuario: origin + '/usuario/'
        };
    },
    
    // Configuración de encuestas
    encuestas: {
        maxPreguntas: 50,
        maxAlternativas: 10,
        tituloMaxLength: 255,
        descripcionMaxLength: 1000
    }
};

// Inicializar cliente de Supabase
let supabase;

// Función para inicializar Sentry (compatible con Loader SDK)
function initializeSentry() {
    try {
        // Verificar si Sentry está disponible
        if (typeof Sentry !== 'undefined') {
            console.log('🚀 Detectado Sentry Loader SDK');
            
            // Para el Loader SDK, la configuración se hace con onLoad
            Sentry.onLoad(function() {
                console.log('✅ Sentry Loader SDK inicializado automáticamente');
                
                // Configuraciones adicionales que se pueden hacer después del load
                try {
                    // Configurar usuario inicial
                    if (Sentry.setUser) {
                        Sentry.setUser({
                            id: 'senati-user-' + Date.now(),
                            email: 'usuario@senati.pe'
                        });
                    }
                    
                    // Configurar tags globales
                    if (Sentry.setTag) {
                        Sentry.setTag('component', 'encuestas-senati');
                        Sentry.setTag('version', '2.0.0');
                        Sentry.setTag('platform', 'web');
                        Sentry.setTag('sdk_type', 'loader');
                    }
                    
                    // Configurar contexto inicial
                    if (Sentry.setContext) {
                        Sentry.setContext('application', {
                            name: 'Sistema de Encuestas SENATI',
                            version: '2.0.0',
                            environment: 'development',
                            initialized_at: new Date().toISOString(),
                            sdk_type: 'loader'
                        });
                    }
                    
                    console.log('✅ Sentry configurado completamente');
                    
                    // Enviar evento de inicialización
                    if (Sentry.captureMessage) {
                        Sentry.captureMessage('Sistema de Encuestas SENATI iniciado con Loader SDK', {
                            level: 'info',
                            tags: { event_type: 'system_start' }
                        });
                    }
                    
                } catch (error) {
                    console.error('⚠️ Error en configuración post-load:', error);
                }
            });
            
            return true;
        } else {
            console.warn('⚠️ Sentry SDK no está disponible');
            return false;
        }
    } catch (error) {
        console.error('❌ Error inicializando Sentry:', error);
        return false;
    }
}

// Función para capturar errores manualmente
function captureSentryError(error, context = {}) {
    if (typeof Sentry !== 'undefined' && Sentry.captureException) {
        console.log('📡 Enviando error a Sentry:', error.message);
        
        Sentry.withScope((scope) => {
            // Agregar contexto adicional
            Object.keys(context).forEach(key => {
                scope.setExtra(key, context[key]);
            });
            
            // Agregar información del navegador
            scope.setExtra('user_agent', navigator.userAgent);
            scope.setExtra('url', window.location.href);
            scope.setExtra('timestamp', new Date().toISOString());
            
            // Capturar el error
            const eventId = Sentry.captureException(error);
            console.log('✅ Error enviado a Sentry con ID:', eventId);
            return eventId;
        });
        
    } else {
        console.log('⚠️ Sentry no disponible, error loggeado localmente:', error);
    }
}

// Función para capturar eventos personalizados
function captureSentryMessage(message, level = 'info', extra = {}) {
    if (typeof Sentry !== 'undefined' && Sentry.captureMessage) {
        console.log(`📡 Enviando mensaje a Sentry (${level}): ${message}`);
        
        const eventId = Sentry.withScope((scope) => {
            scope.setLevel(level);
            
            // Agregar información extra
            Object.keys(extra).forEach(key => {
                scope.setExtra(key, extra[key]);
            });
            
            // Agregar contexto automático
            scope.setExtra('timestamp', new Date().toISOString());
            scope.setExtra('user_agent', navigator.userAgent);
            scope.setExtra('page_url', window.location.href);
            
            return Sentry.captureMessage(message);
        });
        
        console.log('✅ Mensaje enviado a Sentry con ID:', eventId);
        return eventId;
        
    } else {
        console.log('⚠️ Sentry no disponible, mensaje loggeado localmente:', message);
    }
}

// Función para configurar usuario en Sentry
function setSentryUser(userData) {
    if (typeof Sentry !== 'undefined' && Sentry.setUser) {
        Sentry.setUser(userData);
        console.log('👤 Usuario configurado en Sentry:', userData.id || userData.email);
    }
}

// Función para inicializar Supabase (llamar al cargar la página)
function initializeSupabase() {
    // Para desarrollo local, simulamos Supabase
    if (SUPABASE_CONFIG.url === 'https://demo.supabase.co') {
        console.log('🔧 Modo desarrollo local - Supabase simulado');
        // Crear un objeto mock de Supabase para desarrollo local
        supabase = {
            auth: {
                signInWithPassword: async () => ({ data: { user: { email: 'demo' } }, error: null }),
                signOut: async () => ({ error: null }),
                getSession: async () => ({ data: { session: null }, error: null })
            },
            from: (table) => {
                // Sistema de almacenamiento temporal usando localStorage
                const getStoredData = (tableName) => {
                    try {
                        const stored = localStorage.getItem(`mock_${tableName}`);
                        return stored ? JSON.parse(stored) : null;
                    } catch (e) {
                        return null;
                    }
                };
                
                const setStoredData = (tableName, data) => {
                    try {
                        localStorage.setItem(`mock_${tableName}`, JSON.stringify(data));
                    } catch (e) {
                        console.warn('No se pudo guardar en localStorage:', e);
                    }
                };
                
                // Datos mock iniciales para diferentes tablas
                const getDefaultMockData = () => ({
                    encuestas: [],
                    preguntas: [],
                    alternativas: [],
                    respuestas: [],
                    admin: [
                        { 
                            id_admin: 1, 
                            nombre: 'Admin SENATI', 
                            correo: 'admin@senati.pe', 
                            contraseña: 'admin123',
                            rol: 'admin_general',
                            id_super_admin: 1,
                            created_at: new Date().toISOString()
                        }
                    ],
                    super_su: [
                        {
                            id_super: 1,
                            nombre: 'Super Administrador',
                            correo: 'superadmin@senati.pe',
                            contraseña: 'superadmin123',
                            created_at: new Date().toISOString()
                        }
                    ],
                    alumnos: [
                        { 
                            id_alumno: 1, 
                            nombre: 'Estudiante Demo', 
                            correo: 'estudiante@senati.pe',
                            genero: 'Masculino',
                            carrera: 'Computación e Informática',
                            created_at: new Date().toISOString()
                        }
                    ],
                    solicitudes_admin: [
                        // Tabla para almacenar solicitudes de registro pendientes
                        // Campos: id_solicitud, nombre, correo, contraseña, estado, fecha_solicitud, fecha_respuesta, id_super_admin
                    ]
                });
                
                // Inicializar datos si no existen
                let mockData = getStoredData(table);
                if (!mockData) {
                    const defaultData = getDefaultMockData();
                    mockData = defaultData[table] || [];
                    setStoredData(table, mockData);
                }
                
                // Asegurar que siempre tenemos datos del Super Usuario
                if (table === 'super_su' && mockData.length === 0) {
                    const superUserData = [{
                        id_super_su: 0, // ID único para Super Usuario
                        nombre: 'Super Administrador',
                        correo: 'superadmin@senati.pe',
                        contraseña: 'superadmin123',
                        created_at: new Date().toISOString()
                    }];
                    setStoredData('super_su', superUserData);
                    mockData = superUserData;
                }
                
                // Asegurar que siempre tenemos datos del Admin demo
                if (table === 'admin' && mockData.length === 0) {
                    const adminData = [{
                        id_admin: 1, // ID único para Admin normal
                        nombre: 'Admin SENATI',
                        correo: 'admin@senati.pe',
                        contraseña: 'admin123',
                        rol: 'admin_general',
                        id_super_admin: 0, // Referencia al Super Usuario
                        created_at: new Date().toISOString()
                    }];
                    setStoredData('admin', adminData);
                    mockData = adminData;
                }
                
                console.log(`🔍 Mock query for table "${table}":`, mockData);
                
                // Si es tabla preguntas, mostrar detalles de filtrado
                if (table === 'preguntas') {
                    console.log('🔍 Detalle de preguntas:', mockData.map(p => ({
                        id_pregunta: p.id_pregunta,
                        id_encuesta: p.id_encuesta,
                        texto: p.texto
                    })));
                }
                
                // Crear un objeto que simule las consultas de Supabase
                const mockQuery = {
                    data: mockData || [],
                    error: null,
                    count: (mockData || []).length,
                    
                    // Métodos encadenados
                    select: function(columns, options) {
                        if (options && options.count === 'exact' && options.head === true) {
                            return {
                                count: this.count,
                                error: null
                            };
                        }
                        
                        // Almacenar la consulta select para procesarla después del filtrado
                        this._selectColumns = columns;
                        
                        return this;
                    },
                    eq: function(column, value) {
                        console.log(`🔍 Filtering ${table} WHERE ${column} = ${value} (type: ${typeof value})`);
                        console.log(`🔍 Datos antes del filtro:`, this.data.length, 'elementos');
                        
                        this.data = this.data.filter(item => {
                            const itemValue = item[column];
                            
                            // Conversión robusta de tipos para comparación
                            let normalizedItemValue = itemValue;
                            let normalizedValue = value;
                            
                            // Si ambos son números o pueden convertirse a números
                            if (!isNaN(itemValue) && !isNaN(value)) {
                                normalizedItemValue = Number(itemValue);
                                normalizedValue = Number(value);
                            }
                            // Si ambos son strings
                            else if (typeof itemValue === 'string' || typeof value === 'string') {
                                normalizedItemValue = String(itemValue);
                                normalizedValue = String(value);
                            }
                            
                            const matches = normalizedItemValue === normalizedValue;
                            console.log(`🔍 Item ${item.id_pregunta || item.id_encuesta || item.id}: ${column}=${itemValue} (${typeof itemValue}) === ${value} (${typeof value}) -> ${matches}`);
                            return matches;
                        });
                        
                        console.log(`🔍 Datos después del filtro:`, this.data.length, 'elementos');
                        
                        // AQUÍ procesamos el select con joins DESPUÉS del filtrado
                        if (this._selectColumns && this._selectColumns.includes('alternativas')) {
                            console.log('🔗 Procesando join con alternativas...');
                            const storedAlternativas = getStoredData('alternativas') || [];
                            
                            this.data = this.data.map(pregunta => {
                                const alternativasParaPregunta = storedAlternativas.filter(alt => 
                                    Number(alt.id_pregunta) === Number(pregunta.id_pregunta)
                                );
                                console.log(`🔗 Pregunta ${pregunta.id_pregunta} tiene ${alternativasParaPregunta.length} alternativas`);
                                
                                return {
                                    ...pregunta,
                                    alternativas: alternativasParaPregunta
                                };
                            });
                            
                            console.log('🔗 Join completado:', this.data);
                        }
                        
                        return this;
                    },
                    in: function(column, values) {
                        this.data = this.data.filter(item => values.includes(item[column]));
                        return this;
                    },
                    order: function(column, options) {
                        const ascending = !options || options.ascending !== false;
                        this.data = [...this.data].sort((a, b) => {
                            let aVal = a[column];
                            let bVal = b[column];
                            
                            // Handle dates
                            if (column.includes('fecha') || column.includes('created_at')) {
                                aVal = new Date(aVal);
                                bVal = new Date(bVal);
                            }
                            
                            if (ascending) {
                                return aVal > bVal ? 1 : -1;
                            } else {
                                return aVal < bVal ? 1 : -1;
                            }
                        });
                        return this;
                    },
                    limit: function(count) {
                        return this;
                    },
                    single: function() {
                        return {
                            data: this.data[0] || null,
                            error: this.data[0] ? null : { message: 'No encontrado' }
                        };
                    },
                    
                    // Métodos de modificación
                    insert: function(data) {
                        const currentData = getStoredData(table) || [];
                        
                        if (Array.isArray(data)) {
                            // Insertar múltiples elementos
                            const newItems = data.map(item => {
                                const id = currentData.length > 0 ? Math.max(...currentData.map(d => d[`id_${table.slice(0, -1)}`] || d.id || 0)) + 1 : 1;
                                return {
                                    [`id_${table.slice(0, -1)}`]: id,
                                    ...item,
                                    created_at: new Date().toISOString()
                                };
                            });
                            currentData.push(...newItems);
                            setStoredData(table, currentData);
                            
                            return {
                                data: newItems,
                                error: null,
                                select: () => ({
                                    single: () => ({ data: newItems[0], error: null })
                                })
                            };
                        } else {
                            // Insertar un solo elemento
                            let id;
                            
                            // Manejar IDs específicos para cada tabla
                            if (table === 'admin') {
                                id = currentData.length > 0 ? Math.max(...currentData.map(d => d.id_admin || 0)) + 1 : 1;
                            } else if (table === 'super_su') {
                                id = currentData.length > 0 ? Math.max(...currentData.map(d => d.id_super || 0)) + 1 : 1;
                            } else if (table === 'encuestas') {
                                id = currentData.length > 0 ? Math.max(...currentData.map(d => d.id_encuesta || 0)) + 1 : 1;
                            } else if (table === 'preguntas') {
                                id = currentData.length > 0 ? Math.max(...currentData.map(d => d.id_pregunta || 0)) + 1 : 1;
                            } else if (table === 'alternativas') {
                                id = currentData.length > 0 ? Math.max(...currentData.map(d => d.id_alternativa || 0)) + 1 : 1;
                            } else if (table === 'alumnos') {
                                id = currentData.length > 0 ? Math.max(...currentData.map(d => d.id_alumno || 0)) + 1 : 1;
                            } else {
                                id = currentData.length > 0 ? Math.max(...currentData.map(d => d.id || 0)) + 1 : 1;
                            }
                            
                            // Crear el nuevo item con el ID correcto
                            const newItem = {
                                ...data,
                                created_at: new Date().toISOString()
                            };
                            
                            // Asignar el ID con el nombre correcto
                            if (table === 'admin') {
                                newItem.id_admin = id;
                            } else if (table === 'super_su') {
                                newItem.id_super = id;
                            } else if (table === 'encuestas') {
                                newItem.id_encuesta = id;
                            } else if (table === 'preguntas') {
                                newItem.id_pregunta = id;
                            } else if (table === 'alternativas') {
                                newItem.id_alternativa = id;
                            } else if (table === 'alumnos') {
                                newItem.id_alumno = id;
                            } else {
                                newItem.id = id;
                            }
                            
                            currentData.push(newItem);
                            setStoredData(table, currentData);
                            
                            console.log(`✅ Insertado en ${table}:`, newItem);
                            
                            return {
                                data: [newItem],
                                error: null,
                                select: () => ({
                                    single: () => ({ data: newItem, error: null })
                                })
                            };
                        }
                    },
                    
                    update: function(data) {
                        return {
                            eq: function(column, value) {
                                const currentData = getStoredData(table) || [];
                                
                                // Encontrar el ítem con comparación robusta de tipos
                                const itemIndex = currentData.findIndex(item => {
                                    const itemValue = item[column];
                                    
                                    // Conversión robusta de tipos
                                    if (!isNaN(itemValue) && !isNaN(value)) {
                                        return Number(itemValue) === Number(value);
                                    }
                                    return String(itemValue) === String(value);
                                });
                                
                                if (itemIndex !== -1) {
                                    currentData[itemIndex] = { 
                                        ...currentData[itemIndex], 
                                        ...data,
                                        fecha_modificacion: new Date().toISOString()
                                    };
                                    setStoredData(table, currentData);
                                    
                                    console.log(`✅ Actualizado en ${table}:`, currentData[itemIndex]);
                                    
                                    return {
                                        data: [currentData[itemIndex]],
                                        error: null,
                                        select: () => ({
                                            single: () => ({ data: currentData[itemIndex], error: null })
                                        })
                                    };
                                }
                                
                                return {
                                    data: [],
                                    error: { message: 'No encontrado' }
                                };
                            }
                        };
                    },
                    
                    delete: function() {
                        return {
                            eq: function(column, value) {
                                const currentData = getStoredData(table) || [];
                                console.log(`🗑️ DELETE FROM ${table} WHERE ${column} = ${value}`);
                                console.log(`🗑️ Datos antes del delete:`, currentData);
                                
                                // Filtrar con comparación robusta de tipos
                                const filteredData = currentData.filter(item => {
                                    const itemValue = item[column];
                                    
                                    // Conversión robusta de tipos
                                    if (!isNaN(itemValue) && !isNaN(value)) {
                                        return Number(itemValue) !== Number(value);
                                    }
                                    return String(itemValue) !== String(value);
                                });
                                
                                console.log(`🗑️ Datos después del delete:`, filteredData);
                                setStoredData(table, filteredData);
                                
                                return {
                                    data: [],
                                    error: null
                                };
                            }
                        };
                    }
                };
                
                return mockQuery;
            }
        };
        return supabase;
    }
    
    if (typeof window !== 'undefined' && window.supabase) {
        supabase = window.supabase.createClient(
            SUPABASE_CONFIG.url,
            SUPABASE_CONFIG.anonKey
        );
        return supabase;
    } else {
        console.error('Supabase library not loaded. Make sure to include the Supabase script tag.');
        return null;
    }
}

// Función de utilidad para mostrar mensajes
function showMessage(message, type = 'info') {
    const messageContainer = document.getElementById('message-container') || document.body;
    const messageDiv = document.createElement('div');
    messageDiv.className = `message message-${type}`;
    messageDiv.textContent = message;
    
    messageContainer.appendChild(messageDiv);
    
    // Auto-remove después de 5 segundos
    setTimeout(() => {
        if (messageDiv.parentNode) {
            messageDiv.parentNode.removeChild(messageDiv);
        }
    }, 5000);
    
    // Enviar errores y warnings a Sentry
    if (type === 'error') {
        captureSentryMessage(`UI Error: ${message}`, 'error', {
            component: 'ui-message',
            timestamp: new Date().toISOString()
        });
    } else if (type === 'warning') {
        captureSentryMessage(`UI Warning: ${message}`, 'warning', {
            component: 'ui-message',
            timestamp: new Date().toISOString()
        });
    }
}

// Función para generar ID único para sesiones anónimas
function generateSessionId() {
    return 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

// Función para validar email
function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

// Función para formatear fecha
function formatDate(date) {
    if (!date) return '';
    const d = new Date(date);
    return d.toLocaleDateString('es-ES', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    });
}

// Función para formatear fecha y hora
function formatDateTime(datetime) {
    if (!datetime) return '';
    const d = new Date(datetime);
    return d.toLocaleString('es-ES', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
    });
}

// Función para depurar localStorage
function debugLocalStorage() {
    console.log('🔍 DEBUG: Contenido completo de localStorage:');
    console.log('📊 Encuestas:', JSON.parse(localStorage.getItem('mock_encuestas') || '[]'));
    console.log('❓ Preguntas:', JSON.parse(localStorage.getItem('mock_preguntas') || '[]'));
    console.log('🔘 Alternativas:', JSON.parse(localStorage.getItem('mock_alternativas') || '[]'));
    console.log('📝 Respuestas:', JSON.parse(localStorage.getItem('mock_respuestas') || '[]'));
}

// Función para limpiar datos demo del localStorage
function clearDemoData() {
    const tables = ['encuestas', 'preguntas', 'alternativas', 'respuestas'];
    tables.forEach(table => {
        localStorage.removeItem(`mock_${table}`);
    });
    console.log('🗑️ Datos demo limpiados del localStorage');
    window.location.reload();
}

// Función para limpiar completamente todos los datos y empezar fresh
function clearAllDataAndReset() {
    if (confirm('⚠️ ATENCIÓN: Esto eliminará TODOS los datos (encuestas, preguntas, respuestas). ¿Estás seguro?')) {
        console.log('🧹 Limpiando completamente todos los datos...');
        
        // Limpiar todas las tablas del mock
        const allTables = ['encuestas', 'preguntas', 'alternativas', 'respuestas', 'admin', 'alumnos'];
        allTables.forEach(table => {
            localStorage.removeItem(`mock_${table}`);
        });
        
        // Limpiar cualquier otra data relacionada
        const keysToRemove = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith('mock_')) {
                keysToRemove.push(key);
            }
        }
        
        keysToRemove.forEach(key => {
            localStorage.removeItem(key);
        });
        
        console.log('✅ Sistema completamente limpio y listo para datos reales');
        console.log('🔄 Recargando página...');
        
        alert('✅ ¡Sistema limpio! Ahora puedes crear tus encuestas reales.');
        window.location.reload();
    }
}

// Función para probar el sistema mock completo
async function testMockSystem() {
    console.log('🧪 INICIANDO PRUEBA COMPLETA DEL SISTEMA MOCK');
    console.log('='.repeat(50));
    
    try {
        // Limpiar datos previos
        ['encuestas', 'preguntas', 'alternativas'].forEach(table => {
            localStorage.removeItem(`mock_${table}`);
        });
        
        // Inicializar Supabase mock
        if (!window.supabase) {
            window.supabase = initializeSupabase();
        }
        
        console.log('📝 PASO 1: Crear encuesta de prueba');
        const { data: encuesta, error: encuestaError } = await supabase
            .from('encuestas')
            .insert({
                titulo: 'Encuesta de Prueba',
                descripcion: 'Esta es una prueba del sistema',
                activa: true
            })
            .select()
            .single();
            
        if (encuestaError) throw encuestaError;
        console.log('✅ Encuesta creada:', encuesta);
        
        console.log('❓ PASO 2: Crear preguntas de prueba');
        const preguntas = [
            {
                texto: '¿Cómo te llamas?',
                tipo_pregunta: 'open_text',
                orden_pregunta: 1,
                id_encuesta: encuesta.id_encuesta
            },
            {
                texto: '¿Cuál es tu edad?',
                tipo_pregunta: 'single_choice',
                orden_pregunta: 2,
                id_encuesta: encuesta.id_encuesta
            }
        ];
        
        for (const pregunta of preguntas) {
            const { data: savedQuestion, error: questionError } = await supabase
                .from('preguntas')
                .insert(pregunta)
                .select()
                .single();
                
            if (questionError) throw questionError;
            console.log('✅ Pregunta creada:', savedQuestion);
            
            // Si es de opción múltiple, agregar alternativas
            if (pregunta.tipo_pregunta === 'single_choice') {
                const alternativas = [
                    { texto_opcion: '18-25 años', orden_alternativa: 1, id_pregunta: savedQuestion.id_pregunta },
                    { texto_opcion: '26-35 años', orden_alternativa: 2, id_pregunta: savedQuestion.id_pregunta },
                    { texto_opcion: '36+ años', orden_alternativa: 3, id_pregunta: savedQuestion.id_pregunta }
                ];
                
                const { data: savedAlts, error: altError } = await supabase
                    .from('alternativas')
                    .insert(alternativas);
                    
                if (altError) throw altError;
                console.log('✅ Alternativas creadas para pregunta:', savedQuestion.id_pregunta);
            }
        }
        
        console.log('🔍 PASO 3: Probar consulta de edición (EL PROBLEMA PRINCIPAL)');
        
        // Esta es la consulta que falla en editEncuesta
        const { data: encuestaParaEditar, error: encuestaEditError } = await supabase
            .from('encuestas')
            .select('*')
            .eq('id_encuesta', encuesta.id_encuesta)  // Pasar como número
            .single();
            
        console.log('📊 Resultado consulta encuesta:', { encuestaParaEditar, encuestaEditError });
        
        // Consultar preguntas con alternativas
        const { data: preguntasParaEditar, error: preguntasEditError } = await supabase
            .from('preguntas')
            .select('*, alternativas (*)')
            .eq('id_encuesta', encuesta.id_encuesta)  // Pasar como número
            .order('orden_pregunta');
            
        console.log('❓ Resultado consulta preguntas:', { preguntasParaEditar, preguntasEditError });
        
        console.log('🔍 PASO 4: Probar con ID como string (simular onclick HTML)');
        
        // Simular el caso real donde viene del HTML como string
        const encuestaIdString = String(encuesta.id_encuesta);
        
        const { data: encuestaString, error: encuestaStringError } = await supabase
            .from('encuestas')
            .select('*')
            .eq('id_encuesta', encuestaIdString)  // Pasar como string
            .single();
            
        console.log('📊 Resultado con ID string:', { encuestaString, encuestaStringError });
        
        const { data: preguntasString, error: preguntasStringError } = await supabase
            .from('preguntas')
            .select('*, alternativas (*)')
            .eq('id_encuesta', encuestaIdString)  // Pasar como string
            .order('orden_pregunta');
            
        console.log('❓ Resultado preguntas con ID string:', { preguntasString, preguntasStringError });
        
        console.log('🎯 RESULTADO DE LA PRUEBA:');
        console.log('='.repeat(50));
        
        if (encuestaParaEditar && preguntasParaEditar && preguntasParaEditar.length > 0) {
            console.log('✅ PRUEBA CON ID NUMÉRICO: EXITOSA');
        } else {
            console.log('❌ PRUEBA CON ID NUMÉRICO: FALLÓ');
        }
        
        if (encuestaString && preguntasString && preguntasString.length > 0) {
            console.log('✅ PRUEBA CON ID STRING: EXITOSA');
        } else {
            console.log('❌ PRUEBA CON ID STRING: FALLÓ');
        }
        
        if (encuestaString && preguntasString && preguntasString.length > 0 && 
            encuestaParaEditar && preguntasParaEditar && preguntasParaEditar.length > 0) {
            console.log('🎉 ¡SISTEMA MOCK FUNCIONANDO CORRECTAMENTE!');
            console.log('🔧 El problema de edición de encuestas debería estar resuelto.');
        } else {
            console.log('⚠️ Aún hay problemas con el sistema mock.');
        }
        
    } catch (error) {
        console.error('❌ ERROR EN LA PRUEBA:', error);
    }
}

// Exportar configuración para uso global
window.SENTRY_CONFIG = SENTRY_CONFIG;
window.SUPABASE_CONFIG = SUPABASE_CONFIG;
window.APP_CONFIG = APP_CONFIG;
window.initializeSentry = initializeSentry;
window.captureSentryError = captureSentryError;
window.captureSentryMessage = captureSentryMessage;
window.setSentryUser = setSentryUser;
window.initializeSupabase = initializeSupabase;
window.showMessage = showMessage;
window.generateSessionId = generateSessionId;
window.isValidEmail = isValidEmail;
window.formatDate = formatDate;
window.formatDateTime = formatDateTime;
window.clearDemoData = clearDemoData;
window.debugLocalStorage = debugLocalStorage;
window.testMockSystem = testMockSystem;
window.clearAllDataAndReset = clearAllDataAndReset;
