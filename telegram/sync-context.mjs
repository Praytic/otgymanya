import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {markdownToTelegram} from './topic-gym-bot.mjs';
import {createTelegramApi} from './telegram-api.mjs';

const escape = value => String(value ?? '').replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');

export function renderContextPost(markdown, state = {}) {
  const source = markdownToTelegram(markdown);
  const override = state.contextPreference?.text;
  return `${source}${override ? `\n\n<blockquote><b>Latest preference override</b>\n${escape(override)}</blockquote>` : ''}`.slice(0, 4096);
}

export async function syncContextPost({api, chatId, messageId = 21, threadId = 12, contextPath, statePath}) {
  if (!chatId) throw new Error('TELEGRAM_GYM_CHAT_ID is required');
  const state = fs.existsSync(statePath) ? JSON.parse(fs.readFileSync(statePath, 'utf8')) : {};
  const text = renderContextPost(fs.readFileSync(contextPath, 'utf8'), state);
  try {
    await api.call('editMessageText', {
      chat_id: String(chatId),
      message_id: Number(messageId),
      message_thread_id: Number(threadId),
      text,
      parse_mode: 'HTML',
      link_preview_options: {is_disabled: true},
    });
  } catch (error) {
    if (!/message is not modified/i.test(error.message)) throw error;
  }
  return {chatId: String(chatId), messageId: Number(messageId), threadId: Number(threadId), text};
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const result = await syncContextPost({
    api: createTelegramApi(process.env.TELEGRAM_GYM_BOT_TOKEN),
    chatId: process.env.TELEGRAM_GYM_CHAT_ID,
    messageId: process.env.TELEGRAM_GYM_CONTEXT_MESSAGE_ID || 21,
    threadId: process.env.TELEGRAM_GYM_CONTEXT_THREAD_ID || 12,
    contextPath: path.resolve('WORKOUT_CONTEXT.md'),
    statePath: process.env.TELEGRAM_GYM_STATE_PATH || path.join(os.homedir(), '.local', 'state', 'gym-routine-tracker', 'telegram.json'),
  });
  console.log(`Synchronized Telegram context post ${result.messageId} in topic ${result.threadId}.`);
}
