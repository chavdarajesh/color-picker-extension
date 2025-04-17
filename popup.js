// --- DOM Elements (Matching Original HTML) ---
const pickColorBtn = document.getElementById("pickColor");
const colorDisplay = document.getElementById("colorDisplay");
const hexEl = document.getElementById("hex");
const rgbEl = document.getElementById("rgb");
const hslEl = document.getElementById("hsl");
const nameEl = document.getElementById("colorName");
const colorInfo = document.getElementById("colorInfo");
const saveColorBtn = document.getElementById("saveColor");
const savedColorsList = document.getElementById("savedColors"); // Target the inner div
const colorHistoryList = document.getElementById("colorHistory"); // Target the new history div
const toast = document.getElementById("toast");

const MAX_HISTORY = 5;
const MAX_SAVED = 10; // Original limit

// --- Color Conversion & Naming (Keep from previous version or original) ---

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

// Optional: Keep Color Naming
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

// --- Toast Notification (Original) ---
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


// --- Clipboard Copying (Original Logic) ---
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

// --- History Management (NEW) ---
async function loadHistory() {
    try {
        const { colorHistory = [] } = await chrome.storage.local.get("colorHistory");
        renderColorList(colorHistoryList, colorHistory, false); // false = no delete button
    } catch (error) {
        console.error("Failed to load history:", error);
    }
}

async function addToHistory(hexColor) {
    if (!hexColor) return;
    try {
        const { colorHistory = [] } = await chrome.storage.local.get("colorHistory");
        const updatedHistory = [hexColor, ...colorHistory.filter(c => c !== hexColor)].slice(0, MAX_HISTORY);
        await chrome.storage.local.set({ colorHistory: updatedHistory });
        await loadHistory(); // Refresh display immediately
    } catch (error) {
        console.error("Failed to add to history:", error);
    }
}

// --- Saved Colors Management (FIXED - Uses Original Key "colors") ---
async function loadSavedColors() {
    try {
        // *** IMPORTANT: Use the original storage key "colors" ***
        const { colors = [] } = await chrome.storage.local.get("colors");
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
        // *** IMPORTANT: Use the original storage key "colors" ***
        const { colors = [] } = await chrome.storage.local.get("colors");
        const updated = [colorToSave, ...colors.filter(c => c !== colorToSave)].slice(0, MAX_SAVED); // Use MAX_SAVED
        // *** IMPORTANT: Use the original storage key "colors" ***
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
        // *** IMPORTANT: Use the original storage key "colors" ***
        const { colors = [] } = await chrome.storage.local.get("colors");
        const updated = colors.filter(c => c !== hexColor);
        // *** IMPORTANT: Use the original storage key "colors" ***
        await chrome.storage.local.set({ colors: updated });

        await loadSavedColors(); // Refresh display
        showToast("Color removed.");
    } catch (error) {
        console.error("Failed to remove color:", error);
        showToast("Error removing color.", true);
    }
}


// --- Generic List Rendering (Adapted from Original `loadSavedColors`) ---
function renderColorList(listElement, colorsArray, allowDelete) {
    listElement.innerHTML = ''; // Clear previous items
    const placeholder = listElement.querySelector('.placeholder');

    if (!colorsArray || colorsArray.length === 0) {
        if (placeholder) placeholder.style.display = 'block'; // Show placeholder
        return;
    }
    if (placeholder) placeholder.style.display = 'none'; // Hide placeholder


    colorsArray.forEach(color => {
        const el = document.createElement("div");

        // Use original styling structure if needed, or simplify
        el.style.backgroundColor = color; // Setting background as per original CSS potentially

        const span = document.createElement("span");
        span.textContent = color;
        span.style.flex = "1"; // Original styles
        span.style.cursor = "pointer";
        span.onclick = () => { // Copy on click
            navigator.clipboard.writeText(color)
                .then(() => showToast("Copied saved color!"))
                .catch(err => showToast("Failed to copy.", true));
        };

        el.appendChild(span);

        if (allowDelete) {
            const removeBtn = document.createElement("button");
            removeBtn.textContent = "❌"; // Original button text
            // Apply original styles for consistency
            removeBtn.style.marginLeft = "10px";
            removeBtn.style.border = "none";
            removeBtn.style.background = "transparent";
            removeBtn.style.cursor = "pointer";
            removeBtn.style.color = "#c0392b";
            removeBtn.onclick = async (e) => {
                e.stopPropagation(); // Prevent item click
                await removeSavedColor(color); // Make sure this function is defined and async
            };
             // Add hover style via JS or rely on original CSS if it had it
            removeBtn.onmouseover = () => { removeBtn.style.color = "#e74c3c"; };
            removeBtn.onmouseout = () => { removeBtn.style.color = "#c0392b"; };

            el.appendChild(removeBtn);
        }

        listElement.appendChild(el);
    });
}


// --- Initialization ---
document.addEventListener("DOMContentLoaded", async () => {
    // Load initial state
    await loadSavedColors();
    await loadHistory();

    // Check for color picked via context menu/shortcut
    try {
        const { lastPickedColor } = await chrome.storage.local.get("lastPickedColor");
        if (lastPickedColor) {
            console.log("Popup found lastPickedColor:", lastPickedColor);
            updateColorDisplay(lastPickedColor);
            // Don't add to history here, background script should handle it
            await chrome.storage.local.remove("lastPickedColor"); // Clear after use
        } else {
            console.log("No lastPickedColor found on popup open.");
        }
    } catch (error) {
        console.error("Error getting lastPickedColor:", error);
    }
});

// --- Listen for messages from background ---
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "colorPicked" && request.color) {
        console.log("Popup received color:", request.color);
        updateColorDisplay(request.color);
        // History should be added by background script or the picker function itself
        // Optionally refresh history display here if needed:
        loadHistory();
        showToast(`Color ${request.color} picked via external trigger!`);
        sendResponse({ status: "Popup updated" });
    }
    return true; // Indicate async response possible
});