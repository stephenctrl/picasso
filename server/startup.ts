class InvalidPortError extends Error {}

export function parsePort(value: string | undefined): number {
  if (value === undefined) return 3000;
  const port = Number(value);
  if (!/^\d+$/.test(value) || !Number.isInteger(port) || port < 1 || port > 65535) {
    throw new InvalidPortError('PORT must be an integer between 1 and 65535.');
  }
  return port;
}

export function serverFailureMessage(error: unknown, port: number | undefined): string {
  if (error instanceof InvalidPortError) {
    return 'Picasso could not start: PORT must be an integer between 1 and 65535. Correct PORT and restart.';
  }
  const code = error && typeof error === 'object' && 'code' in error ? error.code : undefined;
  if (code === 'EADDRINUSE') {
    return `Picasso could not bind to 127.0.0.1:${port}: the port is already in use. Stop the other server yourself or set PORT to an available port, then restart.`;
  }
  if (code === 'EACCES') {
    return `Picasso could not bind to 127.0.0.1:${port}: permission was denied. Choose an allowed PORT or check local permissions, then restart.`;
  }
  return 'Picasso stopped because the server could not initialize or continue running. Check the project dependencies, build output, and local permissions, then restart.';
}
