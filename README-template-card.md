# v11 Template Based Social Card

This patch updates the Photo Booth generated card to use the supplied Yuvaan footballer artwork as the card body.

Changes:
- Uses `public/assets/yuvi-card-template.jpg` as the social card base.
- Pastes the uploaded selfie into the face area only.
- Keeps the original hair and football pose from the template.
- Overlays jersey name, number, and colors based on the selected superstar style.
- Keeps Download Card and Post to Highlights working.
- Keeps the native mobile Take Selfie / Choose Photo flow.

No Supabase SQL changes are required.
