exports.handler = async (event) => {
  // Only allow POST
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  try {
    const data = JSON.parse(event.body);

    // Email is always required
    if (!data.email) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Email is required' }) };
    }

    // Build Airtable fields — email-only submissions use "Footer Signup" as source
    const fields = {
      'Email': data.email,
      'First Name': data.firstName || '',
      'Last Name': data.lastName || '',
      'Organization': data.orgName || '',
      'Team Size': data.orgSize || '',
      'Role': data.role || '',
      'Message': data.message || ''
    };

    // Mark source so you can distinguish full form vs footer signups
    if (!data.firstName && !data.orgName) {
      fields['Message'] = 'Footer email signup';
    }

    const response = await fetch(
      `https://api.airtable.com/v0/${process.env.AIRTABLE_BASE_ID}/${encodeURIComponent('Signups')}`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.AIRTABLE_TOKEN}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          records: [{
            fields
          }]
        })
      }
    );

    if (!response.ok) {
      const errorData = await response.text();
      console.error('Airtable error:', errorData);
      return { statusCode: 500, body: JSON.stringify({ error: 'Failed to save signup' }) };
    }

    // Send welcome email via Resend (non-blocking — don't fail the signup if email fails)
    if (process.env.RESEND_API_KEY) {
      try {
        const firstName = data.firstName || '';
        const greeting = firstName ? `Hi ${firstName},` : 'Hi there,';

        await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            from: 'Goodness <hello@trygoodness.ai>',
            to: [data.email],
            subject: "You're on the Goodness waitlist!",
            html: `
              <div style="font-family: Georgia, serif; max-width: 520px; margin: 0 auto; color: #1a2a3a;">
                <p style="font-size: 16px; line-height: 1.7;">${greeting}</p>
                <p style="font-size: 16px; line-height: 1.7;">
                  Thanks for joining the Goodness waitlist! We're building the AI operating system for nonprofits
                  — one calm, intelligent platform for your donors, events, communications, and reporting.
                </p>
                <p style="font-size: 16px; line-height: 1.7;">
                  We'll reach out as soon as your spot is ready. In the meantime, if you know someone
                  who'd love this, share the link:
                </p>
                <p style="text-align: center; margin: 28px 0;">
                  <a href="https://trygoodness.ai" style="display: inline-block; padding: 12px 28px; background: #E8863A; color: #ffffff; text-decoration: none; border-radius: 24px; font-family: Georgia, serif; font-weight: 700; font-size: 15px;">Visit trygoodness.ai</a>
                </p>
                <p style="font-size: 16px; line-height: 1.7;">
                  Talk soon,<br>
                  The Goodness Team
                </p>
                <hr style="border: none; border-top: 1px solid #e8e4df; margin: 32px 0 16px;">
                <p style="font-size: 12px; color: #8a8a8a; line-height: 1.5;">
                  You're receiving this because you signed up at trygoodness.ai.
                  Questions? Reply to this email — it goes right to our inbox.
                </p>
              </div>
            `
          })
        });
      } catch (emailErr) {
        console.error('Email send error (non-fatal):', emailErr);
      }
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ success: true })
    };
  } catch (err) {
    console.error('Function error:', err);
    return { statusCode: 500, body: JSON.stringify({ error: 'Server error' }) };
  }
};
