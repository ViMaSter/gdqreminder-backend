export class Twitch {
    #httpClient = null;
    #clientID = "";
    constructor(httpClient, clientID) {
        this.#httpClient = httpClient;
        this.#clientID = clientID;
    }
    // get current title or game name via gql api with got and TWITCH_CLIENT_ID env
    async isSubstringOfGameNameOrStreamTitle(substring) {
        const twitchTime = new Date().getTime();
        const response = await this.#httpClient.post("https://gql.twitch.tv/gql", {
            headers: {
                "Client-ID": this.#clientID,
            },
            json: [{
                "operationName": "ComscoreStreamingQuery",
                "variables": {
                    "channel": "gamesdonequick",
                    "clipSlug": "",
                    "isClip": false,
                    "isLive": true,
                    "isVodOrCollection": false,
                    "vodID": ""
                },
                "extensions": {
                    "persistedQuery": {
                        "version": 1,
                        "sha256Hash": "e1edae8122517d013405f237ffcc124515dc6ded82480a88daef69c83b53ac01"
                    }
                }
            }],
            timeout: {
                request: 2000
            },
            retry: { 
                limit: 10, 
                methods: ["POST"]
            }
        }).json();
        console.log("[TWITCH] requestTime: " + ((new Date().getTime() - twitchTime) / 1000));
        const streamName = response[0].data.user.broadcastSettings.title.toLowerCase();
        if (streamName.includes(substring.toLowerCase())) {
            return true;
        }
        if (response[0].data.user.stream?.game?.name)
        {
            const gameName = response[0].data.user.stream.game.name.toLowerCase();
            if (gameName.includes(substring.toLowerCase())) {
                return true;
            }
        }

        return false;
    }
}