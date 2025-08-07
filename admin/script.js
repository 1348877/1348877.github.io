// Script principal para el panel administrativo
let currentAdmin = null;
let currentEncuestaId = null;
let questionCounter = 0;

// Inicialización al cargar la página
document.addEventListener('DOMContentLoaded', function() {
    // Inicializar Sentry
    const sentryActive = initializeSentry();
    if (sentryActive) {
        console.log('✅ Sentry activo en admin');
        captureSentryMessage('Admin - Sistema cargado', 'info', {
            page: 'admin',
            timestamp: new Date().toISOString()
        });
    }
    
    // Continuar con la inicialización normal
    initializeAdmin();
});

// Función de inicialización del admin
function initializeAdmin() {
    // Verificar conexión a la base de datos
    const supabaseClient = initializeSupabase();
    if (!supabaseClient) {
        console.error('❌ Error: No se pudo conectar con la base de datos.');
        captureSentryError(new Error('No se pudo conectar con la base de datos'), {
            page: 'admin',
            action: 'database_connection'
        });
        showMessage('Error: No se pudo conectar con la base de datos.', 'error');
        return;
    }
    
    // Verificar si hay sesión activa
    checkExistingSession();
}

// Función de prueba para verificar el sistema mock
async function testMockSystem() {
    console.log('🧪 INICIANDO PRUEBAS DEL SISTEMA MOCK');
    
    // 1. Limpiar datos existentes
    clearDemoData();
    
    // 2. Crear una encuesta de prueba
    console.log('📝 Creando encuesta de prueba...');
    const { data: encuesta, error: encuestaError } = await supabase
        .from('encuestas')
        .insert({
            titulo: 'Encuesta de Prueba',
            descripcion: 'Prueba del sistema',
            activa: true,
            id_admin: 1
        })
        .select()
        .single();
        
    console.log('📝 Resultado encuesta:', { encuesta, encuestaError });
    
    if (encuestaError) {
        console.error('❌ Error creando encuesta:', encuestaError);
        return;
    }
    
    // 3. Crear preguntas de prueba
    console.log('❓ Creando preguntas de prueba...');
    const { data: pregunta, error: preguntaError } = await supabase
        .from('preguntas')
        .insert({
            texto: 'Pregunta de prueba',
            tipo_pregunta: 'single_choice',
            orden_pregunta: 1,
            id_encuesta: encuesta.id_encuesta,
            requerida: true
        })
        .select()
        .single();
        
    console.log('❓ Resultado pregunta:', { pregunta, preguntaError });
    
    // 4. Crear alternativas de prueba
    console.log('🔘 Creando alternativas de prueba...');
    const { data: alternativas, error: alternativasError } = await supabase
        .from('alternativas')
        .insert([
            { texto_opcion: 'Opción 1', orden_alternativa: 1, id_pregunta: pregunta.id_pregunta },
            { texto_opcion: 'Opción 2', orden_alternativa: 2, id_pregunta: pregunta.id_pregunta }
        ]);
        
    console.log('🔘 Resultado alternativas:', { alternativas, alternativasError });
    
    // 5. Probar consulta con join
    console.log('🔍 Probando consulta con join...');
    const { data: preguntasConAlternativas, error: joinError } = await supabase
        .from('preguntas')
        .select('*, alternativas (*)')
        .eq('id_encuesta', encuesta.id_encuesta);
        
    console.log('🔍 Resultado join:', { preguntasConAlternativas, joinError });
    
    // 6. Mostrar estado final
    debugLocalStorage();
    
    console.log('✅ PRUEBAS COMPLETADAS');
}

// Inicialización
document.addEventListener('DOMContentLoaded', function() {
    // Usar la función de config.js que inicializa supabase
    const supabaseClient = initializeSupabase();
    if (!supabaseClient) {
        showMessage('Error: No se pudo conectar con la base de datos. Verifique la configuración.', 'error');
        return;
    }
    
    initializeEventListeners();
    checkAdminSession();
});

// Event Listeners
function initializeEventListeners() {
    // Login
    document.getElementById('login-form').addEventListener('submit', handleLogin);
    document.getElementById('logout-btn').addEventListener('click', handleLogout);
    
    // Navigation
    document.getElementById('nav-encuestas').addEventListener('click', () => showSection('encuestas'));
    document.getElementById('nav-crear').addEventListener('click', () => showSection('crear'));
    document.getElementById('nav-reportes').addEventListener('click', () => showSection('reportes'));
    document.getElementById('nav-permisos').addEventListener('click', () => showSection('permisos'));
    document.getElementById('nav-solicitudes').addEventListener('click', () => showSection('solicitudes'));
    
    // Encuesta form
    document.getElementById('encuesta-form').addEventListener('submit', handleSaveEncuesta);
    document.getElementById('add-question-btn').addEventListener('click', addQuestion);
    document.getElementById('cancel-edit-btn').addEventListener('click', cancelEdit);
    
    // Reportes
    document.getElementById('reporte-encuesta').addEventListener('change', handleReporteChange);
}

// Session Management
function checkAdminSession() {
    const adminData = sessionStorage.getItem('adminSession');
    if (adminData) {
        currentAdmin = JSON.parse(adminData);
        showAdminDashboard();
    }
}

function setAdminSession(adminData) {
    currentAdmin = adminData;
    sessionStorage.setItem('adminSession', JSON.stringify(adminData));
    showAdminDashboard();
}

function clearAdminSession() {
    currentAdmin = null;
    sessionStorage.removeItem('adminSession');
    showLoginSection();
}

// Login/Logout
async function handleLogin(e) {
    e.preventDefault();
    
    const email = document.getElementById('admin-email').value;
    const password = document.getElementById('admin-password').value;
    
    // Validación para admin SENATI
    if (email === APP_CONFIG.adminEmail && password === APP_CONFIG.adminPassword) {
        const adminData = {
            id: 1,
            nombre: 'Admin SENATI',
            correo: email,
            rol: 'admin',
            permisos: ['encuestas', 'reportes', 'usuarios']
        };
        
        setAdminSession(adminData);
        showMessage('¡Bienvenido al Sistema SENATI!', 'success');
    }
    // Validación para super admin SENATI  
    else if (email === APP_CONFIG.superAdminEmail && password === APP_CONFIG.superAdminPassword) {
        const adminData = {
            id: 0,
            nombre: 'Super Admin SENATI',
            correo: email,
            rol: 'super_admin',
            permisos: ['encuestas', 'reportes', 'usuarios', 'permisos', 'config']
        };
        
        setAdminSession(adminData);
        showMessage('¡Bienvenido Super Administrador!', 'success');
    }
    else {
        showMessage('Credenciales incorrectas. Solo personal autorizado de SENATI.', 'error');
    }
}

function handleLogout() {
    clearAdminSession();
    showMessage('Sesión cerrada exitosamente. Redirigiendo...', 'info');
    
    // Redirigir a la página principal (index.html)
    setTimeout(() => {
        window.location.href = '/';
    }, 1500);
}

// UI Management
function showLoginSection() {
    document.getElementById('login-section').classList.remove('hidden');
    document.getElementById('admin-dashboard').classList.add('hidden');
}

function showAdminDashboard() {
    document.getElementById('login-section').classList.add('hidden');
    document.getElementById('admin-dashboard').classList.remove('hidden');
    document.getElementById('admin-welcome').textContent = `Bienvenido, ${currentAdmin.nombre}`;
    
    // Mostrar botón de solicitudes solo para Super Usuario
    const solicitudesBtn = document.getElementById('nav-solicitudes');
    console.log('🔍 Rol actual del usuario:', currentAdmin.rol);
    console.log('🔍 ¿Es Super Admin?:', currentAdmin.rol === 'super_admin');
    
    if (currentAdmin.rol === 'super_admin') {
        console.log('✅ Mostrando botón de solicitudes para Super Usuario');
        solicitudesBtn.classList.remove('hidden');
    } else {
        console.log('❌ Ocultando botón de solicitudes para admin normal');
        solicitudesBtn.classList.add('hidden');
    }
    
    showSection('encuestas');
    loadDashboardData();
}

function showSection(sectionName) {
    // Hide all sections
    document.querySelectorAll('.admin-section').forEach(section => {
        section.classList.add('hidden');
    });
    
    // Remove active class from nav buttons
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    // Check permissions for certain sections
    if (sectionName === 'permisos' && currentAdmin.rol !== 'super_admin') {
        showMessage('No tienes permisos para acceder a esta sección.', 'warning');
        sectionName = 'encuestas'; // Redirect to encuestas
    }
    
    // Show selected section and activate nav button
    document.getElementById(`section-${sectionName}`).classList.remove('hidden');
    document.getElementById(`nav-${sectionName}`).classList.add('active');
    
    // Load section-specific data
    switch(sectionName) {
        case 'encuestas':
            loadEncuestas();
            break;
        case 'crear':
            resetEncuestaForm();
            break;
        case 'reportes':
            loadReportes();
            break;
        case 'permisos':
            loadPermisos();
            break;
        case 'solicitudes':
            if (currentAdmin.rol === 'super_admin') {
                loadSolicitudes();
            } else {
                showMessage('No tienes permisos para acceder a esta sección.', 'warning');
                showSection('encuestas');
            }
            break;
    }
}

// Encuestas Management
async function loadEncuestas() {
    const loadingDiv = document.getElementById('encuestas-loading');
    const listDiv = document.getElementById('encuestas-list');
    
    loadingDiv.classList.remove('hidden');
    
    try {
        let encuestas = [];
        
        // En modo desarrollo, usar datos mock persistentes
        if (SUPABASE_CONFIG.url === 'https://demo.supabase.co') {
            const { data, error } = await supabase
                .from('encuestas')
                .select('*')
                .eq('id_admin', currentAdmin.id)
                .order('fecha_creacion', { ascending: false });
                
            if (error) throw error;
            encuestas = data || [];
        } else {
            // Para producción con Supabase real
            const { data, error } = await supabase
                .from('encuestas')
                .select('*')
                .eq('id_admin', currentAdmin.id)
                .order('fecha_creacion', { ascending: false });
                
            if (error) throw error;
            encuestas = data || [];
        }
        
        listDiv.innerHTML = '';
        
        if (encuestas.length === 0) {
            listDiv.innerHTML = `
                <div class="empty-state">
                    <h3>📝 No hay encuestas</h3>
                    <p>Aún no has creado ninguna encuesta.</p>
                    <button class="btn btn-primary" onclick="showSection('crear')">
                        ➕ Crear mi primera encuesta
                    </button>
                </div>
            `;
        } else {
            encuestas.forEach(encuesta => {
                listDiv.appendChild(createEncuestaCard(encuesta));
            });
        }
        
    } catch (error) {
        console.error('Error loading encuestas:', error);
        showMessage('Error al cargar las encuestas: ' + error.message, 'error');
    } finally {
        loadingDiv.classList.add('hidden');
    }
}

