import { corsHeaders } from '../_shared/cors.ts';

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { message_id, comment } = await req.json();

    console.log('Adding comment to message:', { message_id, comment });

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

    if (!comment || comment.trim().length === 0) {
      return new Response(
        JSON.stringify({ error: 'comment cannot be empty' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    if (comment.length > 1000) {
      return new Response(
        JSON.stringify({ error: 'comment must be less than 1000 characters' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Call AWS API
    const awsResponse = await fetch(
      'https://byuf21ld7b.execute-api.ap-southeast-1.amazonaws.com/default/spaceshipbot-add-comment',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message_id,
          comment: comment.trim(),
          table_name: 'spaceship_bot_messages',
        }),
      }
    );

    console.log('AWS API response status:', awsResponse.status);

    if (!awsResponse.ok) {
      const errorText = await awsResponse.text();
      console.error('AWS API error response:', errorText);
      console.error('Request payload was:', { message_id, comment: comment.trim(), table_name: 'spaceship_bot_messages' });
      throw new Error(`AWS API returned ${awsResponse.status}: ${errorText}`);
    }

    const data = await awsResponse.json();
    console.log('Comment saved successfully');

    return new Response(
      JSON.stringify({ success: true, data }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error in add-comment function:', error);
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
