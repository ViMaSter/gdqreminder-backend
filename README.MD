# Backend for [GDQReminder App](https://github.com/ViMaSter/gdqreminder-mobile/) [![codecov](https://codecov.io/gh/ViMaSter/gdqreminder-backend/branch/main/graph/badge.svg?token=0CRSIRXAS1)](https://codecov.io/gh/ViMaSter/gdqreminder-backend)

## Setup
1. Run `npm i`
2. Visit `Settings` -> [`Service Accounts`](https://console.firebase.google.com/project/_/settings/serviceaccounts/adminsdk) of your firebase project
3. `Generate New Private` key and store this place anywhere on your machine
4. Create a `.env`-file with the following content
   ```
     GOOGLE_APPLICATION_CREDENTIALS=[ABSOLUTE PATH TO JSON]
   ```
5. Replace `[ABSOLUTE PATH TO JSON]` with the absolute path to the `.json` file you just downloaded
6. Run `npm run server`