function createEncuestaCard(encuesta) {
    const card = document.createElement('div');
    card.className = 'encuesta-card';
    
    const urlUsuario = `${window.location.origin}/usuario/?id=${encuesta.id_encuesta}`;
    
    card.innerHTML = `
        <div class="encuesta-status ${encuesta.activa ? 'activa' : 'inactiva'}">
            ${encuesta.activa ? '✅ Activa' : '❌ Inactiva'}
        </div>
        <h3>${encuesta.titulo}</h3>
        <div class="encuesta-meta">
            📅 Creada: ${formatDate(encuesta.fecha_creacion)}
            ${encuesta.descripcion ? `<br>📝 ${encuesta.descripcion}` : ''}
        </div>
        
        <div class="encuesta-url">
            <strong>🔗 URL pública:</strong><br>
            <span>${urlUsuario}</span>
        </div>
        
        <div class="url-actions">
            <button class="btn btn-secondary btn-small" onclick="copyToClipboard('${urlUsuario}')">
                📋 Copiar enlace
            </button>
            <a href="${urlUsuario}" target="_blank" class="btn btn-primary btn-small">
                👁️ Ver encuesta
            </a>
        </div>
        
        <div class="encuesta-actions">
            <button class="btn btn-warning btn-small" onclick="editEncuesta(${encuesta.id_encuesta})">
                ✏️ Editar
            </button>
            <button class="btn btn-${encuesta.activa ? 'secondary' : 'success'} btn-small" 
                    onclick="toggleEncuestaStatus(${encuesta.id_encuesta}, ${!encuesta.activa})">
                ${encuesta.activa ? '⏸️ Desactivar' : '▶️ Activar'}
            </button>
            <button class="btn btn-danger btn-small" onclick="deleteEncuesta(${encuesta.id_encuesta}, '${encuesta.titulo}')">
                🗑️ Eliminar
            </button>
            <button class="btn btn-info btn-small" onclick="viewReporte(${encuesta.id_encuesta})">
                📊 Ver reporte
            </button>
        </div>
    `;
    
    return card;
}

// Encuesta Form Management
function resetEncuestaForm() {
    document.getElementById('form-title').textContent = '➕ Crear Nueva Encuesta';
    document.getElementById('encuesta-form').reset();
    document.getElementById('encuesta-id').value = '';
    
    // Limpiar completamente el contenedor de preguntas
    const container = document.getElementById('questions-container');
    container.innerHTML = '';
    
    currentEncuestaId = null;
    questionCounter = 0;
    
    // Add initial question
    addQuestion();
    
    console.log('📝 Formulario de encuesta reiniciado');
}

function addQuestion() {
    const container = document.getElementById('questions-container');
    const template = document.getElementById('question-template');
    const questionElement = template.content.cloneNode(true);
    
    questionCounter++;
    const questionDiv = questionElement.querySelector('.question-item');
    questionDiv.setAttribute('data-question-index', questionCounter);
    
    // Agregar nombres únicos a los campos de la pregunta
    const questionTextInput = questionElement.querySelector('.question-text');
    const questionTypeSelect = questionElement.querySelector('.question-type');
    
    if (questionTextInput) {
        questionTextInput.name = `questiontext${questionCounter}`;
        questionTextInput.id = `questiontext${questionCounter}`;
    }
    if (questionTypeSelect) {
        questionTypeSelect.name = `questiontype${questionCounter}`;
        questionTypeSelect.id = `questiontype${questionCounter}`;
    }
    
    // Add event listeners to the new question
    const removeBtn = questionElement.querySelector('.remove-question-btn');
    removeBtn.addEventListener('click', function() {
        removeQuestion(questionDiv);
    });
    
    const addAltBtn = questionElement.querySelector('.add-alternative-btn');
    addAltBtn.addEventListener('click', function() {
        addAlternative(questionDiv);
    });
    
    const typeSelect = questionElement.querySelector('.question-type');
    typeSelect.addEventListener('change', function() {
        handleQuestionTypeChange(questionDiv);
    });
    
    container.appendChild(questionElement);
    
    // Add initial alternatives
    addAlternative(questionDiv);
    addAlternative(questionDiv);
    
    // Update alternatives visibility
    handleQuestionTypeChange(questionDiv);
}

function removeQuestion(questionDiv) {
    const container = document.getElementById('questions-container');
    if (container.children.length > 1) {
        questionDiv.classList.add('removing');
        setTimeout(() => {
            questionDiv.remove();
        }, 300);
    } else {
        showMessage('Debe tener al menos una pregunta en la encuesta.', 'warning');
    }
}

function addAlternative(questionDiv) {
    const container = questionDiv.querySelector('.alternatives-container');
    const template = document.getElementById('alternative-template');
    const alternativeElement = template.content.cloneNode(true);
    
    // Generar un ID único para esta alternativa
    const questionIndex = questionDiv.getAttribute('data-question-index');
    const alternativeIndex = container.children.length + 1;
    const uniqueId = `alternative${questionIndex}${alternativeIndex}`;
    
    // Agregar nombre único al campo de texto de la alternativa
    const alternativeInput = alternativeElement.querySelector('.alternative-text');
    if (alternativeInput) {
        alternativeInput.name = uniqueId;
        alternativeInput.id = uniqueId;
    }
    
    const removeBtn = alternativeElement.querySelector('.remove-alternative-btn');
    removeBtn.addEventListener('click', function() {
        removeAlternative(this.closest('.alternative-item-admin'));
    });
    
    container.appendChild(alternativeElement);
}

function removeAlternative(alternativeDiv) {
    const container = alternativeDiv.parentNode;
    if (container.children.length > 2) {
        alternativeDiv.remove();
    } else {
        showMessage('Debe tener al menos dos opciones por pregunta.', 'warning');
    }
}

function handleQuestionTypeChange(questionDiv) {
    const typeSelect = questionDiv.querySelector('.question-type');
    const alternativesSection = questionDiv.querySelector('.alternatives-section');
    
    if (typeSelect.value === 'open_text') {
        alternativesSection.style.display = 'none';
        // Deshabilitar campos required en alternativas cuando no son necesarias
        const alternativeInputs = alternativesSection.querySelectorAll('.alternative-text');
        alternativeInputs.forEach(input => {
            input.required = false;
            input.value = ''; // Limpiar valores
        });
    } else {
        alternativesSection.style.display = 'block';
        // Habilitar campos required en alternativas cuando son necesarias
        const alternativeInputs = alternativesSection.querySelectorAll('.alternative-text');
        alternativeInputs.forEach(input => {
            input.required = true;
        });
    }
}

// Save Encuesta
async function handleSaveEncuesta(e) {
    e.preventDefault();
    
    const saveBtn = document.getElementById('save-encuesta-btn');
    saveBtn.classList.add('loading');
    
    try {
        const titulo = document.getElementById('encuesta-titulo').value;
        const descripcion = document.getElementById('encuesta-descripcion').value;
        const encuestaId = document.getElementById('encuesta-id').value;
        
        // Validate form
        const questions = collectQuestionsData();
        if (questions.length === 0) {
            throw new Error('Debe agregar al menos una pregunta.');
        }
        
        // Validate that multiple choice questions have at least 2 alternatives
        for (const question of questions) {
            if (question.tipo_pregunta !== 'open_text' && question.alternatives.length < 2) {
                throw new Error(`La pregunta "${question.texto}" debe tener al menos 2 opciones.`);
            }
        }
        
        // En modo desarrollo, usar sistema mock persistente
        if (SUPABASE_CONFIG.url === 'https://demo.supabase.co') {
            let savedEncuesta;
            
            if (encuestaId) {
                // Update existing encuesta
                const { data, error } = await supabase
                    .from('encuestas')
                    .update({
                        titulo: titulo,
                        descripcion: descripcion,
                        fecha_modificacion: new Date().toISOString()
                    })
                    .eq('id_encuesta', encuestaId)
                    .select()
                    .single();
                    
                if (error) throw error;
                savedEncuesta = data;
                
                // Update questions and alternatives (preserving existing data)
                console.log(`� Actualizando preguntas y alternativas para encuesta ${encuestaId}`);
                await updateQuestionsAndAlternatives(savedEncuesta.id_encuesta, questions);
                
            } else {
                // Create new encuesta
                const { data, error } = await supabase
                    .from('encuestas')
                    .insert({
                        titulo: titulo,
                        descripcion: descripcion,
                        activa: true,
                        id_admin: currentAdmin.id,
                        fecha_creacion: new Date().toISOString()
                    })
                    .select()
                    .single();
                    
                if (error) throw error;
                savedEncuesta = data;
                
                // Save questions and alternatives for new encuesta
                await saveQuestions(savedEncuesta.id_encuesta, questions);
            }
            
            showMessage('Encuesta guardada exitosamente!', 'success');
            showSection('encuestas');
            await loadEncuestas(); // Recargar la lista
            return;
        }
        
        let savedEncuesta;
        
        if (encuestaId) {
            // Update existing encuesta
            const { data, error } = await supabase
                .from('encuestas')
                .update({
                    titulo: titulo,
                    descripcion: descripcion,
                    fecha_modificacion: new Date().toISOString()
                })
                .eq('id_encuesta', encuestaId)
                .select()
                .single();
                
            if (error) throw error;
            savedEncuesta = data;
            
            // Update questions and alternatives (preserving existing data)
            console.log(`🔄 Actualizando preguntas y alternativas para encuesta ${encuestaId}`);
            await updateQuestionsAndAlternatives(savedEncuesta.id_encuesta, questions);
                
        } else {
            // Create new encuesta
            const { data, error } = await supabase
                .from('encuestas')
                .insert({
                    titulo: titulo,
                    descripcion: descripcion,
                    fecha_creacion: new Date().toISOString(),
                    id_admin: currentAdmin.id,
                    activa: true
                })
                .select()
                .single();
                
            if (error) throw error;
            savedEncuesta = data;
            
            // Save questions and alternatives for new encuesta
            await saveQuestions(savedEncuesta.id_encuesta, questions);
        }
        
        showMessage('Encuesta guardada exitosamente!', 'success');
        showSection('encuestas');
        
    } catch (error) {
        console.error('Error saving encuesta:', error);
        showMessage('Error al guardar la encuesta: ' + error.message, 'error');
    } finally {
        saveBtn.classList.remove('loading');
    }
}

