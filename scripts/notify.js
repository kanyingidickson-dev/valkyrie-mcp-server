import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

const SLACK_WEBHOOK = process.env.SLACK_WEBHOOK_URL;

async function sendSlackPayload(payload) {
  if (!SLACK_WEBHOOK) return;
  try {
    await fetch(SLACK_WEBHOOK, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  } catch (e) {
    console.error('[Notify] Slack send failed:', e);
  }
}

async function sendEmail(subject, text) {
  const host = process.env.EMAIL_SMTP_HOST;
  const port = process.env.EMAIL_SMTP_PORT;
  const user = process.env.EMAIL_USER;
  const pass = process.env.EMAIL_PASS;
  const to = process.env.ALERT_RECIPIENT;

  if (!host || !port || !user || !pass || !to) return;

  try {
    const transporter = nodemailer.createTransport({
      host,
      port: parseInt(port, 10),
      secure: Number(port) === 465,
      auth: { user, pass },
    });

    await transporter.sendMail({
      from: user,
      to,
      subject,
      text,
    });
  } catch (e) {
    console.error('[Notify] Email send failed:', e);
  }
}

export async function notifyIncident({ incidentId, location, category, level, summary, url }) {
  const notionLink = url || (incidentId ? `https://www.notion.so/${incidentId}` : null);
  const payload = { incidentId, location, category, level, summary, url: notionLink };

  // Build Slack blocks
  const token = process.env.WEBHOOK_ACTION_TOKEN || '';
  const base = `http://localhost:${process.env.WEBHOOK_PORT || 4000}/action`;
  const ackUrl = token
    ? `${base}?token=${encodeURIComponent(token)}&incident=${encodeURIComponent(incidentId)}&action=acknowledge`
    : `${base}?incident=${encodeURIComponent(incidentId)}&action=acknowledge`;
  const escUrl = token
    ? `${base}?token=${encodeURIComponent(token)}&incident=${encodeURIComponent(incidentId)}&action=escalate`
    : `${base}?incident=${encodeURIComponent(incidentId)}&action=escalate`;

  const blocks = [
    {
      type: 'section',
      text: { type: 'mrkdwn', text: `*🚨 Incident:* *${location}*` },
      accessory: notionLink
        ? { type: 'button', text: { type: 'plain_text', text: 'Open in Notion' }, url: notionLink }
        : undefined,
    },
    {
      type: 'section',
      fields: [
        {
          type: 'mrkdwn',
          text: `*Category:*
${category}`,
        },
        {
          type: 'mrkdwn',
          text: `*Level:*
${level}`,
        },
      ],
    },
    { type: 'section', text: { type: 'mrkdwn', text: `${summary || ''}` } },
    {
      type: 'actions',
      elements: [
        { type: 'button', text: { type: 'plain_text', text: 'Acknowledge' }, url: ackUrl },
        { type: 'button', text: { type: 'plain_text', text: 'Escalate' }, url: escUrl },
      ],
    },
  ];

  await Promise.all([
    sendSlackPayload({ blocks }),
    sendEmail(
      `Valkyrie Alert: ${location} (Level ${level})`,
      `${location} — ${category} (Level ${level})\n\n${summary || ''}\n\nNotion: ${notionLink || incidentId}`
    ),
  ]).catch(() => {});
}

export default { notifyIncident };
