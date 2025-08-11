// === MÓDULO PARA GENERAR PDF TÉCNICO ===

// Configuración visual del PDF (separada de los datos)
const pdfTheme = {
    colors: {
        primary: '#3182ce',
        secondary: '#e2e8f0', 
        text: '#2d3748',
        lightGray: '#f7fafc'
    },
    fonts: {
        title: 'helvetica',
        body: 'helvetica'
    },
    sizes: {
        title: 16,
        subtitle: 12,
        body: 10,
        small: 8
    },
    spacing: {
        margin: 20,
        padding: 10,
        lineHeight: 1.4
    }
};

// Función principal para generar PDF técnico
function generateTechnicalPDF(appState, result, jobInfo = {}) {
    if (!result || !result.isValid) {
        alert('No hay un layout válido para generar el PDF. Por favor verifica los parámetros.');
        return;
    }
    
    // Crear documento PDF
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF('p', 'mm', 'a4');
    
    // Generar datos estructurados incluyendo información del trabajo
    const reportData = generateReportData(appState, result, jobInfo);
    
    // Página 1: Información técnica
    generateTechnicalInfoPage(doc, reportData);
    
    // Página 2: Layout visual
    doc.addPage();
    generateLayoutPage(doc, reportData);
    
    // Descargar PDF con nombre más descriptivo
    const jobTitle = jobInfo.title || 'sin_titulo';
    const dateStr = new Date().toISOString().split('T')[0];
    const filename = `${jobTitle}_${appState.pieceWidth}x${appState.pieceHeight}_${dateStr}.pdf`;
    doc.save(filename);
    
    // También exportar JSON para futura BD
    exportReportJSON(reportData);
}

// Generar estructura de datos para el reporte
function generateReportData(appState, result, jobInfo = {}) {
    const now = new Date();
    
    return {
        // Información del trabajo
        jobInfo: {
            title: jobInfo.title || 'sin_titulo',
            client: jobInfo.client || '',
            quote: jobInfo.quote || '',
            date: jobInfo.date || now.toISOString().split('T')[0],
            notes: jobInfo.notes || ''
        },
        
        // Información del proyecto
        project: {
            title: 'Ficha Técnica de Imposición',
            date: now.toLocaleDateString('es-ES'),
            time: now.toLocaleTimeString('es-ES'),
            version: '1.0'
        },
        
        // Información de la pieza
        piece: {
            width: appState.pieceWidth,
            height: appState.pieceHeight,
            unit: 'mm'
        },
        
        // Flujo de papel
        paperWorkflow: {
            originalPaper: {
                width: appState.originalPaper.width,
                height: appState.originalPaper.height
            },
            cutType: {
                x: appState.cuts.x,
                y: appState.cuts.y
            },
            workSheet: {
                width: result.sheetWidth,
                height: result.sheetHeight
            }
        },
        
        // Ajustes finos
        adjustments: {
            bleeds: appState.bleeds,
            spacing: appState.spacing,
            centerHorizontally: appState.centerHorizontally,
            useGripperOnBleedMode: appState.useGripperOnBleedMode
        },
        
        // Resultados
        results: {
            piecesPerSheet: result.unitsTotal,
            unitsWidth: result.unitsX,
            unitsHeight: result.unitsY,
            utilization: result.utilization,
            remainingSpace: {
                left: result.finalMargins?.left || 0,
                right: result.finalMargins?.right || 0,
                top: result.finalMargins?.top || 0,
                bottom: result.finalMargins?.bottom || 0
            }
        },
        
        // Datos del layout para la página visual
        layout: {
            pieces: result.pieces,
            sheetWidth: result.sheetWidth,
            sheetHeight: result.sheetHeight
        }
    };
}

