import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)
const FROM = process.env.EMAIL_FROM || 'noreply@fundflow.app'
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

interface EmailPayload {
  to: string
  requestNumber: string
  purpose: string
  amount: number
  requesterName?: string
  note?: string
}

function formatAmount(n: number) {
  return '₦' + n.toLocaleString('en-NG')
}

function baseTemplate(title: string, body: string, ctaText: string, ctaUrl: string) {
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:system-ui,sans-serif">
  <div style="max-width:560px;margin:32px auto;background:#fff;border-radius:12px;overflow:hidden;border:1px solid #e5e7eb">
    <div style="background:#185FA5;padding:20px 28px">
      <h1 style="margin:0;color:#fff;font-size:18px;font-weight:500">FundFlow ERP</h1>
    </div>
    <div style="padding:28px">
      <h2 style="margin:0 0 16px;font-size:16px;font-weight:500;color:#111">${title}</h2>
      ${body}
      <div style="margin-top:24px">
        <a href="${ctaUrl}" style="display:inline-block;background:#185FA5;color:#fff;text-decoration:none;padding:10px 20px;border-radius:8px;font-size:14px;font-weight:500">${ctaText}</a>
      </div>
    </div>
    <div style="padding:16px 28px;background:#f9fafb;border-top:1px solid #e5e7eb">
      <p style="margin:0;font-size:12px;color:#6b7280">This is an automated message from FundFlow ERP. Please do not reply.</p>
    </div>
  </div>
</body>
</html>`
}

export async function sendRequestSubmittedToManager(payload: {
  managerEmail: string
  managerName: string
  requesterName: string
  requestNumber: string
  purpose: string
  amount: number
  requestId: string
}) {
  const body = `
    <p style="color:#374151;font-size:14px">Hi ${payload.managerName},</p>
    <p style="color:#374151;font-size:14px"><strong>${payload.requesterName}</strong> has submitted a fund request that requires your approval.</p>
    <div style="background:#f3f4f6;border-radius:8px;padding:16px;margin:16px 0">
      <table style="width:100%;font-size:13px;color:#374151">
        <tr><td style="padding:4px 0;color:#6b7280">Request #</td><td style="text-align:right;font-family:monospace">${payload.requestNumber}</td></tr>
        <tr><td style="padding:4px 0;color:#6b7280">Purpose</td><td style="text-align:right">${payload.purpose}</td></tr>
        <tr><td style="padding:4px 0;color:#6b7280">Amount</td><td style="text-align:right;font-weight:600">${formatAmount(payload.amount)}</td></tr>
      </table>
    </div>`

  return resend.emails.send({
    from: FROM,
    to: payload.managerEmail,
    subject: `Action required: Fund request ${payload.requestNumber} needs your approval`,
    html: baseTemplate(
      'Fund request pending your approval',
      body,
      'Review request',
      `${APP_URL}/approvals/${payload.requestId}`
    )
  })
}

export async function sendApprovedByManager(payload: {
  requesterEmail: string
  requesterName: string
  requestNumber: string
  purpose: string
  amount: number
  managerNote?: string
  requestId: string
}) {
  const body = `
    <p style="color:#374151;font-size:14px">Hi ${payload.requesterName},</p>
    <p style="color:#374151;font-size:14px">Your fund request has been <strong style="color:#3B6D11">approved by your manager</strong> and forwarded to Finance for final approval.</p>
    <div style="background:#f3f4f6;border-radius:8px;padding:16px;margin:16px 0">
      <table style="width:100%;font-size:13px;color:#374151">
        <tr><td style="padding:4px 0;color:#6b7280">Request #</td><td style="text-align:right;font-family:monospace">${payload.requestNumber}</td></tr>
        <tr><td style="padding:4px 0;color:#6b7280">Purpose</td><td style="text-align:right">${payload.purpose}</td></tr>
        <tr><td style="padding:4px 0;color:#6b7280">Amount</td><td style="text-align:right;font-weight:600">${formatAmount(payload.amount)}</td></tr>
        ${payload.managerNote ? `<tr><td style="padding:4px 0;color:#6b7280">Note</td><td style="text-align:right">${payload.managerNote}</td></tr>` : ''}
      </table>
    </div>`

  return resend.emails.send({
    from: FROM,
    to: payload.requesterEmail,
    subject: `Manager approved your fund request ${payload.requestNumber}`,
    html: baseTemplate('Your request was approved by your manager', body, 'View request', `${APP_URL}/requests/${payload.requestId}`)
  })
}

export async function sendApprovedByFinance(payload: EmailPayload & { requestId: string }) {
  const body = `
    <p style="color:#374151;font-size:14px">Hi,</p>
    <p style="color:#374151;font-size:14px">Great news! Your fund request has been <strong style="color:#3B6D11">fully approved by Finance</strong> and is being processed for payment.</p>
    <div style="background:#f3f4f6;border-radius:8px;padding:16px;margin:16px 0">
      <table style="width:100%;font-size:13px;color:#374151">
        <tr><td style="padding:4px 0;color:#6b7280">Request #</td><td style="text-align:right;font-family:monospace">${payload.requestNumber}</td></tr>
        <tr><td style="padding:4px 0;color:#6b7280">Amount</td><td style="text-align:right;font-weight:600">${formatAmount(payload.amount)}</td></tr>
        ${payload.note ? `<tr><td style="padding:4px 0;color:#6b7280">Note</td><td style="text-align:right">${payload.note}</td></tr>` : ''}
      </table>
    </div>`

  return resend.emails.send({
    from: FROM,
    to: payload.to,
    subject: `Finance approved your fund request ${payload.requestNumber} — payment incoming`,
    html: baseTemplate('Your request is approved for payment', body, 'View request', `${APP_URL}/requests/${payload.requestId}`)
  })
}

export async function sendRejected(payload: EmailPayload & { requestId: string; rejectedBy: string }) {
  const body = `
    <p style="color:#374151;font-size:14px">Hi,</p>
    <p style="color:#374151;font-size:14px">Your fund request has been <strong style="color:#A32D2D">rejected</strong> by ${payload.rejectedBy}.</p>
    <div style="background:#f3f4f6;border-radius:8px;padding:16px;margin:16px 0">
      <table style="width:100%;font-size:13px;color:#374151">
        <tr><td style="padding:4px 0;color:#6b7280">Request #</td><td style="text-align:right;font-family:monospace">${payload.requestNumber}</td></tr>
        <tr><td style="padding:4px 0;color:#6b7280">Amount</td><td style="text-align:right;font-weight:600">${formatAmount(payload.amount)}</td></tr>
        ${payload.note ? `<tr><td style="padding:4px 0;color:#6b7280">Reason</td><td style="text-align:right">${payload.note}</td></tr>` : ''}
      </table>
    </div>
    <p style="color:#6b7280;font-size:13px">You may revise and resubmit your request if appropriate.</p>`

  return resend.emails.send({
    from: FROM,
    to: payload.to,
    subject: `Fund request ${payload.requestNumber} was rejected`,
    html: baseTemplate('Your request was rejected', body, 'View request', `${APP_URL}/requests/${payload.requestId}`)
  })
}

export async function sendPaid(payload: EmailPayload & { requestId: string; reference?: string }) {
  const body = `
    <p style="color:#374151;font-size:14px">Hi,</p>
    <p style="color:#374151;font-size:14px">Your fund request has been <strong style="color:#185FA5">paid</strong>. Please check your account.</p>
    <div style="background:#f3f4f6;border-radius:8px;padding:16px;margin:16px 0">
      <table style="width:100%;font-size:13px;color:#374151">
        <tr><td style="padding:4px 0;color:#6b7280">Request #</td><td style="text-align:right;font-family:monospace">${payload.requestNumber}</td></tr>
        <tr><td style="padding:4px 0;color:#6b7280">Amount paid</td><td style="text-align:right;font-weight:600">${formatAmount(payload.amount)}</td></tr>
        ${payload.reference ? `<tr><td style="padding:4px 0;color:#6b7280">Payment ref</td><td style="text-align:right;font-family:monospace">${payload.reference}</td></tr>` : ''}
      </table>
    </div>`

  return resend.emails.send({
    from: FROM,
    to: payload.to,
    subject: `Payment sent for fund request ${payload.requestNumber}`,
    html: baseTemplate('Your payment has been sent', body, 'View request', `${APP_URL}/requests/${payload.requestId}`)
  })
}
