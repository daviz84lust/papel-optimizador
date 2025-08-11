/**
 * Stepper Manager - Módulo para gestión de steppers en inputs numéricos
 * Ajusta el comportamiento de incremento/decremento según la unidad seleccionada
 */

class StepperManager {
    constructor() {
        this.initialized = false;
        this.inputFields = [];
        this.processingInput = new Set(); // Flag para prevenir bucles infinitos
        this.debounceTimers = new Map(); // Timers para debounce
    }

    /**
     * Inicializa el gestor de steppers
     */
    init() {
        if (this.initialized) return;
        
        this.identifyInputFields();
        this.setupStepperBehavior();
        this.setupUnitChangeListener();
        
        this.initialized = true;
        console.log('StepperManager inicializado correctamente');
    }

    /**
     * Identifica todos los campos de entrada numéricos que necesitan stepper personalizado
     */
    identifyInputFields() {
        const inputIds = [
            'pieceWidth', 'pieceHeight',
            'customPaperWidth', 'customPaperHeight',
            'bleedTop', 'bleedBottom', 'bleedLeft', 'bleedRight',
            'gripper', 'horizontal_gutter', 'vertical_gutter',
            'center_horizontal_gutter', 'center_vertical_gutter'
        ];

        this.inputFields = inputIds.map(id => {
            const input = document.getElementById(id);
            return input ? { id, element: input } : null;
        }).filter(field => field !== null);

        console.log(`Identificados ${this.inputFields.length} campos para stepper personalizado`);
    }

    /**
     * Configura el comportamiento personalizado de steppers
     */
    setupStepperBehavior() {
        this.inputFields.forEach(field => {
            this.setupFieldStepper(field);
        });
    }

    /**
     * Configura el stepper para un campo específico
     */
    setupFieldStepper(field) {
        const input = field.element;
        
        // Remover step attribute si existe para tomar control completo
        input.removeAttribute('step');
        
        // Interceptar eventos de teclado para las flechas arriba/abajo
        input.addEventListener('keydown', (e) => {
            if (e.key === 'ArrowUp') {
                e.preventDefault();
                this.incrementValue(input);
            } else if (e.key === 'ArrowDown') {
                e.preventDefault();
                this.decrementValue(input);
            }
        });

        // Interceptar eventos de rueda del mouse
        input.addEventListener('wheel', (e) => {
            if (document.activeElement === input) {
                e.preventDefault();
                if (e.deltaY < 0) {
                    this.incrementValue(input);
                } else {
                    this.decrementValue(input);
                }
            }
        });

        // Interceptar clics en los controles nativos del navegador (si existen)
        this.interceptNativeSteppers(input);
    }

    /**
     * Intercepta los controles nativos de stepper del navegador
     */
    interceptNativeSteppers(input) {
        // Crear un observer para detectar cambios de valor que no vienen del teclado
        let lastValue = input.value;
        
        const observer = new MutationObserver(() => {
            const currentValue = input.value;
            if (currentValue !== lastValue) {
                // El valor cambió, verificar si fue por stepper nativo
                this.handleNativeStepperChange(input, lastValue, currentValue);
                lastValue = currentValue;
            }
        });

        // Observar cambios en el atributo value
        observer.observe(input, {
            attributes: true,
            attributeFilter: ['value']
        });

        // También escuchar eventos de input para cambios programáticos
        input.addEventListener('input', (e) => {
            if (e.inputType === 'insertReplacementText' || !e.inputType) {
                // Posible cambio por stepper nativo
                this.handlePotentialStepperChange(input);
            }
        });
    }

    /**
     * Maneja cambios potenciales por stepper nativo
     */
    handlePotentialStepperChange(input) {
        // Prevenir bucles infinitos
        if (this.processingInput.has(input.id)) {
            return;
        }
        
        // Si el cambio fue muy pequeño (1 unidad), podría ser un stepper
        // Aplicar nuestra lógica personalizada
        const currentUnit = this.getCurrentUnit();
        if (currentUnit === 'cm') {
            // Usar debounce para evitar múltiples disparos
            this.debounceInputEvent(input);
        }
    }

    /**
     * Maneja cambios detectados en steppers nativos
     */
    handleNativeStepperChange(input, oldValue, newValue) {
        // Prevenir bucles infinitos
        if (this.processingInput.has(input.id)) {
            return;
        }
        
        const oldNum = parseFloat(oldValue) || 0;
        const newNum = parseFloat(newValue) || 0;
        const diff = Math.abs(newNum - oldNum);
        
        // Si la diferencia es exactamente 1 y estamos en cm, podría ser stepper nativo
        if (diff === 1 && this.getCurrentUnit() === 'cm') {
            // Aplicar nuestra lógica: cambio de 0.1 cm en lugar de 1 cm
            const correctedValue = newNum > oldNum ? oldNum + 0.1 : oldNum - 0.1;
            input.value = Math.max(0, Math.round(correctedValue * 10) / 10);
            
            // Usar debounce para disparar evento
            this.debounceInputEvent(input);
        }
    }

