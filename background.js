// --- Initialization and Context Menu Setup ---
chrome.runtime.onInstalled.addListener(() => {
  console.log("Pixel Picker Installed/Updated.");
  // Ensure storage keys exist (using original "colors" for saved)
  chrome.storage.local.get(['colors', 'colorHistory'], (result) => {
      if (!result.colors) {
          chrome.storage.local.set({ colors: [] });
          console.log("Initialized 'colors' storage.");
      }
      if (!result.colorHistory) {
          chrome.storage.local.set({ colorHistory: [] });
           console.log("Initialized 'colorHistory' storage.");
      }
  });

  // Create Context Menu Item
  chrome.contextMenus.create({
      id: "pixelPickerContextMenu", // Consistent ID
      title: "Pick Color with Pixel Picker",
      contexts: ["page", "selection", "image", "link"]
  }, () => {
      if (chrome.runtime.lastError) {
          console.error("Context menu creation failed:", chrome.runtime.lastError);
      } else {
          console.log("Context menu created successfully.");
      }
  });
});

// --- Context Menu Click Listener ---
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "pixelPickerContextMenu" && tab?.id) {
      console.log("Context menu clicked for tab:", tab.id);
      triggerColorPicker(tab.id);
  }
});

// --- Keyboard Shortcut Listener ---
chrome.commands.onCommand.addListener((command, tab) => {
  if (command === "activate-picker" && tab?.id) {
      console.log("Command activated for tab:", tab.id);
      triggerColorPicker(tab.id);
  }
});

// --- Function to Inject Content Script ---
function triggerColorPicker(tabId) {
  console.log(`Injecting content script into tab: ${tabId}`);
  chrome.scripting.executeScript(
      {
          target: { tabId: tabId },
          files: ['content_script.js']
      },
      (injectionResults) => {
          if (chrome.runtime.lastError) {
              console.error(`Script injection failed into tab ${tabId}: ${chrome.runtime.lastError.message}`);
              // Maybe send a notification to the user?
          } else if (!injectionResults || injectionResults.length === 0) {
               console.warn(`Script injection into tab ${tabId} completed, but no results returned (might be okay).`);
          } else {
               console.log(`Script injected successfully into tab ${tabId}.`);
          }
      }
  );
}

// --- Function to add color to history from background ---
async function addToHistoryInBackground(hexColor) {
  if (!hexColor) return;
  try {
      const { colorHistory = [] } = await chrome.storage.local.get("colorHistory");
      const updatedHistory = [hexColor, ...colorHistory.filter(c => c !== hexColor)].slice(0, 5); // MAX_HISTORY = 5
      await chrome.storage.local.set({ colorHistory: updatedHistory });
      console.log("Added to history from background:", hexColor);
  } catch (error) {
      console.error("Background failed to add to history:", error);
  }
}


// --- Listen for Message from Content Script ---
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "colorPickedFromContent" && request.color) {
      const pickedColor = request.color;
      console.log(`Background received: ${pickedColor} from tab ${sender.tab?.id}`);

      // Store temporarily for popup opening
      chrome.storage.local.set({ lastPickedColor: pickedColor }, () => {
           console.log("Set lastPickedColor:", pickedColor);
      });

      // Add to history from background
      addToHistoryInBackground(pickedColor); // Use the async helper

      // Try to notify the popup if it's open
      chrome.runtime.sendMessage({ action: "colorPicked", color: pickedColor })
          .then(response => console.log("Message sent to popup, response:", response))
          .catch(error => {
              // Expected error if popup isn't open
              if (error.message?.includes("Receiving end does not exist")) {
                  console.log("Popup not open. Color stored.");
              } else {
                  console.error("Error sending message to popup:", error);
              }
          });

      sendResponse({ status: "Background processed color" }); // Acknowledge

  } else if (request.action === "pickerErrorFromContent") {
      console.error("Picker Error from Content Script:", request.error);
      sendResponse({ status: "Background noted error" }); // Acknowledge
  }
   // Keep channel open for async response potential, especially with storage operations.
   // Using async functions within the listener often requires returning true.
  return true;
});