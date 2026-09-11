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

Interface icons are from [Lucide](https://lucide.dev/) and are licensed under the [ISC License](https://lucide.dev/license).

Exercise artwork is from [Workout Guide](https://bryllim.github.io/workout-guide/): original artwork by [Everkinetic](https://github.com/everkinetic/data), expanded by [Bryl Lim](https://bryllim.com/), and licensed under [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/).

## Telegram Mini App

The Mini App reuses the website's four views. `server/mini-app.mjs` serves the same build on loopback port 8083, with Telegram HMAC validation and a 24-hour launch lifetime. Any user with a valid Telegram launch session can access the shared workout data; group membership and bot administrator permissions are not required. Reopen the Mini App after its session expires. Context is loaded through the protected API rather than included in the public JavaScript bundle. The existing private web server remains available separately.

Install `deploy/gym-routine-tracker-mini-app.service` as a user service. Its private environment file at `~/.config/gym-routine-tracker/mini-app.env` must contain `TELEGRAM_GYM_BOT_TOKEN`, `GOOGLE_SHEETS_ID`, and `GOOGLE_APPLICATION_CREDENTIALS`. Keep it outside Git and readable only by its owner. Run `npm run build`, then enable the service. Expose only the Mini App server through HTTPS, for example on a dedicated Tailscale Funnel port: `sudo tailscale funnel --bg --https=8443 --yes http://127.0.0.1:8083`. Do not expose the private web server, which does not require Telegram authentication.

In BotFather, select the bot and configure its Main Mini App with the HTTPS URL plus `?telegram=1`. Then run `node telegram/setup-mini-app.mjs` with the bot environment, `TELEGRAM_GYM_CHAT_ID` set to the target group, and `TELEGRAM_GYM_MINI_APP_URL` set to that URL. Setup verifies endpoint authorization, configures and reads back the private-chat menu, and posts an Open Gym direct-link button in the group's General topic. The message ID is saved outside the repository so rerunning updates the same launcher. Main Mini App registration requires the bot owner's BotFather account; the Bot API cannot perform it. Group launch uses a `startapp` link, since `web_app` buttons and bot menu buttons are for private bot chats.

Telegram interactions run inside the Mini App. The group only needs its General topic and the Open Gym launcher. No polling service, topic registration, message-based workout controls, or Context-post synchronization is used. The bot does not need group administrator access. Local edits to `WORKOUT_CONTEXT.md` are read by the protected Context API.
