document.addEventListener('DOMContentLoaded', () => {
    const container = document.getElementById('simulator-container');
    const resetButton = document.getElementById('reset-button'); // Get reset button
    let speciesCounter = 0;

    // --- Configuration ---
    // Keep INITIAL_SPECIES as a constant template
    const INITIAL_SPECIES_TEMPLATE = {
        id: 0, // Initial ID will always be 0
        parentId: null,
        generation: 0,
        x: 50, // Percentage from left (center)
        y: 10, // Percentage from top (center)
        size: 30,
        color: { h: 0, s: 100, l: 50 },
        shape: 'square',
        canSpeciate: true
    };

    const MUTATION_CONFIG = {
        hueShift: 20,
        saturationShift: 10,
        lightnessShift: 10,
        sizeChangeFactor: 0.2,
        shapeMutationChance: 0.3
    };

    const LAYOUT_CONFIG = {
        verticalSpacing: 90,   // Increased spacing a bit
        // Let's use a fixed horizontal pixel spread relative to parent
        // We might need to adjust this based on desired tree density
        horizontalSpreadPixels: 120
    };

    // --- State Variables ---
    let allSpecies = []; // Will be initialized by reset function
    let isPanning = false;
    let startX, startY, scrollLeftStart, scrollTopStart;

    // --- Initialization Function ---
    function initializeSimulation() {
        // 1. Clear the container
        container.innerHTML = '';

        // 2. Reset state variables
        speciesCounter = 0;
        // Create a *fresh copy* of the initial species data
        const firstSpecies = {
            ...INITIAL_SPECIES_TEMPLATE,
            id: speciesCounter++ // Assign ID 0 and increment counter
         };
        allSpecies = [firstSpecies];

        // 3. Reset scroll/pan position
        container.scrollLeft = 0;
        container.scrollTop = 0;
        // Center the initial view somewhat (optional)
        // We need container dimensions for this, might be tricky on initial load
        // Best to let user pan from the start or adjust later

        // 4. Render the initial species
        renderSpecies(firstSpecies);

        console.log("Simulation Reset");
    }


    // --- Core Functions (renderSpecies, renderConnector - keep as before) ---
    function renderSpecies(speciesData) {
        const el = document.createElement('div');
        el.classList.add('species');
        el.classList.add(`shape-${speciesData.shape}`);
        el.dataset.id = speciesData.id;

        // Calculate position IN PIXELS for styling
        // We need container's scroll dimensions for absolute positioning within the scrollable area
        // For simplicity, let's keep using % for data, pixel for style, but be aware large trees
        // might need > 100% values, which is fine for absolute positioning.
        const containerRect = container.getBoundingClientRect(); // Visible part
        const containerScrollWidth = container.scrollWidth; // Full content width
        const containerScrollHeight = container.scrollHeight; // Full content height

        // Use scroll dimensions if available and larger, otherwise fallback to clientRect
        const effectiveWidth = Math.max(containerRect.width, containerScrollWidth);
        const effectiveHeight = Math.max(containerRect.height, containerScrollHeight);


        // Calculate pixel position based on the *potential* full dimensions
        const pixelX = (speciesData.x / 100) * effectiveWidth - (speciesData.size / 2);
        const pixelY = (speciesData.y / 100) * effectiveHeight - (speciesData.size / 2);


        el.style.left = `${pixelX}px`;
        el.style.top = `${pixelY}px`;
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
        const containerRect = container.getBoundingClientRect();
        const containerScrollWidth = container.scrollWidth;
        const containerScrollHeight = container.scrollHeight;
        const effectiveWidth = Math.max(containerRect.width, containerScrollWidth);
        const effectiveHeight = Math.max(containerRect.height, containerScrollHeight);


        const parentCenterX = (parentData.x / 100) * effectiveWidth;
        const parentCenterY = (parentData.y / 100) * effectiveHeight;
        const childCenterX = (childData.x / 100) * effectiveWidth;
        const childCenterY = (childData.y / 100) * effectiveHeight;

        const deltaX = childCenterX - parentCenterX;
        const deltaY = childCenterY - parentCenterY;
        const length = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
        const angle = Math.atan2(deltaY, deltaX) * (180 / Math.PI);

        if (isNaN(length) || !isFinite(length) || length <= 0 || isNaN(angle) || !isFinite(angle) || isNaN(parentCenterX) || isNaN(parentCenterY)) {
            console.error("Invalid calculation for line geometry!", { length, angle, parentCenterX, parentCenterY });
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

    // --- Event Handlers ---
    function handleSpeciationClick(event) {
        const parentElement = event.target;
        const parentId = parseInt(parentElement.dataset.id);
        const parentData = allSpecies.find(s => s.id === parentId);

        if (!parentData || !parentData.canSpeciate) return;

        parentData.canSpeciate = false;
        parentElement.removeEventListener('click', handleSpeciationClick);
        parentElement.classList.add('speciated');

        createAndRenderChild(parentData, -1); // Child 1 (left)
        createAndRenderChild(parentData, 1);  // Child 2 (right)

        // Check if container needs resizing (simplistic check)
        // A more robust solution might track max/min x/y percentages
        checkContainerScroll();
    }

    function createAndRenderChild(parentData, horizontalFactor) {
        const childData = {
            id: speciesCounter++,
            parentId: parentData.id,
            generation: parentData.generation + 1,
            size: mutateSize(parentData.size),
            color: mutateColor(parentData.color),
            shape: mutateShape(parentData.shape),
            canSpeciate: true
        };

        // --- Calculate Position (using pixels for spacing logic) ---
        const containerRect = container.getBoundingClientRect(); // Use visible rect for initial basis
        const containerScrollWidth = container.scrollWidth;
        const containerScrollHeight = container.scrollHeight;
        const effectiveWidth = Math.max(containerRect.width, containerScrollWidth);
        const effectiveHeight = Math.max(containerRect.height, containerScrollHeight);


        // Parent center in pixels relative to the container's potentially larger scroll area
        const parentPixelCenterX = (parentData.x / 100) * effectiveWidth;
        const parentPixelCenterY = (parentData.y / 100) * effectiveHeight;

        // Child center Y in pixels
        const childPixelCenterY = parentPixelCenterY + LAYOUT_CONFIG.verticalSpacing;

        // Child center X offset using fixed pixel spread relative to parent's X
        // No longer decrease spread with generation for wider trees
        const horizontalOffsetPixels = LAYOUT_CONFIG.horizontalSpreadPixels * horizontalFactor;
        const childPixelCenterX = parentPixelCenterX + horizontalOffsetPixels;

        // --- Convert child's *absolute pixel* coordinates back to percentages
        //     relative to the *potentially changed* effective container dimensions ---
        // This ensures % stays consistent even if container grows
        childData.x = (childPixelCenterX / effectiveWidth) * 100;
        childData.y = (childPixelCenterY / effectiveHeight) * 100;

        // --- NO CLAMPING needed - let it expand ---

        allSpecies.push(childData);
        renderSpecies(childData);
        renderConnector(parentData, childData);
    }

    // --- Mutation Functions (keep as before) ---
    function mutateValue(value, shift, min, max) { /* ... */ }
    function mutateColor(parentColor) { /* ... */ }
    function mutateSize(parentSize) { /* ... */ }
    function mutateShape(parentShape) { /* ... */ }


    // --- Panning Logic ---
    function handleMouseDown(e) {
        // Only pan with the primary mouse button, and not on species elements
        if (e.button !== 0 || e.target.classList.contains('species')) {
            return;
        }
        isPanning = true;
        startX = e.pageX - container.offsetLeft; // Position relative to container edge
        startY = e.pageY - container.offsetTop;
        scrollLeftStart = container.scrollLeft;
        scrollTopStart = container.scrollTop;
        container.style.cursor = 'grabbing'; // Change cursor immediately
        container.style.userSelect = 'none'; // Prevent text selection during drag
         // Prevent default image drag or other unwanted behaviors
        e.preventDefault();
    }

    function handleMouseMove(e) {
        if (!isPanning) return;
        e.preventDefault(); // Prevent default during drag

        const currentX = e.pageX - container.offsetLeft;
        const currentY = e.pageY - container.offsetTop;

        const walkX = currentX - startX; // How far mouse has moved
        const walkY = currentY - startY;

        container.scrollLeft = scrollLeftStart - walkX; // Scroll opposite direction
        container.scrollTop = scrollTopStart - walkY;
    }

    function stopPanning() {
        if (!isPanning) return; // Avoid redundant calls
        isPanning = false;
        container.style.cursor = 'grab'; // Restore cursor
        container.style.removeProperty('user-select');
    }

    // --- Helper to check if container needs scrollbars ---
    // Basic check, called after adding children
    function checkContainerScroll() {
       // The 'overflow: auto' CSS handles showing scrollbars automatically.
       // However, our percentage calculations rely on effectiveWidth/Height.
       // If new elements push scrollWidth/scrollHeight larger, subsequent %
       // calculations will adapt. No explicit JS needed to *enable* scrollbars.
    }


    // --- Event Listeners Setup ---
    resetButton.addEventListener('click', initializeSimulation);

    // Panning listeners on the container
    container.addEventListener('mousedown', handleMouseDown);
    // Attach move and up listeners to the document or window to catch events
    // even if the cursor leaves the container during the drag.
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', stopPanning);
    // Stop panning if mouse leaves the container element too
    // container.addEventListener('mouseleave', stopPanning); // Can be slightly annoying, document mouseup is usually enough


    // --- Initialisation ---
    initializeSimulation(); // Start the simulation on page load

}); // End DOMContentLoaded
