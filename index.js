const express = require('express');
const axios = require('axios');
const bodyParser = require('body-parser');

// Initialize Express server
const app = express();
const PORT = 3000;

// Use body-parser middleware to parse JSON data
app.use(bodyParser.json());

// Zoho OAuth credentials
const ZOHO_REFRESH_TOKEN = '1000.2a8aeaede76a61cf64adf601fe345d7d.aa40056f4602ec738aba9ee82a080cf7';
const ZOHO_CLIENT_ID = '1000.4EGOYK4Y7CU0JPUQUTY1NYWHZJFB1K';
const ZOHO_CLIENT_SECRET = '72d74b33fea28683889346a1a36313fd443348dbed';

// Function to get Zoho OAuth access token
const getAccessToken = async () => {
  try {
    const config = {
      method: 'post',
      url: 'https://accounts.zoho.in/oauth/v2/token',
      params: {
        refresh_token: ZOHO_REFRESH_TOKEN,
        client_id: ZOHO_CLIENT_ID,
        client_secret: ZOHO_CLIENT_SECRET,
        grant_type: 'refresh_token'
      },
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    };

    const response = await axios.request(config);
    return response.data.access_token;
  } catch (error) {
    console.error("Error fetching access token:", error);
    return null;
  }
};

// Function to create a lead in Zoho CRM
const createLeadInZoho = async (accessToken, leadData) => {
  try {
    // Mapping incoming IndiaMART webhook data to Zoho CRM fields
    const config = {
      method: 'post',
      url: 'https://www.zohoapis.in/crm/v2/Leads',
      headers: {
        'Authorization': `Zoho-oauthtoken ${accessToken}`,
        'Content-Type': 'application/json'
      },
      data: {
        "data": [
          {
            "Company": leadData.SENDER_COMPANY || 'Not Provided',
            "Last_Name": leadData.SENDER_NAME.split(' ').slice(-1).join(' ') || leadData.SENDER_NAME.split(' ').slice(0, -1).join(' '),
            "First_Name": leadData.SENDER_NAME.split(' ').slice(0, -1).join(' ') || leadData.SENDER_NAME.split(' ').slice(-1).join(' '),
            "Email": leadData.SENDER_EMAIL || leadData.SENDER_EMAIL_ALT || '',
            "Phone": leadData.SENDER_MOBILE || leadData.SENDER_MOBILE_ALT || '',
            "City": leadData.SENDER_CITY || '',
            "State": leadData.SENDER_STATE || '',
            "Lead_Source": "IndiaMART",
            "Description": leadData.QUERY_MESSAGE || 'No message provided',
          }
        ],
        "trigger": ["approval", "workflow", "blueprint"]
      }
    };

    const response = await axios(config);
    if (response.data && response.data.data[0].status === 'success') {
      console.log("Lead created successfully:", response.data);
      return true; // Lead created successfully
    } else {
      console.error("Error creating lead:", response.data);
      return false; // Lead creation failed
    }
  } catch (error) {
    console.error("Error pushing lead to Zoho CRM:", error);
    return false;
  }
};

// Webhook route
app.post('/webhook', async (req, res) => {
  const leadData = req.body.RESPONSE;

  if (!leadData) {
    return res.status(400).json({
        code: "400",
        status: "Success",
    });
  }

  console.log("Received data from IndiaMART:", leadData);

  // Get Zoho access token
  const accessToken = await getAccessToken();
  if (!accessToken) {
    return res.status(500).json({
        code: "500",
        status: "Success",
   
    });
  }

  // Create lead in Zoho CRM
  const isLeadCreated = await createLeadInZoho(accessToken, leadData);

  if (isLeadCreated) {
    // Send success response back to IndiaMART
    return res.status(200).json({
        code: "200",
        status: "Success",
    
    });
  } else {
    // Send failure response back to IndiaMART
    return res.status(500).json({
      code: "500",
      status: "Success",
    });
  }
});

app.get('/', (req, res) => {
  res.status(200).send('Server is RUnning');
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
