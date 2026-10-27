export const handler = async (event) => {
    /*handler method triggered by fetch requests from script.js
      event sent: contains httpMethod, body, etc.
    */
    const CORS_HEADERS = {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type, X-Version",
        "Access-Control-Allow-Methods": "GET, POST, PUT, OPTIONS",
        "Access-Control-Expose-Headers": "X-Version"
    };
    //identified specific CORS headers to be sent to JSONBin endpoint.
    if(event.httpMethod == "OPTIONS") return {statusCode: 204, headers: CORS_HEADERS};
    //allows for "OPTIONS" method to return CORS options.
    
    const KEY = process.env.API_KEY;
    const binName = event.queryStringParameters?.target;

    let BIN_ID;
    if(binName == "detentions") BIN_ID = process.env.DETENTION_ID;
    if(binName == "studentProfiles") BIN_ID = process.env.STUDENT_PROFILES_ID;
    if(binName == "reports") BIN_ID = process.env.REPORTS_ID;
    
    const URL = event.httpMethod == "GET" ? `https://api.jsonbin.io/v3/b/${BIN_ID}?t=${Date.now()}` : `https://api.jsonbin.io/v3/b/${BIN_ID}`;

    try {
        const headers = {
            "Content-Type": "application/json",
            "X-Master-Key": KEY,
        };
        let body = event.body;

        if(event.httpMethod == "PUT" && body) {
            const clientVersion = event.headers["x-version"];
            if(!clientVersion) {
                return {
                    statusCode: 409,
                    headers: {...CORS_HEADERS,},
                    body: JSON.stringify({error: `No version number in ${binName} was detected.`})
                }
            }

            if(clientVersion) {
                const checkResponse = await fetch(`https://api.jsonbin.io/v3/b/${BIN_ID}?t=${Date.now()}`, {
                    headers: {"X-Master-Key": KEY}
                });
                const currentData = await checkResponse.json();
                const serverVersion = currentData.record.version || 0;
                console.log("Client version:", clientVersion, "Server version:", serverVersion);
            
                if(serverVersion != parseInt(clientVersion)) {
                    return {
                        statusCode: 409,
                        headers: {
                            ...CORS_HEADERS,
                            "X-Version": serverVersion.toString()
                        },
                        body: JSON.stringify({
                            error: `A version mismatch was detected in ${binName}. Data was edited elsewhere.`,
                            serverVersion: serverVersion
                        })
                    }
                }
            }
            const data = JSON.parse(body);
            data.version = (parseInt(clientVersion) || 0) + 1;
            body = JSON.stringify(data);
        }

        const response = await fetch(URL, {
            method: event.httpMethod,
            headers,
            body: event.httpMethod == "GET" ? null : body
        });

        const text = await response.text();
        const data = JSON.parse(text);
        const version = data.record?.version || 0;

        return {
            statusCode: response.status,
            headers: {
                ...CORS_HEADERS,
                "Content-Type": "application/json",
                "X-Version": version.toString()
            },
            body: text
        };
    }
    catch(error) {
        console.error("Proxy error:", error);
        return {
            statusCode: 500,
            headers: CORS_HEADERS,
            body: JSON.stringify({error: error.message})
        };
    }
};