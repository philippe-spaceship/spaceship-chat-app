import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { conversation_id, date_from, date_to } = await req.json();

    console.log('Fetching citation analytics for conversation_id:', conversation_id, 'date_from:', date_from, 'date_to:', date_to);

    const response = await fetch(
      "https://vxlojvmxf6.execute-api.ap-southeast-1.amazonaws.com/default/spaceshipbot-analyse-citation",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          table_name: "spaceship_bot_messages",
          conversation_id: conversation_id || null,
          date_from: date_from || null,
          date_to: date_to || null,
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Lambda error response:', {
        status: response.status,
        statusText: response.statusText,
        body: errorText
      });
      
      let errorMessage = `Lambda returned ${response.status}`;
      try {
        const errorData = JSON.parse(errorText);
        errorMessage = errorData.error || errorData.message || errorMessage;
      } catch (e) {
        // If parsing fails, use the raw text
        if (errorText) errorMessage = errorText;
      }
      
      return new Response(
        JSON.stringify({ error: errorMessage }),
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    console.log('Citation data fetched successfully:', { 
      total_citations: data.total_citations, 
      unique_urls: data.unique_urls 
    });

    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in analytics-citation function:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