function collectQuestionsData() {
    const questions = [];
    const questionItems = document.querySelectorAll('.question-item');
    
    questionItems.forEach((questionDiv, index) => {
        const texto = questionDiv.querySelector('.question-text').value;
        const tipo = questionDiv.querySelector('.question-type').value;
        
        if (!texto.trim()) return;
        
        const question = {
            texto: texto,
            tipo_pregunta: tipo,
            orden_pregunta: index + 1,
            alternatives: []
        };
        
        if (tipo !== 'open_text') {
            const alternativeInputs = questionDiv.querySelectorAll('.alternative-text');
            alternativeInputs.forEach((input, altIndex) => {
                const altText = input.value.trim();
                if (altText) {
                    question.alternatives.push({
                        texto_opcion: altText,  // Campo correcto para la BD
                        orden_alternativa: altIndex + 1
                    });
                }
            });
        }
        
        questions.push(question);
    });
    
    return questions;
}

async function saveQuestions(encuestaId, questions) {
    // Asegurar que encuestaId sea un número
    const numericEncuestaId = Number(encuestaId);
    
    // En modo desarrollo, guardar realmente en localStorage
    if (SUPABASE_CONFIG.url === 'https://demo.supabase.co') {
        console.log('💾 Guardando preguntas:', questions);
        console.log('💾 ID de encuesta (numeric):', numericEncuestaId);
        
        for (const question of questions) {
            console.log(`💾 Insertando pregunta:`, {
                texto: question.texto,
                tipo_pregunta: question.tipo_pregunta,
                orden_pregunta: question.orden_pregunta,
                id_encuesta: numericEncuestaId
            });
            
            // Save question
            const { data: savedQuestion, error: questionError } = await supabase
                .from('preguntas')
                .insert({
                    texto: question.texto,
                    tipo_pregunta: question.tipo_pregunta,
                    requerida: true,
                    orden_pregunta: question.orden_pregunta,
                    id_encuesta: numericEncuestaId
                })
                .select()
                .single();
                
            console.log(`💾 Resultado inserción pregunta:`, { savedQuestion, questionError });
            if (questionError) throw questionError;
            
            // Save alternatives if they exist
            if (question.alternatives && question.alternatives.length > 0) {
                const alternatives = question.alternatives.map((alt, index) => ({
                    texto_opcion: alt.texto_opcion,
                    orden_alternativa: index + 1,
                    id_pregunta: savedQuestion.id_pregunta
                }));
                
                const { error: altError } = await supabase
                    .from('alternativas')
                    .insert(alternatives);
                    
                if (altError) throw altError;
            }
        }
        return;
    }
    
    // Para producción con Supabase real
    for (const question of questions) {
        // Save question
        const { data: savedQuestion, error: questionError } = await supabase
            .from('preguntas')
            .insert({
                texto: question.texto,
                tipo_pregunta: question.tipo_pregunta,
                requerida: true,
                orden_pregunta: question.orden_pregunta,
                id_encuesta: encuestaId
            })
            .select()
            .single();
            
        if (questionError) throw questionError;
        
        // Save alternatives if they exist
        if (question.alternatives && question.alternatives.length > 0) {
            const alternatives = question.alternatives.map((alt, index) => ({
                texto_opcion: alt.texto_opcion,
                orden_alternativa: index + 1,
                id_pregunta: savedQuestion.id_pregunta
            }));
            
            const { error: altError } = await supabase
                .from('alternativas')
                .insert(alternatives);
                
            if (altError) throw altError;
        }
    }
}

// Encuesta Actions
async function editEncuesta(encuestaId) {
    try {
        // Asegurar que encuestaId sea un número
        const numericEncuestaId = Number(encuestaId);
        console.log(`🔍 Editando encuesta ID: ${numericEncuestaId} (original: ${encuestaId}, type: ${typeof encuestaId})`);
        
        // En modo desarrollo, usar sistema mock persistente
        if (SUPABASE_CONFIG.url === 'https://demo.supabase.co') {
            // Load encuesta data
            console.log('📊 Cargando datos de encuesta...');
            const { data: encuesta, error: encuestaError } = await supabase
                .from('encuestas')
                .select('*')
                .eq('id_encuesta', numericEncuestaId)
                .single();
                
            console.log('📊 Resultado encuesta:', { encuesta, encuestaError });
            if (encuestaError) throw encuestaError;
            
            // Load questions with alternatives
            console.log('❓ Cargando preguntas...');
            const { data: preguntas, error: preguntasError } = await supabase
                .from('preguntas')
                .select('*, alternativas (*)')
                .eq('id_encuesta', numericEncuestaId)
                .order('orden_pregunta');
                
            console.log('❓ Resultado preguntas:', { preguntas, preguntasError });
            if (preguntasError) throw preguntasError;
            
            populateEditForm(encuesta, preguntas || []);
            showSection('crear');
            return;
        }
        
        // Para producción con Supabase real
        // Load encuesta data
        const { data: encuesta, error: encuestaError } = await supabase
            .from('encuestas')
            .select('*')
            .eq('id_encuesta', numericEncuestaId)
            .single();
            
        if (encuestaError) throw encuestaError;
        
        // Load questions
        const { data: preguntas, error: preguntasError } = await supabase
            .from('preguntas')
            .select(`
                *,
                alternativas (*)
            `)
            .eq('id_encuesta', numericEncuestaId)
            .order('orden_pregunta');
            
        if (preguntasError) throw preguntasError;
        
        populateEditForm(encuesta, preguntas);
        showSection('crear');
        
    } catch (error) {
        console.error('Error loading encuesta for edit:', error);
        showMessage('Error al cargar la encuesta para editar: ' + error.message, 'error');
    }
}

function populateEditForm(encuesta, preguntas) {
    console.log('🔧 Poblando formulario de edición');
    console.log('📊 Encuesta:', encuesta);
    console.log('❓ Preguntas recibidas:', preguntas);
    
    // Populate form
    document.getElementById('form-title').textContent = '✏️ Editar Encuesta';
    document.getElementById('encuesta-id').value = encuesta.id_encuesta;
    document.getElementById('encuesta-titulo').value = encuesta.titulo;
    document.getElementById('encuesta-descripcion').value = encuesta.descripcion || '';
    
    // Clear and populate questions
    document.getElementById('questions-container').innerHTML = '';
    questionCounter = 0;
    
    if (!preguntas || preguntas.length === 0) {
        console.log('⚠️ No hay preguntas para editar, agregando una nueva');
        addQuestion();
    } else {
        console.log(`📝 Agregando ${preguntas.length} preguntas al formulario`);
        preguntas.forEach((pregunta, index) => {
            console.log(`➕ Agregando pregunta ${index + 1}:`, pregunta);
            addQuestion();
            const questionDiv = document.querySelector('.question-item:last-child');
            
            if (!questionDiv) {
                console.error('❌ No se pudo encontrar el div de la pregunta');
                return;
            }
            
            // Llenar datos de la pregunta
            const questionTextInput = questionDiv.querySelector('.question-text');
            const questionTypeSelect = questionDiv.querySelector('.question-type');
            
            if (questionTextInput) {
                questionTextInput.value = pregunta.texto;
                console.log(`📝 Texto de pregunta establecido: ${pregunta.texto}`);
            }
            
            if (questionTypeSelect) {
                questionTypeSelect.value = pregunta.tipo_pregunta;
                console.log(`🔧 Tipo de pregunta establecido: ${pregunta.tipo_pregunta}`);
            }
            
            // Clear default alternatives and add real ones
            const alternativesContainer = questionDiv.querySelector('.alternatives-container');
            if (alternativesContainer) {
                alternativesContainer.innerHTML = '';
                
                if (pregunta.alternativas && pregunta.alternativas.length > 0) {
                    console.log(`🔘 Agregando ${pregunta.alternativas.length} alternativas`);
                    pregunta.alternativas.forEach((alt, altIndex) => {
                        console.log(`  ➤ Alternativa ${altIndex + 1}: ${alt.texto_opcion}`);
                        addAlternative(questionDiv);
                        const lastAltInput = alternativesContainer.querySelector('.alternative-text:last-child');
                        if (lastAltInput) {
                            lastAltInput.value = alt.texto_opcion;
                        }
                    });
                } else if (pregunta.tipo_pregunta !== 'open_text') {
                    console.log('🔘 Agregando alternativas por defecto para pregunta de opción múltiple');
                    // Add default alternatives for non-text questions
                    addAlternative(questionDiv);
                    addAlternative(questionDiv);
                }
            }
            
            // Update visibility based on question type
            handleQuestionTypeChange(questionDiv);
        });
    }
    
    currentEncuestaId = encuesta.id_encuesta;
    console.log('✅ Formulario de edición poblado completamente');
}

async function toggleEncuestaStatus(encuestaId, newStatus) {
    try {
        // En modo desarrollo, simular cambio exitoso
        if (SUPABASE_CONFIG.url === 'https://demo.supabase.co') {
            showMessage(`Encuesta ${newStatus ? 'activada' : 'desactivada'} exitosamente (modo demo).`, 'success');
            loadEncuestas();
            return;
        }
        
        // Para producción con Supabase real
        const { error } = await supabase
            .from('encuestas')
            .update({ activa: newStatus })
            .eq('id_encuesta', encuestaId);
            
        if (error) throw error;
        
        showMessage(`Encuesta ${newStatus ? 'activada' : 'desactivada'} exitosamente.`, 'success');
        loadEncuestas();
        
    } catch (error) {
        console.error('Error toggling encuesta status:', error);
        showMessage('Error al cambiar el estado de la encuesta: ' + error.message, 'error');
    }
}

async function deleteEncuesta(encuestaId, titulo) {
    if (!confirm(`¿Está seguro de que desea eliminar la encuesta "${titulo}"?\n\nEsta acción no se puede deshacer.`)) {
        return;
    }
    
    try {
        console.log(`🗑️ Iniciando eliminación de encuesta ${encuestaId}: "${titulo}"`);
        
        // Eliminar en orden correcto debido a restricciones de claves foráneas
        
        // 1. Primero obtener todas las preguntas de la encuesta
        const { data: preguntas, error: preguntasError } = await supabase
            .from('preguntas')
            .select('id_pregunta')
            .eq('id_encuesta', encuestaId);
            
        if (preguntasError) throw preguntasError;
        console.log(`🔍 Preguntas encontradas para eliminar:`, preguntas?.length || 0);
        
        // 2. Eliminar respuestas y alternativas para cada pregunta
        if (preguntas && preguntas.length > 0) {
            for (const pregunta of preguntas) {
                console.log(`🗑️ Eliminando respuestas y alternativas para pregunta ${pregunta.id_pregunta}`);
                
                await supabase
                    .from('respuestas')
                    .delete()
                    .eq('id_pregunta', pregunta.id_pregunta);
                    
                await supabase
                    .from('alternativas')
                    .delete()
                    .eq('id_pregunta', pregunta.id_pregunta);
            }
        }
        
        // 3. Eliminar preguntas
        console.log(`🗑️ Eliminando preguntas de la encuesta ${encuestaId}`);
        await supabase
            .from('preguntas')
            .delete()
            .eq('id_encuesta', encuestaId);
        
        // 4. Finalmente eliminar la encuesta
        console.log(`🗑️ Eliminando encuesta ${encuestaId}`);
        const { error } = await supabase
            .from('encuestas')
            .delete()
            .eq('id_encuesta', encuestaId);
            
        if (error) throw error;
        
        console.log(`✅ Encuesta ${encuestaId} eliminada exitosamente`);
        showMessage('Encuesta eliminada exitosamente.', 'success');
        loadEncuestas();
        
    } catch (error) {
        console.error('❌ Error eliminando encuesta:', error);
        showMessage('Error al eliminar la encuesta: ' + error.message, 'error');
    }
}

