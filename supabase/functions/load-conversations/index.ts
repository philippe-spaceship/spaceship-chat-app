import { corsHeaders } from "../_shared/cors.ts";

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { user_id } = await req.json();
    console.log(`Loading conversations for user: ${user_id}`);

    if (!user_id) {
      return new Response(
        JSON.stringify({ error: "user_id is required" }),
        { 
          status: 400, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }

    const awsEndpoint = "https://3typms2j8i.execute-api.ap-southeast-1.amazonaws.com/default/spaceshipbot-load-conversation";
    
    const payload = {
      user_id: user_id,
      table_name: "spaceship_bot_messages",
      limit: 500
    };

    console.log("Calling AWS API with payload:", payload);

    const response = await fetch(awsEndpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    console.log(`AWS API response status: ${response.status}`);

    if (!response.ok) {
      console.error(`AWS API returned ${response.status}`);
      return new Response(
        JSON.stringify({ error: `AWS API returned ${response.status}` }),
        { 
          status: response.status, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }

    const data = await response.json();
    console.log("AWS API response received");
    
    // Parse the body string if it exists
    const parsedBody = typeof data.body === 'string' ? JSON.parse(data.body) : data.body || data;
    
    console.log(`Loaded ${parsedBody.total_conversations} conversations with ${parsedBody.total_messages} total messages`);

    return new Response(
      JSON.stringify(parsedBody),
      { 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );

  } catch (error) {
    console.error("Error loading conversations:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
});
