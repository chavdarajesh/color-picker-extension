// --- DOM Elements (Matching Original HTML) ---
// ... (keep existing element selections) ...
const pickColorBtn = document.getElementById("pickColor");
const colorDisplay = document.getElementById("colorDisplay");
const hexEl = document.getElementById("hex");
const rgbEl = document.getElementById("rgb");
const hslEl = document.getElementById("hsl");
const nameEl = document.getElementById("colorName");
const colorInfo = document.getElementById("colorInfo");
const saveColorBtn = document.getElementById("saveColor");
const savedColorsList = document.getElementById("savedColors");
const colorHistoryList = document.getElementById("colorHistory");
const toast = document.getElementById("toast");

const MAX_HISTORY = 5;
const MAX_SAVED = 10;

// --- Color Conversion & Naming ---
// ... (keep hexToRgb, rgbToHsl, getClosestColorName functions) ...
function hexToRgb(hex) {
    if (!hex || typeof hex !== 'string' || !hex.startsWith('#')) return 'rgb(0, 0, 0)';
    const bigint = parseInt(hex.substring(1), 16);
    const r = (bigint >> 16) & 255;
    const g = (bigint >> 8) & 255;
    const b = bigint & 255;
    return `rgb(${r}, ${g}, ${b})`;
}

function rgbToHsl(rgb) {
    if (!rgb || typeof rgb !== 'string' || !rgb.startsWith('rgb')) return 'hsl(0, 0%, 0%)';
    const match = rgb.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
    if (!match) return 'hsl(0, 0%, 0%)';
    let r = parseInt(match[1]) / 255, g = parseInt(match[2]) / 255, b = parseInt(match[3]) / 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h, s, l = (max + min) / 2;
    if (max === min) { h = s = 0; }
    else {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch (max) {
            case r: h = (g - b) / d + (g < b ? 6 : 0); break;
            case g: h = (b - r) / d + 2; break;
            case b: h = (r - g) / d + 4; break;
        }
        h /= 6;
    }
    return `hsl(${Math.round(h * 360)}, ${Math.round(s * 100)}%, ${Math.round(l * 100)}%)`;
}

function getClosestColorName(hex) {
    try {
        if (typeof ntc !== 'undefined') {
            const result = ntc.name(hex);
            return result[1];
        } return "N/A"; // ntc not loaded
    } catch (e) {
        console.error("NTC error:", e);
        return "Unknown";
    }
}


// --- UI Update ---
// ... (keep updateColorDisplay function) ...
function updateColorDisplay(hexColor) {
    if (!hexColor) return;
    const rgbColor = hexToRgb(hexColor);
    const hslColor = rgbToHsl(rgbColor);
    const colorName = getClosestColorName(hexColor); // Optional

    colorDisplay.style.backgroundColor = hexColor;
    hexEl.textContent = hexColor;
    rgbEl.textContent = rgbColor;
    hslEl.textContent = hslColor;
    nameEl.textContent = colorName || "Loading..."; // Optional naming

    colorInfo.classList.remove("hidden");
}

// --- Toast Notification ---
// ... (keep showToast function) ...
let toastTimeout;
function showToast(msg, isError = false, duration = 2000) {
    clearTimeout(toastTimeout);
    toast.textContent = msg;
    toast.className = isError ? 'error' : ''; // Assuming you might add .error CSS later
    toast.classList.remove("hidden"); // Show it
    toast.style.backgroundColor = isError ? '#e74c3c' : '#2ecc71'; // Basic error color

    toastTimeout = setTimeout(() => {
        toast.classList.add("hidden");
    }, duration);
}


// --- Picker Activation ---
// ... (keep pickColorBtn listener, ensure it calls addToHistory) ...
pickColorBtn.addEventListener("click", async () => {
    if (!window.EyeDropper) {
        showToast("EyeDropper not supported in this browser.", true);
        return;
    }
    try {
        const eyeDropper = new EyeDropper();
        const { sRGBHex } = await eyeDropper.open();

        updateColorDisplay(sRGBHex);
        await addToHistory(sRGBHex); // Add to history after picking

        navigator.clipboard.writeText(sRGBHex)
             .then(() => showToast("Color copied to clipboard!"))
             .catch(err => showToast("Color picked, copy failed.", true));

    } catch (err) {
        if (err.name === 'AbortError') {
             showToast("Color picking cancelled.", false, 1500);
        } else {
            console.error("EyeDropper error:", err);
            showToast("Could not pick color.", true);
        }
    }
});

