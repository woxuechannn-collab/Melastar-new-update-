import { Router, type IRouter } from "express";

const router: IRouter = Router();

const page = (title: string, body: string) => `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="robots" content="index,follow" />
    <title>${title}</title>
    <style>
      :root {
        color-scheme: dark;
        font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        background: #10131a;
        color: #eef2f7;
      }
      body {
        margin: 0;
        background: linear-gradient(145deg, #171b25 0%, #10131a 52%, #0c0f14 100%);
        min-height: 100vh;
      }
      main {
        width: min(760px, calc(100% - 32px));
        margin: 0 auto;
        padding: 64px 0 80px;
      }
      nav {
        display: flex;
        gap: 18px;
        margin-bottom: 44px;
        font-size: 14px;
      }
      nav a { color: #a9c7ff; }
      h1 { margin: 0 0 12px; font-size: clamp(32px, 6vw, 52px); letter-spacing: -0.04em; }
      h2 { margin: 36px 0 10px; font-size: 22px; }
      p, li { color: #c4ccd8; line-height: 1.75; }
      ul { padding-left: 22px; }
      .updated { color: #8994a5; font-size: 14px; margin-bottom: 42px; }
      a { color: #a9c7ff; }
      footer { border-top: 1px solid #2b3341; margin-top: 56px; padding-top: 20px; color: #8994a5; font-size: 13px; }
    </style>
  </head>
  <body>
    <main>
      <nav>
        <a href="/api/terms">Terms of Service</a>
        <a href="/api/privacy">Privacy Policy</a>
      </nav>
      ${body}
      <footer>Discord Giveaway Bot is an independent service and is not affiliated with or endorsed by Discord Inc.</footer>
    </main>
  </body>
</html>`;

router.get("/terms", (_req, res) => {
  res.type("html").send(
    page(
      "Terms of Service | Discord Giveaway Bot",
      `
        <h1>Terms of Service</h1>
        <p class="updated">Effective date: August 16, 2026</p>

        <p>These Terms of Service govern your use of Discord Giveaway Bot (the “Bot”). By using the Bot, you agree to these Terms and to follow Discord’s Terms of Service and Community Guidelines.</p>

        <h2>1. What the Bot does</h2>
        <p>The Bot helps Discord server administrators create and manage giveaways. It may collect entries, display giveaway information, select winners, and announce results in the Discord server where it is installed.</p>

        <h2>2. Acceptable use</h2>
        <ul>
          <li>Use the Bot only in servers where you have permission to install or operate bots.</li>
          <li>Do not use the Bot to break Discord’s rules, applicable laws, or the rights of other people.</li>
          <li>Do not abuse, overload, interfere with, or attempt to gain unauthorized access to the Bot or its data.</li>
          <li>Server administrators are responsible for the prizes, eligibility rules, moderation, and lawful operation of their giveaways.</li>
        </ul>

        <h2>3. Giveaways and results</h2>
        <p>The Bot provides giveaway functionality as a convenience. Giveaway hosts are responsible for accurately describing prizes, honoring their giveaway rules, and delivering prizes to selected winners. The Bot operator is not responsible for disputes between hosts and participants.</p>

        <h2>4. Availability</h2>
        <p>The Bot is provided on an “as is” and “as available” basis. Features may change, be interrupted, or be discontinued without notice. We do not guarantee that every giveaway interaction will be available at all times.</p>

        <h2>5. Changes and termination</h2>
        <p>We may update these Terms from time to time. Continued use of the Bot after an update means you accept the revised Terms. Access may be suspended or removed if the Bot is misused or these Terms are violated.</p>

        <h2>6. Contact</h2>
        <p>For questions about the Bot, contact the Bot owner or the administrators of the Discord server where the Bot is used.</p>
      `,
    ),
  );
});

router.get("/privacy", (_req, res) => {
  res.type("html").send(
    page(
      "Privacy Policy | Discord Giveaway Bot",
      `
        <h1>Privacy Policy</h1>
        <p class="updated">Effective date: August 16, 2026</p>

        <p>This Privacy Policy explains what Discord Giveaway Bot stores and why. The Bot is designed to use only the information needed to operate giveaways.</p>

        <h2>1. Information we store</h2>
        <ul>
          <li>Discord user IDs for giveaway participants and selected winners.</li>
          <li>Discord server, channel, and giveaway message IDs.</li>
          <li>The giveaway prize, number of winners, host tag, and start/end timestamps.</li>
          <li>The giveaway status and entry list.</li>
        </ul>
        <p>The Bot does not intentionally store private messages, message content, passwords, payment information, or Discord account tokens.</p>

        <h2>2. How information is used</h2>
        <p>We use this information to record entries, show the current entry count, display the participant list when requested, select winners, recover active giveaways after a restart, and announce giveaway results.</p>

        <h2>3. Sharing</h2>
        <p>Information is not sold or used for advertising. Giveaway information is shown through the Discord server features where the giveaway is hosted. We may disclose information if required by law or to protect the security and integrity of the Bot.</p>

        <h2>4. Retention and deletion</h2>
        <p>Giveaway records are retained for the operational history of the Bot. A server owner or Bot owner may request deletion of a giveaway record by contacting the Bot owner. Some information may remain in Discord messages or server logs controlled by the server owner.</p>

        <h2>5. Security</h2>
        <p>Reasonable measures are used to protect stored giveaway records. No online service can guarantee absolute security, so please do not submit sensitive personal information through a giveaway.</p>

        <h2>6. Contact</h2>
        <p>For privacy questions or deletion requests, contact the Bot owner or the administrators of the Discord server where the Bot is used.</p>
      `,
    ),
  );
});

export default router;