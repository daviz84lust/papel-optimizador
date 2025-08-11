/**
 * Units Manager - Módulo para gestión de unidades de medida
 * Maneja la conversión entre centímetros y milímetros en la interfaz
 * Los cálculos internos siempre se mantienen en milímetros
 */

class UnitsManager {
    constructor() {
        this.currentUnit = 'cm'; // Por defecto centímetros
        this.conversionFactor = 10; // 1 cm = 10 mm
        this.unitFields = []; // Campos que necesitan conversión
        this.initialized = false;
    }

    /**
     * Inicializa el gestor de unidades
     */
    init() {
        if (this.initialized) return;
        
        this.createUnitSelector();
        this.identifyUnitFields();
        this.loadUserPreference();
        this.setupEventListeners();
        this.updateAllFieldsDisplay();
        
        this.initialized = true;
        console.log('UnitsManager inicializado con unidad:', this.currentUnit);
    }

    /**
     * Crea el selector de unidades en la interfaz
     */
    createUnitSelector() {
        const assistantPanel = document.getElementById('assistant-panel');
        const panelHeader = assistantPanel.querySelector('.panel-header');
        
        // Crear el contenedor del selector
        const unitSelectorContainer = document.createElement('div');
        unitSelectorContainer.className = 'unit-selector-container';
        unitSelectorContainer.innerHTML = `
            <div class="unit-selector-wrapper">
                <label class="unit-selector-label">Unidad de medida:</label>
                <div class="unit-toggle-switch">
                    <input type="radio" id="unit-cm" name="unit" value="cm" checked>
                    <input type="radio" id="unit-mm" name="unit" value="mm">
                    <div class="unit-toggle-slider">
                        <label for="unit-cm" class="unit-option active">
                            <span class="unit-icon">📏</span>
                            <span class="unit-text">cm</span>
                        </label>
                        <label for="unit-mm" class="unit-option">
                            <span class="unit-icon">📐</span>
                            <span class="unit-text">mm</span>
                        </label>
                    </div>
                </div>
            </div>
        `;
        
        // Insertar después del header
        panelHeader.insertAdjacentElement('afterend', unitSelectorContainer);
    }

    /**
     * Identifica todos los campos que contienen medidas
     */
    identifyUnitFields() {
        // Campos de entrada numéricos que representan medidas
        const inputSelectors = [
            '#pieceWidth', '#pieceHeight',
            '#customPaperWidth', '#customPaperHeight',
            '#bleedTop', '#bleedBottom', '#bleedLeft', '#bleedRight',
            '#gripper', '#horizontal_gutter', '#vertical_gutter',
            '#center_horizontal_gutter', '#center_vertical_gutter'
        ];

        this.unitFields = [];

        inputSelectors.forEach(selector => {
            const input = document.querySelector(selector);
            const label = document.querySelector(`label[for="${input?.id}"]`);
            
            if (input && label) {
                this.unitFields.push({
                    input: input,
                    label: label,
                    originalLabelText: label.textContent,
                    originalValue: null // Se establecerá cuando se convierta
                });
            }
        });

        // Identificar y almacenar el selector de papel
        this.paperSelector = document.getElementById('paper-select');
        if (this.paperSelector) {
            this.storePaperOptions();
        }

        console.log(`Identificados ${this.unitFields.length} campos de unidades`);
    }

    /**
     * Almacena las opciones originales del selector de papel
     */
    storePaperOptions() {
        if (!this.paperSelector) return;

        this.originalPaperOptions = [];
        const options = this.paperSelector.querySelectorAll('option');
        
        options.forEach(option => {
            if (option.value !== 'custom') {
                const [width, height] = option.value.split(',').map(Number);
                this.originalPaperOptions.push({
                    element: option,
                    value: option.value,
                    widthMm: width,
                    heightMm: height,
                    originalText: option.textContent
                });
            }
        });

        console.log(`Almacenadas ${this.originalPaperOptions.length} opciones de papel`);
    }

    /**
     * Actualiza las opciones del selector de papel según la unidad actual
     */
    updatePaperSelectorOptions() {
        if (!this.paperSelector || !this.originalPaperOptions) return;

        this.originalPaperOptions.forEach(optionData => {
            const { element, widthMm, heightMm } = optionData;
            
            let displayWidth, displayHeight;
            
            if (this.currentUnit === 'cm') {
                displayWidth = Math.round((widthMm / 10) * 10) / 10; // Redondear a 1 decimal
                displayHeight = Math.round((heightMm / 10) * 10) / 10;
                element.textContent = `${displayWidth} x ${displayHeight} cm`;
            } else {
                displayWidth = widthMm;
                displayHeight = heightMm;
                element.textContent = `${displayWidth} x ${displayHeight} mm`;
            }
        });
    }

    /**
     * Configura los event listeners
     */
    setupEventListeners() {
        const unitRadios = document.querySelectorAll('input[name="unit"]');
        
        unitRadios.forEach(radio => {
            radio.addEventListener('change', (e) => {
                if (e.target.checked) {
                    this.changeUnit(e.target.value);
                }
            });
        });
    }

