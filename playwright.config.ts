import {defineConfig,devices} from '@playwright/test';
export default defineConfig({testDir:'./e2e',webServer:{command:'npx vite --host 127.0.0.1 --port 15173 --strictPort',url:'http://127.0.0.1:15173/gym/',reuseExistingServer:false},use:{baseURL:'http://127.0.0.1:15173/gym/',...devices['Pixel 7']}});