// --- Clipboard Copying ---
// ... (keep copy-btn listeners) ...
document.querySelectorAll('.copy-btn').forEach(btn => {
    btn.addEventListener("click", () => {
        const type = btn.dataset.type;
        const text = document.getElementById(type)?.textContent; // Safer access
        if (text) {
            navigator.clipboard.writeText(text)
                .then(() => showToast(`${type.toUpperCase()} copied!`))
                .catch(err => showToast(`Failed to copy ${type.toUpperCase()}.`, true));
        }
    });
});

// --- History Management (Added Debugging) ---
async function loadHistory() {
    try {
        // DEBUG: Log before getting history
        console.log("loadHistory: Attempting to get 'colorHistory' from storage.");
        const { colorHistory = [] } = await chrome.storage.local.get("colorHistory");
        // DEBUG: Log the retrieved history
        console.log("loadHistory: Retrieved history:", JSON.stringify(colorHistory));
        renderColorList(colorHistoryList, colorHistory, false); // false = no delete button
    } catch (error) {
        console.error("Failed to load history:", error);
    }
}

async function addToHistory(hexColor) {
    if (!hexColor) return;
    try {
        // DEBUG: Log color being added
        console.log(`addToHistory: Attempting to add ${hexColor}`);
        const { colorHistory = [] } = await chrome.storage.local.get("colorHistory");
        const updatedHistory = [hexColor, ...colorHistory.filter(c => c !== hexColor)].slice(0, MAX_HISTORY);
        // DEBUG: Log the history array *before* setting it
        console.log(`addToHistory: Setting updated history:`, JSON.stringify(updatedHistory));
        await chrome.storage.local.set({ colorHistory: updatedHistory });
        // DEBUG: Confirm set was called
        console.log(`addToHistory: Storage set called for ${hexColor}`);
        await loadHistory(); // Refresh display immediately
    } catch (error) {
        console.error(`Failed to add ${hexColor} to history:`, error);
    }
}

// --- Saved Colors Management ---
// ... (keep loadSavedColors, saveColorBtn listener, removeSavedColor functions) ...
async function loadSavedColors() {
    try {
        const { colors = [] } = await chrome.storage.local.get("colors");
         console.log("loadSavedColors: Retrieved saved:", JSON.stringify(colors)); // Debug log
        renderColorList(savedColorsList, colors, true); // true = show delete button
    } catch (error) {
        console.error("Failed to load saved colors:", error);
    }
}

saveColorBtn.addEventListener("click", async () => {
    const colorToSave = hexEl.textContent;
    if (!colorToSave) {
        showToast("No color selected to save.", true);
        return;
    }
    try {
        const { colors = [] } = await chrome.storage.local.get("colors");
        const updated = [colorToSave, ...colors.filter(c => c !== colorToSave)].slice(0, MAX_SAVED);
        await chrome.storage.local.set({ colors: updated });
        await loadSavedColors(); // Refresh display
        showToast("Color saved!");
    } catch (error) {
        console.error("Failed to save color:", error);
        showToast("Error saving color.", true);
    }
});

async function removeSavedColor(hexColor) {
    try {
        const { colors = [] } = await chrome.storage.local.get("colors");
        const updated = colors.filter(c => c !== hexColor);
        await chrome.storage.local.set({ colors: updated });
        await loadSavedColors(); // Refresh display
        showToast("Color removed.");
    } catch (error) {
        console.error("Failed to remove color:", error);
        showToast("Error removing color.", true);
    }
}


