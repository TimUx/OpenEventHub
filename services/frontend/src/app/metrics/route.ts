const SERVICE_NAME = 'frontend';
const SERVICE_VERSION = process.env.SERVICE_VERSION ?? '0.1.0';

function escapeLabel(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/"/g, '\\"');
}

export function GET(): Response {
  const lines = [
    '# TYPE process_uptime_seconds gauge',
    `process_uptime_seconds ${process.uptime().toFixed(3)}`,
    '# TYPE nodejs_version_info gauge',
    `nodejs_version_info{version="${escapeLabel(process.version)}"} 1`,
    '# TYPE oeh_service_info gauge',
    `oeh_service_info{service="${escapeLabel(SERVICE_NAME)}",version="${escapeLabel(SERVICE_VERSION)}"} 1`,
  ];

  return new Response(`${lines.join('\n')}\n`, {
    headers: { 'content-type': 'text/plain; version=0.0.4; charset=utf-8' },
  });
}