function cancelEdit() {
    if (confirm('¿Está seguro de que desea cancelar? Los cambios no guardados se perderán.')) {
        showSection('encuestas');
    }
}

// Reportes
async function loadReportes() {
    try {
        await loadEstadisticasGenerales();
        await loadEncuestasParaReporte();
        await loadFiltrosAvanzados();
        await initializeCharts();
    } catch (error) {
        console.error('Error loading reportes:', error);
        showMessage('Error al cargar los reportes: ' + error.message, 'error');
    }
}

async function loadEstadisticasGenerales() {
    try {
        // En modo desarrollo, usar datos mock simplificados
        if (SUPABASE_CONFIG.url === 'https://demo.supabase.co') {
            // Datos de demostración más realistas
            const encuestasData = JSON.parse(localStorage.getItem('mock_encuestas') || '[]');
            const respuestasData = JSON.parse(localStorage.getItem('mock_respuestas') || '[]');
            
            const totalEncuestas = encuestasData.length;
            const encuestasActivas = encuestasData.filter(e => e.activa).length;
            const totalRespuestas = respuestasData.length;
            const promedioRespuestas = totalEncuestas > 0 ? Math.round(totalRespuestas / totalEncuestas) : 0;
            
            document.getElementById('total-encuestas').textContent = totalEncuestas;
            document.getElementById('encuestas-activas').textContent = encuestasActivas;
            document.getElementById('total-respuestas').textContent = totalRespuestas;
            document.getElementById('promedio-respuestas').textContent = promedioRespuestas;
            
            console.log('📊 Estadísticas cargadas (modo demo)');
            return;
        }
        
        // Código original para producción con Supabase real
        // Total encuestas
        const { count: totalEncuestas } = await supabase
            .from('encuestas')
            .select('*', { count: 'exact', head: true })
            .eq('id_admin', currentAdmin.id);
            
        // Encuestas activas
        const { count: encuestasActivas } = await supabase
            .from('encuestas')
            .select('*', { count: 'exact', head: true })
            .eq('id_admin', currentAdmin.id)
            .eq('activa', true);
            
        // Total respuestas (simplificado)
        const { data: respuestasData } = await supabase
            .from('respuestas')
            .select('id_respuesta');
            
        const promedioRespuestas = totalEncuestas > 0 ? Math.round((respuestasData?.length || 0) / totalEncuestas) : 0;
            
        document.getElementById('total-encuestas').textContent = totalEncuestas || 0;
        document.getElementById('encuestas-activas').textContent = encuestasActivas || 0;
        document.getElementById('total-respuestas').textContent = respuestasData?.length || 0;
        document.getElementById('promedio-respuestas').textContent = promedioRespuestas;
        
    } catch (error) {
        console.error('Error loading estadisticas:', error);
        // Valores de fallback en caso de error
        document.getElementById('total-encuestas').textContent = '0';
        document.getElementById('encuestas-activas').textContent = '0';
        document.getElementById('total-respuestas').textContent = '0';
        document.getElementById('promedio-respuestas').textContent = '0';
    }
}

async function loadEncuestasParaReporte() {
    try {
        // En modo desarrollo, usar datos mock
        if (SUPABASE_CONFIG.url === 'https://demo.supabase.co') {
            const encuestasData = JSON.parse(localStorage.getItem('mock_encuestas') || '[]');
            const select = document.getElementById('reporte-encuesta');
            
            if (!select) {
                console.warn('Elemento reporte-encuesta no encontrado');
                return;
            }
            
            select.innerHTML = '<option value="">Seleccione una encuesta...</option>';
            
            if (encuestasData && encuestasData.length > 0) {
                encuestasData.forEach(encuesta => {
                    const option = document.createElement('option');
                    option.value = encuesta.id_encuesta;
                    option.textContent = encuesta.titulo;
                    select.appendChild(option);
                });
            }
            
            // También cargar en el selector de análisis
            const analisisSelect = document.getElementById('analisis-encuesta');
            if (analisisSelect) {
                analisisSelect.innerHTML = '<option value="">Seleccione una encuesta...</option>';
                if (encuestasData && encuestasData.length > 0) {
                    encuestasData.forEach(encuesta => {
                        const option = document.createElement('option');
                        option.value = encuesta.id_encuesta;
                        option.textContent = encuesta.titulo;
                        analisisSelect.appendChild(option);
                    });
                }
            }
            
            console.log('📊 Encuestas para reporte cargadas (modo demo):', encuestasData.length);
            return;
        }
        
        // Código original para producción con Supabase real
        const { data: encuestas, error } = await supabase
            .from('encuestas')
            .select('id_encuesta, titulo')
            .eq('id_admin', currentAdmin.id)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error loading encuestas para reporte:', error);
            return;
        }

        const select = document.getElementById('reporte-encuesta');
        const analisisSelect = document.getElementById('analisis-encuesta');
        
        if (select) {
            select.innerHTML = '<option value="">Seleccione una encuesta...</option>';
            if (encuestas && encuestas.length > 0) {
                encuestas.forEach(encuesta => {
                    const option = document.createElement('option');
                    option.value = encuesta.id_encuesta;
                    option.textContent = encuesta.titulo;
                    select.appendChild(option);
                });
            }
        }
        
        if (analisisSelect) {
            analisisSelect.innerHTML = '<option value="">Seleccione una encuesta...</option>';
            if (encuestas && encuestas.length > 0) {
                encuestas.forEach(encuesta => {
                    const option = document.createElement('option');
                    option.value = encuesta.id_encuesta;
                    option.textContent = encuesta.titulo;
                    analisisSelect.appendChild(option);
                });
            }
        }

        console.log('📊 Encuestas para reporte cargadas:', encuestas.length);
        
    } catch (error) {
        console.error('Error loading encuestas para reporte:', error);
    }
}

// Variables globales para las gráficas
let chartRespuestasEncuesta = null;
let chartGenero = null;
let chartCarrera = null;
let chartTendencia = null;

// Datos filtrados globales
let datosOriginales = {
    encuestas: [],
    respuestas: [],
    alumnos: [],
    admins: []
};

let datosFiltrados = {
    encuestas: [],
    respuestas: [],
    alumnos: []
};

async function loadFiltrosAvanzados() {
    try {
        // Cargar datos para los filtros
        await cargarDatosOriginales();
        await poblarFiltros();
        
        // Configurar event listeners para filtros
        setupFiltrosEventListeners();
        
        console.log('🔍 Filtros avanzados inicializados');
    } catch (error) {
        console.error('Error cargando filtros:', error);
    }
}

async function cargarDatosOriginales() {
    if (SUPABASE_CONFIG.url === 'https://demo.supabase.co') {
        // Datos mock para desarrollo
        datosOriginales.encuestas = JSON.parse(localStorage.getItem('mock_encuestas') || '[]');
        datosOriginales.respuestas = JSON.parse(localStorage.getItem('mock_respuestas') || '[]');
        datosOriginales.alumnos = JSON.parse(localStorage.getItem('mock_alumnos') || '[]');
        datosOriginales.admins = JSON.parse(localStorage.getItem('mock_admin') || '[]');
        
        // Generar datos de prueba si no existen
        if (datosOriginales.alumnos.length === 0) {
            generarDatosPrueba();
        }
    } else {
        // Cargar datos reales de Supabase
        const [encuestas, respuestas, alumnos, admins] = await Promise.all([
            supabase.from('encuestas').select('*'),
            supabase.from('respuestas').select('*'),
            supabase.from('alumnos').select('*'),
            supabase.from('admin').select('*')
        ]);
        
        datosOriginales.encuestas = encuestas.data || [];
        datosOriginales.respuestas = respuestas.data || [];
        datosOriginales.alumnos = alumnos.data || [];
        datosOriginales.admins = admins.data || [];
    }
    
    // Inicialmente, los datos filtrados son iguales a los originales
    datosFiltrados = JSON.parse(JSON.stringify(datosOriginales));
}

function generarDatosPrueba() {
    // Generar alumnos de prueba
    const carreras = ['Computación e Informática', 'Electrotecnia Industrial', 'Mecánica Automotriz', 'Administración Industrial', 'Contabilidad'];
    const generos = ['Masculino', 'Femenino', 'Otro'];
    
    const alumnos = [];
    for (let i = 1; i <= 50; i++) {
        alumnos.push({
            id_alumno: i,
            nombre: `Estudiante ${i}`,
            genero: generos[Math.floor(Math.random() * generos.length)],
            carrera: carreras[Math.floor(Math.random() * carreras.length)],
            correo: `estudiante${i}@senati.pe`,
            created_at: new Date(2024, Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1).toISOString()
        });
    }
    
    // Generar respuestas de prueba
    const respuestas = [];
    const encuestas = datosOriginales.encuestas;
    
    for (let i = 1; i <= 100; i++) {
        const alumno = alumnos[Math.floor(Math.random() * alumnos.length)];
        const encuesta = encuestas[Math.floor(Math.random() * encuestas.length)];
        
        if (encuesta) {
            respuestas.push({
                id_respuesta: i,
                id_alumno: alumno.id_alumno,
                id_encuesta: encuesta.id_encuesta,
                created_at: new Date(2024, Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1).toISOString()
            });
        }
    }
    
    datosOriginales.alumnos = alumnos;
    datosOriginales.respuestas = respuestas;
    
    // Guardar en localStorage
    localStorage.setItem('mock_alumnos', JSON.stringify(alumnos));
    localStorage.setItem('mock_respuestas', JSON.stringify(respuestas));
}

async function poblarFiltros() {
    // Poblar filtro de encuestas
    const filterEncuesta = document.getElementById('filter-encuesta');
    const analisisEncuesta = document.getElementById('analisis-encuesta');
    
    if (filterEncuesta && analisisEncuesta) {
        const encuestasOptions = datosOriginales.encuestas.map(e => 
            `<option value="${e.id_encuesta}">${e.titulo}</option>`
        ).join('');
        
        filterEncuesta.innerHTML = '<option value="">Todas las encuestas</option>' + encuestasOptions;
        analisisEncuesta.innerHTML = '<option value="">Seleccione una encuesta...</option>' + encuestasOptions;
    }
    
    // Poblar filtro de carreras
    const filterCarrera = document.getElementById('filter-carrera');
    if (filterCarrera) {
        const carreras = [...new Set(datosOriginales.alumnos.map(a => a.carrera))];
        const carrerasOptions = carreras.map(c => `<option value="${c}">${c}</option>`).join('');
        filterCarrera.innerHTML = '<option value="">Todas las carreras</option>' + carrerasOptions;
    }
    
    // Poblar filtro de administradores
    const filterAdmin = document.getElementById('filter-admin');
    if (filterAdmin) {
        const adminsOptions = datosOriginales.admins.map(a => 
            `<option value="${a.id_admin}">${a.nombre}</option>`
        ).join('');
        filterAdmin.innerHTML = '<option value="">Todos</option>' + adminsOptions;
    }
}