    /**
     * Cambia la unidad de medida
     */
    changeUnit(newUnit) {
        if (newUnit === this.currentUnit) return;

        const oldUnit = this.currentUnit;
        this.currentUnit = newUnit;

        // Actualizar apariencia del toggle
        this.updateToggleAppearance();

        // Convertir valores existentes
        this.convertFieldValues(oldUnit, newUnit);

        // Actualizar labels
        this.updateAllFieldsDisplay();

        // Guardar preferencia
        this.saveUserPreference();

        // Disparar recálculo si existe la función
        if (typeof window.mainController === 'function') {
            window.mainController();
        }

        console.log(`Unidad cambiada de ${oldUnit} a ${newUnit}`);
    }

    /**
     * Actualiza la apariencia del toggle switch
     */
    updateToggleAppearance() {
        const cmOption = document.querySelector('label[for="unit-cm"]');
        const mmOption = document.querySelector('label[for="unit-mm"]');

        if (this.currentUnit === 'cm') {
            cmOption.classList.add('active');
            mmOption.classList.remove('active');
        } else {
            mmOption.classList.add('active');
            cmOption.classList.remove('active');
        }
    }

    /**
     * Convierte los valores de los campos entre unidades
     */
    convertFieldValues(fromUnit, toUnit) {
        this.unitFields.forEach(field => {
            const currentValue = parseFloat(field.input.value);
            
            if (!isNaN(currentValue) && currentValue !== 0) {
                let convertedValue;
                
                if (fromUnit === 'mm' && toUnit === 'cm') {
                    // mm a cm: dividir por 10
                    convertedValue = currentValue / this.conversionFactor;
                } else if (fromUnit === 'cm' && toUnit === 'mm') {
                    // cm a mm: multiplicar por 10
                    convertedValue = currentValue * this.conversionFactor;
                } else {
                    convertedValue = currentValue;
                }

                // Redondear a 1 decimal para cm, entero para mm
                if (toUnit === 'cm') {
                    convertedValue = Math.round(convertedValue * 10) / 10;
                } else {
                    convertedValue = Math.round(convertedValue);
                }

                field.input.value = convertedValue;
            }
        });
    }

    /**
     * Actualiza las etiquetas de todos los campos
     */
    updateAllFieldsDisplay() {
        this.unitFields.forEach(field => {
            this.updateFieldLabel(field);
        });

        // Actualizar las opciones del selector de papel
        this.updatePaperSelectorOptions();

        // También actualizar displays dinámicos si existen
        this.updateDynamicDisplays();
    }

    /**
     * Actualiza la etiqueta de un campo específico
     */
    updateFieldLabel(field) {
        const unitText = this.currentUnit;
        const originalText = field.originalLabelText;
        
        // Reemplazar (mm) o (cm) en el texto original
        let newText = originalText.replace(/\((mm|cm)\)/g, `(${unitText})`);
        
        // Si no había unidad en el texto original, agregarla
        if (!originalText.includes('(mm)') && !originalText.includes('(cm)')) {
            newText = `${originalText} (${unitText})`;
        }
        
        field.label.textContent = newText;
    }

    /**
     * Actualiza displays dinámicos (márgenes, info del pliego, etc.)
     */
    updateDynamicDisplays() {
        // Esta función será llamada por el sistema principal cuando actualice los displays
        // Solo necesitamos asegurar que la información de unidad esté disponible
    }

    /**
     * Convierte un valor de la unidad actual a milímetros (para cálculos internos)
     */
    toMillimeters(value) {
        if (this.currentUnit === 'cm') {
            return value * this.conversionFactor;
        }
        return value;
    }

    /**
     * Convierte un valor de milímetros a la unidad actual (para mostrar)
     */
    fromMillimeters(value) {
        if (this.currentUnit === 'cm') {
            return Math.round((value / this.conversionFactor) * 10) / 10;
        }
        return Math.round(value);
    }

    /**
     * Obtiene el texto de la unidad actual
     */
    getCurrentUnitText() {
        return this.currentUnit;
    }

    /**
     * Guarda la preferencia del usuario
     */
    saveUserPreference() {
        localStorage.setItem('papeloptimizador-unit-preference', this.currentUnit);
    }

    /**
     * Carga la preferencia del usuario
     */
    loadUserPreference() {
        const savedUnit = localStorage.getItem('papeloptimizador-unit-preference');
        
        if (savedUnit && (savedUnit === 'cm' || savedUnit === 'mm')) {
            this.currentUnit = savedUnit;
            
            // Actualizar el radio button
            const radio = document.querySelector(`input[value="${savedUnit}"]`);
            if (radio) {
                radio.checked = true;
            }
            
            this.updateToggleAppearance();
        }
    }

    /**
     * Método público para que otros módulos obtengan valores convertidos
     */
    getConvertedValue(inputElement) {
        const displayValue = parseFloat(inputElement.value) || 0;
        return this.toMillimeters(displayValue);
    }

    /**
     * Método público para mostrar un valor en la unidad actual
     */
    formatValue(mmValue, decimals = 1) {
        const convertedValue = this.fromMillimeters(mmValue);
        const unit = this.getCurrentUnitText();
        
        if (unit === 'cm') {
            return `${convertedValue.toFixed(decimals)} ${unit}`;
        } else {
            return `${Math.round(convertedValue)} ${unit}`;
        }
    }
}

// Crear instancia global
window.unitsManager = new UnitsManager();

// Auto-inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    // Esperar un poco para asegurar que otros scripts se hayan cargado
    setTimeout(() => {
        window.unitsManager.init();
    }, 100);
});
