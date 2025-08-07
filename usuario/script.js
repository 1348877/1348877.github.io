// Script principal para la interfaz de usuario
let currentEncuesta = null;
let currentPreguntas = [];
let userResponses = {};
let sessionId = null;

// Inicialización
document.addEventListener('DOMContentLoaded', function() {
    // Inicializar Sentry
    const sentryActive = initializeSentry();
    if (sentryActive) {
        console.log('✅ Sentry activo en usuario');
        captureSentryMessage('Usuario - Sistema cargado', 'info', {
            page: 'usuario',
            timestamp: new Date().toISOString()
        });
    }
    
    // Asegurar que el modal esté oculto al inicio
    const reviewModal = document.getElementById('review-modal');
    if (reviewModal) {
        reviewModal.classList.add('hidden');
    }
    
    // Usar la función de config.js que inicializa supabase
    const supabaseClient = initializeSupabase();
    if (!supabaseClient) {
        showMessage('Error: No se pudo conectar con la base de datos.', 'error');
        captureSentryError(new Error('No se pudo conectar con la base de datos'), {
            page: 'usuario',
            action: 'database_connection'
        });
        return;
    }
    
    sessionId = generateSessionId();
    const encuestaId = getEncuestaIdFromURL();
    
    if (!encuestaId) {
        console.log('❌ No se proporcionó ID de encuesta, redirigiendo a lista de encuestas');
        showNotFound();
        // Mostrar enlace a lista de encuestas en lugar de error
        setTimeout(() => {
            window.location.href = 'encuestas.html';
        }, 2000);
        return;
    }
    
    initializeEventListeners();
    loadEncuesta(encuestaId);
});

// Event Listeners
function initializeEventListeners() {
    document.getElementById('respuestas-form').addEventListener('submit', handleSubmitForm);
    document.getElementById('review-btn').addEventListener('click', showReviewModal);
    
    // Close modal when clicking outside
    document.getElementById('review-modal').addEventListener('click', function(e) {
        if (e.target === this) {
            closeReviewModal();
        }
    });
    
    // Character counter for text areas
    document.addEventListener('input', function(e) {
        if (e.target.classList.contains('open-text-answer')) {
            updateCharCounter(e.target);
        }
    });
    
    // Auto-save responses
    document.addEventListener('change', function(e) {
        if (e.target.classList.contains('alternative-input') || 
            e.target.classList.contains('open-text-answer')) {
            saveUserResponse(e.target);
            updateProgress();
        }
    });
}

// URL and Navigation
function getEncuestaIdFromURL() {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('id');
}

// Load Encuesta
async function loadEncuesta(encuestaId) {
    try {
        showSection('loading');
        
        // Convertir el ID a número para comparación consistente
        const numericEncuestaId = Number(encuestaId);
        if (isNaN(numericEncuestaId)) {
            throw new Error('ID de encuesta inválido');
        }
        
        console.log(`🔍 Cargando encuesta ID: ${numericEncuestaId}`);
        
        // En modo desarrollo, usar sistema mock persistente
        if (SUPABASE_CONFIG.url === 'https://demo.supabase.co') {
            // Obtener la encuesta específica por ID
            const { data: encuesta, error: encuestaError } = await supabase
                .from('encuestas')
                .select('*')
                .eq('id_encuesta', numericEncuestaId)
                .eq('activa', true)
                .single();
                
            if (encuestaError || !encuesta) {
                console.error('❌ Error cargando encuesta:', encuestaError);
                throw new Error('Encuesta no encontrada o inactiva');
            }
            
            console.log('✅ Encuesta encontrada:', encuesta);
            
            // Obtener las preguntas con alternativas
            const { data: preguntas, error: preguntasError } = await supabase
                .from('preguntas')
                .select('*, alternativas (*)')
                .eq('id_encuesta', numericEncuestaId)
                .order('orden_pregunta');
                
            if (preguntasError) {
                console.error('❌ Error cargando preguntas:', preguntasError);
                throw preguntasError;
            }
            
            console.log('✅ Preguntas encontradas:', preguntas?.length || 0);
            
            currentEncuesta = encuesta;
            currentPreguntas = preguntas || [];
            
            renderEncuesta();
            showSection('encuesta');
            return;
        }
        
        // Código original para producción con Supabase real
        // Get encuesta data
        const { data: encuesta, error: encuestaError } = await supabase
            .from('encuestas')
            .select('*')
            .eq('id_encuesta', encuestaId)
            .eq('activa', true)
            .single();
            
        if (encuestaError || !encuesta) {
            throw new Error('Encuesta no encontrada o inactiva');
        }
        
        // Get questions with alternatives
        const { data: preguntas, error: preguntasError } = await supabase
            .from('preguntas')
            .select(`
                *,
                alternativas (*)
            `)
            .eq('id_encuesta', encuestaId)
            .order('orden_pregunta');
            
        if (preguntasError) {
            throw preguntasError;
        }
        
        if (!preguntas || preguntas.length === 0) {
            throw new Error('Esta encuesta no tiene preguntas configuradas');
        }
        
        currentEncuesta = encuesta;
        currentPreguntas = preguntas;
        
        renderEncuesta();
        showSection('encuesta');
        
    } catch (error) {
        console.error('Error loading encuesta:', error);
        showNotFound();
    }
}

