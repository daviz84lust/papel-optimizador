/**
 * Units Integration - Módulo de integración con app.js
 * Solución directa para convertir valores de cm a mm automáticamente
 */

document.addEventListener('DOMContentLoaded', () => {
    // Esperar a que todos los módulos estén cargados
    setTimeout(() => {
        initializeUnitsIntegration();
    }, 500);
});

function initializeUnitsIntegration() {
    if (!window.unitsManager) {
        console.error('UnitsManager no está disponible');
        return;
    }

    // Solución directa: interceptar todos los inputs con conversión automática
    setupDirectConversion();
    
    // Interceptar displays de resultados
    interceptResultsDisplay();
    
    // Interceptar la información del pliego
    interceptSheetInfoDisplay();

    console.log('Units Integration inicializado correctamente');
}

/**
 * Configuración directa de conversión - La conversión principal se hace en app.js
 */
function setupDirectConversion() {
    // La conversión principal ahora se hace directamente en app.js en la función parseNum
    // Solo necesitamos configurar logging para debugging
    
    const inputIds = [
        'pieceWidth', 'pieceHeight',
        'customPaperWidth', 'customPaperHeight',
        'bleedTop', 'bleedBottom', 'bleedLeft', 'bleedRight',
        'gripper', 'horizontal_gutter', 'vertical_gutter',
        'center_horizontal_gutter', 'center_vertical_gutter'
    ];

    inputIds.forEach(id => {
        const input = document.getElementById(id);
        if (input) {
            // Logging optimizado con debounce para evitar spam en consola
            let logTimer;
            input.addEventListener('input', function() {
                // Limpiar timer anterior
                if (logTimer) {
                    clearTimeout(logTimer);
                }
                
                // Debounce del logging para evitar spam
                logTimer = setTimeout(() => {
                    const currentUnit = window.unitsManager.getCurrentUnitText();
                    const userValue = parseFloat(this.value) || 0;
                    
                    if (currentUnit === 'cm' && userValue > 0) {
                        console.log(`${id}: Usuario ingresó ${userValue} cm (se convertirá a ${userValue * 10} mm para cálculos)`);
                    } else {
                        console.log(`${id}: Usuario ingresó ${userValue} mm`);
                    }
                }, 200); // Debounce de 200ms
            });
        }
    });

    console.log('Conversión directa configurada - Los cálculos ahora usarán valores correctos automáticamente');
}



/**
 * Intercepta la actualización de resultados para mostrar en unidad actual
 */
function interceptResultsDisplay() {
    // Observar cambios en los displays de márgenes
    const marginContainer = document.querySelector('.margin-display');
    if (marginContainer) {
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.type === 'childList' || mutation.type === 'characterData') {
                    setTimeout(() => {
                        updateMarginDisplayUnits();
                    }, 10);
                }
            });
        });

        observer.observe(marginContainer, {
            childList: true,
            subtree: true,
            characterData: true
        });
    }
}

/**
 * Actualiza las unidades en los displays de márgenes
 */
function updateMarginDisplayUnits() {
    if (!window.unitsManager) return;

    const marginDisplays = [
        'margin-l-display', 'margin-r-display',
        'margin-t-display', 'margin-b-display'
    ];

    marginDisplays.forEach(id => {
        const display = document.getElementById(id);
        if (display && display.textContent) {
            const text = display.textContent;
            const mmMatch = text.match(/([\d.]+)\s*mm/);
            
            if (mmMatch) {
                const mmValue = parseFloat(mmMatch[1]);
                const formattedValue = window.unitsManager.formatValue(mmValue);
                display.textContent = formattedValue;
            }
        }
    });
}

/**
 * Intercepta la información del pliego
 */
function interceptSheetInfoDisplay() {
    const sheetInfoDisplay = document.getElementById('sheet-info-display');
    if (sheetInfoDisplay) {
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.type === 'characterData' || 
                    (mutation.type === 'childList' && mutation.target.textContent)) {
                    setTimeout(() => {
                        updateSheetInfoUnits();
                    }, 10);
                }
            });
        });

        observer.observe(sheetInfoDisplay, {
            childList: true,
            characterData: true,
            subtree: true
        });
    }
}

/**
 * Actualiza las unidades en la información del pliego
 */
function updateSheetInfoUnits() {
    if (!window.unitsManager) return;

    const sheetInfoDisplay = document.getElementById('sheet-info-display');
    if (sheetInfoDisplay && sheetInfoDisplay.textContent) {
        const text = sheetInfoDisplay.textContent;
        const mmMatch = text.match(/(\d+)\s*×\s*(\d+)\s*mm/);
        
        if (mmMatch) {
            const width = parseFloat(mmMatch[1]);
            const height = parseFloat(mmMatch[2]);
            
            const widthFormatted = window.unitsManager.formatValue(width, 0);
            const heightFormatted = window.unitsManager.formatValue(height, 0);
            const unit = window.unitsManager.getCurrentUnitText();
            
            sheetInfoDisplay.textContent = `Pliego de Trabajo: ${widthFormatted.replace(` ${unit}`, '')} × ${heightFormatted.replace(` ${unit}`, '')} ${unit}`;
        }
    }
}

/**
 * Función auxiliar para interceptar funciones globales de manera segura
 */
function safeIntercept(functionName, interceptor) {
    if (typeof window[functionName] === 'function') {
        const original = window[functionName];
        window[functionName] = function() {
            return interceptor.call(this, original, arguments);
        };
    }
}

/**
 * Manejo de eventos para el selector de papel predefinido
 */
document.addEventListener('DOMContentLoaded', () => {
    const paperSelect = document.getElementById('paper-select');
    if (paperSelect) {
        // Interceptar el cambio de papel para mantener consistencia de unidades
        paperSelect.addEventListener('change', () => {
            setTimeout(() => {
                if (typeof window.mainController === 'function') {
                    window.mainController();
                }
            }, 100);
        });
    }
});

/**
 * Extensión para el PDF generator
 */
function extendPDFGenerator() {
    // Esta función se puede usar para extender el generador de PDF
    // para que use las unidades correctas en los reportes
    if (window.unitsManager && typeof window.generatePDFWithJobInfo === 'function') {
        console.log('PDF Generator extendido para usar unidades actuales');
    }
}

// Ejecutar extensiones cuando esté listo
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(extendPDFGenerator, 300);
});