function setupFiltrosEventListeners() {
    const aplicarBtn = document.getElementById('aplicar-filtros');
    const limpiarBtn = document.getElementById('limpiar-filtros');
    const exportarBtn = document.getElementById('exportar-datos');
    
    if (aplicarBtn) {
        aplicarBtn.addEventListener('click', aplicarFiltros);
    }
    
    if (limpiarBtn) {
        limpiarBtn.addEventListener('click', limpiarFiltros);
    }
    
    if (exportarBtn) {
        exportarBtn.addEventListener('click', exportarDatos);
    }
    
    // Event listeners para análisis detallado
    const analisisEncuesta = document.getElementById('analisis-encuesta');
    if (analisisEncuesta) {
        analisisEncuesta.addEventListener('change', cargarPreguntasAnalisis);
    }
    
    const analisisPregunta = document.getElementById('analisis-pregunta');
    if (analisisPregunta) {
        analisisPregunta.addEventListener('change', analizarPreguntaDetallada);
    }
}

async function aplicarFiltros() {
    try {
        // Obtener valores de filtros
        const filtros = {
            encuesta: document.getElementById('filter-encuesta')?.value || '',
            fechaInicio: document.getElementById('filter-fecha-inicio')?.value || '',
            fechaFin: document.getElementById('filter-fecha-fin')?.value || '',
            genero: document.getElementById('filter-genero')?.value || '',
            carrera: document.getElementById('filter-carrera')?.value || '',
            estado: document.getElementById('filter-estado')?.value || '',
            admin: document.getElementById('filter-admin')?.value || ''
        };
        
        // Aplicar filtros a los datos
        datosFiltrados = filtrarDatos(datosOriginales, filtros);
        
        // Actualizar estadísticas
        actualizarEstadisticasFiltradas(filtros);
        
        // Actualizar gráficas
        await actualizarGraficas();
        
        showMessage('Filtros aplicados correctamente', 'success');
        
    } catch (error) {
        console.error('Error aplicando filtros:', error);
        showMessage('Error al aplicar filtros: ' + error.message, 'error');
    }
}

function filtrarDatos(datos, filtros) {
    let encuestasFiltradas = [...datos.encuestas];
    let respuestasFiltradas = [...datos.respuestas];
    let alumnosFiltrados = [...datos.alumnos];
    
    // Filtrar por encuesta
    if (filtros.encuesta) {
        encuestasFiltradas = encuestasFiltradas.filter(e => e.id_encuesta == filtros.encuesta);
        respuestasFiltradas = respuestasFiltradas.filter(r => r.id_encuesta == filtros.encuesta);
    }
    
    // Filtrar por estado de encuesta
    if (filtros.estado !== '') {
        const estadoBool = filtros.estado === 'true';
        encuestasFiltradas = encuestasFiltradas.filter(e => e.activa === estadoBool);
        const encuestasIds = encuestasFiltradas.map(e => e.id_encuesta);
        respuestasFiltradas = respuestasFiltradas.filter(r => encuestasIds.includes(r.id_encuesta));
    }
    
    // Filtrar por administrador
    if (filtros.admin) {
        encuestasFiltradas = encuestasFiltradas.filter(e => e.id_admin == filtros.admin);
        const encuestasIds = encuestasFiltradas.map(e => e.id_encuesta);
        respuestasFiltradas = respuestasFiltradas.filter(r => encuestasIds.includes(r.id_encuesta));
    }
    
    // Filtrar por fecha
    if (filtros.fechaInicio) {
        const fechaInicio = new Date(filtros.fechaInicio);
        respuestasFiltradas = respuestasFiltradas.filter(r => new Date(r.created_at) >= fechaInicio);
    }
    
    if (filtros.fechaFin) {
        const fechaFin = new Date(filtros.fechaFin);
        fechaFin.setHours(23, 59, 59, 999);
        respuestasFiltradas = respuestasFiltradas.filter(r => new Date(r.created_at) <= fechaFin);
    }
    
    // Filtrar alumnos por género y carrera
    if (filtros.genero) {
        alumnosFiltrados = alumnosFiltrados.filter(a => a.genero === filtros.genero);
    }
    
    if (filtros.carrera) {
        alumnosFiltrados = alumnosFiltrados.filter(a => a.carrera === filtros.carrera);
    }
    
    // Filtrar respuestas por alumnos filtrados
    if (filtros.genero || filtros.carrera) {
        const alumnosIds = alumnosFiltrados.map(a => a.id_alumno);
        respuestasFiltradas = respuestasFiltradas.filter(r => alumnosIds.includes(r.id_alumno));
    }
    
    return {
        encuestas: encuestasFiltradas,
        respuestas: respuestasFiltradas,
        alumnos: alumnosFiltrados
    };
}

function actualizarEstadisticasFiltradas(filtros) {
    const totalEncuestas = datosFiltrados.encuestas.length;
    const encuestasActivas = datosFiltrados.encuestas.filter(e => e.activa).length;
    const totalRespuestas = datosFiltrados.respuestas.length;
    const promedioRespuestas = totalEncuestas > 0 ? Math.round(totalRespuestas / totalEncuestas) : 0;
    
    // Actualizar números principales
    document.getElementById('total-encuestas').textContent = totalEncuestas;
    document.getElementById('encuestas-activas').textContent = encuestasActivas;
    document.getElementById('total-respuestas').textContent = totalRespuestas;
    document.getElementById('promedio-respuestas').textContent = promedioRespuestas;
    
    // Actualizar textos descriptivos
    const descripcionFiltro = generarDescripcionFiltro(filtros);
    document.getElementById('encuestas-filtradas').textContent = descripcionFiltro;
    document.getElementById('respuestas-filtradas').textContent = descripcionFiltro;
    document.getElementById('activas-filtradas').textContent = descripcionFiltro;
    document.getElementById('promedio-filtrado').textContent = descripcionFiltro;
}

function generarDescripcionFiltro(filtros) {
    const filtrosActivos = [];
    
    if (filtros.encuesta) filtrosActivos.push('encuesta específica');
    if (filtros.fechaInicio || filtros.fechaFin) filtrosActivos.push('rango de fechas');
    if (filtros.genero) filtrosActivos.push(`género: ${filtros.genero}`);
    if (filtros.carrera) filtrosActivos.push('carrera específica');
    if (filtros.estado !== '') filtrosActivos.push(filtros.estado === 'true' ? 'solo activas' : 'solo inactivas');
    if (filtros.admin) filtrosActivos.push('admin específico');
    
    if (filtrosActivos.length === 0) {
        return 'Sin filtros aplicados';
    }
    
    return `Filtrado por: ${filtrosActivos.join(', ')}`;
}

function limpiarFiltros() {
    // Limpiar todos los campos de filtro
    document.getElementById('filter-encuesta').value = '';
    document.getElementById('filter-fecha-inicio').value = '';
    document.getElementById('filter-fecha-fin').value = '';
    document.getElementById('filter-genero').value = '';
    document.getElementById('filter-carrera').value = '';
    document.getElementById('filter-estado').value = '';
    document.getElementById('filter-admin').value = '';
    
    // Restaurar datos originales
    datosFiltrados = JSON.parse(JSON.stringify(datosOriginales));
    
    // Actualizar estadísticas y gráficas
    actualizarEstadisticasFiltradas({});
    actualizarGraficas();
    
    showMessage('Filtros limpiados', 'info');
}

async function initializeCharts() {
    try {
        await crearGraficaRespuestasEncuesta();
        await crearGraficaGenero();
        await crearGraficaCarrera();
        await crearGraficaTendencia();
        
        console.log('📊 Gráficas inicializadas');
    } catch (error) {
        console.error('Error inicializando gráficas:', error);
    }
}

async function crearGraficaRespuestasEncuesta() {
    const ctx = document.getElementById('chart-respuestas-encuesta');
    if (!ctx) return;
    
    // Destruir gráfica anterior si existe
    if (chartRespuestasEncuesta) {
        chartRespuestasEncuesta.destroy();
    }
    
    // Datos para la gráfica
    const encuestasConRespuestas = datosFiltrados.encuestas.map(encuesta => {
        const respuestas = datosFiltrados.respuestas.filter(r => r.id_encuesta === encuesta.id_encuesta);
        return {
            titulo: encuesta.titulo,
            respuestas: respuestas.length
        };
    });
    
    chartRespuestasEncuesta = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: encuestasConRespuestas.map(e => e.titulo.length > 20 ? e.titulo.substring(0, 20) + '...' : e.titulo),
            datasets: [{
                label: 'Número de Respuestas',
                data: encuestasConRespuestas.map(e => e.respuestas),
                backgroundColor: 'rgba(102, 126, 234, 0.6)',
                borderColor: 'rgba(102, 126, 234, 1)',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        stepSize: 1
                    }
                }
            }
        }
    });
}

async function crearGraficaGenero() {
    const ctx = document.getElementById('chart-genero');
    if (!ctx) return;
    
    if (chartGenero) {
        chartGenero.destroy();
    }
    
    // Contar respuestas por género
    const generos = {};
    datosFiltrados.respuestas.forEach(respuesta => {
        const alumno = datosFiltrados.alumnos.find(a => a.id_alumno === respuesta.id_alumno);
        if (alumno) {
            generos[alumno.genero] = (generos[alumno.genero] || 0) + 1;
        }
    });
    
    const colores = ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0'];
    
    chartGenero = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: Object.keys(generos),
            datasets: [{
                data: Object.values(generos),
                backgroundColor: colores.slice(0, Object.keys(generos).length),
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    position: 'bottom'
                }
            }
        }
    });
}

async function crearGraficaCarrera() {
    const ctx = document.getElementById('chart-carrera');
    if (!ctx) return;
    
    if (chartCarrera) {
        chartCarrera.destroy();
    }
    
    // Contar respuestas por carrera
    const carreras = {};
    datosFiltrados.respuestas.forEach(respuesta => {
        const alumno = datosFiltrados.alumnos.find(a => a.id_alumno === respuesta.id_alumno);
        if (alumno) {
            carreras[alumno.carrera] = (carreras[alumno.carrera] || 0) + 1;
        }
    });
    
    chartCarrera = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: Object.keys(carreras).map(c => c.length > 15 ? c.substring(0, 15) + '...' : c),
            datasets: [{
                label: 'Respuestas por Carrera',
                data: Object.values(carreras),
                backgroundColor: 'rgba(76, 192, 192, 0.6)',
                borderColor: 'rgba(76, 192, 192, 1)',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            indexAxis: 'y',
            scales: {
                x: {
                    beginAtZero: true,
                    ticks: {
                        stepSize: 1
                    }
                }
            }
        }
    });
}