// Render Encuesta
function renderEncuesta() {
    // Update header
    document.getElementById('encuesta-titulo').textContent = currentEncuesta.titulo;
    document.getElementById('encuesta-descripcion').textContent = currentEncuesta.descripcion || '';
    document.getElementById('total-preguntas').textContent = `${currentPreguntas.length} pregunta${currentPreguntas.length !== 1 ? 's' : ''}`;
    
    // Estimate time (1 minute per 2 questions, minimum 2 minutes)
    const estimatedTime = Math.max(2, Math.ceil(currentPreguntas.length / 2));
    document.getElementById('tiempo-estimado').textContent = `${estimatedTime} min`;
    
    // Render questions
    const container = document.getElementById('questions-container');
    container.innerHTML = '';
    
    currentPreguntas.forEach((pregunta, index) => {
        const questionElement = createQuestionElement(pregunta, index + 1);
        container.appendChild(questionElement);
    });
    
    updateProgress();
}

// Create Question Element
function createQuestionElement(pregunta, questionNumber) {
    const templateId = `${pregunta.tipo_pregunta.replace('_', '-')}-template`;
    const template = document.getElementById(templateId);
    
    if (!template) {
        console.error('Template not found for question type:', pregunta.tipo_pregunta);
        return document.createElement('div');
    }
    
    const questionElement = template.content.cloneNode(true);
    const questionCard = questionElement.querySelector('.question-card');
    
    // Set question data
    questionCard.setAttribute('data-question-id', pregunta.id_pregunta);
    questionCard.querySelector('.question-text').textContent = pregunta.texto;
    questionCard.querySelector('.question-number').textContent = `${questionNumber}/${currentPreguntas.length}`;
    
    // Handle different question types
    switch (pregunta.tipo_pregunta) {
        case 'single_choice':
            renderSingleChoiceAlternatives(questionCard, pregunta);
            break;
        case 'multiple_choice':
            renderMultipleChoiceAlternatives(questionCard, pregunta);
            break;
        case 'open_text':
            setupOpenTextQuestion(questionCard, pregunta);
            break;
    }
    
    return questionElement;
}

// Render Single Choice Alternatives
function renderSingleChoiceAlternatives(questionCard, pregunta) {
    const container = questionCard.querySelector('.alternatives-container');
    const template = document.getElementById('radio-alternative-template');
    
    pregunta.alternativas.forEach((alternativa, index) => {
        const altElement = template.content.cloneNode(true);
        const input = altElement.querySelector('.alternative-input');
        const label = altElement.querySelector('.alternative-label');
        const altItem = altElement.querySelector('.alternative-item');
        
        const inputId = `q${pregunta.id_pregunta}_a${alternativa.id_alternativa}`;
        input.id = inputId;
        input.name = `question_${pregunta.id_pregunta}`;
        input.value = alternativa.id_alternativa;
        
        label.setAttribute('for', inputId);
        label.textContent = alternativa.texto_opcion;
        
        // Add click handler for visual feedback
        altItem.addEventListener('click', function(e) {
            if (e.target !== input) {
                input.checked = true;
                input.dispatchEvent(new Event('change', { bubbles: true }));
            }
            updateAlternativeSelection(questionCard);
        });
        
        input.addEventListener('change', function() {
            updateAlternativeSelection(questionCard);
        });
        
        container.appendChild(altElement);
    });
}

