# Otgymanya

A small mobile workout tracker built with React, Base Web, Express, and Google Sheets.

It shows the current routine, saves completed sets, and displays workout history and simple statistics. If you need a routine, browse the [Liftosaur workout program library](https://www.liftosaur.com/programs) and choose one that fits your goals and experience.

## Run locally

1. Create a Google Sheet for the app.
2. Set `GOOGLE_SHEETS_ID` to the sheet ID.
3. Configure [Google Application Default Credentials](https://cloud.google.com/docs/authentication/provide-credentials-adc) with access to the sheet.
4. Install and start the app:

```bash
npm install
npm run dev
```

The web app runs at `http://localhost:5173`. The API runs at `http://127.0.0.1:8081`.

Use `npm run init:sheet` only with a new, empty Google Sheet.

## Checks

```bash
npm test
npm run build
npm run test:e2e
```

The API has no user login. Keep it on a trusted private network unless you add authentication.

## Artwork

Interface emojis are from [OpenMoji](https://openmoji.org/), the open-source emoji and icon project, and are licensed under [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/).
