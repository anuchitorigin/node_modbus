## Node Project Preparation

1. To initialize Node project (only once), use this command:
    ```bash
    npm init -y
    ```
2. To install Node dependencies, use this command:
    ```bash
    npm install <your-dependencies>
    ```
    OR
    ```bash
    npm i <your-dependencies>
    ```
    For Dev dependencies, use this command:
    ```bash
    npm i -D <your-dev-dependencies>
    ```
3. To install TypeScript, use this command:
    ```bash
    npm i -D typescript
    ```
4. To initialize TypeScript project, use this command:
    ```bash
    npx tsc --init
    ```
5. To change main file in `package.json`, update this field:
    ```json
    "main": "dist/app.js",
    ```
6. To change scripts in `package.json`, update this field:
    ```json
    "scripts": {
      "build": "tsc",
      "start": "node app.js",
      "test": "concurrently \"tsc --watch\" \"nodemon -q dist/app.js\""
    },
    ```
7. To change compiler options in `tsconfig.json`, update these fields:
    ```json
    "rootDir": "./src",
    "outDir": "./dist",
    "removeComments": true,
    ```
8. To create self-signed SSL for development, use this command:
    ```bash
    openssl req -x509 -newkey rsa:4096 -keyout key.pem -out cert.pem -sha256 -days 365
    ```
