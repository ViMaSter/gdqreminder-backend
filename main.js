import { initializeApp } from 'firebase-admin/app';
import Firebase from './messaging/firebase.js';
import { DataContainer } from './store/dataContainer.js';
import { FakeTimeProvider } from './services/timeProvider/fakeTimeProvider.js';
import { RealTimeProvider } from './services/timeProvider/realTimeProvider.js';
import got from 'got';
import { Twitch } from './services/twitch.js'
import winston from 'winston'
import { SeqTransport } from '@datalust/winston-seq'

initializeApp();

const parsedArgs = Object.fromEntries(process.argv
                     .filter(value=>value.startsWith("--"))
                     .map(value => [value.split("=")[0].slice(2), value.split("=")[1]]));

const setupLogger = (config) =>
{
  const {seqHost, seqAPIKey} = config;
  let transports = [new winston.transports.Console({
    format: winston.format.simple(),
  })];
  
  const logger = winston.createLogger({
    exitOnError: true,
    defaultMeta: { application: 'gdqreminder-backend' },
    transports,
    level: "info",
    format: winston.format.combine(  /* This is required to get errors to log with stack traces. See https://github.com/winstonjs/winston/issues/1498 */
      winston.format.errors({ stack: true }),
      winston.format.json(),
    ),
    handleExceptions: true,
    handleRejections: true,
  });
  
  if (seqHost && seqAPIKey)
  {
    logger.add(new SeqTransport({
      serverUrl: seqHost,
      apiKey: seqAPIKey,
      level: "info",
      handleExceptions: true,
      handleRejections: true,
      onError: (e => { 
        debugger;
        logger.error(e);
      }),
    }));
  }
  return logger;
};

const startup = async (logger, config) => {
  const {startTime, speedup, refreshIntervalInMS} = config;
  if (!refreshIntervalInMS)
  {
    throw new Error("A refresh interval in ms with --refreshIntervalInMS is required");
  }

  let timeProvider = new RealTimeProvider();
  if (!!startTime ^ !!speedup)
  {
    throw new Error("[TIMEPROVIDER] You must specify both --startTime and --speedup to use a fake time provider");
  }
  if (startTime && speedup)
  {
    logger.warn("[TIMEPROVIDER] Using fake time provider");
    timeProvider = new FakeTimeProvider(new Date(startTime).getTime());
  }
  const dataContainer = new DataContainer(logger, got, timeProvider, new Twitch(got, process.env.TWITCH_CLIENT_ID), (run) => {
    logger.info("[EMISSION] run start: " + run);
    new Firebase(logger).sendStartMessageForRun(run);
  });

  let dataContainerConfig = {
    refreshIntervalInMS
  };
  if (timeProvider instanceof FakeTimeProvider)
  {
    dataContainerConfig.beforeNextCheck = () => {
      timeProvider.passTime(refreshIntervalInMS * speedup);
      logger.info(`[TIME] Passing ${((refreshIntervalInMS * speedup) / 1000)} seconds; now ${timeProvider.getCurrent().toISOString()}`);
    };
  }
  await dataContainer.startLoop(dataContainerConfig);
};

const logger = setupLogger(parsedArgs);
try {
  await startup(logger, parsedArgs);
} catch (e)
{
  logger.error(e);
}