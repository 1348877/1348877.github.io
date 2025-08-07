// Archivo de validación para GitHub Pages
// Detecta problemas comunes y los reporta a la consola

console.log('🔍 VALIDACIÓN GITHUB PAGES - Iniciando diagnóstico...');

// 1. Verificar si los scripts se cargan correctamente
function verificarScripts() {
    console.log('📋 Verificando carga de scripts...');
    
    // Verificar config.js
    try {
        if (typeof APP_CONFIG !== 'undefined') {
            console.log('✅ config.js cargado correctamente');
            console.log('📧 Admin email configurado:', APP_CONFIG.adminEmail);
        } else {
            console.error('❌ config.js NO cargado - problema de ruta');
        }
    } catch (e) {
        console.error('❌ Error al verificar config.js:', e);
    }
    
    // Verificar Supabase
    try {
        if (typeof supabase !== 'undefined') {
            console.log('✅ Supabase SDK cargado correctamente');
        } else {
            console.error('❌ Supabase SDK NO cargado');
        }
    } catch (e) {
        console.error('❌ Error al verificar Supabase:', e);
    }
}

// 2. Verificar rutas de archivos
function verificarRutas() {
    console.log('🗂️ Verificando rutas de archivos...');
    
    // Detectar si estamos en GitHub Pages
    const esGitHubPages = window.location.hostname.includes('github.io');
    const esLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    
    console.log('🌐 Entorno detectado:', {
        'GitHub Pages': esGitHubPages,
        'Local': esLocal,
        'Hostname': window.location.hostname,
        'Pathname': window.location.pathname
    });
    
    // Verificar archivos CSS
    const linkElements = document.querySelectorAll('link[rel="stylesheet"]');
    linkElements.forEach((link, index) => {
        const href = link.getAttribute('href');
        console.log(`📄 CSS ${index + 1}:`, href);
        
        // Intentar cargar para verificar
        fetch(href).then(response => {
            if (response.ok) {
                console.log(`✅ CSS cargado: ${href}`);
            } else {
                console.error(`❌ CSS falló: ${href} (${response.status})`);
            }
        }).catch(error => {
            console.error(`❌ CSS error: ${href}`, error);
        });
    });
}

// 3. Verificar credenciales de login
function verificarCredenciales() {
    console.log('🔐 Verificando configuración de credenciales...');
    
    try {
        if (typeof APP_CONFIG !== 'undefined') {
            console.log('📧 Email admin:', APP_CONFIG.adminEmail);
            console.log('📧 Email superadmin:', APP_CONFIG.superAdminEmail);
            console.log('🔑 Passwords configurados:', {
                admin: !!APP_CONFIG.adminPassword,
                superadmin: !!APP_CONFIG.superAdminPassword
            });
        }
    } catch (e) {
        console.error('❌ Error verificando credenciales:', e);
    }
}

// 4. Función de test de login
function testLogin(email, password) {
    console.log(`🧪 Probando login con: ${email}`);
    
    try {
        if (typeof APP_CONFIG === 'undefined') {
            console.error('❌ APP_CONFIG no disponible - config.js no cargado');
            return false;
        }
        
        const isAdmin = email === APP_CONFIG.adminEmail && password === APP_CONFIG.adminPassword;
        const isSuperAdmin = email === APP_CONFIG.superAdminEmail && password === APP_CONFIG.superAdminPassword;
        
        if (isAdmin || isSuperAdmin) {
            console.log('✅ Credenciales válidas');
            return true;
        } else {
            console.log('❌ Credenciales inválidas');
            return false;
        }
    } catch (e) {
        console.error('❌ Error en test de login:', e);
        return false;
    }
}

// 5. Ejecutar todas las verificaciones
function ejecutarDiagnostico() {
    console.log('🚀 INICIANDO DIAGNÓSTICO COMPLETO');
    console.log('=======================================');
    
    setTimeout(() => {
        verificarScripts();
        verificarRutas();
        verificarCredenciales();
        
        console.log('=======================================');
        console.log('✅ DIAGNÓSTICO COMPLETADO');
        console.log('💡 Para probar login manualmente:');
        console.log('   testLogin("superadmin@senati.pe", "superadmin123")');
        console.log('   testLogin("admin@senati.pe", "admin123")');
    }, 1000);
}

// Auto-ejecutar diagnóstico
document.addEventListener('DOMContentLoaded', ejecutarDiagnostico);

// Exportar funciones para uso manual
window.verificarScripts = verificarScripts;
window.verificarRutas = verificarRutas;
window.verificarCredenciales = verificarCredenciales;
window.testLogin = testLogin;
window.ejecutarDiagnostico = ejecutarDiagnostico;
