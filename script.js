document.addEventListener('DOMContentLoaded', () => {
    const container = document.getElementById('simulator-container');
    const resetButton = document.getElementById('reset-button');
    let speciesCounter = 0;

    // --- Configuration ---
    // Store initial Y position in pixels, X will be calculated dynamically
    const INITIAL_SPECIES_Y_POS = 50; // Pixels from top

    const MUTATION_CONFIG = {
        hueShift: 10,
        saturationShift: 5,
        lightnessShift: 5,
        sizeChangeFactor: 0.2,
        shapeMutationChance: 0.3
    };

    const LAYOUT_CONFIG = {
        verticalSpacing: 90,   // Pixels
        horizontalSpreadPixels: 120 // Pixels
    };

    // --- State Variables ---
    let allSpecies = [];
    let isPanning = false;
    let startX, startY, scrollLeftStart, scrollTopStart;

    // --- Initialization Function ---
    function initializeSimulation() {
        container.innerHTML = '';
        speciesCounter = 0;

        // *** Calculate initial X position based on current visible container width ***
        // We need the container to have rendered to get its width
        const containerRect = container.getBoundingClientRect();
        const initialX = containerRect.width / 2; // Start at horizontal center of visible area

        const firstSpecies = {
            // No template needed, just define it
            id: speciesCounter++,
            parentId: null,
            generation: 0,
            // *** Store position in PIXELS ***
            x: initialX, // Initial X position in pixels
            y: INITIAL_SPECIES_Y_POS, // Initial Y position in pixels
            size: 30,
            color: { h: 0, s: 100, l: 50 },
            shape: 'square',
            canSpeciate: true
        };

        allSpecies = [firstSpecies];

        // Reset scroll to show the initial area
        container.scrollLeft = initialX - containerRect.width / 2; // Center horizontally
        container.scrollTop = 0; // Scroll to top

        renderSpecies(firstSpecies);
        console.log("Simulation Reset and Initialized");
    }

    // --- Core Functions ---

    function renderSpecies(speciesData) {
        const el = document.createElement('div');
        el.classList.add('species');
        el.classList.add(`shape-${speciesData.shape}`);
        el.dataset.id = speciesData.id;

        // *** POSITIONING USING DIRECT PIXEL VALUES ***
        // Calculate top-left corner for CSS from center coordinates and size
        const pixelX = speciesData.x - (speciesData.size / 2);
        const pixelY = speciesData.y - (speciesData.size / 2);

        el.style.left = `${pixelX}px`;
        el.style.top = `${pixelY}px`;
        // --- End of change ---

        el.style.width = `${speciesData.size}px`;
        el.style.height = `${speciesData.size}px`;
        el.style.backgroundColor = `hsl(${speciesData.color.h}, ${speciesData.color.s}%, ${speciesData.color.l}%)`;

        if (speciesData.canSpeciate) {
            el.addEventListener('click', handleSpeciationClick);
        } else {
            el.classList.add('speciated');
        }

        container.appendChild(el);
        return el;
    }

    function renderConnector(parentData, childData) {
        // *** Calculations use direct pixel coordinates from data ***
        const parentCenterX = parentData.x;
        const parentCenterY = parentData.y;
        const childCenterX = childData.x;
        const childCenterY = childData.y;
        // --- End of change ---

        const deltaX = childCenterX - parentCenterX;
        const deltaY = childCenterY - parentCenterY;
        const length = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
        const angle = Math.atan2(deltaY, deltaX) * (180 / Math.PI);

        // Added more robust check here
        if (isNaN(length) || !isFinite(length) || length < 0 || isNaN(angle) || !isFinite(angle) || isNaN(parentCenterX) || isNaN(parentCenterY) || isNaN(childCenterX) || isNaN(childCenterY)) {
            console.error("Invalid calculation for line geometry!", { parentData, childData, length, angle });
            return;
        }
        // Avoid drawing zero-length lines which can cause issues
        if (length < 0.1) {
             console.warn("Skipping connector draw for near-zero length.");
             return;
        }


        const line = document.createElement('div');
        line.classList.add('connector');
        line.style.left = `${parentCenterX}px`;
        line.style.top = `${parentCenterY}px`;
        line.style.width = `${length}px`;
        line.style.transform = `rotate(${angle}deg)`;
        container.appendChild(line);
    }


    function handleSpeciationClick(event) {
        const parentElement = event.target;
        const parentId = parseInt(parentElement.dataset.id);
        const parentData = allSpecies.find(s => s.id === parentId);

        if (!parentData || !parentData.canSpeciate) return;

        parentData.canSpeciate = false;
        parentElement.removeEventListener('click', handleSpeciationClick);
        parentElement.classList.add('speciated');

        createAndRenderChild(parentData, -1);
        createAndRenderChild(parentData, 1);
        // No need for checkContainerScroll anymore
    }

    function createAndRenderChild(parentData, horizontalFactor) {
        const childData = {
            id: speciesCounter++,
            parentId: parentData.id,
            generation: parentData.generation + 1,
            size: mutateSize(parentData.size),
            color: mutateColor(parentData.color),
            shape: mutateShape(parentData.shape),
            canSpeciate: true,
            // *** x and y will be calculated as PIXELS below ***
        };

        // --- Calculate Position (directly in pixels) ---
        const parentPixelCenterX = parentData.x; // Already in pixels
        const parentPixelCenterY = parentData.y; // Already in pixels

        // Child center Y in pixels
        const childPixelCenterY = parentPixelCenterY + LAYOUT_CONFIG.verticalSpacing;

        // Child center X offset using fixed pixel spread relative to parent's X
        const horizontalOffsetPixels = LAYOUT_CONFIG.horizontalSpreadPixels * horizontalFactor;
        const childPixelCenterX = parentPixelCenterX + horizontalOffsetPixels;

        // *** Store child's absolute pixel coordinates ***
        childData.x = childPixelCenterX;
        childData.y = childPixelCenterY;
        // --- End of change ---

        allSpecies.push(childData);
        renderSpecies(childData);
        renderConnector(parentData, childData);
    }
    
    // --- Mutation Functions ---

    // Helper function for mutation
    function mutateValue(value, shift, min, max) {
        const change = (Math.random() * 2 - 1) * shift; // Random change +/- shift
        return Math.max(min, Math.min(max, value + change));
    }

    // *** THIS IS THE MISSING FUNCTION ***
    function mutateColor(parentColor) {
        // Safety check (good practice, though the root cause was the missing function)
        if (!parentColor || typeof parentColor.h === 'undefined' || typeof parentColor.s === 'undefined' || typeof parentColor.l === 'undefined') {
             console.error("Invalid or missing parentColor passed to mutateColor. Using default.", parentColor);
             return { h: Math.random() * 360, s: 80, l: 60 };
        }

        // Actual mutation logic
        const newColor = {
            h: (parentColor.h + mutateValue(0, MUTATION_CONFIG.hueShift, -MUTATION_CONFIG.hueShift, MUTATION_CONFIG.hueShift) + 360) % 360, // Keep hue in 0-360 range
            s: mutateValue(parentColor.s, MUTATION_CONFIG.saturationShift, 30, 100), // Keep saturation reasonable
            l: mutateValue(parentColor.l, MUTATION_CONFIG.lightnessShift, 30, 80)    // Keep lightness reasonable
        };
        return newColor;
    }
    // *** END OF MISSING FUNCTION ***


    function mutateSize(parentSize) {
        const minSize = 10;
        const maxSize = 100;
        // Added safety check for parentSize
        if (typeof parentSize !== 'number' || isNaN(parentSize)) {
            console.error("Invalid parentSize passed to mutateSize. Using default.", parentSize);
            parentSize = 30; // Default size
        }
        const changeFactor = 1 + (Math.random() * 2 - 1) * MUTATION_CONFIG.sizeChangeFactor;
        return Math.max(minSize, Math.min(maxSize, parentSize * changeFactor));
    }

    function mutateShape(parentShape) {
         // Added safety check for parentShape
        if (typeof parentShape !== 'string' || !parentShape) {
             console.error("Invalid parentShape passed to mutateShape. Using default.", parentShape);
             parentShape = 'square'; // Default shape
        }

        // Simple mutation: Square <-> Circle for now
        if (Math.random() < MUTATION_CONFIG.shapeMutationChance) {
            return parentShape === 'square' ? 'circle' : 'square';
        }
        return parentShape;
        // TODO: Add more shapes later
    }


    // --- Panning Logic (No changes needed here, should work fine) ---
    function handleMouseDown(e) {
        if (e.button !== 0 || e.target.classList.contains('species')) return;
        isPanning = true;
        startX = e.pageX - container.offsetLeft;
        startY = e.pageY - container.offsetTop;
        scrollLeftStart = container.scrollLeft;
        scrollTopStart = container.scrollTop;
        container.style.cursor = 'grabbing';
        container.style.userSelect = 'none';
        e.preventDefault();
    }

    function handleMouseMove(e) {
        if (!isPanning) return;
        e.preventDefault();
        const currentX = e.pageX - container.offsetLeft;
        const currentY = e.pageY - container.offsetTop;
        const walkX = currentX - startX;
        const walkY = currentY - startY;
        container.scrollLeft = scrollLeftStart - walkX;
        container.scrollTop = scrollTopStart - walkY;
    }

    function stopPanning() {
        if (!isPanning) return;
        isPanning = false;
        container.style.cursor = 'grab';
        container.style.removeProperty('user-select');
    }

    // --- checkContainerScroll function is no longer needed ---

    // --- Event Listeners Setup ---
    resetButton.addEventListener('click', initializeSimulation);
    container.addEventListener('mousedown', handleMouseDown);
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', stopPanning);

    // --- Initialisation ---
    // Needs a slight delay or alternative trigger if container size isn't known immediately.
    // DOMContentLoaded is usually sufficient if CSS sets a size.
    // If container size relies on JS/async CSS, might need 'load' event or ResizeObserver.
    initializeSimulation();

}); // End DOMContentLoaded
