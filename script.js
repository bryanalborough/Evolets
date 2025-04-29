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
        verticalSpacing: 50,        // Pixels (Keep as is or adjust)
        // horizontalSpreadPixels: 120 // <-- Remove or comment out this line
        baseHorizontalSpread: 40,  // Base spread in pixels for the first generation's children
        spreadIncreaseFactor: 1.2   // Multiply spread by this factor for each subsequent generation (adjust > 1.0)
                                    // Values between 1.1 and 1.4 often work well.
    };
    const VOWELS = ['a', 'e', 'i', 'o', 'u'];
    const CONSONANTS = [
        'b', 'c', 'd', 'f', 'g', 'h', 'j', 'k', 'l', 'm',
        'n', 'p', 'q', 'r', 's', 't', 'v', 'w', 'x', 'y', 'z'
    ];
    const CONSONANT_CLUSTERS = [
        'bl', 'br', 'ch', 'cl', 'cr', 'dr', 'fl', 'fr', 'gl', 'gr', 'ph',
        'pl', 'pr', 'qu', 'sc', 'sh', 'sk', 'sl', 'sm', 'sn', 'sp', 'st',
        'sw', 'th', 'tr', 'tw', 'wh', 'wr', 'sch', 'scr', 'shr', 'sph', 'spl',
        'spr', 'str', 'thr'
    ];
    const NAME_CONFIG = {
        minSyllables: 2,
        maxSyllables: 5, // Reduced max slightly for more manageable names
        clusterChance: 0.3 // 30% chance to use a cluster instead of single consonant
    };


    // --- State Variables ---
    let allSpecies = [];
    let isPanning = false;
    let startX, startY, scrollLeftStart, scrollTopStart;
    // --- Add this Set to the State Variables ---
    let generatedNames = new Set(); // To track unique names

    // --- Initialization Function ---
function initializeSimulation() {
    container.innerHTML = '';
    speciesCounter = 0;
    generatedNames.clear(); // *** Reset the name set ***

    const containerRect = container.getBoundingClientRect();
    const initialX = containerRect.width / 2;

    const firstSpecies = {
        id: speciesCounter++,
        parentId: null,
        generation: 0,
        x: initialX,
        y: INITIAL_SPECIES_Y_POS,
        size: 30,
        color: { h: 0, s: 100, l: 50 },
        shape: 'square',
        canSpeciate: true,
        name: generateUniqueName() // *** Generate name for initial species ***
    };

    allSpecies = [firstSpecies];

    renderSpecies(firstSpecies);
    console.log("Simulation Reset and Initialized with name:", firstSpecies.name);
    }

    // --- Core Functions ---



// --- Helper Function ---
function getRandomElement(arr) {
    if (!arr || arr.length === 0) return ''; // Safety check
    return arr[Math.floor(Math.random() * arr.length)];
}

