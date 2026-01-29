import { corsHeaders } from '../_shared/cors.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { index } = await req.json();

    console.log(`Fetching URLs for index: ${index}`);

    const response = await fetch(
      "https://5jm1yz2dmg.execute-api.ap-southeast-1.amazonaws.com/default/spaceshipbot-list-blocks",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ index })
      }
    );

    const responseText = await response.text();
    console.log(`AWS API response status: ${response.status}`);
    console.log(`AWS API response body: ${responseText}`);

    if (!response.ok) {
      throw new Error(`AWS API returned ${response.status}: ${responseText}`);
    }

    const data = JSON.parse(responseText);
    
    // Transform block_ids into a flat array of URLs (filtering out documents)
    let urls: string[] = [];
    if (data.block_ids && Array.isArray(data.block_ids)) {
      data.block_ids.forEach((blockString: string) => {
        try {
          // Parse the string representation of the Python list
          const urlArray = JSON.parse(blockString.replace(/'/g, '"'));
          if (Array.isArray(urlArray)) {
            // Only include items that are actual URLs (start with http:// or https://)
            const filteredUrls = urlArray.filter((item: string) => 
              item.startsWith('http://') || item.startsWith('https://')
            );
            urls = urls.concat(filteredUrls);
          }
        } catch (e) {
          console.error('Error parsing block:', e);
        }
      });
    }
    
    const transformedData = {
      total_vectors: data.total_vectors || 0,
      retrieved_ids: data.retrieved_ids || 0,
      blocks: urls.map((url: string, index: number) => ({
        id: `block-${index}`,
        url: url,
        source_url: url,
        created_at: new Date().toISOString()
      }))
    };
    
    console.log(`Successfully fetched ${urls.length} URLs from ${data.retrieved_ids || 0} blocks`);

    return new Response(JSON.stringify(transformedData), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error fetching URLs:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );
  }
});