async function crearGraficaTendencia() {
    const ctx = document.getElementById('chart-tendencia');
    if (!ctx) return;
    
    if (chartTendencia) {
        chartTendencia.destroy();
    }
    
    // Agrupar respuestas por fecha
    const respuestasPorFecha = {};
    datosFiltrados.respuestas.forEach(respuesta => {
        const fecha = new Date(respuesta.created_at).toLocaleDateString();
        respuestasPorFecha[fecha] = (respuestasPorFecha[fecha] || 0) + 1;
    });
    
    // Ordenar fechas
    const fechasOrdenadas = Object.keys(respuestasPorFecha).sort((a, b) => new Date(a) - new Date(b));
    
    chartTendencia = new Chart(ctx, {
        type: 'line',
        data: {
            labels: fechasOrdenadas,
            datasets: [{
                label: 'Respuestas por Día',
                data: fechasOrdenadas.map(fecha => respuestasPorFecha[fecha]),
                borderColor: 'rgba(255, 99, 132, 1)',
                backgroundColor: 'rgba(255, 99, 132, 0.2)',
                tension: 0.1,
                fill: true
            }]
        },
        options: {
            responsive: true,
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        stepSize: 1
                    }
                }
            }
        }
    });
}

async function actualizarGraficas() {
    await crearGraficaRespuestasEncuesta();
    await crearGraficaGenero();
    await crearGraficaCarrera();
    await crearGraficaTendencia();
}