// --- Name Generator Function ---
function generateUniqueName() {
    let name = '';
    let attempts = 0;
    const maxAttempts = 100; // Prevent infinite loop if somehow space runs out

    do {
        name = ''; // Reset name for each attempt
        const syllableCount = Math.floor(Math.random() * (NAME_CONFIG.maxSyllables - NAME_CONFIG.minSyllables + 1)) + NAME_CONFIG.minSyllables;

        for (let i = 0; i < syllableCount; i++) {
            // Choose consonant or cluster
            let cPart = '';
            if (Math.random() < NAME_CONFIG.clusterChance && CONSONANT_CLUSTERS.length > 0) {
                cPart = getRandomElement(CONSONANT_CLUSTERS);
            } else {
                cPart = getRandomElement(CONSONANTS);
            }

            // Choose vowel
            const vPart = getRandomElement(VOWELS);

            name += cPart + vPart;
        }

        // Add suffix
        name += 'idae'; // Sticking to '-idae' for simplicity and common usage

        // Capitalize first letter
        if (name.length > 0) {
             name = name.charAt(0).toUpperCase() + name.slice(1);
        }


        attempts++;
        if (attempts > maxAttempts) {
            console.error("Failed to generate a unique name after", maxAttempts, "attempts. Giving up.");
            // Return a placeholder or potentially allow non-unique after many tries
            return name + Date.now(); // Make it unique with timestamp as fallback
        }

    } while (generatedNames.has(name)); // Keep trying if name exists

    generatedNames.add(name); // Add the unique name to the set
    return name;
}

        function renderSpecies(speciesData) {
        // 1. Create the MAIN container for this species (shape + label)
        const speciesContainer = document.createElement('div');
        speciesContainer.classList.add('species-container'); // Use the new container class
        speciesContainer.dataset.id = speciesData.id; // Store ID on the container

        // 2. Create the visual SHAPE element INSIDE the container
        const shapeEl = document.createElement('div');
        shapeEl.classList.add('species-shape'); // New class for the shape itself
        shapeEl.classList.add(`shape-${speciesData.shape}`); // Add specific shape class (like shape-square)

        // Style the SHAPE element
        shapeEl.style.width = `${speciesData.size}px`;
        shapeEl.style.height = `${speciesData.size}px`;
        shapeEl.style.backgroundColor = `hsl(${speciesData.color.h}, ${speciesData.color.s}%, ${speciesData.color.l}%)`;

        // 3. Create the LABEL element INSIDE the container
        const labelEl = document.createElement('div');
        labelEl.classList.add('species-label');
        labelEl.textContent = speciesData.name;

        // 4. Add click listener and speciated styles to the SHAPE element
        if (speciesData.canSpeciate) {
            shapeEl.addEventListener('click', handleSpeciationClick);
            shapeEl.style.cursor = 'pointer'; // Indicate clickable shape
        } else {
            // Add class to the main container for potential container-level styling
            speciesContainer.classList.add('speciated');
            // Apply visual cues directly to the shape element
            shapeEl.style.cursor = 'default';
            shapeEl.style.borderColor = '#aaa'; // Example: fade border
        }

        // 5. Append SHAPE and LABEL to the CONTAINER
        speciesContainer.appendChild(shapeEl);
        speciesContainer.appendChild(labelEl);

        // 6. Calculate position for the CONTAINER
        // Position the top-left corner of the container based on the species' center coordinates
        const pixelX = speciesData.x - (speciesData.size / 2); // Horizontal center based on shape size
        const pixelY = speciesData.y - (speciesData.size / 2); // Vertical position based on shape center

        // 7. Apply absolute positioning to the CONTAINER
        speciesContainer.style.left = `${pixelX}px`;
        speciesContainer.style.top = `${pixelY}px`;

        // 8. Append the whole CONTAINER to the main simulation area
        container.appendChild(speciesContainer);

        // 9. Return the main container element
        return speciesContainer;
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
    // Target is the shape element (<div class="species-shape">)
    const shapeElement = event.target;
    // Get the container element (<div class="species-container">)
    const parentContainer = shapeElement.closest('.species-container'); // Find nearest ancestor with this class

    if (!parentContainer) {
        console.error("Could not find parent container for clicked shape.");
        return;
    }

    const parentId = parseInt(parentContainer.dataset.id); // Get ID from container
    const parentData = allSpecies.find(s => s.id === parentId);

    if (!parentData || !parentData.canSpeciate) return;

    parentData.canSpeciate = false;
    // Remove listener from the SHAPE element
    shapeElement.removeEventListener('click', handleSpeciationClick);
    shapeElement.style.cursor = 'default'; // Update shape cursor
    shapeElement.style.borderColor = '#aaa'; // Update shape style
    // Optional: Add speciated class to container too if needed for other styles
    // parentContainer.classList.add('speciated');


    createAndRenderChild(parentData, -1);
    createAndRenderChild(parentData, 1);
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
                name: generateUniqueName(), // *** Generate name for new child ***
                x: 0,
                y: 0
            };

        // --- Calculate Position (directly in pixels) ---
        const parentPixelCenterX = parentData.x;
        const parentPixelCenterY = parentData.y;

        // Child center Y in pixels
        const childPixelCenterY = parentPixelCenterY + LAYOUT_CONFIG.verticalSpacing;

        // *** MODIFIED SPREAD CALCULATION ***
        // Calculate the spread for this specific child's generation
        // Use parent's generation to determine the spread magnitude away FROM the parent
        // A power of 0 is 1, so the first split uses baseHorizontalSpread.
        const currentHorizontalSpread = LAYOUT_CONFIG.baseHorizontalSpread * Math.pow(LAYOUT_CONFIG.spreadIncreaseFactor, parentData.generation);

        // Child center X offset using fixed pixel spread relative to parent's X
        const horizontalOffsetPixels = currentHorizontalSpread * horizontalFactor;
        const childPixelCenterX = parentPixelCenterX + horizontalOffsetPixels;

        if (isNaN(childPixelCenterX) || isNaN(childPixelCenterY)) {
        console.error("!!! Calculated child coordinates are NaN!", { childX: childPixelCenterX, childY: childPixelCenterY, parentX: parentPixelCenterX, parentY: parentPixelCenterY, offset: horizontalOffsetPixels, spread: currentHorizontalSpread });
        return; // Stop processing this child if coords are bad
        }

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
