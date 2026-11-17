// Outgoing email for invitations and check-in reminders.
// Uses Resend (RESEND_API_KEY) when configured; otherwise emails are not sent and the
// advisor workspace offers a mailto link so the advisor can send it from their own client.

const resendKey = process.env.RESEND_API_KEY;
const from = process.env.EMAIL_FROM || 'The Plan Audit <onboarding@resend.dev>';

export const emailConfigured = Boolean(resendKey);

const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));

export function invitationMessage({ kind, clientName, advisorName, link, missionTitle, prompt, note }) {
  const hello = clientName ? `Hi ${clientName},` : 'Hi,';
  const signature = advisorName ? `\n\n${advisorName}` : '';
  if (kind === 'invite') {
    return {
      subject: 'Your financial plan, explained in a few minutes',
      text: `${hello}\n\nBefore our next conversation, I'd like you to see your financial plan from your own perspective first. Tell me how you think you're doing, then compare it with what the plan says.\n\nIt takes about ten minutes:\n${link}${note ? `\n\n${note}` : ''}${signature}`,
    };
  }
  const day = kind === 'day3' ? 3 : 30;
  return {
    subject: day === 3 ? 'A quick check-in on your next step' : 'One month later: how did your next step go?',
    text: `${hello}\n\n${day === 3 ? 'A few days ago' : 'About a month ago'} you chose a next step${missionTitle ? `: "${missionTitle}"` : ''}.\n\n${prompt || 'How is it going?'}\n\nIt takes one minute to tell us where you are:\n${link}${note ? `\n\nA note from your advisor: ${note}` : ''}${signature}`,
  };
}

export function mailtoLink(to, { subject, text }) {
  return `mailto:${encodeURIComponent(to || '')}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(text)}`;
}

export async function sendEmail(to, { subject, text }) {
  if (!emailConfigured || !to) return { sent: false, reason: emailConfigured ? 'missing_recipient' : 'not_configured' };
  const html = `<div style="font-family:Georgia,serif;font-size:16px;line-height:1.6;color:#1d2a22;max-width:560px">${escapeHtml(text)
    .replace(/(https?:\/\/[^\s]+)/g, '<a href="$1" style="color:#04724d">$1</a>')
    .replace(/\n/g, '<br>')}</div>`;
  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from, to: [to], subject, text, html }),
      signal: AbortSignal.timeout(10000),
    });
    if (!response.ok) {
      console.warn('Email provider rejected a message:', response.status, (await response.text()).slice(0, 200));
      return { sent: false, reason: 'provider_error' };
    }
    return { sent: true };
  } catch (error) {
    console.warn('Email could not be sent:', error.message);
    return { sent: false, reason: 'provider_error' };
  }
}
