document.addEventListener('DOMContentLoaded', () => {
    const container = document.getElementById('simulator-container');
    let speciesCounter = 0; // To give unique IDs

    // --- Configuration --- (Keep your existing config)
    const INITIAL_SPECIES = {
        id: speciesCounter++,
        parentId: null,
        generation: 0,
        x: 50, // Percentage from left
        y: 10, // Percentage from top
        size: 30, // Size in pixels
        color: { h: 0, s: 100, l: 50 }, // HSL color (Red)
        shape: 'square', // Initial shape
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
        verticalSpacing: 80,
        horizontalSpread: 100
    };

    let allSpecies = [INITIAL_SPECIES];

    // --- Core Functions ---

    function renderSpecies(speciesData) {
        const el = document.createElement('div');
        el.classList.add('species');
        el.classList.add(`shape-${speciesData.shape}`);
        el.dataset.id = speciesData.id;

        // Calculate position IN PIXELS for styling
        const containerRect = container.getBoundingClientRect();
        // Adjust for centering the element based on its size
        const pixelX = (speciesData.x / 100) * containerRect.width - (speciesData.size / 2);
        const pixelY = (speciesData.y / 100) * containerRect.height - (speciesData.size / 2);


        el.style.left = `${pixelX}px`;
        el.style.top = `${pixelY}px`;
        el.style.width = `${speciesData.size}px`;
        el.style.height = `${speciesData.size}px`;
        el.style.backgroundColor = `hsl(${speciesData.color.h}, ${speciesData.color.s}%, ${speciesData.color.l}%)`;
        // el.textContent = speciesData.id;

        if (speciesData.canSpeciate) {
            el.addEventListener('click', handleSpeciationClick);
        } else {
            el.classList.add('speciated');
        }

        container.appendChild(el);
        return el;
    }

    // *** Function to draw a line between two species data objects ***
    function renderConnector(parentData, childData) {
        // Get container dimensions each time, in case of resize (though not handled dynamically here)
        const containerRect = container.getBoundingClientRect();

        // Calculate CENTER points in pixels relative to the container
        const parentCenterX = (parentData.x / 100) * containerRect.width;
        const parentCenterY = (parentData.y / 100) * containerRect.height;
        const childCenterX = (childData.x / 100) * containerRect.width;
        const childCenterY = (childData.y / 100) * containerRect.height;

        // Calculate differences
        const deltaX = childCenterX - parentCenterX;
        const deltaY = childCenterY - parentCenterY;

        // Calculate length of the line (hypotenuse)
        const length = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

        // Calculate angle (using atan2 for correct quadrant handling)
        // Convert radians to degrees
        const angle = Math.atan2(deltaY, deltaX) * (180 / Math.PI);

        // Create the line element
        const line = document.createElement('div');
        line.classList.add('connector');

        // Position the line's start point (left edge) at the parent's center
        line.style.left = `${parentCenterX}px`;
        line.style.top = `${parentCenterY}px`;

        // Set the line's width to the calculated length
        line.style.width = `${length}px`;

        // Rotate the line to point towards the child's center
        line.style.transform = `rotate(${angle}deg)`;

        // Add the line to the container
        container.appendChild(line);
    }


    function handleSpeciationClick(event) {
        const parentElement = event.target;
        const parentId = parseInt(parentElement.dataset.id);
        const parentData = allSpecies.find(s => s.id === parentId);

        if (!parentData || !parentData.canSpeciate) {
            return;
        }

        parentData.canSpeciate = false;
        parentElement.removeEventListener('click', handleSpeciationClick);
        parentElement.classList.add('speciated');

        createAndRenderChild(parentData, -1); // Child 1 (left)
        createAndRenderChild(parentData, 1);  // Child 2 (right)
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
            // x and y will be calculated below
        };

        // --- Calculate Position ---
        const containerRect = container.getBoundingClientRect(); // Need dimensions for pixel calculations

        // Calculate parent's center Y in pixels
        const parentPixelCenterY = (parentData.y / 100) * containerRect.height;
        // Calculate child's center Y in pixels
        const childPixelCenterY = parentPixelCenterY + LAYOUT_CONFIG.verticalSpacing;

        // Calculate horizontal offset - narrows slightly in deeper generations
        const horizontalOffsetPixels = (LAYOUT_CONFIG.horizontalSpread / Math.pow(1.5, parentData.generation)) * horizontalFactor;
        // Calculate parent's center X in pixels
        const parentPixelCenterX = (parentData.x / 100) * containerRect.width;
         // Calculate child's center X in pixels
        const childPixelCenterX = parentPixelCenterX + horizontalOffsetPixels;

        // --- Convert child's center pixel coordinates back to percentages for storage ---
        childData.x = (childPixelCenterX / containerRect.width) * 100;
        childData.y = (childPixelCenterY / containerRect.height) * 100;

        // --- Clamp positions to prevent going too far off-screen (simple clamping) ---
        // Adjust clamping based on the child's size to keep it mostly visible
        const halfSizeXPerc = (childData.size / 2 / containerRect.width) * 100;
        const halfSizeYPerc = (childData.size / 2 / containerRect.height) * 100;
        childData.x = Math.max(halfSizeXPerc, Math.min(100 - halfSizeXPerc, childData.x));
        childData.y = Math.max(halfSizeYPerc, Math.min(100 - halfSizeYPerc, childData.y)); // Keep within vertical bounds too

        // --- Add to list, Render Shape, and Render Connector ---
        allSpecies.push(childData);
        renderSpecies(childData); // Render the shape itself

        // *** THIS IS THE CRUCIAL ADDITION ***
        renderConnector(parentData, childData); // Draw the line connecting parent and child

    }


    // --- Mutation Functions --- (Keep your existing mutation functions)
    function mutateValue(value, shift, min, max) {
        const change = (Math.random() * 2 - 1) * shift;
        return Math.max(min, Math.min(max, value + change));
    }

    function mutateColor(parentColor) {
        const newColor = {
            h: (parentColor.h + mutateValue(0, MUTATION_CONFIG.hueShift, -MUTATION_CONFIG.hueShift, MUTATION_CONFIG.hueShift) + 360) % 360,
            s: mutateValue(parentColor.s, MUTATION_CONFIG.saturationShift, 30, 100),
            l: mutateValue(parentColor.l, MUTATION_CONFIG.lightnessShift, 30, 80)
        };
        return newColor;
    }

    function mutateSize(parentSize) {
        const minSize = 10;
        const maxSize = 100;
        const changeFactor = 1 + (Math.random() * 2 - 1) * MUTATION_CONFIG.sizeChangeFactor;
        return Math.max(minSize, Math.min(maxSize, parentSize * changeFactor));
    }

    function mutateShape(parentShape) {
        if (Math.random() < MUTATION_CONFIG.shapeMutationChance) {
            return parentShape === 'square' ? 'circle' : 'square';
        }
        return parentShape;
    }


    // --- Initialisation ---
    renderSpecies(INITIAL_SPECIES); // Render the first species when the page loads

}); // End DOMContentLoaded
