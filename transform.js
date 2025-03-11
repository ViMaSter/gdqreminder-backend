import fs from 'fs';
import path from 'path';
import { promisify } from 'util';
const readFile = promisify(fs.readFile);
const dirname = path.resolve();

import {readdir} from 'node:fs/promises'
import {join} from 'node:path'

const walk = async (dirPath) => Promise.all(
  await readdir(dirPath, { withFileTypes: true }).then((entries) => entries.map((entry) => {
    const childPath = join(dirPath, entry.name)
    return entry.isDirectory() ? walk(childPath) : childPath
  })),
)

const transformEvents = async (writeContent) => {
    const files = (await walk("__tests__")).flat(Number.POSITIVE_INFINITY);
    const jsonFiles = files.filter(file => {
        if (!file.endsWith('.json')) {
            return false;
        }

        const fullPath = file;
        // return false if filename doesn't start with type_event

        if (!fullPath.includes('type_event')) {
            return false;
        }
        
        return true;
    });
    return await Promise.all(jsonFiles.map(async file => {
        const data = await readFile(path.join(dirname, file), 'utf-8');
        const parsed = JSON.parse(data);
        const eventData = parsed.map(event => {
            return {
                type: "event",
                id: event.pk,
                short: event.fields.short,
                name: event.fields.name,
                paypalcurrency: event.fields.paypalcurrency,
                hashtag: event.fields.hashtag,
                datetime: event.fields.datetime,
                timezone: event.fields.timezone,
                receivername: event.fields.receivername,
                receiver_short: "",
                receiver_solicitation_text: "",
                receiver_logo: "",
                receiver_privacy_policy: "",
                use_one_step_screening: event.fields.use_one_step_screening,
                locked: event.fields.locked,
                allow_donations: event.fields.allow_donations
            }
        });
        // sort by datetime desc
        const sorted = eventData.sort((a, b) => {
            return new Date(b.datetime) - new Date(a.datetime);
        });
        const wrapped = {
            count: sorted.length,
            next: null,
            previous: null,
            results: eventData
        };
        if (writeContent)
        {
            fs.writeFileSync(file, JSON.stringify(wrapped, null, 2));
        }
        return [file, wrapped];
    }));
}

const transformRuns = async (writeContent) => {
    const files = (await walk("__tests__")).flat(Number.POSITIVE_INFINITY);
    const jsonFiles = files.filter(file => {
        if (!file.endsWith('.json')) {
            return false;
        }

        const fullPath = file;
        // return false if filename doesn't start with type_run

        if (!fullPath.includes('type_run')) {
            return false;
        }
        
        return true;
    });
    return await Promise.all(jsonFiles.map(async file => {
        const data = await readFile(path.join(dirname, file), 'utf-8');
        if (!data)
        {
            return;
        }
        const parsed = JSON.parse(data);
        const eventData = parsed.map(event => {
            const splitDeprecatedRunners = event.fields.deprecated_runners.split(", ");
            const splitRunnerIDs = event.fields.runners;
            return {
                type: "speedrun",
                id: event.pk,
                name: event.fields.name,
                display_name: event.fields.display_name,
                twitch_name: event.fields.twitch_name,
                description: event.fields.description,
                category: event.fields.category,
                coop: event.fields.coop,
                onsite: "ONSITE",
                console: event.fields.console,
                release_year: event.fields.release_year,
                runners: splitDeprecatedRunners.map((runner, index) => {
                    return {
                        type: "talent",
                        id: splitRunnerIDs[index],
                        name: runner,
                        stream: "",
                        twitter: "",
                        youtube: "",
                        platform: "TWITCH",
                        pronouns: ""
                    }
                }),
                commentators: [],
                starttime: event.fields.starttime,
                endtime: event.fields.endtime,
                order: event.fields.order,
                run_time: event.fields.run_time,
                setup_time: event.fields.setup_time,
                anchor_time: null,
                layout: "",
                video_links: [],
                priority_tag: null,
                tags: []
            }
        });
        // sort by datetime desc
        const sorted = eventData.sort((a, b) => {
            return new Date(b.datetime) - new Date(a.datetime);
        });
        const wrapped = {
            count: sorted.length,
            next: null,
            previous: null,
            results: eventData
        };
        if (writeContent)
        {
            fs.writeFileSync(file, JSON.stringify(wrapped, null, 2));
        }
        return [file, wrapped];
    }));
}


// const data = await transformEvents(true);
// const a = 2;
const runs = await transformRuns(true);
const b = 2;