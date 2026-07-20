import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM = process.env.RESEND_FROM_EMAIL || 'ElectroHub <no-reply@electrohub.example>';

async function send(to: string, subject: string, html: string) {
  try {
    await resend.emails.send({ from: FROM, to, subject, html });
  } catch (err) {
    // Email failures should never break the primary request flow (order
    // placement, vendor approval, etc). Sentry captures it for follow-up.
    const Sentry = await import('@sentry/nextjs');
    Sentry.captureException(err, { tags: { area: 'email' } });
  }
}

function layout(title: string, bodyHtml: string) {
  return `
  <div style="font-family: -apple-system, Segoe UI, Roboto, sans-serif; max-width: 560px; margin: 0 auto; color: #12161B;">
    <div style="padding: 24px 0; border-bottom: 2px solid #C6FF3A;">
      <strong style="font-size: 18px; letter-spacing: -0.02em;">ElectroHub</strong>
    </div>
    <div style="padding: 24px 0;">
      <h1 style="font-size: 20px; margin: 0 0 16px;">${title}</h1>
      ${bodyHtml}
    </div>
    <div style="padding: 16px 0; border-top: 1px solid #E6EAEE; font-size: 12px; color: #6B7684;">
      ElectroHub Marketplace — electronics from vetted vendors.
    </div>
  </div>`;
}

export const emails = {
  async welcome(to: string, name: string) {
    await send(
      to,
      'Welcome to ElectroHub',
      layout('Welcome aboard', `<p>Hi ${name}, your account is ready. Start browsing vetted electronics vendors.</p>`)
    );
  },

  async passwordReset(to: string, resetUrl: string) {
    await send(
      to,
      'Reset your ElectroHub password',
      layout(
        'Reset your password',
        `<p>Click below to set a new password. This link expires in 1 hour.</p>
         <p><a href="${resetUrl}" style="background:#C6FF3A;color:#12161B;padding:10px 16px;border-radius:4px;text-decoration:none;font-weight:600;">Reset password</a></p>
         <p style="font-size:12px;color:#6B7684;">If you didn't request this, you can ignore this email.</p>`
      )
    );
  },

  async vendorApplicationReceived(to: string, storeName: string) {
    await send(
      to,
      'We received your vendor application',
      layout(
        'Application received',
        `<p>Thanks for applying to sell electronics on ElectroHub as <strong>${storeName}</strong>. Our team reviews applications within 2 business days.</p>`
      )
    );
  },

  async vendorApproved(to: string, storeName: string) {
    await send(
      to,
      'Your ElectroHub store is approved',
      layout(
        'You\u2019re approved',
        `<p><strong>${storeName}</strong> is live. Head to your vendor dashboard to add products and start selling.</p>`
      )
    );
  },

  async vendorRejected(to: string, storeName: string, reason: string) {
    await send(
      to,
      'Update on your ElectroHub application',
      layout(
        'Application not approved',
        `<p>We\u2019re unable to approve <strong>${storeName}</strong> at this time.</p><p><em>${reason}</em></p>`
      )
    );
  },

  async orderConfirmation(to: string, orderNumber: string, totalFormatted: string, itemsHtml: string) {
    await send(
      to,
      `Order confirmed — ${orderNumber}`,
      layout(
        'Order confirmed',
        `<p>Thanks for your order <strong>${orderNumber}</strong>.</p>
         <table style="width:100%;border-collapse:collapse;margin:12px 0;">${itemsHtml}</table>
         <p><strong>Total: ${totalFormatted}</strong></p>`
      )
    );
  },

  async orderStatusUpdate(to: string, orderNumber: string, status: string) {
    await send(
      to,
      `Order ${orderNumber} update`,
      layout('Order status update', `<p>Order <strong>${orderNumber}</strong> is now <strong>${status}</strong>.</p>`)
    );
  },

  async warrantyExpiringSoon(to: string, productTitle: string, expiresOn: string) {
    await send(
      to,
      `Warranty expiring soon — ${productTitle}`,
      layout(
        'Warranty expiring soon',
        `<p>The warranty on <strong>${productTitle}</strong> expires on ${expiresOn}. File a claim before then if you need service.</p>`
      )
    );
  },
};
