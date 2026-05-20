# v10 Native Selfie Fix

This patch replaces the browser streaming camera flow with a mobile-first native file input flow:

- Take selfie uses `<input type="file" accept="image/*" capture="user">`
- Choose photo uses `<input type="file" accept="image/*">`
- Both inputs feed the same card generation pipeline
- Start Camera and Capture Face buttons are removed from the UI
- No Supabase schema changes required

This avoids mobile `NotAllowedError: Permission denied` from `getUserMedia()` and works better in Safari, Chrome, and many QR/in-app browser flows.