// --- Generic List Rendering (Added Debugging) ---
function renderColorList(listElement, colorsArray, allowDelete) {
    const listContainerId = listElement.id + 'Container';
    const listContainerElement = document.getElementById(listContainerId);

    // DEBUG: Log which list is being rendered and the data
    console.log(`renderColorList: Rendering for ${listElement.id}. Data:`, JSON.stringify(colorsArray), `AllowDelete: ${allowDelete}`);

    listElement.innerHTML = ''; // Clear previous items
    // Find placeholder INSIDE the listElement itself now
    const placeholder = listElement.querySelector('.placeholder'); // Or create it if it doesn't exist

     // Ensure placeholder exists (create if needed) - safer approach
     let placeholderElement = listElement.querySelector('.placeholder');
     if (!placeholderElement) {
         placeholderElement = document.createElement('p');
         placeholderElement.className = 'placeholder';
         placeholderElement.textContent = listElement.id === 'savedColors' ? 'No saved colors yet.' : 'No history yet.';
         placeholderElement.style.display = 'none'; // Start hidden
         listElement.appendChild(placeholderElement); // Add to list div
     }


    if (!colorsArray || colorsArray.length === 0) {
        if (placeholderElement) placeholderElement.style.display = 'block'; // Show placeholder
        if (listContainerElement) listContainerElement.style.display = 'none'; // Hide whole section
        // DEBUG: Log empty state
        console.log(`renderColorList: List ${listElement.id} is empty. Hiding container ${listContainerId}.`);
        return;
    }

    // --- If we have colors ---
    if (listContainerElement) listContainerElement.style.display = 'block'; // Show whole section
    if (placeholderElement) placeholderElement.style.display = 'none'; // Hide placeholder
     // DEBUG: Log non-empty state
     console.log(`renderColorList: List ${listElement.id} has items. Showing container ${listContainerId}.`);

    // ... (rest of the forEach loop to create list items remains the same) ...
     colorsArray.forEach(color => {
        const el = document.createElement("div");
        el.style.backgroundColor = color;

        const span = document.createElement("span");
        span.textContent = color;
        span.style.flex = "1";
        span.style.cursor = "pointer";
        span.onclick = () => {
            navigator.clipboard.writeText(color)
                .then(() => showToast("Copied color!")) // Simplified message
                .catch(err => showToast("Failed to copy.", true));
        };
        el.appendChild(span);

        if (allowDelete) {
            const removeBtn = document.createElement("button");
            removeBtn.textContent = "❌";
            // Apply original styles
            removeBtn.style.marginLeft = "10px";
            removeBtn.style.border = "none";
            removeBtn.style.background = "transparent";
            removeBtn.style.cursor = "pointer";
            removeBtn.style.color = "#c0392b";
            removeBtn.onclick = async (e) => {
                e.stopPropagation();
                await removeSavedColor(color);
            };
            removeBtn.onmouseover = () => { removeBtn.style.color = "#e74c3c"; };
            removeBtn.onmouseout = () => { removeBtn.style.color = "#c0392b"; };
            el.appendChild(removeBtn);
        }
        listElement.appendChild(el);
    });
}


// --- Initialization (MODIFIED) ---
document.addEventListener("DOMContentLoaded", async () => {
    console.log("Popup DOMContentLoaded."); // DEBUG: Log popup load

    // Load saved colors first
    await loadSavedColors();

    // Load history AND display the latest color picked
    try {
        console.log("DOMContentLoaded: Getting 'colorHistory' for initial display."); // DEBUG
        const { colorHistory = [] } = await chrome.storage.local.get("colorHistory");
        console.log("DOMContentLoaded: Initial history retrieved:", JSON.stringify(colorHistory)); // DEBUG

        // Render the history list
        await loadHistory(); // Call loadHistory to render the list correctly

        // Update display with the *most recent* color from history, if available
        if (colorHistory.length > 0) {
            const lastPicked = colorHistory[0];
            console.log("DOMContentLoaded: Displaying last picked color from history:", lastPicked); // DEBUG
            updateColorDisplay(lastPicked);
        } else {
             console.log("DOMContentLoaded: No history found, not setting initial color display."); // DEBUG
             // Optional: Hide colorInfo if nothing else set it
             // if (!colorInfo.classList.contains('hidden')) {
             //    // Check if display is already visible from a previous failed load?
             // }
        }
    } catch (error) {
        console.error("Error during initial history load and display:", error);
    }

    // --- Removed lastPickedColor logic, relying on history now ---
});

// --- Listen for messages from background (Added Debugging) ---
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    // DEBUG: Log received messages
    console.log("Popup onMessage listener received:", JSON.stringify(request));

    if (request.action === "colorPicked" && request.color) {
        updateColorDisplay(request.color);
        // History is updated by background OR the button click now.
        // We just need to refresh the display if message comes from background.
        loadHistory(); // Refresh history display
        showToast(`Color ${request.color} picked via external trigger!`);
        sendResponse({ status: "Popup updated" });
    } else {
         // Send a default response if no action matched, or handle other messages
         sendResponse({ status: "Message received, no action taken" });
    }
    // Return true only if you intend to use sendResponse asynchronously later
    // Since sendResponse is called synchronously here, returning true is okay but not strictly necessary
    return true;
});