import { createRequestHandler, RouterContextProvider } from 'react-router';
 
// @ts-expect-error - virtual module provided by React Router at build time
import * as build from 'virtual:react-router/server-build';
  
const handler = createRequestHandler(build);
 
export default (req: Request) => handler(
  req,
  new RouterContextProvider(
    new Map(),
  )
);