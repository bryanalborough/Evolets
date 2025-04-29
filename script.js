// --- START OF FILE script.js ---

document.addEventListener('DOMContentLoaded', () => {
    const container = document.getElementById('simulator-container');
    const resetButton = document.getElementById('reset-button'); // *** ADDED: Get reset button element ***
    let speciesCounter = 0; // To give unique IDs

    // --- Configuration ---
    const INITIAL_SPECIES_TEMPLATE = {
        id: 0,
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
        hueShift: 10,
        saturationShift: 5,
        lightnessShift: 5,
        sizeChangeFactor: 0.2,
        shapeMutationChance: 0.3
    };

    const LAYOUT_CONFIG = {
        verticalSpacing: 90,
        horizontalSpreadPixels: 120
    };

    // --- State Variables ---
    let allSpecies = [];
    let isPanning = false;
    let startX, startY, scrollLeftStart, scrollTopStart;

    // --- Initialization Function ---
    function initializeSimulation() {
        container.innerHTML = '';
        speciesCounter = 0;
        const firstSpecies = {
            ...INITIAL_SPECIES_TEMPLATE,
            id: speciesCounter++
        };
        allSpecies = [firstSpecies];
        container.scrollLeft = 0;
        container.scrollTop = 0;
        // Adjust initial scroll to center the starting node slightly better
        // Needs timeout to allow initial render dimensions to settle
        setTimeout(() => {
            const containerRect = container.getBoundingClientRect();
            const initialXPos = (firstSpecies.x / 100) * containerRect.width;
            container.scrollLeft = initialXPos - containerRect.width / 2;
             // Optional: Adjust vertical scroll too if needed
            // const initialYPos = (firstSpecies.y / 100) * containerRect.height;
            // container.scrollTop = initialYPos - 50; // Scroll up slightly
        }, 0);


        renderSpecies(firstSpecies);
        console.log("Simulation Reset");
    }

    // --- Core Functions ---
    function renderSpecies(speciesData) {
        const el = document.createElement('div');
        el.classList.add('species');
        el.classList.add(`shape-${speciesData.shape}`);
        el.dataset.id = speciesData.id;

        const containerRect = container.getBoundingClientRect();
        const containerScrollWidth = container.scrollWidth;
        const containerScrollHeight = container.scrollHeight;
        const effectiveWidth = Math.max(containerRect.width, containerScrollWidth);
        const effectiveHeight = Math.max(containerRect.height, containerScrollHeight);

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
        checkContainerScroll(); // Check scroll after adding children
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

        const containerRect = container.getBoundingClientRect();
        const containerScrollWidth = container.scrollWidth;
        const containerScrollHeight = container.scrollHeight;
        const effectiveWidth = Math.max(containerRect.width, containerScrollWidth);
        const effectiveHeight = Math.max(containerRect.height, containerScrollHeight);

        const parentPixelCenterX = (parentData.x / 100) * effectiveWidth;
        const parentPixelCenterY = (parentData.y / 100) * effectiveHeight;

        const childPixelCenterY = parentPixelCenterY + LAYOUT_CONFIG.verticalSpacing;
        const horizontalOffsetPixels = LAYOUT_CONFIG.horizontalSpreadPixels * horizontalFactor;
        const childPixelCenterX = parentPixelCenterX + horizontalOffsetPixels;

        childData.x = (childPixelCenterX / effectiveWidth) * 100;
        childData.y = (childPixelCenterY / effectiveHeight) * 100;

        allSpecies.push(childData);
        renderSpecies(childData);
        renderConnector(parentData, childData);
    }

    // --- Mutation Functions ---
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
        // Simple mutation: Square <-> Circle for now
        if (Math.random() < MUTATION_CONFIG.shapeMutationChance) {
            return parentShape === 'square' ? 'circle' : 'square';
        }
        return parentShape;
        // TODO: Add more shapes later
    }

    // --- Panning Logic ---

    // *** ADDED: Definition for handleMouseDown ***
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

    // --- Helper to check container scroll ---
    function checkContainerScroll() {
        // No specific action needed here, CSS overflow:auto handles it.
        // The effectiveWidth/Height calculations adapt automatically.
    }

    // --- Event Listeners Setup ---
    // Make sure resetButton is defined before this line! (It is now)
    resetButton.addEventListener('click', initializeSimulation);

    // Panning listeners on the container
    // Make sure handleMouseDown is defined before this line! (It is now)
    container.addEventListener('mousedown', handleMouseDown);
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', stopPanning);

    // --- Initialisation ---
    initializeSimulation(); // Start the simulation on page load

}); // End DOMContentLoaded
// --- END OF FILE script.js ---
