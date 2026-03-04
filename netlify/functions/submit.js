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

    return {
      statusCode: 200,
      body: JSON.stringify({ success: true })
    };
  } catch (err) {
    console.error('Function error:', err);
    return { statusCode: 500, body: JSON.stringify({ error: 'Server error' }) };
  }
};