    /**
     * Incrementa el valor del input según la unidad actual
     */
    incrementValue(input) {
        // Prevenir bucles infinitos
        if (this.processingInput.has(input.id)) {
            return;
        }
        
        const currentValue = parseFloat(input.value) || 0;
        const currentUnit = this.getCurrentUnit();
        
        let newValue;
        if (currentUnit === 'cm') {
            // Incrementar 0.1 cm (equivalente a 1 mm)
            newValue = currentValue + 0.1;
            newValue = Math.round(newValue * 10) / 10; // Redondear a 1 decimal
        } else {
            // Incrementar 1 mm
            newValue = currentValue + 1;
            newValue = Math.round(newValue); // Redondear a entero
        }
        
        input.value = Math.max(0, newValue);
        
        // Usar debounce para disparar evento
        this.debounceInputEvent(input);
        
        console.log(`Incrementado ${input.id}: ${currentValue} → ${newValue} ${currentUnit}`);
    }

    /**
     * Decrementa el valor del input según la unidad actual
     */
    decrementValue(input) {
        // Prevenir bucles infinitos
        if (this.processingInput.has(input.id)) {
            return;
        }
        
        const currentValue = parseFloat(input.value) || 0;
        const currentUnit = this.getCurrentUnit();
        
        let newValue;
        if (currentUnit === 'cm') {
            // Decrementar 0.1 cm (equivalente a 1 mm)
            newValue = currentValue - 0.1;
            newValue = Math.round(newValue * 10) / 10; // Redondear a 1 decimal
        } else {
            // Decrementar 1 mm
            newValue = currentValue - 1;
            newValue = Math.round(newValue); // Redondear a entero
        }
        
        input.value = Math.max(0, newValue);
        
        // Usar debounce para disparar evento
        this.debounceInputEvent(input);
        
        console.log(`Decrementado ${input.id}: ${currentValue} → ${newValue} ${currentUnit}`);
    }

    /**
     * Función de debounce para disparar eventos input de forma controlada
     */
    debounceInputEvent(input) {
        const inputId = input.id;
        
        // Limpiar timer anterior si existe
        if (this.debounceTimers.has(inputId)) {
            clearTimeout(this.debounceTimers.get(inputId));
        }
        
        // Marcar como procesando para prevenir bucles
        this.processingInput.add(inputId);
        
        // Configurar nuevo timer
        const timer = setTimeout(() => {
            // Disparar evento
            input.dispatchEvent(new Event('input', { bubbles: true }));
            
            // Limpiar flags después de un breve delay
            setTimeout(() => {
                this.processingInput.delete(inputId);
                this.debounceTimers.delete(inputId);
            }, 50);
        }, 100);
        
        this.debounceTimers.set(inputId, timer);
    }

    /**
     * Obtiene la unidad actual del UnitsManager
     */
    getCurrentUnit() {
        if (window.unitsManager && window.unitsManager.getCurrentUnitText) {
            return window.unitsManager.getCurrentUnitText();
        }
        return 'mm'; // Fallback por defecto
    }

    /**
     * Configura el listener para cambios de unidad
     */
    setupUnitChangeListener() {
        // Escuchar cambios en el selector de unidades
        document.addEventListener('change', (e) => {
            if (e.target.name === 'unit') {
                this.onUnitChange();
            }
        });
    }

    /**
     * Maneja el cambio de unidad
     */
    onUnitChange() {
        const newUnit = this.getCurrentUnit();
        console.log(`Unidad cambiada a: ${newUnit}`);
        
        // Actualizar el comportamiento de steppers si es necesario
        this.updateStepperBehavior(newUnit);
    }

    /**
     * Actualiza el comportamiento de steppers según la nueva unidad
     */
    updateStepperBehavior(unit) {
        // El comportamiento se ajusta automáticamente en incrementValue/decrementValue
        // basado en getCurrentUnit(), no necesitamos hacer nada especial aquí
        console.log(`Comportamiento de steppers actualizado para unidad: ${unit}`);
    }
}

// Crear instancia global
window.stepperManager = new StepperManager();

// Auto-inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    // Esperar a que otros módulos se carguen primero
    setTimeout(() => {
        if (window.stepperManager) {
            window.stepperManager.init();
        }
    }, 600); // Cargar después del UnitsManager
});
