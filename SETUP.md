# Instrucciones para configurar el proyecto

## 🔧 Configuración de Supabase

### 1. Crear cuenta en Supabase
1. Ve a [supabase.com](https://supabase.com)
2. Crea una cuenta gratuita
3. Crea un nuevo proyecto

### 2. Configurar la base de datos
1. Ve a la sección "SQL Editor" en tu proyecto de Supabase
2. Copia y pega el contenido completo del archivo `database.sql`
3. Ejecuta el script para crear todas las tablas

### 3. Configurar las claves
1. Ve a Settings > API en tu proyecto de Supabase
2. Copia la "URL" del proyecto
3. Copia la "anon/public" key
4. Edita el archivo `config.js` y reemplaza:
   - `TU_SUPABASE_URL_AQUI` con tu URL del proyecto
   - `TU_SUPABASE_ANON_KEY_AQUI` con tu clave pública

## 🚀 Subir a GitHub

### 1. Crear repositorio
```bash
git init
git add .
git commit -m "Initial commit: Sistema de encuestas completo"
git branch -M main
git remote add origin https://github.com/TU_USUARIO/sistema-encuestas.git
git push -u origin main
```

### 2. Activar GitHub Pages
1. Ve a Settings en tu repositorio
2. Busca la sección "Pages"
3. En "Source" selecciona "Deploy from a branch"
4. Selecciona la rama "main" y folder "/ (root)"
5. Guarda los cambios

### 3. URLs de acceso
Después de unos minutos, tendrás acceso a:
- **Admin**: `https://TU_USUARIO.github.io/sistema-encuestas/admin/`
- **Usuario**: `https://TU_USUARIO.github.io/sistema-encuestas/usuario/?id=ID_ENCUESTA`

## 🔐 Credenciales por defecto

- **Email**: admin@sistema.com
- **Contraseña**: admin123

**⚠️ Importante**: Cambia estas credenciales en el archivo `config.js` antes de usar en producción.

## 📊 Flujo de uso

### Como Administrador:
1. Accede al panel admin con las credenciales
2. Crea una nueva encuesta con preguntas
3. Copia el enlace público de la encuesta
4. Comparte el enlace con los usuarios
5. Ve los reportes en tiempo real

### Como Usuario:
1. Accede al enlace de la encuesta
2. Responde todas las preguntas
3. Envía la encuesta
4. Recibe confirmación de envío

## 🛠️ Características implementadas

### Panel Administrativo
- ✅ Login de administrador
- ✅ Crear/editar/eliminar encuestas
- ✅ Gestionar preguntas (opción múltiple, única, texto abierto)
- ✅ Activar/desactivar encuestas
- ✅ Generar enlaces públicos
- ✅ Ver reportes y estadísticas en tiempo real
- ✅ Dashboard con métricas generales

### Interfaz de Usuario
- ✅ Responder encuestas de forma intuitiva
- ✅ Barra de progreso
- ✅ Validación de campos obligatorios
- ✅ Revisión de respuestas antes de enviar
- ✅ Información opcional del usuario
- ✅ Confirmación de envío
- ✅ Diseño responsive para móviles

### Base de Datos
- ✅ Estructura relacional completa
- ✅ Row Level Security (RLS)
- ✅ Soporte para usuarios anónimos
- ✅ Timestamps automáticos
- ✅ Validaciones de integridad

## 🎨 Personalización

Puedes personalizar los colores editando el archivo `assets/common.css`:

```css
/* Cambiar colores principales */
:root {
  --primary-color: #667eea;
  --secondary-color: #764ba2;
  --success-color: #28a745;
  --warning-color: #ffc107;
  --danger-color: #dc3545;
}
```

## 🔧 Troubleshooting

### Error de conexión a Supabase
- Verifica que las URLs y claves en `config.js` sean correctas
- Asegúrate de que las políticas RLS estén configuradas

### Encuesta no se carga
- Verifica que la encuesta esté marcada como "activa"
- Revisa que el ID en la URL sea correcto

### No se pueden enviar respuestas
- Verifica las políticas RLS en Supabase
- Revisa la consola del navegador para errores

## 📱 Compatibilidad

- ✅ Chrome/Edge/Firefox/Safari
- ✅ Dispositivos móviles
- ✅ Tablets
- ✅ Funciona sin JavaScript (limitado)

## 🔄 Actualizaciones futuras

Para agregar nuevas funcionalidades:
1. Clona el repositorio localmente
2. Haz tus cambios
3. Haz commit y push
4. GitHub Pages se actualiza automáticamente
