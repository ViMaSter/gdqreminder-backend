import { initializeApp } from 'firebase-admin/app';
import Firebase from './messaging/firebase.js';
import { DataContainer } from './store/datacontainer.js';
import got from 'got';

initializeApp();

const eventLoop = async () => {
  const data = new DataContainer(got);
  await data.updateRelevantData();
  new Firebase().sentTestMessage();
};

eventLoop();
