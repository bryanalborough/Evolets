document.addEventListener('DOMContentLoaded', () => {
    const container = document.getElementById('simulator-container');
    const resetButton = document.getElementById('reset-button');
    let speciesCounter = 0;

    // --- Configuration ---
    // Store initial Y position in pixels, X will be calculated dynamically
    const INITIAL_SPECIES_Y_POS = 50; // Pixels from top

    const MUTATION_CONFIG = {
        hueShift: 10,
        saturationShift: 8,
        lightnessShift: 8,
        borderRadiusChange: 6,      // Max % change in border radius per step (+/-)
        widthChangeFactor: 0.15,    // Max relative width change (e.g., 0.15 = +/- 15%)
        heightChangeFactor: 0.15,   // Max relative height change
        minDimension: 10,          // Min width/height in pixels
        maxDimension: 100,         // Max width/height in pixels
        eyeSizeFactorChange: 0.1,   // Max relative change (e.g., 0.1 = +/- 10%)
        eyeOffsetXChange: 0.1,      // Max relative change
        minEyeSizeFactor: 0.05,     // Min eye size relative to avg body dim (5%)
        maxEyeSizeFactor: 0.35,     // Max eye size (35%)
        minEyeOffsetX: 0.05,        // Min horizontal offset from center (5% of width)
        maxEyeOffsetX: 0.4,         // Max horizontal offset (40% of width)
    };

    const LAYOUT_CONFIG = {
        verticalSpacing: 90,        // Pixels (Keep as is or adjust)
        // horizontalSpreadPixels: 120 // <-- Remove or comment out this line
        baseHorizontalSpread: 60,  // Base spread in pixels for the first generation's children
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

    function getRandomInRange(min, max) {
        return min + Math.random() * (max - min);
    }
    
    
    // --- Initialization Function ---
    function initializeSimulation() {
        container.innerHTML = '';
        speciesCounter = 0;
        generatedNames.clear(); // *** Reset the name set ***

        const HORIZONTAL_PADDING = 2000; // Pixels - choose a large number, enough for expected leftward expansion
        const containerRect = container.getBoundingClientRect();
        const initialX = HORIZONTAL_PADDING + (containerRect.width / 2);

         // --- Generate Random Initial Properties ---
    const initialWidth = getRandomInRange(MUTATION_CONFIG.minDimension, 50); // Start slightly smaller than max possible
    const initialHeight = getRandomInRange(MUTATION_CONFIG.minDimension, 50);
    const initialBorderRadius = getRandomInRange(0, 50); // 0% to 50%
    const initialColor = {
        h: getRandomInRange(0, 360),
        s: getRandomInRange(40, 100), // Avoid desaturated colors initially
        l: getRandomInRange(40, 75)   // Avoid too dark/light initially
    };
    const initialEyeSize = getRandomInRange(5, 12); // Eyes between min and 10px initially
    const initialPupilRatio = getRandomInRange(MUTATION_CONFIG.minPupilRatio, MUTATION_CONFIG.maxPupilRatio);
    // Calculate offset relative to the initial random dimensions
    // Let's limit offset to +/- 30% of dimension initially
    const initialEyeOffsetX = getRandomInRange(-0.3, 0.3) * initialWidth;
    const initialEyeOffsetY = getRandomInRange(-0.3, 0.3) * initialHeight;
    // --- End Random Generation ---

    const firstSpecies = {
        id: speciesCounter++,
        parentId: null,
        generation: 0,
        x: initialX,
        y: INITIAL_SPECIES_Y_POS,
        // --- Assign RANDOMIZED properties ---
        width: initialWidth,
        height: initialHeight,
        borderRadiusPercent: initialBorderRadius,
        color: initialColor,
        eyeSize: initialEyeSize,
        pupilSizeRatio: initialPupilRatio,
        eyeOffsetX: initialEyeOffsetX,
        eyeOffsetY: initialEyeOffsetY,
        // --- End Assignment ---
        canSpeciate: true,
        name: generateUniqueName() // Name is still generated uniquely
    };

    allSpecies = [firstSpecies];

    // *** Reset scroll to show the initial area, considering padding ***
    container.scrollLeft = initialX - (containerRect.width / 2); // Scroll so the initial node is centered horizontally
    container.scrollTop = 0;

    renderSpecies(firstSpecies);
    console.log("Simulation Reset and Initialized with name:", firstSpecies.name);
    console.log("Initial ScrollLeft:", container.scrollLeft); // Check initial scroll
    // --- Core Functions ---
}


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
    const speciesContainer = document.createElement('div');
    speciesContainer.classList.add('species-container');
    speciesContainer.dataset.id = speciesData.id;

    const shapeEl = document.createElement('div');
    shapeEl.classList.add('species-shape');
    shapeEl.style.position = 'relative';
     // Style shape body
     shapeEl.style.width = `${speciesData.width}px`;
     shapeEl.style.height = `${speciesData.height}px`;
     shapeEl.style.borderRadius = `${speciesData.borderRadiusPercent}%`;
     shapeEl.style.backgroundColor = `hsl(${speciesData.color.h}, ${speciesData.color.s}%, ${speciesData.color.l}%)`;

     // --- Create and Position Eyes ---
    const avgDimension = (speciesData.width + speciesData.height) / 2;
    const eyeDiameter = Math.max(2, avgDimension * speciesData.eyeSizeFactor); // Min 2px diameter
    const pupilDiameter = Math.max(1, eyeDiameter * 0.5); // Pupil is half eye size, min 1px
    const horizontalOffset = speciesData.width * speciesData.eyeOffsetX;
    // Position eyes slightly above the vertical center (e.g., 40% down)
    const eyeCenterY = speciesData.height * 0.4;

     // Left Eye
     const leftEyeCenterX = (speciesData.width / 2) - horizontalOffset;
     const leftEye = createEyeElement(eyeDiameter, pupilDiameter, leftEyeCenterX, eyeCenterY);
     shapeEl.appendChild(leftEye);
 
     // Right Eye
     const rightEyeCenterX = (speciesData.width / 2) + horizontalOffset;
     const rightEye = createEyeElement(eyeDiameter, pupilDiameter, rightEyeCenterX, eyeCenterY);
     shapeEl.appendChild(rightEye);
     // --- End Eye Creation ---

    const labelEl = document.createElement('div');
    labelEl.classList.add('species-label');
    labelEl.textContent = speciesData.name;

    if (speciesData.canSpeciate) {
        shapeEl.addEventListener('click', handleSpeciationClick);
        shapeEl.style.cursor = 'pointer';
    } else {
        speciesContainer.classList.add('speciated');
        shapeEl.style.cursor = 'default';
        shapeEl.style.borderColor = '#aaa';
    }

    speciesContainer.appendChild(shapeEl);
    speciesContainer.appendChild(labelEl);

    // Log data for debugging positioning
    console.log(`Rendering species ${speciesData.id}: Center (x:${speciesData.x}, y:${speciesData.y}), Width: ${speciesData.width}, Height: ${speciesData.height}, Radius: ${speciesData.borderRadiusPercent}%`);
    // Add validity checks if needed...

    // --- Calculate position using WIDTH and HEIGHT ---
    const pixelX = speciesData.x - (speciesData.width / 2); // Use width for horizontal centering
    const pixelY = speciesData.y - (speciesData.height / 2); // Use height for vertical centering
    // --- End change ---
    console.log(` -> Calculated Container Pos (left:${pixelX}, top:${pixelY})`);

    speciesContainer.style.left = `${pixelX}px`;
    speciesContainer.style.top = `${pixelY}px`;

    container.appendChild(speciesContainer);
    return speciesContainer;
}

    function renderConnector(parentData, childData) {
// *** ADD LOGGING HERE ***
        console.log(`Rendering connector from Parent ${parentData.id} (x:${parentData.x}, y:${parentData.y}) to Child ${childData.id} (x:${childData.x}, y:${childData.y})`);

        // Corrected IF condition: Check all 4 coordinates individually
        if (typeof parentData.x !== 'number' || isNaN(parentData.x) ||
            typeof parentData.y !== 'number' || isNaN(parentData.y) ||
            typeof childData.x !== 'number' || isNaN(childData.x) ||
            typeof childData.y !== 'number' || isNaN(childData.y)
        ) { // <<< The condition closes here
             console.error("!!! Invalid position data in renderConnector:", {parentData, childData});
             // Optionally return here if data is invalid to prevent further errors
             // return;
        }
       // *** END LOGGING ***
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

// --- NEW Helper function to create an eye element ---
function createEyeElement(eyeDiameter, pupilDiameter, centerX, centerY) {
    const eye = document.createElement('div');
    eye.classList.add('eye');
    eye.style.width = `${eyeDiameter}px`;
    eye.style.height = `${eyeDiameter}px`;
    // Position eye's top-left corner based on its center
    eye.style.left = `${centerX - eyeDiameter / 2}px`;
    eye.style.top = `${centerY - eyeDiameter / 2}px`;

    const pupil = document.createElement('div');
    pupil.classList.add('pupil');
    pupil.style.width = `${pupilDiameter}px`;
    pupil.style.height = `${pupilDiameter}px`;
    // Position pupil's top-left corner based on its center (relative to eye center)
    pupil.style.left = `${(eyeDiameter / 2) - (pupilDiameter / 2)}px`;
    pupil.style.top = `${(eyeDiameter / 2) - (pupilDiameter / 2)}px`;

    eye.appendChild(pupil);
    return eye;
}

function createAndRenderChild(parentData, horizontalFactor) {
    // --- Check parent validity (optional but good) ---
    if (typeof parentData.width !== 'number' || isNaN(parentData.width) || typeof parentData.height !== 'number' || isNaN(parentData.height) || typeof parentData.borderRadiusPercent !== 'number' || isNaN(parentData.borderRadiusPercent) || typeof parentData.x !== 'number' || isNaN(parentData.x) || typeof parentData.y !== 'number' || isNaN(parentData.y) || typeof parentData.generation !== 'number' || isNaN(parentData.generation) ) {
        console.error(`CRITICAL ERROR: Parent ${parentData?.id} has invalid data for mutation/layout!`, parentData);
        return; // Stop creating this child if parent is broken
    }

    const childData = {
        id: speciesCounter++,
        parentId: parentData.id,
        generation: parentData.generation + 1,
        // --- Use NEW mutation functions ---
        width: mutateDimension(parentData.width, MUTATION_CONFIG.widthChangeFactor),
        height: mutateDimension(parentData.height, MUTATION_CONFIG.heightChangeFactor),
        borderRadiusPercent: mutateBorderRadius(parentData.borderRadiusPercent),
        color: mutateColor(parentData.color),
        eyeSizeFactor: mutateEyeSizeFactor(parentData.eyeSizeFactor),
        eyeOffsetX: mutateEyeOffsetX(parentData.eyeOffsetX),
        canSpeciate: true,
        name: generateUniqueName(),
        x: NaN, // Initialize to NaN
        y: NaN
    };

    // --- Calculate Position (directly in pixels) ---
    const parentPixelCenterX = parentData.x;
    const parentPixelCenterY = parentData.y;
    const childPixelCenterY = parentPixelCenterY + LAYOUT_CONFIG.verticalSpacing;
    const currentHorizontalSpread = LAYOUT_CONFIG.baseHorizontalSpread * Math.pow(LAYOUT_CONFIG.spreadIncreaseFactor, parentData.generation);
    const horizontalOffsetPixels = currentHorizontalSpread * horizontalFactor;
    const childPixelCenterX = parentPixelCenterX + horizontalOffsetPixels;

    // Check for NaN right after calculation
    if (isNaN(childPixelCenterX) || isNaN(childPixelCenterY)) { /* ... error handling ... */ return; }

    // Store child's absolute pixel coordinates
    childData.x = childPixelCenterX;
    childData.y = childPixelCenterY;

    // Log data (optional)
    // console.log("  Final Child Data (before push):", JSON.parse(JSON.stringify(childData)));

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

    // Helper function for mutation (keep mutateValue)
    function mutateValue(value, shift, min, max) {
        const change = (Math.random() * 2 - 1) * shift;
        return Math.max(min, Math.min(max, value + change));
    }

    // Mutates border radius gradually
function mutateBorderRadius(parentRadius) {
    const change = (Math.random() * 2 - 1) * MUTATION_CONFIG.borderRadiusChange;
    // Clamp between 0% (square) and 50% (circle)
    const newRadius = Math.max(0, Math.min(50, parentRadius + change));
    return newRadius;
}

// Mutates a single dimension (width or height)
function mutateDimension(parentDimension, changeFactor) {
    // Ensure parentDimension is valid
     if (typeof parentDimension !== 'number' || isNaN(parentDimension)) {
        console.warn("Invalid parentDimension, using default 30", parentDimension);
        parentDimension = 30;
    }

    const factor = 1 + (Math.random() * 2 - 1) * changeFactor;
    const newDimension = parentDimension * factor;
    // Clamp between min/max dimension config
    return Math.max(MUTATION_CONFIG.minDimension, Math.min(MUTATION_CONFIG.maxDimension, newDimension));
}

// --- Add NEW Eye Mutation Functions ---

// Mutates eye size factor
function mutateEyeSizeFactor(parentFactor) {
    const factor = 1 + (Math.random() * 2 - 1) * MUTATION_CONFIG.eyeSizeFactorChange;
    const newFactor = parentFactor * factor;
    // Clamp
    return Math.max(MUTATION_CONFIG.minEyeSizeFactor, Math.min(MUTATION_CONFIG.maxEyeSizeFactor, newFactor));
}

// Mutates eye horizontal offset factor
function mutateEyeOffsetX(parentOffset) {
    const factor = 1 + (Math.random() * 2 - 1) * MUTATION_CONFIG.eyeOffsetXChange;
    const newOffset = parentOffset * factor;
    // Clamp
    return Math.max(MUTATION_CONFIG.minEyeOffsetX, Math.min(MUTATION_CONFIG.maxEyeOffsetX, newOffset));
}

// Keep mutateValue, mutateBorderRadius, mutateDimension, mutateColor




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
