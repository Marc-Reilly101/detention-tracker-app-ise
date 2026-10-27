export const handler = async (event) => {
    if(event.httpMethod != "POST") {
        return {
            statusCode: 405,
            headers: {"Content-Type": "application/json",},
            body: JSON.stringify({error: "Method not allowed"}),
        };
    }

    try {
        const {submission} = JSON.parse(event.body || "{}");
        if(submission == process.env.PASSWORD) {
            /*references password from Netlify's environment variables
              via process.env. Compares it to submission.
            */
            return {
                statusCode: 200,
                headers: {"Content-Type": "application/json"},
                body: JSON.stringify({success: true})
            };
        }
        return {
            statusCode: 401,
            headers: {"Content-Type": "application/json"},
            body: JSON.stringify({success: false})
        };

    } 
    catch {
        return {
            statusCode: 400,
            headers: {"Content-Type": "application/json"},
            body: JSON.stringify({error: "Invalid request"})
        };
    }
};