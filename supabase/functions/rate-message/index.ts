import { corsHeaders } from '../_shared/cors.ts';

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { message_id, rating } = await req.json();

    console.log('Rating message:', { message_id, rating });

    // Validate input
    if (!message_id) {
      return new Response(
        JSON.stringify({ error: 'message_id is required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    if (rating === undefined || rating < 1 || rating > 5) {
      return new Response(
        JSON.stringify({ error: 'rating must be between 1 and 5' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Call AWS API
    const awsResponse = await fetch(
      'https://yaola29s9a.execute-api.ap-southeast-1.amazonaws.com/default/spaceshipbot-rate-message',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message_id,
          rating,
          table_name: 'spaceship_bot_messages',
        }),
      }
    );

    console.log('AWS API response status:', awsResponse.status);

    if (!awsResponse.ok) {
      const errorText = await awsResponse.text();
      console.error('AWS API error response:', errorText);
      console.error('Request payload was:', { message_id, rating, table_name: 'spaceship_bot_messages' });
      throw new Error(`AWS API returned ${awsResponse.status}: ${errorText}`);
    }

    const data = await awsResponse.json();
    console.log('Rating saved successfully');

    return new Response(
      JSON.stringify({ success: true, data }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error in rate-message function:', error);
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
