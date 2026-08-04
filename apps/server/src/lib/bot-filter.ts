// Self-identifying bots — crawlers, uptime monitors, headless tooling that
// didn't already get caught by the beacon's own navigator.webdriver check
// (e.g. anything hitting this endpoint directly, bypassing the beacon).
// The User-Agent header is inspected here only to decide accept/drop —
// it is never persisted, matching the rest of the ingest path.
const BOT_USER_AGENT =
    /bot|crawl|spider|slurp|headless|phantomjs|puppeteer|playwright|selenium|lighthouse|pingdom|uptimerobot|site24x7|statuscake|facebookexternalhit|bingpreview|whatsapp|telegrambot|discordbot|slackbot|curl|wget|python-requests|go-http-client|java\//i;

export const isBotUserAgent = (userAgent: string | undefined | null): boolean => {
    return !userAgent || BOT_USER_AGENT.test(userAgent);
};