function exportarDatos() {
    try {
        // Crear datos CSV
        let csvContent = "data:text/csv;charset=utf-8,";
        
        // Headers
        csvContent += "Encuesta,Fecha Respuesta,Alumno,Género,Carrera\n";
        
        // Datos
        datosFiltrados.respuestas.forEach(respuesta => {
            const encuesta = datosFiltrados.encuestas.find(e => e.id_encuesta === respuesta.id_encuesta);
            const alumno = datosFiltrados.alumnos.find(a => a.id_alumno === respuesta.id_alumno);
            
            if (encuesta && alumno) {
                const fecha = new Date(respuesta.created_at).toLocaleDateString();
                csvContent += `"${encuesta.titulo}","${fecha}","${alumno.nombre}","${alumno.genero}","${alumno.carrera}"\n`;
            }
        });
        
        // Descargar archivo
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `datos_encuestas_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        showMessage('Datos exportados correctamente', 'success');
        
    } catch (error) {
        console.error('Error exportando datos:', error);
        showMessage('Error al exportar datos: ' + error.message, 'error');
    }
}

async function cargarPreguntasAnalisis() {
    const encuestaId = document.getElementById('analisis-encuesta').value;
    const preguntaSelect = document.getElementById('analisis-pregunta');
    
    if (!encuestaId) {
        preguntaSelect.innerHTML = '<option value="">Primero seleccione una encuesta</option>';
        document.getElementById('analisis-pregunta-detalle').innerHTML = '';
        return;
    }
    
    try {
        // Cargar preguntas de la encuesta seleccionada
        let preguntas = [];
        
        if (SUPABASE_CONFIG.url === 'https://demo.supabase.co') {
            preguntas = JSON.parse(localStorage.getItem('mock_preguntas') || '[]')
                .filter(p => p.id_encuesta == encuestaId);
        } else {
            const { data } = await supabase
                .from('preguntas')
                .select('*')
                .eq('id_encuesta', encuestaId)
                .order('orden_pregunta');
            preguntas = data || [];
        }
        
        preguntaSelect.innerHTML = '<option value="">Seleccione una pregunta...</option>';
        preguntas.forEach(pregunta => {
            const option = document.createElement('option');
            option.value = pregunta.id_pregunta;
            option.textContent = pregunta.texto.length > 50 ? pregunta.texto.substring(0, 50) + '...' : pregunta.texto;
            preguntaSelect.appendChild(option);
        });
        
    } catch (error) {
        console.error('Error cargando preguntas:', error);
        showMessage('Error al cargar preguntas: ' + error.message, 'error');
    }
}

async function analizarPreguntaDetallada() {
    const preguntaId = document.getElementById('analisis-pregunta').value;
    const contenedor = document.getElementById('analisis-pregunta-detalle');
    
    if (!preguntaId) {
        contenedor.innerHTML = '';
        return;
    }
    
    try {
        // Implementar análisis detallado de pregunta específica
        contenedor.innerHTML = '<div class="loading">Cargando análisis detallado...</div>';
        
        // Esta función se puede expandir para mostrar análisis específico por pregunta
        setTimeout(() => {
            contenedor.innerHTML = `
                <div class="pregunta-analysis">
                    <h4>📊 Análisis de Pregunta Específica</h4>
                    <p>Funcionalidad en desarrollo. Aquí se mostrará el análisis detallado de la pregunta seleccionada con estadísticas específicas, distribución de respuestas y insights.</p>
                </div>
            `;
        }, 1000);
        
    } catch (error) {
        console.error('Error analizando pregunta:', error);
        contenedor.innerHTML = '<p class="error">Error al cargar el análisis de la pregunta.</p>';
    }
}

async function handleReporteChange(e) {
    const encuestaId = e.target.value;
    const reporteDiv = document.getElementById('reporte-detallado');
    
    if (!encuestaId) {
        reporteDiv.innerHTML = '';
        return;
    }
    
    try {
        await generateReporteDetallado(encuestaId);
    } catch (error) {
        console.error('Error generating reporte:', error);
        showMessage('Error al generar el reporte: ' + error.message, 'error');
    }
}

async function generateReporteDetallado(encuestaId) {
    const reporteDiv = document.getElementById('reporte-detallado');
    if (!reporteDiv) {
        console.error('Elemento reporte-detallado no encontrado');
        return;
    }
    
    reporteDiv.innerHTML = '<div class="loading"><div class="spinner"></div><p>Generando reporte...</p></div>';
    
    try {
        // En modo desarrollo, usar datos mock
        if (SUPABASE_CONFIG.url === 'https://demo.supabase.co') {
            const preguntasData = JSON.parse(localStorage.getItem('mock_preguntas') || '[]');
            const alternativasData = JSON.parse(localStorage.getItem('mock_alternativas') || '[]');
            const respuestasData = JSON.parse(localStorage.getItem('mock_respuestas') || '[]');
            
            console.log('📊 Generando reporte para encuesta ID:', encuestaId);
            console.log('📊 Preguntas disponibles:', preguntasData);
            
            // Filtrar preguntas por encuesta (convertir a números para comparación)
            const preguntasEncuesta = preguntasData.filter(p => 
                Number(p.id_encuesta) === Number(encuestaId)
            );
            
            console.log('📊 Preguntas de la encuesta:', preguntasEncuesta);
            
            if (preguntasEncuesta.length === 0) {
                reporteDiv.innerHTML = '<div class="message message-info">No hay preguntas para esta encuesta aún.</div>';
                return;
            }
            
            let reporteHTML = '<div class="reporte-detallado">';
            
            for (const pregunta of preguntasEncuesta) {
                // Obtener alternativas para esta pregunta
                const alternativas = alternativasData.filter(a => 
                    Number(a.id_pregunta) === Number(pregunta.id_pregunta)
                );
                
                // Obtener respuestas para esta pregunta
                const respuestas = respuestasData.filter(r => 
                    Number(r.id_pregunta) === Number(pregunta.id_pregunta)
                );
                
                reporteHTML += `
                    <div class="reporte-pregunta" style="background: rgba(255,255,255,0.1); padding: 20px; margin: 20px 0; border-radius: 10px;">
                        <h4 style="color: #2196F3; margin-bottom: 10px;">${pregunta.texto}</h4>
                        <p><strong>Tipo:</strong> ${getQuestionTypeLabel(pregunta.tipo_pregunta)}</p>
                        <p><strong>Total respuestas:</strong> ${respuestas.length}</p>
                `;
                
                if (pregunta.tipo_pregunta === 'open_text') {
                    // Mostrar respuestas abiertas
                    reporteHTML += '<div class="respuestas-abiertas"><h5>Respuestas:</h5>';
                    if (respuestas.length > 0) {
                        respuestas.forEach((respuesta, index) => {
                            if (respuesta.texto_respuesta_abierta) {
                                reporteHTML += `<p style="background: rgba(255,255,255,0.05); padding: 10px; margin: 5px 0; border-left: 3px solid #4CAF50;"><strong>${index + 1}:</strong> ${respuesta.texto_respuesta_abierta}</p>`;
                            }
                        });
                    } else {
                        reporteHTML += '<p style="color: #999;">No hay respuestas aún.</p>';
                    }
                    reporteHTML += '</div>';
                } else {
                    // Mostrar estadísticas para opciones múltiples
                    reporteHTML += '<div class="respuestas-chart">';
                    if (alternativas.length > 0) {
                        alternativas.forEach(alternativa => {
                            const count = respuestas.filter(r => 
                                Number(r.id_alternativa_seleccionada) === Number(alternativa.id_alternativa)
                            ).length;
                            const percentage = respuestas.length > 0 
                                ? ((count / respuestas.length) * 100).toFixed(1)
                                : 0;
                            
                            reporteHTML += `
                                <div style="margin: 10px 0; background: rgba(255,255,255,0.05); padding: 10px; border-radius: 5px;">
                                    <div style="display: flex; justify-content: space-between; align-items: center;">
                                        <span><strong>${alternativa.texto_opcion}</strong></span>
                                        <span>${count} respuestas (${percentage}%)</span>
                                    </div>
                                    <div style="background: rgba(255,255,255,0.1); height: 10px; border-radius: 5px; margin-top: 5px;">
                                        <div style="background: linear-gradient(45deg, #4CAF50, #45a049); height: 100%; width: ${percentage}%; border-radius: 5px; transition: width 0.3s ease;"></div>
                                    </div>
                                </div>
                            `;
                        });
                    } else {
                        reporteHTML += '<p style="color: #999;">No hay alternativas configuradas para esta pregunta.</p>';
                    }
                    reporteHTML += '</div>';
                }
                
                reporteHTML += '</div>';
            }
            
            reporteHTML += '</div>';
            reporteDiv.innerHTML = reporteHTML;
            console.log('📊 Reporte generado exitosamente (modo demo)');
            return;
        }
        
        // Código original para producción con Supabase real
        const { data: preguntas, error } = await supabase
            .from('preguntas')
            .select(`
                *,
                alternativas (*),
                respuestas (*)
            `)
            .eq('id_encuesta', encuestaId)
            .order('orden_pregunta');
            
        if (error) throw error;
        
        if (!preguntas || preguntas.length === 0) {
            reporteDiv.innerHTML = '<div class="message message-info">No hay preguntas para esta encuesta.</div>';
            return;
        }
        
        let reporteHTML = '<div class="reporte-detallado">';
        
        for (const pregunta of preguntas) {
            const respuestas = pregunta.respuestas || [];
            
            reporteHTML += `
                <div class="reporte-pregunta">
                    <h4>${pregunta.texto}</h4>
                    <p><strong>Tipo:</strong> ${getQuestionTypeLabel(pregunta.tipo_pregunta)}</p>
                    <p><strong>Total respuestas:</strong> ${respuestas.length}</p>
            `;
            
            if (pregunta.tipo_pregunta === 'open_text') {
                reporteHTML += '<div class="respuestas-abiertas"><h5>Respuestas:</h5>';
                if (respuestas.length > 0) {
                    respuestas.forEach((respuesta, index) => {
                        if (respuesta.texto_respuesta_abierta) {
                            reporteHTML += `<p><strong>${index + 1}:</strong> ${respuesta.texto_respuesta_abierta}</p>`;
                        }
                    });
                } else {
                    reporteHTML += '<p>No hay respuestas aún.</p>';
                }
                reporteHTML += '</div>';
            } else {
                const alternativasStats = await calculateAlternativasStats(pregunta);
                reporteHTML += '<div class="respuestas-chart">';
                if (alternativasStats && alternativasStats.length > 0) {
                    alternativasStats.forEach(stat => {
                        const percentage = respuestas.length > 0 
                            ? ((stat.count / respuestas.length) * 100).toFixed(1)
                            : 0;
                        reporteHTML += `
                            <div class="chart-bar">
                                <div class="chart-label">${stat.texto}</div>
                                <div class="chart-bar-fill" style="width: ${percentage}%"></div>
                                <div class="chart-percentage">${percentage}% (${stat.count})</div>
                            </div>
                        `;
                    });
                } else {
                    reporteHTML += '<p>No hay alternativas configuradas.</p>';
                }
                reporteHTML += '</div>';
            }
            
            reporteHTML += '</div>';
        }
        
        reporteHTML += '</div>';
        reporteDiv.innerHTML = reporteHTML;
        
    } catch (error) {
        console.error('Error generating reporte:', error);
        reporteDiv.innerHTML = `<div class="message message-error">Error al generar el reporte: ${error.message}</div>`;
        showMessage('Error al generar el reporte: ' + error.message, 'error');
    }
}

async function calculateAlternativasStats(pregunta) {
    const stats = [];
    
    for (const alternativa of pregunta.alternativas) {
        const count = pregunta.respuestas.filter(r => 
            r.id_alternativa_seleccionada === alternativa.id_alternativa
        ).length;
        
        stats.push({
            texto: alternativa.texto_opcion,
            count: count
        });
    }
    
    return stats.sort((a, b) => b.count - a.count);
}

function getQuestionTypeLabel(type) {
    const types = {
        'single_choice': 'Selección única',
        'multiple_choice': 'Selección múltiple',
        'open_text': 'Texto abierto'
    };
    return types[type] || type;
}

function viewReporte(encuestaId) {
    document.getElementById('reporte-encuesta').value = encuestaId;
    showSection('reportes');
    generateReporteDetallado(encuestaId);
}

// Dashboard Data
async function loadDashboardData() {
    try {
        await loadEstadisticasGenerales();
    } catch (error) {
        console.error('Error loading dashboard data:', error);
    }
}

// Utility Functions
function copyToClipboard(text) {
    if (navigator.clipboard) {
        navigator.clipboard.writeText(text).then(() => {
            showMessage('Enlace copiado al portapapeles!', 'success');
        }).catch(err => {
            console.error('Error copying to clipboard:', err);
            fallbackCopyToClipboard(text);
        });
    } else {
        fallbackCopyToClipboard(text);
    }
}

function fallbackCopyToClipboard(text) {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    textArea.style.top = '-999999px';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    
    try {
        document.execCommand('copy');
        showMessage('Enlace copiado al portapapeles!', 'success');
    } catch (err) {
        console.error('Fallback copy failed:', err);
        showMessage('No se pudo copiar el enlace. Cópielo manualmente.', 'error');
    }
    
    document.body.removeChild(textArea);
}

function formatDate(date) {
    if (!date) return 'Sin fecha';
    const d = new Date(date);
    return d.toLocaleDateString('es-ES', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    });
}

function formatDateTime(date) {
    if (!date) return '';
    const d = new Date(date);
    return d.toLocaleString('es-ES', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
    });
}

// Gestión de Permisos
async function loadPermisos() {
    try {
        await loadSolicitudesAdmin();
        await loadReportesGlobales();
    } catch (error) {
        console.error('Error loading permisos:', error);
        showMessage('Error al cargar la gestión de permisos: ' + error.message, 'error');
    }
}

async function loadSolicitudesAdmin() {
    // En este caso, como el super admin ya existe, no hay solicitudes pendientes
    // Pero aquí iría la lógica para cargar solicitudes de nuevos admin
    const solicitudesDiv = document.getElementById('solicitudes-admin');
    solicitudesDiv.innerHTML = `
        <div class="empty-state">
            <p>📭 No hay solicitudes pendientes de nuevos administradores</p>
            <p><small>Las solicitudes aparecerán aquí cuando se registren nuevos usuarios</small></p>
        </div>
    `;
}

async function loadReportesGlobales() {
    try {
        // En modo desarrollo, usar datos mock simplificados
        if (SUPABASE_CONFIG.url === 'https://demo.supabase.co') {
            // Datos de demostración para reportes globales
            const totalAdmins = 2; // admin + superadmin
            const totalUsuarios = 1;
            const totalEncuestasSistema = 1;
            
            document.getElementById('total-administradores').textContent = totalAdmins;
            document.getElementById('total-usuarios-sistema').textContent = totalUsuarios;
            document.getElementById('encuestas-sistema').textContent = totalEncuestasSistema;
            
            console.log('📊 Reportes globales cargados (modo demo)');
            return;
        }
        
        // Código original para producción con Supabase real
        // Cargar estadísticas globales del sistema
        const { count: totalAdmins } = await supabase
            .from('admin')
            .select('*', { count: 'exact', head: true });
            
        const { count: totalUsuarios } = await supabase
            .from('alumnos')
            .select('*', { count: 'exact', head: true });
            
        const { count: totalEncuestasSistema } = await supabase
            .from('encuestas')
            .select('*', { count: 'exact', head: true });
            
        document.getElementById('total-administradores').textContent = totalAdmins || 0;
        document.getElementById('total-usuarios-sistema').textContent = totalUsuarios || 0;
        document.getElementById('encuestas-sistema').textContent = totalEncuestasSistema || 0;
        
    } catch (error) {
        console.error('Error loading reportes globales:', error);
        // Valores de fallback en caso de error
        document.getElementById('total-administradores').textContent = '0';
        document.getElementById('total-usuarios-sistema').textContent = '0';
        document.getElementById('encuestas-sistema').textContent = '0';
    }
}

function savePermisos() {
    const permisos = {
        encuestas: document.getElementById('perm-encuestas').checked,
        reportes: document.getElementById('perm-reportes').checked,
        usuarios: document.getElementById('perm-usuarios').checked,
        config: document.getElementById('perm-config').checked
    };
    
    // Guardar en localStorage para demo (en producción iría a la BD)
    localStorage.setItem('sistemPermisos', JSON.stringify(permisos));
    
    showMessage('Permisos del sistema actualizados correctamente!', 'success');
    
    console.log('Permisos guardados:', permisos);
}

// ================================
// GESTIÓN DE SOLICITUDES DE ADMINISTRADORES
// ================================

// Cargar solicitudes de administradores
async function loadSolicitudes() {
    const loadingDiv = document.getElementById('solicitudes-loading');
    const containerDiv = document.getElementById('solicitudes-container');
    const listDiv = document.getElementById('solicitudes-list');
    
    loadingDiv.classList.remove('hidden');
    containerDiv.classList.add('hidden');
    
    try {
        const { data: solicitudes, error } = await supabase
            .from('solicitudes_admin')
            .select('*')
            .order('fecha_solicitud', { ascending: false });

        if (error) {
            console.error('❌ Error cargando solicitudes:', error);
            throw error;
        }

        loadingDiv.classList.add('hidden');
        containerDiv.classList.remove('hidden');

        if (!solicitudes || solicitudes.length === 0) {
            listDiv.innerHTML = `
                <div class="empty-solicitudes">
                    <div class="icon">📮</div>
                    <h3>No hay solicitudes</h3>
                    <p>No se encontraron solicitudes de administradores.</p>
                </div>
            `;
            return;
        }

        // Agregar event listener para filtro
        document.getElementById('filter-estado').addEventListener('change', filterSolicitudes);
        document.getElementById('refresh-solicitudes').addEventListener('click', loadSolicitudes);

        displaySolicitudes(solicitudes);

    } catch (error) {
        console.error('❌ Error:', error);
        loadingDiv.classList.add('hidden');
        containerDiv.classList.remove('hidden');
        listDiv.innerHTML = `
            <div class="error-state">
                <h3>Error al cargar solicitudes</h3>
                <p>${error.message}</p>
                <button class="btn btn-primary" onclick="loadSolicitudes()">🔄 Reintentar</button>
            </div>
        `;
    }
}

// Mostrar solicitudes en la UI
function displaySolicitudes(solicitudes) {
    const listDiv = document.getElementById('solicitudes-list');
    
    const html = solicitudes.map(solicitud => {
        const fechaSolicitud = new Date(solicitud.fecha_solicitud).toLocaleDateString('es-ES', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });

        const estadoClass = `estado-${solicitud.estado}`;
        const estadoTexto = {
            'pendiente': 'Pendiente',
            'aprobada': 'Aprobada',
            'rechazada': 'Rechazada'
        }[solicitud.estado] || solicitud.estado;

        const accionesHtml = solicitud.estado === 'pendiente' ? `
            <div class="rol-selector">
                <label for="rol-${solicitud.id_solicitud}">Asignar rol:</label>
                <select id="rol-${solicitud.id_solicitud}" class="form-control">
                    <option value="admin_encuestas">Administrador de Encuestas</option>
                    <option value="admin_reportes">Administrador de Reportes</option>
                    <option value="admin_general">Administrador General</option>
                </select>
            </div>
            <div class="solicitud-acciones">
                <button class="btn btn-success" onclick="aprobarSolicitud(${solicitud.id_solicitud})">
                    ✅ Aprobar
                </button>
                <button class="btn btn-danger" onclick="rechazarSolicitud(${solicitud.id_solicitud})">
                    ❌ Rechazar
                </button>
            </div>
        ` : `
            <div class="solicitud-acciones">
                <span class="estado-final">Estado: ${estadoTexto}</span>
                ${solicitud.fecha_respuesta ? `<small>Fecha: ${new Date(solicitud.fecha_respuesta).toLocaleDateString('es-ES')}</small>` : ''}
                ${solicitud.rol_asignado ? `<small>Rol asignado: ${getRolDisplayName(solicitud.rol_asignado)}</small>` : ''}
            </div>
        `;

        return `
            <div class="solicitud-card" data-estado="${solicitud.estado}">
                <div class="solicitud-header">
                    <div class="solicitud-info">
                        <h4>${solicitud.nombre}</h4>
                        <p><strong>Correo:</strong> ${solicitud.correo}</p>
                        <p><strong>Fecha de solicitud:</strong> ${fechaSolicitud}</p>
                    </div>
                    <div class="solicitud-estado ${estadoClass}">
                        ${estadoTexto}
                    </div>
                </div>
                
                <div class="solicitud-justificacion">
                    <h5>Justificación:</h5>
                    <p>${solicitud.justificacion}</p>
                </div>
                
                ${accionesHtml}
            </div>
        `;
    }).join('');

    listDiv.innerHTML = html;
}

// Filtrar solicitudes por estado
function filterSolicitudes() {
    const filtro = document.getElementById('filter-estado').value;
    const tarjetas = document.querySelectorAll('.solicitud-card');

    tarjetas.forEach(tarjeta => {
        const estado = tarjeta.getAttribute('data-estado');
        if (filtro === 'all' || estado === filtro) {
            tarjeta.style.display = 'block';
        } else {
            tarjeta.style.display = 'none';
        }
    });
}

// Aprobar solicitud
async function aprobarSolicitud(idSolicitud) {
    try {
        const rolSelector = document.getElementById(`rol-${idSolicitud}`);
        const rolAsignado = rolSelector.value;

        if (!rolAsignado) {
            showMessage('Por favor selecciona un rol para el nuevo administrador.', 'warning');
            return;
        }

        // 1. Obtener datos de la solicitud
        const { data: solicitud, error: solicitudError } = await supabase
            .from('solicitudes_admin')
            .select('*')
            .eq('id_solicitud', idSolicitud)
            .single();

        if (solicitudError) throw solicitudError;

        // 2. Crear nuevo administrador
        const nuevoAdmin = {
            id_admin: Date.now(), // ID temporal para mock
            nombre: solicitud.nombre,
            correo: solicitud.correo,
            contraseña: solicitud.contraseña,
            rol: rolAsignado,
            id_super_admin: currentAdmin.id,
            created_at: new Date().toISOString()
        };

        const { data: adminCreado, error: adminError } = await supabase
            .from('admin')
            .insert([nuevoAdmin])
            .select()
            .single();

        if (adminError) throw adminError;

        // 3. Actualizar solicitud como aprobada
        const { error: updateError } = await supabase
            .from('solicitudes_admin')
            .update({
                estado: 'aprobada',
                fecha_respuesta: new Date().toISOString(),
                rol_asignado: rolAsignado,
                id_super_admin: currentAdmin.id
            })
            .eq('id_solicitud', idSolicitud);

        if (updateError) throw updateError;

        showMessage(`¡Solicitud aprobada! ${solicitud.nombre} ahora es ${getRolDisplayName(rolAsignado)}.`, 'success');
        
        // Recargar solicitudes
        loadSolicitudes();

    } catch (error) {
        console.error('❌ Error aprobando solicitud:', error);
        showMessage('Error al aprobar la solicitud: ' + error.message, 'error');
    }
}

// Rechazar solicitud
async function rechazarSolicitud(idSolicitud) {
    if (!confirm('¿Estás seguro de que deseas rechazar esta solicitud?')) {
        return;
    }

    try {
        const { error } = await supabase
            .from('solicitudes_admin')
            .update({
                estado: 'rechazada',
                fecha_respuesta: new Date().toISOString(),
                id_super_admin: currentAdmin.id
            })
            .eq('id_solicitud', idSolicitud);

        if (error) throw error;

        showMessage('Solicitud rechazada.', 'info');
        
        // Recargar solicitudes
        loadSolicitudes();

    } catch (error) {
        console.error('❌ Error rechazando solicitud:', error);
        showMessage('Error al rechazar la solicitud: ' + error.message, 'error');
    }
}

// Obtener nombre display del rol
function getRolDisplayName(rol) {
    const roles = {
        'admin_encuestas': 'Administrador de Encuestas',
        'admin_reportes': 'Administrador de Reportes', 
        'admin_general': 'Administrador General'
    };
    return roles[rol] || rol;
}

// Función para asignar rol admin (cuando haya solicitudes)
async function asignarRolAdmin(userId, aprobar) {
    try {
        if (aprobar) {
            // Lógica para aprobar y asignar rol de admin
            const { error } = await supabase
                .from('admin')
                .insert({
                    id_admin: userId,
                    nombre: 'Nuevo Admin',
                    correo: 'nuevo@senati.pe',
                    rol: 'admin',
                    id_super_admin: currentAdmin.id
                });
                
            if (error) throw error;
            
            showMessage('Nuevo administrador asignado exitosamente!', 'success');
        } else {
            showMessage('Solicitud rechazada.', 'info');
        }
        
        loadSolicitudesAdmin(); // Recargar la lista
        
    } catch (error) {
        console.error('Error asignando rol admin:', error);
        showMessage('Error al procesar la solicitud: ' + error.message, 'error');
    }
}

// Function to update questions and alternatives while preserving existing data
async function updateQuestionsAndAlternatives(encuestaId, newQuestions) {
    console.log(`🔄 Iniciando actualización de preguntas para encuesta ${encuestaId}`);
    
    try {
        // Get existing questions
        const { data: existingQuestions } = await supabase
            .from('preguntas')
            .select('*')
            .eq('id_encuesta', encuestaId)
            .order('orden');
            
        console.log(`📋 Preguntas existentes: ${existingQuestions?.length || 0}`);
        console.log(`📝 Nuevas preguntas: ${newQuestions.length}`);
        
        // Create maps for easier comparison
        const existingMap = new Map();
        if (existingQuestions) {
            existingQuestions.forEach(q => existingMap.set(q.orden, q));
        }
        
        // Process each new question
        for (let i = 0; i < newQuestions.length; i++) {
            const newQuestion = newQuestions[i];
            const orden = i + 1;
            const existingQuestion = existingMap.get(orden);
            
            if (existingQuestion) {
                // Update existing question if content changed
                if (existingQuestion.texto !== newQuestion.texto || 
                    existingQuestion.tipo_pregunta !== newQuestion.tipo_pregunta) {
                    console.log(`🔄 Actualizando pregunta ${orden}`);
                    await supabase
                        .from('preguntas')
                        .update({
                            texto: newQuestion.texto,
                            tipo_pregunta: newQuestion.tipo_pregunta
                        })
                        .eq('id_pregunta', existingQuestion.id_pregunta);
                }
                
                // Update alternatives for this question
                await updateAlternativesForQuestion(existingQuestion.id_pregunta, newQuestion.alternatives, encuestaId);
                
            } else {
                // Create new question
                console.log(`➕ Creando nueva pregunta ${orden}`);
                const { data: newQuestionData } = await supabase
                    .from('preguntas')
                    .insert({
                        id_encuesta: encuestaId,
                        texto: newQuestion.texto,
                        tipo_pregunta: newQuestion.tipo_pregunta,
                        orden: orden
                    })
                    .select()
                    .single();
                
                // Create alternatives for new question
                if (newQuestion.alternatives && newQuestion.alternatives.length > 0) {
                    await saveAlternatives(newQuestionData.id_pregunta, newQuestion.alternatives, encuestaId);
                }
            }
        }
        
        // Remove questions that are no longer needed
        if (existingQuestions && existingQuestions.length > newQuestions.length) {
            for (let i = newQuestions.length; i < existingQuestions.length; i++) {
                const questionToDelete = existingQuestions[i];
                console.log(`🗑️ Eliminando pregunta sobrante: ${questionToDelete.texto}`);
                
                // Delete alternatives first
                await supabase
                    .from('alternativas')
                    .delete()
                    .eq('id_pregunta', questionToDelete.id_pregunta);
                    
                // Delete question
                await supabase
                    .from('preguntas')
                    .delete()
                    .eq('id_pregunta', questionToDelete.id_pregunta);
            }
        }
        
        console.log('✅ Actualización de preguntas completada');
        
    } catch (error) {
        console.error('❌ Error actualizando preguntas:', error);
        throw error;
    }
}

// Function to update alternatives for a specific question
async function updateAlternativesForQuestion(questionId, newAlternatives, encuestaId) {
    if (!newAlternatives || newAlternatives.length === 0) {
        // Delete all alternatives if none provided
        await supabase
            .from('alternativas')
            .delete()
            .eq('id_pregunta', questionId);
        return;
    }
    
    // Get existing alternatives
    const { data: existingAlternatives } = await supabase
        .from('alternativas')
        .select('*')
        .eq('id_pregunta', questionId)
        .order('orden');
    
    console.log(`🔄 Actualizando alternativas - Existentes: ${existingAlternatives?.length || 0}, Nuevas: ${newAlternatives.length}`);
    
    // Update or create alternatives
    for (let i = 0; i < newAlternatives.length; i++) {
        const newAlt = newAlternatives[i];
        const orden = i + 1;
        const existingAlt = existingAlternatives && existingAlternatives[i];
        
        if (existingAlt) {
            // Update existing alternative if content changed
            if (existingAlt.texto_opcion !== newAlt.texto_opcion) {
                console.log(`🔄 Actualizando alternativa ${orden}`);
                await supabase
                    .from('alternativas')
                    .update({
                        texto_opcion: newAlt.texto_opcion
                    })
                    .eq('id_alternativa', existingAlt.id_alternativa);
            }
        } else {
            // Create new alternative
            console.log(`➕ Creando nueva alternativa ${orden}`);
            await supabase
                .from('alternativas')
                .insert({
                    id_pregunta: questionId,
                    id_encuesta: encuestaId,
                    texto_opcion: newAlt.texto_opcion,
                    orden: orden
                });
        }
    }
    
    // Remove alternatives that are no longer needed
    if (existingAlternatives && existingAlternatives.length > newAlternatives.length) {
        for (let i = newAlternatives.length; i < existingAlternatives.length; i++) {
            const altToDelete = existingAlternatives[i];
            console.log(`🗑️ Eliminando alternativa sobrante: ${altToDelete.texto_opcion}`);
            await supabase
                .from('alternativas')
                .delete()
                .eq('id_alternativa', altToDelete.id_alternativa);
        }
    }
}

// Exponer función de prueba globalmente
window.testMockSystem = testMockSystem;
