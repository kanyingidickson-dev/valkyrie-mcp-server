import express from 'express';
import dotenv from 'dotenv';
import { Client } from '@notionhq/client';
import crypto from 'crypto';
import querystring from 'querystring';

dotenv.config();

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const notion = new Client({ auth: process.env.NOTION_TOKEN });
const PORT = process.env.WEBHOOK_PORT || 4000;
const ACTION_TOKEN = process.env.WEBHOOK_ACTION_TOKEN || '';
const SLACK_SIGNING_SECRET = process.env.SLACK_SIGNING_SECRET || '';

function verifySlackRequest(req) {
  if (!SLACK_SIGNING_SECRET) return true; // skip verification if not configured (local dev)
  const ts = req.headers['x-slack-request-timestamp'];
  const sig = req.headers['x-slack-signature'];
  if (!ts || !sig) return false;
  const age = Math.abs(Math.floor(Date.now() / 1000) - Number(ts));
  if (age > 60 * 5) return false; // older than 5 minutes

  const body = req.rawBody || req.bodyRaw || querystring.stringify(req.body) || '';
  const basestring = `v0:${ts}:${body}`;
  const mySig =
    'v0=' + crypto.createHmac('sha256', SLACK_SIGNING_SECRET).update(basestring).digest('hex');
  try {
    return crypto.timingSafeEqual(Buffer.from(mySig), Buffer.from(String(sig)));
  } catch {
    return false;
  }
}

// GET action: simple link-based actions (requires ACTION_TOKEN to be set)
app.get('/action', async (req, res) => {
  const { token, incident, action } = req.query;
  if (!ACTION_TOKEN) {
    return res.status(403).send('webhook action token not configured');
  }
  if (String(token) !== ACTION_TOKEN) return res.status(403).send('invalid token');
  if (!incident || !action) return res.status(400).send('missing params');

  try {
    let statusName = 'Awaiting Approval';
    if (action === 'acknowledge') statusName = 'In Progress';
    if (action === 'escalate') statusName = 'Awaiting Approval';

    await notion.pages.update({
      page_id: String(incident),
      properties: {
        Status: { status: { name: statusName } },
      },
    });

    res.send(`Incident ${incident} updated to ${statusName}`);
  } catch (e) {
    console.error('Webhook action failed:', e);
    res.status(500).send('update failed');
  }
});

// POST endpoint for Slack interactive payloads
app.post('/slack/actions', express.raw({ type: '*/*' }), async (req, res) => {
  // Save raw body for verification
  req.rawBody = req.body.toString();
  // parse application/x-www-form-urlencoded payload param
  const parsed = querystring.parse(req.rawBody);
  const payload = parsed.payload ? JSON.parse(parsed.payload) : null;

  if (!verifySlackRequest(req)) return res.status(400).send('verification failed');
  if (!payload) return res.status(400).send('no payload');

  try {
    const action = payload?.actions?.[0];
    const value = action?.value || action?.selected_option?.value;
    // expect value to be like {"incident":"PAGE_ID","action":"acknowledge"}
    let parsedValue = {};
    try {
      parsedValue = JSON.parse(String(value));
    } catch {}
    const incident =
      parsedValue.incident || payload?.message?.blocks?.find(b => b.type === 'section')?.block_id;
    const act = parsedValue.action || action?.action_id || 'acknowledge';

    if (!incident) return res.status(400).send('missing incident id');

    let statusName = 'Awaiting Approval';
    if (act === 'acknowledge') statusName = 'In Progress';

    await notion.pages.update({
      page_id: String(incident),
      properties: { Status: { status: { name: statusName } } },
    });
    // respond to Slack
    // If Slack provided a response_url, update the original message in-thread
    try {
      const responseUrl = payload?.response_url || parsed?.response_url;
      if (responseUrl) {
        await fetch(responseUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: `Incident ${incident} updated to ${statusName}` }),
        });
      }
    } catch (e) {
      console.error('Failed to post to response_url:', e);
    }

    res.json({ text: `Incident updated to ${statusName}` });
  } catch (e) {
    console.error('Slack action handling failed:', e);
    res.status(500).send('action handling failed');
  }
});

app.listen(PORT, () => console.log(`[Webhook] Listening on http://localhost:${PORT}`));
