import electron from 'electron';
import { SwiggyImporter } from '../electron/swiggyImporter.js';

const { app } = electron;
app.setName('kitchen-os');

await app.whenReady();

const importer = new SwiggyImporter();
const result = await importer.importNow({
  visible: false,
  reason: 'manual',
  onProgress: (progress) => console.log(JSON.stringify(progress))
});

console.log(JSON.stringify({ result }, null, 2));
app.quit();
