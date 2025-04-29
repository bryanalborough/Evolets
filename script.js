document.addEventListener('DOMContentLoaded', () => {
    const container = document.getElementById('simulator-container');
    let speciesCounter = 0; // To give unique IDs

    // --- Configuration ---
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
        hueShift: 20,      // Max degrees hue can change (+/-)
        saturationShift: 10, // Max percent saturation can change (+/-)
        lightnessShift: 10,  // Max percent lightness can change (+/-)
        sizeChangeFactor: 0.2, // Max relative size change (e.g., 0.2 = +/- 20%)
        shapeMutationChance: 0.3 // 30% chance to change shape (if possible)
    };

    const LAYOUT_CONFIG = {
        verticalSpacing: 80, // Pixels between generations
        horizontalSpread: 100 // Initial pixels spread for children
    };

    let allSpecies = [INITIAL_SPECIES]; // Array to hold all species data

    // --- Core Functions ---

    // Function to create and place a species element on the page
    function renderSpecies(speciesData) {
        const el = document.createElement('div');
        el.classList.add('species');
        el.classList.add(`shape-${speciesData.shape}`); // Add shape class
        el.dataset.id = speciesData.id; // Store ID in data attribute

        // Calculate position in pixels
        const containerRect = container.getBoundingClientRect();
        const pixelX = (speciesData.x / 100) * containerRect.width - (speciesData.size / 2);
        const pixelY = (speciesData.y / 100) * containerRect.height - (speciesData.size / 2);


        el.style.left = `${pixelX}px`;
        el.style.top = `${pixelY}px`;
        el.style.width = `${speciesData.size}px`;
        el.style.height = `${speciesData.size}px`;
        el.style.backgroundColor = `hsl(${speciesData.color.h}, ${speciesData.color.s}%, ${speciesData.color.l}%)`;
        // el.textContent = speciesData.id; // Optional: Display ID

        if (speciesData.canSpeciate) {
            el.addEventListener('click', handleSpeciationClick);
        } else {
             el.classList.add('speciated');
        }

        container.appendChild(el);
        return el; // Return the element reference
    }

    // Function to draw a line between two points (centers of species)
    function renderConnector(parentData, childData) {
        const containerRect = container.getBoundingClientRect();

        // Calculate center points in pixels
        const parentX = (parentData.x / 100) * containerRect.width;
        const parentY = (parentData.y / 100) * containerRect.height;
        const childX = (childData.x / 100) * containerRect.width;
        const childY = (childData.y / 100) * containerRect.height;

        const deltaX = childX - parentX;
        const deltaY = childY - parentY;

        const length = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
        const angle = Math.atan2(deltaY, deltaX) * (180 / Math.PI); // Angle in degrees

        const line = document.createElement('div');
        line.classList.add('connector');

        line.style.left = `${parentX}px`;
        line.style.top = `${parentY}px`;
        line.style.width = `${length}px`;
        line.style.transform = `rotate(${angle}deg)`;

        container.appendChild(line);
    }

    // Function triggered when a species is clicked
    function handleSpeciationClick(event) {
        const parentElement = event.target;
        const parentId = parseInt(parentElement.dataset.id);
        const parentData = allSpecies.find(s => s.id === parentId);

        if (!parentData || !parentData.canSpeciate) {
            return; // Should not happen if listener is removed, but good practice
        }

        // Mark parent as speciated and update visually
        parentData.canSpeciate = false;
        parentElement.removeEventListener('click', handleSpeciationClick);
        parentElement.classList.add('speciated');

        // Create two children
        createAndRenderChild(parentData, -1); // Child 1 (left)
        createAndRenderChild(parentData, 1);  // Child 2 (right)
    }

    // Function to create data for, render, and connect a child species
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

        // Calculate position
        const containerRect = container.getBoundingClientRect();
        const parentPixelY = (parentData.y / 100) * containerRect.height;
        const childPixelY = parentPixelY + LAYOUT_CONFIG.verticalSpacing;
        const horizontalOffset = (LAYOUT_CONFIG.horizontalSpread / Math.pow(1.5, parentData.generation)) * horizontalFactor; // Spread narrows slightly in deeper generations
        const parentPixelX = (parentData.x / 100) * containerRect.width;
        const childPixelX = parentPixelX + horizontalOffset;

        // Convert back to percentages for storage
        childData.x = (childPixelX / containerRect.width) * 100;
        childData.y = (childPixelY / containerRect.height) * 100;

         // Clamp positions to prevent going too far off-screen (simple clamping)
        childData.x = Math.max(5, Math.min(95, childData.x));
        childData.y = Math.max(5, Math.min(95, childData.y));


        allSpecies.push(childData);
        renderSpecies(childData);
        renderConnector(parentData, childData);
    }

    // --- Mutation Functions ---

    function mutateValue(value, shift, min, max) {
        const change = (Math.random() * 2 - 1) * shift; // Random change +/- shift
        return Math.max(min, Math.min(max, value + change));
    }

    function mutateColor(parentColor) {
        const newColor = {
            h: (parentColor.h + mutateValue(0, MUTATION_CONFIG.hueShift, -MUTATION_CONFIG.hueShift, MUTATION_CONFIG.hueShift) + 360) % 360, // Keep hue in 0-360 range
            s: mutateValue(parentColor.s, MUTATION_CONFIG.saturationShift, 30, 100), // Keep saturation reasonable
            l: mutateValue(parentColor.l, MUTATION_CONFIG.lightnessShift, 30, 80)    // Keep lightness reasonable
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
        // Simple mutation: Square <-> Circle for now
        if (Math.random() < MUTATION_CONFIG.shapeMutationChance) {
            return parentShape === 'square' ? 'circle' : 'square';
        }
        return parentShape;
        // TODO: Add more shapes (triangle, star) later
    }


    // --- Initialisation ---
    renderSpecies(INITIAL_SPECIES);

}); // End DOMContentLoaded