// Generar página 1: Información técnica
function generateTechnicalInfoPage(doc, data) {
    const theme = pdfTheme;
    let y = theme.spacing.margin;
    
    // Header con título
    doc.setFillColor(49, 130, 206); // #3182ce en RGB
    doc.rect(0, 0, 210, 25, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(theme.sizes.title);
    doc.text(data.project.title, theme.spacing.margin, 15);
    doc.setTextColor(45, 55, 72); // #2d3748 en RGB
    
    // Fecha y hora
    doc.setFontSize(theme.sizes.small);
    doc.setTextColor(255, 255, 255);
    doc.text(`Generado: ${data.project.date} ${data.project.time}`, 150, 15);
    doc.setTextColor(45, 55, 72);
    
    y = 35;
    
    // Sección: Información del Trabajo (Tabla Profesional)
    const jobInfoData = [
        { concept: 'Título del Trabajo', value: data.jobInfo.title },
        { concept: 'Cliente', value: data.jobInfo.client || 'No especificado' },
        { concept: 'Número de Cotización', value: data.jobInfo.quote || 'No especificado' },
        { concept: 'Fecha del Trabajo', value: data.jobInfo.date || 'No especificada' }
    ];
    
    // Solo agregar notas si existen
    if (data.jobInfo.notes) {
        jobInfoData.push({ concept: 'Notas Adicionales', value: data.jobInfo.notes });
    }
    
    y = addProfessionalTable(doc, 'Información del Trabajo', jobInfoData, y);
    y += 10;
    
    // Sección: Información de Pieza
    y = addSection(doc, 'Información de Pieza', y);
    y = addKeyValue(doc, 'Ancho', `${data.piece.width} ${data.piece.unit}`, y);
    y = addKeyValue(doc, 'Alto', `${data.piece.height} ${data.piece.unit}`, y);
    y = addKeyValue(doc, 'Unidad de Medida', data.piece.unit, y);
    
    y += 10;
    
    // Sección: Pliego de Trabajo
    y = addSection(doc, 'Pliego de Trabajo', y);
    y = addKeyValue(doc, 'Papel Original', `${data.paperWorkflow.originalPaper.width} × ${data.paperWorkflow.originalPaper.height} mm`, y);
    y = addKeyValue(doc, 'Tipo de Corte', `${data.paperWorkflow.cutType.x} × ${data.paperWorkflow.cutType.y}`, y);
    y = addKeyValue(doc, 'Pliego Resultante', `${data.paperWorkflow.workSheet.width} × ${data.paperWorkflow.workSheet.height} mm`, y);
    
    y += 10;
    
    // Sección: Ajustes Finos (Tabla Profesional)
    const ajustesFinosData = [
        { concept: 'Sangrado Superior', value: `${data.adjustments.bleeds.top} mm` },
        { concept: 'Sangrado Inferior', value: `${data.adjustments.bleeds.bottom} mm` },
        { concept: 'Sangrado Izquierdo', value: `${data.adjustments.bleeds.left} mm` },
        { concept: 'Sangrado Derecho', value: `${data.adjustments.bleeds.right} mm` },
        { concept: 'Gripper', value: `${data.adjustments.spacing.gripper} mm` },
        { concept: 'Espaciado Horizontal', value: `${data.adjustments.spacing.horizontal_gutter} mm` },
        { concept: 'Espaciado Vertical', value: `${data.adjustments.spacing.vertical_gutter} mm` },
        { concept: 'Centrado Horizontal', value: data.adjustments.centerHorizontally ? 'Activado' : 'Desactivado' }
    ];
    y = addProfessionalTable(doc, 'Ajustes Finos', ajustesFinosData, y);
    
    y += 5;
    
    // Sección: Resultados (Tabla Profesional)
    const resultadosData = [
        { concept: 'Piezas por Pliego', value: data.results.piecesPerSheet.toString() },
        { concept: 'Unidades a lo Ancho', value: data.results.unitsWidth.toString() },
        { concept: 'Unidades a lo Alto', value: data.results.unitsHeight.toString() },
        { concept: 'Aprovechamiento', value: `${data.results.utilization.toFixed(1)}%` }
    ];
    y = addProfessionalTable(doc, 'Resultados', resultadosData, y);
    
    y += 5;
    
    // Verificar si necesitamos una nueva página
    if (y > 250) {
        doc.addPage();
        y = pdfTheme.spacing.margin;
    }
    
    // Sección: Espacio Sobrante (Tabla Profesional)
    const espacioSobranteData = [
        { concept: 'Margen Izquierdo', value: `${data.results.remainingSpace.left.toFixed(1)} mm` },
        { concept: 'Margen Derecho', value: `${data.results.remainingSpace.right.toFixed(1)} mm` },
        { concept: 'Margen Superior', value: `${data.results.remainingSpace.top.toFixed(1)} mm` },
        { concept: 'Margen Inferior', value: `${data.results.remainingSpace.bottom.toFixed(1)} mm` }
    ];
    y = addProfessionalTable(doc, 'Espacio Sobrante en Pliego', espacioSobranteData, y);
}

// Generar página 2: Layout visual
function generateLayoutPage(doc, data) {
    const theme = pdfTheme;
    let y = theme.spacing.margin;
    
    // Título de la página
    doc.setFontSize(theme.sizes.title);
    doc.text('Layout Visual', theme.spacing.margin, y);
    y += 20;
    
    // Calcular escala para que el layout quepa en la página
    const pageWidth = 210 - (theme.spacing.margin * 2);
    const pageHeight = 297 - y - theme.spacing.margin;
    const scaleX = pageWidth / data.layout.sheetWidth;
    const scaleY = pageHeight / data.layout.sheetHeight;
    const scale = Math.min(scaleX, scaleY, 1); // No agrandar, solo reducir si es necesario
    
    const scaledWidth = data.layout.sheetWidth * scale;
    const scaledHeight = data.layout.sheetHeight * scale;
    const startX = theme.spacing.margin + (pageWidth - scaledWidth) / 2;
    const startY = y;
    
    // Dibujar fondo del pliego
    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(0, 0, 0);
    doc.rect(startX, startY, scaledWidth, scaledHeight, 'FD');
    
    // Dibujar piezas
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.25);
    
    data.layout.pieces.forEach(piece => {
        const x = startX + (piece.x + data.adjustments.bleeds.left) * scale;
        const y = startY + scaledHeight - (piece.y + data.adjustments.bleeds.bottom + piece.height) * scale;
        const w = piece.width * scale;
        const h = piece.height * scale;
        
        doc.rect(x, y, w, h);
    });
    
    // Información del layout
    const infoY = startY + scaledHeight + 20;
    doc.setFontSize(theme.sizes.body);
    doc.text(`Escala: ${(scale * 100).toFixed(1)}%`, startX, infoY);
    doc.text(`Dimensiones reales: ${data.layout.sheetWidth} × ${data.layout.sheetHeight} mm`, startX, infoY + 10);
}

