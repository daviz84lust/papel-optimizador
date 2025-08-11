/**
 * Layout Viewer Module
 * Professional pan & zoom functionality for the central layout area
 * Handles SVG transformations, user interactions, and UI controls
 */

class LayoutViewer {
    constructor(svgElement, containerElement) {
        this.svg = svgElement;
        this.container = containerElement;
        this.svgNS = "http://www.w3.org/2000/svg";

        // View state
        this.viewState = {
            scale: 1,
            translateX: 0,
            translateY: 0,
            minScale: 0.1,
            maxScale: 5,
            isPanning: false,
            lastPanPoint: { x: 0, y: 0 }
        };

        // Initialize viewer
        this.init();
    }

    init() {
        this.setupContainer();
        this.createControls();
        this.bindEvents();
        this.updateViewBox();
    }

    setupContainer() {
        // Make container relative for absolute positioning of controls
        this.container.style.position = 'relative';
        this.container.style.overflow = 'hidden';

        // Ensure SVG fills container
        this.svg.style.width = '100%';
        this.svg.style.height = '100%';
        this.svg.style.cursor = 'grab';
    }

    createControls() {
        // Create floating control panel
        const controlPanel = document.createElement('div');
        controlPanel.className = 'layout-controls';
        controlPanel.innerHTML = `
            <button class="control-btn" id="fit-screen" title="Fit to Screen">⌂</button>
            <div class="zoom-indicator" id="zoom-level">100%</div>
        `;

        this.container.appendChild(controlPanel);
        this.controlPanel = controlPanel;

        // Store control references
        this.controls = {
            fitScreen: controlPanel.querySelector('#fit-screen'),
            zoomLevel: controlPanel.querySelector('#zoom-level')
        };
    }

    bindEvents() {
        // Control button events
        this.controls.fitScreen.addEventListener('click', () => this.fitToScreen());

        // Pan events (only within SVG area)
        this.svg.addEventListener('mousedown', (e) => this.startPan(e));
        this.svg.addEventListener('mousemove', (e) => this.updatePan(e));
        this.svg.addEventListener('mouseup', () => this.endPan());
        this.svg.addEventListener('mouseleave', () => this.endPan());

        // Prevent context menu on right click
        this.svg.addEventListener('contextmenu', (e) => e.preventDefault());
    }

    startPan(e) {
        if (e.button === 0) { // Left mouse button only
            this.viewState.isPanning = true;
            this.viewState.lastPanPoint = { x: e.clientX, y: e.clientY };
            this.svg.style.cursor = 'grabbing';
            e.preventDefault();
        }
    }

    updatePan(e) {
        if (!this.viewState.isPanning) return;

        const deltaX = e.clientX - this.viewState.lastPanPoint.x;
        const deltaY = e.clientY - this.viewState.lastPanPoint.y;

        this.viewState.translateX += deltaX / this.viewState.scale;
        this.viewState.translateY += deltaY / this.viewState.scale;

        this.viewState.lastPanPoint = { x: e.clientX, y: e.clientY };
        this.updateTransform();

        e.preventDefault();
    }

    endPan() {
        this.viewState.isPanning = false;
        this.svg.style.cursor = 'grab';
    }


    zoom(factor) {
        const newScale = this.viewState.scale * factor;
        if (newScale >= this.viewState.minScale && newScale <= this.viewState.maxScale) {
            this.viewState.scale = newScale;
            this.updateTransform();
            this.updateZoomIndicator();
        }
    }

