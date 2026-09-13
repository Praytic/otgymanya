# Otgymanya

A Telegram Mini App workout tracker built with React, Base Web, Express, and Google Sheets.

It shows the current routine, saves completed sets, and displays workout history and simple statistics. If you need a routine, browse the [Liftosaur workout program library](https://www.liftosaur.com/programs) and choose one that fits your goals and experience.

## Local development

1. Create a Google Sheet for the app.
2. Set `GOOGLE_SHEETS_ID` to the sheet ID.
3. Configure [Google Application Default Credentials](https://cloud.google.com/docs/authentication/provide-credentials-adc) with access to the sheet.
4. Set `TELEGRAM_GYM_BOT_TOKEN` to the Mini App bot token.
5. Install and start the app:

```bash
npm install
npm run dev
```

Vite runs at `http://localhost:5173` and proxies to the protected Mini App API at `http://127.0.0.1:8081`. Data requests require valid Telegram launch data; opening the URL directly in a browser returns the Telegram access error. Browser tests use intercepted fixture responses and never write to the Google Sheet.

Use `npm run init:sheet` only with a new, empty Google Sheet.

## Checks

```bash
npm test
npm run build
npm run test:e2e
```

## Artwork

Interface icons are from [Lucide](https://lucide.dev/) and are licensed under the [ISC License](https://lucide.dev/license).

Exercise artwork is from [Workout Guide](https://bryllim.github.io/workout-guide/): original artwork by [Everkinetic](https://github.com/everkinetic/data), expanded by [Bryl Lim](https://bryllim.com/), and licensed under [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/).

## Telegram Mini App

`server/mini-app.mjs` serves the app's four views on loopback port 8083, with Telegram HMAC validation and a 24-hour launch lifetime. Any user with a valid Telegram launch session can access the shared workout data; group membership and bot administrator permissions are not required. Reopen the Mini App after its session expires. Context is loaded through the protected API rather than included in the public JavaScript bundle.

Deploy the Mini App with Docker Compose as described below. Expose it through HTTPS, for example on a dedicated Tailscale Funnel port: `sudo tailscale funnel --bg --https=8443 --yes http://127.0.0.1:8083`.

In BotFather, select the bot and configure its Main Mini App with the HTTPS URL plus `?telegram=1`. Then run `node telegram/setup-mini-app.mjs` with the bot environment, `TELEGRAM_GYM_CHAT_ID` set to the target group, and `TELEGRAM_GYM_MINI_APP_URL` set to that URL. Setup verifies endpoint authorization, configures and reads back the private-chat menu, and posts an Open Gym direct-link button in the group's General topic. The message ID is saved outside the repository so rerunning updates the same launcher. Main Mini App registration requires the bot owner's BotFather account; the Bot API cannot perform it. Group launch uses a `startapp` link, since `web_app` buttons and bot menu buttons are for private bot chats.

Telegram interactions run inside the Mini App. The group only needs its General topic and the Open Gym launcher. No polling service, topic registration, message-based workout controls, or Context-post synchronization is used. The bot does not need group administrator access. Local edits to `WORKOUT_CONTEXT.md` are read by the protected Context API.


## Docker deployment (Linux)

The Compose stack runs only the Telegram Mini App. Host networking preserves its loopback endpoint. Docker restarts the container after reboot; ensure the Docker daemon is enabled.

Keep deployment configuration outside Git in `~/.config/gym-routine-tracker/`, with owner-only permissions. Create `docker.env`:

```dotenv
DEPLOY_CONFIG_DIR=/absolute/path/to/.config/gym-routine-tracker
GOOGLE_CREDENTIALS_FILE=/absolute/path/to/google-service-account.json
CONTAINER_UID=1000
CONTAINER_GID=1000
```

Set the UID/GID to an account that can read the credential file. In the same configuration directory, create `mini-app-docker.env` containing `GOOGLE_SHEETS_ID` and `TELEGRAM_GYM_BOT_TOKEN`. Values containing `$` should be single-quoted. Credentials and `WORKOUT_CONTEXT.md` are mounted read-only and excluded from the image. Provide a local `WORKOUT_CONTEXT.md` before starting.

To migrate the existing user services, run:

```bash
./deploy/migrate-to-docker.sh
```

This builds first, stops the old Mini App service, waits for the container to become healthy, then disables the old service. Failed startup restores the service. The script needs access to Docker and the current user's systemd session; run it as your normal user.

For subsequent deployments and status:

```bash
docker compose --env-file ~/.config/gym-routine-tracker/docker.env up -d --build --wait --remove-orphans
docker compose --env-file ~/.config/gym-routine-tracker/docker.env ps
docker compose --env-file ~/.config/gym-routine-tracker/docker.env logs --tail=50
```

To roll back to the installed user services:

```bash
docker compose --env-file ~/.config/gym-routine-tracker/docker.env down
systemctl --user enable --now gym-routine-tracker-mini-app.service
```
