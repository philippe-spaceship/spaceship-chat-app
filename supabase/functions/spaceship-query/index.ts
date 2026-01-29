import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { question, conversation_id, user_id, jobId, messages } = await req.json();

    // If jobId is provided, check job status
    if (jobId) {
      console.log('Checking job status for:', jobId);
      
      const response = await fetch(
        `https://pblahm024m.execute-api.ap-southeast-1.amazonaws.com/default/spaceshipbot-get-job?jobId=${jobId}`,
        {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
          },
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Job status check error:', {
          status: response.status,
          body: errorText
        });
        return new Response(
          JSON.stringify({ 
            error: 'Failed to check job status',
            details: errorText
          }),
          { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const jobData = await response.json();
      console.log('Job status response:', jobData);

      return new Response(
        JSON.stringify(jobData),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Otherwise, create a new job
    // Validate input
    if (!question || typeof question !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Question is required and must be a string' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (question.trim().length === 0) {
      return new Response(
        JSON.stringify({ error: 'Question cannot be empty' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (question.length > 1000) {
      return new Response(
        JSON.stringify({ error: 'Question is too long (max 1000 characters)' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Build history from messages (newest last)
    const historyLimit = 10;
    const allHistory: Array<any> = [];
    
    if (messages && Array.isArray(messages)) {
      console.log('Building history from messages:', { messageCount: messages.length });
      
      for (let i = 0; i < messages.length; i++) {
        const msg = messages[i];
        
        // Handle user/ai pairs
        if (msg?.role === 'user' && i + 1 < messages.length && messages[i + 1]?.role === 'ai') {
          allHistory.push({
            question: msg.content,
            answer: messages[i + 1].content
          });
          console.log(`Added history turn ${allHistory.length}:`, {
            question: msg.content.substring(0, 50),
            answer: messages[i + 1].content.substring(0, 50)
          });
          i++; // Skip the ai message since we already processed it
        }
        // Handle email messages
        else if (msg?.type === 'email') {
          allHistory.push({
            id: msg.id,
            type: 'email',
            content: msg.content,
            timestamp: msg.timestamp
          });
          console.log(`Added email message ${allHistory.length}:`, {
            id: msg.id,
            timestamp: msg.timestamp
          });
        }
      }
    }
    
    // Limit history to the most recent turns (keep last N items)
    const history = allHistory.slice(-historyLimit);
    console.log('Final history array:', { 
      totalTurns: allHistory.length, 
      limitedToLast: history.length, 
      history 
    });

    const payload = {
      question: question.trim(),
      conversation_id: conversation_id || Date.now().toString(),
      user_id: user_id || 'guest',
      history_limit: historyLimit,
      initial_top_k: 25,
      top_k: 8,
      history,
    };

    console.log('Creating async job with payload:', payload);

    const response = await fetch(
      'https://1a7675tmae.execute-api.ap-southeast-1.amazonaws.com/default/spaceshipbot-create-job',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify(payload),
      }
    );

    console.log('Create job response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Create job error response:', {
        status: response.status,
        statusText: response.statusText,
        body: errorText
      });
      return new Response(
        JSON.stringify({ 
          error: 'Failed to create job',
          details: errorText,
          status: response.status
        }),
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    console.log('Create job response:', data);

    // Return job creation response
    return new Response(
      JSON.stringify({
        jobId: data.jobId,
        status: data.status
      }),
      { status: 202, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in spaceship-query function:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'An unexpected error occurred'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
