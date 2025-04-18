// This script is injected by the background script when
// the context menu or keyboard shortcut is used.

(async () => {
  // --- Helper Function to Show Feedback ---
  function showFeedback(message, isError = false, duration = 3000, colorValue = null) {
      // ... (feedback styling remains the same as previous version) ...
      const existingFeedback = document.getElementById('pixel-picker-feedback-div');
      if (existingFeedback) {
          existingFeedback.remove();
      }
      const feedbackDiv = document.createElement('div');
      feedbackDiv.id = 'pixel-picker-feedback-div';
      feedbackDiv.style.position = 'fixed';
      feedbackDiv.style.top = '20px';
      feedbackDiv.style.right = '20px';
      feedbackDiv.style.padding = '12px 18px';
      feedbackDiv.style.borderRadius = '6px';
      feedbackDiv.style.color = 'white';
      feedbackDiv.style.fontSize = '14px';
      feedbackDiv.style.zIndex = '2147483647';
      feedbackDiv.style.fontFamily = 'sans-serif';
      feedbackDiv.style.boxShadow = '0 4px 10px rgba(0,0,0,0.2)';
      feedbackDiv.style.display = 'flex';
      feedbackDiv.style.alignItems = 'center';

      if (isError) {
          feedbackDiv.style.backgroundColor = '#e74c3c';
          feedbackDiv.textContent = `Picker Error: ${message}`;
      } else if (colorValue) {
          feedbackDiv.style.backgroundColor = '#2c3e50';
          const swatch = document.createElement('span');
          swatch.style.display = 'inline-block';
          swatch.style.width = '18px';
          swatch.style.height = '18px';
          swatch.style.backgroundColor = colorValue;
          swatch.style.marginRight = '10px';
          swatch.style.borderRadius = '3px';
          swatch.style.border = '1px solid rgba(255, 255, 255, 0.5)';
          feedbackDiv.appendChild(swatch);
          const text = document.createElement('span');
          text.textContent = message; // Message will be updated after copy attempt
          feedbackDiv.appendChild(text);
      } else {
           feedbackDiv.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
           feedbackDiv.textContent = message;
      }

      document.body.appendChild(feedbackDiv);

      if (duration > 0) {
          setTimeout(() => {
              if (document.body.contains(feedbackDiv)) {
                   feedbackDiv.remove();
              }
          }, duration);
      }
      return feedbackDiv;
  }

  // --- Main Logic ---
  if (!window.EyeDropper) {
      const msg = "EyeDropper API not available.";
      console.error(msg);
      showFeedback(msg, true, 4000);
      chrome.runtime.sendMessage({ action: "pickerErrorFromContent", error: msg });
      return;
  }

  let initialFeedbackDiv = null;
  try {
      initialFeedbackDiv = showFeedback('Pixel Picker Active: Click to select color...', false, 0);

      const eyeDropper = new EyeDropper();
      const result = await eyeDropper.open();
      const pickedColor = result.sRGBHex;

      if (initialFeedbackDiv && document.body.contains(initialFeedbackDiv)) {
           initialFeedbackDiv.remove();
      }

      // --- Attempt to Copy to Clipboard ---
      let copySuccess = false;
      try {
          await navigator.clipboard.writeText(pickedColor);
          copySuccess = true;
          console.log('Color copied to clipboard from content script.');
      } catch (copyError) {
          copySuccess = false;
          console.warn('Failed to copy color from content script:', copyError);
      }

      // --- Show Feedback (Indicates if copied) ---
      const feedbackMessage = copySuccess ? `Color Picked & Copied: ${pickedColor}` : `Color Picked:`;
      showFeedback(feedbackMessage, false, 3500, pickedColor); // Show for 3.5 seconds

      // Send message to background script (always send color)
      chrome.runtime.sendMessage({ action: "colorPickedFromContent", color: pickedColor });

  } catch (error) {
       if (initialFeedbackDiv && document.body.contains(initialFeedbackDiv)) {
           initialFeedbackDiv.remove();
       }
      const errorMessage = error.message || "Picker Cancelled/Failed";
      console.warn("EyeDropper closed or failed:", error.name, errorMessage);
      if (error.name !== 'AbortError') {
          showFeedback(errorMessage, true, 3000);
      }
      chrome.runtime.sendMessage({ action: "pickerErrorFromContent", error: errorMessage });
  }

})();