import fs from 'fs';
import path from 'path';

class Request
{
    constructor(content)
    {
        this.content = content;
    }

    async json()
    {
        return JSON.parse(this.content);
    }
}

export class FakeHTTPClient
{
    constructor()
    {
        this.requests = [];
    }
    
    get(url)
    {
        const parsedURL = new URL(url);
        const fileName = parsedURL.search.replaceAll(/\W/g, "_").replaceAll(/^_?/g, "").replaceAll(/_?$/g, "");
        const filePath = path.resolve(path.dirname(''), `__tests__/fixtures/${parsedURL.hostname}${parsedURL.pathname.replaceAll(/\/$/g, "")}/${fileName}.json`);
        return new Request(fs.readFileSync(filePath));
    }
}