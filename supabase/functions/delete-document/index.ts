import { corsHeaders } from '../_shared/cors.ts';

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { filename } = await req.json();

    console.log('Deleting document with filename:', filename);

    // Validate input
    if (!filename) {
      return new Response(
        JSON.stringify({ error: 'filename is required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Call AWS API with document_name format
    const payload = { document_name: filename };
    console.log('Sending payload to AWS Lambda:', JSON.stringify(payload));
    
    const awsResponse = await fetch(
      'https://fuvaknsmyc.execute-api.ap-southeast-1.amazonaws.com/default/spaceshipbot-delete-url',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      }
    );

    console.log('AWS API response status:', awsResponse.status);
    const responseText = await awsResponse.text();
    console.log('AWS API response body:', responseText);

    if (!awsResponse.ok) {
      console.error('AWS API error response:', responseText);
      throw new Error(`AWS API returned ${awsResponse.status}: ${responseText}`);
    }

    const data = JSON.parse(responseText);
    console.log('Document deleted successfully:', data);

    // Parse the body if it's a string
    const responseBody = typeof data.body === 'string' ? JSON.parse(data.body) : data.body;

    return new Response(
      JSON.stringify({ 
        success: true,
        statusCode: data.statusCode,
        ...responseBody 
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error in delete-document function:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
