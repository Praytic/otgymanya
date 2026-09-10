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

## Run as a Telegram bot

The Telegram deployment has the same four views and writes to the same Google Sheet. It edits one dashboard message and uses inline keyboards for navigation. Workout values are entered by replying to a short prompt.

Set these variables in addition to `GOOGLE_SHEETS_ID` and Google credentials:

```bash
TELEGRAM_GYM_BOT_TOKEN=...
TELEGRAM_GYM_CHAT_ID=...
```

Then run:

```bash
npm run start:telegram
```

The configured chat ID is an allowlist: messages from every other chat are ignored, and foreign button presses are rejected. Unsubmitted workout changes are stored in `~/.local/state/gym-routine-tracker/telegram.json` by default. Only run one polling process for a bot token.

Forum-topic deployments register Current, History, and Context thread IDs in `~/.local/state/gym-routine-tracker/topics.json`. Current contains workout controls and on-demand Stats. History contains one bot post per submitted workout. A new message in Context becomes the latest preference override. The bot must be an administrator or have BotFather privacy mode disabled to receive ordinary group messages; `/context ...` is the privacy-safe command fallback.

For a persistent user service, copy `deploy/gym-routine-tracker-telegram.service` to `~/.config/systemd/user/`, create the private `~/.config/gym-routine-tracker/telegram.env`, then enable the service. The environment file must contain the three variables above plus `GOOGLE_APPLICATION_CREDENTIALS` when Application Default Credentials are not otherwise available.

## Checks

```bash
npm test
npm run build
npm run test:e2e
```

The API has no user login. Keep it on a trusted private network unless you add authentication.

## Artwork

Interface icons are from [Lucide](https://lucide.dev/) and are licensed under the [ISC License](https://lucide.dev/license).

Exercise artwork is from [Workout Guide](https://bryllim.github.io/workout-guide/): original artwork by [Everkinetic](https://github.com/everkinetic/data), expanded by [Bryl Lim](https://bryllim.com/), and licensed under [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/).
