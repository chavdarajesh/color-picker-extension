// This script is injected by the background script when
// the context menu or keyboard shortcut is used.

(async () => {
    // Ensure EyeDropper exists
    if (!window.EyeDropper) {
      console.error("EyeDropper API not available.");
      chrome.runtime.sendMessage({ action: "pickerErrorFromContent", error: "EyeDropper API not available" });
      return;
    }
  
    // Simple visual feedback (optional)
    const feedbackDiv = document.createElement('div');
    feedbackDiv.style.position = 'fixed';
    feedbackDiv.style.top = '10px';
    feedbackDiv.style.left = '10px';
    feedbackDiv.style.background = 'rgba(0, 0, 0, 0.7)';
    feedbackDiv.style.color = 'white';
    feedbackDiv.style.padding = '5px 10px';
    feedbackDiv.style.borderRadius = '3px';
    feedbackDiv.style.zIndex = '999999';
    feedbackDiv.textContent = 'Pixel Picker Active: Click to select color...';
    document.body.appendChild(feedbackDiv);
  
    try {
      const eyeDropper = new EyeDropper();
      const result = await eyeDropper.open();
  
      // Send the picked color back to the background script
      chrome.runtime.sendMessage({ action: "colorPickedFromContent", color: result.sRGBHex });
      feedbackDiv.remove(); // Clean up feedback
  
    } catch (error) {
      // Handle cancellation or other errors
      console.warn("EyeDropper closed or failed:", error.name, error.message);
       chrome.runtime.sendMessage({ action: "pickerErrorFromContent", error: error.message || "Picker Cancelled/Failed" });
       feedbackDiv.remove(); // Clean up feedback
  
    } finally {
         // Ensure feedback is removed if it still exists for some reason
        if (document.body.contains(feedbackDiv)) {
            feedbackDiv.remove();
        }
    }
  
  })(); // Immediately invoke the async function