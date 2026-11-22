import { bootstrapApplication } from '@angular/platform-browser';
import { config } from './app/app.config.server';
import { Root } from './app/root';

const bootstrap = () => bootstrapApplication(Root, config);
export default bootstrap;