// Funciones auxiliares para el PDF
function addSection(doc, title, y) {
    const theme = pdfTheme;
    doc.setFillColor(226, 232, 240); // #e2e8f0 en RGB
    doc.rect(theme.spacing.margin, y, 170, 8, 'F');
    doc.setFontSize(theme.sizes.subtitle);
    doc.setTextColor(45, 55, 72); // #2d3748 en RGB
    doc.text(title, theme.spacing.margin + 2, y + 6);
    return y + 15;
}

function addKeyValue(doc, key, value, y) {
    const theme = pdfTheme;
    doc.setFontSize(theme.sizes.body);
    doc.text(key + ':', theme.spacing.margin + 5, y);
    doc.text(value, theme.spacing.margin + 60, y);
    return y + 8;
}

// Función para crear tablas profesionales
function addProfessionalTable(doc, title, data, y, options = {}) {
    const theme = pdfTheme;
    const startX = theme.spacing.margin;
    const tableWidth = options.width || 170;
    const rowHeight = options.rowHeight || 8;
    const headerHeight = options.headerHeight || 10;
    
    // Título de la tabla
    y = addSection(doc, title, y);
    
    // Configurar colores y estilos
    doc.setFontSize(theme.sizes.body);
    
    // Encabezado de la tabla
    doc.setFillColor(59, 130, 246); // Azul profesional #3b82f6
    doc.setTextColor(255, 255, 255); // Texto blanco
    doc.rect(startX, y, tableWidth, headerHeight, 'F');
    
    // Texto del encabezado
    doc.setFontSize(theme.sizes.body);
    doc.text('Concepto', startX + 3, y + 7);
    doc.text('Valor', startX + tableWidth - 40, y + 7);
    
    y += headerHeight;
    
    // Filas de datos
    data.forEach((row, index) => {
        // Alternar colores de fila
        if (index % 2 === 0) {
            doc.setFillColor(248, 250, 252); // Gris muy claro #f8fafc
        } else {
            doc.setFillColor(255, 255, 255); // Blanco
        }
        doc.rect(startX, y, tableWidth, rowHeight, 'F');
        
        // Bordes de la tabla
        doc.setDrawColor(226, 232, 240); // #e2e8f0
        doc.setLineWidth(0.1);
        doc.rect(startX, y, tableWidth, rowHeight, 'S');
        
        // Texto de la fila
        doc.setTextColor(45, 55, 72); // #2d3748
        doc.setFontSize(theme.sizes.body);
        doc.text(row.concept, startX + 3, y + 6);
        doc.text(row.value, startX + tableWidth - 40, y + 6);
        
        y += rowHeight;
    });
    
    // Borde final de la tabla
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.3);
    doc.rect(startX, y - (data.length * rowHeight) - headerHeight, tableWidth, (data.length * rowHeight) + headerHeight, 'S');
    
    return y + 5;
}

// Exportar datos como JSON para futura integración con BD
function exportReportJSON(data) {
    const jsonString = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    
    const filename = `datos_imposicion_${data.piece.width}x${data.piece.height}_${new Date().toISOString().split('T')[0]}.json`;
    
    link.href = url;
    link.download = filename;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}
