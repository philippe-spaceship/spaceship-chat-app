import { corsHeaders } from '../_shared/cors.ts';

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { index } = await req.json();

    console.log('Listing documents from index:', index);

    // Validate input
    if (!index) {
      return new Response(
        JSON.stringify({ error: 'index is required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Call AWS API using the same list-blocks endpoint as list-urls
    const awsResponse = await fetch(
      'https://5jm1yz2dmg.execute-api.ap-southeast-1.amazonaws.com/default/spaceshipbot-list-blocks',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ index }),
      }
    );

    const responseText = await awsResponse.text();
    console.log('AWS API response status:', awsResponse.status);
    console.log('AWS API response body:', responseText);

    if (!awsResponse.ok) {
      throw new Error(`AWS API returned ${awsResponse.status}: ${responseText}`);
    }

    const data = JSON.parse(responseText);
    
    // Transform block_ids into document objects
    const documents: any[] = [];
    if (data.block_ids && Array.isArray(data.block_ids)) {
      data.block_ids.forEach((blockString: string, blockIndex: number) => {
        try {
          // Parse the string representation of the list
          const itemArray = JSON.parse(blockString.replace(/'/g, '"'));
          if (Array.isArray(itemArray)) {
            itemArray.forEach((item: string, itemIndex: number) => {
              // Check if this is a document (not a URL starting with http)
              if (!item.startsWith('http://') && !item.startsWith('https://')) {
                documents.push({
                  id: `doc-${blockIndex}-${itemIndex}`,
                  type: 'document',
                  filename: item,
                  source_filename: item,
                  file_type: item.split('.').pop() || 'unknown',
                  created_at: new Date().toISOString()
                });
              }
            });
          }
        } catch (e) {
          console.error('Error parsing block:', e);
        }
      });
    }
    
    const transformedData = {
      total_vectors: data.total_vectors || 0,
      retrieved_ids: data.retrieved_ids || 0,
      blocks: documents
    };
    
    console.log(`Successfully fetched ${documents.length} documents from ${data.retrieved_ids || 0} blocks`);

    return new Response(
      JSON.stringify(transformedData),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error in list-documents function:', error);
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
