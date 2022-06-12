import { initializeApp } from 'firebase-admin/app';
import Firebase from './messaging/firebase.js';
import { DataContainer } from './store/datacontainer.js';

initializeApp();

const eventLoop = async () => {
  const data = new DataContainer();
  await data.updateRelevantData();
  new Firebase().sentTestMessage();
};

eventLoop();