// Render Multiple Choice Alternatives
function renderMultipleChoiceAlternatives(questionCard, pregunta) {
    const container = questionCard.querySelector('.alternatives-container');
    const template = document.getElementById('checkbox-alternative-template');
    
    pregunta.alternativas.forEach((alternativa, index) => {
        const altElement = template.content.cloneNode(true);
        const input = altElement.querySelector('.alternative-input');
        const label = altElement.querySelector('.alternative-label');
        const altItem = altElement.querySelector('.alternative-item');
        
        const inputId = `q${pregunta.id_pregunta}_a${alternativa.id_alternativa}`;
        input.id = inputId;
        input.name = `question_${pregunta.id_pregunta}[]`;
        input.value = alternativa.id_alternativa;
        
        label.setAttribute('for', inputId);
        label.textContent = alternativa.texto_opcion;
        
        // Add click handler for visual feedback
        altItem.addEventListener('click', function(e) {
            if (e.target !== input) {
                input.checked = !input.checked;
                input.dispatchEvent(new Event('change', { bubbles: true }));
            }
            updateAlternativeSelection(questionCard);
        });
        
        input.addEventListener('change', function() {
            updateAlternativeSelection(questionCard);
        });
        
        container.appendChild(altElement);
    });
}

// Setup Open Text Question
function setupOpenTextQuestion(questionCard, pregunta) {
    const textarea = questionCard.querySelector('.open-text-answer');
    textarea.setAttribute('data-question-id', pregunta.id_pregunta);
    
    // Initialize character counter
    updateCharCounter(textarea);
}

// Update Alternative Selection Visual
function updateAlternativeSelection(questionCard) {
    const alternatives = questionCard.querySelectorAll('.alternative-item');
    
    alternatives.forEach(alt => {
        const input = alt.querySelector('.alternative-input');
        if (input.checked) {
            alt.classList.add('selected');
        } else {
            alt.classList.remove('selected');
        }
    });
    
    // Mark question as completed if answered
    updateQuestionCompletionStatus(questionCard);
}

// Update Question Completion Status
function updateQuestionCompletionStatus(questionCard) {
    const questionId = questionCard.getAttribute('data-question-id');
    const questionType = questionCard.getAttribute('data-question-type');
    let isCompleted = false;
    
    switch (questionType) {
        case 'single_choice':
            const radioChecked = questionCard.querySelector('.alternative-input:checked');
            isCompleted = !!radioChecked;
            break;
        case 'multiple_choice':
            const checkboxChecked = questionCard.querySelector('.alternative-input:checked');
            isCompleted = !!checkboxChecked;
            break;
        case 'open_text':
            const textarea = questionCard.querySelector('.open-text-answer');
            isCompleted = textarea.value.trim().length > 0;
            break;
    }
    
    if (isCompleted) {
        questionCard.classList.add('completed');
        questionCard.classList.remove('invalid');
    } else {
        questionCard.classList.remove('completed');
    }
}

// Character Counter
function updateCharCounter(textarea) {
    const charCount = textarea.value.length;
    const maxChars = 1000;
    const counter = textarea.closest('.question-body').querySelector('.char-count');
    const charCounter = textarea.closest('.question-body').querySelector('.char-counter');
    
    if (counter) {
        counter.textContent = charCount;
        
        // Update counter styling
        charCounter.classList.remove('warning', 'error');
        if (charCount > maxChars * 0.8) {
            charCounter.classList.add('warning');
        }
        if (charCount > maxChars) {
            charCounter.classList.add('error');
            textarea.value = textarea.value.substring(0, maxChars);
            counter.textContent = maxChars;
        }
    }
    
    // Update question completion
    const questionCard = textarea.closest('.question-card');
    updateQuestionCompletionStatus(questionCard);
}

// Save User Response
function saveUserResponse(input) {
    const questionCard = input.closest('.question-card');
    const questionId = questionCard.getAttribute('data-question-id');
    const questionType = questionCard.getAttribute('data-question-type');
    
    if (!userResponses[questionId]) {
        userResponses[questionId] = {
            questionId: questionId,
            questionType: questionType,
            questionText: questionCard.querySelector('.question-text').textContent,
            response: null
        };
    }
    
    switch (questionType) {
        case 'single_choice':
            const selectedRadio = questionCard.querySelector('.alternative-input:checked');
            if (selectedRadio) {
                const label = questionCard.querySelector(`label[for="${selectedRadio.id}"]`);
                userResponses[questionId].response = {
                    alternativeId: selectedRadio.value,
                    alternativeText: label.textContent
                };
            } else {
                userResponses[questionId].response = null;
            }
            break;
            
        case 'multiple_choice':
            const selectedCheckboxes = questionCard.querySelectorAll('.alternative-input:checked');
            if (selectedCheckboxes.length > 0) {
                userResponses[questionId].response = Array.from(selectedCheckboxes).map(cb => {
                    const label = questionCard.querySelector(`label[for="${cb.id}"]`);
                    return {
                        alternativeId: cb.value,
                        alternativeText: label.textContent
                    };
                });
            } else {
                userResponses[questionId].response = null;
            }
            break;
            
        case 'open_text':
            const textValue = input.value.trim();
            userResponses[questionId].response = textValue || null;
            break;
    }
}

