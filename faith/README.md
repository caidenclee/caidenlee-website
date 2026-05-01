# Faith — Your Personal AI Assistant

Faith is a personal AI assistant PWA built for Caiden Lee. She's warm, sharp, and knows your goals — from sub-6 speedcubing to growing your YouTube channel and locking down that GAN sponsorship.

---

## Prerequisites

- **Node.js** 18 or later — [Download here](https://nodejs.org/)
- **npm** (comes with Node.js)
- A modern browser (Safari on iPhone for full PWA support)

---

## Environment Variables

Create a `.env.local` file in the project root. Copy from `.env.example`:

```bash
cp .env.example .env.local
```

Then fill in each value:

### `ANTHROPIC_API_KEY`
Your Anthropic API key — this powers Faith's intelligence.

**How to get it:**
1. Go to [console.anthropic.com](https://console.anthropic.com/)
2. Sign in or create an account
3. Click **API Keys** in the sidebar
4. Click **Create Key**, give it a name like "faith"
5. Copy the key — it starts with `sk-ant-`

### `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`
Required for Google Calendar and Google Tasks integration.

**Step-by-step setup:**
1. Go to [console.cloud.google.com](https://console.cloud.google.com/)
2. Create a new project (name it "faith" or similar)
3. In the sidebar, go to **APIs & Services → Library**
4. Search for and enable **Google Calendar API**
5. Search for and enable **Tasks API**
6. Go to **APIs & Services → OAuth consent screen**
   - Choose **External**
   - Fill in App name: "Faith", User support email, Developer contact email
   - Click Save and Continue through the scopes and test users steps
7. Go to **APIs & Services → Credentials**
8. Click **Create Credentials → OAuth client ID**
9. Application type: **Web application**
10. Name: "Faith Web"
11. Under **Authorized redirect URIs**, add:
    - `http://localhost:3000/api/google/callback` (for local dev)
    - `https://your-domain.com/api/google/callback` (for production)
12. Click **Create**
13. Copy the **Client ID** and **Client Secret**

### `NEXT_PUBLIC_APP_URL`
The base URL of your app.
- Local development: `http://localhost:3000`
- Production: `https://your-domain.vercel.app` (or custom domain)

### `COOKIE_SECRET`
A random string used for cookie security. Generate one:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

## Running Locally

```bash
# 1. Install dependencies
npm install

# 2. Set up environment variables
cp .env.example .env.local
# Edit .env.local with your keys

# 3. Start the dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Deploying to Vercel

1. **Push to GitHub:**
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin https://github.com/yourusername/faith.git
   git push -u origin main
   ```

2. **Import to Vercel:**
   - Go to [vercel.com](https://vercel.com) and sign in
   - Click **Add New → Project**
   - Import your GitHub repo
   - Click **Deploy** (default settings work)

3. **Add environment variables:**
   - In your Vercel project, go to **Settings → Environment Variables**
   - Add each variable from your `.env.local`:
     - `ANTHROPIC_API_KEY`
     - `GOOGLE_CLIENT_ID`
     - `GOOGLE_CLIENT_SECRET`
     - `NEXT_PUBLIC_APP_URL` (set to your Vercel URL, e.g. `https://faith-xyz.vercel.app`)
     - `COOKIE_SECRET`
   - Click **Save**

4. **Redeploy:**
   - Go to **Deployments** tab
   - Click the three dots on the latest deployment → **Redeploy**

5. **Update Google OAuth redirect URI:**
   - Go back to [console.cloud.google.com](https://console.cloud.google.com/)
   - Go to **Credentials → your OAuth client**
   - Add your Vercel URL to **Authorized redirect URIs**:
     `https://faith-xyz.vercel.app/api/google/callback`
   - Save

---

## Saving to iPhone Home Screen

1. Open your Faith URL in **Safari** on iPhone (must be Safari, not Chrome)
2. Tap the **Share** button (box with arrow pointing up)
3. Scroll down and tap **Add to Home Screen**
4. Tap **Add** in the top right
5. Faith will appear on your home screen as a full-screen app

---

## App Icons

The app references `/icon-192.png` and `/icon-512.png`. Create square PNG icons and place them in the `public/` folder:
- `public/icon-192.png` — 192×192 pixels
- `public/icon-512.png` — 512×512 pixels

You can use any image editor or a tool like [favicon.io](https://favicon.io/) to generate them.

---

## Troubleshooting

### "Faith won't load" / blank screen
- Make sure `npm install` completed without errors
- Check that `.env.local` exists and has valid values
- Run `npm run dev` and check the terminal for error messages

### Google Calendar says "Not connected"
- Make sure `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` are set correctly
- Verify the redirect URI in Google Cloud Console matches your app URL exactly
- Make sure you've enabled both **Google Calendar API** and **Tasks API** in the console

### "Failed to connect to Faith" in chat
- Verify `ANTHROPIC_API_KEY` is set and valid
- Make sure you have credits in your Anthropic account

### Voice input not working
- Voice input requires HTTPS in production (works on localhost too)
- On iPhone, make sure Safari has microphone permission: **Settings → Safari → Microphone → Allow**
- Voice uses the Web Speech API — works best on Safari (iOS) and Chrome (desktop)

### PWA install banner not showing
- You must be on **Safari** on iPhone (not Chrome or Firefox)
- If you previously dismissed it, clear the banner: open browser console → `localStorage.removeItem('faith_install_dismissed')`

### Onboarding keeps showing
- This means `ONBOARDING_COMPLETE` isn't set in localStorage
- Clear it manually: `localStorage.setItem('ONBOARDING_COMPLETE', 'true')`

---

## Tech Stack

- **Next.js 14** with App Router + TypeScript
- **Tailwind CSS** for styling
- **@anthropic-ai/sdk** — Claude Sonnet 4.5 model
- **googleapis** — Google Calendar + Tasks
- **No external UI libraries** — everything is hand-crafted

---

Built with 💙 for Caiden Lee.
