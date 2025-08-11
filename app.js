document.addEventListener('DOMContentLoaded', () => {
    // === 1. DOM Element Selection ===
    const assistantPanelInputs = {
        pieceWidth: document.getElementById('pieceWidth'),
        pieceHeight: document.getElementById('pieceHeight'),
        paperSelect: document.getElementById('paper-select'),
        customPaperInputs: document.getElementById('custom-paper-inputs'),
        customPaperWidth: document.getElementById('customPaperWidth'),
        customPaperHeight: document.getElementById('customPaperHeight'),
        cutTypeSelect: document.getElementById('cut-type-select'),
        cutsX: document.getElementById('cuts_x'),
        cutsY: document.getElementById('cuts_y'),
        bleedTop: document.getElementById('bleedTop'),
        bleedBottom: document.getElementById('bleedBottom'),
        bleedLeft: document.getElementById('bleedLeft'),
        bleedRight: document.getElementById('bleedRight'),
        gripper: document.getElementById('gripper'),
        horizontal_gutter: document.getElementById('horizontal_gutter'),
        vertical_gutter: document.getElementById('vertical_gutter'),
        center_horizontal_gutter: document.getElementById('center_horizontal_gutter'),
        center_vertical_gutter: document.getElementById('center_vertical_gutter'),
        useGripperOnBleedMode: document.getElementById('useGripperOnBleedMode'),
        centerHorizontally: document.getElementById('centerHorizontally'),
        priorityWidth: document.getElementById('priorityWidth'),
    };

    const resultsPanelDisplays = {
        utilization: document.getElementById('utilization-display'),
        units: document.getElementById('units-display'),
        unitsBreakdown: document.getElementById('units-breakdown'),
        marginContainer: document.querySelector('.margin-display'),
    };
    
    const interactiveElements = {
        themeToggle: document.getElementById('theme-toggle'),
        collapsibleTrigger: document.querySelector('.collapsible-trigger'),
        collapsibleContent: document.querySelector('.collapsible-content'),
        linkBleedsBtn: document.getElementById('link-bleeds-btn'),
        calculateBtn: document.getElementById('calculate-btn'),
        swapDimensionsBtn: document.getElementById('swap-dimensions-btn'),
        swapCutsBtn: document.getElementById('swap-cuts-btn'),
        liveCanvas: document.getElementById('live-canvas'),
        liveCanvasContainer: document.getElementById('live-canvas-container'),
        sheetInfoDisplay: document.getElementById('sheet-info-display'),
        cutPreviewCanvas: document.getElementById('cut-preview-canvas'),
        svgBtn: document.getElementById('svg-btn'),
        analyzeBtn: document.getElementById('analyze-btn'),
        pdfBtn: document.getElementById('pdf-btn'),
        jobInfoBtn: document.getElementById('job-info-btn')
    };
    
    // Initialize Layout Viewer
    let layoutViewer = null;
    if (window.LayoutViewer) {
        layoutViewer = new window.LayoutViewer(
            interactiveElements.liveCanvas,
            interactiveElements.liveCanvasContainer
        );
    }
    
    // === 2. Core Application Logic ===
    function mainController() {
        const appState = collectAndPreprocessInputs();
        const engine = new ImpositionEngine();
        const result = engine.calculateLayout(appState);
        updateResultsUI(result);
        drawLayout(result, appState);
        drawCutPreview(appState.originalPaper, appState.cuts);
    }

    function collectAndPreprocessInputs() {
        const parseNum = (el, def = 0) => {
            const rawValue = parseFloat(el.value) || def;
            // Convertir automáticamente de cm a mm si es necesario
            if (window.unitsManager && window.unitsManager.getCurrentUnitText() === 'cm' && rawValue > 0) {
                return rawValue * 10; // cm a mm
            }
            return rawValue;
        };

        const inputs = {
            pieceWidth: parseNum(assistantPanelInputs.pieceWidth),
            pieceHeight: parseNum(assistantPanelInputs.pieceHeight),
            bleeds: {
                top: parseNum(assistantPanelInputs.bleedTop), bottom: parseNum(assistantPanelInputs.bleedBottom),
                left: parseNum(assistantPanelInputs.bleedLeft), right: parseNum(assistantPanelInputs.bleedRight),
            },
            spacing: {
                gripper: parseNum(assistantPanelInputs.gripper), top_margin: 0,
                horizontal_gutter: parseNum(assistantPanelInputs.horizontal_gutter),
                vertical_gutter: parseNum(assistantPanelInputs.vertical_gutter),
                center_horizontal_gutter: parseNum(assistantPanelInputs.center_horizontal_gutter),
                center_vertical_gutter: parseNum(assistantPanelInputs.center_vertical_gutter),
            },
            centerHorizontally: assistantPanelInputs.centerHorizontally.checked,
            useGripperOnBleedMode: assistantPanelInputs.useGripperOnBleedMode.checked
        };
        
        let originalWidth, originalHeight;
        const paperSelection = assistantPanelInputs.paperSelect.value;
        if (paperSelection === 'custom') {
            originalWidth = parseNum(assistantPanelInputs.customPaperWidth, 1000);
            originalHeight = parseNum(assistantPanelInputs.customPaperHeight, 700);
        } else {
            [originalWidth, originalHeight] = paperSelection.split(',').map(Number);
        }

        const cutsX = parseInt(assistantPanelInputs.cutsX.value) || 1;
        const cutsY = parseInt(assistantPanelInputs.cutsY.value) || 1;
        const cutW = originalWidth / cutsX;
        const cutH = originalHeight / cutsY;

        const useWidthPriority = assistantPanelInputs.priorityWidth.checked;
        if (useWidthPriority) {
            inputs.sheetWidth = Math.max(cutW, cutH);
            inputs.sheetHeight = Math.min(cutW, cutH);
        } else {
            inputs.sheetWidth = cutW;
            inputs.sheetHeight = cutH;
        }
        
        inputs.originalPaper = { width: originalWidth, height: originalHeight };
        inputs.cuts = { x: cutsX, y: cutsY };
        return inputs;
    }
    
    function updateResultsUI(result) {
        if (!result || !result.isValid) {
            resultsPanelDisplays.utilization.textContent = 'ERROR';
            resultsPanelDisplays.units.textContent = 'X';
            resultsPanelDisplays.unitsBreakdown.textContent = result.errorMessage || '(Cálculo inválido)';
            return;
        }
        
        resultsPanelDisplays.utilization.textContent = `${result.utilization.toFixed(1)}%`;
        resultsPanelDisplays.units.textContent = result.unitsTotal;
        resultsPanelDisplays.unitsBreakdown.textContent = `(${result.unitsX} a lo ancho × ${result.unitsY} a lo alto)`;
        
        const margins = result.finalMargins || { left: 0, right: 0, top: 0, bottom: 0 };
        
        // Formatear valores usando el UnitsManager para mostrar en la unidad correcta
        const leftMargin = window.unitsManager ? window.unitsManager.formatValue(margins.left) : `${margins.left.toFixed(1)} mm`;
        const rightMargin = window.unitsManager ? window.unitsManager.formatValue(margins.right) : `${margins.right.toFixed(1)} mm`;
        const topMargin = window.unitsManager ? window.unitsManager.formatValue(margins.top) : `${margins.top.toFixed(1)} mm`;
        const bottomMargin = window.unitsManager ? window.unitsManager.formatValue(margins.bottom) : `${margins.bottom.toFixed(1)} mm`;
        
        resultsPanelDisplays.marginContainer.innerHTML = `
            <div><span class="margin-label">Izquierdo:</span> <span id="margin-l-display">${leftMargin}</span></div>
            <div><span class="margin-label">Derecho:</span> <span id="margin-r-display">${rightMargin}</span></div>
            <div><span class="margin-label">Superior:</span> <span id="margin-t-display">${topMargin}</span></div>
            <div><span class="margin-label">Inferior:</span> <span id="margin-b-display">${bottomMargin}</span></div>
        `;
        
        interactiveElements.sheetInfoDisplay.textContent = `Pliego de Trabajo: ${result.sheetWidth.toFixed(0)} × ${result.sheetHeight.toFixed(0)} mm`;
    }
    
    function drawLayout(result, state) {
        if (!result || !result.isValid) {
            return;
        }
        
        const svgElement = interactiveElements.liveCanvas;
        const svgNS = "http://www.w3.org/2000/svg";
        
        // Limpiar SVG existente
        while (svgElement.firstChild) {
            svgElement.removeChild(svgElement.firstChild);
        }
        
        // Configurar dimensiones del SVG para usar todo el espacio disponible
        const containerRect = svgElement.parentElement.getBoundingClientRect();
        const width = Math.max(containerRect.width - 20, 400); // Mínimo 400px
        const height = Math.max(containerRect.height - 60, 300); // Mínimo 300px, espacio para info
        svgElement.setAttribute("width", width);
        svgElement.setAttribute("height", height);
        
        // Escalar para que quepa bien en el SVG
        const scale = Math.min(
            (width - 40) / result.sheetWidth,
            (height - 40) / result.sheetHeight
        );
        
        // Centrar en el SVG
        const offsetX = (width - (result.sheetWidth * scale)) / 2;
        const offsetY = (height - (result.sheetHeight * scale)) / 2;
        
        // Crear grupo principal con transformación (invertir Y como en el export)
        const mainGroup = document.createElementNS(svgNS, "g");
        mainGroup.setAttribute("transform", `translate(${offsetX}, ${offsetY}) scale(${scale}) matrix(1 0 0 -1 0 ${result.sheetHeight})`);
        
        // Añadir área de hoja completa
        const sheetBackground = document.createElementNS(svgNS, "rect");
        sheetBackground.setAttribute("x", "0");
        sheetBackground.setAttribute("y", "0");
        sheetBackground.setAttribute("width", result.sheetWidth.toString());
        sheetBackground.setAttribute("height", result.sheetHeight.toString());
        sheetBackground.setAttribute("fill", "#ffffff");
        sheetBackground.setAttribute("stroke", "#000000");
        sheetBackground.setAttribute("stroke-width", (1/scale).toString());
        mainGroup.appendChild(sheetBackground);
        

        // Dibujar piezas
        result.pieces.forEach(piece => {
            // Área de sangrado
            const bleedBox = document.createElementNS(svgNS, "rect");
            bleedBox.setAttribute("x", piece.x.toString());
            bleedBox.setAttribute("y", piece.y.toString());
            bleedBox.setAttribute("width", piece.totalWidth.toString());
            bleedBox.setAttribute("height", piece.totalHeight.toString());
            bleedBox.setAttribute("fill", "rgba(100, 150, 255, 0.1)");
            bleedBox.setAttribute("stroke", "#3182ce");
            bleedBox.setAttribute("stroke-width", (0.5/scale).toString());
            bleedBox.setAttribute("stroke-dasharray", `${2/scale},${2/scale}`);
            mainGroup.appendChild(bleedBox);
            
            // Área de corte
            const trimBox = document.createElementNS(svgNS, "rect");
            trimBox.setAttribute("x", (piece.x + state.bleeds.left).toString());
            trimBox.setAttribute("y", (piece.y + state.bleeds.bottom).toString());
            trimBox.setAttribute("width", piece.width.toString());
            trimBox.setAttribute("height", piece.height.toString());
            trimBox.setAttribute("fill", "none");
            trimBox.setAttribute("stroke", "#000000");
            trimBox.setAttribute("stroke-width", (0.5/scale).toString());
            mainGroup.appendChild(trimBox);
        });
        
        // Añadir el grupo principal al SVG
        svgElement.appendChild(mainGroup);
        
        // Visual details module removed per user feedback after testing
        
        // Refresh layout viewer after drawing
        if (layoutViewer) {
            layoutViewer.refresh();
        }
    }

    function drawCutPreview(originalPaper, cuts) {
        const canvas = interactiveElements.cutPreviewCanvas;
        const ctx = canvas.getContext('2d');
        const width = canvas.width = 300;
        const height = canvas.height = 300;
        
        // Escalar para que quepa bien en el canvas
        const scale = Math.min(
            (width - 40) / originalPaper.width,
            (height - 40) / originalPaper.height
        );
        
        // Centrar en el canvas
        const offsetX = (width - (originalPaper.width * scale)) / 2;
        const offsetY = (height - (originalPaper.height * scale)) / 2;
        
        // Limpiar canvas
        ctx.clearRect(0, 0, width, height);
        
        // Dibujar fondo
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(offsetX, offsetY, originalPaper.width * scale, originalPaper.height * scale);
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 1;
        ctx.strokeRect(offsetX, offsetY, originalPaper.width * scale, originalPaper.height * scale);
        
        // Dibujar líneas de corte
        ctx.strokeStyle = '#ff0000';
        ctx.setLineDash([5, 5]);
        
        // Cortes verticales
        const stepX = (originalPaper.width * scale) / cuts.x;
        for (let i = 1; i < cuts.x; i++) {
            ctx.beginPath();
            ctx.moveTo(offsetX + i * stepX, offsetY);
            ctx.lineTo(offsetX + i * stepX, offsetY + originalPaper.height * scale);
            ctx.stroke();
        }
        
        // Cortes horizontales
        const stepY = (originalPaper.height * scale) / cuts.y;
        for (let i = 1; i < cuts.y; i++) {
            ctx.beginPath();
            ctx.moveTo(offsetX, offsetY + i * stepY);
            ctx.lineTo(offsetX + originalPaper.width * scale, offsetY + i * stepY);
            ctx.stroke();
        }
        
        ctx.setLineDash([]);
    }

    function initializeEventListeners() {
        const allInputs = document.querySelectorAll('#assistant-panel input, #assistant-panel select');
        allInputs.forEach(input => input.addEventListener('input', mainController));
        
        interactiveElements.themeToggle.addEventListener('click', () => { /* ... */ });
        
        interactiveElements.collapsibleTrigger.addEventListener('click', () => {
             interactiveElements.collapsibleContent.style.display = 
                interactiveElements.collapsibleContent.style.display === 'block' ? 'none' : 'block';
             const arrow = interactiveElements.collapsibleContent.style.display === 'block' ? '▲' : '▼';
             interactiveElements.collapsibleTrigger.textContent = `3. Ajustes Finos (Opcional) ${arrow}`;
        });
        
        interactiveElements.linkBleedsBtn.addEventListener('click', () => { /* ... */ });
        
        assistantPanelInputs.paperSelect.addEventListener('change', () => {
            assistantPanelInputs.customPaperInputs.classList.toggle('hidden', assistantPanelInputs.paperSelect.value !== 'custom');
        });
        
        assistantPanelInputs.cutsX.addEventListener('input', () => assistantPanelInputs.cutTypeSelect.value = 'custom');
        assistantPanelInputs.cutsY.addEventListener('input', () => assistantPanelInputs.cutTypeSelect.value = 'custom');
        
        assistantPanelInputs.cutTypeSelect.addEventListener('change', () => {
            if (assistantPanelInputs.cutTypeSelect.value !== 'custom') {
                const [x, y] = assistantPanelInputs.cutTypeSelect.value.split(',').map(Number);
                assistantPanelInputs.cutsX.value = x;
                assistantPanelInputs.cutsY.value = y;
            }
            // LLAMADA AÑADIDA PARA EL RECALCULO
            mainController(); 
        });

        interactiveElements.swapDimensionsBtn.addEventListener('click', () => {
            const widthVal = assistantPanelInputs.pieceWidth.value;
            assistantPanelInputs.pieceWidth.value = assistantPanelInputs.pieceHeight.value;
            assistantPanelInputs.pieceHeight.value = widthVal;
            mainController();
        });

        interactiveElements.calculateBtn.addEventListener('click', mainController);
        
        // Añadir evento para el botón de exportación SVG
        interactiveElements.svgBtn.addEventListener('click', exportLayoutSVG);

        if (localStorage.getItem('papeloptimizador-theme') === 'dark') { /* ... */ }
        
        // Exponer mainController globalmente para que el units-manager pueda llamarlo
        window.mainController = mainController;
        
        mainController();
    }
    
    // Re-assign listeners for brevity
    interactiveElements.themeToggle.addEventListener('click', () => { document.body.classList.toggle('dark-mode'); const isDark = document.body.classList.contains('dark-mode'); interactiveElements.themeToggle.textContent = isDark ? '☀️' : '🌙'; localStorage.setItem('papeloptimizador-theme', isDark ? 'dark' : 'light'); });
    interactiveElements.linkBleedsBtn.addEventListener('click', () => { const topValue = assistantPanelInputs.bleedTop.value; assistantPanelInputs.bleedBottom.value = topValue; assistantPanelInputs.bleedLeft.value = topValue; assistantPanelInputs.bleedRight.value = topValue; mainController(); });
    interactiveElements.swapCutsBtn.addEventListener('click', () => { const tempX = assistantPanelInputs.cutsX.value; assistantPanelInputs.cutsX.value = assistantPanelInputs.cutsY.value; assistantPanelInputs.cutsY.value = tempX; mainController(); });
    if (localStorage.getItem('papeloptimizador-theme') === 'dark') { document.body.classList.add('dark-mode'); interactiveElements.themeToggle.textContent = '☀️'; }

    // Función para exportar el layout como SVG profesional para pre-prensa
    function exportLayoutSVG() {
        // Obtener estado actual
        const appState = collectAndPreprocessInputs();
        const engine = new ImpositionEngine();
        const result = engine.calculateLayout(appState);
        
        if (!result || !result.isValid) {
            alert('No hay un layout válido para exportar. Por favor verifica los parámetros.');
            return;
        }

        // Crear un nuevo documento SVG
        const svgNS = 'http://www.w3.org/2000/svg';
        const svg = document.createElementNS(svgNS, 'svg');
        
        // Establecer atributos para el SVG (dimensiones precisas en mm)
        svg.setAttribute('width', result.sheetWidth + 'mm');
        svg.setAttribute('height', result.sheetHeight + 'mm');
        svg.setAttribute('viewBox', `0 0 ${result.sheetWidth} ${result.sheetHeight}`);
        svg.setAttribute('xmlns', svgNS);
        svg.setAttribute('version', '1.1');
        
        // Crear un grupo principal invertido (como en la vista previa)
        const g = document.createElementNS(svgNS, 'g');
        g.setAttribute('transform', `matrix(1 0 0 -1 0 ${result.sheetHeight})`);
        svg.appendChild(g);
        
        // Añadir área de hoja completa
        const sheetBackground = document.createElementNS(svgNS, 'rect');
        sheetBackground.setAttribute('x', '0');
        sheetBackground.setAttribute('y', '0');
        sheetBackground.setAttribute('width', result.sheetWidth.toString());
        sheetBackground.setAttribute('height', result.sheetHeight.toString());
        sheetBackground.setAttribute('fill', 'white');
        sheetBackground.setAttribute('stroke', '#000000');
        sheetBackground.setAttribute('stroke-width', '0.25');
        g.appendChild(sheetBackground);
        
        // Añadir piezas (solo área de corte con contorno sólido)
        result.pieces.forEach(p => {
            // Área de corte
            const trimBox = document.createElementNS(svgNS, 'rect');
            trimBox.setAttribute('x', (p.x + appState.bleeds.left).toString());
            trimBox.setAttribute('y', (p.y + appState.bleeds.bottom).toString());
            trimBox.setAttribute('width', p.width.toString());
            trimBox.setAttribute('height', p.height.toString());
            trimBox.setAttribute('fill', 'none');
            trimBox.setAttribute('stroke', '#000000');
            trimBox.setAttribute('stroke-width', '0.25');
            g.appendChild(trimBox);
        });
        
        // Convertir el SVG a string
        const serializer = new XMLSerializer();
        const svgString = serializer.serializeToString(svg);
        
        // Crear un Blob y descargar
        const blob = new Blob([svgString], { type: 'image/svg+xml' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        
        // Generar nombre de archivo con dimensiones
        const filename = `imposicion_${appState.pieceWidth}x${appState.pieceHeight}_${result.unitsTotal}pzs.svg`;
        
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }
    

    

    

    
    // === JOB INFORMATION MANAGEMENT ===
    
    // Job info storage
    let jobInfo = {
        title: '',
        client: '',
        quote: '',
        date: '',
        notes: ''
    };
    
    // Load job info from localStorage
    function loadJobInfo() {
        const saved = localStorage.getItem('papeloptimizador-jobinfo');
        if (saved) {
            try {
                jobInfo = JSON.parse(saved);
                updateJobInfoButton();
                populateJobInfoForm();
            } catch (e) {
                console.warn('Error loading job info:', e);
            }
        }
        // Set today's date as default
        if (!jobInfo.date) {
            jobInfo.date = new Date().toISOString().split('T')[0];
        }
    }
    
    // Save job info to localStorage
    function saveJobInfo() {
        localStorage.setItem('papeloptimizador-jobinfo', JSON.stringify(jobInfo));
        updateJobInfoButton();
    }
    
    // Update job info button appearance
    function updateJobInfoButton() {
        const btn = interactiveElements.jobInfoBtn;
        const icon = document.getElementById('job-info-icon');
        const text = document.getElementById('job-info-text');
        
        const hasInfo = jobInfo.title || jobInfo.client || jobInfo.quote;
        
        if (hasInfo) {
            btn.classList.add('has-info');
            icon.textContent = '✅';
            const clientText = jobInfo.client ? ` (${jobInfo.client})` : '';
            text.textContent = `Info del Trabajo${clientText}`;
            btn.title = 'Editar información del trabajo';
        } else {
            btn.classList.remove('has-info');
            icon.textContent = '📋';
            text.textContent = 'Info del Trabajo';
            btn.title = 'Agregar información del trabajo';
        }
    }
    
    // Populate form with current job info
    function populateJobInfoForm() {
        document.getElementById('job-title').value = jobInfo.title || '';
        document.getElementById('job-client').value = jobInfo.client || '';
        document.getElementById('job-quote').value = jobInfo.quote || '';
        document.getElementById('job-date').value = jobInfo.date || new Date().toISOString().split('T')[0];
        document.getElementById('job-notes').value = jobInfo.notes || '';
    }
    
    // Get job info from form
    function getJobInfoFromForm() {
        return {
            title: document.getElementById('job-title').value.trim() || 'sin_titulo',
            client: document.getElementById('job-client').value.trim(),
            quote: document.getElementById('job-quote').value.trim(),
            date: document.getElementById('job-date').value,
            notes: document.getElementById('job-notes').value.trim()
        };
    }
    
    // Modal management
    const modal = document.getElementById('job-info-modal');
    const modalClose = document.querySelector('.modal-close');
    const cancelBtn = document.getElementById('job-info-cancel');
    const saveBtn = document.getElementById('job-info-save');
    
    function openJobInfoModal() {
        populateJobInfoForm();
        modal.style.display = 'block';
        // Focus on first input
        setTimeout(() => document.getElementById('job-title').focus(), 100);
    }
    
    function closeJobInfoModal() {
        modal.style.display = 'none';
    }
    
    // Event listeners for modal
    interactiveElements.jobInfoBtn.addEventListener('click', openJobInfoModal);
    modalClose.addEventListener('click', closeJobInfoModal);
    cancelBtn.addEventListener('click', closeJobInfoModal);
    
    saveBtn.addEventListener('click', () => {
        jobInfo = getJobInfoFromForm();
        saveJobInfo();
        closeJobInfoModal();
    });
    
    // Close modal when clicking outside
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            closeJobInfoModal();
        }
    });
    
    // Close modal with Escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && modal.style.display === 'block') {
            closeJobInfoModal();
        }
    });
    
    // Enhanced PDF generation with job info check
    function generatePDFWithJobInfo() {
        const appState = collectAndPreprocessInputs();
        const engine = new ImpositionEngine();
        const result = engine.calculateLayout(appState);
        
        // Check if job info exists
        const hasJobInfo = jobInfo.title || jobInfo.client || jobInfo.quote;
        
        if (!hasJobInfo) {
            // Show modal first, then generate PDF after saving
            const originalSaveHandler = saveBtn.onclick;
            saveBtn.onclick = () => {
                jobInfo = getJobInfoFromForm();
                saveJobInfo();
                closeJobInfoModal();
                // Generate PDF with new job info
                generateTechnicalPDF(appState, result, jobInfo);
                // Restore original handler
                saveBtn.onclick = originalSaveHandler;
            };
            openJobInfoModal();
        } else {
            // Generate PDF directly with existing job info
            generateTechnicalPDF(appState, result, jobInfo);
        }
    }
    
    // Event listener para generar PDF
    interactiveElements.pdfBtn.addEventListener('click', generatePDFWithJobInfo);
    
    // Initialize job info on load
    loadJobInfo();
    
    initializeEventListeners();
});