    fitToScreen() {
        // Get SVG content bounds
        const bbox = this.getContentBounds();
        if (!bbox) return;

        // Get device info
        const deviceInfo = window.MobileUX && window.MobileUX.getDeviceInfo();
        const isMobile = deviceInfo && deviceInfo.isMobile;
        const isTablet = deviceInfo && deviceInfo.isTablet;
        const orientation = deviceInfo && deviceInfo.orientation;

        // Get container dimensions
        const containerRect = this.container.getBoundingClientRect();

        // Default padding around content
        let padding = 40;

        // Adjust container dimensions based on device
        let containerWidth = containerRect.width;
        let containerHeight = containerRect.height;

        // Device-specific adjustments
        if (isMobile) {
            // Mobile devices need special handling
            if (orientation === 'portrait') {
                // In portrait mode, use the full container height
                containerHeight = containerRect.height;
                // Reduce padding for smaller screens
                padding = 10; // Reduced padding for mobile portrait
            } else {
                // In landscape mode, ensure we use the full container
                containerHeight = containerRect.height;
                // Slightly reduce padding
                padding = 20; // Reduced padding for mobile landscape
            }
        } else if (isTablet) {
            // Tablet devices
            if (orientation === 'portrait') {
                // In portrait mode, ensure we account for the panel structure
                containerHeight = containerRect.height;
                padding = 20; // Reduced padding for tablet portrait
            }
            // Landscape mode can use default values
        }

        // Calculate scale to fit content within container
        const scaleX = (containerWidth - padding) / bbox.width;
        const scaleY = (containerHeight - padding) / bbox.height;

        // Calculate the appropriate scale to fit content within container
        // Use the minimum of width and height scales to ensure the layout fits properly
        const scale = Math.min(scaleX, scaleY);

        // Center the content
        const centerX = bbox.x + bbox.width / 2;
        const centerY = bbox.y + bbox.height / 2;
        const containerCenterX = containerWidth / 2;
        const containerCenterY = containerHeight / 2;

        // Apply scale and translation, respecting min/max scale limits
        this.viewState.scale = Math.max(this.viewState.minScale, Math.min(scale, this.viewState.maxScale));
        this.viewState.translateX = (containerCenterX / this.viewState.scale) - centerX;
        this.viewState.translateY = (containerCenterY / this.viewState.scale) - centerY;

        // Update the view
        this.updateTransform();
        this.updateZoomIndicator();

        // Force a redraw after a small delay to ensure everything is properly positioned
        setTimeout(() => {
            this.updateTransform();
        }, 50);
    }


    getContentBounds() {
        try {
            const mainGroup = this.svg.querySelector('g');
            if (mainGroup) {
                return mainGroup.getBBox();
            }
            return this.svg.getBBox();
        } catch (e) {
            // Fallback if getBBox fails
            return { x: 0, y: 0, width: 800, height: 600 };
        }
    }

    updateTransform() {
        const mainGroup = this.svg.querySelector('g');
        if (mainGroup) {
            // Get the original transform
            const originalTransform = mainGroup.getAttribute('transform') || '';
            const scaleTransform = `scale(${this.viewState.scale})`;
            const translateTransform = `translate(${this.viewState.translateX}, ${this.viewState.translateY})`;

            // Apply pan and zoom transforms before the original transform
            mainGroup.setAttribute('transform', `${translateTransform} ${scaleTransform} ${originalTransform.replace(/^(translate\([^)]*\)\s*)?scale\([^)]*\)\s*/, '')}`);
        }
    }

    updateViewBox() {
        // Get container dimensions
        const containerRect = this.container.getBoundingClientRect();

        // Store previous dimensions to detect significant changes
        const prevWidth = this._prevContainerWidth || 0;
        const prevHeight = this._prevContainerHeight || 0;

        // Update SVG attributes
        this.svg.setAttribute('width', containerRect.width);
        this.svg.setAttribute('height', containerRect.height);
        this.svg.setAttribute('viewBox', `0 0 ${containerRect.width} ${containerRect.height}`);

        // Check if container dimensions have changed significantly (e.g., orientation change)
        const widthChange = Math.abs(containerRect.width - prevWidth);
        const heightChange = Math.abs(containerRect.height - prevHeight);
        const significantChange = widthChange > 50 || heightChange > 50;

        // Store current dimensions for next comparison
        this._prevContainerWidth = containerRect.width;
        this._prevContainerHeight = containerRect.height;

        // If dimensions changed significantly, refit to screen
        if (significantChange && this._initialized) {
            // Use a small delay to ensure the container has fully resized
            setTimeout(() => this.fitToScreen(), 100);
        }

        // Mark as initialized after first call
        this._initialized = true;
    }

    updateZoomIndicator() {
        const percentage = Math.round(this.viewState.scale * 100);
        this.controls.zoomLevel.textContent = `${percentage}%`;
    }

    // Public method to refresh the viewer when content changes
    refresh() {
        this.updateViewBox();

        // Auto-fit on first load or when content significantly changes
        if (this.viewState.scale === 1 && this.viewState.translateX === 0 && this.viewState.translateY === 0) {
            // Use a longer delay on mobile devices to ensure the layout is fully rendered
            const deviceInfo = window.MobileUX && window.MobileUX.getDeviceInfo();
            const isMobile = deviceInfo && deviceInfo.isMobile;
            const delay = isMobile ? 300 : 100;

            setTimeout(() => this.fitToScreen(), delay);
        }
    }

    // Public method to get current view state (useful for exports)
    getViewState() {
        return { ...this.viewState };
    }

    // Public method to set view state
    setViewState(state) {
        Object.assign(this.viewState, state);
        this.updateTransform();
        this.updateZoomIndicator();
    }
}

// Export for use in main application
window.LayoutViewer = LayoutViewer;
