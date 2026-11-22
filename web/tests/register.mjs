// Lets Node's built-in test runner import the app's extensionless .ts modules. Test tooling only; not part of the Angular build.
import { register } from 'node:module';
register('./ts-resolve.mjs', import.meta.url);
