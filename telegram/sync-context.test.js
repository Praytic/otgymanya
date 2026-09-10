import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {afterEach, describe, expect, it, vi} from 'vitest';
import {renderContextPost, syncContextPost} from './sync-context.mjs';

const temporaryDirectories = [];
afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) fs.rmSync(directory, {recursive: true, force: true});
});

describe('Telegram context synchronizer', () => {
  it('renders the latest context and preserves the latest Telegram preference', () => {
    const text = renderContextPost('# Workout context\n\n- Goal: grow', {contextPreference: {text: 'Avoid pain & fatigue'}});
    expect(text).toContain('🏋️ <b>Workout context</b>');
    expect(text).toContain('• Goal: grow');
    expect(text).toContain('Avoid pain &amp; fatigue');
  });

  it('edits the fixed Context topic post without sending another message', async () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'gym-context-sync-'));
    temporaryDirectories.push(directory);
    const contextPath = path.join(directory, 'WORKOUT_CONTEXT.md');
    const statePath = path.join(directory, 'telegram.json');
    fs.writeFileSync(contextPath, '# Workout context\n\nNewest content');
    fs.writeFileSync(statePath, JSON.stringify({contextMessageId: 99}));
    const api = {call: vi.fn(async () => true)};

    const result = await syncContextPost({api, chatId: '-1003776811091', messageId: 21, threadId: 12, contextPath, statePath});

    expect(result).toMatchObject({messageId: 21, threadId: 12});
    expect(api.call).toHaveBeenCalledOnce();
    expect(api.call).toHaveBeenCalledWith('editMessageText', expect.objectContaining({
      chat_id: '-1003776811091',
      message_id: 21,
      message_thread_id: 12,
      text: expect.stringContaining('Newest content'),
    }));
  });
});
