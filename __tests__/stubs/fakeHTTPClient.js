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

export class PrefixEmptyError extends Error {}

export class FakeHTTPClient
{
    #prefix = "";
    #requestCount = 0;
    constructor(prefix)
    {
        this.setPrefix(prefix);
    }

    setPrefix(prefix)
    {
        this.#prefix = prefix;
        if (!this.#prefix)
        {
            throw new PrefixEmptyError();
        }
    }
    
    get(url)
    {
        ++this.#requestCount;
        const parsedURL = new URL(url);
        const fileName = parsedURL.search.replaceAll(/\W/g, "_").replaceAll(/^_?/g, "").replaceAll(/_?$/g, "");
        let parts = [
            "__tests__",
            "fixtures",
            this.#prefix,
            "GET",
            parsedURL.hostname + parsedURL.pathname.replaceAll(/\/$/g, ""),
            fileName,
        ].filter(entry=>!!entry);

        const filePath = path.resolve(path.dirname(''), parts.join("/")+".json");
        return new Request(fs.readFileSync(filePath));
    }
    
    post(url)
    {
        ++this.#requestCount;
        const parsedURL = new URL(url);
        let parts = [
            "__tests__",
            "fixtures",
            this.#prefix,
            "POST",
            parsedURL.hostname + parsedURL.pathname.replaceAll(/\/$/g, "")
        ].filter(entry=>!!entry);
        const filePath = path.resolve(path.dirname(''), parts.join("/") + ".json");
        return new Request(fs.readFileSync(filePath));
    }
}
