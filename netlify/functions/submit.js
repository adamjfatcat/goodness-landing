exports.handler = async (event) => {
  // Only allow POST
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  try {
    const data = JSON.parse(event.body);

    // Basic validation
    if (!data.firstName || !data.lastName || !data.email || !data.orgName) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Missing required fields' }) };
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
            fields: {
              'First Name': data.firstName,
              'Last Name': data.lastName,
              'Email': data.email,
              'Organization': data.orgName,
              'Team Size': data.orgSize || '',
              'Role': data.role || '',
              'Message': data.message || ''
            }
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
