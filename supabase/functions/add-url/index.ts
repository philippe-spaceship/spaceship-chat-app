import { corsHeaders } from '../_shared/cors.ts';

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { url } = await req.json();

    console.log('Adding URL:', url);

    // Validate input
    if (!url) {
      return new Response(
        JSON.stringify({ error: 'url is required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Validate URL format
    try {
      new URL(url);
    } catch {
      return new Response(
        JSON.stringify({ error: 'Invalid URL format' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Call AWS API with retry logic
    let awsResponse;
    let lastError;
    const maxRetries = 3;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`Attempt ${attempt} of ${maxRetries} to add URL`);
        
        awsResponse = await fetch(
          'https://x2ehk5y0g6.execute-api.ap-southeast-1.amazonaws.com/default/spaceshipbot-add-url',
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ url }),
          }
        );

        console.log('AWS API response status:', awsResponse.status);

        // If successful, break out of retry loop
        if (awsResponse.ok) {
          break;
        }

        // If 503, retry; otherwise throw immediately
        if (awsResponse.status === 503) {
          const errorText = await awsResponse.text();
          lastError = `Service temporarily unavailable (attempt ${attempt}/${maxRetries})`;
          console.warn(`Attempt ${attempt} failed with 503:`, errorText);
          
          // Don't retry on last attempt
          if (attempt < maxRetries) {
            // Wait before retrying (exponential backoff: 2s, 4s)
            await new Promise(resolve => setTimeout(resolve, 2000 * attempt));
            continue;
          }
        } else {
          // For other errors, fail immediately
          const errorText = await awsResponse.text();
          console.error('AWS API error response:', errorText);
          console.error('Request payload was:', { url });
          throw new Error(`AWS API returned ${awsResponse.status}: ${errorText}`);
        }
      } catch (error) {
        if (attempt === maxRetries) {
          throw error;
        }
        lastError = error instanceof Error ? error.message : 'Unknown error';
        console.warn(`Attempt ${attempt} failed:`, lastError);
        await new Promise(resolve => setTimeout(resolve, 2000 * attempt));
      }
    }

    // If we exhausted all retries with 503
    if (!awsResponse || !awsResponse.ok) {
      throw new Error(lastError || 'Failed to add URL after multiple attempts. The backend service may be overloaded or the URL may be too large to process.');
    }

    const data = await awsResponse.json();
    console.log('URL added successfully:', data);

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
    console.error('Error in add-url function:', error);
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
