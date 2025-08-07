-- Script SQL para crear el sistema de encuestas
-- Ejecutar en Supabase SQL Editor

-- Tabla de super usuarios
CREATE TABLE super_su (
    id_super INT PRIMARY KEY,
    nombre VARCHAR(50),
    correo VARCHAR(50),
    contraseña VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de administradores
CREATE TABLE admin (
    id_admin INT PRIMARY KEY,
    nombre VARCHAR(100),
    correo VARCHAR(100),
    contraseña VARCHAR(255),
    rol VARCHAR(50),
    id_super_admin INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (id_super_admin) REFERENCES super_su(id_super)
);

-- Tabla de alumnos/usuarios
CREATE TABLE alumnos (
    id_alumno INT PRIMARY KEY,
    nombre VARCHAR(100),
    genero VARCHAR(50),
    carrera VARCHAR(100),
    correo VARCHAR(17),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de encuestas
CREATE TABLE encuestas (
    id_encuesta INT PRIMARY KEY,
    titulo VARCHAR(255),
    descripcion TEXT,
    fecha DATE,
    activa BOOLEAN DEFAULT true,
    id_admin INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (id_admin) REFERENCES admin(id_admin)
);

-- Tabla de preguntas
CREATE TABLE preguntas (
    id_pregunta INT PRIMARY KEY,
    texto TEXT,
    tipo_pregunta VARCHAR(50) DEFAULT 'multiple_choice', -- 'multiple_choice', 'open_text', 'single_choice'
    requerida BOOLEAN DEFAULT true,
    orden_pregunta INT,
    id_encuesta INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (id_encuesta) REFERENCES encuestas(id_encuesta)
);

-- Tabla de alternativas
CREATE TABLE alternativas (
    id_alternativa INT PRIMARY KEY,
    texto_opcion VARCHAR(255),
    orden_alternativa INT,
    id_pregunta INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (id_pregunta) REFERENCES preguntas(id_pregunta)
);

-- Tabla de respuestas
CREATE TABLE respuestas (
    id_respuesta INT PRIMARY KEY,
    fecha_respuesta TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    texto_respuesta_abierta TEXT,
    id_alumno INT,
    id_pregunta INT,
    id_alternativa_seleccionada INT,
    session_id VARCHAR(255), -- Para usuarios anónimos
    FOREIGN KEY (id_alumno) REFERENCES alumnos(id_alumno),
    FOREIGN KEY (id_pregunta) REFERENCES preguntas(id_pregunta),
    FOREIGN KEY (id_alternativa_seleccionada) REFERENCES alternativas(id_alternativa)
);

-- Tabla de reportes
CREATE TABLE reportes (
    id_reporte INT PRIMARY KEY,
    descripcion TEXT,
    tipo_reporte VARCHAR(100),
    fecha DATE,
    datos_json JSONB, -- Para almacenar datos del reporte en formato JSON
    id_admin INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (id_admin) REFERENCES admin(id_admin)
);

-- Insertar datos de prueba
INSERT INTO super_su (id_super, nombre, correo, contraseña) VALUES 
(1, 'Super Admin SENATI', 'superadmin@senati.pe', 'superadmin123');

INSERT INTO admin (id_admin, nombre, correo, contraseña, rol, id_super_admin) VALUES 
(1, 'Admin SENATI', 'admin@senati.pe', 'admin123', 'admin', 1);

-- Insertar encuesta de ejemplo: Evaluación del Café SENATI
INSERT INTO encuestas (id_encuesta, titulo, descripcion, fecha, activa, id_admin) VALUES 
(1, 'Evaluación del Café SENATI', 'Encuesta para evaluar la calidad del servicio del café institucional del SENATI', '2025-08-06', true, 1);

-- Insertar las 8 preguntas específicas
-- Preguntas 1-3: Datos personales (texto abierto)
INSERT INTO preguntas (id_pregunta, texto, tipo_pregunta, requerida, orden_pregunta, id_encuesta) VALUES 
(1, '¿Cuál es tu nombre completo?', 'open_text', true, 1, 1),
(2, '¿Cuál es tu edad?', 'open_text', true, 2, 1),
(3, '¿Cuál es tu género?', 'single_choice', true, 3, 1);

-- Preguntas 4-8: Evaluación del café (escala 1-5)
INSERT INTO preguntas (id_pregunta, texto, tipo_pregunta, requerida, orden_pregunta, id_encuesta) VALUES 
(4, '¿Cómo calificarías la CALIDAD DE LA COMIDA del café SENATI?', 'single_choice', true, 4, 1),
(5, '¿Cómo calificarías la ATENCIÓN AL CLIENTE del café SENATI?', 'single_choice', true, 5, 1),
(6, '¿Cómo calificarías la INFRAESTRUCTURA del café SENATI?', 'single_choice', true, 6, 1),
(7, '¿Cómo calificarías la VARIEDAD DEL MENÚ del café SENATI?', 'single_choice', true, 7, 1),
(8, '¿Cómo calificarías la RELACIÓN PRECIO-CALIDAD del café SENATI?', 'single_choice', true, 8, 1);

-- Alternativas para la pregunta de género
INSERT INTO alternativas (id_alternativa, texto_opcion, orden_alternativa, id_pregunta) VALUES 
(1, 'Masculino', 1, 3),
(2, 'Femenino', 2, 3),
(3, 'Otro', 3, 3),
(4, 'Prefiero no decir', 4, 3);

-- Alternativas para las preguntas de evaluación (escala 1-5)
-- Pregunta 4: Calidad de la comida
INSERT INTO alternativas (id_alternativa, texto_opcion, orden_alternativa, id_pregunta) VALUES 
(5, '1 - Muy mala', 1, 4),
(6, '2 - Mala', 2, 4),
(7, '3 - Regular', 3, 4),
(8, '4 - Buena', 4, 4),
(9, '5 - Excelente', 5, 4);

-- Pregunta 5: Atención al cliente
INSERT INTO alternativas (id_alternativa, texto_opcion, orden_alternativa, id_pregunta) VALUES 
(10, '1 - Muy mala', 1, 5),
(11, '2 - Mala', 2, 5),
(12, '3 - Regular', 3, 5),
(13, '4 - Buena', 4, 5),
(14, '5 - Excelente', 5, 5);

-- Pregunta 6: Infraestructura
INSERT INTO alternativas (id_alternativa, texto_opcion, orden_alternativa, id_pregunta) VALUES 
(15, '1 - Muy mala', 1, 6),
(16, '2 - Mala', 2, 6),
(17, '3 - Regular', 3, 6),
(18, '4 - Buena', 4, 6),
(19, '5 - Excelente', 5, 6);

-- Pregunta 7: Variedad del menú
INSERT INTO alternativas (id_alternativa, texto_opcion, orden_alternativa, id_pregunta) VALUES 
(20, '1 - Muy mala', 1, 7),
(21, '2 - Mala', 2, 7),
(22, '3 - Regular', 3, 7),
(23, '4 - Buena', 4, 7),
(24, '5 - Excelente', 5, 7);

-- Pregunta 8: Relación precio-calidad
INSERT INTO alternativas (id_alternativa, texto_opcion, orden_alternativa, id_pregunta) VALUES 
(25, '1 - Muy mala', 1, 8),
(26, '2 - Mala', 2, 8),
(27, '3 - Regular', 3, 8),
(28, '4 - Buena', 4, 8),
(29, '5 - Excelente', 5, 8);

-- Crear políticas de seguridad (Row Level Security)
ALTER TABLE super_su ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin ENABLE ROW LEVEL SECURITY;
ALTER TABLE encuestas ENABLE ROW LEVEL SECURITY;
ALTER TABLE preguntas ENABLE ROW LEVEL SECURITY;
ALTER TABLE alternativas ENABLE ROW LEVEL SECURITY;
ALTER TABLE respuestas ENABLE ROW LEVEL SECURITY;
ALTER TABLE reportes ENABLE ROW LEVEL SECURITY;

-- Política para que solo admins puedan ver/editar sus encuestas
CREATE POLICY "admin_own_encuestas" ON encuestas
    FOR ALL USING (auth.uid()::text = id_admin::text);

-- Política para que cualquiera pueda leer encuestas activas (para responder)
CREATE POLICY "public_read_active_encuestas" ON encuestas
    FOR SELECT USING (activa = true);

-- Política para respuestas - cualquiera puede insertar
CREATE POLICY "public_insert_respuestas" ON respuestas
    FOR INSERT WITH CHECK (true);

-- Política para preguntas y alternativas - lectura pública para encuestas activas
CREATE POLICY "public_read_preguntas" ON preguntas
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM encuestas 
            WHERE encuestas.id_encuesta = preguntas.id_encuesta 
            AND encuestas.activa = true
        )
    );

CREATE POLICY "public_read_alternativas" ON alternativas
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM preguntas 
            JOIN encuestas ON encuestas.id_encuesta = preguntas.id_encuesta
            WHERE preguntas.id_pregunta = alternativas.id_pregunta 
            AND encuestas.activa = true
        )
    );
