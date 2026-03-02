export async function GET(request: Request) {
  // Obtener la IP real desde los headers
  const forwarded = request.headers.get('x-forwarded-for');
  const realIp = request.headers.get('x-real-ip');
  const cfIp = request.headers.get('cf-connecting-ip');
  
  // Obtener información del servidor
  const userAgent = request.headers.get('user-agent');
  
  return Response.json({
    message: 'Información de IP de Vercel',
    ips: {
      'x-forwarded-for': forwarded,
      'x-real-ip': realIp,
      'cf-connecting-ip': cfIp,
    },
    url: request.url,
    timestamp: new Date().toISOString(),
    userAgent: userAgent
  }, {
    headers: {
      'Content-Type': 'application/json',
    }
  });
}