// Update Progress
function updateProgress() {
    const totalQuestions = currentPreguntas.length;
    const completedQuestions = Object.values(userResponses).filter(r => r.response !== null).length;
    const percentage = totalQuestions > 0 ? Math.round((completedQuestions / totalQuestions) * 100) : 0;
    
    document.getElementById('progreso-texto').textContent = `${completedQuestions}/${totalQuestions}`;
    document.getElementById('progreso-porcentaje').textContent = `${percentage}%`;
    document.getElementById('progress-fill').style.width = `${percentage}%`;
}

// Form Validation
function validateForm() {
    let isValid = true;
    const questionCards = document.querySelectorAll('.question-card');
    
    questionCards.forEach(questionCard => {
        const questionId = questionCard.getAttribute('data-question-id');
        const questionType = questionCard.getAttribute('data-question-type');
        const response = userResponses[questionId]?.response;
        
        // Check if required question is answered
        const pregunta = currentPreguntas.find(p => p.id_pregunta.toString() === questionId);
        if (pregunta && pregunta.requerida && (!response || 
            (Array.isArray(response) && response.length === 0) ||
            (typeof response === 'string' && response.trim() === ''))) {
            
            questionCard.classList.add('invalid');
            isValid = false;
            
            // Scroll to first invalid question
            if (isValid === false) {
                questionCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        } else {
            questionCard.classList.remove('invalid');
        }
    });
    
    return isValid;
}

// Submit Form
async function handleSubmitForm(e) {
    e.preventDefault();
    
    // Collect all current responses
    const questionCards = document.querySelectorAll('.question-card');
    questionCards.forEach(questionCard => {
        const inputs = questionCard.querySelectorAll('.alternative-input, .open-text-answer');
        inputs.forEach(input => {
            if (input.type === 'radio' || input.type === 'checkbox') {
                if (input.checked) {
                    saveUserResponse(input);
                }
            } else {
                saveUserResponse(input);
            }
        });
    });
    
    if (!validateForm()) {
        showErrorSection('Por favor, completa todas las preguntas obligatorias antes de enviar.');
        return;
    }
    
    const submitBtn = document.getElementById('submit-btn');
    submitBtn.classList.add('submitting');
    submitBtn.disabled = true;
    
    try {
        // Save user info if provided
        let userId = null;
        const userInfo = collectUserInfo();
        if (userInfo.nombre || userInfo.correo) {
            userId = await saveUserInfo(userInfo);
        }
        
        // Save responses
        await saveResponses(userId);
        
        // ¿SON CORRECTOS LOS DATOS? -> SÍ -> REGISTRA
        showSuccessSection();
        
    } catch (error) {
        console.error('Error submitting form:', error);
        // ¿SON CORRECTOS LOS DATOS? -> NO -> NO SE ENVÍA
        showErrorSection('Error al procesar tus respuestas: ' + error.message);
    } finally {
        submitBtn.classList.remove('submitting');
        submitBtn.disabled = false;
    }
}

// Collect User Info
function collectUserInfo() {
    return {
        nombre: document.getElementById('user-nombre').value.trim(),
        correo: document.getElementById('user-correo').value.trim(),
        carrera: document.getElementById('user-carrera').value.trim(),
        genero: document.getElementById('user-genero').value
    };
}

// Save User Info
async function saveUserInfo(userInfo) {
    if (!userInfo.nombre && !userInfo.correo) {
        return null;
    }
    
    const userId = Date.now();
    
    const { error } = await supabase
        .from('alumnos')
        .insert({
            id_alumno: userId,
            nombre: userInfo.nombre || 'Anónimo',
            genero: userInfo.genero || null,
            carrera: userInfo.carrera || null,
            correo: userInfo.correo || null
        });
        
    if (error) {
        console.error('Error saving user info:', error);
        // Don't throw error, user info is optional
    }
    
    return userId;
}

// Save Responses
async function saveResponses(userId) {
    const responses = [];
    
    Object.values(userResponses).forEach(userResponse => {
        if (!userResponse.response) return;
        
        const pregunta = currentPreguntas.find(p => p.id_pregunta.toString() === userResponse.questionId);
        if (!pregunta) return;
        
        switch (userResponse.questionType) {
            case 'single_choice':
                responses.push({
                    id_respuesta: Date.now() + Math.random(),
                    fecha_respuesta: new Date().toISOString(),
                    id_alumno: userId,
                    id_pregunta: userResponse.questionId,
                    id_alternativa_seleccionada: userResponse.response.alternativeId,
                    session_id: sessionId
                });
                break;
                
            case 'multiple_choice':
                userResponse.response.forEach(alt => {
                    responses.push({
                        id_respuesta: Date.now() + Math.random(),
                        fecha_respuesta: new Date().toISOString(),
                        id_alumno: userId,
                        id_pregunta: userResponse.questionId,
                        id_alternativa_seleccionada: alt.alternativeId,
                        session_id: sessionId
                    });
                });
                break;
                
            case 'open_text':
                responses.push({
                    id_respuesta: Date.now() + Math.random(),
                    fecha_respuesta: new Date().toISOString(),
                    texto_respuesta_abierta: userResponse.response,
                    id_alumno: userId,
                    id_pregunta: userResponse.questionId,
                    session_id: sessionId
                });
                break;
        }
    });
    
    if (responses.length === 0) {
        throw new Error('No hay respuestas para guardar');
    }
    
    const { error } = await supabase
        .from('respuestas')
        .insert(responses);
        
    if (error) {
        throw error;
    }
}

// Show Review Modal
function showReviewModal() {
    // Collect current responses
    const questionCards = document.querySelectorAll('.question-card');
    questionCards.forEach(questionCard => {
        const inputs = questionCard.querySelectorAll('.alternative-input, .open-text-answer');
        inputs.forEach(input => {
            if (input.type === 'radio' || input.type === 'checkbox') {
                if (input.checked) {
                    saveUserResponse(input);
                }
            } else {
                saveUserResponse(input);
            }
        });
    });
    
    const reviewContent = document.getElementById('review-content');
    reviewContent.innerHTML = '';
    
    currentPreguntas.forEach((pregunta, index) => {
        const response = userResponses[pregunta.id_pregunta];
        const reviewDiv = document.createElement('div');
        reviewDiv.className = 'review-question';
        
        reviewDiv.innerHTML = `
            <h5>Pregunta ${index + 1}: ${pregunta.texto}</h5>
            <div class="review-answer ${!response?.response ? 'empty' : ''}">
                ${formatResponseForReview(response, pregunta.tipo_pregunta)}
            </div>
        `;
        
        reviewContent.appendChild(reviewDiv);
    });
    
    document.getElementById('review-modal').classList.remove('hidden');
}

// Format Response for Review
function formatResponseForReview(response, questionType) {
    if (!response?.response) {
        return '❌ Sin respuesta';
    }
    
    switch (questionType) {
        case 'single_choice':
            return `✅ ${response.response.alternativeText}`;
        case 'multiple_choice':
            return response.response.map(alt => `✅ ${alt.alternativeText}`).join('<br>');
        case 'open_text':
            return response.response;
        default:
            return 'Respuesta registrada';
    }
}

// Close Review Modal
function closeReviewModal() {
    document.getElementById('review-modal').classList.add('hidden');
}

// Show Sections
function showSection(sectionName) {
    const sections = ['loading', 'not-found', 'encuesta', 'success', 'error'];
    
    sections.forEach(section => {
        const element = document.getElementById(`${section}-section`);
        if (section === sectionName) {
            element.classList.remove('hidden');
        } else {
            element.classList.add('hidden');
        }
    });
}

// Show Not Found
function showNotFound() {
    showSection('not-found');
}

// Show Success Section
function showSuccessSection() {
    document.getElementById('fecha-envio').textContent = formatDateTime(new Date());
    showSection('success');
    
    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Show Error Section
function showErrorSection(errorMessage) {
    document.getElementById('error-message').textContent = errorMessage;
    showSection('error');
    
    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Retry Submit (¿DESEA REINTENTAR? -> SÍ)
function retrySubmit() {
    showSection('encuesta');
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Cancel Submit (¿DESEA REINTENTAR? -> NO -> TERMINADOR)
function cancelSubmit() {
    if (confirm('¿Estás seguro de que deseas salir sin enviar la encuesta?')) {
        window.close();
    }
}

// Utility Functions
function formatDateTime(date) {
    return date.toLocaleString('es-ES', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
    });
}
