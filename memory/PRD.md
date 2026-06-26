# Poolside Live — Swim Meet Race Board

## Original Problem Statement
Build a mobile app for swim meets that shows the race currently going on plus the next 2 races. Parents scan a QR code to go to their specific swim meet. Includes an organizer page (per-meet passcode) to update which race is running. Later request: add a field so organizers can push out instant messages to users.

## User Personas
- **Parent/Spectator**: scans QR or enters code, watches live race progress, favorites their swimmer's events.
- **Meet Organizer**: creates a meet (passcode + pasted event list), advances the current race, broadcasts announcements.

## Architecture
- Backend: FastAPI + MongoDB (motor). Meet doc: id, name, code (6-char public), passcode, races[], current_index, messages[].
- Frontend: Expo Router (stack). Screens: index (home), scan, live, organizer, create-meet, control, edit-events.
- Design: Brutalist high-contrast (Bebas Neue + Space Grotesk, 0 radius, 2pt borders, signal red #FF3B30). Live view polls every 5s.

## Implemented (2026-06-25/26)
- Create meet from pasted event list (pipe/comma/freeform parsing) → returns code + QR.
- Parent live view: NOW RACING + UP NEXT (2) + full schedule; favorite events (persisted locally) with highlight.
- QR scan (expo-camera) + manual code entry.
- Organizer control panel: QR display/share, ADVANCE / PREVIOUS race controls, edit event list.
- Per-meet passcode protection on all mutations.
- **Announcements**: organizer broadcasts instant messages; parents see a banner (latest highlighted) on live view. (added 2026-06-26)

## Backlog
- P1: Auto-clear/expire announcements; mark current race as "in progress vs called".
- P2: Migrate SafeAreaView → react-native-safe-area-context; pass passcode via state instead of URL query.
- P2: Estimated start times per heat; multiple organizers.

## Next Tasks
- Gather user feedback on announcements; consider per-message dismiss for parents.
